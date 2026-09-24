import React, { useRef } from "react";
import { Download, Printer, RefreshCw, CheckCircle, ShieldAlert, Award } from "lucide-react";
import { Volunteer, Department, VolunteerTeam } from "../types";

interface SmartCardProps {
  volunteer: Volunteer;
  departments: Department[];
  teams: VolunteerTeam[];
  onReissue: (id: string) => void;
  isCompact?: boolean;
  cardTemplateUrl?: string;
  defaultFemaleAvatarUrl?: string;
}

export const SmartCard: React.FC<SmartCardProps> = ({
  volunteer,
  departments,
  teams,
  onReissue,
  isCompact = false,
  cardTemplateUrl,
  defaultFemaleAvatarUrl = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80"
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const team = teams.find((t) => t.id === volunteer.teamId);
  const dept = departments.find((d) => d.id === volunteer.departmentId);

  // Female photo logic: If volunteer is female, use admin's unified female photo
  let effectiveFemaleAvatar = defaultFemaleAvatarUrl;
  try {
    const savedSettings = localStorage.getItem('reyada_system_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (parsed?.files?.defaultFemaleAvatarUrl) {
        effectiveFemaleAvatar = parsed.files.defaultFemaleAvatarUrl;
      }
    }
  } catch (e) {
    // Ignore parse error
  }

  const isFemale = volunteer.gender === 'female' || volunteer.photo === 'female_unified' || (volunteer.name && (volunteer.name.includes('أنثى') || volunteer.name.includes('سارة') || volunteer.name.includes('مريم') || volunteer.name.includes('فاطمة') || volunteer.name.includes('نورة')));
  const avatarUrl = isFemale 
    ? (effectiveFemaleAvatar || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80")
    : (volunteer.photo && volunteer.photo !== 'female_unified' ? volunteer.photo : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop");

  // Determine Team Card Template Styling
  const cardBgStyle = team?.cardTemplateBg || 'emerald-gold';
  const bgImg = team?.cardBgImageUrl || cardTemplateUrl;

  let containerBgClass = "bg-gradient-to-br from-white via-emerald-50/60 to-amber-50/40 text-neutral-800 border-2 border-emerald-600";
  let headerTitleColor = "text-emerald-800";
  let subtextColor = "text-neutral-500";
  let badgeColorClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
  let accentGradient = "from-amber-500/15 to-transparent";
  let metaLabelColor = "text-neutral-500";
  let metaValueColor = "text-neutral-800";

  if (cardBgStyle === 'royal-blue') {
    containerBgClass = "bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 text-white border-2 border-blue-500";
    headerTitleColor = "text-blue-200";
    subtextColor = "text-blue-300/80";
    badgeColorClass = "bg-blue-500/20 text-blue-200 border-blue-400/40";
    accentGradient = "from-blue-400/20 to-transparent";
    metaLabelColor = "text-blue-300/80";
    metaValueColor = "text-white";
  } else if (cardBgStyle === 'deep-purple') {
    containerBgClass = "bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 text-white border-2 border-amber-400";
    headerTitleColor = "text-amber-300";
    subtextColor = "text-purple-200/80";
    badgeColorClass = "bg-amber-400/20 text-amber-200 border-amber-400/40";
    accentGradient = "from-amber-400/20 to-transparent";
    metaLabelColor = "text-amber-200/70";
    metaValueColor = "text-white";
  } else if (cardBgStyle === 'ruby-crimson') {
    containerBgClass = "bg-gradient-to-br from-slate-950 via-rose-950 to-red-950 text-white border-2 border-rose-500";
    headerTitleColor = "text-rose-300";
    subtextColor = "text-rose-200/80";
    badgeColorClass = "bg-rose-500/20 text-rose-200 border-rose-400/40";
    accentGradient = "from-rose-500/20 to-transparent";
    metaLabelColor = "text-rose-200/70";
    metaValueColor = "text-white";
  } else if (cardBgStyle === 'slate-dark') {
    containerBgClass = "bg-gradient-to-br from-neutral-900 via-neutral-800 to-slate-950 text-white border-2 border-emerald-500";
    headerTitleColor = "text-emerald-400";
    subtextColor = "text-neutral-400";
    badgeColorClass = "bg-emerald-500/20 text-emerald-200 border-emerald-400/40";
    accentGradient = "from-emerald-400/20 to-transparent";
    metaLabelColor = "text-neutral-400";
    metaValueColor = "text-white";
  } else if (cardBgStyle === 'custom-bg' && bgImg) {
    containerBgClass = "bg-white text-neutral-800 border-2 border-emerald-600 bg-cover bg-center";
  }

  const handlePrint = () => {
    const printContent = cardRef.current?.innerHTML;
    if (printContent) {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>بطاقة متطوع - ${volunteer.name}</title>
              <style>
                body { font-family: 'Tajawal', sans-serif; direction: rtl; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff; }
                .print-card { width: 380px; border: 2px solid #15803d; border-radius: 16px; padding: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%); position: relative; }
                .logo-sec { display: flex; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 12px; }
                .logo-text { font-weight: bold; color: #16a34a; font-size: 14px; text-align: right; }
                .v-photo { width: 85px; height: 85px; border-radius: 12px; object-fit: cover; border: 2px solid #16a34a; }
                .meta-row { display: flex; margin-bottom: 6px; font-size: 11px; }
                .meta-label { width: 80px; color: #64748b; font-weight: bold; }
                .meta-val { flex: 1; color: #1e293b; font-weight: 500; }
              </style>
            </head>
            <body>
              <div class="print-card">${printContent}</div>
              <script>window.print(); window.close();</script>
            </body>
          </html>
        `);
        win.document.close();
      }
    }
  };

  const triggerDownload = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(volunteer, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `card_${volunteer.membershipNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderSimulatedBarcode = (code: string) => {
    const bars = [];
    for (let i = 0; i < 42; i++) {
      const width = i % 3 === 0 ? "w-[1px]" : i % 5 === 0 ? "w-[3px]" : "w-[1.5px]";
      const opacity = i % 7 === 0 ? "opacity-30" : "opacity-100";
      bars.push(
        <div key={i} className={`bg-neutral-900 h-8 ${width} ${opacity}`} />
      );
    }
    return (
      <div className="flex flex-col items-center mt-3 bg-white/90 backdrop-blur-xs p-1.5 rounded-lg border border-neutral-200">
        <div className="flex justify-between w-48 h-8 items-end">{bars}</div>
        <span className="text-[10px] font-mono mt-1 text-neutral-600 font-bold tracking-widest">{code}</span>
      </div>
    );
  };

  const renderSimulatedQrCode = (text: string) => {
    return (
      <svg className="w-16 h-16 text-neutral-900 bg-white/90 p-1 rounded-lg border border-neutral-200 shadow-xs" viewBox="0 0 21 21" fill="currentColor">
        <path d="M0 0h7v7H0zm1 1v5h5V1zm1 1h3v3H2zm10-2h7v7h-7zm1 1v5h5V1zm1 1h3v3h-3zM0 14h7v7H0zm1 1v5h5v-5zm1 1h3v3H2zm9-5h2v2h-2zm2 2h2v2h-2zm-2 2h2v2h-2zm4-4h2v2h-2zm2 2h1v1h-1zm0 2h1v1h-1zm-6 2h2v2h-2zm4 2h2v1h-2zm2-4h1v2h-1zm-1-3h2v1h-2zm-4 4h1v1h-1z" />
      </svg>
    );
  };

  return (
    <div className={`flex flex-col ${isCompact ? "" : "bg-white dark:bg-neutral-900 p-5 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-xs"}`}>
      {/* Smart Card Container */}
      <div 
        ref={cardRef}
        id={`card-${volunteer.id}`}
        className={`relative w-full max-w-[390px] mx-auto overflow-hidden rounded-2xl p-5 shadow-md transition-all hover:shadow-lg ${containerBgClass}`}
        style={{
          backgroundImage: bgImg ? `url("${bgImg}")` : undefined,
          backgroundColor: bgImg ? "transparent" : undefined
        }}
        dir="rtl"
      >
        {bgImg && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] pointer-events-none -z-0" />
        )}
        <div className="relative z-10">
        {/* Decorative Corner Accent */}
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${accentGradient} rounded-bl-full pointer-events-none`} />

        {/* Association & Team Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            {/* Visual Logo Emblem or Team Logo */}
            {team?.logoUrl ? (
              <img src={team.logoUrl} alt={team.nameAr} className="w-9 h-9 rounded-full object-cover border border-amber-400 shadow-xs" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-xs font-bold text-sm border border-emerald-400">
                ر
              </div>
            )}
            <div className="text-right">
              <h4 className={`text-[11.5px] font-black leading-tight ${headerTitleColor}`}>جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h4>
              <p className={`text-[9px] leading-none ${subtextColor}`}>
                {team ? `قالب: ${team.nameAr}` : "لخدمة الإنسان بالعسيلة"}
              </p>
            </div>
          </div>
          <div className="text-left">
            <span className="text-[8px] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full text-current font-bold block mb-0.5 opacity-80">
              {team?.cardBadgeTitle || "بطاقة متطوع"}
            </span>
            <span className="text-[9px] font-mono font-bold opacity-90">100088868</span>
          </div>
        </div>

        {/* Card Body Profile & Details */}
        <div className="grid grid-cols-12 gap-3 items-start">
          {/* Volunteer Photo (Gender-Aware) */}
          <div className="col-span-4 flex flex-col items-center">
            <div className="relative">
              <img 
                src={avatarUrl} 
                alt={volunteer.name} 
                className="w-20 h-20 rounded-xl object-cover border-2 border-amber-400 shadow-xs bg-white"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs">
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
            </div>
            {/* Points Badge */}
            <div className="mt-2 flex items-center gap-1 bg-amber-400/20 text-amber-900 dark:text-amber-200 border border-amber-400/40 px-2 py-0.5 rounded-full text-[9px] font-bold shadow-2xs">
              <Award className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>{volunteer.points} نقطة</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="col-span-8 space-y-1.5 text-right pr-1">
            <div>
              <h3 className="text-xs font-black leading-tight">{volunteer.name}</h3>
              <p className="text-[10px] font-bold opacity-90">{volunteer.titleAr || "متطوع متميز"}</p>
            </div>

            <div className="space-y-1 border-t border-black/10 dark:border-white/10 pt-1 text-[10.5px]">
              <div className="flex justify-between">
                <span className={`font-bold ${metaLabelColor}`}>رقم العضوية:</span>
                <span className={`font-mono font-bold ${metaValueColor}`}>{volunteer.membershipNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className={`font-bold ${metaLabelColor}`}>الإدارة:</span>
                <span className={`font-medium ${metaValueColor}`}>{dept ? dept.nameAr : "غير محدد"}</span>
              </div>
              <div className="flex justify-between">
                <span className={`font-bold ${metaLabelColor}`}>الفريق:</span>
                <span className={`font-bold text-amber-500 ${metaValueColor}`}>{team ? team.nameAr : "غير محدد"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`font-bold ${metaLabelColor}`}>الجنس والبطاقة:</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xs text-[9px] font-bold">
                  {isFemale ? "أنثى (صورة موحدة)" : "ذكر (مؤكد)"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Barcode & QR footer */}
        <div className="grid grid-cols-12 gap-2 mt-2 pt-2 border-t border-black/10 dark:border-white/10 items-center">
          <div className="col-span-8">
            {renderSimulatedBarcode(volunteer.barcode || volunteer.membershipNumber)}
          </div>
          <div className="col-span-4 flex justify-end">
            {renderSimulatedQrCode(volunteer.qrCode || volunteer.membershipNumber)}
          </div>
        </div>

        {/* Card Validity Dates */}
        <div className="flex justify-between text-[8px] opacity-75 mt-2 font-mono">
          <span>إصدار: {volunteer.issueDate || "2026-01-01"}</span>
          <span>انتهاء: {volunteer.expiryDate || "2027-01-01"}</span>
        </div>
        </div>
      </div>

      {/* Card Actions */}
      {!isCompact && (
        <div className="grid grid-cols-3 gap-2 mt-4" dir="rtl">
          <button 
            id={`btn-download-${volunteer.id}`}
            onClick={triggerDownload}
            className="flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تنزيل</span>
          </button>
          <button 
            id={`btn-print-${volunteer.id}`}
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة</span>
          </button>
          <button 
            id={`btn-reissue-${volunteer.id}`}
            onClick={() => onReissue(volunteer.id)}
            className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>إعادة إصدار</span>
          </button>
        </div>
      )}
    </div>
  );
};
