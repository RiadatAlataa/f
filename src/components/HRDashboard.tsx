import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  Briefcase,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  Award,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Building2,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  Eye,
  FileCheck,
  Edit,
  Trash2,
  FilePlus,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Bell,
  Check,
  FolderOpen,
  ClipboardList,
  Sparkles,
  BarChart3,
  Bookmark,
  Share2,
  Layers,
  Sliders,
  History,
  Send,
  Lock,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  Department,
  Employee,
  EmployeeRequest,
  HRLeaveRequest,
  HRAttendanceRecord,
  HRDecision
} from '../types';
import { OfficialLetterheadTemplate } from './OfficialLetterheadTemplate';

export interface HRDashboardProps {
  departments: Department[];
  employees: Employee[];
  employeeRequests: EmployeeRequest[];
  onApproveRequest?: (requestId: string, reviewerName: string, notes?: string) => Promise<boolean>;
  onRejectRequest?: (requestId: string, reviewerName: string, rejectionReason: string) => Promise<boolean>;
  onSaveEmployee?: (employee: Partial<Employee>) => Promise<boolean>;
  onRefreshGlobalData?: () => void;
  currentUser?: any;
}

export type HRModuleTab =
  | 'overview_stats'        // 1. لوحة إحصائيات الموارد البشرية
  | 'employees'             // 2. إدارة الموظفين
  | 'employee_files'        // 3. ملفات الموظفين
  | 'employee_details'      // 4. بيانات الموظفين الشخصية والوظيفية
  | 'recruitment_requests'  // 5. طلبات التوظيف والانضمام الوظيفي
  | 'contracts_docs'        // 6. إدارة العقود والمستندات
  | 'attendance'            // 7. الحضور والانصراف الوظيفي
  | 'leaves_absence'        // 8. الإجازات والغياب
  | 'assignments_tasks'     // 9. التكليفات والمهام
  | 'evaluations_kpi'       // 10. التقييمات الوظيفية
  | 'admin_reports'         // 11. التقارير الإدارية
  | 'hr_letters'            // 12. الخطابات والتعريفات الوظيفية
  | 'job_titles'            // 13. إدارة المناصب والمسميات الوظيفية
  | 'audit_log'             // 14. سجل الإجراءات والتعديلات
  | 'hr_notifications';     // 15. الإشعارات الخاصة بالموارد البشرية

export const HRDashboard: React.FC<HRDashboardProps> = ({
  departments = [],
  employees = [],
  employeeRequests = [],
  onApproveRequest,
  onRejectRequest,
  onSaveEmployee,
  onRefreshGlobalData,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<HRModuleTab>('overview_stats');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [activeLetterhead, setActiveLetterhead] = useState<{
    title: string;
    docNumber: string;
    recipient: string;
    subject: string;
    content: React.ReactNode;
  } | null>(null);

  // New Employee Form State
  const [empForm, setEmpForm] = useState<Partial<Employee>>({
    name: '',
    employeeNumber: '',
    nationalId: '',
    phone: '',
    email: '',
    jobTitle: '',
    departmentId: 'dep-9',
    hireDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active',
    contractType: 'full_time',
    basicSalary: 4500,
    housingAllowance: 1000,
    transportAllowance: 500,
    qualification: 'بكالوريوس'
  });

  // Local state for leaves & attendance & decisions & evaluations
  const [leaves, setLeaves] = useState<HRLeaveRequest[]>([
    {
      id: 'leave-1',
      employeeId: employees[0]?.id || 'emp-1',
      employeeName: employees[0]?.name || 'محمد أحمد العتيبي',
      leaveType: 'annual',
      startDate: '2026-04-01',
      endDate: '2026-04-05',
      daysCount: 5,
      reason: 'إجازة سنوية اعتيادية معتمدة',
      status: 'pending',
      requestedAt: '2026-03-15'
    },
    {
      id: 'leave-2',
      employeeId: employees[1]?.id || 'emp-2',
      employeeName: employees[1]?.name || 'سارة بنت عبد الله',
      leaveType: 'sick',
      startDate: '2026-03-10',
      endDate: '2026-03-12',
      daysCount: 2,
      reason: 'إجازة مرضية مع تقرير طبي',
      status: 'approved',
      requestedAt: '2026-03-09'
    }
  ]);

  const [attendanceList, setAttendanceList] = useState<HRAttendanceRecord[]>([
    {
      id: 'att-1',
      employeeId: employees[0]?.id || 'emp-1',
      employeeName: employees[0]?.name || 'محمد أحمد العتيبي',
      date: new Date().toISOString().split('T')[0],
      checkInTime: '08:02 ص',
      checkOutTime: '04:05 م',
      status: 'present',
      notes: 'دوام منتظم كامل'
    },
    {
      id: 'att-2',
      employeeId: employees[1]?.id || 'emp-2',
      employeeName: employees[1]?.name || 'سارة بنت عبد الله',
      date: new Date().toISOString().split('T')[0],
      checkInTime: '08:15 ص',
      checkOutTime: '04:00 م',
      status: 'late',
      notes: 'تأخير 15 دقيقة بعذر'
    }
  ]);

  const [decisions, setDecisions] = useState<HRDecision[]>([
    {
      id: 'dec-1',
      decisionNumber: 'HR-DEC-2026-01',
      type: 'assignment',
      title: 'قرار تكليف إداري بالإشراف على وحدة الموارد البشرية والامتثال',
      employeeId: employees[0]?.id || 'emp-1',
      employeeName: employees[0]?.name || 'محمد أحمد العتيبي',
      issueDate: '2026-01-10',
      content: 'بناءً على الصلاحيات الممنوحة لمدير عام الجمعية، يُكلف الموظف بمهام الإشراف والمتابعة المباشرة لمطابقة المعايير.',
      signedBy: 'المدير التنفيذي - جمعية ريادة العطاء'
    }
  ]);

  const [evaluations, setEvaluations] = useState<Array<{
    id: string;
    employeeId: string;
    employeeName: string;
    jobTitle: string;
    period: string;
    score: number;
    rating: string;
    notes: string;
  }>>([
    {
      id: 'eval-1',
      employeeId: employees[0]?.id || 'emp-1',
      employeeName: employees[0]?.name || 'محمد أحمد العتيبي',
      jobTitle: employees[0]?.jobTitle || 'أخصائي شؤون موظفين',
      period: 'الربع السنوي الأول 2026',
      score: 96,
      rating: 'ممتاز',
      notes: 'التزام تام بأخلاقيات العمل وإنجاز كافة المهام الموكلة في الوقت المحدد.'
    }
  ]);

  const [jobTitlesList, setJobTitlesList] = useState<Array<{
    id: string;
    titleAr: string;
    departmentName: string;
    grade: string;
    activeCount: number;
  }>>([
    { id: 'jt-1', titleAr: 'مدير إدارة الموارد البشرية', departmentName: 'إدارة الموارد البشرية', grade: 'إداري أول', activeCount: 1 },
    { id: 'jt-2', titleAr: 'أخصائي شؤون موظفين', departmentName: 'إدارة الموارد البشرية', grade: 'تنفيذي', activeCount: 2 },
    { id: 'jt-3', titleAr: 'مسؤول رواتب وبدلات', departmentName: 'إدارة الموارد البشرية', grade: 'تنفيذي', activeCount: 1 },
    { id: 'jt-4', titleAr: 'منسق مبادرات وبرامج', departmentName: 'إدارة البرامج والمشاريع', grade: 'ميداني', activeCount: 4 },
    { id: 'jt-5', titleAr: 'أخصائي خدمة مستفيدين', departmentName: 'إدارة المستفيدين', grade: 'ميداني', activeCount: 3 },
    { id: 'jt-6', titleAr: 'أمين مستودع', departmentName: 'إدارة الخدمات المساندة', grade: 'لوجستي', activeCount: 1 }
  ]);

  const [hrAnnouncements, setHrAnnouncements] = useState<Array<{
    id: string;
    title: string;
    body: string;
    target: string;
    date: string;
    priority: 'high' | 'normal';
  }>>([
    {
      id: 'ann-1',
      title: 'بدء استقبال طلبات الإجازات السنوية لشهري رمضان وشوال',
      body: 'يُرجى من جميع المنسوبين رفع طلبات الإجازات الاعتيادية عبر البوابة لاعتمادها وجدولة البدلاء.',
      target: 'كافة منسوبي الجمعية',
      date: '2026-03-20',
      priority: 'high'
    },
    {
      id: 'ann-2',
      title: 'مواعيد الدوام الرسمي لفصل الربيع',
      body: 'يبدأ الدوام الرسمي من الساعة 08:00 صباحاً وحتى 04:00 مساءً، مع الالتزام بتسجيل الحضور عبر البصمة/الباركود.',
      target: 'جميع الموظفين',
      date: '2026-03-01',
      priority: 'normal'
    }
  ]);

  // Statistics calculation
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const pendingRecruitment = employeeRequests.filter(r => r.status === 'pending').length;
    const totalSalaries = employees.reduce((acc, curr) => 
      acc + (Number(curr.basicSalary) || 4000) + (Number(curr.housingAllowance) || 0) + (Number(curr.transportAllowance) || 0), 0
    );
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;
    
    // Contracts expiring in < 60 days
    const now = Date.now();
    const expiringContracts = employees.filter(e => {
      if (!e.expiryDate) return false;
      const diffDays = (new Date(e.expiryDate).getTime() - now) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 60;
    }).length;

    return {
      totalEmployees,
      activeEmployees,
      pendingRecruitment,
      totalSalaries,
      pendingLeaves,
      expiringContracts,
      attendanceRate: '98.5%'
    };
  }, [employees, employeeRequests, leaves]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesDept = departmentFilter === 'all' || emp.departmentId === departmentFilter;
      const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.employeeNumber?.toLowerCase().includes(q) ||
        emp.jobTitle.toLowerCase().includes(q) ||
        emp.nationalId?.includes(q) ||
        emp.phone?.includes(q);

      return matchesDept && matchesStatus && matchesSearch;
    });
  }, [employees, departmentFilter, statusFilter, searchQuery]);

  const handleCreateOrUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.jobTitle) {
      alert('يرجى تعبئة الحقول الإلزامية (الاسم والمسمى الوظيفي)');
      return;
    }

    try {
      if (onSaveEmployee) {
        await onSaveEmployee(empForm);
      } else {
        await fetch('/api/db/hr/employees/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empForm)
        });
      }
      onRefreshGlobalData?.();
      setIsEmployeeModalOpen(false);
      setSelectedEmployee(null);
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ بيانات الموظف: ' + err.message);
    }
  };

  const handleLeaveAction = async (leaveId: string, action: 'approve' | 'reject') => {
    setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status: action === 'approve' ? 'approved' : 'rejected' } : l));
    try {
      await fetch('/api/db/hr/leaves/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leaveId, action })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenSalaryCertificate = (emp: Employee) => {
    const totalSalary = (Number(emp.basicSalary) || 4000) + (Number(emp.housingAllowance) || 1000) + (Number(emp.transportAllowance) || 500);
    const dept = departments.find(d => d.id === emp.departmentId);

    setActiveLetterhead({
      title: "شهادة تعريف بالراتب وتثبيت وظيفي",
      docNumber: `HR-CERT-${emp.employeeNumber || '001'}-${new Date().getFullYear()}`,
      recipient: "إلى من يهمه الأمر المحترمين",
      subject: `شهادة تعريف وتثبيت راتب للموظف / ${emp.name}`,
      content: (
        <div className="space-y-4 text-sm leading-relaxed text-slate-800">
          <p>السلام عليكم ورحمة الله وبركاته،، وبعد:</p>
          <p>
            تشهد جمعية ريادة العطاء لخدمة الإنسان بالعسيلة (رقم ترخيص المركز الوطني لتنمية القطاع غير الربحي: <strong>1000888600</strong>)، بأن الموظف الموضحة بياناته أدناه يعمل لدى الجمعية وعلى رأس العمل حتى تاريخه:
          </p>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-4 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div><strong className="text-slate-500">اسم الموظف:</strong> <span className="font-bold text-slate-900">{emp.name}</span></div>
              <div><strong className="text-slate-500">رقم الهوية الوطنية / الإقامة:</strong> <span className="font-mono font-bold text-slate-900">{emp.nationalId || '10********'}</span></div>
              <div><strong className="text-slate-500">الرقم الوظيفي:</strong> <span className="font-mono text-indigo-700 font-bold">{emp.employeeNumber || emp.id}</span></div>
              <div><strong className="text-slate-500">المسمى الوظيفي:</strong> <span className="font-bold text-slate-900">{emp.jobTitle}</span></div>
              <div><strong className="text-slate-500">الإدارة التابع لها:</strong> <span className="font-bold text-slate-900">{emp.departmentName || dept?.nameAr || 'إدارة الموارد البشرية'}</span></div>
              <div><strong className="text-slate-500">تاريخ الالتحاق بالعمل:</strong> <span className="font-mono text-slate-900">{emp.hireDate || '2026-01-01'}</span></div>
              <div><strong className="text-slate-500">نوع العقد:</strong> <span className="font-bold text-slate-900">{emp.contractType === 'full_time' ? 'عقد دوام كامل' : 'عقد جزئي/محدد'}</span></div>
              <div><strong className="text-slate-500">حالة الموظف:</strong> <span className="text-emerald-700 font-bold">على رأس العمل</span></div>
            </div>

            <div className="border-t border-slate-200 pt-3 mt-3">
              <h5 className="font-bold text-slate-800 mb-2">تفاصيل الراتب والبدلات الشهرية (بالريال السعودي):</h5>
              <div className="grid grid-cols-4 gap-2 text-center bg-white p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block">الراتب الأساسي</span>
                  <strong className="font-mono text-indigo-600">{(Number(emp.basicSalary) || 4000).toLocaleString('ar-SA')} ر.س</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">بدل السكن</span>
                  <strong className="font-mono text-slate-700">{(Number(emp.housingAllowance) || 1000).toLocaleString('ar-SA')} ر.س</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">بدل النقل</span>
                  <strong className="font-mono text-slate-700">{(Number(emp.transportAllowance) || 500).toLocaleString('ar-SA')} ر.س</strong>
                </div>
                <div className="bg-indigo-50 p-1 rounded border border-indigo-200">
                  <span className="text-[10px] text-indigo-600 font-bold block">إجمالي الراتب</span>
                  <strong className="font-mono text-indigo-800 font-black">{totalSalary.toLocaleString('ar-SA')} ر.س</strong>
                </div>
              </div>
            </div>
          </div>

          <p>
            وقد أُعطيت له هذه الشهادة بناءً على طلبه لتقديمها إلى الجهات المختصة دون أدنى مسؤولية مالية أو قانونية على الجمعية تجاه الغير.
          </p>
          <p className="pt-2">وتفضلوا بقبول فائق التحية والتقدير،،،</p>
        </div>
      )
    });
  };

  // 15 Modules Navigation Config
  const moduleTabs: Array<{ id: HRModuleTab; label: string; icon: any; count?: number; category: string }> = [
    { id: 'overview_stats', label: '1. لوحة إحصائيات الموارد البشرية', icon: BarChart3, category: 'عام' },
    { id: 'employees', label: '2. إدارة الموظفين', icon: Users, count: employees.length, category: 'الكوادر' },
    { id: 'employee_files', label: '3. ملفات الموظفين', icon: FolderOpen, count: employees.length, category: 'الكوادر' },
    { id: 'employee_details', label: '4. بيانات الموظفين الشخصية والوظيفية', icon: ClipboardList, category: 'الكوادر' },
    { id: 'recruitment_requests', label: '5. طلبات التوظيف والانضمام الوظيفي', icon: Briefcase, count: stats.pendingRecruitment || undefined, category: 'التوظيف' },
    { id: 'contracts_docs', label: '6. إدارة العقود والمستندات', icon: FileCheck, count: stats.expiringContracts || undefined, category: 'التوظيف' },
    { id: 'attendance', label: '7. الحضور والانصراف الوظيفي', icon: Clock, category: 'المتابعة' },
    { id: 'leaves_absence', label: '8. الإجازات والغياب', icon: Calendar, count: stats.pendingLeaves || undefined, category: 'المتابعة' },
    { id: 'assignments_tasks', label: '9. التكليفات والمهام', icon: CheckCircle2, count: decisions.length, category: 'المتابعة' },
    { id: 'evaluations_kpi', label: '10. التقييمات الوظيفية (KPIs)', icon: Award, count: evaluations.length, category: 'الأداء' },
    { id: 'admin_reports', label: '11. التقارير الإدارية', icon: TrendingUp, category: 'التقارير' },
    { id: 'hr_letters', label: '12. الخطابات والتعريفات الوظيفية', icon: FileText, category: 'التقارير' },
    { id: 'job_titles', label: '13. إدارة المناصب والمسميات الوظيفية', icon: Layers, count: jobTitlesList.length, category: 'الهيكل' },
    { id: 'audit_log', label: '14. سجل الإجراءات والتعديلات', icon: History, category: 'الحوكمة' },
    { id: 'hr_notifications', label: '15. الإشعارات الخاصة بالموارد البشرية', icon: Bell, count: hrAnnouncements.length, category: 'الحوكمة' }
  ];

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>إدارة الموارد البشرية والشؤون الإدارية المستقلة • جمعية ريادة العطاء</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white">
              بوابة مدير الموارد البشرية والكوادر (HR Master Dashboard)
            </h2>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              المنظومة الإدارية المتكاملة لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة (15 نظامًا تخصصيًا) لإدارة الموظفين، العقود، طلبات التوظيف، الحضور، الإجازات، التقييمات، والخطابات الرسمية المعتمدة.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setEmpForm({
                  name: '',
                  employeeNumber: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                  nationalId: '',
                  phone: '',
                  email: '',
                  jobTitle: '',
                  departmentId: 'dep-9',
                  hireDate: new Date().toISOString().split('T')[0],
                  expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  status: 'active',
                  contractType: 'full_time',
                  basicSalary: 4500,
                  housingAllowance: 1000,
                  transportAllowance: 500,
                  qualification: 'بكالوريوس'
                });
                setSelectedEmployee(null);
                setIsEmployeeModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-900/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة موظف جديد</span>
            </button>

            {onRefreshGlobalData && (
              <button
                onClick={onRefreshGlobalData}
                title="تحديث البيانات"
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer border border-slate-700"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Top Metric Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">إجمالي الكادر</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono">{stats.totalEmployees}</p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">✓ {stats.activeEmployees} على رأس العمل</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">طلبات التوظيف</span>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600 font-mono">{stats.pendingRecruitment}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">بانتظار المراجعة</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">طلبات الإجازات</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl font-black text-blue-600 font-mono">{stats.pendingLeaves}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">قيد التدقيق والاعتماد</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">تجديد العقود (60 يوم)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-xl font-black text-rose-600 font-mono">{stats.expiringContracts}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">تتطلب المتابعة والتجديد</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">نسبة الانضباط</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-600 font-mono">{stats.attendanceRate}</p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">ممتاز وفق المعايير</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold">كتلة الرواتب</span>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-xl font-black text-teal-600 font-mono">{stats.totalSalaries.toLocaleString('ar-SA')}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">ريال / شهرياً</span>
        </div>
      </div>

      {/* 3. 15-Module Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {moduleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW & STATS */}
      {activeTab === 'overview_stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                توزيع الكوادر حسب الإدارات
              </h3>
              <div className="space-y-2.5">
                {departments.map((dep) => {
                  const count = employees.filter(e => e.departmentId === dep.id).length;
                  const pct = employees.length > 0 ? Math.round((count / employees.length) * 100) : 0;
                  return (
                    <div key={dep.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300">{dep.nameAr}</span>
                        <span className="font-mono text-slate-500">{count} موظف ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${Math.max(5, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                تنبيهات العقود والإجازات العاجلة
              </h3>
              <div className="space-y-3 text-xs">
                {employees.slice(0, 3).map((emp) => (
                  <div key={emp.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                    <div>
                      <strong className="block text-slate-900 dark:text-white">{emp.name}</strong>
                      <span className="text-[11px] text-slate-400">ينتهي العقد: {emp.expiryDate || '2026-12-31'}</span>
                    </div>
                    <button
                      onClick={() => handleOpenSalaryCertificate(emp)}
                      className="px-2.5 py-1 text-[11px] rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 transition-colors"
                    >
                      إصدار تعريف
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                مؤشرات أداء الموارد البشرية (HR KPIs)
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 block mb-1">معدل دوران الكوادر</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">1.2%</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">ضمن النطاق الآمن</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 block mb-1">سرعة شغل الشواغر</span>
                  <span className="text-lg font-black text-indigo-600 font-mono">8 أيام</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">كفاءة استقطاب عالية</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 block mb-1">التوطين الوظيفي</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">100%</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">نطاق بلاتيني</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <span className="text-[11px] text-slate-500 block mb-1">رضا الموظفين</span>
                  <span className="text-lg font-black text-amber-500 font-mono">96%</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">وفق استبيان الربع الأول</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEES MANAGEMENT */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="بحث بالاسم، الرقم الوظيفي، الهوية، أو المسمى..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">كافة الإدارات ({employees.length})</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.nameAr}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
              >
                <option value="all">كافة الحالات</option>
                <option value="active">على رأس العمل</option>
                <option value="inactive">معلق / غير نشط</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((emp) => {
              const dept = departments.find(d => d.id === emp.departmentId);
              return (
                <div key={emp.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between hover:border-indigo-500/50 transition-all">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-slate-800 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm">{emp.name}</h4>
                          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold block">{emp.jobTitle}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        emp.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {emp.status === 'active' ? 'على رأس العمل' : 'معلق'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400">الرقم الوظيفي:</span>
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{emp.employeeNumber || emp.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الإدارة:</span>
                        <span className="font-bold">{emp.departmentName || dept?.nameAr || 'الموارد البشرية'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">الهوية الوطنية:</span>
                        <span className="font-mono">{emp.nationalId || '10********'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">تاريخ التعيين:</span>
                        <span className="font-mono">{emp.hireDate || '2026-01-01'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleOpenSalaryCertificate(emp)}
                      className="flex-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>شهادة تعريف</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setEmpForm(emp);
                        setIsEmployeeModalOpen(true);
                      }}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="تعديل البيانات"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3 & 4: EMPLOYEE FILES & DETAILS */}
      {(activeTab === 'employee_files' || activeTab === 'employee_details') && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {activeTab === 'employee_files' ? 'سجل ملفات الموظفين والمرفقات الرسمية' : 'بيانات الموظفين الشخصية والمالية والوظيفية'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  عرض شامل للبيانات المعتمدة، البدلات، الحسابات، وصور الوثائق والعقود المعتمدة.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3.5">الرقم الوظيفي</th>
                    <th className="p-3.5">اسم الموظف</th>
                    <th className="p-3.5">المسمى الوظيفي</th>
                    <th className="p-3.5">الإدارة التابع لها</th>
                    <th className="p-3.5">الراتب الأساسي</th>
                    <th className="p-3.5">إجمالي البدلات</th>
                    <th className="p-3.5">المؤهل</th>
                    <th className="p-3.5">تاريخ التعيين</th>
                    <th className="p-3.5 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.map((emp) => {
                    const dept = departments.find(d => d.id === emp.departmentId);
                    const totalAllowances = (Number(emp.housingAllowance) || 0) + (Number(emp.transportAllowance) || 0);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-mono font-bold text-indigo-700 dark:text-indigo-400">{emp.employeeNumber || emp.id}</td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{emp.name}</td>
                        <td className="p-3.5 text-slate-700 dark:text-slate-300">{emp.jobTitle}</td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">{emp.departmentName || dept?.nameAr || 'الموارد البشرية'}</td>
                        <td className="p-3.5 font-mono text-slate-900 dark:text-white">{(Number(emp.basicSalary) || 4500).toLocaleString('ar-SA')} ر.س</td>
                        <td className="p-3.5 font-mono text-emerald-600">{totalAllowances.toLocaleString('ar-SA')} ر.س</td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400">{emp.qualification || 'بكالوريوس'}</td>
                        <td className="p-3.5 font-mono text-slate-500">{emp.hireDate || '2026-01-01'}</td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleOpenSalaryCertificate(emp)}
                            className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            خطاب تعريف
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RECRUITMENT REQUESTS */}
      {activeTab === 'recruitment_requests' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              طلبات التوظيف والاحتياج الوظيفي للكوادر ({employeeRequests.length})
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              إدارة واعتماد طلبات التعيين والانضمام الوظيفي المرفوعة من مدراء الإدارات المختلفة.
            </p>

            <div className="space-y-3">
              {employeeRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  لا توجد طلبات توظيف معلقة حالياً.
                </div>
              ) : (
                employeeRequests.map((req) => (
                  <div key={req.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-900 dark:text-white">{req.fullName || (req as any).name}</strong>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {req.status === 'pending' ? 'قيد التدقيق' : req.status === 'approved' ? 'معتمد' : 'مرفوض'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        المسمى المطلوب: <span className="font-bold text-slate-700 dark:text-slate-300">{req.jobTitle}</span> • الإدارة: <span className="font-bold text-slate-700 dark:text-slate-300">{req.departmentName || req.departmentId}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => onApproveRequest?.(req.id, currentUser?.name || 'مدير الموارد البشرية')}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            اعتماد وتعيين
                          </button>
                          <button
                            onClick={() => onRejectRequest?.(req.id, currentUser?.name || 'مدير الموارد البشرية', 'عدم توافق المؤهلات')}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-rose-100 text-slate-700 dark:text-slate-300 hover:text-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            رفض الطلب
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CONTRACTS & DOCUMENTS */}
      {activeTab === 'contracts_docs' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">
              إدارة العقود الوظيفية والمستندات الرسمية
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              متابعة صلاحية عقود العمل، فترات التجربة، والتجديد التلقائي ومرفقات العقود الموقعة.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((emp) => (
                <div key={emp.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{emp.name}</h4>
                      <span className="text-xs text-indigo-600 font-bold">{emp.contractType === 'full_time' ? 'عقد دوام كامل' : 'عقد محدد المدة'}</span>
                    </div>
                    <FileCheck className="w-5 h-5 text-indigo-600" />
                  </div>

                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">تاريخ البداية:</span>
                      <span className="font-mono">{emp.hireDate || '2026-01-01'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">تاريخ الانتهاء:</span>
                      <span className="font-mono font-bold text-amber-600">{emp.expiryDate || '2026-12-31'}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenSalaryCertificate(emp)}
                    className="w-full bg-white dark:bg-slate-700 hover:bg-indigo-50 border border-slate-200 dark:border-slate-600 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>طباعة وثيقة العقد الرسمية</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">سجل الحضور والانصراف الوظيفي</h3>
                <p className="text-xs text-slate-400">متابعة تسجيل الحضور والانصراف المباشر والانضباط اليومي.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">التاريخ: {new Date().toISOString().split('T')[0]}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {attendanceList.map((att) => (
                <div key={att.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <div>
                      <strong className="text-slate-900 dark:text-white block">{att.employeeName}</strong>
                      <span className="text-[11px] text-slate-400">{att.notes}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-400 ml-1">الحضور:</span>
                      <strong className="font-mono text-emerald-600">{att.checkInTime}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 ml-1">الانصراف:</span>
                      <strong className="font-mono text-slate-700 dark:text-slate-300">{att.checkOutTime || 'لم يسجل'}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 8: LEAVES & ABSENCE */}
      {activeTab === 'leaves_absence' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">إدارة الإجازات والغياب</h3>
            <p className="text-xs text-slate-400 mb-4">طلبات الإجازات السنوية، المرضية، والطارئة مع احتساب الأرصدة.</p>

            <div className="space-y-3">
              {leaves.map((leave) => (
                <div key={leave.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">{leave.employeeName}</strong>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        leave.status === 'pending' ? 'bg-amber-100 text-amber-800' : leave.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {leave.status === 'pending' ? 'قيد المراجعة' : leave.status === 'approved' ? 'معتمدة' : 'مرفوضة'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      نوع الإجازة: {leave.leaveType === 'annual' ? 'سنوية' : 'مرضية'} • المدة: {leave.daysCount} أيام ({leave.startDate} إلى {leave.endDate})
                    </p>
                  </div>

                  {leave.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLeaveAction(leave.id, 'approve')}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        موافقة
                      </button>
                      <button
                        onClick={() => handleLeaveAction(leave.id, 'reject')}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        رفض
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 9: ASSIGNMENTS & TASKS */}
      {activeTab === 'assignments_tasks' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">القرارات الإدارية والتكليفات الرسمية</h3>
            <p className="text-xs text-slate-400 mb-4">إصدار وتوثيق قرارات التكليف، النقل الداخلي، والإشراف الإداري.</p>

            <div className="space-y-3">
              {decisions.map((dec) => (
                <div key={dec.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-indigo-600 font-bold text-xs">{dec.decisionNumber}</span>
                    <span className="text-xs text-slate-400">{dec.issueDate}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{dec.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{dec.content}</p>
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                    المعتمد: <strong>{dec.signedBy}</strong> • المكلف: <strong>{dec.employeeName}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: EVALUATIONS & KPIS */}
      {activeTab === 'evaluations_kpi' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">التقييمات الوظيفية ومؤشرات الأداء السنوية</h3>
            <p className="text-xs text-slate-400 mb-4">سجل تقييم أداء الموظفين وفق مصفوفة الجدارة والأهداف التشغيلية.</p>

            <div className="space-y-3">
              {evaluations.map((ev) => (
                <div key={ev.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="space-y-1">
                    <strong className="text-sm font-bold text-slate-900 dark:text-white block">{ev.employeeName}</strong>
                    <span className="text-xs text-slate-400">{ev.jobTitle} • الفترة: {ev.period}</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{ev.notes}</p>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                    <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono">{ev.score}%</span>
                    <span className="text-[10px] font-bold text-indigo-600 block">{ev.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 11: ADMIN REPORTS */}
      {activeTab === 'admin_reports' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">التقارير الإدارية والتحليلية</h3>
            <p className="text-xs text-slate-400 mb-4">توليد وتصدير التقارير الإحصائية المعتمدة للموارد البشرية.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">مسير الرواتب الشهري المعتمد</h4>
                <p className="text-[11px] text-slate-400">كشف الرواتب والبدلات الإجمالية لجميع الموظفين.</p>
                <button
                  onClick={() => employees[0] && handleOpenSalaryCertificate(employees[0])}
                  className="w-full py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors cursor-pointer"
                >
                  معاينة وطباعة المسير
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">تقرير الامتثال والتوطين</h4>
                <p className="text-[11px] text-slate-400">إحصائيات نسب التوطين والالتزام بمتطلبات الموارد البشرية.</p>
                <button
                  onClick={() => alert('تم استخراج تقرير الامتثال والتوطين بنسبة 100% بنجاح.')}
                  className="w-full py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors cursor-pointer"
                >
                  استخراج التقرير
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-slate-900 dark:text-white text-xs">تقرير أرصدة الإجازات السنوية</h4>
                <p className="text-[11px] text-slate-400">بيان تفصيلي برصيد كل موظف والإجازات المستهلكة.</p>
                <button
                  onClick={() => alert('تم استخراج تقرير أرصدة الإجازات السنوية بنجاح.')}
                  className="w-full py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  استخراج التقرير
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 12: HR LETTERS */}
      {activeTab === 'hr_letters' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">الخطابات والتعريفات الوظيفية المعتمدة</h3>
            <p className="text-xs text-slate-400 mb-4">إصدار خطابات تثبيت الراتب والتعريف الوظيفي بالترويسة الرسمية المعتمدة.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((emp) => (
                <div key={emp.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <div className="space-y-1 mb-3">
                    <strong className="text-sm font-bold text-slate-900 dark:text-white block">{emp.name}</strong>
                    <span className="text-xs text-indigo-600 font-bold">{emp.jobTitle}</span>
                    <span className="text-[11px] text-slate-400 block font-mono">الرقم الوظيفي: {emp.employeeNumber || emp.id}</span>
                  </div>

                  <button
                    onClick={() => handleOpenSalaryCertificate(emp)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>توليد خطاب تعريف بالراتب</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 13: JOB TITLES */}
      {activeTab === 'job_titles' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">دليل المناصب والمسميات الوظيفية</h3>
            <p className="text-xs text-slate-400 mb-4">هيكل المسميات الوظيفية، الدرجات الإدارية، والتوزيع التنظيمي.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {jobTitlesList.map((jt) => (
                <div key={jt.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex justify-between items-center">
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">{jt.titleAr}</strong>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {jt.grade}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 block">{jt.departmentName}</span>
                  <span className="text-[11px] text-emerald-600 font-bold block pt-1">
                    {jt.activeCount} شاغر مشغول
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 14: AUDIT LOG */}
      {activeTab === 'audit_log' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">سجل إجراءات وتعديلات الموارد البشرية</h3>
            <p className="text-xs text-slate-400 mb-4">التوثيق الإداري لجميع التعديلات والقرارات والإجراءات المتخذة في النظام.</p>

            <div className="space-y-2.5">
              {[
                { time: '2026-03-25 09:30', user: 'مدير الموارد البشرية', action: 'اعتماد خطاب تعريف بالراتب للموظف محمد أحمد العتيبي' },
                { time: '2026-03-24 14:15', user: 'أخصائي شؤون الموظفين', action: 'تحديث بيانات بدل السكن والتأمين الطبي للكادر' },
                { time: '2026-03-22 11:00', user: 'إدارة الموارد البشرية', action: 'تسجيل وقبول طلب التوظيف الجديد' }
              ].map((log, idx) => (
                <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs">
                  <div>
                    <strong className="text-slate-900 dark:text-white block">{log.action}</strong>
                    <span className="text-[11px] text-slate-400 font-mono">بواسطة: {log.user}</span>
                  </div>
                  <span className="font-mono text-slate-400">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 15: HR NOTIFICATIONS */}
      {activeTab === 'hr_notifications' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-1">التعاميم والإشعارات الخاصة بالموارد البشرية</h3>
            <p className="text-xs text-slate-400 mb-4">إرسال وبث الإعلانات الإدارية، تحديثات الإجازات، ومواعيد الدوام الرسمي.</p>

            <div className="space-y-3">
              {hrAnnouncements.map((ann) => (
                <div key={ann.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{ann.title}</h4>
                    <span className="font-mono text-xs text-slate-400">{ann.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{ann.body}</p>
                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold pt-1">
                    الفئة المستهدفة: {ann.target}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl max-w-2xl w-full p-6 text-slate-900 dark:text-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
              <h3 className="text-base font-black">
                {selectedEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد إلى السجل الإداري'}
              </h3>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">اسم الموظف الكامل *</label>
                  <input
                    type="text"
                    required
                    value={empForm.name || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">الرقم الوظيفي</label>
                  <input
                    type="text"
                    value={empForm.employeeNumber || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, employeeNumber: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">رقم الهوية الوطنية / الإقامة *</label>
                  <input
                    type="text"
                    required
                    value={empForm.nationalId || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, nationalId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={empForm.jobTitle || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">الإدارة التابع لها</label>
                  <select
                    value={empForm.departmentId || 'dep-9'}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, departmentId: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none font-bold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.nameAr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">رقم الجوال</label>
                  <input
                    type="text"
                    value={empForm.phone || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">الراتب الأساسي (ريال)</label>
                  <input
                    type="number"
                    value={empForm.basicSalary || 4500}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, basicSalary: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1 text-slate-700 dark:text-slate-300">بدل السكن (ريال)</label>
                  <input
                    type="number"
                    value={empForm.housingAllowance || 1000}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, housingAllowance: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800 mt-5">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL LETTERHEAD MODAL */}
      {activeLetterhead && (
        <OfficialLetterheadTemplate
          isModal={true}
          documentTitle={activeLetterhead.title}
          documentNumber={activeLetterhead.docNumber}
          recipientTitle={activeLetterhead.recipient}
          subject={activeLetterhead.subject}
          onClose={() => setActiveLetterhead(null)}
          signatoryName="أ. نورة بنت فهد الشريف"
          signatoryTitle="مدير إدارة الموارد البشرية"
          signatoryDepartment="إدارة الموارد البشرية والشؤون الإدارية"
        >
          {activeLetterhead.content}
        </OfficialLetterheadTemplate>
      )}
    </div>
  );
};
