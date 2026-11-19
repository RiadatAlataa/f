import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CalendarClock, Plus, Search, Calendar as CalendarIcon, ListFilter,
  Clock, CheckCircle2, PlayCircle, PauseCircle, Edit3, Trash2,
  Mail, RefreshCw, AlertCircle, History, ChevronRight, ChevronLeft,
  X, BellRing, Send, ShieldCheck
} from 'lucide-react';
import {
  PersonalTask,
  PersonalTaskStatus,
  PersonalTaskReminderOption,
  PersonalTaskEmailLog
} from '../types';
import { getAuthHeaders } from '../utils/authHeaders';

interface PersonalTasksWorkspaceProps {
  currentUser?: any;
  isDark?: boolean;
}

const REMINDER_OPTIONS: { value: PersonalTaskReminderOption; label: string; shortLabel: string }[] = [
  { value: '24h', label: 'قبل 24 ساعة من بداية المهمة', shortLabel: 'قبل 24 ساعة' },
  { value: '1h', label: 'قبل ساعة واحدة من بداية المهمة', shortLabel: 'قبل ساعة' },
  { value: '30m', label: 'قبل 30 دقيقة من بداية المهمة', shortLabel: 'قبل 30 دقيقة' },
  { value: '15m', label: 'قبل 15 دقيقة من بداية المهمة', shortLabel: 'قبل 15 دقيقة' },
  { value: 'at_start', label: 'عند وقت بداية المهمة مباشرة', shortLabel: 'عند البداية' },
  { value: 'custom', label: 'تخصيص تاريخ ووقت التذكير يدوياً', shortLabel: 'تذكير مخصص' }
];

const STATUS_META: Record<PersonalTaskStatus, { label: string; dotColor: string; textClass: string; borderClass: string }> = {
  not_started: {
    label: 'لم تبدأ',
    dotColor: 'bg-slate-400',
    textClass: 'text-slate-700 dark:text-slate-200',
    borderClass: 'border-slate-300 dark:border-[#244577] bg-slate-50 dark:bg-[#142d50]'
  },
  in_progress: {
    label: 'جاري التنفيذ',
    dotColor: 'bg-sky-500',
    textClass: 'text-sky-700 dark:text-sky-300',
    borderClass: 'border-sky-300 dark:border-sky-700/70 bg-sky-50 dark:bg-sky-950/40'
  },
  completed: {
    label: 'مكتملة',
    dotColor: 'bg-emerald-500',
    textClass: 'text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-emerald-300 dark:border-emerald-700/70 bg-emerald-50 dark:bg-emerald-950/40'
  },
  postponed: {
    label: 'مؤجلة',
    dotColor: 'bg-amber-500',
    textClass: 'text-amber-700 dark:text-amber-300',
    borderClass: 'border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-950/40'
  }
};

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function getTodayRiyadhStr(): string {
  const nowRiyadh = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const y = nowRiyadh.getUTCFullYear();
  const m = String(nowRiyadh.getUTCMonth() + 1).padStart(2, '0');
  const d = String(nowRiyadh.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTime12Ar(timeStr: string): string {
  const [hStr, mStr] = String(timeStr || '00:00').split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function formatArabicDateShort(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00+03:00`);
    return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
      timeZone: 'Asia/Riyadh',
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}

function isoToRiyadhLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const r = new Date(ms + 3 * 60 * 60 * 1000);
  const y = r.getUTCFullYear();
  const m = String(r.getUTCMonth() + 1).padStart(2, '0');
  const d = String(r.getUTCDate()).padStart(2, '0');
  const h = String(r.getUTCHours()).padStart(2, '0');
  const min = String(r.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

export const PersonalTasksWorkspace: React.FC<PersonalTasksWorkspaceProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const [emailLogs, setEmailLogs] = useState<PersonalTaskEmailLog[]>([]);
  const [ownerInfo, setOwnerInfo] = useState<{ userId?: string; name?: string; email?: string }>({});
  const [riyadhToday, setRiyadhToday] = useState<string>(getTodayRiyadhStr);
  const [kpis, setKpis] = useState({
    total: 0,
    upcoming: 0,
    dueNow: 0,
    inProgress: 0,
    completed: 0,
    postponed: 0
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Filters & View Mode
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [rangeFilter, setRangeFilter] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'month'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar Month State
  const initialTodayParts = getTodayRiyadhStr().split('-').map(Number);
  const [calYear, setCalYear] = useState<number>(initialTodayParts[0]);
  const [calMonth, setCalMonth] = useState<number>(initialTodayParts[1]); // 1-12

  // Create / Edit Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalTask | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formDate, setFormDate] = useState(getTodayRiyadhStr);
  const [formTime, setFormTime] = useState('09:00');
  const [formReminderOption, setFormReminderOption] = useState<PersonalTaskReminderOption>('1h');
  const [formCustomReminder, setFormCustomReminder] = useState('');
  const [formReminderEmail, setFormReminderEmail] = useState('');

  // Postpone Modal
  const [postponingTask, setPostponingTask] = useState<PersonalTask | null>(null);
  const [postDate, setPostDate] = useState('');
  const [postTime, setPostTime] = useState('09:00');
  const [postReminderOption, setPostReminderOption] = useState<PersonalTaskReminderOption>('1h');
  const [postCustomReminder, setPostCustomReminder] = useState('');
  const [postReason, setPostReason] = useState('');

  // History / Details Modal
  const [historyTask, setHistoryTask] = useState<PersonalTask | null>(null);

  // Delete Confirmation Modal
  const [deletingTask, setDeletingTask] = useState<PersonalTask | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (rangeFilter !== 'all') params.set('range', rangeFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/personal-tasks?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(json?.error || 'تعذر تحميل المهام الشخصية.');
        return;
      }
      setTasks(Array.isArray(json.tasks) ? json.tasks : []);
      setEmailLogs(Array.isArray(json.emailLogs) ? json.emailLogs : []);
      if (json.kpis) setKpis(json.kpis);
      if (json.owner) setOwnerInfo(json.owner);
      if (json.riyadhToday) setRiyadhToday(json.riyadhToday);
    } catch {
      setErrorMsg('حدث خطأ في الاتصال بالخادم أثناء تحميل المهام الشخصية.');
    } finally {
      setLoading(false);
    }
  }, [rangeFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const openCreateModal = (presetDate?: string) => {
    setEditingTask(null);
    setFormTitle('');
    setFormSubject('');
    setFormDetails('');
    setFormNotes('');
    setFormDate(presetDate || riyadhToday || getTodayRiyadhStr());
    setFormTime('09:00');
    setFormReminderOption('1h');
    setFormCustomReminder('');
    setFormReminderEmail(ownerInfo.email || currentUser?.email || '');
    setErrorMsg(null);
    setShowTaskModal(true);
  };

  const openEditModal = (task: PersonalTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormSubject(task.subject || '');
    setFormDetails(task.details || '');
    setFormNotes(task.notes || '');
    setFormDate(task.startDate);
    setFormTime(task.startTime);
    setFormReminderOption(task.reminderOption || '1h');
    setFormCustomReminder(isoToRiyadhLocalInput(task.customReminderAt));
    setFormReminderEmail(task.ownerEmail || ownerInfo.email || '');
    setErrorMsg(null);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setErrorMsg('يرجى إدخال اسم المهمة.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setNoticeMsg(null);

    try {
      const payload: any = {
        title: formTitle.trim(),
        subject: formSubject.trim(),
        details: formDetails.trim(),
        notes: formNotes.trim(),
        startDate: formDate,
        startTime: formTime,
        reminderOption: formReminderOption,
        customReminderAt: formReminderOption === 'custom' ? formCustomReminder : null
      };
      if (formReminderEmail.trim()) {
        payload.reminderEmail = formReminderEmail.trim();
      }

      const url = editingTask ? `/api/personal-tasks/${editingTask.id}` : '/api/personal-tasks';
      const method = editingTask ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(json?.error || 'تعذر حفظ المهمة الشخصية.');
        return;
      }

      setShowTaskModal(false);
      setNoticeMsg(json?.message || (editingTask ? 'تم تحديث المهمة الشخصية بنجاح.' : 'تمت إضافة المهمة الشخصية بنجاح.'));
      await fetchTasks();
    } catch {
      setErrorMsg('تعذر حفظ المهمة بسبب خطأ في الاتصال.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (task: PersonalTask, newStatus: PersonalTaskStatus) => {
    if (newStatus === 'postponed') {
      setPostponingTask(task);
      setPostDate(task.startDate);
      setPostTime(task.startTime);
      setPostReminderOption(task.reminderOption || '1h');
      setPostCustomReminder(isoToRiyadhLocalInput(task.customReminderAt));
      setPostReason('');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const res = await fetch(`/api/personal-tasks/${task.id}/status`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status: newStatus })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(json?.error || 'تعذر تحديث حالة المهمة.');
        return;
      }
      setNoticeMsg(json?.message || 'تم تحديث حالة المهمة بنجاح.');
      await fetchTasks();
    } catch {
      setErrorMsg('حدث خطأ أثناء تحديث الحالة.');
    } finally {
      setSaving(false);
    }
  };

  const handlePostponeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postponingTask) return;
    if (!postDate || !postTime) {
      setErrorMsg('يرجى تحديد التاريخ والوقت الجديدين عند تأجيل المهمة.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    setNoticeMsg(null);
    try {
      const res = await fetch(`/api/personal-tasks/${postponingTask.id}/status`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          status: 'postponed',
          newStartDate: postDate,
          newStartTime: postTime,
          newReminderOption: postReminderOption,
          customReminderAt: postReminderOption === 'custom' ? postCustomReminder : null,
          reason: postReason.trim()
        })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(json?.error || 'تعذر تأجيل المهمة.');
        return;
      }
      setPostponingTask(null);
      setNoticeMsg(json?.message || 'تم تأجيل المهمة وجدولة التذكير للموعد الجديد.');
      await fetchTasks();
    } catch {
      setErrorMsg('حدث خطأ أثناء تأجيل المهمة.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTask) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/personal-tasks/${deletingTask.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(json?.error || 'تعذر حذف المهمة.');
        return;
      }
      setDeletingTask(null);
      setNoticeMsg(json?.message || 'تم حذف المهمة الشخصية بنجاح.');
      await fetchTasks();
    } catch {
      setErrorMsg('تعذر حذف المهمة بسبب خطأ في الاتصال.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetryReminder = async (taskId: string) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/personal-tasks/${taskId}/retry-reminder`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setErrorMsg(json?.error || 'تعذر إعادة إرسال التذكير.');
        return;
      }
      setNoticeMsg('تمت إعادة جدولة وإرسال التذكير البريدي.');
      await fetchTasks();
    } catch {
      setErrorMsg('حدث خطأ أثناء محاولة إعادة إرسال التذكير.');
    } finally {
      setSaving(false);
    }
  };

  // Calendar grid matrix
  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(calYear, calMonth - 1, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(calYear, calMonth, 0)).getUTCDate();
    const cells: { day: number | null; dateStr: string | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr });
    }
    return cells;
  }, [calYear, calMonth]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, PersonalTask[]>();
    for (const t of tasks) {
      const list = map.get(t.startDate) || [];
      list.push(t);
      map.set(t.startDate, list);
    }
    return map;
  }, [tasks]);

  const activeEmail = ownerInfo.email || currentUser?.email || '';

  return (
    <div id="personal-tasks-workspace" className="space-y-5 font-sans text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-[#071C43] dark:bg-[#0754C7] text-white flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#071C43] dark:text-white leading-tight">
                مهامي ومواعيدي الشخصية
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-300 font-medium mt-0.5">
                نظام مستقل لإدارة مهامك اليومية ومواعيدك وتذكيراتك البريدية (خاص بك وحدك ولا يظهر في التكليفات الإدارية)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap pt-1 text-[11px] text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>خصوصية تامة للحساب: {ownerInfo.name || currentUser?.name || 'المستخدم'}</span>
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span className="inline-flex items-center gap-1.5 font-bold">
              <Mail className="w-3.5 h-3.5 text-[#0754C7] dark:text-blue-400" />
              <span>بريد التذكيرات: {activeEmail || 'غير محدد (يمكنك كتابته عند إضافة المهمة)'}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-[#081426] p-1 rounded-xl border border-slate-200 dark:border-[#1e3a66]">
            <button
              type="button"
              id="btn-pt-view-list"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#0e213d] text-[#071C43] dark:text-white border border-slate-200 dark:border-[#244577]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#071C43]'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>قائمة المهام</span>
            </button>
            <button
              type="button"
              id="btn-pt-view-calendar"
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-white dark:bg-[#0e213d] text-[#071C43] dark:text-white border border-slate-200 dark:border-[#244577]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#071C43]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>التقويم الشهري</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchTasks}
            disabled={loading}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-[#244577] bg-white dark:bg-[#142d50] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1b3a66] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            title="تحديث المهام"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <button
            type="button"
            id="btn-add-personal-task"
            onClick={() => openCreateModal()}
            className="h-9 px-4 rounded-xl bg-[#071C43] hover:bg-[#0754C7] text-white text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مهمة شخصية</span>
          </button>
        </div>
      </div>

      {/* Notifications / Errors */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-200 text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </span>
          <button type="button" onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {noticeMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{noticeMsg}</span>
          </span>
          <button type="button" onClick={() => setNoticeMsg(null)} className="text-emerald-600 hover:text-emerald-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { key: 'all', label: 'إجمالي المهام', value: kpis.total, accent: 'text-[#071C43] dark:text-white' },
          { key: 'upcoming', label: 'المهام القادمة', value: kpis.upcoming, accent: 'text-[#0754C7] dark:text-blue-300' },
          { key: 'due_now', label: 'حان موعدها', value: kpis.dueNow, accent: 'text-rose-600 dark:text-rose-300' },
          { key: 'in_progress', label: 'جاري التنفيذ', value: kpis.inProgress, accent: 'text-sky-600 dark:text-sky-300' },
          { key: 'completed', label: 'المكتملة', value: kpis.completed, accent: 'text-emerald-600 dark:text-emerald-300' },
          { key: 'postponed', label: 'المؤجلة', value: kpis.postponed, accent: 'text-amber-600 dark:text-amber-300' }
        ].map((card) => {
          const isSelected = statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(isSelected && card.key !== 'all' ? 'all' : card.key)}
              className={`text-right p-4 rounded-2xl border transition-colors cursor-pointer bg-white dark:bg-[#0e213d] ${
                isSelected
                  ? 'border-[#0754C7] ring-1 ring-[#0754C7]'
                  : 'border-slate-200 dark:border-[#1e3a66] hover:border-[#0754C7]/60'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-300">{card.label}</div>
              <div className={`text-2xl font-black font-mono tabular-nums mt-1 ${card.accent}`}>
                {card.value}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: 'جميع المهام' },
            { id: 'today', label: 'اليوم' },
            { id: 'tomorrow', label: 'غداً' },
            { id: 'week', label: 'هذا الأسبوع' },
            { id: 'month', label: 'هذا الشهر' }
          ].map((rng) => (
            <button
              key={rng.id}
              type="button"
              onClick={() => setRangeFilter(rng.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                rangeFilter === rng.id
                  ? 'bg-[#0754C7] text-white border-[#0754C7]'
                  : 'bg-slate-50 dark:bg-[#142d50] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#244577] hover:bg-slate-100 dark:hover:bg-[#1b3a66]'
              }`}
            >
              {rng.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم المهمة، الموضوع، أو الملاحظات..."
              className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#0754C7]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#0754C7]"
          >
            <option value="all">كل الحالات</option>
            <option value="not_started">لم تبدأ</option>
            <option value="in_progress">جاري التنفيذ</option>
            <option value="completed">مكتملة</option>
            <option value="postponed">مؤجلة</option>
            <option value="upcoming">القادمة</option>
            <option value="due_now">حان موعدها</option>
          </select>
        </div>
      </div>

      {/* MAIN VIEW AREA */}
      {viewMode === 'calendar' ? (
        <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (calMonth === 1) {
                    setCalMonth(12);
                    setCalYear((y) => y - 1);
                  } else {
                    setCalMonth((m) => m - 1);
                  }
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-[#244577] hover:bg-slate-100 dark:hover:bg-[#142d50] text-slate-700 dark:text-slate-200 cursor-pointer"
                title="الشهر السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <h3 className="text-sm sm:text-base font-black text-[#071C43] dark:text-white px-2">
                {ARABIC_MONTHS[calMonth - 1]} {calYear}م
              </h3>
              <button
                type="button"
                onClick={() => {
                  if (calMonth === 12) {
                    setCalMonth(1);
                    setCalYear((y) => y + 1);
                  } else {
                    setCalMonth((m) => m + 1);
                  }
                }}
                className="p-2 rounded-xl border border-slate-200 dark:border-[#244577] hover:bg-slate-100 dark:hover:bg-[#142d50] text-slate-700 dark:text-slate-200 cursor-pointer"
                title="الشهر التالي"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                const [y, m] = getTodayRiyadhStr().split('-').map(Number);
                setCalYear(y);
                setCalMonth(m);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#142d50] text-xs font-bold text-[#0754C7] dark:text-blue-300 cursor-pointer"
            >
              الانتقال إلى اليوم
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS_AR.map((dayName) => (
              <div key={dayName} className="py-2 text-[11px] font-black text-slate-500 dark:text-slate-300">
                {dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell, idx) => {
              if (!cell.day || !cell.dateStr) {
                return <div key={`empty-${idx}`} className="min-h-[86px] rounded-xl bg-slate-50/40 dark:bg-[#081426]/40" />;
              }
              const dayTasks = tasksByDate.get(cell.dateStr) || [];
              const isToday = cell.dateStr === riyadhToday;

              return (
                <div
                  key={cell.dateStr}
                  className={`min-h-[96px] p-1.5 sm:p-2 rounded-xl border flex flex-col gap-1 transition-colors ${
                    isToday
                      ? 'border-[#0754C7] bg-blue-50/40 dark:bg-[#142d50]/70'
                      : 'border-slate-200 dark:border-[#1e3a66] bg-white dark:bg-[#081426]/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-black tabular-nums px-1.5 py-0.5 rounded-md ${
                        isToday ? 'bg-[#0754C7] text-white' : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {cell.day}
                    </span>
                    <button
                      type="button"
                      onClick={() => openCreateModal(cell.dateStr || undefined)}
                      className="text-slate-400 hover:text-[#0754C7] dark:hover:text-blue-300 p-0.5 rounded cursor-pointer"
                      title={`إضافة مهمة في ${cell.dateStr}`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-[80px]">
                    {dayTasks.map((t) => {
                      const sm = STATUS_META[t.status] || STATUS_META.not_started;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setHistoryTask(t)}
                          className="w-full text-right px-1.5 py-1 rounded-lg border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#0e213d] hover:border-[#0754C7] text-[10px] font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1 truncate cursor-pointer"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sm.dotColor}`} />
                          <span className="truncate">{t.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : loading ? (
        <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-10 text-center text-xs font-bold text-slate-500 dark:text-slate-300">
          جاري تحميل مهامك ومواعيدك الشخصية...
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#142d50] text-[#0754C7] dark:text-blue-300 flex items-center justify-center mx-auto">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-[#071C43] dark:text-white">لا توجد مهام شخصية مطابقة حالياً</h3>
            <p className="text-xs text-slate-500 dark:text-slate-300">
              يمكنك إضافة مهامك ومواعيدك اليومية الآن مع اختيار توقيت التذكير البريدي التلقائي.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#071C43] hover:bg-[#0754C7] text-white text-xs font-black cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول مهمة شخصية</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {tasks.map((task) => {
            const st = STATUS_META[task.status] || STATUS_META.not_started;
            const remOptLabel =
              REMINDER_OPTIONS.find((r) => r.value === task.reminderOption)?.shortLabel || 'تذكير';
            const isOverdue =
              task.status !== 'completed' &&
              new Date(task.startAtIso).getTime() < Date.now();

            return (
              <div
                key={task.id}
                data-task-id={task.id}
                className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  {/* Top row: Title + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h3 className={`text-sm sm:text-base font-black leading-snug ${task.status === 'completed' ? 'line-through text-slate-400 dark:text-slate-500' : 'text-[#071C43] dark:text-white'}`}>
                        {task.title}
                      </h3>
                      {task.subject && (
                        <div className="text-xs font-bold text-[#0754C7] dark:text-blue-300">
                          الموضوع: {task.subject}
                        </div>
                      )}
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black border shrink-0 ${st.borderClass} ${st.textClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dotColor}`} />
                      <span>{st.label}</span>
                    </span>
                  </div>

                  {/* Date & Time + Overdue Flag */}
                  <div className="flex items-center gap-3 flex-wrap text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-[#0754C7] dark:text-blue-400" />
                      <span>{formatArabicDateShort(task.startDate)}</span>
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#0754C7] dark:text-blue-400" />
                      <span>{formatTime12Ar(task.startTime)}</span>
                    </span>
                    {isOverdue && (
                      <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                        • حان / تجاوز الموعد
                      </span>
                    )}
                  </div>

                  {/* Details & Notes */}
                  {(task.details || task.notes) && (
                    <div className="space-y-1.5 bg-slate-50 dark:bg-[#081426]/70 border border-slate-200/80 dark:border-[#1e3a66] rounded-xl p-3 text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                      {task.details && <p>{task.details}</p>}
                      {task.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-300 font-semibold">
                          ملاحظات: {task.notes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reminder Status Strip */}
                  <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] pt-1 border-t border-slate-100 dark:border-[#1e3a66]">
                    <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                      <BellRing className="w-3.5 h-3.5 text-[#0754C7] dark:text-blue-400" />
                      <span>التذكير البريدي ({remOptLabel}):</span>
                      <span
                        className={
                          task.reminderStatus === 'sent'
                            ? 'text-emerald-600 dark:text-emerald-400 font-black'
                            : task.reminderStatus === 'failed'
                            ? 'text-rose-600 dark:text-rose-400 font-black'
                            : task.reminderStatus === 'cancelled'
                            ? 'text-slate-400 font-bold'
                            : 'text-amber-600 dark:text-amber-300 font-black'
                        }
                      >
                        {task.reminderStatus === 'sent' && 'تم الإرسال ✓'}
                        {task.reminderStatus === 'pending' && 'مجدول في الانتظار'}
                        {task.reminderStatus === 'processing' && 'جاري الإرسال...'}
                        {task.reminderStatus === 'failed' && 'فشل الإرسال'}
                        {task.reminderStatus === 'cancelled' && 'ملغى'}
                        {task.reminderStatus === 'none' && 'بدون بريد مسجل'}
                      </span>
                    </div>

                    {task.reminderStatus === 'failed' && task.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleRetryReminder(task.id)}
                        disabled={saving}
                        className="text-[11px] font-black text-[#0754C7] dark:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>إعادة المحاولة</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-[#1e3a66]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {task.status !== 'completed' && task.status !== 'in_progress' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(task, 'in_progress')}
                        disabled={saving}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>بدء التنفيذ</span>
                      </button>
                    )}

                    {task.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(task, 'completed')}
                        disabled={saving}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم التنفيذ</span>
                      </button>
                    )}

                    {task.status !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(task, 'postponed')}
                        disabled={saving}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>تأجيل</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setHistoryTask(task)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#0754C7] hover:bg-slate-100 dark:hover:bg-[#142d50] cursor-pointer"
                      title="عرض السجل والتاريخ"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(task)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#0754C7] hover:bg-slate-100 dark:hover:bg-[#142d50] cursor-pointer"
                      title="تعديل المهمة"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTask(task)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="حذف المهمة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#244577] rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-right">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e3a66] pb-3">
              <h3 className="text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#0754C7]" />
                <span>{editingTask ? 'تعديل المهمة الشخصية' : 'إضافة مهمة شخصية جديدة'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1">اسم المهمة *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: تجهيز تقرير الجمعية"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:outline-none focus:border-[#0754C7]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1">موضوع المهمة</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    placeholder="مثال: إعداد التقرير الشهري ومراجعته"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:outline-none focus:border-[#0754C7]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1">تاريخ المهمة (بتوقيت الرياض) *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:outline-none focus:border-[#0754C7]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1">وقت بداية المهمة *</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white focus:outline-none focus:border-[#0754C7]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1.5">متى يصلك التذكير بالبريد الإلكتروني؟</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REMINDER_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        formReminderOption === opt.value
                          ? 'border-[#0754C7] bg-blue-50/70 dark:bg-[#142d50]'
                          : 'border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="ptReminderOption"
                        checked={formReminderOption === opt.value}
                        onChange={() => setFormReminderOption(opt.value)}
                        className="text-[#0754C7]"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-100">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {formReminderOption === 'custom' && (
                <div>
                  <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1">تاريخ ووقت التذكير المخصص (بتوقيت الرياض) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formCustomReminder}
                    onChange={(e) => setFormCustomReminder(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1">تفاصيل المهمة</label>
                <textarea
                  rows={2}
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder="تفاصيل إضافية حول الخطوات أو المخرجات..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="مثال: إنهاء التقرير وإرساله للإدارة"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-[#071C43] dark:text-slate-200 mb-1">
                  البريد الإلكتروني لاستلام التذكير
                </label>
                <input
                  type="email"
                  value={formReminderEmail}
                  onChange={(e) => setFormReminderEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1e3a66]">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#142d50] text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#071C43] hover:bg-[#0754C7] text-white font-black cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'جاري الحفظ...' : editingTask ? 'حفظ التعديلات' : 'حفظ المهمة وجدولة التذكير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POSTPONE TASK MODAL */}
      {postponingTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0e213d] border border-amber-300 dark:border-amber-700/70 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-right">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e3a66] pb-3">
              <h3 className="text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-500" />
                <span>تأجيل المهمة الشخصية</span>
              </h3>
              <button type="button" onClick={() => setPostponingTask(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs text-amber-900 dark:text-amber-200 font-bold leading-relaxed">
              المهمة: {postponingTask.title}
              <br />
              سيتم إلغاء أي تذكير قديم غير مرسل تلقائياً وجدولة تذكير جديد للموعد المحدّث.
            </div>

            <form onSubmit={handlePostponeSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">التاريخ الجديد *</label>
                  <input
                    type="date"
                    required
                    value={postDate}
                    onChange={(e) => setPostDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">الوقت الجديد *</label>
                  <input
                    type="time"
                    required
                    value={postTime}
                    onChange={(e) => setPostTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">توقيت التذكير الجديد</label>
                <select
                  value={postReminderOption}
                  onChange={(e) => setPostReminderOption(e.target.value as PersonalTaskReminderOption)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white font-bold"
                >
                  {REMINDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {postReminderOption === 'custom' && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">التاريخ والوقت المخصص *</label>
                  <input
                    type="datetime-local"
                    required
                    value={postCustomReminder}
                    onChange={(e) => setPostCustomReminder(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">سبب التأجيل (اختياري)</label>
                <input
                  type="text"
                  value={postReason}
                  onChange={(e) => setPostReason(e.target.value)}
                  placeholder="مثال: تعارض مع اجتماع طارئ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPostponingTask(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#142d50] text-slate-700 dark:text-slate-200 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'جاري التأجيل...' : 'تأكيد التأجيل والجدولة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORY & LOGS MODAL */}
      {historyTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#244577] rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto text-right">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1e3a66] pb-3">
              <h3 className="text-base font-black text-[#071C43] dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-[#0754C7]" />
                <span>سجل المهمة والتذكيرات البريدية</span>
              </h3>
              <button type="button" onClick={() => setHistoryTask(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#1e3a66] space-y-1">
                <div className="font-black text-[#071C43] dark:text-white">{historyTask.title}</div>
                {historyTask.subject && <div className="text-[#0754C7] dark:text-blue-300 font-bold">{historyTask.subject}</div>}
                <div className="text-slate-500 dark:text-slate-300">
                  الموعد: {formatArabicDateShort(historyTask.startDate)} • {formatTime12Ar(historyTask.startTime)}
                </div>
                {historyTask.lastReminderError && (
                  <div className="text-rose-600 dark:text-rose-400 font-bold pt-1">
                    سبب تعذر آخر إرسال: {historyTask.lastReminderError}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-black text-[#071C43] dark:text-white mb-2">سجل التعديلات والتأجيلات:</h4>
                <div className="space-y-1.5">
                  {(historyTask.editHistory || []).map((h) => (
                    <div key={h.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1e3a66] bg-white dark:bg-[#142d50]/50">
                      <div className="font-bold text-slate-800 dark:text-slate-100">{h.summary}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
                        {new Date(h.timestamp).toLocaleString('ar-SA')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-black text-[#071C43] dark:text-white mb-2">سجل إرسال البريد الإلكتروني لهذه المهمة:</h4>
                {emailLogs.filter((l) => l.taskId === historyTask.id).length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400">لم تُرسل رسائل تذكير بريدية لهذه المهمة بعد.</p>
                ) : (
                  <div className="space-y-1.5">
                    {emailLogs
                      .filter((l) => l.taskId === historyTask.id)
                      .map((l) => (
                        <div key={l.id} className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1e3a66] bg-white dark:bg-[#142d50]/50 flex items-center justify-between gap-2">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {l.status === 'sent' ? 'تم الإرسال بنجاح ✓' : `فشل الإرسال: ${l.error || ''}`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              إلى: {l.targetEmail} • المحاولة #{l.attemptNumber}
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                            {new Date(l.sentAt).toLocaleString('ar-SA')}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingTask && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0e213d] border border-rose-300 dark:border-rose-800 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 text-right">
            <h3 className="text-base font-black text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              <span>تأكيد حذف المهمة الشخصية</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من حذف المهمة: <strong className="text-[#071C43] dark:text-white">{deletingTask.title}</strong>؟ سيتم إلغاء أي تذكير بريدي مجدول لها نهائياً.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTask(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#142d50] text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer disabled:opacity-60"
              >
                {saving ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
