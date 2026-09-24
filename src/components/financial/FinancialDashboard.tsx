import React, { useState } from 'react';
import {
  FinancialAccount,
  FinancialIncome,
  FinancialExpense,
  FinancialBudget,
  FinancialPayable,
  FinancialAuditLog
} from '../../types/finance';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  HeartHandshake,
  AlertTriangle,
  Clock,
  FileCheck2,
  Calendar,
  Layers,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft
} from 'lucide-react';

interface FinancialDashboardProps {
  accounts: FinancialAccount[];
  income: FinancialIncome[];
  expenses: FinancialExpense[];
  budgets: FinancialBudget[];
  payables: FinancialPayable[];
  auditLogs: FinancialAuditLog[];
  onNavigateTab: (tabId: string) => void;
  onOpenNewExpense: () => void;
  onOpenNewIncome: () => void;
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  accounts,
  income,
  expenses,
  budgets,
  payables,
  auditLogs,
  onNavigateTab,
  onOpenNewExpense,
  onOpenNewIncome
}) => {
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'month' | 'year'>('all');

  // Filter items by period
  const filterByPeriod = (items: { date: string }[]) => {
    if (periodFilter === 'all') return items;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7);
    const currentYear = todayStr.substring(0, 4);

    return items.filter(item => {
      if (!item.date) return false;
      if (periodFilter === 'today') return item.date === todayStr;
      if (periodFilter === 'month') return item.date.startsWith(currentMonth);
      if (periodFilter === 'year') return item.date.startsWith(currentYear);
      return true;
    });
  };

  const filteredIncome = filterByPeriod(income) as FinancialIncome[];
  const filteredExpenses = filterByPeriod(expenses) as FinancialExpense[];

  // Statistics Calculations
  const totalBalance = accounts.reduce((acc, a) => acc + (a.status === 'active' ? Number(a.currentBalance || 0) : 0), 0);
  const totalIncome = filteredIncome.reduce((acc, i) => acc + (i.status === 'completed' ? Number(i.amount || 0) : 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (e.status === 'paid' ? Number(e.amount || 0) : 0), 0);
  const pendingExpenses = expenses.filter(e => e.status === 'pending_approval' || e.status === 'under_review');
  const pendingExpensesTotal = pendingExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);

  const totalDonations = filteredIncome.filter(i => i.type === 'donation' || i.type === 'grant');
  const totalDonationsAmount = totalDonations.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const restrictedDonationsAmount = filteredIncome.filter(i => i.isRestricted).reduce((acc, i) => acc + Number(i.amount || 0), 0);

  const pendingPayables = payables.filter(p => !p.isPaid);
  const totalPayablesDue = pendingPayables.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  // Critical Alerts
  const highRiskBudgets = budgets.filter(b => {
    if (b.status === 'closed') return false;
    const ratio = (b.spentAmount / (b.approvedAmount || 1)) * 100;
    return ratio >= 80;
  });

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Banner: Overview & Time Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold mb-1">
            <Layers className="w-4 h-4" />
            <span>نظام الإدارة المالية والرقابة المحاسبية الذكية</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black">
            الملخص المالي الشامل للجمعية
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-xl">
            متابعة فورية ومباشرة للأرصدة البنكية، مسارات الصرف المعتمدة، استهلاك الميزانيات، والتبرعات الواردة
          </p>
        </div>

        {/* Action Buttons & Period Pills */}
        <div className="relative z-10 flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-1 flex items-center border border-white/20 text-xs font-medium">
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${periodFilter === 'all' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-white/80 hover:text-white'}`}
            >
              الكل
            </button>
            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${periodFilter === 'month' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-white/80 hover:text-white'}`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setPeriodFilter('year')}
              className={`px-3 py-1.5 rounded-lg transition-all ${periodFilter === 'year' ? 'bg-white text-emerald-900 font-bold shadow-xs' : 'text-white/80 hover:text-white'}`}
            >
              هذا العام
            </button>
          </div>

          <button
            onClick={onOpenNewIncome}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>تسجيل إيراد / تبرع</span>
          </button>

          <button
            onClick={onOpenNewExpense}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/90 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>طلب صرف جديد</span>
          </button>
        </div>
      </div>

      {/* Critical Warnings / Smart Alerts */}
      {(pendingExpenses.length > 0 || highRiskBudgets.length > 0 || pendingPayables.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pendingExpenses.length > 0 && (
            <div
              onClick={() => onNavigateTab('expenses')}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 cursor-pointer hover:shadow-xs transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {pendingExpenses.length} طلبات صرف تحتاج مراجعة واعتماد
                </div>
                <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                  إجمالي المبالغ المعلقة: {pendingExpensesTotal.toLocaleString()} ريال
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
          )}

          {highRiskBudgets.length > 0 && (
            <div
              onClick={() => onNavigateTab('budgets')}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 cursor-pointer hover:shadow-xs transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  {highRiskBudgets.length} ميزانيات اقتربت أو تجاوزت الحد
                </div>
                <div className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
                  نسبة الاستهلاك 80% وأكثر - تتطلب مراجعة
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-rose-500 shrink-0" />
            </div>
          )}

          {pendingPayables.length > 0 && (
            <div
              onClick={() => onNavigateTab('payables')}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 cursor-pointer hover:shadow-xs transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  {pendingPayables.length} مبالغ والتزامات مستحقة السداد
                </div>
                <div className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80">
                  إجمالي المستحقات: {totalPayablesDue.toLocaleString()} ريال
                </div>
              </div>
              <ChevronLeft className="w-4 h-4 text-indigo-500 shrink-0" />
            </div>
          )}
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Available Balance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">الرصيد الفعلي الحالي</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-neutral-900 dark:text-white">
              {totalBalance.toLocaleString()} <span className="text-xs font-normal text-neutral-500">ريال</span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
              <span>عبر {accounts.length} حسابات وصناديق معتمدة</span>
            </div>
          </div>
        </div>

        {/* Total Inflow / Income */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">إجمالي الإيرادات المعتمدة</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-teal-600 dark:text-teal-400">
              {totalIncome.toLocaleString()} <span className="text-xs font-normal text-neutral-500">ريال</span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              منها {totalDonationsAmount.toLocaleString()} ريال تبرعات ومنح
            </div>
          </div>
        </div>

        {/* Total Outflow / Expenses */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">إجمالي المصروفات المنفذة</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
              {totalExpenses.toLocaleString()} <span className="text-xs font-normal text-neutral-500">ريال</span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              مغطاة بسندات صرف وفواتير رسمية
            </div>
          </div>
        </div>

        {/* Restricted Donations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">التبرعات المقيدة / المخصصة</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <HeartHandshake className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {restrictedDonationsAmount.toLocaleString()} <span className="text-xs font-normal text-neutral-500">ريال</span>
            </div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
              مخصصة لمشاريع إفطار صائم والسلال
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Middle Section: Accounts Breakdown & Budgets Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  أرصدة الحسابات والصناديق
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('accounts')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
              >
                <span>إدارة الحسابات والتحويلات</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 mt-2">
              {accounts.map(acc => (
                <div key={acc.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {acc.name}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      {acc.bankName || acc.accountNumber}
                    </div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="text-sm font-bold text-neutral-900 dark:text-white">
                      {acc.currentBalance.toLocaleString()} ريال
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                      {acc.type === 'bank' ? 'بنكي' : acc.type === 'donations' ? 'تبرعات' : 'خزينة'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budgets Health Overview */}
        <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  مؤشرات استهلاك ميزانيات البرامج والمشاريع
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('budgets')}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
              >
                <span>جميع الميزانيات</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4 mt-3">
              {budgets.slice(0, 3).map(b => {
                const ratio = Math.min(Math.round((b.spentAmount / (b.approvedAmount || 1)) * 100), 100);
                const remaining = b.approvedAmount - b.spentAmount;
                const isWarning = ratio >= 80 && ratio < 90;
                const isAlert = ratio >= 90;

                return (
                  <div key={b.id} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/70 dark:border-neutral-700/60">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-neutral-800 dark:text-neutral-200">{b.name}</span>
                      <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {ratio}% استهلاك
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isAlert ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">
                      <span>المعتمد: {b.approvedAmount.toLocaleString()} ريال</span>
                      <span>المصروف: {b.spentAmount.toLocaleString()} ريال</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        المتبقي: {remaining.toLocaleString()} ريال
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Audit Logs & Transactions Activity */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              سجل التدقيق والحركات المالية الحديثة
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
          >
            <span>عرض السجل الكامل</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-100 dark:divide-neutral-800 mt-2">
          {auditLogs.slice(0, 4).map(log => (
            <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
              <div>
                <div className="font-semibold text-neutral-800 dark:text-neutral-200">
                  {log.summary}
                </div>
                <div className="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-2">
                  <span>المسؤول: {log.userName}</span>
                  <span>•</span>
                  <span>الصفة: {log.userRole}</span>
                </div>
              </div>
              <div className="text-left font-mono text-[11px] text-neutral-400 shrink-0">
                {new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                <div className="text-[10px]">{new Date(log.timestamp).toLocaleDateString('ar-SA')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
