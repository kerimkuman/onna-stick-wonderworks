/**
 * AUDIO MODULE (cleaned)
 * - Separate channels: BGM (playlist) + AMBIENT
 * - Independent mute/volume + persistence
 * - Play/Pause/Next/Prev for BGM
 * - Ambient on/off that does NOT affect SFX/terminal
 * - Tiny playSfx(url) helper that ignores music mute
 */

let bgmAudioA = null;   // crossfade-ready pair (we use only one by default)
let bgmAudioB = null;
let useA = true;

let ambientAudio = null;

let isMusicMuted = false;    // mutes BGM + Ambient (NOT SFX)
let ambientEnabled = true;

let hasStarted = false;      // unlock on first user gesture
let startListenersAttached = false;

let bgmIndex = 0;            // current track index
let bgmPaused = true;

const LS = {
  mMute: 'audio.v1.music.muted',
  aEnabled: 'audio.v1.ambient.enabled',
  mVol: 'audio.v1.music.vol',
  aVol: 'audio.v1.ambient.vol',
  idx: 'audio.v1.music.index',
  t:   'audio.v1.music.time'
};

// ---- Configure your tracks here ----
const BGM_TRACKS = [
  '/assets/bgm-1.mp3',
  '/assets/bgm-2.mp3',
  '/assets/bgm-3.mp3'
];

const AMBIENT_TRACKS = {
  wonderworks: '/assets/ambience-witches-cauldron.mp3',
  terminal:    '/assets/ambience-witches-cauldron.mp3',
  computer:    '/assets/ambient-computer-noise.mp3'
};

// ------------------ Internal helpers ------------------

function currentBgmEl() { return useA ? bgmAudioA : bgmAudioB; }
function nextBgmEl()    { return useA ? bgmAudioB : bgmAudioA; }
function swapBgmEls()   { useA = !useA; }

function persistState() {
  localStorage.setItem(LS.mMute, String(isMusicMuted));
  localStorage.setItem(LS.aEnabled, String(ambientEnabled));
  localStorage.setItem(LS.mVol, String(currentBgmEl()?.volume ?? 0.25));
  localStorage.setItem(LS.aVol, String(ambientAudio?.volume ?? 0.15));
  localStorage.setItem(LS.idx, String(bgmIndex));
  try { localStorage.setItem(LS.t, String(currentBgmEl()?.currentTime ?? 0)); } catch {}
}

function restoreState() {
  isMusicMuted   = (localStorage.getItem(LS.mMute) ?? 'false') === 'true';
  ambientEnabled = (localStorage.getItem(LS.aEnabled) ?? 'true') === 'true';

  const mv = parseFloat(localStorage.getItem(LS.mVol) ?? '0.25');
  const av = parseFloat(localStorage.getItem(LS.aVol) ?? '0.15');
  const idx = parseInt(localStorage.getItem(LS.idx) ?? '0', 10);
  const t   = parseFloat(localStorage.getItem(LS.t) ?? '0');

  if (!Number.isNaN(idx)) bgmIndex = Math.max(0, Math.min(BGM_TRACKS.length - 1, idx));

  if (bgmAudioA) bgmAudioA.volume = mv;
  if (bgmAudioB) bgmAudioB.volume = mv;
  if (ambientAudio) ambientAudio.volume = av;

  try { if (currentBgmEl()) currentBgmEl().currentTime = t; } catch {}
}

function attachUnlockOnce() {
  if (startListenersAttached) return;
  startListenersAttached = true;
  const startOnInteraction = () => {
    if (!hasStarted) {
      hasStarted = true;
      // Only auto-start BGM if not muted
      if (!isMusicMuted) exportAPI.playBGM();
      // If ambient was meant to be playing, start it too
      if (!isMusicMuted && ambientEnabled) exportAPI.playAmbient('terminal');
    }
    document.removeEventListener('click', startOnInteraction);
    document.removeEventListener('keydown', startOnInteraction);
    document.removeEventListener('touchstart', startOnInteraction);
  };
  document.addEventListener('click', startOnInteraction);
  document.addEventListener('keydown', startOnInteraction);
  document.addEventListener('touchstart', startOnInteraction);
}

async function safePlay(el) {
  try { await el.play(); } catch { /* autoplay blocked until first gesture */ }
}

function loadBgm(index) {
  bgmIndex = (index + BGM_TRACKS.length) % BGM_TRACKS.length;
  const el = currentBgmEl();
  if (!el) return;
  if (el.src !== location.origin + BGM_TRACKS[bgmIndex] && !BGM_TRACKS[bgmIndex].startsWith('http')) {
    el.src = BGM_TRACKS[bgmIndex];
  } else {
    el.src = BGM_TRACKS[bgmIndex];
  }
  el.loop = false; // we’ll handle “next” manually so Next/Prev work nicely
  el.onended = () => exportAPI.nextBGM();
}

// ------------------ Public API ------------------

export function initAudio() {
  // double audio elements for optional future crossfades
  bgmAudioA = new Audio();
  bgmAudioB = new Audio();
  ambientAudio = new Audio();

  [bgmAudioA, bgmAudioB].forEach(a => {
    a.preload = 'auto';
    a.preservesPitch = true;
    a.playbackRate = 1.0;
    a.muted = false;
    a.volume = 0.25;
  });

  ambientAudio.preload = 'auto';
  ambientAudio.loop = true;
  ambientAudio.preservesPitch = true;
  ambientAudio.playbackRate = 1.0;
  ambientAudio.volume = 0.15;

  loadBgm(bgmIndex);
  restoreState();

  // apply mute to music channels only (SFX is separate and not impacted)
  [bgmAudioA, bgmAudioB, ambientAudio].forEach(a => { if (a) a.muted = isMusicMuted; });

  attachUnlockOnce();
  console.log('[audio] initialized');
}

export async function playBGM() {
  if (!currentBgmEl()) return;
  if (isMusicMuted) return;
  bgmPaused = false;
  await safePlay(currentBgmEl());
  persistState();
}

export function pauseBGM() {
  if (!currentBgmEl()) return;
  bgmPaused = true;
  currentBgmEl().pause();
  persistState();
}

export async function stopBGM() {
  if (!currentBgmEl()) return;
  bgmPaused = true;
  currentBgmEl().pause();
  currentBgmEl().currentTime = 0;
  persistState();
}

export async function nextBGM() {
  loadBgm(bgmIndex + 1);
  if (!bgmPaused && !isMusicMuted) await safePlay(currentBgmEl());
  persistState();
}

export async function prevBGM() {
  loadBgm(bgmIndex - 1);
  if (!bgmPaused && !isMusicMuted) await safePlay(currentBgmEl());
  persistState();
}

export async function playAmbient(type = 'terminal') {
  if (!ambientAudio) return;
  if (!ambientEnabled || isMusicMuted) return;
  const src = AMBIENT_TRACKS[type] || AMBIENT_TRACKS.terminal;
  if (ambientAudio.src !== location.origin + src && !src.startsWith('http')) {
    ambientAudio.src = src;
  } else {
    ambientAudio.src = src;
  }
  await safePlay(ambientAudio);
  persistState();
}

export function stopAmbient() {
  if (!ambientAudio) return;
  ambientAudio.pause();
  ambientAudio.currentTime = 0;
  persistState();
}

/**
 * Master toggle for MUSIC channels (BGM + Ambient). SFX is NOT affected.
 */
export function toggleMute() {
  isMusicMuted = !isMusicMuted;
  [bgmAudioA, bgmAudioB, ambientAudio].forEach(a => { if (a) a.muted = isMusicMuted; });
  if (isMusicMuted) {
    pauseBGM();
    stopAmbient();
  } else {
    if (!bgmPaused) playBGM();
    if (ambientEnabled) playAmbient('terminal');
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
  if (!ambientEnabled) stopAmbient();
  else if (!isMusicMuted) playAmbient('terminal');
  persistState();
  return ambientEnabled;
}

/**
 * Set volumes separately.
 */
export function setVolume(bgmVol, ambientVol) {
  [bgmAudioA, bgmAudioB].forEach(a => { if (a) a.volume = clamp(bgmVol, 0, 1); });
  if (ambientAudio) ambientAudio.volume = clamp(ambientVol, 0, 1);
  persistState();
}

/**
 * Play a short SFX clip on demand (NOT affected by toggleMute / ambient).
 * Use for terminal clicks, keypress, etc.
 */
export async function playSfx(url) {
  try {
    // let SFX always play, independent of music mute
    const el = new Audio(url);
    el.preload = 'auto';
    el.volume = parseFloat(localStorage.getItem('audio.v1.sfx.vol') ?? '0.8');
    await el.play();
    // auto GC when done
    el.onended = () => el.remove();
  } catch { /* ignore */ }
}

// ---- utils ----
function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }

// Start BGM on first user interaction (if not muted)
if (document.readyState !== 'loading') attachUnlockOnce();
else document.addEventListener('DOMContentLoaded', attachUnlockOnce);

// Export a simple facade if you need direct state in UI
export const audioState = {
  get isMusicMuted() { return isMusicMuted; },
  get ambientEnabled() { return ambientEnabled; },
  get bgmIndex() { return bgmIndex; }
};

// Backward compatibility: keep default listeners like before too.
