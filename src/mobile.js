export function isTouchPlay() {
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}

export const TOUCH_BAR_PX = 76;

export async function enterLandscapePlay() {
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
