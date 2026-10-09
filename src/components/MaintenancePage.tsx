import React from "react";
import { Wrench, ShieldCheck, Lock, Sparkles, Phone, Mail, Clock, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";

export interface MaintenancePageProps {
  message?: string;
  associationName?: string;
  licenseNumber?: string;
  logoUrl?: string;
  onOpenLogin?: () => void;
  onRefresh?: () => void;
  isDark?: boolean;
  authenticatedUser?: any;
  onReturnToDashboard?: () => void;
  isAuthorizedStaff?: boolean;
  onDisableMaintenance?: () => void;
  onLogout?: () => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  message = "نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.",
  associationName = "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
  licenseNumber = "1000888600",
  logoUrl = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop",
  onOpenLogin,
  onRefresh,
  isDark = false,
  authenticatedUser,
  onReturnToDashboard,
  isAuthorizedStaff = false,
  onDisableMaintenance,
  onLogout
}) => {
  const [isChecking, setIsChecking] = React.useState(false);
  const [isDisabling, setIsDisabling] = React.useState(false);

  const handleManualCheck = () => {
    setIsChecking(true);
    if (onRefresh) {
      onRefresh();
    }
    setTimeout(() => {
      setIsChecking(false);
    }, 800);
  };

  const handleDisableClick = async () => {
    if (!onDisableMaintenance) return;
    setIsDisabling(true);
    try {
      await onDisableMaintenance();
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <div 
      dir="rtl" 
      className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 md:p-10 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden"
    >
      {/* Background Decorative Ambient Gradients */}
      <div className="absolute top-0 right-1/4 -mt-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -mb-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Authorized Manager Top Sticky Banner */}
      {isAuthorizedStaff && (
        <div className="w-full max-w-5xl mx-auto mb-4 bg-amber-500/15 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 z-20 shadow-xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200 text-xs font-black">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>أنت تشاهد صفحة الصيانة بصفتك مدير العمليات / الإدارة العليا (الموقع العام مغلق حالياً أمام الزوار)</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            {onReturnToDashboard && (
              <button
                type="button"
                onClick={onReturnToDashboard}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
              >
                العودة للوحة الإدارة
              </button>
            )}
            {onDisableMaintenance && (
              <button
                type="button"
                onClick={handleDisableClick}
                disabled={isDisabling}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isDisabling ? "جاري الإلغاء..." : "إلغاء الصيانة وفتح الموقع للجميع"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm p-1.5 flex items-center justify-center shrink-0">
            <img 
              src={logoUrl} 
              alt={associationName} 
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
              {associationName}
            </h1>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600 inline" />
              <span>ترخيص رقم: {licenseNumber} • العسيلة بمكة المكرمة</span>
            </p>
          </div>
        </div>

        {/* Administrative Staff Entrance Button */}
        {(authenticatedUser && onReturnToDashboard && isAuthorizedStaff) ? (
          <button
            type="button"
            onClick={onReturnToDashboard}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs hover:shadow-sm transition-all cursor-pointer"
            title="العودة المباشرة إلى لوحة التحكم الإدارية"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span>العودة للوحة الإدارة ({authenticatedUser.name?.split(" ")[0] || "المسؤول"})</span>
          </button>
        ) : (authenticatedUser && onLogout && !isAuthorizedStaff) ? (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 shadow-xs hover:bg-rose-100 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>خروج ({authenticatedUser.name?.split(" ")[0]})</span>
          </button>
        ) : onOpenLogin ? (
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-xs hover:shadow-sm transition-all cursor-pointer"
            title="دخول الكوادر الإدارية المصرح لهم أثناء وضع الصيانة"
          >
            <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>دخول الكوادر والإدارة</span>
          </button>
        ) : null}
      </header>

      {/* Center Main Card */}
      <main className="w-full max-w-2xl mx-auto my-auto py-8 z-10 flex flex-col items-center text-center">
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-10 md:p-12 shadow-xl relative overflow-hidden backdrop-blur-sm space-y-6">
          {/* Subtle Top Accent Ribbon */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500" />

          {/* Maintenance Animated Icon Badge */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner relative">
            <div className="absolute inset-0 rounded-3xl bg-amber-400/10 animate-ping" />
            <Wrench className="w-11 h-11 relative z-10 animate-bounce duration-1000" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Title & Status */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-black">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>وضع التطوير والصيانة المجدولة</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              الموقع تحت الصيانة والتطوير
            </h2>
          </div>

          {/* Notice for logged-in non-admin users */}
          {authenticatedUser && !isAuthorizedStaff && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 text-amber-900 dark:text-amber-200 text-xs font-bold leading-relaxed">
              مرحباً بك ({authenticatedUser.name}) • تم تعليق بوابات المستخدمين والمتطوعين والمستفيدين مؤقتاً لحين استكمال أعمال الصيانة والتحديثات من قِبل إدارة العمليات.
            </div>
          )}

          {/* Explanatory Message */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed font-medium">
            {message}
          </div>

          {/* Information Notice */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تحديثات مستمرة لخدمة ضيوف الرحمن والمجتمع</span>
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>البيانات وسجلات المستفيدين محفوظة بأمان</span>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'جاري فحص حالة الموقع...' : 'التحقق من جاهزية الموقع'}</span>
            </button>

            {(authenticatedUser && onReturnToDashboard && isAuthorizedStaff) ? (
              <button
                type="button"
                onClick={onReturnToDashboard}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>العودة للوحة التحكم الإدارية</span>
              </button>
            ) : (authenticatedUser && onLogout && !isAuthorizedStaff) ? (
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            ) : onOpenLogin ? (
              <button
                type="button"
                onClick={onOpenLogin}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>دخول الإدارة والعمليات</span>
              </button>
            ) : null}
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-4xl mx-auto text-center z-10 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
        <p className="font-bold text-slate-700 dark:text-slate-300">
          © {new Date().getFullYear()} {associationName} • بمكة المكرمة
        </p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          مرخصة رسميًا من المركز الوطني لتنمية القطاع غير الربحي بالترخيص رقم: {licenseNumber}
        </p>
      </footer>
    </div>
  );
};
