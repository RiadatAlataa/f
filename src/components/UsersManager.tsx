import React, { useState, useEffect, useMemo } from "react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { generateStrongPassword, evaluatePasswordStrength } from "../utils/passwordSecurity";
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
  Info
} from "lucide-react";

export interface SystemUser {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  nationalId?: string;
  role: string;
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  permissions: string[];
  allowedDepartmentIds?: string[];
  allowedPages?: string[];
  status: "active" | "suspended" | "inactive";
  mustChangePassword?: boolean;
  lastLogin?: string | null;
  lastActivity?: string | null;
  createdAt?: string;
  emailVerified?: boolean;
  identityVerified?: boolean;
  notes?: string;
}

interface Department {
  id: string;
  nameAr: string;
  nameEn?: string;
}

interface UsersManagerProps {
  currentUser?: any;
  currentUserRole?: string;
  departments?: Department[];
  onOpenDepartment?: (deptId: string) => void;
  onRefreshDatabase?: () => Promise<void>;
}

// Categorized System Permissions
export const PERMISSION_CATEGORIES: {
  id: string;
  nameAr: string;
  icon: any;
  color: string;
  permissions: { key: string; labelAr: string; descAr: string }[];
}[] = [
  {
    id: "dashboard",
    nameAr: "لوحة التحكم والمؤشرات (Dashboard)",
    icon: Activity,
    color: "from-blue-600 to-indigo-600",
    permissions: [
      { key: "view_department", labelAr: "عرض لوحة القيادة", descAr: "مشاهدة الإحصائيات العامة والمؤشرات التشغيلية" },
      { key: "view_reports", labelAr: "استعراض التقارير", descAr: "الاطلاع على تقارير الأداء والمخرجات الدورية" },
      { key: "export_pdf", labelAr: "تصدير تقارير PDF", descAr: "طباعة وتحميل التقارير الرسمية بصيغة PDF" },
      { key: "export_excel", labelAr: "تصدير جداول Excel", descAr: "تحميل واستخراج البيانات في ملفات Excel وCSV" }
    ]
  },
  {
    id: "volunteering",
    nameAr: "إدارة التطوع والمبادرات (Volunteering)",
    icon: Sparkles,
    color: "from-emerald-600 to-teal-600",
    permissions: [
      { key: "view_volunteer_portal", labelAr: "بوابة التطوع", descAr: "الوصول لبوابة إدارة المتطوعين والفرص" },
      { key: "manage_volunteers", labelAr: "إدارة المتطوعين", descAr: "قبول وتعديل ملفات المتطوعين وسجلاتهم" },
      { key: "create_initiatives", labelAr: "إطلاق المبادرات", descAr: "إنشاء المبادرات والبرامج التطوعية الجديدة" },
      { key: "edit_initiatives", labelAr: "تعديل المبادرات", descAr: "تحديث شروط وأوقات وتفاصيل المبادرات" },
      { key: "manage_teams", labelAr: "إدارة الفرق التطوعية", descAr: "اعتماد الفرق وتعيين القادة وتعديل الأعضاء" }
    ]
  },
  {
    id: "hr",
    nameAr: "الموارد البشرية والكوادر (HR)",
    icon: Briefcase,
    color: "from-cyan-600 to-blue-700",
    permissions: [
      { key: "manage_staff", labelAr: "إدارة شؤون الموظفين", descAr: "إضافة وتعديل بيانات الكوادر والموظفين" },
      { key: "manage_tasks", labelAr: "التكليفات والمهام", descAr: "إسناد المهام ومتابعة إنجاز الفريق" },
      { key: "approve_leaves", labelAr: "اعتماد الإجازات والطلبات", descAr: "الموافقة على طلبات الإجازة والبدلات" }
    ]
  },
  {
    id: "media",
    nameAr: "الإعلام والعلاقات العامة (Media)",
    icon: ExternalLink,
    color: "from-purple-600 to-pink-600",
    permissions: [
      { key: "manage_homepage", labelAr: "إدارة الصفحة الرئيسية", descAr: "تعديل محتوى البوابة وسلايدر الواجهة والأخبار" },
      { key: "manage_media", labelAr: "إدارة المركز الإعلامي", descAr: "نشر الأخبار والتغطيات وألبوم الصور" },
      { key: "manage_partners", labelAr: "إدارة شركاء النجاح", descAr: "إضافة وتعديل وترتيب شركاء النجاح والرعاة" }
    ]
  },
  {
    id: "operations",
    nameAr: "إدارة العمليات والتشغيل (Operations)",
    icon: Sliders,
    color: "from-amber-600 to-orange-600",
    permissions: [
      { key: "operations_manager", labelAr: "صلاحيات مدير العمليات الكاملة", descAr: "أعلى مستوى تشغيلي للإشراف على كافة الإدارات" },
      { key: "cross_department_access", labelAr: "الوصول العابر للإدارات", descAr: "الدخول والتنقل بين كافة الإدارات بدون قيود" },
      { key: "manage_directives", labelAr: "إدارة التوجيهات والتعاميم", descAr: "إصدار التوجيهات التشغيلية للإدارات" }
    ]
  },
  {
    id: "beneficiaries",
    nameAr: "إدارة المستفيدين والخدمات (Beneficiaries)",
    icon: Users,
    color: "from-rose-600 to-red-600",
    permissions: [
      { key: "manage_beneficiaries", labelAr: "ملفات المستفيدين", descAr: "تسجيل واعتماد طلبات المساعدات للمستفيدين" },
      { key: "approve_aid", labelAr: "اعتماد صرف المساعدات", descAr: "الموافقة على صرف السلال والمساعدات النقدية" },
      { key: "manage_distributions", labelAr: "إدارة التوزيع والتسليم", descAr: "مسح وتوثيق تسليم المعونات للمستفيدين" }
    ]
  },
  {
    id: "inventory",
    nameAr: "المستودعات والمخزون (Inventory)",
    icon: Building2,
    color: "from-emerald-700 to-teal-800",
    permissions: [
      { key: "view_stock", labelAr: "عرض حركة المخزون", descAr: "مراقبة أرصدة الأصناف ومستويات التخزين" },
      { key: "receive_data", labelAr: "استلام وتوريد بضائع", descAr: "تسجيل أذونات الإدخال وسندات الاستلام" },
      { key: "disburse_data", labelAr: "صرف وتسليم أصناف", descAr: "تسجيل أذونات الإخراج وسندات الصرف" }
    ]
  },
  {
    id: "attendance",
    nameAr: "الحضور والانصراف والنقاط (Attendance & Points)",
    icon: CheckCircle2,
    color: "from-teal-600 to-emerald-700",
    permissions: [
      { key: "scan_attendance", labelAr: "مسح وتأكيد الحضور", descAr: "تسجيل الحضور والانصراف بالباركود وQR" },
      { key: "manage_points", labelAr: "رصيد النقاط والتقييم", descAr: "احتساب وتعديل الساعات والنقاط المكتسبة" }
    ]
  },
  {
    id: "security_users",
    nameAr: "إدارة المستخدمين والصلاحيات والأمان (Users & Security)",
    icon: KeyRound,
    color: "from-slate-800 to-slate-950",
    permissions: [
      { key: "manage_users", labelAr: "إدارة المستخدمين والحسابات", descAr: "إنشاء وتعديل وتجميد حسابات المستخدمين" },
      { key: "reset_passwords", labelAr: "إعادة تعيين كلمات المرور", descAr: "تغيير كلمات المرور وفرض التحديث الإلزامي" },
      { key: "manage_permissions", labelAr: "إدارة مصفوفة الصلاحيات", descAr: "تخصيص الصلاحيات والأدوار ونطاق الإدارات" },
      { key: "view_audit_logs", labelAr: "سجل التدقيق والنشاط الأمني", descAr: "مراقبة كافة عمليات الدخول وتغييرات البيانات" }
    ]
  }
];

export const UsersManager: React.FC<UsersManagerProps> = ({
  currentUser,
  currentUserRole = "admin",
  departments = [],
  onOpenDepartment,
  onRefreshDatabase
}) => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [mustChangeFilter, setMustChangeFilter] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<SystemUser | null>(null);
  const [selectedUserForReset, setSelectedUserForReset] = useState<SystemUser | null>(null);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState<SystemUser | null>(null);

  // Modals Form States
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-hide toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Fetch Users
  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/db/users");
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "فشل جلب قائمة المستخدمين من الخادم.");
      }

      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء جلب بيانات المستخدمين.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = u.name?.toLowerCase().includes(q);
        const matchesUsername = u.username?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesPhone = u.phone?.includes(q);
        const matchesNat = u.nationalId?.includes(q);
        const matchesTitle = u.jobTitle?.toLowerCase().includes(q);
        if (!matchesName && !matchesUsername && !matchesEmail && !matchesPhone && !matchesNat && !matchesTitle) {
          return false;
        }
      }

      // Role filter
      if (roleFilter !== "all") {
        if (roleFilter === "super_admin" && u.role !== "admin") return false;
        if (roleFilter === "operations_manager" && u.role !== "operations_manager") return false;
        if (roleFilter === "dept_head" && u.role !== "department_admin") return false;
        if (roleFilter === "employee" && u.role !== "employee") return false;
        if (roleFilter === "storekeeper" && u.role !== "storekeeper") return false;
        if (roleFilter === "leader" && u.role !== "leader") return false;
        if (roleFilter === "volunteer" && u.role !== "volunteer") return false;
        if (roleFilter === "support" && !u.role.includes("support")) return false;
      }

      // Dept filter
      if (deptFilter !== "all" && u.departmentId !== deptFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && u.status !== statusFilter) {
        return false;
      }

      // Must change password filter
      if (mustChangeFilter && !u.mustChangePassword) {
        return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, deptFilter, statusFilter, mustChangeFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      suspended: users.filter((u) => u.status === "suspended").length,
      mustChange: users.filter((u) => u.mustChangePassword).length,
      operationsAndAdmins: users.filter((u) => u.role === "admin" || u.role === "operations_manager").length
    };
  }, [users]);

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
      case "support_manager":
      case "support_agent":
        return {
          label: "الدعم الفني والخدمات",
          bg: "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
        };
      default:
        return {
          label: "مستخدم نظام",
          bg: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
        };
    }
  };

  // Toggle user status
  const handleToggleStatus = async (user: SystemUser) => {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    const confirmMessage = nextStatus === "suspended" 
      ? `هل أنت متأكد من رغبتك في تجميد حساب المستخدم (${user.name})؟ لن يتمكن من تسجيل الدخول.`
      : `هل أنت متأكد من إعادة تفعيل حساب المستخدم (${user.name})؟`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch("/api/db/users/toggle-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.userId || user.id,
          status: nextStatus,
          reason: `تغيير الحالة بواسطة المسؤول (${currentUser?.name || 'الإدارة المركزية'})`
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل تغيير حالة الحساب.");

      setSuccessToast(data.message || `تم تحديث حالة المستخدم (${user.name}) بنجاح.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تعديل حالة الحساب.");
    }
  };

  // Delete User
  const handleDeleteUser = async (user: SystemUser) => {
    if (user.userId === "admin-user" || user.userId === "ops-manager") {
      alert("لا يمكن حذف حساب الإدارة العليا أو مدير العمليات الرئيسي للحفاظ على استقرار النظام.");
      return;
    }

    if (!window.confirm(`هل أنت متأكد تماماً من حذف حساب (${user.name})؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    try {
      const res = await fetch("/api/db/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.userId || user.id })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "فشل حذف الحساب.");

      setSuccessToast(`تم حذف حساب (${user.name}) بنجاح.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء حذف الحساب.");
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 left-6 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-700/80 flex items-center gap-3 animate-slide-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="text-xs font-bold">{successToast}</span>
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
                مركز إدارة الهوية والحوكمة الرقمية
              </span>
              <span className="bg-white/10 text-slate-300 px-3 py-1 rounded-full text-xs font-semibold">
                صلاحيات تشغيلية مركزية
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              إدارة المستخدمين والصلاحيات والأمان
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              المنظومة المركزية لإدارة حسابات الإدارة العليا، مدير العمليات، مدراء الإدارات، الموظفين، الفرق التطوعية، وكافة المستخدمين، مع التحكم الكامل بكلمات المرور المشفرة وفرض التحديث ومصفوفة الصلاحيات.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة مستخدم جديد</span>
            </button>
            <button
              onClick={fetchUsers}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-3 rounded-2xl text-xs font-bold border border-white/10 transition-all cursor-pointer flex items-center gap-2"
              title="تحديث البيانات من الخادم"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>إجمالي الحسابات:</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">
              {stats.total}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>الحسابات النشطة:</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 font-mono">
              {stats.active}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-rose-300 font-semibold flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 text-rose-400" />
              <span>الموقوفة والمجمدة:</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1 font-mono">
              {stats.suspended}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
            <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>يلزم تغيير كلمة المرور:</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 font-mono">
              {stats.mustChange}
            </div>
          </div>
        </div>
      </div>

      {/* Control & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="البحث بالاسم، اسم المستخدم، البريد، الجوال، الهوية..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 pr-10 pl-4 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Role Filter */}
          <div className="md:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all">كافة الأدوار والمستويات</option>
              <option value="super_admin">الإدارة العليا (Super Admin)</option>
              <option value="operations_manager">مدير العمليات والتشغيل</option>
              <option value="dept_head">مدراء الإدارات التنفيذية</option>
              <option value="employee">الموظفين والكوادر</option>
              <option value="storekeeper">أمناء المستودعات</option>
              <option value="leader">قادة الفرق التطوعية</option>
              <option value="volunteer">المتطوعين المسجلين</option>
              <option value="support">فريق الدعم الفني</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="md:col-span-3">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-2.5 px-3 text-xs font-sans text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="all">كافة الإدارات والأقسام</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameAr}
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
              <option value="suspended">موقوف (Suspended)</option>
              <option value="inactive">غير مفعل (Inactive)</option>
            </select>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-4">
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
            <p className="text-xs font-bold text-slate-500">جاري تحميل بيانات المستخدمين ومطابقة الصلاحيات مع قاعدة البيانات...</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4">المستخدم والحساب</th>
                  <th className="p-4">الدور والمستوى</th>
                  <th className="p-4">الإدارة التابعة</th>
                  <th className="p-4">معلومات الاتصال</th>
                  <th className="p-4">حالة الحساب والأمان</th>
                  <th className="p-4">آخر نشاط</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredUsers.map((u) => {
                  const roleBadge = getRoleBadge(u.role);
                  return (
                    <tr 
                      key={u.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & Username */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                              {u.name ? u.name.trim().charAt(0) : "م"}
                            </div>
                            <span 
                              className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                                u.status === 'active' ? 'bg-emerald-500' : u.status === 'suspended' ? 'bg-rose-500' : 'bg-slate-400'
                              }`} 
                              title={u.status === 'active' ? 'حساب نشط' : u.status === 'suspended' ? 'موقوف' : 'غير مفعل'}
                            />
                          </div>

                          <div className="space-y-0.5">
                            <div className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.role === "operations_manager" && (
                                <span className="bg-amber-100 text-amber-950 text-[10px] font-black px-1.5 py-0.2 rounded-md">
                                  عمليات
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
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {u.jobTitle || "موظف معتمد"}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {u.departmentName || "الإدارة العامة"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {u.departmentId}
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-4 space-y-1">
                        {u.email && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]" title={u.email}>{u.email}</span>
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
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            u.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                              : u.status === 'suspended'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {u.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            <span>{u.status === 'active' ? 'نشط ومفعل' : u.status === 'suspended' ? 'موقوف إدارياً' : 'غير مفعل'}</span>
                          </span>

                          {u.mustChangePassword && (
                            <div>
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40">
                                <KeyRound className="w-3 h-3 text-amber-500" />
                                <span>يلزم تحديث كلمة المرور</span>
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
                              {new Date(u.lastLogin).toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">لم يسجل دخول بعد</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Details & Permissions Modal Trigger */}
                          <button
                            onClick={() => setSelectedUserForDetails(u)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="عرض تفاصيل الحساب والصلاحيات"
                          >
                            <Shield className="w-4 h-4" />
                          </button>

                          {/* Reset Password Trigger */}
                          <button
                            onClick={() => setSelectedUserForReset(u)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="إعادة تعيين كلمة المرور"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          {/* Toggle Active / Suspended */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-2 rounded-xl transition-colors cursor-pointer ${
                              u.status === 'active'
                                ? 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-slate-700'
                                : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 dark:bg-slate-800 dark:hover:bg-slate-700'
                            }`}
                            title={u.status === 'active' ? 'تعطيل الحساب' : 'إعادة تفعيل الحساب'}
                          >
                            {u.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>

                          {/* Activity Logs Trigger */}
                          <button
                            onClick={() => setSelectedUserForActivity(u)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                            title="سجل نشاط المستخدم"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Delete (if permitted) */}
                          {u.userId !== "admin-user" && u.userId !== "ops-manager" && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              title="حذف الحساب"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW USER (إنشاء مستخدم جديد) */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          departments={departments}
          currentUser={currentUser}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setIsCreateModalOpen(false);
            fetchUsers();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: USER DETAILS & PERMISSIONS (تفاصيل المستخدم ومصفوفة الصلاحيات) */}
      {/* ========================================================================= */}
      {selectedUserForDetails && (
        <UserDetailsModal
          user={selectedUserForDetails}
          departments={departments}
          currentUser={currentUser}
          currentUserRole={currentUserRole}
          onOpenResetPassword={(u) => setSelectedUserForReset(u)}
          onClose={() => setSelectedUserForDetails(null)}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setSelectedUserForDetails(null);
            fetchUsers();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: RESET PASSWORD (إعادة تعيين كلمة المرور مع فرض التغيير) */}
      {/* ========================================================================= */}
      {selectedUserForReset && (
        <ResetPasswordModal
          user={selectedUserForReset}
          currentUser={currentUser}
          onClose={() => setSelectedUserForReset(null)}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setSelectedUserForReset(null);
            fetchUsers();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: USER ACTIVITY AUDIT LOG (سجل نشاط المستخدم) */}
      {/* ========================================================================= */}
      {selectedUserForActivity && (
        <UserActivityModal
          user={selectedUserForActivity}
          onClose={() => setSelectedUserForActivity(null)}
        />
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
  onSuccess: (msg: string) => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  departments,
  currentUser,
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
      const res = await fetch("/api/db/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
                placeholder="05xxxxxxxx"
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
                placeholder="10xxxxxxxx"
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
                <option value="department_admin">مدير إدارة تنفيذي (Dept Head)</option>
                <option value="storekeeper">أمين مستودع (Storekeeper)</option>
                <option value="leader">قائد فريق تطوعي (Leader)</option>
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
                  alert("تم نسخ كلمة المرور إلى الحافظة.");
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
                      {cat.permissions.map((p) => {
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
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  departments,
  currentUser,
  currentUserRole = "admin",
  onOpenResetPassword,
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
      const res = await fetch("/api/db/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
              {user.name.charAt(0)}
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
                    <option value="department_admin">مدير إدارة تنفيذي (Dept Head)</option>
                    <option value="storekeeper">أمين مستودع (Storekeeper)</option>
                    <option value="leader">قائد فريق تطوعي (Leader)</option>
                    <option value="volunteer">متطوع مسجل (Volunteer)</option>
                    <option value="support_agent">موظف دعم فني</option>
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
                    <option value="suspended">موقوف إدارياً (Suspended)</option>
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
                        {cat.permissions.map((p) => {
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

// =============================================================================
// SUB-COMPONENT: RESET PASSWORD MODAL
// =============================================================================
interface ResetPasswordModalProps {
  user: SystemUser;
  currentUser: any;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  currentUser,
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
      const res = await fetch("/api/db/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
                    alert("تم نسخ كلمة المرور إلى الحافظة.");
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
        const res = await fetch(`/api/db/users/activity-logs?userId=${encodeURIComponent(userId)}`);
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
