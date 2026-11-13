import React, { useState, useMemo } from 'react';
import {
  Archive,
  RotateCcw,
  Search,
  UserCheck,
  Calendar,
  FileText,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Beneficiary, Volunteer, VolunteerTeam } from '../types';

interface ArchivesDirectoryPanelProps {
  mode: 'beneficiaries' | 'volunteers';
  beneficiaries?: Beneficiary[];
  volunteers?: Volunteer[];
  teams?: VolunteerTeam[];
  onRestore: (id: string) => Promise<{ ok: boolean; error?: string }>;
}

export const ArchivesDirectoryPanel: React.FC<ArchivesDirectoryPanelProps> = ({
  mode,
  beneficiaries = [],
  volunteers = [],
  teams = [],
  onRestore,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'archived' | 'deactivated'>('all');
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const archivedRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (mode === 'beneficiaries') {
      return (beneficiaries || [])
        .filter((b) => b.isArchived === true || b.status === 'archived' || b.status === 'deactivated')
        .filter((b) => statusFilter === 'all' || b.status === statusFilter)
        .filter((b) => {
          if (!q) return true;
          return (
            (b.name || '').toLowerCase().includes(q) ||
            (b.nationalId || '').toLowerCase().includes(q) ||
            (b.beneficiaryNumber || '').toLowerCase().includes(q) ||
            (b.phone || '').toLowerCase().includes(q) ||
            (b.archiveReason || '').toLowerCase().includes(q)
          );
        });
    }

    return (volunteers || [])
      .filter((v) => v.isArchived === true || v.status === 'archived' || v.status === 'deactivated')
      .filter((v) => statusFilter === 'all' || v.status === statusFilter)
      .filter((v) => {
        if (!q) return true;
        return (
          (v.name || '').toLowerCase().includes(q) ||
          (v.nationalId || '').toLowerCase().includes(q) ||
          (v.membershipNumber || '').toLowerCase().includes(q) ||
          (v.fileNumber || v.file_number || '').toLowerCase().includes(q) ||
          (v.phone || '').toLowerCase().includes(q) ||
          (v.archiveReason || '').toLowerCase().includes(q)
        );
      });
  }, [mode, beneficiaries, volunteers, search, statusFilter]);

  const handleConfirmRestore = async (id: string) => {
    setRestoringId(id);
    setFeedback(null);
    try {
      const res = await onRestore(id);
      if (res.ok) {
        setFeedback({
          type: 'success',
          text: 'تمت استعادة الحساب بنجاح مع الاحتفاظ بالملف الأصلي والرقم المرجعي دون تكرار.',
        });
        setConfirmRestoreId(null);
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'تعذرت استعادة الحساب.',
        });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'حدث خطأ أثناء الاستعادة.' });
    } finally {
      setRestoringId(null);
    }
  };

  const title = mode === 'beneficiaries' ? 'أرشيف المستفيدين' : 'أرشيف المتطوعين';
  const targetForConfirm = archivedRecords.find((r: any) => r.id === confirmRestoreId) as any;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-white flex items-center justify-center shrink-0">
            <Archive size={22} />
          </div>
          <div>
            <h2 className="text-lg font-black text-navy-950 dark:text-white">{title}</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              إدارة الحسابات المؤرشفة والمعطلة مع حفظ كامل السجلات التاريخية وإتاحة الاستعادة بنفس الرقم الأصلي
            </p>
          </div>
        </div>
        <div className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs font-extrabold text-navy-900 dark:text-slate-200">
          إجمالي السجلات المؤرشفة: {archivedRecords.length}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm font-bold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، رقم الملف، رقم الهوية، الجوال، أو سبب الأرشفة..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-royal-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold"
        >
          <option value="all">جميع الحالات المؤرشفة</option>
          <option value="archived">مؤرشف</option>
          <option value="deactivated">معطل مؤقتاً</option>
        </select>
      </div>

      {archivedRecords.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-2">
          <ShieldCheck size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            لا توجد حسابات في {title} مطابقة لمعايير البحث حالياً.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {archivedRecords.map((rec: any) => {
            const refCode =
              mode === 'beneficiaries'
                ? rec.beneficiaryNumber || rec.barcodeId || rec.id
                : rec.fileNumber || rec.file_number || rec.membershipNumber || rec.id;
            const teamObj =
              mode === 'volunteers'
                ? teams.find((t) => t.id === rec.teamId)
                : null;
            const archivedDate = rec.archivedAt || rec.deactivatedAt;
            const isDeactivated = rec.status === 'deactivated';

            return (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-black text-base text-navy-950 dark:text-white">
                        {rec.name}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 font-semibold">
                        <span className="font-mono text-royal-700 dark:text-royal-400">
                          {refCode}
                        </span>
                        {rec.nationalId && <span>• هوية: {rec.nationalId}</span>}
                        {rec.phone && <span>• {rec.phone}</span>}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-extrabold ${
                        isDeactivated
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isDeactivated ? 'معطل مؤقتاً' : 'مؤرشف'}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <FileText size={14} className="shrink-0 mt-0.5 text-slate-400" />
                      <span>
                        <strong>سبب الأرشفة:</strong> {rec.archiveReason || 'غير مسجل'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <UserCheck size={13} />
                        بواسطة: {rec.archivedBy || rec.deactivatedBy || 'الإدارة'}
                      </span>
                      {archivedDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={13} />
                          {new Date(archivedDate).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                    </div>
                    {mode === 'volunteers' && (
                      <div className="pt-1 text-royal-700 dark:text-royal-400 font-bold">
                        النقاط المحفوظة: {rec.points || 0} نقطة • الساعات: {rec.volunteerHours || rec.hours || 0} ساعة
                        {teamObj ? ` • الفريق: ${teamObj.nameAr}` : ''}
                      </div>
                    )}
                    {mode === 'beneficiaries' && (
                      <div className="pt-1 text-emerald-700 dark:text-emerald-400 font-bold">
                        الفئة: {rec.category || 'أسر متعففة'} • سجل المساعدات: {(rec.aidHistory || []).length} عملية
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmRestoreId(rec.id)}
                  disabled={restoringId === rec.id}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition-colors"
                >
                  {restoringId === rec.id ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>جاري الاستعادة...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw size={15} />
                      <span>استعادة الحساب</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {targetForConfirm && (
        <div className="fixed inset-0 z-[100] bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-navy-950 dark:text-white flex items-center gap-2">
              <RotateCcw size={20} className="text-emerald-600" />
              تأكيد استعادة الحساب
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              هل تريد استعادة حساب <strong>{targetForConfirm.name}</strong> إلى الحالة النشطة؟ سيتم الاحتفاظ برقم الملف الأصلي (
              <span className="font-mono font-bold">
                {mode === 'beneficiaries'
                  ? targetForConfirm.beneficiaryNumber || targetForConfirm.id
                  : targetForConfirm.fileNumber || targetForConfirm.membershipNumber || targetForConfirm.id}
              </span>
              ) وكافة السجلات التاريخية دون أي تكرار.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRestoreId(null)}
                disabled={Boolean(restoringId)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestore(targetForConfirm.id)}
                disabled={Boolean(restoringId)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-extrabold flex items-center gap-2"
              >
                {restoringId ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />}
                <span>تأكيد الاستعادة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
