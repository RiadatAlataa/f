import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ChevronLeft, ChevronRight, ExternalLink, Star, Globe, 
  Pause, Play, Sparkles, ShieldCheck, Award, HeartHandshake,
  Layers, CheckCircle2, Shield
} from "lucide-react";
import { PartnerItem } from "../types";

interface PartnersSliderProps {
  partners: PartnerItem[];
  lang?: "ar" | "en";
  isDark?: boolean;
  sectionTitle?: string;
  sectionSubtitle?: string;
}

// Partnership Category Color & Badge Styling helper
export const getCategoryBadgeStyle = (category?: string) => {
  const cat = (category || "").trim();
  if (cat.includes("استراتيجي") || cat.toLowerCase().includes("strategic")) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-400/15",
      text: "text-amber-800 dark:text-amber-300",
      border: "border-amber-500/30 dark:border-amber-400/40",
      icon: Star,
      label: "شريك استراتيجي"
    };
  }
  if (cat.includes("داعم") || cat.toLowerCase().includes("support")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-400/15",
      text: "text-emerald-800 dark:text-emerald-300",
      border: "border-emerald-500/30 dark:border-emerald-400/40",
      icon: ShieldCheck,
      label: "شريك داعم"
    };
  }
  if (cat.includes("مجتمعي") || cat.toLowerCase().includes("community")) {
    return {
      bg: "bg-sky-500/10 dark:bg-sky-400/15",
      text: "text-sky-800 dark:text-sky-300",
      border: "border-sky-500/30 dark:border-sky-400/40",
      icon: HeartHandshake,
      label: "شريك مجتمعي"
    };
  }
  if (cat.includes("إعلامي") || cat.toLowerCase().includes("media")) {
    return {
      bg: "bg-purple-500/10 dark:bg-purple-400/15",
      text: "text-purple-800 dark:text-purple-300",
      border: "border-purple-500/30 dark:border-purple-400/40",
      icon: Layers,
      label: "شريك إعلامي"
    };
  }
  if (cat.includes("لوجستي") || cat.toLowerCase().includes("logistic")) {
    return {
      bg: "bg-orange-500/10 dark:bg-orange-400/15",
      text: "text-orange-800 dark:text-orange-300",
      border: "border-orange-500/30 dark:border-orange-400/40",
      icon: Award,
      label: "شريك لوجستي"
    };
  }
  if (cat.includes("تقني") || cat.toLowerCase().includes("tech")) {
    return {
      bg: "bg-indigo-500/10 dark:bg-indigo-400/15",
      text: "text-indigo-800 dark:text-indigo-300",
      border: "border-indigo-500/30 dark:border-indigo-400/40",
      icon: Globe,
      label: "شريك تقني"
    };
  }
  if (cat.includes("نجاح") || cat.toLowerCase().includes("success")) {
    return {
      bg: "bg-teal-500/10 dark:bg-teal-400/15",
      text: "text-teal-800 dark:text-teal-300",
      border: "border-teal-500/30 dark:border-teal-400/40",
      icon: Sparkles,
      label: "شريك نجاح"
    };
  }
  return {
    bg: "bg-slate-500/10 dark:bg-slate-400/15",
    text: "text-slate-800 dark:text-slate-300",
    border: "border-slate-500/30 dark:border-slate-400/40",
    icon: CheckCircle2,
    label: cat || "شريك نجاح"
  };
};

export const PartnersSlider: React.FC<PartnersSliderProps> = ({
  partners = [],
  lang = "ar",
  isDark = false,
  sectionTitle,
  sectionSubtitle
}) => {
  // Filter active partners allowed in homepage and sort (Featured first, then by order)
  const activePartners = React.useMemo(() => {
    return partners
      .filter(p => p.active !== false && p.showInHome !== false)
      .sort((a, b) => {
        // Prioritize featured partners, then sort by defined order
        const aFeatured = a.isFeatured ? 1 : 0;
        const bFeatured = b.isFeatured ? 1 : 0;
        if (aFeatured !== bFeatured) return bFeatured - aFeatured;
        const orderA = typeof a.order === "number" ? a.order : 999;
        const orderB = typeof b.order === "number" ? b.order : 999;
        return orderA - orderB;
      });
  }, [partners]);

  // Responsive cards-per-view
  const [cardsPerView, setCardsPerView] = useState<number>(3);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAutoplay, setIsAutoplay] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Drag & Touch states
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const hasDraggedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCardsPerView(1); // Mobile: 1 card
      } else if (width < 1024) {
        setCardsPerView(2); // Tablet: 2 cards
      } else {
        setCardsPerView(3); // Desktop: 3 cards
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalCards = activePartners.length;
  const maxIndex = Math.max(0, totalCards - cardsPerView);

  // Ensure current index is within bounds
  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [maxIndex, currentIndex]);

  // Next / Previous slide actions (RTL aware)
  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1));
  }, [maxIndex]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1));
  }, [maxIndex]);

  // Autoplay timer with pause on hover/interaction
  useEffect(() => {
    if (!isAutoplay || isHovered || isDragging || totalCards <= cardsPerView) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoplay, isHovered, isDragging, totalCards, cardsPerView, nextSlide]);

  // Touch Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartX(e.touches[0].clientX);
    setDragOffset(0);
    setIsDragging(true);
    hasDraggedRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartX === null) return;
    const currentX = e.touches[0].clientX;
    const delta = currentX - dragStartX;
    if (Math.abs(delta) > 8) {
      hasDraggedRef.current = true;
    }
    setDragOffset(delta);
  };

  const handleTouchEnd = () => {
    if (dragStartX !== null) {
      // In RTL: swipe left (negative offset) means next slide; swipe right (positive offset) means prev slide
      if (dragOffset < -40) {
        nextSlide();
      } else if (dragOffset > 40) {
        prevSlide();
      }
    }
    setDragStartX(null);
    setDragOffset(0);
    setIsDragging(false);
  };

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStartX(e.clientX);
    setDragOffset(0);
    setIsDragging(true);
    hasDraggedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStartX === null) return;
    const delta = e.clientX - dragStartX;
    if (Math.abs(delta) > 8) {
      hasDraggedRef.current = true;
    }
    setDragOffset(delta);
  };

  const handleMouseUp = () => {
    if (isDragging && dragStartX !== null) {
      if (dragOffset < -40) {
        nextSlide();
      } else if (dragOffset > 40) {
        prevSlide();
      }
    }
    setDragStartX(null);
    setDragOffset(0);
    setIsDragging(false);
  };

  if (activePartners.length === 0) {
    return null;
  }

  // Calculate slide translation percentage relative to total track width
  const baseTranslateX = totalCards > 0 ? (currentIndex * 100) / totalCards : 0;
  const trackWidthPercent = cardsPerView > 0 ? (totalCards / cardsPerView) * 100 : 100;

  return (
    <section 
      id="partners" 
      className="py-14 sm:py-20 relative overflow-hidden transition-colors select-none"
      dir="rtl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        if (isDragging) handleMouseUp();
      }}
    >
      {/* Background Subtle Gradient & Accents */}
      <div className="absolute inset-0 bg-radial from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 sm:mb-12">
          <div className="text-center md:text-right space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-black shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{sectionSubtitle || (lang === "ar" ? "شراكات وطنية استراتيجية وتنموية" : "Strategic National Alliances")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight">
              {sectionTitle || (lang === "ar" ? "شركاء النجاح والعطاء" : "Partners in Success & Giving")}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {lang === "ar" 
                ? "نفخر في جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بتكامل جهودنا مع كبرى الهيئات والمنصات والمؤسسات المانحة لتعظيم الأثر المجتمعي المستدام." 
                : "Proudly collaborating with leading organizations and platforms to maximize community impact."}
            </p>
          </div>

          {/* Navigation Controls Bar */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Autoplay Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoplay(prev => !prev)}
              className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                isAutoplay
                  ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : "bg-white dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:text-neutral-900 dark:hover:text-white"
              }`}
              title={isAutoplay ? (lang === "ar" ? "إيقاف التشغيل التلقائي مؤقتاً" : "Pause autoplay") : (lang === "ar" ? "تشغيل التمرير التلقائي" : "Start autoplay")}
            >
              {isAutoplay ? <Pause className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Play className="w-4 h-4" />}
              <span className="hidden sm:inline text-[11px] font-semibold">
                {isAutoplay ? (lang === "ar" ? "تشغيل تلقائي" : "Auto") : (lang === "ar" ? "متوقف" : "Paused")}
              </span>
            </button>

            {/* Previous & Next Arrows */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-neutral-800/90 p-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-2xs">
              <button
                type="button"
                onClick={prevSlide}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                title={lang === "ar" ? "الشريك السابق" : "Previous partner"}
                aria-label="Previous Partner"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={nextSlide}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-neutral-700 dark:text-neutral-200 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                title={lang === "ar" ? "الشريك التالي" : "Next partner"}
                aria-label="Next Partner"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Slider Viewport */}
        <div 
          ref={containerRef}
          className={`relative overflow-hidden cursor-grab ${isDragging ? "cursor-grabbing" : ""} py-4 px-1`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Animated Track */}
          <div 
            className={`flex ${isDragging ? "transition-none" : "transition-transform duration-500 ease-out"}`}
            style={{
              transform: `translateX(calc(${baseTranslateX}% + ${dragOffset}px))`,
              width: `${trackWidthPercent}%`
            }}
          >
            {activePartners.map((partner, idx) => {
              const badge = getCategoryBadgeStyle(partner.category);
              const BadgeIcon = badge.icon;
              const hasLink = Boolean(partner.link && partner.link.trim() !== "" && partner.link !== "#");

              return (
                <div 
                  key={partner.id || idx}
                  className="px-2.5 sm:px-3 flex-shrink-0"
                  style={{ width: `${100 / totalCards}%` }}
                >
                  <div
                    onClick={() => {
                      if (!hasDraggedRef.current && hasLink) {
                        window.open(partner.link, "_blank", "noopener,noreferrer");
                      }
                    }}
                    className={`group relative h-full flex flex-col justify-between p-6 sm:p-7 rounded-3xl transition-all duration-300 ${
                      partner.isFeatured
                        ? "bg-gradient-to-b from-amber-500/[0.08] via-white to-amber-500/[0.03] dark:from-amber-500/10 dark:via-neutral-900 dark:to-neutral-900 border-2 border-amber-400 dark:border-amber-500/70 shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20 hover:border-amber-500"
                        : isDark
                        ? "bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 shadow-xs hover:shadow-lg"
                        : "bg-white hover:bg-neutral-50/80 border border-neutral-200/90 hover:border-emerald-400 shadow-xs hover:shadow-md"
                    } hover:-translate-y-2 ${hasLink ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {/* Top Ribbon for Featured Partner */}
                    {partner.isFeatured && (
                      <div className="absolute -top-3.5 right-6 z-20">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white shadow-md border border-amber-300 dark:border-amber-400 ring-2 ring-amber-400/20">
                          <Star className="w-3.5 h-3.5 fill-current text-white" />
                          <span>{lang === "ar" ? "شريك مميز" : "Featured Partner"}</span>
                        </span>
                      </div>
                    )}

                    {/* Card Content Top: Header, Category & Logo */}
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-5">
                        {/* Category Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-black border ${badge.bg} ${badge.text} ${badge.border} shadow-2xs`}>
                          <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{partner.category || (lang === "ar" ? "شريك نجاح" : "Success Partner")}</span>
                        </span>

                        {/* Order Indicator */}
                        <span className="text-[10px] font-mono font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                          #{idx + 1}
                        </span>
                      </div>

                      {/* Partner Logo Container */}
                      <div className="w-full h-32 sm:h-36 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 rounded-2xl p-4 flex items-center justify-center border border-neutral-100 dark:border-neutral-800/80 shadow-inner overflow-hidden mb-5 group-hover:scale-[1.02] transition-transform duration-300">
                        <img 
                          src={partner.logo} 
                          alt={partner.nameAr}
                          className="max-h-full max-w-full object-contain filter drop-shadow-xs group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=300&h=300&fit=crop";
                          }}
                        />
                      </div>

                      {/* Partner Name & Subtitle */}
                      <div className="space-y-1 mb-3">
                        <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {partner.nameAr}
                        </h3>
                        {partner.nameEn && (
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium font-sans truncate">
                            {partner.nameEn}
                          </p>
                        )}
                      </div>

                      {/* Optional Brief Description */}
                      {partner.descriptionAr && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-3 mb-4">
                          {partner.descriptionAr}
                        </p>
                      )}
                    </div>

                    {/* Card Footer: Visit Website CTA (Only shown if link exists!) */}
                    <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between gap-3 mt-2">
                      {hasLink ? (
                        <a
                          href={partner.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className={`w-full py-2.5 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-sm group/btn ${
                            partner.isFeatured
                              ? "bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white shadow-amber-500/25"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                          } cursor-pointer hover:scale-[1.02] active:scale-98`}
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>{lang === "ar" ? "زيارة الموقع الرسمي" : "Visit Website"}</span>
                          <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/btn:-translate-x-1" />
                        </a>
                      ) : (
                        <div className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{lang === "ar" ? "شراكة رسمية معتمدة" : "Official Partner"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Pagination Dots */}
        {totalCards > cardsPerView && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: maxIndex + 1 }).map((_, dotIdx) => (
              <button
                key={dotIdx}
                type="button"
                onClick={() => setCurrentIndex(dotIdx)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentIndex === dotIdx
                    ? "w-8 h-2.5 bg-emerald-600 dark:bg-emerald-400 shadow-sm"
                    : "w-2.5 h-2.5 bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400 dark:hover:bg-neutral-600"
                }`}
                title={`${lang === "ar" ? "الشريحة رقم" : "Slide"} ${dotIdx + 1}`}
                aria-label={`Slide ${dotIdx + 1}`}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
