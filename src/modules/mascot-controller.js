/**
 * MASCOT CONTROLLER
 * Manages mascot positioning, speech bubble, and interactions
 * Spec: Perches on audio bar, fades when idle, speaks with quips
 */

import * as AudioWeb from './audio-web.js';

const QUIPS = [
  "Click the logo, mortal. Wonders await.",
  "Shh… the magic's in the details.",
  "Try the arrows or your wheel.",
  "The carousel obeys your mouse wheel—sideways.",
  "Press G in the terminal for a surprise.",
  "Music too loud? Use the sliders below me."
];

const STATE = {
  visible: true,
  speaking: false,
  location: 'audio', // 'audio' | 'home'
  quipIndex: 0,
  idleTimer: null,
  proximityRaf: null
};

let mascot = null;
let bubble = null;
let audioBar = null;

const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ==================== INITIALIZATION ====================

export function initMascotController() {
  mascot = document.getElementById('mascotGuide');
  if (!mascot) {
    console.warn('[mascot] #mascotGuide not found');
    return;
  }

  // Create speech bubble
  bubble = document.createElement('div');
  bubble.id = 'mascot-bubble';
  bubble.className = 'mascot-bubble';
  bubble.setAttribute('role', 'status');
  bubble.setAttribute('aria-live', 'polite');
  bubble.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bubble);

  // Wait for audio controls to be created
  const checkAudioBar = setInterval(() => {
    audioBar = document.getElementById('audio-controls');
    if (audioBar) {
      clearInterval(checkAudioBar);
      setupAudioBarPosition();
      setupInteractions();
      startProximityDetection();
      console.log('[mascot] controller initialized');
    }
  }, 100);

  // Cleanup after 5s if audio bar never appears
  setTimeout(() => clearInterval(checkAudioBar), 5000);
}

// ==================== POSITIONING ====================

function setupAudioBarPosition() {
  if (!audioBar || !mascot) return;

  // Get current location from body or default to audio
  STATE.location = document.body.classList.contains('home-page') ? 'home' : 'audio';

  if (STATE.location === 'audio') {
    positionOnAudioBar();
  } else {
    positionNearLogo();
  }
}

function positionOnAudioBar() {
  if (!audioBar || !mascot) return;

  const barRect = audioBar.getBoundingClientRect();

  // Position mascot to sit on top of audio bar
  mascot.style.position = 'fixed';
  mascot.style.bottom = `calc(${window.innerHeight - barRect.top}px - 8px)`;
  mascot.style.right = '12px';
  mascot.style.left = 'auto';
  mascot.style.transform = 'none';

  console.log('[mascot] positioned on audio bar');
}

function positionNearLogo() {
  const logo = document.getElementById('logoDoorway') || document.querySelector('.header-logo');
  if (!logo || !mascot) return;

  const logoRect = logo.getBoundingClientRect();

  // Position mascot to left of logo
  mascot.style.position = 'fixed';
  mascot.style.top = `${logoRect.top + logoRect.height / 2 - 70}px`;
  mascot.style.left = `${logoRect.left - 160}px`;
  mascot.style.right = 'auto';
  mascot.style.bottom = 'auto';
  mascot.style.transform = 'none';

  console.log('[mascot] positioned near logo');
}

// ==================== INTERACTIONS ====================

function setupInteractions() {
  if (!mascot) return;

  // Make mascot interactive
  mascot.setAttribute('role', 'button');
  mascot.setAttribute('tabindex', '0');
  mascot.setAttribute('aria-label', 'Click for a hint from your guide');
  mascot.style.cursor = 'pointer';

  // Click/tap handler
  mascot.addEventListener('click', handleMascotClick);

  // Keyboard handler
  mascot.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMascotClick();
    }
  });

  // Dismiss bubble handlers
  document.addEventListener('click', (e) => {
    if (STATE.speaking && !mascot.contains(e.target) && !bubble.contains(e.target)) {
      closeBubble();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && STATE.speaking) {
      closeBubble();
    }
  });
}

function handleMascotClick() {
  if (STATE.speaking) {
    closeBubble();
    return;
  }

  // Play click SFX
  AudioWeb.playSfx('logoClick', { attack: 10, release: 120, volume: 0.7 });

  // Wave animation
  if (!REDUCED_MOTION) {
    mascot.classList.add('is-waving');
    setTimeout(() => mascot.classList.remove('is-waving'), 800);
  }

  // Show speech bubble
  showBubble();
}

// ==================== SPEECH BUBBLE ====================

function showBubble() {
  if (!bubble || !mascot) return;

  STATE.speaking = true;
  STATE.visible = true;

  // Get next quip
  const quip = QUIPS[STATE.quipIndex % QUIPS.length];
  STATE.quipIndex++;

  // Set bubble content
  bubble.textContent = quip;
  bubble.setAttribute('aria-hidden', 'false');

  // Position bubble relative to mascot
  positionBubble();

  // Show bubble
  bubble.classList.add('is-open');
  mascot.classList.add('is-speaking');

  // Auto-close after 5s
  clearTimeout(STATE.bubbleTimer);
  STATE.bubbleTimer = setTimeout(() => {
    closeBubble();
  }, 5000);

  console.log('[mascot] speaking:', quip);
}

function closeBubble() {
  if (!bubble || !mascot) return;

  STATE.speaking = false;
  bubble.classList.remove('is-open');
  mascot.classList.remove('is-speaking');
  bubble.setAttribute('aria-hidden', 'true');

  clearTimeout(STATE.bubbleTimer);
}

function positionBubble() {
  if (!bubble || !mascot) return;

  const mascotRect = mascot.getBoundingClientRect();

  // Position bubble above mascot
  const bubbleLeft = mascotRect.left + mascotRect.width / 2;
  const bubbleBottom = window.innerHeight - mascotRect.top + 12;

  bubble.style.left = `${bubbleLeft}px`;
  bubble.style.bottom = `${bubbleBottom}px`;
  bubble.style.transform = 'translate(-50%, 0)';
}

// ==================== PROXIMITY DETECTION & FADE ====================

function startProximityDetection() {
  if (!mascot) return;

  let lastMoveTime = performance.now();

  const checkProximity = () => {
    if (!mascot || !audioBar) return;

    const now = performance.now();
    const timeSinceMove = now - lastMoveTime;

    // If speaking, always visible
    if (STATE.speaking) {
      setMascotOpacity(1);
      STATE.proximityRaf = requestAnimationFrame(checkProximity);
      return;
    }

    // Fade after 2s idle
    if (timeSinceMove > 2000) {
      setMascotOpacity(0.25);
    }

    STATE.proximityRaf = requestAnimationFrame(checkProximity);
  };

  // Track mouse movement
  const onPointerMove = (e) => {
    const audioBarRect = audioBar?.getBoundingClientRect();
    const mascotRect = mascot?.getBoundingClientRect();

    if (!audioBarRect || !mascotRect) return;

    // Check if pointer near audio bar or mascot (64px threshold)
    const nearAudioBar = (
      e.clientY > audioBarRect.top - 64 &&
      e.clientY < audioBarRect.bottom + 64 &&
      e.clientX > audioBarRect.left - 64 &&
      e.clientX < audioBarRect.right + 64
    );

    const nearMascot = (
      e.clientY > mascotRect.top - 64 &&
      e.clientY < mascotRect.bottom + 64 &&
      e.clientX > mascotRect.left - 64 &&
      e.clientX < mascotRect.right + 64
    );

    if (nearAudioBar || nearMascot) {
      lastMoveTime = performance.now();
      setMascotOpacity(1);
    }
  };

  document.addEventListener('pointermove', onPointerMove, { passive: true });

  // Start RAF loop
  STATE.proximityRaf = requestAnimationFrame(checkProximity);

  console.log('[mascot] proximity detection started');
}

function setMascotOpacity(opacity) {
  if (!mascot) return;

  if (mascot.style.opacity !== String(opacity)) {
    mascot.style.opacity = opacity;
  }
}

// ==================== LOCATION SWITCHING ====================

export function setMascotLocation(location) {
  if (STATE.location === location) return;

  STATE.location = location;

  if (location === 'audio') {
    positionOnAudioBar();
  } else if (location === 'home') {
    positionNearLogo();
  }

  console.log('[mascot] location set to:', location);
}

// ==================== CLEANUP ====================

export function destroyMascotController() {
  if (STATE.proximityRaf) {
    cancelAnimationFrame(STATE.proximityRaf);
  }
  clearTimeout(STATE.idleTimer);
  clearTimeout(STATE.bubbleTimer);

  bubble?.remove();

  console.log('[mascot] controller destroyed');
}
