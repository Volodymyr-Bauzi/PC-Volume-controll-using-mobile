const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Build frontend
console.log('Building frontend...');
process.chdir('./frontend');
execSync('npm run build', { stdio: 'inherit' });

// Build backend
console.log('Building backend...');
process.chdir('../backend');
execSync('npm run build', { stdio: 'inherit' });

// Create start script
const startScript = `
@echo off
echo Starting Volume Control App...
echo Please wait while the services start...

start /b node ./backend/dist/index.js
timeout /t 2 /nobreak > nul
start http://localhost:3000

echo App is running! You can now access it from your mobile device at:
ipconfig | findstr "IPv4"
echo Use any of these IP addresses with port 3000 (e.g. http://192.168.1.100:3000)
pause
`;

fs.writeFileSync('start.bat', startScript, 'utf8');
console.log('Build complete! Run start.bat to launch the app.');
