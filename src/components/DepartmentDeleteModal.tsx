import React, { useEffect, useState } from "react";
import { AlertTriangle, Archive, RefreshCw, ShieldAlert, Trash2, X } from "lucide-react";
import { Department } from "../types";
import { buildApiUrl, getAuthHeaders } from "../config/api";

interface DepartmentDeleteModalProps {
  department: Department;
  onClose: () => void;
  onSuccess: (updatedDb?: any, message?: string) => void;
}

export const DepartmentDeleteModal: React.FC<DepartmentDeleteModalProps> = ({
  department,
  onClose,
  onSuccess
}) => {
  const [loadingDeps, setLoadingDeps] = useState(true);
  const [hasDependencies, setHasDependencies] = useState(false);
  const [summaryItems, setSummaryItems] = useState<string[]>([]);
  const [actionType, setActionType] = useState<"archive" | "permanent_delete" | "restore">(
    department.isArchived ? "restore" : "archive"
  );
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(buildApiUrl(`/api/db/departments/${encodeURIComponent(department.id)}/dependencies`), {
      headers: { Accept: "application/json", ...getAuthHeaders() },
      cache: "no-store"
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setHasDependencies(Boolean(d.hasDependencies));
          setSummaryItems(Array.isArray(d.summaryItems) ? d.summaryItems : []);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDeps(false));
  }, [department.id]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (actionType !== "restore" && !reason.trim()) {
      setErrorMsg("يرجى إدخال سبب الأرشفة أو الحذف لتوثيق سجل التدقيق.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(buildApiUrl("/api/db/departments/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          id: department.id,
          actionType,
          reason: reason.trim() || "قرار إداري"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر تنفيذ الإجراء المطلوب.");
        return;
      }
      onSuccess(data.db, data.message);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-5 bg-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-base font-black">
              {department.isArchived ? "استعادة الإدارة" : "حماية وحذف/أرشفة الإدارة"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-5 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="text-xs text-slate-500">الإدارة المستهدفة:</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {department.nameAr} ({department.nameEn})
            </div>
          </div>

          {loadingDeps ? (
            <div className="text-xs text-slate-500 p-3 text-center">
              جاري فحص الارتباطات والسجلات التابعة...
            </div>
          ) : (
            hasDependencies && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
                <div className="font-black flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>تنبيه حماية البيانات: توجد سجلات مرتبطة بهذه الإدارة</span>
                </div>
                <p className="text-[11px]">
                  الارتباطات النشطة: <strong>{summaryItems.join("، ")}</strong>. للحفاظ على تاريخ الجمعية، يُنصح باستخدام «أرشفة الإدارة» بدلاً من الحذف النهائي.
                </p>
              </div>
            )
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {!department.isArchived && (
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                نوع الإجراء المطلوب:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActionType("archive")}
                  className={`p-3 rounded-2xl border text-right text-xs transition-all cursor-pointer ${
                    actionType === "archive"
                      ? "bg-amber-50 border-amber-500 text-amber-950 font-black"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-amber-600" />
                    <span>أرشفة الإدارة (موصى به)</span>
                  </div>
                  <div className="text-[10px] font-normal mt-1">
                    إيقاف النشر العام مع حفظ كامل السجلات
                  </div>
                </button>

                <button
                  type="button"
                  disabled={hasDependencies}
                  onClick={() => setActionType("permanent_delete")}
                  className={`p-3 rounded-2xl border text-right text-xs transition-all ${
                    hasDependencies
                      ? "opacity-45 cursor-not-allowed border-slate-200 bg-slate-50"
                      : actionType === "permanent_delete"
                      ? "bg-rose-50 border-rose-500 text-rose-950 font-black cursor-pointer"
                      : "border-slate-200 text-slate-600 cursor-pointer"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>حذف نهائي</span>
                  </div>
                  <div className="text-[10px] font-normal mt-1">
                    {hasDependencies ? "محظور لوجود ارتباطات" : "متاح لخلوها من السجلات"}
                  </div>
                </button>
              </div>
            </div>
          )}

          {actionType !== "restore" && (
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                سبب الإجراء (يُسجّل في سجل التدقيق) *
              </label>
              <textarea
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: إعادة هيكلة الإدارات / دمج قسم..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-60 ${
                actionType === "restore"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : actionType === "permanent_delete"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {actionType === "restore" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>استعادة الإدارة</span>
                </>
              ) : (
                <span>
                  {isSubmitting
                    ? "جاري التنفيذ..."
                    : actionType === "permanent_delete"
                    ? "تأكيد الحذف النهائي"
                    : "تأكيد الأرشفة الآمنة"}
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
