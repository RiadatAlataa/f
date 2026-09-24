import React, { useRef } from 'react';
import { FinancialReceipt, FinancialSettings } from '../../types/finance';
import { Printer, X, CheckCircle2, QrCode, ShieldCheck, Download } from 'lucide-react';

interface FinancialReceiptModalProps {
  receipt: FinancialReceipt | null;
  settings?: FinancialSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const FinancialReceiptModal: React.FC<FinancialReceiptModalProps> = ({
  receipt,
  settings,
  isOpen,
  onClose
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !receipt) return null;

  const isIncome = receipt.type === 'receipt';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-right dir-rtl animate-in fade-in zoom-in-95 duration-200">
        {/* Header Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/80 dark:bg-neutral-850/80 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند / PDF</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">
              {isIncome ? 'سند قبض رسمي معتمد' : 'سند صرف رسمي معتمد'}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div ref={printRef} className="p-8 sm:p-10 bg-white dark:bg-neutral-900 printable-voucher">
          {/* Border Frame Style */}
          <div className="p-6 sm:p-8 rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 relative bg-neutral-50/30 dark:bg-neutral-850/20">
            {/* Top Bar: Association Header */}
            <div className="flex items-center justify-between border-b-2 border-emerald-600/30 dark:border-emerald-500/30 pb-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-700 flex items-center justify-center text-white shadow-md">
                  <ShieldCheck className="w-9 h-9" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white">
                    {settings?.associationName || 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة'}
                  </h1>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {settings?.licenseNumber || 'ترخيص رسمي رقم: 100054219'} | مكة المكرمة - العسيلة
                  </p>
                </div>
              </div>

              <div className="text-left font-mono">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${isIncome ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                  {isIncome ? 'سند قـبـض' : 'سـنـد صـرف'}
                </span>
                <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200 mt-2">
                  {receipt.receiptNumber}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  التاريخ: {receipt.date}
                </div>
              </div>
            </div>

            {/* Amount Badge */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">المبلغ بالأرقام:</span>
                <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-300">
                  {receipt.amount.toLocaleString()} <span className="text-sm font-normal">ريال سعودي</span>
                </span>
              </div>
              <div className="text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-300">
                {receipt.amountInWords || `${receipt.amount.toLocaleString()} ريال سعودي لا غير`}
              </div>
            </div>

            {/* Main Details Grid */}
            <div className="space-y-4 text-sm text-neutral-800 dark:text-neutral-200">
              <div className="flex items-start gap-3 py-2 border-b border-neutral-200/80 dark:border-neutral-750">
                <span className="w-32 font-bold text-neutral-500 dark:text-neutral-400 shrink-0">
                  {isIncome ? 'استلمنا من المكرم:' : 'يُصرف إلى المكرم:'}
                </span>
                <span className="font-semibold text-base text-neutral-900 dark:text-white">
                  {receipt.partyName}
                </span>
              </div>

              <div className="flex items-start gap-3 py-2 border-b border-neutral-200/80 dark:border-neutral-750">
                <span className="w-32 font-bold text-neutral-500 dark:text-neutral-400 shrink-0">
                  وذلك مقابل (البيان):
                </span>
                <span className="font-medium">
                  {receipt.reason}
                </span>
              </div>

              {receipt.projectName && (
                <div className="flex items-start gap-3 py-2 border-b border-neutral-200/80 dark:border-neutral-750">
                  <span className="w-32 font-bold text-neutral-500 dark:text-neutral-400 shrink-0">
                    المشروع / المبادرة:
                  </span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                    {receipt.projectName}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-500 dark:text-neutral-400">الحساب المالي:</span>
                  <span className="font-medium text-xs sm:text-sm">{receipt.accountName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-neutral-500 dark:text-neutral-400">طريقة الدفع:</span>
                  <span className="font-medium text-xs sm:text-sm">
                    {receipt.paymentMethod === 'bank_transfer' ? 'تحويل بنكي رسمي' : receipt.paymentMethod === 'card' ? 'بطاقة بنكية مدى / فيزا' : receipt.paymentMethod === 'cash' ? 'نقداً عبر الخزينة' : 'شيك بنكي'}
                  </span>
                </div>
              </div>

              {receipt.referenceNumber && (
                <div className="flex items-center gap-2 pt-1 text-xs text-neutral-500">
                  <span className="font-bold">رقم المرجع / الحوالة:</span>
                  <span className="font-mono">{receipt.referenceNumber}</span>
                </div>
              )}
            </div>

            {/* Footer Signatures & QR Code */}
            <div className="mt-8 pt-6 border-t-2 border-neutral-200 dark:border-neutral-750 flex items-end justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-white border border-neutral-300 shadow-2xs flex flex-col items-center">
                  <QrCode className="w-14 h-14 text-neutral-800" />
                  <span className="text-[9px] font-mono text-neutral-600 mt-1">التحقق الإلكتروني</span>
                </div>
                <div className="text-xs text-neutral-500 space-y-1">
                  <div>رمز التحقق: <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300">{receipt.qrVerificationCode}</span></div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مستند إلكتروني معتمد رسمياً</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs text-neutral-400 mb-1">الموظف المسؤول:</div>
                <div className="text-sm font-bold text-neutral-800 dark:text-neutral-200">{receipt.issuedByName}</div>
                <div className="text-[11px] text-neutral-400 mt-4 border-t border-neutral-300 dark:border-neutral-700 pt-1 px-4">
                  التوقيع والختم المالي
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 no-print">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
