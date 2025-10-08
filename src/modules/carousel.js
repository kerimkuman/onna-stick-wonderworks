'use strict';

/**
 * Wonderworks carousel
 * - Enforce custom order
 * - Smooth wheel acceleration with Ctrl/Shift modifiers
 * - Header fade/show-on-hover behavior
 * - Keyboard arrows
 */

const ORDER = [
  'be-seen-on-every-screen',
  'build-your-legacy',
  'onna-stick-construction',
  'barbers-logo',
  'bad-mother-earth-vinyl-cover',
  'bad-mother-earth-youtube',
  'fresh',
  'bar-fruit-supplies-hero',
  'super-sweet'
];

function q(sel) { return document.querySelector(sel); }

function getTrack() {
  return q('.wonderworks-scroller')
      || q('[data-carousel-track]')
      || q('.carousel-track')
      || q('.carousel .track')
      || null;
}

function extractKey(el) {
  const id = el.dataset?.id || el.getAttribute?.('data-id');
  if (id) return id.toLowerCase();
  const m = el.querySelector?.('img,video,source,iframe')?.getAttribute?.('src')?.toLowerCase()
     ?.match(/([a-z0-9-]+)\.(mp4|webm|png|jpe?g|svg)$/);
  return m ? m[1] : (el.id?.toLowerCase() || '');
}

function enforceOrder(track) {
  const rank = new Map(ORDER.map((k, i) => [k, i]));
  const kids = Array.from(track.children).map(el => ({ el, key: extractKey(el) }));
  kids.sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
  kids.forEach(({ el }) => track.appendChild(el));
  console.log('[carousel] order enforced:', kids.map(k => k.key));
}

function attachWheelWithAcceleration(track) {
  let velocity = 0;
  let rafId = null;

  function applyScroll() {
    if (Math.abs(velocity) < 0.1) {
      velocity = 0;
      rafId = null;
      return;
    }
    track.scrollLeft += velocity;
    velocity *= 0.85; // deceleration factor
    rafId = requestAnimationFrame(applyScroll);
  }

  track.addEventListener('wheel', (e) => {
    // Allow native horizontal scroll or browser zoom (Ctrl/Cmd on most browsers)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    let delta = e.deltaY;

    // Modifiers (check ctrlKey first - browser zoom)
    if (e.ctrlKey || e.metaKey) {
      // User might be zooming - let browser handle it
      return;
    }
    if (e.shiftKey) {
      delta *= 0.4; // Slower/precise scrolling
    }
    // For faster scrolling, user can use Shift+Wheel or we could add Alt modifier
    // Let's add Alt for 2.5x speed
    if (e.altKey) {
      delta *= 2.5; // Faster scrolling
    }

    velocity += delta * 0.6; // acceleration factor
    velocity = Math.max(-50, Math.min(50, velocity)); // clamp velocity

    e.preventDefault();

    if (!rafId) {
      rafId = requestAnimationFrame(applyScroll);
    }
  }, { passive: false });

  console.log('[carousel] smooth wheel acceleration ready (Shift=slow, Alt=fast)');
}

function attachKeyboard(track) {
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      track.scrollBy({ left: 420, behavior: 'smooth' });
      e.preventDefault();
    }
    if (e.key === 'ArrowLeft') {
      track.scrollBy({ left: -420, behavior: 'smooth' });
      e.preventDefault();
    }
  });
  console.log('[carousel] keyboard arrows ready');
}

function attachHeaderHover() {
  const header = q('#site-header');
  if (!header) return;

  let idleTimer = null;

  function showHeader() {
    header.classList.add('show-on-hover');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      header.classList.remove('show-on-hover');
    }, 2000); // hide after 2s of inactivity
  }

  // Show header when mouse moves near top 15% of viewport
  document.addEventListener('mousemove', (e) => {
    if (e.clientY < window.innerHeight * 0.15) {
      showHeader();
    }
  });

  // Also show on direct header hover
  header.addEventListener('mouseenter', showHeader);

  console.log('[carousel] header fade/show-on-hover ready');
}

export function initCarousel() {
  const track = getTrack();
  if (!track) {
    console.warn('[carousel] no track found');
    return;
  }

  // Mark body for CSS styling
  document.body.classList.add('in-carousel');
  track.classList.add('ww-scroll-ready');
  track.setAttribute('tabindex', '0'); // make focusable for keyboard

  enforceOrder(track);
  attachWheelWithAcceleration(track);
  attachKeyboard(track);
  attachHeaderHover(track);

  console.log('[carousel] initialized:', track);
}