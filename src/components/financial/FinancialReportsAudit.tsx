import React, { useState } from 'react';
import {
  FinancialIncome,
  FinancialExpense,
  FinancialAccount,
  FinancialBudget,
  FinancialAuditLog,
  FinancialSettings
} from '../../types/finance';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  UserCheck
} from 'lucide-react';

interface FinancialReportsAuditProps {
  income: FinancialIncome[];
  expenses: FinancialExpense[];
  accounts: FinancialAccount[];
  budgets: FinancialBudget[];
  auditLogs: FinancialAuditLog[];
  settings?: FinancialSettings;
  onUpdateSettings: (settings: Partial<FinancialSettings>) => Promise<void>;
  currentUser: any;
}

export const FinancialReportsAudit: React.FC<FinancialReportsAuditProps> = ({
  income,
  expenses,
  accounts,
  budgets,
  auditLogs,
  settings,
  onUpdateSettings,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'statement' | 'audit' | 'settings'>('statement');
  const [dateRange, setDateRange] = useState({
    start: '2026-01-01',
    end: new Date().toISOString().split('T')[0]
  });
  const [auditSearch, setAuditSearch] = useState('');

  // Financial Statement Calculations
  const filteredIncome = income.filter(i => (!dateRange.start || i.date >= dateRange.start) && (!dateRange.end || i.date <= dateRange.end));
  const filteredExpenses = expenses.filter(e => (!dateRange.start || e.date >= dateRange.start) && (!dateRange.end || e.date <= dateRange.end));

  const totalIncome = filteredIncome.reduce((acc, i) => acc + (i.status === 'completed' ? Number(i.amount || 0) : 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.status === 'paid' ? Number(e.amount || 0) : 0), 0);
  const netSurplus = totalIncome - totalExpenses;

  // Filtered Audit Logs
  const filteredAudit = auditLogs.filter(log => {
    return (
      log.summary.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.userName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase())
    );
  });

  const handleExportCSV = () => {
    const rows = [
      ['النوع', 'الرقم المرجعي', 'البيان', 'الطرف', 'المبلغ (ريال)', 'التاريخ', 'الحساب']
    ];

    filteredIncome.forEach(i => {
      rows.push(['إيراد', i.operationNumber, i.source, i.donorName, String(i.amount), i.date, i.accountName]);
    });

    filteredExpenses.forEach(e => {
      rows.push(['مصروف', e.expenseNumber, e.description, e.beneficiaryName, String(e.amount), e.date, e.accountName || '']);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_report_${dateRange.start}_to_${dateRange.end}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs no-print">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>التقارير المالية الختامية، القوائم، وسجل التدقيق الرقابي</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            استخراج قائمة الإيرادات والمصروفات، الفائض المالي، تقرير الحسابات، وسجل العمليات غير القابل للتعديل
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>تصدير Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 no-print">
        <button
          onClick={() => setActiveTab('statement')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'statement' ? 'bg-emerald-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
          قائمة الإيرادات والمصروفات (القوائم المالية)
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${activeTab === 'audit' ? 'bg-emerald-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
          سجل التدقيق الرقابي Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* STATEMENT TAB */}
      {activeTab === 'statement' && (
        <div className="space-y-6">
          {/* Filter dates */}
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-wrap items-center justify-between gap-4 no-print">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-neutral-700 dark:text-neutral-300">فترة التقرير:</span>
              <div className="flex items-center gap-2">
                <span>من:</span>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>إلى:</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs"
                />
              </div>
            </div>

            <span className="text-xs text-neutral-500">
              العملة الرسمية: ريال سعودي (SAR)
            </span>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">إجمالي الإيرادات المقبوضة</span>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
                {totalIncome.toLocaleString()} ريال
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">إجمالي المصروفات المنفذة</span>
                <TrendingDown className="w-5 h-5 text-rose-500" />
              </div>
              <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-2">
                {totalExpenses.toLocaleString()} ريال
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-500">صافي الفائض / (العجز) للفترة</span>
                <ShieldCheck className="w-5 h-5 text-teal-500" />
              </div>
              <div className={`text-2xl font-black font-mono mt-2 ${netSurplus >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600'}`}>
                {netSurplus.toLocaleString()} ريال
              </div>
            </div>
          </div>

          {/* Statement Detailed Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
            <div className="border-b-2 border-emerald-600 pb-4 mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  قائمة المركز والأنشطة المالية (ملخص الإيرادات والمصروفات)
                </h3>
                <span className="text-xs text-neutral-500">
                  للفترة من {dateRange.start} حتى {dateRange.end}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400">
                جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - ترخيص 100054219
              </div>
            </div>

            <div className="space-y-6 text-xs">
              {/* Income breakdown */}
              <div>
                <div className="font-bold text-sm text-emerald-700 dark:text-emerald-400 mb-2 pb-1 border-b border-emerald-100 dark:border-emerald-950">
                  أولاً: الإيرادات والتبرعات الواردة
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredIncome.slice(0, 5).map(i => (
                    <div key={i.id} className="py-2 flex justify-between">
                      <span className="text-neutral-700 dark:text-neutral-300">{i.donorName} ({i.source})</span>
                      <span className="font-mono font-bold">{i.amount.toLocaleString()} ريال</span>
                    </div>
                  ))}
                  <div className="py-2 flex justify-between font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 rounded-lg">
                    <span>إجمالي الإيرادات للفترة:</span>
                    <span className="font-mono">{totalIncome.toLocaleString()} ريال</span>
                  </div>
                </div>
              </div>

              {/* Expense breakdown */}
              <div>
                <div className="font-bold text-sm text-rose-700 dark:text-rose-400 mb-2 pb-1 border-b border-rose-100 dark:border-rose-950">
                  ثانياً: المصروفات والنفقات التشغيلية والبرامجية
                </div>
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredExpenses.slice(0, 5).map(e => (
                    <div key={e.id} className="py-2 flex justify-between">
                      <span className="text-neutral-700 dark:text-neutral-300">{e.description} ({e.beneficiaryName})</span>
                      <span className="font-mono font-bold">{e.amount.toLocaleString()} ريال</span>
                    </div>
                  ))}
                  <div className="py-2 flex justify-between font-bold text-rose-700 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 px-2 rounded-lg">
                    <span>إجمالي المصروفات للفترة:</span>
                    <span className="font-mono">{totalExpenses.toLocaleString()} ريال</span>
                  </div>
                </div>
              </div>

              {/* Final net row */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex justify-between items-center text-sm font-bold">
                <span>صافي الفائض المحقق للفترة:</span>
                <span className={`font-mono text-base ${netSurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                  {netSurplus.toLocaleString()} ريال سعودي
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
              <input
                type="text"
                value={auditSearch}
                onChange={e => setAuditSearch(e.target.value)}
                placeholder="بحث في سجل التدقيق المالي، اسم المسؤول، أو نوع العملية..."
                className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>سجل محمي ومؤرخ زمنيًا</span>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="p-3">التاريخ والوقت</th>
                    <th className="p-3">المسؤول</th>
                    <th className="p-3">الصفة والصلاحية</th>
                    <th className="p-3">العملية المنجزة</th>
                    <th className="p-3">التفاصيل الرقابية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {filteredAudit.map(log => (
                    <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                      <td className="p-3 font-mono text-neutral-500">
                        {new Date(log.timestamp).toLocaleString('ar-SA')}
                      </td>
                      <td className="p-3 font-bold text-neutral-900 dark:text-white">
                        {log.userName}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {log.userRole}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">
                        {log.action}
                      </td>
                      <td className="p-3 text-neutral-600 dark:text-neutral-300 max-w-md truncate">
                        {log.summary}
                      </td>
                    </tr>
                  ))}
                  {filteredAudit.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-neutral-400">
                        لا توجد سجلات تدقيق تطابق البحث
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
