import React, { useRef, useState } from "react";
import { Camera, Upload, X, Check, RefreshCw, AlertCircle } from "lucide-react";

interface HandoverPhotoCaptureProps {
  photo: string | null;
  onPhotoCaptured: (photoDataUrl: string | null) => void;
  required?: boolean;
}

export const HandoverPhotoCapture: React.FC<HandoverPhotoCaptureProps> = ({
  photo,
  onPhotoCaptured,
  required = true,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Camera start failed, falling back to file picker:", err);
      setCameraError("تعذر تشغيل كاميرا الجهاز مباشرة، يرجى التقاط الصورة أو رفعها من الاستوديو.");
      setIsCameraActive(false);
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      onPhotoCaptured(dataUrl);
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onPhotoCaptured(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 text-right">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-emerald-600" />
          <span>توثيق صورة التسليم {required && <b className="text-rose-600 text-xs font-bold">(إلزامي)</b>}</span>
        </label>
        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">توثيق حي بالصورة لملف المستفيد</span>
      </div>

      {photo ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-500 max-h-48 group">
          <img src={photo} alt="توثيق التسليم" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onPhotoCaptured(null)}
              className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md"
            >
              <X className="w-4 h-4" />
              <span>حذف وإعادة الالتقاط</span>
            </button>
          </div>
          <div className="absolute bottom-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
            <Check className="w-3 h-3" />
            <span>تم حفظ صورة التسليم بنجاح</span>
          </div>
        </div>
      ) : isCameraActive ? (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden bg-black max-h-56 flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={capturePhoto}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Camera className="w-4 h-4" />
              <span>التقاط الصورة الآن 📸</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-3 py-2.5 bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <button
            type="button"
            onClick={startCamera}
            className="flex-1 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <Camera className="w-4 h-4" />
            <span>التقاط صورة التسليم بالكاميرا</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 px-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 text-neutral-700 dark:text-neutral-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-neutral-500" />
            <span>رفع صورة من الجهاز</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      {cameraError && (
        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}
    </div>
  );
};
