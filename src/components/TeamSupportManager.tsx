import React, { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  MessageSquare,
  Send,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Users,
  Building2,
  Paperclip,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { SupportTicket, SupportMessage, Volunteer, VolunteerTeam } from '../types';

interface TeamSupportManagerProps {
  currentUser?: any;
  userRole: 'volunteer' | 'leader' | 'admin' | 'support' | string;
  volunteer?: Volunteer;
  team?: VolunteerTeam;
  teamVolunteers?: Volunteer[];
  teams?: VolunteerTeam[];
  onRefreshData?: () => void;
}

export const TeamSupportManager: React.FC<TeamSupportManagerProps> = ({
  currentUser,
  userRole = 'volunteer',
  volunteer,
  team,
  teamVolunteers = [],
  teams = [],
  onRefreshData
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved' | 'closed'>('all');

  // New Ticket Form State
  const [issueType, setIssueType] = useState<string>('account_team');
  const [subject, setSubject] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [onBehalfOfVolunteerId, setOnBehalfOfVolunteerId] = useState<string>('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reply Form State
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachmentUrl, setReplyAttachmentUrl] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      let url = '/api/support/team-tickets?';
      const params = new URLSearchParams();
      params.append('userRole', userRole);

      if (userRole === 'volunteer') {
        const vId = volunteer?.id || currentUser?.id;
        if (vId) params.append('volunteerId', vId);
      } else if (userRole === 'leader') {
        const lId = currentUser?.id || team?.leaderId || 'leader';
        params.append('requesterId', lId);
        if (team?.id) params.append('teamId', team.id);
      }

      url += params.toString();
      const res = await fetch(url, {
        headers: {
          'x-user-role': userRole
        }
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setTickets(list);

        // Keep selected ticket updated if viewing one
        if (selectedTicket) {
          const fresh = list.find((t: any) => t.id === selectedTicket.id);
          if (fresh) setSelectedTicket(fresh);
        }
      }
    } catch (err) {
      console.error('Error fetching team support tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [userRole, volunteer?.id, team?.id]);

  useEffect(() => {
    if (selectedTicket && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.chatTranscript]);

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) {
      setFormError('يرجى كتابة موضوع التذكرة وتفاصيل الاستفسار أو المشكلة.');
      return;
    }

    setIsSubmittingTicket(true);
    setFormError(null);

    const isLeader = userRole === 'leader';
    const targetVolunteer = isLeader && onBehalfOfVolunteerId
      ? teamVolunteers.find(v => v.id === onBehalfOfVolunteerId)
      : volunteer;

    const requesterId = isLeader ? (currentUser?.id || team?.leaderId || 'leader') : (volunteer?.id || currentUser?.id || 'vol');
    const requesterName = isLeader ? (currentUser?.name || team?.leaderName || 'قائد الفريق') : (volunteer?.name || currentUser?.name || 'متطوع');
    const requesterRole = isLeader ? 'leader' : 'volunteer';

    const attachmentsList = attachmentUrl.trim() ? [attachmentUrl.trim()] : [];

    try {
      const res = await fetch('/api/support/team-tickets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({
          requesterId,
          requesterName,
          requesterRole,
          volunteerId: targetVolunteer?.id || (isLeader ? undefined : requesterId),
          volunteerName: targetVolunteer?.name || (isLeader ? undefined : requesterName),
          volunteerFileNumber: targetVolunteer?.fileNumber || targetVolunteer?.file_number || '—',
          teamId: team?.id || volunteer?.teamId || '',
          teamName: team?.nameAr || '',
          issueType,
          subject: subject.trim(),
          initialMessage: initialMessage.trim(),
          priority,
          isCreatedByLeader: isLeader,
          onBehalfOfVolunteerId: isLeader ? onBehalfOfVolunteerId : undefined,
          attachments: attachmentsList
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setSubject('');
        setInitialMessage('');
        setAttachmentUrl('');
        setOnBehalfOfVolunteerId('');
        setIsCreatingTicket(false);
        await fetchTickets();
        if (data.ticket) {
          setSelectedTicket(data.ticket);
        }
        if (onRefreshData) onRefreshData();
      } else {
        setFormError(data.error || 'حدث خطأ أثناء فتح التذكرة.');
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
      setFormError('تعذر الاتصال بالخادم. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setIsSendingReply(true);

    const isStaff = userRole === 'admin' || userRole === 'support';
    const senderType = isStaff ? 'agent' : 'user';
    const senderName = isStaff
      ? (currentUser?.name || 'فريق الدعم الفني')
      : (userRole === 'leader' ? (currentUser?.name || 'قائد الفريق') : (volunteer?.name || currentUser?.name || 'المتطوع'));

    const attachmentsList = replyAttachmentUrl.trim() ? [replyAttachmentUrl.trim()] : [];

    try {
      const res = await fetch('/api/support/team-tickets/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': userRole
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          senderType,
          senderName,
          content: replyMessage.trim(),
          attachments: attachmentsList
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setReplyMessage('');
        setReplyAttachmentUrl('');
        setSelectedTicket(data.ticket);
        await fetchTickets();
        if (onRefreshData) onRefreshData();
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = t.ticketNumber?.toLowerCase().includes(q);
      const matchSub = t.subject?.toLowerCase().includes(q);
      const matchReq = t.requesterName?.toLowerCase().includes(q);
      const matchVol = t.volunteerName?.toLowerCase().includes(q);
      return matchNum || matchSub || matchReq || matchVol;
    }
    return true;
  });

  const getIssueTypeLabel = (type?: string) => {
    switch (type) {
      case 'account_team':
        return 'استفسار عن الحساب أو الفريق';
      case 'registration_join':
        return 'مشكلة في التسجيل أو الانضمام للفريق';
      case 'initiatives_opportunities':
        return 'استفسار عن المبادرات والفرص التطوعية';
      case 'hours_points_attendance':
        return 'مشكلة في الحضور أو النقاط أو الساعات';
      case 'general_tech':
      default:
        return 'دعم فني واستفسار عام';
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            <span>تذكرة جديدة</span>
          </span>
        );
      case 'in_progress':
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 animate-spin" />
            <span>قيد المعالجة</span>
          </span>
        );
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>تم الحل / مغلقة</span>
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
      <div className="bg-gradient-to-r from-teal-800 via-emerald-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>مركز الدعم الفني المتخصص للفرق والمتطوعين</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black">
              {userRole === 'volunteer' ? 'الدعم الفني لفريقي • مساعدة واستفسارات' : userRole === 'leader' ? 'دعم الفريق الفني والتطوعي' : 'إدارة تذاكر الدعم الفني للفرق'}
            </h2>
            <p className="text-xs text-emerald-100/80 max-w-2xl leading-relaxed">
              {userRole === 'volunteer'
                ? 'تواصل مباشرة مع موظفي الدعم الفني بخصوص حسابك، تسجيلك بالفريق، استفسارات المبادرات وساعات التطوع، ومتابعة الردود في محادثة مباشرة وآمنة.'
                : 'أنشئ تذاكر الدعم الفني نيابة عن نفسك أو لمساعدة متطوعي فريقك، وتابع تقدم المعالجة والردود مع موظفي الدعم.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {!isCreatingTicket && (
              <button
                onClick={() => {
                  setIsCreatingTicket(true);
                  setSelectedTicket(null);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>فتح تذكرة دعم جديدة</span>
              </button>
            )}

            <button
              onClick={fetchTickets}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2.5 rounded-xl border border-white/15 transition-all cursor-pointer flex items-center gap-1.5"
              title="تحديث"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Tickets List */}
        <div className={`${selectedTicket || isCreatingTicket ? 'lg:col-span-4' : 'lg:col-span-12'} space-y-4`}>
          {/* Search & Filter */}
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-neutral-150 dark:border-slate-700 shadow-xs space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="بحث برقم التذكرة أو الموضوع..."
                className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
              {(['all', 'new', 'in_progress', 'resolved'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-neutral-100 dark:bg-slate-700 text-neutral-600 dark:text-slate-300 hover:text-neutral-900'
                  }`}
                >
                  {st === 'all' && `الكل (${tickets.length})`}
                  {st === 'new' && 'جديدة'}
                  {st === 'in_progress' && 'قيد المعالجة'}
                  {st === 'resolved' && 'محلولة'}
                </button>
              ))}
            </div>
          </div>

          {/* Tickets Cards */}
          {isLoading ? (
            <div className="p-8 text-center text-xs text-neutral-400">جاري تحميل تذاكر الدعم...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 p-8 text-center rounded-2xl border border-dashed border-neutral-200 dark:border-slate-700 space-y-2">
              <HelpCircle className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-500 font-bold">لا توجد أي تذاكر دعم مسجلة حالياً.</p>
              <button
                onClick={() => {
                  setIsCreatingTicket(true);
                  setSelectedTicket(null);
                }}
                className="text-emerald-700 text-xs font-bold hover:underline cursor-pointer inline-block"
              >
                + إنشاء تذكرة جديدة الآن
              </button>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredTickets.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                const lastMsg = t.chatTranscript && t.chatTranscript.length > 0
                  ? t.chatTranscript[t.chatTranscript.length - 1]
                  : null;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      setIsCreatingTicket(false);
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-right space-y-2 ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500'
                        : 'bg-white dark:bg-slate-800 border-neutral-150 dark:border-slate-700 hover:border-emerald-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] text-neutral-400 font-bold">
                        {t.ticketNumber}
                      </span>
                      {getStatusBadge(t.status)}
                    </div>

                    <strong className="text-xs font-bold text-neutral-900 dark:text-white block line-clamp-1">
                      {t.subject}
                    </strong>

                    <p className="text-[11px] text-neutral-500 dark:text-slate-400 line-clamp-1">
                      {lastMsg ? `${lastMsg.senderName}: ${lastMsg.content}` : t.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-100 dark:border-slate-700">
                      <span>{getIssueTypeLabel(t.issueType)}</span>
                      <span className="font-mono">
                        {new Date(t.createdAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Conversation OR New Ticket Form */}
        {(selectedTicket || isCreatingTicket) && (
          <div className="lg:col-span-8">
            {isCreatingTicket ? (
              /* CREATE NEW TICKET FORM */
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-neutral-150 dark:border-slate-700 shadow-xl space-y-4 text-right animate-scale-up">
                <div className="flex items-center justify-between border-b border-neutral-150 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <PlusCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <h3 className="text-base font-black text-neutral-800 dark:text-white">
                        إنشاء تذكرة دعم فني جديدة
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        سيتم إحالة التذكرة إلى موظفي الدعم الفني للرد ومتابعة المشكلة
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsCreatingTicket(false)}
                    className="text-neutral-400 hover:text-neutral-600 text-xs font-bold cursor-pointer"
                  >
                    إلغاء ✕
                  </button>
                </div>

                <form onSubmit={handleCreateTicketSubmit} className="space-y-4 text-xs">
                  {/* Issue Category */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-neutral-700 dark:text-slate-300 block">
                      تصنيف المشكلة أو الاستفسار: <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={issueType}
                      onChange={e => setIssueType(e.target.value)}
                      className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs font-bold"
                    >
                      <option value="account_team">استفسار عن حسابي أو فريقي</option>
                      <option value="registration_join">الإبلاغ عن مشكلة في التسجيل أو الانضمام إلى الفريق</option>
                      <option value="initiatives_opportunities">الاستفسار عن المبادرات والفرص التطوعية</option>
                      <option value="hours_points_attendance">الإبلاغ عن مشكلة في الحضور أو النقاط أو الساعات التطوعية</option>
                      <option value="general_tech">استفسار أو دعم فني عام</option>
                    </select>
                  </div>

                  {/* Leader on-behalf helper */}
                  {userRole === 'leader' && teamVolunteers.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="font-bold text-neutral-700 dark:text-slate-300 block">
                        فتح التذكرة لمساعدة متطوع بالفريق (اختياري):
                      </label>
                      <select
                        value={onBehalfOfVolunteerId}
                        onChange={e => setOnBehalfOfVolunteerId(e.target.value)}
                        className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs"
                      >
                        <option value="">نيابة عن نفسي (قائد الفريق)</option>
                        {teamVolunteers.map(v => (
                          <option key={v.id} value={v.id}>
                            مساعدة المتطوع: {v.name} (ملف: {v.fileNumber || v.file_number || '—'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-neutral-700 dark:text-slate-300 block">
                      موضوع التذكرة: <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="مثال: لم يتم رصد ساعاتي بمبادرة إفطار الصائم..."
                      className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs font-bold"
                    />
                  </div>

                  {/* Priority */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-neutral-700 dark:text-slate-300 block">
                      مستوى الأهمية:
                    </label>
                    <div className="flex gap-2">
                      {(['normal', 'high', 'urgent'] as const).map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                            priority === p
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white dark:bg-slate-700 border-neutral-200 dark:border-slate-600 text-neutral-600 dark:text-slate-300'
                          }`}
                        >
                          {p === 'normal' && 'عادي'}
                          {p === 'high' && 'هام'}
                          {p === 'urgent' && 'عاجل جداً'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Initial Message */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-neutral-700 dark:text-slate-300 block">
                      تفاصيل المشكلة أو الاستفسار: <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={initialMessage}
                      onChange={e => setInitialMessage(e.target.value)}
                      placeholder="اشرح المشكلة بالتفصيل، مع ذكر تاريخ الحادثة أو اسم المبادرة وأي معلومات مساعدة..."
                      className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs font-medium leading-relaxed"
                    />
                  </div>

                  {/* Attachment URL */}
                  <div className="space-y-1.5">
                    <label className="font-bold text-neutral-700 dark:text-slate-300 block">
                      رابط صورة أو مرفق (اختياري):
                    </label>
                    <input
                      type="url"
                      value={attachmentUrl}
                      onChange={e => setAttachmentUrl(e.target.value)}
                      placeholder="https://... رابط صورة للمشكلة أو لقطة شاشة"
                      className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs font-mono text-left"
                      dir="ltr"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-neutral-150 dark:border-slate-700">
                    <button
                      type="submit"
                      disabled={isSubmittingTicket}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmittingTicket ? 'جاري الإرسال...' : 'إرسال التذكرة إلى الدعم الفني'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreatingTicket(false)}
                      className="px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            ) : selectedTicket ? (
              /* ACTIVE TICKET CHAT CONVERSATION */
              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-neutral-150 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col h-[650px] animate-fade-in text-right">
                {/* Header */}
                <div className="p-4 bg-neutral-50 dark:bg-slate-750 border-b border-neutral-150 dark:border-slate-700 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-neutral-200 dark:bg-slate-600 px-2 py-0.5 rounded-md">
                        {selectedTicket.ticketNumber}
                      </span>
                      {getStatusBadge(selectedTicket.status)}
                    </div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                      {selectedTicket.subject}
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      التصنيف: {getIssueTypeLabel(selectedTicket.issueType)} • المتطوع: {selectedTicket.volunteerName || selectedTicket.requesterName} (ملف: {selectedTicket.volunteerFileNumber || '—'})
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="text-neutral-400 hover:text-neutral-600 text-xs font-bold cursor-pointer"
                  >
                    إغلاق ✕
                  </button>
                </div>

                {/* Messages Transcript Scroll Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-50/30 dark:bg-slate-900/40">
                  {selectedTicket.chatTranscript && selectedTicket.chatTranscript.map((msg, idx) => {
                    const isUser = msg.senderType === 'user';

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col max-w-[80%] ${
                          isUser ? 'mr-auto items-start' : 'ml-auto items-end'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mb-1 px-1">
                          <span className="font-bold text-neutral-700 dark:text-slate-300">
                            {msg.senderName}
                          </span>
                          <span>•</span>
                          <span className="font-mono">
                            {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isUser
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : 'bg-white dark:bg-slate-800 text-neutral-800 dark:text-white border border-neutral-150 dark:border-slate-700 rounded-tl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Attachments inside message */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/20 dark:border-slate-700 space-y-1">
                              {msg.attachments.map((att, aIdx) => (
                                <a
                                  key={aIdx}
                                  href={att}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] underline flex items-center gap-1 opacity-90 hover:opacity-100"
                                >
                                  <ImageIcon className="w-3 h-3" />
                                  <span>عرض المرفق #{aIdx + 1}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Reply Bar */}
                <form
                  onSubmit={handleSendReply}
                  className="p-3 bg-white dark:bg-slate-800 border-t border-neutral-150 dark:border-slate-700 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={e => setReplyMessage(e.target.value)}
                      placeholder="اكتب ردك أو استفسارك هنا..."
                      className="flex-1 px-3 py-2 text-xs rounded-xl bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="submit"
                      disabled={isSendingReply || !replyMessage.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Paperclip className="w-3 h-3 text-neutral-400" />
                    <input
                      type="url"
                      value={replyAttachmentUrl}
                      onChange={e => setReplyAttachmentUrl(e.target.value)}
                      placeholder="رابط مرفق إضافي (اختياري)..."
                      className="flex-1 px-2.5 py-1 text-[11px] rounded-lg bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                </form>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
