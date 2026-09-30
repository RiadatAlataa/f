import React, { useState, useEffect } from "react";
import { 
  Settings, Image, Video, Info, Phone, Link2, Eye, EyeOff, 
  Plus, Trash2, Edit3, HelpCircle, Save, CheckCircle, Clock, 
  AlertTriangle, Check, X, ShieldAlert, Award, FileText, UserCheck, Inbox,
  ShieldCheck, ArrowUp, ArrowDown, ExternalLink, Sliders, Globe,
  Network, Image as ImageIcon, Upload, Maximize2, RefreshCw
} from "lucide-react";
import { buildApiUrl } from "../config/api";
import { 
  HomeSettings, NewsItem, PartnerItem, GalleryItem, 
  Beneficiary, BenefitRequest, OrgMember, HeroSlide 
} from "../types";
import { ImagePickerControl } from "./ImagePickerControl";
import { ImageUploadField } from "./ImageUploadField";
import { BeneficiariesManager } from "./BeneficiariesManager";
import { OrgChartAdminPanel } from "./OrgChartAdminPanel";
import { HeroSlidesAdminPanel } from "./HeroSlidesAdminPanel";

interface HomepageAdminPanelProps {
  settings: HomeSettings;
  news: NewsItem[];
  partners: PartnerItem[];
  gallery: GalleryItem[];
  beneficiaries: Beneficiary[];
  benefitRequests: BenefitRequest[];
  orgMembers?: OrgMember[];
  heroSlides?: HeroSlide[];
  onUpdateSettings: (updated: HomeSettings) => Promise<boolean>;
  onAddNews: (item: Partial<NewsItem>) => Promise<boolean>;
  onDeleteNews: (id: string) => Promise<boolean>;
  onAddPartner: (item: Partial<PartnerItem>) => Promise<boolean>;
  onDeletePartner: (id: string) => Promise<boolean>;
  onBatchUpdatePartners?: (partnersList: PartnerItem[]) => Promise<boolean>;
  onAddGallery: (item: Partial<GalleryItem>) => Promise<boolean>;
  onDeleteGallery: (id: string) => Promise<boolean>;
  onUpdateBeneficiaryStatus: (id: string, status: "approved" | "pending" | "rejected") => Promise<boolean>;
  onUpdateBenefitRequestStatus: (id: string, status: "pending" | "approved" | "in_progress" | "completed" | "rejected", notes: string) => Promise<boolean>;
  onAddOrgMember?: (member: Partial<OrgMember>) => Promise<boolean>;
  onDeleteOrgMember?: (id: string) => Promise<boolean>;
  onToggleOrgMemberActive?: (id: string, isActive?: boolean) => Promise<boolean>;
  onBatchUpdateOrgMembers?: (members: OrgMember[]) => Promise<boolean>;
  onImportDirectors?: () => Promise<boolean>;
  onAddHeroSlide?: (slide: Partial<HeroSlide>) => Promise<boolean>;
  onDeleteHeroSlide?: (id: string) => Promise<boolean>;
  onToggleSlideActive?: (id: string, isActive?: boolean) => Promise<boolean>;
  onBatchUpdateHeroSlides?: (slides: HeroSlide[]) => Promise<boolean>;
  initialTab?: "settings" | "news" | "partners" | "gallery" | "beneficiaries" | "requests" | "org_chart" | "hero_slides";
  lang?: "ar" | "en";
  currentUserRole?: string;
  currentUserName?: string;
  onAddNewBeneficiary?: (ben: Partial<Beneficiary>) => Promise<boolean>;
}

export function HomepageAdminPanel({
  settings,
  news,
  partners,
  gallery,
  beneficiaries,
  benefitRequests,
  orgMembers = [],
  heroSlides = [],
  onUpdateSettings,
  onAddNews,
  onDeleteNews,
  onAddPartner,
  onDeletePartner,
  onBatchUpdatePartners,
  onAddGallery,
  onDeleteGallery,
  onUpdateBeneficiaryStatus,
  onUpdateBenefitRequestStatus,
  onAddOrgMember,
  onDeleteOrgMember,
  onToggleOrgMemberActive,
  onBatchUpdateOrgMembers,
  onImportDirectors,
  onAddHeroSlide,
  onDeleteHeroSlide,
  onToggleSlideActive,
  onBatchUpdateHeroSlides,
  initialTab = "settings",
  lang = "ar",
  currentUserRole = "admin",
  currentUserName = "الإدارة العامة",
  onAddNewBeneficiary
}: HomepageAdminPanelProps) {
  
  // Tabs within Admin panel
  const [adminSubTab, setAdminSubTab] = useState<"settings" | "news" | "partners" | "gallery" | "beneficiaries" | "requests" | "org_chart" | "hero_slides">(initialTab || "settings");

  // Home Settings Local State
  const [localSettings, setLocalSettings] = useState<HomeSettings>({ ...settings });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPartnerSettings, setIsSavingPartnerSettings] = useState(false);

  // License Management States
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [licenseFeedback, setLicenseFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isLicensePreviewModalOpen, setIsLicensePreviewModalOpen] = useState(false);
  const [showLicenseDeleteConfirm, setShowLicenseDeleteConfirm] = useState(false);
  const licenseFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadLicenseFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setLicenseFeedback({ type: "error", text: "يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP, SVG)" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setLicenseFeedback({ type: "error", text: "حجم الملف يتجاوز الحد المسموح (10 ميجابايت)" });
      return;
    }

    setIsUploadingLicense(true);
    setLicenseFeedback(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      try {
        const res = await fetch(buildApiUrl("/api/db/license/upload"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64Data,
            licenseNumber: localSettings.licenseNumber || "5081"
          })
        });
        const data = await res.json();
        const finalUrl = data.imageUrl || base64Data;
        const updated: HomeSettings = {
          ...localSettings,
          licenseNumber: data.licenseNumber || localSettings.licenseNumber || "5081",
          licenseImage: finalUrl,
          licenseConfig: {
            ...(localSettings.licenseConfig || {}),
            enabled: true,
            imageUrl: finalUrl,
            titleAr: localSettings.licenseConfig?.titleAr || "وثيقة تسجيل وترخيص الجمعية الرسمية رقم 5081",
            notes: localSettings.licenseConfig?.notes || "مسجلة بالمركز الوطني لتنمية القطاع غير الربحي بالترخيص رقم 5081"
          }
        };
        setLocalSettings(updated);
        await onUpdateSettings(updated);
        setLicenseFeedback({ type: "success", text: "تم رفع وحفظ وثيقة الترخيص الرسمية بنجاح ✓ وتظهر الآن في الصفحة الرئيسية!" });
      } catch {
        const updated: HomeSettings = {
          ...localSettings,
          licenseImage: base64Data,
          licenseConfig: {
            ...(localSettings.licenseConfig || {}),
            enabled: true,
            imageUrl: base64Data
          }
        };
        setLocalSettings(updated);
        await onUpdateSettings(updated);
        setLicenseFeedback({ type: "success", text: "تم حفظ صورة الترخيص في النظام بنجاح ✓" });
      } finally {
        setIsUploadingLicense(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteLicense = async () => {
    setIsUploadingLicense(true);
    setLicenseFeedback(null);
    try {
      await fetch(buildApiUrl("/api/db/license/delete"), { method: "POST" });
      const updated: HomeSettings = {
        ...localSettings,
        licenseImage: "",
        licenseConfig: {
          ...(localSettings.licenseConfig || {}),
          imageUrl: ""
        }
      };
      setLocalSettings(updated);
      await onUpdateSettings(updated);
      setShowLicenseDeleteConfirm(false);
      setLicenseFeedback({ type: "success", text: "تم حذف صورة وثيقة الترخيص بنجاح" });
    } catch {
      const updated: HomeSettings = {
        ...localSettings,
        licenseImage: "",
        licenseConfig: {
          ...(localSettings.licenseConfig || {}),
          imageUrl: ""
        }
      };
      setLocalSettings(updated);
      await onUpdateSettings(updated);
      setShowLicenseDeleteConfirm(false);
      setLicenseFeedback({ type: "success", text: "تم حذف صورة الترخيص" });
    } finally {
      setIsUploadingLicense(false);
    }
  };

  useEffect(() => {
    setLocalSettings({ ...settings });
  }, [settings]);

  // News State
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [newsTitleAr, setNewsTitleAr] = useState("");
  const [newsTitleEn, setNewsTitleEn] = useState("");
  const [newsBodyAr, setNewsBodyAr] = useState("");
  const [newsBodyEn, setNewsBodyEn] = useState("");
  const [newsImage, setNewsImage] = useState("");

  // Partner State - Enhanced
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [partnerNameAr, setPartnerNameAr] = useState("");
  const [partnerNameEn, setPartnerNameEn] = useState("");
  const [partnerLogo, setPartnerLogo] = useState("");
  const [partnerLink, setPartnerLink] = useState("");
  const [partnerCategory, setPartnerCategory] = useState("منصة وطنية");
  const [partnerActive, setPartnerActive] = useState(true);

  // Gallery State
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryTitleAr, setGalleryTitleAr] = useState("");
  const [galleryTitleEn, setGalleryTitleEn] = useState("");
  const [galleryType, setGalleryType] = useState<"photo" | "video">("photo");
  const [galleryUrl, setGalleryUrl] = useState("");

  // Request Notes state
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingRequestNotes, setEditingRequestNotes] = useState("");

  // Helper toggle visibility
  const toggleSection = (section: keyof typeof settings.sectionVisibility) => {
    setLocalSettings({
      ...localSettings,
      sectionVisibility: {
        ...localSettings.sectionVisibility,
        [section]: !localSettings.sectionVisibility[section]
      }
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    const success = await onUpdateSettings(localSettings);
    if (success) {
      alert(lang === "ar" ? "تم حفظ إعدادات الواجهة والسمات الرسمية بنجاح ✓" : "Homepage settings and branding updated ✓");
    }
    setIsSavingSettings(false);
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitleAr || !newsBodyAr) return;
    const success = await onAddNews({
      titleAr: newsTitleAr,
      titleEn: newsTitleEn || newsTitleAr,
      bodyAr: newsBodyAr,
      bodyEn: newsBodyEn || newsBodyAr,
      image: newsImage || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop",
      date: new Date().toISOString().split("T")[0]
    });
    if (success) {
      setShowNewsModal(false);
      setNewsTitleAr("");
      setNewsTitleEn("");
      setNewsBodyAr("");
      setNewsBodyEn("");
      setNewsImage("");
    }
  };

  const handleOpenAddPartner = () => {
    setEditingPartner(null);
    setPartnerNameAr("");
    setPartnerNameEn("");
    setPartnerLogo("");
    setPartnerLink("");
    setPartnerCategory("منصة وطنية");
    setPartnerActive(true);
    setShowPartnerModal(true);
  };

  const handleOpenEditPartner = (item: PartnerItem) => {
    setEditingPartner(item);
    setPartnerNameAr(item.nameAr || "");
    setPartnerNameEn(item.nameEn || item.nameAr || "");
    setPartnerLogo(item.logo || "");
    setPartnerLink(item.link || "");
    setPartnerCategory(item.category || "منصة وطنية");
    setPartnerActive(item.active !== false);
    setShowPartnerModal(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerNameAr || !partnerLogo) return;

    if (editingPartner) {
      const updatedList = partners.map(p => {
        if (p.id === editingPartner.id) {
          return {
            ...p,
            nameAr: partnerNameAr,
            nameEn: partnerNameEn || partnerNameAr,
            logo: partnerLogo,
            link: partnerLink,
            category: partnerCategory,
            active: partnerActive
          };
        }
        return p;
      });

      if (onBatchUpdatePartners) {
        await onBatchUpdatePartners(updatedList);
      } else {
        await onAddPartner({
          id: editingPartner.id,
          nameAr: partnerNameAr,
          nameEn: partnerNameEn || partnerNameAr,
          logo: partnerLogo,
          link: partnerLink,
          category: partnerCategory,
          active: partnerActive
        });
      }
    } else {
      const newPartner: Partial<PartnerItem> = {
        nameAr: partnerNameAr,
        nameEn: partnerNameEn || partnerNameAr,
        logo: partnerLogo,
        link: partnerLink,
        category: partnerCategory,
        active: partnerActive,
        order: partners.length + 1
      };
      await onAddPartner(newPartner);
    }

    setShowPartnerModal(false);
    setEditingPartner(null);
    setPartnerNameAr("");
    setPartnerNameEn("");
    setPartnerLogo("");
    setPartnerLink("");
  };

  const handleTogglePartnerActive = async (partnerId: string) => {
    const updated = partners.map(p => {
      if (p.id === partnerId) {
        return { ...p, active: p.active === false ? true : false };
      }
      return p;
    });
    if (onBatchUpdatePartners) {
      await onBatchUpdatePartners(updated);
    } else {
      const target = updated.find(p => p.id === partnerId);
      if (target) await onAddPartner(target);
    }
  };

  const handleMovePartner = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= partners.length) return;

    const listCopy = [...partners];
    const temp = listCopy[index];
    listCopy[index] = listCopy[targetIdx];
    listCopy[targetIdx] = temp;

    const reordered = listCopy.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));

    if (onBatchUpdatePartners) {
      await onBatchUpdatePartners(reordered);
    }
  };

  const handleSavePartnerSectionSettings = async () => {
    setIsSavingPartnerSettings(true);
    const success = await onUpdateSettings(localSettings);
    if (success) {
      alert(lang === "ar" ? "تم حفظ إعدادات شريط شركاء النجاح بنجاح ✓" : "Partners section settings updated ✓");
    }
    setIsSavingPartnerSettings(false);
  };

  const handleCreateGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryTitleAr || !galleryUrl) return;
    const success = await onAddGallery({
      titleAr: galleryTitleAr,
      titleEn: galleryTitleEn || galleryTitleAr,
      type: galleryType,
      url: galleryUrl,
      date: new Date().toISOString().split("T")[0]
    });
    if (success) {
      setShowGalleryModal(false);
      setGalleryTitleAr("");
      setGalleryTitleEn("");
      setGalleryType("photo");
      setGalleryUrl("");
    }
  };

  const handleUpdateNotesAndStatus = async (reqId: string, status: any) => {
    const success = await onUpdateBenefitRequestStatus(reqId, status, editingRequestNotes);
    if (success) {
      setEditingRequestId(null);
      setEditingRequestNotes("");
      alert(lang === "ar" ? "تم تحديث حالة المعاملة والملاحظات بنجاح" : "Benefit request status updated");
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Settings Navigation sub-rail */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-100 pb-4">
        <button
          onClick={() => setAdminSubTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${adminSubTab === "settings" ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
        >
          {lang === "ar" ? "إعدادات الواجهة والهوية" : "Branding & Sections"}
        </button>
        <button
          onClick={() => setAdminSubTab("news")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${adminSubTab === "news" ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
        >
          {lang === "ar" ? "الأخبار والإعلانات" : "News Management"} ({news.length})
        </button>
        <button
          onClick={() => setAdminSubTab("gallery")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${adminSubTab === "gallery" ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
        >
          {lang === "ar" ? "معرض الميديا والصور" : "Media Gallery"} ({gallery.length})
        </button>
        <button
          onClick={() => setAdminSubTab("partners")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${adminSubTab === "partners" ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
        >
          {lang === "ar" ? "شركاء النجاح والرعاة" : "Sponsors / Partners"} ({partners.length})
        </button>
        <button
          onClick={() => setAdminSubTab("beneficiaries")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${adminSubTab === "beneficiaries" ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
        >
          {lang === "ar" ? "اعتماد المستفيدين" : "Beneficiaries Approval"} ({beneficiaries.length})
        </button>
        <button
          onClick={() => setAdminSubTab("requests")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${adminSubTab === "requests" ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
        >
          {lang === "ar" ? "طلبات ومعاملات الدعم" : "Aid Requests"} ({benefitRequests.length})
        </button>
        <button
          onClick={() => setAdminSubTab("org_chart")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${adminSubTab === "org_chart" ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>{lang === "ar" ? "إدارة الهيكل الإداري" : "Org Structure"}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-mono font-bold">{orgMembers.length}</span>
        </button>
        <button
          onClick={() => setAdminSubTab("hero_slides")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${adminSubTab === "hero_slides" ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100"}`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>{lang === "ar" ? "إدارة صور الصفحة الرئيسية" : "Hero Slides"}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-mono font-bold">{heroSlides.length}</span>
        </button>
      </div>

      {/* SUBTAB 1: PORTAL HOME SETTINGS */}
      {adminSubTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Section 1: Official Branding */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-150 space-y-4">
            <h3 className="text-xs font-black text-neutral-800 flex items-center gap-1.5 pb-2 border-b border-neutral-50">
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>{lang === "ar" ? "الهوية البصرية والاسم الرسمي" : "Official NGO Identity"}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">اسم الجمعية باللغة العربية:</label>
                <input
                  type="text"
                  value={localSettings.associationNameAr}
                  onChange={(e) => setLocalSettings({ ...localSettings, associationNameAr: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">اسم الجمعية بالإنجليزية (English Name):</label>
                <input
                  type="text"
                  value={localSettings.associationNameEn}
                  onChange={(e) => setLocalSettings({ ...localSettings, associationNameEn: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">رقم الترخيص الوزاري الرسمي:</label>
                <input
                  type="text"
                  value={localSettings.licenseNumber}
                  onChange={(e) => setLocalSettings({ ...localSettings, licenseNumber: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <ImagePickerControl
                  label="الشعار الرسمي للجمعية (Official Logo)"
                  description="الشعار الذي يظهر أعلى الصفحة الرئيسية للزوار"
                  value={localSettings.logoUrl}
                  onChange={(val) => setLocalSettings({ ...localSettings, logoUrl: val })}
                  aspectRatio="logo"
                />
              </div>
            </div>

            {/* Custom Theme Color pickers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-50 pt-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">اللون الأساسي للسمة (Primary Color):</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={localSettings.themePrimary}
                    onChange={(e) => setLocalSettings({ ...localSettings, themePrimary: e.target.value })}
                    className="w-10 h-8 rounded-lg cursor-pointer border-0"
                  />
                  <input 
                    type="text" 
                    value={localSettings.themePrimary} 
                    onChange={(e) => setLocalSettings({ ...localSettings, themePrimary: e.target.value })}
                    className="px-3 py-1 text-xs border border-neutral-200 rounded-lg font-mono text-center flex-1" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">اللون الثانوي التكميلي (Secondary Color):</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={localSettings.themeSecondary}
                    onChange={(e) => setLocalSettings({ ...localSettings, themeSecondary: e.target.value })}
                    className="w-10 h-8 rounded-lg cursor-pointer border-0"
                  />
                  <input 
                    type="text" 
                    value={localSettings.themeSecondary} 
                    onChange={(e) => setLocalSettings({ ...localSettings, themeSecondary: e.target.value })}
                    className="px-3 py-1 text-xs border border-neutral-200 rounded-lg font-mono text-center flex-1" 
                  />
                </div>
              </div>
            </div>

            {/* Volunteer Card Template upload / URL */}
            <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3">
              <ImageUploadField
                label="قالب خلفية بطاقات المتطوعين المعتمد (رفع ملف مباشر)"
                description="يمكنك رفع صورة القالب المعتمد لبطاقات المتطوعين مباشرة من جهازك لاستخدامه كخلفية لبطاقات المتطوعين."
                value={localSettings.volunteerCardTemplateUrl || ""}
                onChange={(val) => setLocalSettings({ ...localSettings, volunteerCardTemplateUrl: val })}
                previewAspect="video"
              />
            </div>
          </div>

          {/* Section 1.5: Official License Image & Number Management */}
          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-300/80 shadow-xs space-y-5">
            {/* Hidden File Input for License Upload */}
            <input
              type="file"
              ref={licenseFileInputRef}
              accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleUploadLicenseFile(file);
                }
                if (e.target) e.target.value = "";
              }}
            />

            {/* Header of Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shadow-2xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-neutral-800 flex items-center gap-2">
                    <span>{lang === "ar" ? "إدارة وثيقة وصورة الترخيص الرسمي (رقم 5081)" : "Official License Management (#5081)"}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      معتمد
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {lang === "ar" 
                      ? "إدارة صورة وثيقة الترخيص الرسمية وتحديد رقم الترخيص المعروض للزوار في الصفحة الرئيسية" 
                      : "Manage official license document image and number shown on the public homepage"}
                  </p>
                </div>
              </div>

              {/* Active Toggle Switch */}
              <label className="inline-flex items-center gap-2 cursor-pointer bg-emerald-50 hover:bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors">
                <input
                  type="checkbox"
                  checked={localSettings.licenseConfig?.enabled !== false}
                  onChange={(e) => {
                    setLocalSettings({
                      ...localSettings,
                      licenseConfig: {
                        ...(localSettings.licenseConfig || {
                          imageUrl: "",
                          titleAr: "وثيقة تسجيل وترخيص الجمعية الرسمية رقم 5081",
                          notes: "مسجلة بالمركز الوطني لتنمية القطاع غير الربحي بالترخيص رقم 5081"
                        }),
                        enabled: e.target.checked
                      }
                    });
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-emerald-800">
                  {localSettings.licenseConfig?.enabled !== false ? "✓ مفعل وظاهر للزوار" : "✕ معطل ومخفي"}
                </span>
              </label>
            </div>

            {/* License Feedback Alert */}
            {licenseFeedback && (
              <div className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                licenseFeedback.type === "success" 
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                  : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                <div className="flex items-center gap-2">
                  {licenseFeedback.type === "success" ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                  <span>{licenseFeedback.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLicenseFeedback(null)}
                  className="text-neutral-400 hover:text-neutral-700 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* License Number & Supervisory Body Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>رقم الترخيص الوزاري الرسمي للجمعية:</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={localSettings.licenseNumber || "5081"}
                    onChange={(e) => {
                      setLocalSettings({
                        ...localSettings,
                        licenseNumber: e.target.value
                      });
                    }}
                    placeholder="5081"
                    className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-emerald-300 bg-white text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  <span className="absolute left-3 top-2.5 text-[10px] text-emerald-600 font-bold">
                    المركز الوطني
                  </span>
                </div>
                <p className="text-[10px] text-emerald-700/80 mt-1">
                  رقم ترخيص الجمعية المعتمد والصادر من المركز الوطني لتنمية القطاع غير الربحي بمكة المكرمة.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-950 mb-1">
                  الجهة الإشرافية والتنظيمية:
                </label>
                <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-xs font-semibold text-emerald-900 flex items-center justify-between">
                  <span>المركز الوطني لتنمية القطاع غير الربحي</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    نظام المنظمات غير الربحية
                  </span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  يظهر هذا الإشراف رسمياً بجانب رقم الترخيص في الهيدر والفوتر والصفحة الرئيسية.
                </p>
              </div>
            </div>

            {/* License Image Controls: Upload, Preview, Replace, Delete */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-neutral-800">
                صورة وثيقة الترخيص الرسمية (مخزنة في السيرفر وتظهر كصورة مربعة صغيرة قابلة للنقر):
              </label>

              {(localSettings.licenseImage || localSettings.licenseConfig?.imageUrl) ? (
                /* When Image is Present: Show Thumbnails, Replace, Delete, Preview */
                <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Small Square Image Display */}
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="relative group w-20 h-20 rounded-2xl overflow-hidden bg-white border-2 border-emerald-500 shadow-md flex items-center justify-center shrink-0 aspect-square">
                        <img
                          src={localSettings.licenseImage || localSettings.licenseConfig?.imageUrl}
                          alt="صورة وثيقة الترخيص"
                          className="w-full h-full object-cover rounded-xl aspect-square"
                        />
                        <button
                          type="button"
                          onClick={() => setIsLicensePreviewModalOpen(true)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                          title="اضغط للتكبير"
                        >
                          <Maximize2 className="w-5 h-5 drop-shadow" />
                        </button>
                      </div>

                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-800">
                            وثيقة الترخيص الرسمية المرفوعة
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            مخزنة في الموقع ✓
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500">
                          تظهر حالياً في الصفحة الرئيسية كصورة مربعة صغيرة بجانب اسم ورقم ترخيص الجمعية.
                        </p>
                        <p className="text-[10px] text-neutral-400 font-mono">
                          {localSettings.licenseConfig.imageUrl.startsWith("data:") 
                            ? "تخزين مباشر مشفر Base64" 
                            : localSettings.licenseConfig.imageUrl}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons: Replace, Preview, Delete */}
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                      <button
                        type="button"
                        onClick={() => setIsLicensePreviewModalOpen(true)}
                        className="px-3 py-2 text-xs font-bold text-neutral-700 bg-white hover:bg-neutral-100 border border-neutral-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-neutral-600" />
                        <span>معاينة وتكبير</span>
                      </button>

                      <button
                        type="button"
                        disabled={isUploadingLicense}
                        onClick={() => licenseFileInputRef.current?.click()}
                        className="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isUploadingLicense ? 'animate-spin' : ''}`} />
                        <span>استبدال الصورة</span>
                      </button>

                      {!showLicenseDeleteConfirm ? (
                        <button
                          type="button"
                          disabled={isUploadingLicense}
                          onClick={() => setShowLicenseDeleteConfirm(true)}
                          className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف الصورة</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-rose-100 p-1 rounded-xl border border-rose-300">
                          <button
                            type="button"
                            disabled={isUploadingLicense}
                            onClick={handleDeleteLicense}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowLicenseDeleteConfirm(false)}
                            className="px-2 py-1 text-[11px] font-bold text-neutral-600 hover:bg-white rounded-lg cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* When Image is NOT Present: Upload Dropzone Box */
                <div 
                  onClick={() => licenseFileInputRef.current?.click()}
                  className="p-6 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all cursor-pointer text-center space-y-3 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs group-hover:scale-105 transition-transform">
                    {isUploadingLicense ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                    ) : (
                      <Upload className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-neutral-800">
                      {isUploadingLicense ? "جاري رفع ومعالجة صورة الترخيص..." : "اضغط هنا لاختيار صورة وثيقة الترخيص من جهازك"}
                    </h4>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      يدعم ملفات الصور: PNG, JPG, JPEG, WEBP, SVG (يتم حفظها في تخزين الموقع وعرضها للزوار)
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isUploadingLicense}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع صورة وثيقة الترخيص الرسمية</span>
                  </button>
                </div>
              )}
            </div>

            {/* Live Interactive Preview Box: Header & Hero appearance */}
            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-wider block">
                معاينة حية للمظهر كما يظهر للزوار في الموقع:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Header Navbar Preview */}
                <div className="bg-white p-3 rounded-xl border border-neutral-200 space-y-1.5">
                  <span className="text-[10px] text-neutral-400 font-bold block">1. المظهر في شريط الهيدر العلوي:</span>
                  <div className="flex items-center gap-2 p-1.5 rounded-xl border border-emerald-500/35 bg-emerald-50/80 w-fit">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-emerald-400/50 flex items-center justify-center shrink-0 aspect-square shadow-2xs">
                      {(localSettings.licenseImage || localSettings.licenseConfig?.imageUrl) ? (
                        <img
                          src={localSettings.licenseImage || localSettings.licenseConfig?.imageUrl}
                          alt="معاينة"
                          className="w-full h-full object-cover rounded aspect-square"
                        />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex flex-col text-right leading-tight pr-1">
                      <span className="text-xs font-black text-emerald-800">
                        ترخيص: {localSettings.licenseNumber || "5081"}
                      </span>
                      <span className="text-[8px] text-neutral-500">
                        المركز الوطني لتنمية القطاع غير الربحي
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hero Banner Preview */}
                <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 space-y-1.5 text-white">
                  <span className="text-[10px] text-neutral-400 font-bold block">2. المظهر في واجهة البانر الرئيسية (Hero):</span>
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/10 border border-emerald-400/40 w-fit">
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/20 border border-emerald-400/50 flex items-center justify-center shrink-0 aspect-square">
                      {(localSettings.licenseImage || localSettings.licenseConfig?.imageUrl) ? (
                        <img
                          src={localSettings.licenseImage || localSettings.licenseConfig?.imageUrl}
                          alt="معاينة"
                          className="w-full h-full object-cover rounded aspect-square"
                        />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-emerald-300">
                        الترخيص الرسمي: {localSettings.licenseNumber || "5081"}
                      </span>
                      <span className="text-[9px] text-neutral-300">
                        بإشراف المركز الوطني لتنمية القطاع غير الربحي
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Full Preview Modal (when clicking preview) */}
            {isLicensePreviewModalOpen && (
              <div className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-2xl w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-sm font-bold text-neutral-900">
                        معاينة وثيقة الترخيص الرسمية (ترخيص {localSettings.licenseNumber || "5081"})
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLicensePreviewModalOpen(false)}
                      className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="bg-neutral-100 p-2 rounded-2xl flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-hidden">
                    {(localSettings.licenseImage || localSettings.licenseConfig?.imageUrl) ? (
                      <img
                        src={localSettings.licenseImage || localSettings.licenseConfig?.imageUrl}
                        alt="وثيقة الترخيص"
                        className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-md"
                      />
                    ) : (
                      <p className="text-neutral-400 text-xs">لا توجد صورة وثيقة ترخيص مرفوعة حالياً</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-neutral-500 font-bold">
                      رقم الترخيص: {localSettings.licenseNumber || "5081"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLicensePreviewModalOpen(false)}
                      className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold"
                    >
                      إغلاق المعاينة
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Hero background and CTA */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-150 space-y-4">
            <h3 className="text-xs font-black text-neutral-800 flex items-center gap-1.5 pb-2 border-b border-neutral-50">
              <Video className="w-4 h-4 text-emerald-600" />
              <span>{lang === "ar" ? "خلفية الهيدر والفيديو التعريفي" : "Hero Video Background"}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">رابط الفيديو المباشر (MP4 direct URL):</label>
                <input
                  type="text"
                  value={localSettings.videoUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, videoUrl: e.target.value })}
                  placeholder="https://example.com/video.mp4"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">رابط صورة الغلاف الاحتياطية (Cover Poster URL):</label>
                <input
                  type="text"
                  value={localSettings.videoCoverUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, videoCoverUrl: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-50 pt-3">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">العنوان الرئيسي للهيدر (عربي):</label>
                <input
                  type="text"
                  value={localSettings.heroTitleAr}
                  onChange={(e) => setLocalSettings({ ...localSettings, heroTitleAr: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">العنوان الفرعي التعريفي (عربي):</label>
                <textarea
                  value={localSettings.heroDescAr}
                  onChange={(e) => setLocalSettings({ ...localSettings, heroDescAr: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 resize-none leading-relaxed"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 3: Vision and Goals Profile */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-150 space-y-4">
            <h3 className="text-xs font-black text-neutral-800 flex items-center gap-1.5 pb-2 border-b border-neutral-50">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>{lang === "ar" ? "رؤية الجمعية ورسالتها وأهدافها" : "Vision, Mission and Objectives Profile"}</span>
            </h3>

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1">تعريف الجمعية ومن نحن بالتفصيل:</label>
              <textarea
                value={localSettings.aboutUsAr}
                onChange={(e) => setLocalSettings({ ...localSettings, aboutUsAr: e.target.value })}
                rows={3}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 resize-none leading-relaxed"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">رؤية الجمعية المستقلة:</label>
                <textarea
                  value={localSettings.visionAr}
                  onChange={(e) => setLocalSettings({ ...localSettings, visionAr: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">رسالة الجمعية التنفيذية:</label>
                <textarea
                  value={localSettings.missionAr}
                  onChange={(e) => setLocalSettings({ ...localSettings, missionAr: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Communication channels */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-150 space-y-4">
            <h3 className="text-xs font-black text-neutral-800 flex items-center gap-1.5 pb-2 border-b border-neutral-50">
              <Phone className="w-4 h-4 text-emerald-600" />
              <span>{lang === "ar" ? "معلومات الاتصال والدعم الاجتماعي" : "Contact & Support Integration"}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">رقم الهاتف الفعال:</label>
                <input
                  type="text"
                  value={localSettings.contactPhone}
                  onChange={(e) => setLocalSettings({ ...localSettings, contactPhone: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">البريد الإلكتروني المعتمد:</label>
                <input
                  type="email"
                  value={localSettings.contactEmail}
                  onChange={(e) => setLocalSettings({ ...localSettings, contactEmail: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">العنوان ومقر الجمعية (عربي):</label>
                <input
                  type="text"
                  value={localSettings.contactLocationAr}
                  onChange={(e) => setLocalSettings({ ...localSettings, contactLocationAr: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">رابط متجر التبرع / المنصة المعتمد:</label>
                <input
                  type="text"
                  value={localSettings.donationLink}
                  onChange={(e) => setLocalSettings({ ...localSettings, donationLink: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50 font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Section Visibility toggles */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-150 space-y-4">
            <h3 className="text-xs font-black text-neutral-800 flex items-center gap-1.5 pb-2 border-b border-neutral-50">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>{lang === "ar" ? "إظهار وإخفاء أقسام الصفحة الرئيسية" : "Sections Visibility Settings"}</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {Object.keys(localSettings.sectionVisibility).map((sec) => {
                const isVisible = localSettings.sectionVisibility[sec as keyof typeof settings.sectionVisibility];
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleSection(sec as keyof typeof settings.sectionVisibility)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${isVisible ? "bg-emerald-50 border-emerald-500 text-emerald-800" : "bg-neutral-50 border-neutral-200 text-neutral-400"}`}
                  >
                    {isVisible ? <Eye className="w-5 h-5 text-emerald-600" /> : <EyeOff className="w-5 h-5 text-neutral-400" />}
                    <span className="text-[10px] font-bold">
                      {sec === 'orgChart' ? (lang === 'ar' ? 'الهيكل الإداري' : 'Org Chart') :
                       sec === 'about' ? (lang === 'ar' ? 'من نحن' : 'About') :
                       sec === 'stats' ? (lang === 'ar' ? 'الإحصائيات' : 'Stats') :
                       sec === 'initiatives' ? (lang === 'ar' ? 'المبادرات' : 'Initiatives') :
                       sec === 'news' ? (lang === 'ar' ? 'الأخبار' : 'News') :
                       sec === 'achievements' ? (lang === 'ar' ? 'الإنجازات' : 'Achievements') :
                       sec === 'partners' ? (lang === 'ar' ? 'الشركاء' : 'Partners') :
                       sec === 'gallery' ? (lang === 'ar' ? 'المعرض' : 'Gallery') :
                       sec === 'contact' ? (lang === 'ar' ? 'تواصل معنا' : 'Contact') : sec}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Submit bar */}
          <div className="flex justify-end pt-4 border-t border-neutral-100">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{lang === "ar" ? "حفظ كافة التغييرات والسمات" : "Save All Configuration"}</span>
            </button>
          </div>

        </form>
      )}

      {/* SUBTAB 2: NEWS MANAGEMENT */}
      {adminSubTab === "news" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black text-neutral-800">{lang === "ar" ? "إدارة المقالات الإخبارية المعتمدة" : "Press & News Release"}</h3>
              <p className="text-[10px] text-neutral-400 mt-0.5">يمكنك إضافة أخبار وتغطيات المبادرات بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة.</p>
            </div>
            <button
              onClick={() => setShowNewsModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة تغطية إخبارية</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {news.map(item => (
              <div key={item.id} className="border border-neutral-100 bg-white p-4 rounded-2xl flex gap-3 hover:border-emerald-500 transition-all">
                <img src={item.image} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-neutral-100" />
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] text-neutral-400 block font-mono">{item.date}</span>
                    <h4 className="text-xs font-black text-neutral-800 line-clamp-1 mt-0.5">{item.titleAr}</h4>
                    <p className="text-[10px] text-neutral-500 line-clamp-2 leading-relaxed mt-1">{item.bodyAr}</p>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        if (confirm(lang === "ar" ? "هل تريد بالتأكيد حذف هذا الخبر؟" : "Confirm delete news item?")) {
                          onDeleteNews(item.id);
                        }
                      }}
                      className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === "ar" ? "حذف" : "Delete"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showNewsModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
              <form onSubmit={handleCreateNews} className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 border shadow-xl">
                <h3 className="text-xs font-black text-neutral-800">{lang === "ar" ? "إضافة خبر صحفي جديد" : "Create News Item"}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">عنوان الخبر بالعربية:</label>
                    <input type="text" value={newsTitleAr} onChange={(e) => setNewsTitleAr(e.target.value)} required className="w-full border border-neutral-200 rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">عنوان الخبر بالإنجليزية (اختياري):</label>
                    <input type="text" value={newsTitleEn} onChange={(e) => setNewsTitleEn(e.target.value)} className="w-full border border-neutral-200 rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">تفاصيل ومضمون التقرير الصحفي (عربي):</label>
                    <textarea value={newsBodyAr} onChange={(e) => setNewsBodyAr(e.target.value)} required rows={4} className="w-full border border-neutral-200 rounded-lg p-2 text-xs resize-none" />
                  </div>
                  <ImageUploadField
                    label="صورة التغطية الصحفية (رفع ملف مباشر)"
                    description="ارفع صورة عالية الدقة للخبر من جهازك مباشرة"
                    value={newsImage}
                    onChange={(val) => setNewsImage(val)}
                    previewAspect="banner"
                  />
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer">{lang === "ar" ? "نشر الخبر الآن" : "Publish"}</button>
                  <button type="button" onClick={() => setShowNewsModal(false)} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer">{lang === "ar" ? "إلغاء" : "Cancel"}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: MEDIA GALLERY */}
      {adminSubTab === "gallery" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black text-neutral-800">{lang === "ar" ? "ألبوم ميديا الأنشطة والفعاليات" : "Media album"}</h3>
              <p className="text-[10px] text-neutral-400 mt-0.5">إدارة وتحديث الصور ومقاطع التوثيق الميدانية للرعاة.</p>
            </div>
            <button
              onClick={() => setShowGalleryModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة ملف ميديا</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gallery.map(item => (
              <div key={item.id} className="border border-neutral-150 rounded-xl overflow-hidden relative group h-40 bg-neutral-50">
                <img src={item.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-3 text-white flex flex-col justify-between">
                  <span className="text-[9px] bg-emerald-600 self-start px-2 py-0.5 rounded-full capitalize">{item.type}</span>
                  <div>
                    <h4 className="text-[10px] font-bold line-clamp-1">{item.titleAr}</h4>
                    <button
                      onClick={() => {
                        if (confirm(lang === "ar" ? "هل تريد بالتأكيد حذف ملف الميديا؟" : "Delete media item?")) {
                          onDeleteGallery(item.id);
                        }
                      }}
                      className="mt-2 w-full py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{lang === "ar" ? "حذف" : "Delete"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {showGalleryModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
              <form onSubmit={handleCreateGallery} className="bg-white rounded-2xl max-w-md w-full p-6 text-right space-y-4 border shadow-xl">
                <h3 className="text-xs font-black text-neutral-800">{lang === "ar" ? "إضافة ملف ميديا جديد" : "Add Media Link"}</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">اسم ووصف الملف (عربي):</label>
                    <input type="text" value={galleryTitleAr} onChange={(e) => setGalleryTitleAr(e.target.value)} required className="w-full border border-neutral-200 rounded-lg p-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-500 mb-1">نوع ملف الميديا:</label>
                    <select value={galleryType} onChange={(e) => setGalleryType(e.target.value as any)} className="w-full border border-neutral-200 rounded-lg p-2 text-xs">
                      <option value="photo">صورة فوتوغرافية (Photo)</option>
                      <option value="video">توثيق مرئي فيديو (Video Link)</option>
                    </select>
                  </div>
                  {galleryType === "photo" ? (
                    <ImageUploadField
                      label="ملف صورة الميديا (رفع ملف مباشر)"
                      description="ارفع صورة التوثيق الميداني مباشرة من جهازك"
                      value={galleryUrl}
                      onChange={(val) => setGalleryUrl(val)}
                      previewAspect="video"
                    />
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 mb-1">رابط الفيديو المباشر (Video URL):</label>
                      <input type="text" value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)} required placeholder="https://youtube.com/... أو رابط فيديو" className="w-full border border-neutral-200 rounded-lg p-2 text-xs font-mono" />
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer">{lang === "ar" ? "إضافة للألبوم" : "Add"}</button>
                  <button type="button" onClick={() => setShowGalleryModal(false)} className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer">{lang === "ar" ? "إلغاء" : "Cancel"}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: PARTNERS OF SUCCESS MANAGEMENT */}
      {adminSubTab === "partners" && (
        <div className="space-y-6">
          {/* Header & Stats Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-neutral-150">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black text-neutral-800">
                  {lang === "ar" ? "إدارة شركاء النجاح والرعاة الرسميين" : "NGO Partners & Sponsors Management"}
                </h3>
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200">
                  {partners.filter(p => p.active !== false).length} نشط / {partners.length} إجمالي
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                التحكم الكامل في شريط العرض المتحرك، سرعة التمرير، أحجام الشعارات، ترتيب الظهور، والتفعيل/التعطيل بدون حذف.
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleOpenAddPartner}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة شريك نجاح</span>
              </button>
            </div>
          </div>

          {/* SECTION 1: MARQUEE DYNAMICS & SIZING CONTROLS */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-150 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-neutral-800">
                    {lang === "ar" ? "إعدادات شريط العرض المتحرك (Marquee Settings)" : "Infinite Scroll Animation Settings"}
                  </h4>
                  <p className="text-[10px] text-neutral-400">
                    تخصيص سرعة الحركة التلقائية، حجم الشعارات، ومسافات التباعد بين البطاقات
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSavePartnerSectionSettings}
                disabled={isSavingPartnerSettings}
                className="bg-neutral-900 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isSavingPartnerSettings ? "جارٍ الحفظ..." : "حفظ إعدادات الشريط"}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Marquee Speed */}
              <div className="space-y-2 bg-neutral-50/70 p-3 rounded-xl border border-neutral-150">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-neutral-700">
                    سرعة حركة الشريط (بالثواني لكل دورة):
                  </label>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    {localSettings.partnersSectionSettings?.speed || 28} ثانية
                  </span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="60"
                  step="2"
                  value={localSettings.partnersSectionSettings?.speed || 28}
                  onChange={(e) => {
                    const speed = Number(e.target.value);
                    setLocalSettings({
                      ...localSettings,
                      partnersSectionSettings: {
                        ...(localSettings.partnersSectionSettings || { logoSize: 'medium', gap: 'medium' }),
                        speed
                      }
                    });
                  }}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-neutral-400">
                  <span>سريع (15s)</span>
                  <span>متوازن (28s)</span>
                  <span>هادئ (45s)</span>
                  <span>بطيء (60s)</span>
                </div>
              </div>

              {/* Logo Size */}
              <div className="space-y-2 bg-neutral-50/70 p-3 rounded-xl border border-neutral-150">
                <label className="block text-[10px] font-bold text-neutral-700">
                  حجم شعارات الشركاء:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'small', label: 'صغير (36px)' },
                    { id: 'medium', label: 'قياسي (48px)' },
                    { id: 'large', label: 'كبير (64px)' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLocalSettings({
                          ...localSettings,
                          partnersSectionSettings: {
                            ...(localSettings.partnersSectionSettings || { speed: 28, gap: 'medium' }),
                            logoSize: item.id as any
                          }
                        });
                      }}
                      className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        (localSettings.partnersSectionSettings?.logoSize || 'medium') === item.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Gap Spacing */}
              <div className="space-y-2 bg-neutral-50/70 p-3 rounded-xl border border-neutral-150">
                <label className="block text-[10px] font-bold text-neutral-700">
                  المسافة والتباعد بين البطاقات:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'small', label: 'ضيق (20px)' },
                    { id: 'medium', label: 'متوازن (36px)' },
                    { id: 'large', label: 'واسع (52px)' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLocalSettings({
                          ...localSettings,
                          partnersSectionSettings: {
                            ...(localSettings.partnersSectionSettings || { speed: 28, logoSize: 'medium' }),
                            gap: item.id as any
                          }
                        });
                      }}
                      className={`py-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                        (localSettings.partnersSectionSettings?.gap || 'medium') === item.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section Titles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                  العنوان الرئيسي للقسم (عربي):
                </label>
                <input
                  type="text"
                  value={localSettings.partnersSectionSettings?.titleAr || ""}
                  onChange={(e) => {
                    setLocalSettings({
                      ...localSettings,
                      partnersSectionSettings: {
                        ...(localSettings.partnersSectionSettings || { speed: 28, logoSize: 'medium', gap: 'medium' }),
                        titleAr: e.target.value
                      }
                    });
                  }}
                  placeholder="شركاء النجاح والعطاء"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1">
                  العنوان الفرعي التوضيحي (عربي):
                </label>
                <input
                  type="text"
                  value={localSettings.partnersSectionSettings?.subtitleAr || ""}
                  onChange={(e) => {
                    setLocalSettings({
                      ...localSettings,
                      partnersSectionSettings: {
                        ...(localSettings.partnersSectionSettings || { speed: 28, logoSize: 'medium', gap: 'medium' }),
                        subtitleAr: e.target.value
                      }
                    });
                  }}
                  placeholder="نفخر بالتعاون مع كبرى المنصات والجهات الوطنية لتعظيم الأثر المجتمعي"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-neutral-250 bg-neutral-50/50"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PARTNERS DIRECTORY WITH REORDERING & ACTIVE TOGGLES */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <h4 className="text-xs font-black text-neutral-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>قائمة الشركاء ({partners.length}) - يمكنك إعادة الترتيب والتعطيل/التفعيل الفوري</span>
              </h4>
              <span className="text-[10px] text-neutral-400">
                استخدم أزرار ↑ و ↓ لتغيير ترتيب الظهور في الشريط المتحرك
              </span>
            </div>

            {partners.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-neutral-250 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Globe className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-neutral-700">لا يوجد شركاء مضافون حاليًا</h4>
                <p className="text-[11px] text-neutral-400">
                  أضف شعارات شركاء النجاح والرعاة ليتم عرضهم مباشرة في شريط العرض المتحرك بالصفحة الرئيسية
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddPartner}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة أول شريك</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {partners.map((item, idx) => {
                  const isActive = item.active !== false;
                  return (
                    <div
                      key={item.id || idx}
                      className={`border rounded-2xl p-4 transition-all relative flex flex-col justify-between gap-3 ${
                        isActive
                          ? 'bg-white border-neutral-200 hover:border-emerald-300 shadow-2xs'
                          : 'bg-neutral-50/80 border-neutral-200 opacity-60'
                      }`}
                    >
                      {/* Top Row: Index Badge, Category, and Active Toggle */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-mono">
                            #{idx + 1}
                          </span>
                          <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md">
                            {item.category || "منصة وطنية"}
                          </span>
                        </div>

                        {/* Instant Active Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleTogglePartnerActive(item.id)}
                          title={isActive ? "تعطيل الظهور" : "تفعيل الظهور"}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span>ظاهر</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-neutral-500" />
                              <span>مخفي</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Middle Row: Logo & Names */}
                      <div className="flex items-center gap-3 py-1">
                        <div className="w-16 h-12 bg-white rounded-xl border border-neutral-150 p-1.5 flex items-center justify-center shrink-0">
                          <img
                            src={item.logo}
                            alt={item.nameAr}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-neutral-900 truncate">
                            {item.nameAr}
                          </h4>
                          {item.nameEn && (
                            <p className="text-[10px] text-neutral-400 truncate font-sans">
                              {item.nameEn}
                            </p>
                          )}
                          {item.link ? (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-emerald-600 hover:underline inline-flex items-center gap-0.5 truncate mt-0.5"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span className="truncate">{item.link.replace(/^https?:\/\//, '')}</span>
                            </a>
                          ) : (
                            <span className="text-[9px] text-neutral-400">بدون رابط خارجي</span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Row: Actions (Move Up, Move Down, Edit, Delete) */}
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMovePartner(idx, 'up')}
                            disabled={idx === 0}
                            title="تقديم الشريك للأمام (أعلى)"
                            className="p-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMovePartner(idx, 'down')}
                            disabled={idx === partners.length - 1}
                            title="تأخير الشريك للخلف (أسفل)"
                            className="p-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Edit & Delete Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPartner(item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>تعديل</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(lang === "ar" ? `هل تريد بالتأكيد حذف الشريك (${item.nameAr})؟` : `Delete partner (${item.nameAr})?`)) {
                                onDeletePartner(item.id);
                              }
                            }}
                            className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center justify-center cursor-pointer transition-all"
                            title="حذف الشريك"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ADD / EDIT PARTNER MODAL */}
          {showPartnerModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
              <form onSubmit={handleSavePartner} className="bg-white rounded-2xl max-w-lg w-full p-6 text-right space-y-4 border shadow-xl">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="text-xs font-black text-neutral-800 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <span>{editingPartner ? "تعديل بيانات شريك النجاح" : "إضافة شريك أو راعٍ رسمي جديد"}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPartnerModal(false)}
                    className="text-neutral-400 hover:text-neutral-600 p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                        اسم الجهة أو الشركة (عربي) * :
                      </label>
                      <input
                        type="text"
                        value={partnerNameAr}
                        onChange={(e) => setPartnerNameAr(e.target.value)}
                        required
                        placeholder="مثال: منصة إحسان الوطنية"
                        className="w-full border border-neutral-250 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                        اسم الجهة بالإنجليزية (English):
                      </label>
                      <input
                        type="text"
                        value={partnerNameEn}
                        onChange={(e) => setPartnerNameEn(e.target.value)}
                        placeholder="e.g. Ehsan National Platform"
                        className="w-full border border-neutral-250 rounded-lg px-3 py-2 text-xs font-sans"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  {/* Category Selector */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                      تصنيف الشريك:
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {[
                        "منصة وطنية",
                        "مؤسسة مانحة",
                        "جهة حكومية",
                        "شريك قطاع ثالث",
                        "قطاع خاص",
                        "شريك استراتيجي"
                      ].map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setPartnerCategory(cat)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            partnerCategory === cat
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={partnerCategory}
                      onChange={(e) => setPartnerCategory(e.target.value)}
                      placeholder="أو اكتب تصنيفًا مخصصًا"
                      className="w-full border border-neutral-250 rounded-lg px-3 py-1.5 text-xs"
                    />
                  </div>

                  {/* Logo Upload */}
                  <ImageUploadField
                    label="شعار أو لوجو الجهة (رفع ملف مباشر أو رابط) * :"
                    description="ارفع لوجو الشريك بصيغة PNG أو SVG أو JPG بخلفية شفافة أو بيضاء"
                    value={partnerLogo}
                    onChange={(val) => setPartnerLogo(val)}
                    previewAspect="square"
                  />

                  {/* Website Link */}
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-600 mb-1">
                      رابط موقع الجهة الإلكتروني (اختياري):
                    </label>
                    <input
                      type="url"
                      value={partnerLink}
                      onChange={(e) => setPartnerLink(e.target.value)}
                      placeholder="https://ehsan.sa"
                      className="w-full border border-neutral-250 rounded-lg px-3 py-2 text-xs font-mono"
                      dir="ltr"
                    />
                  </div>

                  {/* Active Toggle in Modal */}
                  <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                    <div>
                      <span className="text-xs font-bold text-neutral-800 block">حالة العرض في الواجهة:</span>
                      <span className="text-[10px] text-neutral-400">تحديد ما إذا كان الشريك سيظهر في الشريط المتحرك</span>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={partnerActive}
                        onChange={(e) => setPartnerActive(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-emerald-800">
                        {partnerActive ? "مفعل وظاهر" : "معطل ومخفي"}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-all"
                  >
                    {editingPartner ? "حفظ التعديلات" : "إضافة الشريك الآن"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPartnerModal(false)}
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2 rounded-lg cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: BENEFICIARIES PORTAL MANAGEMENT */}
      {adminSubTab === "beneficiaries" && (
        <BeneficiariesManager
          beneficiaries={beneficiaries}
          onUpdateBeneficiaryStatus={onUpdateBeneficiaryStatus}
          homeSettings={settings}
          lang={lang}
          currentUserRole={currentUserRole}
          currentUserName={currentUserName}
          onAddNewBeneficiary={onAddNewBeneficiary}
        />
      )}

      {/* SUBTAB 6: BENEFIT Aid Requests */}
      {adminSubTab === "requests" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-black text-neutral-800">{lang === "ar" ? "سجل معاملات طلبات الإغاثة والدعم العيني والمالي" : "Social aid requests logs"}</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">دراسة مبررات وصرف المساعدات المالية، السلال الغذائية، الدعم الطبي لبرامج الجمعية.</p>
          </div>

          <div className="overflow-x-auto border border-neutral-100 rounded-xl bg-white">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-neutral-50 text-neutral-500 border-b font-bold">
                  <th className="p-3">رقم المعاملة</th>
                  <th className="p-3">المستفيد</th>
                  <th className="p-3">نوع الاحتياج</th>
                  <th className="p-3">تفاصيل ومبررات الطلب</th>
                  <th className="p-3 text-center">تاريخ الطلب</th>
                  <th className="p-3 text-center">الحالة الإدارية</th>
                  <th className="p-3 text-left">القرار والتحديث</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {benefitRequests.map(req => (
                  <tr key={req.id} className="hover:bg-neutral-50/50">
                    <td className="p-3 font-mono font-bold text-neutral-400">#{req.id}</td>
                    <td className="p-3">
                      <strong className="text-neutral-800 block">{req.beneficiaryName}</strong>
                      <span className="text-[9px] text-neutral-400 block font-mono">معرف المستفيد: {req.beneficiaryId}</span>
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700">
                        {req.type === "food" ? "سلة غذائية" : req.type === "financial" ? "مساعدة مالية" : req.type === "medical" ? "دعم طبي" : req.type === "housing" ? "مسكن" : "أخرى"}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs">
                      <p className="text-[11px] text-neutral-600 leading-normal">{req.details}</p>
                      {req.notes && (
                        <div className="mt-1.5 p-2 bg-amber-50 text-amber-800 rounded text-[10px] leading-relaxed">
                          <strong>ملاحظة الباحث:</strong> {req.notes}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono text-neutral-500">{req.date}</td>
                    <td className="p-3 text-center">
                      {req.status === "pending" ? (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full">قيد الدراسة</span>
                      ) : req.status === "approved" ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full">مقبول وبانتظار الصرف</span>
                      ) : req.status === "in_progress" ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">جاري التجهيز للتوصيل</span>
                      ) : req.status === "completed" ? (
                        <span className="px-2 py-0.5 bg-neutral-150 text-neutral-700 text-[10px] font-bold rounded-full">تم التسليم والإغلاق ✓</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full">نعتذر (مرفوض)</span>
                      )}
                    </td>
                    <td className="p-3 text-left">
                      {editingRequestId === req.id ? (
                        <div className="space-y-2 max-w-[180px]">
                          <textarea
                            value={editingRequestNotes}
                            onChange={(e) => setEditingRequestNotes(e.target.value)}
                            placeholder="اكتب ملاحظة الصرف أو مبررات الرفض هنا..."
                            className="w-full border border-neutral-300 p-1.5 text-[10px] rounded resize-none"
                            rows={3}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleUpdateNotesAndStatus(req.id, "approved")}
                              className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-bold rounded"
                            >
                              موافقة
                            </button>
                            <button
                              onClick={() => handleUpdateNotesAndStatus(req.id, "in_progress")}
                              className="px-2 py-1 bg-blue-600 text-white text-[9px] font-bold rounded"
                            >
                              جاري التجهيز
                            </button>
                            <button
                              onClick={() => handleUpdateNotesAndStatus(req.id, "completed")}
                              className="px-2 py-1 bg-neutral-700 text-white text-[9px] font-bold rounded"
                            >
                              تسليم ✓
                            </button>
                            <button
                              onClick={() => handleUpdateNotesAndStatus(req.id, "rejected")}
                              className="px-2 py-1 bg-rose-600 text-white text-[9px] font-bold rounded"
                            >
                              رفض
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingRequestId(req.id);
                            setEditingRequestNotes(req.notes || "");
                          }}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold rounded-lg border cursor-pointer"
                        >
                          اتخاذ قرار / ملاحظات
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 7: ORG CHART (الهيكل الإداري) */}
      {adminSubTab === "org_chart" && (
        <OrgChartAdminPanel
          members={orgMembers}
          onAddMember={onAddOrgMember || (async () => false)}
          onDeleteMember={onDeleteOrgMember || (async () => false)}
          onToggleMemberActive={onToggleOrgMemberActive || (async () => false)}
          onBatchUpdateMembers={onBatchUpdateOrgMembers || (async () => false)}
          onImportDirectors={onImportDirectors}
          lang={lang}
        />
      )}

      {/* SUBTAB 8: HERO SLIDES (معرض صور الصفحة الرئيسية) */}
      {adminSubTab === "hero_slides" && (
        <HeroSlidesAdminPanel
          slides={heroSlides}
          onAddSlide={onAddHeroSlide || (async () => false)}
          onDeleteSlide={onDeleteHeroSlide || (async () => false)}
          onToggleSlideActive={onToggleSlideActive || (async () => false)}
          onBatchUpdateSlides={onBatchUpdateHeroSlides || (async () => false)}
          lang={lang}
        />
      )}

    </div>
  );
}
