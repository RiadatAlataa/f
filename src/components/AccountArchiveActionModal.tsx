import React, { useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Ban,
  Trash2,
  X,
  ShieldAlert,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export type AccountArchiveMode = 'archive' | 'deactivate' | 'permanent_delete';

interface AccountArchiveActionModalProps {
  isOpen: boolean;
  entityType: 'beneficiary' | 'volunteer';
  entityName: string;
  fileNumber?: string;
  secondaryLabel?: string;
  canPermanentDelete?: boolean;
  hasLinkedHistory?: boolean;
  linkedHistorySummary?: string;
  onClose: () => void;
  onConfirm: (payload: {
    actionType: AccountArchiveMode;
    reason: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export const AccountArchiveActionModal: React.FC<AccountArchiveActionModalProps> = ({
  isOpen,
  entityType,
  entityName,
  fileNumber,
  secondaryLabel,
  canPermanentDelete = false,
  hasLinkedHistory = false,
  linkedHistorySummary,
  onClose,
  onConfirm,
}) => {
  const [actionType, setActionType] = useState<AccountArchiveMode>('archive');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const isBen = entityType === 'beneficiary';
  const presetReasons = isBen
    ? [
        'انتقال السكن خارج نطاق الجمعية',
        'عدم الحاجة للدعم واستقرار الوضع المالي',
        'عدم تحديث البيانات أو تكرار الملف',
        'طلب خطي من المستفيد بإنهاء الملف',
      ]
    : [
        'انتهاء فترة التطوع أو الاعتذار الشخصي',
        'عدم التفرغ وتوقف المشاركة التطوعية',
        'مخالفة ميثاق العمل التطوعي',
        'ازدواجية الحساب أو تحديث السجلات',
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!reason.trim()) {
      setErrorMsg('يرجى إدخال سبب واضح لتوثيق العملية في سجل التدقيق.');
      return;
    }
    if (!confirmed) {
      setErrorMsg('يرجى تحديد مربع التأكيد النهائي قبل تنفيذ الإجراء.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onConfirm({ actionType, reason: reason.trim() });
      if (!result.ok) {
        setErrorMsg(result.error || 'تعذر تنفيذ الإجراء، يرجى المحاولة مرة أخرى.');
      } else {
        setReason('');
        setConfirmed(false);
        setActionType('archive');
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع أثناء المعالجة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-navy-950/75 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-black text-base">
                {isBen ? 'إدارة حذف أو أرشفة المستفيد' : 'إدارة حذف أو أرشفة المتطوع'}
              </h3>
              <p className="text-xs text-red-100">
                إجراء إداري خاضع للتدقيق وحماية السجلات التاريخية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Identity Summary */}
          <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500">
                {isBen ? 'اسم المستفيد:' : 'اسم المتطوع:'}
              </span>
              <span className="text-sm font-black text-navy-950 dark:text-white">
                {entityName}
              </span>
            </div>
            {fileNumber && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">رقم الملف / العضوية:</span>
                <span className="text-xs font-mono font-bold text-royal-700 dark:text-royal-400">
                  {fileNumber}
                </span>
              </div>
            )}
            {secondaryLabel && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-500">
                  {isBen ? 'التصنيف / الهاتف:' : 'الفريق / الهاتف:'}
                </span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {secondaryLabel}
                </span>
              </div>
            )}
          </div>

          {hasLinkedHistory && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-900 dark:text-amber-200 text-xs">
              <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-extrabold">تنبيه حماية السجلات المرتبطة:</p>
                <p className="leading-relaxed">
                  {linkedHistorySummary ||
                    'يوجد سجلات تاريخية مرتبطة بهذا الحساب (مساعدات، طلبات، حضور أو شهادات). يتم تفعيل الأرشفة الآمنة للحفاظ على التقارير المالية والرقابية دون مسح الأثر التاريخي.'}
                </p>
              </div>
            </div>
          )}

          {/* Action Modes */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-navy-900 dark:text-slate-200">
              اختر نوع الإجراء المطلوب:
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                actionType === 'archive'
                  ? 'border-royal-500 bg-royal-50/70 dark:bg-royal-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="archiveMode"
                checked={actionType === 'archive'}
                onChange={() => setActionType('archive')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-extrabold text-sm text-navy-950 dark:text-white">
                  <Archive size={16} className="text-royal-600" />
                  <span>أرشفة الحساب (موصى به)</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {isBen
                    ? 'نقل المستفيد إلى أرشيف المستفيدين، إيقاف الدخول، واستبعاده من القوائم النشطة والتوزيعات الجديدة مع حفظ كافة المساعدات السابقة.'
                    : 'نقل المتطوع إلى أرشيف المتطوعين، تحديث إحصائيات الفريق، وإيقاف الدخول مع حفظ النقاط والشهادات وسجل الحضور.'}
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                actionType === 'deactivate'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                type="radio"
                name="archiveMode"
                checked={actionType === 'deactivate'}
                onChange={() => setActionType('deactivate')}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-extrabold text-sm text-navy-950 dark:text-white">
                  <Ban size={16} className="text-amber-600" />
                  <span>تعطيل الحساب مؤقتاً</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  إيقاف تسجيل الدخول واستبعاده من القوائم النشطة مع إمكانية الاستعادة الفورية لاحقاً.
                </p>
              </div>
            </label>

            {canPermanentDelete && (
              <label
                className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                  hasLinkedHistory
                    ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900'
                    : actionType === 'permanent_delete'
                      ? 'border-red-500 bg-red-50/70 dark:bg-red-950/30 cursor-pointer'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-red-50/30 cursor-pointer'
                }`}
              >
                <input
                  type="radio"
                  name="archiveMode"
                  disabled={hasLinkedHistory}
                  checked={actionType === 'permanent_delete'}
                  onChange={() => !hasLinkedHistory && setActionType('permanent_delete')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-extrabold text-sm text-red-700 dark:text-red-400">
                    <Trash2 size={16} />
                    <span>حذف نهائي من قاعدة البيانات</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {hasLinkedHistory
                      ? 'معطل تلقائياً لأن هذا الحساب مرتبط بسجلات رسمية تاريخية لا يجوز محوها.'
                      : 'حذف السجل بالكامل لعدم وجود أي ارتباطات أو معاملات مالية أو تشغيلية.'}
                  </p>
                </div>
              </label>
            )}
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-navy-900 dark:text-slate-200">
              سبب الإجراء (إلزامي لتوثيق سجل التدقيق) <span className="text-red-600">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {presetReasons.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-royal-50 dark:hover:bg-royal-900/40 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            <textarea
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب السبب الإداري بوضوح..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-sm text-navy-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          {/* Secondary Confirmation Step */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/70 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 accent-red-600"
            />
            <span className="text-xs font-bold text-red-900 dark:text-red-200 leading-relaxed">
              أقرّ بتحمّل المسؤولية الإدارية وأؤكد رغبتي في تنفيذ{' '}
              {actionType === 'permanent_delete'
                ? 'الحذف النهائي'
                : actionType === 'deactivate'
                  ? 'تعطيل الحساب'
                  : 'الأرشفة الآمنة'}{' '}
              للملف ({entityName}).
            </span>
          </label>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-xs font-bold text-red-800 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !confirmed || !reason.trim()}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-extrabold flex items-center gap-2 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري التنفيذ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>تأكيد التنفيذ</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
