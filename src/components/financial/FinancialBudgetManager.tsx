import React, { useState } from 'react';
import {
  FinancialBudget,
  FinancialExpense,
  BudgetPeriod
} from '../../types/finance';
import {
  PieChart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  TrendingUp,
  X,
  Lock,
  ChevronDown
} from 'lucide-react';

interface FinancialBudgetManagerProps {
  budgets: FinancialBudget[];
  expenses: FinancialExpense[];
  onSaveBudget: (data: Partial<FinancialBudget>) => Promise<void>;
  currentUser: any;
}

export const FinancialBudgetManager: React.FC<FinancialBudgetManagerProps> = ({
  budgets,
  expenses,
  onSaveBudget,
  currentUser
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Budget State
  const [formData, setFormData] = useState({
    name: '',
    category: 'برامج ومشاريع خيرية',
    year: new Date().getFullYear(),
    period: 'annual' as BudgetPeriod,
    approvedAmount: '',
    notes: ''
  });

  const totalAllocated = budgets.reduce((acc, b) => acc + (b.approvedAmount || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spentAmount || 0), 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overallRatio = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.approvedAmount) {
      alert('يرجى كتابة اسم البند/الميزانية والمبلغ المعتمد');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveBudget({
        ...formData,
        approvedAmount: Number(formData.approvedAmount),
        spentAmount: 0,
        remainingAmount: Number(formData.approvedAmount),
        status: 'active',
        user: currentUser
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        category: 'برامج ومشاريع خيرية',
        year: new Date().getFullYear(),
        period: 'annual',
        approvedAmount: '',
        notes: ''
      });
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ الميزانية');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-teal-600" />
            <span>إدارة الميزانيات التقديرية ومراقبة انحرافات الصرف</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            تخصيص ميزانيات البرامج التشغيلية والمشاريع ومتابعة نسب الاستهلاك وتنبيهات تجاوز السقف
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>اعتماد بند ميزانية جديد</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs text-neutral-500 mb-1">إجمالي المخصص المعتمد</div>
          <div className="text-xl font-bold font-mono text-neutral-900 dark:text-white">
            {totalAllocated.toLocaleString()} ريال
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs text-neutral-500 mb-1">إجمالي المصروف الفعلي</div>
          <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {totalSpent.toLocaleString()} ريال
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs text-neutral-500 mb-1">الرصيد المتبقي بالميزانية</div>
          <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {totalRemaining.toLocaleString()} ريال
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs text-neutral-500 mb-1">نسبة الاستهلاك العام</div>
          <div className="text-xl font-bold font-mono text-teal-600 dark:text-teal-400">
            {overallRatio}%
          </div>
        </div>
      </div>

      {/* Budgets List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map(b => {
          const ratio = Math.min(Math.round((b.spentAmount / (b.approvedAmount || 1)) * 100), 100);
          const remaining = b.approvedAmount - b.spentAmount;
          const isDanger = ratio >= 90;
          const isWarning = ratio >= 80 && ratio < 90;

          return (
            <div
              key={b.id}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {b.category}
                    </span>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white mt-1">
                      {b.name}
                    </h3>
                  </div>

                  {isDanger ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" />
                      تجاوز الحذر
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                      في المسار السليم
                    </span>
                  )}
                </div>

                {/* Progress Visualizer */}
                <div className="space-y-1.5 my-4">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-neutral-500">نسبة الصرف:</span>
                    <span className={`font-bold ${isDanger ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {ratio}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-teal-500'}`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>

                {/* Numbers Breakdown */}
                <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300 pt-2 border-t border-neutral-100 dark:border-neutral-800 font-mono">
                  <div className="flex justify-between">
                    <span className="font-sans text-neutral-400">المعتمد:</span>
                    <span className="font-bold">{b.approvedAmount.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-sans text-neutral-400">المصروف:</span>
                    <span className="text-rose-500">{b.spentAmount.toLocaleString()} ريال</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                    <span className="font-sans text-neutral-400 font-bold">المتبقي:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{remaining.toLocaleString()} ريال</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-100 dark:border-neutral-800">
                <span>السنة المالية: {b.year}</span>
                <span>الحالة: {b.status === 'active' ? 'نشط ومفعل' : 'مغلق'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal New Budget */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>اعتماد ميزانية تقديرية جديدة</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">اسم بند الميزانية / المشروع *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: ميزانية برنامج إفطار صائم 1447هـ..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">التصنيف *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="برامج ومشاريع خيرية">برامج ومشاريع خيرية</option>
                    <option value="مصاريف عمومية وإدارية">مصاريف عمومية وإدارية</option>
                    <option value="رواتب وأجور">رواتب وأجور</option>
                    <option value="تسويق وتنمية موارد">تسويق وتنمية موارد</option>
                    <option value="صيانة وتشغيل">صيانة وتشغيل</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">المبلغ المعتمد (ريال) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.approvedAmount}
                    onChange={e => setFormData({ ...formData, approvedAmount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 font-mono font-bold text-teal-600 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">السنة المالية</label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">الفترة</label>
                  <select
                    value={formData.period}
                    onChange={e => setFormData({ ...formData, period: e.target.value as BudgetPeriod })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="annual">سنوية كاملة</option>
                    <option value="quarterly">ربع سنوية</option>
                    <option value="project_based">حسب مدة المشروع</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">ملاحظات وقرار الاعتماد</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="رقم قرار مجلس الإدارة أو التوجيه..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الاعتماد...' : 'اعتماد الميزانية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
