import React, { useState } from 'react';
import {
  Link2,
  Copy,
  Check,
  UserPlus,
  HeartHandshake,
  LogIn,
  Share2,
  Mail,
  Users,
  Globe,
  Eye,
  EyeOff,
} from 'lucide-react';
import { VolunteerTeam } from '../types';
import { CANONICAL_ORIGIN } from '../utils/seo';

interface RegistrationLinksPanelProps {
  teams?: VolunteerTeam[];
  showOnHome?: boolean;
  onToggleShowOnHome?: (nextValue: boolean) => Promise<void> | void;
  readOnly?: boolean;
}

export const RegistrationLinksPanel: React.FC<RegistrationLinksPanelProps> = ({
  teams = [],
  showOnHome = false,
  onToggleShowOnHome,
  readOnly = false,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isToggling, setIsToggling] = useState(false);

  const activeTeams = (teams || []).filter(
    (t) => !t.status || t.status === 'active' || t.status === 'approved'
  );

  const volunteerUrl = selectedTeamId
    ? `${CANONICAL_ORIGIN}/register/volunteer?teamId=${encodeURIComponent(selectedTeamId)}`
    : `${CANONICAL_ORIGIN}/register/volunteer`;

  const links = [
    {
      id: 'login',
      title: 'تسجيل الدخول الموحد',
      subtitle: 'رابط بوابة الدخول للإداريين والمتطوعين وقادة الفرق والمستفيدين',
      url: `${CANONICAL_ORIGIN}/login`,
      icon: LogIn,
      accent: 'from-slate-800 to-navy-950',
      badge: 'بوابة الدخول',
      shareText: `بوابة تسجيل الدخول الرسمية لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة:\n${CANONICAL_ORIGIN}/login`,
    },
    {
      id: 'beneficiary',
      title: 'الانضمام كمستفيد',
      subtitle: 'رابط مباشر يفتح نموذج تقديم طلب الاستفادة والرعاية من الجمعية',
      url: `${CANONICAL_ORIGIN}/register/beneficiary`,
      icon: HeartHandshake,
      accent: 'from-emerald-600 to-teal-700',
      badge: 'نموذج المستفيدين',
      shareText: `رابط التسجيل والانضمام كمستفيد في جمعية ريادة العطاء لخدمة الإنسان بالعسيلة:\n${CANONICAL_ORIGIN}/register/beneficiary`,
    },
    {
      id: 'volunteer',
      title: 'الانضمام كمتطوع',
      subtitle: selectedTeamId
        ? 'رابط مباشر للتسجيل التطوعي مع تحديد الفريق المختار تلقائياً'
        : 'رابط مباشر يفتح نموذج تسجيل المتطوع الجديد واختيار الفريق التطوعي',
      url: volunteerUrl,
      icon: UserPlus,
      accent: 'from-royal-600 to-blue-700',
      badge: 'نموذج المتطوعين',
      shareText: `انضم إلينا كمتطوع في جمعية ريادة العطاء لخدمة الإنسان بالعسيلة عبر الرابط الرسمي:\n${volunteerUrl}`,
    },
  ];

  const handleCopy = async (id: string, url: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2800);
    } catch {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleToggleHome = async () => {
    if (!onToggleShowOnHome || isToggling) return;
    setIsToggling(true);
    try {
      await onToggleShowOnHome(!showOnHome);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-royal-600 to-navy-900 text-white flex items-center justify-center shrink-0 shadow-lg">
              <Link2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-navy-950 dark:text-white">
                روابط التسجيل والمشاركة
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                روابط رسمية مباشرة جاهزة للنسخ والمشاركة مع المستفيدين والمتطوعين عبر النطاق الرسمي{' '}
                <span className="font-bold text-royal-700 dark:text-royal-400" dir="ltr">
                  www.riadataleata.com
                </span>
              </p>
            </div>
          </div>

          {onToggleShowOnHome && !readOnly && (
            <button
              type="button"
              onClick={handleToggleHome}
              disabled={isToggling}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold border transition-all ${
                showOnHome
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {showOnHome ? <Eye size={16} /> : <EyeOff size={16} />}
              {showOnHome
                ? 'ظاهر في الصفحة الرئيسية'
                : 'إظهار الروابط السريعة في الرئيسية'}
            </button>
          )}
        </div>
      </div>

      {/* Team selector for custom volunteer team invitation link */}
      {activeTeams.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-bold text-navy-900 dark:text-slate-200">
            <Users size={18} className="text-royal-600" />
            <span>تخصيص رابط التسجيل لفريق تطوعي محدد (اختياري):</span>
          </div>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-bold text-navy-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-royal-500"
          >
            <option value="">رابط التطوع العام (جميع الفرق)</option>
            {activeTeams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nameAr || t.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {links.map((item) => {
          const Icon = item.icon;
          const isCopied = copiedId === item.id;
          const waHref = `https://wa.me/?text=${encodeURIComponent(item.shareText)}`;
          const mailHref = `mailto:?subject=${encodeURIComponent(item.title + ' - جمعية ريادة العطاء')}&body=${encodeURIComponent(item.shareText)}`;

          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between gap-4 hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${item.accent} text-white flex items-center justify-center shadow`}>
                    <Icon size={20} />
                  </div>
                  <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-navy-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-2">
                  <Globe size={15} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={item.url}
                    dir="ltr"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="w-full bg-transparent text-xs font-mono font-semibold text-navy-900 dark:text-slate-200 focus:outline-none select-all"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleCopy(item.id, item.url)}
                  className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all ${
                    isCopied
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-navy-950 dark:bg-royal-600 hover:bg-navy-900 dark:hover:bg-royal-500 text-white'
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check size={16} />
                      <span>تم نسخ الرابط</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                  >
                    <Share2 size={14} />
                    <span>مشاركة واتساب</span>
                  </a>
                  <a
                    href={mailHref}
                    className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Mail size={14} />
                    <span>مشاركة بريد</span>
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
