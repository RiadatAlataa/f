import React, { useState } from 'react';
import {
  FinancialPayroll,
  PayrollEmployeeRecord,
  FinancialAccount
} from '../../types/finance';
import {
  Users,
  Plus,
  CheckCircle2,
  Calendar,
  CreditCard,
  Download,
  AlertCircle,
  Clock,
  X,
  ShieldCheck,
  Printer
} from 'lucide-react';

interface FinancialPayrollManagerProps {
  payrollMonths: FinancialPayroll[];
  accounts: FinancialAccount[];
  onGeneratePayroll: (month: string, notes?: string) => Promise<void>;
  onDisbursePayroll: (payrollId: string, accountId: string) => Promise<void>;
  currentUser: any;
}

export const FinancialPayrollManager: React.FC<FinancialPayrollManagerProps> = ({
  payrollMonths,
  accounts,
  onGeneratePayroll,
  onDisbursePayroll,
  currentUser
}) => {
  const [isGenerateModal, setIsGenerateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [selectedPayroll, setSelectedPayroll] = useState<FinancialPayroll | null>(null);
  const [disbursementAccountId, setDisbursementAccountId] = useState(accounts[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGenerate = async () => {
    setIsSubmitting(true);
    try {
      await onGeneratePayroll(selectedMonth, 'مسير تم إعداده وفق سجل الموظفين الحالي');
      setIsGenerateModal(false);
    } catch (err: any) {
      alert(err.message || 'فشل في إعداد مسير الرواتب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisburse = async () => {
    if (!selectedPayroll) return;
    setIsSubmitting(true);
    try {
      await onDisbursePayroll(selectedPayroll.id, disbursementAccountId);
      setSelectedPayroll(null);
    } catch (err: any) {
      alert(err.message || 'فشل في صرف الرواتب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>نظام الرواتب والأجور الشهرية والبدلات (حماية الأجور WPS)</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            إعداد مسيرات الرواتب الشهرية، المكافآت، البدلات، والاستقطاعات واعتماد الصرف عبر الحسابات البنكية المعتمدة
          </p>
        </div>

        <button
          onClick={() => setIsGenerateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>إعداد مسير رواتب شهري جديد</span>
        </button>
      </div>

      {/* Payroll Months Cards */}
      <div className="space-y-4">
        {payrollMonths.map(pr => (
          <div
            key={pr.id}
            className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold font-mono">
                  {pr.month ? pr.month.split('-')[1] || '09' : '09'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {pr.title || `مسير رواتب وأجور شهر: ${pr.month}`}
                  </h3>
                  <div className="text-xs text-neutral-500">
                    رقم المسير: {pr.payrollNumber} • عدد الموظفين: {(pr.employees || []).length} موظف
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  pr.status === 'paid'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : pr.status === 'approved'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {pr.status === 'paid' ? 'تم الصرف والتحويل للبنوك' : pr.status === 'approved' ? 'معتمد (بانتظار الصرف)' : 'مسودة قيد المراجعة'}
                </span>

                {pr.status !== 'paid' && (
                  <button
                    onClick={() => setSelectedPayroll(pr)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    صرف المسير الآن
                  </button>
                )}
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                <span className="text-neutral-500 block">إجمالي الرواتب الأساسية:</span>
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                  {Number(pr.totalBasic || 0).toLocaleString()} ريال
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                <span className="text-neutral-500 block">إجمالي البدلات والمكافآت:</span>
                <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200 text-sm">
                  {(Number(pr.totalAllowances || 0) + Number(pr.totalBonuses || 0)).toLocaleString()} ريال
                </span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/40">
                <span className="text-neutral-500 block">إجمالي الاستقطاعات:</span>
                <span className="font-mono font-bold text-rose-500 text-sm">
                  {Number(pr.totalDeductions || 0).toLocaleString()} ريال
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <span className="text-emerald-800 dark:text-emerald-300 block font-bold">صافي المسير المستحق:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                  {Number(pr.totalNet || 0).toLocaleString()} ريال
                </span>
              </div>
            </div>

            {/* Employees Breakdown Table */}
            <div className="overflow-x-auto border border-neutral-100 dark:border-neutral-800 rounded-xl">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="p-2.5">الموظف</th>
                    <th className="p-2.5">المسمى الوظيفي</th>
                    <th className="p-2.5">الأساسي</th>
                    <th className="p-2.5">البدلات والمكافآت</th>
                    <th className="p-2.5">الخصم</th>
                    <th className="p-2.5 font-bold">الصافي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {(pr.employees || []).map((item: PayrollEmployeeRecord) => (
                    <tr key={item.id || item.employeeId}>
                      <td className="p-2.5 font-bold text-neutral-900 dark:text-white">{item.employeeName}</td>
                      <td className="p-2.5 text-neutral-500">{item.jobTitle}</td>
                      <td className="p-2.5 font-mono">{Number(item.basicSalary || 0).toLocaleString()} ر.س</td>
                      <td className="p-2.5 font-mono text-emerald-600">+{(Number(item.allowances || 0) + Number(item.bonuses || 0)).toLocaleString()} ر.س</td>
                      <td className="p-2.5 font-mono text-rose-500">-{Number(item.deductions || 0).toLocaleString()} ر.س</td>
                      <td className="p-2.5 font-mono font-bold text-neutral-900 dark:text-white">{Number(item.netSalary || 0).toLocaleString()} ريال</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Generate Payroll Modal */}
      {isGenerateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span>إعداد مسير رواتب شهري جديد</span>
              </h3>
              <button
                onClick={() => setIsGenerateModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">حدد الشهر المالي *</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 leading-relaxed">
                سيقوم النظام تلقائياً باحتساب الرواتب والبدلات استناداً إلى بيانات موظفي الجمعية المسجلين بالنظام وتجهيز المسير للمراجعة والاعتماد المالي.
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModal(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري التوليد...' : 'توليد المسير الآن'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disburse Modal */}
      {selectedPayroll && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    اعتماد وصرف مسير رواتب شهر {selectedPayroll.month}
                  </h3>
                  <div className="text-neutral-500">المبلغ الإجمالي: {Number(selectedPayroll.totalNet || 0).toLocaleString()} ريال</div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  اختر الحساب البنكي المسحوب منه الرواتب *
                </label>
                <select
                  value={disbursementAccountId}
                  onChange={e => setDisbursementAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  {accounts.map(a => (
                    <option key={a.id} value={a.id} disabled={a.currentBalance < selectedPayroll.totalNet}>
                      {a.name} (رصيده: {a.currentBalance.toLocaleString()} ر.س)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setSelectedPayroll(null)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDisburse}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري التحويل...' : 'تأكيد وصرف الرواتب'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
