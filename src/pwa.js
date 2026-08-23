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

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (btn) btn.hidden = false;
  });

  btn?.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    btn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    if (btn) btn.hidden = true;
    if (iosHint) iosHint.hidden = true;
  });

  if (isStandalone()) {
    if (btn) btn.hidden = true;
    if (iosHint) iosHint.hidden = true;
    return;
  }

  if (isIOS() && isTouchDevice() && iosHint) {
    iosHint.hidden = false;
  }
}

export function registerPwaServiceWorker() {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onNeedRefresh() {},
      onOfflineReady() {},
    });
  }).catch(() => {});
}
