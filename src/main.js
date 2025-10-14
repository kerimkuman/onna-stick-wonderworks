/**
 * ONNA-STICK WONDERWORKS - MAIN ENTRY POINT
 * Imports styles and initializes all modules
 */

// Import styles
import './styles/site.css';
import './styles/terminal.css';

// Import modules
import { initPageSetup } from './modules/page-setup.js';
import { initCarousel } from './modules/carousel.js';
import { initNav } from './modules/nav.js';
import { initTerminal } from './modules/terminal.js';

// Import simplified audio system
import * as Audio from './modules/audio.js';

// Import mascot bard
import { injectMascotCSS, initMascotBard } from './ui/mascot-bard.js';
import { IDLE_COPY } from './ui/mascot-copy.js';

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function init() {
  try {
    initPageSetup();
  } catch (error) {
    console.error('× Page setup failed:', error);
  }

  try {
    initNav();
  } catch (error) {
    console.error('× Nav failed:', error);
  }

  try {
    initCarousel();
  } catch (error) {
    console.error('× Carousel failed:', error);
  }

  try {
    initTerminal();
  } catch (error) {
    console.error('× Terminal failed:', error);
  }

  // Initialize simplified audio system
  try {
    Audio.initAudio();
    Audio.setupAmbientRouting();
    await Audio.preloadHomepageSfx();

    // Initialize UI controls (will create in next step)
    initAudioControls();

    // Setup homepage SFX
    setupHomepageSfx();

    console.log('[main] audio system initialized');
  } catch (error) {
    console.error('× Audio system failed:', error);
  }

  // Initialize Mascot Bard
  try {
    injectMascotCSS();

    const destroyMascot = initMascotBard({
      lottiePath: '/lottie/hi-demo-2.json',
      idleAfterMs: 7000,
      betweenIdleMs: 14000,
      poiPingSfx: '/assets/sfx-logo-hover.mp3',
      onCTA: (id) => {
        if (id === 'doorway') {
          const enterBtn = document.getElementById('enter-site-btn');
          if (enterBtn) enterBtn.click();
        }
        if (id === 'faq' || id === 'faq-link') {
          document.querySelector('#faq')?.scrollIntoView({behavior:'smooth'});
        }
        if (id === 'carousel') {
          document.querySelector('[data-poi-id="carousel"]')?.scrollIntoView({behavior:'smooth'});
        }
        if (id === 'mute') {
          const muteBtn = document.querySelector('#muteBtn');
          if (muteBtn) muteBtn.focus();
        }
        if (id === 'game') {
          // Trigger game if you have a game trigger
          console.log('[mascot] CTA: game');
        }
        if (id === 'contact') {
          document.querySelector('#contact')?.scrollIntoView({behavior:'smooth'});
        }
      },
      idleLines: IDLE_COPY.HOME
    });

    console.log('[main] mascot bard initialized');
  } catch (error) {
    console.error('× Mascot bard failed:', error);
  }
}

// ==================== AUDIO CONTROLS UI ====================

function initAudioControls() {
  // Create fixed controls at bottom
  const controls = document.createElement('div');
  controls.id = 'audio-controls';
  controls.className = 'audio-controls-fixed';
  controls.innerHTML = `
    <div class="audio-controls-inner">
      <div class="audio-player-section">
        <button id="audio-prev" class="audio-btn-nav" aria-label="Previous" title="Previous Track">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>
        <button id="audio-play-pause" class="audio-btn-main" aria-label="Play/Pause" title="Play/Pause (Space)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
        <button id="audio-next" class="audio-btn-nav" aria-label="Next" title="Next Track (N)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 18h2V6h-2zm-2-6L5.5 6v12z"/>
          </svg>
        </button>
        <div class="track-info-section">
          <div id="audio-track-info" class="audio-track-title">BGM</div>
        </div>
      </div>

      <div class="audio-controls-right">
        <div class="audio-volume-section">
          <div class="volume-control">
            <span class="volume-label">BGM</span>
            <input type="range" id="bgm-volume" min="0" max="100" value="50" step="1" />
          </div>
          <div class="volume-control">
            <span class="volume-label">Ambient</span>
            <input type="range" id="ambient-volume" min="0" max="100" value="40" step="1" />
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(controls);

  // Wire up controls
  wireAudioControls();

  console.log('[audio-controls] UI initialized');
}

function wireAudioControls() {
  // Play/Pause button
  const playPause = document.getElementById('audio-play-pause');
  if (playPause) {
    playPause.addEventListener('click', async () => {
      if (Audio.audioState.bgmPaused) {
        await Audio.playBGM();
        updatePlayPauseButton(false);
      } else {
        Audio.pauseBGM();
        updatePlayPauseButton(true);
      }
    });
  }

  // Previous button
  const prev = document.getElementById('audio-prev');
  if (prev) {
    prev.addEventListener('click', async () => {
      await Audio.prevBGM();
      updateTrackInfo();
    });
  }

  // Next button
  const next = document.getElementById('audio-next');
  if (next) {
    next.addEventListener('click', async () => {
      await Audio.nextBGM();
      updateTrackInfo();
    });
  }

  // BGM volume slider with quadratic curve
  const bgmVolume = document.getElementById('bgm-volume');
  if (bgmVolume) {
    const volumes = Audio.getVolume();
    bgmVolume.value = Math.round(volumes.bgm * 100);

    bgmVolume.addEventListener('input', (e) => {
      const sliderValue = parseInt(e.target.value) / 100; // 0-1
      Audio.setVolume(sliderValue, null);
    });
  }

  // Ambient volume slider with quadratic curve
  const ambientVolume = document.getElementById('ambient-volume');
  if (ambientVolume) {
    const volumes = Audio.getVolume();
    ambientVolume.value = Math.round(volumes.ambient * 100);

    ambientVolume.addEventListener('input', (e) => {
      const sliderValue = parseInt(e.target.value) / 100; // 0-1
      Audio.setVolume(null, sliderValue);
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', async (e) => {
    if (e.target.matches('input, textarea')) return;

    switch (e.key.toLowerCase()) {
      case ' ': // Space - Play/Pause
        e.preventDefault();
        if (Audio.audioState.bgmPaused) {
          await Audio.playBGM();
          updatePlayPauseButton(false);
        } else {
          Audio.pauseBGM();
          updatePlayPauseButton(true);
        }
        break;

      case 'n': // N - Next track
        e.preventDefault();
        await Audio.nextBGM();
        updateTrackInfo();
        break;

      case 'm': // M - Toggle mute
        e.preventDefault();
        Audio.toggleMute();
        break;

      case '[': // [ - Volume down
        e.preventDefault();
        if (bgmVolume) {
          const newVal = Math.max(0, parseInt(bgmVolume.value) - 5);
          bgmVolume.value = newVal;
          Audio.setVolume(newVal / 100, null);
        }
        break;

      case ']': // ] - Volume up
        e.preventDefault();
        if (bgmVolume) {
          const newVal = Math.min(100, parseInt(bgmVolume.value) + 5);
          bgmVolume.value = newVal;
          Audio.setVolume(newVal / 100, null);
        }
        break;
    }
  });

  console.log('[audio-controls] keyboard: Space, N, M, [, ]');
}

function updatePlayPauseButton(paused) {
  const btn = document.getElementById('audio-play-pause');
  if (!btn) return;

  const svg = btn.querySelector('svg');
  if (svg) {
    if (paused) {
      // Play icon
      svg.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>';
    } else {
      // Pause icon
      svg.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="currentColor"></rect><rect x="14" y="4" width="4" height="16" fill="currentColor"></rect>';
    }
  }
  btn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
}

function updateTrackInfo() {
  const trackInfo = document.getElementById('audio-track-info');
  if (!trackInfo) return;

  const track = Audio.audioState.currentTrack;
  trackInfo.textContent = `BGM ${track.index + 1}/${track.total}`;
}

// ==================== HOMEPAGE DOORWAY SFX ====================

function setupHomepageSfx() {
  // Find the enter button hotspot on homepage
  const enterBtn = document.getElementById('enter-site-btn');
  if (!enterBtn) {
    console.warn('[homepage-sfx] enter-site-btn not found');
    return;
  }

  // HOVER START: Loop hover SFX
  enterBtn.addEventListener('mouseenter', () => {
    Audio.startDoorwayHover();
  });

  enterBtn.addEventListener('focus', () => {
    Audio.startDoorwayHover();
  });

  // HOVER END: Stop hover loop immediately
  enterBtn.addEventListener('mouseleave', () => {
    Audio.stopDoorwayHover();
  });

  enterBtn.addEventListener('blur', () => {
    Audio.stopDoorwayHover();
  });

  // CLICK: Stop hover, play click once (NO OVERLAP)
  enterBtn.addEventListener('click', () => {
    Audio.playDoorwayClick();
  });

  // Keyboard activation (Enter/Space)
  enterBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      Audio.playDoorwayClick();
      // Trigger the actual navigation
      enterBtn.click();
    }
  });

  // Cleanup on visibility change / page unload
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      Audio.cleanupDoorwaySfx();
    }
  });

  window.addEventListener('beforeunload', () => {
    Audio.cleanupDoorwaySfx();
  });

  console.log('[homepage-sfx] doorway hover loop + click wired (NO OVERLAP)');
}
