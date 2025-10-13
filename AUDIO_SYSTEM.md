# Audio System - Implementation Guide

## Overview

Professional audio system with clean separation between music, SFX, and voice channels using the Web Audio API. Zero cross-contamination between channels.

## Architecture

### Three Independent Buses

1. **Music Bus** - Background music and ambient tracks
   - Controlled by ambient toggle
   - Affected by master mute
   - Volume: 0.25 default

2. **SFX Bus** - UI sounds, terminal effects
   - Independent of music mute
   - Separate volume control
   - Volume: 0.8 default

3. **Voice Bus** - Future-proof for voice content
   - Independent channel
   - Not currently used

### Key Modules

#### `audio-bus.js` - Web Audio API Singleton
- Creates AudioContext with 3 gain nodes
- Manages volumes and mute states per bus
- Persists settings to localStorage
- Provides fade transitions

#### `music-player.js` - Playlist Manager
- Play/Pause/Next/Prev controls
- Shuffle and Repeat modes
- Crossfade between tracks (600ms)
- Remembers playback position
- Auto-plays after first user gesture (if not muted)

#### `sfx.js` - Sound Effects Manager
- Low-latency SFX playback
- Preloads buffers using Web Audio API
- Falls back to HTML5 Audio if needed
- Independent of music mute state

#### `audio-controls.js` - UI & Shortcuts
- Compact player in header
- Keyboard shortcuts (Space, N, M, [, ])
- Volume sliders for music and SFX
- Mobile autoplay gate detection

## Usage

### Adding Music Tracks

Edit `src/main.js`:

```javascript
const playlist = [
  { src: '/assets/bgm-1.mp3', title: 'Track 1' },
  { src: '/assets/bgm-2.mp3', title: 'Track 2' },
  { src: '/assets/bgm-3.mp3', title: 'Track 3' }
];
MusicPlayer.load(playlist);
```

### Playing Sound Effects

```javascript
import { playSfx } from './modules/sfx.js';

// Quick play
await playSfx('click');

// With custom volume
await playSfx('notification', 0.5);

// Direct URL
await playSfx('/assets/sfx-custom.mp3');
```

### Terminal Integration

Terminal sounds route to SFX bus automatically:
- Typewriter sounds during text animation
- Click sounds on FAQ selection
- Independent of music mute button

## Controls

### UI Buttons
- **▶️/⏸️** - Play/Pause music
- **⏮️** - Previous track
- **⏭️** - Next track
- **🔀** - Toggle shuffle
- **🔁** - Toggle repeat
- **🌿** - Toggle ambient (music on/off)
- **🎵 slider** - Music volume
- **🔊 slider** - SFX volume

### Keyboard Shortcuts
- **Space** - Play/Pause
- **N** - Next track
- **M** - Toggle ambient (music)
- **[** - Music volume down (5%)
- **]** - Music volume up (5%)

## Behavior Rules

1. **Ambient Toggle (🌿)**
   - ON: Music plays normally
   - OFF: Music muted and paused
   - Does NOT affect SFX or voice

2. **Terminal Mute Button**
   - Toggles SFX volume only
   - Music continues regardless

3. **First User Interaction**
   - AudioContext initialized on click/touch
   - Music auto-plays if not muted
   - State restored from localStorage

4. **Mobile Autoplay**
   - Shows "Tap to enable sound" chip if suspended
   - Tapping resumes AudioContext and starts playback

5. **Persistence**
   - All volumes saved to localStorage
   - Mute states saved
   - Current track index and time saved
   - Shuffle/repeat states saved

## localStorage Keys

- `audio.v1.music.volume` - Music volume (0-1)
- `audio.v1.music.muted` - Music mute state
- `audio.v1.sfx.volume` - SFX volume (0-1)
- `audio.v1.voice.volume` - Voice volume (0-1)
- `audio.v1.ambient.enabled` - Ambient toggle state
- `music.v1.index` - Current track index
- `music.v1.time` - Current playback position
- `music.v1.shuffle` - Shuffle enabled
- `music.v1.repeat` - Repeat enabled

## Testing Checklist

- [ ] Music plays on first click (if not muted)
- [ ] Play/Pause button works
- [ ] Next/Previous track navigation works
- [ ] Shuffle randomizes track order
- [ ] Repeat loops playlist
- [ ] Ambient toggle mutes music but not SFX
- [ ] Terminal sounds play regardless of music mute
- [ ] Volume sliders adjust independently
- [ ] Keyboard shortcuts work (Space, N, M, [, ])
- [ ] State persists across page reloads
- [ ] Mobile shows autoplay gate when needed
- [ ] Crossfade transitions smoothly between tracks
- [ ] No audio nodes leak (check in devtools)

## File Structure

```
src/modules/
├── audio-bus.js          # Web Audio API singleton
├── music-player.js       # Playlist management
├── sfx.js                # Sound effects manager
├── audio-controls.js     # UI and keyboard shortcuts
├── terminal.js           # Terminal with SFX integration
├── carousel.js           # Carousel (ambient removed)
└── page-setup.js         # Page transitions

src/main.js               # Initialize audio system
src/styles/site.css       # Audio control styles
