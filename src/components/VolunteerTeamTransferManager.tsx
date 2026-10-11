import React, { useState, useEffect } from 'react';
import {
  Users,
  ArrowRightLeft,
  UserMinus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  Building2,
  Calendar,
  FileText,
  User,
  ShieldCheck,
  Send,
  Eye,
  History,
  Info
} from 'lucide-react';
import { Volunteer, VolunteerTeam, VolunteerTransferRequest } from '../types';

interface VolunteerTeamTransferManagerProps {
  teams: VolunteerTeam[];
  volunteers: Volunteer[];
  currentUser?: any;
  userRole?: string; // 'admin' | 'department_admin' | 'leader' | 'supervisor' | string;
  leaderTeamId?: string;
  onRefreshData?: () => void;
}

export const VolunteerTeamTransferManager: React.FC<VolunteerTeamTransferManagerProps> = ({
  teams = [],
  volunteers = [],
  currentUser,
  userRole = 'admin',
  leaderTeamId,
  onRefreshData
}) => {
  const [requests, setRequests] = useState<VolunteerTransferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'transfer' | 'terminate_affiliation'>('all');

  // Decision Modal State
  const [selectedRequest, setSelectedRequest] = useState<VolunteerTransferRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'approve' | 'reject'>('approve');
  const [chosenTargetTeamId, setChosenTargetTeamId] = useState<string>('');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Volunteer History Modal
  const [viewHistoryVol, setViewHistoryVol] = useState<Volunteer | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      let url = '/api/db/volunteerTransfers';
      if (userRole === 'leader' && leaderTeamId) {
        url += `?teamId=${leaderTeamId}&userRole=leader`;
      }
      const res = await fetch(url, {
        headers: {
          'x-user-role': userRole || 'admin'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching volunteer transfers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [userRole, leaderTeamId]);

  const handleOpenDecisionModal = (req: VolunteerTransferRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(req);
    setDecisionAction(action);
    setDecisionNotes('');
    setFeedbackMessage(null);
    if (req.requestType === 'transfer') {
      setChosenTargetTeamId(req.suggestedTeamId || (teams.filter(t => t.id !== req.currentTeamId)[0]?.id || ''));
    } else {
      setChosenTargetTeamId('');
    }
  };

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    if (decisionAction === 'reject' && !decisionNotes.trim()) {
      setFeedbackMessage({ type: 'error', text: 'يرجى كتابة سبب رفض الطلب بشكل واضح ليتم إشعار الأطراف به.' });
      return;
    }

    if (decisionAction === 'approve' && selectedRequest.requestType === 'transfer' && !chosenTargetTeamId) {
      setFeedbackMessage({ type: 'error', text: 'يرجى اختيار الفريق المعتمد لنقل المتطوع إليه.' });
      return;
    }

    setIsSubmittingDecision(true);
    setFeedbackMessage(null);

    try {
      const res = await fetch('/api/db/volunteerTransfers/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole || 'admin'
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: decisionAction,
          targetTeamId: chosenTargetTeamId,
          reviewerNotes: decisionNotes.trim(),
          reviewerName: currentUser?.name || 'إدارة التطوع'
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setFeedbackMessage({
          type: 'success',
          text: decisionAction === 'approve'
            ? (selectedRequest.requestType === 'transfer' ? 'تم اعتماد نقل المتطوع وتحديث ارتباطه بالفريق الجديد وحفظ السجل التاريخي بنجاح!' : 'تم اعتماد إنهاء الارتباط بالفريق وتحديث سجل المتطوع بنجاح!')
            : 'تم تسجيل رفض الطلب وحفظ سبب الرفض وإشعار قائد الفريق والمتطوع بالقرار.'
        });
        await fetchRequests();
        if (onRefreshData) onRefreshData();
        setTimeout(() => {
          setSelectedRequest(null);
          setFeedbackMessage(null);
        }, 1800);
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'حدث خطأ أثناء معالجة الطلب.' });
      }
    } catch (err) {
      console.error('Error submitting transfer decision:', err);
      setFeedbackMessage({ type: 'error', text: 'تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.' });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'pending' && req.status !== 'pending') return false;
    if (activeTab === 'approved' && req.status !== 'approved') return false;
    if (activeTab === 'rejected' && req.status !== 'rejected') return false;
    if (typeFilter !== 'all' && req.requestType !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = req.volunteerName?.toLowerCase().includes(q);
      const matchFile = req.volunteerFileNumber?.toLowerCase().includes(q);
      const matchTeam = req.currentTeamName?.toLowerCase().includes(q) || req.targetTeamName?.toLowerCase().includes(q) || req.suggestedTeamName?.toLowerCase().includes(q);
      const matchLeader = req.leaderName?.toLowerCase().includes(q);
      const matchReason = req.reason?.toLowerCase().includes(q);
      return matchName || matchFile || matchTeam || matchLeader || matchReason;
    }
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>إدارة التطوع • الحوكمة الرسمية لنقل المتطوعين</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black">إدارة طلبات نقل المتطوعين وإنهاء الارتباط</h2>
            <p className="text-xs text-emerald-100/80 max-w-2xl leading-relaxed">
              تتولى إدارة التطوع وحدها مراجعة طلبات النقل الواردة من قادة الفرق، والتحقق من أهلية النقل، واعتماد الانتقال بين الفرق مع الحفاظ التام على السجلات التاريخية وساعات التطوع ونقاط الحضور.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRequests}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-white/15 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>تحديث السجلات</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-neutral-100 dark:border-slate-700 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-bold">إجمالي الطلبات</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <strong className="text-2xl font-black text-neutral-800 dark:text-white block mt-2 font-mono">
            {requests.length}
          </strong>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">بانتظار المراجعة</span>
            <Clock className="w-4 h-4 text-amber-500 animate-spin" />
          </div>
          <strong className="text-2xl font-black text-amber-600 block mt-2 font-mono">
            {pendingCount}
          </strong>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">تم الاعتماد</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <strong className="text-2xl font-black text-emerald-600 block mt-2 font-mono">
            {approvedCount}
          </strong>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-700 dark:text-rose-400 font-bold">مرفوضة</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <strong className="text-2xl font-black text-rose-600 block mt-2 font-mono">
            {rejectedCount}
          </strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-neutral-150 dark:border-slate-700 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-slate-700 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-neutral-600 dark:text-slate-300 hover:text-neutral-900'
            }`}
          >
            الطلبات الجديدة ({pendingCount})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-slate-300 hover:text-neutral-900'
            }`}
          >
            المعتمدة ({approvedCount})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-neutral-600 dark:text-slate-300 hover:text-neutral-900'
            }`}
          >
            المرفوضة ({rejectedCount})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-600 dark:text-slate-300 hover:text-neutral-900'
            }`}
          >
            السجل الكامل ({requests.length})
          </button>
        </div>

        {/* Search & Type filter */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالمتطوع، رقم الملف، الفريق، أو القائد..."
              className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as any)}
            className="text-xs bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl px-2.5 py-2 font-bold text-neutral-700 dark:text-slate-200"
          >
            <option value="all">جميع أنواع الطلبات</option>
            <option value="transfer">نقل لفريق آخر فقط</option>
            <option value="terminate_affiliation">إنهاء ارتباط فقط</option>
          </select>
        </div>
      </div>

      {/* Requests Table / Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-neutral-400">جاري تحميل سجلات طلبات النقل...</div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-slate-700">
          <ArrowRightLeft className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-xs text-neutral-500 font-bold">لا توجد طلبات تطابق معايير التصفية المحددة حالياً.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-neutral-150 dark:border-slate-700 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-50 dark:bg-slate-750 text-neutral-500 dark:text-slate-400 font-bold border-b border-neutral-150 dark:border-slate-700">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">بيانات المتطوع ورقم الملف</th>
                  <th className="p-3">نوع الطلب</th>
                  <th className="p-3">الفريق الحالي</th>
                  <th className="p-3">الفريق المقترح / المستهدف</th>
                  <th className="p-3">مقدم الطلب (القائد)</th>
                  <th className="p-3">سبب الطلب</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-slate-700">
                {filteredRequests.map((req, idx) => {
                  const targetVolunteer = volunteers.find(v => v.id === req.volunteerId);
                  const isPending = req.status === 'pending';

                  return (
                    <tr key={req.id} className="hover:bg-neutral-50/50 dark:hover:bg-slate-750/50 transition-colors">
                      <td className="p-3 font-mono text-neutral-400 font-bold">{idx + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {req.volunteerName?.charAt(0) || 'م'}
                          </div>
                          <div>
                            <strong className="text-neutral-900 dark:text-white block font-bold">
                              {req.volunteerName}
                            </strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] bg-neutral-100 dark:bg-slate-700 px-1.5 py-0.2 rounded-xs font-bold text-neutral-600 dark:text-slate-300">
                                رقم الملف: {req.volunteerFileNumber || targetVolunteer?.fileNumber || targetVolunteer?.file_number || 'غير مسجل'}
                              </span>
                              {req.volunteerPhone && (
                                <span className="text-[10px] text-neutral-400 font-mono">
                                  {req.volunteerPhone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        {req.requestType === 'transfer' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>طلب نقل لفريق</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <UserMinus className="w-3 h-3" />
                            <span>إنهاء ارتباط بالفريق</span>
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className="font-bold text-neutral-700 dark:text-slate-300">
                          {req.currentTeamName}
                        </span>
                      </td>

                      <td className="p-3">
                        {req.requestType === 'transfer' ? (
                          req.status === 'approved' ? (
                            <strong className="text-emerald-700 dark:text-emerald-400 font-bold block">
                              {req.targetTeamName || req.suggestedTeamName}
                            </strong>
                          ) : (
                            <span className="text-neutral-600 dark:text-slate-300 font-medium">
                              {req.suggestedTeamName || 'متروك لتقدير الإدارة'}
                            </span>
                          )
                        ) : (
                          <span className="text-neutral-400 text-[11px]">
                            متطوع مستقل (بدون فريق)
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div>
                          <span className="font-bold text-neutral-800 dark:text-slate-200 block">
                            {req.leaderName}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <p className="text-neutral-700 dark:text-slate-300 font-medium line-clamp-2" title={req.reason}>
                          {req.reason}
                        </p>
                        {req.additionalNotes && (
                          <span className="text-[10px] text-neutral-400 block mt-0.5 line-clamp-1" title={req.additionalNotes}>
                            ملاحظات: {req.additionalNotes}
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        {req.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>بانتظار الاعتماد</span>
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>معتمد</span>
                            </span>
                            {req.reviewedBy && (
                              <span className="text-[9.5px] text-neutral-400 block">
                                بواسطة: {req.reviewedBy}
                              </span>
                            )}
                          </div>
                        )}
                        {req.status === 'rejected' && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="w-3 h-3" />
                              <span>مرفوض</span>
                            </span>
                            {req.reviewerNotes && (
                              <span className="text-[9.5px] text-rose-600 block line-clamp-1" title={req.reviewerNotes}>
                                {req.reviewerNotes}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPending && userRole !== 'leader' ? (
                            <>
                              <button
                                onClick={() => handleOpenDecisionModal(req, 'approve')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                title="اعتماد الطلب ونقل المتطوع رسمياً"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>اعتماد</span>
                              </button>
                              <button
                                onClick={() => handleOpenDecisionModal(req, 'reject')}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                title="رفض الطلب مع إبداء الأسباب"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رفض</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => {
                                const vol = volunteers.find(v => v.id === req.volunteerId);
                                if (vol) setViewHistoryVol(vol);
                              }}
                              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="عرض السجل التاريخي للمتطوع"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>السجل التاريخي</span>
                            </button>
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

      {/* Decision Review & Approval Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <form
            onSubmit={handleExecuteDecision}
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 text-right border border-neutral-100 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-up"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-neutral-150 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                {decisionAction === 'approve' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-rose-600" />
                )}
                <div>
                  <h3 className="text-base font-black text-neutral-800 dark:text-white">
                    {decisionAction === 'approve'
                      ? (selectedRequest.requestType === 'transfer' ? 'اعتماد نقل المتطوع إلى فريق جديد' : 'اعتماد إنهاء ارتباط المتطوع بالفريق')
                      : 'رفض طلب قائد الفريق بخصوص المتطوع'}
                  </h3>
                  <span className="text-[11px] text-neutral-400">إجراء صادر عن إدارة التطوع</span>
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

            {/* Volunteer & Request Snapshot */}
            <div className="bg-neutral-50 dark:bg-slate-700/50 p-4 rounded-2xl border border-neutral-150 dark:border-slate-600 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500 font-bold">اسم المتطوع:</span>
                <strong className="text-neutral-900 dark:text-white">{selectedRequest.volunteerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-bold">رقم الملف:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{selectedRequest.volunteerFileNumber}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-bold">الفريق الحالي:</span>
                <strong className="text-neutral-800 dark:text-slate-200">{selectedRequest.currentTeamName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 font-bold">قائد الفريق مقدم الطلب:</span>
                <span className="text-neutral-800 dark:text-slate-200">{selectedRequest.leaderName}</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 dark:border-slate-600">
                <span className="text-neutral-500 font-bold block mb-1">سبب الطلب حسب إفادة القائد:</span>
                <p className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-neutral-200 dark:border-slate-600 text-neutral-800 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedRequest.reason}
                </p>
              </div>
            </div>

            {/* Selection of New Team (if transferring and approved) */}
            {decisionAction === 'approve' && selectedRequest.requestType === 'transfer' && (
              <div className="space-y-1.5 text-xs">
                <label className="font-bold text-neutral-800 dark:text-slate-200 block">
                  الفريق المعتمد لنقل المتطوع إليه: <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={chosenTargetTeamId}
                  onChange={e => setChosenTargetTeamId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">-- اختر أحد الفرق التطوعية المعتمدة --</option>
                  {teams.filter(t => t.id !== selectedRequest.currentTeamId).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nameAr} ({t.leaderName ? `القائد: ${t.leaderName}` : 'فريق معتمد'})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400">
                  الفريق المقترح من القائد كان: <strong>{selectedRequest.suggestedTeamName || 'لم يُحدد'}</strong>
                </p>
              </div>
            )}

            {/* Decision Notes / Rejection Reason */}
            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-800 dark:text-slate-200 block">
                {decisionAction === 'approve' ? 'ملاحظات قرار الإدارة وتوجيهات النقل:' : 'سبب رفض الطلب (إلزامي ليتم إشعار القائد به):'}
                {decisionAction === 'reject' && <span className="text-rose-500"> *</span>}
              </label>
              <textarea
                required={decisionAction === 'reject'}
                rows={3}
                value={decisionNotes}
                onChange={e => setDecisionNotes(e.target.value)}
                placeholder={decisionAction === 'approve' ? 'ملاحظات إضافية، تعليمات التكليف، أو مبررات القبول...' : 'أدخل سبب عدم الموافقة على النقل بالتفصيل...'}
                className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Safeguards Notice */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <p>
                <strong>ضمان سلامة السجلات:</strong> يتم حفظ الفريق السابق والسجل التاريخي تلقائياً دون أي حذف لساعات التطوع أو النقاط أو الشهادات أو المبادرات السابقة.
              </p>
            </div>

            {/* Feedback Message */}
            {feedbackMessage && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                feedbackMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {feedbackMessage.text}
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex gap-2 pt-2 border-t border-neutral-150 dark:border-slate-700">
              <button
                type="submit"
                disabled={isSubmittingDecision}
                className={`flex-1 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all ${
                  decisionAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                    : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
                }`}
              >
                {isSubmittingDecision ? 'جاري التنفيذ...' : decisionAction === 'approve' ? 'تأكيد الاعتماد وتنفيذ النقل' : 'تأكيد الرفض وإشعار القائد'}
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

      {/* Volunteer Team History Record Modal */}
      {viewHistoryVol && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 text-right border border-neutral-100 dark:border-slate-700 shadow-2xl space-y-4 animate-scale-up" dir="rtl">
            <div className="flex items-center justify-between border-b border-neutral-150 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-base font-black text-neutral-800 dark:text-white">
                    السجل التاريخي لانتقالات المتطوع
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    {viewHistoryVol.name} (ملف: {viewHistoryVol.fileNumber || viewHistoryVol.file_number || '—'})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewHistoryVol(null)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {viewHistoryVol.teamHistory && viewHistoryVol.teamHistory.length > 0 ? (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {viewHistoryVol.teamHistory.map((hist, hIdx) => (
                  <div key={hIdx} className="bg-neutral-50 dark:bg-slate-700/50 p-3.5 rounded-2xl border border-neutral-200 dark:border-slate-600 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-neutral-800 dark:text-white">
                        من: <strong className="text-neutral-600 dark:text-slate-300">{hist.fromTeamName || 'فريق سابق'}</strong> ➔ إلى: <strong className="text-emerald-700 dark:text-emerald-400">{hist.toTeamName}</strong>
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(hist.transferredAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    {hist.reason && (
                      <p className="text-[11px] text-neutral-600 dark:text-slate-300">
                        السبب: {hist.reason}
                      </p>
                    )}
                    {hist.transferredBy && (
                      <span className="text-[9.5px] text-neutral-400 block">
                        المعتمد: {hist.transferredBy}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400">
                لا توجد انتقالات سابقة مسجلة لهذا المتطوع، وهو مسجل في فريقه الأصلي.
              </div>
            )}

            <div className="pt-2 border-t border-neutral-150 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setViewHistoryVol(null)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs px-5 py-2 rounded-xl cursor-pointer"
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
