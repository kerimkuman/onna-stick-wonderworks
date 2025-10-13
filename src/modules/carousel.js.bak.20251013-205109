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

  // Extract from media src attribute OR iframe src
  const img = el.querySelector('img');
  const video = el.querySelector('video source');
  const iframe = el.querySelector('iframe');

  let src = '';
  if (img) src = img.getAttribute('src') || '';
  else if (video) src = video.getAttribute('src') || '';
  else if (iframe) src = iframe.getAttribute('src') || '';

  const lowerSrc = src.toLowerCase();

  // Direct pattern matching with debug logging
  if (/be-seen-on-every-screen/.test(lowerSrc)) return 'be-seen-on-every-screen';
  if (/build-your-legacy/.test(lowerSrc)) return 'build-your-legacy';
  if (/onna-stick-construction/.test(lowerSrc)) return 'onna-stick-construction';
  if (/barbers/.test(lowerSrc)) return 'barbers-logo';
  if (/bad-mother-earth-vinyl|bad-mother-earth-vinyl-spread/.test(lowerSrc)) return 'bad-mother-earth-vinyl-cover';
  if (/youtube\.com/.test(lowerSrc)) return 'bad-mother-earth-youtube';
  if (/fresh/.test(lowerSrc)) return 'fresh';
  if (/bar-fruit-supplies/.test(lowerSrc)) return 'bar-fruit-supplies-hero';
  if (/super-sweet/.test(lowerSrc)) return 'super-sweet';

  console.warn('[carousel] No key match for:', lowerSrc);
  return '';
}

function enforceOrder(track) {
  const rank = new Map(ORDER.map((k, i) => [k, i]));
  const kids = Array.from(track.children).map(el => ({ el, key: extractKey(el) }));
  kids.sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
  kids.forEach(({ el }) => track.appendChild(el));
  console.log('[carousel] order enforced:', kids.map(k => k.key));
}

function attachWheelWithAcceleration(track) {
  let accumulated = 0;

  track.addEventListener('wheel', (e) => {
    // Allow native horizontal scroll or browser zoom
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (e.ctrlKey || e.metaKey) return;

    let delta = e.deltaY;

    // Modifiers
    if (e.shiftKey) delta *= 0.4;  // Slower/precise
    if (e.altKey) delta *= 2.5;    // Faster

    accumulated += delta;

    // Snap threshold: once we accumulate enough delta, snap to next/prev slide
    const threshold = 100;

    if (Math.abs(accumulated) >= threshold) {
      const direction = accumulated > 0 ? 1 : -1;
      const slideWidth = track.offsetWidth;

      // Smooth scroll to next/prev slide with CSS snap handling the magnetism
      track.scrollBy({
        left: slideWidth * direction,
        behavior: 'smooth'
      });

      accumulated = 0; // reset after snap
    }

    e.preventDefault();
  }, { passive: false });

  console.log('[carousel] snap wheel ready (Shift=slow, Alt=fast)');
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

  // Enable snap-to-center for buttery magnetic feel
  track.style.scrollSnapType = 'x mandatory';

  // Add click handler to activate video embeds
  track.querySelectorAll('.video-embed-container').forEach(container => {
    container.addEventListener('click', () => {
      container.classList.add('active');
    });
  });

  enforceOrder(track);
  attachWheelWithAcceleration(track);
  attachKeyboard(track);
  attachHeaderHover(track);

  console.log('[carousel] initialized:', track);
}