import React, { useState } from "react";
import { Award, Trophy, Medal, Star, Flame, Users, Sparkles, Clock, CheckCircle2, Shield } from "lucide-react";
import { Volunteer, VolunteerTeam, Department, AttendanceRecord } from "../types";

interface VolunteerLeaderboardProps {
  volunteers: Volunteer[];
  teams?: VolunteerTeam[];
  departments?: Department[];
  attendanceRecords?: AttendanceRecord[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const VolunteerLeaderboard: React.FC<VolunteerLeaderboardProps> = ({
  volunteers,
  teams = [],
  departments = [],
  attendanceRecords = [],
  title = "صدارة المتطوعين - لوحة الشرف والعطاء",
  subtitle = "تكريم المتطوعين الأكثر إنجازاً وعطاءً في جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
  compact = false
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'hours' | 'points'>('hours');

  // Calculate stats per volunteer
  const processedVolunteers = volunteers.map(v => {
    const vAttendance = attendanceRecords.filter(a => a.volunteerId === v.id && (a.status === 'full' || a.status === 'late'));
    const totalHours = v.volunteerHours || (vAttendance.length * 4) || (v.points * 2);
    const completedInits = v.completedInitiativesCount || vAttendance.length || Math.floor(v.points / 3);
    const team = teams.find(t => t.id === v.teamId);
    const dept = departments.find(d => d.id === v.departmentId);

    return {
      ...v,
      totalHours,
      completedInits,
      teamName: team ? team.nameAr : "فريق عام",
      deptName: dept ? dept.nameAr : "إدارة التطوع"
    };
  });

  // Sort based on period/metric
  const sortedVolunteers = [...processedVolunteers].sort((a, b) => {
    if (filterPeriod === 'hours') {
      return b.totalHours - a.totalHours;
    }
    return b.points - a.points;
  });

  const top3 = sortedVolunteers.slice(0, 3);
  const rest = sortedVolunteers.slice(3, 15);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      {!compact && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-emerald-700 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
          <div className="absolute left-0 bottom-0 top-0 w-1/2 bg-white/5 -skew-x-12 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border border-white/10">
                <Trophy className="w-4 h-4 text-amber-200" />
                <span>لوحة الشرف والتميز الميداني</span>
              </div>
              <h2 className="text-xl font-black">{title}</h2>
              <p className="text-xs text-amber-100 max-w-xl leading-relaxed">{subtitle}</p>
            </div>

            {/* Filter Pills */}
            <div className="flex bg-black/20 p-1 rounded-2xl backdrop-blur-md border border-white/10">
              <button
                onClick={() => setFilterPeriod('hours')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterPeriod === 'hours' ? 'bg-white text-amber-900 shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                حسب الساعات التطوعية
              </button>
              <button
                onClick={() => setFilterPeriod('points')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${filterPeriod === 'points' ? 'bg-white text-amber-900 shadow-sm' : 'text-white/80 hover:text-white'}`}
              >
                حسب نقاط التميز
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Podium for Top 3 Winners */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
          
          {/* 🥈 Rank #2 Silver */}
          {top3[1] && (
            <div className="bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-900 dark:to-slate-950 p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-md text-center space-y-3 relative order-2 md:order-1">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-400 text-white font-black text-xs px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Medal className="w-3.5 h-3.5 text-slate-100" />
                <span>المركز الثاني 🥈</span>
              </div>

              <div className="pt-2">
                <img
                  src={top3[1].photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                  alt={top3[1].name}
                  className="w-16 h-16 rounded-full object-cover mx-auto border-3 border-slate-300 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-100">{top3[1].name}</h3>
                <p className="text-[10px] text-neutral-500">{top3[1].teamName} • {top3[1].titleAr || "متطوع فاعل"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-center">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl">
                  <span className="text-[9px] text-neutral-400 block font-bold">الساعات</span>
                  <strong className="text-xs font-black text-slate-700 dark:text-slate-200 font-mono">{top3[1].totalHours} ساعة</strong>
                </div>
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl">
                  <span className="text-[9px] text-neutral-400 block font-bold">النقاط</span>
                  <strong className="text-xs font-black text-amber-600 font-mono">{top3[1].points} pt</strong>
                </div>
              </div>
            </div>
          )}

          {/* 🥇 Rank #1 Gold (Highest Podium) */}
          {top3[0] && (
            <div className="bg-gradient-to-b from-amber-50 via-amber-100/40 to-amber-50 dark:from-amber-950/60 dark:to-neutral-900 p-6 rounded-3xl border-3 border-amber-400 shadow-xl text-center space-y-3.5 relative order-1 md:order-2 transform md:-translate-y-2">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white font-black text-xs px-4 py-1 rounded-full shadow-md flex items-center gap-1.5 animate-pulse">
                <Trophy className="w-4 h-4 text-amber-200" />
                <span>فرس الرهان - المركز الأول 🥇</span>
              </div>

              <div className="pt-2">
                <div className="relative inline-block">
                  <img
                    src={top3[0].photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                    alt={top3[0].name}
                    className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-amber-400 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-xs p-1 rounded-full shadow-xs">
                    👑
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-amber-950 dark:text-amber-100">{top3[0].name}</h3>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300 font-bold">{top3[0].teamName} • {top3[0].titleAr || "قائد عطاء متميز"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200/60 dark:border-amber-800 text-center">
                <div className="bg-white/80 dark:bg-neutral-800 p-2.5 rounded-xl border border-amber-200/50">
                  <span className="text-[9.5px] text-amber-700 dark:text-amber-300 block font-bold">إجمالي الساعات</span>
                  <strong className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">{top3[0].totalHours} ساعة</strong>
                </div>
                <div className="bg-white/80 dark:bg-neutral-800 p-2.5 rounded-xl border border-amber-200/50">
                  <span className="text-[9.5px] text-amber-700 dark:text-amber-300 block font-bold">نقاط العضوية</span>
                  <strong className="text-sm font-black text-amber-600 font-mono">{top3[0].points} pt</strong>
                </div>
              </div>
            </div>
          )}

          {/* 🥉 Rank #3 Bronze */}
          {top3[2] && (
            <div className="bg-gradient-to-b from-amber-900/5 to-amber-900/10 dark:from-neutral-900 dark:to-neutral-950 p-5 rounded-2xl border-2 border-amber-700/40 shadow-md text-center space-y-3 relative order-3">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-700 text-white font-black text-xs px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Medal className="w-3.5 h-3.5 text-amber-200" />
                <span>المركز الثالث 🥉</span>
              </div>

              <div className="pt-2">
                <img
                  src={top3[2].photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                  alt={top3[2].name}
                  className="w-16 h-16 rounded-full object-cover mx-auto border-3 border-amber-700/50 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <h3 className="text-xs font-black text-neutral-800 dark:text-neutral-100">{top3[2].name}</h3>
                <p className="text-[10px] text-neutral-500">{top3[2].teamName} • {top3[2].titleAr || "متطوع نشط"}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-amber-200 dark:border-neutral-800 text-center">
                <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl">
                  <span className="text-[9px] text-neutral-400 block font-bold">الساعات</span>
                  <strong className="text-xs font-black text-neutral-700 dark:text-neutral-200 font-mono">{top3[2].totalHours} ساعة</strong>
                </div>
                <div className="bg-white dark:bg-neutral-800 p-2 rounded-xl">
                  <span className="text-[9px] text-neutral-400 block font-bold">النقاط</span>
                  <strong className="text-xs font-black text-amber-600 font-mono">{top3[2].points} pt</strong>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Rest of Ranked Volunteers Table / List */}
      {rest.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-150 dark:border-neutral-800 p-4 shadow-2xs space-y-3">
          <h3 className="text-xs font-black text-neutral-700 dark:text-neutral-200 flex items-center gap-1.5 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>نخبة المتطوعين والمتطوعات الأكثر فاعلية:</span>
          </h3>

          <div className="space-y-2">
            {rest.map((v, idx) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-emerald-50/50 transition-all border border-neutral-100 dark:border-neutral-700"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-mono font-bold text-xs rounded-full flex items-center justify-center shrink-0">
                    #{idx + 4}
                  </span>

                  <img
                    src={v.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop"}
                    alt={v.name}
                    className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                    referrerPolicy="no-referrer"
                  />

                  <div>
                    <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-100">{v.name}</h4>
                    <p className="text-[10px] text-neutral-500">{v.teamName} • {v.titleAr || "متطوع متميز"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-left">
                  <div>
                    <span className="text-[9.5px] text-neutral-400 block font-bold">الساعات</span>
                    <strong className="text-xs font-black text-emerald-700 dark:text-emerald-400 font-mono">{v.totalHours} س</strong>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-neutral-400 block font-bold">النقاط</span>
                    <strong className="text-xs font-black text-amber-600 font-mono">{v.points} pt</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
