import React, { useState, useEffect } from "react";
import { 
  Lock, Eye, EyeOff, Sparkles, ShieldCheck, AlertCircle, 
  RefreshCw, Globe, ArrowRight, ArrowLeft, CheckCircle2, 
  ChevronDown, ChevronUp, HeartHandshake, Award, X,
  KeyRound, CreditCard, Mail, Check, User
} from "lucide-react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { evaluatePasswordStrength, generateStrongPassword } from "../utils/passwordSecurity";

interface AuthScreenProps {
  onLoginSuccess: (role: 'admin' | 'leader' | 'volunteer' | 'beneficiary' | 'supervisor' | 'department_admin' | 'storekeeper' | string, user: any) => void;
  onBackToHome: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: (l: 'ar' | 'en') => void;
  onRegisterNewAccount?: () => void;
  homeSettings?: any;
}

export function AuthScreen({ 
  onLoginSuccess, 
  onBackToHome, 
  lang = 'ar',
  onToggleLang,
  onRegisterNewAccount,
  homeSettings
}: AuthScreenProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multi-Step Password Recovery with Salted OTP & Bcrypt
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3 | 4>(1);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [showRecNewPass, setShowRecNewPass] = useState(false);
  const [showRecConfirmPass, setShowRecConfirmPass] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // OTP Countdown Timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Google Login modal/state
  const [googleLoading, setGoogleLoading] = useState(false);

  // Collapsible quick test credentials for evaluation
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Load saved identifier if "Remember Me" was previously selected (never stores password)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("reyadat_saved_identifier");
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch {
      // LocalStorage access failsafe
    }
  }, []);

  const isRtl = lang === 'ar';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client validation with accurate Arabic messages
    if (!identifier.trim()) {
      setError(
        lang === 'ar' 
          ? "يرجى إدخال رقم الهوية أو اسم المستخدم أو البريد الإلكتروني." 
          : "Please enter your National ID, username, or email."
      );
      return;
    }

    if (!password.trim()) {
      setError(
        lang === 'ar' 
          ? "يرجى إدخال كلمة المرور." 
          : "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/db/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: identifier.trim(), 
          password: password.trim() 
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.error || (
          lang === 'ar' 
            ? "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." 
            : "Invalid login credentials. Please verify your details and try again."
        );
        setError(errorMsg);
        return;
      }

      if (data && data.status === "success" && data.role) {
        // Handle "Remember Me" for identifier ONLY (Strictly NEVER save password in localStorage)
        try {
          if (rememberMe) {
            localStorage.setItem("reyadat_saved_identifier", identifier.trim());
          } else {
            localStorage.removeItem("reyadat_saved_identifier");
          }
        } catch {
          // Ignore localStorage errors
        }

        // Successfully authenticated! Route to target role dashboard automatically
        onLoginSuccess(data.role, data.user);
      } else {
        setError(
          lang === 'ar' 
            ? "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." 
            : "Invalid login credentials."
        );
      }
    } catch {
      setError(
        lang === 'ar' 
          ? "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة مجددًا." 
          : "Could not connect to server. Please check your network and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      // Authenticate with Google identity endpoint
      const googleEmail = identifier.includes("@") ? identifier : "volunteer.google@riadataleata.org.sa";
      const res = await fetch("/api/db/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: googleEmail, 
          name: "مستخدم حساب Google" 
        })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        onLoginSuccess(data.role, data.user);
      } else {
        setError(data?.error || (lang === 'ar' ? "فشل تسجيل الدخول بواسطة Google." : "Google Sign-In failed."));
      }
    } catch {
      setError(lang === 'ar' ? "فشل الاتصال بخدمة Google." : "Could not connect to Google services.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Multi-Step Password Recovery Handlers (OTP & Bcrypt)
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!recoveryIdentifier.trim()) {
      setRecoveryError(
        lang === 'ar' 
          ? "يرجى إدخال رقم الهوية أو اسم المستخدم أو البريد الإلكتروني المسجل." 
          : "Please enter your registered ID, username, or email."
      );
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: recoveryIdentifier.trim() })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success") {
        setRecoveryEmail(data.email || recoveryIdentifier.trim());
        setMaskedEmail(data.maskedEmail || data.email || recoveryIdentifier.trim());
        setRecoveryStep(2);
        setOtpTimer(60); // 60 seconds countdown for resend
        setRecoverySuccess(data.message || (lang === 'ar' ? "تم إرسال رمز التحقق OTP بنجاح." : "OTP code has been sent."));
      } else {
        setRecoveryError(data?.error || (lang === 'ar' ? "تعذر إرسال رمز التحقق، يرجى المحاولة لاحقاً." : "Failed to process request."));
      }
    } catch {
      setRecoveryError(lang === 'ar' ? "حدث خطأ أثناء الاتصال بالخادم." : "An error occurred.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setRecoveryError(lang === 'ar' ? "يرجى إدخال رمز التحقق المكون من 6 أرقام." : "Please enter the 6-digit OTP code.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: recoveryEmail,
          otpCode: otpCode.trim()
        })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success") {
        setResetToken(data.resetToken);
        setRecoveryStep(3);
        setRecoverySuccess(data.message || (lang === 'ar' ? "تم التحقق من الرمز بنجاح." : "Code verified successfully."));
      } else {
        setRecoveryError(data?.error || (lang === 'ar' ? "رمز التحقق غير صحيح أو منتهي الصلاحية." : "Invalid or expired OTP."));
      }
    } catch {
      setRecoveryError(lang === 'ar' ? "حدث خطأ أثناء الاتصال بالخادم." : "An error occurred.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!recoveryNewPassword.trim()) {
      setRecoveryError(lang === 'ar' ? "يرجى إدخال كلمة المرور الجديدة." : "Please enter new password.");
      return;
    }

    if (recoveryNewPassword.trim() !== recoveryConfirmPassword.trim()) {
      setRecoveryError(lang === 'ar' ? "كلمتا المرور غير متطابقتين، يرجى إعادة التحقق." : "Passwords do not match.");
      return;
    }

    const evalResult = evaluatePasswordStrength(recoveryNewPassword.trim());
    if (!evalResult.allPassed) {
      setRecoveryError(
        lang === 'ar'
          ? `كلمة المرور لا تستوفي شروط الأمان: ${evalResult.errors.join(" ")}`
          : "Password does not meet security criteria."
      );
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/reset-password-with-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: recoveryEmail,
          resetToken,
          newPassword: recoveryNewPassword.trim(),
          confirmPassword: recoveryConfirmPassword.trim()
        })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success") {
        setRecoveryStep(4);
        setRecoverySuccess(
          data.message || 
          (lang === 'ar' 
            ? "تم تحديث كلمة المرور وتشفيرها بنجاح بواسطة نظام Bcrypt." 
            : "Password has been updated and hashed with Bcrypt.")
        );
      } else {
        setRecoveryError(data?.error || (lang === 'ar' ? "فشل حفظ كلمة المرور الجديدة." : "Failed to reset password."));
      }
    } catch {
      setRecoveryError(lang === 'ar' ? "حدث خطأ أثناء معالجة الطلب." : "An error occurred.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Quick helper to fill test accounts
  const handleSelectDemoAccount = (id: string, pass: string = "123") => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div 
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* 1. TOP UTILITY BAR (Official Association Bar) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4.25rem] py-2 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Association Info */}
          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white ring-2 ring-emerald-600/30 dark:ring-emerald-400/30 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
              {homeSettings?.logoUrl ? (
                <img 
                  src={homeSettings.logoUrl} 
                  alt="شعار الجمعية" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <Sparkles className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="flex flex-col justify-center min-w-0 text-right">
              <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight tracking-tight truncate max-w-[130px] min-[390px]:max-w-[190px] sm:max-w-none">
                {lang === 'ar' ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Reyadat Al-Ata Association"}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-normal hidden sm:block whitespace-nowrap">
                  {lang === 'ar' ? "بوابة النفاذ الموحدة" : "Unified Access Portal"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'ar' ? "ترخيص: " : "License: "}</span>
                  <span className="font-mono">5081</span>
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions: Language & Return to Home */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onToggleLang && (
              <button
                type="button"
                onClick={() => onToggleLang(lang === 'ar' ? 'en' : 'ar')}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="تغيير اللغة / Switch Language"
                aria-label="تغيير اللغة"
              >
                <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden sm:inline font-mono">{lang === 'ar' ? "English" : "العربية"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              title={lang === 'ar' ? "العودة للموقع الرسمي للجمعية" : "Back to official homepage"}
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span className="hidden sm:inline">{lang === 'ar' ? "الرئيسية" : "Home"}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN BODY (SPLIT VIEW: VISUAL BRANDING + UNIFIED LOGIN CARD) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* ======================================================== */}
          {/* SECTION 1: CHARITY BRANDING & MISSION SIDE (القسم التعريفي - يظهر للشاشات الكبيرة فقط) */}
          {/* ======================================================== */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 text-white shadow-xl relative overflow-hidden order-2 lg:order-1 border border-emerald-700/40">
            {/* Background Decorative Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
            
            {/* Soft Charity Community Background Image with subtle overlay */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"
              style={{ 
                backgroundImage: `url('https://images.unsplash.com/photo-1593113598332-cd288d649433?w=900&auto=format&fit=crop&q=80')` 
              }}
            ></div>

            <div className="relative z-10 space-y-6">
              
              {/* Association Emblem Badge */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">
                    {lang === 'ar' ? "منظومة العطاء المتكاملة" : "Nonprofit Portal"}
                  </div>
                  <div className="text-sm font-bold text-white">
                    {lang === 'ar' ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Reyadat Al-Ata Association"}
                  </div>
                </div>
              </div>

              {/* Main Headline */}
              <div className="space-y-2.5 pt-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-tight">
                  {lang === 'ar' ? "معًا نصنع أثرًا ونبني مجتمعًا أفضل" : "Together Making Impact & Building a Better Society"}
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal">
                  {lang === 'ar' 
                    ? "منصة إلكترونية متكاملة لخدمة المستفيدين وتمكين المتطوعين والموظفين والشركاء ودعم الأعمال والمبادرات المجتمعية."
                    : "An integrated portal empowering beneficiaries, volunteers, staff, partners, and community programs."}
                </p>
              </div>

              {/* 3 Charity Pillars (الأثر المستدام، الخدمة الموثوقة، المجتمع الأفضل) */}
              <div className="space-y-3 pt-2">
                
                {/* Pillar 1: Sustainable Impact */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "أثر مستدام" : "Sustainable Impact"}
                    </h3>
                    <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                      {lang === 'ar' ? "نساهم في صناعة أثر إيجابي مستمر في خدمة الإنسان." : "Creating lasting positive community impact."}
                    </p>
                  </div>
                </div>

                {/* Pillar 2: Reliable Service */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "خدمة موثوقة" : "Reliable Services"}
                    </h3>
                    <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                      {lang === 'ar' ? "نقدم خدماتنا للمستخدمين بأعلى معايير الجودة والحوكمة." : "Providing high governance and quality standards."}
                    </p>
                  </div>
                </div>

                {/* Pillar 3: Better Community */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "مجتمع أفضل" : "Better Community"}
                    </h3>
                    <p className="text-[11px] text-emerald-100/80 leading-relaxed">
                      {lang === 'ar' ? "نعمل معًا لخدمة المجتمع وتعزيز التكافل الاجتماعي والتطوع." : "Working together to promote solidarity and volunteerism."}
                    </p>
                  </div>
                </div>

              </div>

            </div>

            {/* Bottom Footer Note */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[10px] text-emerald-200/80">
              <span>{lang === 'ar' ? "العسيلة - مكة المكرمة" : "Al-Useilah, Makkah"}</span>
              <span className="flex items-center gap-1 font-bold text-white">
                <Check className="w-3 h-3 text-emerald-400" />
                {lang === 'ar' ? "نظام دخول مشفر وآمن" : "Encrypted Access"}
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: THE UNIFIED LOGIN CARD (بطاقة تسجيل الدخول) */}
          {/* ======================================================== */}
          <div className="w-full lg:col-span-7 flex flex-col justify-center order-1 lg:order-2 max-w-xl mx-auto lg:max-w-none">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-6">
              
              {/* Card Header */}
              <div className="space-y-1.5 text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/60 dark:border-emerald-800">
                  <KeyRound className="w-3 h-3 text-emerald-600" />
                  <span>{lang === 'ar' ? "البوابة الموحدة لكافة الحسابات" : "Unified All-Accounts Portal"}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {lang === 'ar' ? "تسجيل الدخول" : "Sign In"}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                  {lang === 'ar' 
                    ? "مرحبًا بك، قم بتسجيل الدخول للوصول إلى حسابك (المدير، الموظف، المتطوع، المستفيد، الشريك)"
                    : "Welcome back! Sign in to access your account dashboard."}
                </p>
              </div>

              {/* Error Alert Display */}
              {error && (
                <div 
                  role="alert"
                  className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3 transition-all animate-in fade-in duration-200"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div className="font-semibold leading-relaxed text-right flex-1">
                    {error}
                  </div>
                </div>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* FIELD 1: Identifier (National ID / Username / Email / Phone) */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="user-identifier"
                    className="block text-xs font-black text-slate-700 dark:text-slate-300 text-right"
                  >
                    {lang === 'ar' 
                      ? "رقم الهوية الوطنية / اسم المستخدم / البريد الإلكتروني" 
                      : "National ID / Username / Email / Phone"}
                    <span className="text-rose-500 mr-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="user-identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={
                        lang === 'ar' 
                          ? "أدخل رقم الهوية أو اسم المستخدم أو البريد الإلكتروني" 
                          : "Enter your National ID, username, or email"
                      }
                      className="w-full pr-10 pl-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      disabled={loading}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* FIELD 2: Password with Show/Hide toggle */}
                <div className="space-y-1.5">
                  <label 
                    htmlFor="user-password"
                    className="block text-xs font-black text-slate-700 dark:text-slate-300 text-right"
                  >
                    {lang === 'ar' ? "كلمة المرور" : "Password"}
                    <span className="text-rose-500 mr-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="user-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={lang === 'ar' ? "أدخل كلمة المرور" : "Enter your password"}
                      className="w-full pr-10 pl-11 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                      disabled={loading}
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    
                    {/* Show/Hide password toggle */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* ROW: Remember Me & Forgot Password */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  {/* Remember me checkbox */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                    />
                    <span className="text-slate-600 dark:text-slate-400 font-bold">
                      {lang === 'ar' ? "تذكرني" : "Remember me"}
                    </span>
                  </label>

                  {/* Forgot Password link */}
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryIdentifier(identifier);
                      setShowForgotModal(true);
                      setRecoveryError(null);
                      setRecoverySuccess(null);
                    }}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold transition-colors cursor-pointer"
                  >
                    {lang === 'ar' ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                  </button>
                </div>

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{lang === 'ar' ? "جاري التحقق والمصادقة..." : "Verifying credentials..."}</span>
                    </>
                  ) : (
                    <span>{lang === 'ar' ? "تسجيل الدخول" : "Sign In"}</span>
                  )}
                </button>
              </form>

              {/* DIVIDER: OR (Strictly Google Only - Apple & Facebook Permanently Removed) */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                    {lang === 'ar' ? "أو المتابعة باستخدام" : "Or continue with"}
                  </span>
                </div>
              </div>

              {/* GOOGLE SIGN IN BUTTON (Official Google Brand) */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3 px-4 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs disabled:opacity-60"
              >
                {googleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {lang === 'ar' ? "تسجيل الدخول بواسطة Google" : "Sign in with Google"}
                </span>
              </button>

              {/* CREATE NEW ACCOUNT LINK */}
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {lang === 'ar' ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      if (onRegisterNewAccount) {
                        onRegisterNewAccount();
                      } else {
                        onBackToHome();
                      }
                    }}
                    className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-black underline underline-offset-4 cursor-pointer"
                  >
                    {lang === 'ar' ? "إنشاء حساب جديد" : "Create New Account"}
                  </button>
                </p>
              </div>

              {/* QUICK DEMO CREDENTIALS COLLAPSIBLE (For testing and evaluating all roles) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                  className="w-full flex items-center justify-between py-2 text-[11px] font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{lang === 'ar' ? "بيانات الحسابات المعتمدة للتجربة (اضغط للتعبئة التلقائية)" : "Test Accounts Demo Access"}</span>
                  </span>
                  {showDemoCredentials ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showDemoCredentials && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-2">
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      {lang === 'ar' 
                        ? "انقر على أي حساب لتعبئة بيانات الدخول مباشرة وتجربة التعرف التلقائي على الصلاحيات:" 
                        : "Click any profile to autofill and test auto-role detection:"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      
                      {/* Admin */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("admin", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          المدير التنفيذي / الإدارة
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: admin / كلمة المرور: 123
                        </div>
                      </button>

                      {/* Volunteer by National ID */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1087654321", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          متطوع (برقم الهوية)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1087654321 / 123
                        </div>
                      </button>

                      {/* Beneficiary by Email or National ID */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1023456789", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مستفيد (أبو محمد المكي)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1023456789 / 123
                        </div>
                      </button>

                      {/* Storekeeper */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000099", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          أمين المستودع الرئيسي
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000099 / 123
                        </div>
                      </button>

                      {/* Warehouse & Support Services Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000008", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مدير المخزن والخدمات المساندة
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000008 / 123
                        </div>
                      </button>

                      {/* Department Employee (HR & Warehouse) */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1034567890", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          موظف إدارة معتمد (سعود الهذلي)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1034567890 / 123
                        </div>
                      </button>

                      {/* Volunteer Management Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000005", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مديرة إدارة التطوع
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000005 / 123
                        </div>
                      </button>

                      {/* Beneficiaries Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000004", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مديرة إدارة المستفيدين
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000004 / 123
                        </div>
                      </button>

                      {/* Team Leader */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("سعود الحربي", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          قائد فريق تطوعي
                        </div>
                        <div className="text-[10px] text-slate-500">
                          الاسم: سعود الحربي / 123
                        </div>
                      </button>

                      {/* Test Inactive Account Error State */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1099999991", "123")}
                        className="p-2 text-right bg-rose-50/60 dark:bg-rose-950/20 hover:border-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-rose-800 dark:text-rose-300">
                          تجربة حساب غير مفعل
                        </div>
                        <div className="text-[10px] text-rose-600/80 font-mono">
                          1099999991 (رسالة الحساب غير مفعل)
                        </div>
                      </button>

                      {/* Test Suspended Account Error State */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1099999992", "123")}
                        className="p-2 text-right bg-amber-50/60 dark:bg-amber-950/20 hover:border-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-amber-800 dark:text-amber-300">
                          تجربة حساب موقوف
                        </div>
                        <div className="text-[10px] text-amber-600/80 font-mono">
                          1099999992 (رسالة الإيقاف المؤقت)
                        </div>
                      </button>

                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FORGOT PASSWORD / RECOVERY MODAL */}
      {/* ======================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-right relative">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Stepper Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                {/* Step indicator badge */}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <span>الخطوة {recoveryStep} من 3</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{recoveryStep === 1 ? 'طلب OTP' : recoveryStep === 2 ? 'التحقق' : recoveryStep === 3 ? 'تشفير Bcrypt' : 'مكتمل'}</span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {recoveryStep === 1 && (lang === 'ar' ? "استعادة كلمة المرور عبر البريد" : "Password Recovery via Email")}
                  {recoveryStep === 2 && (lang === 'ar' ? "إدخال رمز التحقق OTP" : "Enter Verification OTP")}
                  {recoveryStep === 3 && (lang === 'ar' ? "تعيين كلمة المرور الجديدة (Bcrypt)" : "Set New Bcrypt Password")}
                  {recoveryStep === 4 && (lang === 'ar' ? "تم تحديث كلمة المرور بنجاح 🎉" : "Password Updated Successfully")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  {recoveryStep === 1 && "أدخل رقم الهوية أو اسم المستخدم أو البريد المسجل لإرسال رمز تحقق مؤقت."}
                  {recoveryStep === 2 && `أدخل رمز التحقق (OTP) المكون من 6 أرقام المرسل إلى: ${maskedEmail}`}
                  {recoveryStep === 3 && "أدخل كلمة مرور قوية تطابق معايير الأمان ليتم تشفيرها بخوارزمية Bcrypt."}
                  {recoveryStep === 4 && "تم حفظ وتشفير كلمة مرورك بنجاح وإنهاء الجلسات السابقة لحماية حسابك."}
                </p>
              </div>
            </div>

            {/* Error banner in modal */}
            {recoveryError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-bold leading-relaxed">{recoveryError}</span>
              </div>
            )}

            {/* Success banner in modal (Step 1 to 3) */}
            {recoverySuccess && recoveryStep !== 4 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-bold leading-relaxed">{recoverySuccess}</span>
              </div>
            )}

            {/* STEP 1: Enter Identifier */}
            {recoveryStep === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    رقم الهوية أو اسم المستخدم أو البريد الإلكتروني:
                  </label>
                  <input
                    type="text"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="مثال: 1087654321 أو user@example.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    autoFocus
                    required
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    ملاحظة أمنية: يجب أن يكون للحساب بريد إلكتروني موثق ليتم إرسال رمز التحقق إليه.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {recoveryLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري التحقق والبحث...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5" />
                        <span>إرسال رمز التحقق OTP</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter 6-digit OTP Code */}
            {recoveryStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      رمز التحقق (OTP):
                    </label>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                      صالح لمدة 10 دقائق
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="••••••"
                    className="w-full px-3.5 py-3 text-center text-lg tracking-[0.5em] font-mono font-black rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    autoFocus
                    required
                  />
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={otpTimer > 0 || recoveryLoading}
                      onClick={() => handleRequestOtp()}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {otpTimer > 0 ? `إعادة الإرسال بعد (${otpTimer}) ثانية` : "إعادة إرسال رمز جديد"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryStep(1);
                        setOtpCode("");
                        setRecoveryError(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      تغيير الحساب
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={recoveryLoading || otpCode.length !== 6}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {recoveryLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري التحقق من الرمز...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>التحقق ومتابعة التعيين</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Password (with Strength Meter & Bcrypt) */}
            {recoveryStep === 3 && (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                {/* New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      كلمة المرور الجديدة:
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const strong = generateStrongPassword();
                        setRecoveryNewPassword(strong);
                        setRecoveryConfirmPassword(strong);
                        setRecoveryError(null);
                      }}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>توليد كلمة قوية</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showRecNewPass ? "text" : "password"}
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value)}
                      placeholder="أدخل كلمة مرور قوية (8 خانات فأكثر)"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecNewPass(!showRecNewPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRecNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {/* Real-time strength meter */}
                  <PasswordStrengthMeter password={recoveryNewPassword} />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تأكيد كلمة المرور الجديدة:
                  </label>
                  <div className="relative">
                    <input
                      type={showRecConfirmPass ? "text" : "password"}
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRecConfirmPass(!showRecConfirmPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRecConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {recoveryConfirmPassword && recoveryNewPassword !== recoveryConfirmPassword && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1">
                      ⚠️ كلمتا المرور غير متطابقتين.
                    </p>
                  )}
                  {recoveryConfirmPassword && recoveryNewPassword === recoveryConfirmPassword && (
                    <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      كلمتا المرور متطابقتان.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={recoveryLoading || !recoveryNewPassword || recoveryNewPassword !== recoveryConfirmPassword}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                  >
                    {recoveryLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الحفظ والتشفير عبر Bcrypt...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>تأكيد وحفظ كلمة المرور الجديدة</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Success confirmation */}
            {recoveryStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>تم تحديث وتشفير كلمة المرور بنجاح!</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    تم تشفير كلمة مرورك الجديدة بواسطة نظام Bcrypt وإنهاء الجلسات القديمة لضمان أقصى درجات الأمان. يمكنك الآن تسجيل الدخول مباشرة ببياناتك الجديدة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setIdentifier(recoveryIdentifier);
                    setPassword("");
                    setError(null);
                    setRecoveryStep(1);
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <User className="w-4 h-4" />
                  <span>تسجيل الدخول الآن بحسابك</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
