import { useEffect, useState } from 'react';

export default function GlobalLoader() {
  const [inflight, setInflight] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onNet = (e) => {
      const d = (e?.detail?.delta ?? 0) | 0;
      setInflight((v) => Math.max(0, v + d));
    };
    const onBusy = (e) => {
      setBusy(!!(e?.detail?.active));
    };
    window.addEventListener('mydesk-net', onNet);
    window.addEventListener('mydesk-loading', onBusy);
    return () => {
      window.removeEventListener('mydesk-net', onNet);
      window.removeEventListener('mydesk-loading', onBusy);
    };
  }, []);

  const show = busy || inflight > 0;
  if (!show) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[1000] h-1 bg-transparent">
      <div className="h-full bg-brand animate-[loader_1.2s_ease-in-out_infinite] rounded-r" style={{ width: '40%' }} />
      <style>{`@keyframes loader{0%{transform:translateX(-100%)}50%{transform:translateX(20%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}

