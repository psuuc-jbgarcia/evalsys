import { useEffect, useState } from 'react';
import { applyServiceWorkerUpdate } from '../registerServiceWorker';

export default function UpdateAvailableNotice() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<ServiceWorkerRegistration>;
      setRegistration(customEvent.detail);
    };

    window.addEventListener('evalsys:update-available', handleUpdate);
    return () => window.removeEventListener('evalsys:update-available', handleUpdate);
  }, []);

  if (!registration) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[80] w-[min(360px,calc(100vw-2rem))] rounded-xl border border-primary/20 bg-surface shadow-2xl shadow-dark/15 p-4">
      <p className="text-sm font-black text-text">New changes detected</p>
      <p className="text-xs text-text/70 mt-1 leading-relaxed">
        A newer EvalSys update is ready. Reload when you are done with your current task.
      </p>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setRegistration(null)}
          className="evl-btn-secondary !py-2 !px-3 !text-xs"
        >
          Later
        </button>
        <button
          type="button"
          onClick={() => applyServiceWorkerUpdate(registration)}
          className="evl-btn-primary !py-2 !px-3 !text-xs"
        >
          Reload
        </button>
      </div>
    </div>
  );
}
