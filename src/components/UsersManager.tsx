import React, { useState, useEffect, useMemo } from "react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { generateStrongPassword, evaluatePasswordStrength } from "../utils/passwordSecurity";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import { UserComprehensiveEditModal } from "./UserComprehensiveEditModal";
import { UserDeleteArchiveModal } from "./UserDeleteArchiveModal";
import { UserFullDetailsModal } from "./UserFullDetailsModal";
import {
  SystemUser,
  DepartmentItem,
  TeamItem,
  UserManagementScope,
  USER_PERMISSION_CATEGORIES
} from "./userManagementTypes";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  KeyRound,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Sliders,
  Activity,
  History,
  Sparkles,
  FileSpreadsheet,
  Download,
  Info,
  Send,
  RotateCcw,
  Archive
} from "lucide-react";

export type { SystemUser };

interface UsersManagerProps {
  currentUser?: any;
  currentUserRole?: string;
  departments?: DepartmentItem[];
  onOpenDepartment?: (deptId: string) => void;
  onRefreshDatabase?: () => Promise<void>;
}

// Categorized System Permissions (Re-exported for compatibility)
export const PERMISSION_CATEGORIES = USER_PERMISSION_CATEGORIES;
type Department = DepartmentItem;
// (Permission categories imported from ./userManagementTypes)

export const UsersManager: React.FC<UsersManagerProps> = ({
  currentUser,
  currentUserRole = "admin",
  departments = [],
  onOpenDepartment,
  onRefreshDatabase
}) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [serverDepartments, setServerDepartments] = useState<DepartmentItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [userScope, setUserScope] = useState<UserManagementScope | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Filters
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mustChangeFilter, setMustChangeFilter] = useState(false);
  const [pendingOnlyFilter, setPendingOnlyFilter] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<SystemUser | null>(null);
  const [editModalInitialSection, setEditModalInitialSection] = useState<"personal" | "account" | "role_dept" | "volunteer" | "beneficiary">("personal");
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<SystemUser | null>(null);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<SystemUser | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<SystemUser | null>(null);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<SystemUser | null>(null);
  const [resetLinkModal, setResetLinkModal] = useState<{ user: SystemUser; resetLink: string; userEmail: string } | null>(null);
  const [rejectModalUser, setRejectModalUser] = useState<SystemUser | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("عدم استيفاء الشروط المعتمدة");
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    tone: "emerald" | "amber" | "rose";
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const effectiveDepartments = serverDepartments.length > 0 ? serverDepartments : departments;

  // Auto-hide toasts
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  useEffect(() => {
    if (errorToast) {
      const timer = setTimeout(() => setErrorToast(null), 5500);
      return () => clearTimeout(timer);
    }
  }, [errorToast]);

  // Fetch Users
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = buildApiUrl("/api/db/users");
      const headers = {
        Accept: "application/json",
        ...getAuthHeaders()
      };
      const res = await fetch(url, {
        headers,
        cache: "no-store"
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const status = res.status;
        if (status === 401) {
          throw new Error("انتهت الجلسة أو يجب تسجيل الدخول بحساب مصرح (401 Unauthorized)");
        } else if (status === 403) {
          throw new Error(data?.error || "ليس لديك الصلاحية المطلوبة لعرض وإدارة المستخدمين (403 Forbidden).");
        } else if (status === 404) {
          throw new Error("مسار واجهة المستخدمين غير موجود على الخادم (404 Not Found).");
        } else if (status >= 500) {
          throw new Error(`خطأ في خادم التطبيق (${status}): ${data?.error || data?.message || "يرجى مراجعة سجلات الخادم."}`);
        } else {
          throw new Error(data?.error || data?.message || `فشل جلب قائمة المستخدمين من الخادم (${status}).`);
        }
      }

      setUsers(data?.users || []);
      if (Array.isArray(data?.departments)) setServerDepartments(data.departments);
      if (Array.isArray(data?.teams)) setTeams(data.teams);
      if (data?.scope) setUserScope(data.scope);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء جلب بيانات المستخدمين من الخادم.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshAllData = async () => {
    await fetchUsers();
    if (onRefreshDatabase) {
      await onRefreshDatabase().catch(() => {});
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Category Tab filter
      if (activeCategoryTab !== "all") {
        if (activeCategoryTab === "admins" && !(u.role === "admin" || u.role === "operations_manager")) return false;
        if (activeCategoryTab === "dept_heads" && !(u.role === "department_admin" || u.role === "supervisor")) return false;
        if (activeCategoryTab === "employees" && !(u.role === "employee")) return false;
        if (activeCategoryTab === "storekeepers" && !(u.role === "storekeeper")) return false;
        if (activeCategoryTab === "leaders" && !(u.role === "leader")) return false;
        if (activeCategoryTab === "volunteers" && !(u.role === "volunteer")) return false;
        if (activeCategoryTab === "beneficiaries" && !(u.role === "beneficiary")) return false;
        if (activeCategoryTab === "support" && !u.role.includes("support")) return false;
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const searchable = [
          u.name,
          u.username,
          u.email,
          u.phone,
          u.nationalId,
          u.jobTitle,
          u.beneficiaryNumber,
          u.membershipNumber,
          u.fileNumber,
          u.employeeNumber,
          u.teamName,
          u.category
        ]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        if (!searchable.some((s) => s.includes(q))) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== "all") {
        if (roleFilter === "super_admin" && u.role !== "admin") return false;
        if (roleFilter === "operations_manager" && u.role !== "operations_manager") return false;
        if (roleFilter === "supervisor" && u.role !== "supervisor") return false;
        if (roleFilter === "dept_head" && u.role !== "department_admin") return false;
        if (roleFilter === "employee" && u.role !== "employee") return false;
        if (roleFilter === "storekeeper" && u.role !== "storekeeper") return false;
        if (roleFilter === "leader" && u.role !== "leader") return false;
        if (roleFilter === "volunteer" && u.role !== "volunteer") return false;
        if (roleFilter === "beneficiary" && u.role !== "beneficiary") return false;
        if (roleFilter === "support" && !u.role.includes("support")) return false;
      }

      // Dept filter
      if (deptFilter !== "all" && u.departmentId !== deptFilter) {
        return false;
      }

      // Team filter
      if (teamFilter !== "all" && u.teamId !== teamFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "archived" && !(u.status === "archived" || u.isArchived)) return false;
        else if (statusFilter === "inactive" && !(u.status === "inactive" || u.status === "deactivated")) return false;
        else if (statusFilter !== "archived" && statusFilter !== "inactive" && u.status !== statusFilter) return false;
      }

      // Must change password filter
      if (mustChangeFilter && !u.mustChangePassword) {
        return false;
      }

      // Pending review filter
      if (pendingOnlyFilter && u.status !== "pending") {
        return false;
      }

      return true;
    });
  }, [users, activeCategoryTab, searchQuery, roleFilter, deptFilter, teamFilter, statusFilter, mustChangeFilter, pendingOnlyFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      pending: users.filter((u) => u.status === "pending").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      archived: users.filter((u) => u.status === "archived" || u.isArchived).length,
      rejected: users.filter((u) => u.status === "rejected").length,
      inactive: users.filter((u) => u.status === "inactive" || u.status === "deactivated").length,
      mustChange: users.filter((u) => u.mustChangePassword).length,
      adminsAndOps: users.filter((u) => u.role === "admin" || u.role === "operations_manager").length,
      deptHeadsAndSupervisors: users.filter((u) => u.role === "department_admin" || u.role === "supervisor").length,
      employees: users.filter((u) => u.role === "employee").length,
      storekeepers: users.filter((u) => u.role === "storekeeper").length,
      leaders: users.filter((u) => u.role === "leader").length,
      volunteers: users.filter((u) => u.role === "volunteer").length,
      beneficiaries: users.filter((u) => u.role === "beneficiary").length,
      support: users.filter((u) => u.role.includes("support")).length
    };
  }, [users]);

  const canManageTargetRow = (u: SystemUser): boolean => {
    const isTargetAdmin = u.role === "admin" || u.userId === "admin-user" || u.userId === "mosa";
    if (!userScope || userScope.fullAccess) {
      if (isTargetAdmin && userScope && !userScope.isTopSuperAdmin && currentUser?.role !== "admin") {
        return false;
      }
      return true;
    }
    return !["admin", "operations_manager"].includes(u.role);
  };

  const canDeleteTargetRow = (u: SystemUser): boolean => {
    if (!canManageTargetRow(u)) return false;
    const myId = currentUser?.userId || currentUser?.id;
    if (myId && (u.userId === myId || u.id === myId)) return false;
    if (["admin-user", "ops-manager", "mosa", "perm-mosa", "sup-1"].includes(u.userId)) return false;
    return true;
  };

  // Role Badge Styling
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return {
          label: "الإدارة العليا (Super Admin)",
          bg: "bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
        };
      case "operations_manager":
        return {
          label: "مدير العمليات (Operations)",
          bg: "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700"
        };
      case "supervisor":
        return {
          label: "مشرف إدارة ومتابعة",
          bg: "bg-cyan-100 text-cyan-900 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800"
        };
      case "department_admin":
        return {
          label: "مدير إدارة تنفيذي",
          bg: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
        };
      case "storekeeper":
        return {
          label: "أمين مستودع معتمد",
          bg: "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800"
        };
      case "employee":
        return {
          label: "موظف إدارة",
          bg: "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
        };
      case "leader":
        return {
          label: "قائد فريق تطوعي",
          bg: "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
        };
      case "volunteer":
        return {
          label: "متطوع مسجل",
          bg: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
        };
      case "beneficiary":
        return {
          label: "مستفيد رعاية اجتماعية",
          bg: "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800"
        };
      case "support_manager":
        return {
          label: "مدير الدعم الفني",
          bg: "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
        };
      case "support_agent":
        return {
          label: "أخصائي دعم فني",
          bg: "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
        };
      default:
        return {
          label: "مستخدم نظام",
          bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
        };
    }
  };

  // Status Badge Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: "نشط ومفعل",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
          icon: CheckCircle2
        };
      case "pending":
        return {
          label: "قيد المراجعة والاعتماد",
          bg: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
          icon: Clock
        };
      case "suspended":
        return {
          label: "موقوف إدارياً",
          bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
          icon: XCircle
        };
      case "archived":
        return {
          label: "مؤرشف",
          bg: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800",
          icon: Archive
        };
      case "rejected":
        return {
          label: "مرفوض",
          bg: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
          icon: XCircle
        };
      default:
        return {
          label: "معطل مؤقتاً",
          bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
          icon: Info
        };
    }
  };

  // Approve Pending User
  const handleApproveUser = (user: SystemUser) => {
    setConfirmModal({
      title: "اعتماد وتفعيل الحساب",
      message: `هل أنت متأكد من رغبتك في اعتماد وتفعيل حساب (${user.name})؟`,
      confirmLabel: "اعتماد وتفعيل",
      tone: "emerald",
      onConfirm: async () => {
        const res = await fetch(buildApiUrl("/api/db/users/approve"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({ userId: user.userId || user.id })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "فشل اعتماد الحساب.");
        setSuccessToast(data.message || `تم اعتماد وتفعيل حساب (${user.name}) بنجاح.`);
        await refreshAllData();
      }
    });
  };

  // Reject Pending User (via modal)
  const handleRejectUser = (user: SystemUser) => {
    setRejectReasonInput("عدم استيفاء الشروط المعتمدة");
    setRejectModalUser(user);
  };

  const handleSubmitRejectUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalUser) return;
    setIsSubmittingAction(true);
    try {
      const res = await fetch(buildApiUrl("/api/db/users/reject"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          userId: rejectModalUser.userId || rejectModalUser.id,
          reason: rejectReasonInput.trim() || undefined
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل رفض الطلب.");
      setSuccessToast(data.message || `تم تسجيل رفض الطلب للمستخدم (${rejectModalUser.name}).`);
      setRejectModalUser(null);
      await refreshAllData();
    } catch (err: any) {
      setErrorToast(err.message || "حدث خطأ أثناء رفض الطلب.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper to sanitize CSV cells against CSV Formula Injection (CWE-1236)
  const sanitizeCsvCell = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    const trimmedLeading = str.replace(/^[\s\u0000-\u001F\u007F-\u009F]+/, "");
    const formulaTriggers = ["=", "+", "-", "@", "\t", "\r", "%", "|"];
    if (
      formulaTriggers.some((prefix) => str.startsWith(prefix)) ||
      (trimmedLeading.length > 0 && formulaTriggers.some((prefix) => trimmedLeading.startsWith(prefix)))
    ) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  // Export Filtered Users to CSV
  const handleExportCsv = () => {
    const hasExportPerm =
      currentUser?.role === "admin" ||
      currentUser?.role === "operations_manager" ||
      currentUser?.permissions?.includes("export_excel") ||
      currentUser?.permissions?.includes("super_admin") ||
      currentUser?.permissions?.includes("all_permissions");

    if (!hasExportPerm) {
      setErrorToast("ليس لديك صلاحية تصدير البيانات (export_excel). يرجى مراجعة إدارة النظام.");
      return;
    }

    try {
      const headers = [
        "المعرف",
        "الاسم",
        "اسم المستخدم",
        "الدور",
        "الفئة/المسمى",
        "الهوية الوطنية",
        "الجوال",
        "البريد الإلكتروني",
        "الإدارة",
        "الحالة",
        "حالة حساب الدخول",
        "الساعات / الأفراد",
        "ملاحظات",
        "تاريخ التسجيل"
      ];

      const rows = filteredUsers.map((u) => [
        sanitizeCsvCell(u.id),
        sanitizeCsvCell(u.name),
        sanitizeCsvCell(u.username),
        sanitizeCsvCell(getRoleBadge(u.role).label),
        sanitizeCsvCell(u.category || u.teamName || u.jobTitle || ""),
        sanitizeCsvCell(u.nationalId || ""),
        sanitizeCsvCell(u.phone || ""),
        sanitizeCsvCell(u.email || ""),
        sanitizeCsvCell(u.departmentName || ""),
        sanitizeCsvCell(getStatusBadge(u.status).label),
        sanitizeCsvCell(u.loginDisabled || u.hasLoginAccount === false ? "حساب دخول معطل" : "مفعل"),
        sanitizeCsvCell(u.role === "volunteer" ? (u.hours || 0) : u.role === "beneficiary" ? (u.familySize || 1) : ""),
        sanitizeCsvCell(u.notes || ""),
        sanitizeCsvCell(u.createdAt ? new Date(u.createdAt).toLocaleDateString("ar-SA") : "")
      ]);

      const csvContent = "\uFEFF" + [headers.map(sanitizeCsvCell).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `users_riadataleata_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSuccessToast(`تم تصدير (${rows.length}) سجل مستخدم بنجاح بصيغة CSV آمنة.`);
    } catch {
      setErrorToast("حدث خطأ أثناء تصدير ملف CSV.");
    }
  };

  // Toggle user status
  const handleToggleStatus = (user: SystemUser) => {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    setConfirmModal({
      title: nextStatus === "suspended" ? "تجميد / إيقاف الحساب مؤقتاً" : "إعادة تفعيل الحساب",
      message:
        nextStatus === "suspended"
          ? `هل أنت متأكد من رغبتك في إيقاف حساب المستخدم (${user.name})؟ سيتم إنهاء جلساته النشطة ولن يتمكن من تسجيل الدخول.`
          : `هل أنت متأكد من إعادة تفعيل حساب المستخدم (${user.name})؟`,
      confirmLabel: nextStatus === "suspended" ? "تأكيد الإيقاف" : "تفعيل الحساب",
      tone: nextStatus === "suspended" ? "rose" : "emerald",
      onConfirm: async () => {
        const res = await fetch(buildApiUrl("/api/db/users/toggle-status"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            userId: user.userId || user.id,
            status: nextStatus,
            reason: `تغيير الحالة بواسطة المسؤول (${currentUser?.name || "الإدارة المركزية"})`
          })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "فشل تغيير حالة الحساب.");
        setSuccessToast(data.message || `تم تحديث حالة المستخدم (${user.name}) بنجاح.`);
        await refreshAllData();
      }
    });
  };

  // Restore archived / deactivated user
  const handleRestoreUser = (user: SystemUser) => {
    setConfirmModal({
      title: "استعادة وتفعيل الحساب",
      message: `هل تريد استعادة حساب (${user.name}) من الأرشيف أو التعطيل وإعادة تفعيل تسجيل الدخول؟`,
      confirmLabel: "استعادة الحساب",
      tone: "emerald",
      onConfirm: async () => {
        const res = await fetch(buildApiUrl("/api/db/users/restore"), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
          body: JSON.stringify({
            userId: user.userId || user.id,
            reason: `استعادة الحساب بواسطة (${currentUser?.name || "الإدارة"})`
          })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || "تعذر استعادة الحساب.");
        setSuccessToast(data.message || `تمت استعادة وتفعيل حساب (${user.name}) بنجاح.`);
        await refreshAllData();
      }
    });
  };

  // Open Delete / Archive Modal
  const handleDeleteUser = (user: SystemUser) => {
    setSelectedUserForDelete(user);
  };

  // Send Password Reset Link
  const handleSendResetLink = async (user: SystemUser) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/users/send-reset-link"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ userId: user.userId || user.id })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل إرسال رابط تغيير كلمة المرور.");

      setResetLinkModal({
        user,
        resetLink: data.resetLink,
        userEmail: data.userEmail || user.email || ""
      });
      setSuccessToast(`تم توليد رابط إعادة تعيين كلمة المرور بنجاح للمستخدم (${user.name}).`);
    } catch (err: any) {
      setErrorToast(err.message || "حدث خطأ أثناء توليد رابط استعادة كلمة المرور.");
    }
  };

  // Toggle Email Verification
  const handleToggleEmailVerification = async (user: SystemUser) => {
    try {
      const nextStatus = !user.emailVerified;
      const res = await fetch(buildApiUrl("/api/db/users/verify-email"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ userId: user.userId || user.id, emailVerified: nextStatus })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل تحديث حالة التحقق من البريد.");

      setSuccessToast(data.message || `تم تحديث حالة التحقق من البريد للمستخدم (${user.name}).`);
      await refreshAllData();
    } catch (err: any) {
      setErrorToast(err.message || "حدث خطأ أثناء تحديث حالة البريد.");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-700/80 flex items-center gap-3 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
        </div>
      )}

      {/* Error Toast */}
      {errorToast && (
        <div className="fixed bottom-20 left-6 z-50 bg-rose-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-rose-700/80 flex items-center gap-3 animate-slide-up">
          <AlertTriangle className="w-5 h-5 text-rose-300 shrink-0" />
          <span className="text-xs font-bold">{errorToast}</span>
        </div>
      )}

      {/* Main Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                مركز إدارة الحسابات المركزية
              </span>
              <span className="bg-white/10 text-slate-300 px-3 py-1 rounded-full text-xs font-semibold">
                جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              إدارة المستخدمين المركزية لجميع الفئات
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              المنظومة المركزية الشاملة لإدارة وتدقيق كافة الحسابات والكوادر: الإدارة العليا، مدير العمليات، المشرفون، مدراء الإدارات، الموظفون، المتطوعون، المستفيدون، قادة الفرق، أمناء المستودعات، والدعم الفني، مع صلاحيات الاعتماد والرفض والتحكم بكلمات المرور المشفرة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-4 py-3 rounded-2xl text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة حساب جديد</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-3 rounded-2xl text-xs font-bold border border-white/10 transition-all cursor-pointer flex items-center gap-2"
              title="تصدير السجلات إلى ملف CSV / Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </button>
            <button
              onClick={fetchUsers}
              className="bg-white/10 hover:bg-white/20 text-white px-3.5 py-3 rounded-2xl text-xs font-bold border border-white/10 transition-all cursor-pointer flex items-center gap-2"
              title="تحديث البيانات من الخادم"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>إجمالي الحسابات:</span>
            </div>
            <div className="text-xl font-black text-white mt-1 font-mono">
              {stats.total}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>الحسابات النشطة:</span>
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1 font-mono">
              {stats.active}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>بانتظار المراجعة:</span>
            </div>
            <div className="text-xl font-black text-amber-400 mt-1 font-mono">
              {stats.pending}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-rose-300 font-semibold flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 text-rose-400" />
              <span>الموقوفة والمجمدة:</span>
            </div>
            <div className="text-xl font-black text-rose-400 mt-1 font-mono">
              {stats.suspended}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-sky-300 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>المستفيدون والرعاية:</span>
            </div>
            <div className="text-xl font-black text-sky-300 mt-1 font-mono">
              {stats.beneficiaries}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
            <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>يلزم تغيير كلمة المرور:</span>
            </div>
            <div className="text-xl font-black text-amber-400 mt-1 font-mono">
              {stats.mustChange}
            </div>
          </div>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800/80 scrollbar-none">
          {[
            { id: "all", label: "كافة الحسابات", count: stats.total, icon: Users },
            { id: "admins", label: "الإدارة والعمليات", count: stats.adminsAndOps, icon: ShieldCheck },
            { id: "dept_heads", label: "المشرفون والإدارات", count: stats.deptHeadsAndSupervisors, icon: Building2 },
            { id: "employees", label: "الموظفون والكوادر", count: stats.employees, icon: Briefcase },
            { id: "storekeepers", label: "أمناء المستودعات", count: stats.storekeepers, icon: Sliders },
            { id: "leaders", label: "قادة الفرق التطوعية", count: stats.leaders, icon: Sparkles },
            { id: "volunteers", label: "المتطوعون", count: stats.volunteers, icon: CheckCircle2 },
            { id: "beneficiaries", label: "المستفيدون وطلبات الرعاية", count: stats.beneficiaries, icon: Users },
            { id: "support", label: "الدعم الفني", count: stats.support, icon: Shield }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCategoryTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategoryTab(tab.id)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم، رقم الملف/العضوية، الهوية، الجوال، البريد..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Role Filter */}
          <div className="md:col-span-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all">كافة الأدوار والمستويات</option>
              <option value="super_admin">الإدارة العليا (Super Admin)</option>
              <option value="operations_manager">مدير العمليات والتشغيل</option>
              <option value="supervisor">مشرف إدارة ومتابعة</option>
              <option value="dept_head">مدراء الإدارات التنفيذية</option>
              <option value="employee">الموظفين والكوادر</option>
              <option value="storekeeper">أمناء المستودعات</option>
              <option value="leader">قادة الفرق التطوعية</option>
              <option value="volunteer">المتطوعين المسجلين</option>
              <option value="beneficiary">مستفيدي الرعاية الاجتماعية</option>
              <option value="support">فريق الدعم الفني</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="md:col-span-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all">كافة الإدارات والأقسام</option>
              {effectiveDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Volunteer Team Filter */}
          <div className="md:col-span-2">
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all">كافة الفرق التطوعية</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all">كافة الحالات</option>
              <option value="active">نشط (Active)</option>
              <option value="pending">بانتظار المراجعة (Pending)</option>
              <option value="suspended">موقوف (Suspended)</option>
              <option value="inactive">معطل مؤقتاً (Inactive)</option>
              <option value="archived">مؤرشف ({stats.archived})</option>
              <option value="rejected">مرفوض (Rejected)</option>
            </select>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={mustChangeFilter}
                onChange={(e) => setMustChangeFilter(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
              />
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                عرض الحسابات التي يلزمها تغيير كلمة المرور فقط ({stats.mustChange})
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={pendingOnlyFilter}
                onChange={(e) => setPendingOnlyFilter(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                عرض الطلبات المعلقة قيد المراجعة فقط ({stats.pending})
              </span>
            </label>
          </div>

          <div className="text-xs text-slate-400">
            عدد النتائج المعروضة: <strong className="text-slate-700 dark:text-slate-200 font-mono">{filteredUsers.length}</strong> من أصل {users.length}
          </div>
        </div>
      </div>

      {/* Users Table / Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">جاري تحميل وتوحيد بيانات المستخدمين ومطابقتها مع قاعدة البيانات...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">تعذر تحميل بيانات المستخدمين</h3>
            <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchUsers}
              className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-emerald-700 cursor-pointer"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد حسابات مطابقة لمعايير البحث</h3>
            <p className="text-xs text-slate-400">يرجى تعديل مصطلحات البحث أو إعادة ضبط الفلاتر المطبقة أعلاه.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-4">المستخدم والحساب</th>
                    <th className="p-4">الدور والتصنيف</th>
                    <th className="p-4">الإدارة / الفريق التابع</th>
                    <th className="p-4">معلومات الاتصال والتحقق</th>
                    <th className="p-4">حالة الحساب والأمان</th>
                    <th className="p-4">تاريخ التسجيل والنشاط</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredUsers.map((u) => {
                    const roleBadge = getRoleBadge(u.role);
                    const statusBadge = getStatusBadge(u.status);
                    const StatusIcon = statusBadge.icon;
                    const allowManage = canManageTargetRow(u);
                    const allowDelete = canDeleteTargetRow(u);
                    const isArchivedOrDeactivated = u.status === "archived" || u.status === "inactive" || u.status === "deactivated" || Boolean(u.isArchived);

                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Name & Username */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {u.avatarUrl ? (
                                <img
                                  src={u.avatarUrl}
                                  alt={u.name}
                                  className="w-10 h-10 rounded-2xl object-cover shadow-xs shrink-0 border border-slate-200 dark:border-slate-700"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                                  {u.name ? u.name.trim().charAt(0) : "م"}
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                                  u.status === "active"
                                    ? "bg-emerald-500"
                                    : u.status === "pending"
                                    ? "bg-amber-500"
                                    : u.status === "suspended"
                                    ? "bg-rose-500"
                                    : "bg-slate-400"
                                }`}
                                title={statusBadge.label}
                              />
                            </div>

                            <div className="space-y-0.5">
                              <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                                <span>{u.name}</span>
                                {u.role === "operations_manager" && (
                                  <span className="bg-amber-100 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-md">
                                    عمليات
                                  </span>
                                )}
                                {u.beneficiaryNumber && (
                                  <span className="bg-rose-100 text-rose-800 text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold">
                                    #{u.beneficiaryNumber}
                                  </span>
                                )}
                                {u.membershipNumber && (
                                  <span className="bg-teal-100 text-teal-800 text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold">
                                    #{u.membershipNumber}
                                  </span>
                                )}
                                {u.employeeNumber && !u.membershipNumber && !u.beneficiaryNumber && (
                                  <span className="bg-blue-100 text-blue-800 text-[10px] font-mono px-1.5 py-0.2 rounded-md font-bold">
                                    #{u.employeeNumber}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                <span>@{u.username}</span>
                                {u.nationalId && <span>• {u.nationalId}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black border ${roleBadge.bg}`}>
                              {roleBadge.label}
                            </span>
                            <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                              {u.positionTitle || u.jobTitle || (u.category ? `فئة: ${u.category}` : "مسجل في النظام")}
                            </div>
                            {Array.isArray(u.permissions) && u.permissions.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                                <Shield className="w-3 h-3" />
                                <span>{u.permissions.length} صلاحية</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Department / Team */}
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {u.teamName ? `فريق ${u.teamName}` : u.departmentName || "الإدارة العامة"}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {u.hours !== undefined ? `${u.hours} ساعة تطوعية` : u.familySize !== undefined ? `أسرة من ${u.familySize} أفراد` : u.departmentId}
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="p-4 space-y-1">
                          {u.email && (
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[130px]" title={u.email}>{u.email}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleEmailVerification(u)}
                                title={u.emailVerified ? "البريد مؤكد وموثق (انقر لتغيير الحالة)" : "انقر لتأكيد والتحقق من البريد"}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors ${
                                  u.emailVerified
                                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                    : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                }`}
                              >
                                {u.emailVerified ? "موثق ✓" : "غير موثق"}
                              </button>
                            </div>
                          )}
                          {u.phone && (
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px] font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{u.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Status & Security */}
                        <td className="p-4">
                          <div className="space-y-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${statusBadge.bg}`}>
                              <StatusIcon className="w-3 h-3" />
                              <span>{statusBadge.label}</span>
                            </span>

                            {u.mustChangePassword && (
                              <div>
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                                  <KeyRound className="w-3 h-3 text-amber-500" />
                                  <span>يلزم تغيير كلمة المرور</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Last Activity */}
                        <td className="p-4 text-[11px] text-slate-500 dark:text-slate-400">
                          {u.lastLogin ? (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-slate-700 dark:text-slate-300">
                                {new Date(u.lastLogin).toLocaleDateString("ar-SA")}
                              </div>
                              <div className="font-mono text-[10px] text-slate-400">
                                {new Date(u.lastLogin).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          ) : u.createdAt ? (
                            <span className="text-slate-400">مسجل: {new Date(u.createdAt).toLocaleDateString("ar-SA")}</span>
                          ) : (
                            <span className="text-slate-400">لم يسجل دخول بعد</span>
                          )}
                        </td>

                        {/* Actions Column («الإجراءات») */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {/* Quick Approval / Rejection for Pending Users */}
                            {u.status === "pending" && allowManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveUser(u)}
                                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-colors cursor-pointer"
                                  title="اعتماد وقبول الحساب"
                                >
                                  <Check className="w-4 h-4 text-emerald-600" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectUser(u)}
                                  className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 transition-colors cursor-pointer"
                                  title="رفض الطلب مع إدخال السبب"
                                >
                                  <XCircle className="w-4 h-4 text-red-600" />
                                </button>
                              </>
                            )}

                            {/* زر «تعديل» بأيقونة القلم */}
                            {allowManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditModalInitialSection("personal");
                                    setSelectedUserForEdit(u);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="تعديل كافة بيانات المستخدم وصلاحياته"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  <span>تعديل</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditModalInitialSection("role_dept");
                                    setSelectedUserForEdit(u);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800 text-[11px] font-bold transition-colors cursor-pointer"
                                  title="إدارة صلاحيات المستخدم والإدارة"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                  <span>الصلاحيات</span>
                                </button>
                              </>
                            )}

                            {/* زر «عرض التفاصيل» بأيقونة العين */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDetails(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                              title="عرض التفاصيل الكاملة والملفات المرتبطة"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>التفاصيل</span>
                            </button>

                            {/* زر «حذف / أرشفة» بأيقونة سلة المهملات */}
                            {allowDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800 text-[11px] font-bold transition-colors cursor-pointer"
                                title="حذف أو أرشفة أو تعطيل المستخدم"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            )}

                            {/* زر استعادة للأرشفة / التعطيل */}
                            {isArchivedOrDeactivated && allowManage && (
                              <button
                                type="button"
                                onClick={() => handleRestoreUser(u)}
                                className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors cursor-pointer"
                                title="استعادة وتفعيل الحساب"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Reset Password Quick Trigger */}
                            {allowManage && (
                              <button
                                type="button"
                                onClick={() => setSelectedUserForReset(u)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                title="إعادة تعيين كلمة المرور"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Activity Logs Trigger */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForActivity(u)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                              title="سجل نشاط المستخدم"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Responsive Mobile Cards (< 768px) — clean zero-overlap layout */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((u) => {
                const roleBadge = getRoleBadge(u.role);
                const statusBadge = getStatusBadge(u.status);
                const StatusIcon = statusBadge.icon;
                const allowManage = canManageTargetRow(u);
                const allowDelete = canDeleteTargetRow(u);
                const isArchivedOrDeactivated = u.status === "archived" || u.status === "inactive" || u.status === "deactivated" || Boolean(u.isArchived);

                return (
                  <div key={u.id} className="p-4 space-y-3 bg-white dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-sm shrink-0">
                            {u.name ? u.name.trim().charAt(0) : "م"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-black text-sm text-slate-900 dark:text-white truncate">{u.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            @{u.username} {u.nationalId ? `• ${u.nationalId}` : ""}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${statusBadge.bg}`}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusBadge.label}</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      <span className={`px-2.5 py-0.5 rounded-full font-black border ${roleBadge.bg}`}>
                        {roleBadge.label}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400 font-semibold">
                        {u.teamName ? `فريق ${u.teamName}` : u.departmentName || "الإدارة العامة"}
                      </span>
                      {(u.beneficiaryNumber || u.membershipNumber || u.employeeNumber) && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[10px] font-bold">
                          #{u.beneficiaryNumber || u.membershipNumber || u.employeeNumber}
                        </span>
                      )}
                    </div>

                    {(u.phone || u.email) && (
                      <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 font-mono">
                        {u.phone && <span>📞 {u.phone}</span>}
                        {u.email && <span className="truncate">✉️ {u.email}</span>}
                      </div>
                    )}

                    {/* Touch-friendly Actions Bar */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                      {allowManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditModalInitialSection("personal");
                              setSelectedUserForEdit(u);
                            }}
                            className="flex-1 min-w-[85px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditModalInitialSection("role_dept");
                              setSelectedUserForEdit(u);
                            }}
                            className="flex-1 min-w-[90px] py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>الصلاحيات</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedUserForDetails(u)}
                        className="flex-1 min-w-[90px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>التفاصيل</span>
                      </button>
                      {allowDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="flex-1 min-w-[85px] py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                      {isArchivedOrDeactivated && allowManage && (
                        <button
                          type="button"
                          onClick={() => handleRestoreUser(u)}
                          className="py-2 px-3 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>استعادة</span>
                        </button>
                      )}
                      {allowManage && (
                        <button
                          type="button"
                          onClick={() => setSelectedUserForReset(u)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 cursor-pointer"
                          title="إعادة تعيين كلمة المرور"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW USER (إنشاء مستخدم جديد) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          departments={effectiveDepartments}
          currentUser={currentUser}
          onToast={(msg) => setSuccessToast(msg)}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setIsCreateModalOpen(false);
            refreshAllData();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COMPREHENSIVE USER EDIT (شاشة تعديل المستخدم الشاملة) */}
      {/* ========================================================================= */}
      {selectedUserForEdit && (
        <UserComprehensiveEditModal
          user={selectedUserForEdit}
          departments={effectiveDepartments}
          teams={teams}
          scope={userScope}
          currentUser={currentUser}
          initialSection={editModalInitialSection}
          onOpenResetPassword={(u) => setSelectedUserForReset(u)}
          onClose={() => setSelectedUserForEdit(null)}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setSelectedUserForEdit(null);
            refreshAllData();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: USER DELETE / ARCHIVE / DEACTIVATE (نافذة الحذف والأرشفة الآمنة) */}
      {/* ========================================================================= */}
      {selectedUserForDelete && (
        <UserDeleteArchiveModal
          user={selectedUserForDelete}
          scope={userScope}
          onClose={() => setSelectedUserForDelete(null)}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setSelectedUserForDelete(null);
            refreshAllData();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FULL USER DETAILS VIEW (عرض التفاصيل الكاملة) */}
      {/* ========================================================================= */}
      {selectedUserForDetails && (
        <UserFullDetailsModal
          user={selectedUserForDetails}
          canEdit={canManageTargetRow(selectedUserForDetails)}
          onEditClick={(u) => setSelectedUserForEdit(u)}
          onActivityClick={(u) => setSelectedUserForActivity(u)}
          onClose={() => setSelectedUserForDetails(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RESET PASSWORD (إعادة تعيين كلمة المرور مع فرض التغيير) */}
      {/* ========================================================================= */}
      {selectedUserForReset && (
        <ResetPasswordModal
          user={selectedUserForReset}
          currentUser={currentUser}
          onToast={(msg) => setSuccessToast(msg)}
          onClose={() => setSelectedUserForReset(null)}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setSelectedUserForReset(null);
            refreshAllData();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: USER ACTIVITY AUDIT LOG (سجل نشاط المستخدم) */}
      {/* ========================================================================= */}
      {selectedUserForActivity && (
        <UserActivityModal
          user={selectedUserForActivity}
          onClose={() => setSelectedUserForActivity(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: CONFIRM ACTION MODAL (تأكيد العمليات الإدارية) */}
      {/* ========================================================================= */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h3 className="text-base font-black text-slate-900 dark:text-white">{confirmModal.title}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={async () => {
                  setIsSubmittingAction(true);
                  try {
                    await confirmModal.onConfirm();
                    setConfirmModal(null);
                  } catch (err: any) {
                    setErrorToast(err.message || "تعذر تنفيذ العملية.");
                    setConfirmModal(null);
                  } finally {
                    setIsSubmittingAction(false);
                  }
                }}
                className={`px-5 py-2 rounded-xl text-xs font-black text-white cursor-pointer disabled:opacity-50 ${
                  confirmModal.tone === "rose"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : confirmModal.tone === "amber"
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isSubmittingAction ? "جاري التنفيذ..." : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: REJECT USER MODAL */}
      {/* ========================================================================= */}
      {rejectModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in" dir="rtl">
          <form
            onSubmit={handleSubmitRejectUser}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
          >
            <h3 className="text-base font-black text-rose-700 dark:text-rose-300">
              رفض طلب حساب ({rejectModalUser.name})
            </h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                سبب الرفض:
              </label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectModalUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                {isSubmittingAction ? "جاري الحفظ..." : "تأكيد الرفض"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: PASSWORD RESET LINK (رابط تغيير كلمة المرور) */}
      {/* ========================================================================= */}
      {resetLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-purple-300">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">رابط تغيير كلمة المرور</h2>
                  <p className="text-xs text-purple-200">{resetLinkModal.user.name}</p>
                </div>
              </div>
              <button
                onClick={() => setResetLinkModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-900 text-xs text-purple-900 dark:text-purple-200">
                تم توليد رابط آمن صالح لمدة 24 ساعة للمستخدم <b>{resetLinkModal.user.name}</b> وإرسال إشعار إلى بريده: <span className="font-mono">{resetLinkModal.userEmail}</span>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 dark:text-slate-300 block mb-1">
                  رابط إعادة التعيين المباشر:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={resetLinkModal.resetLink}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 pl-24 font-mono text-xs text-slate-800 dark:text-slate-200 select-all"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resetLinkModal.resetLink);
                      setSuccessToast("تم نسخ رابط إعادة تعيين كلمة المرور إلى الحافظة!");
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-2xs"
                  >
                    نسخ الرابط
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400">
                يمكنك مشاركة هذا الرابط مع الموظف أو المدير مباشرة لتسجيل كلمة مرور خاصة به، أو الاعتماد على الرابط المرسل تلقائياً إلى بريده المعتمد.
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setResetLinkModal(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: CREATE USER MODAL
// =============================================================================
interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  currentUser: any;
  onToast?: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  departments,
  currentUser,
  onToast,
  onSuccess
}) => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "dep-1");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState("employee");
  const [password, setPassword] = useState(() => generateStrongPassword());
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([
    "view_department",
    "create_data",
    "edit_data"
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateStrong = () => {
    setPassword(generateStrongPassword());
    setError(null);
  };

  const handleTogglePermission = (permKey: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permKey) ? prev.filter((p) => p !== permKey) : [...prev, permKey]
    );
  };

  const handleSelectPreset = (preset: "all" | "standard" | "view_only") => {
    if (preset === "all") {
      const allPerms: string[] = [];
      PERMISSION_CATEGORIES.forEach((c) => c.permissions.forEach((p) => allPerms.push(p.key)));
      setSelectedPermissions(allPerms);
    } else if (preset === "standard") {
      setSelectedPermissions([
        "view_department",
        "create_data",
        "edit_data",
        "export_pdf",
        "manage_tasks"
      ]);
    } else {
      setSelectedPermissions(["view_department", "view_reports"]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("يرجى إدخال اسم المستخدم الكامل.");
      return;
    }

    const pwdEval = evaluatePasswordStrength(password.trim());
    if (!pwdEval.allPassed) {
      setError(`كلمة المرور لا تستوفي معايير الأمان (Bcrypt): ${pwdEval.errors.join(" ")}`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/db/users/create"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          nationalId: nationalId.trim() || undefined,
          departmentId,
          jobTitle: jobTitle.trim() || undefined,
          role,
          password: password.trim(),
          mustChangePassword,
          status,
          permissions: selectedPermissions
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل إنشاء المستخدم.");

      onSuccess(data.message || `تم إنشاء حساب المستخدم (${name.trim()}) بنجاح.`);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ البيانات.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black">إضافة حساب مستخدم جديد</h2>
              <p className="text-xs text-slate-300">إنشاء الحساب وتعيين الصلاحيات الأولية مع خيار فرض تغيير كلمة المرور</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3.5 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                الاسم الكامل للمستخدم: *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: م. فهد بن أحمد القرشي"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                اسم المستخدم (Username):
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="مثال: fahad_ahmed"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                البريد الإلكتروني:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@riadataleata.org.sa"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الجوال:
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="أدخل رقم الجوال يبدأ بـ 05"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                رقم الهوية الوطنية / الإقامة:
              </label>
              <input
                type="text"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="أدخل رقم الهوية الوطنية (10 أرقام)"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                المسمى الوظيفي:
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="مثال: منسق مبادرات وبرامج"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                الإدارة التابعة:
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                الدور في النظام (Role):
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="employee">موظف إدارة (Employee)</option>
                <option value="operations_manager">مدير العمليات والتشغيل (Operations)</option>
                <option value="supervisor">مشرف إدارة ومتابعة (Supervisor)</option>
                <option value="department_admin">مدير إدارة تنفيذي (Dept Head)</option>
                <option value="storekeeper">أمين مستودع (Storekeeper)</option>
                <option value="leader">قائد فريق تطوعي (Leader)</option>
                <option value="volunteer">متطوع مسجل (Volunteer)</option>
                <option value="beneficiary">مستفيد رعاية اجتماعية (Beneficiary)</option>
                <option value="support_manager">مدير الدعم الفني (Support Manager)</option>
                <option value="support_agent">أخصائي دعم فني (Support)</option>
                <option value="admin">الإدارة العليا (Super Admin)</option>
              </select>
            </div>
          </div>

          {/* Password & Security Section */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <span>كلمة المرور الأولية للحساب: *</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateStrong}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                توليد كلمة مرور عشوائية قوية
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 pl-20 font-mono text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(password);
                  if (onToast) onToast("تم نسخ كلمة المرور إلى الحافظة.");
                }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                نسخ
              </button>
            </div>

            {/* Real-time Password Strength Meter */}
            <PasswordStrengthMeter password={password} />

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={mustChangePassword}
                  onChange={(e) => setMustChangePassword(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span className="text-amber-800 dark:text-amber-300 font-black">
                  إجبار المستخدم على تغيير كلمة المرور عند أول تسجيل دخول (موصى به أمنياً)
                </span>
              </label>

              <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                <span>الحالة الأولية:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="initial_status"
                    checked={status === "active"}
                    onChange={() => setStatus("active")}
                  />
                  <span>مفعل ونشط</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="initial_status"
                    checked={status === "inactive"}
                    onChange={() => setStatus("inactive")}
                  />
                  <span>غير مفعل مؤقتاً</span>
                </label>
              </div>
            </div>
          </div>

          {/* Permissions Matrix Presets & Selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>تحديد الصلاحيات الممنوحة للمستخدم ({selectedPermissions.length} محددة)</span>
                </h3>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectPreset("all")}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors cursor-pointer"
                >
                  كامل الصلاحيات
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("standard")}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors cursor-pointer"
                >
                  صلاحيات قياسية
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectPreset("view_only")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
                >
                  عرض فقط
                </button>
              </div>
            </div>

            {/* Categories Accordions / Checklist */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {PERMISSION_CATEGORIES.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
                      <CatIcon className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{cat.nameAr}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(cat.permissions || []).map((p) => {
                        const isChecked = selectedPermissions.includes(p.key);
                        return (
                          <label
                            key={p.key}
                            className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                              isChecked
                                ? "bg-white dark:bg-slate-800 border-emerald-500 shadow-2xs"
                                : "bg-transparent border-slate-200/80 dark:border-slate-700/60 opacity-80"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(p.key)}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="font-bold text-slate-800 dark:text-slate-200">{p.labelAr}</div>
                              <div className="text-[10px] text-slate-400 leading-tight">{p.descAr}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs px-6 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الحفظ والإنشاء...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>حفظ وإنشاء الحساب</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: USER DETAILS & PERMISSIONS MODAL
// =============================================================================
interface UserDetailsModalProps {
  user: SystemUser;
  departments: Department[];
  currentUser: any;
  currentUserRole?: string;
  onOpenResetPassword?: (user: SystemUser) => void;
  onApproveUser?: (user: SystemUser) => void;
  onRejectUser?: (user: SystemUser) => void;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  departments,
  currentUser,
  currentUserRole = "admin",
  onOpenResetPassword,
  onApproveUser,
  onRejectUser,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<"info" | "permissions" | "activity">("info");

  // Editable Form Fields
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [nationalId, setNationalId] = useState(user.nationalId || "");
  const [departmentId, setDepartmentId] = useState(user.departmentId || "dep-1");
  const [jobTitle, setJobTitle] = useState(user.jobTitle || "");
  const [role, setRole] = useState(user.role || "employee");
  const [status, setStatus] = useState(user.status || "active");
  const [mustChangePassword, setMustChangePassword] = useState(!!user.mustChangePassword);
  const [permissions, setPermissions] = useState<string[]>(user.permissions || []);
  const [notes, setNotes] = useState(user.notes || "");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTogglePermission = (key: string) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(buildApiUrl("/api/db/users/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          userId: user.userId || user.id,
          name: name.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
          nationalId: nationalId.trim(),
          departmentId,
          jobTitle: jobTitle.trim(),
          role,
          status,
          mustChangePassword,
          permissions,
          notes: notes.trim()
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل تحديث بيانات المستخدم.");

      onSuccess(data.message || `تم تحديث بيانات المستخدم (${name}) بنجاح.`);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ التعديلات.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="w-full max-w-4xl max-h-[94vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-lg border border-white/15">
              {(user.name || 'م').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-white">{user.name}</h2>
                <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-mono">
                  @{user.username}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {user.jobTitle || "موظف"} • {user.departmentName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-6 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "info"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>بيانات الحساب الأساسية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "permissions"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>مصفوفة الصلاحيات المنظمة ({permissions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "activity"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل نشاط الحساب</span>
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3.5 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: BASIC ACCOUNT INFO */}
          {activeTab === "info" && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    الاسم الكامل:
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    اسم المستخدم (Username):
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    البريد الإلكتروني:
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الجوال:
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الهوية الوطنية / الإقامة:
                  </label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    المسمى الوظيفي:
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    الإدارة التابعة:
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    الدور في النظام (Role):
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white"
                  >
                    <option value="employee">موظف إدارة (Employee)</option>
                    <option value="operations_manager">مدير العمليات والتشغيل (Operations)</option>
                    <option value="supervisor">مشرف إدارة ومتابعة (Supervisor)</option>
                    <option value="department_admin">مدير إدارة تنفيذي (Dept Head)</option>
                    <option value="storekeeper">أمين مستودع (Storekeeper)</option>
                    <option value="leader">قائد فريق تطوعي (Leader)</option>
                    <option value="volunteer">متطوع مسجل (Volunteer)</option>
                    <option value="beneficiary">مستفيد رعاية اجتماعية (Beneficiary)</option>
                    <option value="support_manager">مدير الدعم الفني (Support Manager)</option>
                    <option value="support_agent">أخصائي دعم فني</option>
                    <option value="admin">الإدارة العليا (Super Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                    حالة الحساب:
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-sans text-slate-900 dark:text-white"
                  >
                    <option value="active">نشط ومفعل (Active)</option>
                    <option value="pending">قيد المراجعة والاعتماد (Pending)</option>
                    <option value="suspended">موقوف إدارياً (Suspended)</option>
                    <option value="rejected">مرفوض (Rejected)</option>
                    <option value="inactive">غير مفعل (Inactive)</option>
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={mustChangePassword}
                      onChange={(e) => setMustChangePassword(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-amber-800 dark:text-amber-300 font-black">
                      إجبار المستخدم على تغيير كلمة المرور عند الدخول القادم
                    </span>
                  </label>
                </div>
              </div>

              {/* Beneficiary Specific Details Card */}
              {(user.role === 'beneficiary' || user.beneficiaryNumber) && (
                <div className="bg-rose-50/70 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-rose-600" />
                      بيانات مستفيد الرعاية الاجتماعية (المستودع والإعانات)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
                      رقم الملف: #{user.beneficiaryNumber || user.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">فئة الرعاية:</span>
                      <strong className="text-slate-800 dark:text-white">{user.category || 'عام'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">أفراد الأسرة:</span>
                      <strong className="text-slate-800 dark:text-white">{user.familySize || 1} أفراد</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">الدخل التقديري:</span>
                      <strong className="text-slate-800 dark:text-white font-mono">{user.monthlyIncome ? `${user.monthlyIncome} ر.س` : 'غير محدد'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">نوع السكن:</span>
                      <strong className="text-slate-800 dark:text-white">{user.housingType || 'غير محدد'}</strong>
                    </div>
                  </div>

                  {user.address && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 pt-1 border-t border-rose-200/60">
                      العنوان الميداني: <strong>{user.address}</strong>
                    </div>
                  )}

                  {user.status === "pending" && (
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        طلب الاستفادة بانتظار الاعتماد الإداري
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (onApproveUser) onApproveUser(user);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          اعتماد الطلب ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onRejectUser) onRejectUser(user);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          رفض الطلب
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Volunteer Specific Details Card */}
              {(user.role === 'volunteer' || user.membershipNumber) && (
                <div className="bg-teal-50/70 dark:bg-teal-950/30 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      بيانات العضوية التطوعية (الساعات والفرق)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-100 text-teal-800 border border-teal-300">
                      العضوية: #{user.membershipNumber || user.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">الساعات المعتمدة:</span>
                      <strong className="text-slate-800 dark:text-white font-mono">{user.hours || 0} ساعة تطوعية</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">الفريق المسند:</span>
                      <strong className="text-slate-800 dark:text-white">{user.teamName || 'عام'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">الإدارة المشرفة:</span>
                      <strong className="text-slate-800 dark:text-white">إدارة التطوع والموارد البشرية</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Linked Profiles Card (if person has multiple records linked) */}
              {user.linkedProfiles && user.linkedProfiles.length > 1 && (
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-500" />
                    السجلات والملفات الموحدة لهذا المستخدم في النظام ({user.linkedProfiles.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {user.linkedProfiles.map((lp, idx) => (
                      <span key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-700 dark:text-slate-300">
                        {lp.source === 'beneficiaries' ? 'رعاية مستفيدين' : lp.source === 'volunteers' ? 'سجل متطوع' : lp.source === 'employees' ? 'سجل موظف' : lp.source === 'departments' ? 'مدير إدارة' : lp.source === 'teams' ? 'قائد فريق' : lp.source} • {lp.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Meta Badges */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 block">تاريخ الإنشاء:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString("ar-SA") : "2026-01-01"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">آخر تسجيل دخول:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200 font-mono">
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("ar-SA") : "غير متوفر"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">حالة البريد الإلكتروني:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> تم التحقق
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">حالة الهوية:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> معتمدة رسمياً
                  </span>
                </div>
              </div>

              {/* Password Display Card per Requirement 5 (Bcrypt Masked) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">كلمة المرور:</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                      مشفرة بنظام Bcrypt ✓
                    </span>
                  </div>
                  <div className="font-mono text-base font-black tracking-widest text-slate-700 dark:text-slate-300">
                    ••••••••••
                  </div>
                  <p className="text-[10px] text-slate-400">
                    كلمة المرور الأصلية مشفرة وغير قابلة للكشف طبقاً للسياسة الأمنية الصارمة لحماية المستخدمين.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenResetPassword) onOpenResetPassword(user);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>إعادة تعيين كلمة المرور</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      if (onOpenResetPassword) onOpenResetPassword(user);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>تغيير كلمة المرور</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                  ملاحظات وتوجيهات إدارية على الحساب:
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="أية ملاحظات أو استثناءات خاصة بهذا الحساب..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-sans text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSIONS MATRIX */}
          {activeTab === "permissions" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  الصلاحيات المفعلة لهذا الحساب: ({permissions.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const all: string[] = [];
                      PERMISSION_CATEGORIES.forEach((c) => c.permissions.forEach((p) => all.push(p.key)));
                      setPermissions(all);
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setPermissions([])}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                {PERMISSION_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-800/40">
                      <div className="font-black text-xs text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                        <CatIcon className="w-4 h-4 text-indigo-500" />
                        <span>{cat.nameAr}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {(cat.permissions || []).map((p) => {
                          const isChecked = permissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                                isChecked
                                  ? "bg-white dark:bg-slate-800 border-emerald-500 shadow-2xs"
                                  : "bg-transparent border-slate-200 dark:border-slate-700/60 opacity-80"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(p.key)}
                                className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200">{p.labelAr}</div>
                                <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{p.descAr}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: USER ACTIVITY */}
          {activeTab === "activity" && (
            <div className="animate-fade-in">
              <UserActivityTable userId={user.userId || user.id} />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              إغلاق
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs px-6 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري حفظ التعديلات...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديلات في قاعدة البيانات</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ResetPasswordModalProps {
  user: SystemUser;
  currentUser: any;
  onToast?: (msg: string) => void;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  currentUser,
  onToast,
  onClose,
  onSuccess
}) => {
  const [newPassword, setNewPassword] = useState(() => generateStrongPassword());
  const [mustChangePassword, setMustChangePassword] = useState(true);
  const [showPassword, setShowPassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateRandom = () => {
    setNewPassword(generateStrongPassword());
    setError(null);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwdEval = evaluatePasswordStrength(newPassword.trim());
    if (!pwdEval.allPassed) {
      setError(`كلمة المرور لا تستوفي معايير الأمان (Bcrypt): ${pwdEval.errors.join(" ")}`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(buildApiUrl("/api/db/users/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({
          userId: user.userId || user.id,
          newPassword: newPassword.trim(),
          mustChangePassword
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل إعادة تعيين كلمة المرور.");

      onSuccess(data.message || `تمت إعادة تعيين وتشفير كلمة مرور المستخدم (${user.name}) بنجاح.`);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black">إعادة تعيين كلمة المرور</h2>
              <p className="text-xs text-amber-100">تشفير وحفظ كلمة مرور جديدة للحساب</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleReset} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 p-3 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <div className="text-slate-400 text-[10px]">المستخدم المستهدف:</div>
            <div className="font-black text-slate-800 dark:text-white mt-0.5">{user.name}</div>
            <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                كلمة المرور الجديدة:
              </label>
              <button
                type="button"
                onClick={generateRandom}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                توليد كلمة قوية
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 pl-20 font-mono text-xs text-slate-900 dark:text-white"
                required
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "إخفاء" : "إظهار"}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newPassword);
                    if (onToast) onToast("تم نسخ كلمة المرور إلى الحافظة.");
                  }}
                  className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg cursor-pointer"
                  title="نسخ"
                >
                  نسخ
                </button>
              </div>
            </div>

            {/* Real-time Password Strength Meter */}
            <PasswordStrengthMeter password={newPassword} />
          </div>

          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/50">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900 dark:text-amber-200">
              <input
                type="checkbox"
                checked={mustChangePassword}
                onChange={(e) => setMustChangePassword(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
              />
              <span>إجبار المستخدم على تغيير كلمة المرور عند تسجيل الدخول القادم</span>
            </label>
            <p className="text-[10px] text-amber-700 dark:text-amber-300/80 mt-1 mr-6">
              ستظهر للمستخدم شاشة منبثقة إجبارية فور دخوله تمنعه من التصفح حتى يقوم بتعيين كلمة مرور خاصة به.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || !newPassword || newPassword.length < 6}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري التحديث والتشفير...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>تحديث كلمة المرور</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: USER ACTIVITY AUDIT TABLE
// =============================================================================
const UserActivityTable: React.FC<{ userId: string }> = ({ userId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/db/users/activity-logs?userId=${encodeURIComponent(userId)}`), {
          headers: getAuthHeaders()
        });
        const data = await res.json().catch(() => null);
        if (data && data.status === "success") {
          setLogs(data.logs || []);
        }
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [userId]);

  if (isLoading) {
    return <div className="p-8 text-center text-xs text-slate-400">جاري جلب سجل النشاطات...</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="p-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        لا توجد نشاطات مسجلة لهذا الحساب حتى الآن.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-black text-slate-700 dark:text-slate-300">
        أحدث العمليات وسجلات الوصول الأمني ({logs.length}):
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs flex items-center justify-between gap-3"
          >
            <div className="space-y-0.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${log.status === 'allowed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span>{log.action}</span>
                <span className="text-[10px] text-slate-400 font-normal">• {log.resource}</span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {log.notes}
              </div>
            </div>
            <div className="text-right shrink-0 text-[10px] text-slate-400 font-mono">
              <div>{new Date(log.timestamp).toLocaleDateString("ar-SA")}</div>
              <div>{new Date(log.timestamp).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: USER ACTIVITY AUDIT MODAL (STANDALONE)
// =============================================================================
const UserActivityModal: React.FC<{ user: SystemUser; onClose: () => void }> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black">سجل نشاط وتدقيق الحساب</h2>
              <p className="text-xs text-slate-300">{user.name} (@{user.username})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          <UserActivityTable userId={user.userId || user.id} />

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
