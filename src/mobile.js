export function isTouchPlay() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  return coarse && noHover;
}

export const TOUCH_BAR_PX = 132;

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
