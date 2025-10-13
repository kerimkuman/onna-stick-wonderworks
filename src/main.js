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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
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
}
