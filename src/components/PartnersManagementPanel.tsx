import React, { useState, useMemo, useRef } from "react";
import {
  Globe, Plus, Edit3, Trash2, ArrowUp, ArrowDown, Eye, EyeOff,
  Star, ExternalLink, Image as ImageIcon, Upload, CheckCircle2,
  AlertTriangle, Search, Filter, ShieldCheck, RefreshCw, X,
  Layers, Award, HeartHandshake, Sparkles, Link2, GripVertical
} from "lucide-react";
import { PartnerItem } from "../types";
import { getCategoryBadgeStyle } from "./PartnersSlider";

interface PartnersManagementPanelProps {
  partners: PartnerItem[];
  onAddPartner: (partner: Partial<PartnerItem>) => Promise<boolean>;
  onDeletePartner: (partnerId: string) => Promise<boolean>;
  onBatchUpdatePartners?: (partnersList: PartnerItem[]) => Promise<boolean>;
  lang?: "ar" | "en";
  isDark?: boolean;
}

// Partnership Categories List as requested
export const PARTNERSHIP_CATEGORIES = [
  "شريك استراتيجي",
  "شريك داعم",
  "شريك مجتمعي",
  "شريك إعلامي",
  "شريك لوجستي",
  "شريك تقني",
  "شريك نجاح",
  "شريك آخر"
];

export const PartnersManagementPanel: React.FC<PartnersManagementPanelProps> = ({
  partners = [],
  onAddPartner,
  onDeletePartner,
  onBatchUpdatePartners,
  lang = "ar",
  isDark = false
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [link, setLink] = useState("");
  const [category, setCategory] = useState("شريك استراتيجي");
  const [customCategory, setCustomCategory] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [order, setOrder] = useState<number>(1);
  const [active, setActive] = useState(true);
  const [showInHome, setShowInHome] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [logoInputMode, setLogoInputMode] = useState<"file" | "url">("file");
  const [logoUrl, setLogoUrl] = useState("");

  // Sort partners by order
  const sortedPartners = useMemo(() => {
    return [...partners].sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 999;
      const orderB = typeof b.order === "number" ? b.order : 999;
      return orderA - orderB;
    });
  }, [partners]);

  // Filtered partners
  const filteredPartners = useMemo(() => {
    return sortedPartners.filter(p => {
      if (selectedCategoryFilter !== "all" && p.category !== selectedCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchAr = p.nameAr?.toLowerCase().includes(q);
        const matchEn = p.nameEn?.toLowerCase().includes(q);
        const matchDesc = p.descriptionAr?.toLowerCase().includes(q);
        const matchCat = p.category?.toLowerCase().includes(q);
        if (!matchAr && !matchEn && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [sortedPartners, selectedCategoryFilter, searchQuery]);

  // Open modal for Adding new partner
  const handleOpenAdd = () => {
    setEditingPartner(null);
    setNameAr("");
    setNameEn("");
    setLogoBase64("");
    setLogoUrl("");
    setLink("");
    setCategory("شريك استراتيجي");
    setCustomCategory("");
    setDescriptionAr("");
    setOrder(partners.length + 1);
    setActive(true);
    setShowInHome(true);
    setIsFeatured(false);
    setLogoInputMode("file");
    setIsModalOpen(true);
  };

  // Open modal for Editing existing partner
  const handleOpenEdit = (partner: PartnerItem) => {
    setEditingPartner(partner);
    setNameAr(partner.nameAr || "");
    setNameEn(partner.nameEn || "");
    setLogoBase64(partner.logo || "");
    setLogoUrl(partner.logo?.startsWith("http") ? partner.logo : "");
    setLink(partner.link || "");
    
    if (PARTNERSHIP_CATEGORIES.includes(partner.category || "")) {
      setCategory(partner.category || "شريك استراتيجي");
      setCustomCategory("");
    } else {
      setCategory("شريك آخر");
      setCustomCategory(partner.category || "");
    }

    setDescriptionAr(partner.descriptionAr || "");
    setOrder(typeof partner.order === "number" ? partner.order : 1);
    setActive(partner.active !== false);
    setShowInHome(partner.showInHome !== false);
    setIsFeatured(Boolean(partner.isFeatured));
    setLogoInputMode(partner.logo?.startsWith("data:") ? "file" : "file");
    setIsModalOpen(true);
  };

  // Handle local File upload for logo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميغابايت");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  // Handle Save Form (Add or Edit)
  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameAr.trim()) {
      alert("يرجى إدخال اسم الشريك بالعربية");
      return;
    }

    const finalLogo = logoBase64 || logoUrl;
    if (!finalLogo.trim()) {
      alert("يرجى رفع شعار الشريك من الجهاز أو إدخال رابطه");
      return;
    }

    const finalCategory = category === "شريك آخر" && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    setIsSubmitting(true);

    try {
      if (editingPartner) {
        const updatedItem: PartnerItem = {
          ...editingPartner,
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim() || nameAr.trim(),
          logo: finalLogo,
          link: link.trim(),
          category: finalCategory,
          descriptionAr: descriptionAr.trim(),
          order: Number(order) || 1,
          active,
          showInHome,
          isFeatured
        };

        if (onBatchUpdatePartners) {
          const updatedList = partners.map(p => p.id === editingPartner.id ? updatedItem : p);
          await onBatchUpdatePartners(updatedList);
        } else {
          await onAddPartner(updatedItem);
        }
      } else {
        const newItem: Partial<PartnerItem> = {
          nameAr: nameAr.trim(),
          nameEn: nameEn.trim() || nameAr.trim(),
          logo: finalLogo,
          link: link.trim(),
          category: finalCategory,
          descriptionAr: descriptionAr.trim(),
          order: Number(order) || partners.length + 1,
          active,
          showInHome,
          isFeatured
        };
        await onAddPartner(newItem);
      }

      setIsModalOpen(false);
      setEditingPartner(null);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ الشريك، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete with confirmation
  const handleDelete = async (partner: PartnerItem) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف الشريك "${partner.nameAr}"؟`)) {
      return;
    }
    await onDeletePartner(partner.id);
  };

  // Toggle Active visibility
  const handleToggleActive = async (partner: PartnerItem) => {
    const updated = partners.map(p => {
      if (p.id === partner.id) {
        return { ...p, active: p.active === false ? true : false };
      }
      return p;
    });

    if (onBatchUpdatePartners) {
      await onBatchUpdatePartners(updated);
    } else {
      await onAddPartner({ ...partner, active: partner.active === false });
    }
  };

  // Toggle Featured status
  const handleToggleFeatured = async (partner: PartnerItem) => {
    const updated = partners.map(p => {
      if (p.id === partner.id) {
        return { ...p, isFeatured: !p.isFeatured };
      }
      return p;
    });

    if (onBatchUpdatePartners) {
      await onBatchUpdatePartners(updated);
    } else {
      await onAddPartner({ ...partner, isFeatured: !partner.isFeatured });
    }
  };

  // Move partner up or down in order
  const handleMoveOrder = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedPartners.length) return;

    const listCopy = [...sortedPartners];
    const temp = listCopy[index];
    listCopy[index] = listCopy[targetIndex];
    listCopy[targetIndex] = temp;

    // Reassign orders sequentially 1..N
    const reordered = listCopy.map((p, idx) => ({
      ...p,
      order: idx + 1
    }));

    if (onBatchUpdatePartners) {
      await onBatchUpdatePartners(reordered);
    } else {
      for (const item of reordered) {
        await onAddPartner(item);
      }
    }
  };

  // HTML5 Drag and Drop handlers for partners reordering
  const [draggedPartnerId, setDraggedPartnerId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedPartnerId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedPartnerId || draggedPartnerId === targetId) return;

    const sourceIdx = sortedPartners.findIndex(p => p.id === draggedPartnerId);
    const targetIdx = sortedPartners.findIndex(p => p.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...sortedPartners];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    const updatedWithOrder = reordered.map((p, idx) => ({
      ...p,
      order: idx + 1
    }));

    setDraggedPartnerId(null);

    if (onBatchUpdatePartners) {
      await onBatchUpdatePartners(updatedWithOrder);
    } else {
      for (const item of updatedWithOrder) {
        await onAddPartner(item);
      }
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Banner / Command Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-md border border-emerald-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold border border-white/10 shadow-2xs">
            <Globe className="w-3.5 h-3.5 text-emerald-300" />
            <span>نظام إدارة شركاء النجاح والرعاة الموحد</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            إدارة شركاء النجاح والرعاة ({partners.length})
          </h2>
          <p className="text-xs text-emerald-100 leading-relaxed">
            التحكم الكامل في ظهور شركاء الجمعية بالصفحة الرئيسية، رفع الشعارات، تصنيف الشراكات، الترتيب، وإبراز الشركاء المميزين.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شريك جديد</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">إجمالي الشركاء</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{partners.length}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">نشط بالصفحة الرئيسية</span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {partners.filter(p => p.active !== false && p.showInHome !== false).length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">الشركاء المميزون</span>
          <span className="text-2xl font-black text-amber-500 font-mono">
            {partners.filter(p => p.isFeatured).length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">روابط مواقع مفعلة</span>
          <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">
            {partners.filter(p => p.link && p.link.trim() !== "").length}
          </span>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الشريك أو تصنيف الشراكة..."
              className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategoryFilter === "all"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              الكل ({partners.length})
            </button>
            {PARTNERSHIP_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategoryFilter === cat
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Partners List Table / Cards */}
      {filteredPartners.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
            <Globe className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-slate-800 dark:text-white">لا توجد نتائج مطابقة</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            لم يتم العثور على شركاء يطابقون خيارات البحث أو التصفية الحالية. يمكنك إضافة شريك جديد أو تعديل البحث.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة شريك الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner, idx) => {
            const badge = getCategoryBadgeStyle(partner.category);
            const BadgeIcon = badge.icon;
            const originalIndex = sortedPartners.findIndex(p => p.id === partner.id);
            const isFirst = originalIndex === 0;
            const isLast = originalIndex === sortedPartners.length - 1;

            return (
              <div
                key={partner.id || idx}
                draggable
                onDragStart={(e) => handleDragStart(e, partner.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, partner.id)}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all relative flex flex-col justify-between gap-4 cursor-grab active:cursor-grabbing ${
                  draggedPartnerId === partner.id
                    ? "opacity-40 scale-95 border-emerald-500 border-dashed"
                    : partner.isFeatured
                    ? "border-amber-400/80 dark:border-amber-500/60 shadow-md ring-1 ring-amber-400/30"
                    : "border-slate-200 dark:border-slate-800 hover:border-emerald-400 shadow-2xs"
                }`}
              >
                {/* Header: Drag Handle, Order, Category & Badges */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5" 
                      title="اسحب وأفلت لإعادة الترتيب (Drag & Drop)"
                    >
                      <GripVertical className="w-4 h-4" />
                    </span>
                    <span className="text-[11px] font-mono font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg">
                      #{partner.order || originalIndex + 1}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                      <BadgeIcon className="w-3 h-3" />
                      <span>{partner.category || "شريك نجاح"}</span>
                    </span>
                  </div>

                  {/* Featured Badge Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(partner)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      partner.isFeatured
                        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-500 border-amber-300 dark:border-amber-700"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-amber-500"
                    }`}
                    title={partner.isFeatured ? "شريك مميز (اضغط للإلغاء)" : "تمييز الشريك كشريك مميز"}
                  >
                    <Star className={`w-3.5 h-3.5 ${partner.isFeatured ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Partner Logo & Information */}
                <div className="space-y-3">
                  <div className="w-full h-28 bg-slate-50 dark:bg-slate-950 rounded-2xl p-3 flex items-center justify-center border border-slate-100 dark:border-slate-800/80 shadow-inner overflow-hidden">
                    <img
                      src={partner.logo}
                      alt={partner.nameAr}
                      className="max-h-full max-w-full object-contain filter drop-shadow-2xs"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop";
                      }}
                    />
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white leading-snug line-clamp-1">
                      {partner.nameAr}
                    </h4>
                    {partner.nameEn && (
                      <p className="text-[11px] text-slate-400 font-sans truncate">
                        {partner.nameEn}
                      </p>
                    )}
                  </div>

                  {partner.descriptionAr && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {partner.descriptionAr}
                    </p>
                  )}

                  {partner.link ? (
                    <a
                      href={partner.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{partner.link}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">لا يوجد رابط موقع مسجل</span>
                  )}
                </div>

                {/* Action Controls Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* Reorder Arrows */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => handleMoveOrder(originalIndex, "up")}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="تقديم الشريك للأمام (أعلى)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => handleMoveOrder(originalIndex, "down")}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                      title="تأخير الشريك للخلف (أسفل)"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Visibility & Edit/Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(partner)}
                      className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        partner.active !== false
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}
                      title={partner.active !== false ? "معروض في الموقع (اضغط للإخفاء)" : "مخفي من الموقع (اضغط للإظهار)"}
                    >
                      {partner.active !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(partner)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all border border-emerald-200/60 dark:border-emerald-800/60"
                      title="تعديل بيانات الشريك والشعار"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(partner)}
                      className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-600 dark:text-rose-400 transition-all cursor-pointer border border-rose-200/60 dark:border-rose-800/60"
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

      {/* Add / Edit Partner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 text-right my-8" dir="rtl">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {editingPartner ? "تعديل بيانات شريك النجاح" : "إضافة شريك نجاح جديد"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    أدخل بيانات الجهة وارفع شعارها للعرض في سلايدر شركاء النجاح بالصفحة الرئيسية
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePartner} className="space-y-4">
              {/* Partner Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الشريك (عربي) * :
                  </label>
                  <input
                    type="text"
                    required
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: مؤسسة سليمان الراجحي الخيرية"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    اسم الشريك (إنجليزي):
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Sulaiman Al Rajhi Foundation"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Partnership Category (Select with Custom Option) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  نوع الشراكة والتصنيف * :
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  {PARTNERSHIP_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        category === cat
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs font-black"
                          : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {category === "شريك آخر" && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="اكتب نوع الشراكة المخصص هنا..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-500 bg-emerald-50/30 text-slate-900 dark:text-white focus:outline-none"
                  />
                )}
              </div>

              {/* Logo Upload Section (File upload from device primary) */}
              <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>شعار الشريك (رفع صورة فعلية من الجهاز) * :</span>
                  </label>
                  <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setLogoInputMode("file")}
                      className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                        logoInputMode === "file" ? "bg-emerald-600 text-white" : "text-slate-500"
                      }`}
                    >
                      رفع ملف من الجهاز
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogoInputMode("url")}
                      className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                        logoInputMode === "url" ? "bg-emerald-600 text-white" : "text-slate-500"
                      }`}
                    >
                      أو رابط صورة
                    </button>
                  </div>
                </div>

                {logoInputMode === "file" ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer transition-all bg-white dark:bg-slate-900 group"
                    >
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-500 mx-auto mb-1 transition-colors" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        اضغط هنا لاختيار ورفع شعار الشريك من جهازك
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        يدعم صيغ PNG, JPG, WebP, SVG (يفضل خلفية شفافة أو بيضاء)
                      </p>
                    </div>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => {
                      setLogoUrl(e.target.value);
                      setLogoBase64(e.target.value);
                    }}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    dir="ltr"
                  />
                )}

                {/* Logo Live Preview */}
                {(logoBase64 || logoUrl) && (
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="w-14 h-14 bg-slate-100 dark:bg-slate-950 rounded-lg p-1.5 flex items-center justify-center border border-slate-200 dark:border-slate-800 shrink-0">
                      <img
                        src={logoBase64 || logoUrl}
                        alt="معاينة الشعار"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم تجهيز الشعار بنجاح للمعاينة والحفظ</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLogoBase64("");
                          setLogoUrl("");
                        }}
                        className="text-[10px] text-rose-500 hover:underline mt-0.5 cursor-pointer"
                      >
                        إزالة الشعار وتغييره
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Website Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رابط الموقع الإلكتروني للشريك (اختياري - يظهر زر زيارة الموقع):
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://example.org.sa"
                    className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Brief Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  وصف مختصر عن الشراكة وأثرها (اختياري):
                </label>
                <textarea
                  rows={2}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                  placeholder="نبذة مختصرة عن دور الشريك في رعاية ودعم مشاريع ريادة العطاء..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              {/* Settings: Order, Active, ShowInHome, isFeatured */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ترتيب الظهور بالسلايدر (رقم):
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white block">شريك مميز (★)</span>
                    <span className="text-[10px] text-slate-400">إعطاء بطاقة الشريك إطاراً ذهبياً فخماً</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer"
                  />
                </div>
              </div>

              {/* Toggles: Active & ShowInHome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تفعيل الشريك (نشط)</span>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 cursor-pointer">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">الظهور في الصفحة الرئيسية</span>
                  <input
                    type="checkbox"
                    checked={showInHome}
                    onChange={(e) => setShowInHome(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer"
                  />
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "جارٍ الحفظ..." : editingPartner ? "حفظ التعديلات" : "إضافة الشريك الآن"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2.5 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
