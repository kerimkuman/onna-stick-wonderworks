/**
 * WONDERWORKS CAROUSEL MODULE
 * Simplified horizontal snap-scrolling carousel with:
 * - Native smooth scroll-snap behavior
 * - Wheel and keyboard navigation
 * - Slide progress indicators
 * - Header + audio bar fade on hover
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

  // Enforce slide order
  enforceOrder(scroller);

  // Add accessibility labels
  addAccessibilityLabels(scroller);

  // Create slide indicators
  const indicators = createSlideIndicators(scroller);

  // Mark body for CSS styling
  document.body.classList.add('in-carousel');

  // Enable native scroll-snap for buttery smooth scrolling
  scroller.style.scrollSnapType = 'x mandatory';
  scroller.style.scrollBehavior = 'smooth';

  // Make focusable
  scroller.tabIndex = 0;

  // Track current slide
  let currentSlide = 0;
  const slides = scroller.querySelectorAll('.ww-slide');
  const totalSlides = slides.length;

  // Helper: get slide width
  const getSlideWidth = () => scroller.clientWidth;

  // Helper: update current slide index based on scroll position
  function updateCurrentSlide() {
    const slideWidth = getSlideWidth();
    const scrollLeft = scroller.scrollLeft;
    const newSlide = Math.round(scrollLeft / slideWidth);

    // Only update if actually changed AND scroll is near a snap point
    const snapOffset = Math.abs((scrollLeft % slideWidth) - slideWidth) < 50 ||
                       Math.abs(scrollLeft % slideWidth) < 50;

    if (newSlide !== currentSlide && snapOffset) {
      currentSlide = newSlide;
      updateIndicators(currentSlide);
      saveCurrentIndex(currentSlide);
    }
  }

  // Update indicators
  function updateIndicators(index) {
    indicators.querySelectorAll('button').forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  }

  // Save/restore position
  function saveCurrentIndex(index) {
    try {
      sessionStorage.setItem('carousel.currentSlide', String(index));
    } catch {}
  }

  function restorePosition() {
    try {
      const saved = sessionStorage.getItem('carousel.currentSlide');
      if (saved !== null) {
        const index = parseInt(saved, 10);
        if (!isNaN(index) && index >= 0 && index < totalSlides) {
          scrollToSlide(index, false); // No smooth scroll on restore
        }
      }
    } catch {}
  }

  // Scroll to specific slide
  function scrollToSlide(index, smooth = true) {
    const targetLeft = index * getSlideWidth();
    scroller.scrollTo({
      left: targetLeft,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  // Debounce wheel events for smoother scrolling
  let wheelTimeout;
  let isScrolling = false;

  // Wheel handler - simple one-slide-at-a-time with debounce
  function onWheel(e) {
    const delta = e.deltaY || e.deltaX;

    // Ignore tiny movements (trackpad jitter)
    if (Math.abs(delta) < 10) return;

    // If already scrolling, ignore new wheel events for smoothness
    if (isScrolling) {
      e.preventDefault();
      return;
    }

    // Determine direction
    const direction = delta > 0 ? 1 : -1;
    const targetSlide = Math.max(0, Math.min(totalSlides - 1, currentSlide + direction));

    // Edge handoff: let page scroll if at edge and trying to go further
    if ((targetSlide === currentSlide && direction > 0 && currentSlide === totalSlides - 1) ||
        (targetSlide === currentSlide && direction < 0 && currentSlide === 0)) {
      return; // Let page handle scroll
    }

    // Prevent default and scroll to next/prev slide
    e.preventDefault();
    if (targetSlide !== currentSlide) {
      isScrolling = true;
      currentSlide = targetSlide;
      scrollToSlide(targetSlide, true);

      // Allow next scroll after animation completes
      clearTimeout(wheelTimeout);
      wheelTimeout = setTimeout(() => {
        isScrolling = false;
      }, 400); // Debounce for smooth scrolling
    }
  }

  // Keyboard handler
  function onKey(e) {
    if (e.key === 'Home') {
      e.preventDefault();
      scrollToSlide(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      scrollToSlide(totalSlides - 1);
      return;
    }

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(totalSlides - 1, currentSlide + 1);
      scrollToSlide(next);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = Math.max(0, currentSlide - 1);
      scrollToSlide(prev);
      return;
    }
  }

  // Scroll listener for updating indicators
  let scrollTimeout;
  scroller.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(updateCurrentSlide, 100);
  }, { passive: true });

  // Attach event listeners
  scroller.addEventListener('wheel', onWheel, { passive: false });
  scroller.addEventListener('keydown', onKey);

  // Indicator click handlers
  indicators.querySelectorAll('button').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      scrollToSlide(index);
    });
  });

  // Setup header + audio bar fade
  setupBarsFade();

  // Setup video autoplay
  setupVideoAutoplay(scroller);

  // Restore previous position
  restorePosition();

  // Initial indicator update
  updateIndicators(currentSlide);

  console.log('[carousel] initialized:', totalSlides, 'slides');
  console.log('[carousel] smooth native scroll-snap enabled');
  console.log('[carousel] keyboard: arrows, Home, End');
}

function createSlideIndicators(scroller) {
  const slides = scroller.querySelectorAll('.ww-slide');
  const container = document.createElement('div');
  container.className = 'carousel-indicators';

  slides.forEach((_, index) => {
    const btn = document.createElement('button');
    btn.setAttribute('aria-label', `Go to slide ${index + 1}`);
    container.appendChild(btn);
  });

  document.body.appendChild(container);
  return container;
}

function setupVideoAutoplay(scroller) {
  const videos = scroller.querySelectorAll('video');
  if (videos.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, { root: scroller, threshold: 0.5 });

  videos.forEach(video => observer.observe(video));
}

function enforceOrder(scroller) {
  const rank = new Map(ORDER.map((k, i) => [k, i]));
  const kids = Array.from(scroller.children).map(el => ({
    el,
    key: el.id || ''
  }));
  kids.sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
  kids.forEach(({ el }) => scroller.appendChild(el));
}

function addAccessibilityLabels(scroller) {
  const slides = scroller.querySelectorAll('.ww-slide');
  const total = slides.length;

  slides.forEach((slide, index) => {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `Slide ${index + 1} of ${total}`);
  });
}

function setupBarsFade() {
  const header = document.querySelector('#site-header');
  const audioBar = document.querySelector('.audio-controls-fixed');
  if (!header) return;

  let idleTimer = null;

  function showBars() {
    header.classList.add('show-on-hover');
    if (audioBar) audioBar.classList.add('show-on-hover');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      header.classList.remove('show-on-hover');
      if (audioBar) audioBar.classList.remove('show-on-hover');
    }, 2000);
  }

  // Show bars when mouse moves near top 15% or bottom 15% of viewport
  document.addEventListener('mousemove', (e) => {
    if (e.clientY < window.innerHeight * 0.15 || e.clientY > window.innerHeight * 0.85) {
      showBars();
    }
  }, { passive: true });

  // Show when controls receive focus
  const headerControls = header.querySelectorAll('a, button, [tabindex]');
  headerControls.forEach(control => {
    control.addEventListener('focus', showBars);
  });

  if (audioBar) {
    const audioControls = audioBar.querySelectorAll('button, input, [tabindex]');
    audioControls.forEach(control => {
      control.addEventListener('focus', showBars);
    });
    audioBar.addEventListener('mouseenter', showBars);
  }

  header.addEventListener('mouseenter', showBars);
}
