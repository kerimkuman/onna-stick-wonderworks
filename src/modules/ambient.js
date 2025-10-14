/**
 * AMBIENT SOUND MANAGER
 * Plays looping ambient sounds on specific sections
 * Uses dedicated audio element, controlled by ambient volume slider
 */

class AmbientSoundManager {
  constructor() {
    this.audio = null;
    this.currentSection = null;
    this.enabled = true;
    this.volume = 0.15;

    // Load persisted settings
    const stored = localStorage.getItem('audio.v1.ambient.volume');
    if (stored) {
      this.volume = parseInt(stored) / 100;
    }

    const enabledStored = localStorage.getItem('audio.v1.ambient.enabled');
    if (enabledStored !== null) {
      this.enabled = enabledStored !== 'false';
    }
  }

  /**
   * Initialize ambient audio element
   */
  init() {
    if (this.audio) return;

    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = this.volume;
    this.audio.setAttribute('data-type', 'ambient'); // For volume control to find it

    console.log('[Ambient] initialized');
  }

  /**
   * Play ambient sound for a section
   */
  async play(sectionId, audioSrc) {
    if (!this.enabled) return;

    if (!this.audio) {
      this.init();
    }

    // If already playing this section's audio, do nothing
    if (this.currentSection === sectionId && !this.audio.paused) {
      return;
    }

    // Change track if different
    if (this.currentSection !== sectionId) {
      this.currentSection = sectionId;
      this.audio.src = audioSrc;
    }

    try {
      await this.audio.play();
      console.log('[Ambient] playing:', sectionId);
    } catch (error) {
      console.warn('[Ambient] play failed:', error);
    }
  }

  /**
   * Stop current ambient sound
   */
  stop() {
    if (!this.audio) return;

    this.audio.pause();
    this.audio.currentTime = 0;
    this.currentSection = null;
    console.log('[Ambient] stopped');
  }

  /**
   * Update volume
   */
  setVolume(volume) {
    this.volume = volume;
    if (this.audio) {
      this.audio.volume = volume;
    }
  }

  /**
   * Enable/disable ambient sounds
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('audio.v1.ambient.enabled', String(enabled));

    if (!enabled && this.audio) {
      this.stop();
    }
  }
}

// Export singleton
export const AmbientSound = new AmbientSoundManager();

/**
 * Setup intersection observer for section-based ambient sounds
 */
export function setupSectionAmbient() {
  const sections = [
    {
      selector: '#wonderworks-intro',
      audio: '/assets/ambience-witches-cauldron.mp3'
    },
    {
      selector: '#wonderworks-wrapper',
      audio: '/assets/ambience-witches-cauldron.mp3'
    }
  ];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Find which section this is
        const section = sections.find(s => entry.target.matches(s.selector));
        if (section) {
          AmbientSound.play(section.selector, section.audio);
        }
      }
    });
  }, {
    threshold: 0.3 // Play when 30% of section is visible
  });

  // Observe all ambient sections
  sections.forEach(({ selector }) => {
    const element = document.querySelector(selector);
    if (element) {
      observer.observe(element);
      console.log('[Ambient] observing:', selector);
    }
  });
}
