import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Crown, Shield, Building2, Users, Search, X, 
  RefreshCw, CheckCircle2, ChevronLeft, Sparkles,
  SlidersHorizontal, Network
} from "lucide-react";
import { OrgMember } from "../types";

export interface ProfessionalOrgStructureProps {
  /** Optional initial members list (if already in memory). If omitted, auto-fetches from database */
  members?: OrgMember[];
  /** Interface display language */
  lang?: "ar" | "en";
  /** Association name for title & branding */
  associationName?: string;
  /** Official license number */
  licenseNumber?: string;
  /** Custom CSS classes for section wrapper */
  className?: string;
  /** Whether to show full section header or only the structure cards */
  showHeader?: boolean;
}

/**
 * قسم عرض الهيكل الإداري الاحترافي
 * Professional Organizational Structure Section
 * - يعرض أعضاء الهيكل الإداري المستخرجين من قاعدة البيانات في بطاقات أنيقة وصغيرة.
 * - تتكون كل بطاقة من 3 عناصر فقط: (1) الصورة الشخصية (2) الاسم الكامل (3) المنصب الإداري.
 * - مرتبة وفق التسلسل الإداري المعتمد (مجلس الإدارة، الإدارة التنفيذية، الإدارات والأقسام).
 * - يدعم النقر لفتح نافذة منبثقة أنيقة ومفصلة دون الانتقال لصفحات فارغة.
 * - تصميم متجاوب لجميع الشاشات (كمبيوتر، تابلت، وجوال).
 */
export const ProfessionalOrgStructure: React.FC<ProfessionalOrgStructureProps> = ({
  members: propMembers,
  lang = "ar",
  associationName = "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
  licenseNumber = "1000888600",
  className = "",
  showHeader = true,
}) => {
  // Members state: either initialized from props or fetched from DB
  const [membersList, setMembersList] = useState<OrgMember[]>(propMembers || []);
  const [isLoading, setIsLoading] = useState<boolean>(!propMembers || propMembers.length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeLevelFilter, setActiveLevelFilter] = useState<number | "all">("all");
  const [layoutMode, setLayoutMode] = useState<"hierarchy" | "grid">("hierarchy");

  // Selected member for detail popup modal
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);

  // Fetch members directly from database endpoint
  const fetchOrgMembersFromDb = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch("/api/db/org-members", {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      const data = await response.json();
      const rawList: OrgMember[] = Array.isArray(data.members) 
        ? data.members 
        : (Array.isArray(data) ? data : []);

      if (rawList && rawList.length > 0) {
        setMembersList(rawList);
      } else if (propMembers && propMembers.length > 0) {
        setMembersList(propMembers);
      }
    } catch (err: any) {
      console.warn("Could not fetch org-members, attempting fallback to main db...", err);
      try {
        const fallbackRes = await fetch("/api/db");
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const list = fallbackData.orgMembers || fallbackData.homeSettings?.orgMembers || [];
          if (Array.isArray(list) && list.length > 0) {
            setMembersList(list);
          }
        }
      } catch (fallbackErr) {
        console.error("Failed to load org members from database:", fallbackErr);
        setFetchError(lang === "ar" ? "تعذر تحميل بيانات الهيكل الإداري حالياً" : "Failed to load organizational structure");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [lang, propMembers]);

  // Synchronize on mount or if propMembers change
  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setMembersList(propMembers);
      setIsLoading(false);
    } else {
      fetchOrgMembersFromDb(false);
    }
  }, [propMembers, fetchOrgMembersFromDb]);

  // Handle keyboard ESC to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedMember(null);
      }
    };
    if (selectedMember) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMember]);

  // Filter active members and sort strictly by administrative hierarchy
  const activeMembers = useMemo(() => {
    return (membersList || [])
      .filter(m => m.isActive !== false)
      .sort((a, b) => {
        // Primary sort: Level (1: Board, 2: Exec, 3: Depts, 4: Staff)
        const lvlA = Number(a.level) || 3;
        const lvlB = Number(b.level) || 3;
        if (lvlA !== lvlB) return lvlA - lvlB;
        // Secondary sort: Specified administrative order
        return (Number(a.order) || 0) - (Number(b.order) || 0);
      });
  }, [membersList]);

  // Filter based on search input and level chip
  const filteredMembers = useMemo(() => {
    return activeMembers.filter(m => {
      const matchSearch = !searchQuery.trim() || 
        m.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        m.roleTitle.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      const matchLevel = activeLevelFilter === "all" || m.level === activeLevelFilter;
      return matchSearch && matchLevel;
    });
  }, [activeMembers, searchQuery, activeLevelFilter]);

  // Group members into hierarchy tiers
  const groupedTiers = useMemo(() => {
    const tiers = [
      {
        id: 1,
        titleAr: "مجلس الإدارة",
        titleEn: "Board of Directors",
        icon: Crown,
        badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700/50",
        headerColor: "from-amber-600 to-amber-700",
        descriptionAr: "القيادة الاستراتيجية والحوكمة العليا",
        descriptionEn: "Strategic Governance & Oversight"
      },
      {
        id: 2,
        titleAr: "الإدارة التنفيذية",
        titleEn: "Executive Management",
        icon: Shield,
        badgeClass: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/50",
        headerColor: "from-emerald-600 to-teal-700",
        descriptionAr: "التوجيه التنفيذي وإدارة العمليات الشاملة",
        descriptionEn: "Executive Direction & Operations"
      },
      {
        id: 3,
        titleAr: "الإدارات والأقسام",
        titleEn: "Departments & Divisions",
        icon: Building2,
        badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/50",
        headerColor: "from-blue-600 to-indigo-700",
        descriptionAr: "القيادات الميدانية والإدارات المتخصصة",
        descriptionEn: "Departmental Heads & Operational Leaders"
      },
      {
        id: 4,
        titleAr: "الكوادر والمنسقون",
        titleEn: "Officers & Coordinators",
        icon: Users,
        badgeClass: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700/50",
        headerColor: "from-slate-600 to-neutral-700",
        descriptionAr: "الفرق التنفيذية والتنسيقية الميدانية",
        descriptionEn: "Field Coordinators & Support Staff"
      }
    ];

    return tiers.map(tier => ({
      ...tier,
      members: filteredMembers.filter(m => (m.level || 3) === tier.id)
    })).filter(tier => tier.members.length > 0 || (activeLevelFilter === tier.id));
  }, [filteredMembers, activeLevelFilter]);

  return (
    <section 
      id="administrative-structure"
      className={`py-8 sm:py-14 relative bg-gradient-to-b from-white via-neutral-50/70 to-white dark:from-neutral-900 dark:via-neutral-850 dark:to-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 transition-colors duration-300 ${className}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25 dark:opacity-15" aria-hidden="true">
        <div className="absolute -top-20 right-1/4 w-80 h-80 bg-emerald-400/30 dark:bg-emerald-800/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 w-80 h-80 bg-amber-400/30 dark:bg-amber-800/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ===================================================================== */}
        {/* SECTION HEADER                                                        */}
        {/* ===================================================================== */}
        {showHeader && (
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-9 space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-black tracking-wide shadow-2xs">
              <Network className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === "ar" ? "الهيكل الإداري الاحترافي" : "Professional Organizational Structure"}</span>
              <span className="text-neutral-300 dark:text-neutral-700">|</span>
              <span className="font-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                {lang === "ar" ? `ترخيص: ${licenseNumber}` : `Lic: ${licenseNumber}`}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
              {lang === "ar" ? "الهيكل الإداري الاحترافي" : "Administrative Leadership Structure"}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed max-w-2xl mx-auto">
              {lang === "ar"
                ? `التسلسل القيادي والتنظيمي المعتمد في ${associationName} وفق أعلى معايير الحوكمة والشفافية المؤسسية.`
                : `The approved leadership hierarchy governing institutional operations in accordance with non-profit governance standards.`}
            </p>
          </div>
        )}

        {/* ===================================================================== */}
        {/* SEARCH, FILTER & VIEW CONTROLS TOOLBAR                               */}
        {/* ===================================================================== */}
        <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md rounded-2xl p-2.5 sm:p-3.5 border border-neutral-200/90 dark:border-neutral-700 shadow-xs mb-6 sm:mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Quick Search Field */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "ar" ? "ابحث باسم العضو أو المنصب الإداري..." : "Search by name or administrative role..."}
              className="w-full pr-9 pl-4 py-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                title="مسح البحث"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Level Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setActiveLevelFilter("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                activeLevelFilter === "all"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {lang === "ar" ? `الكل (${activeMembers.length})` : `All (${activeMembers.length})`}
            </button>
            <button
              type="button"
              onClick={() => setActiveLevelFilter(1)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeLevelFilter === 1
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <Crown className="w-3 h-3" />
              <span>{lang === "ar" ? "مجلس الإدارة" : "Board"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLevelFilter(2)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeLevelFilter === 2
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>{lang === "ar" ? "الإدارة التنفيذية" : "Executive"}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveLevelFilter(3)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeLevelFilter === 3
                  ? "bg-blue-600 text-white shadow-2xs"
                  : "bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>{lang === "ar" ? "الإدارات والأقسام" : "Departments"}</span>
            </button>
          </div>

          {/* View Mode Toggle & Refresh */}
          <div className="flex items-center gap-1.5 justify-end">
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setLayoutMode("hierarchy")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layoutMode === "hierarchy"
                    ? "bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
                title={lang === "ar" ? "عرض هرمي حسب المستويات الإدارية" : "Hierarchical view by level"}
              >
                {lang === "ar" ? "هرمي" : "Hierarchy"}
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  layoutMode === "grid"
                    ? "bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-2xs"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
                title={lang === "ar" ? "عرض شبكة مدمجة لجميع البطاقات" : "Compact grid view"}
              >
                {lang === "ar" ? "شبكة" : "Grid"}
              </button>
            </div>

            {/* Live Refresh Button */}
            <button
              type="button"
              onClick={() => fetchOrgMembersFromDb(true)}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-700/60 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer shrink-0"
              title={lang === "ar" ? "تحديث بيانات الهيكل الإداري من الخادم" : "Refresh from database"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* CARDS DISPLAY CONTAINER                                              */}
        {/* ===================================================================== */}
        {isLoading ? (
          /* Skeletons while loading from database */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200/60 dark:border-neutral-700 flex flex-col items-center">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-neutral-200 dark:bg-neutral-700 mb-2.5" />
                <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded mb-1.5" />
                <div className="h-2.5 w-16 bg-neutral-100 dark:bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          /* Empty Search / Filter State */
          <div className="text-center py-12 bg-white/60 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
            <Users className="w-9 h-9 text-neutral-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              {lang === "ar" ? "لم يتم العثور على أعضاء يطابقون خيارات البحث الحالية" : "No matching members found"}
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(""); setActiveLevelFilter("all"); }}
              className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              {lang === "ar" ? "إعادة ضبط البحث والفلاتر" : "Reset search and filters"}
            </button>
          </div>
        ) : layoutMode === "hierarchy" ? (
          /* ------------------------------------------------------------- */
          /* 1. HIERARCHICAL TIER PRESENTATION                             */
          /* ------------------------------------------------------------- */
          <div className="space-y-6 sm:space-y-8">
            {groupedTiers.map((tier, tierIdx) => (
              <div key={tier.id} className="relative">
                {/* Tier Level Header Banner */}
                <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
                  <div className={`p-1.5 sm:p-2 rounded-xl bg-gradient-to-r ${tier.headerColor} text-white shadow-2xs shrink-0`}>
                    <tier.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 border-b border-neutral-200/90 dark:border-neutral-700/80 pb-1.5 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <span>{lang === "ar" ? tier.titleAr : tier.titleEn}</span>
                        <span className="text-[11px] font-mono text-neutral-400 font-normal">
                          ({tier.members.length})
                        </span>
                      </h3>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 hidden sm:block">
                        {lang === "ar" ? tier.descriptionAr : tier.descriptionEn}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compact, Tight Grid of 3-Element Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
                  {tier.members.map((member) => (
                    <ProfessionalMemberCard
                      key={member.id}
                      member={member}
                      onClick={() => setSelectedMember(member)}
                    />
                  ))}
                </div>

                {/* Hierarchy Connector Line between levels */}
                {tierIdx < groupedTiers.length - 1 && (
                  <div className="flex justify-center my-4 sm:my-6 pointer-events-none" aria-hidden="true">
                    <div className="w-0.5 h-4 sm:h-5 bg-gradient-to-b from-neutral-300 via-emerald-400 to-transparent dark:from-neutral-700 dark:via-emerald-500 dark:to-transparent" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* ------------------------------------------------------------- */
          /* 2. UNIFIED COMPACT GRID PRESENTATION                          */
          /* ------------------------------------------------------------- */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
            {filteredMembers.map((member) => (
              <ProfessionalMemberCard
                key={member.id}
                member={member}
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </div>
        )}

        {/* ===================================================================== */}
        {/* OFFICIAL ACCREDITATION FOOTER STRIP                                  */}
        {/* ===================================================================== */}
        <div className="mt-8 sm:mt-10 p-3 sm:p-4 rounded-2xl bg-white dark:bg-neutral-800/80 border border-emerald-100 dark:border-neutral-700/60 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-neutral-600 dark:text-neutral-400 text-center sm:text-right">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-neutral-800 dark:text-neutral-200">
                {lang === "ar" ? "اعتماد الحوكمة والتنظيم" : "Governance Accreditation"}:
              </span>{" "}
              <span className="text-[11px]">
                {lang === "ar" 
                  ? `${associationName} - مسجلة برقم ترخيص رسمي (${licenseNumber})` 
                  : `${associationName} - Official License (${licenseNumber})`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
              {activeMembers.length} {lang === "ar" ? "عضو معتمد" : "Members"}
            </span>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* POPUP DETAIL MODAL (No Blank Page, Privacy-Safe, High-Quality Photo)  */}
      {/* ===================================================================== */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedMember(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-modal-name"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-neutral-850 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden transform transition-all animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Identity Accent Ribbon by Level */}
            <div 
              className={`h-2.5 w-full bg-gradient-to-r ${
                selectedMember.level === 1 ? "from-amber-500 via-amber-600 to-amber-700" :
                selectedMember.level === 2 ? "from-emerald-500 via-teal-600 to-emerald-700" :
                selectedMember.level === 3 ? "from-blue-500 via-indigo-600 to-blue-700" :
                "from-slate-500 to-neutral-700"
              }`} 
            />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 left-4 p-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-200 transition-colors cursor-pointer z-10"
              title={lang === "ar" ? "إغلاق النافذة (Esc)" : "Close (Esc)"}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Body */}
            <div className="p-6 flex flex-col items-center text-center">
              
              {/* Member Photo: Enlarged, Crisp, Aspect-Preserved without distortion */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-md bg-neutral-100 dark:bg-neutral-800 mb-4 flex items-center justify-center shrink-0">
                {selectedMember.imageUrl ? (
                  <img
                    src={selectedMember.imageUrl}
                    alt={selectedMember.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-neutral-800 text-emerald-700 dark:text-emerald-300">
                    <Users className="w-14 h-14 opacity-60 mb-1" />
                    <span className="text-[11px] font-bold opacity-80">
                      {lang === "ar" ? "صورة معتمدة" : "Official Photo"}
                    </span>
                  </div>
                )}
              </div>

              {/* Member Full Name */}
              <h3 
                id="member-modal-name"
                className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white leading-tight"
              >
                {selectedMember.name}
              </h3>

              {/* Administrative Title / Role */}
              <div className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs font-black border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{selectedMember.roleTitle}</span>
              </div>

              {/* Administrative Tier & Department Badges */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-xs">
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600">
                  {selectedMember.level === 1 ? (lang === "ar" ? "مجلس الإدارة" : "Board of Directors") :
                   selectedMember.level === 2 ? (lang === "ar" ? "الإدارة التنفيذية" : "Executive Management") :
                   selectedMember.level === 3 ? (lang === "ar" ? "الإدارات والأقسام" : "Departments") : 
                   (lang === "ar" ? "الكادر التنفيذي" : "Staff")}
                </span>
                {selectedMember.department && (
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700">
                    {selectedMember.department}
                  </span>
                )}
              </div>

              {/* Official Credential Strip */}
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700/60 w-full flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {associationName}
                </span>
                <span className="font-mono text-[10px] font-bold">
                  {lang === "ar" ? `ترخيص: ${licenseNumber}` : `Lic: ${licenseNumber}`}
                </span>
              </div>

              {/* Close Button at bottom */}
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="mt-4 w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// =========================================================================
// SUBCOMPONENT: Professional Member Card
// STRICTLY 3 ELEMENTS:
// 1. الصورة الشخصية (Member Photo)
// 2. الاسم الكامل (Full Name)
// 3. المنصب الإداري (Administrative Role)
// =========================================================================
interface ProfessionalMemberCardProps {
  member: OrgMember;
  onClick: () => void;
}

const ProfessionalMemberCard: React.FC<ProfessionalMemberCardProps> = ({ member, onClick }) => {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="group relative bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/90 dark:border-neutral-700/80 shadow-2xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:-translate-y-0.5 transition-all duration-200 p-2.5 sm:p-3 flex flex-col items-center text-center cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
      title={`${member.name} — ${member.roleTitle} (اضغط لعرض التفاصيل)`}
      aria-label={`${member.name}, ${member.roleTitle}`}
    >
      {/* 1. الصورة الشخصية (Personal Photo) */}
      <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-emerald-500/20 dark:border-emerald-500/30 bg-neutral-100 dark:bg-neutral-700/80 flex items-center justify-center shrink-0 mb-2 transition-transform duration-200 group-hover:scale-105 shadow-2xs">
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={member.name}
            className="w-full h-full object-cover object-top"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              (e.target as HTMLImageElement).parentElement?.classList.add("fallback-avatar");
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/10 to-emerald-500/20 text-emerald-700 dark:text-emerald-300">
            <Users className="w-6 h-6 opacity-70" />
          </div>
        )}
      </div>

      {/* 2. الاسم الكامل (Full Name) */}
      <h4 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-tight line-clamp-1 w-full">
        {member.name}
      </h4>

      {/* 3. المنصب الإداري (Administrative Role) */}
      <p className="mt-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 leading-tight line-clamp-1 w-full">
        {member.roleTitle}
      </p>
    </div>
  );
};

export default ProfessionalOrgStructure;
