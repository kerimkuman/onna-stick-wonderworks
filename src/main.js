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
import { initTerminal } from './modules/terminal.js';

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  console.log('🎨 Initializing Onna-Stick Wonderworks...');

  try {
    initPageSetup();
    console.log('✓ Page setup initialized');
  } catch (error) {
    console.error('× Page setup failed:', error);
  }

  try {
    initCarousel();
    console.log('✓ Carousel initialized');
  } catch (error) {
    console.error('× Carousel failed:', error);
  }

  try {
    initTerminal();
    console.log('✓ Terminal initialized');
  } catch (error) {
    console.error('× Terminal failed:', error);
  }

  console.log('✨ Wonderworks ready!');
}
