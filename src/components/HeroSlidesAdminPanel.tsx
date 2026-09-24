import React, { useState, useMemo } from "react";
import { 
  Image as ImageIcon, Plus, Trash2, Edit3, Eye, EyeOff, 
  ArrowUp, ArrowDown, Star, Sparkles, Check, AlertCircle, 
  Save, Play, Pause, Layers, ExternalLink, X, MoveVertical
} from "lucide-react";
import { HeroSlide } from "../types";
import { ImageUploadField } from "./ImageUploadField";

interface HeroSlidesAdminPanelProps {
  slides: HeroSlide[];
  onAddSlide: (slide: Partial<HeroSlide>) => Promise<boolean>;
  onDeleteSlide: (id: string) => Promise<boolean>;
  onToggleSlideActive: (id: string, isActive?: boolean) => Promise<boolean>;
  onBatchUpdateSlides: (slides: HeroSlide[]) => Promise<boolean>;
  lang?: "ar" | "en";
}

export const HeroSlidesAdminPanel: React.FC<HeroSlidesAdminPanelProps> = ({
  slides = [],
  onAddSlide,
  onDeleteSlide,
  onToggleSlideActive,
  onBatchUpdateSlides,
  lang = "ar"
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewActiveIndex, setPreviewActiveIndex] = useState(0);
  const [isPreviewPaused, setIsPreviewPaused] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    id?: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl: string;
    order: number;
    isActive: boolean;
  }>({
    title: "",
    subtitle: "",
    imageUrl: "",
    linkUrl: "",
    order: 1,
    isActive: true
  });

  // Sorted slides
  const sortedSlides = useMemo(() => {
    return [...(slides || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [slides]);

  // Active slides for preview
  const activeSlides = useMemo(() => {
    return sortedSlides.filter(s => s.isActive !== false);
  }, [sortedSlides]);

  // Preview Auto-play every 1 second
  React.useEffect(() => {
    if (activeSlides.length <= 1 || isPreviewPaused) return;

    const timer = setInterval(() => {
      setPreviewActiveIndex(prev => (prev + 1) % activeSlides.length);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeSlides.length, isPreviewPaused]);

  // Open modal for new slide
  const handleOpenAdd = () => {
    setEditingSlide(null);
    setFormData({
      title: "",
      subtitle: "",
      imageUrl: "",
      linkUrl: "",
      order: sortedSlides.length + 1,
      isActive: true
    });
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (slide: HeroSlide) => {
    setEditingSlide(slide);
    setFormData({
      id: slide.id,
      title: slide.title || "",
      subtitle: slide.subtitle || "",
      imageUrl: slide.imageUrl || "",
      linkUrl: slide.linkUrl || "",
      order: slide.order || 1,
      isActive: slide.isActive !== false
    });
    setIsModalOpen(true);
  };

  // Submit slide form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl.trim()) {
      alert(lang === "ar" ? "يرجى رفع أو وضع رابط صورة الشريحة" : "Please provide an image");
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<HeroSlide> = {
        ...(editingSlide ? { id: editingSlide.id } : {}),
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        imageUrl: formData.imageUrl.trim(),
        linkUrl: formData.linkUrl.trim(),
        order: Number(formData.order) || 1,
        isActive: formData.isActive
      };

      const ok = await onAddSlide(payload);
      if (ok) {
        setIsModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Move slide up or down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sortedSlides.length) return;

    const list = [...sortedSlides];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    const updated = list.map((item, idx) => ({
      ...item,
      order: idx + 1
    }));

    await onBatchUpdateSlides(updated);
  };

  // Set as first slide (order = 1)
  const handleSetAsFirst = async (slideId: string) => {
    const target = sortedSlides.find(s => s.id === slideId);
    if (!target) return;

    const otherSlides = sortedSlides.filter(s => s.id !== slideId);
    const reordered = [target, ...otherSlides].map((item, idx) => ({
      ...item,
      order: idx + 1
    }));

    await onBatchUpdateSlides(reordered);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-teal-700/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "معرض الصور المتحرك في الواجهة الرئيسية" : "Hero Image Slider"}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight">
              {lang === "ar" ? "إدارة صور الصفحة الرئيسية" : "Hero Slides Management"}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-2xl font-medium leading-relaxed">
              {lang === "ar"
                ? "إضافة وحذف وترتيب صور الواجهة الرئيسية. تتقلب الصور كل ثانية تلقائياً، وتدعم التمرير اليدوي والسحب باللمس للهواتف الذكية."
                : "Manage homepage hero slides with 1s auto-play, manual controls, and mobile swipe support."}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 text-xs font-black shadow-lg transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === "ar" ? "إضافة صورة جديدة" : "Add New Slide"}</span>
          </button>
        </div>
      </div>

      {/* Real-time Slider Preview Box */}
      {activeSlides.length > 0 && (
        <div className="p-4 sm:p-6 bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-black text-neutral-900 dark:text-white">
                {lang === "ar" ? "معاينة حية ومباشرة لمعرض الواجهة (تقليب كل ثانية 1s)" : "Live Slider Preview (1s Interval)"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPreviewPaused(!isPreviewPaused)}
              className="px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 cursor-pointer"
            >
              {isPreviewPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPreviewPaused ? (lang === "ar" ? "استئناف" : "Resume") : (lang === "ar" ? "إيقاف مؤقت" : "Pause")}</span>
            </button>
          </div>

          <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-inner">
            {activeSlides.map((slide, idx) => {
              const isCurrent = idx === (previewActiveIndex % activeSlides.length);
              return (
                <div
                  key={slide.id || idx}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    isCurrent ? "opacity-100 z-10" : "opacity-0 z-0"
                  }`}
                >
                  <img
                    src={slide.imageUrl}
                    alt={slide.title || "معاينة"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  
                  {/* Overlay text in preview */}
                  <div className="absolute bottom-4 right-4 left-4 text-white z-20">
                    {slide.title && (
                      <h4 className="text-sm sm:text-base font-black drop-shadow-md">
                        {slide.title}
                      </h4>
                    )}
                    {slide.subtitle && (
                      <p className="text-xs text-neutral-200 drop-shadow-xs line-clamp-1">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Dots in preview */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/50 backdrop-blur-xs">
              {activeSlides.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === (previewActiveIndex % activeSlides.length)
                      ? "w-4 bg-emerald-400"
                      : "w-1.5 bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Slides Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>{lang === "ar" ? `قائمة صور الواجهة (${sortedSlides.length})` : `Slides List (${sortedSlides.length})`}</span>
          </h3>
          <span className="text-xs text-neutral-500 font-medium">
            {lang === "ar" ? "رتب الصور حسب أولوية العرض باستخدام الأسهم أو تعيين كصورة أولى" : "Order slides using arrows"}
          </span>
        </div>

        {sortedSlides.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700">
            <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
            <h4 className="text-sm font-black text-neutral-800 dark:text-neutral-200">
              {lang === "ar" ? "لا توجد صور في المعرض حالياً" : "No slides added"}
            </h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              {lang === "ar" ? "أضف صورك الأولى ليتم عرضها في السلايدر المتحرك في أعلى الصفحة الرئيسية." : "Upload images to populate the hero slider."}
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 mx-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === "ar" ? "إضافة صورة" : "Add Slide"}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSlides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`group bg-white dark:bg-neutral-800 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col ${
                  slide.isActive === false
                    ? "opacity-60 border-dashed border-neutral-300 dark:border-neutral-700"
                    : "border-neutral-200 dark:border-neutral-700 shadow-xs hover:shadow-md"
                }`}
              >
                {/* Image Preview Banner */}
                <div className="relative h-44 bg-neutral-900 overflow-hidden">
                  <img
                    src={slide.imageUrl}
                    alt={slide.title || `شريحة ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                  {/* Order Badge & First Slide Indicator */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white font-mono font-bold text-xs border border-white/20">
                      #{slide.order || idx + 1}
                    </span>
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-bold text-[10px] shadow-sm">
                        <Star className="w-3 h-3 fill-neutral-950" />
                        <span>{lang === "ar" ? "الصورة الأولى" : "First"}</span>
                      </span>
                    )}
                  </div>

                  {/* Active / Hidden Status Pill */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      slide.isActive !== false
                        ? "bg-emerald-500/90 text-white"
                        : "bg-neutral-700/90 text-neutral-300"
                    }`}>
                      {slide.isActive !== false ? (lang === "ar" ? "مفعلة" : "Active") : (lang === "ar" ? "معطلة" : "Inactive")}
                    </span>
                  </div>

                  {/* Overlay Title */}
                  <div className="absolute bottom-2.5 right-3 left-3 text-white">
                    <h5 className="font-bold text-xs line-clamp-1">
                      {slide.title || (lang === "ar" ? `صورة بدون عنوان (#${idx + 1})` : `Slide #${idx + 1}`)}
                    </h5>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  {slide.subtitle ? (
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2">
                      {slide.subtitle}
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-400 italic">
                      {lang === "ar" ? "بدون نص فرعي" : "No subtitle"}
                    </p>
                  )}

                  {/* Action Controls */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-700/60 flex items-center justify-between gap-2">
                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(idx, 'up')}
                        disabled={idx === 0}
                        title={lang === "ar" ? "تقديم" : "Move Up"}
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(idx, 'down')}
                        disabled={idx === sortedSlides.length - 1}
                        title={lang === "ar" ? "تأخير" : "Move Down"}
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetAsFirst(slide.id)}
                          title={lang === "ar" ? "تعيين كأول صورة تظهر للزوار" : "Set as first"}
                          className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Star className="w-3 h-3" />
                          <span className="hidden sm:inline">{lang === "ar" ? "أول صورة" : "First"}</span>
                        </button>
                      )}
                    </div>

                    {/* Edit, Toggle, Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleSlideActive(slide.id, !slide.isActive)}
                        title={slide.isActive !== false ? (lang === "ar" ? "تعطيل الشريحة" : "Disable") : (lang === "ar" ? "تفعيل الشريحة" : "Enable")}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          slide.isActive !== false
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 hover:bg-emerald-100"
                            : "bg-neutral-100 dark:bg-neutral-700 text-neutral-400 hover:bg-neutral-200"
                        }`}
                      >
                        {slide.isActive !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(slide)}
                        title={lang === "ar" ? "تعديل الشريحة" : "Edit"}
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-emerald-50 hover:text-emerald-600 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(lang === "ar" ? "هل أنت متأكد من حذف هذه الصورة من السلايدر؟" : "Delete slide?")) {
                            onDeleteSlide(slide.id);
                          }
                        }}
                        title={lang === "ar" ? "حذف الصورة" : "Delete"}
                        className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-700 hover:bg-rose-50 hover:text-rose-600 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Slide Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8">
            <div className="p-5 sm:p-6 bg-gradient-to-r from-teal-700 to-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5" />
                <h3 className="text-base sm:text-lg font-black">
                  {editingSlide 
                    ? (lang === "ar" ? "تعديل صورة بالواجهة" : "Edit Slide") 
                    : (lang === "ar" ? "إضافة صورة جديدة لمعرض الواجهة" : "Add New Slide")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Image Upload Field */}
              <ImageUploadField
                label={lang === "ar" ? "صورة الشريحة (مقاس مقترح 16:9 أو دقة عالية) *" : "Slide Image *"}
                value={formData.imageUrl}
                onChange={(val) => setFormData({ ...formData, imageUrl: val })}
                description={lang === "ar" ? "ارفع صورة من جهازك بدقة عالية أو الصق رابط الصورة" : "Upload high-res banner photo"}
                previewAspect="video"
              />

              {/* Title & Subtitle */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "عنوان فرعي أو شارة تظهر على الصورة (اختياري)" : "Slide Tag / Title"}
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder={lang === "ar" ? "مثال: مبادرات موسم رمضان المبارك" : "Title"}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "وصف مختصر أو نبذة (اختياري)" : "Subtitle / Description"}
                  </label>
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                    placeholder={lang === "ar" ? "مثال: استمرار مشاريع سقيا الماء وتوزيع السلال الغذائية بمكة المكرمة" : "Subtitle"}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              {/* Order & Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    {lang === "ar" ? "ترتيب الظهور في السلايدر" : "Order"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-neutral-900 dark:text-white font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mt-5">
                  <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    {lang === "ar" ? "تفعيل الصورة بالمعرض" : "Enable Slide"}
                  </span>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 text-xs font-bold cursor-pointer"
                >
                  {lang === "ar" ? "إلغاء" : "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? (lang === "ar" ? "جاري الحفظ..." : "Saving...") : (lang === "ar" ? "حفظ الشريحة" : "Save")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
