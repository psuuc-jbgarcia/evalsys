const notifyUpdateAvailable = (registration: ServiceWorkerRegistration) => {
  window.dispatchEvent(new CustomEvent('evalsys:update-available', { detail: registration }));
};

export const applyServiceWorkerUpdate = (registration?: ServiceWorkerRegistration | null) => {
  const waitingWorker = registration?.waiting;
  if (!waitingWorker) {
    window.location.reload();
    return;
  }

  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
};

export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        if (registration.waiting) notifyUpdateAvailable(registration);

        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdateAvailable(registration);
            }
          });
        });

        registration.update().catch(() => undefined);
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => undefined);
          }
        });
      })
      .catch((error) => {
        console.warn('EvalSys service worker registration failed:', error);
      });
  });
};
