/**
 * WONDERWORKS CAROUSEL MODULE
 * Horizontal snap-scrolling carousel with:
 * - Slide order enforcement
 * - Smooth wheel behavior with Shift/Alt modifiers
 * - Keyboard arrow navigation
 * - Edge handoff to page scroll
 * - Header fade/show on hover
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

export function initCarousel() {
  const scroller = document.querySelector('.wonderworks-scroller');
  if (!scroller) {
    console.warn('[carousel] no .wonderworks-scroller found');
    return;
  }

  // --- Config ---
  const friction = 0.90;        // momentum decay
  const baseStep = 55;          // pixels per notch (before modifiers)
  const slowMul = 0.45;         // Shift = precise
  const fastMul = 2.5;          // Alt = fast
  const snapDelay = 140;        // ms after last movement to snap
  const minSnapDelta = 0.5;     // don't snap if we barely moved

  let vx = 0;                   // horizontal velocity
  let raf = 0;
  let lastWheel = 0;

  // Helper: where are we?
  const atLeft  = () => scroller.scrollLeft <= 1;
  const atRight = () => Math.ceil(scroller.scrollLeft + scroller.clientWidth) >= scroller.scrollWidth - 1;

  // Helper: one full "slide" width equals the viewport width
  const slideW = () => scroller.clientWidth;

  // Momentum loop
  function tick() {
    if (Math.abs(vx) < 0.1) { vx = 0; raf = 0; maybeSnap(); return; }
    scroller.scrollLeft += vx;
    vx *= friction;

    // clamp at edges so page can take over on next wheel
    if (atLeft() && vx < 0) { vx = 0; raf = 0; maybeSnap(true); return; }
    if (atRight() && vx > 0) { vx = 0; raf = 0; maybeSnap(true); return; }

    raf = requestAnimationFrame(tick);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }

  // Snap to nearest slide after idle
  function maybeSnap(force = false) {
    const now = performance.now();
    const since = now - lastWheel;
    if (!force && since < snapDelay) return;

    const w = slideW();
    const rawIndex = scroller.scrollLeft / w;
    const targetIndex = Math.round(rawIndex);
    const targetLeft = targetIndex * w;
    const delta = Math.abs(scroller.scrollLeft - targetLeft);

    if (delta > minSnapDelta) {
      scroller.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
    saveCurrentIndex();
  }

  // Save current slide index to sessionStorage
  function saveCurrentIndex() {
    try {
      const w = slideW();
      const currentIndex = Math.round(scroller.scrollLeft / w);
      sessionStorage.setItem('carousel.currentSlide', String(currentIndex));
    } catch {}
  }

  // Restore last viewed slide from sessionStorage
  function restorePosition() {
    try {
      const saved = sessionStorage.getItem('carousel.currentSlide');
      if (saved !== null) {
        const index = parseInt(saved, 10);
        if (!isNaN(index) && index >= 0 && index < ORDER.length) {
          const targetLeft = index * slideW();
          scroller.scrollTo({ left: targetLeft, behavior: 'auto' });
        }
      }
    } catch {}
  }

  // Wheel handler with edge pass-through
  function onWheel(e) {
    // allow page scroll at edges in direction of travel (no preventDefault)
    const dy = e.deltaY;
    const dx = e.deltaX;
    const intent = Math.abs(dx) > Math.abs(dy) ? dx : dy;

    // Modifiers
    let mul = 1;
    if (e.shiftKey) mul *= slowMul;
    if (e.altKey)   mul *= fastMul;

    // Edge handoff: let page scroll continue if at edge
    if ((intent > 0 && atRight()) || (intent < 0 && atLeft())) {
      vx = 0; // kill momentum so we don't pull back
      return; // let page handle (no preventDefault)
    }

    // We own the wheel within bounds
    e.preventDefault();

    // Convert wheel to horizontal velocity kick (normalize a bit for trackpads)
    const step = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * baseStep * mul * 0.02;
    vx += step;
    lastWheel = performance.now();
    kick();
  }

  // Keyboard support (Arrow keys + Home/End)
  function onKey(e) {
    // Home: jump to first slide
    if (e.key === 'Home') {
      e.preventDefault();
      scroller.scrollTo({ left: 0, behavior: 'smooth' });
      saveCurrentIndex();
      return;
    }

    // End: jump to last slide
    if (e.key === 'End') {
      e.preventDefault();
      const lastSlideLeft = (ORDER.length - 1) * slideW();
      scroller.scrollTo({ left: lastSlideLeft, behavior: 'smooth' });
      saveCurrentIndex();
      return;
    }

    // Arrow keys: ~80% viewport width
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const dir = e.key === 'ArrowRight' ? 1 : -1;

    // Edge handoff for keyboard too
    if ((dir > 0 && atRight()) || (dir < 0 && atLeft())) return;

    e.preventDefault();
    const w = slideW();
    const jumpDist = w * 0.8; // ~80% viewport width
    scroller.scrollBy({ left: jumpDist * dir, behavior: 'smooth' });
    lastWheel = performance.now();
  }

  // Make focusable so it reliably receives wheel/keys
  scroller.tabIndex = 0;

  // Attach listeners
  scroller.addEventListener('wheel', onWheel, { passive: false });
  scroller.addEventListener('keydown', onKey);

  // Optional: snap after manual (touch/drag) scroll settles
  let snapTimer;
  scroller.addEventListener('scroll', () => {
    if (vx !== 0) return; // momentum in progress
    clearTimeout(snapTimer);
    snapTimer = setTimeout(() => {
      maybeSnap(true);
      saveCurrentIndex();
    }, 140);
  }, { passive: true });

  // Mark body for CSS styling
  document.body.classList.add('in-carousel');

  // Enable snap-to-start for buttery magnetic feel
  scroller.style.scrollSnapType = 'x mandatory';

  // Add click handler to activate video embeds
  scroller.querySelectorAll('.video-embed-container').forEach(container => {
    container.addEventListener('click', () => {
      container.classList.add('active');
    });
  });

  // Enforce slide order
  enforceOrder(scroller);

  // Add ARIA labels for accessibility
  addAccessibilityLabels(scroller);

  // Restore previous position from sessionStorage
  restorePosition();

  // Setup header fade/show behavior
  setupHeaderFade();

  // Setup video autoplay on slide visibility
  setupVideoAutoplay(scroller);

  // Console logs for verification
  console.log('[carousel] order enforced:', ORDER);
  console.log('[carousel] snap wheel ready (Shift=slow, Alt=fast)');
  console.log('[carousel] keyboard: arrows, Home, End');
  console.log('[carousel] persistence: sessionStorage');
  console.log('[carousel] a11y: ARIA labels added');
  console.log('[carousel] header fade/show-on-hover ready');
  console.log('[carousel] initialized:', scroller);
}

function setupVideoAutoplay(scroller) {
  const videos = scroller.querySelectorAll('video');
  if (videos.length === 0) return;

  const observerOptions = {
    root: scroller,
    threshold: 0.5  // Play when 50% of video is visible
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {}); // Ignore autoplay failures
      } else {
        video.pause();
      }
    });
  }, observerOptions);

  videos.forEach(video => observer.observe(video));
}

function enforceOrder(scroller) {
  const rank = new Map(ORDER.map((k, i) => [k, i]));
  const kids = Array.from(scroller.children).map(el => {
    const key = el.id || '';
    return { el, key };
  });
  kids.sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
  kids.forEach(({ el }) => scroller.appendChild(el));
}

function addAccessibilityLabels(scroller) {
  // Container already has role="region" and aria-label in HTML
  // Add slide-specific ARIA labels
  const slides = scroller.querySelectorAll('.ww-slide');
  const total = slides.length;

  slides.forEach((slide, index) => {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `Slide ${index + 1} of ${total}`);
  });
}

function setupHeaderFade() {
  const header = document.querySelector('#site-header');
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

  // Show when navigation receives focus
  const navLinks = header.querySelectorAll('a, button, [tabindex]');
  navLinks.forEach(link => {
    link.addEventListener('focus', showHeader);
  });

  // Also show on direct header hover
  header.addEventListener('mouseenter', showHeader);
}
