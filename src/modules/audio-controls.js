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
   * Create compact player UI in header
   */
  _createControlsUI() {
    const header = document.getElementById('site-header');
    if (!header) {
      console.warn('[AudioControls] no site-header found');
      return;
    }

    const container = header.querySelector('.header-container');
    if (!container) return;

    // Create controls container
    const controls = document.createElement('div');
    controls.id = 'audio-controls';
    controls.className = 'audio-controls';
    controls.innerHTML = `
      <div class="audio-controls-player">
        <button id="audio-play-pause" class="audio-btn" aria-label="Play/Pause" title="Play/Pause (Space)">
          <span class="icon">▶️</span>
        </button>
        <button id="audio-prev" class="audio-btn" aria-label="Previous track" title="Previous">
          <span class="icon">⏮️</span>
        </button>
        <button id="audio-next" class="audio-btn" aria-label="Next track" title="Next (N)">
          <span class="icon">⏭️</span>
        </button>
        <button id="audio-shuffle" class="audio-btn audio-toggle" aria-label="Shuffle" title="Shuffle" data-active="false">
          <span class="icon">🔀</span>
        </button>
        <button id="audio-repeat" class="audio-btn audio-toggle" aria-label="Repeat" title="Repeat" data-active="false">
          <span class="icon">🔁</span>
        </button>
        <button id="audio-ambient" class="audio-btn audio-toggle" aria-label="Ambient" title="Ambient Toggle (M)" data-active="true">
          <span class="icon">🌿</span>
        </button>
      </div>
      <div class="audio-controls-volume">
        <div class="volume-control">
          <label for="music-volume">🎵</label>
          <input type="range" id="music-volume" min="0" max="100" value="25" />
        </div>
        <div class="volume-control">
          <label for="sfx-volume">🔊</label>
          <input type="range" id="sfx-volume" min="0" max="100" value="80" />
        </div>
      </div>
      <div id="audio-track-info" class="audio-track-info"></div>
    `;

    // Insert into header nav
    const nav = container.querySelector('.header-nav');
    if (nav) {
      nav.appendChild(controls);
    } else {
      container.appendChild(controls);
    }

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

    // Ambient toggle
    const ambient = document.getElementById('audio-ambient');
    if (ambient) {
      ambient.addEventListener('click', async () => {
        await playSfx('click');
        const enabled = !MusicPlayer.isAmbientEnabled();
        MusicPlayer.setAmbientEnabled(enabled);
        ambient.dataset.active = enabled;

        // If disabling, mute music bus
        if (!enabled) {
          AudioBus.setMuted('music', true);
          MusicPlayer.pause();
        } else {
          AudioBus.setMuted('music', false);
          await MusicPlayer.play();
        }
      });
    }

    // Music volume slider
    const musicVolume = document.getElementById('music-volume');
    if (musicVolume) {
      musicVolume.value = AudioBus.getVolume('music') * 100;
      musicVolume.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) / 100;
        AudioBus.setVolume('music', value);
      });
    }

    // SFX volume slider
    const sfxVolume = document.getElementById('sfx-volume');
    if (sfxVolume) {
      sfxVolume.value = AudioBus.getVolume('sfx') * 100;
      sfxVolume.addEventListener('input', (e) => {
        const value = parseInt(e.target.value) / 100;
        AudioBus.setVolume('sfx', value);
        playSfx('click');
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

        case 'm': // M - Toggle Ambient (music)
          e.preventDefault();
          const enabled = !MusicPlayer.isAmbientEnabled();
          MusicPlayer.setAmbientEnabled(enabled);

          const ambientBtn = document.getElementById('audio-ambient');
          if (ambientBtn) ambientBtn.dataset.active = enabled;

          if (!enabled) {
            AudioBus.setMuted('music', true);
            MusicPlayer.pause();
          } else {
            AudioBus.setMuted('music', false);
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

    const icon = playPause.querySelector('.icon');
    if (icon) {
      icon.textContent = playing ? '⏸️' : '▶️';
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

    // Ambient button
    const ambient = document.getElementById('audio-ambient');
    if (ambient) ambient.dataset.active = state.ambientEnabled;

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
