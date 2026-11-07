import React from "react";
import { 
  X, 
  Users, 
  ShieldCheck, 
  Calendar, 
  Award, 
  Target, 
  Compass, 
  HeartHandshake, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Share2, 
  UserPlus,
  Flame,
  Activity
} from "lucide-react";
import { VolunteerTeam, Volunteer, Initiative } from "../types";

interface TeamDetailsModalProps {
  team: VolunteerTeam | null;
  isOpen: boolean;
  onClose: () => void;
  volunteers: Volunteer[];
  initiatives: Initiative[];
  onJoinTeam: (team: VolunteerTeam) => void;
  lang?: "ar" | "en";
}

export const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  team,
  isOpen,
  onClose,
  volunteers,
  initiatives,
  onJoinTeam,
  lang = "ar"
}) => {
  if (!isOpen || !team) return null;

  // Compute live metrics
  const activeMembers = volunteers.filter(
    (v) => v.teamId === team.id && v.status === "active"
  );
  const teamInitiatives = initiatives.filter((i) => i.teamId === team.id);
  const membersPointsSum = activeMembers.reduce((sum, v) => sum + (Number(v.points) || 0), 0);
  const basePoints = Number(team.points) || 0;
  const totalPoints = Math.max(basePoints, membersPointsSum);

  // Parse goals into array if comma or newline separated
  const goalsList: string[] = React.useMemo(() => {
    if (!team.goals) return [];
    if (Array.isArray(team.goals)) return team.goals;
    return team.goals
      .split(/[\n،,]+/)
      .map((g) => g.trim())
      .filter(Boolean);
  }, [team.goals]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      dir="rtl"
    >
      <div 
        className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-6 relative flex flex-col max-h-[90vh]"
      >
        {/* Modal Header with Team Colors */}
        <div 
          className="relative px-6 pt-6 pb-5 text-white"
          style={{ 
            background: team.color 
              ? `linear-gradient(135deg, ${team.color}ee, #0f172a)` 
              : "linear-gradient(135deg, #0284c7, #0f172a)" 
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 shadow-xl shrink-0 overflow-hidden border border-white/20">
              {team.logoUrl ? (
                <img 
                  src={team.logoUrl} 
                  alt={team.nameAr} 
                  className="w-full h-full object-contain rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div 
                  className="w-full h-full rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-inner"
                  style={{ backgroundColor: team.color || "#0284c7" }}
                >
                  <Users className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pr-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black mb-1.5 backdrop-blur-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>فريق تطوعي معتمد ومسجل</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black truncate">{team.nameAr}</h2>
              <p className="text-xs text-white/80 mt-0.5 font-medium flex items-center gap-2">
                <span>القائد: <strong className="font-bold text-white">{team.leaderName || "قائد معتمد"}</strong></span>
                {team.city && <span>• {team.city}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right">
          {/* Live Stats Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-700/60 text-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">المتطوعون النشطون</span>
              <strong className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {activeMembers.length || Number(team.membersCount) || 0}
              </strong>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-700/60 text-center">
              <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">مجموع النقاط</span>
              <strong className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono">
                {totalPoints}
              </strong>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-700/60 text-center">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">المبادرات المنفذة</span>
              <strong className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {teamInitiatives.length || Number(team.initiativesCount) || 0}
              </strong>
            </div>

            <div className="bg-slate-50 dark:bg-neutral-800/60 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-700/60 text-center">
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">سنة التأسيس</span>
              <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                {team.establishedDate ? team.establishedDate.split("-")[0] : "2026"}
              </strong>
            </div>
          </div>

          {/* 1. Team Vision */}
          {team.vision && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>رؤية الفريق</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                {team.vision}
              </p>
            </div>
          )}

          {/* 2. Team Mission */}
          {team.mission && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>رسالة الفريق</span>
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                {team.mission}
              </p>
            </div>
          )}

          {/* 3. Team Goals */}
          {goalsList.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span>أهداف الفريق</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {goalsList.map((goal, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-slate-50 dark:bg-neutral-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800 text-xs text-slate-700 dark:text-slate-300"
                  >
                    <span className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{goal}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Leader Card Profile Info */}
          <div className="bg-slate-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-700 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-base shrink-0 overflow-hidden shadow-md">
              {team.leaderPhoto ? (
                <img src={team.leaderPhoto} alt={team.leaderName} className="w-full h-full object-cover" />
              ) : (
                <span>{(team.leaderName || "ق").charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">قيادة الفريق المعتمدة</span>
              <h5 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {team.leaderName || "قائد الفريق"}
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                مسؤول الإشراف الميداني وتنسيق شؤون المتطوعين لفريق {team.nameAr}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer CTA */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-neutral-850 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onJoinTeam(team);
            }}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>انضم إلى هذا الفريق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
