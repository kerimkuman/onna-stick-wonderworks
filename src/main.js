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

// Import new audio system
import { AudioBus } from './modules/audio-bus.js';
import { MusicPlayer } from './modules/music-player.js';
import { SFX } from './modules/sfx.js';
import { audioControls } from './modules/audio-controls.js';

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

  // Initialize new audio system
  try {
    // Load playlist
    const playlist = [
      { src: '/assets/bgm-1.mp3', title: 'BGM Track 1' },
      { src: '/assets/bgm-2.mp3', title: 'BGM Track 2' },
      { src: '/assets/bgm-3.mp3', title: 'BGM Track 3' }
    ];
    MusicPlayer.load(playlist);

    // Preload SFX
    await SFX.preloadTerminalSounds();

    // Initialize UI controls
    audioControls.init();

    console.log('[main] audio system initialized');
  } catch (error) {
    console.error('× Audio system failed:', error);
  }
}
