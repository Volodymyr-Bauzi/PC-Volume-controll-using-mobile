import { AudioManager } from "./audioManager";

// List all audio apps on startup for debugging
const apps = AudioManager.getApplications();
console.log("Audio Mixer Backend started.");
console.log(`Found ${apps.length} active audio applications.`);

// Uncomment for debugging
// console.log("== Active Audio Applications ==");
// apps.forEach((app) => {
//   console.log(`- ${app.name} (PID: ${app.pid}) → Volume: ${app.volume}%`);
// });
