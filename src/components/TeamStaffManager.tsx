import React, { useState } from 'react';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Shield, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Phone, 
  Briefcase, 
  Building2, 
  Tag,
  AlertCircle
} from 'lucide-react';
import { VolunteerTeam, Department, Employee, TeamStaffAssignment } from '../types';

interface TeamStaffManagerProps {
  currentTeam: VolunteerTeam;
  currentDepartment?: Department;
  employees: Employee[];
  teamStaffAssignments: TeamStaffAssignment[];
  currentLeaderName: string;
  onAssignStaff: (data: {
    teamId: string;
    teamName: string;
    employeeId: string;
    teamRole: string;
    assignedByLeaderName: string;
    notes?: string;
  }) => Promise<boolean>;
  onRemoveStaff: (assignmentId: string) => Promise<boolean>;
}

const COMMON_TEAM_ROLES = [
  'مسؤول الحضور والميدان والباركود',
  'منسق المبادرات والفعاليات',
  'مسؤول الدعم اللوجستي والتجهيزات',
  'مسؤول التوثيق والإعلام الميداني',
  'مسؤول السلامة والصحة الميدانية',
  'مسؤول رعاية وإرشاد المتطوعين'
];

export const TeamStaffManager: React.FC<TeamStaffManagerProps> = ({
  currentTeam,
  currentDepartment,
  employees = [],
  teamStaffAssignments = [],
  currentLeaderName,
  onAssignStaff,
  onRemoveStaff
}) => {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [teamRole, setTeamRole] = useState(COMMON_TEAM_ROLES[0]);
  const [customRole, setCustomRole] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter staff assigned to this team
  const myTeamAssignments = teamStaffAssignments.filter(
    a => a.teamId === currentTeam.id && a.status === 'active'
  );

  // Available employees (not already assigned to this team)
  const assignedEmployeeIds = new Set(myTeamAssignments.map(a => a.employeeId));
  const availableEmployees = employees.filter(e => !assignedEmployeeIds.has(e.id));

  const filteredAssignments = myTeamAssignments.filter(a => 
    a.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.teamRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.employeePhone && a.employeePhone.includes(searchQuery))
  );

  const handleOpenAssignModal = () => {
    if (availableEmployees.length > 0) {
      setSelectedEmployeeId(availableEmployees[0].id);
    } else {
      setSelectedEmployeeId('');
    }
    setTeamRole(COMMON_TEAM_ROLES[0]);
    setCustomRole('');
    setNotes('');
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      alert('يرجى اختيار الموظف المطلوب تعيينه');
      return;
    }

    const finalRole = teamRole === 'custom' ? customRole.trim() : teamRole;
    if (!finalRole) {
      alert('يرجى تحديد دور ومسؤولية الموظف في الفريق');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onAssignStaff({
        teamId: currentTeam.id,
        teamName: currentTeam.nameAr,
        employeeId: selectedEmployeeId,
        teamRole: finalRole,
        assignedByLeaderName: currentLeaderName,
        notes: notes.trim()
      });
      if (success) {
        setShowAssignModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (assignmentId: string, empName: string) => {
    if (confirm(`هل أنت متأكد من إلغاء تعيين الموظف (${empName}) من فريق ${currentTeam.nameAr}؟`)) {
      await onRemoveStaff(assignmentId);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white border border-neutral-200/80 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
              الهيكل الإداري والتشغيلي
            </span>
            <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-mono">
              فريق: {currentTeam.nameAr}
            </span>
          </div>
          <h3 className="text-base font-black text-neutral-800 mt-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>إدارة موظفي الفريق وتوزيع المهام والأدوار الميدانية</span>
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            توزيع الكوادر الوظيفية المعتمدة على المهام التشغيلية وإسناد الصلاحيات الميدانية بالفريق
          </p>
        </div>

        <button
          id="btn-assign-team-staff"
          type="button"
          onClick={handleOpenAssignModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>إسناد وتعيين موظف بالفريق</span>
        </button>
      </div>

      {/* Search and count bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="ابحث باسم الموظف أو الدور في الفريق..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-neutral-200 rounded-xl pr-9 pl-3 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-hidden focus:border-emerald-600"
          />
        </div>
        <div className="text-xs text-neutral-500 font-bold">
          عدد الكوادر المعينة حالياً: <span className="text-emerald-700 font-mono text-sm">{myTeamAssignments.length}</span>
        </div>
      </div>

      {/* Staff Roster Cards */}
      {filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssignments.map((assignment) => {
            const emp = employees.find(e => e.id === assignment.employeeId);
            return (
              <div
                key={assignment.id}
                className="bg-white border border-neutral-200/90 rounded-2xl p-4.5 hover:border-emerald-500 transition-all shadow-xs space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black text-sm border border-emerald-100">
                      {assignment.employeeName.split(' ')[0][0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900">{assignment.employeeName}</h4>
                      <span className="text-[11px] text-neutral-500 block">
                        {emp?.jobTitle || assignment.employeeJobTitle || 'موظف معتمد'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemove(assignment.id, assignment.employeeName)}
                    title="إلغاء تعيين الموظف من الفريق"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer opacity-80 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Team Role Highlight Pill */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    <span>الدور المسند بالفريق:</span>
                  </div>
                  <p className="text-emerald-950 font-black mt-1 pr-5 text-[11.5px]">{assignment.teamRole}</p>
                </div>

                {/* Info block */}
                <div className="bg-neutral-50 rounded-xl p-2.5 text-[11px] space-y-1 text-neutral-600 border border-neutral-100">
                  {emp?.employeeNumber && (
                    <div className="flex justify-between">
                      <span>الرقم الوظيفي:</span>
                      <span className="font-mono font-bold text-neutral-800">{emp.employeeNumber}</span>
                    </div>
                  )}
                  {assignment.employeeNationalId && (
                    <div className="flex justify-between">
                      <span>الهوية الوطنية:</span>
                      <span className="font-mono text-neutral-700">{assignment.employeeNationalId}</span>
                    </div>
                  )}
                  {assignment.employeePhone && (
                    <div className="flex justify-between">
                      <span>الجوال:</span>
                      <span className="font-mono text-neutral-700">{assignment.employeePhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>تاريخ التعيين:</span>
                    <span className="font-mono text-neutral-500">
                      {new Date(assignment.assignedAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>

                {assignment.notes && (
                  <p className="text-[10.5px] text-neutral-500 bg-neutral-50 p-2 rounded-lg leading-relaxed">
                    <strong>ملاحظات: </strong> {assignment.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-400 space-y-3 shadow-xs">
          <Users className="w-12 h-12 mx-auto text-neutral-300" />
          <p className="text-sm font-bold text-neutral-700">لم يتم تعيين موظفين أو كوادر إدارية في هذا الفريق بعد</p>
          <p className="text-xs text-neutral-500">
            يمكن لقائد الفريق إسناد الموظفين المعتمدين من الجمعية للمهام الميدانية والتنظيمية عبر زر الإسناد أعلاه.
          </p>
          <button
            onClick={handleOpenAssignModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>تعيين أول موظف بالفريق</span>
          </button>
        </div>
      )}

      {/* ASSIGN MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 shadow-xl border border-neutral-100 animate-scale-up" dir="rtl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-base font-black text-neutral-800 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  <span>تعيين موظف وإسناد دور في {currentTeam.nameAr}</span>
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">اختر الموظف وحدد مسؤوليته التنظيمية داخل الفريق</p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {availableEmployees.length > 0 ? (
              <form onSubmit={handleAssignSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="text-neutral-700 font-bold block mb-1">الموظف المعتمد المراد تعيينه *</label>
                  <select
                    required
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-hidden focus:border-emerald-600"
                  >
                    {availableEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - {emp.jobTitle} ({emp.employeeNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-neutral-700 font-bold block mb-1">الدور والمسؤولية في الفريق *</label>
                  <select
                    value={teamRole}
                    onChange={(e) => setTeamRole(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-hidden focus:border-emerald-600"
                  >
                    {COMMON_TEAM_ROLES.map((r, i) => (
                      <option key={i} value={r}>{r}</option>
                    ))}
                    <option value="custom">مسمى ومسؤولية مخصصة أخرى...</option>
                  </select>
                </div>

                {teamRole === 'custom' && (
                  <div>
                    <label className="text-neutral-700 font-bold block mb-1">اكتب المسمى والمسؤولية المخصصة *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: منسق الشراكات الميدانية بالفريق..."
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-hidden focus:border-emerald-600"
                    />
                  </div>
                )}

                <div>
                  <label className="text-neutral-700 font-bold block mb-1">ملاحظات وتوجيهات قائد الفريق</label>
                  <textarea
                    rows={2}
                    placeholder="تعليمات أو نطاق اختصاص محدد للموظف..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-800 focus:outline-hidden focus:border-emerald-600"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-neutral-100">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmitting ? 'جاري التعيين...' : 'تأكيد التعيين في الفريق'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold rounded-xl transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center text-neutral-500 space-y-2">
                <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
                <p className="text-xs font-bold">جميع الموظفين المعتمدين في النظام تم تعيينهم بالفعل أو لا يوجد موظفون متاحون حالياً.</p>
                <p className="text-[11px] text-neutral-400">يمكن للإدارات رفع طلبات تعيين موظفين جدد لاعتمادها من الإدارة العليا.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
