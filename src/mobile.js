import Phaser from 'phaser';
import { WIDTH, HEIGHT } from './config.js';

export function isTouchPlay() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const touchPoints = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return (coarse && noHover) || (touchPoints && noHover);
}

export const TOUCH_BAR_PX = 124;

export function getTouchBarHeight() {
  const touch = document.getElementById('touch');
  if (touch?.classList.contains('open')) return touch.offsetHeight || TOUCH_BAR_PX;
  return TOUCH_BAR_PX;
}

export function setTouchPlayMode(active) {
  document.body.classList.toggle('touch-play', !!active);
  document.documentElement.style.setProperty('--touch-bar-h', `${TOUCH_BAR_PX}px`);
  if (!active) {
    document.getElementById('touch')?.classList.remove('open');
  }
  if (window.__olyGame) applyMobileScaleMode(window.__olyGame);
}

/** Clear play chrome and restore full #game size (menu / between sessions). */
export function resetGameShell(game) {
  setTouchPlayMode(false);
  document.getElementById('touch')?.classList.remove('open');
  document.getElementById('mobile-hud')?.classList.remove('open');
  document.getElementById('btn-exit-game')?.classList.remove('open');
  refreshGameScale(game);
}

/**
 * Always FIT so the full 960×540 world stays visible (no cropped character).
 * On touch, #game is sized above the control bar so FIT can use the full height.
 */
export function applyMobileScaleMode(game) {
  const scale = game?.scale;
  if (!scale) return;
  scale.scaleMode = Phaser.Scale.FIT;
  scale.displaySize.setAspectMode(Phaser.Scale.FIT);
  /* Keep design size stable if a previous EXPAND/ENVELOP run changed gameSize */
  if (scale.gameSize && (scale.gameSize.width !== WIDTH || scale.gameSize.height !== HEIGHT)) {
    scale.setGameSize(WIDTH, HEIGHT);
  }
}

let scaleRefreshGen = 0;

/** Re-measure #game after touch bar / fullscreen / orientation changes. */
export function refreshGameScale(game) {
  const scale = game?.scale;
  if (!scale) return;
  applyMobileScaleMode(game);
  const gen = ++scaleRefreshGen;
  const parent = scale.parent;
  if (parent) {
    void parent.offsetWidth;
    void parent.offsetHeight;
  }
  scale.refresh();
  requestAnimationFrame(() => {
    if (gen !== scaleRefreshGen) return;
    applyMobileScaleMode(game);
    if (parent) {
      void parent.offsetWidth;
      void parent.offsetHeight;
    }
    scale.refresh();
    setTimeout(() => {
      if (gen !== scaleRefreshGen) return;
      scale.refresh();
    }, 120);
  });
}

export async function enterLandscapePlay() {
  if (!isTouchPlay()) return;
  try {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      if (root.requestFullscreen) await root.requestFullscreen();
      else if (root.webkitRequestFullscreen) root.webkitRequestFullscreen();
    }
  } catch {
    /* some browsers only allow this after a tap */
  }
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('landscape');
    }
  } catch {
    /* iOS Safari often ignores lock */
  }
}
