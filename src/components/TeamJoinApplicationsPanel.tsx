import React, { useState } from 'react';
import { 
  Users, CheckCircle2, XCircle, AlertCircle, Clock, Search, 
  Filter, Eye, Check, X, Edit3, MessageSquare, Phone, Mail, 
  MapPin, Calendar, FileText, Sparkles, Award, ShieldCheck, 
  Trash2, ArrowRight, ExternalLink, RefreshCw, Layers,
  Volume2, VolumeX, BellRing
} from 'lucide-react';
import { TeamApplication, VolunteerTeam, Department, Volunteer } from '../types';
import { useApplicationAudio } from '../utils/audioNotification';

interface TeamJoinApplicationsPanelProps {
  applications: TeamApplication[];
  teams: VolunteerTeam[];
  departments: Department[];
  onAcceptApplication: (appId: string, departmentId: string, reviewerNotes?: string) => Promise<boolean>;
  onRejectApplication: (appId: string, reason: string) => Promise<boolean>;
  onRequestCorrection: (appId: string, notes: string) => Promise<boolean>;
  onDeleteApplication?: (appId: string) => Promise<boolean>;
  onViewTeamProfile?: (team: VolunteerTeam) => void;
  lang?: 'ar' | 'en';
}

export const TeamJoinApplicationsPanel: React.FC<TeamJoinApplicationsPanelProps> = ({
  applications = [],
  teams = [],
  departments = [],
  onAcceptApplication,
  onRejectApplication,
  onRequestCorrection,
  onDeleteApplication,
  onViewTeamProfile,
  lang = 'ar'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'needs_correction'>('all');
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>('all');

  // Modals state
  const [viewingApp, setViewingApp] = useState<TeamApplication | null>(null);
  const [acceptingApp, setAcceptingApp] = useState<TeamApplication | null>(null);
  const [rejectingApp, setRejectingApp] = useState<TeamApplication | null>(null);
  const [correctingApp, setCorrectingApp] = useState<TeamApplication | null>(null);

  // Form states for modals
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>(departments[0]?.id || '');
  const [rejectionReason, setRejectionReason] = useState('');
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Audio Notification Alert Hook
  const { isAudioEnabled, toggleAudio, testSound } = useApplicationAudio();

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.applicationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.leaderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.leaderPhone.includes(searchTerm) ||
      (app.city && app.city.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesCity = selectedCityFilter === 'all' || app.city === selectedCityFilter;

    return matchesSearch && matchesStatus && matchesCity;
  });

  // Calculate quick stats
  const totalCount = applications.length;
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const rejectedCount = applications.filter(a => a.status === 'rejected').length;
  const correctionCount = applications.filter(a => a.status === 'needs_correction').length;

  // Extract unique cities from applications
  const uniqueCities = Array.from(new Set(applications.map(a => a.city).filter(Boolean)));

  // Handlers
  const handleConfirmAccept = async () => {
    if (!acceptingApp) return;
    setIsProcessing(true);
    const success = await onAcceptApplication(acceptingApp.id, selectedDepartmentId);
    setIsProcessing(false);
    if (success) {
      setAcceptingApp(null);
      if (viewingApp?.id === acceptingApp.id) setViewingApp(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingApp || !rejectionReason.trim()) {
      alert("يرجى كتابة سبب الرفض لتوضيحه لمقدم الطلب");
      return;
    }
    setIsProcessing(true);
    const success = await onRejectApplication(rejectingApp.id, rejectionReason.trim());
    setIsProcessing(false);
    if (success) {
      setRejectingApp(null);
      setRejectionReason('');
      if (viewingApp?.id === rejectingApp.id) setViewingApp(null);
    }
  };

  const handleConfirmCorrection = async () => {
    if (!correctingApp || !correctionNotes.trim()) {
      alert("يرجى كتابة الملاحظات المطلوب من قائد الفريق تعديلها");
      return;
    }
    setIsProcessing(true);
    const success = await onRequestCorrection(correctingApp.id, correctionNotes.trim());
    setIsProcessing(false);
    if (success) {
      setCorrectingApp(null);
      setCorrectionNotes('');
      if (viewingApp?.id === correctingApp.id) setViewingApp(null);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Header & Stats Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>طلبات انضمام الفرق التطوعية</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              مراجعة وتدقيق واعتماد طلبات تسجيل الفرق التطوعية الخارجية الراغبة بالانضمام لريادة العطاء
            </p>
          </div>

          {/* Audio Alert Status & Quick Toggle */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all self-start sm:self-center ${
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
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              statusFilter === 'all' 
                ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 shadow-md' 
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
            }`}
          >
            <span className="text-[11px] opacity-80 block font-bold">إجمالي الطلبات</span>
            <strong className="text-xl font-black">{totalCount}</strong>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              statusFilter === 'pending' 
                ? 'bg-amber-500 text-white border-amber-500 shadow-md' 
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-amber-400'
            }`}
          >
            <span className="text-[11px] opacity-80 block font-bold">قيد المراجعة</span>
            <div className="flex items-center justify-between">
              <strong className="text-xl font-black">{pendingCount}</strong>
              {pendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />}
            </div>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              statusFilter === 'approved' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-emerald-400'
            }`}
          >
            <span className="text-[11px] opacity-80 block font-bold">المعتمدة والمقبولة</span>
            <strong className="text-xl font-black">{approvedCount}</strong>
          </button>

          <button
            onClick={() => setStatusFilter('needs_correction')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              statusFilter === 'needs_correction' 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-blue-400'
            }`}
          >
            <span className="text-[11px] opacity-80 block font-bold">تحتاج تعديل</span>
            <strong className="text-xl font-black">{correctionCount}</strong>
          </button>

          <button
            onClick={() => setStatusFilter('rejected')}
            className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
              statusFilter === 'rejected' 
                ? 'bg-rose-600 text-white border-rose-600 shadow-md' 
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-rose-400'
            }`}
          >
            <span className="text-[11px] opacity-80 block font-bold">المرفوضة</span>
            <strong className="text-xl font-black">{rejectedCount}</strong>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-3 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="ابحث باسم الفريق، رقم الطلب، اسم القائد، أو رقم الجوال..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
          />
        </div>

        {uniqueCities.length > 0 && (
          <div className="sm:w-48">
            <select
              value={selectedCityFilter}
              onChange={(e) => setSelectedCityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 outline-hidden font-medium cursor-pointer"
            >
              <option value="all">جميع المدن ({uniqueCities.length})</option>
              {uniqueCities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Applications Table */}
      <div className="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900 shadow-2xs">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 font-bold">
              <th className="p-3.5">رقم الطلب</th>
              <th className="p-3.5">اسم الفريق التطوعي</th>
              <th className="p-3.5">المدينة</th>
              <th className="p-3.5">قائد الفريق والتواصل</th>
              <th className="p-3.5 text-center">الأعضاء والمبادرات</th>
              <th className="p-3.5 text-center">تاريخ التقديم</th>
              <th className="p-3.5 text-center">حالة الطلب</th>
              <th className="p-3.5 text-center">الإجراءات والقرار</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-medium">
            {filteredApplications.length > 0 ? (
              filteredApplications.map((app) => {
                const teamColor = app.teamColor || '#059669';
                return (
                  <tr key={app.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40 transition-all">
                    {/* Application Number */}
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-neutral-700 dark:text-neutral-300 text-[11px] block">
                        {app.applicationNumber}
                      </span>
                    </td>

                    {/* Team Name and Logo */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-8 h-8 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-white font-black text-xs shadow-2xs"
                          style={{ backgroundColor: teamColor }}
                        >
                          {app.logoUrl ? (
                            <img src={app.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            app.teamName.charAt(0)
                          )}
                        </div>
                        <div>
                          <strong className="text-neutral-900 dark:text-neutral-100 font-black block">{app.teamName}</strong>
                          {app.teamNameEn && (
                            <span className="text-[10px] text-neutral-400 font-mono block">{app.teamNameEn}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* City */}
                    <td className="p-3.5">
                      <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        {app.city}
                      </span>
                    </td>

                    {/* Leader */}
                    <td className="p-3.5">
                      <div>
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 block">{app.leaderName}</span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono" dir="ltr">{app.leaderPhone}</span>
                      </div>
                    </td>

                    {/* Members & Past Initiatives */}
                    <td className="p-3.5 text-center">
                      <span className="text-[11px] text-neutral-600 dark:text-neutral-400 block font-bold">
                        {app.membersCount} عضو
                      </span>
                      <span className="text-[10px] text-neutral-400 block">
                        {app.pastInitiativesCount || 0} مبادرة سابقة
                      </span>
                    </td>

                    {/* Applied Date */}
                    <td className="p-3.5 text-center">
                      <span className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 block">
                        {new Date(app.appliedAt).toISOString().split('T')[0]}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-black ${
                        app.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                          : app.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                          : app.status === 'needs_correction'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                      }`}>
                        {app.status === 'approved' ? 'معتمد ومقبول' :
                         app.status === 'rejected' ? 'مرفوض' :
                         app.status === 'needs_correction' ? 'يحتاج تعديل' :
                         'قيد المراجعة'}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* View Full Details button */}
                        <button
                          onClick={() => setViewingApp(app)}
                          className="p-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg transition-all cursor-pointer text-xs font-bold flex items-center gap-1"
                          title="عرض التفاصيل الكاملة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض</span>
                        </button>

                        {/* Accept Button if not approved */}
                        {app.status !== 'approved' && (
                          <button
                            onClick={() => {
                              setAcceptingApp(app);
                              setSelectedDepartmentId(departments[0]?.id || '');
                            }}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:hover:bg-emerald-900 dark:text-emerald-300 rounded-lg transition-all cursor-pointer text-xs font-bold flex items-center gap-1"
                            title="قبول واعتماد الفريق"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>قبول</span>
                          </button>
                        )}

                        {/* Request Correction Button */}
                        {app.status !== 'approved' && (
                          <button
                            onClick={() => {
                              setCorrectingApp(app);
                              setCorrectionNotes(app.correctionNotes || '');
                            }}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 rounded-lg transition-all cursor-pointer text-xs font-bold"
                            title="طلب تعديل بيانات"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Reject Button */}
                        {app.status !== 'rejected' && app.status !== 'approved' && (
                          <button
                            onClick={() => {
                              setRejectingApp(app);
                              setRejectionReason('');
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 rounded-lg transition-all cursor-pointer text-xs font-bold"
                            title="رفض الطلب"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Application Button */}
                        {onDeleteApplication && (
                          <button
                            onClick={async () => {
                              if (confirm(`هل أنت متأكد من حذف طلب الفريق (${app.teamName}) نهائياً؟`)) {
                                await onDeleteApplication(app.id);
                              }
                            }}
                            className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition-all cursor-pointer text-xs"
                            title="حذف الطلب"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-8 text-center text-neutral-500 font-bold text-xs">
                  لا توجد طلبات انضمام فرق مطابقة لمعايير البحث الحالية.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: VIEW FULL DETAILS MODAL */}
      {viewingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/60">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-sm shadow-xs"
                  style={{ backgroundColor: viewingApp.teamColor || '#059669' }}
                >
                  {viewingApp.logoUrl ? (
                    <img src={viewingApp.logoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    viewingApp.teamName.charAt(0)
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 block">{viewingApp.applicationNumber}</span>
                  <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">{viewingApp.teamName}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${
                  viewingApp.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                  viewingApp.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                  viewingApp.status === 'needs_correction' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  {viewingApp.status === 'approved' ? 'معتمد' :
                   viewingApp.status === 'rejected' ? 'مرفوض' :
                   viewingApp.status === 'needs_correction' ? 'يحتاج تعديل' : 'قيد المراجعة'}
                </span>
                <button
                  onClick={() => setViewingApp(null)}
                  className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-neutral-800 dark:text-neutral-200">
              
              {/* Leader & Basic Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>بيانات الفريق</span>
                  </h4>
                  <div className="space-y-1 text-neutral-600 dark:text-neutral-400">
                    <div>المدينة: <strong className="text-neutral-900 dark:text-neutral-100">{viewingApp.city}</strong></div>
                    <div>تاريخ التأسيس: <strong className="text-neutral-900 dark:text-neutral-100">{viewingApp.establishedDate}</strong></div>
                    <div>عدد الأعضاء: <strong className="text-neutral-900 dark:text-neutral-100">{viewingApp.membersCount} عضو</strong></div>
                    <div>المبادرات السابقة: <strong className="text-neutral-900 dark:text-neutral-100">{viewingApp.pastInitiativesCount || 0}</strong></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>بيانات قائد الفريق</span>
                  </h4>
                  <div className="space-y-1 text-neutral-600 dark:text-neutral-400">
                    <div>اسم القائد: <strong className="text-neutral-900 dark:text-neutral-100">{viewingApp.leaderName}</strong></div>
                    <div>رقم الجوال: <strong className="text-emerald-700 dark:text-emerald-400 font-mono" dir="ltr">{viewingApp.leaderPhone}</strong></div>
                    {viewingApp.leaderEmail && <div>البريد: <strong className="font-mono">{viewingApp.leaderEmail}</strong></div>}
                    {viewingApp.leaderNationalId && <div>الهوية الوطنية: <strong className="font-mono">{viewingApp.leaderNationalId}</strong></div>}
                  </div>
                </div>
              </div>

              {/* Description */}
              {viewingApp.description && (
                <div className="space-y-1">
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">نبذة عن الفريق:</span>
                  <p className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl leading-relaxed">{viewingApp.description}</p>
                </div>
              )}

              {/* Meaningful Idea */}
              {viewingApp.meaningfulIdea && (
                <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-black">
                    <Sparkles className="w-4 h-4" />
                    <span>فكرة هادفة للمجتمع: {viewingApp.meaningfulIdeaTitle || ''}</span>
                  </div>
                  <p className="text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-line">
                    {viewingApp.meaningfulIdea}
                  </p>
                </div>
              )}

              {/* Vision, Mission, Goals, Domains */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {viewingApp.vision && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1">
                    <span className="font-bold text-emerald-800 dark:text-emerald-400">رؤية الفريق:</span>
                    <p className="leading-relaxed">{viewingApp.vision}</p>
                  </div>
                )}
                {viewingApp.mission && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1">
                    <span className="font-bold text-blue-800 dark:text-blue-400">رسالة الفريق:</span>
                    <p className="leading-relaxed">{viewingApp.mission}</p>
                  </div>
                )}
                {viewingApp.goals && (
                  <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-xl space-y-1">
                    <span className="font-bold text-amber-800 dark:text-amber-400">أهداف الفريق:</span>
                    <p className="leading-relaxed">{viewingApp.goals}</p>
                  </div>
                )}
              </div>

              {/* Services & Domains */}
              {viewingApp.services && viewingApp.services.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">المجالات والخدمات:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingApp.services.map((s, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold text-[11px]">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {viewingApp.attachments && viewingApp.attachments.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-neutral-700 dark:text-neutral-300">المرفقات والمستندات:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewingApp.attachments.map((att) => (
                      <div key={att.id} className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold truncate max-w-[200px]">{att.title}</span>
                        </div>
                        <a 
                          href={att.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-bold flex items-center gap-1"
                        >
                          <span>فتح الملف</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection / Correction History */}
              {viewingApp.rejectionReason && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
                  <span className="font-bold text-rose-900 dark:text-rose-300 block">سبب الرفض السابق:</span>
                  <p className="text-rose-800 dark:text-rose-200 mt-0.5">{viewingApp.rejectionReason}</p>
                </div>
              )}

              {viewingApp.correctionNotes && (
                <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="font-bold text-blue-900 dark:text-blue-300 block">ملاحظات التعديل المطلوبة:</span>
                  <p className="text-blue-800 dark:text-blue-200 mt-0.5">{viewingApp.correctionNotes}</p>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 border-t border-neutral-100 dark:border-neutral-800 flex justify-between items-center">
              <div className="flex gap-2">
                {viewingApp.status !== 'approved' && (
                  <button
                    onClick={() => {
                      setAcceptingApp(viewingApp);
                      setSelectedDepartmentId(departments[0]?.id || '');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>قبول واعتماد الفريق</span>
                  </button>
                )}

                {viewingApp.status !== 'approved' && (
                  <button
                    onClick={() => {
                      setCorrectingApp(viewingApp);
                      setCorrectionNotes(viewingApp.correctionNotes || '');
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>طلب تعديل بيانات</span>
                  </button>
                )}

                {viewingApp.status !== 'rejected' && viewingApp.status !== 'approved' && (
                  <button
                    onClick={() => {
                      setRejectingApp(viewingApp);
                      setRejectionReason('');
                    }}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>رفض الطلب</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setViewingApp(null)}
                className="px-5 py-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 text-neutral-800 dark:text-neutral-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: ACCEPT TEAM MODAL */}
      {acceptingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">اعتماد وقبول الفريق التطوعي</h3>
                <p className="text-xs text-neutral-500">{acceptingApp.teamName}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  تعيين الإدارة التنفيذية المشرفة على الفريق:
                </label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-bold outline-hidden"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.nameAr} ({dept.directorName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-xl text-emerald-900 dark:text-emerald-200 space-y-1">
                <span className="font-bold block">ما الذي سيحدث عند الاعتماد؟</span>
                <ul className="list-disc pr-4 space-y-0.5 text-[11px]">
                  <li>إضافة الفريق رسمياً إلى دليل الفرق التطوعية المعتمدة.</li>
                  <li>إنشاء حساب قائد الفريق برتبة "قائد فريق" للوصول للوحة التحكم.</li>
                  <li>إرسال إشعار ترحيب فوري لقائد الفريق بالاعتماد الرسمي.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setAcceptingApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmAccept}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>تأكيد اعتماد الفريق</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: REJECT TEAM MODAL */}
      {rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">رفض طلب الانضمام</h3>
                <p className="text-xs text-neutral-500">{rejectingApp.teamName}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-neutral-700 dark:text-neutral-300">
                سبب الرفض <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="اكتب سبب عدم قبول الطلب لتوضيحه لمقدم الطلب..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium resize-none outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                <span>تأكيد الرفض</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: REQUEST CORRECTION MODAL */}
      {correctingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" dir="rtl">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">طلب تعديل بيانات الطلب</h3>
                <p className="text-xs text-neutral-500">{correctingApp.teamName}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-neutral-700 dark:text-neutral-300">
                الملاحظات والتعديلات المطلوبة من القائد <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                placeholder="مثال: يرجى إرفاق شعار الفريق بجودة عالية وتحديث عدد أعضاء الفريق..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium resize-none outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setCorrectingApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmCorrection}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                <span>إرسال طلب التعديل</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
