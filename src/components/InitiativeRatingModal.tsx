import React, { useState } from "react";
import { Star, Award, CheckCircle2, Sparkles, Heart, MessageSquare, Send, ShieldCheck, AlertCircle } from "lucide-react";
import { Initiative, IssuedCertificate } from "../types";

interface InitiativeRatingModalProps {
  initiative: { id?: string; name: string };
  certificate?: IssuedCertificate;
  volunteerId: string;
  volunteerName: string;
  onSubmitRating: (payload: any) => Promise<boolean>;
  onClose: () => void;
}

export const InitiativeRatingModal: React.FC<InitiativeRatingModalProps> = ({
  initiative,
  certificate,
  volunteerId,
  volunteerName,
  onSubmitRating,
  onClose
}) => {
  const [overallRating, setOverallRating] = useState<number>(5);
  const [organizationRating, setOrganizationRating] = useState<number>(5);
  const [clarityRating, setClarityRating] = useState<number>(5);
  const [leaderSupportRating, setLeaderSupportRating] = useState<number>(5);
  const [teamworkRating, setTeamworkRating] = useState<number>(5);
  const [benefitRating, setBenefitRating] = useState<number>(5);
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        initiativeId: initiative.id,
        initiativeName: initiative.name,
        volunteerId,
        volunteerName,
        overallRating,
        organizationRating,
        clarityRating,
        leaderSupportRating,
        teamworkRating,
        benefitRating,
        feedbackText
      };
      const ok = await onSubmitRating(payload);
      if (ok) {
        onClose();
      } else {
        setErrorMsg('تعذر تسجيل التقييم، يرجى التأكد من الحضور الفعلي للمبادرة وعدم التقييم مسبقاً.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء إرسال التقييم');
    } finally {
      setLoading(false);
    }
  };

  const renderStarSelector = (value: number, onChange: (val: number) => void) => {
    return (
      <div className="flex items-center gap-1 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 text-xl transition-all hover:scale-125 focus:outline-none cursor-pointer"
          >
            <span className={star <= value ? "text-amber-400 font-bold drop-shadow-xs" : "text-neutral-300"}>
              ★
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right" dir="rtl">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center font-bold">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900">تقييم جودة المبادرة التطوعية</h3>
              <p className="text-[10px] text-neutral-400">تحقق آلي من الحضور • فتح الشهادة الرسمية • إضافة +3 نقاط لرصيدك</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-neutral-700 font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Initiative Card Info */}
        <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/60 space-y-1">
          <span className="text-[10px] text-emerald-800 font-bold block">المبادرة المنفذة:</span>
          <h4 className="text-xs font-black text-emerald-950">{initiative.name}</h4>
          <p className="text-[10px] text-emerald-700/80 pt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>تقييمك يفتح لك فوراً <b>شهادة الساعات التطوعية المعتمدة</b> ويمنحك <b>+3 نقاط تميز</b> في لوحة الصدارة.</span>
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Overall Rating */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/60">
            <div>
              <span className="text-xs font-black text-neutral-900 block">التقييم العام للمبادرة:</span>
              <span className="text-[10px] text-neutral-500">انطباعك الكلي عن التجربة التطوعية</span>
            </div>
            {renderStarSelector(overallRating, setOverallRating)}
          </div>

          {/* 5 Specific Criteria Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 text-center space-y-1">
              <span className="text-[11px] font-bold text-neutral-700 block">جودة التنظيم والإعداد</span>
              {renderStarSelector(organizationRating, setOrganizationRating)}
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 text-center space-y-1">
              <span className="text-[11px] font-bold text-neutral-700 block">وضوح المهام والتعليمات</span>
              {renderStarSelector(clarityRating, setClarityRating)}
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 text-center space-y-1">
              <span className="text-[11px] font-bold text-neutral-700 block">تعامل ودعم قائد الفريق</span>
              {renderStarSelector(leaderSupportRating, setLeaderSupportRating)}
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 text-center space-y-1">
              <span className="text-[11px] font-bold text-neutral-700 block">روح التعاون بين المتطوعين</span>
              {renderStarSelector(teamworkRating, setTeamworkRating)}
            </div>

            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200/60 text-center space-y-1 sm:col-span-2">
              <span className="text-[11px] font-bold text-neutral-700 block">الفائدة المجتمعية والأثر المكتسب</span>
              {renderStarSelector(benefitRating, setBenefitRating)}
            </div>
          </div>

          {/* Written Feedback Text */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-neutral-700 block">
              مقترحاتك وملحوظاتك لتطوير الفعاليات مستقبلاً (اختياري):
            </label>
            <textarea
              rows={2}
              placeholder="اكتب انطباعك أو أي مقترحات ترغب بتركها لإدارة التطوع..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full border border-neutral-200 rounded-2xl p-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:bg-neutral-300"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'جاري التحقق والاعتماد...' : 'إرسال التقييم واعتماد النقاط والشهادة 🌟'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
