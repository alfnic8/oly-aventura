import Phaser from 'phaser';

export function isTouchPlay() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const touchPoints = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return (coarse && noHover) || (touchPoints && noHover);
}

export const TOUCH_BAR_PX = 118;

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

function wantsCoverScale() {
  return document.body.classList.contains('touch-play') || isTouchPlay();
}

/**
 * Cover the whole #game area on touch (no letterboxing).
 * Important: displaySize aspect mode must be updated when changing scaleMode at runtime.
 */
export function applyMobileScaleMode(game) {
  const scale = game?.scale;
  if (!scale) return;
  const next = wantsCoverScale() ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT;
  scale.scaleMode = next;
  if (next !== Phaser.Scale.RESIZE && next !== Phaser.Scale.EXPAND) {
    scale.displaySize.setAspectMode(next);
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
