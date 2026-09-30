import React, { useState, useMemo, useEffect } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Home,
  Search,
  Filter,
  Calendar,
  Tag,
  Play,
  Image as ImageIcon,
  Video,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles,
  Layers,
  LayoutDashboard,
  HeartHandshake,
  Shield,
  Briefcase,
  Users,
  Package,
  UserCheck
} from "lucide-react";
import { GalleryItem } from "../types";

interface FullGalleryPageProps {
  galleryList: GalleryItem[];
  lang: "ar" | "en";
  isDark: boolean;
  onBackToHome: () => void;
  authenticatedUser?: any | null;
  onReturnToDashboard?: () => void;
}

export const FullGalleryPage: React.FC<FullGalleryPageProps> = ({
  galleryList,
  lang,
  isDark,
  onBackToHome,
  authenticatedUser,
  onReturnToDashboard
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "photo" | "video">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "title">("newest");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Available categories based on actual items
  const categories = [
    { id: "all", labelAr: "كافة المواد الإعلامية", labelEn: "All Media" },
    { id: "مبادرات", labelAr: "المبادرات الميدانية", labelEn: "Field Initiatives" },
    { id: "مشاريع", labelAr: "المشاريع والبرامج", labelEn: "Projects & Programs" },
    { id: "فعاليات", labelAr: "الفعاليات والأنشطة", labelEn: "Events & Activities" },
    { id: "إعلام", labelAr: "التغطيات والبيانات الصحفية", labelEn: "Media Coverage" }
  ];

  // Helper for dashboard return button
  const getReturnInfo = () => {
    if (!authenticatedUser) return null;
    const role = authenticatedUser.role;
    if (role === "admin") {
      return { label: lang === "ar" ? "العودة إلى لوحة التحكم" : "Return to Control Panel", icon: LayoutDashboard };
    }
    if (role === "volunteer") {
      return { label: lang === "ar" ? "العودة إلى صفحة المتطوع" : "Return to Volunteer Page", icon: HeartHandshake };
    }
    if (role === "department_admin") {
      const isMedia = authenticatedUser.departmentId === "dep-6" || (authenticatedUser.departmentName || "").includes("إعلام");
      return {
        label: isMedia 
          ? (lang === "ar" ? "العودة إلى إدارة الإعلام" : "Return to Media Dept")
          : (lang === "ar" ? "العودة إلى لوحة الإدارة" : "Return to Department"),
        icon: Shield
      };
    }
    if (role === "employee") {
      return { label: lang === "ar" ? "العودة إلى لوحة العمل" : "Return to Staff Desk", icon: Briefcase };
    }
    if (role === "leader") {
      return { label: lang === "ar" ? "العودة إلى لوحة الفريق" : "Return to Team Portal", icon: Users };
    }
    if (role === "storekeeper") {
      return { label: lang === "ar" ? "العودة إلى لوحة المستودع" : "Return to Warehouse", icon: Package };
    }
    if (role === "beneficiary") {
      return { label: lang === "ar" ? "العودة إلى بوابة المستفيد" : "Return to Beneficiary Portal", icon: UserCheck };
    }
    return { label: lang === "ar" ? "العودة إلى حسابي" : "Return to Account", icon: LayoutDashboard };
  };

  const returnInfo = getReturnInfo();

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return galleryList.filter((item) => {
      // Media type filter
      if (mediaTypeFilter === "photo" && item.type !== "photo") return false;
      if (mediaTypeFilter === "video" && item.type !== "video") return false;

      // Category filter
      if (selectedCategory !== "all") {
        const itemCat = item.category || (item.titleAr.includes("مبادرة") ? "مبادرات" : item.titleAr.includes("مشروع") ? "مشاريع" : "فعاليات");
        if (!itemCat.includes(selectedCategory)) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitleAr = item.titleAr?.toLowerCase().includes(query);
        const matchTitleEn = item.titleEn?.toLowerCase().includes(query);
        const matchDesc = item.descriptionAr?.toLowerCase().includes(query);
        const matchDate = item.date?.toLowerCase().includes(query);
        if (!matchTitleAr && !matchTitleEn && !matchDesc && !matchDate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortOrder === "newest") {
        return (b.date || "").localeCompare(a.date || "");
      }
      if (sortOrder === "oldest") {
        return (a.date || "").localeCompare(b.date || "");
      }
      if (sortOrder === "title") {
        return (a.titleAr || "").localeCompare(b.titleAr || "");
      }
      return 0;
    });
  }, [galleryList, mediaTypeFilter, selectedCategory, searchQuery, sortOrder]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedItemIndex === null) return;
      if (e.key === "Escape") {
        setSelectedItemIndex(null);
      } else if (e.key === "ArrowLeft") {
        // In RTL, left arrow goes to next item
        setSelectedItemIndex((prev) => (prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowRight") {
        // In RTL, right arrow goes to previous item
        setSelectedItemIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItemIndex, filteredItems.length]);

  const activeModalItem = selectedItemIndex !== null ? filteredItems[selectedItemIndex] : null;

  return (
    <div className={`min-h-screen ${isDark ? "bg-neutral-950 text-neutral-100" : "bg-neutral-50 text-neutral-900"} font-sans`} dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* 1. TOP STICKY NAVIGATION BAR */}
      <div className={`sticky top-0 z-30 border-b backdrop-blur-md ${isDark ? "bg-neutral-900/90 border-neutral-800" : "bg-white/95 border-neutral-200"} shadow-xs`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
          {/* Breadcrumb & Home Link */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800/80 transition-all cursor-pointer shadow-2xs"
            >
              <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{lang === "ar" ? "العودة إلى الصفحة الرئيسية" : "Back to Home"}</span>
            </button>

            <span className="text-neutral-400 dark:text-neutral-600 text-xs hidden sm:inline">/</span>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>{lang === "ar" ? "المركز الإعلامي الرسمي" : "Official Media Center"}</span>
            </div>
          </div>

          {/* Quick Return to Dashboard (If Authenticated User) */}
          {authenticatedUser && onReturnToDashboard && returnInfo && (
            <button
              type="button"
              onClick={onReturnToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer"
              title={returnInfo.label}
            >
              <returnInfo.icon className="w-4 h-4" />
              <span>{returnInfo.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. HERO PAGE HEADER */}
      <div className={`relative overflow-hidden border-b ${isDark ? "bg-gradient-to-b from-neutral-900 via-neutral-900 to-neutral-950 border-neutral-800" : "bg-gradient-to-b from-emerald-900 via-neutral-900 to-neutral-950 text-white border-neutral-800"} py-12 sm:py-16`}>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === "ar" ? "إدارة الإعلام والتوثيق الميداني - ترخيص 5081" : "Media Department & Documentation - Lic. 5081"}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {lang === "ar" ? "معرض الصور والأرشيف المرئي الشامل" : "Comprehensive Media & Photo Gallery"}
          </h1>

          <p className="max-w-3xl mx-auto text-xs sm:text-sm text-neutral-300 leading-relaxed">
            {lang === "ar"
              ? "توثيق رسمي شامل لكافة مبادرات ومشاريع وأنشطة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة في مكة المكرمة، بإشراف وتنظيم إدارة الإعلام بالجمعية."
              : "Comprehensive visual documentation of all charitable and developmental initiatives organized by Reyadat Al-Ata Association in Mecca, managed by the Media Department."}
          </p>

          {/* Key Stats Counter */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-white">
            <div className="bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 min-w-[110px]">
              <span className="block text-xl sm:text-2xl font-black text-emerald-400 font-mono">{galleryList.length}</span>
              <span className="text-[10px] text-neutral-300 font-medium">{lang === "ar" ? "إجمالي المواد الموثقة" : "Total Media Items"}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 min-w-[110px]">
              <span className="block text-xl sm:text-2xl font-black text-teal-400 font-mono">
                {galleryList.filter((g) => g.type === "photo").length}
              </span>
              <span className="text-[10px] text-neutral-300 font-medium">{lang === "ar" ? "ألبوم صور ميداني" : "Photo Albums"}</span>
            </div>
            <div className="bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 min-w-[110px]">
              <span className="block text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {galleryList.filter((g) => g.type === "video").length}
              </span>
              <span className="text-[10px] text-neutral-300 font-medium">{lang === "ar" ? "توثيق مرئي وفيديو" : "Video Archives"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FILTER & SEARCH CONTROL TOOLBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className={`p-4 sm:p-5 rounded-3xl border ${isDark ? "bg-neutral-900/80 border-neutral-800" : "bg-white border-neutral-200"} shadow-xs space-y-4`}>
          {/* Top row: Search bar & Sort selector */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === "ar" ? "ابحث في معرض الصور والمبادرات..." : "Search media archive..."}
                className={`w-full pr-10 pl-4 py-2.5 text-xs rounded-xl border ${isDark ? "bg-neutral-950 border-neutral-800 text-white placeholder-neutral-500 focus:border-emerald-500" : "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-emerald-600"} focus:outline-none transition-all`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Media Type Filter (Photos / Videos / All) */}
            <div className={`flex p-1 rounded-xl border ${isDark ? "bg-neutral-950 border-neutral-800" : "bg-neutral-100 border-neutral-200"} shrink-0`}>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("all")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${mediaTypeFilter === "all" ? "bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
              >
                {lang === "ar" ? "الكل" : "All"} ({galleryList.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("photo")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${mediaTypeFilter === "photo" ? "bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "صور" : "Photos"}</span>
              </button>
              <button
                type="button"
                onClick={() => setMediaTypeFilter("video")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${mediaTypeFilter === "video" ? "bg-white dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"}`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "فيديو" : "Videos"}</span>
              </button>
            </div>

            {/* Sort Order Selector */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-[11px] text-neutral-500 font-bold whitespace-nowrap">{lang === "ar" ? "الترتيب:" : "Sort:"}</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className={`text-xs font-bold px-3 py-2 rounded-xl border ${isDark ? "bg-neutral-950 border-neutral-800 text-white" : "bg-neutral-50 border-neutral-200 text-neutral-800"} focus:outline-none cursor-pointer`}
              >
                <option value="newest">{lang === "ar" ? "الأحدث تاريخاً" : "Newest First"}</option>
                <option value="oldest">{lang === "ar" ? "الأقدم تاريخاً" : "Oldest First"}</option>
                <option value="title">{lang === "ar" ? "أبجدياً (العنوان)" : "By Title"}</option>
              </select>
            </div>
          </div>

          {/* Category Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                  selectedCategory === cat.id
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm font-black"
                    : isDark
                    ? "bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800"
                    : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                }`}
              >
                {lang === "ar" ? cat.labelAr : cat.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* 4. GALLERY ITEMS GRID */}
        {filteredItems.length === 0 ? (
          <div className={`text-center py-20 rounded-3xl border ${isDark ? "bg-neutral-900/40 border-neutral-800 text-neutral-400" : "bg-white border-neutral-200 text-neutral-500"} p-8 space-y-3`}>
            <ImageIcon className="w-12 h-12 mx-auto text-neutral-400" />
            <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">
              {lang === "ar" ? "لم يتم العثور على مواد مطابقة لمعايير البحث" : "No matching media found"}
            </h3>
            <p className="text-xs max-w-md mx-auto">
              {lang === "ar" ? "جرب تغيير كلمات البحث أو اختيار تصنيف آخر لعرض محتويات المعرض." : "Try clearing filters or searching with different terms."}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setMediaTypeFilter("all");
              }}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              {lang === "ar" ? "إعادة ضبط الفلاتر" : "Reset Filters"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => (
              <div
                key={item.id || index}
                onClick={() => setSelectedItemIndex(index)}
                className={`group relative rounded-3xl overflow-hidden border cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
                  isDark ? "bg-neutral-900 border-neutral-800 hover:border-emerald-600/50" : "bg-white border-neutral-200 hover:border-emerald-500"
                } flex flex-col justify-between`}
              >
                {/* Visual Media Canvas */}
                <div className="relative h-56 w-full overflow-hidden bg-neutral-950 flex items-center justify-center">
                  {item.type === "photo" ? (
                    <img
                      src={item.url}
                      alt={item.titleAr}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full relative">
                      <video
                        src={item.url}
                        muted
                        playsInline
                        loop
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-neutral-950/40 group-hover:bg-neutral-950/20 transition-all flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-115 transition-transform">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Badges on Top */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-900/80 backdrop-blur-md text-white border border-white/10 flex items-center gap-1">
                      {item.type === "video" ? <Video className="w-3 h-3 text-emerald-400" /> : <ImageIcon className="w-3 h-3 text-teal-400" />}
                      <span>{item.type === "video" ? (lang === "ar" ? "فيديو" : "Video") : (lang === "ar" ? "صورة" : "Photo")}</span>
                    </span>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600/90 backdrop-blur-md text-white shadow-xs">
                      {item.category || (lang === "ar" ? "مبادرات ومشاريع" : "Initiatives")}
                    </span>
                  </div>

                  {/* Expand Hover Hint */}
                  <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
                    <div className="bg-white/90 text-neutral-900 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg">
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{lang === "ar" ? "تكبير وعرض التفاصيل" : "Click to Enlarge"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Text Information */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-500" />
                      <span>{item.date || "2026"}</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                      {lang === "ar" ? "إدارة الإعلام" : "Media Dept"}
                    </span>
                  </div>

                  <h3 className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-white line-clamp-2 leading-snug">
                    {lang === "ar" ? item.titleAr : (item.titleEn || item.titleAr)}
                  </h3>

                  {item.descriptionAr && (
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                      {item.descriptionAr}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. INTERACTIVE FULL-SIZE LIGHTBOX MODAL */}
      {activeModalItem && selectedItemIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-hidden">
          {/* Modal Container */}
          <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-950/80">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white">
                  {activeModalItem.category || (lang === "ar" ? "مبادرة وتغطية إعلامية" : "Media Coverage")}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  {lang === "ar" ? `مادة ${selectedItemIndex + 1} من ${filteredItems.length}` : `Item ${selectedItemIndex + 1} of ${filteredItems.length}`}
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedItemIndex(null)}
                className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                title={lang === "ar" ? "إغلاق النافذة (ESC)" : "Close (ESC)"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Player / Canvas with Next & Prev Controls */}
            <div className="relative flex-1 bg-black min-h-[300px] sm:min-h-[460px] flex items-center justify-center overflow-hidden">
              {activeModalItem.type === "photo" ? (
                <img
                  src={activeModalItem.url}
                  alt={activeModalItem.titleAr}
                  className="max-h-[65vh] w-auto object-contain mx-auto select-none"
                />
              ) : (
                <video
                  src={activeModalItem.url}
                  controls
                  autoPlay
                  className="max-h-[65vh] w-full object-contain mx-auto"
                />
              )}

              {/* Prev Button (In RTL, prev is right arrow) */}
              <button
                type="button"
                onClick={() => setSelectedItemIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : filteredItems.length - 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-emerald-600 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs border border-white/10"
                title={lang === "ar" ? "العنصر السابق" : "Previous"}
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Next Button (In RTL, next is left arrow) */}
              <button
                type="button"
                onClick={() => setSelectedItemIndex((prev) => (prev !== null && prev < filteredItems.length - 1 ? prev + 1 : 0))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-emerald-600 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs border border-white/10"
                title={lang === "ar" ? "العنصر التالي" : "Next"}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Footer / Item Details */}
            <div className="p-5 border-t border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-bold text-white">
                    {lang === "ar" ? activeModalItem.titleAr : (activeModalItem.titleEn || activeModalItem.titleAr)}
                  </h2>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono">
                    {activeModalItem.date}
                  </span>
                </div>
                {activeModalItem.descriptionAr && (
                  <p className="text-xs text-neutral-300 leading-relaxed max-w-2xl">
                    {activeModalItem.descriptionAr}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={activeModalItem.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-neutral-700"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "فتح بالحجم الكامل" : "Open Original"}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
