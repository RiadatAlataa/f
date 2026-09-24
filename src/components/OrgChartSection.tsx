import React, { useState, useMemo } from "react";
import { 
  Building2, Users, Crown, Shield, Award, ChevronDown, 
  Search, Mail, Phone, ExternalLink, Sparkles, UserCheck, 
  Briefcase, Network, ArrowDown, Info
} from "lucide-react";
import { OrgMember } from "../types";

interface OrgChartSectionProps {
  members: OrgMember[];
  lang?: "ar" | "en";
  associationName?: string;
}

export const OrgChartSection: React.FC<OrgChartSectionProps> = ({
  members = [],
  lang = "ar",
  associationName = "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'hierarchy' | 'grid'>('hierarchy');

  // Filter only active members for public display
  const activeMembers = useMemo(() => {
    return (members || [])
      .filter(m => m.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [members]);

  // Apply search and level filters
  const filteredMembers = useMemo(() => {
    return activeMembers.filter(m => {
      const matchSearch = !searchTerm || 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.roleTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.department && m.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchLevel = selectedLevelFilter === 'all' || m.level === selectedLevelFilter;

      return matchSearch && matchLevel;
    });
  }, [activeMembers, searchTerm, selectedLevelFilter]);

  // Group members by level for hierarchical presentation
  const groupedByLevel = useMemo(() => {
    const levels = [
      { id: 1, titleAr: "مجلس الإدارة", titleEn: "Board of Directors", icon: Crown, color: "from-amber-600 to-amber-700", border: "border-amber-500/30", badge: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50" },
      { id: 2, titleAr: "الإدارة التنفيذية", titleEn: "Executive Management", icon: Shield, color: "from-emerald-600 to-teal-700", border: "border-emerald-500/30", badge: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50" },
      { id: 3, titleAr: "الإدارات والأقسام", titleEn: "Departments & Divisions", icon: Building2, color: "from-blue-600 to-indigo-700", border: "border-blue-500/30", badge: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50" },
      { id: 4, titleAr: "المسؤولون والكوادر", titleEn: "Staff & Officers", icon: Users, color: "from-slate-600 to-neutral-700", border: "border-slate-500/30", badge: "bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800" }
    ];

    return levels.map(lvl => ({
      ...lvl,
      items: filteredMembers.filter(m => (m.level || 3) === lvl.id)
    })).filter(lvl => lvl.items.length > 0 || (selectedLevelFilter === lvl.id));
  }, [filteredMembers, selectedLevelFilter]);

  // If there are no members at all, return null or a clean note
  if (!activeMembers || activeMembers.length === 0) {
    return null;
  }

  return (
    <section id="administrative-structure" className="py-10 sm:py-14 relative bg-gradient-to-b from-white via-neutral-50 to-white dark:from-neutral-900 dark:via-neutral-850 dark:to-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 transition-colors duration-300">
      {/* Background Decorative Accents */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-20">
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-emerald-300/30 dark:bg-emerald-900/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 left-1/4 w-96 h-96 bg-amber-300/30 dark:bg-amber-900/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-black tracking-wide shadow-2xs">
            <Network className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{lang === "ar" ? "الهيكل الإداري والتنظيمي المعتمد" : "Administrative & Organizational Structure"}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 dark:text-white tracking-tight">
            {lang === "ar" ? "الهيكل الإداري" : "Organizational Structure"}
          </h2>

          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed">
            {lang === "ar"
              ? `التسلسل القيادي والتنظيمي المعتمد لإدارة أعمال ${associationName} بما يحقق الحوكمة والشفافية وأعلى معايير التميز المؤسسي.`
              : `The approved leadership and organizational hierarchy governing the operations of the association.`}
          </p>
        </div>

        {/* Toolbar & Filters (Search, Level Filters, View Switcher) */}
        <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-neutral-200/80 dark:border-neutral-700 shadow-xs mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={lang === "ar" ? "بحث بالاسم أو المسمى الوظيفي..." : "Search by name or title..."}
              className="w-full pr-9 pl-4 py-2 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-neutral-800 dark:text-neutral-200 placeholder-neutral-400"
            />
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedLevelFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedLevelFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {lang === "ar" ? `كافة المستويات (${activeMembers.length})` : `All (${activeMembers.length})`}
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevelFilter(1)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedLevelFilter === 1
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {lang === "ar" ? "مجلس الإدارة" : "Board"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevelFilter(2)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedLevelFilter === 2
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {lang === "ar" ? "الإدارة التنفيذية" : "Executive"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedLevelFilter(3)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedLevelFilter === 3
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {lang === "ar" ? "الإدارات والأقسام" : "Departments"}
            </button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-900 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'hierarchy'
                  ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              {lang === "ar" ? "هرمي شجري" : "Tree View"}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-neutral-800 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
              }`}
            >
              {lang === "ar" ? "شبكة بطاقات" : "Grid View"}
            </button>
          </div>
        </div>

        {/* Members Rendering */}
        {filteredMembers.length === 0 ? (
          <div className="text-center py-16 bg-white/50 dark:bg-neutral-800/50 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
            <Users className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              {lang === "ar" ? "لم يتم العثور على نتائج مطابقة للبحث" : "No matching members found"}
            </p>
            <button
              type="button"
              onClick={() => { setSearchTerm(""); setSelectedLevelFilter('all'); }}
              className="mt-3 text-xs text-emerald-600 font-bold hover:underline cursor-pointer"
            >
              {lang === "ar" ? "إعادة ضبط الفلاتر" : "Reset filters"}
            </button>
          </div>
        ) : viewMode === 'hierarchy' ? (
          /* Hierarchical Level-by-Level Tree Presentation */
          <div className="space-y-12 relative">
            {groupedByLevel.map((group, groupIdx) => (
              <div key={group.id} className="relative">
                {/* Level Tier Header Banner */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`p-2 rounded-xl bg-gradient-to-r ${group.color} text-white shadow-xs shrink-0`}>
                    <group.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                        <span>{lang === "ar" ? group.titleAr : group.titleEn}</span>
                        <span className="text-xs font-normal text-neutral-400">({group.items.length})</span>
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Level Cards Grid */}
                <div className={`grid gap-6 ${
                  group.id === 1 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto'
                    : group.id === 2
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                  {group.items.map((member) => (
                    <OrgMemberCard key={member.id} member={member} lang={lang} allMembers={activeMembers} />
                  ))}
                </div>

                {/* Connector line between tiers if not last */}
                {groupIdx < groupedByLevel.length - 1 && (
                  <div className="flex justify-center my-8">
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-neutral-300 to-emerald-500 dark:from-neutral-700 dark:to-emerald-500" />
                      <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                        <ArrowDown className="w-3 h-3" />
                      </div>
                      <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500 to-neutral-300 dark:from-emerald-500 dark:to-neutral-700" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Standard Responsive Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMembers.map((member) => (
              <OrgMemberCard key={member.id} member={member} lang={lang} allMembers={activeMembers} />
            ))}
          </div>
        )}

        {/* Governance & Institutional Excellence Badge Footer */}
        <div className="mt-16 p-4 sm:p-6 rounded-2xl bg-white dark:bg-neutral-800/60 border border-emerald-100 dark:border-neutral-700/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-right">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/40">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white">
                {lang === "ar" ? "الالتزام بمعايير الحوكمة والشفافية المؤسسية" : "Commitment to Governance & Transparency"}
              </h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                {lang === "ar" ? "يعمل الهيكل الإداري وفق اللائحة التنفيذية المعتمدة للمركز الوطني لتنمية القطاع غير الربحي." : "Aligned with official non-profit governance standards."}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300">
              {activeMembers.length} {lang === "ar" ? "منصب قيادي وتنفيذي" : "Members"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

// Subcomponent: Individual Member Card with Luxury Finish
interface OrgMemberCardProps {
  member: OrgMember;
  lang?: "ar" | "en";
  allMembers?: OrgMember[];
}

const OrgMemberCard: React.FC<OrgMemberCardProps> = ({ member, lang = "ar", allMembers = [] }) => {
  // Find direct superior name if parentId is set
  const superiorMember = useMemo(() => {
    if (!member.parentId) return null;
    return allMembers.find(m => m.id === member.parentId);
  }, [member.parentId, allMembers]);

  // Level badge configuration
  const levelBadge = useMemo(() => {
    switch (member.level) {
      case 1:
        return { label: lang === "ar" ? "مجلس الإدارة" : "Board", bg: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" };
      case 2:
        return { label: lang === "ar" ? "الإدارة التنفيذية" : "Executive", bg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" };
      case 3:
        return { label: lang === "ar" ? "مدير إدارة / قسم" : "Director", bg: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" };
      default:
        return { label: lang === "ar" ? "كادر تنفيذي" : "Officer", bg: "bg-neutral-500/10 text-neutral-700 dark:text-neutral-400 border-neutral-500/20" };
    }
  }, [member.level, lang]);

  return (
    <div className="group relative bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200/80 dark:border-neutral-700 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Top Accent Gradient Ribbon */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${
        member.level === 1 ? 'from-amber-500 to-amber-600' :
        member.level === 2 ? 'from-emerald-500 to-teal-600' :
        member.level === 3 ? 'from-blue-500 to-indigo-600' :
        'from-slate-500 to-neutral-600'
      }`} />

      <div className="p-5 sm:p-6 flex flex-col flex-1 items-center text-center">
        {/* Photo or Initials Avatar */}
        <div className="relative mb-4">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-md bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            {member.imageUrl ? (
              <img
                src={member.imageUrl}
                alt={member.name}
                className="w-full h-full object-cover object-top"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement?.classList.add('fallback-avatar');
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-600/10 to-emerald-600/20 dark:from-emerald-950/40 dark:to-neutral-800 text-emerald-700 dark:text-emerald-300">
                <Users className="w-10 h-10 opacity-70 mb-1" />
                <span className="text-[10px] font-bold opacity-80">{lang === "ar" ? "صورة معتمدة" : "Photo"}</span>
              </div>
            )}
          </div>

          {/* Level Crown / Badge Icon */}
          <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xs flex items-center justify-center">
            {member.level === 1 ? (
              <Crown className="w-3.5 h-3.5 text-amber-500" />
            ) : member.level === 2 ? (
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            )}
          </div>
        </div>

        {/* Member Name */}
        <h4 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
          {member.name}
        </h4>

        {/* Job Title / Role Title */}
        <div className="mt-1.5 inline-block">
          <span className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200/60 dark:border-emerald-800/40">
            {member.roleTitle}
          </span>
        </div>

        {/* Administrative Level & Department Tag */}
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${levelBadge.bg}`}>
            {levelBadge.label}
          </span>
          {member.department && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-600/50">
              {member.department}
            </span>
          )}
        </div>

        {/* Direct Superior / Parent Indicator */}
        {(superiorMember || member.parentName) && (
          <div className="mt-3 w-full pt-2.5 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-center gap-1 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span className="font-medium">{lang === "ar" ? "الرئيس المباشر:" : "Superior:"}</span>
            <span className="font-bold text-neutral-800 dark:text-neutral-200">
              {superiorMember?.name || member.parentName}
            </span>
          </div>
        )}

        {/* Description / Bio if provided */}
        {member.description && (
          <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-3 font-medium">
            {member.description}
          </p>
        )}

        {/* Footer Contact Icons (if email or phone provided) */}
        {(member.email || member.phone) && (
          <div className="mt-auto pt-4 w-full flex items-center justify-center gap-2 border-t border-neutral-100 dark:border-neutral-700/60">
            {member.email && (
              <a
                href={`mailto:${member.email}`}
                title={member.email}
                className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>
            )}
            {member.phone && (
              <a
                href={`tel:${member.phone}`}
                title={member.phone}
                className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
