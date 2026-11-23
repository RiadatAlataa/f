import React, { useState, useEffect } from "react";
import {
  X,
  FileCheck2,
  Printer,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Plus,
  History,
  AlertCircle,
  ShieldCheck,
  PenLine,
  Building2
} from "lucide-react";
import type { VolunteerCharter, VolunteerCharterStatus } from "../types";
import { buildApiUrl, getAuthHeaders } from "../config/api";

interface VolunteerCharterModalProps {
  charter: VolunteerCharter;
  viewerRole: "volunteer" | "leader" | "admin" | "department_admin";
  lang?: "ar" | "en";
  onClose: () => void;
  onUpdated?: (updatedCharter: VolunteerCharter) => void;
}

export const getCharterStatusMeta = (status: VolunteerCharterStatus | string) => {
  switch (status) {
    case "awaiting_volunteer_signature":
      return {
        labelAr: "بانتظار توقيع المتطوع",
        labelEn: "Awaiting Volunteer Signature",
        badgeClass:
          "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/70"
      };
    case "volunteer_signed":
    case "awaiting_leader_approval":
      return {
        labelAr: "بانتظار اعتماد قائد الفريق",
        labelEn: "Awaiting Leader Approval",
        badgeClass:
          "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800/70"
      };
    case "approved_by_leader":
      return {
        labelAr: "معتمد من قائد الفريق (مقفل)",
        labelEn: "Approved by Team Leader (Locked)",
        badgeClass:
          "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/70"
      };
    case "rejected":
      return {
        labelAr: "مرفوض مع توضيح السبب",
        labelEn: "Rejected with Reason",
        badgeClass:
          "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/70"
      };
    default:
      return {
        labelAr: "قيد المراجعة",
        labelEn: "In Review",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200"
      };
  }
};

export const VolunteerCharterModal: React.FC<VolunteerCharterModalProps> = ({
  charter: initialCharter,
  viewerRole,
  lang = "ar",
  onClose,
  onUpdated
}) => {
  const [charter, setCharter] = useState<VolunteerCharter>(initialCharter);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number>(
    initialCharter.currentVersion || 1
  );
  const [agreed, setAgreed] = useState<boolean>(false);
  const [signatureName, setSignatureName] = useState<string>(
    initialCharter.volunteerName || ""
  );
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [leaderNotes, setLeaderNotes] = useState<string>("");
  const [showRejectBox, setShowRejectBox] = useState<boolean>(false);
  const [showNewVersionBox, setShowNewVersionBox] = useState<boolean>(false);
  const [newVerTitleAr, setNewVerTitleAr] = useState<string>("");
  const [newVerNotes, setNewVerNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setCharter(initialCharter);
    setSelectedVersionNum(initialCharter.currentVersion || 1);
    setSignatureName(initialCharter.volunteerName || "");
  }, [initialCharter]);

  const activeVersion =
    (charter.versions || []).find((v) => v.version === selectedVersionNum) ||
    charter.versions?.[charter.versions.length - 1];
  const isViewingLatest = selectedVersionNum === charter.currentVersion;
  const isLocked = Boolean(
    charter.locked || charter.status === "approved_by_leader" || activeVersion?.locked
  );
  const statusMeta = getCharterStatusMeta(
    activeVersion?.status || charter.status
  );

  const canVolunteerSign =
    viewerRole === "volunteer" &&
    isViewingLatest &&
    !charter.locked &&
    charter.status !== "approved_by_leader" &&
    (charter.status === "awaiting_volunteer_signature" ||
      charter.status === "rejected");

  const canLeaderAct =
    (viewerRole === "leader" ||
      viewerRole === "admin" ||
      viewerRole === "department_admin") &&
    isViewingLatest &&
    !charter.locked &&
    charter.status !== "approved_by_leader";

  const canIssueNewVersion =
    (viewerRole === "admin" || viewerRole === "department_admin") &&
    isViewingLatest;

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return iso;
    }
  };

  const handleVolunteerSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!agreed) {
      setFeedback({
        type: "error",
        text: "يرجى تحديد مربع الموافقة الصريحة على بنود ميثاق التطوع قبل التوقيع."
      });
      return;
    }
    if (signatureName.trim().length < 2) {
      setFeedback({
        type: "error",
        text: "يرجى كتابة الاسم الكامل للتوقيع الإلكتروني."
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        buildApiUrl(`/api/volunteer-charters/${charter.id}/volunteer-sign`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "same-origin",
          body: JSON.stringify({
            agreed: true,
            signatureName: signatureName.trim()
          })
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.charter) {
        setFeedback({
          type: "error",
          text: json.error || "تعذر إتمام التوقيع الإلكتروني."
        });
        return;
      }
      setCharter(json.charter);
      setSelectedVersionNum(json.charter.currentVersion);
      setFeedback({
        type: "success",
        text:
          json.message ||
          "تم توقيع ميثاق التطوع إلكترونياً وإرساله لاعتماد قائد الفريق."
      });
      onUpdated?.(json.charter);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "حدث خطأ أثناء الاتصال بالخادم."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLeaderAction = async (action: "approve" | "reject") => {
    setFeedback(null);
    if (action === "reject" && !rejectionReason.trim()) {
      setFeedback({
        type: "error",
        text: "يرجى كتابة سبب الرفض أو التعديل المطلوب من المتطوع."
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        buildApiUrl(`/api/volunteer-charters/${charter.id}/leader-action`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "same-origin",
          body: JSON.stringify({
            action,
            rejectionReason:
              action === "reject" ? rejectionReason.trim() : undefined,
            notes: leaderNotes.trim() || undefined
          })
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.charter) {
        setFeedback({
          type: "error",
          text: json.error || "تعذر حفظ قرار القائد."
        });
        return;
      }
      setCharter(json.charter);
      setShowRejectBox(false);
      setRejectionReason("");
      setFeedback({
        type: "success",
        text: json.message || "تم تحديث حالة الميثاق بنجاح."
      });
      onUpdated?.(json.charter);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "حدث خطأ أثناء الاتصال بالخادم."
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleIssueNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        buildApiUrl(`/api/volunteer-charters/${charter.id}/new-version`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          credentials: "same-origin",
          body: JSON.stringify({
            titleAr: newVerTitleAr.trim() || undefined,
            notes: newVerNotes.trim() || undefined
          })
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.charter) {
        setFeedback({
          type: "error",
          text: json.error || "تعذر إصدار نسخة جديدة للميثاق."
        });
        return;
      }
      setCharter(json.charter);
      setSelectedVersionNum(json.charter.currentVersion);
      setShowNewVersionBox(false);
      setNewVerTitleAr("");
      setNewVerNotes("");
      setAgreed(false);
      setFeedback({
        type: "success",
        text:
          json.message ||
          "تم إصدار نسخة جديدة من الميثاق مع الاحتفاظ بالنسخ الموقعة السابقة."
      });
      onUpdated?.(json.charter);
    } catch (err: any) {
      setFeedback({
        type: "error",
        text: err?.message || "حدث خطأ أثناء الاتصال بالخادم."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-4 bg-[#071C43]/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[93vh] flex flex-col bg-white dark:bg-[#0B1B34] rounded-3xl shadow-2xl border border-slate-200 dark:border-[#1E3B68] overflow-hidden"
      >
        {/* Header Bar (No-print controls + Title) */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#071C43] via-[#0B2A63] to-[#0754C7] text-white flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white">
                  ميثاق التطوع الإلكتروني
                </h2>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white/15 text-blue-100 border border-white/20">
                  {charter.charterNumber}
                </span>
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-100 border border-emerald-400/30">
                  الإصدار v{selectedVersionNum}
                </span>
              </div>
              <p className="text-[11px] text-blue-100/85 mt-0.5 truncate">
                {charter.volunteerName} — {charter.teamNameAr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-white text-[#071C43] hover:bg-blue-50 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="طباعة أو تصدير الميثاق كملف PDF"
            >
              <Printer className="w-4 h-4 text-[#0754C7]" />
              <span className="hidden sm:inline">طباعة / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto text-right">
          {/* Official Printable Letterhead */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-[#0754C7]/20 bg-gradient-to-br from-[#F6F9FF] to-white dark:from-[#0E2244] dark:to-[#091830] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#1E3B68] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0754C7]/10 text-[#0754C7] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-sm font-black text-[#071C43] dark:text-white block">
                    {charter.associationNameAr}
                  </strong>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {activeVersion?.titleAr ||
                      `ميثاق التطوع الإلكتروني - الإصدار (${selectedVersionNum})`}
                  </span>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-black self-start sm:self-center ${statusMeta.badgeClass}`}
              >
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
                <span>{statusMeta.labelAr}</span>
              </span>
            </div>

            {/* Charter Parties Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#081426] border border-slate-200/80 dark:border-[#1E3B68]">
                <span className="text-[10px] text-slate-500 block">اسم المتطوع</span>
                <strong className="font-black text-[#071C43] dark:text-white block mt-0.5">
                  {charter.volunteerName}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#081426] border border-slate-200/80 dark:border-[#1E3B68]">
                <span className="text-[10px] text-slate-500 block">الفريق التطوعي</span>
                <strong className="font-black text-[#0754C7] dark:text-blue-300 block mt-0.5">
                  {charter.teamNameAr}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#081426] border border-slate-200/80 dark:border-[#1E3B68]">
                <span className="text-[10px] text-slate-500 block">قائد الفريق</span>
                <strong className="font-black text-[#071C43] dark:text-white block mt-0.5">
                  {charter.leaderName}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#081426] border border-slate-200/80 dark:border-[#1E3B68]">
                <span className="text-[10px] text-slate-500 block">تاريخ الإنشاء / القبول</span>
                <strong className="font-mono font-bold text-slate-700 dark:text-slate-200 block mt-0.5 tabular-nums">
                  {formatDate(charter.acceptanceDate)}
                </strong>
              </div>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border no-print ${
                feedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* Rejection Alert Banner if rejected */}
          {(activeVersion?.status === "rejected" || charter.status === "rejected") &&
            (activeVersion?.rejectionReason || charter.rejectionReason) && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/70 space-y-1">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-black text-xs">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>سبب رفض / ملاحظة قائد الفريق على هذا الميثاق:</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                  {activeVersion?.rejectionReason || charter.rejectionReason}
                </p>
              </div>
            )}

          {/* Version History Switcher */}
          {(charter.versions || []).length > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] no-print">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <History className="w-4 h-4 text-[#0754C7]" />
                <span>سجل إصدارات الميثاق (تُحفظ الإصدارات السابقة بأرشيف التوقيعات):</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {charter.versions.map((ver) => (
                  <button
                    key={ver.version}
                    type="button"
                    onClick={() => setSelectedVersionNum(ver.version)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer border ${
                      selectedVersionNum === ver.version
                        ? "bg-[#0754C7] text-white border-[#0754C7]"
                        : "bg-white dark:bg-[#0E2447] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#244577]"
                    }`}
                  >
                    الإصدار {ver.version}
                    {ver.status === "approved_by_leader" ? " ✓" : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Charter Clauses */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-[#071C43] dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>بنود والتزامات ميثاق التطوع الإلكتروني</span>
            </h3>
            <div className="space-y-2.5">
              {(activeVersion?.clauses || []).map((clause, idx) => (
                <div
                  key={clause.id || idx}
                  className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-[#081426] border border-slate-200/80 dark:border-[#1E3B68] space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#0754C7] text-white text-[11px] font-black flex items-center justify-center shrink-0 tabular-nums">
                      {clause.order || idx + 1}
                    </span>
                    <strong className="text-xs font-black text-[#071C43] dark:text-white">
                      {clause.titleAr}
                    </strong>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pr-8">
                    {clause.bodyAr}
                  </p>
                  {clause.bodyEn && (
                    <p
                      dir="ltr"
                      className="text-[11px] text-slate-400 dark:text-slate-400 leading-relaxed pr-8 text-left"
                    >
                      {clause.bodyEn}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Dual Signatures Verification Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Volunteer Signature Box */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#071C43] dark:text-white">
                  توقيع المتطوع الإلكتروني
                </span>
                {activeVersion?.volunteerSignedAt ? (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    تم التوقيع ✓
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    بانتظار التوقيع
                  </span>
                )}
              </div>
              <div className="text-xs space-y-1">
                <p className="text-slate-600 dark:text-slate-300">
                  الاسم الموقّع:{" "}
                  <strong className="text-[#071C43] dark:text-white">
                    {activeVersion?.volunteerSignatureName || "—"}
                  </strong>
                </p>
                <p className="text-slate-500 text-[11px] font-mono tabular-nums">
                  تاريخ التوقيع: {formatDate(activeVersion?.volunteerSignedAt)}
                </p>
              </div>
            </div>

            {/* Team Leader Approval Box */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#1E3B68] bg-white dark:bg-[#081426] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#071C43] dark:text-white">
                  اعتماد قائد الفريق
                </span>
                {activeVersion?.status === "approved_by_leader" ? (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    معتمد ومقفل
                  </span>
                ) : activeVersion?.status === "rejected" ? (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    مرفوض
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    بانتظار الاعتماد
                  </span>
                )}
              </div>
              <div className="text-xs space-y-1">
                <p className="text-slate-600 dark:text-slate-300">
                  القائد المعتمد:{" "}
                  <strong className="text-[#071C43] dark:text-white">
                    {activeVersion?.leaderName || charter.leaderName}
                  </strong>
                </p>
                <p className="text-slate-500 text-[11px] font-mono tabular-nums">
                  تاريخ الاعتماد: {formatDate(activeVersion?.leaderApprovedAt)}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Volunteer Signing Section (Hidden if locked or approved) */}
          {canVolunteerSign && (
            <form
              onSubmit={handleVolunteerSign}
              className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/70 space-y-3 no-print"
            >
              <div className="flex items-center gap-2 text-xs font-black text-[#071C43] dark:text-white">
                <PenLine className="w-4 h-4 text-[#0754C7]" />
                <span>التوقيع الإلكتروني للمتطوع وإرساله لاعتماد القائد</span>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#0754C7] rounded cursor-pointer"
                />
                <span>
                  أقرّ بأنني اطلعت على جميع بنود ميثاق التطوع الإلكتروني وأوافق عليها وألتزم بها أمام جمعية ريادة العطاء لخدمة الإنسان بالعسيلة.
                </span>
              </label>

              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                    اكتب اسمك الكامل للتوقيع الإلكتروني:
                  </label>
                  <input
                    type="text"
                    required
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="مثال: خالد بن عبدالله العسيري"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-[#081426] text-[#071C43] dark:text-white font-bold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#0754C7] hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? "جاري التوقيع..." : "توقيع وإرسال للقائد"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Locked Notification after Leader Approval */}
          {isLocked && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  هذا الإصدار من الميثاق معتمد ومقفل نهائياً من قائد الفريق؛ لا يمكن تعديله أو إعادة توقيعه، ويمكنك استعراضه وطباعته بصيغة PDF.
                </span>
              </div>
            </div>
          )}

          {/* Interactive Leader Approve / Reject Controls */}
          {canLeaderAct && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] space-y-3 no-print">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <strong className="text-xs font-black text-[#071C43] dark:text-white">
                  إجراءات قائد الفريق لاعتماد الميثاق
                </strong>
                {!charter.volunteerSignedAt && (
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    بانتظار توقيع المتطوع قبل الاعتماد النهائي
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 block">
                  ملاحظات الاعتماد (اختياري):
                </label>
                <input
                  type="text"
                  value={leaderNotes}
                  onChange={(e) => setLeaderNotes(e.target.value)}
                  placeholder="أي ملاحظات توثيقية ترفق مع اعتماد الميثاق..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#0B1B34] text-[#071C43] dark:text-white"
                />
              </div>

              {showRejectBox && (
                <div className="space-y-2 p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200">
                  <label className="text-[11px] font-bold text-rose-800 dark:text-rose-200 block">
                    سبب الرفض أو التعديل المطلوب (إلزامي عند الرفض):
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="اكتب السبب بوضوح ليتم إشعار المتطوع..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-rose-200 bg-white dark:bg-[#081426] text-slate-800 dark:text-white"
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={submitting || !charter.volunteerSignedAt}
                  onClick={() => handleLeaderAction("approve")}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>اعتماد الميثاق نهائياً</span>
                </button>
                {!showRejectBox ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setShowRejectBox(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض مع توضيح السبب</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleLeaderAction("reject")}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>تأكيد الرفض وإرسال السبب</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Admin / Volunteer Dept: Issue New Version (Preserves all signed past versions) */}
          {canIssueNewVersion && (
            <div className="pt-2 border-t border-slate-200 dark:border-[#1E3B68] no-print">
              {!showNewVersionBox ? (
                <button
                  type="button"
                  onClick={() => setShowNewVersionBox(true)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#13294B] text-[#071C43] dark:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#0754C7]" />
                  <span>إصدار نسخة محدثة جديدة من الميثاق (مع حفظ النسخ السابقة)</span>
                </button>
              ) : (
                <form
                  onSubmit={handleIssueNewVersion}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-black text-[#071C43] dark:text-white">
                      إصدار نسخة جديدة (الإصدار {(charter.versions?.length || 1) + 1})
                    </strong>
                    <button
                      type="button"
                      onClick={() => setShowNewVersionBox(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    ستبقى جميع النسخ السابقة وتوقيعاتها واعتماداتها محفوظة بأرشيف الميثاق دون أي حذف أو تغيير.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newVerTitleAr}
                      onChange={(e) => setNewVerTitleAr(e.target.value)}
                      placeholder="عنوان الإصدار الجديد (اختياري)..."
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#0B1B34]"
                    />
                    <input
                      type="text"
                      value={newVerNotes}
                      onChange={(e) => setNewVerNotes(e.target.value)}
                      placeholder="سبب التحديث أو الملاحظة..."
                      className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#0B1B34]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-[#0754C7] hover:bg-blue-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? "جاري الإصدار..." : "تأكيد وإصدار النسخة الجديدة"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
