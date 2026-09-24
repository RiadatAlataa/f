import React, { useState, useEffect } from "react";
import { 
  CreditCard, 
  Eye, 
  Download, 
  Calendar, 
  CheckCircle2, 
  X, 
  Sparkles,
  ShieldCheck,
  Printer,
  Info
} from "lucide-react";
import { Volunteer, VolunteerTeam, Department, VolunteerCardTemplate, Employee } from "../types";
import { CardRenderer } from "./CardRenderer";

interface VolunteerProfileCardSectionProps {
  volunteer?: Volunteer;
  employee?: Employee;
  teams: VolunteerTeam[];
  departments: Department[];
  title?: string;
  category?: "volunteer" | "leader" | "employee";
  onReissue?: () => void;
}

export const VolunteerProfileCardSection: React.FC<VolunteerProfileCardSectionProps> = ({
  volunteer,
  employee,
  teams = [],
  departments = [],
  title = "قسم: بطاقة المتطوع",
  category = "volunteer",
  onReissue
}) => {
  const [template, setTemplate] = useState<VolunteerCardTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch appropriate template
  useEffect(() => {
    let isMounted = true;
    const loadTemplate = async () => {
      setIsLoading(true);
      try {
        if (category === "employee" || employee) {
          const res = await fetch("/api/db/card-templates");
          const data = await res.json();
          const empTpl = data?.templates?.find((t: any) => t.category === "employee" || t.id === "tpl-emp-default");
          if (isMounted && empTpl) setTemplate(empTpl);
        } else if (category === "leader") {
          const teamId = volunteer?.teamId;
          if (teamId) {
            const res = await fetch(`/api/db/team-card-template/${teamId}`);
            const data = await res.json();
            if (isMounted && data?.template) {
              setTemplate(data.template);
              return;
            }
          }
          const res = await fetch("/api/db/card-templates");
          const data = await res.json();
          const ldrTpl = data?.templates?.find((t: any) => t.category === "leader" || t.id === "tpl-leader-default");
          if (isMounted && ldrTpl) setTemplate(ldrTpl);
        } else {
          // Volunteer template: check team specific first
          if (volunteer?.teamId) {
            const res = await fetch(`/api/db/team-card-template/${volunteer.teamId}`);
            const data = await res.json();
            if (isMounted && data?.template) {
              setTemplate(data.template);
              return;
            }
          }
          // Fallback to active template
          const res = await fetch("/api/db/card-templates");
          const data = await res.json();
          const targetGender = volunteer?.gender === "female" ? "female" : "male";
          const defaultTpl = data?.templates?.find((t: any) => 
            t.category === "volunteer" && (t.targetGender === targetGender || t.targetGender === "all")
          ) || data?.templates?.[0];
          if (isMounted && defaultTpl) setTemplate(defaultTpl);
        }
      } catch (err) {
        console.error("Failed to load card template:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadTemplate();
    return () => {
      isMounted = false;
    };
  }, [volunteer?.id, volunteer?.teamId, volunteer?.gender, employee?.id, category]);

  // Derive display entity as Volunteer object for CardRenderer compatibility
  const effectiveVolunteer: Volunteer = volunteer || (employee ? {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    nationalId: employee.nationalId,
    membershipNumber: employee.employeeNumber,
    departmentId: employee.departmentId,
    teamId: "",
    hours: 0,
    initiativesCount: 0,
    status: "active",
    joinDate: employee.hireDate || "2026-01-01",
    issueDate: employee.hireDate || "2026-01-01",
    expiryDate: "2027-01-01",
    barcode: employee.employeeNumber,
    points: 100,
    bloodType: "O+",
    nationality: "سعودي",
    jobTitle: employee.jobTitle,
    titleAr: employee.jobTitle,
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80"
  } : {
    id: "unknown",
    name: "متطوع",
    email: "",
    phone: "",
    nationalId: "1000000000",
    membershipNumber: "V-2026-0001",
    departmentId: departments[0]?.id || "",
    teamId: teams[0]?.id || "",
    hours: 0,
    initiativesCount: 0,
    status: "active",
    joinDate: "2026-01-15",
    issueDate: "2026-01-15",
    expiryDate: "2027-01-15",
    barcode: "100088868001",
    points: 25,
    bloodType: "O+",
    nationality: "سعودي",
    jobTitle: "متطوع",
    photo: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80"
  });

  const creationDate = effectiveVolunteer.issuedCard?.createdAt 
    || effectiveVolunteer.issueDate 
    || "2026-01-15";

  const lastUpdateDate = effectiveVolunteer.issuedCard?.updatedAt 
    || (effectiveVolunteer as any).updatedAt 
    || creationDate;

  const cardW = template?.width || 856;
  const cardH = template?.height || 540;

  return (
    <div id="volunteer-card-section" className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100/80">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-neutral-900">{title}</h3>
            <p className="text-[11px] text-neutral-500 font-medium">
              البطاقة الرقمية الرسمية المعتمدة بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>معتمدة ونشطة في الميدان</span>
          </span>
        </div>
      </div>

      {/* Main Content: Card Preview + Metadata & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Card Thumbnail / Preview (7 Cols) */}
        <div className="lg:col-span-7 flex justify-center py-2 bg-neutral-50/80 rounded-2xl border border-neutral-200/80 overflow-hidden relative group">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-neutral-400">
              جارٍ تحميل بطاقة المتطوع...
            </div>
          ) : (
            <div className="transform scale-[0.68] sm:scale-[0.8] md:scale-[0.88] origin-center transition-transform">
              <CardRenderer
                volunteer={effectiveVolunteer}
                template={template || undefined}
                teams={teams}
                departments={departments}
                showControls={false}
                scale={1}
              />
            </div>
          )}

          {/* Hover Overlay Hint */}
          <div className="absolute inset-0 bg-neutral-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <span className="bg-white/95 backdrop-blur-xs text-neutral-800 text-xs font-black px-4 py-2 rounded-xl shadow-md flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              انقر على "عرض البطاقة" للمعاينة الكاملة
            </span>
          </div>
        </div>

        {/* Card Info & Primary Actions (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Metadata Box */}
          <div className="bg-neutral-50/90 rounded-2xl p-4 border border-neutral-150 space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200/70">
              <span className="text-neutral-500 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                تاريخ إنشاء البطاقة:
              </span>
              <strong className="text-neutral-900 font-mono text-[11.5px]">{creationDate}</strong>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-neutral-200/70">
              <span className="text-neutral-500 font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                تاريخ آخر تحديث:
              </span>
              <strong className="text-emerald-800 font-mono text-[11.5px]">{lastUpdateDate}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-bold">أبعاد قالب البطاقة:</span>
              <span className="font-mono text-neutral-700 bg-white px-2 py-0.5 rounded-md border border-neutral-200 text-[10.5px]">
                {cardW} × {cardH} px
              </span>
            </div>
          </div>

          {/* Action Buttons: "عرض البطاقة" & "تحميل البطاقة" */}
          <div className="space-y-2.5 pt-1">
            {/* 1. View Card Button */}
            <button
              type="button"
              id="btn-view-card"
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>عرض البطاقة</span>
            </button>

            {/* 2. Download Card Button */}
            <button
              type="button"
              id="btn-download-card"
              onClick={() => setIsModalOpen(true)}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs py-3 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>تحميل البطاقة بجودة عالية ({cardW} × {cardH} px)</span>
            </button>
          </div>

          {/* Subtle Notice */}
          <p className="text-[10px] text-neutral-400 text-center">
            يتم تنزيل البطاقة بدقة مطابقة تماماً لأبعاد القالب الأصلي دون أي تشويه أو ضغط زائد.
          </p>

        </div>

      </div>

      {/* Full Size Card View Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-neutral-200 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <CreditCard className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900">
                    معاينة البطاقة الرسمية: {effectiveVolunteer.name}
                  </h3>
                  <span className="text-[11px] text-neutral-500 font-medium">
                    الأبعاد الرسمية: {cardW} × {cardH} بكسل • جمعية ريادة العطاء
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-all cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: High Resolution Card Display */}
            <div className="flex-1 overflow-auto flex justify-center py-4 bg-neutral-100 rounded-2xl border border-neutral-200">
              <CardRenderer
                volunteer={effectiveVolunteer}
                template={template || undefined}
                teams={teams}
                departments={departments}
                showControls={true}
                scale={0.88}
              />
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100">
              <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>البطاقة مجهزة ومربوطة بنظام التحقق السريع الميداني.</span>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs rounded-xl cursor-pointer transition-all self-end sm:self-auto"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
