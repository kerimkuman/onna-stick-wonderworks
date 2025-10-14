/**
 * ONNA-STICK WONDERWORKS - MAIN ENTRY POINT
 * Imports styles and initializes all modules
 */

// Import styles
import './styles/site.css';
import './styles/terminal.css';
import './styles/mascot.css';

// Import modules
import { initPageSetup } from './modules/page-setup.js';
import { initCarousel } from './modules/carousel.js';
import { initNav } from './modules/nav.js';
import { initTerminal } from './modules/terminal.js';

// Import Web Audio API system
import * as AudioWeb from './modules/audio-web.js';

// Import mascot bard
import { injectMascotCSS, initMascotBard } from './ui/mascot-bard.js';
import { IDLE_COPY } from './ui/mascot-copy.js';

// Import mascot controller
import { initMascotController } from './modules/mascot-controller.js';

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

  // Initialize Web Audio API system
  try {
    await AudioWeb.init();
    initAudioControls();
    setupWonderworksAmbient();
    setupHomepageSfx();
    console.log('[main] audio-web system initialized');
  } catch (error) {
    console.error('× Audio-web system failed:', error);
  }

  // Initialize Mascot Controller (positioning, speech bubble, interactions)
  try {
    initMascotController();
    console.log('[main] mascot controller initialized');
  } catch (error) {
    console.error('× Mascot controller failed:', error);
  }

  // Initialize Mascot Bard
  try {
    injectMascotCSS();

    const destroyMascot = initMascotBard({
      lottiePath: '/lottie/hi-demo-2.json',
      idleAfterMs: 7000,
      betweenIdleMs: 14000,
      onCTA: (id) => {
        if (id === 'doorway') {
          const logoDoorway = document.getElementById('logoDoorway');
          if (logoDoorway) logoDoorway.click();
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

    // Mascot is now globally visible (fixed position), no cursor following needed

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
  // Initialize track info display
  updateTrackInfo();

  // Play/Pause button
  const playPause = document.getElementById('audio-play-pause');
  if (playPause) {
    playPause.addEventListener('click', async () => {
      const state = AudioWeb.getState();
      if (state.playing) {
        await AudioWeb.pauseBGM();
        updatePlayPauseButton(true);
      } else {
        await AudioWeb.playBGM();
        updatePlayPauseButton(false);
        updateTrackInfo();
      }
    });
  }

  // Prev button
  const prev = document.getElementById('audio-prev');
  if (prev) {
    prev.addEventListener('click', async () => {
      await AudioWeb.prevBGM();
      updateTrackInfo();
    });
  }

  // Next button
  const next = document.getElementById('audio-next');
  if (next) {
    next.addEventListener('click', async () => {
      await AudioWeb.nextBGM();
      updateTrackInfo();
    });
  }

  // BGM volume slider
  const bgmVolume = document.getElementById('bgm-volume');
  if (bgmVolume) {
    const state = AudioWeb.getState();
    bgmVolume.value = Math.round(state.volumes.music * 100);

    bgmVolume.addEventListener('input', (e) => {
      const sliderValue = parseInt(e.target.value) / 100;
      AudioWeb.setMusicVolume(sliderValue);
    });
  }

  // Ambient volume slider
  const ambientVolume = document.getElementById('ambient-volume');
  if (ambientVolume) {
    const state = AudioWeb.getState();
    ambientVolume.value = Math.round(state.volumes.ambient * 100);

    ambientVolume.addEventListener('input', (e) => {
      const sliderValue = parseInt(e.target.value) / 100;
      AudioWeb.setAmbientVolume(sliderValue);
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', async (e) => {
    if (e.target.matches('input, textarea')) return;

    switch (e.key.toLowerCase()) {
      case ' ': // Space - Play/Pause
        e.preventDefault();
        const state = AudioWeb.getState();
        if (state.playing) {
          await AudioWeb.pauseBGM();
          updatePlayPauseButton(true);
        } else {
          await AudioWeb.playBGM();
          updatePlayPauseButton(false);
        }
        break;

      case 'n': // N - Next track
        e.preventDefault();
        await AudioWeb.nextBGM();
        updateTrackInfo();
        break;

      case 'm': // M - Toggle mute
        e.preventDefault();
        AudioWeb.toggleMusicMute();
        break;

      case '[': // [ - Volume down
        e.preventDefault();
        if (bgmVolume) {
          const newVal = Math.max(0, parseInt(bgmVolume.value) - 5);
          bgmVolume.value = newVal;
          AudioWeb.setMusicVolume(newVal / 100);
        }
        break;

      case ']': // ] - Volume up
        e.preventDefault();
        if (bgmVolume) {
          const newVal = Math.min(100, parseInt(bgmVolume.value) + 5);
          bgmVolume.value = newVal;
          AudioWeb.setMusicVolume(newVal / 100);
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

  const state = AudioWeb.getState();
  trackInfo.textContent = `BGM ${state.track}/${state.total}`;
}

// ==================== HOMEPAGE DOORWAY SFX ====================

function setupHomepageSfx() {
  // Find the logo doorway button on homepage
  const logoDoorway = document.getElementById('logoDoorway');
  if (!logoDoorway) {
    console.warn('[homepage-sfx] logoDoorway not found');
    return;
  }

  // Detect touch devices (skip hover loops on touch)
  const isTouch = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;

  if (!isTouch) {
    // DESKTOP ONLY: Hover with Web Audio envelopes
    logoDoorway.addEventListener('mouseenter', () => {
      AudioWeb.startLogoHover();
    });

    logoDoorway.addEventListener('focus', () => {
      AudioWeb.startLogoHover();
    });

    logoDoorway.addEventListener('mouseleave', () => {
      AudioWeb.stopLogoHover();
    });

    logoDoorway.addEventListener('blur', () => {
      AudioWeb.stopLogoHover();
    });
  }

  // CLICK: Stop hover, play click once (NO OVERLAP) - ALL DEVICES
  logoDoorway.addEventListener('click', () => {
    AudioWeb.playLogoClick();
  });

  // Keyboard activation (Enter/Space)
  logoDoorway.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      AudioWeb.playLogoClick();
      logoDoorway.click();
    }
  });

  // Cleanup on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      AudioWeb.stopLogoHover();
    }
  });

  console.log(`[homepage-sfx] Web Audio SFX wired (touch: ${isTouch}, hover: ${!isTouch})`);
}

// ==================== WONDERWORKS AMBIENT HOOKS ====================

function setupWonderworksAmbient() {
  const sections = ['#wonderworks-intro', '#wonderworks-wrapper'];

  const observer = new IntersectionObserver((entries) => {
    const anyVisible = entries.some(e => e.isIntersecting);

    if (anyVisible) {
      AudioWeb.startAmbient();
    } else {
      AudioWeb.stopAmbient();
    }
  }, { threshold: 0.3 });

  sections.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) observer.observe(el);
  });

  console.log('[wonderworks-ambient] IntersectionObserver attached');
}
