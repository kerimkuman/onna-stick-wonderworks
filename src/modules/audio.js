/**
 * AUDIO MODULE
 * Simple two-channel system: BGM (3-track rotation) + Ambient (Wonderworks page only)
 * - HTMLAudioElement implementation (no WebAudio mixer)
 * - Play/Pause/Stop/Next controls
 * - Quadratic volume curve for natural loudness
 * - Continuity: resumes from last position
 * - SFX: homepage hover/click only
 * - Graceful fades for all audio transitions
 */

// ==================== FADE UTILITIES ====================

function now(){ return performance.now(); }

function fadeTo(el, target, dur=350) {
  if (!el) return Promise.resolve();
  const startVol = el.volume;
  const endVol = Math.max(0, Math.min(1, target));
  if (dur <= 0 || startVol === endVol) { el.volume = endVol; return Promise.resolve(); }
  let start = now(), raf;
  return new Promise(res=>{
    const tick = () => {
      const t = Math.min(1, (now()-start)/dur);
      const k = t*t*(3-2*t); // smoothstep
      el.volume = startVol + (endVol - startVol) * k;
      if (t < 1) raf = requestAnimationFrame(tick); else res();
    };
    raf = requestAnimationFrame(tick);
  });
}

async function fadeIn(el, finalVol, dur=350) {
  if (!el) return;
  const wasPaused = el.paused;
  const target = Math.max(0, Math.min(1, finalVol));
  el.volume = 0;
  if (wasPaused) { try { await el.play(); } catch {} }
  await fadeTo(el, target, dur);
}

async function fadeOutPause(el, dur=250) {
  if (!el) return;
  await fadeTo(el, 0, dur);
  el.pause();
}

async function fadeOutStop(el, dur=250) {
  if (!el) return;
  await fadeTo(el, 0, dur);
  el.pause(); el.currentTime = 0;
}

// ==================== STATE ====================

let bgmAudio = null;
let ambientAudio = null;

let isMusicMuted = false;  // mutes BGM + Ambient (NOT SFX)
let ambientEnabled = true;
let sfxEnabled = true;

let hasStarted = false;
let startListenersAttached = false;

let bgmIndex = 0;
let bgmPaused = true;

// localStorage keys
const LS = {
  mMute:      'audio.v1.music.muted',
  aEnabled:   'audio.v1.ambient.enabled',
  sfxEnabled: 'audio.v1.sfx.enabled',
  mVol:       'audio.v1.music.vol',      // slider value 0-1
  aVol:       'audio.v1.ambient.vol',    // slider value 0-1
  sfxVol:     'audio.v1.sfx.vol',        // slider value 0-1
  idx:        'audio.v1.music.index',
  t:          'audio.v1.music.time',
  aT:         'audio.v1.ambient.time'
};

// ==================== ASSETS ====================

const BGM_TRACKS = [
  '/assets/onnastick-bgm-1-copyright-kk.mp3',
  '/assets/onnastick-bgm-2-copyright-kk.mp3',
  '/assets/onnastick-bgm-3-copyright-kk.mp3'
];

const AMBIENT_SRC = '/assets/ambience-witches-cauldron.mp3';

const SFX = {
  logoHover: '/assets/sfx-logo-hover.mp3',
  logoClick: '/assets/sfx-logo-click.wav'
};

// ==================== VOLUME HELPERS ====================

/**
 * Convert UI slider value (0-1) to audio element volume using quadratic curve
 * This makes near-zero values truly quiet
 */
function sliderToVolume(sliderValue) {
  return sliderValue * sliderValue;
}

/**
 * Convert audio element volume back to slider value
 */
function volumeToSlider(volume) {
  return Math.sqrt(Math.max(0, volume));
}

// ==================== PERSISTENCE ====================

function persistState() {
  try {
    localStorage.setItem(LS.mMute, String(isMusicMuted));
    localStorage.setItem(LS.aEnabled, String(ambientEnabled));
    localStorage.setItem(LS.sfxEnabled, String(sfxEnabled));

    if (bgmAudio) {
      const sliderVol = volumeToSlider(bgmAudio.volume);
      localStorage.setItem(LS.mVol, String(sliderVol));
      localStorage.setItem(LS.idx, String(bgmIndex));
      localStorage.setItem(LS.t, String(bgmAudio.currentTime));
    }

    if (ambientAudio) {
      const sliderVol = volumeToSlider(ambientAudio.volume);
      localStorage.setItem(LS.aVol, String(sliderVol));
      localStorage.setItem(LS.aT, String(ambientAudio.currentTime));
    }
  } catch {}
}

function restoreState() {
  try {
    isMusicMuted   = localStorage.getItem(LS.mMute) === 'true';
    ambientEnabled = localStorage.getItem(LS.aEnabled) !== 'false';
    sfxEnabled     = localStorage.getItem(LS.sfxEnabled) !== 'false';

    const mSlider = parseFloat(localStorage.getItem(LS.mVol) ?? '0.5');
    const aSlider = parseFloat(localStorage.getItem(LS.aVol) ?? '0.4');
    const idx     = parseInt(localStorage.getItem(LS.idx) ?? '0', 10);
    const t       = parseFloat(localStorage.getItem(LS.t) ?? '0');
    const aT      = parseFloat(localStorage.getItem(LS.aT) ?? '0');

    bgmIndex = Math.max(0, Math.min(BGM_TRACKS.length - 1, idx));

    // Start unpaused if not muted
    bgmPaused = isMusicMuted;

    if (bgmAudio) {
      bgmAudio.volume = sliderToVolume(mSlider);
      try {
        if (t > 0 && t < bgmAudio.duration) {
          bgmAudio.currentTime = t;
        }
      } catch {}
    }

    if (ambientAudio) {
      ambientAudio.volume = sliderToVolume(aSlider);
      try {
        if (aT > 0) {
          ambientAudio.currentTime = aT;
        }
      } catch {}
    }

    console.log(`[audio] restored: muted=${isMusicMuted}, paused=${bgmPaused}, vol=${mSlider}`);
  } catch {}
}

// ==================== INITIALIZATION ====================

export function initAudio() {
  // Create audio elements
  bgmAudio = new Audio();
  bgmAudio.preload = 'auto';
  bgmAudio.preservesPitch = true;
  bgmAudio.volume = 0.5;

  ambientAudio = new Audio();
  ambientAudio.preload = 'auto';
  ambientAudio.loop = true;
  ambientAudio.preservesPitch = true;
  ambientAudio.volume = 0.16;  // 0.4² ≈ 0.16

  // Load first track
  loadBgm(bgmIndex);

  // Restore persisted state
  restoreState();

  // Auto-advance BGM on track end
  bgmAudio.addEventListener('ended', () => {
    console.log('[audio] track ended, advancing');
    exportAPI.nextBGM();
  });

  // Periodically save playback position
  bgmAudio.addEventListener('timeupdate', () => {
    if (Math.floor(bgmAudio.currentTime) % 10 === 0) {
      persistState();
    }
  });

  ambientAudio.addEventListener('timeupdate', () => {
    if (Math.floor(ambientAudio.currentTime) % 10 === 0) {
      persistState();
    }
  });

  // Setup first-gesture unlock
  attachUnlockOnce();

  console.log('[audio] initialized (simple 2-channel system)');
}

function loadBgm(index) {
  bgmIndex = (index + BGM_TRACKS.length) % BGM_TRACKS.length;
  if (!bgmAudio) return;

  bgmAudio.src = BGM_TRACKS[bgmIndex];
  bgmAudio.loop = false;
}

// ==================== AUTOPLAY UNLOCK ====================

function attachUnlockOnce() {
  if (startListenersAttached) return;
  startListenersAttached = true;

  const startOnInteraction = () => {
    if (!hasStarted) {
      hasStarted = true;

      // Only auto-start BGM if not muted
      if (!isMusicMuted) {
        exportAPI.playBGM();
      }

      // Start ambient if we're on wonderworks section and it's enabled
      if (!isMusicMuted && ambientEnabled && isOnWonderworksSection()) {
        exportAPI.playAmbient();
      }
    }

    document.removeEventListener('click', startOnInteraction);
    document.removeEventListener('keydown', startOnInteraction);
    document.removeEventListener('touchstart', startOnInteraction);
  };

  document.addEventListener('click', startOnInteraction);
  document.addEventListener('keydown', startOnInteraction);
  document.addEventListener('touchstart', startOnInteraction);
}

// ==================== ROUTING AWARENESS ====================

/**
 * Check if we're currently viewing home or wonderworks sections
 */
function isOnWonderworksSection() {
  // Check if home or wonderworks sections are in viewport
  const homeDoor = document.querySelector('#home-door');
  const wonderworksIntro = document.querySelector('#wonderworks-intro');
  const wonderworksWrapper = document.querySelector('#wonderworks-wrapper');

  if (!homeDoor && !wonderworksIntro && !wonderworksWrapper) return false;

  // Check if any section is at least 30% visible
  const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    const visible = Math.max(0, Math.min(rect.bottom, vh) - Math.max(rect.top, 0));
    return (visible / vh) > 0.3;
  };

  return isVisible(homeDoor) || isVisible(wonderworksIntro) || isVisible(wonderworksWrapper);
}

/**
 * Setup intersection observer to play/pause ambient based on section visibility
 *
 * CRITICAL: Ambient is for Home + Wonderworks sections (video background sections).
 * NOT controlled by carousel or any other module - purely page/route-based.
 *
 * Watches: #home-door, #wonderworks-intro, #wonderworks-wrapper
 * When 30%+ visible → plays ambient cauldron loop
 * When not visible → pauses ambient (saves time for resume)
 */
export function setupAmbientRouting() {
  const sections = ['#home-door', '#wonderworks-intro', '#wonderworks-wrapper'];
  let anyVisible = false;

  const observer = new IntersectionObserver((entries) => {
    anyVisible = entries.some(e => e.isIntersecting);

    if (anyVisible && ambientEnabled && !isMusicMuted && hasStarted) {
      exportAPI.playAmbient();
    } else if (!anyVisible) {
      exportAPI.pauseAmbient();
    }
  }, { threshold: 0.3 });

  sections.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) observer.observe(el);
  });

  console.log('[audio] ambient routing: Home + Wonderworks (NOT carousel-controlled)');
}

// ==================== BGM CONTROLS ====================

function bgmTargetVol() {
  const sliderVal = parseFloat(localStorage.getItem(LS.mVol) ?? '0.5');
  return sliderToVolume(sliderVal);
}

export async function playBGM() {
  if (!bgmAudio) return;
  if (isMusicMuted) return;

  try {
    bgmPaused = false;
    await fadeIn(bgmAudio, bgmTargetVol(), 400);
    persistState();
  } catch (e) {
    console.warn('[audio] play blocked:', e.message);
  }
}

export async function pauseBGM() {
  if (!bgmAudio) return;
  bgmPaused = true;
  await fadeOutPause(bgmAudio, 220);
  persistState();
}

export async function stopBGM() {
  if (!bgmAudio) return;
  bgmPaused = true;
  await fadeOutStop(bgmAudio, 220);
  persistState();
}

export async function nextBGM() {
  if (bgmAudio && !bgmAudio.paused) {
    await fadeOutPause(bgmAudio, 180);
  }
  loadBgm(bgmIndex + 1);
  if (!bgmPaused && !isMusicMuted) {
    await fadeIn(bgmAudio, bgmTargetVol(), 320);
  }
  persistState();
}

export async function prevBGM() {
  if (bgmAudio && !bgmAudio.paused) {
    await fadeOutPause(bgmAudio, 180);
  }
  loadBgm(bgmIndex - 1);
  if (!bgmPaused && !isMusicMuted) {
    await fadeIn(bgmAudio, bgmTargetVol(), 320);
  }
  persistState();
}

// ==================== AMBIENT CONTROLS ====================

function ambientTargetVol() {
  const sliderVal = parseFloat(localStorage.getItem(LS.aVol) ?? '0.4');
  return sliderToVolume(sliderVal);
}

function savedAmbientTime() {
  try {
    return parseFloat(localStorage.getItem(LS.aT) ?? '0');
  } catch {
    return 0;
  }
}

function saveAmbientTime() {
  try {
    if (ambientAudio) {
      localStorage.setItem(LS.aT, String(ambientAudio.currentTime));
    }
  } catch {}
}

export async function playAmbient() {
  if (!ambientAudio) return;
  if (!ambientEnabled || isMusicMuted) return;

  // Only play if on wonderworks section
  if (!isOnWonderworksSection()) return;

  if (ambientAudio.src !== location.origin + AMBIENT_SRC) {
    ambientAudio.src = AMBIENT_SRC;
  }

  try {
    ambientAudio.currentTime = savedAmbientTime();
  } catch {}

  try {
    await fadeIn(ambientAudio, ambientTargetVol(), 420);
    persistState();
  } catch (e) {
    console.warn('[audio] ambient play blocked:', e.message);
  }
}

export async function pauseAmbient() {
  if (!ambientAudio) return;
  saveAmbientTime();
  await fadeOutPause(ambientAudio, 220);
  persistState();
}

export async function stopAmbient() {
  if (!ambientAudio) return;
  saveAmbientTime();
  await fadeOutStop(ambientAudio, 220);
  persistState();
}

// ==================== MASTER CONTROLS ====================

/**
 * Master toggle for MUSIC channels (BGM + Ambient). SFX is NOT affected.
 * Uses graceful fades instead of hard mute.
 */
export async function toggleMute() {
  isMusicMuted = !isMusicMuted;

  if (isMusicMuted) {
    await Promise.all([
      bgmAudio && !bgmAudio.paused ? fadeOutPause(bgmAudio, 200) : Promise.resolve(),
      ambientAudio && !ambientAudio.paused ? fadeOutPause(ambientAudio, 200) : Promise.resolve()
    ]);
  } else {
    const promises = [];
    if (bgmAudio && !bgmPaused) {
      promises.push(fadeIn(bgmAudio, bgmTargetVol(), 280));
    }
    if (ambientEnabled && isOnWonderworksSection()) {
      promises.push(playAmbient());
    }
    await Promise.all(promises);
  }

  console.log(`[audio] music ${isMusicMuted ? 'muted' : 'unmuted'}`);
  persistState();
  return isMusicMuted;
}

/**
 * Enable/disable ambient channel ONLY.
 */
export function toggleAmbientEnabled() {
  ambientEnabled = !ambientEnabled;

  if (!ambientEnabled) {
    pauseAmbient();
  } else if (!isMusicMuted && isOnWonderworksSection()) {
    playAmbient();
  }

  persistState();
  return ambientEnabled;
}

/**
 * Enable/disable SFX (terminal only, homepage always plays)
 */
export function toggleSfxEnabled() {
  sfxEnabled = !sfxEnabled;
  localStorage.setItem(LS.sfxEnabled, String(sfxEnabled));
  return sfxEnabled;
}

// ==================== VOLUME CONTROLS ====================

/**
 * Set volumes separately (slider values 0-1, converted to quadratic for element)
 */
export function setVolume(bgmSlider, ambientSlider) {
  if (bgmSlider !== null && bgmSlider !== undefined && bgmAudio) {
    const clamped = Math.max(0, Math.min(1, bgmSlider));
    bgmAudio.volume = sliderToVolume(clamped);
    localStorage.setItem(LS.mVol, String(clamped));
  }

  if (ambientSlider !== null && ambientSlider !== undefined && ambientAudio) {
    const clamped = Math.max(0, Math.min(1, ambientSlider));
    ambientAudio.volume = sliderToVolume(clamped);
    localStorage.setItem(LS.aVol, String(clamped));
  }
}

/**
 * Get current slider values (sqrt of element volume)
 */
export function getVolume() {
  return {
    bgm: bgmAudio ? volumeToSlider(bgmAudio.volume) : 0.5,
    ambient: ambientAudio ? volumeToSlider(ambientAudio.volume) : 0.4
  };
}

// ==================== SFX ====================

// Preloaded SFX cache for low-latency playback
const sfxCache = new Map();

// Home doorway hover loop (persistent, reused)
let hoverLoopAudio = null;
let isHoverLoopPlaying = false;

/**
 * Preload homepage SFX for instant playback
 */
export async function preloadHomepageSfx() {
  const urls = [SFX.logoHover, SFX.logoClick];

  for (const url of urls) {
    try {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.load();
      sfxCache.set(url, audio);
    } catch (e) {
      console.warn('[audio] sfx preload failed:', url);
    }
  }

  // Create persistent hover loop element (paused by default)
  hoverLoopAudio = new Audio(SFX.logoHover);
  hoverLoopAudio.preload = 'auto';
  hoverLoopAudio.loop = true;
  hoverLoopAudio.volume = 0; // Start at 0, will fade in on hover
  hoverLoopAudio.pause(); // Ensure it's paused

  console.log('[audio] homepage SFX preloaded (paused)');
}

/**
 * HOME DOORWAY HOVER - Start looping hover SFX with fade in
 * Resets to 0 and plays from beginning each time
 */
export async function startDoorwayHover() {
  if (!sfxEnabled) return;
  if (!hoverLoopAudio) return;

  try {
    hoverLoopAudio.currentTime = 0;
    await fadeIn(hoverLoopAudio, 0.8, 160);
    isHoverLoopPlaying = true;
  } catch (e) {
    // Ignore autoplay blocks
  }
}

/**
 * HOME DOORWAY HOVER END - Stop hover loop with fade out
 */
export async function stopDoorwayHover() {
  if (!hoverLoopAudio) return;

  await fadeOutStop(hoverLoopAudio, 140);
  isHoverLoopPlaying = false;
}

/**
 * HOME DOORWAY CLICK - Stop hover, play click once with fade out
 * NO OVERLAP: hover loop must stop before click plays
 */
export async function playDoorwayClick() {
  if (!sfxEnabled) return;

  // CRITICAL: Stop hover loop first (no overlap)
  await stopDoorwayHover();

  // Play click one-shot with fade out
  try {
    const clickAudio = new Audio(SFX.logoClick);
    clickAudio.volume = 0.8;
    await clickAudio.play();

    // Fade out after a short delay
    setTimeout(async () => {
      await fadeTo(clickAudio, 0, 120);
      clickAudio.pause();
      clickAudio.src = '';
      clickAudio.remove();
    }, clickAudio.duration * 1000 - 150); // Fade out in last 150ms

  } catch (e) {
    // Ignore - SFX failures are non-critical
  }
}

/**
 * Play a short SFX clip (NOT affected by music mute)
 * For terminal and other UI sounds (not doorway)
 */
export async function playSfx(url) {
  // All SFX respects sfxEnabled toggle
  if (!sfxEnabled) return;

  try {
    // Use cached audio if available, otherwise create new
    let audio = sfxCache.get(url);

    if (!audio) {
      audio = new Audio(url);
      audio.preload = 'auto';
    } else {
      // Clone for concurrent playback
      audio = audio.cloneNode();
    }

    const sfxVol = parseFloat(localStorage.getItem(LS.sfxVol) ?? '0.8');
    audio.volume = sfxVol;

    await audio.play();

    // Auto cleanup
    audio.onended = () => {
      audio.src = '';
      audio.remove();
    };
  } catch (e) {
    // Ignore - SFX failures are non-critical
  }
}

/**
 * Cleanup doorway SFX on navigation/visibility change
 */
export function cleanupDoorwaySfx() {
  stopDoorwayHover();
}

// ==================== STATE GETTERS ====================

export const audioState = {
  get isMusicMuted() { return isMusicMuted; },
  get ambientEnabled() { return ambientEnabled; },
  get sfxEnabled() { return sfxEnabled; },
  get bgmIndex() { return bgmIndex; },
  get bgmPaused() { return bgmPaused; },
  get currentTrack() {
    return {
      index: bgmIndex,
      total: BGM_TRACKS.length,
      src: BGM_TRACKS[bgmIndex],
      currentTime: bgmAudio?.currentTime || 0,
      duration: bgmAudio?.duration || 0
    };
  }
};

// Export convenience API
const exportAPI = {
  playBGM,
  pauseBGM,
  stopBGM,
  nextBGM,
  prevBGM,
  playAmbient,
  pauseAmbient,
  stopAmbient
};

// Auto-attach unlock on DOM ready
if (document.readyState !== 'loading') attachUnlockOnce();
else document.addEventListener('DOMContentLoaded', attachUnlockOnce);
