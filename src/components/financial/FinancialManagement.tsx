import React, { useState, useEffect } from 'react';
import {
  FinancialAccount,
  FinancialIncome,
  FinancialExpense,
  FinancialBudget,
  FinancialDonor,
  FinancialSupplier,
  FinancialPurchaseOrder,
  FinancialPayable,
  FinancialPayrollMonth,
  FinancialReceipt,
  FinancialAuditLog,
  FinancialSettings
} from '../../types/finance';
import { FinancialDashboard } from './FinancialDashboard';
import { FinancialIncomeManager } from './FinancialIncomeManager';
import { FinancialExpenseManager } from './FinancialExpenseManager';
import { FinancialBudgetManager } from './FinancialBudgetManager';
import { FinancialAccountsManager } from './FinancialAccountsManager';
import { FinancialDonorsManager } from './FinancialDonorsManager';
import { FinancialSuppliersPurchases } from './FinancialSuppliersPurchases';
import { FinancialPayrollManager } from './FinancialPayrollManager';
import { FinancialReportsAudit } from './FinancialReportsAudit';
import { FinancialReceiptModal } from './FinancialReceiptModal';

import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  PieChart,
  Wallet,
  Heart,
  Building2,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';

interface FinancialManagementProps {
  currentUser: any;
  onRefreshParentStats?: () => void;
}

export const FinancialManagement: React.FC<FinancialManagementProps> = ({
  currentUser,
  onRefreshParentStats
}) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Core Data States
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [income, setIncome] = useState<FinancialIncome[]>([]);
  const [expenses, setExpenses] = useState<FinancialExpense[]>([]);
  const [budgets, setBudgets] = useState<FinancialBudget[]>([]);
  const [donors, setDonors] = useState<FinancialDonor[]>([]);
  const [suppliers, setSuppliers] = useState<FinancialSupplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<FinancialPurchaseOrder[]>([]);
  const [payables, setPayables] = useState<FinancialPayable[]>([]);
  const [payrollMonths, setPayrollMonths] = useState<FinancialPayrollMonth[]>([]);
  const [receipts, setReceipts] = useState<FinancialReceipt[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
  const [settings, setSettings] = useState<FinancialSettings | undefined>(undefined);

  // Voucher Print Modal State
  const [activeReceipt, setActiveReceipt] = useState<FinancialReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Fetch all financial data
  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/finance/all');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
        setIncome(data.income || []);
        setExpenses(data.expenses || []);
        setBudgets(data.budgets || []);
        setDonors(data.donors || []);
        setSuppliers(data.suppliers || []);
        setPurchaseOrders(data.purchases || data.purchaseOrders || []);
        setPayables(data.payables || []);
        setPayrollMonths(data.payroll || data.payrollMonths || []);
        setReceipts(data.receipts || []);
        setAuditLogs(data.auditLog || data.auditLogs || []);
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching financial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  // Save Income Handler
  const handleSaveIncome = async (formData: Partial<FinancialIncome>) => {
    const res = await fetch('/api/db/finance/income/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل حفظ الإيراد');
    await loadFinancialData();
    if (result.receipt) {
      setActiveReceipt(result.receipt);
      setIsReceiptModalOpen(true);
    }
  };

  // Save Expense Handler
  const handleSaveExpense = async (formData: Partial<FinancialExpense>) => {
    const res = await fetch('/api/db/finance/expenses/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل حفظ المصروف');
    await loadFinancialData();
  };

  // Expense Workflow Transition Handler
  const handleWorkflowAction = async (
    expenseId: string,
    action: 'review' | 'approve' | 'reject' | 'pay' | 'cancel',
    notes?: string,
    accountId?: string
  ) => {
    const res = await fetch('/api/db/finance/expenses/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expenseId,
        action,
        notes,
        accountId,
        user: currentUser
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل تنفيذ الإجراء');
    await loadFinancialData();
    if (result.receipt) {
      setActiveReceipt(result.receipt);
      setIsReceiptModalOpen(true);
    }
  };

  // Save Budget Handler
  const handleSaveBudget = async (formData: Partial<FinancialBudget>) => {
    const res = await fetch('/api/db/finance/budgets/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل حفظ الميزانية');
    await loadFinancialData();
  };

  // Save Account Handler
  const handleSaveAccount = async (formData: Partial<FinancialAccount>) => {
    const res = await fetch('/api/db/finance/accounts/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل حفظ الحساب');
    await loadFinancialData();
  };

  // Transfer Funds
  const handleTransferFunds = async (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => {
    const res = await fetch('/api/db/finance/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromAccountId, toAccountId, amount, notes, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل تنفيذ التحويل');
    await loadFinancialData();
  };

  // Save Donor
  const handleSaveDonor = async (formData: Partial<FinancialDonor>) => {
    const res = await fetch('/api/db/finance/donors/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل حفظ المتبرع');
    await loadFinancialData();
  };

  // Save Supplier
  const handleSaveSupplier = async (formData: Partial<FinancialSupplier>) => {
    const res = await fetch('/api/db/finance/suppliers/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل حفظ المورد');
    await loadFinancialData();
  };

  // Save Purchase Order
  const handleSavePO = async (formData: Partial<FinancialPurchaseOrder>) => {
    const res = await fetch('/api/db/finance/purchases/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل حفظ أمر الشراء');
    await loadFinancialData();
  };

  // Update PO Status
  const handleUpdatePOStatus = async (orderId: string, status: string, notes?: string) => {
    const res = await fetch('/api/db/finance/purchases/receive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId: orderId, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل استلام أمر الشراء');
    await loadFinancialData();
  };

  // Update Payable
  const handleUpdatePayable = async (payableId: string, isPaid: boolean, paymentNotes?: string) => {
    const res = await fetch('/api/db/finance/payables/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: payableId, isPaid, notes: paymentNotes, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل تحديث الدفعة المستحقة');
    await loadFinancialData();
  };

  // Generate Payroll
  const handleGeneratePayroll = async (month: string, notes?: string) => {
    const res = await fetch('/api/db/finance/payroll/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, notes, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل إعداد مسير الرواتب');
    await loadFinancialData();
  };

  // Disburse Payroll
  const handleDisbursePayroll = async (payrollId: string, accountId: string) => {
    const res = await fetch('/api/db/finance/payroll/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payrollId, accountId, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل صرف مسير الرواتب');
    await loadFinancialData();
  };

  // Update Settings
  const handleUpdateSettings = async (newSettings: Partial<FinancialSettings>) => {
    const res = await fetch('/api/db/finance/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newSettings, user: currentUser })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'فشل تحديث الإعدادات المالية');
    await loadFinancialData();
  };

  // Open Receipt
  const handleViewReceipt = (rec: FinancialReceipt) => {
    setActiveReceipt(rec);
    setIsReceiptModalOpen(true);
  };

  // Navigation Items
  const navTabs = [
    { id: 'dashboard', label: 'لوحة التحكم والملخص', icon: LayoutDashboard },
    { id: 'income', label: 'الإيرادات والتبرعات', icon: TrendingUp },
    { id: 'expenses', label: 'المصروفات والاعتمادات', icon: TrendingDown },
    { id: 'budgets', label: 'الميزانيات التقديرية', icon: PieChart },
    { id: 'accounts', label: 'الحسابات والصناديق', icon: Wallet },
    { id: 'donors', label: 'المانحون والداعمون', icon: Heart },
    { id: 'purchases', label: 'المشتريات والموردون', icon: Building2 },
    { id: 'payroll', label: 'الرواتب والأجور', icon: Users },
    { id: 'reports', label: 'التقارير وسجل التدقيق', icon: FileSpreadsheet }
  ];

  if (isLoading && accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-neutral-500">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-semibold">جاري تحميل المنظومة المالية وسجلات التدقيق...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Subnavigation Bar */}
      <div className="p-2 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-x-auto no-print">
        <div className="flex items-center gap-1.5 min-w-max">
          {navTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && (
          <FinancialDashboard
            accounts={accounts}
            income={income}
            expenses={expenses}
            budgets={budgets}
            payables={payables}
            auditLogs={auditLogs}
            onNavigateTab={setActiveTab}
            onOpenNewExpense={() => setActiveTab('expenses')}
            onOpenNewIncome={() => setActiveTab('income')}
          />
        )}

        {activeTab === 'income' && (
          <FinancialIncomeManager
            income={income}
            accounts={accounts}
            receipts={receipts}
            onSaveIncome={handleSaveIncome}
            onViewReceipt={handleViewReceipt}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'expenses' && (
          <FinancialExpenseManager
            expenses={expenses}
            accounts={accounts}
            budgets={budgets}
            suppliers={suppliers}
            receipts={receipts}
            onSaveExpense={handleSaveExpense}
            onWorkflowAction={handleWorkflowAction}
            onViewReceipt={handleViewReceipt}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'budgets' && (
          <FinancialBudgetManager
            budgets={budgets}
            expenses={expenses}
            onSaveBudget={handleSaveBudget}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'accounts' && (
          <FinancialAccountsManager
            accounts={accounts}
            onSaveAccount={handleSaveAccount}
            onTransferFunds={handleTransferFunds}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'donors' && (
          <FinancialDonorsManager
            donors={donors}
            income={income}
            onSaveDonor={handleSaveDonor}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'purchases' && (
          <FinancialSuppliersPurchases
            suppliers={suppliers}
            purchaseOrders={purchaseOrders}
            payables={payables}
            onSaveSupplier={handleSaveSupplier}
            onSavePurchaseOrder={handleSavePO}
            onUpdatePOStatus={handleUpdatePOStatus}
            onUpdatePayable={handleUpdatePayable}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'payroll' && (
          <FinancialPayrollManager
            payrollMonths={payrollMonths}
            accounts={accounts}
            onGeneratePayroll={handleGeneratePayroll}
            onDisbursePayroll={handleDisbursePayroll}
            currentUser={currentUser}
          />
        )}

        {activeTab === 'reports' && (
          <FinancialReportsAudit
            income={income}
            expenses={expenses}
            accounts={accounts}
            budgets={budgets}
            auditLogs={auditLogs}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            currentUser={currentUser}
          />
        )}
      </div>

      {/* Official Receipt & Voucher Modal */}
      <FinancialReceiptModal
        receipt={activeReceipt}
        settings={settings}
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setActiveReceipt(null);
        }}
      />
    </div>
  );
};
