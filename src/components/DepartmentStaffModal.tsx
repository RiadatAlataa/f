import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Save,
  Shield,
  UserCheck,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { Department, Employee } from "../types";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import { ImageUploadField } from "./ImageUploadField";
import { DepartmentPermissionsManager } from "./DepartmentPermissionsManager";

interface DepartmentStaffModalProps {
  department: Department;
  employees: Employee[];
  currentUser?: any;
  onClose: () => void;
  onSuccess: (updatedDb?: any, message?: string) => void;
}

export const DepartmentStaffModal: React.FC<DepartmentStaffModalProps> = ({
  department,
  employees = [],
  currentUser,
  onClose,
  onSuccess
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [existingUserId, setExistingUserId] = useState("");
  const [existingUsers, setExistingUsers] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [positionTitle, setPositionTitle] = useState("موظف إداري");
  const [jobTitle, setJobTitle] = useState("موظف إداري");
  const [supervisorName, setSupervisorName] = useState(department.directorName || "");
  const [assignmentStatus, setAssignmentStatus] = useState<"active" | "inactive" | "terminated">("active");
  const [assignmentStartDate, setAssignmentStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignmentEndDate, setAssignmentEndDate] = useState("");
  const [publishToPublic, setPublishToPublic] = useState(true);
  const [tasksText, setTasksText] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Delegation ceiling: if caller is not Super Admin / Operations Manager, restrict assignable permissions to caller's own permissions
  const isTopAdmin = Boolean(
    currentUser?.role === "admin" ||
      currentUser?.role === "operations_manager" ||
      currentUser?.permissions?.includes("super_admin") ||
      currentUser?.permissions?.includes("all_permissions")
  );
  const callerCeilingIds: string[] | undefined = isTopAdmin
    ? undefined
    : Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : ["view_department"];

  const [permissions, setPermissions] = useState<string[]>(() =>
    isTopAdmin
      ? ["view_department", "create_data", "edit_data"]
      : (callerCeilingIds || ["view_department"]).filter((p) =>
          ["view_department", "create_data", "edit_data"].includes(p)
        )
  );

  const [isSaving, setIsSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const [editingPermsEmp, setEditingPermsEmp] = useState<Employee | null>(null);

  const deptEmployees = useMemo(
    () => (employees || []).filter((e) => e && e.departmentId === department.id),
    [employees, department.id]
  );

  useEffect(() => {
    if (!showAddForm || existingUsers.length > 0) return;
    fetch(buildApiUrl("/api/db/users"), {
      headers: { Accept: "application/json", ...getAuthHeaders() },
      cache: "no-store"
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.users && Array.isArray(d.users)) {
          setExistingUsers(
            d.users.filter((u: any) => !["admin", "operations_manager"].includes(String(u.role || "")))
          );
        }
      })
      .catch(() => {});
  }, [showAddForm, existingUsers.length]);

  const handleSelectExisting = (uid: string) => {
    setExistingUserId(uid);
    const found = existingUsers.find((u) => (u.userId || u.id) === uid);
    if (found) {
      setName(found.name || "");
      setEmail(found.email || "");
      setPhone(found.phone || "");
      if (found.nationalId && !String(found.nationalId).includes("*")) {
        setNationalId(found.nationalId);
      }
      setUsername(found.username || "");
      setAvatarUrl(found.avatarUrl || "");
      setPositionTitle(found.positionTitle || found.jobTitle || "موظف إداري");
      setJobTitle(found.jobTitle || "موظف إداري");
    }
  };

  const resetAddForm = () => {
    setName("");
    setNationalId("");
    setUsername("");
    setEmail("");
    setPhone("");
    setAvatarUrl("");
    setPositionTitle("موظف إداري");
    setJobTitle("موظف إداري");
    setTasksText("");
    setNewPassword("");
    setExistingUserId("");
  };

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setNoticeMsg(null);

    if (mode === "new" && !name.trim()) {
      setErrorMsg("الاسم الكامل للموظف مطلوب.");
      return;
    }
    if (mode === "existing" && !existingUserId) {
      setErrorMsg("يرجى اختيار مستخدم حالي.");
      return;
    }

    setIsSaving(true);
    try {
      const tasks = tasksText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch(buildApiUrl("/api/db/departments/add-staff"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          departmentId: department.id,
          mode,
          existingUserId: mode === "existing" ? existingUserId : undefined,
          name: name.trim(),
          nationalId: nationalId.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
          avatarUrl,
          positionTitle: positionTitle.trim() || jobTitle.trim(),
          jobTitle: jobTitle.trim() || positionTitle.trim(),
          supervisorId: department.directorUserId || `depadmin-${department.id}`,
          supervisorName: supervisorName.trim() || department.directorName,
          assignmentStatus,
          assignmentStartDate,
          assignmentEndDate,
          publishToPublic,
          permissions,
          tasks,
          ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {})
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر إضافة الموظف للإدارة.");
        return;
      }
      setNoticeMsg(data.message || "تمت إضافة الموظف للإدارة ومزامنته بنجاح.");
      resetAddForm();
      setShowAddForm(false);
      onSuccess(data.db, data.message);
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStaffStatus = async (
    emp: Employee,
    patch: { assignmentStatus?: "active" | "inactive" | "terminated"; publishToPublic?: boolean }
  ) => {
    setErrorMsg(null);
    setUpdatingId(emp.id);
    try {
      const res = await fetch(buildApiUrl("/api/db/departments/staff-status"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          departmentId: department.id,
          employeeId: emp.id,
          userId: emp.userId || emp.id,
          ...patch
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر تحديث حالة الموظف.");
        return;
      }
      setNoticeMsg(data.message || "تم تحديث حالة الموظف بنجاح.");
      onSuccess(data.db, data.message);
    } catch (err: any) {
      setErrorMsg(err?.message || "فشل الاتصال بالخادم.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveStaffPermissions = async () => {
    if (!editingPermsEmp) return;
    setErrorMsg(null);
    setUpdatingId(editingPermsEmp.id);
    try {
      const res = await fetch(buildApiUrl("/api/db/departments/permissions/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          departmentId: department.id,
          targetUserId: editingPermsEmp.userId || editingPermsEmp.id,
          permissions: editingPermsEmp.permissions || [],
          reason: `تعديل صلاحيات الموظف (${editingPermsEmp.name}) داخل (${department.nameAr})`
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر تحديث صلاحيات الموظف.");
        return;
      }
      setNoticeMsg(data.message || "تم تحديث صلاحيات الموظف.");
      setEditingPermsEmp(null);
      onSuccess(data.db, data.message);
    } catch (err: any) {
      setErrorMsg(err?.message || "فشل الاتصال بالخادم.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-l from-slate-800 to-slate-950 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black">
                موظفو وكوادر {department.nameAr} ({deptEmployees.length})
              </h3>
              <p className="text-[11px] text-slate-300">
                المدير المباشر: {department.directorName || "غير محدد"} • يتم ربط الموظف تلقائياً مع إدارة المستخدمين والهيكل الإداري
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setErrorMsg(null);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? "إغلاق نموذج الإضافة" : "إضافة موظف للإدارة"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/15 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {noticeMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{noticeMsg}</span>
            </div>
          )}

          {/* Add Staff Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddStaffSubmit}
              className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border-2 border-emerald-500/40 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span>إضافة وتكليف موظف جديد في ({department.nameAr})</span>
                </h4>
                <div className="flex gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setMode("new")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer ${
                      mode === "new" ? "bg-emerald-600 text-white" : "text-slate-600"
                    }`}
                  >
                    حساب موظف جديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("existing")}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer ${
                      mode === "existing" ? "bg-emerald-600 text-white" : "text-slate-600"
                    }`}
                  >
                    اختيار مستخدم حالي
                  </button>
                </div>
              </div>

              {mode === "existing" && (
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    اختر مستخدم حالي:
                  </label>
                  <select
                    value={existingUserId}
                    onChange={(e) => handleSelectExisting(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold"
                  >
                    <option value="">-- اختر من قائمة المستخدمين --</option>
                    {existingUsers.map((u) => {
                      const uid = u.userId || u.id;
                      return (
                        <option key={uid} value={uid}>
                          {u.name} — ({u.role})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <ImageUploadField
                label="صورة الموظف (اختياري)"
                value={avatarUrl}
                onChange={setAvatarUrl}
                previewAspect="circle"
                maxSizeMB={3}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الاسم الكامل *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهوية الوطنية
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم المستخدم (Username)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    رقم الجوال
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المنصب التنظيمي في الإدارة *
                  </label>
                  <input
                    type="text"
                    required
                    value={positionTitle}
                    onChange={(e) => {
                      setPositionTitle(e.target.value);
                      setJobTitle(e.target.value);
                    }}
                    placeholder="مثال: أخصائي حالة / محاسب"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    المشرف المباشر
                  </label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    حالة التكليف
                  </label>
                  <select
                    value={assignmentStatus}
                    onChange={(e) => setAssignmentStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="active">نشط وساري</option>
                    <option value="inactive">معطل مؤقتاً</option>
                    <option value="terminated">منتهي التكليف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    كلمة مرور أولية مشفرة (اختياري)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="الافتراضي الآمن يُنشأ تلقائياً"
                      className="w-full pr-8 pl-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ بداية التكليف
                  </label>
                  <input
                    type="date"
                    value={assignmentStartDate}
                    onChange={(e) => setAssignmentStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ نهاية التكليف (اختياري)
                  </label>
                  <input
                    type="date"
                    value={assignmentEndDate}
                    onChange={(e) => setAssignmentEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishToPublic}
                  onChange={(e) => setPublishToPublic(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span>نشر بطاقة الموظف في الهيكل الإداري العام (الاسم، الصورة، المنصب فقط)</span>
              </label>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مهام أولية مسندة للموظف (مهمة في كل سطر - اختياري):
                </label>
                <textarea
                  rows={2}
                  value={tasksText}
                  onChange={(e) => setTasksText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>
                    صلاحيات الموظف المخصصة ({permissions.length} صلاحية)
                    {!isTopAdmin && " — مقيدة ضمن نطاق صلاحياتك"}
                  </span>
                </div>
                <DepartmentPermissionsManager
                  selectedAccount={{
                    id: existingUserId || "new-staff",
                    name: name || "موظف جديد",
                    role: "employee",
                    departmentId: department.id
                  }}
                  departments={[department]}
                  currentRole="employee"
                  currentDepartmentId={department.id}
                  selectedPermissions={permissions}
                  onChangePermissions={setPermissions}
                  onSave={() => {}}
                  isSuperAdmin={isTopAdmin}
                  allowedPermissionIds={callerCeilingIds}
                  hideSaveButton
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "جاري الإضافة والربط..." : "اعتماد وإضافة الموظف"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Inline Staff Permission Editor */}
          {editingPermsEmp && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                  تعديل صلاحيات الموظف: {editingPermsEmp.name}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingPermsEmp(null)}
                  className="text-xs font-bold text-slate-500 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
              <DepartmentPermissionsManager
                selectedAccount={{
                  id: editingPermsEmp.userId || editingPermsEmp.id,
                  name: editingPermsEmp.name,
                  role: "employee",
                  departmentId: department.id
                }}
                departments={[department]}
                currentRole="employee"
                currentDepartmentId={department.id}
                selectedPermissions={editingPermsEmp.permissions || []}
                onChangePermissions={(next) =>
                  setEditingPermsEmp({ ...editingPermsEmp, permissions: next })
                }
                onSave={() => {}}
                isSuperAdmin={isTopAdmin}
                allowedPermissionIds={callerCeilingIds}
                hideSaveButton
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={updatingId === editingPermsEmp.id}
                  onClick={handleSaveStaffPermissions}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer disabled:opacity-60"
                >
                  {updatingId === editingPermsEmp.id ? "جاري الحفظ..." : "حفظ صلاحيات الموظف"}
                </button>
              </div>
            </div>
          )}

          {/* Existing Staff List */}
          {deptEmployees.length === 0 ? (
            <div className="p-10 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                لا يوجد موظفون مسجلون حالياً في ({department.nameAr}).
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                اضغط «إضافة موظف للإدارة» لربط موظف حالي أو إنشاء حساب موظف جديد.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {deptEmployees.map((emp) => {
                const isTerminated = emp.assignmentStatus === "terminated" || emp.isArchived;
                const isActive = !isTerminated && emp.status !== "inactive";
                const isPublic = emp.publishToPublic !== false;
                return (
                  <div
                    key={emp.id}
                    className={`p-4 rounded-2xl border bg-white dark:bg-slate-900/80 flex flex-col justify-between gap-3 ${
                      isTerminated
                        ? "border-rose-200 bg-rose-50/30 opacity-80"
                        : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {emp.avatarUrl || emp.photo ? (
                        <img
                          src={emp.avatarUrl || emp.photo}
                          alt={emp.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-base shrink-0">
                          {emp.name?.charAt(0) || "م"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="font-black text-sm text-slate-900 dark:text-white truncate">
                            {emp.name}
                          </h5>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap ${
                              isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isTerminated ? "منتهي التكليف" : isActive ? "نشط" : "معطل"}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          {emp.positionTitle || emp.jobTitle || "موظف إدارة"}
                        </p>
                        <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-x-3 gap-y-0.5">
                          {emp.nationalId && <span>هوية: {emp.nationalId}</span>}
                          {emp.phone && <span>جوال: {emp.phone}</span>}
                          <span>صلاحيات: {(emp.permissions || []).length}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingPermsEmp(emp)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Shield className="w-3 h-3" />
                          <span>الصلاحيات</span>
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === emp.id}
                          onClick={() =>
                            handleToggleStaffStatus(emp, { publishToPublic: !isPublic })
                          }
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          {isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{isPublic ? "بالهيكل" : "مخفي"}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={updatingId === emp.id}
                        onClick={() =>
                          handleToggleStaffStatus(emp, {
                            assignmentStatus: isActive ? "terminated" : "active"
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          isActive
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isActive ? "إنهاء التكليف" : "إعادة تفعيل"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
