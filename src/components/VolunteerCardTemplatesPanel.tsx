import React, { useState, useEffect, useRef } from "react";
import { 
  CreditCard, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  Save, 
  Eye, 
  Printer, 
  Download, 
  RefreshCw, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  Sliders, 
  Type, 
  Move, 
  Users, 
  UserCheck, 
  Layers, 
  QrCode, 
  ShieldCheck, 
  Upload, 
  Settings, 
  CheckSquare, 
  Square, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  HelpCircle,
  FolderPlus,
  Palette,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Camera
} from "lucide-react";
import { 
  Volunteer, 
  VolunteerCardTemplate, 
  CardElementConfig, 
  CardElementType, 
  Department, 
  VolunteerTeam,
  IssuedVolunteerCard
} from "../types";
import { CardRenderer } from "./CardRenderer";
import { CardVerificationModal } from "./CardVerificationModal";
import { ImageUploadField } from "./ImageUploadField";
import { CardTemplateEditor } from "./CardTemplateEditor";

interface VolunteerCardTemplatesPanelProps {
  volunteers: Volunteer[];
  teams: VolunteerTeam[];
  departments: Department[];
  femaleUnifiedPhotoUrl?: string;
  onUpdateFemaleUnifiedPhoto?: (newUrl: string) => Promise<void> | void;
  onUpdateVolunteer?: (volunteer: Volunteer) => void;
  onAddLog?: (action: string) => void;
}

// Available Arabic Fonts
const FONT_OPTIONS = [
  { id: "Lyon Arabic", name: "خط ليون عربي (Lyon Arabic) - فخم معتمد" },
  { id: "Cairo", name: "خط كايرو (Cairo) - الرسمي" },
  { id: "Tajawal", name: "خط تجوال (Tajawal) - هندسي أنيق" },
  { id: "IBM Plex Sans Arabic", name: "خط آي بي إم (IBM Plex) - حديث" },
  { id: "Almarai", name: "خط المراعي (Almarai) - ناعم وعصري" },
  { id: "El Messiri", name: "خط المسيري (El Messiri) - زخرفي فاخر" },
  { id: "Arial", name: "خط أريال (Arial) - قياسي" }
];

// All available element metadata
const AVAILABLE_ELEMENTS: { type: CardElementType; label: string; defaultText: string; category: string }[] = [
  { type: "name", label: "اسم المتطوع", defaultText: "أحمد بن علي الغامدي", category: "بيانات شخصية" },
  { type: "photo", label: "الصورة الشخصية / الموحدة", defaultText: "", category: "بيانات شخصية" },
  { type: "nationalId", label: "رقم الهوية الوطنية", defaultText: "1098765432", category: "بيانات شخصية" },
  { type: "membershipNumber", label: "رقم الملف / العضوية", defaultText: "V-2026-0001", category: "بيانات العضوية" },
  { type: "nationality", label: "الجنسية", defaultText: "سعودي", category: "بيانات شخصية" },
  { type: "gender", label: "الجنس", defaultText: "ذكر", category: "بيانات شخصية" },
  { type: "birthDate", label: "تاريخ الميلاد", defaultText: "1418/05/12هـ", category: "بيانات شخصية" },
  { type: "bloodType", label: "فصيلة الدم", defaultText: "O+", category: "بيانات شخصية" },
  { type: "jobTitle", label: "المسمى / المنصب التطوعي", defaultText: "متطوع تنظيمي ميداني", category: "بيانات العضوية" },
  { type: "teamName", label: "اسم الفريق التطوعي", defaultText: "فريق التنظيم العام", category: "بيانات العضوية" },
  { type: "departmentName", label: "اسم الإدارة التابعة", defaultText: "إدارة العمليات والمبادرات", category: "بيانات العضوية" },
  { type: "joinDate", label: "تاريخ الانضمام / الإصدار", defaultText: "2026-01-15", category: "بيانات العضوية" },
  { type: "expiryDate", label: "تاريخ انتهاء الصلاحية", defaultText: "2027-01-15", category: "بيانات العضوية" },
  { type: "points", label: "رصيد النقاط التطوعية", defaultText: "25 نقطة", category: "بيانات العضوية" },
  { type: "qrCode", label: "رمز التحقق السريع (QR Code)", defaultText: "", category: "رموز رقمية" },
  { type: "barcode", label: "الباركود الرقمي", defaultText: "", category: "رموز رقمية" },
  { type: "associationLogo", label: "شعار الجمعية واسمها", defaultText: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة", category: "الهوية الرسمية" },
  { type: "teamLogo", label: "شعار الفريق التطوعي", defaultText: "", category: "الهوية الرسمية" },
  { type: "customText", label: "نص مخصص / عبارة شكر", defaultText: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة", category: "نصوص إضافية" }
];

// Pre-packaged Background presets
const BACKGROUND_PRESETS = [
  {
    id: "preset-green-gold",
    name: "الهوية الخضراء والذهبية الرسمية",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=856&h=540&fit=crop"
  },
  {
    id: "preset-purple-luxury",
    name: "الهوية الملكية الزمردية للإناث",
    url: "https://images.unsplash.com/photo-1557683316-973673baf926?w=856&h=540&fit=crop"
  },
  {
    id: "preset-blue-minimal",
    name: "الهوية الحديثة النظيفة",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=856&h=540&fit=crop"
  },
  {
    id: "preset-emerald-geometric",
    name: "الزخرفة الهندسية الإسلامية",
    url: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=856&h=540&fit=crop"
  }
];

// Default Initial Templates
const INITIAL_TEMPLATES: VolunteerCardTemplate[] = [
  {
    id: "tpl-male-default",
    name: "قالب بطاقة المتطوعين الذكور (الافتراضي)",
    description: "قالب متكامل معتمد للمتطوعين الذكور يحتوي على كافة الحقول مع باركود ورمز QR.",
    cardType: "standard",
    targetGender: "male",
    useFemaleUnifiedPhoto: false,
    isActive: true,
    isDefaultMale: true,
    isDefaultFemale: false,
    backgroundUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=856&h=540&fit=crop",
    width: 856,
    height: 540,
    orientation: "landscape",
    createdAt: "2026-01-01T00:00:00Z",
    elements: [
      { id: "e-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
      { id: "e-photo", type: "photo", labelAr: "الصورة الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "rounded", borderWidth: 3, borderColor: "#059669", zIndex: 20 },
      { id: "e-name", type: "name", labelAr: "اسم المتطوع", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "bold", color: "#064e3b", textAlign: "right", zIndex: 15 },
      { id: "e-title", type: "jobTitle", labelAr: "المسمى التطوعي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#d97706", textAlign: "right", zIndex: 15 },
      { id: "e-mem", type: "membershipNumber", labelAr: "رقم الملف / العضوية", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم العضوية:", zIndex: 15 },
      { id: "e-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 45, fontFamily: "Cairo", fontSize: 13, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
      { id: "e-team", type: "teamName", labelAr: "اسم الفريق", visible: true, x: 69, y: 51, fontFamily: "Tajawal", fontSize: 13, fontWeight: "500", color: "#0f766e", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفريق:", zIndex: 15 },
      { id: "e-dept", type: "departmentName", labelAr: "الإدارة التابعة", visible: true, x: 69, y: 57, fontFamily: "Tajawal", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "الإدارة:", zIndex: 15 },
      { id: "e-blood", type: "bloodType", labelAr: "فصيلة الدم", visible: true, x: 69, y: 63, fontFamily: "Cairo", fontSize: 12, fontWeight: "bold", color: "#b91c1c", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفصيلة:", zIndex: 15 },
      { id: "e-dates", type: "expiryDate", labelAr: "تاريخ الانتهاء", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#047857", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
      { id: "e-qr", type: "qrCode", labelAr: "رمز QR", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
      { id: "e-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
      { id: "e-custom", type: "customText", labelAr: "عبارة رسمية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#065f46", textAlign: "center", customTextValue: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - ترخيص: 5081", zIndex: 15 }
    ]
  },
  {
    id: "tpl-female-default",
    name: "قالب بطاقة المتطوعات الإناث (مع الصورة الموحدة)",
    description: "قالب راقٍ مخصص للمتطوعات الإناث يدعم استخدام الصورة الموحدة تلقائياً لحفظ الخصوصية.",
    cardType: "standard",
    targetGender: "female",
    useFemaleUnifiedPhoto: true,
    isActive: true,
    isDefaultMale: false,
    isDefaultFemale: true,
    backgroundUrl: "https://images.unsplash.com/photo-1557683316-973673baf926?w=856&h=540&fit=crop",
    width: 856,
    height: 540,
    orientation: "landscape",
    createdAt: "2026-01-01T00:00:00Z",
    elements: [
      { id: "fe-logo", type: "associationLogo", labelAr: "شعار الجمعية", visible: true, x: 92, y: 7, zIndex: 20 },
      { id: "fe-photo", type: "photo", labelAr: "الصورة الموحدة / الشخصية", visible: true, x: 91, y: 24, width: 130, height: 130, photoShape: "circle", borderWidth: 3, borderColor: "#a855f7", zIndex: 20 },
      { id: "fe-name", type: "name", labelAr: "اسم المتطوعة", visible: true, x: 69, y: 25, fontFamily: "Cairo", fontSize: 21, fontWeight: "bold", color: "#581c87", textAlign: "right", zIndex: 15 },
      { id: "fe-title", type: "jobTitle", labelAr: "المسمى التطوعي", visible: true, x: 69, y: 32, fontFamily: "Tajawal", fontSize: 15, fontWeight: "bold", color: "#c026d3", textAlign: "right", zIndex: 15 },
      { id: "fe-mem", type: "membershipNumber", labelAr: "رقم الملف / العضوية", visible: true, x: 69, y: 39, fontFamily: "Cairo", fontSize: 13, fontWeight: "bold", color: "#1e293b", textAlign: "right", showLabelPrefix: true, labelPrefix: "رقم العضوية:", zIndex: 15 },
      { id: "fe-natid", type: "nationalId", labelAr: "رقم الهوية", visible: true, x: 69, y: 45, fontFamily: "Cairo", fontSize: 13, fontWeight: "500", color: "#334155", textAlign: "right", showLabelPrefix: true, labelPrefix: "الهوية:", zIndex: 15 },
      { id: "fe-team", type: "teamName", labelAr: "اسم الفريق", visible: true, x: 69, y: 51, fontFamily: "Tajawal", fontSize: 13, fontWeight: "500", color: "#7e22ce", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفريق:", zIndex: 15 },
      { id: "fe-dept", type: "departmentName", labelAr: "الإدارة التابعة", visible: true, x: 69, y: 57, fontFamily: "Tajawal", fontSize: 12, fontWeight: "500", color: "#475569", textAlign: "right", showLabelPrefix: true, labelPrefix: "الإدارة:", zIndex: 15 },
      { id: "fe-blood", type: "bloodType", labelAr: "فصيلة الدم", visible: true, x: 69, y: 63, fontFamily: "Cairo", fontSize: 12, fontWeight: "bold", color: "#be123c", textAlign: "right", showLabelPrefix: true, labelPrefix: "الفصيلة:", zIndex: 15 },
      { id: "fe-dates", type: "expiryDate", labelAr: "تاريخ الانتهاء", visible: true, x: 91, y: 56, fontFamily: "Cairo", fontSize: 11, fontWeight: "bold", color: "#7c3aed", textAlign: "right", showLabelPrefix: true, labelPrefix: "صالحة حتى:", zIndex: 15 },
      { id: "fe-qr", type: "qrCode", labelAr: "رمز QR", visible: true, x: 16, y: 22, qrSize: 92, zIndex: 20 },
      { id: "fe-bar", type: "barcode", labelAr: "الباركود", visible: true, x: 26, y: 47, width: 170, zIndex: 15 },
      { id: "fe-custom", type: "customText", labelAr: "عبارة رسمية", visible: true, x: 50, y: 91, fontFamily: "Tajawal", fontSize: 11, fontWeight: "bold", color: "#6b21a8", textAlign: "center", customTextValue: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - القسم النسائي", zIndex: 15 }
    ]
  }
];

export const VolunteerCardTemplatesPanel: React.FC<VolunteerCardTemplatesPanelProps> = ({
  volunteers = [],
  teams = [],
  departments = [],
  femaleUnifiedPhotoUrl: initialFemaleUnifiedPhoto,
  onUpdateFemaleUnifiedPhoto,
  onUpdateVolunteer,
  onAddLog
}) => {
  // Main tabs: templates_list, designer, issuance, bulk_issuance, female_photo_setting
  const [activeTab, setActiveTab] = useState<"templates_list" | "designer" | "issuance" | "bulk_issuance" | "female_photo_setting">("templates_list");

  // Templates state
  const [templates, setTemplates] = useState<VolunteerCardTemplate[]>(() => {
    const saved = localStorage.getItem("reyadat_volunteer_card_templates");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_TEMPLATES;
  });

  // Current editing template
  const [currentTemplate, setCurrentTemplate] = useState<VolunteerCardTemplate>(() => templates[0] || INITIAL_TEMPLATES[0]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(() => (templates[0]?.elements?.[2]?.id || INITIAL_TEMPLATES[0]?.elements?.[2]?.id || null));

  // Female unified photo state
  const [femaleUnifiedPhoto, setFemaleUnifiedPhoto] = useState<string>(
    initialFemaleUnifiedPhoto || 
    localStorage.getItem("reyadat_female_unified_photo") || 
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
  );
  const [tempFemalePhotoInput, setTempFemalePhotoInput] = useState<string>(femaleUnifiedPhoto);
  const [femalePhotoSaveSuccess, setFemalePhotoSaveSuccess] = useState<boolean>(false);

  // Single Issuance State
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>(volunteers[0]?.id || "");
  const [selectedTemplateIdForIssuance, setSelectedTemplateIdForIssuance] = useState<string>("auto");
  const [useFemaleUnifiedOverride, setUseFemaleUnifiedOverride] = useState<boolean>(true);
  const [issuanceSuccessMsg, setIssuanceSuccessMsg] = useState<string>("");

  // Bulk Issuance State
  const [bulkSelectedVolunteerIds, setBulkSelectedVolunteerIds] = useState<string[]>([]);
  const [bulkTemplateId, setBulkTemplateId] = useState<string>("auto");
  const [bulkFilterGender, setBulkFilterGender] = useState<string>("all");
  const [bulkFilterTeam, setBulkFilterTeam] = useState<string>("all");
  const [bulkProgress, setBulkProgress] = useState<number | null>(null);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string>("");

  // Verification Modal State
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [volunteerForVerification, setVolunteerForVerification] = useState<Volunteer | null>(null);

  // Preview Gender Toggle for Designer
  const [previewGenderMode, setPreviewGenderMode] = useState<"male" | "female">("male");
  const [designerEditorMode, setDesignerEditorMode] = useState<"visual" | "classic">("visual");

  // Load from backend on mount if available
  useEffect(() => {
    fetch("/api/db/card-templates")
      .then((res) => res.json())
      .then((data) => {
        if (data?.templates && Array.isArray(data.templates) && data.templates.length > 0) {
          setTemplates(data.templates);
          setCurrentTemplate(data.templates[0]);
        }
      })
      .catch((e) => {
        // local storage fallback is already set
      });
  }, []);

  // Sync templates to localStorage and backend
  const persistTemplates = (newTemplates: VolunteerCardTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem("reyadat_volunteer_card_templates", JSON.stringify(newTemplates));
    fetch("/api/db/card-templates/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templates: newTemplates })
    }).catch(() => {});
  };

  // Handle Female Unified Photo Save
  const handleSaveFemaleUnifiedPhoto = async () => {
    if (!tempFemalePhotoInput.trim()) return;
    setFemaleUnifiedPhoto(tempFemalePhotoInput.trim());
    localStorage.setItem("reyadat_female_unified_photo", tempFemalePhotoInput.trim());
    if (onUpdateFemaleUnifiedPhoto) {
      await onUpdateFemaleUnifiedPhoto(tempFemalePhotoInput.trim());
    }
    // Also save via backend
    fetch("/api/db/systemSettings/femaleUnifiedPhoto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ femaleUnifiedPhotoUrl: tempFemalePhotoInput.trim() })
    }).catch(() => {});

    setFemalePhotoSaveSuccess(true);
    if (onAddLog) onAddLog("تحديث الصورة الموحدة للمتطوعات في النظام");
    setTimeout(() => setFemalePhotoSaveSuccess(false), 3000);
  };

  // Mock volunteers for live preview
  const sampleMaleVolunteer: Volunteer = {
    id: "sample-m",
    name: "أحمد بن علي الغامدي",
    email: "ahmed.g@example.com",
    phone: "0551234567",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
    membershipNumber: "V-2026-0001",
    teamId: teams[0]?.id || "team-1",
    departmentId: departments[0]?.id || "dep-3",
    titleAr: "متطوع تنظيمي ميداني",
    titleEn: "Field Volunteer",
    status: "active",
    points: 35,
    gender: "male",
    nationalId: "1087654321",
    nationality: "سعودي",
    birthDate: "1418/06/15هـ",
    bloodType: "O+",
    issueDate: "2026-01-15",
    expiryDate: "2027-01-15",
    barcode: "100088868001",
    qrCode: "MEM-V-2026-0001"
  };

  const sampleFemaleVolunteer: Volunteer = {
    id: "sample-f",
    name: "سارة بنت محمد العتيبي",
    email: "sara.o@example.com",
    phone: "0569876543",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
    membershipNumber: "V-2026-0002",
    teamId: teams[1]?.id || "team-2",
    departmentId: departments[1]?.id || "dep-2",
    titleAr: "مصممة جرافيك متطوعة",
    titleEn: "Graphic Designer",
    status: "active",
    points: 42,
    gender: "female",
    nationalId: "1098765432",
    nationality: "سعودية",
    birthDate: "1420/03/10هـ",
    bloodType: "A+",
    issueDate: "2026-02-01",
    expiryDate: "2027-02-01",
    barcode: "100088868002",
    qrCode: "MEM-V-2026-0002"
  };

  const activePreviewVolunteer = previewGenderMode === "male" ? sampleMaleVolunteer : sampleFemaleVolunteer;

  // Selected element in designer
  const selectedElement = currentTemplate?.elements?.find((e) => e.id === selectedElementId);

  // Update element property
  const updateElementProp = (elemId: string, updates: Partial<CardElementConfig>) => {
    const updatedElements = currentTemplate.elements.map((el) => {
      if (el.id === elemId) {
        return { ...el, ...updates };
      }
      return el;
    });
    setCurrentTemplate({
      ...currentTemplate,
      elements: updatedElements
    });
  };

  // Toggle element visibility
  const toggleElementVisibility = (elemId: string) => {
    const el = currentTemplate.elements.find((e) => e.id === elemId);
    if (!el) return;
    updateElementProp(elemId, { visible: !el.visible });
  };

  // Add an unconfigured element to template
  const addElementToTemplate = (type: CardElementType) => {
    const meta = AVAILABLE_ELEMENTS.find((m) => m.type === type);
    if (!meta) return;

    const newId = `el-${type}-${Date.now()}`;
    const newElem: CardElementConfig = {
      id: newId,
      type,
      labelAr: meta.label,
      visible: true,
      x: 50,
      y: 50,
      fontFamily: "Cairo",
      fontSize: 14,
      fontWeight: "bold",
      color: "#1e293b",
      textAlign: "right",
      direction: "rtl",
      showLabelPrefix: true,
      labelPrefix: `${meta.label}:`,
      customTextValue: type === "customText" ? "نص رسمي معتمد" : undefined
    };

    setCurrentTemplate({
      ...currentTemplate,
      elements: [...currentTemplate.elements, newElem]
    });
    setSelectedElementId(newId);
  };

  // Save current template
  const handleSaveTemplate = () => {
    const exists = templates.some((t) => t.id === currentTemplate.id);
    let updated: VolunteerCardTemplate[];
    if (exists) {
      updated = templates.map((t) => (t.id === currentTemplate.id ? currentTemplate : t));
    } else {
      updated = [...templates, currentTemplate];
    }
    persistTemplates(updated);
    if (onAddLog) onAddLog(`حفظ قالب بطاقة المتطوعين: ${currentTemplate.name}`);
    alert("تم حفظ قالب البطاقة وإحداثيات الحقول بنجاح!");
  };

  // Create new template from scratch
  const handleCreateNewTemplate = () => {
    const newTemplate: VolunteerCardTemplate = {
      id: `tpl-${Date.now()}`,
      name: "قالب بطاقة جديد " + (templates.length + 1),
      description: "قالب مخصص تم إنشاؤه حديثاً.",
      cardType: "standard",
      targetGender: "all",
      useFemaleUnifiedPhoto: true,
      isActive: true,
      backgroundUrl: BACKGROUND_PRESETS[0].url,
      width: 856,
      height: 540,
      orientation: "landscape",
      createdAt: new Date().toISOString(),
      elements: [...INITIAL_TEMPLATES[0].elements]
    };
    setCurrentTemplate(newTemplate);
    setSelectedElementId(newTemplate.elements[0]?.id || null);
    setActiveTab("designer");
  };

  // Duplicate template
  const handleDuplicateTemplate = (tpl: VolunteerCardTemplate) => {
    const copy: VolunteerCardTemplate = {
      ...tpl,
      id: `tpl-copy-${Date.now()}`,
      name: `${tpl.name} (نسخة معدلة)`,
      isDefaultMale: false,
      isDefaultFemale: false,
      createdAt: new Date().toISOString()
    };
    const updated = [...templates, copy];
    persistTemplates(updated);
    setCurrentTemplate(copy);
    setActiveTab("designer");
  };

  // Delete template
  const handleDeleteTemplate = (id: string) => {
    if (templates.length <= 1) {
      alert("يجب الإبقاء على قالب واحد على الأقل في النظام.");
      return;
    }
    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا القالب؟")) return;
    const updated = templates.filter((t) => t.id !== id);
    persistTemplates(updated);
    setCurrentTemplate(updated[0]);
  };

  // Set as default template for gender
  const handleSetDefault = (tpl: VolunteerCardTemplate, gender: "male" | "female") => {
    const updated = templates.map((t) => {
      if (gender === "male") {
        return { ...t, isDefaultMale: t.id === tpl.id };
      } else {
        return { ...t, isDefaultFemale: t.id === tpl.id };
      }
    });
    persistTemplates(updated);
  };

  // Pick best template for volunteer
  const getAutoTemplateForVolunteer = (vol: Volunteer): VolunteerCardTemplate => {
    const isFemale = vol.gender === "female" || (vol.name && (vol.name.includes("سارة") || vol.name.includes("مريم") || vol.name.includes("فاطمة") || vol.name.includes("أنثى")));
    if (isFemale) {
      const defFemale = templates.find((t) => t.isDefaultFemale && t.isActive) || templates.find((t) => t.targetGender === "female" && t.isActive);
      if (defFemale) return defFemale;
    } else {
      const defMale = templates.find((t) => t.isDefaultMale && t.isActive) || templates.find((t) => t.targetGender === "male" && t.isActive);
      if (defMale) return defMale;
    }
    return templates[0];
  };

  // Find selected volunteer for issuance
  const selectedVolunteer = volunteers.find((v) => v.id === selectedVolunteerId) || volunteers[0];
  const effectiveTemplateForIssuance = selectedTemplateIdForIssuance === "auto"
    ? (selectedVolunteer ? getAutoTemplateForVolunteer(selectedVolunteer) : templates[0])
    : (templates.find((t) => t.id === selectedTemplateIdForIssuance) || templates[0]);

  // Issue card for single volunteer
  const handleIssueCardForVolunteer = () => {
    if (!selectedVolunteer) return;

    const isFemale = selectedVolunteer.gender === "female" || (selectedVolunteer.name && (selectedVolunteer.name.includes("سارة") || selectedVolunteer.name.includes("مريم") || selectedVolunteer.name.includes("فاطمة") || selectedVolunteer.name.includes("أنثى")));
    const useUnifiedPhoto = isFemale && (effectiveTemplateForIssuance.useFemaleUnifiedPhoto && useFemaleUnifiedOverride);

    const issuedCard: IssuedVolunteerCard = {
      id: `card-${Date.now()}`,
      volunteerId: selectedVolunteer.id,
      templateId: effectiveTemplateForIssuance.id,
      templateName: effectiveTemplateForIssuance.name,
      cardNumber: `CARD-${new Date().getFullYear()}-${selectedVolunteer.membershipNumber || "001"}`,
      issueDate: new Date().toISOString().split("T")[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "active",
      photoUrlUsed: useUnifiedPhoto ? femaleUnifiedPhoto : (selectedVolunteer.photo || ""),
      isFemaleUnifiedPhotoUsed: useUnifiedPhoto,
      qrVerificationUrl: `${window.location.origin}?verifyCard=${encodeURIComponent(selectedVolunteer.membershipNumber || selectedVolunteer.id)}`,
      cardSnapshot: {
        backgroundUrl: effectiveTemplateForIssuance.backgroundUrl,
        orientation: effectiveTemplateForIssuance.orientation,
        width: effectiveTemplateForIssuance.width,
        height: effectiveTemplateForIssuance.height,
        elements: effectiveTemplateForIssuance.elements,
        volunteerData: {
          name: selectedVolunteer.name,
          photo: useUnifiedPhoto ? femaleUnifiedPhoto : (selectedVolunteer.photo || ""),
          nationalId: selectedVolunteer.nationalId || "",
          maskedNationalId: `10****${(selectedVolunteer.nationalId || "00").slice(-2)}`,
          membershipNumber: selectedVolunteer.membershipNumber,
          nationality: selectedVolunteer.nationality || "سعودي",
          gender: selectedVolunteer.gender,
          birthDate: selectedVolunteer.birthDate,
          bloodType: selectedVolunteer.bloodType,
          jobTitle: selectedVolunteer.titleAr || "متطوع تنظيمي",
          teamName: teams.find((t) => t.id === selectedVolunteer.teamId)?.nameAr || "فريق التنظيم",
          departmentName: departments.find((d) => d.id === selectedVolunteer.departmentId)?.nameAr || "إدارة العمليات",
          joinDate: selectedVolunteer.issueDate || "2026-01-15",
          expiryDate: selectedVolunteer.expiryDate || "2027-01-15",
          points: selectedVolunteer.points || 20
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedVol: Volunteer = {
      ...selectedVolunteer,
      issuedCardId: issuedCard.id,
      issuedCard
    };

    if (onUpdateVolunteer) {
      onUpdateVolunteer(updatedVol);
    }

    // Call backend
    fetch("/api/db/cards/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volunteerIds: [selectedVolunteer.id],
        templateId: effectiveTemplateForIssuance.id,
        useFemaleUnifiedPhoto: useUnifiedPhoto
      })
    }).catch(() => {});

    if (onAddLog) onAddLog(`إصدار بطاقة المتطوع الرسمية: ${selectedVolunteer.name} بنجاح`);

    setIssuanceSuccessMsg(`تم إنشاء البطاقة بنجاح للمتطوع: ${selectedVolunteer.name}!`);
    setTimeout(() => setIssuanceSuccessMsg(""), 4000);
  };

  // Re-issue card
  const handleReissueCard = (volunteerId: string) => {
    setSelectedVolunteerId(volunteerId);
    handleIssueCardForVolunteer();
  };

  // Bulk Filter volunteers
  const filteredBulkVolunteers = volunteers.filter((vol) => {
    if (bulkFilterTeam !== "all" && vol.teamId !== bulkFilterTeam) return false;
    if (bulkFilterGender !== "all") {
      const isFem = vol.gender === "female" || (vol.name && (vol.name.includes("سارة") || vol.name.includes("مريم") || vol.name.includes("فاطمة") || vol.name.includes("أنثى")));
      if (bulkFilterGender === "female" && !isFem) return false;
      if (bulkFilterGender === "male" && isFem) return false;
    }
    return true;
  });

  const toggleSelectAllBulk = () => {
    if (bulkSelectedVolunteerIds.length === filteredBulkVolunteers.length) {
      setBulkSelectedVolunteerIds([]);
    } else {
      setBulkSelectedVolunteerIds(filteredBulkVolunteers.map((v) => v.id));
    }
  };

  const toggleSelectVolunteerBulk = (id: string) => {
    if (bulkSelectedVolunteerIds.includes(id)) {
      setBulkSelectedVolunteerIds(bulkSelectedVolunteerIds.filter((i) => i !== id));
    } else {
      setBulkSelectedVolunteerIds([...bulkSelectedVolunteerIds, id]);
    }
  };

  // Run Bulk Issuance
  const handleRunBulkIssuance = async () => {
    if (bulkSelectedVolunteerIds.length === 0) {
      alert("يرجى اختيار متطوع واحد على الأقل لإنشاء بطاقته.");
      return;
    }

    setBulkProgress(10);
    const total = bulkSelectedVolunteerIds.length;

    // Simulate progress
    for (let i = 0; i < total; i++) {
      await new Promise((r) => setTimeout(r, 80));
      setBulkProgress(Math.round(((i + 1) / total) * 100));
    }

    // Call backend API
    fetch("/api/db/cards/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volunteerIds: bulkSelectedVolunteerIds,
        templateId: bulkTemplateId === "auto" ? undefined : bulkTemplateId,
        autoGenderTemplate: bulkTemplateId === "auto",
        useFemaleUnifiedPhoto: true
      })
    }).catch(() => {});

    if (onAddLog) onAddLog(`إنشاء بطاقات دفعة واحدة لعدد ${total} متطوع`);

    setBulkSuccessMsg(`تم إنشاء ${total} بطاقة متطوع بنجاح وتحديث كافة السجلات!`);
    setBulkProgress(null);
    setTimeout(() => setBulkSuccessMsg(""), 5000);
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Top Header with Distinctive Typography and Stats */}
      <div className="bg-gradient-to-l from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-emerald-600/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-white/5 rounded-full -translate-x-20 -translate-y-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-xs">
                <CreditCard className="w-7 h-7 text-amber-300" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">قوالب بطاقات المتطوعين</h2>
            </div>
            <p className="text-sm text-emerald-100 max-w-2xl leading-relaxed">
              صمم قالب البطاقة مرة واحدة فقط مع تحديد أماكن البيانات والصور والباركود، ثم أنشئ بطاقات المتطوعين آلياً بنقرة واحدة دون الحاجة لإعادة الترتيب في كل مرة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-nav-templates"
              onClick={() => setActiveTab("templates_list")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "templates_list"
                  ? "bg-white text-emerald-900 shadow-md"
                  : "bg-white/15 hover:bg-white/25 text-white"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>قوالب البطاقات ({templates.length})</span>
            </button>

            <button
              id="btn-nav-designer"
              onClick={() => setActiveTab("designer")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "designer"
                  ? "bg-white text-emerald-900 shadow-md"
                  : "bg-white/15 hover:bg-white/25 text-white"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>محرر القالب المرئي</span>
            </button>

            <button
              id="btn-nav-single-issue"
              onClick={() => setActiveTab("issuance")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "issuance"
                  ? "bg-white text-emerald-900 shadow-md"
                  : "bg-white/15 hover:bg-white/25 text-white"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>إنشاء بطاقة متطوع</span>
            </button>

            <button
              id="btn-nav-bulk-issue"
              onClick={() => setActiveTab("bulk_issuance")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "bulk_issuance"
                  ? "bg-white text-emerald-900 shadow-md"
                  : "bg-white/15 hover:bg-white/25 text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>إصدار دفعات جماعية</span>
            </button>

            <button
              id="btn-nav-female-photo"
              onClick={() => setActiveTab("female_photo_setting")}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                activeTab === "female_photo_setting"
                  ? "bg-purple-100 text-purple-900 shadow-md"
                  : "bg-purple-600/40 hover:bg-purple-600/60 text-white"
              }`}
            >
              <Camera className="w-4 h-4 text-purple-200" />
              <span>الصورة الموحدة للمتطوعات</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. TEMPLATES LIST VIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "templates_list" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs">
            <div>
              <h3 className="text-lg font-black text-neutral-800">قائمة القوالب المحفوظة في النظام</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                يمكنك تخصيص قوالب مختلفة للذكور والإناث، أو تكرار أي قالب وتعديل خلفيته وإحداثيات عناصره.
              </p>
            </div>
            <button
              id="btn-create-template"
              onClick={handleCreateNewTemplate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء قالب بطاقة جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => {
              return (
                <div
                  key={tpl.id}
                  id={`card-tpl-${tpl.id}`}
                  className="bg-white rounded-3xl border border-neutral-200 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between group"
                >
                  <div className="p-5">
                    {/* Header badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        tpl.targetGender === "female"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : tpl.targetGender === "male"
                          ? "bg-blue-100 text-blue-800 border border-blue-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                        {tpl.targetGender === "female" ? "مخصص للإناث ♀" : tpl.targetGender === "male" ? "مخصص للذكور ♂" : "عام (للجميع)"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {tpl.isDefaultMale && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md">
                            افتراضي ذكور
                          </span>
                        )}
                        {tpl.isDefaultFemale && (
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-md">
                            افتراضي إناث
                          </span>
                        )}
                        {tpl.useFemaleUnifiedPhoto && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md">
                            صورة موحدة
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-base font-black text-neutral-900 mb-1">{tpl.name}</h4>
                    <p className="text-xs text-neutral-500 line-clamp-2 mb-4 leading-relaxed">
                      {tpl.description || "قالب رسمي معتمد لبطاقات المتطوعين."}
                    </p>

                    {/* Visual Miniature Preview */}
                    <div className="relative w-full aspect-[856/540] rounded-xl overflow-hidden border border-neutral-200 shadow-2xs bg-neutral-100 flex items-center justify-center">
                      <img
                        src={tpl.backgroundUrl || BACKGROUND_PRESETS[0].url}
                        alt={tpl.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-neutral-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setCurrentTemplate(tpl);
                            setActiveTab("designer");
                          }}
                          className="bg-white text-neutral-900 font-bold text-xs px-4 py-2 rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>فتح المحرر</span>
                        </button>
                      </div>
                    </div>

                    {/* Elements Count Details */}
                    <div className="mt-4 flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-100 pt-3">
                      <span>العناصر المفعلة: <strong>{tpl.elements.filter((e) => e.visible).length}</strong> عنصر</span>
                      <span>الأبعاد: {tpl.width}×{tpl.height} بكسل</span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-3 bg-neutral-50 border-t border-neutral-150 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setCurrentTemplate(tpl);
                          setActiveTab("designer");
                        }}
                        className="p-2 text-neutral-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="تعديل وتحديد الأماكن"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

                      <button
                        onClick={() => handleDuplicateTemplate(tpl)}
                        className="p-2 text-neutral-700 hover:text-blue-700 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="تكرار القالب"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSetDefault(tpl, tpl.targetGender === "female" ? "female" : "male")}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/60 rounded-lg transition-all cursor-pointer"
                      >
                        تعيين كافتراضي
                      </button>

                      <button
                        onClick={() => handleDeleteTemplate(tpl.id)}
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                        title="حذف القالب"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. INTERACTIVE TEMPLATE DESIGNER & FIELD POSITIONING */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "designer" && (
        <div className="space-y-6">
          {/* Mode Switcher Banner */}
          <div className="bg-white p-3.5 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("templates_list")}
                className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
                title="الرجوع للقوالب"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div>
                <h4 className="text-xs font-black text-neutral-800">
                  تصميم قالب: {currentTemplate.name}
                </h4>
                <span className="text-[11px] text-neutral-500">
                  {designerEditorMode === "visual" ? "وضع السحب والإفلات التفاعلي المباشر (بالماوس واللمس)" : "وضع المحرر التفصيلي"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDesignerEditorMode("visual")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  designerEditorMode === "visual"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                المحرر المرئي المباشر (سحب وإفلات)
              </button>
              <button
                type="button"
                onClick={() => setDesignerEditorMode("classic")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  designerEditorMode === "classic"
                    ? "bg-white text-emerald-800 shadow-2xs font-bold"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                المحرر التفصيلي
              </button>
            </div>
          </div>

          {designerEditorMode === "visual" ? (
            <CardTemplateEditor
              template={currentTemplate}
              onSave={async (updatedTpl) => {
                setCurrentTemplate(updatedTpl);
                const exists = templates.some((t) => t.id === updatedTpl.id);
                const updatedList = exists
                  ? templates.map((t) => (t.id === updatedTpl.id ? updatedTpl : t))
                  : [...templates, updatedTpl];
                persistTemplates(updatedList);
                if (onAddLog) onAddLog(`حفظ قالب بطاقة المتطوعين: ${updatedTpl.name}`);
                alert("تم حفظ قالب البطاقة بنجاح!");
              }}
              onCancel={() => setActiveTab("templates_list")}
              teams={teams}
              departments={departments}
              femaleUnifiedPhotoUrl={femaleUnifiedPhoto}
            />
          ) : (
            <div className="space-y-6">
              {/* Top Designer Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("templates_list")}
                className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
                title="الرجوع للقوالب"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    محرر القوالب التفاعلي
                  </span>
                  <h3 className="text-lg font-black text-neutral-900">{currentTemplate.name}</h3>
                </div>
                <p className="text-xs text-neutral-500">
                  حدد أماكن البيانات بالسحب أو بالمنزلقات، وخصص الخط والألوان والأحجام لكل حقل مرة واحدة فقط.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Sample Gender Toggle */}
              <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-bold">
                <button
                  onClick={() => setPreviewGenderMode("male")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    previewGenderMode === "male"
                      ? "bg-white text-blue-800 shadow-2xs font-black"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  عينة متطوع ♂
                </button>
                <button
                  onClick={() => setPreviewGenderMode("female")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    previewGenderMode === "female"
                      ? "bg-white text-purple-800 shadow-2xs font-black"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  عينة متطوعة ♀
                </button>
              </div>

              <button
                id="btn-save-template-designer"
                onClick={handleSaveTemplate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ القالب</span>
              </button>
            </div>
          </div>

          {/* Designer Layout: 3 Columns (Elements Palette | Live Visual Canvas | Inspector Properties) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Elements Palette (Width: 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs">
                <h4 className="text-sm font-black text-neutral-900 mb-3 flex items-center justify-between">
                  <span>عناصر البطاقة</span>
                  <span className="text-xs text-neutral-500 font-normal">({currentTemplate.elements.length})</span>
                </h4>
                <p className="text-[11px] text-neutral-500 mb-3 leading-tight">
                  انقر على أي عنصر لتحديد مكانه وتعديل خصائصه، أو فعّل/عطّل إظهاره.
                </p>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {currentTemplate.elements.map((el) => {
                    const isSelected = selectedElementId === el.id;
                    return (
                      <div
                        key={el.id}
                        id={`btn-select-el-${el.id}`}
                        onClick={() => setSelectedElementId(el.id)}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-2xs"
                            : "bg-neutral-50/70 hover:bg-neutral-100 border-neutral-200 text-neutral-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full ${el.visible ? "bg-emerald-500" : "bg-neutral-300"}`} />
                          <span className="truncate">{el.labelAr}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleElementVisibility(el.id);
                            }}
                            className={`p-1 rounded-md text-[10px] transition-all cursor-pointer ${
                              el.visible
                                ? "text-emerald-700 hover:bg-emerald-100"
                                : "text-neutral-400 hover:bg-neutral-200"
                            }`}
                            title={el.visible ? "إخفاء العنصر" : "إظهار العنصر"}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add more element dropdown */}
                <div className="mt-4 pt-4 border-t border-neutral-150">
                  <label className="block text-[11px] font-bold text-neutral-600 mb-2">إضافة عنصر جديد للبطاقة:</label>
                  <select
                    id="select-add-element"
                    onChange={(e) => {
                      if (e.target.value) {
                        addElementToTemplate(e.target.value as CardElementType);
                        e.target.value = "";
                      }
                    }}
                    className="w-full text-xs p-2 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-neutral-800"
                  >
                    <option value="">+ اختر عنصر لإضافته...</option>
                    {AVAILABLE_ELEMENTS.map((ae) => (
                      <option key={ae.type} value={ae.type}>
                        {ae.label} ({ae.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template General Settings Card */}
              <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs space-y-3.5 text-xs">
                <h4 className="text-sm font-black text-neutral-900">إعدادات القالب العامة</h4>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">اسم القالب:</label>
                  <input
                    type="text"
                    value={currentTemplate.name}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, name: e.target.value })}
                    className="w-full p-2 border border-neutral-300 rounded-xl font-bold text-neutral-800 bg-neutral-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">الفئة المستهدفة:</label>
                  <select
                    value={currentTemplate.targetGender}
                    onChange={(e) => setCurrentTemplate({ ...currentTemplate, targetGender: e.target.value as any })}
                    className="w-full p-2 border border-neutral-300 rounded-xl font-bold text-neutral-800 bg-neutral-50"
                  >
                    <option value="all">عام (كافة المتطوعين)</option>
                    <option value="male">خاص بالمتطوعين الذكور ♂</option>
                    <option value="female">خاص بالمتطوعات الإناث ♀</option>
                  </select>
                </div>

                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-900">
                    <input
                      type="checkbox"
                      checked={currentTemplate.useFemaleUnifiedPhoto}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, useFemaleUnifiedPhoto: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                    />
                    <span>استخدام الصورة الموحدة للمتطوعات</span>
                  </label>
                  <p className="text-[10px] text-purple-700 mt-1 leading-tight">
                    في حال تفعيل هذا الخيار، سيتم تطبيق الصورة الموحدة تلقائياً لجميع المتطوعات في هذا القالب لحفظ الخصوصية.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1.5">صورة خلفية البطاقة:</label>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {BACKGROUND_PRESETS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setCurrentTemplate({ ...currentTemplate, backgroundUrl: p.url })}
                          className={`relative rounded-lg overflow-hidden border-2 h-14 transition-all cursor-pointer ${
                            currentTemplate.backgroundUrl === p.url ? "border-emerald-600 ring-2 ring-emerald-300" : "border-neutral-200"
                          }`}
                        >
                          <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                          <span className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[8.5px] p-0.5 truncate font-bold text-center">
                            {p.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      placeholder="أو ضع رابط صورة الخلفية المخصص..."
                      value={currentTemplate.backgroundUrl}
                      onChange={(e) => setCurrentTemplate({ ...currentTemplate, backgroundUrl: e.target.value })}
                      className="w-full p-2 text-[11px] border border-neutral-300 rounded-xl font-mono text-neutral-800 bg-neutral-50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Live Visual Canvas (Width: 6 cols) */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs flex flex-col items-center">
                <div className="w-full flex items-center justify-between mb-4 pb-2 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-sm font-black text-neutral-800">المعاينة الحية الفورية للبطاقة</h4>
                  </div>
                  <span className="text-xs text-neutral-500 font-medium">
                    (تتغير الأبعاد والمواقع فوراً وفق إحداثياتك)
                  </span>
                </div>

                {/* Scaled Preview of CardRenderer */}
                <div className="w-full flex justify-center py-2 overflow-x-auto">
                  <CardRenderer
                    template={currentTemplate}
                    volunteer={activePreviewVolunteer}
                    departments={departments}
                    teams={teams}
                    femaleUnifiedPhotoUrl={femaleUnifiedPhoto}
                    scale={0.65}
                    showActions={false}
                  />
                </div>

                <div className="mt-4 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs text-neutral-600 flex items-center justify-between w-full">
                  <span>المعروض الآن: <strong>{activePreviewVolunteer.name} ({previewGenderMode === "male" ? "ذكر ♂" : "أنثى ♀"})</strong></span>
                  <span className="text-emerald-700 font-bold">✓ الدقة الأصلية: 856 × 540 بكسل</span>
                </div>
              </div>
            </div>

            {/* Column 3: Element Inspector & Position Controls (Width: 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-white rounded-3xl p-5 border border-neutral-200 shadow-xs">
                {selectedElement ? (
                  <div className="space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-150">
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold">العنصر المحدد:</span>
                        <h4 className="text-sm font-black text-emerald-800">{selectedElement.labelAr}</h4>
                      </div>
                      <span className="text-[10px] bg-neutral-100 font-mono text-neutral-600 px-2 py-0.5 rounded-md">
                        {selectedElement.type}
                      </span>
                    </div>

                    {/* Position Sliders: X & Y Coordinates */}
                    <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                      <h5 className="font-black text-neutral-800 flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-emerald-600" />
                        <span>تحديد الموضع على البطاقة</span>
                      </h5>

                      <div>
                        <div className="flex justify-between font-bold text-neutral-700 mb-1">
                          <span>الموضع الأفقي (X):</span>
                          <span className="font-mono text-emerald-700">{selectedElement.x}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={selectedElement.x}
                          onChange={(e) => updateElementProp(selectedElement.id, { x: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                          <span>يسار (0%)</span>
                          <span>يمين (100%)</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between font-bold text-neutral-700 mb-1">
                          <span>الموضع الرأسي (Y):</span>
                          <span className="font-mono text-emerald-700">{selectedElement.y}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={selectedElement.y}
                          onChange={(e) => updateElementProp(selectedElement.id, { y: parseFloat(e.target.value) })}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-neutral-400 mt-0.5">
                          <span>أعلى (0%)</span>
                          <span>أسفل (100%)</span>
                        </div>
                      </div>

                      {/* Fine Tuning Buttons (+ / - 1%) */}
                      <div className="grid grid-cols-4 gap-1 text-[11px] pt-1">
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedElement.id, { y: Math.max(0, selectedElement.y - 1) })}
                          className="p-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 font-bold"
                        >
                          ↑ أعلى
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedElement.id, { y: Math.min(100, selectedElement.y + 1) })}
                          className="p-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 font-bold"
                        >
                          ↓ أسفل
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedElement.id, { x: Math.max(0, selectedElement.x - 1) })}
                          className="p-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 font-bold"
                        >
                          ← يسار
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProp(selectedElement.id, { x: Math.min(100, selectedElement.x + 1) })}
                          className="p-1.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-100 font-bold"
                        >
                          يمين →
                        </button>
                      </div>
                    </div>

                    {/* Typography Settings if text */}
                    {selectedElement.type !== "photo" && selectedElement.type !== "qrCode" && selectedElement.type !== "barcode" && selectedElement.type !== "associationLogo" && (
                      <div className="space-y-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <h5 className="font-black text-neutral-800 flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-emerald-600" />
                          <span>الخط والتنسيق</span>
                        </h5>

                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">نوع الخط العربي:</label>
                          <select
                            value={selectedElement.fontFamily || "Cairo"}
                            onChange={(e) => updateElementProp(selectedElement.id, { fontFamily: e.target.value })}
                            className="w-full p-2 border border-neutral-300 rounded-xl font-bold text-neutral-800 bg-white"
                          >
                            {FONT_OPTIONS.map((f) => (
                              <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-neutral-700 mb-1">الحجم (px):</label>
                            <input
                              type="number"
                              min="8"
                              max="48"
                              value={selectedElement.fontSize || 14}
                              onChange={(e) => updateElementProp(selectedElement.id, { fontSize: parseInt(e.target.value) || 14 })}
                              className="w-full p-2 border border-neutral-300 rounded-xl font-mono text-neutral-800 bg-white"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-neutral-700 mb-1">سماكة الخط:</label>
                            <select
                              value={selectedElement.fontWeight || "bold"}
                              onChange={(e) => updateElementProp(selectedElement.id, { fontWeight: e.target.value as any })}
                              className="w-full p-2 border border-neutral-300 rounded-xl font-bold text-neutral-800 bg-white"
                            >
                              <option value="normal">عادي</option>
                              <option value="500">متوسط</option>
                              <option value="bold">عريض</option>
                              <option value="900">فائق العرض</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">لون الخط:</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedElement.color || "#1e293b"}
                              onChange={(e) => updateElementProp(selectedElement.id, { color: e.target.value })}
                              className="w-10 h-10 p-1 border border-neutral-300 rounded-xl cursor-pointer"
                            />
                            <input
                              type="text"
                              value={selectedElement.color || "#1e293b"}
                              onChange={(e) => updateElementProp(selectedElement.id, { color: e.target.value })}
                              className="flex-1 p-2 font-mono border border-neutral-300 rounded-xl bg-white text-neutral-800"
                            />
                          </div>
                        </div>

                        {/* Text Alignment */}
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">المحاذاة:</label>
                          <div className="grid grid-cols-3 gap-1 bg-white p-1 border border-neutral-200 rounded-xl">
                            <button
                              type="button"
                              onClick={() => updateElementProp(selectedElement.id, { textAlign: "right" })}
                              className={`p-1.5 rounded-lg flex justify-center ${selectedElement.textAlign === "right" ? "bg-emerald-100 text-emerald-800" : "text-neutral-500"}`}
                            >
                              <AlignRight className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateElementProp(selectedElement.id, { textAlign: "center" })}
                              className={`p-1.5 rounded-lg flex justify-center ${selectedElement.textAlign === "center" ? "bg-emerald-100 text-emerald-800" : "text-neutral-500"}`}
                            >
                              <AlignCenter className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateElementProp(selectedElement.id, { textAlign: "left" })}
                              className={`p-1.5 rounded-lg flex justify-center ${selectedElement.textAlign === "left" ? "bg-emerald-100 text-emerald-800" : "text-neutral-500"}`}
                            >
                              <AlignLeft className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Label Prefix toggle */}
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-700">
                            <input
                              type="checkbox"
                              checked={!!selectedElement.showLabelPrefix}
                              onChange={(e) => updateElementProp(selectedElement.id, { showLabelPrefix: e.target.checked })}
                              className="w-4 h-4 rounded text-emerald-600"
                            />
                            <span>إظهار بادئة التسمية</span>
                          </label>
                          {selectedElement.showLabelPrefix && (
                            <input
                              type="text"
                              value={selectedElement.labelPrefix || ""}
                              onChange={(e) => updateElementProp(selectedElement.id, { labelPrefix: e.target.value })}
                              placeholder="مثال: رقم العضوية:"
                              className="mt-1.5 w-full p-2 border border-neutral-300 rounded-xl bg-white font-bold text-neutral-800"
                            />
                          )}
                        </div>

                        {/* Custom Text value if type is customText */}
                        {selectedElement.type === "customText" && (
                          <div>
                            <label className="block font-bold text-neutral-700 mb-1">النص المكتوب:</label>
                            <input
                              type="text"
                              value={selectedElement.customTextValue || ""}
                              onChange={(e) => updateElementProp(selectedElement.id, { customTextValue: e.target.value })}
                              className="w-full p-2 border border-neutral-300 rounded-xl bg-white font-bold text-neutral-800"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Photo specific properties */}
                    {selectedElement.type === "photo" && (
                      <div className="space-y-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <h5 className="font-black text-neutral-800">خصائص الصورة الشخصية</h5>

                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">حجم الصورة (بكسل):</label>
                          <input
                            type="range"
                            min="80"
                            max="200"
                            value={selectedElement.width || 130}
                            onChange={(e) => updateElementProp(selectedElement.id, { width: parseInt(e.target.value), height: parseInt(e.target.value) })}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                          <span className="text-right font-mono text-emerald-700 font-bold block">{selectedElement.width || 130} px</span>
                        </div>

                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">شكل الصورة:</label>
                          <select
                            value={selectedElement.photoShape || "rounded"}
                            onChange={(e) => updateElementProp(selectedElement.id, { photoShape: e.target.value as any })}
                            className="w-full p-2 border border-neutral-300 rounded-xl bg-white font-bold text-neutral-800"
                          >
                            <option value="rounded">مربع بحواف ناعمة (Rounded)</option>
                            <option value="circle">دائري كامل (Circle)</option>
                            <option value="square">مربع كلاسيكي (Square)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block font-bold text-neutral-700 mb-1">لون الإطار:</label>
                            <input
                              type="color"
                              value={selectedElement.borderColor || "#059669"}
                              onChange={(e) => updateElementProp(selectedElement.id, { borderColor: e.target.value })}
                              className="w-full h-9 p-1 border border-neutral-300 rounded-xl cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-neutral-700 mb-1">سماكة الإطار:</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={selectedElement.borderWidth || 3}
                              onChange={(e) => updateElementProp(selectedElement.id, { borderWidth: parseInt(e.target.value) || 0 })}
                              className="w-full p-2 border border-neutral-300 rounded-xl bg-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* QR Code specific properties */}
                    {selectedElement.type === "qrCode" && (
                      <div className="space-y-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                        <h5 className="font-black text-neutral-800">خصائص رمز التحقق QR</h5>
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1">حجم الرمز (بكسل):</label>
                          <input
                            type="range"
                            min="60"
                            max="160"
                            value={selectedElement.qrSize || 90}
                            onChange={(e) => updateElementProp(selectedElement.id, { qrSize: parseInt(e.target.value) })}
                            className="w-full accent-emerald-600 cursor-pointer"
                          />
                          <span className="text-right font-mono text-emerald-700 font-bold block">{selectedElement.qrSize || 90} px</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-neutral-400">
                    <Sliders className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="font-bold text-xs">اختر عنصراً من قائمة عناصر البطاقة لتعديل خصائصه ومكانه.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 3. SINGLE CARD ISSUANCE & PREVIEW */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "issuance" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-150">
              <div>
                <h3 className="text-lg font-black text-neutral-900">إنشاء بطاقة متطوع رسمية تلقائياً</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  اختر المتطوع ليقوم النظام بجلب كافة بياناته من قاعدة البيانات وتطبيق القالب المخصص له آلياً.
                </p>
              </div>

              {issuanceSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 animate-bounce">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{issuanceSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              {/* Volunteer Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">اختر المتطوع:</label>
                <select
                  id="select-volunteer-issuance"
                  value={selectedVolunteerId}
                  onChange={(e) => setSelectedVolunteerId(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-xs text-neutral-800"
                >
                  {volunteers.map((vol) => (
                    <option key={vol.id} value={vol.id}>
                      {vol.name} - ({vol.membershipNumber}) [{vol.gender === "female" ? "أنثى ♀" : "ذكر ♂"}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">القالب المستخدم:</label>
                <select
                  id="select-template-issuance"
                  value={selectedTemplateIdForIssuance}
                  onChange={(e) => setSelectedTemplateIdForIssuance(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-xs text-neutral-800"
                >
                  <option value="auto">تلقائي ذكي (حسب جنس المتطوع)</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.targetGender === "female" ? "إناث" : tpl.targetGender === "male" ? "ذكور" : "عام"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Button */}
              <div className="flex items-end">
                <button
                  id="btn-issue-card-submit"
                  onClick={handleIssueCardForVolunteer}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs p-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>إنشاء واعتماد البطاقة الآن</span>
                </button>
              </div>
            </div>
          </div>

          {/* Volunteer Live Card & Actions Card */}
          {selectedVolunteer && (
            <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedVolunteer.photo || femaleUnifiedPhoto}
                    alt={selectedVolunteer.name}
                    className="w-12 h-12 rounded-full object-cover border border-emerald-500 shadow-xs"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-base font-black text-neutral-900">{selectedVolunteer.name}</h4>
                    <span className="text-xs text-emerald-700 font-bold">
                      {selectedVolunteer.titleAr || "متطوع معتمد"} | {selectedVolunteer.membershipNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs bg-neutral-100 text-neutral-700 font-bold px-3 py-1 rounded-full border border-neutral-200">
                    القالب المطبق: {effectiveTemplateForIssuance.name}
                  </span>
                </div>
              </div>

              {/* Render High-Res Card */}
              <div className="w-full flex justify-center py-4 overflow-x-auto">
                <CardRenderer
                  template={effectiveTemplateForIssuance}
                  volunteer={selectedVolunteer}
                  departments={departments}
                  teams={teams}
                  femaleUnifiedPhotoUrl={femaleUnifiedPhoto}
                  scale={0.85}
                  showActions={true}
                  onReissue={handleReissueCard}
                  onOpenVerification={(v) => {
                    setVolunteerForVerification(v);
                    setVerificationModalOpen(true);
                  }}
                />
              </div>

              {/* Volunteer File Card Info Box */}
              <div className="w-full mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-neutral-50 p-4 rounded-2xl border border-neutral-200">
                <div>
                  <span className="text-neutral-400 block font-medium">حالة البطاقة:</span>
                  <span className="font-bold text-emerald-700">نشطة ومعتمدة رسمياً ✓</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-medium">تاريخ الإنشاء:</span>
                  <span className="font-bold text-neutral-800">{selectedVolunteer.issueDate || "2026-01-15"}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-medium">تاريخ آخر تحديث:</span>
                  <span className="font-bold text-neutral-800">{new Date().toLocaleDateString("ar-SA")}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block font-medium">الصورة المستخدمة:</span>
                  <span className="font-bold text-neutral-800">
                    {effectiveTemplateForIssuance.useFemaleUnifiedPhoto && selectedVolunteer.gender === "female"
                      ? "الصورة الموحدة للمتطوعات"
                      : "الصورة الشخصية"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 4. BATCH / BULK CARD ISSUANCE */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "bulk_issuance" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-neutral-150">
              <div>
                <h3 className="text-lg font-black text-neutral-900">إنشاء بطاقات المتطوعين دفعة واحدة (Batch Generation)</h3>
                <p className="text-xs text-neutral-500 mt-1">
                  حدد مجموعة من المتطوعين أو فريقاً كاملاً، وأنشئ جميع بطاقاتهم تلقائياً بضغطة زر واحدة.
                </p>
              </div>

              {bulkSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{bulkSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Filter and Configuration Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">فلترة حسب الفريق:</label>
                <select
                  value={bulkFilterTeam}
                  onChange={(e) => setBulkFilterTeam(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-xs text-neutral-800"
                >
                  <option value="all">كافة الفرق ({volunteers.length})</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.nameAr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">فلترة حسب الجنس:</label>
                <select
                  value={bulkFilterGender}
                  onChange={(e) => setBulkFilterGender(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-xs text-neutral-800"
                >
                  <option value="all">الكل (ذكور وإناث)</option>
                  <option value="male">ذكور فقط ♂</option>
                  <option value="female">إناث فقط ♀</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5">القالب المطبق:</label>
                <select
                  value={bulkTemplateId}
                  onChange={(e) => setBulkTemplateId(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-300 rounded-xl font-bold text-xs text-neutral-800"
                >
                  <option value="auto">تلقائي ذكي (حسب جنس كل متطوع)</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  id="btn-run-bulk-issuance"
                  onClick={handleRunBulkIssuance}
                  disabled={bulkSelectedVolunteerIds.length === 0 || bulkProgress !== null}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs p-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {bulkProgress !== null
                      ? `جاري الإنشاء ${bulkProgress}%...`
                      : `إنشاء بطاقات (${bulkSelectedVolunteerIds.length}) متطوع`}
                  </span>
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {bulkProgress !== null && (
              <div className="mt-4 w-full bg-neutral-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-emerald-600 h-3 transition-all duration-200"
                  style={{ width: `${bulkProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* Table of Volunteers */}
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-neutral-50 border-b border-neutral-150 flex items-center justify-between">
              <button
                type="button"
                onClick={toggleSelectAllBulk}
                className="flex items-center gap-2 text-xs font-bold text-neutral-800 cursor-pointer"
              >
                {bulkSelectedVolunteerIds.length === filteredBulkVolunteers.length && filteredBulkVolunteers.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Square className="w-4 h-4 text-neutral-400" />
                )}
                <span>تحديد الكل ({filteredBulkVolunteers.length})</span>
              </button>

              <span className="text-xs text-neutral-500 font-medium">
                المحدد حالياً: <strong>{bulkSelectedVolunteerIds.length}</strong> متطوع
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-100 text-neutral-600 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3.5 w-12 text-center">اختيار</th>
                    <th className="p-3.5">اسم المتطوع</th>
                    <th className="p-3.5">رقم العضوية</th>
                    <th className="p-3.5">الفريق</th>
                    <th className="p-3.5">الجنس</th>
                    <th className="p-3.5">القالب المقترح</th>
                    <th className="p-3.5">حالة البطاقة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150 font-medium text-neutral-800">
                  {filteredBulkVolunteers.map((vol) => {
                    const isSelected = bulkSelectedVolunteerIds.includes(vol.id);
                    const team = teams.find((t) => t.id === vol.teamId);
                    const suggestedTpl = getAutoTemplateForVolunteer(vol);
                    const isFemale = vol.gender === "female" || (vol.name && (vol.name.includes("سارة") || vol.name.includes("مريم") || vol.name.includes("فاطمة") || vol.name.includes("أنثى")));

                    return (
                      <tr
                        key={vol.id}
                        onClick={() => toggleSelectVolunteerBulk(vol.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-emerald-50/60" : "hover:bg-neutral-50"
                        }`}
                      >
                        <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectVolunteerBulk(vol.id)}
                            className="w-4 h-4 rounded text-emerald-600 cursor-pointer"
                          />
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={isFemale ? femaleUnifiedPhoto : (vol.photo || femaleUnifiedPhoto)}
                              alt={vol.name}
                              className="w-8 h-8 rounded-full object-cover border border-neutral-300"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <span className="font-bold block text-neutral-900">{vol.name}</span>
                              <span className="text-[10px] text-neutral-400">{vol.titleAr || "متطوع"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-neutral-700">{vol.membershipNumber}</td>
                        <td className="p-3.5">{team?.nameAr || "عام"}</td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isFemale ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}>
                            {isFemale ? "أنثى ♀" : "ذكر ♂"}
                          </span>
                        </td>
                        <td className="p-3.5 text-neutral-600 text-[11px] font-bold">{suggestedTpl.name}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                            جاهزة للإصدار
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. FEMALE UNIFIED PHOTO DEDICATED SETTINGS */}
      {/* ------------------------------------------------------------- */}
      {activeTab === "female_photo_setting" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 shadow-xs max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-neutral-150">
              <div className="p-3 bg-purple-100 rounded-2xl text-purple-800">
                <Camera className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-neutral-900">إعداد الصورة الموحدة للمتطوعات</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  تُستخدم هذه الصورة تلقائياً لجميع بطاقات المتطوعات الإناث اللاتي لا يرغبن بوضع صورتهن الشخصية، دون الحاجة لرفعها في كل مرة.
                </p>
              </div>
            </div>

            {femalePhotoSaveSuccess && (
              <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <Check className="w-5 h-5 text-emerald-600" />
                <span>تم حفظ وتحديث الصورة الموحدة للمتطوعات بنجاح وتعميمها على النظام!</span>
              </div>
            )}

            {/* Current Image Preview */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-purple-50/60 rounded-3xl border border-purple-200">
              <div className="relative">
                <img
                  src={tempFemalePhotoInput || femaleUnifiedPhoto}
                  alt="الصورة الموحدة للمتطوعات"
                  className="w-32 h-32 rounded-3xl object-cover border-4 border-purple-500 shadow-md"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-2 inset-x-0 bg-purple-700 text-white text-[10px] font-bold py-0.5 px-2 rounded-full text-center shadow-xs">
                  المعتمدة حالياً
                </span>
              </div>

              <div className="space-y-2 text-xs text-purple-900 flex-1">
                <h4 className="font-black text-base">رمز الهوية الموحدة للمتطوعات بالعسيلة</h4>
                <p className="text-neutral-600 leading-relaxed">
                  يضمن هذا الإعداد حماية الخصوصية ومطابقة معايير الحشمة المعتمدة للعمل التطوعي، مع الحفاظ على الرونق الرسمي لبطاقة العضوية والتحقق الرقمي.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-[11px] bg-purple-200/70 text-purple-950 font-bold px-2.5 py-1 rounded-lg">
                    ✓ معتمدة في قوالب الإناث
                  </span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg">
                    ✓ سارية على البطاقات المصدرة
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Sample Selector */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-2">أو اختر من النماذج المعتمدة الجاهزة:</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    name: "رمز الظل الوقور",
                    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
                  },
                  {
                    name: "شعار التطوع النسائي",
                    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
                  },
                  {
                    name: "أيقونة الهوية الرسمية",
                    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80"
                  }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTempFemalePhotoInput(preset.url)}
                    className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      tempFemalePhotoInput === preset.url
                        ? "border-purple-600 bg-purple-50 ring-2 ring-purple-300"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    <img src={preset.url} alt={preset.name} className="w-14 h-14 rounded-xl object-cover" />
                    <span className="text-[10px] font-bold text-neutral-700">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input Field */}
            <div>
              <ImageUploadField
                label="الصورة الموحدة المخصصة (رفع ملف مباشر)"
                description="ارفع الصورة الموحدة من جهازك أو اسحبها هنا لاعتمادها في بطاقات المتطوعات"
                value={tempFemalePhotoInput}
                onChange={(val) => setTempFemalePhotoInput(val)}
                previewAspect="circle"
              />
            </div>

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                id="btn-save-female-unified-photo"
                onClick={handleSaveFemaleUnifiedPhoto}
                className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ الصورة الموحدة واعتمادها</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal for QR Scan View */}
      <CardVerificationModal
        isOpen={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        volunteer={volunteerForVerification}
        teams={teams}
        departments={departments}
        femaleUnifiedPhotoUrl={femaleUnifiedPhoto}
      />
    </div>
  );
};
