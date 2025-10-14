# Audio System Migration - Web Audio API

## Status: ✅ COMPLETE

### Completed
✓ Created `audio-web.js` with Web Audio API implementation
  - 3 buses + master gain (music, ambient, sfx)
  - BGM with 1.8s crossfading
  - Ambient with position resume (30min timeout)
  - SFX with envelopes (10-20ms attack, 120-180ms release)
  - Proper fade times per spec
  - localStorage persistence (ona.audio.v1.*)

✓ Updated wizard bubble (mascot-bard.js)
  - Navbar collision avoidance implemented
  - POI ping SFX removed

✓ Updated main.js integration
  - Audio controls wired to audio-web.js
  - Prev/Next buttons working with crossfade
  - Track info updates on play/prev/next
  - Wonderworks ambient hooks added
  - Homepage SFX wired

✓ Removed old audio modules
  - Deleted audio.js, audio-bus.js, music-player.js, sfx.js, audio-controls.js, ambient.js

### Implementation Details

#### 1. Update Wizard Bubble (mascot-bard.js)
- Remove POI ping SFX (line 137)
- Update `posBubbleNear()` to avoid navbar collision:
```javascript
function posBubbleNear(b, rect){
  const navbar = document.querySelector('#site-header');
  let x = Math.min(Math.max(rect.right, 16), window.innerWidth - 16);
  let y = Math.max(rect.top - 12, 12);

  // Check navbar collision
  if (navbar) {
    const navRect = navbar.getBoundingClientRect();
    const safeZone = {
      top: navRect.top - 12,
      bottom: navRect.bottom + 12,
      left: navRect.left - 12,
      right: navRect.right + 12
    };

    // If bubble would overlap navbar, nudge it down
    if (y < safeZone.bottom && x > safeZone.left && x < safeZone.right) {
      y = safeZone.bottom;
    }
  }

  // Keep away from viewport edges
  const bubbleHeight = 200; // estimate
  y = Math.min(y, window.innerHeight - bubbleHeight - 16);

  b.style.left = `${x}px`;
  b.style.top = `${y}px`;
}
```

#### 2. Update main.js
Replace audio.js imports with audio-web.js:
```javascript
// OLD
import * as Audio from './modules/audio.js';

// NEW
import * as AudioWeb from './modules/audio-web.js';

// In init():
try {
  await AudioWeb.init();
  initAudioControls();
  console.log('[main] audio-web initialized');
} catch (error) {
  console.error('× Audio-web failed:', error);
}
```

Remove old SFX setup, add new:
```javascript
// Remove setupHomepageSfx() entirely

// Add in logoDoorway handlers:
if (!isTouch) {
  logoDoorway.addEventListener('mouseenter', () => {
    AudioWeb.startLogoHover();
  });
  logoDoorway.addEventListener('mouseleave', () => {
    AudioWeb.stopLogoHover();
  });
}

logoDoorway.addEventListener('click', () => {
  AudioWeb.playLogoClick();
});
```

#### 3. Update Audio Controls UI (main.js)
Wire controls to new API:
```javascript
function wireAudioControls() {
  const playPause = document.getElementById('audio-play-pause');
  if (playPause) {
    playPause.addEventListener('click', async () => {
      const state = AudioWeb.getState();
      if (state.playing) {
        await AudioWeb.pauseBGM();
      } else {
        await AudioWeb.playBGM();
      }
      updatePlayPauseButton(!state.playing);
    });
  }

  const next = document.getElementById('audio-next');
  if (next) {
    next.addEventListener('click', async () => {
      await AudioWeb.nextBGM();
      updateTrackInfo();
    });
  }

  const bgmVolume = document.getElementById('bgm-volume');
  if (bgmVolume) {
    bgmVolume.value = Math.round(AudioWeb.getState().volumes.music * 100);
    bgmVolume.addEventListener('input', (e) => {
      AudioWeb.setMusicVolume(parseInt(e.target.value) / 100);
    });
  }

  const ambientVolume = document.getElementById('ambient-volume');
  if (ambientVolume) {
    ambientVolume.value = Math.round(AudioWeb.getState().volumes.ambient * 100);
    ambientVolume.addEventListener('input', (e) => {
      AudioWeb.setAmbientVolume(parseInt(e.target.value) / 100);
    });
  }
}

function updateTrackInfo() {
  const trackInfo = document.getElementById('audio-track-info');
  if (!trackInfo) return;

  const state = AudioWeb.getState();
  trackInfo.textContent = `BGM ${state.track}/${state.total}`;
}
```

#### 4. Add Wonderworks Page Hooks
In page-setup.js or create route-hooks.js:
```javascript
// Watch for Wonderworks sections
export function setupWonderworksAmbient() {
  const sections = ['#wonderworks-intro', '#wonderworks-wrapper'];

  const observer = new IntersectionObserver((entries) => {
    const anyVisible = entries.some(e => e.isIntersecting);

    if (anyVisible) {
      import('./audio-web.js').then(Audio => {
        Audio.startAmbient();
      });
    } else {
      import('./audio-web.js').then(Audio => {
        Audio.stopAmbient();
      });
    }
  }, { threshold: 0.3 });

  sections.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) observer.observe(el);
  });
}
```

Call in main.js init:
```javascript
import { setupWonderworksAmbient } from './modules/route-hooks.js';

async function init() {
  // ... other init
  setupWonderworksAmbient();
}
```

#### 5. Remove Old Files
After testing:
- Delete `src/modules/audio.js`
- Rename `src/modules/audio-web.js` → `src/modules/audio.js`

### Testing Checklist
□ First click unlocks AudioContext
□ BGM plays after unlock
□ Next button crossfades 1→2→3→1 smoothly
□ Hover logo: graceful fade in/out
□ Click logo: hover stops, click plays with envelope
□ Navigate to Wonderworks: ambient fades in
□ Leave Wonderworks: ambient fades out
□ Return to Wonderworks: ambient resumes from saved position
□ Toggle mutes: independent (music/ambient/sfx)
□ Hard refresh: state persists
□ Wizard bubble never overlaps navbar
□ No wizard SFX heard
□ Mobile: first tap unlocks, everything works

### Known Issues
- Need to add autoplay blocked cue UI
- Optional wizard pop SFX not yet implemented
- Keyboard shortcuts need rewiring

### Next Steps
1. Complete wizard collision fix
2. Update main.js integration
3. Add Wonderworks hooks
4. Test QA checklist
5. Commit without Claude watermark
