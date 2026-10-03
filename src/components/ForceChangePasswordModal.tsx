import React, { useState } from "react";
import { Lock, ShieldCheck, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, XCircle, Check } from "lucide-react";

interface ForceChangePasswordModalProps {
  isOpen: boolean;
  userId: string;
  userName: string;
  userRole?: string;
  onSuccess: () => void;
  onLogout: () => void;
}

export const ForceChangePasswordModal: React.FC<ForceChangePasswordModalProps> = ({
  isOpen,
  userId,
  userName,
  userRole,
  onSuccess,
  onLogout
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Criteria Verification
  const rules = [
    { id: "len", label: "8 خانات على الأقل", passed: newPassword.length >= 8 },
    { id: "num", label: "يحتوي على أرقام (0-9)", passed: /[0-9]/.test(newPassword) },
    { id: "char", label: "يحتوي على أحرف لغوية", passed: /[a-zA-Z\u0621-\u064A]/.test(newPassword) },
    { id: "special", label: "حرف كبير (Uppercase) أو رمز خاص", passed: /[A-Z]/.test(newPassword) || /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword) }
  ];

  const allRulesPassed = rules.every((r) => r.passed);
  const passedCount = rules.filter((r) => r.passed).length;

  const getStrengthInfo = () => {
    if (!newPassword) return { label: "أدخل كلمة المرور", color: "bg-slate-200 dark:bg-slate-700", text: "text-slate-400" };
    if (passedCount <= 1) return { label: "ضعيفة جداً", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
    if (passedCount === 2) return { label: "مقبولة جزئياً", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
    if (passedCount === 3) return { label: "جيدة", color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" };
    return { label: "قوية ومطابقة للمعايير (Bcrypt)", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  };

  const strength = getStrengthInfo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!allRulesPassed) {
      setErrorMessage("يرجى استيفاء كافة شروط وقواعد قوة كلمة المرور الموضحة أدناه.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("كلمتا المرور غير متطابقتين، يرجى إعادة التحقق.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/db/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setErrorMessage(data?.error || "تعذر تحديث كلمة المرور، يرجى المحاولة لاحقاً.");
        return;
      }

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in" dir="rtl">
      <div 
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-900/50 overflow-hidden relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-password-title"
      >
        {/* Luxury Security Header Pattern */}
        <div className="bg-gradient-to-r from-amber-600 via-emerald-700 to-teal-800 p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-amber-200 shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full inline-block mb-1 text-amber-100">
                أمان وتشفير الحساب (Bcrypt)
              </span>
              <h2 id="force-password-title" className="text-lg font-black leading-tight">
                تحديث كلمة المرور الإلزامي
              </h2>
            </div>
          </div>
          <p className="text-xs text-emerald-100/90 mt-3 leading-relaxed">
            مرحباً بك <strong className="text-white font-bold">{userName}</strong>. يتطلب النظام تحديث كلمة المرور الخاصة بحسابك واعتماد تشفير Bcrypt فائق الأمان قبل المتابعة.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3.5 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
              كلمة المرور الجديدة:
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل كلمة مرور قوية (8 خانات فأكثر)"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 pl-10 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showPassword ? "إخفاء" : "إظهار"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter Bar */}
            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">مستوى القوة:</span>
                <span className={`font-black ${strength.text}`}>{strength.label}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`h-full flex-1 transition-all duration-300 ${
                      passedCount >= step ? strength.color : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Validation Rules Checklist */}
            <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-[11px]">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5">
                  {r.passed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                  )}
                  <span className={r.passed ? "font-bold text-slate-800 dark:text-slate-200" : "text-slate-400"}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
              تأكيد كلمة المرور الجديدة:
            </label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="أعد إدخال كلمة المرور للتأكيد"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 pl-10 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showConfirm ? "إخفاء" : "إظهار"}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-rose-600 hover:text-rose-700 font-bold px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              تسجيل الخروج
            </button>
            <button
              type="submit"
              disabled={isLoading || !allRulesPassed || !confirmPassword}
              className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs px-5 py-3 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>تشفير وحفظ (Bcrypt)...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>تشفير ومتابعة الدخول</span>
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
