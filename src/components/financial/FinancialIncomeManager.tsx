import React, { useState } from 'react';
import {
  FinancialIncome,
  FinancialAccount,
  FinancialReceipt,
  IncomeType
} from '../../types/finance';
import {
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  FileText,
  HeartHandshake,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  X,
  CreditCard,
  Building,
  Coins
} from 'lucide-react';
import { ImageUploadField } from '../ImageUploadField';

interface FinancialIncomeManagerProps {
  income: FinancialIncome[];
  accounts: FinancialAccount[];
  receipts: FinancialReceipt[];
  onSaveIncome: (data: Partial<FinancialIncome>) => Promise<void>;
  onViewReceipt: (receipt: FinancialReceipt) => void;
  currentUser: any;
}

export const FinancialIncomeManager: React.FC<FinancialIncomeManagerProps> = ({
  income,
  accounts,
  receipts,
  onSaveIncome,
  onViewReceipt,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Income Form State
  const [formData, setFormData] = useState({
    type: 'donation' as IncomeType,
    source: 'متبرع فردي',
    donorName: '',
    donorPhone: '',
    donorEmail: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    accountId: accounts[0]?.id || '',
    projectName: '',
    donationType: 'عام',
    isRestricted: false,
    restrictionPurpose: '',
    paymentMethod: 'bank_transfer' as const,
    notes: '',
    attachmentUrl: ''
  });

  const filteredIncome = income.filter(item => {
    const matchesSearch =
      item.donorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.operationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.source?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    const matchesAccount = accountFilter === 'all' || item.accountId === accountFilter;

    return matchesSearch && matchesType && matchesAccount;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.donorName || !formData.amount || !formData.accountId) {
      alert('يرجى تعبئة اسم المتبرع/الجهة والمبلغ وتحديد الحساب المستلم');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveIncome({
        ...formData,
        amount: Number(formData.amount),
        user: currentUser
      });
      setIsModalOpen(false);
      setFormData({
        type: 'donation',
        source: 'متبرع فردي',
        donorName: '',
        donorPhone: '',
        donorEmail: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        accountId: accounts[0]?.id || '',
        projectName: '',
        donationType: 'عام',
        isRestricted: false,
        restrictionPurpose: '',
        paymentMethod: 'bank_transfer',
        notes: '',
        attachmentUrl: ''
      });
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ الإيراد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenReceiptForIncome = (item: FinancialIncome) => {
    const rec = receipts.find(r => r.receiptNumber === item.receiptNumber);
    if (rec) {
      onViewReceipt(rec);
    } else {
      // Fallback synthetic receipt
      onViewReceipt({
        id: `rec-${item.id}`,
        receiptNumber: item.receiptNumber,
        type: 'receipt',
        date: item.date,
        amount: item.amount,
        amountInWords: `${item.amount.toLocaleString()} ريال سعودي لا غير`,
        partyName: item.donorName,
        reason: item.isRestricted ? `تبرع مخصص: ${item.restrictionPurpose || item.projectName}` : `إيراد: ${item.source}`,
        accountId: item.accountId,
        accountName: item.accountName,
        projectName: item.projectName,
        paymentMethod: item.paymentMethod,
        issuedById: item.createdById,
        issuedByName: item.createdByName,
        qrVerificationCode: `QR-${item.receiptNumber}-AUTH`,
        createdAt: item.createdAt
      });
    }
  };

  const totalFilteredAmount = filteredIncome.reduce((acc, i) => acc + Number(i.amount || 0), 0);

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Header & New Income Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <HeartHandshake className="w-5 h-5 text-emerald-600" />
            <span>سجل الإيرادات والتبرعات وإصدار الإيصالات</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            تسجيل التبرعات النقدية والمصرفية، المنح، وتوليد سندات القبض الإلكترونية برمز التحقق QR
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل تبرع / إيراد جديد</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث بالمتبرع، رقم العملية، أو رقم الإيصال..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع أنواع الإيرادات</option>
            <option value="donation">تبرعات أفراد</option>
            <option value="grant">منح مؤسسات وأوقاف</option>
            <option value="support">دعم ورعايات</option>
            <option value="subscription">اشتراكات عمومية</option>
            <option value="store_income">إيرادات المتجر</option>
            <option value="other">أخرى</option>
          </select>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">جميع الحسابات البنكية والصناديق</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-800">
          <span>عدد السجلات: {filteredIncome.length}</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            مجموع الإيراد المحدد: {totalFilteredAmount.toLocaleString()} ريال
          </span>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 font-bold">رقم العملية</th>
                <th className="px-4 py-3 font-bold">المتبرع / المصدر</th>
                <th className="px-4 py-3 font-bold">المبلغ</th>
                <th className="px-4 py-3 font-bold">التاريخ</th>
                <th className="px-4 py-3 font-bold">الحساب المستلم</th>
                <th className="px-4 py-3 font-bold">المشروع / التخصيص</th>
                <th className="px-4 py-3 font-bold">رقم الإيصال</th>
                <th className="px-4 py-3 font-bold text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredIncome.map(item => (
                <tr key={item.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    {item.operationNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-neutral-900 dark:text-white">{item.donorName}</div>
                    <div className="text-[11px] text-neutral-400">{item.source}</div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-sm text-neutral-900 dark:text-white">
                    {item.amount.toLocaleString()} ريال
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-600 dark:text-neutral-300">
                    {item.date}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                    {item.accountName}
                  </td>
                  <td className="px-4 py-3">
                    {item.isRestricted ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                        مخصص: {item.restrictionPurpose || item.projectName}
                      </span>
                    ) : (
                      <span className="text-neutral-400">إيراد عام</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-neutral-700 dark:text-neutral-300">
                    {item.receiptNumber}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleOpenReceiptForIncome(item)}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>سند القبض</span>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredIncome.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-400">
                    لا توجد إيرادات تطابق معايير البحث
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Income Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>تسجيل تبرع أو إيراد مالي جديد</span>
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
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">نوع الإيراد *</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as IncomeType })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="donation">تبرع أفراد</option>
                    <option value="grant">منحة مؤسسة أو وقف</option>
                    <option value="support">دعم ورعاية شركات</option>
                    <option value="subscription">اشتراك سنوي</option>
                    <option value="store_income">إيراد متجر إلكتروني</option>
                    <option value="other">إيراد آخر</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">المصدر / الجهة *</label>
                  <input
                    type="text"
                    required
                    value={formData.source}
                    onChange={e => setFormData({ ...formData, source: e.target.value })}
                    placeholder="مثال: أوقاف، متبرع، متجر..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">اسم المتبرع أو الجهة *</label>
                  <input
                    type="text"
                    required
                    value={formData.donorName}
                    onChange={e => setFormData({ ...formData, donorName: e.target.value })}
                    placeholder="اسم المتبرع أو فاعل خير..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">رقم الجوال (اختياري)</label>
                  <input
                    type="tel"
                    value={formData.donorPhone}
                    onChange={e => setFormData({ ...formData, donorPhone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">المبلغ (ريال سعودي) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 font-mono font-bold text-emerald-600 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">تاريخ التحصيل *</label>
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
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">الحساب المستلم *</label>
                  <select
                    required
                    value={formData.accountId}
                    onChange={e => setFormData({ ...formData, accountId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (رصيده: {acc.currentBalance.toLocaleString()} ر.س)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">طريقة الدفع</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="bank_transfer">تحويل بنكي</option>
                    <option value="card">بطاقة مدى / فيزا</option>
                    <option value="cash">نقداً عبر الصندوق</option>
                    <option value="check">شيك مصرفي</option>
                  </select>
                </div>
              </div>

              {/* Restriction Toggle */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRestricted}
                    onChange={e => setFormData({ ...formData, isRestricted: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="font-bold text-neutral-800 dark:text-neutral-200">
                    هل التبرع مخصص لمشروع أو غرض محدد؟
                  </span>
                </label>

                {formData.isRestricted && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={formData.restrictionPurpose}
                      onChange={e => setFormData({ ...formData, restrictionPurpose: e.target.value })}
                      placeholder="الغرض من التخصيص (مثال: سلال غذائية لحي العسيلة، كفالة يتيم...)"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">ملاحظات إضافية أو رقم الحوالة</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات توثيقية..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <ImageUploadField
                label="صورة سند الإيداع أو الحوالة البنكية (رفع ملف مباشر)"
                description="ارفع إشعار التحويل البنكي أو صورة الشيك أو السند المالي مباشرة"
                value={formData.attachmentUrl}
                onChange={val => setFormData({ ...formData, attachmentUrl: val })}
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ وإصدار سند القبض'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
