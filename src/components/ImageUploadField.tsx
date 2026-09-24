import React, { useRef, useState } from "react";
import { Upload, ImageIcon, X, CheckCircle2, RefreshCw } from "lucide-react";

export interface ImageUploadFieldProps {
  label: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  description?: string;
  placeholder?: string;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
  previewAspect?: "square" | "video" | "banner" | "circle" | "auto";
  allowUrlFallback?: boolean;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  onChange,
  description,
  accept = "image/png, image/jpeg, image/webp, image/gif, image/svg+xml",
  maxSizeMB = 5,
  className = "",
  previewAspect = "auto",
  allowUrlFallback = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(value || "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith("image/")) {
      setErrorMsg("يرجى اختيار ملف صورة صالح (PNG, JPG, WEBP, SVG)");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMsg(`حجم الصورة يتجاوز الحد المسموح (${maxSizeMB} ميجابايت).`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange(reader.result);
      }
    };
    reader.onerror = () => {
      setErrorMsg("حدث خطأ أثناء قراءة ملف الصورة.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // reset input so the same file can be re-selected if needed
    if (e.target) e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setUrlInput("");
    setErrorMsg(null);
  };

  const getAspectClass = () => {
    switch (previewAspect) {
      case "circle":
        return "w-24 h-24 rounded-full mx-auto";
      case "square":
        return "aspect-square max-h-48 rounded-xl";
      case "video":
        return "aspect-video max-h-44 rounded-xl";
      case "banner":
        return "aspect-[21/9] max-h-36 rounded-xl";
      default:
        return "max-h-40 rounded-xl";
    }
  };

  return (
    <div className={`space-y-1.5 text-right dir-rtl ${className}`}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
          {label}
        </label>
        {allowUrlFallback && (
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
          >
            {showUrlInput ? "إخفاء إدخال الرابط" : "أو إدخال رابط URL"}
          </button>
        )}
      </div>

      {description && (
        <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}

      {/* URL fallback if opened */}
      {showUrlInput && (
        <div className="flex gap-1.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-fadeIn">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono dir-ltr text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => {
              if (urlInput.trim()) {
                onChange(urlInput.trim());
              }
            }}
            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-700 text-white font-bold text-xs rounded-lg hover:bg-black transition-colors shrink-0 cursor-pointer"
          >
            تطبيق
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* If an image is selected/present */}
      {value ? (
        <div className="relative group border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl flex items-center gap-3">
          <div className={`overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${getAspectClass()}`}>
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop";
              }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>تم اختيار الصورة وتجهيزها</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate dir-ltr text-right font-mono">
              {value.startsWith("data:") ? "صورة مرفوعة ومحفوظة محلياً" : value}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 text-slate-500" />
                <span>استبدال الصورة</span>
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>حذف الصورة</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Dropzone / Upload Trigger */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20"
              : "border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-850"
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 shadow-xs group-hover:scale-105 transition-transform">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
            انقر لرفع صورة من جهازك، أو اسحب وأفلت الصورة هنا
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
            صيغ مدعومة: JPG, PNG, WEBP, SVG (بحد أقصى {maxSizeMB} ميجابايت)
          </p>
        </div>
      )}

      {errorMsg && (
        <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1">
          {errorMsg}
        </p>
      )}
    </div>
  );
};
