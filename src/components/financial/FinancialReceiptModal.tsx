import React from 'react';
import { FinancialReceipt, FinancialSettings } from '../../types/finance';
import { CheckCircle2, QrCode, CreditCard, Building2 } from 'lucide-react';
import { OfficialLetterheadTemplate } from '../OfficialLetterheadTemplate';

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
  if (!isOpen || !receipt) return null;

  const isIncome = receipt.type === 'receipt';
  const docTitle = isIncome ? 'سند قبض مالي رسمي معتمد' : 'سند صرف مالي رسمي معتمد';

  return (
    <OfficialLetterheadTemplate
      documentTitle={docTitle}
      documentNumber={receipt.receiptNumber}
      gregorianDate={receipt.date}
      subject={`${isIncome ? 'استلام وقبض مالي من' : 'صرف وإيداع مالي إلى'}: ${receipt.partyName}`}
      recipientTitle={isIncome ? 'المكرم / الجهة الدافعة المحترمين' : 'المكرم / الجهة المستفيدة المحترمين'}
      signatoryName={receipt.issuedByName || 'أ. فهد بن ناصر العتيبي'}
      signatoryTitle="المشرف المالي وعضو مجلس الإدارة"
      signatoryDepartment="الإدارة المالية والمحاسبية"
      onClose={onClose}
      isModal={true}
    >
      <div className="space-y-6 text-neutral-900" dir="rtl">
        {/* Document Subtype Ribbon */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-50 border border-neutral-200">
          <div className="flex items-center gap-2">
            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black ${
              isIncome 
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}>
              {isIncome ? 'سند قـبـض رسمي' : 'سـنـد صـرف رسمي'}
            </span>
            <span className="text-xs font-bold text-neutral-700">
              {isIncome ? 'إيداع نقدي / بنكي معتمد' : 'صرف نفقات برامج ومشاريع'}
            </span>
          </div>

          <div className="text-xs font-mono font-bold text-neutral-600">
            رقم السند: <span className="text-neutral-900 font-black">{receipt.receiptNumber}</span>
          </div>
        </div>

        {/* Amount Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-emerald-50 border-2 border-emerald-700/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xs sm:text-sm font-bold text-emerald-900">المبلغ المستلم / المصروف:</span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-800">
              {receipt.amount.toLocaleString('ar-SA')} 
            </span>
            <span className="text-xs font-bold text-emerald-900">ريال سعودي (SAR)</span>
          </div>

          <div className="text-xs sm:text-sm font-bold text-neutral-800 bg-white px-4 py-2 rounded-xl border border-emerald-200 shadow-2xs text-center">
            فقط: {receipt.amountInWords || `${receipt.amount.toLocaleString()} ريال سعودي لا غير`}
          </div>
        </div>

        {/* Detailed Voucher Ledger Table */}
        <div className="overflow-hidden rounded-xl border border-neutral-300">
          <table className="w-full text-right text-xs">
            <tbody>
              <tr className="border-b border-neutral-200 bg-neutral-50/70">
                <td className="w-36 p-3 font-black text-neutral-700 bg-neutral-100/70 border-l border-neutral-200">
                  {isIncome ? 'وصلنا من المكرم / الجهة:' : 'يُصرف إلى المكرم / الجهة:'}
                </td>
                <td className="p-3 font-black text-sm text-neutral-900">
                  {receipt.partyName}
                </td>
              </tr>

              <tr className="border-b border-neutral-200">
                <td className="p-3 font-black text-neutral-700 bg-neutral-100/70 border-l border-neutral-200">
                  وذلك لقاء (البيان الرسمي):
                </td>
                <td className="p-3 font-medium text-neutral-800 leading-relaxed">
                  {receipt.reason}
                </td>
              </tr>

              {receipt.projectName && (
                <tr className="border-b border-neutral-200 bg-neutral-50/70">
                  <td className="p-3 font-black text-neutral-700 bg-neutral-100/70 border-l border-neutral-200">
                    المشروع / المبادرة:
                  </td>
                  <td className="p-3 font-bold text-emerald-900">
                    {receipt.projectName}
                  </td>
                </tr>
              )}

              <tr className="border-b border-neutral-200">
                <td className="p-3 font-black text-neutral-700 bg-neutral-100/70 border-l border-neutral-200">
                  الحساب المالي والبنكي:
                </td>
                <td className="p-3 font-medium text-neutral-800">
                  {receipt.accountName}
                </td>
              </tr>

              <tr className="border-b border-neutral-200 bg-neutral-50/70">
                <td className="p-3 font-black text-neutral-700 bg-neutral-100/70 border-l border-neutral-200">
                  طريقة التحصيل / الصرف:
                </td>
                <td className="p-3 font-bold text-neutral-900">
                  {receipt.paymentMethod === 'bank_transfer' ? 'تحويل بنكي رسمي' : 
                   receipt.paymentMethod === 'card' ? 'بطاقة بنكية مدى / فيزا' : 
                   receipt.paymentMethod === 'cash' ? 'نقداً عبر الخزينة' : 'شيك بنكي معتمد'}
                </td>
              </tr>

              {receipt.referenceNumber && (
                <tr>
                  <td className="p-3 font-black text-neutral-700 bg-neutral-100/70 border-l border-neutral-200">
                    رقم الحوالة / المرجع:
                  </td>
                  <td className="p-3 font-mono font-bold text-neutral-900">
                    {receipt.referenceNumber}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Verification and Legal Validity Statement */}
        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white border border-neutral-300 shadow-2xs">
              <QrCode className="w-12 h-12 text-neutral-800" />
            </div>
            <div className="text-xs space-y-1">
              <div className="font-bold text-neutral-800">
                رمز التوثيق الإلكتروني: <span className="font-mono text-emerald-800">{receipt.qrVerificationCode || 'FIN-2026-VAL'}</span>
              </div>
              <div className="text-[11px] text-neutral-500 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>سند مالي رسمي صادر من المنظومة التقنية المعتمدة لجمعية ريادة العطاء</span>
              </div>
            </div>
          </div>

          <div className="text-center sm:text-left text-[11px] text-neutral-500">
            <p>المحاسب المسؤول: <strong className="text-neutral-800">{receipt.issuedByName}</strong></p>
            <p className="text-[10px] text-neutral-400 mt-0.5">تم التحقق من القيد المالي والترحيل للدفاتر</p>
          </div>
        </div>
      </div>
    </OfficialLetterheadTemplate>
  );
};
