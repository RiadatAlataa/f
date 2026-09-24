import React, { useState, useMemo } from 'react';
import {
  HeartHandshake,
  Calendar,
  Users,
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Copy,
  ExternalLink,
  Share2,
  Search,
  Filter,
  TrendingUp,
  Download,
  Printer,
  Sparkles,
  Lock,
  Globe,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Star,
  FileText,
  Eye,
  X,
  Check,
  Phone,
  Mail,
  User,
  AlertCircle
} from 'lucide-react';
import { Initiative, OpportunityRequest, Volunteer, VolunteerTeam, VolunteerApplication } from '../types';
import { InitiativeTeamEvaluationModal } from './InitiativeTeamEvaluationModal';

interface VolunteerManagementDashboardProps {
  initiatives: Initiative[];
  opportunityRequests: OpportunityRequest[];
  volunteers: Volunteer[];
  teams: VolunteerTeam[];
  volunteerApplications?: VolunteerApplication[];
  onAcceptApplication?: (applicationId: string, teamId: string) => Promise<boolean>;
  onRejectApplication?: (applicationId: string, rejectionReason: string) => Promise<boolean>;
  onReviewOpportunity?: (opp: OpportunityRequest) => void;
  onEvaluateTeamPoints?: (payload: {
    initiativeId: string;
    evaluationType: 'completed_best' | 'average_with_notes';
    notes?: string;
    evaluatorName?: string;
    evaluatorRole?: string;
  }) => Promise<boolean>;
}

export const VolunteerManagementDashboard: React.FC<VolunteerManagementDashboardProps> = ({
  initiatives = [],
  opportunityRequests = [],
  volunteers = [],
  teams = [],
  volunteerApplications = [],
  onAcceptApplication,
  onRejectApplication,
  onReviewOpportunity,
  onEvaluateTeamPoints
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'public' | 'private' | 'open' | 'full'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [evaluationTargetInit, setEvaluationTargetInit] = useState<Initiative | null>(null);

  // Applicants Modal State
  const [selectedOppForApplicants, setSelectedOppForApplicants] = useState<Initiative | null>(null);
  const [applicantsTab, setApplicantsTab] = useState<'applicants' | 'participants'>('applicants');
  const [viewingAppDetail, setViewingAppDetail] = useState<VolunteerApplication | null>(null);
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [isProcessingApp, setIsProcessingApp] = useState(false);

  // Statistics Calculations
  const stats = useMemo(() => {
    const totalOpportunities = initiatives.length;
    const pendingRequests = opportunityRequests.filter(r => r.status === 'pending').length;
    const acceptedRequests = opportunityRequests.filter(r => r.status === 'accepted').length;
    const returnedRequests = opportunityRequests.filter(r => r.status === 'returned').length;
    const rejectedRequests = opportunityRequests.filter(r => r.status === 'rejected').length;

    const publicCount = initiatives.filter(i => i.scope !== 'private' && !i.opportunityType?.includes('خاصة')).length;
    const privateCount = initiatives.filter(i => i.scope === 'private' || i.opportunityType?.includes('خاصة')).length;

    const totalNeededSeats = initiatives.reduce((acc, curr) => acc + (curr.neededCount || 0), 0);
    const totalOccupiedSeats = initiatives.reduce((acc, curr) => acc + (curr.acceptedCount || 0), 0);
    const totalWaitlist = initiatives.reduce((acc, curr) => acc + (curr.waitlistCount || 0), 0);

    const totalHours = volunteers.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const activeVolunteers = volunteers.filter(v => v.status === 'active' || !v.status).length;

    return {
      totalOpportunities,
      pendingRequests,
      acceptedRequests,
      returnedRequests,
      rejectedRequests,
      publicCount,
      privateCount,
      totalNeededSeats,
      totalOccupiedSeats,
      totalWaitlist,
      totalHours,
      activeVolunteers,
      occupancyRate: totalNeededSeats > 0 ? Math.round((totalOccupiedSeats / totalNeededSeats) * 100) : 0
    };
  }, [initiatives, opportunityRequests, volunteers]);

  // Filtered Initiatives List
  const filteredInitiatives = useMemo(() => {
    return initiatives.filter(init => {
      const isPrivate = init.scope === 'private' || init.opportunityType?.includes('خاصة');
      const isFull = (init.acceptedCount || 0) >= (init.neededCount || 0);

      if (activeFilter === 'public' && isPrivate) return false;
      if (activeFilter === 'private' && !isPrivate) return false;
      if (activeFilter === 'open' && (init.registrationStatus !== 'open' || isFull)) return false;
      if (activeFilter === 'full' && !isFull) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = init.name?.toLowerCase().includes(q);
        const matchCode = init.opportunityCode?.toLowerCase().includes(q);
        const matchPlace = init.place?.toLowerCase().includes(q);
        const matchDomain = init.domain?.toLowerCase().includes(q);
        return matchTitle || matchCode || matchPlace || matchDomain;
      }

      return true;
    });
  }, [initiatives, activeFilter, searchQuery]);

  const copyRegistrationUrl = (url?: string, code?: string) => {
    if (!url && !code) return;
    const finalUrl = url || `${window.location.origin}/?oppCode=${code}`;
    navigator.clipboard.writeText(finalUrl);
    setCopiedCode(code || 'url');
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>الإدارة المعتمدة للعمل التطوعي • جمعية ريادة العطاء</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black">لوحة متابعة وإحصائيات إدارة التطوع</h2>
            <p className="text-xs text-emerald-100/80 max-w-2xl leading-relaxed">
              إدارة الفرص التطوعية العامة والخاصة بالفرق، اعتماد وتوليد معرفات الفرص الرسمية وروابط التسجيل المباشرة، وحوكمة تسجيل المتطوعين والساعات الميدانية.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 backdrop-blur-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة التقرير</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">الفرص المنشورة</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.totalOpportunities}</p>
          <div className="flex gap-2 mt-1.5 text-[10px] font-bold">
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{stats.publicCount} عامة</span>
            <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">{stats.privateCount} خاصة</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">بانتظار الاعتماد</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 font-mono">{stats.pendingRequests}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-1.5">فرص مرفوعة من القادة</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">المتطوعون النشطون</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.activeVolunteers}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-1.5">من أصل {volunteers.length} متطوع</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">الساعات الميدانية</span>
            <Award className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-600 font-mono">{stats.totalHours.toLocaleString('ar-SA')}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-1.5">ساعة تطوع موثقة</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">المقاعد المشغولة</span>
            <UserCheck className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-700 font-mono">{stats.totalOccupiedSeats} / {stats.totalNeededSeats}</p>
          <span className="text-[10px] text-teal-600 font-bold block mt-1.5">نسبة الإشغال: {stats.occupancyRate}%</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">قوائم الانتظار</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600 font-mono">{stats.totalWaitlist}</p>
          <span className="text-[10px] text-slate-400 font-bold block mt-1.5">طلب بانتظار توفر شواغر</span>
        </div>
      </div>

      {/* Opportunity State Machine Cards (حالات الفرص) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 mb-3">حالة ومسار الفرص التطوعية في النظام</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-750 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 block">مسودات ومعادة للتعديل</span>
              <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono">
                {opportunityRequests.filter(r => r.status === 'draft' || r.status === 'returned').length}
              </span>
            </div>
            <span className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-[10px] font-bold rounded">مسودة/معدلة</span>
          </div>

          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">بانتظار الاعتماد</span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-400 font-mono">
                {stats.pendingRequests}
              </span>
            </div>
            <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded">تدقيق إدارة التطوع</span>
          </div>

          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">معتمدة ومفتوحة للتسجيل</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">
                {initiatives.filter(i => i.registrationStatus === 'open' && (i.acceptedCount || 0) < (i.neededCount || 0)).length}
              </span>
            </div>
            <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">كود ورابط نشط</span>
          </div>

          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 block">مكتملة المقاعد</span>
              <span className="text-lg font-black text-purple-700 dark:text-purple-400 font-mono">
                {initiatives.filter(i => (i.acceptedCount || 0) >= (i.neededCount || 0)).length}
              </span>
            </div>
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">قائمة انتظار مفعلة</span>
          </div>
        </div>
      </div>

      {/* Main Opportunities Registry */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-150 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">سجل الفرص التطوعية المعتمدة وروابط التسجيل</h3>
            <p className="text-xs text-slate-500 mt-0.5">متابعة الأكواد المعتمدة (#OPP)، والروابط المباشرة، وحالة المقاعد المشغولة وقوائم الانتظار</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، الكود، المكان..."
                className="pr-8 pl-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 w-48 sm:w-60"
              />
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeFilter === 'all' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-xs' : 'text-slate-600'}`}
              >
                الكل ({initiatives.length})
              </button>
              <button
                onClick={() => setActiveFilter('public')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeFilter === 'public' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-xs' : 'text-slate-600'}`}
              >
                عامة ({stats.publicCount})
              </button>
              <button
                onClick={() => setActiveFilter('private')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeFilter === 'private' ? 'bg-white dark:bg-slate-700 text-purple-700 shadow-xs' : 'text-slate-600'}`}
              >
                خاصة بالفرق ({stats.privateCount})
              </button>
              <button
                onClick={() => setActiveFilter('open')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeFilter === 'open' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-xs' : 'text-slate-600'}`}
              >
                متاحة
              </button>
              <button
                onClick={() => setActiveFilter('full')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${activeFilter === 'full' ? 'bg-white dark:bg-slate-700 text-rose-700 shadow-xs' : 'text-slate-600'}`}
              >
                مكتملة
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">كود الفرصة المعتمد</th>
                <th className="p-3">اسم الفرصة</th>
                <th className="p-3">نطاق الفرصة</th>
                <th className="p-3">الفريق / القائد</th>
                <th className="p-3 text-center">المقاعد المشغولة</th>
                <th className="p-3 text-center">المتقدمون للفرصة</th>
                <th className="p-3 text-center">قائمة الانتظار</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">تقييم ونقاط الفريق</th>
                <th className="p-3 text-center">رابط التسجيل المعتمد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredInitiatives.map(init => {
                const isPrivate = init.scope === 'private' || init.opportunityType?.includes('خاصة');
                const isFull = (init.acceptedCount || 0) >= (init.neededCount || 0);
                const shareUrl = init.registrationUrl || `${window.location.origin}/?oppCode=${init.opportunityCode || init.id}`;

                // Calculate applicants for this specific opportunity
                const oppApplicants = volunteerApplications.filter(a => 
                  a.opportunityId === init.id || 
                  (init.opportunityCode && a.opportunityCode === init.opportunityCode) ||
                  a.opportunityCode === init.id
                );
                const pendingCount = oppApplicants.filter(a => a.status === 'pending').length;

                return (
                  <tr key={init.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="p-3 font-mono font-bold">
                      <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-md text-[11px]">
                        #{init.opportunityCode || init.id}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                      <div>{init.name}</div>
                      <span className="text-[10px] text-slate-400 font-normal">📍 {init.place} • {init.date}</span>
                    </td>
                    <td className="p-3">
                      {isPrivate ? (
                        <span className="inline-flex items-center gap-1 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <Lock className="w-3 h-3" />
                          <span>خاصة بفريق</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <Globe className="w-3 h-3" />
                          <span>عامة للجميع</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300">
                      <div>{teams.find(t => t.id === init.teamId)?.nameAr || "فريق تطوعي"}</div>
                      <span className="text-[10px] text-slate-400">{init.domain || "مجال عام"}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {init.acceptedCount || 0} / {init.neededCount || 0}
                      </div>
                      <div className="w-20 bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mx-auto mt-1 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isFull ? 'bg-purple-600' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, Math.round(((init.acceptedCount || 0) / (init.neededCount || 1)) * 100))}%` }}
                        />
                      </div>
                    </td>

                    {/* Button for Opportunity Applicants */}
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedOppForApplicants(init);
                          setApplicantsTab('applicants');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold transition-all shadow-xs cursor-pointer"
                        title="عرض وإدارة المتقدمين والمشاركين في هذه الفرصة"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>المتقدمون</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                          pendingCount > 0 ? 'bg-amber-500 text-white' : 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100'
                        }`}>
                          {oppApplicants.length}
                        </span>
                      </button>
                    </td>

                    <td className="p-3 text-center font-mono font-bold">
                      {(init.waitlistCount || 0) > 0 ? (
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-[10px]">
                          {init.waitlistCount} انتظار
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">لا يوجد</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isFull ? 'bg-purple-100 text-purple-800' :
                        init.registrationStatus === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isFull ? 'مكتملة المقاعد' : init.registrationStatus === 'open' ? 'مفتوحة للتسجيل' : 'مغلقة'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {init.teamPointsAwarded ? (
                        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-xl text-[10px] font-bold">
                          <Award className="w-3.5 h-3.5 text-amber-600" />
                          <span>تم احتساب النقاط (+{init.teamTotalPoints || 10})</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEvaluationTargetInit(init)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10.5px] font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>تقييم ومنح نقاط الفريق</span>
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => copyRegistrationUrl(init.registrationUrl, init.opportunityCode || init.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                        title="نسخ رابط التسجيل المباشر"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedCode === (init.opportunityCode || init.id) ? 'تم النسخ!' : 'نسخ الرابط'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredInitiatives.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    لا توجد فرص تطوعية مطابقة لمعايير البحث الحالية.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Evaluation Modal */}
      {evaluationTargetInit && onEvaluateTeamPoints && (
        <InitiativeTeamEvaluationModal
          isOpen={!!evaluationTargetInit}
          onClose={() => setEvaluationTargetInit(null)}
          initiative={evaluationTargetInit}
          teams={teams}
          currentUser={{ name: 'إدارة التطوع', role: 'volunteer_admin', departmentId: 'dep-5' }}
          onSubmitEvaluation={onEvaluateTeamPoints}
        />
      )}

      {/* ------------------------------------------------------------------- */}
      {/* OPPORTUNITY APPLICANTS & PARTICIPANTS MODAL */}
      {/* ------------------------------------------------------------------- */}
      {selectedOppForApplicants && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8 text-right" dir="rtl">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  كود الفرصة: #{selectedOppForApplicants.opportunityCode || selectedOppForApplicants.id}
                </span>
                <h3 className="text-lg font-black text-slate-800 dark:text-white mt-0.5">
                  إدارة المتقدمين والمشاركين: {selectedOppForApplicants.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  📍 {selectedOppForApplicants.place} • 📅 {selectedOppForApplicants.date}
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedOppForApplicants(null);
                  setRejectingAppId(null);
                }}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Tabs */}
            {(() => {
              const oppApps = volunteerApplications.filter(a => 
                a.opportunityId === selectedOppForApplicants.id || 
                (selectedOppForApplicants.opportunityCode && a.opportunityCode === selectedOppForApplicants.opportunityCode) ||
                a.opportunityCode === selectedOppForApplicants.id
              );
              const acceptedIds = selectedOppForApplicants.acceptedVolunteerIds || [];
              const participantVolunteers = volunteers.filter(v => acceptedIds.includes(v.id));

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
                    <button
                      onClick={() => setApplicantsTab('applicants')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        applicantsTab === 'applicants'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>المتقدمون للفرصة ({oppApps.length})</span>
                    </button>

                    <button
                      onClick={() => setApplicantsTab('participants')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                        applicantsTab === 'participants'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>المشاركون المعتمدون بالفرصة ({participantVolunteers.length})</span>
                    </button>
                  </div>

                  {/* TAB 1: APPLICANTS TABLE */}
                  {applicantsTab === 'applicants' && (
                    <div className="space-y-3">
                      {oppApps.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                          لم يتم تقديم أي طلبات تطوع لهذه الفرصة حتى الآن.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="p-3">اسم المتقدم</th>
                                <th className="p-3">رقم الهوية</th>
                                <th className="p-3">الجوال</th>
                                <th className="p-3">تاريخ التقديم</th>
                                <th className="p-3 text-center">حالة الطلب</th>
                                <th className="p-3 text-center">الإجراءات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {oppApps.map(app => (
                                <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                                  <td className="p-3 font-bold text-slate-800 dark:text-white">
                                    {app.fullName}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                                    {app.nationalId}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                                    {app.phone}
                                  </td>
                                  <td className="p-3 text-slate-500 font-mono">
                                    {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString('ar-SA') : 'حديثاً'}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      app.status === 'accepted' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                      app.status === 'rejected' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                      'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                    }`}>
                                      {app.status === 'accepted' ? 'مقبول' : app.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      {/* View File / Application Details */}
                                      <button
                                        onClick={() => setViewingAppDetail(app)}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                        title="عرض ملف واستمارة المتقدم"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>عرض الملف</span>
                                      </button>

                                      {/* Accept Button */}
                                      {app.status === 'pending' && onAcceptApplication && (
                                        <button
                                          disabled={isProcessingApp}
                                          onClick={async () => {
                                            setIsProcessingApp(true);
                                            const teamId = selectedOppForApplicants.teamId || teams[0]?.id || '';
                                            const ok = await onAcceptApplication(app.id, teamId);
                                            setIsProcessingApp(false);
                                            if (ok) {
                                              alert(`تم قبول طلب المتطوع (${app.fullName}) وإضافته لقائمة المشاركين في الفرصة بنجاح.`);
                                            }
                                          }}
                                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                                          title="قبول المتطوع وإلحاقه بالفرصة"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          <span>قبول</span>
                                        </button>
                                      )}

                                      {/* Reject Button */}
                                      {app.status === 'pending' && onRejectApplication && (
                                        <button
                                          disabled={isProcessingApp}
                                          onClick={() => {
                                            setRejectingAppId(app.id);
                                            setRejectReasonText('عدم استيفاء شروط الفرصة');
                                          }}
                                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                          title="رفض طلب الانضمام"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          <span>رفض</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: PARTICIPANTS LIST */}
                  {applicantsTab === 'participants' && (
                    <div className="space-y-3">
                      {participantVolunteers.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-slate-700/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-400">
                          لا يوجد مشاركون معتمدون مسجلون في هذه الفرصة حتى الآن.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                          <table className="w-full text-xs text-right">
                            <thead className="bg-slate-50 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th className="p-3">#</th>
                                <th className="p-3">اسم المتطوع</th>
                                <th className="p-3">رقم العضوية</th>
                                <th className="p-3">الفريق التطوعي</th>
                                <th className="p-3 font-mono text-center">الساعات التطوعية</th>
                                <th className="p-3">رقم الجوال</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                              {participantVolunteers.map((vol, idx) => {
                                const team = teams.find(t => t.id === vol.teamId);
                                return (
                                  <tr key={vol.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                                    <td className="p-3 text-slate-400 font-bold">{idx + 1}</td>
                                    <td className="p-3 font-bold text-slate-800 dark:text-white">
                                      {vol.name}
                                    </td>
                                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                                      {vol.membershipNumber || vol.nationalId || 'VOL-MEMBER'}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300">
                                      {team ? team.nameAr : 'متطوع مستقل'}
                                    </td>
                                    <td className="p-3 font-mono font-bold text-center text-emerald-600">
                                      {vol.hours || 0} ساعة
                                    </td>
                                    <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                                      {vol.phone || 'غير مسجل'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Rejection Prompt inside Modal */}
            {rejectingAppId && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-3">
                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  <AlertCircle className="w-4 h-4" />
                  <span>تأكيد رفض طلب المتطوع وتحديد السبب:</span>
                </div>
                <input
                  type="text"
                  value={rejectReasonText}
                  onChange={e => setRejectReasonText(e.target.value)}
                  placeholder="سبب الرفض (مثال: عدم استيفاء الشروط أو اكتمال المقاعد)..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 text-xs font-semibold"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectingAppId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingApp}
                    onClick={async () => {
                      if (!onRejectApplication) return;
                      setIsProcessingApp(true);
                      const ok = await onRejectApplication(rejectingAppId, rejectReasonText || 'عدم استيفاء الشروط');
                      setIsProcessingApp(false);
                      setRejectingAppId(null);
                      if (ok) {
                        alert('تم تسجيل رفض طلب المتطوع بنجاح.');
                      }
                    }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                  >
                    تأكيد الرفض
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedOppForApplicants(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* APPLICANT FULL PROFILE MODAL */}
      {/* ------------------------------------------------------------------- */}
      {viewingAppDetail && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8 text-right" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h4 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>ملف واستمارة المتقدم: {viewingAppDetail.fullName}</span>
              </h4>
              <button
                onClick={() => setViewingAppDetail(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-700/40 p-3 rounded-2xl">
                <div>
                  <span className="text-slate-400 text-[10px] block">رقم الهوية / الإقامة:</span>
                  <strong className="font-mono text-slate-800 dark:text-white">{viewingAppDetail.nationalId}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">رقم الجوال:</span>
                  <strong className="font-mono text-slate-800 dark:text-white">{viewingAppDetail.phone}</strong>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">البريد الإلكتروني:</span>
                  <span className="font-mono text-slate-800 dark:text-white truncate block">{viewingAppDetail.email || 'غير مسجل'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">الجنسية والمدينة:</span>
                  <span className="text-slate-800 dark:text-white">{viewingAppDetail.nationality || 'سعودي'} - {viewingAppDetail.address || 'مكة المكرمة'}</span>
                </div>
              </div>

              {viewingAppDetail.opportunityTitle && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold block text-[11px]">الفرصة المتقدم عليها:</span>
                  <strong className="text-emerald-900 dark:text-emerald-100 block text-xs mt-0.5">{viewingAppDetail.opportunityTitle}</strong>
                  {viewingAppDetail.opportunityCode && (
                    <span className="text-slate-400 font-mono text-[10px] block mt-0.5">كود الفرصة: #{viewingAppDetail.opportunityCode}</span>
                  )}
                </div>
              )}

              {viewingAppDetail.experiences && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700/30">
                  <span className="text-slate-400 text-[10px] block mb-1">الخبرات والمهارات السابقة:</span>
                  <p className="text-slate-700 dark:text-slate-200 leading-relaxed">{viewingAppDetail.experiences}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingAppDetail(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white"
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
