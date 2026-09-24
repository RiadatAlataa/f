import React, { useState } from 'react';
import {
  FinancialSupplier,
  FinancialPurchaseOrder,
  FinancialPayable
} from '../../types/finance';
import {
  Building2,
  Plus,
  Search,
  ShoppingCart,
  FileCheck2,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  X,
  CreditCard,
  Layers,
  ChevronLeft
} from 'lucide-react';

interface FinancialSuppliersPurchasesProps {
  suppliers: FinancialSupplier[];
  purchaseOrders: FinancialPurchaseOrder[];
  payables: FinancialPayable[];
  onSaveSupplier: (data: Partial<FinancialSupplier>) => Promise<void>;
  onSavePurchaseOrder: (data: Partial<FinancialPurchaseOrder>) => Promise<void>;
  onUpdatePOStatus: (orderId: string, status: string, notes?: string) => Promise<void>;
  onUpdatePayable: (payableId: string, isPaid: boolean, paymentNotes?: string) => Promise<void>;
  currentUser: any;
}

export const FinancialSuppliersPurchases: React.FC<FinancialSuppliersPurchasesProps> = ({
  suppliers,
  purchaseOrders,
  payables,
  onSaveSupplier,
  onSavePurchaseOrder,
  onUpdatePOStatus,
  onUpdatePayable,
  currentUser
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'suppliers' | 'payables'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSupplierModal, setIsSupplierModal] = useState(false);
  const [isPOModal, setIsPOModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supplier Form State
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    commercialRegister: '',
    vatNumber: '',
    category: 'مواد غذائية وسلال',
    phone: '',
    email: '',
    bankName: 'مصرف الراجحي',
    iban: '',
    address: ''
  });

  // PO Form State
  const [poForm, setPoForm] = useState({
    supplierId: suppliers[0]?.id || '',
    departmentName: 'إدارة البرامج والمشاريع',
    projectName: 'مشروع إفطار صائم وتوزيع السلال',
    totalAmount: '',
    notes: '',
    items: [
      { name: 'كرتون سلة غذائية رمضانية متكاملة', quantity: 100, unitPrice: 150, total: 15000 }
    ]
  });

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name) {
      alert('يرجى كتابة اسم المورد أو الشركة');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveSupplier({
        ...supplierForm,
        totalPurchases: 0,
        pendingBalance: 0,
        rating: 5,
        status: 'active',
        user: currentUser
      });
      setIsSupplierModal(false);
      setSupplierForm({
        name: '',
        commercialRegister: '',
        vatNumber: '',
        category: 'مواد غذائية وسلال',
        phone: '',
        email: '',
        bankName: 'مصرف الراجحي',
        iban: '',
        address: ''
      });
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ المورد');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === poForm.supplierId);
    if (!sup) {
      alert('يرجى اختيار المورد');
      return;
    }

    const calculatedTotal = poForm.items.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);

    setIsSubmitting(true);
    try {
      await onSavePurchaseOrder({
        supplierId: sup.id,
        supplierName: sup.name,
        departmentName: poForm.departmentName,
        projectName: poForm.projectName,
        items: poForm.items,
        totalAmount: calculatedTotal,
        notes: poForm.notes,
        user: currentUser
      });
      setIsPOModal(false);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء رفع أمر الشراء');
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
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>المشتريات، الموردون، وسجل الالتزامات والدفعات الآجلة</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            إدارة عروض الأسعار، تعميدات وأوامر الشراء، استلام الأصناف وربطها بالمستودع، وجدول سداد الموردين
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSupplierModal(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-bold rounded-xl transition-colors"
          >
            <Building2 className="w-4 h-4 text-indigo-500" />
            <span>مورد جديد</span>
          </button>

          <button
            onClick={() => setIsPOModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>أمر شراء / تعميد</span>
          </button>
        </div>
      </div>

      {/* Sub-tab pills */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2">
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${activeSubTab === 'orders' ? 'bg-indigo-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
          أوامر الشراء والتعميدات ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveSubTab('suppliers')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${activeSubTab === 'suppliers' ? 'bg-indigo-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
          قائمة الموردين المعتمدين ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveSubTab('payables')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${activeSubTab === 'payables' ? 'bg-indigo-600 text-white' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
        >
          الالتزامات والدفعات المستحقة ({payables.filter(p => !p.isPaid).length})
        </button>
      </div>

      {/* ORDERS TAB */}
      {activeSubTab === 'orders' && (
        <div className="bg-white dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3 font-bold">رقم التعميد</th>
                  <th className="px-4 py-3 font-bold">المورد المعتمد</th>
                  <th className="px-4 py-3 font-bold">المشروع / الإدارة</th>
                  <th className="px-4 py-3 font-bold">القيمة الإجمالية</th>
                  <th className="px-4 py-3 font-bold">الحالة</th>
                  <th className="px-4 py-3 font-bold text-center">إجراءات الاستلام والترحيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {purchaseOrders.map(po => (
                  <tr key={po.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {po.orderNumber}
                      <div className="text-[10px] text-neutral-400 font-sans">{po.orderDate}</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">
                      {po.supplierName}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      {po.projectName}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-sm text-neutral-900 dark:text-white">
                      {po.totalAmount.toLocaleString()} ريال
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${po.status === 'received' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : po.status === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                        {po.status === 'received' ? 'تم استلام البضاعة بالمستودع' : po.status === 'approved' ? 'معتمد وموجه للمورد' : 'بانتظار الاعتماد'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {po.status === 'approved' && (
                        <button
                          onClick={() => onUpdatePOStatus(po.id, 'received', 'تم فحص الأصناف ومطابقتها للمواصفات')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                        >
                          تأكيد الاستلام بالمستودع
                        </button>
                      )}
                      {po.status === 'pending' && (
                        <button
                          onClick={() => onUpdatePOStatus(po.id, 'approved', 'تم اعتماد أمر الشراء من قبل الإدارة المالية')}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          اعتماد التعميد
                        </button>
                      )}
                      {po.status === 'received' && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مرحل ومسجل
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUPPLIERS TAB */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(sup => (
            <div key={sup.id} className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  {sup.category}
                </span>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white mt-2">
                  {sup.name}
                </h3>
                <div className="space-y-1 mt-3 text-xs text-neutral-500">
                  {sup.commercialRegister && <div>السجل التجاري: <span className="font-mono">{sup.commercialRegister}</span></div>}
                  {sup.vatNumber && <div>الرقم الضريبي: <span className="font-mono">{sup.vatNumber}</span></div>}
                  {sup.phone && <div>الهاتف: <span className="font-mono dir-ltr">{sup.phone}</span></div>}
                  {sup.bankName && <div>البنك: {sup.bankName}</div>}
                  {sup.iban && <div className="font-mono text-[10px] truncate">{sup.iban}</div>}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center text-xs">
                <span className="text-neutral-400">إجمالي التعاملات:</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white">{sup.totalPurchases.toLocaleString()} ريال</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAYABLES TAB */}
      {activeSubTab === 'payables' && (
        <div className="bg-white dark:bg-neutral-850 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3 font-bold">الجهة الدائنة / المورد</th>
                  <th className="px-4 py-3 font-bold">البيان</th>
                  <th className="px-4 py-3 font-bold">المبلغ المستحق</th>
                  <th className="px-4 py-3 font-bold">تاريخ الاستحقاق</th>
                  <th className="px-4 py-3 font-bold">الحالة</th>
                  <th className="px-4 py-3 font-bold text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {payables.map(pay => (
                  <tr key={pay.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">
                      {pay.creditorName}
                    </td>
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">
                      {pay.description}
                      {pay.invoiceNumber && <div className="text-[10px] text-neutral-400">فاتورة: {pay.invoiceNumber}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                      {pay.amount.toLocaleString()} ريال
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-600 dark:text-neutral-300">
                      {pay.dueDate}
                    </td>
                    <td className="px-4 py-3">
                      {pay.isPaid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          تم السداد
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          مستحق الدفع
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!pay.isPaid ? (
                        <button
                          onClick={() => onUpdatePayable(pay.id, true, 'تم السداد بتحويل مصرفي')}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          تسجيل كسداد تام
                        </button>
                      ) : (
                        <span className="text-neutral-400">مكتمل</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isSupplierModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>إضافة مورد أو شركة معتمدة</span>
              </h3>
              <button
                onClick={() => setIsSupplierModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">اسم المورد أو الشركة *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  placeholder="مثال: شركة البركة للمواد الغذائية..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">السجل التجاري</label>
                  <input
                    type="text"
                    value={supplierForm.commercialRegister}
                    onChange={e => setSupplierForm({ ...supplierForm, commercialRegister: e.target.value })}
                    className="w-full px-3 py-2 font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">الرقم الضريبي (VAT)</label>
                  <input
                    type="text"
                    value={supplierForm.vatNumber}
                    onChange={e => setSupplierForm({ ...supplierForm, vatNumber: e.target.value })}
                    className="w-full px-3 py-2 font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    value={supplierForm.phone}
                    onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">الآيبان البنكي</label>
                  <input
                    type="text"
                    value={supplierForm.iban}
                    onChange={e => setSupplierForm({ ...supplierForm, iban: e.target.value })}
                    placeholder="SA..."
                    className="w-full px-3 py-2 font-mono rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsSupplierModal(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Purchase Order Modal */}
      {isPOModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-indigo-600" />
                <span>إصدار أمر شراء / تعميد توريد جديد</span>
              </h3>
              <button
                onClick={() => setIsPOModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePO} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">اختر المورد المعتمد *</label>
                  <select
                    required
                    value={poForm.supplierId}
                    onChange={e => setPoForm({ ...poForm, supplierId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">المشروع / البرنامج المرتبط *</label>
                  <input
                    type="text"
                    required
                    value={poForm.projectName}
                    onChange={e => setPoForm({ ...poForm, projectName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="font-bold text-neutral-800 dark:text-neutral-200">الأصناف المراد توريدها</div>
                {poForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-6">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => {
                          const items = [...poForm.items];
                          items[idx].name = e.target.value;
                          setPoForm({ ...poForm, items });
                        }}
                        placeholder="اسم الصنف..."
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => {
                          const items = [...poForm.items];
                          items[idx].quantity = Number(e.target.value);
                          items[idx].total = items[idx].quantity * items[idx].unitPrice;
                          setPoForm({ ...poForm, items });
                        }}
                        placeholder="الكمية"
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        value={item.unitPrice}
                        onChange={e => {
                          const items = [...poForm.items];
                          items[idx].unitPrice = Number(e.target.value);
                          items[idx].total = items[idx].quantity * items[idx].unitPrice;
                          setPoForm({ ...poForm, items });
                        }}
                        placeholder="سعر الوحدة"
                        className="w-full px-2 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">شروط التسليم والدفع</label>
                <textarea
                  rows={2}
                  value={poForm.notes}
                  onChange={e => setPoForm({ ...poForm, notes: e.target.value })}
                  placeholder="التسليم بمستودع الجمعية بالعسيلة خلال 3 أيام..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsPOModal(false)}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الإصدار...' : 'إصدار أمر الشراء والتعميد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
