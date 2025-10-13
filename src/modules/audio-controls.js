/**
 * AUDIO CONTROLS - UI and keyboard shortcuts
 * Compact player with play/pause, next, shuffle, repeat, ambient toggle
 * Volume sliders for music and SFX (separate)
 * Keyboard shortcuts: Space, N, M, [, ]
 */

import { AudioBus } from './audio-bus.js';
import { MusicPlayer } from './music-player.js';
import { SFX, playSfx } from './sfx.js';

export class AudioControls {
  constructor() {
    this.initialized = false;
    this.controlsVisible = false;
  }

  /**
   * Initialize audio controls UI
   */
  init() {
    if (this.initialized) return;

    // Create controls UI
    this._createControlsUI();

    // Setup keyboard shortcuts
    this._setupKeyboardShortcuts();

    // Listen to player state changes
    MusicPlayer.on('trackchange', (track) => this._updateTrackDisplay(track));
    MusicPlayer.on('state', (state) => this._updatePlayPauseButton(state.playing));

    // Check for suspended context (mobile)
    this._checkSuspendedState();

    this.initialized = true;
    console.log('[AudioControls] initialized');
  }

  /**
   * Create professional controls at bottom of page
   */
  _createControlsUI() {
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
              <input type="range" id="bgm-volume" min="0" max="100" value="25" step="1" />
            </div>
            <div class="volume-control">
              <span class="volume-label">Ambient</span>
              <input type="range" id="ambient-volume" min="0" max="100" value="15" step="1" />
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(controls);

    // Wire up event listeners
    this._wireControlEvents();

    // Set initial states
    this._updateFromState();
  }

  /**
   * Wire up control button events
   */
  _wireControlEvents() {
    // Play/Pause
    const playPause = document.getElementById('audio-play-pause');
    if (playPause) {
      playPause.addEventListener('click', async () => {
        if (MusicPlayer.isPlaying) {
          MusicPlayer.pause();
        } else {
          await MusicPlayer.play();
        }
      });
    }

    // Previous
    const prev = document.getElementById('audio-prev');
    if (prev) {
      prev.addEventListener('click', async () => {
        await MusicPlayer.prev();
      });
    }

    // Next
    const next = document.getElementById('audio-next');
    if (next) {
      next.addEventListener('click', async () => {
        await MusicPlayer.next();
      });
    }

    // BGM volume slider
    const bgmVolume = document.getElementById('bgm-volume');
    if (bgmVolume) {
      // Get initial volume from AudioBus
      const initialVol = Math.round(AudioBus.getVolume('music') * 100);
      bgmVolume.value = initialVol;

      bgmVolume.addEventListener('input', (e) => {
        const sliderValue = parseInt(e.target.value);
        const audioVolume = sliderValue / 100;

        // Set volume in AudioBus
        AudioBus.setVolume('music', audioVolume);

        // Update the actual playing audio element
        MusicPlayer.updateVolume();

        console.log('[AudioControls] BGM volume:', sliderValue + '%', '(actual:', audioVolume.toFixed(2) + ')');
      });
    }

    // Ambient volume slider
    const ambientVolume = document.getElementById('ambient-volume');
    if (ambientVolume) {
      const storedVol = localStorage.getItem('audio.v1.ambient.volume');
      const initialVol = storedVol ? parseInt(storedVol) : 15;
      ambientVolume.value = initialVol;

      ambientVolume.addEventListener('input', (e) => {
        const sliderValue = parseInt(e.target.value);
        const audioVolume = sliderValue / 100;

        // Store in localStorage
        localStorage.setItem('audio.v1.ambient.volume', sliderValue);

        // Update any playing ambient audio
        const ambientAudio = document.querySelector('audio[data-type="ambient"]');
        if (ambientAudio) {
          ambientAudio.volume = audioVolume;
        }

        console.log('[AudioControls] Ambient volume:', sliderValue + '%', '(actual:', audioVolume.toFixed(2) + ')');
      });
    }
  }

  /**
   * Setup keyboard shortcuts
   */
  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      // Don't trigger if user is typing in input
      if (e.target.matches('input, textarea')) return;

      switch (e.key.toLowerCase()) {
        case ' ': // Space - Play/Pause
          e.preventDefault();
          if (MusicPlayer.isPlaying) {
            MusicPlayer.pause();
          } else {
            await MusicPlayer.play();
          }
          break;

        case 'n': // N - Next track
          e.preventDefault();
          await MusicPlayer.next();
          break;

        case 'm': // M - Toggle music mute
          e.preventDefault();
          const currentlyMuted = AudioBus.isMuted('music');
          AudioBus.setMuted('music', !currentlyMuted);

          if (!currentlyMuted) {
            MusicPlayer.pause();
          } else {
            await MusicPlayer.play();
          }
          break;

        case '[': // [ - BGM Volume down
          e.preventDefault();
          const currentDown = AudioBus.getVolume('music');
          const newDown = Math.max(0, currentDown - 0.05);
          AudioBus.setVolume('music', newDown);
          MusicPlayer.updateVolume();
          const bgmVolDown = document.getElementById('bgm-volume');
          if (bgmVolDown) bgmVolDown.value = Math.round(newDown * 100);
          break;

        case ']': // ] - BGM Volume up
          e.preventDefault();
          const currentUp = AudioBus.getVolume('music');
          const newUp = Math.min(1, currentUp + 0.05);
          AudioBus.setVolume('music', newUp);
          MusicPlayer.updateVolume();
          const bgmVolUp = document.getElementById('bgm-volume');
          if (bgmVolUp) bgmVolUp.value = Math.round(newUp * 100);
          break;
      }
    });

    console.log('[AudioControls] keyboard: Space (play/pause), N (next), M (mute), [ ] (volume)');
  }

  /**
   * Update track display
   */
  _updateTrackDisplay(track) {
    const trackInfo = document.getElementById('audio-track-info');
    if (!trackInfo || !track) return;

    trackInfo.textContent = `${track.title} (${track.index + 1}/${track.total})`;
  }

  /**
   * Update play/pause button
   */
  _updatePlayPauseButton(playing) {
    const playPause = document.getElementById('audio-play-pause');
    if (!playPause) return;

    const svg = playPause.querySelector('svg');
    if (svg) {
      if (playing) {
        // Pause icon
        svg.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="currentColor"></rect><rect x="14" y="4" width="4" height="16" fill="currentColor"></rect>';
      } else {
        // Play icon
        svg.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"></polygon>';
      }
    }
    playPause.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  /**
   * Update UI from current state
   */
  _updateFromState() {
    const state = MusicPlayer.getState();

    // Play/pause button
    this._updatePlayPauseButton(state.playing);

    // Track info
    const trackInfo = document.getElementById('audio-track-info');
    if (trackInfo) {
      trackInfo.textContent = 'BGM';
    }
  }

  /**
   * Check if AudioContext is suspended (mobile autoplay gate)
   */
  _checkSuspendedState() {
    if (AudioBus.suspended) {
      this._showSuspendedChip();
    }

    // Monitor state changes
    const checkInterval = setInterval(() => {
      if (AudioBus.initialized && !AudioBus.suspended) {
        this._hideSuspendedChip();
        clearInterval(checkInterval);
      }
    }, 1000);
  }

  /**
   * Show "Tap to enable sound" chip
   */
  _showSuspendedChip() {
    const existing = document.getElementById('audio-suspended-chip');
    if (existing) return;

    const chip = document.createElement('div');
    chip.id = 'audio-suspended-chip';
    chip.className = 'audio-suspended-chip';
    chip.innerHTML = `
      <span>🔇 Tap to enable sound</span>
    `;

    chip.addEventListener('click', async () => {
      await AudioBus.masterResume();
      await MusicPlayer.play();
      this._hideSuspendedChip();
    });

    document.body.appendChild(chip);
  }

  /**
   * Hide suspended chip
   */
  _hideSuspendedChip() {
    const chip = document.getElementById('audio-suspended-chip');
    if (chip) {
      chip.remove();
    }
  }
}

// Export singleton instance
export const audioControls = new AudioControls();
