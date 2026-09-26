import React, { useState } from 'react';
import { 
  X, Volume2, VolumeX, Bell, BellRing, Sparkles, Moon, Sun, 
  Check, Music, Sliders, Smartphone, Laptop, ShieldCheck, Server,
  CheckCircle2
} from 'lucide-react';
import { useApplicationAudio, GENERAL_AUDIO_STORAGE_KEY } from '../utils/audioNotification';

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

  // General notifications sound setting
  const [generalSound, setGeneralSound] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GENERAL_AUDIO_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  const [isPlayingTest, setIsPlayingTest] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-right dir-rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white flex items-center justify-between border-b border-emerald-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>{lang === 'ar' ? 'إعدادات وتفضيلات المستخدم' : 'User Settings & Preferences'}</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/30">
                  {currentUserRole === 'admin' ? 'الإدارة' : currentUserRole === 'leader' ? 'قائد فريق' : currentUserRole === 'volunteer' ? 'متطوع' : 'المستخدم'}
                </span>
              </h2>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                {lang === 'ar' ? 'تخصيص التنبيهات الصوتية والمظهر وتجربة الاستخدام' : 'Customize audio alerts, appearance, and experience'}
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* SECTION 1: Audio Notifications Feature (التنبيهات الصوتية) */}
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

                {/* The Requested Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAudioEnabled}
                  onClick={toggleAudio}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    isAudioEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  title={lang === 'ar' ? 'تبديل التنبيه الصوتي' : 'Toggle audio notification'}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isAudioEnabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Test Button & Details */}
              <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Music className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{lang === 'ar' ? 'نغمة ثلاثية هادئة (Chord D-F#-A)' : 'Gentle 3-tone chime (Chord D-F#-A)'}</span>
                </div>

                <button
                  type="button"
                  onClick={handleTestSound}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isPlayingTest
                      ? 'bg-emerald-600 text-white scale-95 shadow-sm'
                      : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                  }`}
                  title={lang === 'ar' ? 'تجربة وسماع النغمة' : 'Test sound'}
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

          {/* SECTION 2: Appearance & Preferences (المظهر) */}
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

          {/* SECTION 3: Unified Server Connection (الاتصال الموحد) */}
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

          {/* SECTION 4: Device & Storage Persistence Note */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'يتم حفظ تفضيلاتك محلياً على جهازك ويتم تطبيقها تلقائياً عند زيارة الموقع أو تقديم أي طلب.'
                : 'Your preferences are automatically stored and applied whenever you use the application.'}
            </span>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {lang === 'ar' ? 'جمعية ريادة العطاء - نظام الإشعارات الذكي' : 'Reyadat Al-Ataa - Smart Audio Notifications'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تم وحفظ الإعدادات' : 'Done & Saved'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
