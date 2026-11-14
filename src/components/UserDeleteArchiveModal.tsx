import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Lock,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UserX,
  X
} from "lucide-react";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import {
  ROLE_LABELS_AR,
  SystemUser,
  UserDependenciesInfo,
  UserManagementScope
} from "./userManagementTypes";

interface UserDeleteArchiveModalProps {
  user: SystemUser;
  scope?: UserManagementScope | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export const UserDeleteArchiveModal: React.FC<UserDeleteArchiveModalProps> = ({
  user,
  scope,
  onClose,
  onSuccess
}) => {
  const targetUserId = user.userId || user.id;

  const [isLoadingDeps, setIsLoadingDeps] = useState(true);
  const [deps, setDeps] = useState<UserDependenciesInfo | null>(null);
  const [isSelf, setIsSelf] = useState(false);

  const [actionType, setActionType] = useState<"archive" | "deactivate" | "permanent_delete">("archive");
  const [reason, setReason] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoadingDeps(true);
      try {
        const res = await fetch(buildApiUrl(`/api/db/users/${encodeURIComponent(targetUserId)}`), {
          headers: { Accept: "application/json", ...getAuthHeaders() },
          cache: "no-store"
        });
        const data = await res.json().catch(() => null);
        if (active && res.ok && data) {
          setDeps(data.dependencies || null);
          setIsSelf(Boolean(data.isSelf));
          if (data.dependencies?.hasLinkedRecords) {
            setActionType("archive");
          }
        }
      } catch {
        // Keep safe defaults
      } finally {
        if (active) setIsLoadingDeps(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [targetUserId]);

  const canFullAccess = scope?.fullAccess !== false;
  const isBlockedBySelfOrLastAdmin = isSelf || Boolean(deps?.isLastActiveAdmin);
  const hasOpenCustodies = Boolean(deps && deps.openCustodiesCount > 0);
  const canPermanentDelete = Boolean(
    canFullAccess &&
    !isBlockedBySelfOrLastAdmin &&
    !hasOpenCustodies &&
    deps?.canPermanentDelete &&
    !["admin-user", "ops-manager", "mosa", "perm-mosa", "sup-1"].includes(targetUserId)
  );

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isBlockedBySelfOrLastAdmin) {
      setError(
        isSelf
          ? "لا يمكنك حذف أو تعطيل أو أرشفة حسابك الشخصي أثناء تسجيل الدخول."
          : "لا يمكن حذف أو تعطيل آخر حساب مدير عام (Super Admin) نشط في النظام."
      );
      return;
    }

    if (hasOpenCustodies && (actionType === "archive" || actionType === "permanent_delete")) {
      setError("توجد عهد مفتوحة غير مسترجعة مسجلة على هذا المستخدم. يجب استرجاع وتسوية العهد أولاً.");
      return;
    }

    if (!reason.trim()) {
      setError("يرجى إدخال سبب الإجراء لتوثيقه في سجل التدقيق.");
      return;
    }

    if (!confirmChecked) {
      setError("يرجى تأكيد الموافقة على تنفيذ الإجراء المختار.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(buildApiUrl("/api/db/users/archive-or-delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          userId: targetUserId,
          actionType,
          reason: reason.trim()
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "تعذر تنفيذ الإجراء على حساب المستخدم.");
      }
      onSuccess(data.message || `تم تنفيذ الإجراء على حساب (${user.name}) بنجاح.`);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء معالجة الطلب.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-rose-900 via-rose-800 to-slate-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center text-rose-200">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black">إدارة حذف / أرشفة / تعطيل المستخدم</h2>
              <p className="text-xs text-rose-100/90">حماية السجلات التاريخية والعهد قبل اتخاذ أي إجراء</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* User Identity Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">اسم المستخدم:</span>
              <strong className="text-slate-900 dark:text-white">{user.name}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">رقم الملف / العضوية:</span>
              <strong className="font-mono text-emerald-700 dark:text-emerald-400">
                #{user.beneficiaryNumber || user.membershipNumber || user.employeeNumber || user.fileNumber || user.id}
              </strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">نوع الحساب / الدور:</span>
              <strong className="text-slate-800 dark:text-slate-200">{ROLE_LABELS_AR[user.role] || user.role}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">الإدارة التابعة:</span>
              <strong className="text-slate-800 dark:text-slate-200">{user.departmentName || "الإدارة العامة"}</strong>
            </div>
          </div>

          {isLoadingDeps && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>جاري فحص السجلات المرتبطة والعهد المفتوحة في قاعدة البيانات...</span>
            </div>
          )}

          {/* Security Block Notices */}
          {isSelf && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 font-bold flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>حظر أمني: لا يمكنك حذف أو تعطيل أو أرشفة حسابك الشخصي أثناء جلستك الحالية.</span>
            </div>
          )}

          {deps?.isLastActiveAdmin && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 font-bold flex items-start gap-2.5">
              <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span>حماية النظام الحرجة: هذا الحساب هو آخر مدير عام (Super Admin) نشط في النظام، ولا يمكن حذفه أو تعطيله أو أرشفته.</span>
            </div>
          )}

          {/* Open Custodies Warning */}
          {hasOpenCustodies && deps && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-2 text-xs">
              <div className="font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>تنبيه عهد مفتوحة ({deps.openCustodiesCount}): يُمنع الحذف أو الأرشفة قبل تسوية العهد</span>
              </div>
              <ul className="space-y-1 text-[11px] text-amber-800 dark:text-amber-300 list-disc pr-5">
                {deps.openCustodies.map((c) => (
                  <li key={c.id}>
                    {c.custodyCode ? `[${c.custodyCode}] ` : ""}{c.itemName} (تاريخ التسليم: {c.deliveryDate || "غير محدد"})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Linked Records Warning */}
          {deps && deps.hasLinkedRecords && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl space-y-2 text-xs">
              <div className="font-black text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>سجلات تاريخية مرتبطة محفوظة (لا يتم حذفها نهائياً)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {deps.summaryItems.map((item, idx) => (
                  <span key={idx} className="bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-blue-800 dark:text-blue-300">
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-300/90">
                سيظل الحضور، النقاط، المساعدات، عمليات التسليم، القيود المالية، وسجلات التدقيق محفوظة بالكامل عند اختيار «أرشفة» أو «تعطيل».
              </p>
            </div>
          )}

          {/* 3 Action Options */}
          {!isBlockedBySelfOrLastAdmin && (
            <div className="space-y-2.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                اختر نوع الإجراء المطلوب:
              </label>

              {/* Option 1: Archive */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  actionType === "archive"
                    ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name="deleteAction"
                  checked={actionType === "archive"}
                  onChange={() => setActionType("archive")}
                  className="mt-1 text-amber-600"
                />
                <div className="flex-1 text-xs">
                  <div className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Archive className="w-4 h-4 text-amber-600" />
                    <span>أرشفة المستخدم (الخيار الآمن الموصى به)</span>
                    {deps?.hasLinkedRecords && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-bold">افتراضي</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ينهي جميع جلسات الدخول ويؤرشف الحساب مع الاحتفاظ الكامل بسجلات الحضور والنقاط والمساعدات والتسليمات والمالية والتدقيق، وإمكانية الاستعادة لاحقاً.
                  </p>
                </div>
              </label>

              {/* Option 2: Deactivate */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  actionType === "deactivate"
                    ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/30 shadow-xs"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name="deleteAction"
                  checked={actionType === "deactivate"}
                  onChange={() => setActionType("deactivate")}
                  className="mt-1 text-indigo-600"
                />
                <div className="flex-1 text-xs">
                  <div className="font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    <span>تعطيل الحساب مؤقتاً</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    يمنع المستخدم من تسجيل الدخول وينهي جلساته فوراً دون أرشفة ملفه التشغيلي، ويمكن إعادة تفعيله في أي وقت.
                  </p>
                </div>
              </label>

              {/* Option 3: Permanent Delete */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                  !canPermanentDelete
                    ? "opacity-55 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50"
                    : actionType === "permanent_delete"
                    ? "cursor-pointer border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 shadow-xs"
                    : "cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name="deleteAction"
                  disabled={!canPermanentDelete}
                  checked={actionType === "permanent_delete"}
                  onChange={() => canPermanentDelete && setActionType("permanent_delete")}
                  className="mt-1 text-rose-600"
                />
                <div className="flex-1 text-xs">
                  <div className="font-black text-rose-800 dark:text-rose-300 flex items-center gap-2">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>حذف نهائي من قاعدة البيانات</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {!canFullAccess
                      ? "متاح للإدارة العليا ومدير العمليات فقط عند خلو الحساب من السجلات."
                      : deps?.hasLinkedRecords
                      ? "مغلق تلقائياً لوجود سجلات تاريخية مرتبطة بهذا المستخدم — يجب اختيار الأرشفة أو التعطيل."
                      : hasOpenCustodies
                      ? "مغلق لوجود عهد مفتوحة غير مسترجعة."
                      : "يحذف الحساب نهائياً لخلوه التام من السجلات المرتبطة مع توثيق العملية في سجل التدقيق."}
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* Mandatory Reason */}
          {!isBlockedBySelfOrLastAdmin && (
            <>
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                  سبب الإجراء (إلزامي لتوثيق سجل التدقيق): *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="مثال: انتهاء الفترة التطوعية / استقالة الموظف / طلب المستفيد إغلاق الحساب..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs font-bold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={e => setConfirmChecked(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600"
                />
                <span>أؤكد مراجعة بيانات المستخدم والعهد والسجلات والموافقة على تنفيذ الإجراء المختار.</span>
              </label>
            </>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl text-xs font-bold text-rose-700 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 cursor-pointer"
            >
              إلغاء
            </button>
            {!isBlockedBySelfOrLastAdmin && (
              <button
                type="submit"
                disabled={isSubmitting || isLoadingDeps}
                className={`px-6 py-2.5 rounded-2xl text-white font-black text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                  actionType === "permanent_delete"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : actionType === "deactivate"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>جاري التنفيذ...</span>
                  </>
                ) : actionType === "permanent_delete" ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>تأكيد الحذف النهائي</span>
                  </>
                ) : actionType === "deactivate" ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>تأكيد التعطيل المؤقت</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    <span>تأكيد الأرشفة الآمنة</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
