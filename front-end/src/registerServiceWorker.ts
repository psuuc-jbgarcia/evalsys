export const registerServiceWorker = () => {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('EvalSys service worker registration failed:', error);
    });
  });
};
