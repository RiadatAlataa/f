import React, { useState, useEffect } from "react";
import { Upload, Sparkles, ImageIcon, CheckCircle2, Trash2, Link as LinkIcon, Clock } from "lucide-react";

export interface ImagePickerControlProps {
  label: string;
  description?: string;
  value: string;
  onChange: (newValue: string) => void;
  aspectRatio?: "square" | "logo" | "banner" | "stamp" | "avatar";
  presets?: { name: string; url: string }[];
  className?: string;
}

export const ImagePickerControl: React.FC<ImagePickerControlProps> = ({
  label,
  description,
  value,
  onChange,
  aspectRatio = "logo",
  presets,
  className = ""
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState(value || "");
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setCustomUrl(value || "");
    setImgError(false);
  }, [value]);

  const activePresets = presets || [];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("حجم الصورة كبير جداً. يرجى اختيار صورة حجمها أقل من 5 ميجابايت.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setImgError(false);
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const previewHeight = aspectRatio === "banner" ? "h-32 sm:h-36" : aspectRatio === "avatar" || aspectRatio === "square" ? "h-32 sm:h-36" : "h-28 sm:h-32";

  return (
    <div className={`relative isolate overflow-hidden w-full min-w-0 flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-850 p-3.5 sm:p-4 text-right dir-rtl shadow-2xs transition-all ${className}`}>
      {/* 1. Header: العنوان + الوصف + حالة الصورة */}
      <div className="flex items-start justify-between gap-2 pb-2.5 mb-2.5 border-b border-neutral-150 dark:border-neutral-800">
        <div className="min-w-0 flex-1">
          <label className="block text-xs sm:text-sm font-black text-neutral-900 dark:text-neutral-100 leading-tight">
            {label}
          </label>
          {description && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-normal truncate">
              {description}
            </p>
          )}
        </div>
        <div className="shrink-0">
          {value && !imgError ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>تم الإرفاق</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 whitespace-nowrap">
              <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
              <span>لم يتم رفع صورة</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. منطقة الصورة (Image Preview Frame) */}
      <div className={`relative w-full rounded-xl overflow-hidden border-2 border-dashed border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/60 flex items-center justify-center mb-3 shadow-inner ${previewHeight}`}>
        {value && !imgError ? (
          <img
            src={value}
            alt={label}
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain p-2 select-none"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 text-xs gap-1.5 p-3 text-center select-none">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 dark:text-neutral-400 shadow-2xs">
              <Upload className="w-5 h-5 text-neutral-400" />
            </div>
            <span className="font-bold text-neutral-600 dark:text-neutral-300 text-xs">
              {imgError ? "تعذر تحميل رابط الصورة" : "لم يتم رفع صورة بعد"}
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              اختر ملفاً من جهازك أو أدخل رابطاً معتمداً
            </span>
          </div>
        )}
      </div>

      {/* 3. أزرار التحكم بالصورة (Action Controls) */}
      <div className="w-full space-y-2 mt-auto">
        <div className={`grid ${activePresets.length > 0 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"} gap-1.5 sm:gap-2 w-full min-w-0`}>
          {/* زر رفع صورة من جهازك */}
          <label
            title="رفع ملف صورة من جهاز الكمبيوتر أو الجوال"
            className="min-w-0 overflow-hidden w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs text-center select-none"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate whitespace-nowrap">رفع من جهازك</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* زر اختيار من المعرض الجاهز - يظهر فقط في حال وجود نماذج محددة صراحة */}
          {activePresets.length > 0 && (
            <button
              type="button"
              title="اختيار صورة جاهزة من معرض النماذج المعتمدة"
              onClick={() => {
                setShowPresets(!showPresets);
                if (showUrlInput) setShowUrlInput(false);
              }}
              className={`min-w-0 overflow-hidden w-full font-bold py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer transition-all shadow-2xs select-none border ${
                showPresets
                  ? "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700"
                  : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/80"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate whitespace-nowrap">نماذج معتمدة</span>
            </button>
          )}

          {/* زر رابط مباشر */}
          <button
            type="button"
            title="إدخال رابط مباشر للصورة من الإنترنت"
            onClick={() => {
              setShowUrlInput(!showUrlInput);
              if (showPresets) setShowPresets(false);
            }}
            className={`min-w-0 overflow-hidden w-full font-bold py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1 cursor-pointer transition-all select-none border ${
              showUrlInput
                ? "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700"
                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 dark:text-neutral-200 dark:border-neutral-700"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <span className="truncate whitespace-nowrap">رابط مباشر</span>
          </button>

          {/* زر مسح الصورة */}
          <button
            type="button"
            title="إلغاء ومسح الصورة الحالية"
            disabled={!value}
            onClick={() => {
              onChange("");
              setCustomUrl("");
              setImgError(false);
            }}
            className={`min-w-0 overflow-hidden w-full font-bold py-2 px-1.5 sm:px-2 rounded-xl text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-all select-none border ${
              value
                ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 cursor-pointer active:scale-98"
                : "bg-neutral-50 text-neutral-300 border-neutral-150 dark:bg-neutral-850 dark:text-neutral-600 dark:border-neutral-800 cursor-not-allowed opacity-50"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate whitespace-nowrap">مسح الصورة</span>
          </button>
        </div>

        {/* Direct URL Input Bar */}
        {showUrlInput && (
          <div className="w-full mt-2 p-2.5 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 space-y-2 animate-in fade-in duration-150">
            <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block">
              أدخل رابط الصورة المباشر (URL):
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 min-w-0 text-xs px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 font-mono dir-ltr text-neutral-800 dark:text-white bg-white dark:bg-neutral-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (customUrl.trim()) {
                    setImgError(false);
                    onChange(customUrl.trim());
                  }
                }}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-black dark:bg-neutral-700 dark:hover:bg-neutral-600 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
              >
                تطبيق
              </button>
            </div>
          </div>
        )}

        {/* Presets Gallery Drawer */}
        {showPresets && (
          <div className="w-full mt-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-amber-200 dark:border-amber-800/80 shadow-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-neutral-800 dark:text-neutral-200 border-b border-amber-150 dark:border-amber-900/50 pb-1.5">
              <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>اختر صورة جاهزة معتمدة:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPresets(false)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xs px-1.5 py-0.5 rounded hover:bg-neutral-200/60 dark:hover:bg-neutral-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {activePresets.map((pr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImgError(false);
                    onChange(pr.url);
                    setShowPresets(false);
                  }}
                  className={`group relative rounded-xl border p-1 text-right transition-all cursor-pointer overflow-hidden ${
                    value === pr.url
                      ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 ring-2 ring-emerald-500/20"
                      : "border-neutral-200 dark:border-neutral-700 hover:border-emerald-500 bg-white dark:bg-neutral-800"
                  }`}
                >
                  <div className="h-16 w-full rounded-lg bg-neutral-200 dark:bg-neutral-700 overflow-hidden mb-1 flex items-center justify-center">
                    <img
                      src={pr.url}
                      alt={pr.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-neutral-800 dark:text-neutral-200 block truncate">
                    {pr.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
