let deferredPrompt = null;

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isTouchDevice() {
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
}

export function setupPwaInstall() {
  const btn = document.getElementById('btn-install');
  const iosHint = document.getElementById('install-ios-hint');
  const desktopHint = document.getElementById('install-desktop-hint');

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (btn) btn.hidden = false;
    if (desktopHint) desktopHint.hidden = true;
  });

  btn?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      btn.hidden = true;
      return;
    }
    if (isIOS() && iosHint) {
      iosHint.hidden = !iosHint.hidden;
      return;
    }
    if (desktopHint) desktopHint.hidden = !desktopHint.hidden;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (btn) btn.hidden = true;
    if (iosHint) iosHint.hidden = true;
    if (desktopHint) desktopHint.hidden = true;
  });

  if (isStandalone()) {
    if (btn) btn.hidden = true;
    if (iosHint) iosHint.hidden = true;
    if (desktopHint) desktopHint.hidden = true;
    return;
  }

  if (btn) btn.hidden = false;

  if (isIOS() && isTouchDevice() && iosHint) {
    iosHint.hidden = false;
  }
}

export function registerPwaServiceWorker() {
  import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW?.(true);
      },
      onOfflineReady() {},
    });
  }).catch(() => {});
}
