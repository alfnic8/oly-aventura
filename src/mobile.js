import { WIDTH, HEIGHT } from './config.js';

export function isTouchPlay() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  return coarse && noHover;
}

/** Safe HUD margins in game pixels (960×540), accounting for SALIR and notch. */
export function getHudInsets() {
  if (!isTouchPlay()) {
    return { top: 12, left: 24, right: 20 };
  }

  const canvas = document.querySelector('#game canvas');
  if (!canvas) {
    return { top: 38, left: 108, right: 16 };
  }

  const canvasRect = canvas.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height) {
    return { top: 38, left: 108, right: 16 };
  }

  const scaleX = WIDTH / canvasRect.width;
  const scaleY = HEIGHT / canvasRect.height;
  let left = 108;
  const exitBtn = document.getElementById('btn-exit-game');
  if (exitBtn) {
    const btnRect = exitBtn.getBoundingClientRect();
    left = Math.max(108, Math.round((btnRect.right - canvasRect.left) * scaleX + 10));
  }

  const top = Math.max(34, Math.round((canvasRect.top > 0 ? 8 : 14) * scaleY + 22));
  return { top, left, right: 16 };
}

export const TOUCH_BAR_PX = 112;

export function getTouchBarHeight() {
  const touch = document.getElementById('touch');
  if (touch?.classList.contains('open')) return touch.offsetHeight || TOUCH_BAR_PX;
  return TOUCH_BAR_PX;
}

export function setTouchPlayMode(active) {
  document.body.classList.toggle('touch-play', active);
  document.documentElement.style.setProperty('--touch-bar-h', `${TOUCH_BAR_PX}px`);
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
