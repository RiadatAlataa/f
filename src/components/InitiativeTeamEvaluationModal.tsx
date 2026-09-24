import React, { useState } from 'react';
import { 
  Award, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Sparkles, 
  Users, 
  Clock, 
  Send, 
  FileText 
} from 'lucide-react';
import { Initiative, VolunteerTeam } from '../types';

interface InitiativeTeamEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initiative: Initiative;
  teams: VolunteerTeam[];
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
    departmentId?: string;
  };
  onSubmitEvaluation: (payload: {
    initiativeId: string;
    evaluationType: 'completed_best' | 'average_with_notes';
    notes?: string;
    evaluatorName?: string;
    evaluatorRole?: string;
  }) => Promise<boolean>;
}

export const InitiativeTeamEvaluationModal: React.FC<InitiativeTeamEvaluationModalProps> = ({
  isOpen,
  onClose,
  initiative,
  teams = [],
  currentUser = { name: 'إدارة التطوع', role: 'volunteer_admin', departmentId: 'dep-5' },
  onSubmitEvaluation
}) => {
  const [evaluationType, setEvaluationType] = useState<'completed_best' | 'average_with_notes'>('completed_best');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !initiative) return null;

  const team = teams.find(t => t.id === initiative.teamId);
  const isLeader = currentUser.role === 'leader';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLeader) {
      setErrorMsg('لا يمكن لقائد الفريق تقييم المبادرة أو منح النقاط لنفسه. التقييم مخصص لإدارة التطوع أو الإدارة العليا فقط.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const ok = await onSubmitEvaluation({
        initiativeId: initiative.id,
        evaluationType,
        notes,
        evaluatorName: currentUser.name || 'إدارة التطوع',
        evaluatorRole: currentUser.role || 'volunteer_admin'
      });
      if (ok) {
        onClose();
      } else {
        setErrorMsg('تعذر حفظ التقييم واحتساب النقاط. يرجى المحاولة مرة أخرى.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-right" dir="rtl">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-neutral-200 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900">تقييم المبادرة ومنح نقاط الفريق التطوعي</h3>
              <p className="text-[10px] text-neutral-400">إدارة التطوع (dep-5) • احتساب نقاط الأداء وإتاحة تقييم المتطوعين</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 font-bold p-1">✕</button>
        </div>

        {/* Initiative & Team Summary Card */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-500">المبادرة المنفذة:</span>
            <span className="text-[10px] font-mono text-neutral-400">{initiative.date}</span>
          </div>
          <h4 className="font-bold text-xs text-neutral-900">{initiative.name}</h4>

          <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-neutral-700 font-bold">
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              <span>الفريق المسؤول: {team ? team.nameAr : (initiative.teamName || initiative.teamId)}</span>
            </div>
            <span className="text-[11px] text-neutral-500">الساعات: {initiative.hours || 4} ساعات</span>
          </div>
        </div>

        {/* Leader Warning */}
        {isLeader && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>تنبيه نظامي: لا يحق لقائد الفريق تقييم فريقه أو منح نفسه نقاطاً. التقييم محصور بإدارة التطوع والإدارة العليا.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Base Points Notice */}
          <div className="bg-emerald-50/80 p-3.5 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-emerald-950 block text-xs">النقاط الأساسية لإكمال المبادرة:</span>
                <span className="text-[10px] text-emerald-700">تمنح تلقائياً عند اعتماد إنهاء المبادرة</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-black text-xs font-mono">
              +5 نقاط أساسية
            </span>
          </div>

          {/* Evaluation Tier Options */}
          <div className="space-y-2">
            <label className="font-bold text-neutral-800 block">
              درجة تقييم إدارة التطوع للأداء الميداني:
            </label>

            <div className="space-y-2">
              <label 
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  evaluationType === 'completed_best'
                    ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/40'
                    : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="evalType"
                    checked={evaluationType === 'completed_best'}
                    onChange={() => setEvaluationType('completed_best')}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <div>
                    <div className="font-bold text-neutral-900 text-xs flex items-center gap-1.5">
                      <span>أكمل المبادرة بأفضل وجه</span>
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    </div>
                    <span className="text-[10px] text-neutral-500">أداء متميز وتغطية كاملة للمتطلبات والالتزام بالوقت</span>
                  </div>
                </div>

                <div className="text-left font-mono shrink-0">
                  <span className="text-xs font-black text-amber-700 block">+5 نقاط</span>
                  <span className="text-[9.5px] text-neutral-400">(المجموع 10 نقاط)</span>
                </div>
              </label>

              <label 
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  evaluationType === 'average_with_notes'
                    ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/40'
                    : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="evalType"
                    checked={evaluationType === 'average_with_notes'}
                    onChange={() => setEvaluationType('average_with_notes')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-bold text-neutral-900 text-xs">
                      المبادرة متوسطة وفيها بعض الملاحظات
                    </div>
                    <span className="text-[10px] text-neutral-500">تم إنجاز المبادرة مع وجود فرص تحسين ميدانية</span>
                  </div>
                </div>

                <div className="text-left font-mono shrink-0">
                  <span className="text-xs font-black text-blue-700 block">+3 نقاط</span>
                  <span className="text-[9.5px] text-neutral-400">(المجموع 8 نقاط)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Evaluation Notes */}
          <div>
            <label className="font-bold text-neutral-700 block mb-1">
              ملاحظات وتوجيهات إدارة التطوع للفريق:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب ملاحظات الأداء الميداني والتوصيات..."
              className="w-full px-3 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-900 focus:outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Volunteer Notification Highlight */}
          <div className="p-3 rounded-xl bg-neutral-100 border border-neutral-200 text-[10px] text-neutral-600 leading-relaxed">
            💡 فور اعتماد التقييم: سيتم تحديث نقاط الفريق في لوحة الصدارة، وإرسال إشعار فوري لجميع المتطوعين الحاضرين في المبادرة لإتاحة تقييمهم للتجربة والحصول على شهاداتهم ونقاطهم.
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 font-bold cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting || isLeader}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'جاري الاعتماد واحتساب النقاط...' : 'اعتماد التقييم ومنح النقاط'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
