import React, { useState, useMemo } from "react";
import { 
  Trophy, 
  Medal, 
  Award, 
  Users, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Shield, 
  User,
  Flame,
  Star,
  ChevronDown,
  Building2
} from "lucide-react";
import { Volunteer, VolunteerTeam, Department, AttendanceRecord, Initiative } from "../types";

interface VolunteerLeaderboardProps {
  volunteers: Volunteer[];
  teams?: VolunteerTeam[];
  departments?: Department[];
  attendanceRecords?: AttendanceRecord[];
  initiatives?: Initiative[];
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export const VolunteerLeaderboard: React.FC<VolunteerLeaderboardProps> = ({
  volunteers = [],
  teams = [],
  departments = [],
  attendanceRecords = [],
  initiatives = [],
  title = "لوحة الصدارة والتميز الميداني",
  subtitle = "تكريم المتطوعين والفرق الأكثر عطاءً وإنجازاً في جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
  compact = false
}) => {
  const [activeTab, setActiveTab] = useState<'volunteers' | 'teams'>('volunteers');
  const [metricFilter, setMetricFilter] = useState<'points' | 'hours'>('points');

  // 1. Process Volunteers with Strict Attendance-Based Points Engine
  const processedVolunteers = useMemo(() => {
    return volunteers.map((v) => {
      // Find all unique attendance records for this volunteer (deduplicate by initiativeId)
      const vRecords = attendanceRecords.filter((a) => a.volunteerId === v.id);
      const uniqueInitiativesSeen = new Set<string>();
      let attendanceCalculatedPoints = 0;
      let validAttendanceCount = 0;

      vRecords.forEach((rec) => {
        const initKey = rec.initiativeId || rec.id;
        if (!uniqueInitiativesSeen.has(initKey)) {
          uniqueInitiativesSeen.add(initKey);

          // Points policy:
          // حاضر (full / present): 3 points
          // متأخر (late): 2 points
          // بعذر (excused): 1 point
          // غائب / ملغى (absent / cancelled): 0 points
          if (rec.status === 'full' || (rec.status as any) === 'present') {
            attendanceCalculatedPoints += 3;
            validAttendanceCount += 1;
          } else if (rec.status === 'late') {
            attendanceCalculatedPoints += 2;
            validAttendanceCount += 1;
          } else if (rec.status === 'excused') {
            attendanceCalculatedPoints += 1;
          }
        }
      });

      // Maintain established base points if greater (or add calculated)
      const finalPoints = Math.max(Number(v.points) || 0, attendanceCalculatedPoints);
      const totalHours = Number(v.hours) || Number(v.volunteerHours) || (validAttendanceCount * 4) || (finalPoints * 2);
      const team = teams.find((t) => t.id === v.teamId);
      const dept = departments.find((d) => d.id === v.departmentId);

      return {
        ...v,
        effectivePoints: finalPoints,
        effectiveHours: totalHours,
        initiativesAttendedCount: uniqueInitiativesSeen.size || Number(v.initiativesCount) || Math.floor(finalPoints / 3),
        teamName: team ? team.nameAr : "مستقل",
        teamLogo: team?.logoUrl,
        deptName: dept ? dept.nameAr : "إدارة التطوع"
      };
    });
  }, [volunteers, attendanceRecords, teams, departments]);

  // Sort Volunteers
  const sortedVolunteers = useMemo(() => {
    return [...processedVolunteers].sort((a, b) => {
      if (metricFilter === 'hours') {
        return b.effectiveHours - a.effectiveHours;
      }
      return b.effectivePoints - a.effectivePoints;
    });
  }, [processedVolunteers, metricFilter]);

  const top3Volunteers = sortedVolunteers.slice(0, 3);
  const restVolunteers = sortedVolunteers.slice(3, 20);

  // 2. Process Teams
  const processedTeams = useMemo(() => {
    return teams.map((team) => {
      // Find members of this team
      const teamVolunteers = processedVolunteers.filter((v) => v.teamId === team.id);
      const memberCount = teamVolunteers.length;
      
      // Calculate team initiatives count
      const teamInitiatives = initiatives.filter((i) => i.teamId === team.id);
      const initsCount = teamInitiatives.length || Number(team.initiativesCount) || 5;

      // Sum points from members + team initiatives
      const membersPointsSum = teamVolunteers.reduce((sum, v) => sum + v.effectivePoints, 0);
      const baseTeamPoints = Number(team.points) || 0;
      const totalTeamPoints = Math.max(baseTeamPoints, membersPointsSum);

      return {
        ...team,
        memberCount,
        initiativesCount: initsCount,
        totalPoints: totalTeamPoints,
        leaderName: team.leaderName || "قائد الفريق"
      };
    });
  }, [teams, processedVolunteers, initiatives]);

  const sortedTeams = useMemo(() => {
    return [...processedTeams].sort((a, b) => b.totalPoints - a.totalPoints);
  }, [processedTeams]);

  const top3Teams = sortedTeams.slice(0, 3);
  const restTeams = sortedTeams.slice(3);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* 1. Header Banner */}
      {!compact && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-blue-900/40">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>لوحة الشرف والتنافس الميداني</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black">{title}</h2>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">{subtitle}</p>
            </div>

            {/* Navigation Tabs (صدارة المتطوعين / صدارة الفرق) */}
            <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('volunteers')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'volunteers'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>صدارة المتطوعين</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('teams')}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  activeTab === 'teams'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>صدارة الفرق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Metric Selector Bar (For Volunteers) */}
      {activeTab === 'volunteers' && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>نظام النقاط المعتمد: (حاضر: 3 نقاط • متأخر: نقطتان • بعذر: نقطة واحدة)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMetricFilter('points')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metricFilter === 'points'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              الترتيب بالنقاط
            </button>
            <button
              onClick={() => setMetricFilter('hours')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metricFilter === 'hours'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              الترتيب بالساعات
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION A: VOLUNTEERS LEADERBOARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'volunteers' && (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-4">
            
            {/* 🥈 Rank #2 Silver */}
            {top3Volunteers[1] && (
              <div className="order-2 md:order-1 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-3xl p-5 shadow-lg relative flex flex-col items-center text-center hover:scale-[1.02] transition-transform">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-black text-sm flex items-center justify-center border-2 border-slate-300 absolute -top-4 shadow-sm">
                  🥈 2
                </div>

                <div className="relative mt-2 mb-3">
                  <div className="w-20 h-20 rounded-full border-4 border-slate-300 dark:border-slate-700 overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {top3Volunteers[1].profileImage || top3Volunteers[1].photo ? (
                      <img
                        src={top3Volunteers[1].profileImage || top3Volunteers[1].photo}
                        alt={top3Volunteers[1].name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-slate-500">
                        {top3Volunteers[1].name.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{top3Volunteers[1].name}</h4>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold block mt-0.5">{top3Volunteers[1].teamName}</span>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 w-full flex justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">النقاط</span>
                    <strong className="font-mono text-slate-900 dark:text-white text-sm">{top3Volunteers[1].effectivePoints}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الساعات</span>
                    <strong className="font-mono text-slate-900 dark:text-white text-sm">{top3Volunteers[1].effectiveHours} س</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 🥇 Rank #1 Gold (Elevated Center) */}
            {top3Volunteers[0] && (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-amber-400 dark:border-amber-500 rounded-3xl p-6 shadow-xl relative flex flex-col items-center text-center -translate-y-2 hover:scale-[1.02] transition-transform">
                <div className="w-11 h-11 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-base flex items-center justify-center border-2 border-amber-300 absolute -top-5 shadow-md">
                  🥇 1
                </div>

                <div className="relative mt-2 mb-3">
                  <div className="w-24 h-24 rounded-full border-4 border-amber-400 shadow-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {top3Volunteers[0].profileImage || top3Volunteers[0].photo ? (
                      <img
                        src={top3Volunteers[0].profileImage || top3Volunteers[0].photo}
                        alt={top3Volunteers[0].name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-black text-amber-600">
                        {top3Volunteers[0].name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>

                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-0.5 rounded-full mb-1">
                  فارس الميدان المتصدر
                </span>
                <h4 className="font-black text-slate-900 dark:text-white text-base line-clamp-1">{top3Volunteers[0].name}</h4>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold block mt-0.5">{top3Volunteers[0].teamName}</span>

                <div className="mt-4 pt-3 border-t border-amber-100 dark:border-slate-800 w-full flex justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">مجموع النقاط</span>
                    <strong className="font-mono text-amber-600 dark:text-amber-400 text-base font-black">{top3Volunteers[0].effectivePoints}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الساعات المعتمدة</span>
                    <strong className="font-mono text-slate-900 dark:text-white text-base font-black">{top3Volunteers[0].effectiveHours} س</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 🥉 Rank #3 Bronze */}
            {top3Volunteers[2] && (
              <div className="order-3 md:order-3 bg-white dark:bg-slate-900 border-2 border-amber-700/40 dark:border-amber-700/60 rounded-3xl p-5 shadow-lg relative flex flex-col items-center text-center hover:scale-[1.02] transition-transform">
                <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 font-black text-sm flex items-center justify-center border-2 border-amber-700/40 absolute -top-4 shadow-sm">
                  🥉 3
                </div>

                <div className="relative mt-2 mb-3">
                  <div className="w-20 h-20 rounded-full border-4 border-amber-700/40 overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {top3Volunteers[2].profileImage || top3Volunteers[2].photo ? (
                      <img
                        src={top3Volunteers[2].profileImage || top3Volunteers[2].photo}
                        alt={top3Volunteers[2].name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-black text-slate-500">
                        {top3Volunteers[2].name.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{top3Volunteers[2].name}</h4>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold block mt-0.5">{top3Volunteers[2].teamName}</span>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 w-full flex justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">النقاط</span>
                    <strong className="font-mono text-slate-900 dark:text-white text-sm">{top3Volunteers[2].effectivePoints}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الساعات</span>
                    <strong className="font-mono text-slate-900 dark:text-white text-sm">{top3Volunteers[2].effectiveHours} س</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rest of the Ranks Table */}
          {restVolunteers.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white">بقية ترتيب المتطوعين في لوحة الشرف</h4>
                <span className="text-[11px] text-slate-400 font-mono">المراكز من 4 حتى {restVolunteers.length + 3}</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {restVolunteers.map((vol, index) => {
                  const rank = index + 4;
                  return (
                    <div key={vol.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {rank}
                        </span>

                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                          {vol.profileImage || vol.photo ? (
                            <img src={vol.profileImage || vol.photo} alt={vol.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                              {vol.name.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div>
                          <strong className="text-xs font-bold text-slate-900 dark:text-white block">{vol.name}</strong>
                          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">{vol.teamName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-xs">
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block">الساعات</span>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{vol.effectiveHours} س</span>
                        </div>
                        <div className="text-left min-w-16">
                          <span className="text-[10px] text-slate-400 block">النقاط</span>
                          <strong className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">{vol.effectivePoints}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SECTION B: TEAMS LEADERBOARD */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'teams' && (
        <div className="space-y-6">
          {/* Top 3 Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {top3Teams.map((team, idx) => {
              const medals = ['🥇 المركز الأول', '🥈 المركز الثاني', '🥉 المركز الثالث'];
              const borders = ['border-amber-400 dark:border-amber-500', 'border-slate-300 dark:border-slate-700', 'border-amber-700/50'];
              return (
                <div
                  key={team.id}
                  className={`bg-white dark:bg-slate-900 border-2 ${borders[idx]} rounded-3xl p-5 shadow-lg relative flex flex-col justify-between hover:scale-[1.01] transition-transform`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-50 dark:bg-slate-800 shrink-0">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.nameAr} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-black text-blue-600 text-lg">
                              {team.nameAr.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-amber-600 block">{medals[idx]}</span>
                          <h4 className="font-black text-slate-900 dark:text-white text-base">{team.nameAr}</h4>
                          <span className="text-xs text-slate-500">القائد: {team.leaderName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">مجموع النقاط</span>
                        <strong className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">{team.totalPoints}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">المبادرات</span>
                        <strong className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{team.initiativesCount}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">الأعضاء</span>
                        <strong className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">{team.memberCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rest of the Teams List */}
          {restTeams.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 dark:text-white">بقية الفرق التطوعية</h4>
                <span className="text-[11px] text-slate-400">ترتيب الفرق حسب مجموع النقاط والنشاط</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {restTeams.map((team, idx) => (
                  <div key={team.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 4}
                      </span>
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        {team.logoUrl ? (
                          <img src={team.logoUrl} alt={team.nameAr} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                            {team.nameAr.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-slate-900 dark:text-white block">{team.nameAr}</strong>
                        <span className="text-[11px] text-slate-500">القائد: {team.leaderName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 block">المبادرات</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{team.initiativesCount}</span>
                      </div>
                      <div className="text-left min-w-16">
                        <span className="text-[10px] text-slate-400 block">مجموع النقاط</span>
                        <strong className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">{team.totalPoints}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
