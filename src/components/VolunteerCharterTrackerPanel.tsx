import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileCheck2,
  Search,
  RefreshCw,
  Eye,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  PenLine
} from "lucide-react";
import type { VolunteerCharter, VolunteerCharterStatus } from "../types";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import {
  VolunteerCharterModal,
  getCharterStatusMeta
} from "./VolunteerCharterModal";

interface VolunteerCharterTrackerPanelProps {
  mode: "leader" | "admin" | "department_admin";
  teamId?: string;
  initialCharters?: VolunteerCharter[];
  lang?: "ar" | "en";
  onRefreshDatabase?: () => void;
}

export const VolunteerCharterTrackerPanel: React.FC<
  VolunteerCharterTrackerPanelProps
> = ({ mode, teamId, initialCharters, lang = "ar", onRefreshDatabase }) => {
  const [charters, setCharters] = useState<VolunteerCharter[]>(
    Array.isArray(initialCharters) ? initialCharters : []
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCharter, setSelectedCharter] =
    useState<VolunteerCharter | null>(null);

  const loadCharters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl("/api/volunteer-charters"), {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "same-origin"
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "تعذر تحميل سجلات ميثاق التطوع.");
        return;
      }
      if (Array.isArray(json.charters)) {
        setCharters(json.charters);
      }
    } catch (err: any) {
      setError(err?.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharters();
  }, [loadCharters]);

  const scopedCharters = useMemo(() => {
    if (mode === "leader" && teamId) {
      return charters.filter((c) => c.teamId === teamId);
    }
    return charters;
  }, [charters, mode, teamId]);

  const counts = useMemo(() => {
    return {
      all: scopedCharters.length,
      awaiting_volunteer_signature: scopedCharters.filter(
        (c) => c.status === "awaiting_volunteer_signature"
      ).length,
      awaiting_leader_approval: scopedCharters.filter(
        (c) =>
          c.status === "awaiting_leader_approval" ||
          c.status === "volunteer_signed"
      ).length,
      approved_by_leader: scopedCharters.filter(
        (c) => c.status === "approved_by_leader"
      ).length,
      rejected: scopedCharters.filter((c) => c.status === "rejected").length
    };
  }, [scopedCharters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedCharters.filter((c) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "awaiting_leader_approval"
          ? c.status === "awaiting_leader_approval" ||
            c.status === "volunteer_signed"
          : c.status === statusFilter);
      if (!matchesStatus) return false;
      if (!q) return true;
      return (
        (c.volunteerName || "").toLowerCase().includes(q) ||
        (c.teamNameAr || "").toLowerCase().includes(q) ||
        (c.charterNumber || "").toLowerCase().includes(q) ||
        (c.volunteerNationalId || "").toLowerCase().includes(q)
      );
    });
  }, [scopedCharters, statusFilter, search]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-5 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0754C7]/10 text-[#0754C7] flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white">
              لوحة متابعة ميثاق التطوع الإلكتروني
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {mode === "leader"
                ? "متابعة وتوقيع واعتماد مواثيق التطوع لأعضاء فريقك التطوعي فقط"
                : "المتابعة الشاملة لحالة توقيعات المتطوعين واعتمادات قادة الفرق وإصدارات المواثيق"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadCharters}
          disabled={loading}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0E2447] dark:hover:bg-[#163466] text-xs font-bold text-[#071C43] dark:text-white flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter("awaiting_volunteer_signature")}
          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
            statusFilter === "awaiting_volunteer_signature"
              ? "border-amber-400 bg-amber-50/70 dark:bg-amber-950/30"
              : "border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426]"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
            <span>بانتظار توقيع المتطوع</span>
            <PenLine className="w-4 h-4" />
          </div>
          <strong className="text-xl font-black text-[#071C43] dark:text-white font-mono mt-1 block tabular-nums">
            {counts.awaiting_volunteer_signature}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("awaiting_leader_approval")}
          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
            statusFilter === "awaiting_leader_approval"
              ? "border-blue-400 bg-blue-50/70 dark:bg-blue-950/30"
              : "border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426]"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-[#0754C7] dark:text-blue-300 font-bold">
            <span>بانتظار اعتماد القائد</span>
            <Clock className="w-4 h-4" />
          </div>
          <strong className="text-xl font-black text-[#071C43] dark:text-white font-mono mt-1 block tabular-nums">
            {counts.awaiting_leader_approval}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("approved_by_leader")}
          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
            statusFilter === "approved_by_leader"
              ? "border-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30"
              : "border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426]"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold">
            <span>معتمد من قائد الفريق</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <strong className="text-xl font-black text-[#071C43] dark:text-white font-mono mt-1 block tabular-nums">
            {counts.approved_by_leader}
          </strong>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("rejected")}
          className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
            statusFilter === "rejected"
              ? "border-rose-400 bg-rose-50/70 dark:bg-rose-950/30"
              : "border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426]"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold">
            <span>مرفوض / ملاحظات</span>
            <XCircle className="w-4 h-4" />
          </div>
          <strong className="text-xl font-black text-[#071C43] dark:text-white font-mono mt-1 block tabular-nums">
            {counts.rejected}
          </strong>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: `الكل (${counts.all})` },
            {
              id: "awaiting_volunteer_signature",
              label: `بانتظار المتطوع (${counts.awaiting_volunteer_signature})`
            },
            {
              id: "awaiting_leader_approval",
              label: `بانتظار القائد (${counts.awaiting_leader_approval})`
            },
            {
              id: "approved_by_leader",
              label: `معتمد (${counts.approved_by_leader})`
            },
            { id: "rejected", label: `مرفوض (${counts.rejected})` }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer border transition-all ${
                statusFilter === tab.id
                  ? "bg-[#0754C7] text-white border-[#0754C7]"
                  : "bg-slate-50 dark:bg-[#081426] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#1E3B68]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المتطوع، الفريق، أو رقم الميثاق..."
            className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426] text-[#071C43] dark:text-white"
          />
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 dark:border-[#1E3B68] rounded-2xl bg-white dark:bg-[#081426]">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#0E2447] text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-[#1E3B68] font-black">
              <th className="p-3">رقم الميثاق</th>
              <th className="p-3">اسم المتطوع</th>
              <th className="p-3">الفريق التطوعي</th>
              <th className="p-3">تاريخ القبول</th>
              <th className="p-3">توقيع المتطوع</th>
              <th className="p-3">اعتماد قائد الفريق</th>
              <th className="p-3">الحالة الحالية</th>
              <th className="p-3 text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1E3B68]/60">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-slate-400 text-xs font-bold"
                >
                  {loading
                    ? "جاري تحميل سجلات ميثاق التطوع..."
                    : "لا توجد مواثيق تطوع مطابقة للبحث أو الفلتر المحدد."}
                </td>
              </tr>
            ) : (
              filtered.map((ch) => {
                const meta = getCharterStatusMeta(ch.status as VolunteerCharterStatus);
                return (
                  <tr
                    key={ch.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-[#0E2447]/40 transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-[#0754C7] dark:text-blue-300 whitespace-nowrap">
                      {ch.charterNumber}
                      <span className="block text-[10px] text-slate-400">
                        v{ch.currentVersion}
                      </span>
                    </td>
                    <td className="p-3">
                      <strong className="font-bold text-[#071C43] dark:text-white block">
                        {ch.volunteerName}
                      </strong>
                      {ch.volunteerMembershipNumber && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {ch.volunteerMembershipNumber}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-200">
                      {ch.teamNameAr}
                    </td>
                    <td className="p-3 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDate(ch.acceptanceDate)}
                    </td>
                    <td className="p-3">
                      {ch.volunteerSignedAt ? (
                        <div>
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                            تم التوقيع ✓
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                            {formatDate(ch.volunteerSignedAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-600">
                          لم يوقع بعد
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {ch.leaderApprovedAt ? (
                        <div>
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                            تم الاعتماد ✓
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                            {formatDate(ch.leaderApprovedAt)}
                          </span>
                        </div>
                      ) : ch.status === "rejected" ? (
                        <span className="text-[11px] font-bold text-rose-600">
                          مرفوض
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          بانتظار القائد
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black ${meta.badgeClass}`}
                      >
                        {meta.labelAr}
                      </span>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedCharter(ch)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0754C7] hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {mode === "leader" &&
                          ch.status === "awaiting_leader_approval"
                            ? "مراجعة واعتماد"
                            : "عرض وطباعة"}
                        </span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedCharter && (
        <VolunteerCharterModal
          charter={selectedCharter}
          viewerRole={mode}
          lang={lang}
          onClose={() => setSelectedCharter(null)}
          onUpdated={(updated) => {
            setCharters((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
            setSelectedCharter(updated);
            onRefreshDatabase?.();
          }}
        />
      )}
    </div>
  );
};
