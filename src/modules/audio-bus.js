/**
 * AUDIO BUS - Web Audio API singleton
 * Three independent buses: music, sfx, voice
 * Each bus has independent gain control
 * Only music bus is affected by master mute
 */

class AudioBusClass {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.voiceGain = null;
    this.initialized = false;
    this.suspended = false;

    // Volume state (0-1)
    this.volumes = {
      music: parseFloat(localStorage.getItem('audio.v1.music.volume') || '0.25'),
      sfx: parseFloat(localStorage.getItem('audio.v1.sfx.volume') || '0.8'),
      voice: parseFloat(localStorage.getItem('audio.v1.voice.volume') || '1.0')
    };

    // Mute state (only music can be muted by master control)
    this.muted = {
      music: localStorage.getItem('audio.v1.music.muted') === 'true',
      sfx: false,
      voice: false
    };
  }

  /**
   * Initialize AudioContext and gain nodes
   * Must be called after first user gesture
   */
  async init() {
    if (this.initialized) return;

    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();

      // Create master gain node
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);

      // Create three independent bus gain nodes
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.voiceGain = this.context.createGain();

      // Connect buses to master
      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.voiceGain.connect(this.masterGain);

      // Apply saved volumes
      this.musicGain.gain.value = this.muted.music ? 0 : this.volumes.music;
      this.sfxGain.gain.value = this.volumes.sfx;
      this.voiceGain.gain.value = this.volumes.voice;

      this.initialized = true;
      this.suspended = this.context.state === 'suspended';

      console.log('[AudioBus] initialized:', {
        state: this.context.state,
        volumes: this.volumes,
        muted: this.muted
      });

      // Monitor state changes
      this.context.addEventListener('statechange', () => {
        this.suspended = this.context.state === 'suspended';
        console.log('[AudioBus] state:', this.context.state);
      });

    } catch (error) {
      console.error('[AudioBus] init failed:', error);
      throw error;
    }
  }

  /**
   * Resume context if suspended (mobile autoplay gate)
   */
  async masterResume() {
    if (!this.context) await this.init();
    if (this.context.state === 'suspended') {
      await this.context.resume();
      console.log('[AudioBus] resumed');
    }
  }

  /**
   * Set volume for a specific bus (0-1)
   */
  setVolume(bus, value) {
    if (!['music', 'sfx', 'voice'].includes(bus)) {
      throw new Error(`Invalid bus: ${bus}`);
    }

    value = Math.max(0, Math.min(1, value));
    this.volumes[bus] = value;
    localStorage.setItem(`audio.v1.${bus}.volume`, String(value));

    if (this.initialized) {
      const gainNode = this._getGainNode(bus);
      if (gainNode) {
        // Only apply volume if not muted (for music bus)
        if (bus === 'music' && this.muted.music) {
          gainNode.gain.value = 0;
        } else {
          gainNode.gain.value = value;
        }
      }
    }

    console.log(`[AudioBus] ${bus} volume:`, value);
  }

  /**
   * Get current volume for a bus
   */
  getVolume(bus) {
    if (!['music', 'sfx', 'voice'].includes(bus)) {
      throw new Error(`Invalid bus: ${bus}`);
    }
    return this.volumes[bus];
  }

  /**
   * Set mute state for a bus
   * Note: only music bus can be muted by master control
   */
  setMuted(bus, muted) {
    if (!['music', 'sfx', 'voice'].includes(bus)) {
      throw new Error(`Invalid bus: ${bus}`);
    }

    // Only music bus can be muted
    if (bus !== 'music') {
      console.warn(`[AudioBus] ${bus} bus cannot be muted`);
      return;
    }

    this.muted[bus] = muted;
    localStorage.setItem(`audio.v1.${bus}.muted`, String(muted));

    if (this.initialized) {
      const gainNode = this._getGainNode(bus);
      if (gainNode) {
        gainNode.gain.value = muted ? 0 : this.volumes[bus];
      }
    }

    console.log(`[AudioBus] ${bus} ${muted ? 'muted' : 'unmuted'}`);
  }

  /**
   * Check if a bus is muted
   */
  isMuted(bus) {
    if (!['music', 'sfx', 'voice'].includes(bus)) {
      throw new Error(`Invalid bus: ${bus}`);
    }
    return this.muted[bus] || false;
  }

  /**
   * Fade a bus to a target volume over time
   */
  async fade(bus, toVolume, durationMs) {
    if (!this.initialized) await this.init();
    if (!['music', 'sfx', 'voice'].includes(bus)) {
      throw new Error(`Invalid bus: ${bus}`);
    }

    const gainNode = this._getGainNode(bus);
    if (!gainNode) return;

    const currentTime = this.context.currentTime;
    const duration = durationMs / 1000;

    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(toVolume, currentTime + duration);

    return new Promise(resolve => {
      setTimeout(() => {
        this.volumes[bus] = toVolume;
        resolve();
      }, durationMs);
    });
  }

  /**
   * Create a source node connected to a specific bus
   * Returns: { source, start, stop }
   */
  createSource(bus, audioBuffer) {
    if (!this.initialized) {
      throw new Error('[AudioBus] must call init() first');
    }
    if (!['music', 'sfx', 'voice'].includes(bus)) {
      throw new Error(`Invalid bus: ${bus}`);
    }

    const source = this.context.createBufferSource();
    source.buffer = audioBuffer;

    const gainNode = this._getGainNode(bus);
    source.connect(gainNode);

    return {
      source,
      start: (when = 0) => source.start(when),
      stop: (when = 0) => source.stop(when)
    };
  }

  /**
   * Get the gain node for a specific bus
   */
  _getGainNode(bus) {
    switch (bus) {
      case 'music': return this.musicGain;
      case 'sfx': return this.sfxGain;
      case 'voice': return this.voiceGain;
      default: return null;
    }
  }

  /**
   * Get current state (for UI display)
   */
  getState() {
    return {
      initialized: this.initialized,
      suspended: this.suspended,
      contextState: this.context?.state,
      volumes: { ...this.volumes },
      muted: { ...this.muted }
    };
  }
}

// Export singleton instance
export const AudioBus = new AudioBusClass();
