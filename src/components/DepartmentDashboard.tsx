import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Building2, 
  MoreHorizontal,
  ChevronDown,
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Send, 
  Users, 
  FileText, 
  ShieldCheck, 
  Key, 
  Plus, 
  Sparkles, 
  CheckSquare, 
  MessageSquare,
  Award,
  ChevronRight,
  UserCheck,
  Briefcase,
  HeartHandshake,
  Mail,
  Boxes,
  Package,
  DollarSign,
  FolderKanban,
  Newspaper,
  Image,
  ShieldAlert,
  Lock,
  RefreshCw,
  LogOut,
  Eye,
  Search,
  Filter,
  Check,
  X,
  Calendar,
  MapPin,
  ExternalLink,
  Home,
  Play,
  Video,
  Trash2,
  Edit3,
  Star,
  Upload,
  CheckCircle,
  ArrowRightLeft,
  KeyRound,
  BarChart3
} from 'lucide-react';
import { BeneficiariesStatisticsModal } from './BeneficiariesStatisticsModal';
import { 
  Department, 
  DepartmentDirective, 
  VolunteerTeam, 
  Volunteer, 
  Initiative, 
  Beneficiary, 
  OfficialLetter, 
  Employee, 
  EmployeeRequest, 
  AidDistribution, 
  DistributionHandoverRecord, 
  InventoryItem, 
  Notification,
  DepartmentPermissionKey,
  AdministrativeTask
} from '../types';
import { buildApiUrl, getAuthHeaders } from '../config/api';
import { InventoryManager } from './InventoryManager';
import { BeneficiariesMasterDashboard } from './BeneficiariesMasterDashboard';
import { SendLetterModal } from './SendLetterModal';
import { DepartmentStaffManager } from './DepartmentStaffManager';
import { DepartmentStaffModal } from './DepartmentStaffModal';
import { DepartmentTasksModal } from './DepartmentTasksModal';
import { VolunteerTeamTransferManager } from './VolunteerTeamTransferManager';
import { PasswordResetRequestsManager } from './PasswordResetRequestsManager';
import { TeamSupportManager } from './TeamSupportManager';
import { DashboardErrorBoundary } from './DashboardErrorBoundary';
import { AccessDeniedCard } from './AccessDeniedCard';
import { HRDashboard } from './HRDashboard';
import { ArchivesDirectoryPanel } from './ArchivesDirectoryPanel';
import { UsersManager } from './UsersManager';
import { Archive } from 'lucide-react';

export interface DepartmentDashboardProps {
  currentUser?: any;
  userRole?: string;
  userDepartmentId?: string;
  departments?: Department[];
  currentDepartment?: Department;
  directives?: DepartmentDirective[];
  teams?: VolunteerTeam[];
  volunteers?: Volunteer[];
  initiatives?: Initiative[];
  requests?: any[];
  employees?: Employee[];
  employeeRequests?: EmployeeRequest[];
  beneficiaries?: Beneficiary[];
  distributions?: AidDistribution[];
  distributionHandovers?: DistributionHandoverRecord[];
  inventoryItems?: InventoryItem[];
  financialTransactions?: any[];
  storeDonations?: any[];
  storeProjects?: any[];
  news?: any[];
  partners?: any[];
  gallery?: any[];
  heroSlides?: any[];
  notifications?: Notification[];
  letters?: OfficialLetter[];
  administrativeTasks?: AdministrativeTask[];
  homeSettings?: any;
  onRefreshGlobalData?: (updatedDb?: any) => void;
  onSubmitEmployeeRequest?: (req: Partial<EmployeeRequest>) => Promise<boolean>;
  onUpdateEmployeeRequest?: (req: Partial<EmployeeRequest>) => Promise<boolean>;
  onApproveEmployeeRequest?: (id: string) => Promise<boolean>;
  onRejectEmployeeRequest?: (id: string) => Promise<boolean>;
  onUpdateDirectiveStatus: (directiveId: string, status: 'pending' | 'in_progress' | 'completed' | 'needs_review', notes?: string) => void;
  onUpdateDepartmentTasks?: (departmentId: string, tasks: string[]) => void;
  onActionRequest?: (id: string, action: 'approved' | 'rejected') => void;
  onAddInitiative?: (init: Partial<Initiative>) => Promise<boolean>;
  onCopyInitiative?: (id: string, date: string, name: string) => void;
  onCreateDistribution?: (data: Partial<AidDistribution>) => Promise<boolean>;
  onUpdateDistribution?: (data: Partial<AidDistribution>) => Promise<boolean>;
  onDeleteDistribution?: (id: string) => Promise<boolean>;
  onHandoverSubmit?: (data: any) => Promise<any>;
  onCancelHandover?: (handoverId: string) => Promise<boolean>;
  onAddBeneficiary?: (data: Partial<Beneficiary>) => Promise<boolean>;
  onUpdateBeneficiaryStatus?: (id: string, status: "approved" | "pending" | "rejected") => Promise<boolean>;
  onArchiveOrDeleteBeneficiary?: (payload: { beneficiaryId: string; actionType: 'archive' | 'deactivate' | 'permanent_delete'; reason: string }) => Promise<{ ok: boolean; error?: string }>;
  onRestoreBeneficiary?: (beneficiaryId: string) => Promise<{ ok: boolean; error?: string }>;
  onArchiveOrDeleteVolunteer?: (payload: { volunteerId: string; actionType: 'archive' | 'deactivate' | 'permanent_delete'; reason: string }) => Promise<{ ok: boolean; error?: string }>;
  onRestoreVolunteer?: (volunteerId: string) => Promise<{ ok: boolean; error?: string }>;
  onSubmitOfficialLetter?: (letter: Partial<OfficialLetter>) => Promise<{ success: boolean; letter?: OfficialLetter; message?: string }>;
  onAddExpense?: (exp: any) => Promise<boolean>;
  onAddProject?: (proj: any) => Promise<boolean>;
  onAddNewsItem?: (item: any) => Promise<boolean>;
  onDeleteNewsItem?: (id: string) => Promise<boolean>;
  onAddPartnerItem?: (item: any) => Promise<boolean>;
  onDeletePartnerItem?: (id: string) => Promise<boolean>;
  onAddGalleryItem?: (item: any) => Promise<boolean>;
  onDeleteGalleryItem?: (id: string) => Promise<boolean>;
  onLogout?: () => void;
  onBackToHome?: () => void;
}

export const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({
  currentUser,
  userRole = 'department_admin',
  userDepartmentId,
  departments = [],
  currentDepartment,
  directives = [],
  teams = [],
  volunteers = [],
  initiatives = [],
  requests = [],
  employees = [],
  employeeRequests = [],
  beneficiaries = [],
  distributions = [],
  distributionHandovers = [],
  inventoryItems = [],
  financialTransactions = [],
  storeDonations = [],
  storeProjects = [],
  news = [],
  partners = [],
  gallery = [],
  heroSlides = [],
  notifications = [],
  letters = [],
  administrativeTasks = [],
  homeSettings,
  onRefreshGlobalData,
  onSubmitEmployeeRequest,
  onUpdateEmployeeRequest,
  onApproveEmployeeRequest,
  onRejectEmployeeRequest,
  onUpdateDirectiveStatus,
  onUpdateDepartmentTasks,
  onActionRequest,
  onAddInitiative,
  onCopyInitiative,
  onCreateDistribution = async () => false,
  onUpdateDistribution = async () => false,
  onDeleteDistribution = async () => false,
  onHandoverSubmit = async () => ({ success: false }),
  onCancelHandover = async () => false,
  onAddBeneficiary,
  onUpdateBeneficiaryStatus,
  onArchiveOrDeleteBeneficiary,
  onRestoreBeneficiary,
  onArchiveOrDeleteVolunteer,
  onRestoreVolunteer,
  onSubmitOfficialLetter,
  onAddExpense,
  onAddProject,
  onAddNewsItem,
  onDeleteNewsItem,
  onAddPartnerItem,
  onDeletePartnerItem,
  onAddGalleryItem,
  onDeleteGalleryItem,
  onLogout,
  onBackToHome
}) => {
  // Resolve Target Department
  const deptId = currentDepartment?.id || userDepartmentId || currentUser?.departmentId || currentUser?.primaryDepartmentId || 'dep-1';
  const currentDept = currentDepartment || (Array.isArray(departments) ? departments.find(d => d.id === deptId) : undefined) || (Array.isArray(departments) ? departments[0] : undefined) || {
    id: deptId,
    nameAr: currentUser?.departmentName || currentUser?.departmentNameAr || "إدارة الجمعية",
    nameEn: "Department Management",
    directorName: currentUser?.name || "مدير الإدارة",
    nationalId: currentUser?.nationalId || "1010000001",
    email: currentUser?.email || "dept@riadataleata.org.sa",
    phone: currentUser?.phone || "0550000000",
    tasks: [
      "متابعة وتنفيذ خطة الإدارة التشغيلية.",
      "رفع تقارير الإنجاز الدورية لمجلس الإدارة.",
      "إدارة فرق العمل والمهام الموكلة."
    ]
  };

  const deptNameAr = (currentDept?.nameAr || currentUser?.departmentName || currentUser?.departmentNameAr || '').toLowerCase();
  const jobTitle = (currentUser?.jobTitle || '').toLowerCase();
  const effectiveRole = currentUser?.role || userRole;

  // Department Type Classification
  const isWarehouseDept = deptId === 'dep-8' || deptNameAr.includes('مخزن') || deptNameAr.includes('مستودع') || deptNameAr.includes('مساندة') || jobTitle.includes('مخزن') || jobTitle.includes('مستودع') || effectiveRole === 'storekeeper';
  const isVolunteerDept = deptId === 'dep-5' || deptNameAr.includes('تطوع') || jobTitle.includes('تطوع');
  const isBeneficiaryDept = deptId === 'dep-4' || deptNameAr.includes('مستفيد') || jobTitle.includes('مستفيد');
  const isHRDept = deptId === 'dep-9' || deptId === 'dep-6_hr' || deptNameAr.includes('موارد بشرية') || deptNameAr.includes('كوادر') || jobTitle.includes('موارد بشرية');
  const isFinanceDept = deptId === 'dep-2' || deptNameAr.includes('مالي') || jobTitle.includes('مالي') || jobTitle.includes('محاسب');
  const isProjectsDept = deptId === 'dep-3' || deptNameAr.includes('برامج') || deptNameAr.includes('مشاريع') || jobTitle.includes('مشاريع');
  const isMediaDept = deptId === 'dep-6' || deptNameAr.includes('إعلام') || deptNameAr.includes('علاقات عامة') || jobTitle.includes('إعلام');
  const isExecutiveDept = deptId === 'dep-1' || deptNameAr.includes('تنفيذية') || effectiveRole === 'admin' || effectiveRole === 'operations_manager';

  // Role & Granular RBAC Permissions
  const isTopExecutive = effectiveRole === 'admin' || effectiveRole === 'operations_manager';
  const isDirector = isTopExecutive || effectiveRole === 'department_admin' || effectiveRole === 'storekeeper';
  const userPermissions: string[] = Array.isArray(currentUser?.permissions)
    ? currentUser.permissions
    : isTopExecutive
    ? [
        'view_department', 'create_data', 'edit_data', 'delete_data', 'approve_data', 'reject_data',
        'disburse_data', 'receive_data', 'print_data', 'export_pdf', 'export_excel',
        'manage_staff', 'manage_tasks', 'view_reports', 'super_admin'
      ]
    : isDirector
    ? [
        'view_department', 'create_data', 'edit_data', 'delete_data', 'approve_data', 'reject_data',
        'disburse_data', 'receive_data', 'print_data', 'export_pdf', 'export_excel',
        'manage_staff', 'manage_tasks', 'view_reports'
      ]
    : ['view_department'];

  const hasPermission = (permKey: DepartmentPermissionKey | string): boolean => {
    if (isTopExecutive || userPermissions.includes('super_admin') || userPermissions.includes('all_permissions')) return true;
    if (userPermissions.includes(permKey as any)) return true;

    // Granular alias checks
    return userPermissions.some((p: string) => {
      if (permKey === 'create_data') {
        return p.includes('_add_') || p.includes('_create') || p === 'items' || p === 'create_initiatives';
      }
      if (permKey === 'edit_data') {
        return p.includes('_edit_') || p.includes('_manage_') || p.includes('_points') || p.includes('_quantities');
      }
      if (permKey === 'delete_data') {
        return p.includes('_delete_');
      }
      if (permKey === 'view_department') {
        return p.includes('_view_') || p.includes('_audit_') || p.includes('view_stock');
      }
      if (permKey === 'approve_data') {
        return p.includes('_approve_') || p.includes('_evaluations') || p.includes('_leaves');
      }
      if (permKey === 'reject_data') {
        return p.includes('_reject_') || p === 'reject_data';
      }
      if (permKey === 'disburse_data') {
        return p.includes('_disburse') || p === 'outbound' || p.includes('_payroll') || p.includes('_record_receipt');
      }
      if (permKey === 'receive_data') {
        return p.includes('_receive') || p === 'inbound' || p.includes('_record_receipt');
      }
      if (permKey === 'print_data') {
        return p.includes('_print') || p.includes('_barcode');
      }
      if (permKey === 'view_reports') {
        return p.includes('_reports') || p.includes('_audit_') || p === 'audit';
      }
      if (permKey === 'export_excel' || permKey === 'export_pdf') {
        return p.includes('_export');
      }
      if (permKey === 'manage_staff') {
        return p.includes('_staff') || p.includes('_files');
      }
      if (permKey === 'manage_tasks') {
        return p.includes('_manage_') || p.includes('_attendance');
      }
      return false;
    });
  };

  const allowedPages: string[] = currentUser?.allowedPages || [];
  const isPageAllowed = (pageKey: string): boolean => {
    if (isTopExecutive || userPermissions.includes('super_admin') || allowedPages.length === 0) return true;
    return allowedPages.includes(pageKey);
  };

  const canManageDepartmentUsers =
    (isBeneficiaryDept || isVolunteerDept || isHRDept) &&
    (isDirector || hasPermission('manage_staff') || hasPermission('edit_data'));

  const allDepartmentTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [];
    if (isWarehouseDept) tabs.push({ id: 'inventory', label: 'إدارة المخزون والمستودعات' });
    if (isVolunteerDept) {
      tabs.push({ id: 'volunteer_ops', label: 'الفرص والمبادرات التطوعية' });
      tabs.push({ id: 'volunteer_transfers', label: 'طلبات نقل وإنهاء ارتباط المتطوعين' });
      tabs.push({ id: 'volunteers_archive', label: 'أرشيف المتطوعين' });
      tabs.push({ id: 'requests', label: 'طلبات الانضمام والتطوع' });
      tabs.push({ id: 'team_support', label: 'الدعم الفني للفرق والمتطوعين' });
    }
    if (isExecutiveDept) {
      tabs.push({ id: 'beneficiary_stats', label: 'إحصائيات المستفيدين والعمليات' });
      tabs.push({ id: 'password_resets', label: 'طلبات تغيير كلمات المرور (العمليات)' });
    }
    if (isBeneficiaryDept) tabs.push({ id: 'beneficiaries', label: 'إدارة المستفيدين والتوزيعات' });
    if (isHRDept) tabs.push({ id: 'hr_staff', label: 'إدارة الموارد البشرية والكوادر (15 نظامًا)' });
    if (canManageDepartmentUsers) tabs.push({ id: 'dept_users', label: 'إدارة المستخدمين والصلاحيات' });
    if (isFinanceDept) tabs.push({ id: 'finance_ledger', label: 'المعاملات وسندات الصرف والقبض' });
    if (isProjectsDept) tabs.push({ id: 'projects_list', label: 'المشاريع والبرامج التنموية' });
    if (isMediaDept) {
      tabs.push({ id: 'media_news', label: 'المركز الإعلامي والأخبار' });
      tabs.push({ id: 'media_gallery', label: 'معرض الصور والمواد الإعلامية' });
    }
    tabs.push({ id: 'directives', label: 'تكليفات الإدارة العليا' });
    tabs.push({ id: 'tasks', label: 'المهام والتكليفات' });
    tabs.push({ id: 'staff', label: 'كوادر الإدارة والتوظيف' });
    tabs.push({ id: 'letters', label: 'الخطابات والمراسلات' });
    tabs.push({ id: 'credentials', label: 'بيانات الاعتماد' });
    return tabs;
  }, [isWarehouseDept, isVolunteerDept, isBeneficiaryDept, isHRDept, isFinanceDept, isProjectsDept, isMediaDept, isExecutiveDept, canManageDepartmentUsers]);

  const allowedDepartmentTabs = useMemo(() => {
    return allDepartmentTabs.filter(t => isPageAllowed(t.id));
  }, [allDepartmentTabs, allowedPages, isDirector, userPermissions]);

  // Default active tab based on department domain and allowed permissions
  const getDefaultTab = () => {
    if (allowedPages && allowedPages.length > 0 && !isDirector && !userPermissions.includes('super_admin')) {
      const match = allowedDepartmentTabs[0]?.id;
      if (match) return match;
    }
    if (isWarehouseDept && isPageAllowed('inventory')) return 'inventory';
    if (isBeneficiaryDept && isPageAllowed('beneficiaries')) return 'beneficiaries';
    if (isVolunteerDept && isPageAllowed('volunteer_ops')) return 'volunteer_ops';
    if (isHRDept && isPageAllowed('hr_staff')) return 'hr_staff';
    if (isFinanceDept && isPageAllowed('finance_ledger')) return 'finance_ledger';
    if (isProjectsDept && isPageAllowed('projects_list')) return 'projects_list';
    if (isMediaDept && isPageAllowed('media_news')) return 'media_news';
    if (isPageAllowed('directives')) return 'directives';
    if (isPageAllowed('tasks')) return 'tasks';
    return allowedDepartmentTabs[0]?.id || 'directives';
  };

  const [activeTab, setActiveTab] = useState<string>(getDefaultTab());
  const [isDeptMoreMenuOpen, setIsDeptMoreMenuOpen] = useState(false);
  const deptNavBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideOrEsc = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        setIsDeptMoreMenuOpen(false);
      } else if (e instanceof MouseEvent && deptNavBarRef.current && !deptNavBarRef.current.contains(e.target as Node)) {
        setIsDeptMoreMenuOpen(false);
      }
    };
    const handleNavigateDeptTab = (e: Event) => {
      const targetTab = (e as CustomEvent<string>)?.detail;
      if (targetTab && isPageAllowed(targetTab)) {
        setActiveTab(targetTab);
        setIsDeptMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideOrEsc);
    document.addEventListener('keydown', handleOutsideOrEsc);
    window.addEventListener('reyadat:navigate-dept-tab', handleNavigateDeptTab as EventListener);
    return () => {
      document.removeEventListener('mousedown', handleOutsideOrEsc);
      document.removeEventListener('keydown', handleOutsideOrEsc);
      window.removeEventListener('reyadat:navigate-dept-tab', handleNavigateDeptTab as EventListener);
    };
  }, [allowedPages]);

  const [isBenStatsModalOpen, setIsBenStatsModalOpen] = useState(false);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [selectedDirective, setSelectedDirective] = useState<DepartmentDirective | null>(null);
  const [reportNotes, setReportNotes] = useState('');
  const [targetStatus, setTargetStatus] = useState<'pending' | 'in_progress' | 'completed' | 'needs_review'>('completed');

  // Operational Tasks State
  const [deptTasks, setDeptTasks] = useState<string[]>(currentDept.tasks || []);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [deptActionNotice, setDeptActionNotice] = useState<string | null>(null);
  const [deptActionError, setDeptActionError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Opportunities & Initiatives state (For Volunteer Management)
  const [showAddInitiativeModal, setShowAddInitiativeModal] = useState(false);
  const [newInitData, setNewInitData] = useState({
    title: '',
    category: 'إنساني',
    location: 'مكة المكرمة - العسيلة',
    hours: 4,
    requiredVolunteers: 20,
    startDate: new Date().toISOString().split('T')[0],
    description: '',
    targetBeneficiaryGroup: 'عام'
  });
  const [initFilterCategory, setInitFilterCategory] = useState<string>('all');
  const [initSearchQuery, setInitSearchQuery] = useState('');

  // Finance Voucher State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpenseData, setNewExpenseData] = useState({
    title: '',
    amount: '',
    category: 'تشغيلي',
    recipient: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Projects Modal State
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState({
    title: '',
    budget: '',
    targetBeneficiaries: 100,
    description: '',
    category: 'تنموي',
    durationDays: 30
  });

  // Department Directives, Teams, Staff Filtering
  const myDirectives = directives.filter(d => 
    d.departmentId === currentDept.id || 
    d.departmentId === 'all' || 
    (d.assignedToDirectorId && d.assignedToDirectorId === currentUser?.id)
  );

  const activeBeneficiariesList = useMemo(
    () => (beneficiaries || []).filter(b => !b.isArchived && b.status !== 'archived' && b.status !== 'deactivated'),
    [beneficiaries]
  );
  const activeVolunteersList = useMemo(
    () => (volunteers || []).filter(v => !v.isArchived && v.status !== 'archived' && v.status !== 'deactivated'),
    [volunteers]
  );

  const myTeams = teams.filter(t => t.departmentId === currentDept.id || !t.departmentId);
  const myTeamIds = myTeams.map(t => t.id);
  const myVolunteers = activeVolunteersList.filter(v => v.departmentId === currentDept.id || myTeamIds.includes(v.teamId || ''));
  const myEmployees = employees.filter(e => e.departmentId === currentDept.id || e.departmentName === currentDept.nameAr);

  // Department-specific letters
  const myLetters = letters.filter(l => 
    l.targetDepartmentId === currentDept.id || 
    l.departmentId === currentDept.id || 
    l.senderId === currentUser?.id || 
    l.targetDirectorId === currentUser?.id ||
    l.departmentName === currentDept.nameAr
  );

  const myAdministrativeTasks = useMemo(() => {
    const deptTasksList = (administrativeTasks || []).filter((t) => t && t.departmentId === currentDept.id);
    if (isTopExecutive || hasPermission('manage_tasks')) return deptTasksList;
    return deptTasksList.filter(
      (t) =>
        !t.assigneeUserId ||
        t.assigneeUserId === currentUser?.id ||
        t.assigneeName === currentUser?.name
    );
  }, [administrativeTasks, currentDept.id, currentUser?.id, currentUser?.name, isTopExecutive]);

  const handleUpdateAdminTaskStatus = async (taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'archived') => {
    setUpdatingTaskId(taskId);
    setDeptActionError(null);
    try {
      const res = await fetch(buildApiUrl('/api/db/admin-tasks/status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ taskId, status })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeptActionError(json.error || 'تعذر تحديث حالة المهمة.');
        return;
      }
      setDeptActionNotice(json.message || 'تم تحديث حالة المهمة بنجاح.');
      onRefreshGlobalData?.(json.db);
    } catch {
      setDeptActionError('تعذر الاتصال بالخادم لتحديث المهمة.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('manage_tasks') && !hasPermission('create_data')) {
      setDeptActionError("عذراً، لا تملك صلاحية إضافة مهام تشغيلية جديدة.");
      return;
    }
    if (!newTaskInput.trim()) return;
    const updated = [...deptTasks, newTaskInput.trim()];
    setDeptTasks(updated);
    setNewTaskInput('');
    if (onUpdateDepartmentTasks) {
      onUpdateDepartmentTasks(currentDept.id, updated);
    }
  };

  const handleRemoveTask = (idx: number) => {
    if (!hasPermission('manage_tasks') && !hasPermission('delete_data')) {
      setDeptActionError("عذراً، لا تملك صلاحية حذف المهام التشغيلية.");
      return;
    }
    const updated = deptTasks.filter((_, i) => i !== idx);
    setDeptTasks(updated);
    if (onUpdateDepartmentTasks) {
      onUpdateDepartmentTasks(currentDept.id, updated);
    }
  };

  const handleOpenReportModal = (directive: DepartmentDirective) => {
    setSelectedDirective(directive);
    setReportNotes(directive.completionNotes || '');
    setTargetStatus(directive.status || 'completed');
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirective) return;
    onUpdateDirectiveStatus(selectedDirective.id, targetStatus, reportNotes);
    setSelectedDirective(null);
  };

  const handleCreateInitiativeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('create_data')) {
      alert("عذراً، حسابك لا يملك صلاحية إنشاء وطرح فرص تطوعية جديدة.");
      return;
    }
    if (!newInitData.title.trim()) return;
    if (onAddInitiative) {
      const success = await onAddInitiative({
        ...newInitData,
        departmentId: currentDept.id,
        hours: Number(newInitData.hours) || 4,
        requiredVolunteers: Number(newInitData.requiredVolunteers) || 10,
        currentVolunteersCount: 0,
        acceptedVolunteerIds: [],
        status: 'published',
        registrationStatus: 'open',
        createdBy: currentUser?.name || currentDept.directorName
      });
      if (success) {
        setShowAddInitiativeModal(false);
        setNewInitData({
          title: '',
          category: 'إنساني',
          location: 'مكة المكرمة - العسيلة',
          hours: 4,
          requiredVolunteers: 20,
          startDate: new Date().toISOString().split('T')[0],
          description: '',
          targetBeneficiaryGroup: 'عام'
        });
        if (onRefreshGlobalData) onRefreshGlobalData();
      }
    }
  };

  const handleCreateExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('disburse_data') && !hasPermission('create_data')) {
      alert("عذراً، لا تملك صلاحية اعتماد سندات الصرف أو القيود المالية.");
      return;
    }
    if (!newExpenseData.title || !newExpenseData.amount) return;
    if (onAddExpense) {
      const ok = await onAddExpense({
        ...newExpenseData,
        amount: Number(newExpenseData.amount),
        departmentId: currentDept.id,
        departmentName: currentDept.nameAr,
        createdById: currentUser?.id,
        createdByName: currentUser?.name || currentDept.directorName
      });
      if (ok) {
        setShowAddExpenseModal(false);
        setNewExpenseData({
          title: '',
          amount: '',
          category: 'تشغيلي',
          recipient: '',
          notes: '',
          date: new Date().toISOString().split('T')[0]
        });
        if (onRefreshGlobalData) onRefreshGlobalData();
      }
    }
  };

  const handleCreateProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasPermission('create_data')) {
      alert("عذراً، لا تملك صلاحية إدراج مشاريع وبرامج جديدة.");
      return;
    }
    if (!newProjectData.title) return;
    if (onAddProject) {
      const ok = await onAddProject({
        ...newProjectData,
        budget: Number(newProjectData.budget) || 0,
        departmentId: currentDept.id,
        departmentName: currentDept.nameAr,
        status: 'in_progress',
        progressPercent: 0,
        createdById: currentUser?.id
      });
      if (ok) {
        setShowAddProjectModal(false);
        setNewProjectData({
          title: '',
          budget: '',
          targetBeneficiaries: 100,
          description: '',
          category: 'تنموي',
          durationDays: 30
        });
        if (onRefreshGlobalData) onRefreshGlobalData();
      }
    }
  };

  // Media Gallery Management State (for Media Department)
  const [showAddGalleryModal, setShowAddGalleryModal] = useState(false);
  const [editingGalleryItem, setEditingGalleryItem] = useState<any | null>(null);
  const [galleryFormData, setGalleryFormData] = useState({
    titleAr: '',
    titleEn: '',
    type: 'photo' as 'photo' | 'video',
    url: '',
    category: 'مبادرات',
    date: new Date().toISOString().split('T')[0],
    descriptionAr: '',
    isFeatured: true
  });
  const [galleryFilterType, setGalleryFilterType] = useState<'all' | 'photo' | 'video'>('all');
  const [gallerySearchQuery, setGallerySearchQuery] = useState('');

  const handleOpenAddGallery = (item?: any) => {
    if (item) {
      setEditingGalleryItem(item);
      setGalleryFormData({
        titleAr: item.titleAr || '',
        titleEn: item.titleEn || '',
        type: item.type || 'photo',
        url: item.url || '',
        category: item.category || 'مبادرات',
        date: item.date || new Date().toISOString().split('T')[0],
        descriptionAr: item.descriptionAr || '',
        isFeatured: item.isFeatured !== false
      });
    } else {
      setEditingGalleryItem(null);
      setGalleryFormData({
        titleAr: '',
        titleEn: '',
        type: 'photo',
        url: '',
        category: 'مبادرات',
        date: new Date().toISOString().split('T')[0],
        descriptionAr: '',
        isFeatured: true
      });
    }
    setShowAddGalleryModal(true);
  };

  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddGalleryItem) return;
    if (!galleryFormData.titleAr || !galleryFormData.url) {
      alert('يرجى إدخال عنوان الصورة أو الفيديو والرابط');
      return;
    }

    const payload = editingGalleryItem
      ? { ...editingGalleryItem, ...galleryFormData }
      : { ...galleryFormData, id: 'gal-' + Date.now() };

    const success = await onAddGalleryItem(payload);
    if (success !== false) {
      setShowAddGalleryModal(false);
      setEditingGalleryItem(null);
      if (onRefreshGlobalData) onRefreshGlobalData();
    }
  };

  const handleToggleGalleryFeatured = async (item: any) => {
    if (!onAddGalleryItem) return;
    await onAddGalleryItem({ ...item, isFeatured: !item.isFeatured });
    if (onRefreshGlobalData) onRefreshGlobalData();
  };

  const handleDeleteGallery = async (id: string) => {
    if (!onDeleteGalleryItem) return;
    if (window.confirm('هل أنت متأكد من حذف هذه المادة الإعلامية من المعرض؟')) {
      await onDeleteGalleryItem(id);
      if (onRefreshGlobalData) onRefreshGlobalData();
    }
  };

  const handleGalleryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setGalleryFormData(prev => ({ ...prev, url: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const deptNavItems: {
    id: string;
    label: string;
    badge?: string | number;
    icon: React.ReactNode;
  }[] = useMemo(() => {
    const items: { id: string; label: string; badge?: string | number; icon: React.ReactNode }[] = [];
    if (isWarehouseDept && isPageAllowed('inventory')) {
      items.push({ id: 'inventory', label: 'إدارة المخزون والمستودعات', badge: `${inventoryItems.length} صنف`, icon: <Boxes className="w-4 h-4 shrink-0" /> });
    }
    if (isVolunteerDept && isPageAllowed('volunteer_ops')) {
      items.push({ id: 'volunteer_ops', label: 'الفرص والمبادرات التطوعية', badge: `${initiatives.length} فرصة`, icon: <Sparkles className="w-4 h-4 shrink-0" /> });
    }
    if (isVolunteerDept && isPageAllowed('volunteer_transfers')) {
      items.push({ id: 'volunteer_transfers', label: 'طلبات نقل المتطوعين', icon: <ArrowRightLeft className="w-4 h-4 shrink-0" /> });
    }
    if (isVolunteerDept && isPageAllowed('volunteers_archive')) {
      items.push({ id: 'volunteers_archive', label: 'أرشيف المتطوعين', icon: <Archive className="w-4 h-4 shrink-0" /> });
    }
    if (isExecutiveDept && isPageAllowed('beneficiary_stats')) {
      items.push({ id: 'beneficiary_stats', label: 'إحصائيات المستفيدين والعمليات', icon: <BarChart3 className="w-4 h-4 shrink-0" /> });
    }
    if (isExecutiveDept && isPageAllowed('password_resets')) {
      items.push({ id: 'password_resets', label: 'طلبات تغيير كلمات المرور', icon: <KeyRound className="w-4 h-4 shrink-0" /> });
    }
    if (isVolunteerDept && isPageAllowed('requests')) {
      items.push({ id: 'requests', label: 'طلبات الانضمام والتطوع', badge: `${requests.length} طلب`, icon: <UserCheck className="w-4 h-4 shrink-0" /> });
    }
    if (isVolunteerDept && isPageAllowed('team_support')) {
      items.push({ id: 'team_support', label: 'الدعم الفني للفرق', icon: <MessageSquare className="w-4 h-4 shrink-0" /> });
    }
    if (isBeneficiaryDept && isPageAllowed('beneficiaries')) {
      items.push({ id: 'beneficiaries', label: 'إدارة المستفيدين والتوزيعات', badge: `${activeBeneficiariesList.length} مستفيد`, icon: <HeartHandshake className="w-4 h-4 shrink-0" /> });
    }
    if (isHRDept && isPageAllowed('hr_staff')) {
      items.push({ id: 'hr_staff', label: 'سجل الكوادر والموظفين', badge: `${employees.length} موظف`, icon: <Users className="w-4 h-4 shrink-0" /> });
    }
    if (canManageDepartmentUsers && isPageAllowed('dept_users')) {
      items.push({ id: 'dept_users', label: 'إدارة المستخدمين والصلاحيات', icon: <ShieldCheck className="w-4 h-4 shrink-0" /> });
    }
    if (isFinanceDept && isPageAllowed('finance_ledger')) {
      items.push({ id: 'finance_ledger', label: 'المعاملات وسندات الصرف', badge: `${financialTransactions.length} قيد`, icon: <DollarSign className="w-4 h-4 shrink-0" /> });
    }
    if (isProjectsDept && isPageAllowed('projects_list')) {
      items.push({ id: 'projects_list', label: 'المشاريع والبرامج التنموية', badge: `${storeProjects.length} مشروع`, icon: <FolderKanban className="w-4 h-4 shrink-0" /> });
    }
    if (isMediaDept && isPageAllowed('media_news')) {
      items.push({ id: 'media_news', label: 'المركز الإعلامي والأخبار', badge: `${news.length} خبر`, icon: <Newspaper className="w-4 h-4 shrink-0" /> });
    }
    if (isMediaDept && isPageAllowed('media_gallery')) {
      items.push({ id: 'media_gallery', label: 'معرض الصور والمواد الإعلامية', badge: `${gallery.length} مادة`, icon: <Image className="w-4 h-4 shrink-0" /> });
    }
    if (isPageAllowed('directives')) {
      items.push({ id: 'directives', label: 'تكليفات الإدارة العليا', badge: myDirectives.length, icon: <Send className="w-4 h-4 shrink-0" /> });
    }
    if (isPageAllowed('tasks')) {
      items.push({ id: 'tasks', label: 'المهام والتكليفات', badge: myAdministrativeTasks.length || deptTasks.length, icon: <CheckSquare className="w-4 h-4 shrink-0" /> });
    }
    if (isPageAllowed('staff')) {
      items.push({ id: 'staff', label: 'كوادر الإدارة والتوظيف', badge: myEmployees.length, icon: <Briefcase className="w-4 h-4 shrink-0" /> });
    }
    if (isPageAllowed('letters')) {
      items.push({ id: 'letters', label: 'الخطابات والمراسلات', badge: myLetters.length, icon: <Mail className="w-4 h-4 shrink-0" /> });
    }
    if (isPageAllowed('credentials')) {
      items.push({ id: 'credentials', label: 'بيانات الاعتماد', icon: <Key className="w-4 h-4 shrink-0" /> });
    }
    return items;
  }, [
    isWarehouseDept, isVolunteerDept, isExecutiveDept, isBeneficiaryDept, isHRDept,
    canManageDepartmentUsers, isFinanceDept, isProjectsDept, isMediaDept,
    allowedPages, isTopExecutive, userPermissions,
    inventoryItems.length, initiatives.length, requests.length, activeBeneficiariesList.length,
    employees.length, financialTransactions.length, storeProjects.length, news.length,
    gallery.length, myDirectives.length, myAdministrativeTasks.length, deptTasks.length,
    myEmployees.length, myLetters.length
  ]);

  const primaryDeptNavItems = deptNavItems.slice(0, 6);
  const moreDeptNavItems = deptNavItems.slice(6);
  const isActiveInMore = moreDeptNavItems.some((item) => item.id === activeTab);

  return (
    <div className="w-full text-slate-900 dark:text-slate-100 font-sans dir-rtl" dir="rtl">
      <div className="w-full space-y-5">

        {/* EXECUTIVE WELCOME & DEPARTMENT IDENTITY BANNER */}
        <div className="bg-gradient-to-l from-[#071C43] via-[#0644A3] to-[#0754C7] border border-[#0875E1]/40 rounded-3xl p-5 sm:p-6 shadow-lg relative overflow-hidden text-white">
          <div className="absolute -left-16 -top-16 w-72 h-72 bg-[#4a9df7]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -right-12 -bottom-16 w-56 h-56 bg-[#081426]/40 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-lg shrink-0 border-2 border-white/60">
                <img
                  src="/logo.png"
                  alt="شعار جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-3 py-0.5 rounded-lg text-xs font-black bg-white/15 text-white border border-white/25 backdrop-blur-xs">
                    {currentDept.nameAr}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-[#081426]/45 text-blue-100 border border-white/20">
                    {isDirector
                      ? 'مدير الإدارة - صلاحيات إدارية معتمدة'
                      : effectiveRole === 'storekeeper'
                      ? 'أمين مستودع معتمد'
                      : 'موظف إدارة معتمد'}
                  </span>
                  {currentUser?.jobTitle && (
                    <span className="text-xs text-blue-100 font-bold">
                      • {currentUser.jobTitle}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white/10 text-blue-100 border border-white/15">
                    ترخيص: {homeSettings?.licenseNumber || '1000888600'}
                  </span>
                </div>

                <h2 className="font-lyon text-lg sm:text-2xl font-black text-white leading-snug">
                  معًا… نُحدث أثرًا — مرحباً بك، {currentUser?.name || currentDept.directorName}
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-3xl leading-relaxed">
                  {isWarehouseDept
                    ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة — مساحة إدارة المخزون، الأصناف، العمليات المستودعية، والصرف والجرد والباركود."
                    : isVolunteerDept
                    ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة — إدارة الفرص التطوعية والمبادرات واعتماد المتطوعين والفرق وسجلات الساعات."
                    : isBeneficiaryDept
                    ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة — المنظومة المركزية لإدارة المستفيدين ومطابقة الاستحقاق والتوزيعات الميدانية."
                    : isHRDept
                    ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة — إدارة الموارد البشرية والكوادر والبطاقات التعريفية وطلبات التوظيف."
                    : isFinanceDept
                    ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة — الإدارة المالية وسندات الصرف والقبض والقيود المحاسبية."
                    : isProjectsDept
                    ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة — إدارة البرامج والمشاريع التنموية ونسب الإنجاز والميزانيات."
                    : isMediaDept
                    ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة — المركز الإعلامي والتوثيق الميداني ونشر الأخبار والمعرض."
                    : "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة — لوحة إدارة المهام التشغيلية وتكليفات مجلس الإدارة ومتابعة الإنجاز."}
                </p>
              </div>
            </div>

            {/* Quick Executive Actions */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto shrink-0">
              {onBackToHome && (
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/25 flex items-center gap-1.5 cursor-pointer"
                  title="العودة إلى الموقع العام للجمعية"
                >
                  <Home className="w-4 h-4" />
                  <span>الموقع العام</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsLetterModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white text-[#071C43] hover:bg-blue-50 font-black text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-4 h-4 text-[#0754C7]" />
                <span>إرسال خطاب رسمي</span>
              </button>

              {onRefreshGlobalData && (
                <button
                  type="button"
                  onClick={onRefreshGlobalData}
                  title="تحديث البيانات"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/25 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 4 LIVE GRADIENT SCOPED KPI CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <button
            type="button"
            onClick={() => isPageAllowed('directives') && setActiveTab('directives')}
            className="text-right group bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] hover:border-[#0754C7] rounded-2xl p-4 shadow-xs transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="h-1 w-full bg-gradient-to-l from-[#071C43] to-[#0754C7] absolute top-0 inset-x-0" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-300">تكليفات الإدارة العليا</div>
                <div className="text-2xl font-black text-[#071C43] dark:text-white font-mono tabular-nums mt-1">
                  {myDirectives.length}
                </div>
                <div className="text-[11px] font-bold text-[#0754C7] dark:text-blue-300 mt-0.5">قرار وتكليف مسجل</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#071C43] to-[#0754C7] text-white flex items-center justify-center shadow-sm shrink-0">
                <Send className="w-5 h-5" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => isPageAllowed('tasks') && setActiveTab('tasks')}
            className="text-right group bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] hover:border-teal-600 rounded-2xl p-4 shadow-xs transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="h-1 w-full bg-gradient-to-l from-teal-700 to-emerald-500 absolute top-0 inset-x-0" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-300">المهام التشغيلية</div>
                <div className="text-2xl font-black text-[#071C43] dark:text-white font-mono tabular-nums mt-1">
                  {myAdministrativeTasks.length || deptTasks.length}
                </div>
                <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">مهمة قيد المتابعة</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => isPageAllowed('staff') && setActiveTab('staff')}
            className="text-right group bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] hover:border-indigo-600 rounded-2xl p-4 shadow-xs transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="h-1 w-full bg-gradient-to-l from-indigo-800 to-indigo-500 absolute top-0 inset-x-0" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-300">كوادر الإدارة</div>
                <div className="text-2xl font-black text-[#071C43] dark:text-white font-mono tabular-nums mt-1">
                  {myEmployees.length}
                </div>
                <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">موظف وكادر معتمد</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-800 to-indigo-500 text-white flex items-center justify-center shadow-sm shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => isPageAllowed('letters') && setActiveTab('letters')}
            className="text-right group bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] hover:border-amber-600 rounded-2xl p-4 shadow-xs transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="h-1 w-full bg-gradient-to-l from-amber-600 to-amber-400 absolute top-0 inset-x-0" />
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-500 dark:text-slate-300">الخطابات والمراسلات</div>
                <div className="text-2xl font-black text-[#071C43] dark:text-white font-mono tabular-nums mt-1">
                  {myLetters.length}
                </div>
                <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">خطاب صادر ووارد</div>
              </div>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-600 to-amber-500 text-white flex items-center justify-center shadow-sm shrink-0">
                <Mail className="w-5 h-5" />
              </div>
            </div>
          </button>
        </div>

        {/* HORIZONTAL EXECUTIVE NAVIGATION BAR WITH ICONS + ORGANIZED «المزيد» DROPDOWN */}
        <div
          ref={deptNavBarRef}
          className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-2 shadow-xs relative z-40"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {primaryDeptNavItems.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`dept-nav-${tab.id}`}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsDeptMoreMenuOpen(false);
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#0754C7] text-white shadow-sm'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142d50]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-50 dark:bg-[#142d50] text-[#0754C7] dark:text-blue-300 border border-blue-200/70 dark:border-[#244577]'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {moreDeptNavItems.length > 0 && (
              <div className="relative">
                <button
                  id="dept-nav-more-btn"
                  type="button"
                  onClick={() => setIsDeptMoreMenuOpen((prev) => !prev)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    isActiveInMore || isDeptMoreMenuOpen
                      ? 'bg-[#071C43] text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-[#142d50] text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#1b3a66]'
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4 shrink-0" />
                  <span>المزيد</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isDeptMoreMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDeptMoreMenuOpen && (
                  <div className="dropdown-menu-floating absolute top-full mt-2 right-0 sm:right-auto sm:left-0 min-w-[260px] bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#244577] rounded-2xl p-2 shadow-2xl z-[150] space-y-1">
                    <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 dark:text-blue-200 border-b border-slate-100 dark:border-[#1e3a66] mb-1">
                      أقسام ومهام الإدارة الإضافية
                    </div>
                    {moreDeptNavItems.map((tab) => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          id={`dept-nav-${tab.id}`}
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            setIsDeptMoreMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                            isActive
                              ? 'bg-[#0754C7] text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142d50]'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {tab.icon}
                            <span>{tab.label}</span>
                          </span>
                          {tab.badge !== undefined && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                                isActive
                                  ? 'bg-white/20 text-white'
                                  : 'bg-blue-50 dark:bg-[#142d50] text-[#0754C7] dark:text-blue-300'
                              }`}
                            >
                              {tab.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


        {/* ======================================================== */}
        {/* TAB CONTENT RENDERERS */}
        {/* ======================================================== */}

        <DashboardErrorBoundary 
          pageName={`إدارة ${currentDept?.nameAr || 'الجمعية'} - ${allDepartmentTabs.find(t => t.id === activeTab)?.label || activeTab}`}
          onReset={() => setActiveTab(getDefaultTab())}
        >
        {!isPageAllowed(activeTab) ? (
          <AccessDeniedCard
            pageTitle={allDepartmentTabs.find(t => t.id === activeTab)?.label || activeTab}
            departmentName={currentDept?.nameAr || 'إدارة الجمعية'}
            allowedPages={allowedDepartmentTabs}
            onNavigateToAllowed={(pageId) => setActiveTab(pageId)}
          />
        ) : (
          <>
        {/* 1. WAREHOUSE TAB: FULL INVENTORY MANAGER */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <InventoryManager
              initiatives={initiatives}
              beneficiaries={beneficiaries}
              distributions={distributions}
              distributionHandovers={distributionHandovers}
              onHandoverSubmit={onHandoverSubmit}
              onRefreshGlobalData={onRefreshGlobalData}
              currentUser={currentUser}
              storekeeperMode={effectiveRole === 'storekeeper'}
              onLogout={onLogout}
            />
          </div>
        )}

        {/* 2. VOLUNTEER OPS TAB */}
        {activeTab === 'volunteer_ops' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#071C43] dark:text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-emerald-400" />
                    الفرص والمبادرات التطوعية التابعة لإدارة ({currentDept.nameAr})
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    إدارة وطرح الفرص التطوعية في العسيلة ومكة المكرمة، متابعة المقاعد، والساعات المعتمدة.
                  </p>
                </div>

                {hasPermission('create_data') ? (
                  <button
                    type="button"
                    onClick={() => setShowAddInitiativeModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>طرح فرصة تطوعية جديدة</span>
                  </button>
                ) : (
                  <div className="text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>صلاحية إضافة المبادرات مخصصة لمدير الإدارة</span>
                  </div>
                )}
              </div>

              {/* Initiatives Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {initiatives.map((init) => (
                  <div key={init.id} className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-5 hover:border-emerald-600/50 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {init.category || 'تطوع عام'}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          init.registrationStatus === 'open' 
                            ? 'bg-emerald-500/20 text-emerald-300' 
                            : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {init.registrationStatus === 'open' ? 'التسجيل متاح' : 'مكتمل / مغلق'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#071C43] dark:text-white mb-2 line-clamp-1">{init.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                        {init.description || 'فرصة تطوعية ميدانية لخدمة ضيوف الرحمن وأهالي مكة المكرمة.'}
                      </p>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#142d50] p-3 rounded-xl mb-4">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>الساعات: <strong className="text-[#071C43] dark:text-white font-mono">{init.hours || 4} س</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>المقاعد: <strong className="text-[#071C43] dark:text-white font-mono">{init.requiredVolunteers || 20}</strong></span>
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate">{init.location || 'العسيلة - مكة المكرمة'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-[#1e3a66] flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400 font-mono">{init.startDate || '2026-03-30'}</span>
                      <span className="text-emerald-400 font-bold">
                        المسجلين: {init.acceptedVolunteerIds?.length || 0}
                      </span>
                    </div>
                  </div>
                ))}

                {initiatives.length === 0 && (
                  <div className="col-span-3 text-center py-12 text-slate-500 text-sm">
                    لا توجد فرص تطوعية مسجلة حتى الآن.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2.1 VOLUNTEER TRANSFERS & TERMINATION TAB FOR VOLUNTEER DEPT */}
        {activeTab === 'volunteer_transfers' && (
          <div className="space-y-6">
            <VolunteerTeamTransferManager
              teams={teams}
              volunteers={activeVolunteersList}
              currentUser={currentUser}
              userRole={effectiveRole}
              onRefreshData={onRefreshGlobalData}
            />
          </div>
        )}

        {/* 2.1B VOLUNTEERS ARCHIVE DIRECTORY FOR VOLUNTEER DEPT */}
        {activeTab === 'volunteers_archive' && (
          <ArchivesDirectoryPanel
            mode="volunteers"
            volunteers={volunteers}
            teams={teams}
            onRestore={async (volunteerId) => {
              if (onRestoreVolunteer) return await onRestoreVolunteer(volunteerId);
              return { ok: false, error: 'تعذر استعادة المتطوع' };
            }}
          />
        )}

        {/* BENEFICIARIES & OPERATIONS REAL-TIME STATISTICS TAB (Requirement 1) */}
        {activeTab === 'beneficiary_stats' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1e3a66]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-[#071C43] dark:text-white flex items-center gap-2">
                      <span>إحصائيات المستفيدين والعمليات الميدانية المباشرة</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                        Direct PostgreSQL DB
                      </span>
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      مؤشرات حية ومحدثة لحظياً للحالات الاجتماعية، صفة المستفيد، والعمليات التوزيعية دون أي تكرار
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBenStatsModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-black transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Filter className="w-4 h-4" />
                    <span>فتح لوحة الفلاتر والتقارير المتقدمة</span>
                  </button>
                </div>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                <div className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#244577] rounded-2xl p-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">إجمالي المستفيدين المسجلين</p>
                  <p className="text-2xl font-black text-[#071C43] dark:text-white mt-1 font-mono">{activeBeneficiariesList.length}</p>
                  <p className="text-[10px] text-emerald-400 mt-1">سجل رقمي موحد ومعتمد</p>
                </div>

                <div className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#244577] rounded-2xl p-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">المستفيدون النشطون</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                    {activeBeneficiariesList.filter(b => b.status === 'approved').length}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">معتمدون لاستحقاق المساعدات</p>
                </div>

                <div className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#244577] rounded-2xl p-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">قيد المراجعة والتدقيق</p>
                  <p className="text-2xl font-black text-amber-400 mt-1 font-mono">
                    {activeBeneficiariesList.filter(b => b.status === 'pending').length}
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">بانتظار استكمال الوثائق</p>
                </div>

                <div className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#244577] rounded-2xl p-4">
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">إجمالي عمليات التوزيع</p>
                  <p className="text-2xl font-black text-blue-400 mt-1 font-mono">{distributions.length}</p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                    {distributions.filter(d => (d as any).workflowStatus === 'completed' || d.status === 'completed').length} مكتملة
                  </p>
                </div>
              </div>

              {/* Social Status & Residency Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Social Status Card */}
                <div className="bg-slate-50/70 dark:bg-[#142d50]/80 border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-5">
                  <h3 className="text-sm font-black text-[#071C43] dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>توزيع الحالة الاجتماعية واليتم</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-100 dark:bg-[#142d50] rounded-xl border border-slate-200 dark:border-[#1e3a66] flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">المتزوجون والمتزوجات</span>
                      <span className="font-bold text-[#071C43] dark:text-white font-mono">
                        {activeBeneficiariesList.filter(b => b.maritalStatus === 'متزوج' || b.maritalStatus === 'متزوجة').length}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-[#142d50] rounded-xl border border-slate-200 dark:border-[#1e3a66] flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">العزاب والعازبات</span>
                      <span className="font-bold text-[#071C43] dark:text-white font-mono">
                        {activeBeneficiariesList.filter(b => b.maritalStatus === 'أعزب' || b.maritalStatus === 'عزباء').length}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-[#142d50] rounded-xl border border-slate-200 dark:border-[#1e3a66] flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">الأرامل</span>
                      <span className="font-bold text-[#071C43] dark:text-white font-mono">
                        {activeBeneficiariesList.filter(b => b.maritalStatus === 'أرمل' || b.maritalStatus === 'أرملة').length}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-[#142d50] rounded-xl border border-slate-200 dark:border-[#1e3a66] flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">المطلقون والمطلقات</span>
                      <span className="font-bold text-[#071C43] dark:text-white font-mono">
                        {activeBeneficiariesList.filter(b => b.maritalStatus === 'مطلق' || b.maritalStatus === 'مطلقة').length}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 flex justify-between items-center col-span-2">
                      <span className="text-emerald-300 font-bold">الأيتام واليتيمات (صفة مستقلة)</span>
                      <span className="font-black text-emerald-400 font-mono text-sm">
                        {activeBeneficiariesList.filter(b => b.orphanStatus === 'يتيم' || b.orphanStatus === 'يتيمة').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Residency Status Card */}
                <div className="bg-slate-50/70 dark:bg-[#142d50]/80 border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-5">
                  <h3 className="text-sm font-black text-[#071C43] dark:text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>توزيع صفة المستفيد ونطاق الرعاية</span>
                  </h3>
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-100 dark:bg-[#142d50] rounded-xl border border-slate-200 dark:border-[#1e3a66] flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">المواطنون السعوديون</span>
                      <span className="font-bold text-[#071C43] dark:text-white font-mono">
                        {activeBeneficiariesList.filter(b => b.residencyStatus === 'مواطن سعودي' || (!b.residencyStatus && b.nationalId?.startsWith('1'))).length}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-[#142d50] rounded-xl border border-slate-200 dark:border-[#1e3a66] flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">المقيمون</span>
                      <span className="font-bold text-[#071C43] dark:text-white font-mono">
                        {activeBeneficiariesList.filter(b => b.residencyStatus === 'مقيم' || (!b.residencyStatus && b.nationalId?.startsWith('2'))).length}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-[#142d50] rounded-xl border border-slate-200 dark:border-[#1e3a66] flex justify-between items-center">
                      <span className="text-slate-700 dark:text-slate-300">أبناء وبنات المواطنات السعوديات</span>
                      <span className="font-bold text-[#071C43] dark:text-white font-mono">
                        {activeBeneficiariesList.filter(b => b.residencyStatus === 'ابن أو ابنة مواطنة سعودية' || b.residencyStatus?.includes('مواطنة')).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2.2 PASSWORD RESET REQUESTS TAB FOR EXECUTIVE/OPERATIONS DEPT */}
        {activeTab === 'password_resets' && (
          <div className="space-y-6">
            <PasswordResetRequestsManager
              currentUser={currentUser}
              userRole={effectiveRole}
            />
          </div>
        )}

        {/* 2.3 TEAM & VOLUNTEER TECHNICAL SUPPORT TAB */}
        {activeTab === 'team_support' && (
          <div className="space-y-6">
            <TeamSupportManager
              currentUser={currentUser}
              userRole={effectiveRole}
              teams={teams}
              teamVolunteers={activeVolunteersList}
            />
          </div>
        )}

        {/* 3. VOLUNTEER REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6">
              <h2 className="text-xl font-black text-[#071C43] dark:text-white mb-4 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-emerald-400" />
                طلبات الانضمام والتطوع الواردة ({requests.length})
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#1e3a66]">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-[#142d50] text-[#071C43] dark:text-slate-200 text-xs">
                    <tr>
                      <th className="p-3">اسم المتقدم</th>
                      <th className="p-3">رقم الجوال</th>
                      <th className="p-3">الفرصة / المبادرة</th>
                      <th className="p-3">تاريخ التقديم</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1e3a66] text-slate-800 dark:text-slate-200">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-[#142d50]/60">
                        <td className="p-3 font-bold text-[#071C43] dark:text-white">{req.volunteerName || req.name || 'متطوع'}</td>
                        <td className="p-3 font-mono text-xs">{req.phone || '05XXXXXXXX'}</td>
                        <td className="p-3 text-xs">{req.initiativeTitle || 'مبادرة عامة'}</td>
                        <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{req.date || req.createdAt?.split('T')[0] || '2026-03-23'}</td>
                        <td className="p-3 text-xs">
                          <span className={`px-2 py-0.5 rounded-full ${
                            req.status === 'approved' 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : req.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {req.status === 'approved' ? 'معتمد' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {hasPermission('approve_data') ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onActionRequest && onActionRequest(req.id, 'approved')}
                                className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs cursor-pointer"
                                title="قبول واعتماد"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onActionRequest && onActionRequest(req.id, 'rejected')}
                                className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs cursor-pointer"
                                title="رفض الطلب"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">للمدير فقط</span>
                          )}
                        </td>
                      </tr>
                    ))}

                    {requests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                          لا توجد طلبات انضمام جديدة قيد المراجعة حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. BENEFICIARIES MASTER DASHBOARD TAB */}
        {activeTab === 'beneficiaries' && (
          <BeneficiariesMasterDashboard
            beneficiaries={beneficiaries}
            distributions={distributions}
            handoverRecords={distributionHandovers}
            inventoryItems={inventoryItems}
            notifications={notifications}
            homeSettings={homeSettings}
            currentUser={{
              id: currentDept.id,
              name: currentUser?.name || currentDept.directorName,
              role: effectiveRole,
              departmentId: currentDept.id
            }}
            onCreateDistribution={onCreateDistribution}
            onUpdateDistribution={onUpdateDistribution}
            onDeleteDistribution={onDeleteDistribution}
            onHandoverSubmit={onHandoverSubmit}
            onCancelHandover={onCancelHandover}
            onUpdateBeneficiaryStatus={onUpdateBeneficiaryStatus}
            onAddBeneficiary={onAddBeneficiary}
            onArchiveOrDeleteBeneficiary={onArchiveOrDeleteBeneficiary}
            onRestoreBeneficiary={onRestoreBeneficiary}
            onRefreshGlobalData={onRefreshGlobalData}
            lang="ar"
          />
        )}

        {/* 5. HR STAFF & RECRUITMENT TAB */}
        {activeTab === 'hr_staff' && (
          <div className="space-y-6">
            {isHRDept ? (
              <HRDashboard
                departments={departments || []}
                employees={employees || []}
                employeeRequests={employeeRequests || []}
                onApproveRequest={onApproveEmployeeRequest ? async (id) => onApproveEmployeeRequest(id) : undefined}
                onRejectRequest={onRejectEmployeeRequest ? async (id) => onRejectEmployeeRequest(id) : undefined}
                currentUser={currentUser}
                onRefreshGlobalData={onRefreshGlobalData}
              />
            ) : (
              <DepartmentStaffManager
                currentDepartment={currentDept}
                employees={employees}
                employeeRequests={employeeRequests}
                onSubmitRequest={onSubmitEmployeeRequest || (async () => false)}
                onUpdateRequest={onUpdateEmployeeRequest || (async () => false)}
              />
            )}
          </div>
        )}

        {/* 6. FINANCE LEDGER & EXPENSES TAB */}
        {activeTab === 'finance_ledger' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#071C43] dark:text-white flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                    المعاملات المالية وسندات الصرف والقبض
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    إدارة القيود المالية وسندات الصرف المعتمدة والتبرعات الواردة للجمعية.
                  </p>
                </div>

                {hasPermission('disburse_data') ? (
                  <button
                    type="button"
                    onClick={() => setShowAddExpenseModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إصدار سند صرف مالي</span>
                  </button>
                ) : (
                  <div className="text-xs text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>صلاحية سندات الصرف للمدير المالي المعتمد</span>
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#1e3a66]">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-[#142d50] text-[#071C43] dark:text-slate-200 text-xs">
                    <tr>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">البيان / الوصف</th>
                      <th className="p-3">البند المالي</th>
                      <th className="p-3">المستفيد / الجهة</th>
                      <th className="p-3">المبلغ (ر.س)</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1e3a66] text-slate-800 dark:text-slate-200">
                    {financialTransactions.map((tx: any, idx: number) => (
                      <tr key={tx.id || idx} className="hover:bg-slate-50 dark:hover:bg-[#142d50]/60">
                        <td className="p-3 font-mono text-xs text-emerald-400">{tx.voucherNumber || tx.id || `VCH-${1000 + idx}`}</td>
                        <td className="p-3 font-bold text-[#071C43] dark:text-white">{tx.title || tx.description || 'سند صرف تشغيلي'}</td>
                        <td className="p-3 text-xs text-slate-600 dark:text-slate-400">{tx.category || 'تشغيلي'}</td>
                        <td className="p-3 text-xs">{tx.recipient || currentDept.nameAr}</td>
                        <td className="p-3 font-mono text-emerald-300 font-bold">{Number(tx.amount || 0).toLocaleString()} ر.س</td>
                        <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{tx.date || '2026-03-23'}</td>
                        <td className="p-3 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                            معتمد
                          </span>
                        </td>
                      </tr>
                    ))}

                    {financialTransactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                          لا توجد سندات صرف مسجلة حالياً في هذا القسم.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 7. PROJECTS & PROGRAMS TAB */}
        {activeTab === 'projects_list' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#071C43] dark:text-white flex items-center gap-2">
                    <FolderKanban className="w-6 h-6 text-emerald-400" />
                    المشاريع التنموية والبرامج المعتمدة ({storeProjects.length})
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    إدارة المشاريع التنموية، نسب الإنجاز الميداني، وميزانيات المبادرات.
                  </p>
                </div>

                {hasPermission('create_data') && (
                  <button
                    type="button"
                    onClick={() => setShowAddProjectModal(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إدراج مشروع تنموي جديد</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {storeProjects.map((proj: any, idx: number) => (
                  <div key={proj.id || idx} className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-5 hover:border-emerald-600/40 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {proj.category || 'تنموي'}
                        </span>
                        <span className="text-xs text-emerald-400 font-mono font-bold">
                          {Number(proj.budget || 50000).toLocaleString()} ر.س
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#071C43] dark:text-white mb-2">{proj.title || 'مشروع تنموي'}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                        {proj.description || 'مشروع تنموي مستدام لخدمة أسر وأهالي مكة المكرمة.'}
                      </p>

                      <div className="space-y-1.5 mb-4">
                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span>نسبة الإنجاز:</span>
                          <span className="font-mono text-emerald-300 font-bold">{proj.progressPercent || 35}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full" 
                            style={{ width: `${proj.progressPercent || 35}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-[#1e3a66] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>المستفيدين: {proj.targetBeneficiaries || 200}</span>
                      <span className="text-emerald-400">قيد التنفيذ</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8. MEDIA & PR TAB */}
        {activeTab === 'media_news' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#071C43] dark:text-white flex items-center gap-2">
                    <Newspaper className="w-6 h-6 text-emerald-400" />
                    المركز الإعلامي والبيانات الصحفية ({news.length})
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    إدارة ونشر الأخبار، وتوثيق إنجازات الجمعية والمشاريع الميدانية.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {news.map((item: any, idx: number) => (
                  <div key={item.id || idx} className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#1e3a66] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-emerald-600/40 transition-all">
                    {item.imageUrl && (
                      <div className="h-40 bg-slate-900 overflow-hidden">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                        {item.category || 'خبر صحفي'}
                      </span>
                      <h4 className="font-bold text-[#071C43] dark:text-white text-sm mt-2 mb-1 line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.content || item.summary || 'تغطية إعلامية لأنشطة وبرامج الجمعية.'}
                      </p>
                    </div>

                    <div className="p-4 pt-0 border-t border-slate-200 dark:border-[#1e3a66]/80 flex items-center justify-between text-xs text-slate-500">
                      <span>{item.date || '2026-03-23'}</span>
                      {hasPermission('delete_data') && onDeleteNewsItem && (
                        <button
                          type="button"
                          onClick={() => onDeleteNewsItem(item.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 8.1 MEDIA GALLERY MANAGEMENT TAB (خاص بإدارة الإعلام) */}
        {activeTab === 'media_gallery' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#071C43] dark:text-white flex items-center gap-2">
                    <Image className="w-6 h-6 text-emerald-400" />
                    معرض الصور والمواد الإعلامية والتوثيق ({gallery.length})
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    إدارة وأرشفة الصور ومقاطع الفيديو، وتحديد المواد الإعلامية المميزة التي تظهر في قالب الصفحة الرئيسية للموقع.
                  </p>
                </div>

                {hasPermission('create_data') && (
                  <button
                    type="button"
                    onClick={() => handleOpenAddGallery()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مادة إعلامية جديدة</span>
                  </button>
                )}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-slate-50 dark:bg-[#142d50] p-3.5 rounded-2xl border border-slate-200 dark:border-[#1e3a66]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">إجمالي المواد</span>
                  <span className="text-xl font-black text-[#071C43] dark:text-white font-mono">{gallery.length}</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#142d50] p-3.5 rounded-2xl border border-slate-200 dark:border-[#1e3a66]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">الصور الميدانية</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    {gallery.filter((g: any) => g.type === 'photo').length}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-[#142d50] p-3.5 rounded-2xl border border-slate-200 dark:border-[#1e3a66]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">المقاطع المرئية</span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    {gallery.filter((g: any) => g.type === 'video').length}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-[#142d50] p-3.5 rounded-2xl border border-slate-200 dark:border-[#1e3a66]">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 block mb-1">مميز في الصفحة الرئيسية</span>
                  <span className="text-xl font-black text-teal-400 font-mono">
                    {gallery.filter((g: any) => (g as any).isFeatured !== false).length}
                  </span>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                {gallery.map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#1e3a66] rounded-2xl overflow-hidden flex flex-col justify-between hover:border-emerald-600/40 transition-all group"
                  >
                    <div className="relative h-44 bg-slate-900 overflow-hidden">
                      {item.type === 'photo' ? (
                        <img src={item.url} alt={item.titleAr} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full relative">
                          <video src={item.url} className="w-full h-full object-cover" muted />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      )}

                      <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                          {item.type === 'video' ? 'فيديو' : 'صورة'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                          {item.category || 'مبادرات'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{item.date}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleGalleryFeatured(item)}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                            item.isFeatured !== false
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
                          }`}
                          title="تثبيت أو إلغاء التثبيت في قالب الصفحة الرئيسية"
                        >
                          <Star className={`w-3 h-3 ${item.isFeatured !== false ? 'fill-current text-amber-400' : ''}`} />
                          <span>{item.isFeatured !== false ? 'معروض بالرئيسية' : 'تثبيت بالرئيسية'}</span>
                        </button>
                      </div>

                      <h4 className="font-bold text-[#071C43] dark:text-white text-xs sm:text-sm line-clamp-2 leading-snug">
                        {item.titleAr}
                      </h4>
                      {item.descriptionAr && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{item.descriptionAr}</p>
                      )}
                    </div>

                    <div className="p-3 pt-0 border-t border-slate-200 dark:border-[#1e3a66]/80 flex items-center justify-between gap-2 text-xs">
                      {hasPermission('edit_data') && (
                        <button
                          type="button"
                          onClick={() => handleOpenAddGallery(item)}
                          className="text-emerald-400 hover:text-emerald-300 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                      )}
                      {hasPermission('delete_data') && (
                        <button
                          type="button"
                          onClick={() => handleDeleteGallery(item.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal for Adding / Editing Media Item */}
            {showAddGalleryModal && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e3a66] pb-3">
                    <h3 className="text-base font-bold text-[#071C43] dark:text-white flex items-center gap-2">
                      <Image className="w-5 h-5 text-emerald-400" />
                      <span>{editingGalleryItem ? 'تعديل مادة إعلامية بالمعرض' : 'إضافة مادة إعلامية جديدة'}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddGalleryModal(false)}
                      className="text-slate-600 dark:text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveGalleryItem} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان المادة الإعلامية (بالعربية) *</label>
                      <input
                        type="text"
                        required
                        value={galleryFormData.titleAr}
                        onChange={(e) => setGalleryFormData({ ...galleryFormData, titleAr: e.target.value })}
                        placeholder="مثال: توثيق مبادرة إفطار المعتمرين 1448"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نوع المادة *</label>
                        <select
                          value={galleryFormData.type}
                          onChange={(e) => setGalleryFormData({ ...galleryFormData, type: e.target.value as any })}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="photo">صورة فوتوغرافية</option>
                          <option value="video">مقطع مرئي (فيديو)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التصنيف *</label>
                        <select
                          value={galleryFormData.category}
                          onChange={(e) => setGalleryFormData({ ...galleryFormData, category: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                        >
                          <option value="مبادرات">مبادرات ميدانية</option>
                          <option value="مشاريع">مشاريع وبرامج</option>
                          <option value="فعاليات">فعاليات وأنشطة</option>
                          <option value="إعلام">تغطيات وبيانات صحفية</option>
                          <option value="أخرى">أخرى</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رابط أو ملف المادة الإعلامية *</label>
                      <input
                        type="text"
                        required
                        value={galleryFormData.url}
                        onChange={(e) => setGalleryFormData({ ...galleryFormData, url: e.target.value })}
                        placeholder="أدخل رابط الصورة/الفيديو أو ارفع ملف من جهازك"
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none font-mono"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5" />
                          <span>رفع ملف من الجهاز</span>
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleGalleryFileChange}
                            className="hidden"
                          />
                        </label>
                        {galleryFormData.url && (
                          <span className="text-[10px] text-emerald-400 font-bold">✓ تم إرفاق الملف</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ المادة الإعلامية</label>
                      <input
                        type="date"
                        value={galleryFormData.date}
                        onChange={(e) => setGalleryFormData({ ...galleryFormData, date: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">وصف أو تفاصيل إضافية</label>
                      <textarea
                        rows={2}
                        value={galleryFormData.descriptionAr}
                        onChange={(e) => setGalleryFormData({ ...galleryFormData, descriptionAr: e.target.value })}
                        placeholder="نبذة موجزة عن المادة الإعلامية وسياقها الميداني..."
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-[#142d50] rounded-xl border border-slate-200 dark:border-[#1e3a66]">
                      <input
                        type="checkbox"
                        id="checkFeatured"
                        checked={galleryFormData.isFeatured}
                        onChange={(e) => setGalleryFormData({ ...galleryFormData, isFeatured: e.target.checked })}
                        className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="checkFeatured" className="text-xs font-bold text-slate-200 cursor-pointer select-none">
                        تثبيت كعنصر مميز في قالب الصفحة الرئيسية للموقع
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#1e3a66]">
                      <button
                        type="button"
                        onClick={() => setShowAddGalleryModal(false)}
                        className="px-4 py-2 bg-slate-100 dark:bg-[#142d50] hover:bg-slate-200 dark:hover:bg-[#1b3a66] text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-700 cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                      >
                        {editingGalleryItem ? 'حفظ التعديلات' : 'إضافة للمعرض'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 9. DIRECTIVES TAB */}
        {activeTab === 'directives' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-2xl p-5">
              <div>
                <h2 className="text-lg font-bold text-[#071C43] dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  تكليفات وإرشادات مجلس الإدارة الموجهة لإدارة ({currentDept.nameAr})
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  يتلقى مدير الإدارة التكليفات العاجلة والخطط التشغيلية الرسمية، ويمكنه رفع تقارير الإنجاز مباشرة.
                </p>
              </div>
            </div>

            {myDirectives.length === 0 ? (
              <div className="text-center py-12 bg-slate-100 dark:bg-[#142d50] rounded-3xl border border-slate-200 dark:border-[#1e3a66] p-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#071C43] dark:text-white">لا توجد تكليفات جديدة حالياً من مجلس الإدارة</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                  سيظهر هنا كل تكليف رسمي جديد يتم إرساله من الإدارة التنفيذية ومجلس الإدارة لمتابعة تنفيذه.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myDirectives.map((dir) => (
                  <div 
                    key={dir.id}
                    className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-2xl p-5 hover:border-emerald-600/60 transition-all shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          dir.priority === 'urgent' 
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                            : dir.priority === 'high' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {dir.priority === 'urgent' ? '🔴 أولوية عاجلة جداً' : dir.priority === 'high' ? '🟠 أولوية هامة' : '🟢 أولوية عادية'}
                        </span>

                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          dir.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : dir.status === 'in_progress'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : dir.status === 'needs_review'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-stone-500/20 text-stone-300 border border-stone-500/40'
                        }`}>
                          {dir.status === 'completed' ? '✓ تم الإنجاز' : dir.status === 'in_progress' ? '⚙️ قيد التنفيذ' : dir.status === 'needs_review' ? '⚠️ تحت المراجعة' : '⏳ معلق لم يبدأ'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#071C43] dark:text-white mb-2">{dir.title}</h3>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4 bg-slate-50 dark:bg-[#142d50]/70 p-3 rounded-xl border border-slate-200 dark:border-[#1e3a66]">
                        {dir.description}
                      </p>

                      {dir.completionNotes && (
                        <div className="mb-4 bg-teal-950/60 border border-teal-800/60 rounded-xl p-3 text-xs text-teal-200">
                          <div className="font-bold text-teal-300 mb-1 flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            تقرير وملاحظات الإنجاز المرفوعة لمجلس الإدارة:
                          </div>
                          {dir.completionNotes}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-[#1e3a66]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          تاريخ التسليم: <span className="font-mono text-emerald-300">{dir.dueDate}</span>
                        </span>
                        <span>الجهة الصادرة: <span className="text-[#071C43] dark:text-white font-semibold">{dir.createdBy}</span></span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenReportModal(dir)}
                      className="mt-4 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      تحديث حالة التكليف ورفع تقرير لمجلس الإدارة
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 10. TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {deptActionNotice && (
              <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center justify-between">
                <span>{deptActionNotice}</span>
                <button type="button" onClick={() => setDeptActionNotice(null)} className="text-emerald-300 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            )}
            {deptActionError && (
              <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-700 text-rose-200 text-xs font-bold flex items-center justify-between">
                <span>{deptActionError}</span>
                <button type="button" onClick={() => setDeptActionError(null)} className="text-rose-300 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Relational Administrative Tasks Section */}
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#071C43] dark:text-white flex items-center gap-2">
                    <CheckSquare className="w-6 h-6 text-emerald-400" />
                    المهام والتكليفات المعتمدة لـ ({currentDept.nameAr})
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-xs mt-1">
                    تتبع المهام الفردية والتكليفات التشغيلية وتحديث حالة التنفيذ مباشرة.
                  </p>
                </div>
                {hasPermission('manage_tasks') && (
                  <button
                    type="button"
                    onClick={() => setShowTasksModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إدارة وتوزيع المهام</span>
                  </button>
                )}
              </div>

              {myAdministrativeTasks.length > 0 ? (
                <div className="space-y-3">
                  {myAdministrativeTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#1e3a66] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-[#071C43] dark:text-white">{t.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : t.status === 'in_progress'
                              ? 'bg-blue-500/20 text-blue-300'
                              : t.status === 'archived'
                              ? 'bg-slate-700 text-slate-700 dark:text-slate-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {t.status === 'completed' ? 'مكتملة' : t.status === 'in_progress' ? 'قيد التنفيذ' : t.status === 'archived' ? 'مؤرشفة' : 'قيد الانتظار'}
                          </span>
                        </div>
                        {t.description && <p className="text-xs text-slate-600 dark:text-slate-400">{t.description}</p>}
                        {t.assigneeName && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400">
                            المكلف: <span className="text-emerald-300 font-bold">{t.assigneeName}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(['pending', 'in_progress', 'completed'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={updatingTaskId === t.id || t.status === st}
                            onClick={() => handleUpdateAdminTaskStatus(t.id, st)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-40 ${
                              t.status === st
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-[#142d50] hover:bg-slate-200 dark:hover:bg-[#1b3a66] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#244577]'
                            }`}
                          >
                            {st === 'pending' ? 'انتظار' : st === 'in_progress' ? 'تنفيذ' : 'إنجاز'}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-[#142d50]/70 p-4 rounded-2xl border border-slate-200 dark:border-[#1e3a66]">
                  لا توجد مهام مسجلة حالياً ضمن التكليفات المتابعة لهذه الإدارة.
                </p>
              )}

              {deptTasks.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-[#1e3a66] space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">المهام التشغيلية العامة للإدارة:</div>
                  {deptTasks.map((task, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#1e3a66] rounded-xl p-3.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-300 font-mono text-xs font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-slate-200 text-xs font-medium leading-relaxed">{task}</p>
                      </div>
                      {hasPermission('manage_tasks') && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTask(idx)}
                          className="text-rose-400 hover:text-rose-300 text-xs px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-900/60 cursor-pointer"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {hasPermission('manage_tasks') && (
                <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    placeholder="إضافة بند تشغيلي سريع للإدارة..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سريعة</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* 11. LETTERS TAB */}
        {activeTab === 'letters' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-black text-[#071C43] dark:text-white flex items-center gap-2">
                    <Mail className="w-6 h-6 text-emerald-400" />
                    الخطابات والمراسلات الرسمية الخاصة بإدارة ({currentDept.nameAr})
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    أرشيف الخطابات الواردة والصادرة، والردود الإدارية الموثقة.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLetterModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>إرسال خطاب جديد</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#1e3a66]">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 dark:bg-[#142d50] text-[#071C43] dark:text-slate-200 text-xs">
                    <tr>
                      <th className="p-3">رقم الخطاب</th>
                      <th className="p-3">موضوع الخطاب</th>
                      <th className="p-3">المرسل / الجهة</th>
                      <th className="p-3">المستلم / الإدارة</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1e3a66] text-slate-800 dark:text-slate-200">
                    {myLetters.map((letter) => (
                      <tr key={letter.id} className="hover:bg-slate-50 dark:hover:bg-[#142d50]/60">
                        <td className="p-3 font-mono text-xs text-emerald-400">{letter.referenceNumber || letter.id}</td>
                        <td className="p-3 font-bold text-[#071C43] dark:text-white">{letter.subject || letter.title}</td>
                        <td className="p-3 text-xs">{letter.senderName || 'المرسل'}</td>
                        <td className="p-3 text-xs text-slate-600 dark:text-slate-400">{letter.departmentName || currentDept.nameAr}</td>
                        <td className="p-3 font-mono text-xs text-slate-600 dark:text-slate-400">{letter.createdAt?.split('T')[0] || '2026-03-23'}</td>
                        <td className="p-3 text-xs">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px]">
                            {letter.status || 'مسجل'}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {myLetters.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                          لا توجد مراسلات أو خطابات مؤرشفة لهذه الإدارة حالياً.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 12. STAFF & RECRUITMENT TAB (COMMON) */}
        {activeTab === 'staff' && (
          <div className="space-y-4">
            {hasPermission('manage_staff') && (
              <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-[#071C43] dark:text-white">إضافة وتعيين موظفي الإدارة ({currentDept.nameAr})</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">إسناد موظف جديد أو حالي مع تحديد صلاحياته ضمن نطاق صلاحياتك المعتمدة.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStaffModal(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة موظف للإدارة</span>
                </button>
              </div>
            )}
            <DepartmentStaffManager
              currentDepartment={currentDept}
              employees={employees}
              employeeRequests={employeeRequests}
              onSubmitRequest={onSubmitEmployeeRequest || (async () => false)}
              onUpdateRequest={onUpdateEmployeeRequest || (async () => false)}
            />
          </div>
        )}

        {/* 13. CREDENTIALS TAB */}
        {activeTab === 'credentials' && (
          <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-[#071C43] dark:text-white flex items-center gap-2">
              <Key className="w-6 h-6 text-emerald-400" />
              بيانات الدخول والاعتماد الإداري
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-200 dark:border-[#1e3a66] pb-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-[#071C43] dark:text-white">بيانات الدخول لحساب ({currentUser?.name || currentDept.directorName})</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">تتيح لك الدخول المباشر إلى لوحة إدارة ({currentDept.nameAr})</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center bg-white dark:bg-[#0e213d] p-3 rounded-xl border border-slate-200 dark:border-[#1e3a66]">
                    <span className="text-slate-600 dark:text-slate-400">رقم الهوية الإدارية:</span>
                    <span className="font-mono text-emerald-400 font-bold">{currentUser?.nationalId || currentDept.nationalId || '—'}</span>
                  </div>

                  <div className="flex justify-between items-center bg-white dark:bg-[#0e213d] p-3 rounded-xl border border-slate-200 dark:border-[#1e3a66]">
                    <span className="text-slate-600 dark:text-slate-400">كلمة المرور:</span>
                    <span className="font-mono text-emerald-400 font-bold">•••••••••• (مشفرة ومحمية بالكامل)</span>
                  </div>

                  <div className="flex justify-between items-center bg-white dark:bg-[#0e213d] p-3 rounded-xl border border-slate-200 dark:border-[#1e3a66]">
                    <span className="text-slate-600 dark:text-slate-400">البريد الإلكتروني:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{currentUser?.email || currentDept.email || 'dept@riadataleata.org.sa'}</span>
                  </div>

                  <div className="flex justify-between items-center bg-white dark:bg-[#0e213d] p-3 rounded-xl border border-slate-200 dark:border-[#1e3a66]">
                    <span className="text-slate-600 dark:text-slate-400">رقم الجوال:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{currentUser?.phone || currentDept.phone || '0550000000'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-[#142d50] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-[#071C43] dark:text-white mb-2 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    تعليمات صلاحيات الإدارات والكوادر
                  </h3>
                  <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed space-y-2">
                    1. يملك مدير الإدارة كامل الصلاحيات لإدارته ووظائفها التشغيلية والتقارير.<br/>
                    2. يملك موظفو الإدارة صلاحيات تشغيلية محددة يتم ضبطها من مصفوفة الصلاحيات.<br/>
                    3. تسجل جميع عمليات الصرف والاستلام والتعديل تلقائياً في الأرشيف الرقابي.<br/>
                    4. الحساب الإداري الرئيسي يملك الصلاحية والإشراف الكامل على كافة الإدارات.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1e3a66] text-xs text-emerald-400/80 font-mono text-center">
                  جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - مكة المكرمة
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 14. SCOPED DEPARTMENT USERS MANAGEMENT TAB */}
        {activeTab === 'dept_users' && canManageDepartmentUsers && (
          <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] shadow-xs rounded-3xl p-4 sm:p-6">
            <UsersManager
              currentUser={currentUser}
              currentUserRole={effectiveRole}
              departments={departments}
              onRefreshDatabase={async () => {
                if (onRefreshGlobalData) await onRefreshGlobalData();
              }}
            />
          </div>
        )}

        {/* Fallback for unmapped tabs */}
        {![
          'inventory', 'volunteer_ops', 'volunteer_transfers', 'volunteers_archive',
          'team_support', 'beneficiary_stats', 'password_resets', 'requests',
          'beneficiaries', 'hr_staff', 'dept_users', 'finance_ledger', 'projects_list',
          'media_news', 'media_gallery', 'directives', 'tasks', 'staff', 'letters', 'credentials'
        ].includes(activeTab) && (
          <AccessDeniedCard
            pageTitle={activeTab}
            departmentName={currentDept.nameAr}
            allowedPages={allowedDepartmentTabs}
            onNavigateToAllowed={(pageId) => setActiveTab(pageId)}
          />
        )}
          </>
        )}
        </DashboardErrorBoundary>

      </div>

      {/* REPORT TO BOARD MODAL */}
      {selectedDirective && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-white dark:bg-[#0e213d] border border-[#0754C7] dark:border-[#244577]/80 rounded-3xl max-w-lg w-full p-6 space-y-4 text-right shadow-2xl">
            <h3 className="text-xl font-bold text-[#071C43] dark:text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" />
              رفع تقرير إنجاز التكليف لمجلس الإدارة
            </h3>

            <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#142d50] p-3 rounded-xl border border-slate-200 dark:border-[#1e3a66]">
              التكليف: <span className="text-[#071C43] dark:text-white font-bold">{selectedDirective.title}</span>
            </p>

            <form onSubmit={handleSaveReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  حالة التنفيذ الحالية:
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white text-sm focus:outline-none focus:border-emerald-400"
                >
                  <option value="in_progress">⚙️ قيد التنفيذ والمتابعة</option>
                  <option value="completed">✓ تم الإنجاز بالكامل</option>
                  <option value="needs_review">⚠️ يحتاج مراجعة أو دعم من المجلس</option>
                  <option value="pending">⏳ معلق</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  تقرير وملاحظات التنفيذ المرفوعة لمجلس الإدارة:
                </label>
                <textarea
                  rows={4}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="اكتب هنا تفاصيل ونتائج تنفيذ المهمة، التحديات، والإنجاز المحقق..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedDirective(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#142d50] hover:bg-slate-200 dark:hover:bg-[#1b3a66] text-slate-700 dark:text-slate-300 text-sm cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  إرسال التقرير للمجلس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE INITIATIVE MODAL (VOLUNTEER DEPT) */}
      {showAddInitiativeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-white dark:bg-[#0e213d] border border-[#0754C7] dark:border-[#244577] rounded-3xl max-w-lg w-full p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e3a66] pb-3">
              <h3 className="text-lg font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                طرح فرصة تطوعية جديدة
              </h3>
              <button 
                onClick={() => setShowAddInitiativeModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInitiativeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">عنوان الفرصة التطوعية:</label>
                <input
                  type="text"
                  required
                  value={newInitData.title}
                  onChange={e => setNewInitData({ ...newInitData, title: e.target.value })}
                  placeholder="مثال: إكرام ضيوف الرحمن بمكة المكرمة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">المجال / التصنيف:</label>
                  <select
                    value={newInitData.category}
                    onChange={e => setNewInitData({ ...newInitData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                  >
                    <option value="إنساني">إنساني</option>
                    <option value="ديني وخدمة معتمرين">ديني وخدمة معتمرين</option>
                    <option value="صحي">صحي</option>
                    <option value="تنظيمي وميداني">تنظيمي وميداني</option>
                    <option value="تعليمي وتدريبي">تعليمي وتدريبي</option>
                    <option value="بيئي">بيئي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الموقع الميداني:</label>
                  <input
                    type="text"
                    value={newInitData.location}
                    onChange={e => setNewInitData({ ...newInitData, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الساعات المعتمدة:</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={newInitData.hours}
                    onChange={e => setNewInitData({ ...newInitData, hours: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">المقاعد المطلوبة:</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newInitData.requiredVolunteers}
                    onChange={e => setNewInitData({ ...newInitData, requiredVolunteers: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">وصف الفرصة والشروط:</label>
                <textarea
                  rows={3}
                  value={newInitData.description}
                  onChange={e => setNewInitData({ ...newInitData, description: e.target.value })}
                  placeholder="وصف المهام التطوعية، الشروط، وأوقات الحضور..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddInitiativeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#142d50] hover:bg-slate-200 dark:hover:bg-[#1b3a66] text-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  طرح الفرصة فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE EXPENSE VOUCHER MODAL (FINANCE DEPT) */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-white dark:bg-[#0e213d] border border-[#0754C7] dark:border-[#244577] rounded-3xl max-w-lg w-full p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e3a66] pb-3">
              <h3 className="text-lg font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                إصدار سند صرف مالي جديد
              </h3>
              <button 
                onClick={() => setShowAddExpenseModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">البيان / الوصف:</label>
                <input
                  type="text"
                  required
                  value={newExpenseData.title}
                  onChange={e => setNewExpenseData({ ...newExpenseData, title: e.target.value })}
                  placeholder="مثال: تكاليف مستلزمات توزيع السلال الغذائية بالعسيلة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">المبلغ (ر.س):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newExpenseData.amount}
                    onChange={e => setNewExpenseData({ ...newExpenseData, amount: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">البند المالي:</label>
                  <select
                    value={newExpenseData.category}
                    onChange={e => setNewExpenseData({ ...newExpenseData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                  >
                    <option value="تشغيلي">تشغيلي</option>
                    <option value="برامج ومشاريع">برامج ومشاريع</option>
                    <option value="مساعدات عينية">مساعدات عينية</option>
                    <option value="رواتب وكوادر">رواتب وكوادر</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">المستفيد / الجهة الصادر لها:</label>
                <input
                  type="text"
                  value={newExpenseData.recipient}
                  onChange={e => setNewExpenseData({ ...newExpenseData, recipient: e.target.value })}
                  placeholder="اسم الشخص أو المورد أو المؤسسة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#142d50] hover:bg-slate-200 dark:hover:bg-[#1b3a66] text-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  اعتماد وحفظ السند
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PROJECT MODAL (PROJECTS DEPT) */}
      {showAddProjectModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 dir-rtl">
          <div className="bg-white dark:bg-[#0e213d] border border-[#0754C7] dark:border-[#244577] rounded-3xl max-w-lg w-full p-6 space-y-4 text-right shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1e3a66] pb-3">
              <h3 className="text-lg font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-emerald-400" />
                إدراج مشروع تنموي جديد
              </h3>
              <button 
                onClick={() => setShowAddProjectModal(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProjectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">اسم المشروع:</label>
                <input
                  type="text"
                  required
                  value={newProjectData.title}
                  onChange={e => setNewProjectData({ ...newProjectData, title: e.target.value })}
                  placeholder="مثال: مشروع كسوة الشتاء ورعاية الأيتام بالعسيلة"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الميزانية المقدرة (ر.س):</label>
                  <input
                    type="number"
                    value={newProjectData.budget}
                    onChange={e => setNewProjectData({ ...newProjectData, budget: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">عدد المستفيدين المستهدف:</label>
                  <input
                    type="number"
                    value={newProjectData.targetBeneficiaries}
                    onChange={e => setNewProjectData({ ...newProjectData, targetBeneficiaries: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">الوصف والأهداف:</label>
                <textarea
                  rows={3}
                  value={newProjectData.description}
                  onChange={e => setNewProjectData({ ...newProjectData, description: e.target.value })}
                  placeholder="أهداف ومخرجات المشروع..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-300 dark:border-[#244577] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProjectModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#142d50] hover:bg-slate-200 dark:hover:bg-[#1b3a66] text-slate-700 dark:text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  إدراج المشروع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL SEND LETTER MODAL FOR DEPARTMENT / EMPLOYEE */}
      <SendLetterModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        defaultSenderType={isDirector ? "مدير إدارة" : "موظف"}
        currentUser={{
          id: currentUser?.id || currentDept.id,
          name: currentUser?.name || currentDept.directorName,
          role: effectiveRole,
          phone: currentUser?.phone || currentDept.phone,
          email: currentUser?.email || currentDept.email,
          departmentId: currentDept.id,
          departmentName: currentDept.nameAr,
          jobTitle: currentUser?.jobTitle || `مدير ${currentDept.nameAr}`
        }}
        onSubmitLetter={async (letterData) => {
          if (onSubmitOfficialLetter) {
            return await onSubmitOfficialLetter(letterData);
          }
          return { success: false, message: "تعذر إرسال الخطاب" };
        }}
      />

      {/* BENEFICIARIES REAL-TIME STATISTICS MODAL FOR OPERATIONS MANAGER (Requirement 1) */}
      {isBenStatsModalOpen && (
        <BeneficiariesStatisticsModal
          isOpen={isBenStatsModalOpen}
          onClose={() => setIsBenStatsModalOpen(false)}
          beneficiaries={activeBeneficiariesList}
          distributions={distributions}
          handoverRecords={distributionHandovers}
          currentUser={currentUser}
          lang="ar"
        />
      )}

      {/* DEPARTMENT STAFF MANAGEMENT MODAL */}
      {showStaffModal && (
        <DepartmentStaffModal
          department={currentDept}
          employees={employees}
          currentUser={currentUser}
          onClose={() => setShowStaffModal(false)}
          onSuccess={(updatedDb, msg) => {
            if (msg) setDeptActionNotice(msg);
            onRefreshGlobalData?.(updatedDb);
          }}
        />
      )}

      {/* DEPARTMENT ADMINISTRATIVE TASKS MODAL */}
      {showTasksModal && (
        <DepartmentTasksModal
          department={currentDept}
          employees={employees}
          administrativeTasks={administrativeTasks}
          onClose={() => setShowTasksModal(false)}
          onSuccess={(updatedDb, msg) => {
            if (msg) setDeptActionNotice(msg);
            onRefreshGlobalData?.(updatedDb);
          }}
        />
      )}

    </div>
  );
};
