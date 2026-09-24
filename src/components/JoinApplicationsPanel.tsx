import React, { useState } from 'react';
import { 
  FileText, Search, Filter, CheckCircle2, XCircle, Clock, Eye, 
  User, Phone, Mail, MapPin, HeartPulse, Shield, FileCheck, Download, 
  ChevronDown, AlertCircle, ArrowUpDown, UserCheck, ShieldAlert, Sparkles, Users,
  Volume2, VolumeX, BellRing
} from 'lucide-react';
import { VolunteerApplication, VolunteerTeam } from '../types';
import { useApplicationAudio } from '../utils/audioNotification';

interface JoinApplicationsPanelProps {
  applications: VolunteerApplication[];
  teams: VolunteerTeam[];
  onAcceptApplication: (applicationId: string, teamId: string) => Promise<boolean>;
  onRejectApplication: (applicationId: string, rejectionReason: string) => Promise<boolean>;
  lang?: 'ar' | 'en';
}

export const JoinApplicationsPanel: React.FC<JoinApplicationsPanelProps> = ({
  applications = [],
  teams = [],
  onAcceptApplication,
  onRejectApplication,
  lang = 'ar'
}) => {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('pending');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Modal States
  const [selectedAppForView, setSelectedAppForView] = useState<VolunteerApplication | null>(null);
  const [selectedAppForAccept, setSelectedAppForAccept] = useState<VolunteerApplication | null>(null);
  const [selectedAppForReject, setSelectedAppForReject] = useState<VolunteerApplication | null>(null);

  // Form selections
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Audio Notification Alert Hook
  const { isAudioEnabled, toggleAudio, testSound } = useApplicationAudio();

  // Stats calculation
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const acceptedCount = applications.filter(a => a.status === 'accepted').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;

  // Filtered & Sorted list
  const filteredApplications = applications
    .filter(app => {
      const matchSearch = 
        (app.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.nationalId || '').includes(searchTerm) ||
        (app.phone || '').includes(searchTerm) ||
        (app.fileNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || app.status === statusFilter;
      const matchTeam = teamFilter === 'all' || app.requestedTeamId === teamFilter || app.assignedTeamId === teamFilter;
      return matchSearch && matchStatus && matchTeam;
    })
    .sort((a, b) => {
      const timeA = new Date(a.appliedAt || a.joinDate || 0).getTime();
      const timeB = new Date(b.appliedAt || b.joinDate || 0).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

  // Action Handlers
  const handleConfirmAccept = async () => {
    if (!selectedAppForAccept || !targetTeamId) {
      alert(lang === 'ar' ? 'يرجى اختيار الفريق أولاً' : 'Please select a team');
      return;
    }
    setIsSubmitting(true);
    const success = await onAcceptApplication(selectedAppForAccept.id, targetTeamId);
    setIsSubmitting(false);
    if (success) {
      setSelectedAppForAccept(null);
      setSelectedAppForView(null);
      setTargetTeamId('');
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedAppForReject) return;
    setIsSubmitting(true);
    const success = await onRejectApplication(selectedAppForReject.id, rejectionReason);
    setIsSubmitting(false);
    if (success) {
      setSelectedAppForReject(null);
      setSelectedAppForView(null);
      setRejectionReason('');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header & Summary Stats */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                <FileText className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-neutral-800 dark:text-white">طلبات الانضمام وإدارة المتطوعين الجدد</h2>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              مراجعة طلبات الانضمام المقدمة، الاطلاع على الملفات والمرفقات، وقبول المتطوعين وتحديد فرقهم أو رفضهم.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {/* Audio Alert Status & Quick Toggle */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              isAudioEnabled 
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300' 
                : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-500'
            }`}>
              <button
                type="button"
                onClick={testSound}
                className="hover:scale-110 transition-transform cursor-pointer"
                title="تجربة وسماع النغمة الهادئة"
              >
                {isAudioEnabled ? <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <span>{isAudioEnabled ? 'التنبيه الصوتي مفعّل' : 'التنبيه الصوتي معطّل'}</span>
              
              {/* Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isAudioEnabled}
                onClick={toggleAudio}
                className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none mr-1 ${
                  isAudioEnabled ? 'bg-emerald-600' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
                title="تبديل التنبيه الصوتي للطلبات"
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    isAudioEnabled ? '-translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {pendingCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold animate-pulse">
                <Clock className="w-4 h-4" />
                <span>{pendingCount} طلب جديد ينتظر المراجعة والاعتماد</span>
              </div>
            )}
          </div>
        </div>

        {/* Counter Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-xl text-right transition-all border cursor-pointer ${
              statusFilter === 'all' 
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-md' 
                : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-100 dark:border-neutral-750 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
            }`}
          >
            <div className="text-[11px] font-bold opacity-80 mb-1">إجمالي طلبات الانضمام</div>
            <div className="text-xl font-mono font-black">{totalCount}</div>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`p-4 rounded-xl text-right transition-all border cursor-pointer ${
              statusFilter === 'pending' 
                ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100'
            }`}
          >
            <div className="text-[11px] font-bold opacity-80 mb-1 flex items-center gap-1">
              <span>قيد المراجعة</span>
              {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />}
            </div>
            <div className="text-xl font-mono font-black">{pendingCount}</div>
          </button>

          <button
            onClick={() => setStatusFilter('accepted')}
            className={`p-4 rounded-xl text-right transition-all border cursor-pointer ${
              statusFilter === 'accepted' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
          >
            <div className="text-[11px] font-bold opacity-80 mb-1">الطلبات المقبولة</div>
            <div className="text-xl font-mono font-black">{acceptedCount}</div>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`p-4 rounded-xl text-right transition-all border cursor-pointer ${
              statusFilter === 'rejected' 
                ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-100 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100'
            }`}
          >
            <div className="text-[11px] font-bold opacity-80 mb-1">الطلبات المرفوضة</div>
            <div className="text-xl font-mono font-black">{rejectedCount}</div>
          </button>
        </div>
      </div>

      {/* 2. Controls & Search Toolbar */}
      <div className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم، رقم الهوية، الجوال..."
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Status Tabs */}
          <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'all' ? 'bg-white dark:bg-neutral-700 text-neutral-800 dark:text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              الكل ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'pending' ? 'bg-white dark:bg-neutral-700 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              المعلقة ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('accepted')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'accepted' ? 'bg-white dark:bg-neutral-700 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              المقبولة ({acceptedCount})
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${statusFilter === 'rejected' ? 'bg-white dark:bg-neutral-700 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-neutral-500 hover:text-neutral-800'}`}
            >
              المرفوضة ({rejectedCount})
            </button>
          </div>

          {/* Team Filter */}
          <div className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-transparent outline-none cursor-pointer font-bold text-xs"
            >
              <option value="all">جميع الفرق التطوعية</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-1 border border-neutral-200 dark:border-neutral-700 rounded-xl px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent outline-none cursor-pointer font-bold text-xs"
            >
              <option value="newest">الأحدث تقديم</option>
              <option value="oldest">الأقدم تقديم</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Applications List Table */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-100 dark:border-neutral-800 shadow-xs overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-3">
            <FileText className="w-12 h-12 mx-auto opacity-30 text-neutral-500" />
            <p className="text-sm font-bold text-neutral-600 dark:text-neutral-400">لا توجد طلبات انضمام تتطابق مع معايير البحث والفلترة</p>
            <p className="text-xs text-neutral-400">قم بتغيير كلمة البحث أو تحديد حالة طلب أخرى.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 font-bold border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="p-3.5">الاسم والملف</th>
                  <th className="p-3.5">رقم الهوية</th>
                  <th className="p-3.5">التواصل والجوال</th>
                  <th className="p-3.5">الفريق المطلوب</th>
                  <th className="p-3.5">تاريخ التقديم</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5 text-center">الإجراءات والقرارات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                {filteredApplications.map((app) => {
                  const teamObj = teams.find(t => t.id === app.assignedTeamId);
                  const requestedTeam = teams.find(t => t.id === (app.requestedTeamId || app.assignedTeamId));

                  return (
                    <tr key={app.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/50 transition-colors">
                      {/* Name & File */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={app.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                            alt={app.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shadow-2xs"
                          />
                          <div>
                            <div className="font-bold text-neutral-900 dark:text-white">{app.fullName}</div>
                            <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>ملف: {app.fileNumber}</span>
                              <span>•</span>
                              <span>العمر: {app.age} سنة</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* National ID */}
                      <td className="p-3.5 font-mono font-bold text-neutral-700 dark:text-neutral-300">
                        {app.nationalId}
                      </td>

                      {/* Contact Phone & Email */}
                      <td className="p-3.5">
                        <div className="font-mono text-emerald-700 dark:text-emerald-400 font-bold" dir="ltr text-right">
                          {app.phone}
                        </div>
                        {app.email && (
                          <div className="text-[10px] text-neutral-400 font-mono truncate max-w-[150px]" dir="ltr text-right">
                            {app.email}
                          </div>
                        )}
                      </td>

                      {/* Requested Team */}
                      <td className="p-3.5">
                        {requestedTeam ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 shadow-2xs">
                              <Users className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span>{requestedTeam.nameAr}</span>
                            </span>
                            {requestedTeam.leaderName && (
                              <div className="text-[10px] text-neutral-400 font-semibold pr-1">
                                القائد: {requestedTeam.leaderName}
                              </div>
                            )}
                          </div>
                        ) : app.requestedTeamName ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800">
                            <Users className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{app.requestedTeamName}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-400 font-semibold">غير محدد</span>
                        )}
                      </td>

                      {/* Applied Date */}
                      <td className="p-3.5">
                        <div className="font-mono text-neutral-600 dark:text-neutral-400 text-[11px]">
                          {app.appliedAt ? app.appliedAt.split('T')[0] : app.joinDate}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {app.appliedAt ? app.appliedAt.split('T')[1]?.substring(0, 5) : ''}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        {app.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-200 dark:border-amber-800">
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            <span>قيد المراجعة</span>
                          </span>
                        )}

                        {app.status === 'accepted' && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>مقبول</span>
                            </span>
                            {teamObj && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                {teamObj.nameAr}
                              </div>
                            )}
                          </div>
                        )}

                        {app.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-[10px] border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>مرفوض</span>
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* View Full Card */}
                          <button
                            onClick={() => setSelectedAppForView(app)}
                            className="px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            title="عرض كافة بيانات ومرفقات المتطوع"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>عرض</span>
                          </button>

                          {/* Accept Button */}
                          {app.status === 'pending' && (
                            <button
                              onClick={() => {
                                setSelectedAppForAccept(app);
                                const preferredTeam = app.requestedTeamId || app.assignedTeamId || (teams[0]?.id || '');
                                setTargetTeamId(preferredTeam);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                              title="قبول المتطوع وتعيين فريقه"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>قبول</span>
                            </button>
                          )}

                          {/* Reject Button */}
                          {app.status === 'pending' && (
                            <button
                              onClick={() => {
                                setSelectedAppForReject(app);
                                setRejectionReason('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="رفض الطلب مع إبداء السبب"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>رفض</span>
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
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. MODAL 1: VIEW FULL APPLICATION CARD (عرض الطلب بالكامل) */}
      {/* ------------------------------------------------------------- */}
      {selectedAppForView && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 bg-neutral-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img
                  src={selectedAppForView.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                  alt={selectedAppForView.fullName}
                  className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
                />
                <div>
                  <h3 className="font-bold text-base">{selectedAppForView.fullName}</h3>
                  <div className="text-xs text-neutral-300 font-mono flex items-center gap-2 mt-0.5">
                    <span>رقم الملف: {selectedAppForView.fileNumber}</span>
                    <span>•</span>
                    <span>الهوية: {selectedAppForView.nationalId}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAppForView(null)}
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-right text-xs max-h-[75vh] overflow-y-auto">
              {/* Status Banner */}
              <div className={`p-3 rounded-2xl flex items-center justify-between border ${
                selectedAppForView.status === 'pending'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  : selectedAppForView.status === 'accepted'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-bold">حالة الطلب الحالية:</span>
                  <span className="font-black">
                    {selectedAppForView.status === 'pending' && 'قيد المراجعة بانتظار قرار الإدارة'}
                    {selectedAppForView.status === 'accepted' && 'مقبول ومعتمد بالنظام'}
                    {selectedAppForView.status === 'rejected' && 'مرفوض'}
                  </span>
                </div>

                {selectedAppForView.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedAppForAccept(selectedAppForView);
                        const preferredTeam = selectedAppForView.requestedTeamId || selectedAppForView.assignedTeamId || (teams[0]?.id || '');
                        setTargetTeamId(preferredTeam);
                      }}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 cursor-pointer"
                    >
                      قبول الآن
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAppForReject(selectedAppForView);
                        setRejectionReason('');
                      }}
                      className="px-3 py-1 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 cursor-pointer"
                    >
                      رفض
                    </button>
                  </div>
                )}
              </div>

              {/* الفريق الذي اختاره المتطوع أثناء التسجيل */}
              <div className="bg-blue-50 dark:bg-blue-950/40 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
                        الفريق الذي اختاره المتطوع أثناء التسجيل:
                      </span>
                      <strong className="text-base font-black text-blue-950 dark:text-white">
                        {teams.find(t => t.id === (selectedAppForView.requestedTeamId || selectedAppForView.assignedTeamId))?.nameAr || selectedAppForView.requestedTeamName || 'فريق عام'}
                      </strong>
                      {teams.find(t => t.id === (selectedAppForView.requestedTeamId || selectedAppForView.assignedTeamId))?.leaderName && (
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block mt-0.5 font-bold">
                          قائد الفريق: {teams.find(t => t.id === (selectedAppForView.requestedTeamId || selectedAppForView.assignedTeamId))?.leaderName}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedAppForView.status === 'pending' && (
                    <div className="text-left">
                      <span className="inline-flex items-center gap-1 text-[11px] bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-bold border border-blue-200 dark:border-blue-800">
                        <Sparkles className="w-3 h-3 text-blue-600" />
                        <span>سيتم ربطه بهذا الفريق تلقائياً عند القبول</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 1. البيانات الأساسية */}
              <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-750">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>البيانات الأساسية</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">الاسم الكامل:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100">{selectedAppForView.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">رقم الهوية / الإقامة:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100 font-mono">{selectedAppForView.nationalId}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">رقم الملف المولد:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100 font-mono">{selectedAppForView.fileNumber}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">الجنس:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100">{selectedAppForView.gender === 'male' ? 'ذكر' : 'أنثى'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">الجنسية:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100">{selectedAppForView.nationality}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">تاريخ الميلاد والسر:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100 font-mono">
                      {selectedAppForView.birthDate} ({selectedAppForView.age} سنة)
                    </strong>
                  </div>
                </div>
              </div>

              {/* 2. بيانات التواصل والعمل */}
              <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-750">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>بيانات التواصل والعمل</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">رقم الجوال:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-bold" dir="ltr">{selectedAppForView.phone}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">البريد الإلكتروني:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100 font-mono">{selectedAppForView.email || 'غير مسجل'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">العنوان:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100">{selectedAppForView.address}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">المنصب المختار:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100">{selectedAppForView.position || 'متطوع'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">تاريخ التقديم:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100 font-mono">{selectedAppForView.appliedAt?.split('T')[0] || selectedAppForView.joinDate}</strong>
                  </div>
                </div>
              </div>

              {/* 3. الحالة الصحية والطوارئ */}
              <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-750">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>الحالة الصحية والطوارئ</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">فصيلة الدم:</span>
                    <strong className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-bold inline-block mt-0.5">
                      {selectedAppForView.bloodType || 'غير محدد'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">يعاني من أمراض؟</span>
                    <strong className={`font-bold ${selectedAppForView.hasChronicIllness ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {selectedAppForView.hasChronicIllness ? 'نعم (يوجد تفاصيل)' : 'لا (لائق طبياً)'}
                    </strong>
                  </div>
                  {selectedAppForView.hasChronicIllness && (
                    <div className="col-span-2">
                      <span className="text-neutral-400 block text-[10px]">تفاصيل المرض والاحتياطات:</span>
                      <p className="bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                        {selectedAppForView.illnessDetails || 'لا توجد تفاصيل إضافية'}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-neutral-400 block text-[10px]">اسم ولي الأمر:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100">{selectedAppForView.guardianName || 'غير مسجل'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">جوال ولي الأمر:</span>
                    <strong className="text-neutral-800 dark:text-neutral-100 font-mono" dir="ltr">{selectedAppForView.guardianPhone || 'غير مسجل'}</strong>
                  </div>
                </div>
              </div>

              {/* 4. الخبرات والملاحظات */}
              <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-750">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white mb-2 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>الخبرات والمهارات والدورات</span>
                </h4>
                <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed bg-white dark:bg-neutral-900 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  {selectedAppForView.experiences || 'لم يتم تسجيل خبرات سابقة.'}
                </p>
              </div>

              {/* 5. المرفقات والوثائق */}
              <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-150 dark:border-neutral-750">
                <h4 className="font-bold text-sm text-neutral-900 dark:text-white mb-3 flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>المرفقات والوثائق الرسمية</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Photo Preview */}
                  <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center">
                    <span className="text-[10px] font-bold text-neutral-400 block mb-2">الصورة الشخصية للبطاقة</span>
                    {selectedAppForView.gender === 'female' ? (
                      <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-2xl border border-purple-200 dark:border-purple-800 text-center">
                        <span className="text-xl">🌸</span>
                        <p className="text-[10px] font-bold text-purple-700 dark:text-purple-300 mt-1">
                          عنصر نسائي (صورة موحدة معتمدة تلقائياً)
                        </p>
                      </div>
                    ) : (
                      <img
                        src={selectedAppForView.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                        alt="الصورة الشخصية"
                        className="w-24 h-24 rounded-2xl object-cover mx-auto border border-neutral-200 dark:border-neutral-700 shadow-xs"
                      />
                    )}
                  </div>

                  {/* ID Card Preview */}
                  <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-center">
                    <span className="text-[10px] font-bold text-neutral-400 block mb-2">صورة الهوية الوطنية</span>
                    <img
                      src={selectedAppForView.idPhoto}
                      alt="صورة الهوية"
                      className="w-full h-24 rounded-xl object-cover border border-neutral-200 dark:border-neutral-700 shadow-xs"
                    />
                  </div>

                  {/* Volunteer Charter PDF */}
                  <div className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 flex flex-col justify-between text-center">
                    <div>
                      <span className="text-[10px] font-bold text-neutral-400 block mb-2">ميثاق التطوع المعتمد (PDF)</span>
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                        <FileCheck className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 block truncate">
                        {selectedAppForView.charterPdfName || 'ميثاق_التطوع.pdf'}
                      </span>
                    </div>

                    <a
                      href={selectedAppForView.charterPdfUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                    >
                      <Download className="w-3 h-3" />
                      <span>تحميل/عرض الميثاق</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-750 flex justify-between items-center">
              <button
                onClick={() => setSelectedAppForView(null)}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                إغلاق النافذة
              </button>

              {selectedAppForView.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedAppForAccept(selectedAppForView);
                      const preferredTeam = selectedAppForView.requestedTeamId || selectedAppForView.assignedTeamId || (teams[0]?.id || '');
                      setTargetTeamId(preferredTeam);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>قبول وتعيين الفريق</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedAppForReject(selectedAppForView);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض الطلب</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. MODAL 2: ACCEPT APPLICATION & ASSIGN TEAM (قبول المتطوع) */}
      {/* ------------------------------------------------------------- */}
      {selectedAppForAccept && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right">
            <div className="p-5 bg-emerald-600 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>قبول المتطوع وتعيين الفريق</span>
              </h3>
              <p className="text-xs text-emerald-100 mt-1">
                سيتم اعتماد المتطوع <strong>{selectedAppForAccept.fullName}</strong> رسمياً بالنظام.
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Requested Team Display */}
              {selectedAppForAccept && (
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-2xl border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>الفريق الذي اختاره المتطوع أثناء التسجيل:</span>
                    </span>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold">
                      تم التحديد تلقائياً
                    </span>
                  </div>
                  <strong className="text-sm font-black block text-blue-900 dark:text-white">
                    {teams.find(t => t.id === (selectedAppForAccept.requestedTeamId || selectedAppForAccept.assignedTeamId))?.nameAr || selectedAppForAccept.requestedTeamName || 'فريق عام'}
                  </strong>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                    تم ربط المتطوع بهذا الفريق تلقائياً كما اختار، ويمكنك اعتماد الفريق مباشرة أو تغييره من القائمة أدناه.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  الفريق التطوعي المعتمد:
                </label>
                <select
                  value={targetTeamId}
                  onChange={(e) => setTargetTeamId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- اختر فريقاً --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameAr} {t.leaderName ? `(${t.leaderName})` : ''} {t.id === selectedAppForAccept.requestedTeamId ? '⭐ [اختيار المتطوع]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 leading-relaxed text-[11px] space-y-1">
                <strong>الخطوات التلقائية التي ينفذها النظام:</strong>
                <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                  <li>نقل جميع البيانات لجدول المتطوعين المعتمدين.</li>
                  <li>ربط المتطوع بالفريق المحدد وتأكيد رقمه العضوي.</li>
                  <li>تغيير حالة الطلب إلى (مقبول).</li>
                  <li>إنشاء حساب تفعيل للدخول وإرسال إشعار للمتطوع.</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setSelectedAppForAccept(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmAccept}
                  disabled={isSubmitting || !targetTeamId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? 'جاري الاعتماد...' : 'تأكيد القبول والتسجيل'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. MODAL 3: REJECT APPLICATION (رفض طلب الانضمام) */}
      {/* ------------------------------------------------------------- */}
      {selectedAppForReject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl max-w-md w-full border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right">
            <div className="p-5 bg-rose-600 text-white">
              <h3 className="font-bold text-base flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <span>رفض طلب الانضمام</span>
              </h3>
              <p className="text-xs text-rose-100 mt-1">
                أنت على وشك رفض طلب المتطوع <strong>{selectedAppForReject.fullName}</strong>.
              </p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  سبب الرفض (سيتم إرساله للمتقدم):
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="اكتب سبب عدم القبول (مثال: عدم استيفاء الشروط، اكتفاء العدد في الفرق حالياً...)"
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setSelectedAppForReject(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleConfirmReject}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting ? 'جاري المعالجة...' : 'تأكيد رفض الطلب'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
