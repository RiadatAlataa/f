import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      dir="rtl"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 rounded-2xl bg-[#071C43] text-white px-4 py-2.5 text-xs font-bold shadow-2xl border border-blue-400/30 animate-pulse"
    >
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>وضع عدم الاتصال — التطبيق يعمل بالبيانات المخزنة محلياً.</span>
    </aside>
  );
};
