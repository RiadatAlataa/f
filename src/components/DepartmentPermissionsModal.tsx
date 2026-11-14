import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Save, Shield, X } from "lucide-react";
import { Department } from "../types";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import { DepartmentPermissionsManager } from "./DepartmentPermissionsManager";
import { getDepartmentPermissionIds } from "../data/departmentPermissionsRegistry";

interface DepartmentPermissionsModalProps {
  department: Department;
  targetUserId?: string;
  targetUserName?: string;
  initialPermissions?: string[];
  allowedPermissionIds?: string[];
  onClose: () => void;
  onSuccess: (updatedDb?: any, message?: string) => void;
}

export const DepartmentPermissionsModal: React.FC<DepartmentPermissionsModalProps> = ({
  department,
  targetUserId,
  targetUserName,
  initialPermissions,
  allowedPermissionIds,
  onClose,
  onSuccess
}) => {
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(() =>
    Array.isArray(initialPermissions)
      ? initialPermissions
      : Array.isArray(department.permissions) && department.permissions.length > 0
      ? department.permissions
      : getDepartmentPermissionIds(department.id)
  );
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async (permsToSave: string[]) => {
    setErrorMsg(null);
    setIsSaving(true);
    try {
      const res = await fetch(buildApiUrl("/api/db/departments/permissions/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          departmentId: department.id,
          targetUserId: targetUserId || department.directorUserId || `depadmin-${department.id}`,
          permissions: permsToSave,
          reason: reason.trim() || `تخصيص صلاحيات (${targetUserName || department.directorName || department.nameAr})`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر تحديث الصلاحيات.");
        return;
      }
      onSuccess(data.db, data.message || "تم حفظ الصلاحيات بنجاح وتحديث سجل التدقيق.");
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-l from-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black">
                إدارة الصلاحيات — {department.nameAr}
              </h3>
              <p className="text-[11px] text-indigo-200">
                المستهدف: {targetUserName || department.directorName || `مدير ${department.nameAr}`} • تُطبّق على الواجهة وجميع طلبات API فوراً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/15 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
              سبب التعديل (يوثّق في سجل تغيير الصلاحيات):
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: تفويض صلاحيات الإدارة المالية واستبعاد صلاحية الحذف..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <DepartmentPermissionsManager
            selectedAccount={{
              id: targetUserId || department.directorUserId || department.id,
              name: targetUserName || department.directorName,
              role: "department_admin",
              departmentId: department.id
            }}
            departments={[department]}
            currentRole="department_admin"
            currentDepartmentId={department.id}
            selectedPermissions={selectedPermissions}
            onChangePermissions={setSelectedPermissions}
            onSave={() => handleSave(selectedPermissions)}
            isSuperAdmin={!allowedPermissionIds}
            allowedPermissionIds={allowedPermissionIds}
            hideSaveButton
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>الصلاحيات المختارة: {selectedPermissions.length} صلاحية</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave(selectedPermissions)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? "جاري حفظ الصلاحيات..." : "حفظ الصلاحيات المخصصة"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
