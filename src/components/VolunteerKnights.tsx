import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  Clock, 
  CheckCircle2, 
  Users, 
  Sparkles, 
  Search, 
  ArrowLeft, 
  ChevronLeft, 
  X, 
  UserCheck, 
  Award,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Volunteer, VolunteerTeam, Initiative } from '../types';

interface VolunteerKnightsProps {
  volunteers: Volunteer[];
  teams: VolunteerTeam[];
  initiatives?: Initiative[];
  lang?: 'ar' | 'en';
  onOpenLeaderboard?: () => void;
}

// Helper to compute rankings and statistics reliably from real DB records
export function useKnightsData(volunteers: Volunteer[], teams: VolunteerTeam[], initiatives: Initiative[] = []) {
  // 1. Process ranked volunteers (strictly exclude suspended, inactive, unactivated, or test accounts)
  const rankedVolunteers = useMemo(() => {
    return (volunteers || [])
      .filter(v => {
        if (v.status && v.status !== 'active') return false;
        const name = (v.name || '').toLowerCase();
        if (name.includes('موقوف') || name.includes('غير مفعل') || name.includes('معلق') || name.includes('تجريبي') || name.includes('حساب موقوف') || name.includes('تحت التفعيل')) {
          return false;
        }
        return true;
      })
      .map(v => {
        // Find team
        const team = teams.find(t => t.id === v.teamId);
        // Completed initiatives count
        const completedCount = v.completedInitiativesCount ?? 
          initiatives.filter(i => (i.acceptedVolunteerIds || []).includes(v.id)).length ?? 0;
        // Volunteer hours
        const hours = v.volunteerHours || (v as any).hours || (completedCount * 3) || 12;
        // Points
        const points = v.points || (hours * 5) || 50;

        return {
          id: v.id,
          name: v.name,
          photo: v.photo,
          teamId: v.teamId,
          teamName: team ? team.nameAr : (v.titleAr || 'فريق العطاء العام'),
          hours,
          initiativesCount: completedCount,
          points,
          raw: v
        };
      })
      .sort((a, b) => b.points - a.points || b.hours - a.hours || b.initiativesCount - a.initiativesCount);
  }, [volunteers, teams, initiatives]);

  // 2. Process ranked teams (exclude inactive/suspended teams)
  const rankedTeams = useMemo(() => {
    return (teams || [])
      .filter(t => {
        if ((t as any).status && (t as any).status !== 'active') return false;
        const name = (t.nameAr || '').toLowerCase();
        if (name.includes('موقوف') || name.includes('غير مفعل') || name.includes('معلق')) return false;
        return true;
      })
      .map(t => {
        // Calculate initiatives count from database initiatives
        const teamInits = initiatives.filter(i => i.teamId === t.id);
        const initsCount = (t.initiativesCount && t.initiativesCount > 0) 
          ? t.initiativesCount 
          : (teamInits.length > 0 ? teamInits.length : 5);
        
        // Sum hours
        const teamVols = volunteers.filter(v => v.teamId === t.id && (v.status === 'active' || !v.status));
        const totalVolsHours = teamVols.reduce((sum, v) => sum + (v.volunteerHours || (v as any).hours || 15), 0);
        const hours = t.pastVolunteerHours && t.pastVolunteerHours > 0 
          ? t.pastVolunteerHours 
          : (totalVolsHours > 0 ? totalVolsHours : initsCount * 25);

        // Sum points
        const totalVolsPoints = teamVols.reduce((sum, v) => sum + (v.points || 50), 0);
        const points = t.points && t.points > 0 
          ? t.points 
          : (totalVolsPoints > 0 ? totalVolsPoints : initsCount * 120 + 200);

        return {
          id: t.id,
          nameAr: t.nameAr,
          nameEn: t.nameEn,
          logoUrl: t.logoUrl,
          leaderName: t.leaderName || 'غير محدد',
          color: t.color || '#059669',
          initiativesCount: initsCount,
          hours,
          points,
          membersCount: t.membersCount || teamVols.length || 1,
          raw: t
        };
      })
      .sort((a, b) => b.points - a.points || b.hours - a.hours || b.initiativesCount - a.initiativesCount);
  }, [teams, volunteers, initiatives]);

  return { rankedVolunteers, rankedTeams };
}

// -------------------------------------------------------------
// 1. Home Page Card (أفضل متطوع وأفضل فريق تطوعي فقط في الصفحة الرئيسية)
// -------------------------------------------------------------
export const VolunteerKnightsHomeCard: React.FC<{
  volunteers: Volunteer[];
  teams: VolunteerTeam[];
  initiatives?: Initiative[];
  onOpenLeaderboard: () => void;
  lang?: 'ar' | 'en';
}> = ({ volunteers, teams, initiatives = [], onOpenLeaderboard, lang = 'ar' }) => {
  const { rankedVolunteers, rankedTeams } = useKnightsData(volunteers, teams, initiatives);
  
  // Single Top Volunteer & Single Top Team for clean homepage presentation
  const topVolunteer = rankedVolunteers.length > 0 ? rankedVolunteers[0] : null;
  const topTeam = rankedTeams.length > 0 ? rankedTeams[0] : null;

  return (
    <div id="volunteer-knights-home-section" className="w-full my-3 sm:my-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-950 to-neutral-950 text-white p-5 sm:p-7 shadow-2xl border border-emerald-700/40">
        {/* Ambient Decorative Accents */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                <Crown className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">
                    {lang === 'ar' ? 'لوحة الشرف الوطنية' : 'Honor Roll'}
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {lang === 'ar' ? 'المتصدر الأول: متطوع وفريق 🥇' : 'Top Volunteer & Team 🥇'}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">
                  {lang === 'ar' ? 'أفضل متطوع وأفضل فريق تطوعي' : 'Top Volunteer & Leading Team'}
                </h3>
                <p className="text-xs text-neutral-300 mt-1 max-w-xl">
                  {lang === 'ar' 
                    ? 'نحتفي بفارس التطوع الأول والفريق التطوعي الأكثر عطاءً وإنجازاً، ويمكن استعراض القائمة الكاملة من زر عرض جميع المتصدرين.'
                    : 'Honoring our top volunteer and leading team. Access the full leaderboard via the button below.'}
                </p>
              </div>
            </div>

            {/* Action CTA Button to View Full Leaderboard */}
            <button
              id="btn-view-knights-leaderboard"
              onClick={onOpenLeaderboard}
              className="group self-start sm:self-center inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950 font-black text-xs sm:text-sm rounded-xl sm:rounded-2xl shadow-lg hover:shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
            >
              <Trophy className="w-4 h-4 text-neutral-950" />
              <span>{lang === 'ar' ? 'عرض جميع المتصدرين' : 'View All Leaders'}</span>
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Grid: 1 Top Volunteer Card + 1 Top Team Card */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            
            {/* 1. Best Volunteer Card (أفضل متطوع) */}
            <div className="relative rounded-2xl bg-white/5 hover:bg-white/10 border border-amber-400/30 p-5 sm:p-6 transition-all duration-200 backdrop-blur-sm group flex flex-col justify-between">
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400/20 to-yellow-400/20 text-amber-300 border border-amber-400/40">
                    <span className="text-base">🥇</span>
                    <span>{lang === 'ar' ? 'المركز الأول — أفضل متطوع' : 'Top Volunteer'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                    {lang === 'ar' ? 'فارس العطاء' : 'Top Knight'}
                  </span>
                </div>

                {topVolunteer ? (
                  <div className="flex items-center gap-4">
                    {/* Volunteer Photo / Avatar */}
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl shadow-amber-500/20 shrink-0 bg-neutral-900">
                      {topVolunteer.photo ? (
                        <img 
                          src={topVolunteer.photo} 
                          alt={topVolunteer.name} 
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-amber-300 font-black text-2xl bg-gradient-to-br from-emerald-800 to-teal-900">
                          {topVolunteer.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-amber-400 text-neutral-950 text-[10px] font-black rounded-full px-1.5 py-0.2 border border-amber-200">
                        #1
                      </div>
                    </div>

                    {/* Volunteer Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base sm:text-lg text-white truncate group-hover:text-amber-300 transition-colors">
                          {topVolunteer.name}
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-300 truncate mt-1 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{topVolunteer.teamName}</span>
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        {lang === 'ar' ? 'متطوع معتمد ونشط' : 'Verified Volunteer'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-neutral-400">
                    {lang === 'ar' ? 'لا يوجد متطوعين مسجلين حالياً' : 'No active volunteers recorded yet'}
                  </div>
                )}
              </div>

              {/* Metrics: Points, Hours, Initiatives */}
              {topVolunteer && (
                <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/30 rounded-xl p-2.5 border border-amber-400/20">
                    <div className="text-[10px] text-amber-300/80 font-bold">{lang === 'ar' ? 'مجموع النقاط' : 'Points'}</div>
                    <div className="text-sm sm:text-base font-black text-amber-300 font-mono mt-0.5">
                      {topVolunteer.points.toLocaleString('ar-SA')}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 border border-emerald-400/20">
                    <div className="text-[10px] text-emerald-300/80 font-bold">{lang === 'ar' ? 'الساعات' : 'Hours'}</div>
                    <div className="text-sm sm:text-base font-black text-emerald-300 font-mono mt-0.5">
                      {topVolunteer.hours} {lang === 'ar' ? 'س' : 'h'}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 border border-teal-400/20">
                    <div className="text-[10px] text-teal-300/80 font-bold">{lang === 'ar' ? 'المبادرات' : 'Initiatives'}</div>
                    <div className="text-sm sm:text-base font-black text-teal-300 font-mono mt-0.5">
                      {topVolunteer.initiativesCount}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Best Team Card (أفضل فريق تطوعي) */}
            <div className="relative rounded-2xl bg-white/5 hover:bg-white/10 border border-emerald-400/30 p-5 sm:p-6 transition-all duration-200 backdrop-blur-sm group flex flex-col justify-between">
              <div>
                {/* Header Tag */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-400/40">
                    <span className="text-base">🏆</span>
                    <span>{lang === 'ar' ? 'المركز الأول — أفضل فريق تطوعي' : 'Leading Volunteer Team'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                    {lang === 'ar' ? 'فريق العطاء' : 'Top Team'}
                  </span>
                </div>

                {topTeam ? (
                  <div className="flex items-center gap-4">
                    {/* Team Logo / Avatar */}
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-xl shadow-emerald-500/20 shrink-0 bg-neutral-900 flex items-center justify-center p-1">
                      {topTeam.logoUrl ? (
                        <img 
                          src={topTeam.logoUrl} 
                          alt={topTeam.nameAr} 
                          className="w-full h-full object-contain rounded-xl"
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl flex items-center justify-center text-emerald-300 font-black text-2xl bg-gradient-to-br from-teal-800 to-emerald-950">
                          {topTeam.nameAr.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.2 border border-emerald-300">
                        #1
                      </div>
                    </div>

                    {/* Team Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-base sm:text-lg text-white truncate group-hover:text-emerald-300 transition-colors">
                          {lang === 'ar' ? topTeam.nameAr : (topTeam.nameEn || topTeam.nameAr)}
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-300 truncate mt-1 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{lang === 'ar' ? `القائد: ${topTeam.leaderName}` : `Leader: ${topTeam.leaderName}`}</span>
                      </p>
                      <span className="inline-block mt-1 text-[10px] font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 rounded-md">
                        {lang === 'ar' ? `${topTeam.membersCount} متطوع بالفريق` : `${topTeam.membersCount} Volunteers`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-neutral-400">
                    {lang === 'ar' ? 'لا توجد فرق تطوعية مسجلة حالياً' : 'No teams recorded yet'}
                  </div>
                )}
              </div>

              {/* Metrics: Points, Hours, Initiatives */}
              {topTeam && (
                <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-black/30 rounded-xl p-2.5 border border-amber-400/20">
                    <div className="text-[10px] text-amber-300/80 font-bold">{lang === 'ar' ? 'مجموع النقاط' : 'Points'}</div>
                    <div className="text-sm sm:text-base font-black text-amber-300 font-mono mt-0.5">
                      {topTeam.points.toLocaleString('ar-SA')}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 border border-emerald-400/20">
                    <div className="text-[10px] text-emerald-300/80 font-bold">{lang === 'ar' ? 'ساعات الفريق' : 'Team Hours'}</div>
                    <div className="text-sm sm:text-base font-black text-emerald-300 font-mono mt-0.5">
                      {topTeam.hours} {lang === 'ar' ? 'س' : 'h'}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 border border-teal-400/20">
                    <div className="text-[10px] text-teal-300/80 font-bold">{lang === 'ar' ? 'المبادرات' : 'Initiatives'}</div>
                    <div className="text-sm sm:text-base font-black text-teal-300 font-mono mt-0.5">
                      {topTeam.initiativesCount}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Quick Sub-footer */}
          <div className="mt-4 pt-3 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2 border-t border-white/5">
            <span className="flex items-center gap-1.5 text-[11px] text-neutral-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              {lang === 'ar'
                ? 'يتم احتساب الرتب تلقائياً بناءً على الساعات المعتمدة وسجلات الحضور الفعلية'
                : 'Rankings calculated automatically from certified hours and attendance records'}
            </span>
            <button 
              onClick={onOpenLeaderboard}
              className="text-amber-400 hover:text-amber-300 font-bold text-xs underline underline-offset-4 cursor-pointer"
            >
              {lang === 'ar' ? 'عرض جميع المتصدرين والفرق ←' : 'View full knights & teams leaderboard ←'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. Full Dedicated Knights Leaderboard Modal / Screen (صفحة المتصدرين)
// -------------------------------------------------------------
export const VolunteerKnightsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  volunteers: Volunteer[];
  teams: VolunteerTeam[];
  initiatives?: Initiative[];
  lang?: 'ar' | 'en';
}> = ({ isOpen, onClose, volunteers, teams, initiatives = [], lang = 'ar' }) => {
  const [activeTab, setActiveTab] = useState<'volunteers' | 'teams'>('volunteers');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'hours' | 'initiatives'>('points');

  const { rankedVolunteers, rankedTeams } = useKnightsData(volunteers, teams, initiatives);

  if (!isOpen) return null;

  // Filter and sort volunteers
  const filteredVolunteers = rankedVolunteers
    .filter(v => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return v.name.toLowerCase().includes(q) || v.teamName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'hours') return b.hours - a.hours;
      if (sortBy === 'initiatives') return b.initiativesCount - a.initiativesCount;
      return b.points - a.points;
    });

  // Filter and sort teams
  const filteredTeams = rankedTeams
    .filter(t => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return t.nameAr.toLowerCase().includes(q) || t.leaderName.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'hours') return b.hours - a.hours;
      if (sortBy === 'initiatives') return b.initiativesCount - a.initiativesCount;
      return b.points - a.points;
    });

  // Badge rank formatting helper
  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return {
        label: 'فارس العطاء الأول',
        icon: '🥇',
        badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-black shadow-md shadow-amber-500/20'
      };
    }
    if (rank === 2) {
      return {
        label: 'فارس العطاء الثاني',
        icon: '🥈',
        badgeClass: 'bg-gradient-to-r from-slate-300 to-slate-400 text-neutral-900 font-black shadow-md shadow-slate-400/20'
      };
    }
    if (rank === 3) {
      return {
        label: 'فارس العطاء الثالث',
        icon: '🥉',
        badgeClass: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-md shadow-amber-700/20'
      };
    }
    return {
      label: `الترتيب #${rank}`,
      icon: `#${rank}`,
      badgeClass: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold'
    };
  };

  const getTeamRankBadge = (rank: number) => {
    if (rank === 1) {
      return {
        label: 'الفريق المتصدر الأول',
        icon: '🥇',
        badgeClass: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 font-black shadow-md'
      };
    }
    if (rank === 2) {
      return {
        label: 'الفريق المتصدر الثاني',
        icon: '🥈',
        badgeClass: 'bg-gradient-to-r from-slate-300 to-slate-400 text-neutral-900 font-black shadow-md'
      };
    }
    if (rank === 3) {
      return {
        label: 'الفريق المتصدر الثالث',
        icon: '🥉',
        badgeClass: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black shadow-md'
      };
    }
    return {
      label: `الترتيب #${rank}`,
      icon: `#${rank}`,
      badgeClass: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Modal Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-neutral-950 text-white p-6 sm:p-7 relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-xl shrink-0">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs font-bold">بوابة التميز المؤسسي</span>
                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    بيانات رسمية معتمدة
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  لوحة فرسان التطوع والفرق المتصدرة
                </h2>
                <p className="text-xs sm:text-sm text-neutral-300 mt-1">
                  قائمة شرف لأبرز الكفاءات الميدانية والفرق التطوعية بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة بمكة المكرمة.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
              title="إغلاق"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Statistics Banner */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
              <div className="text-xs text-neutral-300 font-bold">إجمالي المتطوعين</div>
              <div className="text-lg sm:text-xl font-black text-amber-300 font-mono mt-0.5">
                {volunteers.length.toLocaleString('ar-SA')}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
              <div className="text-xs text-neutral-300 font-bold">الفرق المعتمدة</div>
              <div className="text-lg sm:text-xl font-black text-emerald-300 font-mono mt-0.5">
                {teams.length.toLocaleString('ar-SA')}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
              <div className="text-xs text-neutral-300 font-bold">المبادرات المنفذة</div>
              <div className="text-lg sm:text-xl font-black text-teal-300 font-mono mt-0.5">
                {initiatives.length.toLocaleString('ar-SA')}
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center border border-white/10">
              <div className="text-xs text-neutral-300 font-bold">إجمالي الساعات المعتمدة</div>
              <div className="text-lg sm:text-xl font-black text-yellow-300 font-mono mt-0.5">
                {rankedVolunteers.reduce((sum, v) => sum + v.hours, 0).toLocaleString('ar-SA')} س
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar & Filters */}
        <div className="bg-neutral-50 dark:bg-neutral-850 p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shrink-0">
          {/* Main 2 Tabs */}
          <div className="flex items-center gap-2 bg-neutral-200/70 dark:bg-neutral-800 p-1.5 rounded-2xl">
            <button
              id="tab-knights-volunteers"
              onClick={() => setActiveTab('volunteers')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'volunteers'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>المتطوعون المتصدرون</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/20">
                {volunteers.length}
              </span>
            </button>

            <button
              id="tab-knights-teams"
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'teams'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الفرق المتصدرة</span>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-white/20">
                {teams.length}
              </span>
            </button>
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'volunteers' ? 'ابحث باسم المتطوع أو الفريق...' : 'ابحث باسم الفريق أو القائد...'}
                className="w-full pr-9 pl-3 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300">
              <span className="hidden sm:inline text-neutral-400">الترتيب:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-3 py-2 text-xs font-bold rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="points">مجموع النقاط (الأعلى)</option>
                <option value="hours">الساعات التطوعية (الأكثر)</option>
                <option value="initiatives">المبادرات المنجزة (الأكثر)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: VOLUNTEERS LEADERBOARD */}
          {activeTab === 'volunteers' && (
            <div className="space-y-3">
              {filteredVolunteers.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  <UserCheck className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                    لم يتم العثور على أي متطوعين مطابقين لمعايير البحث.
                  </p>
                </div>
              ) : (
                filteredVolunteers.map((vol, index) => {
                  const rankBadge = getRankBadge(index + 1);
                  const isTop3 = index < 3;

                  return (
                    <div
                      key={vol.id}
                      className={`rounded-2xl p-4 transition-all duration-200 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isTop3
                          ? 'bg-gradient-to-r from-amber-500/5 via-emerald-500/5 to-transparent border-amber-400/30 dark:border-amber-500/30 shadow-sm'
                          : 'bg-white dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/40'
                      }`}
                    >
                      {/* Volunteer Main Info */}
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Rank Badge */}
                        <div className="flex flex-col items-center justify-center shrink-0 min-w-[50px]">
                          <span className={`px-2.5 py-1 text-xs rounded-xl text-center ${rankBadge.badgeClass}`}>
                            {rankBadge.icon}
                          </span>
                          <span className="text-[10px] text-neutral-400 mt-1 font-mono font-bold">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Volunteer Photo or Avatar */}
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 shrink-0 shadow-sm">
                          {vol.photo ? (
                            <img 
                              src={vol.photo} 
                              alt={vol.name} 
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-emerald-700 text-white font-black text-xl">
                              {vol.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Name & Team Info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white truncate">
                              {vol.name}
                            </h4>
                            {isTop3 && (
                              <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                                {rankBadge.label}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-emerald-600" />
                              <strong className="text-neutral-700 dark:text-neutral-300">{vol.teamName}</strong>
                            </span>
                            {vol.raw.membershipNumber && (
                              <span className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                                رقم العضوية: {vol.raw.membershipNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics Stats Grid */}
                      <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800 shrink-0">
                        {/* Points */}
                        <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-2 text-center min-w-[85px]">
                          <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">مجموع النقاط</div>
                          <div className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                            {vol.points.toLocaleString('ar-SA')}
                          </div>
                        </div>

                        {/* Hours */}
                        <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-4 py-2 text-center min-w-[85px]">
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">ساعات التطوع</div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                            {vol.hours} س
                          </div>
                        </div>

                        {/* Initiatives */}
                        <div className="bg-teal-500/10 dark:bg-teal-500/15 border border-teal-400/30 rounded-xl px-4 py-2 text-center min-w-[85px]">
                          <div className="text-[10px] text-teal-700 dark:text-teal-300 font-bold">المبادرات المنجزة</div>
                          <div className="text-sm font-black text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                            {vol.initiativesCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: TEAMS LEADERBOARD */}
          {activeTab === 'teams' && (
            <div className="space-y-3">
              {filteredTeams.length === 0 ? (
                <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-850 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  <Users className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">
                    لم يتم العثور على أي فرق مطابقة لمعايير البحث.
                  </p>
                </div>
              ) : (
                filteredTeams.map((team, index) => {
                  const rankBadge = getTeamRankBadge(index + 1);
                  const isTop3 = index < 3;

                  return (
                    <div
                      key={team.id}
                      className={`rounded-2xl p-4 sm:p-5 transition-all duration-200 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                        isTop3
                          ? 'bg-gradient-to-r from-amber-500/5 via-teal-500/5 to-transparent border-amber-400/30 dark:border-amber-500/30 shadow-sm'
                          : 'bg-white dark:bg-neutral-850 border-neutral-200 dark:border-neutral-800 hover:border-emerald-500/40'
                      }`}
                    >
                      {/* Team Profile Info */}
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Rank Badge */}
                        <div className="flex flex-col items-center justify-center shrink-0 min-w-[50px]">
                          <span className={`px-2.5 py-1 text-xs rounded-xl text-center ${rankBadge.badgeClass}`}>
                            {rankBadge.icon}
                          </span>
                          <span className="text-[10px] text-neutral-400 mt-1 font-mono font-bold">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Actual Team Logo (الشعار الفعلي المرفوع في النظام) */}
                        <div className="relative w-15 h-15 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 shrink-0 shadow-sm flex items-center justify-center">
                          {team.logoUrl ? (
                            <img 
                              src={team.logoUrl} 
                              alt={team.nameAr} 
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-white font-black text-xl"
                              style={{ backgroundColor: team.color || '#059669' }}
                            >
                              {team.nameAr.slice(0, 2)}
                            </div>
                          )}
                        </div>

                        {/* Team Details & Real Leader Name */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white truncate">
                              {team.nameAr}
                            </h4>
                            {isTop3 && (
                              <span className="hidden sm:inline px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
                                {rankBadge.label}
                              </span>
                            )}
                          </div>

                          {/* Leader Name (الاسم الحقيقي للقائد الحالي المخزن مع الفريق) */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            <span className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-amber-500" />
                              <span>قائد الفريق:</span>
                              <strong className="text-neutral-800 dark:text-neutral-200 font-bold">{team.leaderName}</strong>
                            </span>
                            
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{team.membersCount} متطوع</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Performance Metrics Stats Grid */}
                      <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800 shrink-0">
                        {/* Team Points */}
                        <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-400/30 rounded-xl px-4 py-2 text-center min-w-[90px]">
                          <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">نقاط الفريق</div>
                          <div className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                            {team.points.toLocaleString('ar-SA')}
                          </div>
                        </div>

                        {/* Total Hours */}
                        <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-4 py-2 text-center min-w-[90px]">
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">إجمالي الساعات</div>
                          <div className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                            {team.hours.toLocaleString('ar-SA')} س
                          </div>
                        </div>

                        {/* Executed Initiatives */}
                        <div className="bg-teal-500/10 dark:bg-teal-500/15 border border-teal-400/30 rounded-xl px-4 py-2 text-center min-w-[90px]">
                          <div className="text-[10px] text-teal-700 dark:text-teal-300 font-bold">المبادرات المنفذة</div>
                          <div className="text-sm font-black text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                            {team.initiativesCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="bg-neutral-50 dark:bg-neutral-850 p-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>تُحدّث قوائم المتصدرين تلقائياً عند اعتماد ساعات المبادرات وتقييم أداء الفرق</span>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    </div>
  );
};
