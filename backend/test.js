const { AudioControl } = require('./build/Release/addon');

async function testAudioControl() {
    try {
        console.log('Creating AudioControl instance...');
        const audio = new AudioControl();
        
        console.log('Getting audio sinks...');
        const sinks = audio.getAudioSinks();
        console.log('Found audio sinks:', JSON.stringify(sinks, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

// Check if we're on Linux
if (process.platform === 'linux') {
    testAudioControl();
} else {
    console.log('This test is for Linux only. Detected platform:', process.platform);
    process.exit(0);
}
