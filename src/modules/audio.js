/**
 * AUDIO MODULE
 * Manages background music and ambient sounds
 */

let bgmAudio = null;
let ambientAudio = null;
let isMuted = false;

const BGM_TRACKS = [
  '/assets/bgm-1.mp3',
  '/assets/bgm-2.mp3',
  '/assets/bgm-3.mp3'
];

const AMBIENT_TRACKS = {
  terminal: '/assets/ambience-witches-cauldron.mp3',
  computer: '/assets/ambient-computer-noise.mp3'
};

export function initAudio() {
  // Create BGM audio element (random track)
  const randomTrack = BGM_TRACKS[Math.floor(Math.random() * BGM_TRACKS.length)];
  bgmAudio = new Audio(randomTrack);
  bgmAudio.loop = true;
  bgmAudio.volume = 0.3;

  // Create ambient audio for terminal
  ambientAudio = new Audio(AMBIENT_TRACKS.terminal);
  ambientAudio.loop = true;
  ambientAudio.volume = 0.2;

  console.log('[audio] initialized (muted by default)');
}

export function playBGM() {
  if (bgmAudio && !isMuted) {
    bgmAudio.play().catch(() => {
      console.log('[audio] BGM autoplay blocked - waiting for user interaction');
    });
  }
}

export function stopBGM() {
  if (bgmAudio) {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  }
}

export function playAmbient(type = 'terminal') {
  if (ambientAudio && !isMuted) {
    if (AMBIENT_TRACKS[type]) {
      ambientAudio.src = AMBIENT_TRACKS[type];
    }
    ambientAudio.play().catch(() => {
      console.log('[audio] Ambient autoplay blocked');
    });
  }
}

export function stopAmbient() {
  if (ambientAudio) {
    ambientAudio.pause();
    ambientAudio.currentTime = 0;
  }
}

export function toggleMute() {
  isMuted = !isMuted;

  if (bgmAudio) {
    bgmAudio.muted = isMuted;
  }
  if (ambientAudio) {
    ambientAudio.muted = isMuted;
  }

  console.log(`[audio] ${isMuted ? 'muted' : 'unmuted'}`);
  return isMuted;
}

export function setVolume(bgmVol, ambientVol) {
  if (bgmAudio) bgmAudio.volume = bgmVol;
  if (ambientAudio) ambientAudio.volume = ambientVol;
}

// Start BGM on first user interaction
let hasStarted = false;
function startOnInteraction() {
  if (!hasStarted) {
    playBGM();
    hasStarted = true;
    // Remove listeners after first interaction
    document.removeEventListener('click', startOnInteraction);
    document.removeEventListener('keydown', startOnInteraction);
    document.removeEventListener('touchstart', startOnInteraction);
  }
}

// Attach interaction listeners
document.addEventListener('click', startOnInteraction);
document.addEventListener('keydown', startOnInteraction);
document.addEventListener('touchstart', startOnInteraction);
