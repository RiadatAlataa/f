import React from "react";
import { AlertCircle, RotateCw } from "lucide-react";

export interface LoadingScreenProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = "جاري تحميل الموقع، يرجى الانتظار...",
  error = null,
  onRetry,
  isRetrying = false,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      dir="rtl"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-center select-none font-sans transition-colors duration-300"
    >
      <div className="flex flex-col items-center max-w-sm w-full">
        {/* Logo and Rotating Ring Container */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center mb-6">
          {/* Subtle Ambient Glow Behind Ring */}
          <div
            className={`absolute inset-0 rounded-full bg-blue-600/10 dark:bg-blue-500/15 blur-xl transition-opacity duration-700 pointer-events-none ${
              error ? "bg-rose-500/15 dark:bg-rose-500/20" : ""
            }`}
          />

          {/* Static Track Ring (Base) */}
          <div className="absolute inset-0 rounded-full border-[2.5px] border-slate-200/80 dark:border-slate-800/90" />

          {/* Smooth Continuous Rotating Ring (Royal Blue & Navy) */}
          {!error ? (
            <div
              className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#0754C7] border-r-[#0754C7] border-b-[#071C43] shadow-[0_0_20px_rgba(7,84,199,0.30)] dark:shadow-[0_0_25px_rgba(7,84,199,0.45)] motion-safe:animate-spin motion-reduce:animate-pulse"
              style={{
                animationDuration: "1.5s",
                animationTimingFunction: "linear",
              }}
            />
          ) : (
            <div className="absolute inset-0 rounded-full border-[3px] border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.25)]" />
          )}

          {/* Inner Static Badge Housing the Official Logo */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md flex items-center justify-center p-3 z-10 transition-transform">
            <img
              src="/logo.png"
              alt="شعار جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"
              className="w-full h-full object-contain pointer-events-none select-none drop-shadow-xs"
              onError={(e) => {
                // Graceful fallback to SVG logo if PNG is unavailable
                const target = e.currentTarget;
                if (!target.src.endsWith("/logo.svg")) {
                  target.src = "/logo.svg";
                }
              }}
            />
          </div>
        </div>

        {/* Association Branding Title */}
        <h1 className="text-base sm:text-lg font-black text-[#071C43] dark:text-sky-200 tracking-tight mb-2">
          جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
        </h1>

        {/* Dynamic Status / Error View */}
        {!error ? (
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              {message}
            </p>
          </div>
        ) : (
          <div className="w-full mt-4 space-y-4">
            <div className="bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-right space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>تعذر إكمال الاتصال بالخادم</span>
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                {error}
              </p>
            </div>

            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="w-full bg-[#0754C7] hover:bg-[#06429f] active:bg-[#053683] disabled:opacity-60 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCw
                  className={`w-4 h-4 ${isRetrying ? "animate-spin" : ""}`}
                />
                <span>{isRetrying ? "جاري إعادة المحاولة..." : "إعادة المحاولة"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
