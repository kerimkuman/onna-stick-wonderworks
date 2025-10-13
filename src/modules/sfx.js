/**
 * SFX HELPER - Low-latency sound effects
 * Routes to AudioBus.sfx channel (independent of music mute)
 * Preloads buffers for instant playback
 */

import { AudioBus } from './audio-bus.js';

class SFXManager {
  constructor() {
    this.buffers = new Map();
    this.loadQueue = new Set();
    this.fallbackAudio = new Map();
  }

  /**
   * Preload a sound effect
   */
  async preload(name, url) {
    if (this.buffers.has(name)) return;
    if (this.loadQueue.has(name)) return;

    this.loadQueue.add(name);

    try {
      // Try Web Audio API first
      if (AudioBus.initialized && AudioBus.context) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await AudioBus.context.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
        console.log('[SFX] preloaded:', name);
      } else {
        // Fallback to HTML5 Audio
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = AudioBus.getVolume('sfx');
        this.fallbackAudio.set(name, audio);
        console.log('[SFX] preloaded (fallback):', name);
      }
    } catch (error) {
      console.warn('[SFX] preload failed:', name, error);
    } finally {
      this.loadQueue.delete(name);
    }
  }

  /**
   * Play a sound effect by name
   * If not preloaded, will load and play
   */
  async play(name, urlOrOptions) {
    let url = typeof urlOrOptions === 'string' ? urlOrOptions : urlOrOptions?.url;
    const volume = typeof urlOrOptions === 'object' ? urlOrOptions.volume : undefined;

    // If buffer exists, use Web Audio API
    if (this.buffers.has(name)) {
      return this._playWebAudio(name, volume);
    }

    // If fallback audio exists, use it
    if (this.fallbackAudio.has(name)) {
      return this._playFallback(name, volume);
    }

    // Not preloaded, load and play
    if (url) {
      await this.preload(name, url);
      return this.play(name, volume);
    }

    console.warn('[SFX] no sound loaded:', name);
  }

  /**
   * Play using Web Audio API
   */
  _playWebAudio(name, volume) {
    if (!AudioBus.initialized) {
      console.warn('[SFX] AudioBus not initialized');
      return;
    }

    const buffer = this.buffers.get(name);
    if (!buffer) return;

    try {
      const source = AudioBus.context.createBufferSource();
      source.buffer = buffer;

      // Create gain node for this specific sound
      const gainNode = AudioBus.context.createGain();
      gainNode.gain.value = volume !== undefined ? volume : 1.0;

      // Connect: source -> gain -> sfx bus
      source.connect(gainNode);
      gainNode.connect(AudioBus.sfxGain);

      source.start(0);

      // Clean up after playback
      source.onended = () => {
        source.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.warn('[SFX] playback failed:', name, error);
    }
  }

  /**
   * Play using HTML5 Audio fallback
   */
  _playFallback(name, volume) {
    const audio = this.fallbackAudio.get(name);
    if (!audio) return;

    try {
      // Clone to allow overlapping plays
      const clone = audio.cloneNode();
      clone.volume = (volume !== undefined ? volume : 1.0) * AudioBus.getVolume('sfx');

      clone.play().catch(err => {
        console.warn('[SFX] fallback play failed:', name, err);
      });

      // Clean up after playback
      clone.addEventListener('ended', () => {
        clone.remove();
      });
    } catch (error) {
      console.warn('[SFX] fallback failed:', name, error);
    }
  }

  /**
   * Preload common terminal sounds
   */
  async preloadTerminalSounds() {
    const sounds = [
      { name: 'click', url: '/assets/sfx-old-computer-click.mp3' },
      { name: 'typing', url: '/assets/sfx-answers-typing.mp3' },
      { name: 'notification', url: '/assets/sfx-system-notification.mp3' },
      { name: 'hover', url: '/assets/sfx-logo-hover.mp3' }
    ];

    await Promise.all(
      sounds.map(s => this.preload(s.name, s.url))
    );

    console.log('[SFX] terminal sounds ready');
  }
}

// Export singleton instance
export const SFX = new SFXManager();

/**
 * Convenience function for quick SFX playback
 */
export async function playSfx(nameOrUrl, volumeOrUrl) {
  // Handle both playSfx('click') and playSfx('click', '/url.mp3')
  if (nameOrUrl.startsWith('/') || nameOrUrl.startsWith('http')) {
    // Direct URL play
    const audio = new Audio(nameOrUrl);
    audio.volume = (typeof volumeOrUrl === 'number' ? volumeOrUrl : 1.0) * AudioBus.getVolume('sfx');
    await audio.play().catch(() => {});
    return;
  }

  // Named sound
  await SFX.play(nameOrUrl, volumeOrUrl);
}
