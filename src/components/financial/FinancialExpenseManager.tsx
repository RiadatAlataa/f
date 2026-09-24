import React, { useState } from 'react';
import {
  FinancialExpense,
  FinancialAccount,
  FinancialBudget,
  FinancialSupplier,
  ExpenseType,
  FinancialApprovalStatus,
  FinancialReceipt
} from '../../types/finance';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  FileText,
  Building,
  AlertCircle,
  X,
  CreditCard,
  Send,
  Eye,
  Check,
  Ban
} from 'lucide-react';
import { ImageUploadField } from '../ImageUploadField';

interface FinancialExpenseManagerProps {
  expenses: FinancialExpense[];
  accounts: FinancialAccount[];
  budgets: FinancialBudget[];
  suppliers: FinancialSupplier[];
  receipts: FinancialReceipt[];
  onSaveExpense: (data: Partial<FinancialExpense>) => Promise<void>;
  onWorkflowAction: (expenseId: string, action: 'review' | 'approve' | 'reject' | 'pay' | 'cancel', notes?: string, accountId?: string) => Promise<void>;
  onViewReceipt: (receipt: FinancialReceipt) => void;
  currentUser: any;
}

export const FinancialExpenseManager: React.FC<FinancialExpenseManagerProps> = ({
  expenses,
  accounts,
  budgets,
  suppliers,
  receipts,
  onSaveExpense,
  onWorkflowAction,
  onViewReceipt,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<FinancialExpense | null>(null);
  const [workflowActionType, setWorkflowActionType] = useState<'review' | 'approve' | 'reject' | 'pay' | 'cancel' | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(accounts[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Expense Form State
  const [formData, setFormData] = useState({
    type: 'purchases' as ExpenseType,
    description: '',
    beneficiaryName: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    budgetId: '',
    departmentName: 'إدارة البرامج والمشاريع',
    projectName: '',
    paymentMethod: 'bank_transfer' as const,
    invoiceNumber: '',
    invoiceAttachmentUrl: '',
    supplierId: '',
    notes: ''
  });

  const filteredExpenses = expenses.filter(item => {
    const matchesSearch =
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.expenseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.beneficiaryName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.beneficiaryName) {
      alert('يرجى تعبئة البيان، المبلغ، واسم المستفيد');
      return;
    }

    const selectedBudget = budgets.find(b => b.id === formData.budgetId);

    setIsSubmitting(true);
    try {
      await onSaveExpense({
        ...formData,
        amount: Number(formData.amount),
        budgetName: selectedBudget?.name,
        user: currentUser
      });
      setIsModalOpen(false);
      setFormData({
        type: 'purchases',
        description: '',
        beneficiaryName: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        budgetId: '',
        departmentName: 'إدارة البرامج والمشاريع',
        projectName: '',
        paymentMethod: 'bank_transfer',
        invoiceNumber: '',
        supplierId: '',
        notes: ''
      });
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إرسال طلب الصرف');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!selectedExpense || !workflowActionType) return;
    setIsSubmitting(true);
    try {
      await onWorkflowAction(
        selectedExpense.id,
        workflowActionType,
        actionNotes,
        workflowActionType === 'pay' ? paymentAccountId : undefined
      );
      setWorkflowActionType(null);
      setSelectedExpense(null);
      setActionNotes('');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء معالجة دورة الاعتماد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReceiptForExpense = (item: FinancialExpense) => {
    const rec = receipts.find(r => r.receiptNumber === item.paymentReceiptNumber || r.referenceNumber === item.expenseNumber);
    if (rec) {
      onViewReceipt(rec);
    } else {
      // Synthetic payment voucher
      onViewReceipt({
        id: `rec-${item.id}`,
        receiptNumber: item.paymentReceiptNumber || `PAY-${item.expenseNumber}`,
        type: 'payment',
        date: item.paidAt?.split('T')[0] || item.date,
        amount: item.amount,
        amountInWords: `${item.amount.toLocaleString()} ريال سعودي لا غير`,
        partyName: item.beneficiaryName,
        reason: item.description,
        accountId: item.accountId || accounts[0]?.id || 'acc-1',
        accountName: item.accountName || 'الحساب البنكي المعتمد',
        projectName: item.projectName,
        paymentMethod: item.paymentMethod,
        issuedById: item.paidById || currentUser?.id,
        issuedByName: item.paidByName || currentUser?.name || 'أمين الصرف',
        qrVerificationCode: `QR-PAY-${item.expenseNumber}`,
        createdAt: item.createdAt
      });
    }
  };

  const getStatusBadge = (status: FinancialApprovalStatus) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"><CheckCircle2 className="w-3 h-3" /> تم الصرف / مدفوع</span>;
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"><Check className="w-3 h-3" /> معتمد رسمياً</span>;
      case 'pending_approval':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"><Clock className="w-3 h-3" /> بانتظار الاعتماد</span>;
      case 'under_review':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"><Eye className="w-3 h-3" /> قيد المراجعة</span>;
      case 'rejected':
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"><Ban className="w-3 h-3" /> مرفوض / ملغي</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-rose-600" />
            <span>إدارة المصروفات، الفواتير، ودورة الاعتمادات المالية</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            دورة الصرف المنضبطة: طلب صرف ← مراجعة مالية ← اعتماد المسؤول ← تنفيذ التحويل وإصدار السند
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء طلب صرف جديد</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث بالبيان، رقم المصروف، المستفيد، أو الفاتورة..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">جميع حالات الصرف</option>
            <option value="under_review">قيد المراجعة</option>
            <option value="pending_approval">بانتظار الاعتماد</option>
            <option value="approved">معتمد (جاهز للدفع)</option>
            <option value="paid">تم الصرف (مدفوع)</option>
            <option value="cancelled">ملغي / مرفوض</option>
          </select>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">جميع تصنيفات المصروفات</option>
            <option value="purchases">مشتريات وتوريد</option>
            <option value="operations">تشغيل وصيانة</option>
            <option value="salaries">رواتب وأجور</option>
            <option value="initiatives">مبادرات وبرامج</option>
            <option value="supplies">مستلزمات ومطبوعات</option>
            <option value="aid">مساعدات عينية ونقدية</option>
          </select>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-bold">رقم المصروف</th>
                <th className="px-4 py-3 font-bold">البيان والتفاصيل</th>
                <th className="px-4 py-3 font-bold">المستفيد / المورد</th>
                <th className="px-4 py-3 font-bold">المبلغ</th>
                <th className="px-4 py-3 font-bold">الميزانية المرتبطة</th>
                <th className="px-4 py-3 font-bold">الحالة</th>
                <th className="px-4 py-3 font-bold text-center">إجراءات الاعتماد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredExpenses.map(item => (
                <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-rose-600 dark:text-rose-400">
                    {item.expenseNumber}
                    <div className="text-[10px] text-neutral-400 font-sans">{item.date}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-bold text-neutral-900 dark:text-white truncate">{item.description}</div>
                    {item.invoiceNumber && (
                      <div className="text-[11px] text-neutral-400">فاتورة رقم: {item.invoiceNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-800 dark:text-neutral-200">{item.beneficiaryName}</div>
                    <div className="text-[11px] text-neutral-400">{item.departmentName || 'إدارة عامة'}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                    {item.amount.toLocaleString()} ريال
                  </td>
                  <td className="px-4 py-3">
                    {item.budgetName ? (
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">{item.budgetName}</span>
                    ) : (
                      <span className="text-neutral-400">بدون ميزانية</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {/* Step 1: Review Action */}
                      {item.status === 'under_review' && (
                        <button
                          onClick={() => {
                            setSelectedExpense(item);
                            setWorkflowActionType('review');
                          }}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 rounded-lg text-xs font-bold transition-colors"
                        >
                          تدقيق ومراجعة
                        </button>
                      )}

                      {/* Step 2: Approve Action */}
                      {item.status === 'pending_approval' && (
                        <button
                          onClick={() => {
                            setSelectedExpense(item);
                            setWorkflowActionType('approve');
                          }}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-lg text-xs font-bold transition-colors"
                        >
                          اعتماد الصرف
                        </button>
                      )}

                      {/* Step 3: Pay Action */}
                      {item.status === 'approved' && (
                        <button
                          onClick={() => {
                            setSelectedExpense(item);
                            setWorkflowActionType('pay');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          تنفيذ الصرف
                        </button>
                      )}

                      {/* View Voucher if Paid */}
                      {item.status === 'paid' && (
                        <button
                          onClick={() => handleOpenReceiptForExpense(item)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>سند الصرف</span>
                        </button>
                      )}

                      {/* Cancel / Reject */}
                      {(item.status === 'under_review' || item.status === 'pending_approval') && (
                        <button
                          onClick={() => {
                            setSelectedExpense(item);
                            setWorkflowActionType('reject');
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                          title="رفض الطلب"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-400">
                    لا توجد مصروفات مسجلة تطابق البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" />
                <span>إنشاء طلب صرف مالي جديد</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">نوع المصروف *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as ExpenseType })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="purchases">مشتريات وتوريد</option>
                    <option value="operations">تشغيل وصيانة</option>
                    <option value="salaries">رواتب ومكافآت</option>
                    <option value="initiatives">مبادرات وبرامج</option>
                    <option value="supplies">مستلزمات ومطبوعات</option>
                    <option value="hospitality">ضيافة ونثريات</option>
                    <option value="transport">نقل ومواصلات</option>
                    <option value="other">مصروف آخر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">المستفيد من الصرف / المورد *</label>
                  <input
                    type="text"
                    required
                    value={formData.beneficiaryName}
                    onChange={e => setFormData({ ...formData, beneficiaryName: e.target.value })}
                    placeholder="اسم الشركة الموردة، أو الموظف المستفيد..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">البيان والغرض من الصرف *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف واضح للعملية والبنود المراد شراؤها أو سدادها..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">المبلغ المطلوب (ريال سعودي) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 font-mono font-bold text-rose-600 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">تاريخ الطلب *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">ربط بالميزانية المعتمدة</label>
                  <select
                    value={formData.budgetId}
                    onChange={e => setFormData({ ...formData, budgetId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="">بدون ميزانية محددة</option>
                    {budgets.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} (المتبقي: {(b.approvedAmount - b.spentAmount).toLocaleString()} ر.س)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">رقم الفاتورة (إن وجد)</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="INV-XXXX"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <ImageUploadField
                label="صورة الفاتورة أو المستند الداعم (رفع ملف مباشر)"
                description="ارفع صورة الفاتورة أو سند القبض أو الإشعار من جهازك لحفظها مع المعاملة"
                value={formData.invoiceAttachmentUrl}
                onChange={val => setFormData({ ...formData, invoiceAttachmentUrl: val })}
                previewAspect="video"
              />

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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الإرسال...' : 'رفع طلب الصرف للمراجعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workflow Action Modal */}
      {workflowActionType && selectedExpense && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${workflowActionType === 'pay' ? 'bg-emerald-100 text-emerald-600' : workflowActionType === 'approve' ? 'bg-blue-100 text-blue-600' : workflowActionType === 'reject' ? 'bg-rose-100 text-rose-600' : 'bg-purple-100 text-purple-600'}`}>
                  {workflowActionType === 'pay' ? <CreditCard className="w-5 h-5" /> : workflowActionType === 'approve' ? <Check className="w-5 h-5" /> : workflowActionType === 'reject' ? <Ban className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                    {workflowActionType === 'pay' ? 'تنفيذ الصرف والتحويل المالي' : workflowActionType === 'approve' ? 'اعتماد طلب الصرف رسمياً' : workflowActionType === 'reject' ? 'رفض طلب الصرف' : 'مراجعة وتدقيق المستندات'}
                  </h3>
                  <div className="text-xs text-neutral-500">{selectedExpense.expenseNumber} - {selectedExpense.beneficiaryName}</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">المبلغ:</span>
                  <span className="font-bold font-mono text-sm text-rose-600 dark:text-rose-400">{selectedExpense.amount.toLocaleString()} ريال</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">البيان:</span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[200px]">{selectedExpense.description}</span>
                </div>
              </div>

              {/* Account Selection if Action is PAY */}
              {workflowActionType === 'pay' && (
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    اختر الحساب البنكي أو الصندوق المسحوب منه *
                  </label>
                  <select
                    value={paymentAccountId}
                    onChange={e => setPaymentAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id} disabled={acc.currentBalance < selectedExpense.amount}>
                        {acc.name} (رصيده الحالي: {acc.currentBalance.toLocaleString()} ر.س)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  ملاحظات الإجراء
                </label>
                <textarea
                  rows={2}
                  value={actionNotes}
                  onChange={e => setActionNotes(e.target.value)}
                  placeholder="ملاحظات الاعتماد أو أسباب الرفض..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setWorkflowActionType(null)}
                  className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleExecuteWorkflow}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري المعالجة...' : 'تأكيد وحفظ الإجراء'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
