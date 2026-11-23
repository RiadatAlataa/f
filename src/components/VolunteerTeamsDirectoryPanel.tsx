import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  UsersRound,
  Search,
  RefreshCw,
  FileCheck2,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  FileText,
  Eye,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  X
} from "lucide-react";
import type { VolunteerCharter } from "../types";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import {
  VolunteerCharterModal,
  getCharterStatusMeta
} from "./VolunteerCharterModal";

interface TeamMemberOverview {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  membershipNumber: string;
  fileNumber: string;
  titleAr: string;
  status: string;
  profileCompleted: boolean;
  addedManually: boolean;
  points: number;
  volunteerHours: number;
  joinDate: string;
  charter: {
    id: string;
    charterNumber: string;
    currentVersion: number;
    status: string;
    locked: boolean;
    volunteerSignedAt: string | null;
    leaderApprovedAt: string | null;
    leaderRejectedAt: string | null;
  } | null;
}

interface TeamOverviewItem {
  id: string;
  nameAr: string;
  nameEn: string;
  departmentId: string;
  leaderId: string;
  leaderName: string;
  leaderPhone: string;
  leaderEmail: string;
  city: string;
  status: string;
  logoUrl: string;
  descriptionAr: string;
  descriptionEn: string;
  visionAr: string;
  visionEn: string;
  missionAr: string;
  missionEn: string;
  goalsAr: string;
  goalsEn: string;
  leaderLicenseUrl: string;
  leaderLicenseName: string;
  points: number;
  acceptingVolunteers: boolean;
  showOnHomepage: boolean;
  membersCount: number;
  members: TeamMemberOverview[];
}

interface VolunteerTeamsDirectoryPanelProps {
  viewerRole: "admin" | "department_admin";
  lang?: "ar" | "en";
  onRefreshDatabase?: () => void;
}

export const VolunteerTeamsDirectoryPanel: React.FC<
  VolunteerTeamsDirectoryPanelProps
> = ({ viewerRole, lang = "ar", onRefreshDatabase }) => {
  const [teams, setTeams] = useState<TeamOverviewItem[]>([]);
  const [summary, setSummary] = useState({
    totalTeams: 0,
    totalMembers: 0,
    totalSignedCharters: 0,
    totalApprovedCharters: 0
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [expandedTeamIds, setExpandedTeamIds] = useState<Record<string, boolean>>({});

  // Manual Volunteer Creation Modal & One-Time Password Display
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>("");
  const [manualNationalId, setManualNationalId] = useState<string>("");
  const [manualPhone, setManualPhone] = useState<string>("");
  const [manualEmail, setManualEmail] = useState<string>("");
  const [manualTeamId, setManualTeamId] = useState<string>("");
  const [manualGender, setManualGender] = useState<"male" | "female">("male");
  const [manualTitleAr, setManualTitleAr] = useState<string>("متطوع معتمد");
  const [creatingVol, setCreatingVol] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    nationalId: string;
    phone: string;
    email: string;
    membershipNumber: string;
    temporaryPassword: string;
    teamName: string;
  } | null>(null);
  const [copiedCred, setCopiedCred] = useState<boolean>(false);

  // Viewing full Charter modal
  const [activeCharterModal, setActiveCharterModal] =
    useState<VolunteerCharter | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/volunteer-teams-overview"), {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "same-origin"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "غير مصرح أو تعذر تحميل بيانات الفرق التطوعية.");
        return;
      }
      setTeams(Array.isArray(json.teams) ? json.teams : []);
      if (json.summary) setSummary(json.summary);
      if (Array.isArray(json.teams) && json.teams.length > 0 && !manualTeamId) {
        setManualTeamId(json.teams[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء تحميل الفرق التطوعية.");
    } finally {
      setLoading(false);
    }
  }, [manualTeamId]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const toggleExpand = (teamId: string) => {
    setExpandedTeamIds((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        (t.nameAr || "").toLowerCase().includes(q) ||
        (t.nameEn || "").toLowerCase().includes(q) ||
        (t.leaderName || "").toLowerCase().includes(q) ||
        (t.city || "").toLowerCase().includes(q) ||
        t.members.some(
          (m) =>
            (m.name || "").toLowerCase().includes(q) ||
            (m.membershipNumber || "").toLowerCase().includes(q)
        )
    );
  }, [teams, search]);

  const handleOpenCharter = async (charterId: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/volunteer-charters"), {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "same-origin"
      });
      const json = await res.json().catch(() => ({}));
      const found = (json.charters || []).find(
        (c: VolunteerCharter) => c.id === charterId
      );
      if (found) setActiveCharterModal(found);
    } catch {}
  };

  const handleManualCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(null);
    setCreatingVol(true);
    try {
      const res = await fetch(buildApiUrl("/api/db/volunteers/manual-create"), {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "same-origin",
        body: JSON.stringify({
          name: manualName.trim(),
          nationalId: manualNationalId.trim(),
          phone: manualPhone.trim(),
          email: manualEmail.trim(),
          teamId: manualTeamId || teams[0]?.id,
          gender: manualGender,
          titleAr: manualTitleAr.trim() || "متطوع معتمد"
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.temporaryPassword) {
        setManualError(json.error || "تعذر إنشاء المتطوع يدوياً.");
        return;
      }

      const teamObj = teams.find(
        (t) => t.id === (manualTeamId || teams[0]?.id)
      );
      setCreatedCredentials({
        name: json.volunteer?.name || manualName.trim(),
        nationalId: json.volunteer?.nationalId || manualNationalId.trim(),
        phone: json.volunteer?.phone || manualPhone.trim(),
        email: json.volunteer?.email || manualEmail.trim(),
        membershipNumber: json.volunteer?.membershipNumber || "",
        temporaryPassword: json.temporaryPassword,
        teamName: teamObj?.nameAr || ""
      });
      setShowManualModal(false);
      setManualName("");
      setManualNationalId("");
      setManualPhone("");
      setManualEmail("");
      await loadOverview();
      onRefreshDatabase?.();
    } catch (err: any) {
      setManualError(err?.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setCreatingVol(false);
    }
  };

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0754C7] text-white flex items-center justify-center shrink-0 shadow-xs">
            <UsersRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#071C43] dark:text-white">
              الفرق التطوعية وأعضاؤها ومواثيقهم
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              قسم مخصص لإدارة التطوع والإدارة العليا لاستعراض جميع الفرق، الرؤية والرسالة والأهداف، رخص القادة، والأعضاء وحالة ميثاق التطوع
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setManualError(null);
              setShowManualModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>إضافة متطوع يدوياً</span>
          </button>
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0E2447] text-[#071C43] dark:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68]">
          <span className="text-[11px] font-bold text-slate-500 block">
            إجمالي الفرق التطوعية
          </span>
          <strong className="text-xl font-black text-[#071C43] dark:text-white font-mono mt-1 block tabular-nums">
            {summary.totalTeams}
          </strong>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68]">
          <span className="text-[11px] font-bold text-slate-500 block">
            إجمالي أعضاء الفرق
          </span>
          <strong className="text-xl font-black text-[#0754C7] dark:text-blue-300 font-mono mt-1 block tabular-nums">
            {summary.totalMembers}
          </strong>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68]">
          <span className="text-[11px] font-bold text-slate-500 block">
            مواثيق موقعة من المتطوعين
          </span>
          <strong className="text-xl font-black text-amber-600 font-mono mt-1 block tabular-nums">
            {summary.totalSignedCharters}
          </strong>
        </div>
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68]">
          <span className="text-[11px] font-bold text-slate-500 block">
            مواثيق معتمدة من القادة
          </span>
          <strong className="text-xl font-black text-emerald-600 font-mono mt-1 block tabular-nums">
            {summary.totalApprovedCharters}
          </strong>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم الفريق، اسم القائد، المدينة، أو اسم/رقم عضوية المتطوع..."
          className="w-full pr-10 pl-4 py-2.5 text-xs rounded-2xl border border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426] text-[#071C43] dark:text-white"
        />
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Teams List */}
      <div className="space-y-4">
        {filteredTeams.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border border-dashed border-slate-300 dark:border-[#1E3B68] text-slate-400 text-xs font-bold">
            {loading ? "جاري تحميل بيانات الفرق التطوعية..." : "لا توجد فرق مطابقة للبحث."}
          </div>
        ) : (
          filteredTeams.map((team) => {
            const isExpanded = Boolean(expandedTeamIds[team.id]);
            return (
              <div
                key={team.id}
                className="rounded-3xl border border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426] overflow-hidden shadow-2xs"
              >
                {/* Team Card Header */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-[#1E3B68]">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={
                        team.logoUrl ||
                        "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=200&h=200&fit=crop"
                      }
                      alt={team.nameAr}
                      className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-[#071C43] dark:text-white">
                          {team.nameAr}
                        </h4>
                        {team.nameEn && (
                          <span className="text-[11px] font-mono text-slate-400">
                            ({team.nameEn})
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {team.membersCount} عضو
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        القائد: <strong className="text-[#0754C7] dark:text-blue-300">{team.leaderName}</strong>
                        {team.leaderPhone ? ` • ${team.leaderPhone}` : ""}
                        {team.city ? ` • ${team.city}` : ""}
                      </p>
                      {team.leaderLicenseUrl && (
                        <a
                          href={team.leaderLicenseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded-lg mt-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>
                            رخصة قائد الفريق ({team.leaderLicenseName || "عرض المرفق"})
                          </span>
                        </a>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(team.id)}
                    className="self-start lg:self-center px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-[#0E2447] text-[#0754C7] dark:text-blue-200 text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>إخفاء الأعضاء ({team.membersCount})</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>عرض الأعضاء والمواثيق ({team.membersCount})</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Vision / Mission / Goals Bilingual Summary */}
                {(team.visionAr || team.missionAr || team.goalsAr || team.visionEn || team.missionEn || team.goalsEn) && (
                  <div className="p-4 bg-slate-50/70 dark:bg-[#0A1A36]/60 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs border-b border-slate-100 dark:border-[#1E3B68]">
                    <div>
                      <span className="text-[10px] font-black text-[#0754C7] block mb-0.5">
                        الرؤية (Vision)
                      </span>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {team.visionAr || "—"}
                      </p>
                      {team.visionEn && (
                        <p dir="ltr" className="text-[11px] text-slate-400 mt-1 text-left">
                          {team.visionEn}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-700 block mb-0.5">
                        الرسالة (Mission)
                      </span>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {team.missionAr || "—"}
                      </p>
                      {team.missionEn && (
                        <p dir="ltr" className="text-[11px] text-slate-400 mt-1 text-left">
                          {team.missionEn}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-indigo-700 block mb-0.5">
                        الأهداف (Goals)
                      </span>
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {team.goalsAr || "—"}
                      </p>
                      {team.goalsEn && (
                        <p dir="ltr" className="text-[11px] text-slate-400 mt-1 text-left">
                          {team.goalsEn}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Members Roster */}
                {isExpanded && (
                  <div className="p-4 overflow-x-auto">
                    {team.members.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold text-center py-4">
                        لا يوجد متطوعون مسجلون حالياً في هذا الفريق.
                      </p>
                    ) : (
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="text-slate-500 border-b border-slate-200 dark:border-[#1E3B68] font-black">
                            <th className="p-2.5">المتطوع</th>
                            <th className="p-2.5">رقم العضوية / الملف</th>
                            <th className="p-2.5">حالة الحساب والملف</th>
                            <th className="p-2.5">حالة ميثاق التطوع</th>
                            <th className="p-2.5">اعتماد القائد</th>
                            <th className="p-2.5 text-center">الميثاق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#1E3B68]/50">
                          {team.members.map((m) => {
                            const chMeta = m.charter
                              ? getCharterStatusMeta(m.charter.status)
                              : null;
                            return (
                              <tr key={m.id}>
                                <td className="p-2.5">
                                  <strong className="font-bold text-[#071C43] dark:text-white block">
                                    {m.name}
                                  </strong>
                                  <span className="text-[10px] text-slate-400">
                                    {m.phone || m.email || "—"}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300">
                                  {m.membershipNumber}
                                  {m.fileNumber ? ` / ${m.fileNumber}` : ""}
                                </td>
                                <td className="p-2.5">
                                  {m.status === "awaiting_profile_completion" ||
                                  !m.profileCompleted ? (
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                      بانتظار استكمال البيانات
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      نشط ومستكمل ✓
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  {chMeta ? (
                                    <span
                                      className={`inline-flex px-2 py-0.5 rounded-lg border text-[10px] font-black ${chMeta.badgeClass}`}
                                    >
                                      {chMeta.labelAr}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">
                                      لا يوجد ميثاق
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-[11px] font-mono text-slate-500">
                                  {m.charter?.leaderApprovedAt
                                    ? new Date(
                                        m.charter.leaderApprovedAt
                                      ).toLocaleDateString("ar-SA")
                                    : "—"}
                                </td>
                                <td className="p-2.5 text-center">
                                  {m.charter ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenCharter(m.charter!.id)
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0754C7] text-[11px] font-bold cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>عرض</span>
                                    </button>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Manual Volunteer Add Modal */}
      {showManualModal && (
        <div
          className="fixed inset-0 z-[1150] flex items-center justify-center p-4 bg-[#071C43]/75 backdrop-blur-xs"
          onClick={() => setShowManualModal(false)}
        >
          <form
            onSubmit={handleManualCreateSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0B1B34] rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-[#1E3B68] shadow-2xl text-right"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3B68] pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-[#071C43] dark:text-white">
                  إضافة متطوع يدوياً (ببيانات أولية)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              سيقوم النظام بتوليد كلمة مرور مؤقتة عشوائية وقوية خاصة بهذا المتطوع فقط، وإنشاء ميثاق التطوع الإلكتروني له، وتمكينه من استكمال بياناته بنفسه عند الدخول.
            </p>

            {manualError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {manualError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  الاسم الكامل *
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="مثال: عبدالعزيز محمد السلمي"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#081426]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    رقم الهوية / الإقامة
                  </label>
                  <input
                    type="text"
                    value={manualNationalId}
                    onChange={(e) => setManualNationalId(e.target.value)}
                    placeholder="10xxxxxxxx"
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#081426] font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    رقم الجوال *
                  </label>
                  <input
                    type="tel"
                    required
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#081426] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="volunteer@example.com"
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#081426]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    الفريق التطوعي *
                  </label>
                  <select
                    value={manualTeamId}
                    onChange={(e) => setManualTeamId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#081426]"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nameAr}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    الجنس
                  </label>
                  <select
                    value={manualGender}
                    onChange={(e) =>
                      setManualGender(e.target.value as "male" | "female")
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#081426]"
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  المسمى التطوعي
                </label>
                <input
                  type="text"
                  value={manualTitleAr}
                  onChange={(e) => setManualTitleAr(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#081426]"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={creatingVol}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
              >
                {creatingVol ? "جاري الإنشاء..." : "إنشاء المتطوع وتوليد كلمة المرور"}
              </button>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* One-Time Generated Temporary Password Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-[#071C43]/80 backdrop-blur-sm">
          <div
            className="bg-white dark:bg-[#0B1B34] rounded-3xl max-w-md w-full p-6 space-y-4 border border-emerald-200 dark:border-emerald-800 shadow-2xl text-right"
            dir="rtl"
          >
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
              <KeyRound className="w-5 h-5" />
              <h3 className="text-sm font-black">
                تم إنشاء المتطوع وكلمة المرور المؤقتة بنجاح
              </h3>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] space-y-2 text-xs">
              <p>
                الاسم: <strong>{createdCredentials.name}</strong>
              </p>
              <p>
                الفريق: <strong>{createdCredentials.teamName}</strong>
              </p>
              <p>
                رقم العضوية:{" "}
                <strong className="font-mono">{createdCredentials.membershipNumber}</strong>
              </p>
              <p>
                معرف الدخول (الهوية / الجوال / البريد):{" "}
                <strong className="font-mono">
                  {createdCredentials.nationalId ||
                    createdCredentials.phone ||
                    createdCredentials.email}
                </strong>
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-[#1E3B68]">
                <span className="text-[11px] font-bold text-rose-700 block mb-1">
                  كلمة المرور المؤقتة الفريدة (تظهر لمرة واحدة فقط):
                </span>
                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-[#0B1B34] border border-emerald-300">
                  <code
                    dir="ltr"
                    className="text-sm font-black text-emerald-700 dark:text-emerald-300 select-all"
                  >
                    {createdCredentials.temporaryPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(
                        `بيانات الدخول للمتطوع ${createdCredentials.name}\nالمعرف: ${
                          createdCredentials.nationalId ||
                          createdCredentials.phone ||
                          createdCredentials.email
                        }\nكلمة المرور المؤقتة: ${createdCredentials.temporaryPassword}`
                      );
                      setCopiedCred(true);
                      setTimeout(() => setCopiedCred(false), 2500);
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedCred ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-bold flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                لا يتم تخزين كلمة المرور هذه بصيغتها النصية في قاعدة البيانات؛ يرجى تزويد المتطوع بها ليتمكن من تغييرها فوراً واستكمال ملفه وتوقيع الميثاق.
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCreatedCredentials(null)}
              className="w-full py-2.5 rounded-xl bg-[#071C43] text-white text-xs font-black cursor-pointer"
            >
              فهمت، إغلاق النافذة
            </button>
          </div>
        </div>
      )}

      {activeCharterModal && (
        <VolunteerCharterModal
          charter={activeCharterModal}
          viewerRole={viewerRole}
          lang={lang}
          onClose={() => setActiveCharterModal(null)}
          onUpdated={() => {
            loadOverview();
            onRefreshDatabase?.();
          }}
        />
      )}
    </div>
  );
};
