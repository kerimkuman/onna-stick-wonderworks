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
          <button id="audio-play-pause" class="audio-btn-main" aria-label="Play/Pause" title="Play/Pause (Space)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
          </button>
          <div class="track-info-section">
            <div id="audio-track-info" class="audio-track-title">Ready</div>
            <div class="audio-track-controls">
              <button id="audio-prev" class="audio-btn-small" aria-label="Previous" title="Previous">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>
              <button id="audio-next" class="audio-btn-small" aria-label="Next" title="Next (N)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 18h2V6h-2zm-2-6L5.5 6v12z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="audio-controls-right">
          <div class="audio-toggles">
            <button id="audio-shuffle" class="audio-btn-toggle" aria-label="Shuffle" title="Shuffle" data-active="false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
            </button>
            <button id="audio-repeat" class="audio-btn-toggle" aria-label="Repeat" title="Repeat" data-active="false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="17 1 21 5 17 9"></polyline>
                <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                <polyline points="7 23 3 19 7 15"></polyline>
                <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
              </svg>
            </button>
            <button id="audio-mute" class="audio-btn-toggle" aria-label="Mute Music" title="Mute Music (M)" data-active="false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
              </svg>
            </button>
          </div>

          <div class="audio-volume-section">
            <div class="volume-control">
              <span class="volume-label">Music</span>
              <input type="range" id="music-volume" min="0" max="100" value="25" />
              <span class="volume-value">25%</span>
            </div>
            <div class="volume-control">
              <span class="volume-label">SFX</span>
              <input type="range" id="sfx-volume" min="0" max="100" value="80" />
              <span class="volume-value">80%</span>
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
        await playSfx('click');
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
        await playSfx('click');
        await MusicPlayer.prev();
      });
    }

    // Next
    const next = document.getElementById('audio-next');
    if (next) {
      next.addEventListener('click', async () => {
        await playSfx('click');
        await MusicPlayer.next();
      });
    }

    // Shuffle
    const shuffle = document.getElementById('audio-shuffle');
    if (shuffle) {
      shuffle.addEventListener('click', async () => {
        await playSfx('click');
        const enabled = MusicPlayer.toggleShuffle();
        shuffle.dataset.active = enabled;
      });
    }

    // Repeat
    const repeat = document.getElementById('audio-repeat');
    if (repeat) {
      repeat.addEventListener('click', async () => {
        await playSfx('click');
        const enabled = MusicPlayer.toggleRepeat();
        repeat.dataset.active = enabled;
      });
    }

    // Music mute toggle
    const mute = document.getElementById('audio-mute');
    if (mute) {
      mute.addEventListener('click', async () => {
        await playSfx('click');
        const currentlyMuted = AudioBus.isMuted('music');
        AudioBus.setMuted('music', !currentlyMuted);
        mute.dataset.active = !currentlyMuted;

        if (!currentlyMuted) {
          MusicPlayer.pause();
        } else {
          await MusicPlayer.play();
        }
      });
    }

    // Music volume slider
    const musicVolume = document.getElementById('music-volume');
    const musicVolumeValue = document.querySelector('.volume-control:nth-of-type(1) .volume-value');
    if (musicVolume) {
      const initialVol = Math.round(AudioBus.getVolume('music') * 100);
      musicVolume.value = initialVol;
      if (musicVolumeValue) musicVolumeValue.textContent = `${initialVol}%`;

      musicVolume.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) / 100;
        AudioBus.setVolume('music', value);
        if (musicVolumeValue) musicVolumeValue.textContent = `${e.target.value}%`;
      });
    }

    // SFX volume slider
    const sfxVolume = document.getElementById('sfx-volume');
    const sfxVolumeValue = document.querySelector('.volume-control:nth-of-type(2) .volume-value');
    if (sfxVolume) {
      const initialVol = Math.round(AudioBus.getVolume('sfx') * 100);
      sfxVolume.value = initialVol;
      if (sfxVolumeValue) sfxVolumeValue.textContent = `${initialVol}%`;

      sfxVolume.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) / 100;
        AudioBus.setVolume('sfx', value);
        if (sfxVolumeValue) sfxVolumeValue.textContent = `${e.target.value}%`;
        if (e.target.value % 10 === 0) playSfx('click');
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
          await playSfx('click');
          break;

        case 'n': // N - Next
          e.preventDefault();
          await MusicPlayer.next();
          await playSfx('click');
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
          await playSfx('click');
          break;

        case '[': // [ - Volume down
          e.preventDefault();
          const currentDown = AudioBus.getVolume('music');
          const newDown = Math.max(0, currentDown - 0.05);
          AudioBus.setVolume('music', newDown);
          const musicVolDown = document.getElementById('music-volume');
          if (musicVolDown) musicVolDown.value = newDown * 100;
          await playSfx('click');
          break;

        case ']': // ] - Volume up
          e.preventDefault();
          const currentUp = AudioBus.getVolume('music');
          const newUp = Math.min(1, currentUp + 0.05);
          AudioBus.setVolume('music', newUp);
          const musicVolUp = document.getElementById('music-volume');
          if (musicVolUp) musicVolUp.value = newUp * 100;
          await playSfx('click');
          break;
      }
    });

    console.log('[AudioControls] keyboard shortcuts active: Space, N, M, [, ]');
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

    // Shuffle button
    const shuffle = document.getElementById('audio-shuffle');
    if (shuffle) shuffle.dataset.active = state.shuffle;

    // Repeat button
    const repeat = document.getElementById('audio-repeat');
    if (repeat) repeat.dataset.active = state.repeat;

    // Mute button
    const mute = document.getElementById('audio-mute');
    if (mute) mute.dataset.active = AudioBus.isMuted('music');

    // Play/pause button
    this._updatePlayPauseButton(state.playing);

    // Track info
    if (state.currentTrack) {
      this._updateTrackDisplay(state.currentTrack);
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
