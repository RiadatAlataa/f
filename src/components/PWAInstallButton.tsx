import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'floating';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running in standalone / installed PWA mode, don't show install buttons
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        await install();
      } finally {
        setInstalling(false);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  // If not installable and not iOS (e.g. standard browser where prompt hasn't fired yet or already dismissed),
  // we can show a subtle manual helper or return null.
  if (!isInstallable && !isIOS) {
    return null;
  }

  const modal = showIOSGuide && (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      dir="rtl"
      onClick={() => setShowIOSGuide(false)}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <img src="/pwa-192x192.png" alt="ريادة العطاء" className="w-9 h-9 rounded-xl object-contain shadow-xs" />
            <div>
              <h3 className="text-sm font-black text-[#071C43] dark:text-sky-200">تثبيت تطبيق ريادة العطاء</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">على أجهزة iPhone و iPad</p>
            </div>
          </div>
          <button
            onClick={() => setShowIOSGuide(false)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          <div className="flex items-start gap-3 bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0754C7] text-white font-bold text-xs shrink-0">
              1
            </span>
            <div>
              انقر على أيقونة <strong>المشاركة (Share)</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-[#0754C7]" /> في شريط متصفح سفاري بالأسفل.
            </div>
          </div>

          <div className="flex items-start gap-3 bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0754C7] text-white font-bold text-xs shrink-0">
              2
            </span>
            <div>
              مرر لأسفل واختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> (Add to Home Screen).
            </div>
          </div>

          <div className="flex items-start gap-3 bg-blue-50/70 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0754C7] text-white font-bold text-xs shrink-0">
              3
            </span>
            <div>
              انقر على <strong>«إضافة»</strong> (Add) في أعلى الزاوية. سيظهر التطبيق فوراً بشعاره الرسمي واسم «ريادة العطاء».
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowIOSGuide(false)}
          className="w-full rounded-2xl bg-[#071C43] hover:bg-[#0b2b63] text-white py-2.5 text-xs font-bold transition shadow-md"
        >
          حسناً، فهمت
        </button>
      </div>
    </div>
  );

  if (variant === 'floating') {
    return (
      <>
        <div className={`fixed bottom-5 left-5 z-40 ${className}`}>
          <button
            onClick={handleInstallClick}
            disabled={installing}
            className="flex items-center gap-2 bg-gradient-to-r from-[#071C43] to-[#0754C7] hover:from-[#0b2b63] hover:to-[#0864ee] text-white px-3.5 py-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 text-xs font-bold border border-white/20 group cursor-pointer"
            title="تثبيت تطبيق ريادة العطاء على جهازك"
          >
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
              <Download className="w-3.5 h-3.5 text-white animate-bounce" />
            </div>
            <span>تثبيت التطبيق</span>
          </button>
        </div>
        {modal}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        disabled={installing}
        type="button"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#071C43] to-[#0754C7] hover:from-[#0b2b63] hover:to-[#0864ee] text-white text-xs font-bold shadow-sm hover:shadow transition-all transform active:scale-95 cursor-pointer whitespace-nowrap border border-white/10 ${className}`}
        title="تثبيت تطبيق ريادة العطاء"
      >
        <Download className="w-3.5 h-3.5 text-white" />
        <span>تثبيت التطبيق</span>
      </button>
      {modal}
    </>
  );
};
