import React, { useRef } from "react";
import { Printer, Download, X, Shield, FileText, CheckCircle2, Building2 } from "lucide-react";
import { HomeSettings } from "../types";

export interface OfficialLetterheadProps {
  documentTitle?: string;
  documentNumber?: string;
  hijriDate?: string;
  gregorianDate?: string;
  subject?: string;
  recipientTitle?: string; // e.g. "سعادة مدير عام فرع وزارة الموارد البشرية والتنمية الاجتماعية بمكة المكرمة المحترم"
  children: React.ReactNode;
  signatoryName?: string;
  signatoryTitle?: string;
  signatoryDepartment?: string;
  signatureUrl?: string;
  stampUrl?: string;
  showSignature?: boolean;
  showStamp?: boolean;
  orientation?: 'portrait' | 'landscape';
  homeSettings?: HomeSettings;
  onClose?: () => void;
  showActions?: boolean;
  isModal?: boolean;
}

export const OfficialLetterheadTemplate: React.FC<OfficialLetterheadProps> = ({
  documentTitle = "خطاب رسمي معتمد",
  documentNumber = "",
  hijriDate = "",
  gregorianDate = new Date().toISOString().split('T')[0],
  subject = "",
  recipientTitle = "",
  children,
  signatoryName = "",
  signatoryTitle = "",
  signatoryDepartment = "",
  signatureUrl = "",
  stampUrl = "",
  showSignature = true,
  showStamp = true,
  orientation = 'portrait',
  homeSettings,
  onClose,
  showActions = true,
  isModal = true
}) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Default association values from official requirements
  const associationNameAr = homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة";
  const licenseNumber = homeSettings?.officialLetterhead?.licenseNumber || homeSettings?.licenseNumber || "1000888600";
  const logoUrl = homeSettings?.officialLetterhead?.logoUrl || homeSettings?.logoUrl || "/logo.png";
  const stampImage = stampUrl || homeSettings?.officialLetterhead?.officialStampUrl || "";
  const signatureImage = signatureUrl || homeSettings?.officialLetterhead?.officialSignatureUrl || "";
  const footerAddress = homeSettings?.officialLetterhead?.footerAddressAr || "مكة المكرمة - مخطط العسيلة - المملكة العربية السعودية";
  const footerContact = homeSettings?.officialLetterhead?.footerContactAr || `هاتف: ${homeSettings?.contactPhone || '0550123456'} | بريد: ${homeSettings?.contactEmail || 'info@riadataleata.org.sa'}`;
  const footerBankInfo = homeSettings?.officialLetterhead?.footerBankInfoAr || "الحساب البنكي المعتمد (مصرف الراجحي): SA0000000000000000000000";

  // Computed default Hijri Date if not explicitly provided
  const computedHijriDate = React.useMemo(() => {
    if (hijriDate) return hijriDate;
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date());
    } catch {
      return "";
    }
  }, [hijriDate]);

  // Trigger print directly with native print styles
  const handlePrint = () => {
    window.print();
  };

  const documentContent = (
    <>
      {/* Strict Print CSS for A4 Letterhead isolation and crisp text-selectable PDF */}
      <style>{`
        @media print {
          @page {
            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: 10mm 10mm 10mm 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #111827 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 11pt !important;
            direction: rtl !important;
          }
          body * {
            visibility: hidden;
          }
          .official-document-sheet, .official-document-sheet * {
            visibility: visible;
          }
          .official-document-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .no-print, [role="navigation"], aside, nav, button, .mobile-safe-header, .mobile-safe-bottom-nav {
            display: none !important;
          }
          .break-inside-avoid, .signature-block, tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <div 
        ref={printContainerRef}
        className={`official-document-sheet bg-white text-neutral-900 mx-auto print:mx-0 shadow-lg print:shadow-none border border-neutral-300 print:border-none p-8 sm:p-12 print:p-6 flex flex-col justify-between transition-colors duration-200 ${
          orientation === 'landscape' ? 'max-w-[297mm] min-h-[210mm]' : 'max-w-[210mm] min-h-[297mm]'
        }`}
        dir="rtl"
        style={{
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#171717',
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        }}
      >
      {/* ------------------------------------------------------------------ */}
      {/* 1. OFFICIAL LETTERHEAD (ترويسة الخطاب والمستند الرسمي) */}
      {/* ------------------------------------------------------------------ */}
      <header className="border-b-2 border-emerald-800 pb-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          {/* Right Header (Kingdom & National Center & Association Name) */}
          <div className="text-right text-xs leading-relaxed space-y-0.5">
            <p className="font-bold text-neutral-800">المملكة العربية السعودية</p>
            <p className="text-[11px] text-neutral-600">المركز الوطني لتنمية القطاع غير الربحي</p>
            <p className="text-[11px] text-neutral-600">إشراف وزارة الموارد البشرية والتنمية الاجتماعية</p>
            <h1 className="text-sm font-black text-emerald-800 pt-1 font-association-brand">
              {associationNameAr}
            </h1>
            <p className="text-[10px] font-bold text-neutral-600 font-mono">
              رقم الترخيص: <span className="text-emerald-900 font-black">{licenseNumber}</span>
            </p>
          </div>

          {/* Center: Official Association Emblem / Logo */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-emerald-200/60 p-1 bg-white shadow-2xs flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt="شعار جمعية ريادة العطاء" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback emblem if local asset missing
                  (e.target as HTMLElement).style.display = 'none';
                  (e.target as HTMLElement).parentElement?.classList.add('fallback-logo');
                }}
              />
              <div className="hidden fallback-logo:flex flex-col items-center justify-center text-emerald-800 text-center">
                <Building2 className="w-8 h-8 text-emerald-700" />
                <span className="text-[8px] font-black mt-1">ريادة العطاء</span>
              </div>
            </div>
            <span className="text-[9px] font-bold text-emerald-800 tracking-wider mt-1">
              خدمة الإنسان بالعسيلة
            </span>
          </div>

          {/* Left Header (Document Reference & Dates) */}
          <div className="text-left text-xs space-y-1.5 min-w-[130px] font-mono">
            {documentNumber && (
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 font-sans block">رقم المستند / الصادر:</span>
                <span className="font-black text-neutral-900">{documentNumber}</span>
              </div>
            )}
            {(computedHijriDate || hijriDate) && (
              <div className="text-right">
                <span className="text-[10px] text-neutral-500 font-sans block">التاريخ الهجري:</span>
                <span className="font-bold text-neutral-800">{computedHijriDate || hijriDate}</span>
              </div>
            )}
            <div className="text-right">
              <span className="text-[10px] text-neutral-500 font-sans block">التاريخ الميلادي:</span>
              <span className="font-bold text-neutral-800">{gregorianDate}</span>
            </div>
          </div>
        </div>

        {/* Decorative Golden / Emerald Bottom Line */}
        <div className="w-full h-1 bg-gradient-to-r from-emerald-800 via-amber-600 to-emerald-800 mt-3 rounded-full" />
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* 2. DOCUMENT RECIPIENT & SUBJECT (الموضوع والمخاطب) */}
      {/* ------------------------------------------------------------------ */}
      {(recipientTitle || subject || documentTitle) && (
        <div className="mb-6 space-y-3">
          {recipientTitle && (
            <div className="text-sm font-black text-neutral-900 leading-relaxed">
              <span>{recipientTitle}</span>
              <p className="text-xs font-bold text-neutral-600 mt-1">السلام عليكم ورحمة الله وبركاته،،،</p>
            </div>
          )}

          {subject && (
            <div className="p-2.5 rounded-lg bg-emerald-50/70 border-r-4 border-emerald-700 text-xs sm:text-sm font-bold text-emerald-950 flex items-center justify-between">
              <span className="font-black text-emerald-900">الموضوع: {subject}</span>
              {documentTitle && (
                <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-white text-emerald-800 border border-emerald-200">
                  {documentTitle}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* 3. OFFICIAL CONTENT BODY (نص الخطاب أو التقرير أو السجل) */}
      {/* ------------------------------------------------------------------ */}
      <main className="flex-1 my-4 text-xs sm:text-sm text-neutral-800 leading-relaxed print-document-body">
        {children}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* 4. SIGNATORY & OFFICIAL STAMP BLOCK (الاعتماد، التوقيع، والختم) */}
      {/* ------------------------------------------------------------------ */}
      <div className="mt-8 pt-4 border-t border-neutral-200 signature-block break-inside-avoid page-break-inside-avoid">
        <div className="flex items-end justify-between">
          {/* Association QR / Reference Verification Code */}
          <div className="text-right text-[10px] text-neutral-500 font-mono space-y-0.5">
            <p className="font-bold text-neutral-700 font-sans">وثيقة رسمية صادرة إلكترونياً</p>
            <p>كود التحقق: {documentNumber ? `${documentNumber}-VERIFIED` : 'REQ-AUTH-2026'}</p>
            <p className="text-[9px] text-neutral-400">أي كشط أو تعديل يلغي صحة المستند</p>
          </div>

          {/* Official Signatory, Title, Signature & Stamp */}
          <div className="text-center min-w-[200px] flex flex-col items-center">
            {signatoryTitle && (
              <p className="text-xs font-black text-neutral-900">
                {signatoryTitle}
              </p>
            )}
            {signatoryDepartment && (
              <p className="text-[11px] text-neutral-600 font-bold">
                {signatoryDepartment}
              </p>
            )}

            {/* Signature & Stamp Overlay Area */}
            <div className="relative w-44 h-24 my-1 flex items-center justify-center">
              {/* Official Stamp */}
              {showStamp && stampImage && (
                <img 
                  src={stampImage} 
                  alt="ختم الجمعية الرسمي" 
                  className="absolute inset-0 w-full h-full object-contain opacity-90 pointer-events-none rotate-[-6deg]"
                />
              )}

              {/* Official Signature */}
              {showSignature && signatureImage ? (
                <img 
                  src={signatureImage} 
                  alt="توقيع المسؤول المعتمد" 
                  className="relative z-10 w-full h-full object-contain"
                />
              ) : (
                /* Fallback Dignified Seal if signature image not set */
                <div className="relative z-10 border border-dashed border-emerald-400/50 rounded-xl px-4 py-2 bg-emerald-50/40 text-[11px] text-emerald-800 font-bold">
                  {signatoryName || "معتمد رسمياً"}
                </div>
              )}
            </div>

            {signatoryName && (
              <p className="text-xs font-black text-neutral-900 mt-1 border-t border-neutral-200 pt-1 w-full">
                {signatoryName}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 5. OFFICIAL FOOTER (تذييل الصفحة وبيانات الجمعية المعتمدة) */}
      {/* ------------------------------------------------------------------ */}
      <footer className="mt-6 pt-3 border-t-2 border-emerald-800 text-[10px] text-neutral-600 print-document-footer">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-right">
          <div>
            <p className="font-bold text-neutral-800">{footerAddress}</p>
            <p>{footerContact}</p>
          </div>
          <div className="text-center sm:text-left font-mono">
            <p className="font-bold text-emerald-900">{footerBankInfo}</p>
            <p className="text-[9px] text-neutral-500 font-sans">الموقع الإلكتروني: riadataleata.org.sa</p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );

  // If used inside a Modal dialog (Preview & Print workflow)
  if (isModal) {
    return (
      <div 
        className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-white animate-fade-in"
        dir="rtl"
      >
        <div className="relative w-full max-w-4xl bg-neutral-100 dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden border border-neutral-300 dark:border-neutral-700 flex flex-col max-h-[95vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
          {/* Top Sticky Bar with Print & Close Actions (Hidden in Print) */}
          {showActions && (
            <div className="no-print bg-white dark:bg-neutral-800 p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-4 sticky top-0 z-20">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                  معاينة المستند الرسمي للطباعة والتصدير
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  A4 RTL • معتمد
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95"
                  title="طباعة فورية أو حفظ بصيغة PDF بنص قابل للتحديد والنسخ"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة المستند الرسمي</span>
                </button>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-200 transition-colors cursor-pointer"
                    title="إغلاق النافذة (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Printable Sheet Viewport */}
          <div className="p-4 sm:p-8 overflow-y-auto flex-1 print:p-0 print:overflow-visible bg-neutral-200/60 dark:bg-neutral-950/80">
            {documentContent}
          </div>
        </div>
      </div>
    );
  }

  // Non-modal direct container embed
  return (
    <div className="w-full">
      {showActions && (
        <div className="no-print flex items-center justify-end gap-2 mb-4">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة المستند الرسمي (A4)</span>
          </button>
        </div>
      )}
      {documentContent}
    </div>
  );
};
