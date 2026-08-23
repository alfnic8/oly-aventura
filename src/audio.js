import { isTouchPlay } from './mobile.js';

const BGM_SRC = 'assets/sfx/intro.mp3';
let bgmEl = null;
let bgmUnlocked = false;

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function useHtmlBgm() {
  return isIOS() || isTouchPlay();
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

  if (!useHtmlBgm()) return Promise.resolve();

  const el = getBgmEl();
  if (bgmUnlocked) return Promise.resolve();

  el.muted = true;
  return el.play()
    .then(() => {
      el.pause();
      el.currentTime = 0;
      el.muted = false;
      bgmUnlocked = true;
    })
    .catch(() => {});
}

export function playBgm(scene, { menu = false } = {}) {
  const vol = menu ? 0.65 : 0.45;

  if (useHtmlBgm()) {
    const el = getBgmEl();
    el.volume = vol;
    el.loop = true;
    if (el.paused) el.play().catch(() => {});
    scene?.sound?.stopByKey?.('intro');
    return;
  }

  const playing = scene.sound.getAllPlaying().find((s) => s.key === 'intro');
  if (playing) {
    playing.setVolume(vol);
    playing.setLoop(true);
    return;
  }
  scene.sound.play('intro', { volume: vol, loop: true });
}

export function pauseBgm(scene) {
  if (useHtmlBgm()) {
    getBgmEl().pause();
    return;
  }
  scene.sound.pauseAll();
}

export function resumeBgm(scene) {
  if (useHtmlBgm()) {
    playBgm(scene);
    return;
  }
  scene.sound.resumeAll();
}

export function stopBgm(scene) {
  if (useHtmlBgm()) {
    const el = getBgmEl();
    el.pause();
    el.currentTime = 0;
    return;
  }
  scene?.sound?.stopByKey('intro');
}

let resumeBound = false;

export function bindAudioResume(scene) {
  if (resumeBound) return;
  resumeBound = true;
  const resume = () => {
    const game = scene?.game || window.__olyGame;
    const active = game?.scene?.getScenes(true)?.[0];
    if (!active) return;
    unlockAudio(active);
    playBgm(active);
  };
  window.addEventListener('orientationchange', () => setTimeout(resume, 350));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resume();
  });
}
