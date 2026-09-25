import React, { useState } from "react";
import * as XLSX from "xlsx";
import { 
  FileText, 
  Package, 
  Calendar, 
  User, 
  Clock, 
  Image as ImageIcon, 
  CheckCircle2, 
  X, 
  Maximize2, 
  Barcode, 
  Phone, 
  ShieldCheck,
  Building,
  Printer,
  Download
} from "lucide-react";
import { Beneficiary, DistributionHandoverRecord } from "../types";

interface BeneficiaryHistoryModalProps {
  beneficiary: Beneficiary | null;
  handoverRecords: DistributionHandoverRecord[];
  isOpen: boolean;
  onClose: () => void;
  lang?: "ar" | "en";
}

export const BeneficiaryHistoryModal: React.FC<BeneficiaryHistoryModalProps> = ({
  beneficiary,
  handoverRecords = [],
  isOpen,
  onClose,
  lang = "ar"
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; title: string; record: DistributionHandoverRecord } | null>(null);

  if (!isOpen || !beneficiary) return null;

  // Filter records for this beneficiary
  const myHandovers = handoverRecords.filter(h => 
    h.beneficiaryId === beneficiary.id || 
    (h.nationalId && h.nationalId === beneficiary.nationalId) ||
    (h.barcodeId && beneficiary.barcodeId && h.barcodeId === beneficiary.barcodeId)
  );

  const exportToExcel = () => {
    if (myHandovers.length === 0) return alert("لا توجد سجلات لتصديرها لهذا المستفيد");
    const rows = myHandovers.map((rec, idx) => ({
      "م": idx + 1,
      "اسم المستفيد": beneficiary.name,
      "رقم الهوية": beneficiary.nationalId || "",
      "رقم الملف": beneficiary.beneficiaryNumber || beneficiary.id,
      "الصنف المستلم": rec.itemName || rec.distributionTitle || "سلة غذائية",
      "الكمية": `${rec.quantity || 1} ${rec.unit || 'طرد'}`,
      "تاريخ الاستلام": rec.date,
      "وقت الاستلام": rec.time,
      "الموظف المسلم": rec.handedByUserName,
      "الإدارة المسؤولة": rec.handedDepartment || "إدارة المخزون والمستودعات",
      "طريقة التحقق": rec.method === 'camera_scanner' ? 'كاميرا الجوال' : rec.method === 'hardware_scanner' ? 'قارئ باركود' : 'يدوي',
      "توثيق الصورة": rec.photoUrl || (rec.proofPhotos && rec.proofPhotos.length > 0) ? "موثقة بالصورة ✓" : "بدون صورة",
      "رقم الإيصال": rec.id
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!views'] = [{ RTL: true }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "سجل المساعدات");
    XLSX.writeFile(wb, `سجل_مساعدات_${beneficiary.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-neutral-100 dark:border-neutral-800 text-right flex flex-col max-h-[92vh] space-y-5">
        
        {/* Modal Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800 shrink-0 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xl shrink-0">
              {beneficiary.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  سجل المساعدات والاستلام: {beneficiary.name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {beneficiary.category || "أسر متعففة"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 flex flex-wrap items-center gap-3 mt-0.5">
                <span>رقم الملف: <b className="font-mono text-neutral-700 dark:text-neutral-300">{beneficiary.beneficiaryNumber || beneficiary.id}</b></span>
                <span>الهوية: <b className="font-mono text-neutral-700 dark:text-neutral-300">{beneficiary.nationalId}</b></span>
                <span>الباركود: <b className="font-mono text-neutral-700 dark:text-neutral-300">{beneficiary.barcodeId || "-"}</b></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {myHandovers.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={exportToExcel}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 cursor-pointer"
                  title="تصدير إلى Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  title="طباعة السجل"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700">
            <span className="text-[10px] font-bold text-neutral-500 block">إجمالي المساعدات المستلمة</span>
            <span className="text-xl font-black text-neutral-900 dark:text-white mt-1 block font-mono">
              {myHandovers.length} عمليات
            </span>
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700">
            <span className="text-[10px] font-bold text-neutral-500 block">عدد العمليات الموثقة بالصورة</span>
            <span className="text-xl font-black text-emerald-600 mt-1 block font-mono">
              {myHandovers.filter(h => h.photoUrl || (h.proofPhotos && h.proofPhotos.length > 0)).length} صور
            </span>
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700">
            <span className="text-[10px] font-bold text-neutral-500 block">آخر تاريخ استلام</span>
            <span className="text-xs font-black text-neutral-800 dark:text-neutral-200 mt-1 block font-mono">
              {myHandovers[0]?.date || "لا يوجد بعد"}
            </span>
          </div>

          <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl border border-neutral-200/80 dark:border-neutral-700">
            <span className="text-[10px] font-bold text-neutral-500 block">حالة المستفيد</span>
            <span className="text-xs font-black text-emerald-600 mt-1 block">
              {beneficiary.status === 'approved' ? 'معتمد ومؤهل' : 'قيد المراجعة'}
            </span>
          </div>
        </div>

        {/* History Table / Cards */}
        <div className="flex-1 overflow-y-auto pr-1">
          {myHandovers.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 space-y-2">
              <Package className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600" />
              <p className="text-sm font-bold">لا يوجد سجل مساعدات مستلمة حتى الآن لهذا المستفيد.</p>
              <p className="text-xs text-neutral-500">فور اعتماد تخصيص وتسليمه من قبل إدارة المخزون ستظهر كل عملية هنا موثقة بالصورة والتاريخ والباركود.</p>
            </div>
          ) : (
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="p-3 text-center w-10">م</th>
                    <th className="p-3">الصنف المستلم</th>
                    <th className="p-3 text-center">الكمية</th>
                    <th className="p-3">تاريخ ووقت الاستلام</th>
                    <th className="p-3">الموظف المسلّم</th>
                    <th className="p-3">الإدارة المسؤولة</th>
                    <th className="p-3 text-center">توثيق الصورة</th>
                    <th className="p-3">رقم العملية والحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {myHandovers.map((rec, idx) => {
                    const hasPhoto = !!rec.photoUrl || (rec.proofPhotos && rec.proofPhotos.length > 0);
                    const photoSrc = rec.photoUrl || (rec.proofPhotos && rec.proofPhotos[0]) || "";

                    return (
                      <tr key={rec.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="p-3 text-center font-mono font-bold text-neutral-500">{idx + 1}</td>
                        <td className="p-3">
                          <div className="font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{rec.itemName || rec.distributionTitle || "سلة غذائية"}</span>
                          </div>
                          <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{rec.distributionTitle}</div>
                        </td>
                        <td className="p-3 text-center font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                          {rec.quantity || 1} {rec.unit || "طرد"}
                        </td>
                        <td className="p-3">
                          <div className="font-bold font-mono text-neutral-800 dark:text-neutral-200">{rec.date}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{rec.time}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                            <User className="w-3 h-3 text-neutral-400" />
                            <span>{rec.handedByUserName}</span>
                          </div>
                          <div className="text-[10px] text-neutral-400">{rec.handedByUserRole === 'storekeeper' ? 'أمين المستودع' : 'مشرف التوزيع'}</div>
                        </td>
                        <td className="p-3 text-[11px] text-neutral-600 dark:text-neutral-400 font-medium">
                          {rec.handedDepartment || "إدارة المخزون والمستودعات"}
                        </td>
                        <td className="p-3 text-center">
                          {hasPhoto ? (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto({ url: photoSrc, title: rec.itemName || "صورة الاستلام", record: rec })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 rounded-lg text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 cursor-pointer shadow-xs"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                              <span>عرض الصورة</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-neutral-400 italic">غير متوفرة</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>تم التسليم بنجاح</span>
                          </span>
                          <div className="font-mono text-[9px] text-neutral-400 mt-1">{rec.id}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>السجل معتمد وموثق بقاعدة بيانات إدارة المستفيدين وإدارة المخزون.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            إغلاق السجل
          </button>
        </div>

        {/* Image Preview Submodal */}
        {selectedPhoto && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/85 p-4" onClick={() => setSelectedPhoto(null)}>
            <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full p-5 space-y-4 text-right shadow-2xl border border-neutral-200 dark:border-neutral-800" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <h4 className="font-black text-sm text-neutral-900 dark:text-white">
                    توثيق تسليم: {selectedPhoto.record.itemName || "مساعدة"}
                  </h4>
                  <p className="text-[11px] text-neutral-500 font-mono">
                    المستفيد: {selectedPhoto.record.beneficiaryName} • {selectedPhoto.record.date} {selectedPhoto.record.time}
                  </p>
                </div>
                <button onClick={() => setSelectedPhoto(null)} className="p-1 text-neutral-400 hover:text-neutral-700">✕</button>
              </div>

              <div className="rounded-2xl overflow-hidden bg-black max-h-[65vh] flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
                <img src={selectedPhoto.url} alt="صورة التسليم" className="w-full h-auto max-h-[60vh] object-contain" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl">
                <div>الموظف الذي سلّم: <b>{selectedPhoto.record.handedByUserName}</b></div>
                <div>الكمية: <b>{selectedPhoto.record.quantity} {selectedPhoto.record.unit || 'طرد'}</b></div>
                <div>الإدارة: <b>{selectedPhoto.record.handedDepartment || 'إدارة المستودع'}</b></div>
                <div>رقم السند: <b className="font-mono text-[10px]">{selectedPhoto.record.id}</b></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
