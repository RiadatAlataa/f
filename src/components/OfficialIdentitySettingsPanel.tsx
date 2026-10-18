import React, { useState } from "react";
import { 
  Building2, Shield, FileText, CheckCircle2, Save, Upload, 
  Eye, Printer, Plus, Trash2, Edit3, AlertCircle, Sparkles,
  Phone, Mail, MapPin, CreditCard, UserCheck, Check, X
} from "lucide-react";
import { HomeSettings } from "../types";
import { OfficialLetterheadTemplate } from "./OfficialLetterheadTemplate";
import { ImageUploadField } from "./ImageUploadField";

interface OfficialIdentitySettingsPanelProps {
  homeSettings: HomeSettings;
  onSaveHomeSettings: (updated: Partial<HomeSettings>) => Promise<boolean>;
  currentUser?: any;
}

export const OfficialIdentitySettingsPanel: React.FC<OfficialIdentitySettingsPanelProps> = ({
  homeSettings,
  onSaveHomeSettings,
  currentUser
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form State
  const initialLetterhead = homeSettings?.officialLetterhead || {};
  const [associationNameAr, setAssociationNameAr] = useState(homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة");
  const [licenseNumber, setLicenseNumber] = useState(initialLetterhead.licenseNumber || homeSettings?.licenseNumber || "1000888600");
  const [logoUrl, setLogoUrl] = useState(initialLetterhead.logoUrl || homeSettings?.logoUrl || "/logo.png");
  const [officialStampUrl, setOfficialStampUrl] = useState(initialLetterhead.officialStampUrl || "");
  const [officialSignatureUrl, setOfficialSignatureUrl] = useState(initialLetterhead.officialSignatureUrl || "");
  const [showStamp, setShowStamp] = useState(initialLetterhead.showStamp ?? true);
  const [showSignature, setShowSignature] = useState(initialLetterhead.showSignature ?? true);
  const [signatoryNameAr, setSignatoryNameAr] = useState(initialLetterhead.signatoryNameAr || "رئيس مجلس الإدارة");
  const [signatoryTitleAr, setSignatoryTitleAr] = useState(initialLetterhead.signatoryTitleAr || "رئيس مجلس الإدارة");
  const [footerAddressAr, setFooterAddressAr] = useState(initialLetterhead.footerAddressAr || "مكة المكرمة - مخطط العسيلة - المملكة العربية السعودية");
  const [footerContactAr, setFooterContactAr] = useState(initialLetterhead.footerContactAr || `هاتف: ${homeSettings?.contactPhone || '0550123456'} | بريد: ${homeSettings?.contactEmail || 'info@riadataleata.org.sa'}`);
  const [footerBankInfoAr, setFooterBankInfoAr] = useState(initialLetterhead.footerBankInfoAr || "الحساب البنكي المعتمد (مصرف الراجحي): SA0000000000000000000000");

  // Authorized Signatories List
  const [authorizedSignatories, setAuthorizedSignatories] = useState<any[]>(
    initialLetterhead.authorizedSignatories || [
      { id: "sig-1", name: "أحمد بن عواض المعبدي", title: "رئيس مجلس الإدارة", department: "مجلس الإدارة", isDefault: true, canIssueOfficialLetters: true },
      { id: "sig-2", name: "المدير التنفيذي", title: "المدير التنفيذي", department: "الإدارة التنفيذية", isDefault: false, canIssueOfficialLetters: true }
    ]
  );

  // Add new authorized signatory
  const [newSignatoryName, setNewSignatoryName] = useState("");
  const [newSignatoryTitle, setNewSignatoryTitle] = useState("");
  const [newSignatoryDept, setNewSignatoryDept] = useState("");

  const handleAddSignatory = () => {
    if (!newSignatoryName.trim() || !newSignatoryTitle.trim()) {
      alert("يرجى إدخال اسم المسؤول والمنصب المعتمد");
      return;
    }
    const newEntry = {
      id: "sig-" + Date.now(),
      name: newSignatoryName.trim(),
      title: newSignatoryTitle.trim(),
      department: newSignatoryDept.trim() || "الإدارة العامة",
      isDefault: false,
      canIssueOfficialLetters: true
    };
    setAuthorizedSignatories(prev => [...prev, newEntry]);
    setNewSignatoryName("");
    setNewSignatoryTitle("");
    setNewSignatoryDept("");
  };

  const handleRemoveSignatory = (id: string) => {
    if (confirm("هل أنت متأكد من إزالة هذا المسؤول من قائمة المخولين بالتوقيع؟")) {
      setAuthorizedSignatories(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updatedLetterhead = {
        associationNameAr,
        licenseNumber,
        logoUrl,
        officialStampUrl,
        officialSignatureUrl,
        showStamp,
        showSignature,
        signatoryNameAr,
        signatoryTitleAr,
        footerAddressAr,
        footerContactAr,
        footerBankInfoAr,
        authorizedSignatories
      };

      const success = await onSaveHomeSettings({
        associationNameAr,
        licenseNumber,
        logoUrl,
        officialLetterhead: updatedLetterhead
      });

      if (success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>الهوية الرسمية والخطابات • الإدارة العليا</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            إدارة الهوية الرسمية وقالب الخطابات والمستندات
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            ضبط الشعار المعتمد، بيانات الترويسة والتذييل، التوقيع والختم الرسمي، واعتماد الأشخاص المخولين بإصدار الخطابات الرسمية.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 transition-all border border-white/20 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>معاينة قالب الخطاب الحي</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>جاري الحفظ...</span>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>تم الحفظ بنجاح</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Official Header & Identity Data */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>بيانات الترويسة والترخيص الرسمي</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                اسم الجمعية الرسمي:
              </label>
              <input
                type="text"
                value={associationNameAr}
                onChange={(e) => setAssociationNameAr(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                رقم الترخيص المعتمد:
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="1000888600"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                مسجلة بالمركز الوطني لتنمية القطاع غير الربحي برقم 1000888600
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                شعار الجمعية الرسمي (أعلى الصفحة):
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1 flex items-center justify-center shrink-0">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="رابط الشعار أو /logo.png"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-left"
                    dir="ltr"
                  />
                  <div className="mt-2">
                    <ImageUploadField
                      value={logoUrl}
                      onChange={(url) => setLogoUrl(url)}
                      label="رفع شعار جديد"
                      compact={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Official Stamp & Signature Settings */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>الختم والتوقيع الرسمي المعتمد</span>
          </h3>

          <div className="space-y-4">
            {/* Toggle checkboxes */}
            <div className="flex items-center gap-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={showStamp}
                  onChange={(e) => setShowStamp(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>تفعيل إدراج الختم الرسمي</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={showSignature}
                  onChange={(e) => setShowSignature(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>تفعيل إدراج التوقيع المعتمد</span>
              </label>
            </div>

            {/* Official Stamp Upload */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                صورة الختم الرسمي للجمعية:
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1 flex items-center justify-center shrink-0">
                  {officialStampUrl ? (
                    <img src={officialStampUrl} alt="Stamp" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400">بدون ختم</span>
                  )}
                </div>
                <div className="flex-1">
                  <ImageUploadField
                    value={officialStampUrl}
                    onChange={(url) => setOfficialStampUrl(url)}
                    label="رفع ختم الجمعية المعتمد (PNG شفاف)"
                    compact={true}
                  />
                </div>
              </div>
            </div>

            {/* Official Signature Upload */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                صورة التوقيع الرسمي المعتمد:
              </label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1 flex items-center justify-center shrink-0">
                  {officialSignatureUrl ? (
                    <img src={officialSignatureUrl} alt="Signature" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400">بدون توقيع</span>
                  )}
                </div>
                <div className="flex-1">
                  <ImageUploadField
                    value={officialSignatureUrl}
                    onChange={(url) => setOfficialSignatureUrl(url)}
                    label="رفع صورة التوقيع المعتمد (PNG شفاف)"
                    compact={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Official Footer & Communication Data */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>بيانات تذييل الصفحة والتواصل والحساب البنكي</span>
          </h3>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                العنوان والمقر الرسمي:
              </label>
              <input
                type="text"
                value={footerAddressAr}
                onChange={(e) => setFooterAddressAr(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                بيانات الاتصال والبريد:
              </label>
              <input
                type="text"
                value={footerContactAr}
                onChange={(e) => setFooterContactAr(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                الحساب البنكي المعتمد (IBAN):
              </label>
              <input
                type="text"
                value={footerBankInfoAr}
                onChange={(e) => setFooterBankInfoAr(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Authorized Signatories Management */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>الأشخاص المخولون بإصدار وتوقيع الخطابات الرسمية</span>
          </h3>

          <div className="space-y-3">
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {authorizedSignatories.map((sig) => (
                <div 
                  key={sig.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div>
                    <p className="font-black text-slate-900 dark:text-white">{sig.name}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{sig.title} — {sig.department}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {sig.isDefault && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                        افتراضي
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveSignatory(sig.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="إزالة المسؤول"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Signatory Row */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">إضافة مسؤول مخول جديد:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="الاسم الكامل"
                  value={newSignatoryName}
                  onChange={(e) => setNewSignatoryName(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="المسمى الوظيفي"
                  value={newSignatoryTitle}
                  onChange={(e) => setNewSignatoryTitle(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddSignatory}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      {isPreviewOpen && (
        <OfficialLetterheadTemplate
          documentTitle="معاينة خطاب رسمي نموذجي"
          documentNumber="LET-2026-0001"
          hijriDate="1447/10/29هـ"
          gregorianDate={new Date().toISOString().split('T')[0]}
          subject="اعتماد الإجراءات والخطابات الرسمية الموحدة"
          recipientTitle="سعادة أعضاء ومنسوبي جمعية ريادة العطاء لخدمة الإنسان بالعسيلة المحترمين"
          signatoryName={signatoryNameAr}
          signatoryTitle={signatoryTitleAr}
          signatureUrl={officialSignatureUrl}
          stampUrl={officialStampUrl}
          showSignature={showSignature}
          showStamp={showStamp}
          homeSettings={{
            ...homeSettings,
            associationNameAr,
            licenseNumber,
            officialLetterhead: {
              associationNameAr,
              licenseNumber,
              logoUrl,
              officialStampUrl,
              officialSignatureUrl,
              footerAddressAr,
              footerContactAr,
              footerBankInfoAr
            }
          }}
          onClose={() => setIsPreviewOpen(false)}
        >
          <div className="space-y-4 text-justify">
            <p>
              يطيب لنا في مجلس إدارة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة أن نرفع لسعادتكم أطيب التحيات والتقدير، سائلين المولى عز وجل لكم دوام التوفيق والسداد.
            </p>
            <p>
              نفيدكم بأنه تم اعتماد هذا النموذج ليكون القالب الرسمي الموحد لجميع الخطابات والمستندات والتقارير الصادرة من الجمعية ومختلف إداراتها، بما يحقق أعلى معايير الحوكمة والشفافية والتوثيق المعتمد لدى المركز الوطني لتنمية القطاع غير الربحي.
            </p>
            <p>
              يتميز هذا القالب بدعم الطباعة المباشرة بمقاس A4 القياسي، وحفظ النصوص والبيانات بصيغة PDF قابلة للبحث والنسخ دون أي تشويه أو اقتطاع، مع إخفاء أشرطة التنقل وقوائم لوحة التحكم تلقائياً أثناء الطباعة.
            </p>
            <p className="font-bold text-emerald-900 pt-2">
              وتفضلوا بقبول فائق التحية والاحترام والتقدير،،،
            </p>
          </div>
        </OfficialLetterheadTemplate>
      )}
    </div>
  );
};
