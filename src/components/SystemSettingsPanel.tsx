import React, { useState, useEffect } from "react";
import { 
  Settings, Shield, Globe, Users, Bell, Bot, FileText, Palette, 
  Database, Lock, FolderOpen, PhoneCall, BarChart3, Save, RefreshCw, 
  CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight, Plus, Trash2, 
  ExternalLink, Download, Upload, Eye, Key, ShieldCheck, HelpCircle, 
  Sparkles, FileCode, Clock, Mail, Phone, MapPin, Hash, Image as ImageIcon,
  Share2, UserCheck, Smartphone, Sliders, MessageSquare,
  Volume2, VolumeX, BellRing
} from "lucide-react";
import { SystemSettings, OperationLog, SystemStats } from "../types";
import { ImagePickerControl } from "./ImagePickerControl";
import { useApplicationAudio } from "../utils/audioNotification";

interface SystemSettingsPanelProps {
  logs?: OperationLog[];
  stats?: SystemStats;
  onRestoreDb: (json: any) => void;
  onTriggerLogRefresh?: () => void;
}

export const SystemSettingsPanel: React.FC<SystemSettingsPanelProps> = ({
  logs = [],
  stats,
  onRestoreDb
}) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [activeSection, setActiveSection] = useState<
    | "general"
    | "team"
    | "social"
    | "volunteer"
    | "roles"
    | "notifications"
    | "ai"
    | "documents"
    | "appearance"
    | "backup"
    | "security"
    | "stats"
    | "files"
    | "contact"
  >("general");

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Helper local states for item management
  const [newCannedKeyword, setNewCannedKeyword] = useState("");
  const [newCannedResponse, setNewCannedResponse] = useState("");
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbContent, setNewKbContent] = useState("");
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");
  const [newBlockedIp, setNewBlockedIp] = useState("");
  const [newRoleNameAr, setNewRoleNameAr] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

  // Application Audio Alert Hook (Volunteer & Team applications)
  const { isAudioEnabled: isAppAudioEnabled, toggleAudio: toggleAppAudio, testSound: testAppSound } = useApplicationAudio();

  // Fetch initial settings from server
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/db/systemSettings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to load system settings", err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSection = async (sectionTitle: string) => {
    if (!settings) return;
    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch("/api/db/systemSettings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          updatedSection: sectionTitle
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.systemSettings) {
          setSettings(data.systemSettings);
        }
        setSaveSuccess(`تم حفظ ${sectionTitle} بنجاح وتوثيق التغيير في سجل النظام ✓`);
        setTimeout(() => setSaveSuccess(null), 4000);
      } else {
        setSaveError("حدث خطأ أثناء حفظ الإعدادات، يرجى إعادة المحاولة.");
      }
    } catch (err) {
      setSaveError("تعذر الاتصال بالسيرفر لحفظ الإعدادات.");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-bold text-neutral-600">جاري تحميل إعدادات النظام الشاملة...</p>
      </div>
    );
  }

  // Generic state updater
  const updateSettings = (updater: (prev: SystemSettings) => SystemSettings) => {
    setSettings(prev => (prev ? updater({ ...prev }) : null));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute left-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-emerald-300" />
              <span className="text-xs font-bold text-emerald-200 tracking-wider uppercase">لوحة تحكم المدير العام</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black">إعدادات النظام الشاملة والتحكم الإداري</h1>
            <p className="text-xs text-emerald-100 mt-1 max-w-2xl">
              إدارة كافة تفاصيل الموقع، الهوية، قواعد المتطوعين، صلاحيات الأدوار، الذكاء الاصطناعي، الأمان، والنسخ الاحتياطي دون الحاجة لتعديل الأكواد.
            </p>
          </div>
          <button
            onClick={() => handleSaveSection("جميع الإعدادات")}
            disabled={saving}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-neutral-900 font-bold px-5 py-3 rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? "جاري الحفظ..." : "حفظ التغييرات الآن"}</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-600 hover:text-emerald-900 font-mono">✕</button>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl flex items-center justify-between text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)} className="text-red-600 hover:text-red-900 font-mono">✕</button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="bg-neutral-50 p-2 rounded-2xl border border-neutral-200/80 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: "general", label: "1. الإعدادات العامة", icon: Globe },
            { id: "team", label: "2. بيانات الفريق", icon: Users },
            { id: "social", label: "3. مواقع التواصل", icon: Share2 },
            { id: "volunteer", label: "4. قواعد المتطوعين", icon: UserCheck },
            { id: "roles", label: "5. الأدوار والتدقيق", icon: Lock },
            { id: "notifications", label: "6. الإشعارات والتعاميم", icon: Bell },
            { id: "ai", label: "7. الذكاء الاصطناعي", icon: Bot },
            { id: "documents", label: "8. الوثائق والسياسات", icon: FileText },
            { id: "appearance", label: "9. المظهر والجماليات", icon: Palette },
            { id: "backup", label: "10. النسخ الاحتياطي", icon: Database },
            { id: "security", label: "11. أمان النظام", icon: ShieldCheck },
            { id: "stats", label: "12. الشاشة الإحصائية", icon: BarChart3 },
            { id: "files", label: "13. الوسائط والأختام", icon: FolderOpen },
            { id: "contact", label: "14. الاتصال والتواصل", icon: PhoneCall }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 1: GENERAL SETTINGS */}
      {activeSection === "general" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Globe className="w-5 h-5 text-emerald-600" />
                <span>1- الإعدادات العامة للنظام</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">اسم النظام، التوثيق الرسمي، وضع الصيانة، والمنطقة الزمنية</p>
            </div>
            <button
              onClick={() => handleSaveSection("الإعدادات العامة")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التعديلات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">اسم النظام الرسمي</label>
              <input
                type="text"
                value={settings.systemName}
                onChange={e => updateSettings(s => ({ ...s, systemName: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">اسم الفريق الرسمي</label>
              <input
                type="text"
                value={settings.teamName}
                onChange={e => updateSettings(s => ({ ...s, teamName: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1">وصف النظام والمنصة</label>
              <textarea
                rows={2}
                value={settings.systemDescription}
                onChange={e => updateSettings(s => ({ ...s, systemDescription: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <ImagePickerControl
                label="الشعار الرسمي للجمعية (Official Logo)"
                description="يظهر الشعار في الهيدر، النماذج الرسمية، والتقارير المعتمدة"
                value={settings.logoUrl}
                onChange={val => updateSettings(s => ({ ...s, logoUrl: val }))}
                aspectRatio="logo"
              />

              <ImagePickerControl
                label="خلفية صفحة تسجيل الدخول (Login Background)"
                description="الصورة الرئيسية لشاشة نفاذ المتطوعين والمسؤولين"
                value={settings.loginBgImage}
                onChange={val => updateSettings(s => ({ ...s, loginBgImage: val }))}
                aspectRatio="banner"
              />

              <div className="md:col-span-2">
                <ImagePickerControl
                  label="أيقونة الموقع الرسمية (Favicon)"
                  description="الأيقونة المصغرة التي تظهر في تبويب متصفح الإنترنت"
                  value={settings.faviconUrl}
                  onChange={val => updateSettings(s => ({ ...s, faviconUrl: val }))}
                  aspectRatio="square"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">رقم الترخيص الرسمي</label>
              <input
                type="text"
                value={settings.licenseNumber}
                onChange={e => updateSettings(s => ({ ...s, licenseNumber: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">رقم السجل التجاري / الأهلي</label>
              <input
                type="text"
                value={settings.registrationNumber}
                onChange={e => updateSettings(s => ({ ...s, registrationNumber: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">سنة التأسيس</label>
              <input
                type="text"
                value={settings.foundationYear}
                onChange={e => updateSettings(s => ({ ...s, foundationYear: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">اللغة الافتراضية للنظام</label>
              <select
                value={settings.defaultLanguage}
                onChange={e => updateSettings(s => ({ ...s, defaultLanguage: e.target.value as any }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none bg-white"
              >
                <option value="ar">العربية (Arabic - AR)</option>
                <option value="en">الإنجليزية (English - EN)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">المنطقة الزمنية</label>
              <input
                type="text"
                value={settings.timezone}
                onChange={e => updateSettings(s => ({ ...s, timezone: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">تنسيق التاريخ والوقت</label>
              <input
                type="text"
                value={settings.dateTimeFormat}
                onChange={e => updateSettings(s => ({ ...s, dateTimeFormat: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Maintenance Mode Sub-card */}
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-xs font-bold text-amber-900">وضع الصيانة والإيقاف المؤقت (Maintenance Mode)</h3>
                  <p className="text-[11px] text-amber-700">عند التفعيل، سينتقل النظام إلى شاشة التنبيه بالصيانة ويمنع الدخول للجمهور</p>
                </div>
              </div>
              <button
                onClick={() => updateSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  settings.maintenanceMode ? "bg-amber-600 text-white" : "bg-neutral-200 text-neutral-700"
                }`}
              >
                {settings.maintenanceMode ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                <span>{settings.maintenanceMode ? "وضع الصيانة مفعل ⚠️" : "النظام يعمل بشكل طبيعي ✓"}</span>
              </button>
            </div>

            {settings.maintenanceMode && (
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">رسالة وضع الصيانة للجمهور</label>
                <textarea
                  rows={2}
                  value={settings.maintenanceMessage}
                  onChange={e => updateSettings(s => ({ ...s, maintenanceMessage: e.target.value }))}
                  className="w-full text-xs p-2.5 rounded-xl border border-amber-300 focus:border-amber-600 focus:outline-none bg-white"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: TEAM DATA */}
      {activeSection === "team" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>2- بيانات الفريق والقيادة التنفيذية</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">أسماء القيادات العلياء، وسائل الاتصال الرسمية والعنوان الجغرافي</p>
            </div>
            <button
              onClick={() => handleSaveSection("بيانات الفريق والقيادة")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التعديلات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">اسم القائد العام للجمعية / الفريق</label>
              <input
                type="text"
                value={settings.commanderInChief}
                onChange={e => updateSettings(s => ({ ...s, commanderInChief: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">اسم نائب القائد العام</label>
              <input
                type="text"
                value={settings.viceCommander}
                onChange={e => updateSettings(s => ({ ...s, viceCommander: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">البريد الإلكتروني الرسمي</label>
              <input
                type="email"
                value={settings.officialEmail}
                onChange={e => updateSettings(s => ({ ...s, officialEmail: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">رقم الجوال المعتمد</label>
              <input
                type="text"
                value={settings.mobileNumber}
                onChange={e => updateSettings(s => ({ ...s, mobileNumber: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">رقم الهاتف الثابت (إن وجد)</label>
              <input
                type="text"
                value={settings.landlineNumber}
                onChange={e => updateSettings(s => ({ ...s, landlineNumber: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none dir-ltr text-right"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">رابط الموقع الإلكتروني</label>
              <input
                type="text"
                value={settings.websiteUrl}
                onChange={e => updateSettings(s => ({ ...s, websiteUrl: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none font-mono dir-ltr"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1">العنوان الجغرافي والمقر</label>
              <input
                type="text"
                value={settings.address}
                onChange={e => updateSettings(s => ({ ...s, address: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1">رابط الموقع على خرائط جوجل (Google Maps URL)</label>
              <input
                type="text"
                value={settings.googleMapsEmbedUrl}
                onChange={e => updateSettings(s => ({ ...s, googleMapsEmbedUrl: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none font-mono dir-ltr"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: SOCIAL MEDIA LINKS */}
      {activeSection === "social" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                <span>3- روابط وسائط التواصل الاجتماعي الرسمية</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">تفعيل أو إخفاء القنوات وتحديد روابط الصفحات المعتمدة</p>
            </div>
            <button
              onClick={() => handleSaveSection("روابط التواصل الاجتماعي")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التعديلات</span>
            </button>
          </div>

          <div className="space-y-3">
            {settings.socialLinks.map((link, idx) => (
              <div key={link.id} className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-48 shrink-0">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center font-mono">
                    #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-neutral-900 uppercase">{link.platform}</span>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="العنوان بالعربية"
                    value={link.titleAr}
                    onChange={e => {
                      const val = e.target.value;
                      updateSettings(s => ({
                        ...s,
                        socialLinks: s.socialLinks.map(item => item.id === link.id ? { ...item, titleAr: val } : item)
                      }));
                    }}
                    className="text-xs p-2 rounded-lg border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="رابط القناة (URL)"
                    value={link.url}
                    onChange={e => {
                      const val = e.target.value;
                      updateSettings(s => ({
                        ...s,
                        socialLinks: s.socialLinks.map(item => item.id === link.id ? { ...item, url: val } : item)
                      }));
                    }}
                    className="text-xs p-2 rounded-lg border border-neutral-300 focus:border-emerald-600 focus:outline-none font-mono dir-ltr"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      updateSettings(s => ({
                        ...s,
                        socialLinks: s.socialLinks.map(item => item.id === link.id ? { ...item, enabled: !item.enabled } : item)
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      link.enabled ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {link.enabled ? "ظاهر بالموقع ✓" : "مخفي ✕"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: VOLUNTEER RULES */}
      {activeSection === "volunteer" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>4- إعدادات وقواعد قبول المتطوعين</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">شروط التسجيل، رفع المستندات، التحقق ومدة صلاحية الطلب</p>
            </div>
            <button
              onClick={() => handleSaveSection("قواعد المتطوعين")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ التعديلات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">فتح باب التسجيل للانضمام</h3>
                <p className="text-[11px] text-neutral-500">سماح أو إيقاف استقبال طلبات المتطوعين الجدد</p>
              </div>
              <button
                onClick={() => updateSettings(s => ({ ...s, allowVolunteerRegistration: !s.allowVolunteerRegistration }))}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.allowVolunteerRegistration ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                }`}
              >
                {settings.allowVolunteerRegistration ? "مفتوح الان ✓" : "مغلق ✕"}
              </button>
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">طريقة قبول طلبات الانضمام</h3>
                <p className="text-[11px] text-neutral-500">قبول تلقائي أم يدوي مراجعة من الإدارة</p>
              </div>
              <select
                value={settings.approvalType}
                onChange={e => updateSettings(s => ({ ...s, approvalType: e.target.value as any }))}
                className="text-xs p-2 rounded-lg border border-neutral-300 font-bold bg-white"
              >
                <option value="manual">مراجعة يدوية من الإدارة</option>
                <option value="auto">قبول آلي فور التسجيل</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">الحد الأدنى للسن (بالسنوات)</label>
              <input
                type="number"
                value={settings.minAge}
                onChange={e => updateSettings(s => ({ ...s, minAge: parseInt(e.target.value) || 16 }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">الحد الأعلى للسن (بالسنوات)</label>
              <input
                type="number"
                value={settings.maxAge}
                onChange={e => updateSettings(s => ({ ...s, maxAge: parseInt(e.target.value) || 65 }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">مدة صلاحية الطلب المعلق (بالأيام)</label>
              <input
                type="number"
                value={settings.applicationValidityDays}
                onChange={e => updateSettings(s => ({ ...s, applicationValidityDays: parseInt(e.target.value) || 30 }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">تفعيل رمز التحقق (OTP SMS)</h3>
                <p className="text-[11px] text-neutral-500">إلزام إدخال كود التحقق عند التسجيل</p>
              </div>
              <button
                onClick={() => updateSettings(s => ({ ...s, enableOtpVerification: !s.enableOtpVerification }))}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.enableOtpVerification ? "bg-emerald-600 text-white" : "bg-neutral-200 text-neutral-700"
                }`}
              >
                {settings.enableOtpVerification ? "مفعل ✓" : "معطل ✕"}
              </button>
            </div>
          </div>

          {/* Required Files Checklist */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
            <h3 className="text-xs font-bold text-emerald-900">المستندات والملفات الإلزامية في نموذج الانضمام:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { label: "رفع صورة الهوية الوطنية", key: "requireNationalIdPhoto" },
                { label: "رفع الصورة الشخصية الرسمية", key: "requirePersonalPhoto" },
                { label: "رفع الميثاق والتعهد (PDF)", key: "requireCharterPdf" }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer bg-white p-3 rounded-lg border border-neutral-200">
                  <input
                    type="checkbox"
                    checked={(settings as any)[item.key]}
                    onChange={e => {
                      const checked = e.target.checked;
                      updateSettings(s => ({ ...s, [item.key]: checked }));
                    }}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: ROLES & AUDIT LOG */}
      {activeSection === "roles" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-emerald-600" />
                <span>5- إدارة الأدوار الوظيفية وسجل عمليات التدقيق</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">تحديد الصلاحيات المسموحة للأدوار واستعراض السجلات الأمنية الكاملة</p>
            </div>
            <button
              onClick={() => handleSaveSection("الأدوار والصلاحيات")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الأدوار</span>
            </button>
          </div>

          {/* Roles Table */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-900">الأدوار المعتمدة في النظام:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.customRoles.map(role => (
                <div key={role.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md">
                      {role.nameAr} ({role.nameEn})
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">ID: {role.id}</span>
                  </div>
                  <p className="text-xs text-neutral-600">{role.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {role.allowedPages.map(page => (
                      <span key={page} className="bg-white text-neutral-700 text-[10px] font-mono border border-neutral-300 px-2 py-0.5 rounded">
                        {page}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Custom Role Form */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-300 space-y-3">
              <h4 className="text-xs font-bold text-neutral-800">إضافة دور وظيفي جديد:</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="اسم الدور بالعربية (مثال: مشرف مالي)"
                  value={newRoleNameAr}
                  onChange={e => setNewRoleNameAr(e.target.value)}
                  className="text-xs p-2 rounded-lg border border-neutral-300 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="وصف صلاحيات الدور"
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  className="text-xs p-2 rounded-lg border border-neutral-300 focus:outline-none md:col-span-2"
                />
              </div>
              <button
                onClick={() => {
                  if (!newRoleNameAr.trim()) return;
                  const newRole = {
                    id: "role-" + Date.now(),
                    nameAr: newRoleNameAr,
                    nameEn: newRoleNameAr,
                    allowedPages: ["vols", "init"],
                    description: newRoleDesc || "دور مخصص"
                  };
                  updateSettings(s => ({
                    ...s,
                    customRoles: [...s.customRoles, newRole]
                  }));
                  setNewRoleNameAr("");
                  setNewRoleDesc("");
                }}
                className="bg-neutral-800 hover:bg-neutral-900 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إنشاء الدور جديد</span>
              </button>
            </div>
          </div>

          {/* Audit Log View */}
          <div className="pt-4 border-t border-neutral-200 space-y-3">
            <h3 className="text-xs font-bold text-neutral-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>سجل التدقيق والتغيرات الأخير بالنظام (System Audit Log):</span>
            </h3>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {logs.slice(0, 10).map(log => (
                <div key={log.id} className="p-2.5 bg-neutral-50 rounded-lg text-xs flex flex-col md:flex-row md:items-center justify-between gap-2 border border-neutral-200/50">
                  <div>
                    <span className="font-bold text-neutral-800">{log.user}: </span>
                    <span className="text-neutral-600">{log.action}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-mono shrink-0">
                    <span>IP: {log.ip}</span>
                    <span>{new Date(log.timestamp).toLocaleString("ar-SA")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: NOTIFICATIONS */}
      {activeSection === "notifications" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                <span>6- إعدادات الإشعارات وقوالب الرسائل</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">تفعيل قنوات الإرسال وتخصيص نصوص الرسائل التلقائية</p>
            </div>
            <button
              onClick={() => handleSaveSection("الإشعارات والتعاميم")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ القوالب</span>
            </button>
          </div>

          {/* Real Email Central Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Mail className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong className="text-xs font-bold text-emerald-950 block">نظام إعدادات البريد الحقيقي (Sender & SMTP)</strong>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  تم تفعيل المحرك المركزي للبريد. لتهيئة هوية المرسل ومفاتيح Resend وخادم SMTP وسجلات التسليم، افتح صفحة "إعدادات البريد الحقيقي" من القائمة الجانبية للإدارة.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[10px] shrink-0">
              خدمة مركزية نشطة ✓
            </span>
          </div>

          {/* Audio Notification Settings Feature: Volunteer & Team Applications */}
          <div className="bg-gradient-to-r from-emerald-50/80 via-white to-emerald-50/50 border border-emerald-300/80 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${isAppAudioEnabled ? 'bg-emerald-600 text-white shadow-xs' : 'bg-neutral-200 text-neutral-500'}`}>
                  {isAppAudioEnabled ? <BellRing className="w-5 h-5 animate-bounce" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-xs font-black text-neutral-900">
                      التنبيه الصوتي الذكي عند تقديم طلبات التطوع أو الفرق
                    </strong>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                      ميزة فورية
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-600 mt-1 leading-relaxed max-w-xl">
                    تشغيل نغمة صوتية هادئة وفورية عند قيام أي شخص بتقديم طلب انضمام كمتطوع جديد أو تسجيل فريق تطوعي جديد عبر البوابة، لتنبيه الإدارة ومراجعي الطلبات فورياً.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <button
                  type="button"
                  onClick={testAppSound}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="تجربة وسماع النغمة الهادئة"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>تجربة الصوت 🔔</span>
                </button>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAppAudioEnabled}
                  onClick={toggleAppAudio}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isAppAudioEnabled ? 'bg-emerald-600' : 'bg-neutral-300'
                  }`}
                  title="تبديل تفعيل التنبيه الصوتي"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isAppAudioEnabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Toggle Channels */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "البريد الإلكتروني", key: "enableEmail" },
              { label: "الرسائل النصية SMS", key: "enableSms" },
              { label: "إشعارات الواتساب", key: "enableWhatsapp" },
              { label: "الإشعارات الداخلية", key: "enableInApp" },
              { label: "إشعارات المتصفح", key: "enableBrowserPush" }
            ].map(ch => (
              <button
                key={ch.key}
                onClick={() => {
                  updateSettings(s => ({
                    ...s,
                    notifications: {
                      ...s.notifications,
                      [ch.key]: !(s.notifications as any)[ch.key]
                    }
                  }));
                }}
                className={`p-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  (settings.notifications as any)[ch.key]
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-neutral-50 border-neutral-200 text-neutral-500"
                }`}
              >
                <div>{ch.label}</div>
                <div className="text-[10px] mt-1">{(settings.notifications as any)[ch.key] ? "مفعل ✓" : "معطل ✕"}</div>
              </button>
            ))}
          </div>

          {/* Message Templates */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-neutral-900">تخصيص قوالب الرسائل التلقائية:</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">رسالة قبول المتطوع (تعتمد المعاملات {"{name}"} و {"{team}"}):</label>
                <textarea
                  rows={2}
                  value={settings.notifications.templates.acceptVolunteer}
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings(s => ({
                      ...s,
                      notifications: {
                        ...s.notifications,
                        templates: { ...s.notifications.templates, acceptVolunteer: val }
                      }
                    }));
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">رسالة الاعتذار عن عدم القبول:</label>
                <textarea
                  rows={2}
                  value={settings.notifications.templates.rejectVolunteer}
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings(s => ({
                      ...s,
                      notifications: {
                        ...s.notifications,
                        templates: { ...s.notifications.templates, rejectVolunteer: val }
                      }
                    }));
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">دعوة للمشاركة في فرصة تطوعية:</label>
                <textarea
                  rows={2}
                  value={settings.notifications.templates.initiativeInvite}
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings(s => ({
                      ...s,
                      notifications: {
                        ...s.notifications,
                        templates: { ...s.notifications.templates, initiativeInvite: val }
                      }
                    }));
                  }}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: AI SETTINGS */}
      {activeSection === "ai" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-600" />
                <span>7- إعدادات مساعد الذكاء الاصطناعي وقاعدة المعرفة</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">اسم المساعد، كلمات التحويل التلقائي للدعم الفني البشري والردود الجاهزة</p>
            </div>
            <button
              onClick={() => handleSaveSection("إعدادات الذكاء الاصطناعي")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">تفعيل مساعد الذكاء الاصطناعي</h3>
                <p className="text-[11px] text-neutral-500">تشغيل الدردشة العائمة الرد الآلي للجمهور</p>
              </div>
              <button
                onClick={() => {
                  updateSettings(s => ({
                    ...s,
                    aiAssistant: { ...s.aiAssistant, enabled: !s.aiAssistant.enabled }
                  }));
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.aiAssistant.enabled ? "bg-emerald-600 text-white" : "bg-neutral-300 text-neutral-700"
                }`}
              >
                {settings.aiAssistant.enabled ? "مفعل ✓" : "معطل ✕"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">اسم مساعد الذكاء الاصطناعي</label>
              <input
                type="text"
                value={settings.aiAssistant.name}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, aiAssistant: { ...s.aiAssistant, name: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-neutral-700 mb-1">رسالة الترحيب الأولى للمستخدم</label>
              <input
                type="text"
                value={settings.aiAssistant.welcomeMessage}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, aiAssistant: { ...s.aiAssistant, welcomeMessage: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">عدد محاولات الذكاء قبل اقتراح التحويل البشري</label>
              <input
                type="number"
                value={settings.aiAssistant.maxAttemptsBeforeTransfer}
                onChange={e => {
                  const val = parseInt(e.target.value) || 3;
                  updateSettings(s => ({ ...s, aiAssistant: { ...s.aiAssistant, maxAttemptsBeforeTransfer: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">ساعات عمل الدعم الفني البشري</label>
              <input
                type="text"
                value={settings.aiAssistant.supportWorkingHours}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, aiAssistant: { ...s.aiAssistant, supportWorkingHours: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Canned Responses Manager */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-neutral-900">إدارة الردود السريعة المباشرة (Canned Responses):</h3>
            <div className="space-y-2">
              {settings.aiAssistant.cannedResponses.map(cr => (
                <div key={cr.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded me-2">
                      كلمة: {cr.keyword}
                    </span>
                    <span className="text-neutral-700">{cr.response}</span>
                  </div>
                  <button
                    onClick={() => {
                      updateSettings(s => ({
                        ...s,
                        aiAssistant: {
                          ...s.aiAssistant,
                          cannedResponses: s.aiAssistant.cannedResponses.filter(item => item.id !== cr.id)
                        }
                      }));
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-2">
              <input
                type="text"
                placeholder="الكلمة المفتاحية (مثال: البطاقة)"
                value={newCannedKeyword}
                onChange={e => setNewCannedKeyword(e.target.value)}
                className="text-xs p-2 rounded-lg border border-neutral-300 w-full md:w-48"
              />
              <input
                type="text"
                placeholder="الرد التلقائي المباشر"
                value={newCannedResponse}
                onChange={e => setNewCannedResponse(e.target.value)}
                className="text-xs p-2 rounded-lg border border-neutral-300 flex-1"
              />
              <button
                onClick={() => {
                  if (!newCannedKeyword.trim() || !newCannedResponse.trim()) return;
                  const item = {
                    id: "cr-" + Date.now(),
                    keyword: newCannedKeyword,
                    response: newCannedResponse
                  };
                  updateSettings(s => ({
                    ...s,
                    aiAssistant: {
                      ...s.aiAssistant,
                      cannedResponses: [...s.aiAssistant.cannedResponses, item]
                    }
                  }));
                  setNewCannedKeyword("");
                  setNewCannedResponse("");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs shrink-0 cursor-pointer"
              >
                إضافة رد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 8: DOCUMENTS & LEGAL */}
      {activeSection === "documents" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>8- إدارة الوثائق والسياسات والشروط</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">سياسة الخصوصية، شروط الاستخدام، ميثاق العمل التطوعي والأسئلة الشائعة</p>
            </div>
            <button
              onClick={() => handleSaveSection("الوثائق والسياسات")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ النصوص</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">نص سياسة الخصوصية الرسمية:</label>
              <textarea
                rows={3}
                value={settings.documents.privacyPolicyAr}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, documents: { ...s.documents, privacyPolicyAr: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">نص شروط الاستخدام والأحكام:</label>
              <textarea
                rows={3}
                value={settings.documents.termsOfUseAr}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, documents: { ...s.documents, termsOfUseAr: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">نص ميثاق العمل التطوعي المعتمد:</label>
              <textarea
                rows={3}
                value={settings.documents.volunteerCharterAr}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, documents: { ...s.documents, volunteerCharterAr: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            {/* FAQ List Manager */}
            <div className="pt-2 space-y-3">
              <h3 className="text-xs font-bold text-neutral-900">إدارة الأسئلة الشائعة (FAQ):</h3>
              <div className="space-y-2">
                {settings.documents.faqAr.map(faq => (
                  <div key={faq.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 flex items-start justify-between text-xs gap-3">
                    <div>
                      <div className="font-bold text-neutral-900 mb-1">س: {faq.question}</div>
                      <div className="text-neutral-600">ج: {faq.answer}</div>
                    </div>
                    <button
                      onClick={() => {
                        updateSettings(s => ({
                          ...s,
                          documents: {
                            ...s.documents,
                            faqAr: s.documents.faqAr.filter(item => item.id !== faq.id)
                          }
                        }));
                      }}
                      className="text-red-500 hover:text-red-700 p-1 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="السؤال الشائع"
                  value={newFaqQ}
                  onChange={e => setNewFaqQ(e.target.value)}
                  className="text-xs p-2 rounded-lg border border-neutral-300"
                />
                <input
                  type="text"
                  placeholder="إجابة السؤال"
                  value={newFaqA}
                  onChange={e => setNewFaqA(e.target.value)}
                  className="text-xs p-2 rounded-lg border border-neutral-300"
                />
                <button
                  onClick={() => {
                    if (!newFaqQ.trim() || !newFaqA.trim()) return;
                    const item = { id: "faq-" + Date.now(), question: newFaqQ, answer: newFaqA };
                    updateSettings(s => ({
                      ...s,
                      documents: {
                        ...s.documents,
                        faqAr: [...s.documents.faqAr, item]
                      }
                    }));
                    setNewFaqQ("");
                    setNewFaqA("");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs self-start cursor-pointer"
                >
                  إضافة سؤال جديد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 9: APPEARANCE */}
      {activeSection === "appearance" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-emerald-600" />
                <span>9- إعدادات المظهر والجماليات والألوان</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">تغيير الألوان الرئيسية، نوع الخطوط وحجمها، والخلفيات الرسمية</p>
            </div>
            <button
              onClick={() => handleSaveSection("المظهر والجماليات")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>تطبيق المظهر</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">اللون الرئيسي للنظام (Primary Color)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.appearance.primaryColor}
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings(s => ({ ...s, appearance: { ...s.appearance, primaryColor: val } }));
                  }}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-neutral-300"
                />
                <input
                  type="text"
                  value={settings.appearance.primaryColor}
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings(s => ({ ...s, appearance: { ...s.appearance, primaryColor: val } }));
                  }}
                  className="text-xs p-2.5 rounded-xl border border-neutral-300 font-mono flex-1 dir-ltr text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">اللون الثانوي (Secondary Color)</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.appearance.secondaryColor}
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings(s => ({ ...s, appearance: { ...s.appearance, secondaryColor: val } }));
                  }}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-neutral-300"
                />
                <input
                  type="text"
                  value={settings.appearance.secondaryColor}
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings(s => ({ ...s, appearance: { ...s.appearance, secondaryColor: val } }));
                  }}
                  className="text-xs p-2.5 rounded-xl border border-neutral-300 font-mono flex-1 dir-ltr text-right"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">خط النظام المعتمد (Font Family)</label>
              <select
                value={settings.appearance.fontFamily}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, appearance: { ...s.appearance, fontFamily: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none bg-white font-bold"
              >
                <option value="Cairo">خط القاهرة (Cairo - الموصى به)</option>
                <option value="Tajawal">خط تجوال (Tajawal)</option>
                <option value="Amiri">خط أميري (Amiri)</option>
                <option value="IBM Plex Sans Arabic">IBM Plex Sans Arabic</option>
                <option value="Inter">Inter Standard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">حجم الخط الأساسي بالنظام</label>
              <select
                value={settings.appearance.fontSize}
                onChange={e => {
                  const val = e.target.value as any;
                  updateSettings(s => ({ ...s, appearance: { ...s.appearance, fontSize: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none bg-white font-bold"
              >
                <option value="normal">عادي (Standard 14px)</option>
                <option value="large">كبير (Large 16px)</option>
                <option value="xlarge">كبير جداً (X-Large 18px)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 10: BACKUP & RESTORE */}
      {activeSection === "backup" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <span>10- النسخ الاحتياطي واستعادة البيانات</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">توليد نسخة احتياطية كاملة JSON واستيراد البيانات بأمان</p>
            </div>
            <button
              onClick={() => handleSaveSection("جدولة النسخ الاحتياطي")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الإعدادات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
              <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-700" />
                <span>تنزيل نسخة احتياطية يدوية الآن:</span>
              </h3>
              <p className="text-[11px] text-emerald-700">تنزيل ملف JSON كامل يحتوي كافة بيانات المتطوعين والمبادرات والتذاكر.</p>
              <button
                onClick={() => window.open("/api/db/backup", "_blank")}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل النسخة الاحتياطية (db.json)</span>
              </button>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <h3 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-700" />
                <span>استعادة قاعدة البيانات من ملف JSON:</span>
              </h3>
              <p className="text-[11px] text-amber-700">يرجى رفع ملف نسخة احتياطية صالح لاستعادة البيانات السابقة.</p>
              <label className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs inline-flex items-center gap-2 cursor-pointer shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>اختر ملف JSON للاستعادة</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => {
                        try {
                          const json = JSON.parse(ev.target?.result as string);
                          onRestoreDb(json);
                          alert("تم استعادة قاعدة البيانات بنجاح ✓");
                        } catch (err) {
                          alert("فشل قراءة الملف! يرجى رفع ملف JSON صالح.");
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 11: SECURITY SETTINGS */}
      {activeSection === "security" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>11- إعدادات أمان النظام وحظر العناوين</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">تفعيل المصادقة الثنائية، حدود الدخول، وحظر عناوين IP المشبوهة</p>
            </div>
            <button
              onClick={() => handleSaveSection("أمان النظام والحظر")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الأمان</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">تفعيل المصادقة الثنائية (2FA)</h3>
                <p className="text-[11px] text-neutral-500">إلزام المديرين باستخدام كود المصادقة</p>
              </div>
              <button
                onClick={() => {
                  updateSettings(s => ({
                    ...s,
                    security: { ...s.security, enable2FA: !s.security.enable2FA }
                  }));
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  settings.security.enable2FA ? "bg-emerald-600 text-white" : "bg-neutral-300 text-neutral-700"
                }`}
              >
                {settings.security.enable2FA ? "مفعل ✓" : "معطل ✕"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">الحد الأقصى لمحاولات تسجيل الدخول الخاطئة</label>
              <input
                type="number"
                value={settings.security.maxLoginAttempts}
                onChange={e => {
                  const val = parseInt(e.target.value) || 5;
                  updateSettings(s => ({ ...s, security: { ...s.security, maxLoginAttempts: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">مدة خمول الجلسة قبل الخروج التلقائي (بالدقائق)</label>
              <input
                type="number"
                value={settings.security.sessionTimeoutMinutes}
                onChange={e => {
                  const val = parseInt(e.target.value) || 60;
                  updateSettings(s => ({ ...s, security: { ...s.security, sessionTimeoutMinutes: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Blocked IPs Manager */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-neutral-900">قائمة عناوين IP المحظورة من النظام:</h3>
            <div className="flex flex-wrap gap-2">
              {settings.security.blockedIps.map(ip => (
                <span key={ip} className="bg-red-50 text-red-800 border border-red-200 px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-2">
                  <span>{ip}</span>
                  <button
                    onClick={() => {
                      updateSettings(s => ({
                        ...s,
                        security: {
                          ...s.security,
                          blockedIps: s.security.blockedIps.filter(item => item !== ip)
                        }
                      }));
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-sm">
              <input
                type="text"
                placeholder="أدخل عنوان IP لحظره (مثال: 192.168.1.50)"
                value={newBlockedIp}
                onChange={e => setNewBlockedIp(e.target.value)}
                className="text-xs p-2 rounded-lg border border-neutral-300 font-mono dir-ltr text-right flex-1"
              />
              <button
                onClick={() => {
                  if (!newBlockedIp.trim()) return;
                  updateSettings(s => ({
                    ...s,
                    security: {
                      ...s.security,
                      blockedIps: [...s.security.blockedIps, newBlockedIp.trim()]
                    }
                  }));
                  setNewBlockedIp("");
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2 rounded-lg text-xs cursor-pointer"
              >
                حظر IP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 12: STATS OVERVIEW */}
      {activeSection === "stats" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="border-b border-neutral-100 pb-4">
            <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>12- شاشة الإحصائيات الشاملة وأرقام الإدارة</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">عرض عدادات الأداء الحية للنظام ونتائج المبادرات والساعات التطوعية</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "إجمالي المتطوعين المعتمدين", val: stats?.totalVolunteers || 0, color: "emerald" },
              { label: "إجمالي الساعات التطوعية", val: stats?.totalHours || 0, color: "blue" },
              { label: "عدد المبادرات المنفذة", val: stats?.totalInitiatives || 0, color: "purple" },
              { label: "قيمة العائد الاقتصادي (ريال)", val: stats?.economicValue || 0, color: "amber" },
              { label: "عدد الشراكات المعتمدة", val: stats?.partnershipsCount || 0, color: "teal" },
              { label: "نسبة رضا المستفيدين", val: `${stats?.beneficiarySatisfaction || 98}%`, color: "rose" },
              { label: "الساعات المرصودة هذا الشهر", val: stats?.monthlyHours || 0, color: "indigo" },
              { label: "عدد الشهادات الصادرة", val: (stats?.totalVolunteers || 0) * 3, color: "emerald" }
            ].map((st, i) => (
              <div key={i} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 text-center space-y-1">
                <span className="text-[11px] font-bold text-neutral-500 block">{st.label}</span>
                <span className="text-xl font-black text-neutral-900 font-mono">{st.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 13: FILES & SEALS */}
      {activeSection === "files" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-emerald-600" />
                <span>13- إدارة الملفات والوسائط والأختام الرسمية</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">شعارات الشهادات والبطاقات، الختم الرسمي للجمعية وتوقيع القائد العام</p>
            </div>
            <button
              onClick={() => handleSaveSection("الأختام والوسائط")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الشعارات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImagePickerControl
              label="شعار الشهادات الرسمية"
              description="الشعار الذي يطبع على شهادات الساعات والتطوع المعتمدة"
              value={settings.files.certificateLogo}
              onChange={val => updateSettings(s => ({ ...s, files: { ...s.files, certificateLogo: val } }))}
              aspectRatio="logo"
            />

            <ImagePickerControl
              label="شعار بطاقات التطوع الرقمية"
              description="الشعار البارز المطبوع أعلى بطاقات العضوية الذكية"
              value={settings.files.volunteerCardLogo}
              onChange={val => updateSettings(s => ({ ...s, files: { ...s.files, volunteerCardLogo: val } }))}
              aspectRatio="logo"
            />

            <ImagePickerControl
              label="صورة الختم الرسمي المعتمد للجمعية"
              description="صورة الختم لتوثيق الشهادات والخطابات الإلكترونية"
              value={settings.files.officialStampUrl}
              onChange={val => updateSettings(s => ({ ...s, files: { ...s.files, officialStampUrl: val } }))}
              aspectRatio="stamp"
            />

            <ImagePickerControl
              label="صورة التوقيع الرسمي للقائد العام"
              description="توقيع اعتماد الشهادات والبطاقات الرسمية"
              value={settings.files.commanderSignatureUrl}
              onChange={val => updateSettings(s => ({ ...s, files: { ...s.files, commanderSignatureUrl: val } }))}
              aspectRatio="stamp"
            />

            <ImagePickerControl
              label="صورة الشخصية الموحدة للعنصر النسائي (المتطوعات)"
              description="الصورة الرسمية الموحدة لجميع المتطوعات في البطاقات الرقمية لحفظ الخصوصية"
              value={settings.files.defaultFemaleAvatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"}
              onChange={val => updateSettings(s => ({ ...s, files: { ...s.files, defaultFemaleAvatarUrl: val } }))}
              aspectRatio="avatar"
            />

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">رقم هاتف الطوارئ والتكافل المباشر</label>
              <input
                type="text"
                value={settings.files.emergencyPhone}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, files: { ...s.files, emergencyPhone: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 font-mono dir-ltr text-right"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 14: CONTACT */}
      {activeSection === "contact" && (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-emerald-600" />
                <span>14- بيانات التواصل المباشر مع الإدارة</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">ساعات العمل الرسمية، رقم الجوال المعتمد ونموذج اتصل بنا</p>
            </div>
            <button
              onClick={() => handleSaveSection("بيانات التواصل")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ البيانات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">أوقات وساعات العمل الرسمية</label>
              <input
                type="text"
                value={settings.aiAssistant.supportWorkingHours}
                onChange={e => {
                  const val = e.target.value;
                  updateSettings(s => ({ ...s, aiAssistant: { ...s.aiAssistant, supportWorkingHours: val } }));
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">البريد الإلكتروني للرد على الشكاوى والاقترحات</label>
              <input
                type="email"
                value={settings.officialEmail}
                onChange={e => updateSettings(s => ({ ...s, officialEmail: e.target.value }))}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 focus:border-emerald-600 focus:outline-none dir-ltr text-right"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
