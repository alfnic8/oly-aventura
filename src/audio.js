import { isTouchPlay } from './mobile.js';

const BGM_SRC = 'assets/sfx/intro.mp3';
let bgmEl = null;
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

  const el = getBgmEl();
  if (bgmUnlocked) return Promise.resolve();

  el.muted = true;
  return el.play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      bgmUnlocked = true;
    })
    .catch(() => {})
    .finally(() => {
      el.muted = musicMuted;
    });
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
    el.play().catch(() => {});
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

export function bindAutoMusic(scene) {
  bindMuteButtons();
  startMusic(scene, { menu: true });

  if (autoStartBound) return;
  autoStartBound = true;

  const kick = () => {
    if (musicMuted) return;
    unlockAudio(scene).then(() => playBgm(scene, { menu: true }));
  };

  document.addEventListener('pointerdown', kick, { once: true, passive: true });
  document.addEventListener('keydown', kick, { once: true });

  window.addEventListener('orientationchange', () => setTimeout(kick, 350));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !musicMuted) kick();
  });
}
