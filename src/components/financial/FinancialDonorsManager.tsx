import React, { useState } from 'react';
import {
  FinancialDonor,
  FinancialIncome,
  DonorCategory
} from '../../types/finance';
import {
  Heart,
  Search,
  Plus,
  Phone,
  Mail,
  Award,
  Download,
  Calendar,
  DollarSign,
  X,
  FileCheck,
  ChevronLeft
} from 'lucide-react';

interface FinancialDonorsManagerProps {
  donors: FinancialDonor[];
  income: FinancialIncome[];
  onSaveDonor: (data: Partial<FinancialDonor>) => Promise<void>;
  currentUser: any;
}

export const FinancialDonorsManager: React.FC<FinancialDonorsManagerProps> = ({
  donors,
  income,
  onSaveDonor,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDonor, setSelectedDonor] = useState<FinancialDonor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Donor Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'individual' as DonorCategory,
    idNumber: '',
    address: '',
    notes: ''
  });

  const filteredDonors = donors.filter(d => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm) ||
      d.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert('يرجى كتابة اسم المتبرع');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSaveDonor({
        ...formData,
        totalDonations: 0,
        donationsCount: 0,
        status: 'active',
        user: currentUser
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        category: 'individual',
        idNumber: '',
        address: '',
        notes: ''
      });
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ بيانات المتبرع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDonorContributions = (donorName: string) => {
    return income.filter(i => i.donorName === donorName || i.source === donorName);
  };

  return (
    <div className="space-y-6 text-right dir-rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            <span>سجل الداعمين والمتبرعين والجهات المانحة (CRM الخيري)</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            إدارة بيانات المتبرعين، تصنيفهم (أفراد، مؤسسات مانحة، شركات)، وسجل مساهماتهم التراكمية
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة متبرع / جهة داعمة</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="بحث بالاسم، رقم الهاتف، أو البريد الإلكتروني..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="all">جميع فئات الداعمين</option>
            <option value="individual">متبرع فردي</option>
            <option value="vip">كبار المانحين (VIP)</option>
            <option value="foundation">مؤسسة مانحة أو وقفية</option>
            <option value="corporate">شركة أو قطاع خاص</option>
            <option value="government">جهة حكومية</option>
          </select>
        </div>
      </div>

      {/* Donors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDonors.map(donor => {
          const donorIncome = getDonorContributions(donor.name);
          const computedTotal = donorIncome.reduce((acc, i) => acc + Number(i.amount || 0), 0) || donor.totalDonations;

          return (
            <div
              key={donor.id}
              className="p-5 rounded-2xl bg-white dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${donor.category === 'vip' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : donor.category === 'foundation' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
                      {donor.category === 'vip' ? 'مانح استراتيجي VIP' : donor.category === 'foundation' ? 'مؤسسة وقفية / مانحة' : donor.category === 'corporate' ? 'شركة / رعاية' : 'متبرع فرد'}
                    </span>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white mt-1">
                      {donor.name}
                    </h3>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-500 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 fill-current" />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {donor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="font-mono dir-ltr">{donor.phone}</span>
                    </div>
                  )}
                  {donor.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="truncate">{donor.email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[11px] text-neutral-400">إجمالي التبرعات:</span>
                      <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                        {computedTotal.toLocaleString()} ريال
                      </div>
                    </div>
                    <div className="text-left text-[11px] text-neutral-500">
                      <span>{donorIncome.length || donor.donationsCount} مساهمات</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <button
                  onClick={() => setSelectedDonor(donor)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
                >
                  <span>كشف مساهمات الداعم</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Donor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <h3 className="font-bold text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-500" />
                <span>إضافة متبرع أو جهة مانحة</span>
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
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">اسم المتبرع أو الجهة *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="اسم الشخص أو المؤسسة المانحة..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">التصنيف *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as DonorCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="individual">متبرع فردي</option>
                    <option value="vip">كبار المانحين (VIP)</option>
                    <option value="foundation">مؤسسة مانحة / وقف</option>
                    <option value="corporate">شركة / قطاع خاص</option>
                    <option value="government">جهة حكومية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">رقم الجوال</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="donor@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">الهوية / السجل التجاري</label>
                  <input
                    type="text"
                    value={formData.idNumber}
                    onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
                    placeholder="رقم الهوية أو السجل..."
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">ملاحظات واهتمامات التبرع</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="يفضل مشاريع السلال، أو الإطعام، إلخ..."
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : 'حفظ بيانات المتبرع'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Donor Contributions Drawer/Modal */}
      {selectedDonor && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  سجل مساهمات: {selectedDonor.name}
                </h3>
                <span className="text-xs text-neutral-500">كافة الإيرادات والتبرعات الموثقة للداعم</span>
              </div>
              <button
                onClick={() => setSelectedDonor(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="p-2">رقم العملية</th>
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">المبلغ</th>
                      <th className="p-2">الحساب</th>
                      <th className="p-2">التخصيص</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {getDonorContributions(selectedDonor.name).map(c => (
                      <tr key={c.id}>
                        <td className="p-2 font-mono font-bold text-emerald-600">{c.operationNumber}</td>
                        <td className="p-2 font-mono">{c.date}</td>
                        <td className="p-2 font-mono font-bold">{c.amount.toLocaleString()} ريال</td>
                        <td className="p-2">{c.accountName}</td>
                        <td className="p-2">{c.isRestricted ? c.restrictionPurpose : 'عام'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end">
              <button
                onClick={() => setSelectedDonor(null)}
                className="px-4 py-2 text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
