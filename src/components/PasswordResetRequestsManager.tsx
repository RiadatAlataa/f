import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Search,
  Filter,
  User,
  Phone,
  Mail,
  Building2,
  AlertCircle,
  Check,
  Lock,
  RefreshCw,
  FileText,
  ShieldCheck
} from 'lucide-react';
import { PasswordResetRequest, Volunteer } from '../types';

interface PasswordResetRequestsManagerProps {
  currentUser?: any;
  userRole?: string;
  onRefreshData?: () => void;
}

export const PasswordResetRequestsManager: React.FC<PasswordResetRequestsManagerProps> = ({
  currentUser,
  userRole = 'admin',
  onRefreshData
}) => {
  const [requests, setRequests] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'under_review' | 'reset_link_sent' | 'completed' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Action modal
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [actionType, setActionType] = useState<'under_review' | 'send_reset_link' | 'reject' | 'complete'>('send_reset_link');
  const [actionNotes, setActionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string; token?: string } | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/db/passwordResetRequests', {
        headers: {
          'x-user-role': userRole || 'admin'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching password reset requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [userRole]);

  const handleOpenActionModal = (req: PasswordResetRequest, action: 'under_review' | 'send_reset_link' | 'reject' | 'complete') => {
    setSelectedRequest(req);
    setActionType(action);
    setActionNotes('');
    setFeedback(null);
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (actionType === 'reject' && !actionNotes.trim()) {
      setFeedback({ type: 'error', text: 'يرجى كتابة سبب رفض طلب إعادة التعيين لإشعار قائد الفريق به.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/db/passwordResetRequests/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole || 'admin'
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: actionType,
          notes: actionNotes.trim(),
          adminName: currentUser?.name || 'مدير العمليات'
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        const generatedToken = data.request?.resetToken;
        let successMsg = 'تم تنفيذ الإجراء بنجاح!';
        if (actionType === 'send_reset_link') {
          successMsg = 'تم اعتماد الطلب وتوليد كود التحقق الآمن المؤقت وإرسال التعليمات للمتطوع مباشرة وإشعار قائد الفريق.';
        } else if (actionType === 'under_review') {
          successMsg = 'تم تغيير حالة الطلب إلى (قيد المراجعة والتحقق الأمني).';
        } else if (actionType === 'reject') {
          successMsg = 'تم تسجيل رفض الطلب وتدوين السبب وإشعار قائد الفريق.';
        } else if (actionType === 'complete') {
          successMsg = 'تم تحديد العملية كمكتملة بنجاح.';
        }

        setFeedback({
          type: 'success',
          text: successMsg,
          token: generatedToken
        });
        await fetchRequests();
        if (onRefreshData) onRefreshData();

        setTimeout(() => {
          setSelectedRequest(null);
          setFeedback(null);
        }, 2200);
      } else {
        setFeedback({ type: 'error', text: data.error || 'حدث خطأ أثناء معالجة الطلب.' });
      }
    } catch (err) {
      console.error('Error submitting password reset action:', err);
      setFeedback({ type: 'error', text: 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = req.volunteerName?.toLowerCase().includes(q);
      const matchFile = req.volunteerFileNumber?.toLowerCase().includes(q);
      const matchTeam = req.teamName?.toLowerCase().includes(q);
      const matchLeader = req.leaderName?.toLowerCase().includes(q);
      const matchPhone = req.volunteerPhone?.toLowerCase().includes(q);
      return matchName || matchFile || matchTeam || matchLeader || matchPhone;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            <span>جديد</span>
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 animate-spin" />
            <span>قيد المراجعة</span>
          </span>
        );
      case 'reset_link_sent':
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Send className="w-3 h-3" />
            <span>تم إرسال رابط إعادة التعيين</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>مكتمل</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            <span>مرفوض</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-neutral-100 text-neutral-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>إدارة العمليات • الحماية والتحقق الأمني للحسابات</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black">طلبات تغيير كلمات المرور للمتطوعين</h2>
            <p className="text-xs text-indigo-100/80 max-w-2xl leading-relaxed">
              إدارة الطلبات المرفوعة من قادة الفرق لتغيير كلمات مرور متطوعيهم. يتم التحقق الأمني من هوية المتطوع وصلاحية القائد، وإصدار روابط أو أكواد إعادة تعيين مشفرة ومؤقتة ترسل للمتطوع مباشرة دون كشف كلمة المرور لأي طرف ثالث.
            </p>
          </div>

          <button
            onClick={fetchRequests}
            className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/15 transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تحديث الطلبات</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-neutral-100 dark:border-slate-700 shadow-xs">
          <span className="text-xs text-neutral-500 font-bold">إجمالي الطلبات</span>
          <strong className="text-2xl font-black text-neutral-800 dark:text-white block mt-2 font-mono">
            {requests.length}
          </strong>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-xs">
          <span className="text-xs text-blue-700 dark:text-blue-400 font-bold">طلبات جديدة</span>
          <strong className="text-2xl font-black text-blue-600 block mt-2 font-mono">
            {requests.filter(r => r.status === 'new').length}
          </strong>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-xs">
          <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">قيد المراجعة</span>
          <strong className="text-2xl font-black text-amber-600 block mt-2 font-mono">
            {requests.filter(r => r.status === 'under_review').length}
          </strong>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 shadow-xs">
          <span className="text-xs text-purple-700 dark:text-purple-400 font-bold">تم إرسال الرابط</span>
          <strong className="text-2xl font-black text-purple-600 block mt-2 font-mono">
            {requests.filter(r => r.status === 'reset_link_sent').length}
          </strong>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">مكتملة</span>
          <strong className="text-2xl font-black text-emerald-600 block mt-2 font-mono">
            {requests.filter(r => r.status === 'completed').length}
          </strong>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-neutral-150 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-slate-700 p-1 rounded-xl overflow-x-auto">
          {(['all', 'new', 'under_review', 'reset_link_sent', 'completed', 'rejected'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-neutral-600 dark:text-slate-300 hover:text-neutral-900'
              }`}
            >
              {st === 'all' && 'الكل'}
              {st === 'new' && 'الجديدة'}
              {st === 'under_review' && 'قيد المراجعة'}
              {st === 'reset_link_sent' && 'تم إرسال الرابط'}
              {st === 'completed' && 'المكتملة'}
              {st === 'rejected' && 'المرفوضة'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 md:max-w-md">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث بالمتطوع، رقم الملف، الهاتف، أو القائد..."
            className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Requests Table */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-neutral-400">جاري تحميل طلبات تغيير كلمات المرور...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-slate-700">
          <KeyRound className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-bold">لا توجد طلبات مطابقة للمعايير المحددة حالياً.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-neutral-150 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-50 dark:bg-slate-750 text-neutral-500 dark:text-slate-400 font-bold border-b border-neutral-150 dark:border-slate-700">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">المتطوع ورقم الملف</th>
                  <th className="p-3">وسيلة الاتصال الموثقة</th>
                  <th className="p-3">الفريق وقائده</th>
                  <th className="p-3">سبب الطلب</th>
                  <th className="p-3">تاريخ الطلب</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">إجراء مدير العمليات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-700">
                {filteredRequests.map((req, idx) => {
                  const canAction = req.status === 'new' || req.status === 'under_review';

                  return (
                    <tr key={req.id} className="hover:bg-neutral-50/50 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="p-3 font-mono text-neutral-400 font-bold">{idx + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                            <KeyRound className="w-4 h-4" />
                          </div>
                          <div>
                            <strong className="text-neutral-900 dark:text-white block font-bold">
                              {req.volunteerName}
                            </strong>
                            <span className="font-mono text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                              ملف: {req.volunteerFileNumber || '—'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono">
                        <div className="space-y-0.5">
                          {req.volunteerPhone && (
                            <span className="text-[11px] text-neutral-700 dark:text-slate-300 block">
                              📞 {req.volunteerPhone}
                            </span>
                          )}
                          {req.volunteerEmail && (
                            <span className="text-[10px] text-neutral-400 block">
                              ✉️ {req.volunteerEmail}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-neutral-800 dark:text-slate-200 block">
                          {req.teamName}
                        </span>
                        <span className="text-[10px] text-neutral-400 block">
                          القائد: {req.leaderName}
                        </span>
                      </td>

                      <td className="p-3 max-w-xs">
                        <p className="text-neutral-700 dark:text-slate-300 font-medium line-clamp-2" title={req.reason}>
                          {req.reason}
                        </p>
                        {req.additionalNotes && (
                          <span className="text-[10px] text-neutral-400 block mt-0.5" title={req.additionalNotes}>
                            ملاحظات: {req.additionalNotes}
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-[10.5px] text-neutral-500">
                        {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                      </td>

                      <td className="p-3">
                        {getStatusBadge(req.status)}
                        {req.reviewerNotes && (
                          <span className="text-[9.5px] text-neutral-400 block mt-1 line-clamp-1" title={req.reviewerNotes}>
                            {req.reviewerNotes}
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canAction ? (
                            <>
                              <button
                                onClick={() => handleOpenActionModal(req, 'send_reset_link')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                title="إرسال رابط/كود إعادة التعيين الآمن للمتطوع"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>إرسال الرابط</span>
                              </button>
                              <button
                                onClick={() => handleOpenActionModal(req, 'under_review')}
                                className="bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                                title="وضع قيد المراجعة والتحقق"
                              >
                                <span>مراجعة</span>
                              </button>
                              <button
                                onClick={() => handleOpenActionModal(req, 'reject')}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-all cursor-pointer"
                                title="رفض الطلب مع توضيح السبب"
                              >
                                <span>رفض</span>
                              </button>
                            </>
                          ) : req.status === 'reset_link_sent' ? (
                            <button
                              onClick={() => handleOpenActionModal(req, 'complete')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="تأكيد اكتمال التعيين"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>إتمام</span>
                            </button>
                          ) : (
                            <span className="text-neutral-400 text-[10px]">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Dialog Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <form
            onSubmit={handleExecuteAction}
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 text-right border border-neutral-100 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-up"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-neutral-150 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="text-base font-black text-neutral-800 dark:text-white">
                    {actionType === 'send_reset_link' && 'اعتماد وإرسال رابط إعادة التعيين الآمن'}
                    {actionType === 'under_review' && 'وضع الطلب قيد المراجعة والتحقق الأمني'}
                    {actionType === 'reject' && 'رفض طلب تغيير كلمة المرور'}
                    {actionType === 'complete' && 'تحديد العملية كمكتملة'}
                  </h3>
                  <span className="text-[11px] text-neutral-400">إجراء صادر عن مدير العمليات</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Target Volunteer Summary */}
            <div className="bg-neutral-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-neutral-150 dark:border-slate-600 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-bold">المتطوع:</span>
                <strong className="text-neutral-900 dark:text-white">{selectedRequest.volunteerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-bold">رقم الملف:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{selectedRequest.volunteerFileNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-bold">رقم الجوال المعتمد:</span>
                <span className="text-neutral-800 dark:text-slate-200 font-mono">{selectedRequest.volunteerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-bold">مقدم الطلب (قائد الفريق):</span>
                <span className="text-neutral-800 dark:text-slate-200">{selectedRequest.leaderName} ({selectedRequest.teamName})</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-slate-600">
                <span className="text-neutral-500 font-bold block mb-1">سبب طلب القائد:</span>
                <p className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-neutral-200 dark:border-slate-600 text-neutral-800 dark:text-slate-200">
                  {selectedRequest.reason}
                </p>
              </div>
            </div>

            {/* Security Warning Notice */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-800/50 text-[11px] text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
              <p>
                <strong>الضوابط الأمنية:</strong> لا يتم إرسال كلمات المرور كنص صريح مطلقاً ولا يتم إظهارها لقائد الفريق. يتم توليد رابط/كود مؤقت مشفر صالح لمدة 24 ساعة فقط يُسلَّم للمتطوع لتعيين كلمة مروره بنفسه.
              </p>
            </div>

            {/* Notes / Reason field */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-800 dark:text-slate-200 block">
                {actionType === 'reject' ? 'سبب الرفض (إلزامي ليتم إشعار القائد به):' : 'ملاحظات الإجراء والتحقق الأمني:'}
                {actionType === 'reject' && <span className="text-rose-500"> *</span>}
              </label>
              <textarea
                required={actionType === 'reject'}
                rows={3}
                value={actionNotes}
                onChange={e => setActionNotes(e.target.value)}
                placeholder={actionType === 'reject' ? 'أدخل مبررات الرفض الأمنية أو الإدارية...' : 'ملاحظات التحقق من هوية المتطوع أو التعليمات...'}
                className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Feedback message */}
            {feedback && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                <p>{feedback.text}</p>
                {feedback.token && (
                  <p className="mt-1 font-mono text-[11px] text-indigo-700">
                    كود التحقق الآمن المؤقت المتولد: <strong>{feedback.token}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 pt-2 border-t border-neutral-150 dark:border-slate-700">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`flex-1 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all ${
                  actionType === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                    : 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400'
                }`}
              >
                {isSubmitting ? 'جاري التنفيذ...' : actionType === 'send_reset_link' ? 'اعتماد وإرسال كود التعيين للمتطوع' : actionType === 'reject' ? 'تأكيد الرفض وإشعار القائد' : 'تأكيد الإجراء'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
