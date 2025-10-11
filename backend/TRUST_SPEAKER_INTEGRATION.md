# Trust Speaker Control Integration

This document describes the Trust speaker volume control integration implemented in the volume control application.

## Overview

The Trust speaker integration provides enhanced control capabilities specifically for Trust brand speakers, including:

- **Automatic Detection**: Automatically detects Trust speakers connected to the system
- **Volume Control**: Precise volume control for individual or all Trust speakers
- **Mute Control**: Mute/unmute functionality for Trust speakers
- **Smooth Transitions**: Gradual volume changes for better user experience
- **API Endpoints**: RESTful API for remote control
- **Real-time Updates**: WebSocket support for live volume updates

## Architecture

The Trust speaker control is implemented as a decorator pattern that wraps the existing audio control system:

```
AudioManager
    ↓
AudioControlFactory
    ↓
TrustSpeakerControl (decorator)
    ↓
WindowsAudioControl / LinuxAudioControl / MacOSAudioControl
```

## Features

### 1. Trust Speaker Detection

The system automatically detects Trust speakers by scanning audio devices and matching against known patterns:

- Device names containing "trust", "speaker", "audio", or "sound"
- Case-insensitive matching
- Real-time device refresh capability

### 2. Volume Control

#### Basic Volume Control
```typescript
// Set volume for all Trust speakers
const success = audioControl.setTrustSpeakersVolume(75);

// Set volume for specific Trust speaker
const success = audioControl.setAudioDeviceVolume('trust-speaker-id', 50);
```

#### Smooth Volume Transitions
```typescript
// Gradual volume change over 2 seconds
const success = await audioControl.setTrustSpeakerVolumeSmooth(
  'trust-speaker-id', 
  80, 
  2000
);
```

### 3. Mute Control

```typescript
// Mute all Trust speakers
const success = audioControl.setTrustSpeakersMute(true);

// Unmute all Trust speakers
const success = audioControl.setTrustSpeakersMute(false);
```

### 4. Device Management

```typescript
// Get all Trust speakers
const speakers = audioControl.getTrustSpeakers();

// Get primary Trust speaker
const primarySpeaker = audioControl.getPrimaryTrustSpeaker();

// Check if Trust speakers are available
const hasSpeakers = audioControl.hasTrustSpeakers();

// Refresh device list
audioControl.refreshTrustDevices();
```

## API Endpoints

### GET /api/trust-speakers
Returns a list of all detected Trust speakers.

**Response:**
```json
[
  {
    "id": "trust-speaker-1",
    "name": "Trust Speaker Pro",
    "volume": 50,
    "isMuted": false,
    "isDefault": true,
    "deviceType": "speaker"
  }
]
```

### GET /api/trust-speakers/primary
Returns the primary Trust speaker (first detected).

**Response:**
```json
{
  "id": "trust-speaker-1",
  "name": "Trust Speaker Pro",
  "volume": 50,
  "isMuted": false,
  "isDefault": true,
  "deviceType": "speaker"
}
```

### POST /api/trust-speakers/volume
Sets volume for all Trust speakers.

**Request:**
```json
{
  "volume": 75
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /api/trust-speakers/mute
Mutes or unmutes all Trust speakers.

**Request:**
```json
{
  "mute": true
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /api/trust-speakers/:deviceId/volume-smooth
Sets volume with smooth transition for a specific Trust speaker.

**Request:**
```json
{
  "volume": 80,
  "duration": 2000
}
```

**Response:**
```json
{
  "success": true
}
```

### POST /api/trust-speakers/refresh
Refreshes the Trust speaker device list.

**Response:**
```json
{
  "success": true
}
```

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only Trust speaker tests
npm test -- --testPathPattern=trust-speaker
```

### Integration Tests

Test the Trust speaker functionality with real hardware:

```bash
# Start the server
npm run dev

# In another terminal, run the integration test
npm run test:trust
```

The integration test will:
1. Detect Trust speakers
2. Test volume control
3. Test mute/unmute functionality
4. Test smooth volume transitions
5. Verify API endpoints

### Test Coverage

The test suite covers:
- Trust speaker detection
- Volume control (basic and smooth)
- Mute control
- Device management
- API endpoints
- Error handling
- Edge cases

## Usage Examples

### Frontend Integration

```typescript
// Get Trust speakers
const response = await fetch('/api/trust-speakers');
const speakers = await response.json();

// Set volume for all Trust speakers
await fetch('/api/trust-speakers/volume', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ volume: 60 })
});

// Smooth volume transition
await fetch('/api/trust-speakers/trust-speaker-1/volume-smooth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ volume: 80, duration: 1500 })
});
```

### WebSocket Integration

```typescript
const ws = new WebSocket('ws://localhost:8777/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'volume_changed') {
    // Update UI with new volume
    updateVolumeDisplay(message.app_name, message.volume);
  }
};
```

## Configuration

### Environment Variables

No additional environment variables are required for Trust speaker control. The system uses the existing audio control configuration.

### Device Detection Patterns

The Trust speaker detection patterns can be customized by modifying the `trustDevicePatterns` array in `TrustSpeakerControl`:

```typescript
private trustDevicePatterns = [
  /trust/i,
  /speaker/i,
  /audio/i,
  /sound/i,
  // Add custom patterns here
];
```

## Troubleshooting

### Common Issues

1. **No Trust speakers detected**
   - Ensure Trust speakers are connected and recognized by the system
   - Check that speakers are set as default audio devices
   - Try refreshing the device list: `POST /api/trust-speakers/refresh`

2. **Volume control not working**
   - Verify speakers are not muted at the system level
   - Check that the application has audio control permissions
   - Ensure speakers are actively playing audio

3. **API endpoints returning 501**
   - The Trust speaker control wrapper may not be properly initialized
   - Check that the audio control factory is correctly configured

4. **Smooth volume transitions not working**
   - Ensure the device ID is valid
   - Check that the duration is within the allowed range (100-5000ms)

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
LOG_LEVEL=debug npm run dev
```

This will provide detailed information about Trust speaker detection and control operations.

## Performance Considerations

- **Device Scanning**: Trust speaker detection is performed once at startup and can be refreshed on demand
- **Smooth Transitions**: Volume transitions use 20 steps by default, providing smooth changes without excessive CPU usage
- **Memory Usage**: Device information is cached to minimize repeated system calls
- **Error Handling**: All operations include comprehensive error handling to prevent crashes

## Future Enhancements

Potential future improvements:

1. **Bass/Treble Control**: Add equalizer controls for Trust speakers
2. **Preset Management**: Save and recall volume presets
3. **Multi-room Support**: Control multiple Trust speakers in different rooms
4. **Voice Control**: Integration with voice assistants
5. **Mobile App**: Dedicated mobile app for Trust speaker control

## Contributing

When contributing to the Trust speaker integration:

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update this documentation for any API changes
4. Test with real Trust speaker hardware when possible

## License

This Trust speaker integration is part of the volume control application and follows the same MIT license.
