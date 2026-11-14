import {
  Activity,
  Sparkles,
  Briefcase,
  Sliders,
  Users,
  Building2,
  CheckCircle2,
  KeyRound
} from "lucide-react";

export interface SafeLinkedProfile {
  source: string;
  id: string;
  role?: string;
  status?: string;
  label?: string;
  name?: string;
  departmentId?: string;
  departmentName?: string;
}

export interface SystemUser {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  nationalId?: string;
  nationality?: string;
  gender?: string;
  birthDate?: string;
  birthDateHijri?: string;
  birthCalendarType?: string;
  age?: number;
  city?: string;
  district?: string;
  customDistrict?: string;
  address?: string;
  avatarUrl?: string;
  fileNumber?: string;
  employeeNumber?: string;
  qualification?: string;
  bloodType?: string;
  role: string;
  jobTitle: string;
  positionTitle?: string;
  boardRole?: string;
  assignmentStatus?: string;
  assignmentStartDate?: string;
  assignmentEndDate?: string;
  departmentId: string;
  departmentName: string;
  additionalDepartmentIds?: string[];
  permissions: string[];
  allowedDepartmentIds?: string[];
  allowedPages?: string[];
  status: "active" | "suspended" | "inactive" | "pending" | "rejected" | "archived" | "deactivated";
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  deactivatedAt?: string;
  restoredAt?: string;
  mustChangePassword?: boolean;
  lastLogin?: string | null;
  lastActivity?: string | null;
  createdAt?: string;
  updatedAt?: string;
  emailVerified?: boolean;
  identityVerified?: boolean;
  notes?: string;
  beneficiaryNumber?: string;
  barcodeId?: string;
  residencyStatus?: string;
  maritalStatus?: string;
  orphanStatus?: string;
  category?: string;
  familySize?: number;
  monthlyIncome?: number;
  housingType?: string;
  dependentsInfo?: string;
  nationalityProofDoc?: string;
  attachments?: any[];
  aidHistoryCount?: number;
  membershipNumber?: string;
  hours?: number;
  points?: number;
  monthlyPoints?: number;
  attendanceCount?: number;
  joinDate?: string;
  issueDate?: string;
  expiryDate?: string;
  teamId?: string;
  teamName?: string;
  teamRole?: string;
  supervisorId?: string;
  supervisorName?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  linkedProfiles?: SafeLinkedProfile[];
  primarySource?: string;
  loginDisabled?: boolean;
  hasLoginAccount?: boolean;
  loginMethods?: {
    passwordEnabled: boolean;
    googleEmailLinked: boolean;
    nationalIdEnabled: boolean;
  };
}

export interface DepartmentItem {
  id: string;
  nameAr: string;
  nameEn?: string;
}

export interface TeamItem {
  id: string;
  nameAr: string;
  nameEn?: string;
  departmentId?: string;
  leaderName?: string;
}

export interface OpenCustodySummary {
  id: string;
  custodyCode?: string;
  itemName?: string;
  status?: string;
  deliveryDate?: string;
}

export interface UserDependenciesInfo {
  openCustodiesCount: number;
  openCustodies: OpenCustodySummary[];
  allCustodiesCount: number;
  hasLinkedRecords: boolean;
  canPermanentDelete: boolean;
  isLastActiveAdmin: boolean;
  summaryItems: string[];
  details: {
    attendanceCount: number;
    volHours: number;
    volPoints: number;
    certificatesCount: number;
    handoversCount: number;
    benefitRequestsCount: number;
    targetedDistributionsCount: number;
    hrRecordsCount: number;
    financialCount: number;
    lettersCount: number;
    ledTeamsCount: number;
    auditLogsCount: number;
  };
}

export interface UserDetailsPayload {
  user: SystemUser;
  dependencies: UserDependenciesInfo;
  pendingTransferRequest?: any | null;
  activeSessionCount: number;
  isSelf: boolean;
  protectedRules: {
    passwordReadable: boolean;
    volunteerHoursAndPointsLocked: boolean;
    beneficiaryBarcodeAndAidHistoryLocked: boolean;
    volunteerTeamChangeRequiresWorkflow: boolean;
  };
  departments: DepartmentItem[];
  teams: TeamItem[];
  roleDefaults: Record<string, string[]>;
}

export interface UserManagementScope {
  fullAccess: boolean;
  isTopSuperAdmin: boolean;
  allowedDepartments: string[];
  allowedRoles: string[];
}

export const ROLE_LABELS_AR: Record<string, string> = {
  admin: "الإدارة العليا (Super Admin)",
  operations_manager: "مدير العمليات (Operations)",
  supervisor: "مشرف إدارة ومتابعة",
  department_admin: "مدير إدارة تنفيذي",
  employee: "موظف إدارة",
  storekeeper: "أمين مستودع معتمد",
  leader: "قائد فريق تطوعي",
  volunteer: "متطوع مسجل",
  beneficiary: "مستفيد رعاية اجتماعية",
  support_manager: "مدير الدعم الفني",
  support_agent: "أخصائي دعم فني"
};

export const STATUS_LABELS_AR: Record<string, string> = {
  active: "نشط ومفعل",
  pending: "قيد المراجعة والاعتماد",
  suspended: "موقوف إدارياً",
  inactive: "معطل مؤقتاً",
  deactivated: "معطل مؤقتاً",
  archived: "مؤرشف",
  rejected: "مرفوض"
};

export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  admin: [
    "super_admin", "all_permissions", "manage_users", "manage_permissions",
    "view_department", "create_data", "edit_data", "delete_data", "approve_data",
    "disburse_data", "receive_data", "print_data", "export_pdf", "export_excel",
    "manage_staff", "manage_tasks", "view_reports", "cross_department_access",
    "reset_passwords", "view_audit_logs"
  ],
  operations_manager: [
    "operations_manager", "manage_users", "manage_permissions",
    "view_department", "create_data", "edit_data", "delete_data", "approve_data",
    "disburse_data", "receive_data", "print_data", "export_pdf", "export_excel",
    "manage_staff", "manage_tasks", "view_reports", "cross_department_access"
  ],
  supervisor: ["view_department", "view_reports", "manage_tasks", "export_pdf"],
  department_admin: [
    "view_department", "create_data", "edit_data", "approve_data",
    "export_pdf", "export_excel", "manage_staff", "manage_tasks", "view_reports", "print_data"
  ],
  employee: ["view_department", "create_data", "edit_data", "export_pdf", "manage_tasks"],
  storekeeper: [
    "view_department", "create_data", "edit_data", "disburse_data", "receive_data",
    "print_data", "export_excel", "view_reports", "manage_tasks", "view_stock"
  ],
  leader: ["view_department", "create_data", "edit_data", "export_pdf", "manage_tasks", "manage_teams"],
  volunteer: ["view_volunteer_portal"],
  beneficiary: ["view_department"],
  support_manager: ["view_department", "view_reports", "manage_tasks", "manage_it"],
  support_agent: ["view_department", "manage_tasks"]
};

export const SUPER_ADMIN_ONLY_PERMS = new Set([
  "super_admin",
  "all_permissions",
  "manage_permissions",
  "operations_manager",
  "all"
]);

export const USER_PERMISSION_CATEGORIES: {
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
      { key: "create_data", labelAr: "إدخال وإنشاء السجلات", descAr: "إنشاء المعاملات والبيانات التشغيلية ضمن النطاق" },
      { key: "edit_data", labelAr: "تعديل البيانات", descAr: "تحديث السجلات التشغيلية والإدارية" },
      { key: "delete_data", labelAr: "حذف أو أرشفة السجلات", descAr: "أرشفة أو إزالة السجلات المخولة" },
      { key: "approve_data", labelAr: "اعتماد الطلبات والمعاملات", descAr: "الموافقة الإدارية على الطلبات" },
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
    id: "partnerships",
    nameAr: "تنمية الموارد المالية والشراكات (Fundraising & Partnerships)",
    icon: Sparkles,
    color: "from-purple-600 to-indigo-600",
    permissions: [
      { key: "manage_partners", labelAr: "إدارة الشراكات والرعايات", descAr: "إضافة وتوثيق مذكرات التفاهم وعقود الرعاية والداعمين" },
      { key: "manage_campaigns", labelAr: "إدارة الحملات والمبادرات الداعمة", descAr: "إعداد وتنفيذ حملات تنمية الموارد والتمويل" },
      { key: "manage_grants", labelAr: "متابعة المنح والتمويل", descAr: "متابعة المنح الحكومية والخاصة وتنمية الاستدامة المالية" }
    ]
  },
  {
    id: "operations",
    nameAr: "دور مدير العمليات المستقل (Operations Role)",
    icon: Sliders,
    color: "from-amber-600 to-orange-600",
    permissions: [
      { key: "operations_manager", labelAr: "صلاحيات مدير العمليات الكاملة", descAr: "أعلى مستوى تشغيلي للإشراف على كافة الإدارات كدور إداري مستقل" },
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
    id: "support_services",
    nameAr: "إدارة الخدمات المساندة (Support Services)",
    icon: Building2,
    color: "from-emerald-700 to-teal-800",
    permissions: [
      { key: "manage_it", labelAr: "إدارة تقنية المعلومات والأنظمة", descAr: "الإشراف على البنية التحتية والأنظمة التقنية وتوفير الاحتياجات" },
      { key: "view_stock", labelAr: "إدارة المستودعات والعهد", descAr: "مراقبة أرصدة الأصناف ومستويات التخزين والعهد" },
      { key: "receive_data", labelAr: "استلام وتوريد أصناف", descAr: "تسجيل أذونات الإدخال وسندات الاستلام" },
      { key: "disburse_data", labelAr: "صرف وتسليم أصناف", descAr: "تسجيل أذونات الإخراج وسندات الصرف" },
      { key: "manage_facilities", labelAr: "النقل والصيانة والمرافق والأمن", descAr: "الإشراف على النقل والصيانة الدورية والمرافق والأمن والسلامة" }
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
