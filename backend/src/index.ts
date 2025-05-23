import { AudioManager } from "./audioManager";

// List all audio apps
console.log("== Active Audio Applications ==");
const apps = AudioManager.getApplications();
apps.forEach((app) => {
  console.log(`- ${app.name} (PID: ${app.pid}) → Volume: ${app.volume}%`);
});

// Example: set volume to 30% for Chrome
const target = "chrome.exe";
console.log(`\nSetting ${target} to 30% volume...`);
AudioManager.setVolume(target, 30);

// Example: mute Spotify
// AudioManager.muteApplication("spotify.exe", true);
