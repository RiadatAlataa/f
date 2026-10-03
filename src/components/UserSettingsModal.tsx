import React, { useState } from 'react';
import { 
  X, Volume2, VolumeX, Bell, BellRing, Sparkles, Moon, Sun, 
  Check, Music, Sliders, ShieldCheck, Server, CheckCircle2,
  Lock, KeyRound, Eye, EyeOff, AlertCircle, RefreshCw, UserCheck
} from 'lucide-react';
import { useApplicationAudio, GENERAL_AUDIO_STORAGE_KEY } from '../utils/audioNotification';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { generateStrongPassword, evaluatePasswordStrength } from '../utils/passwordSecurity';

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  currentUser?: any;
  currentUserRole?: string;
  isDark?: boolean;
  onToggleDark?: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  currentUser,
  currentUserRole = 'public',
  isDark = false,
  onToggleDark
}) => {
  const { isAudioEnabled, toggleAudio, testSound } = useApplicationAudio();

  // Active Tab: 'security' (حسابي -> الأمان -> تغيير كلمة المرور) or 'preferences'
  const [activeTab, setActiveTab] = useState<'security' | 'preferences'>('security');

  // General notifications sound setting
  const [generalSound, setGeneralSound] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GENERAL_AUDIO_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleGeneralSound = () => {
    const next = !generalSound;
    setGeneralSound(next);
    try {
      localStorage.setItem(GENERAL_AUDIO_STORAGE_KEY, String(next));
    } catch {}
  };

  const handleTestSound = () => {
    setIsPlayingTest(true);
    testSound();
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 700);
  };

  const handleGenerateStrong = () => {
    const strong = generateStrongPassword();
    setNewPassword(strong);
    setConfirmPassword(strong);
    setFormError(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!currentPassword.trim()) {
      setFormError("يرجى إدخال كلمة المرور الحالية لتأكيد هويتك.");
      return;
    }

    if (!newPassword.trim()) {
      setFormError("يرجى إدخال كلمة المرور الجديدة.");
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setFormError("كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين.");
      return;
    }

    if (newPassword.trim() === currentPassword.trim()) {
      setFormError("يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية.");
      return;
    }

    // Client-side strength check
    const evalResult = evaluatePasswordStrength(newPassword.trim());
    if (!evalResult.allPassed) {
      setFormError(`كلمة المرور لا تستوفي شروط الأمان: ${evalResult.errors.join(" ")}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/db/auth/self-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id || currentUser?.userId || currentUserRole,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim()
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "فشل تغيير كلمة المرور.");
      }

      setFormSuccess(data?.message || "تم تغيير كلمة المرور وتشفيرها بنجاح بواسطة نظام Bcrypt.");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setFormError(err.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-right dir-rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>{lang === 'ar' ? 'حسابي وإعدادات الأمان' : 'My Account & Security'}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                  {currentUserRole === 'admin' ? 'الإدارة العليا' : currentUserRole === 'operations_manager' ? 'مدير العمليات' : currentUserRole === 'leader' ? 'قائد فريق' : currentUserRole === 'volunteer' ? 'متطوع' : 'المستخدم'}
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                {lang === 'ar' ? 'إدارة كلمة المرور، الأمان، التشفير، والتفضيلات' : 'Manage password, Bcrypt security, and preferences'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={lang === 'ar' ? 'إغلاق النافذة' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/70 p-1.5 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'الأمان وتغيير كلمة المرور' : 'Security & Password'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'التفضيلات والصوتيات' : 'Preferences & Audio'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* TAB 1: SECURITY & CHANGE PASSWORD (حسابي -> الأمان -> تغيير كلمة المرور) */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* Account Security Badge */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-900/40 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <strong className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                      {currentUser?.name || currentUser?.userName || "الحساب الشخصي"}
                    </strong>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-600 text-white shadow-xs">
                      Bcrypt Encryption ✓
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    كلمات المرور في هذا النظام مشفرة عبر خوارزمية <strong className="text-emerald-700 dark:text-emerald-400">Bcrypt (10 Salt Rounds)</strong> لحماية حسابك من أي تسريب، ولا يتم تخزينها كنص مكشوف نهائياً.
                  </p>
                </div>
              </div>

              {/* Status & Feedback Banners */}
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span className="font-bold leading-relaxed">{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-bold leading-relaxed">{formSuccess}</span>
                </div>
              )}

              {/* Password Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    كلمة المرور الحالية:
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية لتأكيد هويتك"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showCurrent ? "إخفاء" : "إظهار"}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                      كلمة المرور الجديدة:
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateStrong}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>توليد كلمة مرور قوية تلقائياً</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="أدخل كلمة مرور قوية (8 خانات فأكثر)"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      title={showNew ? "إخفاء" : "إظهار"}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Real-Time Password Strength Meter */}
                  <PasswordStrengthMeter password={newPassword} />
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    تأكيد كلمة المرور الجديدة:
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور الجديدة للتطابق"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans"
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
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-[11px] text-rose-500 font-bold mt-1">
                      ⚠️ كلمتا المرور غير متطابقتين.
                    </p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      كلمتا المرور متطابقتان تماماً.
                    </p>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || !currentPassword || !newPassword || newPassword !== confirmPassword}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>جاري التحقق والتشفير عبر Bcrypt...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>تحديث وتشفير كلمة المرور الجديدة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: PREFERENCES & AUDIO NOTIFICATIONS */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {/* Audio Notifications Feature */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      {lang === 'ar' ? 'التنبيهات الصوتية لطلبات الانضمام' : 'Application Audio Notifications'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    {isAudioEnabled ? (lang === 'ar' ? 'مفعّل ✓' : 'Enabled') : (lang === 'ar' ? 'معطّل ✕' : 'Disabled')}
                  </span>
                </div>

                {/* Application Audio Alert Card with Toggle Switch */}
                <div className={`p-4 rounded-2xl border transition-all duration-200 ${
                  isAudioEnabled 
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 shadow-xs' 
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isAudioEnabled 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {isAudioEnabled ? <BellRing className="w-4 h-4 animate-bounce" /> : <VolumeX className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="text-xs font-black text-slate-900 dark:text-white">
                            {lang === 'ar' ? 'نغمة هادئة لطلبات التطوع والفرق' : 'Subtle Chime for Volunteer & Team Applications'}
                          </strong>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            {lang === 'ar' ? 'جديد' : 'New'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {lang === 'ar'
                            ? 'تشغيل نغمة صوتية هادئة وفورية فور تقديم طلب انضمام متطوع جديد أو طلب انضمام فريق تطوعي جديد إلى الجمعية.'
                            : 'Plays a subtle, pleasant chime whenever a new volunteer application or team application is submitted.'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAudioEnabled}
                      onClick={toggleAudio}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                        isAudioEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isAudioEnabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sound Test Button */}
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Music className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{lang === 'ar' ? 'نغمة ثلاثية هادئة (Chord D-F#-A)' : 'Gentle 3-tone chime'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestSound}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isPlayingTest
                          ? 'bg-emerald-600 text-white scale-95 shadow-sm'
                          : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isPlayingTest ? 'animate-pulse text-white' : 'text-emerald-600'}`} />
                      <span>{isPlayingTest ? (lang === 'ar' ? 'جاري التشغيل...' : 'Playing...') : (lang === 'ar' ? 'تجربة الصوت 🔔' : 'Test Chime 🔔')}</span>
                    </button>
                  </div>
                </div>

                {/* General Notifications Audio Toggle */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {lang === 'ar' ? 'أصوات الإشعارات العامة والتعاميم' : 'General Notifications Sound'}
                      </strong>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'ar' ? 'تنبيه صوتي عند وصول تعاميم أو تحديثات مهام أخرى' : 'Plays a sound for incoming general alerts'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={generalSound}
                    onClick={handleToggleGeneralSound}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      generalSound ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        generalSound ? '-translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Appearance & Preferences */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{lang === 'ar' ? 'المظهر والعرض' : 'Appearance'}</span>
                </h3>

                {onToggleDark && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {isDark ? <Moon className="w-4 h-4 text-indigo-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          {lang === 'ar' ? 'الوضع الليلي (Dark Mode)' : 'Dark Theme'}
                        </strong>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {isDark 
                            ? (lang === 'ar' ? 'المظهر الليلي الداكن مفعّل حالياً' : 'Dark mode is currently enabled')
                            : (lang === 'ar' ? 'المظهر الفاتح المضيء مفعّل حالياً' : 'Light mode is currently enabled')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDark}
                      onClick={onToggleDark}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isDark ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isDark ? '-translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Unified Server Connection */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{lang === 'ar' ? 'الاتصال التلقائي الموحد بالخادم' : 'Unified Backend Connection'}</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                    {lang === 'ar' ? 'تلقائي موحد ✓' : 'Automatic ✓'}
                  </span>
                </h3>

                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{lang === 'ar' ? 'الاتصال يعمل تلقائياً لكافة الإدارات والمستخدمين' : 'Connection active for all departments & users'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {lang === 'ar' 
                      ? 'يتم توجيه كافة طلبات الواجهة وقاعدة البيانات تلقائياً ومركزياً إلى الخادم المعتمد لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة دون الحاجة لأي إعدادات يدوية من قبل المستخدمين.' 
                      : 'All API and database requests are automatically routed centrally to the official Reyadat Al-Ataa server.'}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>نظام الحماية وتشفير كلمات المرور Bcrypt</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إغلاق' : 'Close'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
