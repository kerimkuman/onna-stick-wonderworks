'use strict';

/**
 * Wonderworks carousel
 * - Enforce custom order
 * - Convert vertical mouse wheel to horizontal scroll (passive: false)
 * - Keep native touch, trackpad & keyboard behavior
 */

const SELECTORS = [
  '.wonderworks-scroller',          // your primary class (already in DOM)
  '[data-carousel-track]',
  '.carousel-track',
  '.carousel .track'
];

const ORDER = [
  // Make sure these keys appear in your slide data-id OR in filename in <img src=".../key.ext">
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

function getTrack() {
  for (const sel of SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function extractKey(slide) {
  // Prefer explicit data-id
  const explicit = slide.dataset?.id || slide.getAttribute?.('data-id');
  if (explicit) return explicit.toLowerCase();

  // Fall back to filename in an <img>/<video>/<source>/<iframe> src
  const media = slide.querySelector?.('img,video,source,iframe');
  const src = media?.getAttribute?.('src') || '';
  const m = src.toLowerCase().match(/([a-z0-9-]+)\.(?:mp4|webm|png|jpe?g|svg)$/);
  if (m) return m[1];

  // Last resort: element id
  return slide.id?.toLowerCase() || '';
}

function enforceOrder(track) {
  const children = Array.from(track.children);
  if (!children.length) return;

  const rank = new Map(ORDER.map((k, i) => [k, i]));
  const withKeys = children.map(el => ({ el, key: extractKey(el) }));

  withKeys.sort((a, b) => {
    const ra = rank.has(a.key) ? rank.get(a.key) : 999;
    const rb = rank.has(b.key) ? rank.get(b.key) : 999;
    return ra - rb;
  });

  // Re-append in new order
  withKeys.forEach(({ el }) => track.appendChild(el));
  console.log('[carousel] order enforced');
}

function attachWheelToHorizontal(track) {
  // If user is deliberately horizontal scrolling already, let deltaX through.
  // Otherwise convert vertical deltaY → horizontal scrollLeft.
  let pending = 0;
  let ticking = false;

  function flush() {
    track.scrollLeft += pending;
    pending = 0;
    ticking = false;
  }

  track.addEventListener('wheel', (e) => {
    // Do not hijack with Ctrl/Meta (browser zoom) or if horizontal intent already > vertical
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    // convert vertical to horizontal
    pending += e.deltaY;
    e.preventDefault(); // IMPORTANT: requires {passive:false}

    if (!ticking) {
      ticking = true;
      requestAnimationFrame(flush);
    }
  }, { passive: false });

  // Keyboard fallback (← →)
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { track.scrollBy({ left: 420, behavior: 'smooth' }); }
    if (e.key === 'ArrowLeft')  { track.scrollBy({ left: -420, behavior: 'smooth' }); }
  });

  console.log('[carousel] wheel-to-horizontal ready');
}

function init() {
  const track = getTrack();
  if (!track) {
    console.warn('[carousel] no track found');
    return;
  }

  // mark for styling hooks
  track.classList.add('ww-scroll-ready');
  document.body.classList.add('in-carousel');

  enforceOrder(track);
  attachWheelToHorizontal(track);

  console.log('[carousel] minimal ready (bound to .wonderworks-scroller)');
}

// Run after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}