const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const startTime = Date.now();

// Get target platform from command line argument or use all platforms
const targetPlatform = process.argv[2]?.toLowerCase();
const platforms = targetPlatform ? [targetPlatform] : ['win', 'linux'];

// Validate platform ('mac' must be requested explicitly: node package-app.js mac)
const validPlatforms = ['win', 'linux', 'mac'];
for (const platform of platforms) {
    if (!validPlatforms.includes(platform)) {
        console.error(`Error: Invalid platform '${platform}'. Valid platforms are: ${validPlatforms.join(', ')}`);
        process.exit(1);
    }
}

// Setup directories
const distDir = path.join(__dirname, 'dist');
const frontendDir = path.join(__dirname, 'frontend');
const backendDir = path.join(__dirname, 'backend');

// Function to clean up old executables


async function cleanupExecutables() {
    await Promise.all(platforms.map(async platform => {
        // macOS ships one thin binary per architecture (see the packaging step).
        const executableNames = platform === 'win'
            ? ['volume-control.exe']
            : platform === 'mac'
            ? ['volume-control', 'volume-control-x64', 'volume-control-arm64']
            : ['volume-control'];

        for (const executableName of executableNames) {
            const executablePath = path.join(distDir, platform, executableName);

            if (fs.existsSync(executablePath)) {
                try {
                    fs.unlinkSync(executablePath);
                    console.log(`Cleaned up old executable: ${executablePath}`);
                } catch (err) {
                    console.warn(`Warning: Could not remove old executable ${executablePath}. It might be running.`);
                    console.warn('Please close any running instances of the app and try again.');
                    process.exit(1);
                }
            }
        }
    }));
}

// Main packaging function
async function packageApp() {
    console.log(`Starting packaging process for platform(s): ${platforms.join(', ')}`);
    
    // Clean up old executables first
    await cleanupExecutables();
    
    // Create dist directory if it doesn't exist
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    // Build frontend
    console.log('Building frontend...');
    const nodeModulesPath = path.join(frontendDir, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
    execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });
    }

    function needsRebuild(srcDir, buildDir) {
        if (!fs.existsSync(buildDir)) return true;
    
        const srcMTime = fs.statSync(srcDir).mtimeMs;
        const buildMTime = fs.statSync(buildDir).mtimeMs;
        return srcMTime > buildMTime;
    }
    
    if (needsRebuild(path.join(frontendDir, 'src'), path.join(frontendDir, 'dist'))) {
        console.log('Building frontend...');
        execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });
    } else {
        console.log('Frontend is up to date, skipping build.');
    }
    
    // Package for each platform
    for (const platform of platforms) {
        console.log(`\n=== Packaging for ${platform} ===`);
        const platformDir = path.join(distDir, platform);
        
        // Create platform directory
        if (!fs.existsSync(platformDir)) {
            fs.mkdirSync(platformDir, { recursive: true });
        }
        
        // Skip building for Linux on non-Linux platforms
        if (platform === 'linux' && process.platform !== 'linux') {
            console.log('Skipping Linux build - must be built on a Linux system');
            continue;
        }

        // Skip building for macOS on non-macOS platforms (native addon + pkg
        // cannot be cross-compiled)
        if (platform === 'mac' && process.platform !== 'darwin') {
            console.log('Skipping macOS build - must be built on a macOS system');
            continue;
        }

        // Build backend first
        console.log('Building backend...');
        execSync('npm run build', { cwd: backendDir, stdio: 'inherit' });

        // Copy frontend build to backend directory first (for packaging)
        console.log('Copying frontend files...');
        const frontendDistDir = path.join(frontendDir, 'dist');
        const backendFrontendDir = path.join(backendDir, 'dist', 'frontend');
        
        // Ensure the frontend directory exists in the backend's dist
        if (!fs.existsSync(backendFrontendDir)) {
            fs.mkdirSync(backendFrontendDir, { recursive: true });
        }

        fs.cpSync(frontendDistDir, backendFrontendDir, { recursive: true });

        // Build native addon for the target platform
        console.log(`Building native addon for ${platform}...`);
        const platformEnv = { ...process.env };
        if (platform === 'linux') {
            // Skip native addon build for Linux since it's not supported in cross-compilation
            console.log('Skipping native addon build for Linux - it must be built on the target machine');
        } else {
            // Check & Build Native Addon
            const addonPath = path.join(backendDir, 'build', 'Release', 'addon.node');
            if (!fs.existsSync(addonPath)) {
                console.log(`Building native addon for ${platform}...`);
                execSync('npm run build:cpp', { cwd: backendDir, stdio: 'inherit', env: platformEnv });
            }
            // Copy Native Addon
            const addonSrc = path.join(backendDir, 'build', 'Release', 'addon.node');
            if (fs.existsSync(addonSrc)) {
                const addonDest = path.join(platformDir, 'addon.node');
                fs.copyFileSync(addonSrc, addonDest);

                // binding.gyp asks for a universal (x86_64 + arm64) addon on macOS.
                // If a slice is missing the app loads on one architecture and dies
                // on the other, so fail loudly here rather than in a user's Terminal.
                if (platform === 'mac') {
                    const archs = execSync(`lipo -archs "${addonDest}"`).toString().trim().split(/\s+/);
                    console.log(`Native addon architectures: ${archs.join(', ')}`);
                    const rebuildHint =
                        'Run `npm run clean` in backend/ and rebuild so binding.gyp produces a universal addon.';
                    if (!archs.includes('arm64')) {
                        // Every Mac sold since 2020 is Apple Silicon - refuse to ship without it.
                        throw new Error(`addon.node has no arm64 slice (found: ${archs.join(', ')}). ${rebuildHint}`);
                    }
                    if (!archs.includes('x86_64')) {
                        console.warn(`Warning: addon.node has no x86_64 slice (found: ${archs.join(', ')}).`);
                        console.warn(`Intel Macs will fail to load the audio addon. ${rebuildHint}`);
                    }
                }
            }
        }

        // Package the backend.
        //
        // macOS gets one thin binary per architecture rather than a single
        // `lipo`-merged universal file: pkg appends its payload after the end of
        // the Mach-O image and patches the absolute file offset of that payload
        // into the binary. `lipo` nests each input at a new offset inside the fat
        // container, so the patched offset no longer points at the payload and the
        // merged binary dies on startup. Shipping both slices plus an arch-aware
        // start.sh gives the same result for the user: one download, runs on Intel
        // and on Apple Silicon natively (no Rosetta).
        if (platform === 'mac') {
            for (const arch of ['x64', 'arm64']) {
                const output = path.join(platformDir, `volume-control-${arch}`);
                console.log(`Building macOS executable (${arch})...`);
                execSync(`pkg "${backendDir}" --targets node18-macos-${arch} --output "${output}"`, { stdio: 'inherit' });

                // pkg ad-hoc signs its macOS output, but a missing or invalid
                // signature is an unrecoverable SIGKILL on Apple Silicon, so
                // re-sign explicitly instead of trusting it.
                try {
                    execSync(`codesign --force --sign - "${output}"`, { stdio: 'inherit' });
                } catch (err) {
                    console.warn(`Warning: could not ad-hoc sign ${output}: ${err.message}`);
                }

                fs.chmodSync(output, 0o755);
                console.log(execSync(`lipo -archs "${output}"`).toString().trim());
            }
        } else {
            console.log(`Building executable for ${platform}...`);
            execSync(`pkg "${backendDir}" --targets node18-${platform}-x64 --output "${path.join(platformDir, `volume-control${platform === 'win' ? '.exe' : ''}`)}"`, { stdio: 'inherit' });
        }

        // For Linux, copy necessary build files
        if (platform === 'linux') {
            // Copy native addon source files
            const nativeFiles = [
                'src/cpp/nodeBridge.cpp',
                'src/cpp/windows.cpp',
                'binding.gyp',
                'package.json'
            ];

            // Create directories
            fs.mkdirSync(path.join(platformDir, 'src', 'cpp'), { recursive: true });
            
            // Copy each file
            nativeFiles.forEach(file => {
                const src = path.join(backendDir, file);
                const dest = path.join(platformDir, file);
                if (fs.existsSync(src)) {
                    fs.mkdirSync(path.dirname(dest), { recursive: true });
                    fs.copyFileSync(src, dest);
                }
            });

            // Create build script
            const buildInstructions = `#!/bin/bash
cd "$(dirname "$0")"

# Check if node and npm are installed
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Error: Node.js and npm are required to build the native addon."
    echo "Please install them using your distribution's package manager:"
    echo "For Ubuntu/Debian: sudo apt-get install nodejs npm build-essential"
    echo "For Fedora: sudo dnf install nodejs npm gcc-c++ make"
    echo "For Arch Linux: sudo pacman -S nodejs npm base-devel"
    exit 1
fi

# Install only the necessary dependencies for building
npm install node-addon-api node-gyp

# Build the native addon
./node_modules/.bin/node-gyp configure build

# Copy the built addon
mkdir -p build/Release
cp build/Release/addon.node ./addon.node
`;
            fs.writeFileSync(path.join(platformDir, 'build.sh'), buildInstructions);
            fs.chmodSync(path.join(platformDir, 'build.sh'), '755');
        }

        // Create start script
        const startScript = platform === 'win' 
            ? `@echo off
echo Starting Volume Control App...

:: Get local IP address
FOR /F "tokens=4 delims= " %%i in ('route print ^| find " 0.0.0.0"') do if not %%i == 0.0.0.0 set HOST=%%i
set PORT=8000

start "" volume-control.exe
ping -n 3 127.0.0.1 >nul
start http://%HOST%:%PORT%
echo.
echo App is running! You can now access it from your mobile device at:
echo http://%HOST%:%PORT%
echo.
echo Press any key to exit...
pause`
            : platform === 'mac'
            ? `#!/bin/bash
# Finder launches scripts from the user's home directory, not from the folder
# the script lives in, so anchor to the script's own directory first.
cd "$(dirname "$0")" || exit 1

echo "Starting Volume Control App..."

# Anything unzipped from a browser download carries com.apple.quarantine.
# Gatekeeper refuses to launch an ad-hoc signed binary while that flag is set,
# so clear it for this folder. Harmless if it was never there.
xattr -dr com.apple.quarantine . 2>/dev/null || true

# Pick the binary that matches this Mac. uname reports x86_64 when the shell
# itself is running under Rosetta, so ask the kernel whether we are translated.
ARCH="$(uname -m)"
if [ "$ARCH" = "x86_64" ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = "1" ]; then
    ARCH="arm64"
fi

case "$ARCH" in
    arm64)  BIN="./volume-control-arm64" ;;
    x86_64) BIN="./volume-control-x64" ;;
    *)
        echo "Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

if [ ! -f "$BIN" ]; then
    echo "Error: $BIN was not found next to this script."
    echo "Re-download the macOS package and extract the whole folder before running it."
    exit 1
fi
chmod +x "$BIN"

# Get local IP address (Wi-Fi first, then Ethernet)
export HOST=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
export BACKEND_PORT=8777

# Start the server with the addon in the current directory
"$BIN" &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM
sleep 2

open "http://$HOST:$BACKEND_PORT"
echo
echo "App is running! You can now access it from your mobile device at:"
echo "http://$HOST:$BACKEND_PORT"
echo
echo "Press Ctrl+C to stop the server when done"
wait $SERVER_PID`
            : `#!/bin/bash
# Anchor to the script's own directory: file managers launch from $HOME.
cd "$(dirname "$0")" || exit 1

echo "Starting Volume Control App..."

# Check if native addon is built
if [ ! -f "./addon.node" ]; then
    echo "Native addon not found. Building it now..."
    echo "This will require Node.js and build tools to be installed."
    echo "The installation will be guided if they are missing."
    ./build.sh
    if [ $? -ne 0 ]; then
        echo "Failed to build native addon. Please check the error messages above."
        exit 1
    fi
fi

# Get local IP address
export HOST=$(ip route get 1 | awk '{print $7;exit}')
if [ -z "$HOST" ]; then
    # Fallback method
    export HOST=$(hostname -I | awk '{print $1}')
fi
export PORT=8000

# Make the executable runnable
chmod +x ./volume-control

# Start the server with the addon in the current directory
LD_LIBRARY_PATH=".:$LD_LIBRARY_PATH" ./volume-control &
sleep 2

echo
echo "App is running! You can now access it from your mobile device at:"
echo "http://$HOST:$PORT"
echo
echo "Press Ctrl+C to stop the server when done"
read -p "Press Enter to exit..."`;

        // Write start script
        const startScriptPath = path.join(platformDir, platform === 'win' ? 'start.bat' : 'start.sh');
        fs.writeFileSync(startScriptPath, startScript);

        // Make start script executable on Linux/macOS
        if (platform === 'linux' || platform === 'mac') {
            fs.chmodSync(startScriptPath, '755');
        }

        // Create README
        const readme = `# Volume Control Remote

## 📱 How to Use

1. **Run the application** by double-clicking ${platform === 'win' ? '`start.bat`' : '`start.sh`'}
2. **Open your mobile browser** and navigate to the address shown in the console
3. **Control the volume** of your applications from your mobile device

## 💻 System Requirements

${platform === 'win'
    ? '- **Windows** 10/11 (64-bit) or Windows 7/8.1 (32-bit)\n- 100MB free disk space\n- Network connection for mobile access'
    : platform === 'mac'
    ? '- **macOS** 10.13+ on Intel, **macOS 11+** on Apple Silicon (M1/M2/M3/M4)\n- Runs natively on both — no Rosetta 2 required\n- 100MB free disk space\n- Network connection for mobile access\n\n> The package contains `volume-control-arm64` and `volume-control-x64`; `start.sh` picks the right one for your Mac. Always launch via `start.sh` rather than running a binary directly.\n\n> Note: on macOS only the **system (master) volume** can be controlled. Per-application volume is not possible with public macOS audio APIs.'
    : '- **Linux** (most modern distributions)\n- PulseAudio sound server\n- 100MB free disk space\n- Network connection for mobile access'}

## 🔧 Troubleshooting

### Can't connect from mobile device?
- Ensure both devices are on the same network
- Check your firewall settings to allow connections on port 3000
- Try accessing using the IP address shown in the console

### No sound control?
- Make sure some applications are playing audio
- Restart the application
- On Linux, ensure PulseAudio is running: \`pulseaudio --check\`

## 📝 Notes

- The application runs locally on your computer
- No internet connection is required (only local network)
- All volume changes are applied instantly
- For support, visit: https://github.com/Volodymyr-Bauzi/PC-Volume-controll-using-mobile`;

        fs.writeFileSync(path.join(platformDir, 'README.md'), readme);

        // Copy shortcuts directory and presets.json if they exist
        const shortcutsSrc = path.join(backendDir, 'shortcuts');
        const shortcutsDest = path.join(platformDir, 'shortcuts');
        if (fs.existsSync(shortcutsSrc)) {
            console.log(`Copying shortcuts to ${platformDir}...`);
            fs.cpSync(shortcutsSrc, shortcutsDest, { recursive: true });
        } else {
            // Create empty shortcuts directory if it doesn't exist
            fs.mkdirSync(shortcutsDest, { recursive: true });
        }

        const presetsSrc = path.join(backendDir, 'presets.json');
        const presetsDest = path.join(platformDir, 'presets.json');
        if (fs.existsSync(presetsSrc)) {
            console.log(`Copying presets.json to ${platformDir}...`);
            fs.copyFileSync(presetsSrc, presetsDest);
        } else {
             // Create empty presets.json if it doesn't exist
             fs.writeFileSync(presetsDest, '{}');
        }
    }

    const endTime = Date.now();
    const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`Packaging complete! Total time: ${durationSeconds} seconds.`);
}

// Run the packaging process
packageApp().catch(err => {
    console.error('Error during packaging:', err);
    process.exit(1);
});

console.log('Packaging complete! Check the dist directory for platform-specific builds.');
