import React, { useState } from 'react';
import { 
  Users, Building2, MapPin, Calendar, Award, Sparkles, 
  ExternalLink, Share2, Check, X, ShieldCheck, HeartHandshake, 
  Phone, Mail, Globe, MessageSquare, BookOpen, Clock, Heart
} from 'lucide-react';
import { VolunteerTeam } from '../types';

interface TeamPublicProfileModalProps {
  team: VolunteerTeam | null;
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const TeamPublicProfileModal: React.FC<TeamPublicProfileModalProps> = ({
  team,
  isOpen,
  onClose,
  lang = 'ar'
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !team) return null;

  const teamColor = team.color || '#059669';

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#team-${team.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const servicesList = Array.isArray(team.services) 
    ? team.services 
    : (typeof team.services === 'string' ? team.services.split(',').map(s => s.trim()) : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Banner with Team Color */}
        <div 
          className="relative h-36 sm:h-44 w-full p-6 flex items-start justify-between"
          style={{
            background: `linear-gradient(135deg, ${teamColor} 0%, #1e293b 100%)`
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
          
          <div className="relative z-10 flex items-center gap-2">
            <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>فريق تطوعي معتمد</span>
            </span>
            {team.city && (
              <span className="bg-black/30 backdrop-blur-md text-white/90 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{team.city}</span>
              </span>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold px-3"
              title="مشاركة رابط ملف الفريق"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Share2 className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'تم نسخ الرابط' : 'مشاركة'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Team Profile Header Avatar & Key Stats */}
        <div className="relative px-6 pb-6 pt-0 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div 
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white dark:bg-neutral-800 border-4 border-white dark:border-neutral-900 shadow-xl overflow-hidden flex items-center justify-center p-1.5 shrink-0"
              >
                {team.logoUrl ? (
                  <img 
                    src={team.logoUrl} 
                    alt={team.nameAr} 
                    className="w-full h-full object-cover rounded-2xl"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div 
                    className="w-full h-full rounded-2xl flex items-center justify-center text-white text-2xl font-black"
                    style={{ backgroundColor: teamColor }}
                  >
                    {team.nameAr.charAt(0)}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-neutral-100">{team.nameAr}</h2>
                {team.nameEn && (
                  <span className="text-xs font-mono text-neutral-500 block mt-0.5">{team.nameEn}</span>
                )}
                <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 flex items-center gap-2">
                  <span>قائد الفريق: <strong className="text-emerald-700 dark:text-emerald-400">{team.leaderName}</strong></span>
                  {team.establishedDate && (
                    <span>• التأسيس: {team.establishedDate}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Team Status Badge */}
            <div className="self-end sm:self-auto">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                team.status === 'suspended'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {team.status === 'suspended' ? 'موقوف مؤقتاً' : 'نشط ومعتمد'}
              </span>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-center">
              <span className="text-[10.5px] text-neutral-500 block font-medium">أعضاء الفريق</span>
              <strong className="text-base font-black text-neutral-900 dark:text-neutral-100">{team.membersCount || 10}+</strong>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-center">
              <span className="text-[10.5px] text-neutral-500 block font-medium">المبادرات المنفذة</span>
              <strong className="text-base font-black text-neutral-900 dark:text-neutral-100">{team.initiativesCount || team.pastInitiativesCount || 0}</strong>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-center">
              <span className="text-[10.5px] text-neutral-500 block font-medium">المستفيدين</span>
              <strong className="text-base font-black text-neutral-900 dark:text-neutral-100">{team.pastBeneficiariesCount || 500}+</strong>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-3 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-center">
              <span className="text-[10.5px] text-neutral-500 block font-medium">الساعات التطوعية</span>
              <strong className="text-base font-black text-neutral-900 dark:text-neutral-100">{team.pastVolunteerHours || 120} س</strong>
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-neutral-800 dark:text-neutral-200 text-xs">
          
          {/* Description */}
          {team.descriptionAr && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100">عن الفريق</h3>
              <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                {team.descriptionAr}
              </p>
            </div>
          )}

          {/* Strategic Pillar (Vision, Mission, Goals) */}
          {(team.vision || team.mission || team.goals) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {team.vision && (
                <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 space-y-1.5">
                  <span className="text-xs font-black text-emerald-900 dark:text-emerald-300 block">رؤية الفريق</span>
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{team.vision}</p>
                </div>
              )}
              {team.mission && (
                <div className="bg-blue-50/60 dark:bg-blue-950/30 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-1.5">
                  <span className="text-xs font-black text-blue-900 dark:text-blue-300 block">رسالة الفريق</span>
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{team.mission}</p>
                </div>
              )}
              {team.goals && (
                <div className="bg-amber-50/60 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/50 space-y-1.5">
                  <span className="text-xs font-black text-amber-900 dark:text-amber-300 block">أهداف الفريق</span>
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">{team.goals}</p>
                </div>
              )}
            </div>
          )}

          {/* Meaningful Idea Section */}
          {team.meaningfulIdea && (
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 rounded-2xl border border-amber-300/60 dark:border-amber-700/50 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-black text-amber-950 dark:text-amber-200">فكرة هادفة للمجتمع</h3>
              </div>
              <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                {team.meaningfulIdea}
              </p>
            </div>
          )}

          {/* Services & Volunteer Domains */}
          {servicesList.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100">مجالات وخدمات الفريق</h3>
              <div className="flex flex-wrap gap-2">
                {servicesList.map((service, idx) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium text-xs border border-neutral-200 dark:border-neutral-700"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Past Experience & Partners */}
          {(team.pastPartnerEntities || team.majorPastInitiatives || team.achievementsAndExperience || team.awardsAndHonors) && (
            <div className="space-y-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-600" />
                <span>الخبرات والشركاء والجوائز</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {team.pastPartnerEntities && (
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[11px] font-bold text-neutral-500 block mb-1">الجهات الشريكة السابقة:</span>
                    <p className="text-neutral-800 dark:text-neutral-200 font-medium">{team.pastPartnerEntities}</p>
                  </div>
                )}
                {team.majorPastInitiatives && (
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                    <span className="text-[11px] font-bold text-neutral-500 block mb-1">أبرز المبادرات المنفذة:</span>
                    <p className="text-neutral-800 dark:text-neutral-200 font-medium">{team.majorPastInitiatives}</p>
                  </div>
                )}
                {team.awardsAndHonors && (
                  <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 sm:col-span-2">
                    <span className="text-[11px] font-bold text-neutral-500 block mb-1">الجوائز والتكريمات:</span>
                    <p className="text-neutral-800 dark:text-neutral-200 font-medium">{team.awardsAndHonors}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Social Links */}
          {team.socialLinks && Object.values(team.socialLinks).some(v => Boolean(v)) && (
            <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100">قنوات التواصل والحسابات الرسمية</h3>
              <div className="flex flex-wrap gap-2.5">
                {team.socialLinks.x && (
                  <a href={team.socialLinks.x} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 font-bold flex items-center gap-1.5 transition-all">
                    <span>منصة X</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {team.socialLinks.instagram && (
                  <a href={team.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 font-bold flex items-center gap-1.5 transition-all">
                    <span>انستغرام</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {team.socialLinks.website && (
                  <a href={team.socialLinks.website} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold flex items-center gap-1.5 transition-all">
                    <Globe className="w-3.5 h-3.5" />
                    <span>الموقع الإلكتروني</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {team.socialLinks.whatsapp && (
                  <a href={team.socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>واتساب الفريق</span>
                  </a>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-xs">
          <span className="text-neutral-500 font-medium">معتمد لدى جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 text-neutral-800 dark:text-neutral-200 font-bold rounded-xl transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
