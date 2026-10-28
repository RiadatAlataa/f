import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  X, 
  Upload, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Trash2, 
  Check, 
  Sparkles,
  Info,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

interface ProfilePhotoCropModalProps {
  isOpen: boolean;
  currentPhoto?: string;
  volunteerId: string;
  volunteerName: string;
  onClose: () => void;
  onSaveSuccess: (newPhotoUrl: string) => void;
}

export const ProfilePhotoCropModal: React.FC<ProfilePhotoCropModalProps> = ({
  isOpen,
  currentPhoto,
  volunteerId,
  volunteerName,
  onClose,
  onSaveSuccess
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
      setImageSrc(null);
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("يرجى اختيار ملف صورة صالح (JPEG, PNG, WEBP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("حجم الصورة يجب ألا يتجاوز 5 ميجابايت");
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imageSrc || e.touches.length === 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length === 0) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const generateCroppedBase64 = (): string | null => {
    if (!imageSrc || !previewImgRef.current) return null;

    const canvas = document.createElement("canvas");
    const size = 400; // Output high-res 400x400
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Draw circular clip path
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const img = previewImgRef.current;
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const scaleFactor = zoom * (size / 240); // 240 is preview diameter
    ctx.translate(position.x * (size / 240), position.y * (size / 240));

    // Calculate aspect ratio
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawWidth = size * scaleFactor;
    let drawHeight = size * scaleFactor;
    if (imgAspect > 1) {
      drawWidth = drawHeight * imgAspect;
    } else {
      drawHeight = drawWidth / imgAspect;
    }

    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    return canvas.toDataURL("image/png", 0.92);
  };

  const handleSave = async () => {
    const croppedDataUrl = generateCroppedBase64();
    if (!croppedDataUrl) {
      setErrorMsg("يرجى اختيار صورة أولاً وضبطها داخل الإطار الدائري");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/db/volunteers/profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerId,
          imageBase64: croppedDataUrl
        })
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "فشل حفظ الصورة الشخصية");
      }

      onSaveSuccess(data.profileImageUrl || croppedDataUrl);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء حفظ الصورة");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfilePhoto = async () => {
    if (!confirm("هل أنت متأكد من رغبتك في إزالة صورة الحساب الشخصي والرجوع للأيقونة المحايدة؟")) {
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/db/volunteers/profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerId,
          action: "delete"
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onSaveSuccess("");
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "فشل حذف الصورة");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">صورة الملف الشخصي (مثل واتساب)</h3>
              <p className="text-[11px] text-slate-400">خاصة بحساب {volunteerName} داخل البوابة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice of Separation from Official Card Image */}
        <div className="mx-6 mt-4 p-3 rounded-2xl bg-blue-950/40 border border-blue-800/40 text-[11.5px] text-blue-200/90 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white font-bold ml-1">تنبيه نظامي:</strong>
            صورة الحساب الشخصي مستقلة تمامًا عن صورة البطاقة التطوعية الرسمية؛ تغييرها هنا لن يؤثر على بطاقتك المعتمدة أو سجلاتك الرسمية.
          </p>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-2xl bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Cropping / Preview Workspace */}
        <div className="p-6 flex flex-col items-center justify-center">
          <div 
            className="relative w-64 h-64 rounded-full border-4 border-blue-500/80 shadow-2xl overflow-hidden bg-slate-950 flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageSrc ? (
              <img
                ref={previewImgRef}
                src={imageSrc}
                alt="معاينة"
                className="max-w-none pointer-events-none transition-transform duration-75"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`
                }}
              />
            ) : currentPhoto ? (
              <img
                src={currentPhoto}
                alt="الصورة الحالية"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Camera className="w-12 h-12" />
                <span className="text-xs font-bold">لا توجد صورة حالية</span>
              </div>
            )}

            {/* Circular Grid Overlay Guide */}
            <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
              <div className="w-full border-t border-dashed border-white" />
              <div className="h-full border-r border-dashed border-white absolute" />
            </div>
          </div>

          {/* Controls Bar */}
          {imageSrc ? (
            <div className="w-full mt-5 space-y-3">
              <div className="flex items-center gap-3">
                <ZoomOut className="w-4 h-4 text-slate-400" />
                <input
                  type="range"
                  min="0.8"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 bg-slate-800 rounded-lg cursor-pointer h-1.5"
                />
                <ZoomIn className="w-4 h-4 text-slate-400" />
                <span className="text-[11px] font-mono text-slate-400 w-10 text-left">
                  {Math.round(zoom * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>تدوير 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPosition({ x: 0, y: 0 });
                    setRotation(0);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors cursor-pointer"
                >
                  إعادة ضبط
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  تغيير الملف
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>اختيار صورة من جهازك</span>
              </button>
              <span className="text-[11px] text-slate-400">
                يدعم PNG، JPG، WEBP (بحد أقصى 5 ميجابايت)
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            {currentPhoto && (
              <button
                type="button"
                onClick={handleDeleteProfilePhoto}
                disabled={isSaving}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إزالة الصورة والرجوع للمحايد</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            {imageSrc && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جارٍ الحفظ الدائم...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>حفظ الصورة الشخصية</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
