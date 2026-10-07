import React, { useState } from "react";
import { 
  Activity, ShieldCheck, AlertTriangle, Wrench, CheckCircle2, 
  Clock, User, RefreshCw, MessageSquare, Globe, Eye, Save, X
} from "lucide-react";

export interface SiteStatusManagerProps {
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  maintenanceUpdatedAt?: string;
  maintenanceUpdatedBy?: string;
  onToggleMaintenance: (enabled: boolean, message?: string) => Promise<boolean>;
  logs?: any[];
  currentUser?: any;
  lang?: 'ar' | 'en';
}

export const SiteStatusManager: React.FC<SiteStatusManagerProps> = ({
  maintenanceMode,
  maintenanceMessage = "نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.",
  maintenanceUpdatedAt,
  maintenanceUpdatedBy,
  onToggleMaintenance,
  logs = [],
  currentUser,
  lang = 'ar'
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetAction, setTargetAction] = useState<'enable' | 'disable'>('enable');
  const [customMessage, setCustomMessage] = useState(maintenanceMessage);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filter logs related to maintenance
  const maintenanceLogs = (logs || []).filter(l => 
    (l.action && (l.action.includes("صيانة") || l.action.includes("Maintenance"))) ||
    (l.details && (l.details.includes("صيانة") || l.details.includes("Maintenance")))
  );

  const handleOpenConfirm = (action: 'enable' | 'disable') => {
    setTargetAction(action);
    setFeedback(null);
    setIsModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const willEnable = targetAction === 'enable';
      const success = await onToggleMaintenance(willEnable, customMessage);
      if (success) {
        setFeedback({
          type: 'success',
          text: willEnable ? "تم تفعيل وضع الصيانة بنجاح وإغلاق الموقع العام." : "تم إعادة تشغيل الموقع بنجاح وإتاحته للزوار."
        });
        setIsModalOpen(false);
      } else {
        setFeedback({
          type: 'error',
          text: "تعذر تغيير حالة وضع الصيانة، يرجى التحقق من صلاحياتك والاتصال بالخادم."
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || "حدث خطأ غير متوقع."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "غير محدد";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString('ar-SA', { 
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all shadow-sm ${
          feedback.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertTriangle className="w-5 h-5 text-rose-600" />}
            <span>{feedback.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Status Card */}
      <div className={`rounded-3xl p-6 sm:p-8 border shadow-lg relative overflow-hidden transition-all ${
        maintenanceMode 
          ? 'bg-gradient-to-br from-rose-950/90 via-slate-900 to-rose-900 text-white border-rose-700/50'
          : 'bg-gradient-to-br from-emerald-950/90 via-slate-900 to-teal-900 text-white border-emerald-700/50'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black border backdrop-blur-md ${
                maintenanceMode
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${maintenanceMode ? 'bg-rose-500 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                <span>{maintenanceMode ? '🔴 الموقع تحت الصيانة' : '🟢 الموقع يعمل بشكل طبيعي'}</span>
              </span>

              <span className="text-xs text-slate-300/80 bg-black/20 px-3 py-1 rounded-full border border-white/10">
                مربوط بقاعدة البيانات المركزية
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {maintenanceMode ? "وضع الصيانة مفعل (الموقع مغلق أمام الزوار)" : "بوابة الجمعية تعمل بشكل كامل لكافة الزوار"}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300/90 max-w-2xl leading-relaxed">
              {maintenanceMode 
                ? "يتم حالياً تحويل جميع الزوار تلقائياً إلى صفحة الصيانة المخصصة مع إبقاء لوحة التحكم نشطة للإدارة."
                : "الصفحة الرئيسية وجميع أقسام الموقع متاحة ومستقرة للزوار والمتطوعين والمستفيدين."}
            </p>

            {/* Last update metadata */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-300/70 pt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>آخر تحديث: {formatDate(maintenanceUpdatedAt)}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>بواسطة: {maintenanceUpdatedBy || "الإدارة العامة"}</span>
              </span>
            </div>
          </div>

          {/* Quick Toggle CTA */}
          <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            {maintenanceMode ? (
              <button
                type="button"
                onClick={() => handleOpenConfirm('disable')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-emerald-400/40"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>إعادة تشغيل الموقع للزوار</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleOpenConfirm('enable')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-sm shadow-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-rose-400/40"
              >
                <Wrench className="w-5 h-5 text-rose-200" />
                <span>تفعيل وضع الصيانة</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Grid: Maintenance Message & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Settings Box */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                رسالة الصيانة المعروضة للزوار
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تظهر هذه الرسالة في منتصف شاشة الزائر عند دخول الموقع أثناء تفعيل الصيانة
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              نص الرسالة التوضيحية
            </label>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed font-medium focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
              placeholder="اكتب الرسالة التي تود إظهارها للجمهور أثناء الصيانة..."
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => onToggleMaintenance(maintenanceMode, customMessage)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ نص الرسالة</span>
            </button>

            <span className="text-[11px] text-slate-400">
              يتم الحفظ مباشرة في قاعدة البيانات
            </span>
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                معاينة شاشة الزائر الحالية
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                كيف تظهر الرسالة للزائر عند دخوله أثناء وضع الصيانة
              </p>
            </div>
          </div>

          {/* Mini Simulated Screen */}
          <div className="bg-slate-100 dark:bg-slate-950 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
              <Wrench className="w-6 h-6 animate-pulse" />
            </div>
            <h4 className="font-black text-slate-900 dark:text-white text-sm">
              الموقع تحت الصيانة
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 font-medium">
              {customMessage}
            </p>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
              جمعية ريادة العطاء لخدمة الإنسان بالعسيلة • ترخيص: 1000888600
            </div>
          </div>
        </div>
      </div>

      {/* Activity Logs for Maintenance Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                سجل عمليات وضع الصيانة
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                تسجيل رسمي لكافة مرات التشغيل والإيقاف والمستخدمين المنفذين
              </p>
            </div>
          </div>
        </div>

        {maintenanceLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            لم تُسجل أي عمليات تشغيل أو إيقاف حديثة للصيانة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <th className="pb-3 font-bold">المستخدم المنفذ</th>
                  <th className="pb-3 font-bold">العملية</th>
                  <th className="pb-3 font-bold">التاريخ والوقت</th>
                  <th className="pb-3 font-bold">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {maintenanceLogs.slice(0, 10).map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.user || log.userName || "المدير"}</span>
                    </td>
                    <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                      {log.action || log.details}
                    </td>
                    <td className="py-3 text-slate-500 font-mono text-[11px]">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {log.result || "ناجح"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL (Strictly Required by Specification #8) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 text-right">
            
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                targetAction === 'enable' 
                  ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 text-rose-600'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-emerald-600'
              }`}>
                {targetAction === 'enable' ? <Wrench className="w-7 h-7" /> : <CheckCircle2 className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {targetAction === 'enable' 
                    ? "هل أنت متأكد من تفعيل وضع الصيانة؟"
                    : "هل تريد إعادة الموقع للعمل؟"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {targetAction === 'enable'
                    ? "سيتم إيقاف الموقع العام أمام الزوار حتى يتم إيقاف وضع الصيانة."
                    : "سيتم فتح الموقع العام وإتاحته لجميع الزوار والمستفيدين فوراً."}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={isSubmitting}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                  targetAction === 'enable'
                    ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50'
                    : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50'
                }`}
              >
                {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{targetAction === 'enable' ? 'تفعيل الصيانة' : 'إعادة تشغيل الموقع'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
