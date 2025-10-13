/**
 * MUSIC PLAYER - Playlist manager using AudioBus
 * Features: Play/Pause, Next/Prev, Shuffle, Repeat, Crossfade
 * Persists state to localStorage
 */

import { AudioBus } from './audio-bus.js';

class MusicPlayerClass {
  constructor() {
    this.playlist = [];
    this.currentIndex = 0;
    this.currentTime = 0;
    this.isPlaying = false;
    this.shuffle = false;
    this.repeat = false;
    this.ambientEnabled = true;
    this.crossfadeDuration = 600; // ms

    // Current audio elements (for HTML5 Audio fallback)
    this.currentAudio = null;
    this.nextAudio = null;

    // Event listeners
    this.listeners = {
      trackchange: [],
      state: []
    };

    // Load persisted state
    this._loadState();

    // Unlock on first user interaction
    this._attachUnlockListeners();
  }

  /**
   * Load playlist
   */
  load(tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) {
      console.warn('[MusicPlayer] invalid playlist');
      return;
    }

    this.playlist = tracks.map(t => ({
      src: t.src || t,
      title: t.title || 'Unknown',
      duration: t.duration || 0
    }));

    console.log('[MusicPlayer] loaded', this.playlist.length, 'tracks');

    // Restore or start at first track
    if (this.currentIndex >= this.playlist.length) {
      this.currentIndex = 0;
    }

    this._loadTrack(this.currentIndex);
  }

  /**
   * Play current track
   */
  async play() {
    if (!this.playlist.length) {
      console.warn('[MusicPlayer] no playlist loaded');
      return;
    }

    // Initialize AudioBus if needed
    if (!AudioBus.initialized) {
      await AudioBus.init();
    }

    // Resume context if suspended
    await AudioBus.masterResume();

    // Don't play if music is muted
    if (AudioBus.isMuted('music')) {
      console.log('[MusicPlayer] music is muted, not playing');
      return;
    }

    if (!this.currentAudio) {
      this._loadTrack(this.currentIndex);
    }

    if (this.currentAudio) {
      try {
        await this.currentAudio.play();
        this.isPlaying = true;
        this._saveState();
        this._emit('state', { playing: true });
        console.log('[MusicPlayer] playing:', this.playlist[this.currentIndex].title);
      } catch (error) {
        console.warn('[MusicPlayer] play failed:', error);
      }
    }
  }

  /**
   * Pause playback
   */
  pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.isPlaying = false;
      this._saveState();
      this._emit('state', { playing: false });
      console.log('[MusicPlayer] paused');
    }
  }

  /**
   * Go to next track
   */
  async next() {
    let nextIndex = this.currentIndex + 1;

    if (this.shuffle) {
      nextIndex = Math.floor(Math.random() * this.playlist.length);
    } else if (nextIndex >= this.playlist.length) {
      if (this.repeat) {
        nextIndex = 0;
      } else {
        this.pause();
        return;
      }
    }

    await this._changeTrack(nextIndex);
  }

  /**
   * Go to previous track
   */
  async prev() {
    // If more than 3 seconds into track, restart it
    if (this.currentAudio && this.currentAudio.currentTime > 3) {
      this.currentAudio.currentTime = 0;
      return;
    }

    let prevIndex = this.currentIndex - 1;

    if (prevIndex < 0) {
      if (this.repeat) {
        prevIndex = this.playlist.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    await this._changeTrack(prevIndex);
  }

  /**
   * Toggle shuffle mode
   */
  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this._saveState();
    console.log('[MusicPlayer] shuffle:', this.shuffle);
    return this.shuffle;
  }

  /**
   * Toggle repeat mode
   */
  toggleRepeat() {
    this.repeat = !this.repeat;
    this._saveState();
    console.log('[MusicPlayer] repeat:', this.repeat);
    return this.repeat;
  }

  /**
   * Enable/disable ambient sounds (master on/off for ambient)
   */
  setAmbientEnabled(enabled) {
    this.ambientEnabled = enabled;
    localStorage.setItem('audio.v1.ambient.enabled', String(enabled));
    console.log('[MusicPlayer] ambient:', enabled);
  }

  /**
   * Check if ambient is enabled
   */
  isAmbientEnabled() {
    return this.ambientEnabled;
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    const index = this.listeners[event].indexOf(callback);
    if (index > -1) {
      this.listeners[event].splice(index, 1);
    }
  }

  /**
   * Get current track info
   */
  getCurrentTrack() {
    if (!this.playlist.length) return null;
    return {
      ...this.playlist[this.currentIndex],
      index: this.currentIndex,
      total: this.playlist.length,
      currentTime: this.currentAudio?.currentTime || 0,
      duration: this.currentAudio?.duration || 0,
      playing: this.isPlaying
    };
  }

  /**
   * Get player state
   */
  getState() {
    return {
      playing: this.isPlaying,
      shuffle: this.shuffle,
      repeat: this.repeat,
      ambientEnabled: this.ambientEnabled,
      currentTrack: this.getCurrentTrack()
    };
  }

  // --- Internal methods ---

  _loadTrack(index) {
    if (index < 0 || index >= this.playlist.length) return;

    // Clean up old audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
    }

    this.currentIndex = index;
    const track = this.playlist[index];

    this.currentAudio = new Audio(track.src);
    this.currentAudio.volume = AudioBus.getVolume('music');
    this.currentAudio.preload = 'auto';

    // Restore playback position if resuming
    if (this.currentTime > 0 && this.currentTime < this.currentAudio.duration) {
      this.currentAudio.currentTime = this.currentTime;
    }

    // Auto-advance on track end
    this.currentAudio.addEventListener('ended', () => {
      console.log('[MusicPlayer] track ended');
      this.next();
    });

    // Track time updates
    this.currentAudio.addEventListener('timeupdate', () => {
      this.currentTime = this.currentAudio.currentTime;
      if (Math.floor(this.currentTime) % 5 === 0) {
        this._saveState();
      }
    });

    console.log('[MusicPlayer] loaded track:', track.title);
    this._emit('trackchange', this.getCurrentTrack());
    this._saveState();
  }

  async _changeTrack(newIndex) {
    const wasPlaying = this.isPlaying;

    if (this.currentAudio) {
      // Simple crossfade: fade out current
      const fadeSteps = 10;
      const fadeInterval = this.crossfadeDuration / fadeSteps;
      const startVol = this.currentAudio.volume;

      for (let i = 0; i < fadeSteps; i++) {
        await new Promise(resolve => setTimeout(resolve, fadeInterval));
        if (this.currentAudio) {
          this.currentAudio.volume = startVol * (1 - i / fadeSteps);
        }
      }

      this.currentAudio.pause();
    }

    this.currentTime = 0;
    this._loadTrack(newIndex);

    if (wasPlaying) {
      // Fade in new track
      if (this.currentAudio) {
        this.currentAudio.volume = 0;
        await this.play();

        const fadeSteps = 10;
        const fadeInterval = this.crossfadeDuration / fadeSteps;
        const targetVol = AudioBus.getVolume('music');

        for (let i = 0; i < fadeSteps; i++) {
          await new Promise(resolve => setTimeout(resolve, fadeInterval));
          if (this.currentAudio) {
            this.currentAudio.volume = targetVol * (i / fadeSteps);
          }
        }

        if (this.currentAudio) {
          this.currentAudio.volume = targetVol;
        }
      }
    }
  }

  _emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (error) {
        console.error('[MusicPlayer] listener error:', error);
      }
    });
  }

  _saveState() {
    try {
      localStorage.setItem('music.v1.index', String(this.currentIndex));
      localStorage.setItem('music.v1.time', String(this.currentTime));
      localStorage.setItem('music.v1.shuffle', String(this.shuffle));
      localStorage.setItem('music.v1.repeat', String(this.repeat));
    } catch (error) {
      // Ignore storage errors
    }
  }

  _loadState() {
    try {
      this.currentIndex = parseInt(localStorage.getItem('music.v1.index') || '0', 10);
      this.currentTime = parseFloat(localStorage.getItem('music.v1.time') || '0');
      this.shuffle = localStorage.getItem('music.v1.shuffle') === 'true';
      this.repeat = localStorage.getItem('music.v1.repeat') === 'true';
      this.ambientEnabled = localStorage.getItem('audio.v1.ambient.enabled') !== 'false';
    } catch (error) {
      // Ignore load errors
    }
  }

  _attachUnlockListeners() {
    let unlocked = false;

    const unlock = async () => {
      if (unlocked) return;
      unlocked = true;

      await AudioBus.init();

      // Auto-play if not muted and was playing before
      if (!AudioBus.isMuted('music') && this.playlist.length > 0) {
        // Give user a moment to orient themselves
        setTimeout(() => {
          if (!this.isPlaying) {
            this.play();
          }
        }, 1000);
      }

      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };

    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock);
  }
}

// Export singleton instance
export const MusicPlayer = new MusicPlayerClass();
