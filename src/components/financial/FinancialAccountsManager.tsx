import React, { useState } from 'react';
import {
  FinancialAccount,
  FinancialAccountType
} from '../../types/finance';
import {
  Wallet,
  Plus,
  ArrowLeftRight,
  Building,
  CheckCircle2,
  X,
  CreditCard,
  History,
  ShieldCheck,
  Coins
} from 'lucide-react';

interface FinancialAccountsManagerProps {
  accounts: FinancialAccount[];
  onSaveAccount: (data: Partial<FinancialAccount>) => Promise<void>;
  onTransferFunds: (fromAccountId: string, toAccountId: string, amount: number, notes?: string) => Promise<void>;
  currentUser: any;
}

export const FinancialAccountsManager: React.FC<FinancialAccountsManagerProps> = ({
  accounts,
  onSaveAccount,
  onTransferFunds,
  currentUser
}) => {
  const [isNewAccountModal, setIsNewAccountModal] = useState(false);
  const [isTransferModal, setIsTransferModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Account State
  const [accountForm, setAccountForm] = useState({
    name: '',
    accountNumber: '',
    type: 'bank' as FinancialAccountType,
    bankName: 'مصرف الراجحي',
    iban: '',
    initialBalance: '',
    notes: ''
  });

  // Transfer State
  const [transferForm, setTransferForm] = useState({
    fromAccountId: accounts[0]?.id || '',
    toAccountId: accounts[1]?.id || '',
    amount: '',
    notes: ''
  });

  const totalBalance = accounts.reduce((acc, a) => acc + (a.status === 'active' ? Number(a.currentBalance || 0) : 0), 0);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.name) {
      alert('يرجى إدخال اسم الحساب');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveAccount({
        ...accountForm,
        initialBalance: Number(accountForm.initialBalance || 0),
        currentBalance: Number(accountForm.initialBalance || 0),
        currency: 'SAR',
        status: 'active',
        user: currentUser
      });
      setIsNewAccountModal(false);
      setAccountForm({
        name: '',
        accountNumber: '',
        type: 'bank',
        bankName: 'مصرف الراجحي',
        iban: '',
        initialBalance: '',
        notes: ''
      });
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ الحساب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(transferForm.amount);
    if (!amount || amount <= 0) {
      alert('يرجى تحديد مبلغ صحيح للتحويل');
      return;
    }

    if (transferForm.fromAccountId === transferForm.toAccountId) {
      alert('لا يمكن التحويل لنفس الحساب');
      return;
    }

    const sourceAcc = accounts.find(a => a.id === transferForm.fromAccountId);
    if (!sourceAcc || sourceAcc.currentBalance < amount) {
      alert('رصيد الحساب المحول منه غير كافٍ');
      return;
    }

    setIsSubmitting(true);
    try {
      await onTransferFunds(
        transferForm.fromAccountId,
        transferForm.toAccountId,
        amount,
        transferForm.notes
      );
      setIsTransferModal(false);
      setTransferForm({
        fromAccountId: accounts[0]?.id || '',
        toAccountId: accounts[1]?.id || '',
        amount: '',
        notes: ''
      });
    } catch (err: any) {
      alert(err.message || 'فشلت عملية التحويل بين الحسابات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <span>إدارة الحسابات البنكية، الصناديق، والتحويلات الداخلية</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            متابعة أرصدة الحسابات البنكية المعتمدة، حسابات التبرعات المقيدة، وإجراء المناقلات والتحويلات الرسمية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl transition-colors"
          >
            <ArrowLeftRight className="w-4 h-4 text-teal-600" />
            <span>تحويل بين الحسابات</span>
          </button>

          <button
            onClick={() => setIsNewAccountModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حساب / صندوق جديد</span>
          </button>
        </div>
      </div>

      {/* Balance Highlight */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-200">السيولة النقدية المتاحة عبر كافة الحسابات</span>
          <div className="text-3xl font-black font-mono mt-1">
            {totalBalance.toLocaleString()} <span className="text-sm font-normal">ريال سعودي</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15">
          <ShieldCheck className="w-5 h-5 text-emerald-300" />
          <span>حسابات بنكية رسمية مطابقة للمعايير المحاسبية</span>
        </div>
      </div>

      {/* Accounts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map(acc => (
          <div
            key={acc.id}
            className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${acc.type === 'bank' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' : acc.type === 'donations' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                  {acc.type === 'bank' ? 'حساب بنكي رئيسي' : acc.type === 'donations' ? 'حساب تبرعات مقيدة' : 'صندوق عهدة نقدية'}
                </span>
                <span className="text-[10px] font-mono text-neutral-400">
                  {acc.currency}
                </span>
              </div>

              <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                {acc.name}
              </h3>

              {acc.bankName && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  <span>{acc.bankName}</span>
                </div>
              )}

              {acc.iban && (
                <div className="text-[11px] font-mono text-neutral-400 mt-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 break-all select-all">
                  {acc.iban}
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs text-neutral-400">الرصيد الفعلي الحالي:</span>
                <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {acc.currentBalance.toLocaleString()} <span className="text-xs font-normal text-neutral-500">ريال</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-2 text-[11px] text-neutral-400 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
              <span>الرصيد الافتتاحي: {acc.initialBalance.toLocaleString()} ريال</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">نشط</span>
            </div>
          </div>
        ))}
      </div>

      {/* New Account Modal */}
      {isNewAccountModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>إضافة حساب بنكي أو صندوق جديد</span>
              </h3>
              <button
                onClick={() => setIsNewAccountModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">اسم الحساب أو الصندوق *</label>
                <input
                  type="text"
                  required
                  value={accountForm.name}
                  onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="مثال: حساب مصرف الإنماء - التبرعات العامة"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">نوع الحساب *</label>
                  <select
                    value={accountForm.type}
                    onChange={e => setAccountForm({ ...accountForm, type: e.target.value as FinancialAccountType })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="bank">حساب بنكي رئيسي</option>
                    <option value="donations">حساب تبرعات مخصصة</option>
                    <option value="cash">صندوق نقدي (خزينة)</option>
                    <option value="petty_cash">عهدة نثرية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">اسم البنك</label>
                  <input
                    type="text"
                    value={accountForm.bankName}
                    onChange={e => setAccountForm({ ...accountForm, bankName: e.target.value })}
                    placeholder="مثال: مصرف الراجحي"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">رقم الآيبان (IBAN)</label>
                  <input
                    type="text"
                    value={accountForm.iban}
                    onChange={e => setAccountForm({ ...accountForm, iban: e.target.value })}
                    placeholder="SA..."
                    className="w-full px-3 py-2 font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-left"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">الرصيد الافتتاحي (ريال)</label>
                  <input
                    type="number"
                    value={accountForm.initialBalance}
                    onChange={e => setAccountForm({ ...accountForm, initialBalance: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={accountForm.notes}
                  onChange={e => setAccountForm({ ...accountForm, notes: e.target.value })}
                  placeholder="ملاحظات حول صلاحيات الحساب أو المخولين بالتوقيع..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNewAccountModal(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Funds Modal */}
      {isTransferModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-teal-600" />
                <span>تحويل مالي بين الحسابات والصناديق</span>
              </h3>
              <button
                onClick={() => setIsTransferModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">من حساب (المحول منه) *</label>
                <select
                  required
                  value={transferForm.fromAccountId}
                  onChange={e => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
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
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">إلى حساب (المحول إليه) *</label>
                <select
                  required
                  value={transferForm.toAccountId}
                  onChange={e => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} disabled={acc.id === transferForm.fromAccountId}>
                      {acc.name} (رصيده: {acc.currentBalance.toLocaleString()} ر.س)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">المبلغ المراد تحويله (ريال) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={transferForm.amount}
                  onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 font-mono font-bold text-teal-600 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">السبب أو رقم الحوالة</label>
                <textarea
                  rows={2}
                  value={transferForm.notes}
                  onChange={e => setTransferForm({ ...transferForm, notes: e.target.value })}
                  placeholder="سبب المناقلة أو تغذية الصندوق..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsTransferModal(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري التحويل...' : 'تأكيد التحويل الآن'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
