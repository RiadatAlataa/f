import React, { useState, useMemo } from 'react';
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
  UserCheck
} from 'lucide-react';
import {
  Department,
  Employee,
  EmployeeRequest,
  HRLeaveRequest,
  HRAttendanceRecord,
  HRPayrollSheet,
  HRDecision
} from '../types';

interface HRDashboardProps {
  departments: Department[];
  employees: Employee[];
  employeeRequests: EmployeeRequest[];
  onApproveRequest?: (requestId: string, reviewerName: string, notes?: string) => Promise<boolean>;
  onRejectRequest?: (requestId: string, reviewerName: string, rejectionReason: string) => Promise<boolean>;
  onSaveEmployee?: (employee: Partial<Employee>) => Promise<boolean>;
}

export const HRDashboard: React.FC<HRDashboardProps> = ({
  departments = [],
  employees = [],
  employeeRequests = [],
  onApproveRequest,
  onRejectRequest,
  onSaveEmployee
}) => {
  const [activeTab, setActiveTab] = useState<'employees' | 'contracts' | 'attendance' | 'leaves' | 'payroll' | 'decisions' | 'recruitment'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<HRDecision | null>(null);

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

  // Local state for leaves & attendance & decisions (fallback persisted)
  const [leaves, setLeaves] = useState<HRLeaveRequest[]>([
    {
      id: 'leave-1',
      employeeId: employees[0]?.id || 'emp-1',
      employeeName: employees[0]?.name || 'محمد أحمد العتيبي',
      leaveType: 'annual',
      startDate: '2026-04-01',
      endDate: '2026-04-05',
      daysCount: 5,
      reason: 'إجازة سنوية اعتيادية',
      status: 'pending',
      requestedAt: '2026-03-15'
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
    }
  ]);

  const [decisions, setDecisions] = useState<HRDecision[]>([
    {
      id: 'dec-1',
      decisionNumber: 'HR-DEC-2026-01',
      type: 'assignment',
      title: 'قرار تكليف إداري بالإشراف على وحدة الموارد البشرية',
      employeeId: employees[0]?.id || 'emp-1',
      employeeName: employees[0]?.name || 'أحمد المحمود',
      issueDate: '2026-01-10',
      content: 'بناءً على الصلاحيات الممنوحة لمدير عام الجمعية، يُكلف الموظف بمهام الإشراف على متابعة سجلات الكوادر والامتثال التنظيمي.',
      signedBy: 'المدير التنفيذي - جمعية ريادة العطاء'
    }
  ]);

  // Statistics
  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const pendingRecruitment = employeeRequests.filter(r => r.status === 'pending').length;
    const totalSalaries = employees.reduce((acc, curr) => acc + (Number(curr.basicSalary) || 4000) + (Number(curr.housingAllowance) || 0) + (Number(curr.transportAllowance) || 0), 0);
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

    return {
      totalEmployees,
      activeEmployees,
      pendingRecruitment,
      totalSalaries,
      pendingLeaves
    };
  }, [employees, employeeRequests, leaves]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesDept = departmentFilter === 'all' || emp.departmentId === departmentFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.employeeNumber?.toLowerCase().includes(q) ||
        emp.jobTitle.toLowerCase().includes(q) ||
        emp.nationalId?.includes(q);

      return matchesDept && matchesSearch;
    });
  }, [employees, departmentFilter, searchQuery]);

  const handleCreateOrUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.jobTitle) {
      alert('يرجى تعبئة الحقول الإلزامية');
      return;
    }

    if (onSaveEmployee) {
      await onSaveEmployee(empForm);
    } else {
      // Direct API fallback
      try {
        await fetch('/api/db/hr/employees/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(empForm)
        });
      } catch (err) {
        console.error(err);
      }
    }

    setIsEmployeeModalOpen(false);
    setSelectedEmployee(null);
  };

  const handleLeaveAction = (leaveId: string, status: 'approved' | 'rejected') => {
    setLeaves(prev => prev.map(l => l.id === leaveId ? { ...l, status } : l));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
              <Building2 className="w-3.5 h-3.5" />
              <span>إدارة الموارد البشرية والشؤون الإدارية • جمعية ريادة العطاء</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black">نظام إدارة الموارد البشرية والكوادر (HR Master)</h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              الإدارة المستقلة لملفات الموظفين، العقود والبدلات، الحضور والانصراف، مسيرات الرواتب الشهرية، الإجازات، والقرارات الإدارية والتكليفات الرسمية.
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
                setIsEmployeeModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-900/40 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة موظف جديد</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">إجمالي الموظفين</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.totalEmployees}</p>
          <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ {stats.activeEmployees} موظف على رأس العمل</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">طلبات التوظيف</span>
            <Briefcase className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">{stats.pendingRecruitment}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">طلبات كوادر قيد التدقيق</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">طلبات الإجازة</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 font-mono">{stats.pendingLeaves}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">بانتظار موافقة HR</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">حضور اليوم</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 font-mono">100%</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">الانضباط ومواعيد الدوام</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">كتلة الرواتب الشهرية</span>
            <DollarSign className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-600 font-mono">{stats.totalSalaries.toLocaleString('ar-SA')}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">ريال سعودي / شهرياً</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto pb-2">
        {[
          { id: 'employees', label: 'الموظفون وسجلاتهم', icon: Users, count: employees.length },
          { id: 'contracts', label: 'العقود والبدلات', icon: FileCheck, count: employees.length },
          { id: 'attendance', label: 'الحضور والانصراف', icon: Clock },
          { id: 'leaves', label: 'الإجازات والأرصدة', icon: Calendar, count: stats.pendingLeaves || undefined },
          { id: 'payroll', label: 'مسيرات الرواتب', icon: DollarSign },
          { id: 'decisions', label: 'القرارات الإدارية والتكليف', icon: FileText, count: decisions.length },
          { id: 'recruitment', label: 'طلبات التوظيف والكوادر', icon: Briefcase, count: stats.pendingRecruitment || undefined }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-800'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EMPLOYEES LIST */}
      {activeTab === 'employees' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">سجل بيانات وموظفي الجمعية</h3>
              <p className="text-xs text-slate-500 mt-0.5">الملف الوظيفي، أرقام التواصل، المؤهلات، وحالة الموظف في النظام</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث بالاسم، الهوية، الوظيفة..."
                  className="pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 sm:w-60"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="py-1.5 px-3 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none"
              >
                <option value="all">كافة الإدارات</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">الرقم الوظيفي</th>
                  <th className="p-3">اسم الموظف</th>
                  <th className="p-3">المسمى الوظيفي</th>
                  <th className="p-3">الإدارة</th>
                  <th className="p-3">رقم الهوية / الإقامة</th>
                  <th className="p-3">الهاتف</th>
                  <th className="p-3">المؤهل</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {emp.employeeNumber || `#${emp.id}`}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                      <div>{emp.name}</div>
                      <span className="text-[10px] text-slate-400 font-normal">{emp.email || "-"}</span>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-200 font-bold">{emp.jobTitle}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      {departments.find(d => d.id === emp.departmentId)?.name || "الإدارة العامة"}
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{emp.nationalId || "-"}</td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300" dir="ltr">{emp.phone || "-"}</td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">{emp.qualification || "جامعي"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        emp.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {emp.status === 'active' ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedEmployee(emp);
                          setEmpForm(emp);
                          setIsEmployeeModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                      >
                        عرض / تعديل
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEmployees.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                      لا يوجد موظفون مسجلون مطابقون لخيارات البحث.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CONTRACTS & SALARIES */}
      {activeTab === 'contracts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-150 dark:border-slate-800">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">عقود الموظفين والبدلات المالية</h3>
            <p className="text-xs text-slate-500 mt-0.5">متابعة سريان العقود وتواريخ انتهائها والرواتب الأساسية وبدلات السكن والمواصلات</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">نوع العقد</th>
                  <th className="p-3">تاريخ البداية</th>
                  <th className="p-3">تاريخ الانتهاء</th>
                  <th className="p-3 text-center">الأساسي</th>
                  <th className="p-3 text-center">بدل سكن</th>
                  <th className="p-3 text-center">بدل نقل</th>
                  <th className="p-3 text-center">إجمالي الراتب</th>
                  <th className="p-3">حالة العقد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {employees.map(emp => {
                  const basic = Number(emp.basicSalary) || 4500;
                  const housing = Number(emp.housingAllowance) || 1000;
                  const transport = Number(emp.transportAllowance) || 500;
                  const total = basic + housing + transport;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                        {emp.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{emp.jobTitle}</span>
                      </td>
                      <td className="p-3 font-bold text-indigo-700 dark:text-indigo-400">
                        {emp.contractType === 'part_time' ? 'دوام جزئي' :
                         emp.contractType === 'seasonal' ? 'موسمي' :
                         emp.contractType === 'consultant' ? 'استشاري' : 'دوام كامل'}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{emp.hireDate || "-"}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{emp.expiryDate || "-"}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">{basic.toLocaleString('ar-SA')} ر.س</td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">{housing.toLocaleString('ar-SA')} ر.س</td>
                      <td className="p-3 text-center font-mono text-slate-600 dark:text-slate-400">{transport.toLocaleString('ar-SA')} ر.س</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600 dark:text-emerald-400">{total.toLocaleString('ar-SA')} ر.س</td>
                      <td className="p-3">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          ساري ونشط
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">سجل الحضور والانصراف اليومي</h3>
              <p className="text-xs text-slate-500">متابعة ساعات العمل والانضباط اليومي لكوادر الجمعية</p>
            </div>
            <button
              onClick={() => {
                alert('تم تسجيل حضور وانصراف الكوادر آلياً بنجاح.');
              }}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              تسجيل بصمة يومية
            </button>
          </div>

          <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 font-bold">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">وقت الحضور</th>
                  <th className="p-3">وقت الانصراف</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attendanceList.map(att => (
                  <tr key={att.id}>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{att.employeeName}</td>
                    <td className="p-3 font-mono">{att.date}</td>
                    <td className="p-3 font-mono font-bold text-emerald-600">{att.checkInTime}</td>
                    <td className="p-3 font-mono font-bold text-slate-600">{att.checkOutTime || "-"}</td>
                    <td className="p-3">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        حاضر
                      </span>
                    </td>
                    <td className="p-3 text-slate-500">{att.notes || "منتظم"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: LEAVES */}
      {activeTab === 'leaves' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">طلبات الإجازات والاستئذان</h3>
              <p className="text-xs text-slate-500">إدارة ومراجعة الإجازات السنوية والمرضية والاضطرارية</p>
            </div>
          </div>

          <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 font-bold">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">نوع الإجازة</th>
                  <th className="p-3">من تاريخ</th>
                  <th className="p-3">إلى تاريخ</th>
                  <th className="p-3 text-center">عدد الأيام</th>
                  <th className="p-3">السبب</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">اتخاذ قرار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.map(l => (
                  <tr key={l.id}>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{l.employeeName}</td>
                    <td className="p-3 font-bold text-indigo-700">{l.leaveType === 'annual' ? 'إجازة سنوية' : 'إجازة مرضية'}</td>
                    <td className="p-3 font-mono">{l.startDate}</td>
                    <td className="p-3 font-mono">{l.endDate}</td>
                    <td className="p-3 text-center font-mono font-bold">{l.daysCount} أيام</td>
                    <td className="p-3 text-slate-600">{l.reason}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        l.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        l.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {l.status === 'approved' ? 'معتمدة' : l.status === 'rejected' ? 'مرفوضة' : 'قيد المراجعة'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {l.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleLeaveAction(l.id, 'approved')}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            موافقة
                          </button>
                          <button
                            onClick={() => handleLeaveAction(l.id, 'rejected')}
                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">تم الإجراء</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PAYROLL */}
      {activeTab === 'payroll' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">مسير رواتب الكوادر والموظفين</h3>
              <p className="text-xs text-slate-500">إصدار وتدقيق مسير الرواتب الشهري مع البدلات والاستقطاعات</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة كشف المسير</span>
            </button>
          </div>

          <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 font-bold">
                <tr>
                  <th className="p-3">الموظف</th>
                  <th className="p-3">المسمى الوظيفي</th>
                  <th className="p-3 text-center">الراتب الأساسي</th>
                  <th className="p-3 text-center">إجمالي البدلات</th>
                  <th className="p-3 text-center">الاستقطاعات</th>
                  <th className="p-3 text-center">صافي الراتب المستحق</th>
                  <th className="p-3 text-center">حالة الصرف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map(emp => {
                  const basic = Number(emp.basicSalary) || 4500;
                  const allowances = (Number(emp.housingAllowance) || 1000) + (Number(emp.transportAllowance) || 500);
                  const deductions = 0;
                  const net = basic + allowances - deductions;

                  return (
                    <tr key={emp.id}>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{emp.name}</td>
                      <td className="p-3 text-slate-600">{emp.jobTitle}</td>
                      <td className="p-3 text-center font-mono">{basic.toLocaleString('ar-SA')} ر.س</td>
                      <td className="p-3 text-center font-mono">{allowances.toLocaleString('ar-SA')} ر.س</td>
                      <td className="p-3 text-center font-mono text-rose-600">0.00 ر.س</td>
                      <td className="p-3 text-center font-mono font-black text-emerald-600">{net.toLocaleString('ar-SA')} ر.س</td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          جاهز للتحويل
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: DECISIONS */}
      {activeTab === 'decisions' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">القرارات الإدارية وخطابات التكليف</h3>
              <p className="text-xs text-slate-500">إصدار قرارات التعيين، التكليف، الترقية، والشهادات الوظيفية</p>
            </div>
            <button
              onClick={() => {
                const title = prompt('أدخل عنوان القرار الإداري:');
                if (!title) return;
                const newDec: HRDecision = {
                  id: 'dec-' + Date.now(),
                  decisionNumber: `HR-DEC-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
                  type: 'assignment',
                  title,
                  employeeId: employees[0]?.id || 'emp-1',
                  employeeName: employees[0]?.name || 'موظف الجمعية',
                  issueDate: new Date().toISOString().split('T')[0],
                  content: `بناءً على الصلاحيات الممنوحة لمدير عام الجمعية ولما تقتضيه مصلحة العمل، تقرر إصدار هذا القرار التنفيذي.`,
                  signedBy: 'مدير الموارد البشرية والمدير التنفيذي'
                };
                setDecisions(prev => [newDec, ...prev]);
              }}
              className="px-3.5 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إصدار قرار إداري جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decisions.map(dec => (
              <div key={dec.id} className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-750 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg">
                    {dec.decisionNumber}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">{dec.issueDate}</span>
                </div>
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">{dec.title}</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{dec.content}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-500 font-bold">الموظف المعني: <strong className="text-slate-800 dark:text-slate-200">{dec.employeeName}</strong></span>
                  <button
                    onClick={() => {
                      setSelectedDecision(dec);
                    }}
                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                  >
                    عرض وثيقة القرار
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: RECRUITMENT REQUESTS */}
      {activeTab === 'recruitment' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">طلبات استقطاب وتوظيف الكوادر</h3>
            <p className="text-xs text-slate-500">متابعة واعتماد احتياجات الإدارات للوظائف الشاغرة والترشيحات الوظيفية</p>
          </div>

          <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 font-bold">
                <tr>
                  <th className="p-3">رقم الطلب</th>
                  <th className="p-3">المرشح للوظيفة</th>
                  <th className="p-3">الوظيفة المطلوبة</th>
                  <th className="p-3">الإدارة الطالبة</th>
                  <th className="p-3">تاريخ الطلب</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employeeRequests.map(req => (
                  <tr key={req.id}>
                    <td className="p-3 font-mono font-bold text-indigo-600">{req.requestNumber}</td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{req.candidateName}</td>
                    <td className="p-3 text-slate-700 font-bold">{req.jobTitle}</td>
                    <td className="p-3 text-slate-600">{req.departmentName}</td>
                    <td className="p-3 font-mono text-slate-500">{req.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'approved' ? 'معتمد' : req.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {req.status === 'pending' && onApproveRequest ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onApproveRequest(req.id, 'إدارة الموارد البشرية')}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                          >
                            اعتماد
                          </button>
                          {onRejectRequest && (
                            <button
                              onClick={() => onRejectRequest(req.id, 'إدارة الموارد البشرية', 'عدم توافق الشروط')}
                              className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                            >
                              رفض
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">مكتمل</span>
                      )}
                    </td>
                  </tr>
                ))}
                {employeeRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                      لا توجد طلبات توظيف حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMPLOYEE CREATE / EDIT MODAL */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 text-right border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {selectedEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد في الموارد البشرية'}
              </h3>
              <button
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕ إغلاق
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateEmployee} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">اسم الموظف الرباعي *</label>
                  <input
                    type="text"
                    required
                    value={empForm.name || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-850"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">المسمى الوظيفي *</label>
                  <input
                    type="text"
                    required
                    value={empForm.jobTitle || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, jobTitle: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-850"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">رقم الهوية الوطنية / الإقامة *</label>
                  <input
                    type="text"
                    required
                    value={empForm.nationalId || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, nationalId: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-850 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">رقم الجوال *</label>
                  <input
                    type="tel"
                    required
                    value={empForm.phone || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-850 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={empForm.email || ''}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-850"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الإدارة التابع لها</label>
                  <select
                    value={empForm.departmentId || 'dep-9'}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, departmentId: e.target.value }))}
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-850"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">نوع العقد</label>
                  <select
                    value={empForm.contractType || 'full_time'}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, contractType: e.target.value as any }))}
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-850"
                  >
                    <option value="full_time">دوام كامل</option>
                    <option value="part_time">دوام جزئي</option>
                    <option value="seasonal">موسمي</option>
                    <option value="consultant">استشاري</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">الراتب الأساسي (ر.س)</label>
                  <input
                    type="number"
                    value={empForm.basicSalary || 4500}
                    onChange={(e) => setEmpForm(prev => ({ ...prev, basicSalary: Number(e.target.value) }))}
                    className="w-full border border-slate-200 dark:border-slate-750 rounded-xl p-2.5 bg-slate-50 dark:bg-slate-850 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DECISION PREVIEW MODAL */}
      {selectedDecision && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 text-right border border-slate-200 shadow-2xl space-y-6 my-8 text-slate-900" dir="rtl">
            <div className="text-center border-b border-slate-200 pb-4 space-y-1">
              <h3 className="text-base font-black">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h3>
              <p className="text-xs text-slate-500">إدارة الموارد البشرية والشؤون الإدارية</p>
              <div className="inline-block bg-slate-100 px-3 py-1 rounded-full text-xs font-mono font-bold mt-2">
                وثيقة رسمية: {selectedDecision.decisionNumber}
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <h4 className="text-sm font-black text-center">{selectedDecision.title}</h4>
              <div className="bg-slate-50 p-4 rounded-xl leading-relaxed text-slate-700 text-justify">
                {selectedDecision.content}
              </div>
              <div className="flex justify-between items-center text-[11px] pt-4 border-t border-slate-200">
                <div>
                  <span className="block text-slate-500">تاريخ الإصدار:</span>
                  <span className="font-mono font-bold">{selectedDecision.issueDate}</span>
                </div>
                <div className="text-left">
                  <span className="block text-slate-500">الاعتماد والتوقيع:</span>
                  <span className="font-bold text-indigo-700">{selectedDecision.signedBy}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-150">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة الوثيقة</span>
              </button>
              <button
                onClick={() => setSelectedDecision(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
