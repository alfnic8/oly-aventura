import { isTouchPlay } from './mobile.js';

const BGM_SRC = 'assets/sfx/intro.mp3';
const VOICE_SRC = {
  hello: 'assets/sfx/oly-hello.mp4',
  start: 'assets/sfx/oly-start.mp4',
};

let bgmEl = null;
let voiceEl = null;
let bgmUnlocked = false;
let musicMuted = false;
let autoStartBound = false;

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function useHtmlBgm() {
  return true;
}

export function isMusicMuted() {
  return musicMuted;
}

export function setMusicMuted(muted) {
  musicMuted = muted;
  syncMuteButtons();
  const el = getBgmEl();
  el.muted = muted;
  if (muted) {
    el.pause();
    stopVoice();
    window.__olyGame?.sound?.stopByKey?.('intro');
  } else {
    const game = window.__olyGame;
    const active = game?.scene?.getScenes(true)?.[0];
    if (active) playBgm(active);
  }
}

export function toggleMusicMute() {
  setMusicMuted(!musicMuted);
  return musicMuted;
}

function syncMuteButtons() {
  document.querySelectorAll('[data-mute-btn]').forEach((btn) => {
    btn.textContent = musicMuted ? '🔇' : '🔊';
    btn.setAttribute('aria-label', musicMuted ? 'Activar música' : 'Silenciar música');
    btn.classList.toggle('muted', musicMuted);
  });
}

export function bindMuteButtons() {
  syncMuteButtons();
  document.querySelectorAll('[data-mute-btn]').forEach((btn) => {
    if (btn.dataset.muteBound) return;
    btn.dataset.muteBound = '1';
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      toggleMusicMute();
    });
  });
}

function getBgmEl() {
  if (bgmEl) return bgmEl;
  bgmEl = document.getElementById('oly-bgm');
  if (!bgmEl) {
    bgmEl = document.createElement('audio');
    bgmEl.id = 'oly-bgm';
    bgmEl.src = BGM_SRC;
    document.body.appendChild(bgmEl);
  }
  bgmEl.loop = true;
  bgmEl.preload = 'auto';
  bgmEl.setAttribute('playsinline', '');
  bgmEl.setAttribute('webkit-playsinline', '');
  return bgmEl;
}

export function unlockAudio(scene) {
  if (scene?.sound?.locked) scene.sound.unlock();
  const ctx = scene?.sound?.context;
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});

  /* Already unlocked — never pause/reset the playing BGM on later gestures */
  if (bgmUnlocked) return Promise.resolve();

  const unlockEl = (el) => {
    if (!el) return Promise.resolve();
    const prevMuted = el.muted;
    const prevTime = el.currentTime || 0;
    el.muted = true;
    return el.play()
      .then(() => {
        el.pause();
        /* Keep position if something was already buffered; only zero cold starts */
        el.currentTime = prevTime > 0.05 ? prevTime : 0;
      })
      .catch(() => {})
      .finally(() => {
        el.muted = musicMuted ? true : prevMuted;
      });
  };

  return Promise.all([unlockEl(getBgmEl()), unlockEl(getVoiceEl())])
    .then(() => {
      bgmUnlocked = true;
    })
    .catch(() => {});
}

export function playBgm(scene, { menu = false } = {}) {
  if (musicMuted) {
    getBgmEl().pause();
    scene?.sound?.stopByKey?.('intro');
    return;
  }

  const vol = menu ? 0.65 : 0.45;
  const el = getBgmEl();
  el.volume = vol;
  el.loop = true;
  el.muted = false;

  scene?.sound?.stopByKey?.('intro');

  const tryPlay = () => {
    if (musicMuted) return;
    el.muted = false;
    el.volume = vol;
    /* Already playing — only adjust volume, don't restart */
    if (!el.paused && !el.ended) return;
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => { bgmUnlocked = true; }).catch(() => {
        /* Autoplay blocked — next user gesture will retry via bindAutoMusic */
      });
    }
  };

  if (bgmUnlocked) {
    tryPlay();
    return;
  }

  unlockAudio(scene).then(tryPlay);
}

export function pauseBgm() {
  getBgmEl().pause();
}

export function resumeBgm(scene) {
  if (musicMuted) return;
  playBgm(scene);
}

export function stopBgm() {
  const el = getBgmEl();
  el.pause();
  el.currentTime = 0;
}

export function startMusic(scene, { menu = false } = {}) {
  bindMuteButtons();
  if (musicMuted) return;
  unlockAudio(scene).then(() => playBgm(scene, { menu }));
  playBgm(scene, { menu });
}

/** Start or resume menu BGM; retries on any user gesture until it plays. */
export function bindAutoMusic(scene) {
  bindMuteButtons();
  startMusic(scene, { menu: true });

  const kick = () => {
    if (musicMuted) return;
    const el = getBgmEl();
    /* While music is already playing, ignore control taps (stick/jump/etc.) */
    if (bgmUnlocked && el && !el.paused) return;
    unlockAudio(scene).then(() => {
      if (!el.paused) return;
      playBgm(scene, { menu: true });
    });
    if (bgmUnlocked && el.paused) {
      playBgm(scene, { menu: true });
    }
  };

  if (!autoStartBound) {
    autoStartBound = true;
    document.addEventListener('pointerdown', kick, { passive: true });
    document.addEventListener('keydown', kick);
    window.addEventListener('orientationchange', () => setTimeout(kick, 350));
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && !musicMuted) kick();
    });
  } else {
    /* Menu revisited — kick again in case audio was paused */
    kick();
  }
}

function getVoiceEl() {
  if (voiceEl) return voiceEl;
  voiceEl = document.createElement('audio');
  voiceEl.id = 'oly-voice';
  voiceEl.preload = 'auto';
  voiceEl.setAttribute('playsinline', '');
  voiceEl.setAttribute('webkit-playsinline', '');
  voiceEl.src = VOICE_SRC.hello;
  document.body.appendChild(voiceEl);
  return voiceEl;
}

/** Voice lines from WhatsApp clips (mp4). Keys: hello | start */
export function playVoice(key, { volume = 1 } = {}) {
  if (musicMuted) return;
  const src = VOICE_SRC[key];
  if (!src) return;

  const el = getVoiceEl();
  try {
    el.pause();
  } catch {
    /* ignore */
  }
  /* Always re-assign src — mobile browsers are picky with cached mp4 audio */
  el.src = src;
  try {
    el.load();
  } catch {
    /* ignore */
  }
  el.muted = false;
  el.volume = volume;
  try {
    el.currentTime = 0;
  } catch {
    /* ignore */
  }

  const tryPlay = () => {
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {
        /* Retry once after unlock (iOS often needs the voice element primed) */
        unlockAudio(null).then(() => {
          el.muted = false;
          el.play().catch(() => {});
        });
      });
    }
  };

  if (bgmUnlocked) {
    tryPlay();
    return;
  }
  unlockAudio(null).then(tryPlay);
}

export function stopVoice() {
  if (!voiceEl) return;
  try {
    voiceEl.pause();
    voiceEl.currentTime = 0;
  } catch {
    /* ignore */
  }
}
