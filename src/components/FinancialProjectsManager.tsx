import React, { useState } from "react";
import { 
  Building2, DollarSign, ArrowUpRight, ArrowDownLeft, FileSpreadsheet, 
  Plus, ShieldCheck, RefreshCw, Search, Filter, Wallet, Calendar, 
  CreditCard, CheckCircle2, TrendingUp, AlertCircle, Eye, FileText
} from "lucide-react";
import { StoreProject, StoreDonation, FinancialTransaction } from "../types";

interface FinancialProjectsManagerProps {
  projects: StoreProject[];
  donations: StoreDonation[];
  transactions: FinancialTransaction[];
  onAddExpense: (data: {
    projectId: string;
    amount: number;
    category?: string;
    vendorName: string;
    description: string;
    paymentMethod?: string;
  }) => Promise<boolean>;
  onAddProject: (project: Partial<StoreProject>) => Promise<boolean>;
  isDark?: boolean;
}

export const FinancialProjectsManager: React.FC<FinancialProjectsManagerProps> = ({
  projects = [],
  donations = [],
  transactions = [],
  onAddExpense,
  onAddProject,
  isDark = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'donations' | 'ledger'>('overview');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  // Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expProjectId, setExpProjectId] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expVendor, setExpVendor] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [expPaymentMethod, setExpPaymentMethod] = useState("تحويل بنكي رسمي");
  const [isSubmittingExp, setIsSubmittingExp] = useState(false);
  const [expError, setExpError] = useState("");

  // New Project Modal State
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [prjTitle, setPrjTitle] = useState("");
  const [prjCategory, setPrjCategory] = useState("سقيا الماء");
  const [prjTarget, setPrjTarget] = useState("100000");
  const [prjUnitPrice, setPrjUnitPrice] = useState("10");
  const [prjAccountCode, setPrjAccountCode] = useState("");
  const [prjDescription, setPrjDescription] = useState("");
  const [isSubmittingPrj, setIsSubmittingPrj] = useState(false);
  const [prjError, setPrjError] = useState("");

  // Calculated Summary Metrics
  const totalRaised = projects.reduce((acc, p) => acc + (p.raisedAmount || 0), 0);
  const totalBalance = projects.reduce((acc, p) => acc + (p.availableBalance || 0), 0);
  const totalExpenses = projects.reduce((acc, p) => acc + (p.totalExpenses || 0), 0);
  const totalDonationCount = projects.reduce((acc, p) => acc + (p.donationCount || 0), 0);

  const filteredTransactions = transactions.filter(t => {
    const matchesProject = selectedProjectId === "all" || t.projectId === selectedProjectId;
    const matchesQuery = t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.donorOrVendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.referenceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         t.accountCode?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProject && matchesQuery;
  });

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expProjectId || !expAmount || Number(expAmount) <= 0) {
      setExpError("الرجاء اختيار المشروع وتحديد مبلغ المصروف بالريال");
      return;
    }

    const selectedPrj = projects.find(p => p.id === expProjectId);
    if (selectedPrj && Number(expAmount) > (selectedPrj.availableBalance || 0)) {
      setExpError(`المبلغ المطلوب (${expAmount} ر.س) يتجاوز الرصيد المتاح بالمشروع (${selectedPrj.availableBalance} ر.س)`);
      return;
    }

    setIsSubmittingExp(true);
    setExpError("");

    try {
      const ok = await onAddExpense({
        projectId: expProjectId,
        amount: Number(expAmount),
        vendorName: expVendor || "مورد معتمد",
        description: expDescription || "مصروفات تنفيذ المبادرة ميدانياً",
        paymentMethod: expPaymentMethod
      });

      if (ok) {
        setShowExpenseModal(false);
        setExpAmount("");
        setExpVendor("");
        setExpDescription("");
      } else {
        setExpError("فشلت عملية حفظ المصروف");
      }
    } catch (err: any) {
      setExpError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setIsSubmittingExp(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prjTitle || !prjTarget) {
      setPrjError("الرجاء كتابة اسم المشروع والمبلغ المستهدف");
      return;
    }

    setIsSubmittingPrj(true);
    setPrjError("");

    try {
      const ok = await onAddProject({
        titleAr: prjTitle,
        category: prjCategory,
        targetAmount: Number(prjTarget),
        unitPrice: Number(prjUnitPrice),
        accountCode: prjAccountCode || `ACC-${Math.floor(100 + Math.random() * 899)}`,
        descriptionAr: prjDescription
      });

      if (ok) {
        setShowProjectModal(false);
        setPrjTitle("");
        setPrjDescription("");
      } else {
        setPrjError("تعذر إضافة المشروع");
      }
    } catch (err: any) {
      setPrjError(err.message || "حدث خطأ أثناء إضافة المشروع");
    } finally {
      setIsSubmittingPrj(false);
    }
  };

  return (
    <div className={`p-6 rounded-2xl ${isDark ? 'bg-slate-800 text-slate-100' : 'bg-white text-slate-800'} border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 dir-rtl`}>
      
      {/* Module Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Building2 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              منظومة الربط المالي وإدارة مشاريع المتجر
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            متابعة فورية ومباشرة لإيرادات المتجر، الحسابات المالية المستقلة لكل مشروع، وسجل المصروفات الميدانية.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>إضافة قيد مصروف مشروع</span>
          </button>

          <button
            onClick={() => setShowProjectModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع جديد للمتجر</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>إجمالي إيرادات المتجر</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {totalRaised.toLocaleString("ar-SA")} <span className="text-xs text-slate-500 font-normal">ر.س</span>
          </div>
          <div className="text-[11px] text-slate-500">إجمالي التبرعات المكتملة عبر المتجر</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>إجمالي الرصيد المتاح المتبقي</span>
            <Wallet className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
            {totalBalance.toLocaleString("ar-SA")} <span className="text-xs text-slate-500 font-normal">ر.س</span>
          </div>
          <div className="text-[11px] text-slate-500">السيولة المتاحة لتنفيذ المشاريع</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>إجمالي المصروفات المنفذة</span>
            <ArrowDownLeft className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
            {totalExpenses.toLocaleString("ar-SA")} <span className="text-xs text-slate-500 font-normal">ر.س</span>
          </div>
          <div className="text-[11px] text-slate-500">تم صرفها على الموردين والمشتروات</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>عدد التبرعات والمشاريع</span>
            <CheckCircle2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
            {totalDonationCount} <span className="text-xs text-slate-500 font-normal">عملية تبرع</span>
          </div>
          <div className="text-[11px] text-slate-500">عدد المشاريع المفتوحة: {projects.length}</div>
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'overview'
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          حسابات المشاريع المستقلة ({projects.length})
        </button>

        <button
          onClick={() => setActiveTab('donations')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'donations'
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          تبرعات المتجر الإلكتروني ({donations.length})
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ledger'
              ? "bg-emerald-600 text-white shadow"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          }`}
        >
          دفتر الأستاذ العام وتدقيق المعاملات ({transactions.length})
        </button>
      </div>

      {/* Tab 1: Project Accounts Table */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">رمز الحساب المالي</th>
                  <th className="p-3">اسم المشروع المتخصص</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3">المبلغ المستهدف</th>
                  <th className="p-3">التبرعات المجمعة</th>
                  <th className="p-3">المصروفات المنفذة</th>
                  <th className="p-3">الرصيد المتاح الان</th>
                  <th className="p-3">عدد المتبرعين</th>
                  <th className="p-3">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {projects.map((p) => {
                  const target = p.targetAmount || 1;
                  const raised = p.raisedAmount || 0;
                  const balance = p.availableBalance || 0;
                  const expenses = p.totalExpenses || 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {p.accountCode}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {p.titleAr}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-600 dark:text-slate-400">
                        {target.toLocaleString("ar-SA")} ر.س
                      </td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                        {raised.toLocaleString("ar-SA")} ر.س
                      </td>
                      <td className="p-3 font-bold text-amber-600 dark:text-amber-400">
                        {expenses.toLocaleString("ar-SA")} ر.س
                      </td>
                      <td className="p-3 font-bold text-blue-600 dark:text-blue-400">
                        {balance.toLocaleString("ar-SA")} ر.س
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">
                        {p.donationCount || 0}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => {
                            setExpProjectId(p.id);
                            setShowExpenseModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center gap-1"
                        >
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>صرف</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Donations List */}
      {activeTab === 'donations' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">رقم سند التبرع</th>
                  <th className="p-3">اسم المتبرع</th>
                  <th className="p-3">المشروع المتبرع له</th>
                  <th className="p-3">مبلغ التبرع</th>
                  <th className="p-3">وسيلة الدفع</th>
                  <th className="p-3">الرقم المرجعي (TXN)</th>
                  <th className="p-3">تاريخ ووقت التبرع</th>
                  <th className="p-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {donations.map((don) => (
                  <tr key={don.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {don.donationNumber}
                    </td>
                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                      {don.donorName}
                      {don.donorPhone && <div className="text-[10px] text-slate-400">{don.donorPhone}</div>}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {don.projectNameAr}
                    </td>
                    <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                      {don.amount.toLocaleString("ar-SA")} ر.س
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                      {don.paymentMethod.toUpperCase()}
                    </td>
                    <td className="p-3 font-mono text-xs text-slate-500">
                      {don.transactionRef}
                    </td>
                    <td className="p-3 text-slate-500">
                      {new Date(don.createdAt).toLocaleString("ar-SA")}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        مكتمل ومربوط
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Financial General Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                تصفية حسب المشروع:
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className={`py-1.5 px-3 rounded-xl text-xs outline-none ${
                  isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                } border`}
              >
                <option value="all">جميع مشاريع المتجر</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.titleAr} ({p.accountCode})</option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="بحث في دفتر الأستاذ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pr-9 pl-3 py-1.5 rounded-xl text-xs outline-none ${
                  isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-white border-slate-300 text-slate-900"
                } border`}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رمز الحساب</th>
                  <th className="p-3">نوع القيد</th>
                  <th className="p-3">الرقم المرجعي</th>
                  <th className="p-3">المشروع المرتبط</th>
                  <th className="p-3">الطرف الثاني (المتبرع / المورد)</th>
                  <th className="p-3">البيان والتفاصيل</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">طريقة السداد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="p-3 text-slate-500 font-mono">
                        {tx.date}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {tx.accountCode}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          isIncome 
                            ? "bg-emerald-100 text-emerald-800" 
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {isIncome ? "إيراد تبرع" : "مصروف تنفيذ"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {tx.referenceNumber}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {tx.projectNameAr}
                      </td>
                      <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                        {tx.donorOrVendor}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {tx.description}
                      </td>
                      <td className={`p-3 font-extrabold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {isIncome ? "+" : "-"}{tx.amount.toLocaleString("ar-SA")} ر.س
                      </td>
                      <td className="p-3 text-slate-500">
                        {tx.paymentMethod}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} border border-slate-200 dark:border-slate-700 dir-rtl space-y-4`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5" />
                <span>تسجيل قيد مصروف لمشروع</span>
              </h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اختر المشروع المستهدف:</label>
                <select
                  value={expProjectId}
                  onChange={(e) => setExpProjectId(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl outline-none ${
                    isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  } border`}
                >
                  <option value="">-- اختر المشروع --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.titleAr} (الرصيد المتاح: {p.availableBalance?.toLocaleString("ar-SA")} ر.س)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ المصروف (ريال):</label>
                <input
                  type="number"
                  placeholder="مثال: 5000"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl outline-none ${
                    isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  } border`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المورد / الجهة المنفذة:</label>
                <input
                  type="text"
                  placeholder="مثال: شركة مياه الصفا والمروة"
                  value={expVendor}
                  onChange={(e) => setExpVendor(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl outline-none ${
                    isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  } border`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">البيان والتفاصيل:</label>
                <textarea
                  rows={2}
                  placeholder="شرح وتفاصيل الفاتورة أو القيد المالي..."
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl outline-none ${
                    isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  } border`}
                />
              </div>

              {expError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                  {expError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExp}
                  className="flex-1 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  {isSubmittingExp ? "جاري الخصم والقيد..." : "اعتماد وتوثيق القيد المالي"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'} border border-slate-200 dark:border-slate-700 dir-rtl space-y-4`}>
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span>إضافة مشروع جديد بمتجر الجمعية</span>
              </h3>
              <button onClick={() => setShowProjectModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">عنوان المشروع:</label>
                <input
                  type="text"
                  placeholder="مثال: مشروع كسوة الشتاء للأسر المتعففة بالعسيلة"
                  value={prjTitle}
                  onChange={(e) => setPrjTitle(e.target.value)}
                  className={`w-full py-2 px-3 rounded-xl outline-none ${
                    isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  } border`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تصنيف المشروع:</label>
                  <select
                    value={prjCategory}
                    onChange={(e) => setPrjCategory(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl outline-none ${
                      isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    } border`}
                  >
                    <option value="سقيا الماء">سقيا الماء</option>
                    <option value="توزيع المصاحف">توزيع المصاحف</option>
                    <option value="السلال الغذائية">السلال الغذائية</option>
                    <option value="سقيا ماء زمزم">سقيا ماء زمزم</option>
                    <option value="المشروعات العامة">المشروعات العامة</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">كود الحساب المستقل:</label>
                  <input
                    type="text"
                    placeholder="مثال: ACC-105-CLO"
                    value={prjAccountCode}
                    onChange={(e) => setPrjAccountCode(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl font-mono outline-none ${
                      isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    } border`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ المستهدف (ريال):</label>
                  <input
                    type="number"
                    value={prjTarget}
                    onChange={(e) => setPrjTarget(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl outline-none ${
                      isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    } border`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">سعر السهم / الوحدة (ريال):</label>
                  <input
                    type="number"
                    value={prjUnitPrice}
                    onChange={(e) => setPrjUnitPrice(e.target.value)}
                    className={`w-full py-2 px-3 rounded-xl outline-none ${
                      isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    } border`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">وصف ورسالة المشروع:</label>
                <textarea
                  rows={2}
                  value={prjDescription}
                  onChange={(e) => setPrjDescription(e.target.value)}
                  placeholder="وصف مختصر للمشروع والفئات المستهدفة..."
                  className={`w-full py-2 px-3 rounded-xl outline-none ${
                    isDark ? "bg-slate-700 border-slate-600 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  } border`}
                />
              </div>

              {prjError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">
                  {prjError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPrj}
                  className="flex-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmittingPrj ? "جاري الإضافة..." : "حفظ وإنشاء المشروع"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
