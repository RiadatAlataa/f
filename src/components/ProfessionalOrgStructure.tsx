import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, X, RefreshCw, Network, Search } from "lucide-react";
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
 * Determines whether an image URL is a real uploaded asset rather than a mock/placeholder.
 */
export const isRealUploadedPhoto = (url?: string): boolean => {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (
    trimmed.includes("unsplash.com") ||
    trimmed.includes("placeholder") ||
    trimmed.includes("pravatar") ||
    trimmed.includes("via.placeholder")
  ) {
    return false;
  }
  return true;
};

/**
 * قسم عرض الهيكل الإداري الاحترافي (شبكة متناسقة Responsive Grid)
 * - إلغاء التصميم الهرمي بالكامل وعرض شبكة بطاقات متساوية الحجم وصغيرة وأنيقة.
 * - تحتوي كل بطاقة على 3 عناصر فقط: (1) الصورة الشخصية أو أيقونة محايدة (2) الاسم الكامل (3) المنصب الإداري.
 * - ترتيب الأعضاء حسب الترتيب المحدد من لوحة الإدارة.
 * - التجاوب:
 *   - الجوال: بطاقتان في الصف (grid-cols-2).
 *   - الأجهزة اللوحية: 2 إلى 3 بطاقات (sm:grid-cols-2 md:grid-cols-3).
 *   - الكمبيوتر: 4 إلى 6 بطاقات في الصف (lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6).
 * - الضغط على البطاقة يفتح نافذة منبثقة أنيقة تعرض الصورة والاسم والمنصب فقط.
 */
export const ProfessionalOrgStructure: React.FC<ProfessionalOrgStructureProps> = ({
  members: propMembers,
  lang = "ar",
  associationName = "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
  licenseNumber = "1000888600",
  className = "",
  showHeader = true,
}) => {
  const [membersList, setMembersList] = useState<OrgMember[]>(propMembers || []);
  const [isLoading, setIsLoading] = useState<boolean>(!propMembers || propMembers.length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);

  // Fetch members directly from database endpoint
  const fetchOrgMembersFromDb = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

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
      console.warn("Could not fetch /api/db/org-members, trying fallback to /api/db...", err);
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
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [propMembers]);

  // Sync on prop change or mount
  useEffect(() => {
    if (propMembers && propMembers.length > 0) {
      setMembersList(propMembers);
      setIsLoading(false);
    } else {
      fetchOrgMembersFromDb(false);
    }
  }, [propMembers, fetchOrgMembersFromDb]);

  // ESC to close modal
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

  // Filter active members and sort STRICTLY by the admin panel order
  const orderedMembers = useMemo(() => {
    return (membersList || [])
      .filter((m) => m.isActive !== false)
      .sort((a, b) => {
        // Order as specified in the admin panel
        const orderA = typeof a.order === "number" ? a.order : 999;
        const orderB = typeof b.order === "number" ? b.order : 999;
        if (orderA !== orderB) return orderA - orderB;
        // Fallback secondary sort by administrative level
        return (Number(a.level) || 3) - (Number(b.level) || 3);
      });
  }, [membersList]);

  // Optional search filter
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return orderedMembers;
    const q = searchQuery.toLowerCase().trim();
    return orderedMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.roleTitle.toLowerCase().includes(q)
    );
  }, [orderedMembers, searchQuery]);

  return (
    <section
      id="administrative-structure"
      className={`py-8 sm:py-14 relative bg-gradient-to-b from-white via-neutral-50/70 to-white dark:from-neutral-900 dark:via-neutral-850 dark:to-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 transition-colors duration-300 ${className}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* ===================================================================== */}
        {/* SECTION HEADER                                                        */}
        {/* ===================================================================== */}
        {showHeader && (
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-9 space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-black tracking-wide shadow-2xs">
              <Network className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === "ar" ? "الهيكل الإداري" : "Organizational Structure"}</span>
              <span className="text-neutral-300 dark:text-neutral-700">|</span>
              <span className="font-mono text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
                {lang === "ar" ? `ترخيص: ${licenseNumber}` : `Lic: ${licenseNumber}`}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
              {lang === "ar" ? "الهيكل الإداري للجمعية" : "Administrative Leadership Structure"}
            </h2>

            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed max-w-2xl mx-auto">
              {lang === "ar"
                ? `القيادات والكوادر الإدارية المعتمدة في ${associationName}`
                : `Approved leadership & staff governing operations at ${associationName}`}
            </p>
          </div>
        )}

        {/* Optional Search / Quick Refresh Bar (Compact) */}
        {orderedMembers.length > 8 && (
          <div className="max-w-md mx-auto mb-6 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "ar" ? "بحث عن عضو أو منصب إداري..." : "Search by member or title..."}
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => fetchOrgMembersFromDb(true)}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors cursor-pointer shrink-0"
              title={lang === "ar" ? "تحديث" : "Refresh"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        )}

        {/* ===================================================================== */}
        {/* RESPONSIVE UNIFIED GRID (No Hierarchy, No Connector Lines)            */}
        {/* Mobile: 2 per row (grid-cols-2)                                       */}
        {/* Tablet: 2 to 3 per row (sm:grid-cols-2 md:grid-cols-3)                */}
        {/* Desktop: 4 to 6 per row (lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6) */}
        {/* ===================================================================== */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white dark:bg-neutral-800 rounded-2xl p-3 border border-neutral-200/60 dark:border-neutral-700 flex flex-col items-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-neutral-200 dark:bg-neutral-700 mb-2.5" />
                <div className="h-3.5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded mb-1.5" />
                <div className="h-3 w-16 bg-neutral-100 dark:bg-neutral-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-12 bg-white/60 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
            <User className="w-9 h-9 text-neutral-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              {lang === "ar" ? "لا توجد بطاقات مطابقة لخيارات البحث" : "No matching members found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5 sm:gap-4">
            {filteredMembers.map((member) => (
              <OrgMemberGridCard
                key={member.id}
                member={member}
                onClick={() => setSelectedMember(member)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* POPUP DETAIL MODAL                                                    */}
      {/* Exactly 3 elements: (1) Larger Photo (or Neutral Icon), (2) Full Name, */}
      {/* (3) Administrative Title. No extra private data. Easy close.          */}
      {/* ===================================================================== */}
      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedMember(null)}
          role="dialog"
          aria-modal="true"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <div
            className="relative w-full max-w-sm bg-white dark:bg-neutral-850 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden transform transition-all animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Identity Accent Line */}
            <div className="h-2 w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedMember(null)}
              className="absolute top-4 left-4 p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-750 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-200 transition-colors cursor-pointer z-10"
              title={lang === "ar" ? "إغلاق (Esc)" : "Close (Esc)"}
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Body: Exactly Photo, Full Name, Title */}
            <div className="p-6 sm:p-7 flex flex-col items-center text-center">
              {/* 1. Large Photo or Neutral Icon */}
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-md bg-neutral-100 dark:bg-neutral-800 mb-4 flex items-center justify-center shrink-0">
                {isRealUploadedPhoto(selectedMember.imageUrl) ? (
                  <img
                    src={selectedMember.imageUrl}
                    alt={selectedMember.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    <User className="w-16 h-16 opacity-75 stroke-[1.5]" />
                  </div>
                )}
              </div>

              {/* 2. Full Name */}
              <h3 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white leading-tight">
                {selectedMember.name}
              </h3>

              {/* 3. Administrative Title */}
              <div className="mt-2.5 inline-block px-4 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs">
                {selectedMember.roleTitle}
              </div>

              {/* Bottom Close Action */}
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="mt-6 w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-750 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                {lang === "ar" ? "إغلاق النافذة" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// =========================================================================
// SUBCOMPONENT: OrgMemberGridCard
// Strictly 3 elements:
// 1. الصورة الشخصية (Real photo OR neutral user icon)
// 2. الاسم الكامل (Full Name)
// 3. المنصب الإداري (Administrative Title)
// =========================================================================
interface OrgMemberGridCardProps {
  member: OrgMember;
  onClick: () => void;
}

const OrgMemberGridCard: React.FC<OrgMemberGridCardProps> = ({ member, onClick }) => {
  const hasRealPhoto = isRealUploadedPhoto(member.imageUrl);

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
      className="group relative bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200/90 dark:border-neutral-700/80 shadow-2xs hover:shadow-md hover:border-emerald-500/50 dark:hover:border-emerald-500/50 hover:-translate-y-0.5 transition-all duration-200 p-3 sm:p-3.5 flex flex-col items-center text-center cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-emerald-500 h-full justify-between"
      title={`${member.name} — ${member.roleTitle}`}
      aria-label={`${member.name}, ${member.roleTitle}`}
    >
      <div className="w-full flex flex-col items-center">
        {/* 1. الصورة الشخصية أو أيقونة محايدة */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-emerald-500/20 dark:border-emerald-500/30 bg-neutral-100 dark:bg-neutral-750 flex items-center justify-center shrink-0 mb-2.5 transition-transform duration-200 group-hover:scale-105 shadow-2xs">
          {hasRealPhoto ? (
            <img
              src={member.imageUrl}
              alt={member.name}
              className="w-full h-full object-cover object-top"
              loading="lazy"
              onError={(e) => {
                // If real photo fails to load, gracefully switch to neutral User icon
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement?.classList.add("show-fallback-user");
              }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              <User className="w-9 h-9 sm:w-10 sm:h-10 opacity-75 stroke-[1.5]" />
            </div>
          )}
        </div>

        {/* 2. الاسم الكامل */}
        <h4 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug line-clamp-2 w-full">
          {member.name}
        </h4>
      </div>

      {/* 3. المنصب الإداري */}
      <p className="mt-1.5 text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-300 leading-snug line-clamp-2 w-full pt-1 border-t border-neutral-100 dark:border-neutral-750">
        {member.roleTitle}
      </p>
    </div>
  );
};

export default ProfessionalOrgStructure;
