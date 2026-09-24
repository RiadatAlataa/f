import React, { useState } from "react";
import { 
  Award, Calendar, Clock, Inbox, ShieldCheck, Heart, ArrowLeft, ArrowUpRight, 
  CheckCircle, Smartphone, User, FileText, Bot, LogOut, CheckCircle2, MapPin, Send, HelpCircle, Star, BadgeAlert, Trophy, Lock, LockOpen, Globe
} from "lucide-react";
import { SmartCard } from "./SmartCard";
import { VolunteerProfileCardSection } from "./VolunteerProfileCardSection";
import { AiChatAssistant } from "./AiChatAssistant";
import { CertificateViewer } from "./CertificateViewer";
import { VolunteerLeaderboard } from "./VolunteerLeaderboard";
import { InitiativeRatingModal } from "./InitiativeRatingModal";
import { VolunteerMonthlyReportModal } from "./VolunteerMonthlyReportModal";
import { VolunteerKnightsModal } from "./VolunteerKnights";
import { Volunteer, Initiative, JoinRequest, AttendanceRecord, Evaluation, Department, VolunteerTeam, IssuedCertificate, CertificateTemplate, InitiativeRating } from "../types";

interface VolunteerDashboardProps {
  currentVolunteer: Volunteer;
  volunteers: Volunteer[];
  departments: Department[];
  teams: VolunteerTeam[];
  initiatives: Initiative[];
  requests: JoinRequest[];
  attendanceRecords: AttendanceRecord[];
  evaluations: Evaluation[];
  issuedCertificates?: IssuedCertificate[];
  certificateTemplates?: CertificateTemplate[];
  initiativeRatings?: InitiativeRating[];
  onApplyInitiative: (initiativeId: string) => void;
  onReissueCard: (id: string) => void;
  onCheckoutInitiative?: (initiativeId: string, volunteerId: string) => void;
  onSubmitRating?: (payload: any) => Promise<boolean>;
}

export const VolunteerDashboard: React.FC<VolunteerDashboardProps> = ({
  currentVolunteer,
  volunteers,
  departments,
  teams,
  initiatives,
  requests,
  attendanceRecords,
  evaluations,
  issuedCertificates = [],
  certificateTemplates = [],
  initiativeRatings = [],
  onApplyInitiative,
  onReissueCard,
  onCheckoutInitiative,
  onSubmitRating
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'certificates' | 'leaderboard' | 'initiatives' | 'notifications' | 'assistant' | 'profile'>(() => {
    try {
      const saved = localStorage.getItem('reyadat_volunteer_tab');
      if (saved) return saved as any;
    } catch {}
    return 'home';
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('reyadat_volunteer_tab', activeTab);
    } catch {}
  }, [activeTab]);

  const [showKnightsModal, setShowKnightsModal] = useState(false);
  const [cardDisplayMode, setCardDisplayMode] = useState<'official' | 'smart'>('official');
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);

  // Modal View States
  const [viewingCertificate, setViewingCertificate] = useState<IssuedCertificate | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{ initiative: { id?: string; name: string }; certificate?: IssuedCertificate } | null>(null);

  // Find current volunteer's team and department
  const myTeam = teams.find(t => t.id === currentVolunteer.teamId);
  const myDept = departments.find(d => d.id === currentVolunteer.departmentId);

  // My requests
  const myRequests = requests.filter(r => r.volunteerId === currentVolunteer.id);

  // My attendance logs
  const myAttendance = attendanceRecords.filter(a => a.volunteerId === currentVolunteer.id);

  // My issued certificates
  const myCertificates = issuedCertificates.filter(c => c.volunteerId === currentVolunteer.id);

  // Check if there are locked certificates that require rating
  const lockedCertificates = myCertificates.filter(c => c.status === 'locked_unrated');

  // My performance evaluations
  const myEvals = evaluations.filter(e => e.volunteerId === currentVolunteer.id);

  // My team leader broadcasts
  const myBroadcasts = myTeam ? myTeam.broadcasts || [] : [];

  // Rank calculations
  const sortedVolunteersAll = [...volunteers].sort((a, b) => b.points - a.points);
  const associationRank = sortedVolunteersAll.findIndex(v => v.id === currentVolunteer.id) + 1;
  
  const teamVolunteers = volunteers.filter(v => v.teamId === currentVolunteer.teamId);
  const sortedVolunteersTeam = [...teamVolunteers].sort((a, b) => b.points - a.points);
  const teamRank = sortedVolunteersTeam.findIndex(v => v.id === currentVolunteer.id) + 1;

  // Find active checked-in initiative (present in attendance with NO checkoutTimestamp)
  const activeCheckinRecord = attendanceRecords.find(
    a => a.volunteerId === currentVolunteer.id && !a.checkoutTimestamp
  );
  const activeCheckinInitiative = activeCheckinRecord 
    ? initiatives.find(i => i.id === activeCheckinRecord.initiativeId)
    : null;

  const handleApply = (id: string) => {
    onApplyInitiative(id);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 4000);
  };

  const handleSelfCheckout = async () => {
    if (!activeCheckinRecord || !onCheckoutInitiative) return;
    setCheckoutLoading(true);
    try {
      await onCheckoutInitiative(activeCheckinRecord.initiativeId, currentVolunteer.id);
      setCheckoutSuccess(true);
      setTimeout(() => setCheckoutSuccess(false), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome Card */}
      <div className="bg-linear-to-r from-emerald-600 to-emerald-700 p-6 rounded-2xl text-white text-right shadow-md relative overflow-hidden" dir="rtl">
        <div className="absolute left-0 bottom-0 top-0 w-1/3 bg-white/5 -skew-x-12 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img 
              src={currentVolunteer.photo} 
              alt={currentVolunteer.name} 
              className="w-14 h-14 rounded-full object-cover border-2 border-white/20 shadow-md"
              referrerPolicy="no-referrer"
            />
            <div className="space-y-1">
              <span className="bg-white/15 text-[9.5px] px-2.5 py-0.5 rounded-full font-bold inline-block border border-white/5">المتطوع الفاعل</span>
              <h2 className="text-md font-black">{currentVolunteer.name}</h2>
              <p className="text-xs text-emerald-100">رقم العضوية: <b>{currentVolunteer.membershipNumber}</b> • {myTeam ? myTeam.nameAr : "بانتظار التعيين"}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="text-center bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/10">
              <strong className="text-sm font-black block font-mono">{currentVolunteer.points}</strong>
              <span className="text-[9px] text-emerald-100 font-medium block">النقاط التطوعية</span>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/10">
              <strong className="text-sm font-black block font-mono">
                {currentVolunteer.points >= 150 ? 'ذهبي' : currentVolunteer.points >= 80 ? 'فضي' : 'برونزي'}
              </strong>
              <span className="text-[9px] text-emerald-100 font-medium block">تصنيف العضوية</span>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/10">
              <strong className="text-sm font-black block font-mono">#{associationRank}</strong>
              <span className="text-[9px] text-emerald-100 font-medium block">ترتيب الجمعية</span>
            </div>
            
            {/* Quick Export Monthly Achievement Report Button */}
            <button
              onClick={() => setShowMonthlyReportModal(true)}
              className="bg-white hover:bg-emerald-50 text-emerald-800 font-black text-xs px-3.5 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="تصدير تقرير الإنجاز الشهري وساعات التطوع المعتمدة إلى PDF"
            >
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>تقرير الإنجاز الشهري (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-neutral-100 gap-1 overflow-x-auto whitespace-nowrap pb-1" dir="rtl">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${activeTab === 'home' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>
        <button
          onClick={() => setShowMonthlyReportModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 border-transparent text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/80 rounded-t-xl"
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>تصدير تقرير الإنجاز (PDF)</span>
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${activeTab === 'certificates' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Award className="w-4 h-4 text-emerald-600" />
          <span>خزينة الشهادات ({myCertificates.length})</span>
          {lockedCertificates.length > 0 && (
            <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold animate-pulse">
              {lockedCertificates.length} معلقة
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${activeTab === 'leaderboard' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>صدارة المتطوعين</span>
        </button>
        <button
          onClick={() => setActiveTab('initiatives')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${activeTab === 'initiatives' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Calendar className="w-4 h-4" />
          <span>مبادراتي</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${activeTab === 'notifications' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Inbox className="w-4 h-4" />
          <span>الإشعارات ({myBroadcasts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${activeTab === 'assistant' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <Bot className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>المساعد الذكي</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${activeTab === 'profile' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
        >
          <User className="w-4 h-4" />
          <span>حسابي</span>
        </button>
      </div>

      {/* Main Tab content frame */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-2xs text-right" dir="rtl">
        
        {/* 1. HOME VIEW */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            
            {/* Mandatory Rating Warning Banner if certificates are locked */}
            {lockedCertificates.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black">
                    <Lock className="w-5 h-5 text-amber-100" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black">لديك ({lockedCertificates.length}) شهادة تطوع معلقة تنتظر تقييمك!</h4>
                    <p className="text-[11px] text-amber-100">قم بتقييم الفعالية التطوعية لفتح قفل الشهادة واستلامها فوراً بمحفظتك.</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const cert = lockedCertificates[0];
                    setRatingTarget({
                      initiative: { id: cert.initiativeId, name: cert.initiativeName },
                      certificate: cert
                    });
                  }}
                  className="bg-white text-amber-900 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-sm hover:bg-amber-50 cursor-pointer shrink-0"
                >
                  تقييم المبادرة واستلام الشهادة الآن ⭐
                </button>
              </div>
            )}
            
            {/* Active Checkout Notification Banner */}
            {activeCheckinInitiative && (
              <div className="bg-linear-to-br from-amber-50 to-amber-100/40 border border-amber-200 p-5 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-500/10 text-amber-700 rounded-full flex items-center justify-center shrink-0">
                    <BadgeAlert className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-950">أنت مسجل حضور ميداني نشط حالياً!</h4>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      أنت متواجد حالياً بمبادرة: <strong>{activeCheckinInitiative.name}</strong> ({activeCheckinInitiative.place}). يرجى تأكيد انصرافك عند مغادرة الموقع لتوثيق الساعات بدقة.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSelfCheckout}
                    disabled={checkoutLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:bg-neutral-300"
                  >
                    {checkoutLoading ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>جاري تسجيل انصرافك...</span>
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4" />
                        <span>تم الانصراف من المبادرة</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {checkoutSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>تم تسجيل انصرافك بنجاح وحساب مدة العمل الميداني! شكراً لعطائك المتميز اليوم. ✓</span>
              </div>
            )}

            {/* Smart Digital Membership Card and Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Digital Card column */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center py-2 space-y-3">
                <div className="text-center space-y-2 mb-2 w-full">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black text-neutral-800 text-right">بطاقة العضوية المعتمدة</h3>
                      <p className="text-[10.5px] text-neutral-500 text-right">بطاقة التطوع الرسمية بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
                    </div>
                    {/* View Switcher */}
                    <div className="bg-neutral-100 p-0.5 rounded-xl flex items-center border border-neutral-200 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCardDisplayMode('official')}
                        className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                          cardDisplayMode === 'official' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        بطاقة الفريق
                      </button>
                      <button
                        type="button"
                        onClick={() => setCardDisplayMode('smart')}
                        className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                          cardDisplayMode === 'smart' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-neutral-500 hover:text-neutral-900'
                        }`}
                      >
                        النمط الذكي
                      </button>
                    </div>
                  </div>
                </div>

                {cardDisplayMode === 'official' ? (
                  <VolunteerProfileCardSection
                    volunteer={currentVolunteer}
                    teams={teams}
                    departments={departments}
                    title="بطاقة المتطوع الرسمية"
                    onReissue={() => onReissueCard(currentVolunteer.id)}
                  />
                ) : (
                  <SmartCard 
                    volunteer={currentVolunteer}
                    departments={departments}
                    teams={teams}
                    onReissue={onReissueCard}
                  />
                )}
              </div>

              {/* Quick Stats overview & Guidelines */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-neutral-50/50 p-5 rounded-2xl border border-neutral-100 space-y-4">
                  <h4 className="text-xs font-black text-neutral-800 pb-2 border-b border-neutral-100">مؤشرات الأداء وصحيفة التقييم:</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border border-neutral-100 space-y-1">
                      <span className="text-[10px] text-neutral-400 font-bold block">مجموع المشاركات</span>
                      <strong className="text-sm font-bold text-neutral-800 font-mono">{myAttendance.length} مبادرات</strong>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-neutral-100 space-y-1">
                      <span className="text-[10px] text-neutral-400 font-bold block">متوسط تقييم القادة</span>
                      <strong className="text-sm font-bold text-amber-600 font-mono">
                        ★ {myEvals.length > 0 
                          ? (myEvals.reduce((acc, ev) => acc + ((ev.commitment + ev.ethics + ev.cooperation + ev.discipline + ev.interaction) / 5), 0) / myEvals.length).toFixed(1)
                          : "5.0"}
                      </strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-neutral-500 leading-relaxed bg-emerald-50/30 p-3 rounded-xl border border-emerald-100/30">
                    💡 <strong>قاعدة النقاط:</strong> الحضور الكامل يمنحك <b>+3 نقاط</b>، والالتزام بالزي الرسمي والسديري يمنحك <b>+2 نقاط إضافية</b> تلقائياً! بينما الغياب بدون عذر يخصم <b>-2 نقاط</b> من صحيفتك.
                  </div>
                </div>

                {/* Print guidelines */}
                <div className="border border-neutral-150 p-4 rounded-xl bg-neutral-50/30 text-xs space-y-2">
                  <h4 className="font-black text-neutral-700">دليل استخدام البطاقة في الميدان:</h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    1. احتفظ بنسخة من بطاقتك على جوالك أو قم بطباعتها لتسهيل الفحص الميداني بواسطة قائد فريقك.<br />
                    2. يرجى توجيه الباركود أو الـ QR الخاص بالبطاقة نحو ماسح قائد الفريق لتسجيل الحضور المباشر.<br />
                    3. يمكنك تسجيل انصرافك ذاتياً من خلال زر "تم الانصراف" المتوفر بالرئيسية عند انتهاء فترة المبادرة.
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. CERTIFICATES TREASURY TAB (خزينة الشهادات) */}
        {activeTab === 'certificates' && (
          <div className="space-y-6">
            <div className="border-b border-neutral-100 pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div>
                <h3 className="text-xs font-black text-neutral-800 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <span>خزينة الشهادات الرقمية الموثقة</span>
                </h3>
                <p className="text-[11px] text-neutral-500">أرشيف الشهادات المعتمدة من جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
              </div>

              <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-200">
                مجموع الساعات المعتمدة: <b>{currentVolunteer.volunteerHours || (myAttendance.length * 4)} ساعة</b>
              </div>
            </div>

            {myCertificates.length === 0 ? (
              <div className="text-center p-12 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-3">
                <Award className="w-12 h-12 text-neutral-300 mx-auto" />
                <h4 className="text-xs font-black text-neutral-600">لا توجد شهادات صادرة حالياً في خزينتك</h4>
                <p className="text-[11px] text-neutral-400 max-w-md mx-auto">
                  بمجرد إتمامك للمبادرات التطوعية وتأكيد حضورك من قِبل قائد الفريق، ستصدر لك إدارة التطوع الشهادات المعتمدة هنا.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCertificates.map(cert => {
                  const isLocked = cert.status === 'locked_unrated';
                  return (
                    <div
                      key={cert.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 flex flex-col justify-between ${
                        isLocked
                          ? 'bg-amber-50/50 border-amber-200 hover:border-amber-400'
                          : 'bg-white border-emerald-150 hover:border-emerald-400 shadow-2xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {cert.certificateCode}
                          </span>
                          {isLocked ? (
                            <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3" /> معلقة 🔒
                            </span>
                          ) : (
                            <span className="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                              <LockOpen className="w-3 h-3" /> جاهزة للتحميل ✓
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-black text-neutral-800 leading-snug">{cert.initiativeName}</h4>

                        <div className="text-[10.5px] text-neutral-500 space-y-1 font-medium">
                          <div>⏱️ عدد الساعات: <strong className="text-emerald-700 font-mono">{cert.hours} ساعات</strong></div>
                          <div>📅 تاريخ الإصدار: <strong className="text-neutral-700 font-mono">{cert.issueDate}</strong></div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-100">
                        {isLocked ? (
                          <button
                            onClick={() => setRatingTarget({
                              initiative: { id: cert.initiativeId, name: cert.initiativeName },
                              certificate: cert
                            })}
                            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Star className="w-4 h-4 fill-amber-200" />
                            <span>تقييم المبادرة واستلام الشهادة</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setViewingCertificate(cert)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Award className="w-4 h-4" />
                            <span>عرض وتحميل الشهادة الرقمية</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. LEADERBOARD TAB (صدارة المتطوعين) */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-linear-to-r from-emerald-800 to-emerald-950 p-4 rounded-2xl text-white shadow-md">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-300" />
                  <h4 className="text-sm font-black text-amber-200">لوحة فرسان التطوع والفرق المتصدرة</h4>
                </div>
                <p className="text-xs text-emerald-100/80">عرض الرتب والأوسمة التكريمية، وفرسان الميدان، وترتيب الفرق التطوعية</p>
              </div>
              <button
                onClick={() => setShowKnightsModal(true)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-black text-xs px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                عرض لوحة الفرسان الكاملة 🏆
              </button>
            </div>

            <VolunteerLeaderboard
              volunteers={volunteers}
              teams={teams}
              departments={departments}
              attendanceRecords={attendanceRecords}
            />

            {showKnightsModal && (
              <VolunteerKnightsModal
                volunteers={volunteers}
                teams={teams}
                initiatives={initiatives}
                onClose={() => setShowKnightsModal(false)}
              />
            )}
          </div>
        )}

        {/* 4. INITIATIVES & REQUESTS VIEW */}
        {activeTab === 'initiatives' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">الفرص والمبادرات التطوعية النشطة</h3>
              <p className="text-[11px] text-neutral-500">تفقد المبادرات التشغيلية المتاحة وقدم طلبات انضمام للمساهمة الميدانية</p>
            </div>

            {appliedSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle className="w-5 h-5 text-emerald-600 animate-bounce" />
                <span>تم تسجيل وإرسال طلب الانضمام للمبادرة بنجاح! سيتم مراجعته وتأكيده بواسطة قائد الفريق. ✓</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {initiatives.filter(i => i.registrationStatus === 'open').map(i => {
                const dep = departments.find(d => d.id === i.departmentId);
                const team = teams.find(t => t.id === i.teamId);
                const hasApplied = myRequests.some(r => r.initiativeId === i.id);
                return (
                  <div key={i.id} className="border border-neutral-100 p-4 rounded-xl flex flex-col justify-between hover:border-emerald-500 transition-all bg-neutral-50/20">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <strong className="text-xs text-neutral-800 block">{i.name}</strong>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">مفتوح</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 leading-relaxed line-clamp-3">{i.description}</p>
                      
                      <div className="text-[10px] text-neutral-500 space-y-1 pt-2 font-medium">
                        <div>📍 الموقع: <strong className="text-neutral-700">{i.place}</strong></div>
                        <div>📅 التاريخ والوقت: <strong className="text-neutral-700">{i.date} ({i.startTime} - {i.endTime})</strong></div>
                        <div>👥 الفريق والمسؤول: <strong className="text-emerald-700">{team ? team.nameAr : "مستقل"}</strong></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-between items-center mt-4 pt-3 border-t border-neutral-100">
                      {i.nationalPlatformUrl ? (
                        <a
                          href={i.nationalPlatformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                        >
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>المنصة الوطنية للتطوع</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      ) : <div />}

                      <button
                        onClick={() => handleApply(i.id)}
                        disabled={hasApplied}
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                          hasApplied 
                            ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {hasApplied ? "تم إرسال الطلب مسبقاً" : "انضمام إلى المبادرة"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Joined Initiatives and status monitor */}
            <div className="border-t border-neutral-150 pt-6 space-y-3">
              <div>
                <h4 className="text-xs font-black text-neutral-800">حالة طلباتك المقدمة وسجل مشاركاتك</h4>
                <p className="text-[10.5px] text-neutral-400">تابع قرارات القبول والمراجعة الصادرة من قادة الفرق للجمعية</p>
              </div>

              {myRequests.length > 0 ? (
                <div className="space-y-3">
                  {myRequests.map(r => {
                    const targetInit = initiatives.find(i => i.id === r.initiativeId);
                    const hasAttended = attendanceRecords.some(a => a.initiativeId === r.initiativeId && a.volunteerId === currentVolunteer.id && (a.status === 'full' || a.status === 'late'));
                    const alreadyRated = (initiativeRatings || []).some(rt => rt.initiativeId === r.initiativeId && rt.volunteerId === currentVolunteer.id);

                    return (
                      <div key={r.id} className="border border-neutral-100 p-4 rounded-xl flex items-center justify-between bg-neutral-50/10 flex-wrap gap-2">
                        <div>
                          <strong className="text-xs text-neutral-800 block">{r.initiativeName}</strong>
                          <span className="text-[10px] text-neutral-400 block mt-1">تاريخ الطلب: {r.date || r.requestDate}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {hasAttended && (
                            alreadyRated ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                ✓ تم تقييم المبادرة
                              </span>
                            ) : (
                              <button
                                onClick={() => setRatingTarget({ initiative: { id: targetInit?.id || r.initiativeId, name: targetInit?.name || r.initiativeName } })}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <span>⭐ تقييم المبادرة (+3 نقاط)</span>
                              </button>
                            )
                          )}

                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            r.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                            r.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                            r.status === 'waitlist' ? 'bg-amber-100 text-amber-800' : 'bg-neutral-100 text-neutral-600'
                          }`}>
                            {r.status === 'accepted' ? 'تم القبول والاعتماد' :
                             r.status === 'rejected' ? 'مرفوض من القائد' :
                             r.status === 'waitlist' ? 'قائمة الاحتياط' : 'قيد المراجعة والانتظار'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-neutral-400 text-xs">لم تقم بالتقدم لأي مبادرة تطوعية مسبقاً.</div>
              )}
            </div>
          </div>
        )}

        {/* 3. BROADCASTS & NOTIFICATIONS VIEW */}
        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">صندوق الإشعارات والتعاميم الميدانية</h3>
              <p className="text-[11px] text-neutral-500">التوجيهات والرسائل العاجلة الصادرة من قائد فريقك لتنظيم الميدان</p>
            </div>

            {myBroadcasts.length > 0 ? (
              <div className="space-y-3">
                {myBroadcasts.map((bc: any, idx: number) => (
                  <div key={idx} className="border border-emerald-100 p-4 rounded-xl bg-emerald-50/25 space-y-2 text-right">
                    <div className="flex justify-between items-center border-b border-emerald-100/50 pb-2">
                      <span className="font-black text-emerald-950 text-xs flex items-center gap-1">
                        📢 تعميم من قائد الفريق:
                      </span>
                      <span className="text-[10px] text-emerald-700/70 font-mono font-bold">
                        {bc.timestamp ? new Date(bc.timestamp).toLocaleDateString("ar-SA") : "اليوم"}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-800 leading-relaxed whitespace-pre-wrap">{bc.message || bc}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-neutral-400 text-xs">صندوق الوارد فارغ. لم يتم بث تعاميم جماعية لفريقك مؤخراً.</div>
            )}
          </div>
        )}

        {/* 4. SMART AI ASSISTANT VIEW */}
        {activeTab === 'assistant' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">المستشار الذكي للمتطوعين</h3>
              <p className="text-[11px] text-neutral-500">تحدث مع مستشار الذكاء الاصطناعي للاستفسار عن لوائح التطوع، صياغة تقارير، أو اقتراح أفكار مبادرات.</p>
            </div>

            <AiChatAssistant onSendMessage={async (prompt, history) => {
              const res = await fetch("/api/ai/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, history })
              });
              if (!res.ok) throw new Error("AI Endpoint returned error");
              return await res.json();
            }} />
          </div>
        )}

        {/* 5. PROFILE & ACCOUNT SETTINGS */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-black text-neutral-800 uppercase tracking-wider">الملف الشخصي والبيانات الرسمية</h3>
              <p className="text-[11px] text-neutral-500">تفاصيل حسابك المعتمد بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة وتاريخ الحضور والالتزام</p>
            </div>

            {/* بطاقة المتطوع داخل ملف المتطوع (Requirements 14, 15, 16) */}
            <VolunteerProfileCardSection 
              volunteer={currentVolunteer}
              teams={teams}
              departments={departments}
              title="قسم: بطاقة المتطوع الرسمية"
              onReissue={() => onReissueCard(currentVolunteer.id)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Profile details */}
              <div className="bg-neutral-50/50 p-5 rounded-xl border border-neutral-100 space-y-3">
                <h4 className="text-xs font-black text-neutral-800 border-b border-neutral-150 pb-2">تفاصيل الحساب:</h4>
                <div className="space-y-2 text-xs font-medium text-neutral-600">
                  <div className="flex justify-between">
                    <span>الاسم الكامل:</span>
                    <strong className="text-neutral-900">{currentVolunteer.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>رقم الجوال:</span>
                    <strong className="text-neutral-900 font-mono">{currentVolunteer.phone}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>البريد الإلكتروني:</span>
                    <strong className="text-neutral-900 font-mono">{currentVolunteer.email}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>اللقب التطوعي:</span>
                    <strong className="text-neutral-900">{currentVolunteer.titleAr}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>الإدارية التابعة:</span>
                    <strong className="text-emerald-700">{myDept ? myDept.nameAr : "غير معينة"}</strong>
                  </div>
                </div>
              </div>

              {/* Attendance and points summary */}
              <div className="bg-neutral-50/50 p-5 rounded-xl border border-neutral-100 space-y-3">
                <h4 className="text-xs font-black text-neutral-800 border-b border-neutral-150 pb-2">سجل الحضور والغياب:</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {myAttendance.length > 0 ? (
                    myAttendance.map((a, idx) => {
                      const init = initiatives.find(i => i.id === a.initiativeId);
                      return (
                        <div key={idx} className="bg-white p-2 rounded-lg border border-neutral-100 text-[10.5px] flex justify-between items-center">
                          <div>
                            <span className="font-bold text-neutral-800 block">{init ? init.name : "مبادرة تطوعية"}</span>
                            <span className="text-[9.5px] text-neutral-400 block font-mono">{a.date}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-sm font-bold text-[8.5px] ${
                            a.status === 'full' ? 'bg-emerald-100 text-emerald-800' :
                            a.status === 'late' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {a.status === 'full' ? 'حضور كامل' :
                             a.status === 'late' ? 'حضور متأخر' :
                             a.status === 'excused' ? 'عذر مقبول' : 'غياب بدون عذر'}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-neutral-400 text-[11px]">لم تسجل حضور في أي مبادرة بعد.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Viewing Certificate Modal */}
      {viewingCertificate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-4">
            <CertificateViewer certificate={viewingCertificate} onClose={() => setViewingCertificate(null)} />
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingTarget && onSubmitRating && (
        <InitiativeRatingModal
          initiative={ratingTarget.initiative}
          certificate={ratingTarget.certificate}
          volunteerId={currentVolunteer.id}
          volunteerName={currentVolunteer.name}
          onSubmitRating={onSubmitRating}
          onClose={() => setRatingTarget(null)}
        />
      )}

      {/* Monthly Achievement Report Export Modal */}
      {showMonthlyReportModal && (
        <VolunteerMonthlyReportModal
          isOpen={showMonthlyReportModal}
          onClose={() => setShowMonthlyReportModal(false)}
          volunteer={currentVolunteer}
          initiatives={initiatives}
          attendanceRecords={attendanceRecords}
          evaluations={evaluations}
          teams={teams}
          departments={departments}
        />
      )}

    </div>
  );
};
