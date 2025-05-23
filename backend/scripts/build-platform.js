const { execSync } = require('child_process');
const os = require('os');

// Determine the current platform
const platform = os.platform();

try {
  switch (platform) {
    case 'win32':
      console.log('Building for Windows...');
      execSync('npm run build:cpp:win', { stdio: 'inherit' });
      break;
    case 'linux':
      console.log('Building for Linux...');
      execSync('npm run build:cpp:linux', { stdio: 'inherit' });
      break;
    default:
      console.error(`Unsupported platform: ${platform}`);
      process.exit(1);
  }
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exit(1);
}
