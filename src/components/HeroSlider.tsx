import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { HeroSlide } from "../types";

interface HeroSliderProps {
  slides: HeroSlide[];
  fallbackImageUrl?: string;
  autoSlideInterval?: number; // default 1000ms (1 second as requested)
  children?: React.ReactNode; // Overlay content (e.g., hero text, buttons)
  lang?: "ar" | "en";
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  slides = [],
  fallbackImageUrl = "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&h=900&fit=crop",
  autoSlideInterval = 1000, // 1 second per user instruction
  children,
  lang = "ar"
}) => {
  // Only active slides
  const activeSlides = React.useMemo(() => {
    const list = (slides || []).filter(s => s.isActive !== false);
    if (list.length > 0) {
      return list.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    // Fallback if no active slides
    return [
      {
        id: "slide-default",
        imageUrl: fallbackImageUrl,
        title: "",
        order: 1,
        isActive: true
      }
    ];
  }, [slides, fallbackImageUrl]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Touch Swipe coordinates
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Go to next slide
  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % activeSlides.length);
  }, [activeSlides.length]);

  // Go to prev slide
  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  // Keep index within bounds if activeSlides count changes
  useEffect(() => {
    if (currentIndex >= activeSlides.length) {
      setCurrentIndex(0);
    }
  }, [activeSlides.length, currentIndex]);

  // Auto-play timer: 1 second interval
  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [activeSlides.length, isPaused, autoSlideInterval, nextSlide]);

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current !== null && touchEndX.current !== null) {
      const deltaX = touchStartX.current - touchEndX.current;
      const swipeThreshold = 45; // pixels
      
      // In RTL:
      // Swiping to the left (deltaX > 0) goes forward (nextSlide)
      // Swiping to the right (deltaX < 0) goes backward (prevSlide)
      if (deltaX > swipeThreshold) {
        nextSlide();
      } else if (deltaX < -swipeThreshold) {
        prevSlide();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    setIsPaused(false);
  };

  const currentSlide = activeSlides[currentIndex] || activeSlides[0];

  return (
    <div
      className="relative w-full flex-1 flex flex-col justify-center min-h-[480px] sm:min-h-[560px] lg:min-h-[600px] overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Slides Container with Smooth Crossfade */}
      <div className="absolute inset-0 z-0">
        {activeSlides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id || index}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105"
              } transition-transform duration-1000`}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title || "عرض واجهة الجمعية"}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  // If slide image fails, fall back to fallbackImageUrl
                  (e.target as HTMLImageElement).src = fallbackImageUrl;
                }}
              />
            </div>
          );
        })}

        {/* Global Dark Gradient & Vignette Overlay to ensure text readability */}
        <div className="absolute inset-0 z-20 bg-gradient-to-t from-neutral-950/95 via-neutral-950/70 to-neutral-950/40 pointer-events-none" />
        <div className="absolute inset-0 z-20 bg-radial from-transparent via-black/30 to-black/70 pointer-events-none" />
      </div>

      {/* Slide-specific Title Tag (Optional top-corner indicator) */}
      {currentSlide?.title && (
        <div className="absolute top-20 right-4 sm:right-8 z-30 pointer-events-none hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/15 text-white text-xs font-bold shadow-lg animate-fadeIn">
          <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
          <span>{currentSlide.title}</span>
        </div>
      )}

      {/* Hero Children (Heading, Subtitle, CTAs) */}
      <div className="relative z-30 w-full flex-1 flex items-center justify-center">
        {children}
      </div>

      {/* Manual Controls (Prev / Next Buttons) - Shown if more than 1 slide */}
      {activeSlides.length > 1 && (
        <>
          {/* Next Button (Right in RTL = Forward) */}
          <button
            type="button"
            onClick={nextSlide}
            aria-label={lang === "ar" ? "الصورة التالية" : "Next Slide"}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-neutral-900/60 hover:bg-emerald-600/90 text-white backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Prev Button (Left in RTL = Backward) */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label={lang === "ar" ? "الصورة السابقة" : "Previous Slide"}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-neutral-900/60 hover:bg-emerald-600/90 text-white backdrop-blur-md border border-white/20 shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer group"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Dots Indicator & Slide Counter at bottom */}
          <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-4 py-2 rounded-full bg-neutral-950/60 backdrop-blur-md border border-white/15 shadow-xl">
            {activeSlides.map((slide, index) => {
              const isActive = index === currentIndex;
              return (
                <button
                  key={slide.id || index}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`انتقال للصورة ${index + 1}`}
                  className={`transition-all duration-300 rounded-full cursor-pointer ${
                    isActive
                      ? "w-7 h-2.5 bg-gradient-to-r from-emerald-400 to-teal-400 shadow-sm shadow-emerald-500/50"
                      : "w-2.5 h-2.5 bg-white/40 hover:bg-white/70"
                  }`}
                />
              );
            })}

            {/* Slide Index / Total Counter */}
            <span className="text-[11px] font-mono font-bold text-white/80 pr-1.5 border-r border-white/20">
              {currentIndex + 1} / {activeSlides.length}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
