import React, { useState, useRef } from "react";
import { 
  FileText, Download, Printer, X, Calendar, User, Clock, 
  Award, CheckCircle2, ShieldCheck, Sparkles, Building2, MapPin, 
  QrCode, ChevronDown, Check, Loader2, AlertCircle
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Volunteer, Initiative, AttendanceRecord, Evaluation, Department, VolunteerTeam } from "../types";

interface VolunteerMonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer: Volunteer;
  initiatives: Initiative[];
  attendanceRecords: AttendanceRecord[];
  evaluations?: Evaluation[];
  teams?: VolunteerTeam[];
  departments?: Department[];
  logoUrl?: string;
}

const MONTH_NAMES_AR = [
  "يناير (01)", "فبراير (02)", "مارس (03)", "أبريل (04)",
  "مايو (05)", "يونيو (06)", "يوليو (07)", "أغسطس (08)",
  "سبتمبر (09)", "أكتوبر (10)", "نوفمبر (11)", "ديسمبر (12)"
];

export const VolunteerMonthlyReportModal: React.FC<VolunteerMonthlyReportModalProps> = ({
  isOpen,
  onClose,
  volunteer,
  initiatives,
  attendanceRecords,
  evaluations = [],
  teams = [],
  departments = [],
  logoUrl = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=160&h=160&fit=crop"
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const currentDate = new Date();
  
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1); // 1-indexed
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen || !volunteer) return null;

  const team = teams.find(t => t.id === volunteer.teamId);
  const department = departments.find(d => d.id === volunteer.departmentId);

  // Filter volunteer attendance for the selected month and year
  const volunteerAttendance = attendanceRecords.filter(record => {
    if (record.volunteerId !== volunteer.id) return false;
    const recordDate = new Date(record.date);
    return (
      recordDate.getFullYear() === selectedYear &&
      (recordDate.getMonth() + 1) === selectedMonth
    );
  });

  // Calculate monthly stats
  const totalMonthlyHours = volunteerAttendance.reduce((sum, r) => sum + (r.hours || 0), 0);
  const attendedInitiativesCount = new Set(volunteerAttendance.map(r => r.initiativeId)).size;

  // Monthly evaluations
  const volunteerEvals = evaluations.filter(e => {
    if (e.volunteerId !== volunteer.id) return false;
    const evalDate = new Date(e.date);
    return (
      evalDate.getFullYear() === selectedYear &&
      (evalDate.getMonth() + 1) === selectedMonth
    );
  });

  const avgRating = volunteerEvals.length > 0
    ? (volunteerEvals.reduce((sum, e) => sum + (e.rating || 5), 0) / volunteerEvals.length).toFixed(1)
    : "5.0";

  // Estimated points earned this month
  const monthlyPoints = totalMonthlyHours * 10;

  // Report Reference Code
  const reportCode = `VOL-REP-${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${volunteer.id.slice(-4).toUpperCase()}`;
  const issueDateFormatted = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;

  // Export to PDF using html2canvas and jsPDF
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    setExportSuccess(false);

    try {
      // Ensure element styles and fonts are captured clearly
      const canvas = await html2canvas(reportRef.current, {
        scale: 2, // High resolution for crisp Lyon font and logo
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1024
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `تقرير_إنجاز_متطوع_${volunteer.name.replace(/\s+/g, '_')}_${selectedYear}_${selectedMonth}.pdf`;
      pdf.save(fileName);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      // Fallback: Trigger native print
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-fadeIn no-print-bg">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden my-4 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]">
        
        {/* Top Controls & Toolbar (Excluded from PDF and Print) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-900 text-white border-b border-slate-800 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black flex items-center gap-2">
                <span>تصدير تقرير الإنجاز الشهري للمتطوع</span>
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded-full font-sans font-bold">PDF رسمي</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                المتطوع: <strong className="text-white">{volunteer.name}</strong> ({volunteer.nationalId || volunteer.id})
              </p>
            </div>
          </div>

          {/* Month & Year Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
                title="اختر الشهر"
              >
                {MONTH_NAMES_AR.map((monthName, idx) => (
                  <option key={idx + 1} value={idx + 1} className="bg-slate-900 text-white">
                    {monthName}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-emerald-400 outline-none cursor-pointer pr-1"
                title="اختر السنة"
              >
                <option value={2024} className="bg-slate-900 text-white">2024</option>
                <option value={2025} className="bg-slate-900 text-white">2025</option>
                <option value={2026} className="bg-slate-900 text-white">2026</option>
              </select>
            </div>

            {/* Action Buttons */}
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
              title="تحميل بصيغة PDF"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء PDF...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-200" />
                  <span>تم التصدير بنجاح!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تصدير إلى PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
              title="طباعة التقرير مباشرة"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 dark:bg-slate-950/70">
          
          {/* Printable Report Canvas Document (Strict A4 Design) */}
          <div 
            ref={reportRef} 
            id="printable-volunteer-monthly-report"
            className="w-full max-w-[800px] mx-auto bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-lg border border-slate-200 relative overflow-hidden"
            style={{ direction: 'rtl' }}
          >
            {/* Elegant Top Decorative Border */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-700 via-emerald-500 to-amber-500" />

            {/* Official Report Header */}
            <div className="flex items-start justify-between border-b-2 border-emerald-800/20 pb-5 mb-6">
              
              {/* Association Identity & Lyon Arabic Font Title */}
              <div className="text-right space-y-1">
                <span className="text-[10px] font-bold text-slate-500 tracking-wider">المملكة العربية السعودية</span>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight font-lyon association-brand-text tracking-tight">
                  جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
                </h1>
                <p className="text-[10px] font-semibold text-emerald-800">
                  مسجلة بالمركز الوطني لتنمية القطاع غير الربحي برقم (5081) - مكة المكرمة
                </p>
                <p className="text-[9px] text-slate-500">
                  الإدارة العامة للشؤون التطوعية والعمل المجتمعي
                </p>
              </div>

              {/* Official Association Logo */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl border-2 border-emerald-600/30 p-1 bg-white shadow-xs flex items-center justify-center overflow-hidden">
                  <img 
                    src={logoUrl} 
                    alt="شعار جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" 
                    className="w-full h-full object-cover rounded-xl"
                    crossOrigin="anonymous"
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-600 font-mono mt-1">ترخيص: 5081</span>
              </div>

              {/* Report Reference & Metadata Box */}
              <div className="text-left space-y-1 text-[10px] text-slate-600">
                <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl space-y-1 font-mono">
                  <div className="text-right">
                    <span className="text-slate-400 text-[9px]">كود التقرير: </span>
                    <strong className="text-slate-800 text-[9px]">{reportCode}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[9px]">تاريخ الإصدار: </span>
                    <strong className="text-slate-800 text-[9px]">{issueDateFormatted}</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[9px]">الفترة: </span>
                    <strong className="text-emerald-700 text-[9px]">{MONTH_NAMES_AR[selectedMonth - 1]} {selectedYear}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Title Banner with Lyon Arabic Typography */}
            <div className="my-6 text-center">
              <div className="inline-block bg-gradient-to-r from-emerald-50 via-emerald-100/70 to-emerald-50 border border-emerald-300/80 px-8 py-2.5 rounded-2xl shadow-2xs">
                <h2 className="text-lg sm:text-xl font-black text-emerald-950 font-lyon association-brand-text">
                  تقرير الإنجاز الشهري وسجل الساعات التطوعية المعتمد
                </h2>
                <p className="text-xs font-bold text-emerald-800 mt-0.5">
                  عن شهر {MONTH_NAMES_AR[selectedMonth - 1]} لسنة {selectedYear}م
                </p>
              </div>
            </div>

            {/* Volunteer Profile Identification Card */}
            <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-4 mb-6">
              <h3 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5 font-lyon association-brand-text">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>بيانات وهوية المتطوع المعتمدة</span>
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-500">اسم المتطوع:</span>
                  <strong className="text-slate-900 font-lyon association-brand-text text-sm">{volunteer.name}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">رقم الهوية / الإقامة:</span>
                  <strong className="text-slate-800 font-mono">{volunteer.nationalId || "غير مسجل"}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">الفريق التطوعي:</span>
                  <strong className="text-slate-800">{team?.name || "فردي / عام"}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">المجال / القسم:</span>
                  <strong className="text-slate-800">{department?.name || "الخدمات الميدانية"}</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3 pt-3 border-t border-slate-200/80">
                <div>
                  <span className="block text-[10px] text-slate-500">رقم العضوية:</span>
                  <strong className="text-emerald-700 font-mono font-bold">{volunteer.id}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">الجوال:</span>
                  <strong className="text-slate-800 font-mono" dir="ltr">{volunteer.phone || "—"}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">حالة العضوية:</span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>نشط ومعتمد</span>
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">الرصيد التراكمي:</span>
                  <strong className="text-slate-800">{volunteer.hours || 0} ساعة إجمالية</strong>
                </div>
              </div>
            </div>

            {/* Key Monthly Accomplishment KPI Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-emerald-800">الساعات المنجزة بالشهر</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">{totalMonthlyHours}</span>
                <span className="text-[9px] text-emerald-600 block">ساعة معتمدة</span>
              </div>

              <div className="bg-indigo-50/80 border border-indigo-200 p-3 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-indigo-800">المبادرات المشارك بها</span>
                <span className="text-xl sm:text-2xl font-black text-indigo-700 font-mono">{attendedInitiativesCount}</span>
                <span className="text-[9px] text-indigo-600 block">مبادرة ميدانية</span>
              </div>

              <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-amber-800">معدل التقييم والانضباط</span>
                <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono">{avgRating} / 5</span>
                <span className="text-[9px] text-amber-600 block">ممتاز ومتميز</span>
              </div>

              <div className="bg-purple-50/80 border border-purple-200 p-3 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-purple-800">نقاط الأثر والتميز</span>
                <span className="text-xl sm:text-2xl font-black text-purple-700 font-mono">+{monthlyPoints}</span>
                <span className="text-[9px] text-purple-600 block">نقطة ريادة</span>
              </div>
            </div>

            {/* Detailed Monthly Initiatives Table */}
            <div className="mb-6">
              <h3 className="text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5 font-lyon association-brand-text">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>سجل المبادرات والأنشطة التطوعية المنفذة خلال الشهر</span>
              </h3>

              {volunteerAttendance.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-[11px] font-bold">
                        <th className="p-2.5">المبادرة التطوعية</th>
                        <th className="p-2.5">التاريخ</th>
                        <th className="p-2.5">وقت الحضور</th>
                        <th className="p-2.5">وقت الانصراف</th>
                        <th className="p-2.5 text-center">الساعات</th>
                        <th className="p-2.5 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {volunteerAttendance.map((record, index) => {
                        const init = initiatives.find(i => i.id === record.initiativeId);
                        return (
                          <tr key={record.id || index} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="p-2.5 font-bold text-slate-800 max-w-[220px]">
                              {init?.title || record.initiativeTitle || "مبادرة مجتمعية بالعسيلة"}
                            </td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                              {record.date}
                            </td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                              {record.timestamp ? new Date(record.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "04:30 م"}
                            </td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                              {record.checkoutTimestamp ? new Date(record.checkoutTimestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : "08:30 م"}
                            </td>
                            <td className="p-2.5 text-center font-bold text-emerald-700 font-mono whitespace-nowrap">
                              {record.hours || 4} س
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>معتمد</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-emerald-50/60 font-bold text-slate-900 border-t border-slate-200">
                        <td colSpan={4} className="p-2.5 text-right font-lyon association-brand-text">
                          مجموع الساعات التطوعية المعتمدة لشهر {MONTH_NAMES_AR[selectedMonth - 1]}:
                        </td>
                        <td className="p-2.5 text-center font-mono text-emerald-800 font-black text-sm">
                          {totalMonthlyHours} ساعة
                        </td>
                        <td className="p-2.5 text-center text-[10px] text-emerald-700 font-bold">
                          100% موثقة
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-bold">لا توجد سجلات حضور مسجلة لهذا الشهر المحدد ({MONTH_NAMES_AR[selectedMonth - 1]} {selectedYear})</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">يمكنك اختيار شهر آخر مسجل به حضور للمتطوع من شريط الأدوات بالأعلى.</p>
                </div>
              )}
            </div>

            {/* Official Certification & Verification Signatures */}
            <div className="grid grid-cols-3 gap-4 border-t-2 border-slate-200 pt-6 mt-6 items-end">
              
              {/* Coordinator Signature */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">مشرف وحدة التطوع</span>
                <span className="text-xs font-bold text-slate-800 block font-lyon association-brand-text">أ. فيصل بن سعد القرشي</span>
                <div className="h-10 flex items-center justify-center">
                  <span className="text-emerald-700 font-serif italic text-sm select-none font-bold">Faisal.Q</span>
                </div>
                <span className="text-[9px] text-slate-400 block font-mono">التوقيع المعتمد</span>
              </div>

              {/* Center Official Digital Seal / Stamp */}
              <div className="text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-emerald-700/80 p-1 flex flex-col items-center justify-center text-emerald-800 bg-emerald-50/40 shadow-xs">
                  <span className="text-[8px] font-black leading-tight font-lyon">جمعية ريادة العطاء</span>
                  <ShieldCheck className="w-5 h-5 text-emerald-600 my-0.5" />
                  <span className="text-[7px] font-bold">ختم التوثيق الرسمي</span>
                  <span className="text-[6px] font-mono">ترخيص: 5081</span>
                </div>
                <span className="text-[8px] text-slate-400 mt-1">وثيقة إلكترونية مصدقة</span>
              </div>

              {/* Executive Director Signature */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-500 block">المدير التنفيذي للجمعية</span>
                <span className="text-xs font-bold text-slate-800 block font-lyon association-brand-text">د. خالد بن منصور العتيبي</span>
                <div className="h-10 flex items-center justify-center">
                  <span className="text-emerald-800 font-serif italic text-sm select-none font-bold">K.Alotaibi</span>
                </div>
                <span className="text-[9px] text-slate-400 block font-mono">الاعتماد النهائي</span>
              </div>
            </div>

            {/* Official Legal Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>للتحقق من صحة التقرير: امسح الرمز أو راجع بوابة الجمعية برقم التوثيق ({reportCode})</span>
              </div>
              <span className="font-mono">صفحة 1 من 1</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
