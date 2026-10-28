import React, { useEffect, useRef, useState } from "react";
import { 
  Download, 
  Printer, 
  RefreshCw, 
  QrCode, 
  ExternalLink, 
  CheckCircle, 
  Award, 
  ShieldCheck, 
  Eye, 
  Sparkles,
  Camera,
  RotateCw,
  Building2,
  Globe
} from "lucide-react";
import QRCode from "qrcode";
import { 
  Volunteer, 
  VolunteerCardTemplate, 
  CardElementConfig, 
  Department, 
  VolunteerTeam 
} from "../types";

export interface CardRendererProps {
  template: VolunteerCardTemplate;
  volunteer: Volunteer;
  departments?: Department[];
  teams?: VolunteerTeam[];
  femaleUnifiedPhotoUrl?: string;
  onReissue?: (volunteerId: string) => void;
  scale?: number;
  showActions?: boolean;
  showControls?: boolean;
  onOpenVerification?: (volunteer: Volunteer) => void;
  className?: string;
  isPrintMode?: boolean;
  interactive?: boolean;
  selectedElementId?: string | null;
  onSelectElement?: (elementId: string) => void;
  onUpdateElementPosition?: (elementId: string, newX: number, newY: number) => void;
  initialFace?: 'front' | 'back';
  forceFace?: 'front' | 'back';
}

export const CardRenderer: React.FC<CardRendererProps> = ({
  template,
  volunteer,
  departments = [],
  teams = [],
  femaleUnifiedPhotoUrl = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
  onReissue,
  scale = 1,
  showActions = true,
  showControls = true,
  onOpenVerification,
  className = "",
  isPrintMode = false,
  interactive = false,
  selectedElementId = null,
  onSelectElement,
  onUpdateElementPosition,
  initialFace = 'front',
  forceFace
}) => {
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);

  const [isFlipped, setIsFlipped] = useState<boolean>(initialFace === 'back');
  const [frontQrDataUrl, setFrontQrDataUrl] = useState<string>("");
  const [officialSiteQrDataUrl, setOfficialSiteQrDataUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Sync with forceFace if provided
  useEffect(() => {
    if (forceFace) {
      setIsFlipped(forceFace === 'back');
    }
  }, [forceFace]);

  const team = teams.find((t) => t.id === volunteer.teamId);
  const dept = departments.find((d) => d.id === volunteer.departmentId);

  // Drag interaction handler for card designer
  const handleElementMouseDown = (e: React.MouseEvent, elemId: string, currentX: number, currentY: number) => {
    if (!interactive) return;
    e.stopPropagation();
    if (onSelectElement) onSelectElement(elemId);
    if (!onUpdateElementPosition) return;

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initialX = currentX;
    const initialY = currentY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const deltaX = moveEvent.clientX - startClientX;
      const deltaY = moveEvent.clientY - startClientY;
      const actualWidth = cardWidth * scale;
      const actualHeight = cardHeight * scale;

      const deltaXPercent = (deltaX / actualWidth) * 100;
      const deltaYPercent = (deltaY / actualHeight) * 100;

      const newX = Math.min(100, Math.max(0, Math.round((initialX + deltaXPercent) * 2) / 2));
      const newY = Math.min(100, Math.max(0, Math.round((initialY + deltaYPercent) * 2) / 2));

      onUpdateElementPosition(elemId, newX, newY);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Female check
  const isFemale = volunteer.gender === 'female' || 
    (volunteer.name && (volunteer.name.includes('أنثى') || volunteer.name.includes('سارة') || volunteer.name.includes('مريم') || volunteer.name.includes('فاطمة') || volunteer.name.includes('نورة') || volunteer.name.includes('بنت')));

  const NEUTRAL_USER_SVG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23059669'%3E%3Ccircle cx='50' cy='35' r='18' opacity='0.8'/%3E%3Cpath d='M24 82c0-14.359 11.64-26 26-26s26 11.641 26 26' opacity='0.8'/%3E%3C/svg%3E";

  // Official Card Photo logic (strictly separated from profileImage)
  const officialCardPhoto = volunteer.cardImage || volunteer.photo;
  const shouldUseUnifiedPhoto = isFemale && template.useFemaleUnifiedPhoto;
  const hasCustomCardPhoto = officialCardPhoto && !officialCardPhoto.includes("unsplash.com") && !officialCardPhoto.includes("placeholder");
  const hasUnifiedPhoto = femaleUnifiedPhotoUrl && !femaleUnifiedPhotoUrl.includes("unsplash.com") && !femaleUnifiedPhotoUrl.includes("placeholder");

  const effectiveCardPhotoUrl = shouldUseUnifiedPhoto
    ? (hasUnifiedPhoto ? femaleUnifiedPhotoUrl : NEUTRAL_USER_SVG)
    : (hasCustomCardPhoto ? officialCardPhoto : NEUTRAL_USER_SVG);

  // Verification URL for Front QR code
  const verificationUrl = typeof window !== "undefined"
    ? `${window.location.origin}?verifyCard=${encodeURIComponent(volunteer.membershipNumber || volunteer.id)}`
    : `https://www.riadataleata.com/verify?card=${volunteer.membershipNumber}`;

  // Official Association Website for Back QR code (Strictly required: https://www.riadataleata.com)
  const officialWebsiteUrl = "https://www.riadataleata.com";

  // Generate QR Code data URLs
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(
      verificationUrl,
      { width: 250, margin: 1, color: { dark: "#0f172a", light: "#ffffff" }, errorCorrectionLevel: "M" },
      (err, url) => {
        if (!err && isMounted && url) setFrontQrDataUrl(url);
      }
    );

    QRCode.toDataURL(
      officialWebsiteUrl,
      { width: 280, margin: 1, color: { dark: "#071C43", light: "#ffffff" }, errorCorrectionLevel: "H" },
      (err, url) => {
        if (!err && isMounted && url) setOfficialSiteQrDataUrl(url);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [verificationUrl, officialWebsiteUrl]);

  // Dimensions & Orientation
  const cardWidth = template.width || 856;
  const cardHeight = template.height || 540;
  const isLandscape = template.orientation !== 'portrait';

  // Format element value dynamically
  const getElementValue = (elem: CardElementConfig) => {
    let rawValue = "";
    switch (elem.type) {
      case 'name':
        rawValue = volunteer.name || "اسم المتطوع الثلاثي";
        break;
      case 'nationalId':
        rawValue = volunteer.nationalId || "1098765432";
        break;
      case 'membershipNumber':
      case 'fileNumber':
        rawValue = volunteer.fileNumber || volunteer.file_number || volunteer.membershipNumber || "V-2026-0001";
        break;
      case 'jobTitle':
        rawValue = volunteer.titleAr || "متطوع تنظيمي ميداني";
        break;
      case 'teamName':
        rawValue = team ? team.nameAr : "فريق ريادة العطاء";
        break;
      case 'departmentName':
        rawValue = dept ? dept.nameAr : "إدارة التطوع";
        break;
      case 'gender':
        rawValue = isFemale ? "أنثى" : "ذكر";
        break;
      case 'nationality':
        rawValue = volunteer.nationality || "سعودي";
        break;
      case 'birthDate':
        rawValue = volunteer.birthDate || "1418/05/12هـ";
        break;
      case 'bloodType':
        rawValue = volunteer.bloodType || "O+";
        break;
      case 'joinDate':
        rawValue = volunteer.issueDate || volunteer.joinDate || "2026-01-15";
        break;
      case 'expiryDate':
        rawValue = volunteer.expiryDate || "2027-01-15";
        break;
      case 'points':
        rawValue = `${volunteer.points || 0} نقطة`;
        break;
      case 'customText':
        rawValue = elem.customTextValue || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - ترخيص: 1000888600";
        break;
      case 'employeeNumber':
        rawValue = (volunteer as any).employeeNumber || volunteer.fileNumber || volunteer.membershipNumber || "EMP-2026-001";
        break;
      default:
        rawValue = "";
    }

    if (elem.showLabelPrefix && elem.labelPrefix) {
      return `${elem.labelPrefix} ${rawValue}`;
    }
    return rawValue;
  };

  // Export card as high-res PNG / JPEG
  const exportCardAsImage = async (format: "png" | "jpeg" = "png", faceToExport: 'current' | 'front' | 'back' = 'current') => {
    setIsExporting(true);
    try {
      const targetFace = faceToExport === 'current' ? (isFlipped ? 'back' : 'front') : faceToExport;
      const targetRef = targetFace === 'back' ? backCardRef.current : frontCardRef.current;
      
      if (!targetRef) return;

      const canvas = document.createElement("canvas");
      canvas.width = cardWidth;
      canvas.height = cardHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw background
      const bgImgUrl = targetFace === 'back' 
        ? (template.backBackgroundUrl || "https://images.unsplash.com/photo-1557683316-973673baf926?w=856&h=540&fit=crop")
        : template.backgroundUrl;

      if (bgImgUrl) {
        try {
          const bgImg = new Image();
          bgImg.crossOrigin = "anonymous";
          await new Promise<void>((resolve, reject) => {
            bgImg.onload = () => resolve();
            bgImg.onerror = () => resolve(); // fallback on error
            bgImg.src = bgImgUrl;
          });
          if (bgImg.complete && bgImg.naturalWidth > 0) {
            ctx.drawImage(bgImg, 0, 0, cardWidth, cardHeight);
          } else {
            drawFallbackBackground(ctx, cardWidth, cardHeight, targetFace);
          }
        } catch {
          drawFallbackBackground(ctx, cardWidth, cardHeight, targetFace);
        }
      } else {
        drawFallbackBackground(ctx, cardWidth, cardHeight, targetFace);
      }

      // Download file
      const dataUrl = canvas.toDataURL(format === "png" ? "image/png" : "image/jpeg", 0.95);
      const link = document.createElement("a");
      const safeName = (volunteer.name || "volunteer").replace(/\s+/g, "_");
      const faceName = targetFace === 'back' ? "الوجه_الخلفي" : "الوجه_الأمامي";
      link.download = `بطاقة_متطوع_${safeName}_${faceName}_${volunteer.membershipNumber || "2026"}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
      alert("حدث خطأ أثناء تصدير الصورة، يرجى إعادة المحاولة.");
    } finally {
      setIsExporting(false);
    }
  };

  const drawFallbackBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, face: 'front' | 'back') => {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (face === 'back') {
      grad.addColorStop(0, "#071C43");
      grad.addColorStop(0.5, "#0A2558");
      grad.addColorStop(1, "#07142E");
    } else {
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.5, "#F0F6FE");
      grad.addColorStop(1, "#EBF3FE");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  };

  // Handle Print Action (Both Front & Back Faces side by side with CR80 dimensions)
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("يرجى السماح بفتح النوافذ المنبثقة للطباعة");
      return;
    }

    const frontHtml = frontCardRef.current?.outerHTML || "";
    const backHtml = backCardRef.current?.outerHTML || "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8" />
          <title>طباعة بطاقة متطوع - ${volunteer.name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              margin: 0;
              padding: 20px;
              background-color: #fff;
              font-family: 'Cairo', 'Tajawal', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              direction: rtl;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 30px;
            }
            .card-face-wrapper {
              page-break-inside: avoid;
              border: 1px dashed #cbd5e1;
              padding: 6px;
              border-radius: 18px;
            }
            .print-notes {
              font-size: 11px;
              color: #475569;
              text-align: center;
              margin-top: 15px;
              border-top: 1px dashed #cbd5e1;
              padding-top: 10px;
              width: 100%;
              max-width: 600px;
            }
            #front-card-root, #back-card-root {
              transform: none !important;
              box-shadow: none !important;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            <div style="text-align: center; margin-bottom: 10px;">
              <h3 style="margin: 0; color: #071C43; font-size: 16px; font-weight: 900;">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h3>
              <p style="margin: 3px 0 0; color: #64748b; font-size: 12px;">بطاقة العضوية التطوعية الرسمية المعتمدة (الوجه الأمامي والخلفي)</p>
            </div>

            <!-- Front Face -->
            <div class="card-face-wrapper">
              ${frontHtml}
            </div>

            <!-- Back Face -->
            <div class="card-face-wrapper">
              ${backHtml}
            </div>

            <div class="print-notes">
              <strong>ترخيص المركز الوطني لتنمية القطاع غير الربحي: 1000888600</strong> • 
              الموقع الرسمي: https://www.riadataleata.com • 
              تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SA')}
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`} dir="rtl">
      {/* 1. Face Switcher Controls (Front / Back / 3D Flip) */}
      {showControls && (
        <div className="flex items-center gap-2 mb-3 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-xs">
          <button
            type="button"
            onClick={() => setIsFlipped(false)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              !isFlipped
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>الوجه الأمامي (Front)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFlipped(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              isFlipped
                ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>الوجه الخلفي (Back)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFlipped(!isFlipped)}
            className="p-1.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer"
            title="قلب البطاقة 3D"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Outer Scaled Viewport Container with 3D Flip Perspective */}
      <div 
        className="relative rounded-2xl shadow-md transition-all hover:shadow-xl border border-neutral-200 dark:border-slate-800 bg-neutral-100 dark:bg-slate-950 flex items-center justify-center p-2"
        style={{
          width: `${Math.min(cardWidth * scale + 16, cardWidth)}px`,
          maxWidth: "100%",
          perspective: "1200px"
        }}
      >
        {/* Scaled Wrapper for CSS transforms */}
        <div 
          style={{
            width: `${cardWidth}px`,
            height: `${cardHeight}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
            margin: "0 auto",
            marginBottom: scale < 1 ? `-${cardHeight * (1 - scale)}px` : "0px",
            position: "relative"
          }}
        >
          {/* 3D Flipper Box */}
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              transformStyle: "preserve-3d",
              transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
            }}
          >
            {/* ------------------------------------------------------------- */}
            {/* FRONT FACE */}
            {/* ------------------------------------------------------------- */}
            <div
              ref={frontCardRef}
              id="front-card-root"
              className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-blue-600/80 shadow-lg text-neutral-800 select-none"
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                backgroundColor: "#ffffff",
                backgroundImage: template.backgroundUrl ? `url("${template.backgroundUrl}")` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                fontFamily: "Cairo, sans-serif",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden"
              }}
            >
              {/* Ambient Background Overlay if NO background image exists */}
              {!template.backgroundUrl && (
                <>
                  <div className={`absolute inset-0 bg-gradient-to-br ${template.targetGender === 'female' ? 'from-white via-purple-50/50 to-blue-50/40' : 'from-white via-blue-50/60 to-slate-50/40'} pointer-events-none`} />
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-blue-600/15 via-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-36 h-36 bg-gradient-to-tr from-slate-600/15 via-blue-500/10 to-transparent rounded-tr-full pointer-events-none" />
                </>
              )}

              {/* Render Front Elements */}
              {template.elements.map((elem) => {
                if (!elem.visible) return null;

                const transformParts: string[] = [];
                if (elem.rotation) transformParts.push(`rotate(${elem.rotation}deg)`);

                const style: React.CSSProperties = {
                  position: "absolute",
                  top: `${elem.y}%`,
                  left: `${elem.x}%`,
                  transform: transformParts.length > 0 ? transformParts.join(" ") : undefined,
                  fontFamily: elem.fontFamily || "Cairo, sans-serif",
                  fontSize: elem.fontSize ? `${elem.fontSize}px` : "14px",
                  fontWeight: elem.fontWeight || "bold",
                  color: elem.color || "#071C43",
                  textAlign: elem.textAlign || "right",
                  zIndex: elem.zIndex || 10
                };

                // Photo Element
                if (elem.type === "photo") {
                  const pWidth = elem.width || 130;
                  const pHeight = elem.height || 130;
                  const shapeClass = elem.photoShape === 'circle' ? 'rounded-full' : elem.photoShape === 'square' ? 'rounded-none' : 'rounded-2xl';
                  return (
                    <div
                      key={elem.id}
                      id={`elem-${elem.id}`}
                      onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                      onClick={(e) => {
                        if (interactive) {
                          e.stopPropagation();
                          onSelectElement?.(elem.id);
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: `${elem.y}%`,
                        left: `${elem.x}%`,
                        width: `${pWidth}px`,
                        height: `${pHeight}px`,
                        borderWidth: `${elem.borderWidth || 3}px`,
                        borderColor: elem.borderColor || "#0754C7",
                        zIndex: elem.zIndex || 20
                      }}
                      className={`overflow-hidden shadow-md bg-neutral-100 ${shapeClass} select-none ${
                        interactive ? 'cursor-move hover:ring-2 hover:ring-blue-400' : ''
                      } ${interactive && selectedElementId === elem.id ? 'ring-2 ring-blue-600' : ''}`}
                    >
                      <img
                        src={effectiveCardPhotoUrl}
                        alt="صورة البطاقة الرسمية"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                }

                // Association Logo
                if (elem.type === "associationLogo") {
                  return (
                    <div
                      key={elem.id}
                      id={`elem-${elem.id}`}
                      onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                      onClick={(e) => {
                        if (interactive) {
                          e.stopPropagation();
                          onSelectElement?.(elem.id);
                        }
                      }}
                      style={{
                        position: "absolute",
                        top: `${elem.y}%`,
                        left: `${elem.x}%`,
                        zIndex: elem.zIndex || 20
                      }}
                      className="select-none"
                    >
                      <img src="/logo.png" alt="جمعية ريادة العطاء" className="h-14 w-auto object-contain" />
                    </div>
                  );
                }

                // Front QR Code (Smart Verification)
                if (elem.type === "qrCode") {
                  const qrSize = elem.qrSize || 90;
                  return (
                    <div
                      key={elem.id}
                      id={`elem-${elem.id}`}
                      onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                      style={{
                        position: "absolute",
                        top: `${elem.y}%`,
                        left: `${elem.x}%`,
                        width: `${qrSize}px`,
                        height: `${qrSize}px`,
                        zIndex: elem.zIndex || 20
                      }}
                      className="bg-white p-1 rounded-xl shadow-xs border border-slate-200 select-none"
                    >
                      {frontQrDataUrl ? (
                        <img src={frontQrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                      ) : (
                        <QrCode className="w-full h-full text-slate-800" />
                      )}
                    </div>
                  );
                }

                // Text Element
                const displayText = getElementValue(elem);
                return (
                  <div
                    key={elem.id}
                    id={`elem-${elem.id}`}
                    onMouseDown={(e) => handleElementMouseDown(e, elem.id, elem.x, elem.y)}
                    onClick={(e) => {
                      if (interactive) {
                        e.stopPropagation();
                        onSelectElement?.(elem.id);
                      }
                    }}
                    style={style}
                    className={`whitespace-nowrap leading-tight select-none ${
                      interactive ? 'cursor-move hover:ring-2 hover:ring-blue-400' : ''
                    }`}
                  >
                    {displayText}
                  </div>
                );
              })}
            </div>

            {/* ------------------------------------------------------------- */}
            {/* BACK FACE */}
            {/* ------------------------------------------------------------- */}
            <div
              ref={backCardRef}
              id="back-card-root"
              className="absolute inset-0 overflow-hidden rounded-2xl border-2 border-blue-900 shadow-xl text-white select-none flex flex-col justify-between p-6"
              style={{
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                backgroundColor: "#071C43",
                backgroundImage: template.backBackgroundUrl ? `url("${template.backBackgroundUrl}")` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                fontFamily: "Cairo, sans-serif",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)"
              }}
            >
              {/* Ambient Background Gradient for Back if NO image */}
              {!template.backBackgroundUrl && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pointer-events-none" />
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
                </>
              )}

              {/* Back Face Top Header: Team Info & Association Branding */}
              <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                    {team?.logoUrl ? (
                      <img src={team.logoUrl} alt={team.nameAr} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <Building2 className="w-7 h-7 text-blue-300" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">{team ? team.nameAr : "فريق ريادة العطاء"}</h3>
                    <span className="text-xs text-blue-300 font-bold block">
                      القائد المعتمد: {team?.leaderName || "سعود الحربي"}
                    </span>
                  </div>
                </div>

                <div className="text-left">
                  <img src="/logo.png" alt="شعار الجمعية" className="h-12 w-auto object-contain brightness-0 invert" />
                  <span className="text-[10px] text-blue-200 block font-mono">ترخيص: 1000888600</span>
                </div>
              </div>

              {/* Back Face Center: Official Scannable Website QR Code */}
              <div className="relative z-10 flex items-center justify-between gap-6 my-auto px-4">
                <div className="space-y-2 max-w-sm text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                    <Globe className="w-3 h-3" />
                    <span>امسح الرمز لزيارة البوابة الرسمية</span>
                  </span>
                  <h4 className="text-sm font-bold text-white">
                    جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    هذه البطاقة وثيقة تطوعية رسمية معتمدة مخصصة للمهام الميدانية والمبادرات الإنسانية والتنموية بمكة المكرمة.
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    https://www.riadataleata.com
                  </p>
                </div>

                {/* Scannable Website QR Box */}
                <div className="bg-white p-2.5 rounded-2xl shadow-xl flex flex-col items-center justify-center shrink-0 border-2 border-white/80">
                  {officialSiteQrDataUrl ? (
                    <img src={officialSiteQrDataUrl} alt="رابط الجمعية" className="w-28 h-28 object-contain" />
                  ) : (
                    <QrCode className="w-28 h-28 text-slate-900" />
                  )}
                  <span className="text-[9px] font-bold text-slate-800 font-mono mt-1">riadataleata.com</span>
                </div>
              </div>

              {/* Back Face Footer: Barcode & Guidelines */}
              <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400">
                <span>في حال العثور على البطاقة يُرجى التواصل: info@riadataleata.org.sa</span>
                <span className="font-mono text-blue-300 font-bold">{volunteer.barcode || `MEM-${volunteer.membershipNumber || '2026'}`}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* 3. Action Buttons Bar (Download Front / Download Back / Print Both) */}
      {showActions && !isPrintMode && (
        <div className="w-full flex flex-wrap items-center justify-center gap-2 mt-4" dir="rtl">
          {onOpenVerification && (
            <button
              onClick={() => onOpenVerification(volunteer)}
              className="bg-blue-50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>معاينة التحقق الذكي</span>
            </button>
          )}

          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <RotateCw className="w-3.5 h-3.5 text-blue-600" />
            <span>{isFlipped ? "عرض الوجه الأمامي" : "عرض الوجه الخلفي (3D)"}</span>
          </button>

          <button
            onClick={() => exportCardAsImage("png", "front")}
            disabled={isExporting}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>تحميل الوجه الأمامي</span>
          </button>

          <button
            onClick={() => exportCardAsImage("png", "back")}
            disabled={isExporting}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" />
            <span>تحميل الوجه الخلفي</span>
          </button>

          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة الوجهين للبطاقة (CR80)</span>
          </button>

          {onReissue && (
            <button
              onClick={() => onReissue(volunteer.id)}
              className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
              <span>إعادة إصدار البطاقة</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
