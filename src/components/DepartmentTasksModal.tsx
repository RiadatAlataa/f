import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock,
  Edit3,
  Plus,
  Save,
  UserCheck,
  X
} from "lucide-react";
import { AdministrativeTask, Department, Employee } from "../types";
import { buildApiUrl, getAuthHeaders } from "../config/api";

interface DepartmentTasksModalProps {
  department: Department;
  employees?: Employee[];
  administrativeTasks?: AdministrativeTask[];
  onClose: () => void;
  onSuccess: (updatedDb?: any, message?: string) => void;
}

export const DepartmentTasksModal: React.FC<DepartmentTasksModalProps> = ({
  department,
  employees = [],
  administrativeTasks = [],
  onClose,
  onSuccess
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editingTask, setEditingTask] = useState<Partial<AdministrativeTask> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState(
    department.directorUserId || `depadmin-${department.id}`
  );
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  const deptTasks = useMemo(
    () => (administrativeTasks || []).filter((t) => t && t.departmentId === department.id),
    [administrativeTasks, department.id]
  );

  const filteredTasks = useMemo(() => {
    if (filterStatus === "all") return deptTasks.filter((t) => t.status !== "archived");
    return deptTasks.filter((t) => t.status === filterStatus);
  }, [deptTasks, filterStatus]);

  const assigneeOptions = useMemo(() => {
    const opts: { userId: string; label: string }[] = [];
    if (department.directorName) {
      opts.push({
        userId: department.directorUserId || `depadmin-${department.id}`,
        label: `${department.directorName} (${department.positionTitle || "مدير الإدارة"})`
      });
    }
    (employees || [])
      .filter((e) => e && e.departmentId === department.id && !e.isArchived)
      .forEach((e) => {
        const uid = e.userId || e.id;
        if (!opts.some((o) => o.userId === uid)) {
          opts.push({
            userId: uid,
            label: `${e.name} (${e.positionTitle || e.jobTitle || "موظف"})`
          });
        }
      });
    return opts;
  }, [department, employees]);

  const startNewTask = () => {
    setEditingTask({});
    setTitle("");
    setDescription("");
    setAssigneeUserId(assigneeOptions[0]?.userId || "");
    setPriority("medium");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setErrorMsg(null);
  };

  const startEditTask = (t: AdministrativeTask) => {
    setEditingTask(t);
    setTitle(t.title || "");
    setDescription(t.description || "");
    setAssigneeUserId(t.assigneeUserId || "");
    setPriority(t.priority || "medium");
    setStartDate(t.startDate || new Date().toISOString().split("T")[0]);
    setEndDate(t.endDate || "");
    setErrorMsg(null);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("عنوان المهمة مطلوب.");
      return;
    }
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const selectedAssignee = assigneeOptions.find((o) => o.userId === assigneeUserId);
      const res = await fetch(buildApiUrl("/api/db/admin-tasks/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          id: editingTask?.id,
          departmentId: department.id,
          title: title.trim(),
          description: description.trim() || title.trim(),
          assigneeUserId,
          assigneeName: selectedAssignee?.label?.split(" (")[0] || department.directorName || "",
          priority,
          startDate,
          endDate,
          status: editingTask?.status || "pending"
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر حفظ المهمة.");
        return;
      }
      setNoticeMsg("تم حفظ المهمة وربطها بالإدارة والمكلف بنجاح.");
      setEditingTask(null);
      onSuccess(data.db);
    } catch (err: any) {
      setErrorMsg(err?.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (
    taskId: string,
    status: "pending" | "in_progress" | "completed" | "archived"
  ) => {
    setErrorMsg(null);
    try {
      const res = await fetch(buildApiUrl("/api/db/admin-tasks/status"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ id: taskId, status })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || "تعذر تحديث حالة المهمة.");
        return;
      }
      setNoticeMsg("تم تحديث حالة المهمة بنجاح.");
      onSuccess(data.db);
    } catch (err: any) {
      setErrorMsg(err?.message || "فشل الاتصال بالخادم.");
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "archived":
        return "bg-slate-200 text-slate-700 border-slate-300";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "completed":
        return "مكتملة";
      case "in_progress":
        return "جاري التنفيذ";
      case "archived":
        return "مؤرشفة";
      default:
        return "قيد الانتظار";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-l from-amber-700 to-amber-900 text-white flex items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="text-base sm:text-lg font-black">
              إدارة المهام والتكليفات — {department.nameAr}
            </h3>
            <p className="text-[11px] text-amber-100">
              إسناد المهام لمدير وموظفي الإدارة ومتابعة التنفيذ والأرشفة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startNewTask}
              className="px-3.5 py-2 rounded-xl bg-white text-amber-900 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>مهمة جديدة</span>
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

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {noticeMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{noticeMsg}</span>
            </div>
          )}

          {/* Create/Edit Task Form */}
          {editingTask !== null && (
            <form
              onSubmit={handleSaveTask}
              className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-950 dark:text-amber-200">
                  {editingTask.id ? "تعديل المهمة الإدارية" : "إسناد مهمة إدارية جديدة"}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="text-xs font-bold text-slate-500 cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    عنوان المهمة *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تدقيق السجلات الشهرية للإدارة"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white dark:bg-slate-900 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    المكلف بالمهمة *
                  </label>
                  <select
                    value={assigneeUserId}
                    onChange={(e) => setAssigneeUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="">-- بدون تعيين محدد --</option>
                    {assigneeOptions.map((o) => (
                      <option key={o.userId} value={o.userId}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">الأولوية</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="low">منخفضة</option>
                    <option value="medium">متوسطة</option>
                    <option value="high">عالية</option>
                    <option value="urgent">عاجلة</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">من تاريخ</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-amber-300 bg-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">الاستحقاق</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-amber-300 bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">التفاصيل</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "جاري الحفظ..." : "حفظ المهمة"}</span>
                </button>
              </div>
            </form>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "النشطة" },
              { id: "pending", label: "قيد الانتظار" },
              { id: "in_progress", label: "جاري التنفيذ" },
              { id: "completed", label: "المكتملة" },
              { id: "archived", label: "المؤرشفة" }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                  filterStatus === f.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold">لا توجد مهام مسجلة ضمن هذا التصنيف.</p>
              {Array.isArray(department.tasks) && department.tasks.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  المهام العامة للإدارة: {department.tasks.join(" • ")}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-600">
                        {t.taskNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusBadge(
                          t.status
                        )}`}
                      >
                        {statusLabel(t.status)}
                      </span>
                      <h5 className="font-black text-sm text-slate-900 dark:text-white">
                        {t.title}
                      </h5>
                    </div>
                    {t.description && t.description !== t.title && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">{t.description}</p>
                    )}
                    <div className="text-[11px] text-slate-500 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>المكلف: {t.assigneeName || "غير محدد"}</span>
                      </span>
                      {t.startDate && <span className="font-mono">من: {t.startDate}</span>}
                      {t.endDate && <span className="font-mono">إلى: {t.endDate}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditTask(t)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>تعديل</span>
                    </button>
                    {t.status !== "in_progress" && t.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(t.id, "in_progress")}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold cursor-pointer"
                      >
                        بدء التنفيذ
                      </button>
                    )}
                    {t.status !== "completed" && t.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(t.id, "completed")}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold cursor-pointer"
                      >
                        إكمال
                      </button>
                    )}
                    {t.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(t.id, "archived")}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Archive className="w-3 h-3" />
                        <span>أرشفة</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
