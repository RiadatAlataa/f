import React, { useRef, useState, useEffect } from "react";
import { 
  Users, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  ArrowLeft, 
  ShieldCheck, 
  Award, 
  Target, 
  Compass, 
  Eye,
  UserCheck
} from "lucide-react";
import { VolunteerTeam, Volunteer, Initiative } from "../types";

interface VolunteerTeamsCarouselProps {
  teams: VolunteerTeam[];
  volunteers: Volunteer[];
  initiatives: Initiative[];
  lang?: "ar" | "en";
  isDark?: boolean;
  onSelectTeam: (team: VolunteerTeam) => void;
  onJoinTeamClick: (team: VolunteerTeam) => void;
  onOpenTeamRegistrationModal: () => void;
}

export const VolunteerTeamsCarousel: React.FC<VolunteerTeamsCarouselProps> = ({
  teams,
  volunteers,
  initiatives,
  lang = "ar",
  isDark = false,
  onSelectTeam,
  onJoinTeamClick,
  onOpenTeamRegistrationModal
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Filter approved/active and published teams only
  const publishedTeams = React.useMemo(() => {
    return teams
      .filter((t) => {
        // Exclude pending, rejected or suspended teams
        const isActive = !t.status || t.status === "active" || t.status === "approved";
        // Exclude teams where showOnHomepage is explicitly false
        const isShown = t.showOnHomepage !== false;
        return isActive && isShown;
      })
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
  }, [teams]);

  // Compute live team statistics
  const teamStatsMap = React.useMemo(() => {
    const map = new Map<string, { membersCount: number; points: number; initiativesCount: number }>();
    publishedTeams.forEach((team) => {
      const activeMembers = volunteers.filter(
        (v) => v.teamId === team.id && v.status === "active"
      );
      const teamInits = initiatives.filter((i) => i.teamId === team.id);
      const membersPointsSum = activeMembers.reduce((sum, v) => sum + (Number(v.points) || 0), 0);
      const basePoints = Number(team.points) || 0;
      const totalPoints = Math.max(basePoints, membersPointsSum);

      map.set(team.id, {
        membersCount: activeMembers.length || Number(team.membersCount) || 0,
        points: totalPoints,
        initiativesCount: teamInits.length || Number(team.initiativesCount) || 0
      });
    });
    return map;
  }, [publishedTeams, volunteers, initiatives]);

  // Check scroll positions
  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    // Note: RTL vs LTR scrollLeft behavior varies in browsers. We check absolute offset.
    const maxScroll = scrollWidth - clientWidth;
    const absScroll = Math.abs(scrollLeft);
    setCanScrollLeft(absScroll < maxScroll - 5);
    setCanScrollRight(absScroll > 5);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [publishedTeams]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const cardWidth = 340;
    // In RTL, scrolling right goes backwards (positive scrollLeft in some standards)
    const multiplier = lang === "ar" ? -1 : 1;
    const delta = direction === "left" ? cardWidth * multiplier : -cardWidth * multiplier;
    scrollContainerRef.current.scrollBy({ left: delta, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  if (publishedTeams.length === 0) {
    return null;
  }

  return (
    <section 
      id="volunteer-teams"
      className="py-14 sm:py-20 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-neutral-900 dark:via-neutral-850 dark:to-neutral-900 border-t border-b border-slate-200/80 dark:border-neutral-800"
      dir="rtl"
    >
      {/* Decorative Brand Ambient Background */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-xs font-black mb-3 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{lang === "ar" ? "سواعد العطاء بمكة المكرمة" : "Reyadat Al-Ata Volunteer Teams"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {lang === "ar" ? "فرقنا التطوعية" : "Our Volunteer Teams"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed font-medium">
              {lang === "ar"
                ? "فرق متخصصة ومعتمدة تحت مظلة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة، تصنع الأثر الميداني والمجتمعي بروح وطنية وإنسانية ملهمة."
                : "Accredited specialist volunteer teams driving meaningful community impact under Reyadat Al-Ata Association."}
            </p>
          </div>

          {/* Navigation Controls & CTA */}
          <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
            <button
              type="button"
              onClick={onOpenTeamRegistrationModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-blue-600/25 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>{lang === "ar" ? "الانضمام كفريق تطوعي" : "Register as a Team"}</span>
            </button>

            {/* Slider Navigation Arrows */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-slate-200 dark:border-neutral-700 shadow-xs">
              <button
                type="button"
                onClick={() => handleScroll("right")}
                aria-label="Previous Team"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 rtl:rotate-0" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll("left")}
                aria-label="Next Team"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 rtl:rotate-0" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Slider */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScroll}
          className="flex gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scroll-smooth no-scrollbar"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {publishedTeams.map((team, idx) => {
            const stats = teamStatsMap.get(team.id) || { membersCount: 0, points: 0, initiativesCount: 0 };
            const isAccepting = team.acceptingVolunteers !== false;

            return (
              <div
                key={team.id || `team-card-${idx}`}
                className="snap-start shrink-0 w-[290px] sm:w-[320px] md:w-[340px] bg-white dark:bg-neutral-800/90 rounded-2xl border border-slate-200/90 dark:border-neutral-700/80 p-5 shadow-xs hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Team Brand Accent Top Bar */}
                <div 
                  className="absolute top-0 right-0 left-0 h-1.5 transition-all"
                  style={{ backgroundColor: team.color || "#0284c7" }}
                />

                <div>
                  {/* Team Logo, Name, Leader Header */}
                  <div className="flex items-start gap-3.5 mb-4 pt-1">
                    <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900 p-1 shadow-xs flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
                      {team.logoUrl ? (
                        <img 
                          src={team.logoUrl} 
                          alt={team.nameAr} 
                          className="w-full h-full object-contain rounded-xl"
                          loading="lazy"
                          onError={(e) => {
                            // Fallback to neutral icon if real image fails
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div 
                          className="w-full h-full rounded-xl flex items-center justify-center text-white font-black text-lg shadow-inner"
                          style={{ backgroundColor: team.color || "#0369a1" }}
                        >
                          <Users className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 truncate">
                          {team.city || "مكة المكرمة"}
                        </span>
                        {isAccepting ? (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                            متاح للانضمام
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                            مكتمل حالياً
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {team.nameAr}
                      </h3>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span>القائد: <strong className="text-slate-700 dark:text-slate-200 font-bold">{team.leaderName || "قائد معتمد"}</strong></span>
                      </p>
                    </div>
                  </div>

                  {/* Team Vision / Brief */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4 min-h-[36px]">
                    {team.vision || team.descriptionAr || "فريق تطوعي نوعي معتمد تحت مظلة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بمكة المكرمة."}
                  </p>

                  {/* Live Stats Row */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-neutral-900/70 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800 text-center mb-4">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">المتطوعون</span>
                      <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                        {stats.membersCount}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">المبادرات</span>
                      <strong className="text-xs sm:text-sm font-black text-slate-900 dark:text-white font-mono">
                        {stats.initiativesCount}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">النقاط</span>
                      <strong className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 font-mono">
                        {stats.points}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => onSelectTeam(team)}
                    className="flex-1 py-2 px-3 text-xs font-black text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>تفاصيل الفريق</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onJoinTeamClick(team)}
                    className="flex-1 py-2 px-3 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>انضم للفريق</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
