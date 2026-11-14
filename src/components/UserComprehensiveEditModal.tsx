import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  HeartHandshake,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
  X
} from "lucide-react";
import { buildApiUrl, getAuthHeaders } from "../config/api";
import { ImageUploadField } from "./ImageUploadField";
import { DepartmentPermissionsManager } from "./DepartmentPermissionsManager";
import { getDepartmentPermissionIds } from "../data/departmentPermissionsRegistry";
import {
  DepartmentItem,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_LABELS_AR,
  STATUS_LABELS_AR,
  SUPER_ADMIN_ONLY_PERMS,
  SystemUser,
  TeamItem,
  USER_PERMISSION_CATEGORIES,
  UserDependenciesInfo,
  UserDetailsPayload,
  UserManagementScope
} from "./userManagementTypes";

interface UserComprehensiveEditModalProps {
  user: SystemUser;
  departments: DepartmentItem[];
  teams?: TeamItem[];
  scope?: UserManagementScope | null;
  currentUser?: any;
  initialSection?: SectionTab;
  onOpenResetPassword?: (user: SystemUser) => void;
  onClose: () => void;
  onSuccess: (msg: string, updatedUser?: SystemUser) => void;
}

type SectionTab = "personal" | "account" | "role_dept" | "volunteer" | "beneficiary";

export const UserComprehensiveEditModal: React.FC<UserComprehensiveEditModalProps> = ({
  user,
  departments: initialDepartments,
  teams: initialTeams = [],
  scope,
  currentUser,
  initialSection = "personal",
  onOpenResetPassword,
  onClose,
  onSuccess
}) => {
  const targetUserId = user.userId || user.id;

  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [liveUser, setLiveUser] = useState<SystemUser>(user);
  const [dependencies, setDependencies] = useState<UserDependenciesInfo | null>(null);
  const [pendingTransferRequest, setPendingTransferRequest] = useState<any | null>(null);
  const [activeSessionCount, setActiveSessionCount] = useState<number>(0);
  const [isSelf, setIsSelf] = useState<boolean>(false);
  const [departmentsList, setDepartmentsList] = useState<DepartmentItem[]>(initialDepartments);
  const [teamsList, setTeamsList] = useState<TeamItem[]>(initialTeams);
  const [roleDefaultsMap, setRoleDefaultsMap] = useState<Record<string, string[]>>(ROLE_DEFAULT_PERMISSIONS);
  const [workflowRequiredForTeam, setWorkflowRequiredForTeam] = useState<boolean>(false);

  const [activeSection, setActiveSection] = useState<SectionTab>(initialSection);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [generatedResetLink, setGeneratedResetLink] = useState<{ url: string; email: string } | null>(null);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sendingResetLink, setSendingResetLink] = useState(false);

  // Editable form state
  const [form, setForm] = useState({
    // Personal
    name: user.name || "",
    nationalId: user.nationalId || "",
    nationality: user.nationality || "سعودي",
    gender: user.gender || "",
    birthDate: user.birthDate || "",
    phone: user.phone || "",
    email: user.email || "",
    city: user.city || "",
    district: user.district || "",
    address: user.address || "",
    avatarUrl: user.avatarUrl || "",
    qualification: user.qualification || "",
    bloodType: user.bloodType || "",
    notes: user.notes || "",

    // Account & Security
    username: user.username || "",
    status: user.status || "active",
    mustChangePassword: Boolean(user.mustChangePassword),
    emailVerified: user.emailVerified !== undefined ? Boolean(user.emailVerified) : true,
    forceLogoutSessions: false,

    // Role, Dept & Assignment
    role: user.role || "employee",
    departmentId: user.departmentId || "dep-1",
    additionalDepartmentIds: Array.isArray(user.additionalDepartmentIds) ? user.additionalDepartmentIds : [] as string[],
    jobTitle: user.jobTitle || "",
    positionTitle: user.positionTitle || "",
    boardRole: user.boardRole || "",
    assignmentStatus: user.assignmentStatus || "active",
    assignmentStartDate: user.assignmentStartDate || "",
    assignmentEndDate: user.assignmentEndDate || "",
    permissions: Array.isArray(user.permissions) ? user.permissions : [] as string[],
    syncRolePermissions: true,

    // Volunteer / Leader
    teamId: user.teamId || "",
    teamRole: user.teamRole || "عضو فريق",
    supervisorName: user.supervisorName || "",
    joinDate: user.joinDate || "",
    expiryDate: user.expiryDate || "",
    teamChangeReason: "",
    teamChangeMode: "workflow" as "workflow" | "direct",

    // Beneficiary
    residencyStatus: user.residencyStatus || "مواطن سعودي",
    maritalStatus: user.maritalStatus || "",
    orphanStatus: user.orphanStatus || "",
    category: user.category || "عام",
    familySize: user.familySize ?? 1,
    monthlyIncome: user.monthlyIncome ?? 0,
    housingType: user.housingType || "",
    dependentsInfo: user.dependentsInfo || "",
    nationalityProofDoc: user.nationalityProofDoc || "",
    attachments: Array.isArray(user.attachments) ? user.attachments : [] as any[]
  });

  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newAttachmentTitle, setNewAttachmentTitle] = useState("");

  const populateFromPayload = (payload: UserDetailsPayload) => {
    const u = payload.user;
    setLiveUser(u);
    setDependencies(payload.dependencies || null);
    setPendingTransferRequest(payload.pendingTransferRequest || null);
    setActiveSessionCount(payload.activeSessionCount || 0);
    setIsSelf(Boolean(payload.isSelf));
    if (Array.isArray(payload.departments) && payload.departments.length > 0) {
      setDepartmentsList(payload.departments);
    }
    if (Array.isArray(payload.teams)) {
      setTeamsList(payload.teams);
    }
    if (payload.roleDefaults) {
      setRoleDefaultsMap(payload.roleDefaults);
    }
    setWorkflowRequiredForTeam(Boolean(payload.protectedRules?.volunteerTeamChangeRequiresWorkflow));

    setForm({
      name: u.name || "",
      nationalId: u.nationalId || "",
      nationality: u.nationality || "سعودي",
      gender: u.gender || "",
      birthDate: u.birthDate || "",
      phone: u.phone || "",
      email: u.email || "",
      city: u.city || "",
      district: u.district || "",
      address: u.address || "",
      avatarUrl: u.avatarUrl || "",
      qualification: u.qualification || "",
      bloodType: u.bloodType || "",
      notes: u.notes || "",

      username: u.username || "",
      status: u.status || "active",
      mustChangePassword: Boolean(u.mustChangePassword),
      emailVerified: u.emailVerified !== undefined ? Boolean(u.emailVerified) : true,
      forceLogoutSessions: false,

      role: u.role || "employee",
      departmentId: u.departmentId || "dep-1",
      additionalDepartmentIds: Array.isArray(u.additionalDepartmentIds) ? u.additionalDepartmentIds : [],
      jobTitle: u.jobTitle || "",
      positionTitle: u.positionTitle || "",
      boardRole: u.boardRole || "",
      assignmentStatus: u.assignmentStatus || "active",
      assignmentStartDate: u.assignmentStartDate || "",
      assignmentEndDate: u.assignmentEndDate || "",
      permissions: Array.isArray(u.permissions) ? u.permissions : [],
      syncRolePermissions: true,

      teamId: u.teamId || "",
      teamRole: u.teamRole || "عضو فريق",
      supervisorName: u.supervisorName || "",
      joinDate: u.joinDate || "",
      expiryDate: u.expiryDate || "",
      teamChangeReason: "",
      teamChangeMode: payload.protectedRules?.volunteerTeamChangeRequiresWorkflow ? "workflow" : "direct",

      residencyStatus: u.residencyStatus || "مواطن سعودي",
      maritalStatus: u.maritalStatus || "",
      orphanStatus: u.orphanStatus || "",
      category: u.category || "عام",
      familySize: u.familySize ?? 1,
      monthlyIncome: u.monthlyIncome ?? 0,
      housingType: u.housingType || "",
      dependentsInfo: u.dependentsInfo || "",
      nationalityProofDoc: u.nationalityProofDoc || "",
      attachments: Array.isArray(u.attachments) ? u.attachments : []
    });
  };

  useEffect(() => {
    let mounted = true;
    const loadFullDetails = async () => {
      setIsLoadingDetails(true);
      setDetailsError(null);
      try {
        const res = await fetch(buildApiUrl(`/api/db/users/${encodeURIComponent(targetUserId)}`), {
          headers: { Accept: "application/json", ...getAuthHeaders() },
          cache: "no-store"
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || "تعذر جلب التفاصيل الكاملة للمستخدم.");
        }
        if (mounted && data?.user) {
          populateFromPayload(data as UserDetailsPayload);
        }
      } catch (err: any) {
        if (mounted) {
          setDetailsError(err.message || "تعذر تحميل بيانات المستخدم الكاملة.");
        }
      } finally {
        if (mounted) setIsLoadingDetails(false);
      }
    };
    loadFullDetails();
    return () => {
      mounted = false;
    };
  }, [targetUserId]);

  const isVolunteerUser = useMemo(() => {
    return (
      form.role === "volunteer" ||
      form.role === "leader" ||
      liveUser.role === "volunteer" ||
      liveUser.role === "leader" ||
      Boolean(liveUser.membershipNumber)
    );
  }, [form.role, liveUser]);

  const isBeneficiaryUser = useMemo(() => {
    return (
      form.role === "beneficiary" ||
      liveUser.role === "beneficiary" ||
      Boolean(liveUser.beneficiaryNumber)
    );
  }, [form.role, liveUser]);

  const canFullAccess = scope?.fullAccess !== false && (currentUser?.role === "admin" || currentUser?.role === "operations_manager" || scope?.fullAccess === true);
  const isTopSuperAdmin = scope?.isTopSuperAdmin || currentUser?.role === "admin";

  const availableRoles = useMemo(() => {
    const all = [
      { value: "employee", label: ROLE_LABELS_AR.employee },
      { value: "department_admin", label: ROLE_LABELS_AR.department_admin },
      { value: "supervisor", label: ROLE_LABELS_AR.supervisor },
      { value: "storekeeper", label: ROLE_LABELS_AR.storekeeper },
      { value: "leader", label: ROLE_LABELS_AR.leader },
      { value: "volunteer", label: ROLE_LABELS_AR.volunteer },
      { value: "beneficiary", label: ROLE_LABELS_AR.beneficiary },
      { value: "support_manager", label: ROLE_LABELS_AR.support_manager },
      { value: "support_agent", label: ROLE_LABELS_AR.support_agent },
      { value: "operations_manager", label: ROLE_LABELS_AR.operations_manager },
      { value: "admin", label: ROLE_LABELS_AR.admin }
    ];
    if (canFullAccess) {
      return isTopSuperAdmin ? all : all.filter(r => r.value !== "admin");
    }
    const allowed = scope?.allowedRoles || [];
    return all.filter(r => allowed.includes(r.value) || r.value === liveUser.role);
  }, [canFullAccess, isTopSuperAdmin, scope, liveUser.role]);

  const handleRoleChange = (nextRole: string) => {
    const defaults = roleDefaultsMap[nextRole] || ROLE_DEFAULT_PERMISSIONS[nextRole] || ["view_department"];
    setForm(prev => ({
      ...prev,
      role: nextRole,
      permissions: prev.syncRolePermissions ? [...defaults] : prev.permissions
    }));
  };

  const handleTogglePermission = (permKey: string) => {
    if (!canFullAccess && SUPER_ADMIN_ONLY_PERMS.has(permKey)) return;
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permKey)
        ? prev.permissions.filter(p => p !== permKey)
        : [...prev.permissions, permKey]
    }));
  };

  const handleApplyRoleDefaults = () => {
    const defaults = roleDefaultsMap[form.role] || ROLE_DEFAULT_PERMISSIONS[form.role] || ["view_department"];
    setForm(prev => ({ ...prev, permissions: [...defaults] }));
    setInlineNotice("تم تطبيق الصلاحيات الافتراضية المعتمدة للدور المختار.");
  };

  const handleRevokeSessionsNow = async () => {
    setRevokingSessions(true);
    setSaveError(null);
    setInlineNotice(null);
    try {
      const res = await fetch(buildApiUrl("/api/db/users/revoke-sessions"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ userId: targetUserId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "تعذر إنهاء الجلسات النشطة.");
      setActiveSessionCount(0);
      setInlineNotice(data.message || "تم إنهاء جميع الجلسات النشطة لهذا المستخدم فوراً.");
    } catch (err: any) {
      setSaveError(err.message || "حدث خطأ أثناء إنهاء الجلسات.");
    } finally {
      setRevokingSessions(false);
    }
  };

  const handleSendResetLinkNow = async () => {
    setSendingResetLink(true);
    setSaveError(null);
    setInlineNotice(null);
    try {
      const res = await fetch(buildApiUrl("/api/db/users/send-reset-link"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ userId: targetUserId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "تعذر توليد رابط إعادة التعيين.");
      setGeneratedResetLink({
        url: data.resetLink,
        email: data.userEmail || form.email || "البريد المعتمد"
      });
      setInlineNotice(data.message || "تم توليد وإرسال رابط تغيير كلمة المرور.");
    } catch (err: any) {
      setSaveError(err.message || "حدث خطأ أثناء إرسال رابط تغيير كلمة المرور.");
    } finally {
      setSendingResetLink(false);
    }
  };

  const handleAddAttachmentFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setSaveError("حجم المرفق يتجاوز الحد الأقصى المسموح (4 ميجابايت).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setForm(prev => ({
          ...prev,
          attachments: [
            ...prev.attachments,
            {
              id: `att-${Date.now()}`,
              name: file.name,
              type: file.type,
              url: reader.result,
              uploadedAt: new Date().toISOString()
            }
          ]
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddAttachmentUrl = () => {
    if (!newAttachmentUrl.trim()) return;
    setForm(prev => ({
      ...prev,
      attachments: [
        ...prev.attachments,
        {
          id: `att-${Date.now()}`,
          name: newAttachmentTitle.trim() || "مرفق رسمي",
          url: newAttachmentUrl.trim(),
          uploadedAt: new Date().toISOString()
        }
      ]
    }));
    setNewAttachmentUrl("");
    setNewAttachmentTitle("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setInlineNotice(null);

    if (!form.name.trim()) {
      setSaveError("الاسم الكامل للمستخدم حقل إلزامي.");
      setActiveSection("personal");
      return;
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setSaveError("صيغة البريد الإلكتروني غير صحيحة.");
      setActiveSection("personal");
      return;
    }
    if (form.nationalId.trim() && form.nationalId.trim().length < 8) {
      setSaveError("رقم الهوية الوطنية أو الإقامة يجب ألا يقل عن 8 خانات.");
      setActiveSection("personal");
      return;
    }
    if (form.assignmentStartDate && form.assignmentEndDate && form.assignmentEndDate < form.assignmentStartDate) {
      setSaveError("تاريخ نهاية التكليف لا يمكن أن يسبق تاريخ البداية.");
      setActiveSection("role_dept");
      return;
    }

    const teamChanged = isVolunteerUser && String(form.teamId || "") !== String(liveUser.teamId || "");

    const payload: Record<string, any> = {
      userId: targetUserId,
      name: form.name.trim(),
      nationalId: form.nationalId.trim(),
      nationality: form.nationality.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      phone: form.phone.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      address: form.address.trim(),
      avatarUrl: form.avatarUrl,
      qualification: form.qualification.trim(),
      bloodType: form.bloodType,
      notes: form.notes.trim(),

      username: form.username.trim(),
      status: form.status,
      mustChangePassword: form.mustChangePassword,
      emailVerified: form.emailVerified,
      forceLogoutSessions: form.forceLogoutSessions,

      role: form.role,
      departmentId: form.departmentId,
      additionalDepartmentIds: form.additionalDepartmentIds,
      jobTitle: form.jobTitle.trim(),
      positionTitle: form.positionTitle.trim(),
      boardRole: form.boardRole.trim(),
      assignmentStatus: form.assignmentStatus,
      assignmentStartDate: form.assignmentStartDate,
      assignmentEndDate: form.assignmentEndDate,
      permissions: form.permissions,
      syncRolePermissions: form.syncRolePermissions,
      keepCustomPermissions: !form.syncRolePermissions
    };

    if (isVolunteerUser) {
      payload.teamRole = form.teamRole;
      payload.supervisorName = form.supervisorName.trim();
      payload.joinDate = form.joinDate;
      payload.expiryDate = form.expiryDate;
      if (teamChanged) {
        payload.teamId = form.teamId;
        payload.teamChangeReason = form.teamChangeReason.trim() || "تعديل الفريق التطوعي عبر إدارة المستخدمين";
        if (workflowRequiredForTeam || form.teamChangeMode === "workflow") {
          payload.submitTeamTransferRequest = true;
        } else {
          payload.approveTeamChangeDirectly = true;
        }
      }
    }

    if (isBeneficiaryUser) {
      payload.residencyStatus = form.residencyStatus;
      payload.maritalStatus = form.maritalStatus;
      payload.orphanStatus = form.orphanStatus;
      payload.category = form.category;
      payload.familySize = Number(form.familySize) || 1;
      payload.monthlyIncome = Number(form.monthlyIncome) || 0;
      payload.housingType = form.housingType;
      payload.dependentsInfo = form.dependentsInfo;
      payload.nationalityProofDoc = form.nationalityProofDoc;
      payload.attachments = form.attachments;
    }

    setIsSaving(true);
    try {
      const res = await fetch(buildApiUrl("/api/db/users/update"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "تعذر حفظ تعديلات المستخدم.");
      }
      onSuccess(data.message || `تم حفظ تعديلات (${form.name.trim()}) بنجاح.`, data.user);
    } catch (err: any) {
      setSaveError(err.message || "حدث خطأ غير متوقع أثناء حفظ التعديلات.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in" dir="rtl">
      <div className="w-full max-w-5xl max-h-[95vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {form.avatarUrl ? (
              <img
                src={form.avatarUrl}
                alt={liveUser.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shrink-0 bg-slate-800"
              />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white font-black text-lg border border-white/15 shrink-0">
                {(liveUser.name || "م").trim().charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  تعديل بيانات المستخدم الشامل: {liveUser.name}
                </h2>
                <span className="text-[10px] bg-indigo-500/30 border border-indigo-400/40 px-2 py-0.5 rounded-full font-mono text-indigo-100">
                  @{liveUser.username}
                </span>
                {(liveUser.beneficiaryNumber || liveUser.membershipNumber || liveUser.fileNumber || liveUser.employeeNumber) && (
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-400/40 px-2 py-0.5 rounded-full font-mono text-emerald-200">
                    #{liveUser.beneficiaryNumber || liveUser.membershipNumber || liveUser.employeeNumber || liveUser.fileNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                {ROLE_LABELS_AR[form.role] || form.role} • {STATUS_LABELS_AR[form.status] || form.status}
                {isSelf ? " • (حسابك الشخصي الحالي)" : ""}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Section Tabs */}
        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: "personal" as SectionTab, label: "البيانات الشخصية والتواصل", icon: UserIcon, show: true },
            { id: "account" as SectionTab, label: "بيانات الحساب والأمان", icon: ShieldCheck, show: true },
            { id: "role_dept" as SectionTab, label: "الإدارة والدور والصلاحيات", icon: Building2, show: true },
            { id: "volunteer" as SectionTab, label: "بيانات المتطوع والفريق", icon: Sparkles, show: isVolunteerUser },
            { id: "beneficiary" as SectionTab, label: "ملف المستفيد والمرفقات", icon: HeartHandshake, show: isBeneficiaryUser }
          ]
            .filter(t => t.show)
            .map(tab => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs border border-emerald-200 dark:border-emerald-800"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isLoadingDetails && (
            <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200 p-3 rounded-2xl text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>جاري مزامنة أحدث بيانات المستخدم والارتباطات من الخادم...</span>
            </div>
          )}

          {detailsError && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 p-3 rounded-2xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>تنبيه: {detailsError} — يتم عرض البيانات المحلية المتوفرة.</span>
            </div>
          )}

          {saveError && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-3.5 rounded-2xl text-xs font-bold flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {inlineNotice && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{inlineNotice}</span>
            </div>
          )}

          {/* ==================== SECTION 1: PERSONAL INFO ==================== */}
          {activeSection === "personal" && (
            <div className="space-y-5 animate-fade-in">
              {/* Protected IDs summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/70">
                <div>
                  <span className="text-[10px] text-slate-400 block">معرف النظام المرجعي (ثابت):</span>
                  <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{liveUser.userId || liveUser.id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">رقم الملف / العضوية / الموظف:</span>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {liveUser.beneficiaryNumber || liveUser.membershipNumber || liveUser.employeeNumber || liveUser.fileNumber || "غير مسجل"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">السجلات الموحدة المرتبطة:</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {(liveUser.linkedProfiles?.length || 1)} سجل موثق
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الاسم الكامل: *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    رقم الهوية الوطنية / الإقامة (فريد):
                  </label>
                  <input
                    type="text"
                    value={form.nationalId}
                    onChange={e => setForm({ ...form, nationalId: e.target.value })}
                    placeholder="10 أرقام"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الجنسية:
                  </label>
                  <input
                    type="text"
                    value={form.nationality}
                    onChange={e => setForm({ ...form, nationality: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الجنس:
                  </label>
                  <select
                    value={form.gender}
                    onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">غير محدد</option>
                    <option value="ذكر">ذكر</option>
                    <option value="أنثى">أنثى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ الميلاد:
                  </label>
                  <input
                    type="date"
                    value={form.birthDate ? form.birthDate.split("T")[0] : ""}
                    onChange={e => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    رقم الجوال:
                  </label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني (فريد):
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="user@riadataleata.org.sa"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    المدينة:
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    placeholder="مكة المكرمة"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الحي:
                  </label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={e => setForm({ ...form, district: e.target.value })}
                    placeholder="حي العسيلة"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    العنوان الوطني / التفصيلي:
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    placeholder="العنوان الكامل..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    المؤهل العلمي:
                  </label>
                  <input
                    type="text"
                    value={form.qualification}
                    onChange={e => setForm({ ...form, qualification: e.target.value })}
                    placeholder="مثال: بكالوريوس"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    فصيلة الدم:
                  </label>
                  <select
                    value={form.bloodType}
                    onChange={e => setForm({ ...form, bloodType: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">غير محدد</option>
                    {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map(bt => (
                      <option key={bt} value={bt}>{bt}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات إدارية وتوجيهات الحساب:
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <ImageUploadField
                  label="الصورة الشخصية للمستخدم"
                  value={form.avatarUrl}
                  onChange={(url) => setForm({ ...form, avatarUrl: url })}
                  previewAspect="circle"
                  description="يمكنك رفع صورة جديدة أو تعديل الصورة الشخصية مباشرة."
                />
              </div>
            </div>
          )}

          {/* ==================== SECTION 2: ACCOUNT & SECURITY ==================== */}
          {activeSection === "account" && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    اسم المستخدم (Username - فريد):
                  </label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm({ ...form, username: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني لتسجيل الدخول:
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    حالة الحساب الحالية:
                  </label>
                  <select
                    value={form.status}
                    disabled={isSelf || (dependencies?.isLastActiveAdmin && liveUser.role === "admin")}
                    onChange={e => setForm({ ...form, status: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  >
                    <option value="active">نشط ومفعل (Active)</option>
                    <option value="pending">قيد المراجعة والاعتماد (Pending)</option>
                    <option value="suspended">موقوف إدارياً (Suspended)</option>
                    <option value="inactive">معطل مؤقتاً (Inactive)</option>
                    <option value="archived">مؤرشف (Archived)</option>
                    <option value="rejected">مرفوض (Rejected)</option>
                  </select>
                  {isSelf && (
                    <p className="text-[10px] text-amber-600 mt-1">لا يمكن تعطيل حسابك الشخصي أثناء جلستك الحالية.</p>
                  )}
                </div>
              </div>

              {/* Verification & Session flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.mustChangePassword}
                    onChange={e => setForm({ ...form, mustChangePassword: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600"
                  />
                  <div className="text-xs">
                    <div className="font-black text-amber-900 dark:text-amber-200">إلزام تغيير كلمة المرور</div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-300/80">تظهر شاشة التغيير عند الدخول التالي.</div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.emailVerified}
                    onChange={e => setForm({ ...form, emailVerified: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600"
                  />
                  <div className="text-xs">
                    <div className="font-black text-emerald-900 dark:text-emerald-200">توثيق البريد الإلكتروني</div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300/80">اعتماد ملكية البريد للاستعادة.</div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.forceLogoutSessions}
                    onChange={e => setForm({ ...form, forceLogoutSessions: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-rose-600"
                  />
                  <div className="text-xs">
                    <div className="font-black text-rose-900 dark:text-rose-200">إنهاء الجلسات عند الحفظ</div>
                    <div className="text-[10px] text-rose-700 dark:text-rose-300/80">الجلسات النشطة حالياً: {activeSessionCount}</div>
                  </div>
                </label>
              </div>

              {/* Linked Login Methods (NO password exposure!) */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600" />
                    طرق الدخول المرتبطة وحماية كلمة المرور
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    لا يتم عرض كلمة المرور الحالية أو تخزينها نصياً ✓
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">كلمة المرور المشفرة:</div>
                    <div className="font-mono font-black tracking-widest text-slate-700 dark:text-slate-200 mt-1">••••••••••</div>
                    <div className="text-[10px] text-emerald-600 font-bold mt-1">
                      {liveUser.loginMethods?.passwordEnabled !== false ? "مفعلة ومشفرة" : "معطلة حالياً"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">تسجيل الدخول عبر Google / البريد:</div>
                    <div className="font-mono text-xs text-slate-800 dark:text-slate-200 mt-1 truncate">{form.email || "غير مرتبط"}</div>
                    <div className="text-[10px] text-indigo-600 font-bold mt-1">
                      {form.email && form.email.includes("@") ? "بريد صالح للربط والدخول" : "يرجى إدخال بريد إلكتروني"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">الدخول برقم الهوية الوطنية:</div>
                    <div className="font-mono text-xs text-slate-800 dark:text-slate-200 mt-1">{form.nationalId || "غير مسجل"}</div>
                    <div className="text-[10px] text-teal-600 font-bold mt-1">
                      {form.nationalId && form.nationalId.length >= 8 ? "مفعل برقم الهوية" : "غير مكتمل"}
                    </div>
                  </div>
                </div>

                {/* Security Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-2.5 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    disabled={sendingResetLink}
                    onClick={handleSendResetLinkNow}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sendingResetLink ? "جاري الإرسال..." : "إرسال رابط تغيير كلمة المرور"}</span>
                  </button>

                  {onOpenResetPassword && (
                    <button
                      type="button"
                      onClick={() => onOpenResetPassword(liveUser)}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>تعيين كلمة مرور جديدة مشفرة</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={revokingSessions}
                    onClick={handleRevokeSessionsNow}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{revokingSessions ? "جاري الإنهاء..." : `إلغاء الجلسات النشطة (${activeSessionCount})`}</span>
                  </button>
                </div>

                {generatedResetLink && (
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                    <div className="text-[11px] font-bold text-purple-900 dark:text-purple-200">
                      تم توليد رابط آمن لـ ({generatedResetLink.email}):
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedResetLink.url}
                        className="flex-1 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-slate-800 dark:text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedResetLink.url);
                          setInlineNotice("تم نسخ رابط تغيير كلمة المرور.");
                        }}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>نسخ</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== SECTION 3: ROLE, DEPT, ASSIGNMENT & PERMISSIONS ==================== */}
          {activeSection === "role_dept" && (
            <div className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الدور / نوع الحساب في النظام:
                  </label>
                  <select
                    value={form.role}
                    disabled={dependencies?.isLastActiveAdmin && liveUser.role === "admin"}
                    onChange={e => handleRoleChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  >
                    {availableRoles.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {dependencies?.isLastActiveAdmin && liveUser.role === "admin" && (
                    <p className="text-[10px] text-rose-600 mt-1">هذا آخر مدير عام نشط في النظام ولا يمكن خفض دوره.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الإدارة الرئيسية:
                  </label>
                  <select
                    value={form.departmentId}
                    disabled={!canFullAccess}
                    onChange={e => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  >
                    {departmentsList.map(d => (
                      <option key={d.id} value={d.id}>{d.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    المسمى الوظيفي:
                  </label>
                  <input
                    type="text"
                    value={form.jobTitle}
                    onChange={e => setForm({ ...form, jobTitle: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    المنصب التنظيمي / دور المجلس:
                  </label>
                  <input
                    type="text"
                    value={form.positionTitle}
                    onChange={e => setForm({ ...form, positionTitle: e.target.value })}
                    placeholder="مثال: عضو لجنة / رئيس قسم"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    صفة التكليف / عضوية المجلس:
                  </label>
                  <input
                    type="text"
                    value={form.boardRole}
                    onChange={e => setForm({ ...form, boardRole: e.target.value })}
                    placeholder="مثال: تكليف تنفيذي"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    حالة التكليف:
                  </label>
                  <select
                    value={form.assignmentStatus}
                    onChange={e => setForm({ ...form, assignmentStatus: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="active">تكليف ساري (Active)</option>
                    <option value="pending">بانتظار المباشرة</option>
                    <option value="suspended">موقوف مؤقتاً</option>
                    <option value="ended">منتهي التكليف</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ بداية التكليف:
                  </label>
                  <input
                    type="date"
                    value={form.assignmentStartDate ? form.assignmentStartDate.split("T")[0] : ""}
                    onChange={e => setForm({ ...form, assignmentStartDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    تاريخ نهاية التكليف:
                  </label>
                  <input
                    type="date"
                    value={form.assignmentEndDate ? form.assignmentEndDate.split("T")[0] : ""}
                    onChange={e => setForm({ ...form, assignmentEndDate: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Permissions Matrix */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-indigo-600" />
                      مصفوفة الصلاحيات التفصيلية ({form.permissions.length} صلاحية)
                    </h3>
                    <label className="flex items-center gap-1.5 mt-1 cursor-pointer text-[11px] text-slate-500">
                      <input
                        type="checkbox"
                        checked={form.syncRolePermissions}
                        onChange={e => setForm({ ...form, syncRolePermissions: e.target.checked })}
                        className="rounded text-emerald-600"
                      />
                      <span>تحديث الصلاحيات تلقائياً عند تغيير الدور</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={handleApplyRoleDefaults}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold cursor-pointer"
                    >
                      تطبيق افتراضي الدور
                    </button>
                    {canFullAccess && (
                      <button
                        type="button"
                        onClick={() => {
                          const all: string[] = [];
                          USER_PERMISSION_CATEGORIES.forEach(c => c.permissions.forEach(p => all.push(p.key)));
                          setForm({ ...form, permissions: all });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold cursor-pointer"
                      >
                        تحديد الكل
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, permissions: [] })}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold cursor-pointer"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-[38vh] overflow-y-auto pr-1">
                  {USER_PERMISSION_CATEGORIES.map(cat => {
                    const CatIcon = cat.icon;
                    return (
                      <div key={cat.id} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="font-black text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2.5">
                          <CatIcon className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{cat.nameAr}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cat.permissions.map(p => {
                            const isChecked = form.permissions.includes(p.key);
                            const callerHasPerm =
                              Array.isArray(currentUser?.permissions) &&
                              (currentUser.permissions.includes(p.key) ||
                                currentUser.permissions.includes("super_admin") ||
                                currentUser.permissions.includes("all_permissions"));
                            const isLocked =
                              !canFullAccess &&
                              (SUPER_ADMIN_ONLY_PERMS.has(p.key) || !callerHasPerm);
                            return (
                              <label
                                key={p.key}
                                className={`flex items-start gap-2 p-2 rounded-xl border text-xs transition-all ${
                                  isLocked ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900" : "cursor-pointer"
                                } ${
                                  isChecked
                                    ? "bg-white dark:bg-slate-800 border-emerald-500 shadow-2xs"
                                    : "bg-transparent border-slate-200 dark:border-slate-700/60"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  disabled={isLocked}
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

                {/* Department-Specific Granular Permissions Integration */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>الصلاحيات التخصصية الدقيقة للإدارة المرتبطة</span>
                  </div>
                  <DepartmentPermissionsManager
                    selectedAccount={{
                      id: targetUserId,
                      name: form.name || liveUser.name,
                      role: form.role,
                      departmentId: form.departmentId
                    }}
                    departments={departmentsList}
                    currentRole={form.role}
                    currentDepartmentId={form.departmentId}
                    selectedPermissions={form.permissions}
                    onChangePermissions={(perms) =>
                      setForm((prev) => ({
                        ...prev,
                        permissions: Array.from(new Set(perms)),
                        syncRolePermissions: false
                      }))
                    }
                    onChangeDepartment={canFullAccess ? (deptId) => setForm((prev) => ({ ...prev, departmentId: deptId })) : undefined}
                    onSave={() => {}}
                    isSuperAdmin={canFullAccess}
                    allowedPermissionIds={
                      canFullAccess
                        ? undefined
                        : Array.isArray(currentUser?.permissions)
                        ? currentUser.permissions
                        : getDepartmentPermissionIds(form.departmentId)
                    }
                    hideSaveButton={true}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ==================== SECTION 4: VOLUNTEER & TEAM ==================== */}
          {activeSection === "volunteer" && isVolunteerUser && (
            <div className="space-y-5 animate-fade-in">
              {/* Protected Read-Only Records Banner */}
              <div className="bg-teal-50/80 dark:bg-teal-950/30 p-4 rounded-2xl border border-teal-200 dark:border-teal-900/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-teal-600" />
                    السجلات التطوعية المحمية (للقراءة فقط ولا تتأثر بتعديل البيانات)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-teal-100 text-teal-800 border border-teal-300">
                    رقم العضوية: #{liveUser.membershipNumber || liveUser.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-teal-200/70">
                    <div className="text-[10px] text-slate-400">الساعات المعتمدة:</div>
                    <div className="font-mono font-black text-teal-700 dark:text-teal-300 text-sm">{liveUser.hours ?? 0} ساعة</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-teal-200/70">
                    <div className="text-[10px] text-slate-400">رصيد النقاط:</div>
                    <div className="font-mono font-black text-amber-600 text-sm">{liveUser.points ?? 0} نقطة</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-teal-200/70">
                    <div className="text-[10px] text-slate-400">سجلات الحضور الميداني:</div>
                    <div className="font-mono font-black text-slate-700 dark:text-slate-200 text-sm">{dependencies?.details?.attendanceCount ?? liveUser.attendanceCount ?? 0}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-teal-200/70">
                    <div className="text-[10px] text-slate-400">الشهادات المعتمدة:</div>
                    <div className="font-mono font-black text-indigo-600 text-sm">{dependencies?.details?.certificatesCount ?? 0}</div>
                  </div>
                </div>
              </div>

              {pendingTransferRequest && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Award className="w-4 h-4 shrink-0" />
                  <span>يوجد طلب نقل فريق معلق حالياً بانتظار اعتماد إدارة التطوع إلى: <strong>{pendingTransferRequest.suggestedTeamName || "فريق آخر"}</strong></span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الفريق التطوعي التابع:
                  </label>
                  <select
                    value={form.teamId}
                    onChange={e => setForm({ ...form, teamId: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">متطوع مستقل / بدون فريق</option>
                    {teamsList.map(t => (
                      <option key={t.id} value={t.id}>{t.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الدور داخل الفريق:
                  </label>
                  <input
                    type="text"
                    value={form.teamRole}
                    onChange={e => setForm({ ...form, teamRole: e.target.value })}
                    placeholder="عضو فريق / نائب قائد / منسق"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    المشرف المباشر / قائد الفريق:
                  </label>
                  <input
                    type="text"
                    value={form.supervisorName}
                    onChange={e => setForm({ ...form, supervisorName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      تاريخ الانضمام:
                    </label>
                    <input
                      type="date"
                      value={form.joinDate ? form.joinDate.split("T")[0] : ""}
                      onChange={e => setForm({ ...form, joinDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                      انتهاء العضوية:
                    </label>
                    <input
                      type="date"
                      value={form.expiryDate ? form.expiryDate.split("T")[0] : ""}
                      onChange={e => setForm({ ...form, expiryDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {String(form.teamId || "") !== String(liveUser.teamId || "") && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl space-y-3">
                  <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    آلية تغيير الفريق التطوعي (حماية السجلات ومسار الاعتماد)
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      سبب تغيير الفريق التطوعي:
                    </label>
                    <input
                      type="text"
                      value={form.teamChangeReason}
                      onChange={e => setForm({ ...form, teamChangeReason: e.target.value })}
                      placeholder="اذكر سبب النقل ليتم توثيقه في سجل الانتقالات..."
                      className="w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl p-2 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  {!workflowRequiredForTeam && (
                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input
                          type="radio"
                          name="teamChangeMode"
                          checked={form.teamChangeMode === "workflow"}
                          onChange={() => setForm({ ...form, teamChangeMode: "workflow" })}
                        />
                        <span>رفع طلب نقل لاعتماد إدارة التطوع (dep-5)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer font-bold">
                        <input
                          type="radio"
                          name="teamChangeMode"
                          checked={form.teamChangeMode === "direct"}
                          onChange={() => setForm({ ...form, teamChangeMode: "direct" })}
                        />
                        <span>اعتماد النقل مباشرة مع توثيق سجل الانتقالات</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== SECTION 5: BENEFICIARY & ATTACHMENTS ==================== */}
          {activeSection === "beneficiary" && isBeneficiaryUser && (
            <div className="space-y-5 animate-fade-in">
              {/* Protected Beneficiary Permanent Fields */}
              <div className="bg-rose-50/80 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-rose-600" />
                    البيانات المرجعية المحمية للمستفيد (غير قابلة للتعديل المباشر)
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    ملف: #{liveUser.beneficiaryNumber || liveUser.id}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-200/70">
                    <div className="text-[10px] text-slate-400">الباركود الدائم للمستفيد:</div>
                    <div className="font-mono font-black text-rose-700 dark:text-rose-300 text-xs">{liveUser.barcodeId || "غير مصدر بعد"}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-200/70">
                    <div className="text-[10px] text-slate-400">عمليات التسليم المسجلة:</div>
                    <div className="font-mono font-black text-slate-700 dark:text-slate-200 text-sm">{dependencies?.details?.handoversCount ?? liveUser.aidHistoryCount ?? 0}</div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-rose-200/70">
                    <div className="text-[10px] text-slate-400">طلبات الإعانة التاريخية:</div>
                    <div className="font-mono font-black text-slate-700 dark:text-slate-200 text-sm">{dependencies?.details?.benefitRequestsCount ?? 0}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    صفة الإقامة / الجنسية النظامية:
                  </label>
                  <select
                    value={form.residencyStatus}
                    onChange={e => setForm({ ...form, residencyStatus: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="مواطن سعودي">مواطن سعودي</option>
                    <option value="مقيم">مقيم</option>
                    <option value="ابن أو ابنة مواطنة سعودية">ابن أو ابنة مواطنة سعودية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الحالة الاجتماعية:
                  </label>
                  <select
                    value={form.maritalStatus}
                    onChange={e => setForm({ ...form, maritalStatus: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">غير محدد</option>
                    <option value="أعزب/عزباء">أعزب/عزباء</option>
                    <option value="متزوج/متزوجة">متزوج/متزوجة</option>
                    <option value="أرمل/أرملة">أرمل/أرملة</option>
                    <option value="مطلق/مطلقة">مطلق/مطلقة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    حالة اليتم:
                  </label>
                  <select
                    value={form.orphanStatus}
                    onChange={e => setForm({ ...form, orphanStatus: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">لا ينطبق / غير يتيم</option>
                    <option value="يتيم الأب">يتيم الأب</option>
                    <option value="يتيم الأبوين">يتيم الأبوين</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    فئة الرعاية الاجتماعية:
                  </label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    عدد أفراد الأسرة:
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.familySize}
                    onChange={e => setForm({ ...form, familySize: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    الدخل الشهري التقديري (ر.س):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.monthlyIncome}
                    onChange={e => setForm({ ...form, monthlyIncome: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    نوع السكن:
                  </label>
                  <select
                    value={form.housingType}
                    onChange={e => setForm({ ...form, housingType: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="">غير محدد</option>
                    <option value="ملك">ملك</option>
                    <option value="إيجار">إيجار</option>
                    <option value="سكن خيري / ضيافة">سكن خيري / ضيافة</option>
                    <option value="مشترك مع الأهل">مشترك مع الأهل</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1">
                    بيانات المعالين والتابعين:
                  </label>
                  <input
                    type="text"
                    value={form.dependentsInfo}
                    onChange={e => setForm({ ...form, dependentsInfo: e.target.value })}
                    placeholder="تفاصيل التابعين أو الحالة الصحية..."
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Proof Doc & Attachments */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4">
                <ImageUploadField
                  label="وثيقة إثبات الهوية / الإقامة / الجنسية"
                  value={form.nationalityProofDoc}
                  onChange={val => setForm({ ...form, nationalityProofDoc: val })}
                  previewAspect="auto"
                />

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-emerald-600" />
                      المرفقات والمستندات المساندة ({form.attachments.length})
                    </span>
                    <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold cursor-pointer inline-flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>إرفاق ملف من الجهاز</span>
                      <input type="file" onChange={handleAddAttachmentFile} className="hidden" />
                    </label>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={newAttachmentTitle}
                      onChange={e => setNewAttachmentTitle(e.target.value)}
                      placeholder="اسم المرفق (مثال: عقد الإيجار)"
                      className="flex-1 min-w-[140px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs"
                    />
                    <input
                      type="url"
                      value={newAttachmentUrl}
                      onChange={e => setNewAttachmentUrl(e.target.value)}
                      placeholder="أو رابط المرفق https://..."
                      className="flex-1 min-w-[180px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttachmentUrl}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      إضافة رابط
                    </button>
                  </div>

                  {form.attachments.length > 0 && (
                    <div className="space-y-2">
                      {form.attachments.map((att: any, idx: number) => (
                        <div key={att?.id || idx} className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {typeof att === "string" ? `مرفق #${idx + 1}` : att.name || `مرفق #${idx + 1}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) }))}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                            title="حذف المرفق"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Sticky Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
            <span>يتم توثيق جميع التعديلات تلقائياً في سجل التدقيق الأمني</span>
          </div>

          <div className="flex items-center gap-2.5 mr-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري حفظ التعديلات...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
