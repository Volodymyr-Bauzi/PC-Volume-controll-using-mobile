const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get version from package.json
const packageJson = require('./package.json');
const version = packageJson.version;

// Create release directory if it doesn't exist
const releaseDir = path.join(__dirname, 'release');
if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

// Platform configurations
const platforms = [
  {
    name: 'windows',
    srcDir: path.join(__dirname, 'dist', 'win'),
    files: [
      'volume-control.exe',
      'addon.node'
    ]
  },
  {
    name: 'linux',
    srcDir: path.join(__dirname, 'dist', 'linux'),
    files: [
      'volume-control',
      'build/Release/addon.node',
      'start.sh'
    ]
  }
];

// Package each platform
platforms.forEach(platform => {
  console.log(`\nPackaging ${platform.name}...`);
  
  // Create temp directory for this platform
  const tempDir = path.join(releaseDir, `volume-control-${platform.name}-v${version}`);
  if (fs.existsSync(tempDir)) {
    console.log(`  Cleaning existing directory: ${tempDir}`);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Copy files
  platform.files.forEach(file => {
    const srcPath = path.join(platform.srcDir, file);
    const destPath = path.join(tempDir, path.basename(file));
    
    if (fs.existsSync(srcPath)) {
      console.log(`  Copying ${file}...`);
      
      // Create directory structure if needed
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      
      fs.copyFileSync(srcPath, destPath);
    } else {
      console.warn(`  Warning: ${srcPath} not found`);
    }
  });

  // Create zip file
  const zipFileName = `volume-control-${platform.name}-v${version}.zip`;
  const zipFilePath = path.join(releaseDir, zipFileName);
  
  console.log(`  Creating ${zipFileName}...`);
  
  try {
    // On Windows, use PowerShell's Compress-Archive
    if (process.platform === 'win32') {
      execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipFilePath}' -Force"`);
    } 
    // On Linux/macOS, use zip command if available
    else {
      const cwd = path.dirname(tempDir);
      const dirName = path.basename(tempDir);
      execSync(`cd '${cwd}' && zip -r '${zipFileName}' '${dirName}'`, { stdio: 'inherit' });
    }
    
    console.log(`  Successfully created ${zipFilePath}`);
  } catch (error) {
    console.error(`  Error creating zip file: ${error.message}`);
  }
});

console.log('\nPackaging complete! Upload the zip files from the release directory to your GitHub release.');
