/**
 * ONNA-STICK WONDERWORKS - WEB AUDIO API SYSTEM
 * Professional audio with buses, envelopes, crossfades
 * No clicks, no abrupt cuts, independent controls
 */

// ==================== AUDIO CONTEXT & BUSES ====================

let ctx = null;
let masterGain = null;
let musicGain = null;
let ambientGain = null;
let sfxGain = null;

let unlocked = false;
let bgmBuffers = [];
let sfxBuffers = new Map();

// ==================== STATE ====================

const STATE = {
  bgm: {
    index: 0,
    time: 0,
    playing: false,
    currentSource: null,
    nextSource: null,
    crossfading: false
  },
  ambient: {
    time: 0,
    playing: false,
    source: null,
    lastVisit: 0,
    isStarting: false
  },
  volumes: {
    music: 0.25,
    ambient: 0.18,
    sfx: 0.22,
    master: 0.9
  },
  mutes: {
    music: false,
    ambient: false,
    sfx: false
  },
  ambientEnabled: true
};

// ==================== ASSETS ====================

const BGM_TRACKS = [
  '/assets/onnastick-bgm-1-copyright-kk.mp3',
  '/assets/onnastick-bgm-2-copyright-kk.mp3',
  '/assets/onnastick-bgm-3-copyright-kk.mp3'
];

const AMBIENT_SRC = '/assets/ambience-witches-cauldron.mp3';

const SFX_ASSETS = {
  logoHover: '/assets/sfx-logo-hover.mp3',
  logoClick: '/assets/sfx-logo-click.wav',
  uiPop: '/assets/ui-pop-soft.mp3'
};

// ==================== LOCALSTORAGE KEYS ====================

const LS = {
  musicVol: 'ona.audio.v1.music.volume',
  ambientVol: 'ona.audio.v1.ambient.volume',
  sfxVol: 'ona.audio.v1.sfx.volume',
  mutes: 'ona.audio.v1.mutes',
  bgmIndex: 'ona.audio.v1.bgm.index',
  bgmTime: 'ona.audio.v1.bgm.time',
  ambientTime: 'ona.audio.v1.ambient.time',
  ambientEnabled: 'ona.audio.v1.ambient.enabled'
};

// ==================== INITIALIZATION ====================

export async function init() {
  if (ctx) return; // Already initialized

  // Create AudioContext (suspended until user gesture)
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  // Create gain nodes (buses)
  masterGain = ctx.createGain();
  musicGain = ctx.createGain();
  ambientGain = ctx.createGain();
  sfxGain = ctx.createGain();

  // Route buses to master
  musicGain.connect(masterGain);
  ambientGain.connect(masterGain);
  sfxGain.connect(masterGain);
  masterGain.connect(ctx.destination);

  // Restore state from localStorage
  restoreState();

  // Apply volumes to gains
  applyVolumes();

  // Attach unlock listener
  attachUnlockListener();

  // Preload/decode assets
  preloadAssets();

  console.log('[audio-web] Initialized (Web Audio API)');
}

function attachUnlockListener() {
  const unlock = async () => {
    if (unlocked) return;

    try {
      await ctx.resume();
      unlocked = true;
      console.log('[audio-web] AudioContext unlocked');

      // Auto-start BGM if it was playing before
      if (STATE.bgm.playing && !STATE.mutes.music) {
        playBGM();
      }

      // Remove listeners
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    } catch (e) {
      console.warn('[audio-web] Unlock failed:', e);
    }
  };

  document.addEventListener('pointerdown', unlock, { once: true, passive: true });
  document.addEventListener('click', unlock, { once: true, passive: true });
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
}

async function preloadAssets() {
  // Decode BGM tracks
  for (let i = 0; i < BGM_TRACKS.length; i++) {
    try {
      const response = await fetch(BGM_TRACKS[i]);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      bgmBuffers[i] = audioBuffer;
      console.log(`[audio-web] BGM ${i + 1} decoded`);
    } catch (e) {
      console.warn(`[audio-web] Failed to decode BGM ${i + 1}:`, e);
    }
  }

  // Decode SFX
  for (const [name, url] of Object.entries(SFX_ASSETS)) {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      sfxBuffers.set(name, audioBuffer);
      console.log(`[audio-web] SFX '${name}' decoded`);
    } catch (e) {
      console.warn(`[audio-web] Failed to decode SFX '${name}':`, e);
    }
  }
}

// ==================== STATE PERSISTENCE ====================

function restoreState() {
  try {
    STATE.volumes.music = parseFloat(localStorage.getItem(LS.musicVol) ?? '0.25');
    STATE.volumes.ambient = parseFloat(localStorage.getItem(LS.ambientVol) ?? '0.18');
    STATE.volumes.sfx = parseFloat(localStorage.getItem(LS.sfxVol) ?? '0.22');

    const mutes = JSON.parse(localStorage.getItem(LS.mutes) || '{}');
    STATE.mutes.music = mutes.music || false;
    STATE.mutes.ambient = mutes.ambient || false;
    STATE.mutes.sfx = mutes.sfx || false;

    STATE.bgm.index = parseInt(localStorage.getItem(LS.bgmIndex) ?? '0', 10);
    STATE.bgm.time = parseFloat(localStorage.getItem(LS.bgmTime) ?? '0');
    STATE.ambient.time = parseFloat(localStorage.getItem(LS.ambientTime) ?? '0');
    STATE.ambientEnabled = localStorage.getItem(LS.ambientEnabled) !== 'false';

    console.log('[audio-web] State restored:', STATE);
  } catch (e) {
    console.warn('[audio-web] Failed to restore state:', e);
  }
}

export function saveState() {
  try {
    localStorage.setItem(LS.musicVol, String(STATE.volumes.music));
    localStorage.setItem(LS.ambientVol, String(STATE.volumes.ambient));
    localStorage.setItem(LS.sfxVol, String(STATE.volumes.sfx));
    localStorage.setItem(LS.mutes, JSON.stringify(STATE.mutes));
    localStorage.setItem(LS.bgmIndex, String(STATE.bgm.index));
    localStorage.setItem(LS.bgmTime, String(STATE.bgm.time));
    localStorage.setItem(LS.ambientTime, String(STATE.ambient.time));
    localStorage.setItem(LS.ambientEnabled, String(STATE.ambientEnabled));
  } catch (e) {
    console.warn('[audio-web] Failed to save state:', e);
  }
}

// ==================== VOLUME CONTROL ====================

function applyVolumes() {
  if (!ctx) return;

  masterGain.gain.value = STATE.volumes.master;
  musicGain.gain.value = STATE.mutes.music ? 0 : STATE.volumes.music;
  ambientGain.gain.value = STATE.mutes.ambient ? 0 : STATE.volumes.ambient;
  sfxGain.gain.value = STATE.mutes.sfx ? 0 : STATE.volumes.sfx;
}

export function setMusicVolume(v) {
  STATE.volumes.music = Math.max(0, Math.min(1, v));
  if (!STATE.mutes.music && musicGain) {
    musicGain.gain.value = STATE.volumes.music;
  }
  saveState();
}

export function setAmbientVolume(v) {
  STATE.volumes.ambient = Math.max(0, Math.min(1, v));
  if (!STATE.mutes.ambient && ambientGain) {
    ambientGain.gain.value = STATE.volumes.ambient;
  }
  saveState();
}

export function setSfxVolume(v) {
  STATE.volumes.sfx = Math.max(0, Math.min(1, v));
  if (!STATE.mutes.sfx && sfxGain) {
    sfxGain.gain.value = STATE.volumes.sfx;
  }
  saveState();
}

export function toggleMusicMute() {
  STATE.mutes.music = !STATE.mutes.music;

  if (musicGain) {
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(
      STATE.mutes.music ? 0 : STATE.volumes.music,
      now + 0.25
    );
  }

  saveState();
  return STATE.mutes.music;
}

export function toggleAmbient() {
  STATE.ambientEnabled = !STATE.ambientEnabled;

  if (!STATE.ambientEnabled && STATE.ambient.playing) {
    stopAmbient();
  }

  saveState();
  return STATE.ambientEnabled;
}

export function toggleSfxMute() {
  STATE.mutes.sfx = !STATE.mutes.sfx;

  if (sfxGain) {
    const now = ctx.currentTime;
    sfxGain.gain.cancelScheduledValues(now);
    sfxGain.gain.setValueAtTime(sfxGain.gain.value, now);
    sfxGain.gain.linearRampToValueAtTime(
      STATE.mutes.sfx ? 0 : STATE.volumes.sfx,
      now + 0.15
    );
  }

  saveState();
  return STATE.mutes.sfx;
}

// ==================== BGM PLAYBACK ====================

export async function playBGM() {
  if (!ctx || !unlocked) {
    console.warn('[audio-web] AudioContext not unlocked yet');
    return;
  }

  if (STATE.bgm.playing) return;
  if (STATE.mutes.music) return;

  const buffer = bgmBuffers[STATE.bgm.index];
  if (!buffer) {
    console.warn('[audio-web] BGM buffer not ready');
    return;
  }

  // Stop any existing source
  if (STATE.bgm.currentSource) {
    STATE.bgm.currentSource.stop();
    STATE.bgm.currentSource = null;
  }

  // Create source
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(musicGain);

  // Start from saved time
  const startTime = Math.min(STATE.bgm.time, buffer.duration - 0.1);
  source.start(0, startTime);

  STATE.bgm.currentSource = source;
  STATE.bgm.playing = true;

  // Track time
  const startedAt = ctx.currentTime - startTime;
  const trackTime = () => {
    if (STATE.bgm.playing && STATE.bgm.currentSource === source) {
      STATE.bgm.time = ctx.currentTime - startedAt;
      saveState();
    }
  };
  const timeTracker = setInterval(trackTime, 5000);

  // Handle track end
  source.onended = () => {
    clearInterval(timeTracker);
    if (STATE.bgm.playing && !STATE.bgm.crossfading) {
      nextBGM();
    }
  };

  // Fade in
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(0, now);
  musicGain.gain.linearRampToValueAtTime(STATE.volumes.music, now + 0.35);

  console.log(`[audio-web] BGM playing: track ${STATE.bgm.index + 1}`);
}

export async function pauseBGM() {
  if (!STATE.bgm.playing) return;

  STATE.bgm.playing = false;
  saveState();

  if (STATE.bgm.currentSource) {
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0, now + 0.3);

    setTimeout(() => {
      if (STATE.bgm.currentSource) {
        STATE.bgm.currentSource.stop();
        STATE.bgm.currentSource = null;
      }
    }, 300);
  }

  console.log('[audio-web] BGM paused');
}

export async function nextBGM() {
  if (STATE.bgm.crossfading) return;
  if (!ctx || !unlocked) return;

  STATE.bgm.crossfading = true;

  // Stop old track completely
  if (STATE.bgm.currentSource) {
    try {
      STATE.bgm.currentSource.stop();
      STATE.bgm.currentSource = null;
    } catch (e) {}
  }

  // Move to next track (always forward: 1→2→3→1)
  const oldIndex = STATE.bgm.index;
  STATE.bgm.index = (STATE.bgm.index + 1) % BGM_TRACKS.length;
  STATE.bgm.time = 0;

  const newBuffer = bgmBuffers[STATE.bgm.index];
  if (!newBuffer) {
    STATE.bgm.crossfading = false;
    return;
  }

  // Create and start new track
  const newSource = ctx.createBufferSource();
  newSource.buffer = newBuffer;
  newSource.connect(musicGain);
  newSource.start(0);

  STATE.bgm.currentSource = newSource;
  STATE.bgm.playing = true;

  // Track playback time
  const startedAt = ctx.currentTime;
  const timeTracker = setInterval(() => {
    if (STATE.bgm.playing && STATE.bgm.currentSource === newSource) {
      STATE.bgm.time = ctx.currentTime - startedAt;
      saveState();
    }
  }, 5000);

  // Auto-advance when track ends
  newSource.onended = () => {
    clearInterval(timeTracker);
    if (STATE.bgm.playing && STATE.bgm.currentSource === newSource) {
      STATE.bgm.crossfading = false;
      nextBGM();
    }
  };

  STATE.bgm.crossfading = false;
  saveState();
  console.log(`[audio-web] BGM: ${oldIndex + 1} → ${STATE.bgm.index + 1}`);
}

export async function prevBGM() {
  if (STATE.bgm.crossfading) return;
  if (!ctx || !unlocked) return;

  STATE.bgm.crossfading = true;

  // Stop old track completely
  if (STATE.bgm.currentSource) {
    try {
      STATE.bgm.currentSource.stop();
      STATE.bgm.currentSource = null;
    } catch (e) {}
  }

  // Move to previous track
  const oldIndex = STATE.bgm.index;
  STATE.bgm.index = (STATE.bgm.index - 1 + BGM_TRACKS.length) % BGM_TRACKS.length;
  STATE.bgm.time = 0;

  const newBuffer = bgmBuffers[STATE.bgm.index];
  if (!newBuffer) {
    STATE.bgm.crossfading = false;
    return;
  }

  // Create and start new track
  const newSource = ctx.createBufferSource();
  newSource.buffer = newBuffer;
  newSource.connect(musicGain);
  newSource.start(0);

  STATE.bgm.currentSource = newSource;
  STATE.bgm.playing = true;

  // Track playback time
  const startedAt = ctx.currentTime;
  const timeTracker = setInterval(() => {
    if (STATE.bgm.playing && STATE.bgm.currentSource === newSource) {
      STATE.bgm.time = ctx.currentTime - startedAt;
      saveState();
    }
  }, 5000);

  // Auto-advance when track ends (always forward)
  newSource.onended = () => {
    clearInterval(timeTracker);
    if (STATE.bgm.playing && STATE.bgm.currentSource === newSource) {
      STATE.bgm.crossfading = false;
      nextBGM();
    }
  };

  STATE.bgm.crossfading = false;
  saveState();
  console.log(`[audio-web] BGM: ${oldIndex + 1} → ${STATE.bgm.index + 1}`);
}

// ==================== AMBIENT PLAYBACK ====================

export async function startAmbient() {
  if (!ctx || !unlocked) return;
  if (!STATE.ambientEnabled) return;
  if (STATE.ambient.playing) return;
  if (STATE.ambient.isStarting) return; // Prevent concurrent calls
  if (STATE.mutes.ambient) return;

  STATE.ambient.isStarting = true;

  try {
    // Check if we should resume or restart
    const elapsed = Date.now() - STATE.ambient.lastVisit;
    if (elapsed > 30 * 60 * 1000) {
      STATE.ambient.time = 0; // Restart after 30 minutes
    }

    const response = await fetch(AMBIENT_SRC);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

    // Double-check we didn't start playing while fetching
    if (STATE.ambient.playing) {
      STATE.ambient.isStarting = false;
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(ambientGain);

    const startTime = Math.min(STATE.ambient.time, audioBuffer.duration - 0.1);
    source.start(0, startTime);

    STATE.ambient.source = source;
    STATE.ambient.playing = true;
    STATE.ambient.lastVisit = Date.now();

    // Fade in
    const now = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(0, now);
    ambientGain.gain.linearRampToValueAtTime(STATE.volumes.ambient, now + 0.5);

    // Track time
    const startedAt = ctx.currentTime - startTime;
    const trackTime = () => {
      if (STATE.ambient.playing) {
        STATE.ambient.time = (ctx.currentTime - startedAt) % audioBuffer.duration;
        saveState();
      }
    };
    const timeTracker = setInterval(trackTime, 10000);

    source.onended = () => {
      clearInterval(timeTracker);
    };

    console.log('[audio-web] Ambient started');
  } catch (e) {
    console.warn('[audio-web] Ambient start failed:', e);
  } finally {
    STATE.ambient.isStarting = false;
  }
}

export async function stopAmbient() {
  if (!STATE.ambient.playing && !STATE.ambient.source) return;

  STATE.ambient.playing = false;
  STATE.ambient.lastVisit = Date.now();
  saveState();

  if (STATE.ambient.source) {
    const now = ctx.currentTime;
    ambientGain.gain.cancelScheduledValues(now);
    ambientGain.gain.setValueAtTime(ambientGain.gain.value, now);
    ambientGain.gain.linearRampToValueAtTime(0, now + 0.4);

    // Stop source immediately (fade happens on gain node)
    const sourceToStop = STATE.ambient.source;
    STATE.ambient.source = null;

    setTimeout(() => {
      try {
        sourceToStop.stop();
      } catch (e) {
        // Source may have already ended
      }
    }, 400);
  }

  console.log('[audio-web] Ambient stopped');
}

// ==================== SFX PLAYBACK ====================

export async function playSfx(name, options = {}) {
  if (!ctx || !unlocked) return;
  if (STATE.mutes.sfx) return;

  const buffer = sfxBuffers.get(name);
  if (!buffer) {
    console.warn(`[audio-web] SFX '${name}' not found`);
    return;
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const envelope = ctx.createGain();

  source.buffer = buffer;
  source.connect(gain);
  gain.connect(envelope);
  envelope.connect(sfxGain);

  // Volume adjustment
  const volume = options.volume ?? 1.0;
  gain.gain.value = volume;

  // Envelope: attack 10-20ms, release 120-180ms
  const now = ctx.currentTime;
  const attackTime = (options.attack ?? 15) / 1000;
  const releaseTime = (options.release ?? 150) / 1000;
  const duration = buffer.duration;

  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(1, now + attackTime);
  envelope.gain.setValueAtTime(1, now + duration - releaseTime);
  envelope.gain.linearRampToValueAtTime(0, now + duration);

  source.start(0);
  source.stop(now + duration);

  console.log(`[audio-web] SFX '${name}' played`);

  return { source, gain, envelope };
}

// Hover SFX with manual stop
let hoverSfx = null;

export async function startLogoHover() {
  if (hoverSfx) return; // Already playing

  hoverSfx = await playSfx('logoHover', { attack: 15, release: 150 });
}

export async function stopLogoHover() {
  if (!hoverSfx) return;

  const { envelope } = hoverSfx;
  const now = ctx.currentTime;

  envelope.gain.cancelScheduledValues(now);
  envelope.gain.setValueAtTime(envelope.gain.value, now);
  envelope.gain.linearRampToValueAtTime(0, now + 0.15);

  setTimeout(() => {
    if (hoverSfx?.source) {
      hoverSfx.source.stop();
    }
    hoverSfx = null;
  }, 150);
}

export async function playLogoClick() {
  await stopLogoHover(); // Stop hover first
  await playSfx('logoClick', { attack: 12, release: 140, volume: 0.9 });
}

// ==================== STATE GETTERS ====================

export function getState() {
  return {
    playing: STATE.bgm.playing,
    track: STATE.bgm.index + 1,
    total: BGM_TRACKS.length,
    volumes: { ...STATE.volumes },
    mutes: { ...STATE.mutes },
    ambientEnabled: STATE.ambientEnabled,
    unlocked
  };
}
