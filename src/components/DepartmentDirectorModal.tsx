import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  KeyRound,
  Lock,
  Save,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { Department } from "../types";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import { ImageUploadField } from "./ImageUploadField";
import { DepartmentPermissionsManager } from "./DepartmentPermissionsManager";
import {
  getDepartmentPermissions,
  getDepartmentPermissionIds
} from "../data/departmentPermissionsRegistry";

interface ExistingUserOption {
  id: string;
  userId?: string;
  name: string;
  username?: string;
  nationalId?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  positionTitle?: string;
  jobTitle?: string;
  role?: string;
  departmentId?: string;
  permissions?: string[];
}

interface DepartmentDirectorModalProps {
  department: Department;
  existingUsers?: ExistingUserOption[];
  onClose: () => void;
  onSuccess: (updatedDb?: any, message?: string) => void;
}

export const DepartmentDirectorModal: React.FC<DepartmentDirectorModalProps> = ({
  department,
  existingUsers = [],
  onClose,
  onSuccess
}) => {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [selectedExistingId, setSelectedExistingId] = useState<string>(department.directorUserId || "");
  const [activeTab, setActiveTab] = useState<"profile" | "permissions" | "tasks">("profile");

  const [name, setName] = useState(department.directorName || "");
  const [nationalId, setNationalId] = useState(department.nationalId || "");
  const [username, setUsername] = useState(department.username || `director_${department.id}`);
  const [email, setEmail] = useState(department.email || "");
  const [phone, setPhone] = useState(department.phone || "");
  const [avatarUrl, setAvatarUrl] = useState(department.avatarUrl || "");
  const [positionTitle, setPositionTitle] = useState(
    department.positionTitle || `مدير ${department.nameAr}`
  );
  const [role, setRole] = useState<string>("department_admin");
  const [status, setStatus] = useState<string>(department.status || "active");
  const [assignmentStatus, setAssignmentStatus] = useState<"active" | "inactive" | "terminated">(
    department.assignmentStatus || "active"
  );
  const [assignmentStartDate, setAssignmentStartDate] = useState(
    department.assignmentStartDate || department.assignmentDate || new Date().toISOString().split("T")[0]
  );
  const [assignmentEndDate, setAssignmentEndDate] = useState(department.assignmentEndDate || "");
  const [publishToPublic, setPublishToPublic] = useState<boolean>(department.publishToPublic !== false);
  const [permissions, setPermissions] = useState<string[]>(() =>
    Array.isArray(department.permissions) && department.permissions.length > 0
      ? department.permissions
      : getDepartmentPermissionIds(department.id)
  );
  const [tasksText, setTasksText] = useState((department.tasks || []).join("\n"));
  const [newPassword, setNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(true);

  const [usersList, setUsersList] = useState<ExistingUserOption[]>(existingUsers);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingUsers.length > 0) return;
    fetch(buildApiUrl("/api/db/users"), {
      headers: { Accept: "application/json", ...getAuthHeaders() },
      cache: "no-store"
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.users && Array.isArray(d.users)) {
          setUsersList(d.users);
        }
      })
      .catch(() => {});
  }, [existingUsers.length]);

  const selectableUsers = useMemo(
    () =>
      usersList.filter(
        (u) => !["volunteer", "beneficiary"].includes(String(u.role || ""))
      ),
    [usersList]
  );

  const handleSelectExistingUser = (uid: string) => {
    setSelectedExistingId(uid);
    const found = selectableUsers.find((u) => (u.userId || u.id) === uid);
    if (found) {
      setName(found.name || "");
      if (found.nationalId && !String(found.nationalId).includes("*")) {
        setNationalId(found.nationalId);
      }
      setUsername(found.username || uid);
      setEmail(found.email || "");
      setPhone(found.phone || "");
      setAvatarUrl(found.avatarUrl || "");
      setPositionTitle(found.positionTitle || found.jobTitle || `مدير ${department.nameAr}`);
      if (Array.isArray(found.permissions) && found.permissions.length > 0) {
        setPermissions(found.permissions);
      }
    }
  };

  const deptProfile = useMemo(
    () => getDepartmentPermissions(department.id),
    [department.id]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) {
      setErrorMsg("الاسم الكامل للمدير المسؤول مطلوب.");
      return;
    }
    if (mode === "existing" && !selectedExistingId) {
      setErrorMsg("يرجى اختيار مستخدم حالي لربطه كمدير للإدارة.");
      return;
    }

    setIsSaving(true);
    try {
      const tasks = tasksText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(buildApiUrl("/api/db/departments/assign-director"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          departmentId: department.id,
          mode,
          existingUserId: mode === "existing" ? selectedExistingId : undefined,
          name: name.trim(),
          nationalId: nationalId.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
          avatarUrl,
          positionTitle: positionTitle.trim() || `مدير ${department.nameAr}`,
          role,
          status,
          assignmentStatus,
          assignmentStartDate,
          assignmentEndDate,
          publishToPublic,
          permissions,
          tasks,
          ...(newPassword.trim() ? { newPassword: newPassword.trim(), mustChangePassword } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر حفظ بيانات مدير الإدارة.");
        return;
      }
      onSuccess(data.db, data.message || "تم حفظ بيانات مدير الإدارة وربطه بالنظام بنجاح.");
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
        <div className="p-5 bg-gradient-to-l from-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black">
                تعديل المدير والحساب — {department.nameAr}
              </h3>
              <p className="text-[11px] text-emerald-100">
                يتم الربط والتحديث التلقائي مع إدارة المستخدمين والهيكل الإداري والصلاحيات
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 pb-2 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "profile"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>البيانات والحساب</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "permissions"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>الصلاحيات الممنوحة ({permissions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "tasks"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>المهام والتكليفات</span>
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="space-y-5">
              {/* Mode Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/70">
                <button
                  type="button"
                  onClick={() => setMode("new")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    mode === "new"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>تعديل الحالي / إنشاء حساب مدير جديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("existing")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    mode === "existing"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>اختيار مستخدم حالي من النظام</span>
                </button>
              </div>

              {mode === "existing" && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <label className="block text-xs font-black text-emerald-900 dark:text-emerald-200">
                    اختر المستخدم الحالي لتعيينه كمدير للإدارة:
                  </label>
                  <select
                    value={selectedExistingId}
                    onChange={(e) => handleSelectExistingUser(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-xs font-bold"
                  >
                    <option value="">-- اختر من قائمة المستخدمين --</option>
                    {selectableUsers.map((u) => {
                      const uid = u.userId || u.id;
                      return (
                        <option key={uid} value={uid}>
                          {u.name} — ({u.positionTitle || u.jobTitle || u.role})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Photo */}
              <ImageUploadField
                label="الصورة الشخصية الرسمية للمدير (تظهر في الهيكل الإداري)"
                value={avatarUrl}
                onChange={setAvatarUrl}
                previewAspect="circle"
                maxSizeMB={3}
              />

              {/* Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهوية الوطنية / الإقامة
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="10xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    اسم المستخدم (Username)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    رقم الجوال
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    المنصب الرسمي (في الهيكل الإداري) *
                  </label>
                  <input
                    type="text"
                    required
                    value={positionTitle}
                    onChange={(e) => setPositionTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الدور الوظيفي
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="department_admin">مدير إدارة تنفيذي</option>
                    <option value="supervisor">مشرف إدارة ومتابعة</option>
                    <option value="operations_manager">مدير عمليات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    حالة الحساب
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="active">نشط ومفعل</option>
                    <option value="inactive">معطل مؤقتاً</option>
                    <option value="suspended">موقوف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    حالة التكليف بالهيكل
                  </label>
                  <select
                    value={assignmentStatus}
                    onChange={(e) => setAssignmentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold"
                  >
                    <option value="active">تكليف ساري (يظهر بالهيكل)</option>
                    <option value="inactive">معلق مؤقتاً</option>
                    <option value="terminated">منتهي التكليف (يختفي فوراً)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ التعيين / بداية التكليف
                  </label>
                  <input
                    type="date"
                    value={assignmentStartDate ? assignmentStartDate.split("T")[0] : ""}
                    onChange={(e) => setAssignmentStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ نهاية التكليف (اختياري)
                  </label>
                  <input
                    type="date"
                    value={assignmentEndDate ? assignmentEndDate.split("T")[0] : ""}
                    onChange={(e) => setAssignmentEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Public Org Chart Visibility Toggle */}
              <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishToPublic}
                  onChange={(e) => setPublishToPublic(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600"
                />
                <div className="text-xs">
                  <div className="font-black text-slate-800 dark:text-white">
                    إظهار في الهيكل الإداري العام بالصفحة الرئيسية (الاسم، الصورة، المنصب فقط)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    لا يتم نشر رقم الهوية أو الصلاحيات أو المهام للزوار نهائياً.
                  </div>
                </div>
              </label>

              {/* Secure Password Reset Section (Never renders plaintext existing password) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>تعيين أو تحديث كلمة المرور (اختياري - تُحفظ مشفرة بالكامل)</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-emerald-700 border border-emerald-200">
                    كلمة المرور الحالية محمية ومشفرة ✓
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-amber-600 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="اتركه فارغاً للإبقاء على كلمة المرور الحالية"
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-amber-300 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mustChangePassword}
                      onChange={(e) => setMustChangePassword(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span>إلزام تغيير كلمة المرور عند أول تسجيل دخول</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-900 flex items-center justify-between gap-2">
                <span>
                  حدد الصلاحيات الفعلية لمدير ({department.nameAr}) — تنعكس مباشرة على الواجهة والـ API.
                </span>
                {deptProfile && (
                  <button
                    type="button"
                    onClick={() => setPermissions(getDepartmentPermissionIds(department.id))}
                    className="px-2.5 py-1 rounded-lg bg-white border border-indigo-300 text-indigo-700 text-[11px] font-bold cursor-pointer shrink-0"
                  >
                    استعادة الافتراضي
                  </button>
                )}
              </div>
              <DepartmentPermissionsManager
                selectedAccount={{
                  id: selectedExistingId || department.directorUserId || department.id,
                  name: name || department.directorName,
                  role,
                  departmentId: department.id
                }}
                departments={[department]}
                currentRole={role}
                currentDepartmentId={department.id}
                selectedPermissions={permissions}
                onChangePermissions={setPermissions}
                onSave={() => {}}
                isSuperAdmin={true}
                hideSaveButton
              />
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-3">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                المهام والتكليفات المسجلة للإدارة والمدير (مهمة واحدة في كل سطر):
              </label>
              <textarea
                rows={8}
                value={tasksText}
                onChange={(e) => setTasksText(e.target.value)}
                placeholder="أدخل المهام المسندة لهذه الإدارة..."
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs leading-relaxed"
              />
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-sm"
            >
              {isSaving ? (
                <span>جاري الحفظ والمزامنة...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ ومزامنة المدير والحساب</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
