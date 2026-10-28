import React, { useState, useEffect } from "react";
import { 
  Award, Calendar, Clock, Inbox, ShieldCheck, Heart, ArrowLeft, ArrowUpRight, ArrowRight,
  CheckCircle, Smartphone, User, FileText, Bot, LogOut, CheckCircle2, MapPin, Send, HelpCircle, 
  Star, BadgeAlert, Trophy, Lock, LockOpen, Globe, Camera, Edit3, AlertCircle, Sparkles, 
  RefreshCw, Share2, Users, Flame, Medal, Eye, ChevronLeft, Check, Trash2
} from "lucide-react";
import { SmartCard } from "./SmartCard";
import { VolunteerProfileCardSection } from "./VolunteerProfileCardSection";
import { CardRenderer } from "./CardRenderer";
import { ProfilePhotoCropModal } from "./ProfilePhotoCropModal";
import { AiChatAssistant } from "./AiChatAssistant";
import { CertificateViewer } from "./CertificateViewer";
import { VolunteerLeaderboard } from "./VolunteerLeaderboard";
import { InitiativeRatingModal } from "./InitiativeRatingModal";
import { VolunteerMonthlyReportModal } from "./VolunteerMonthlyReportModal";
import { VolunteerKnightsModal } from "./VolunteerKnights";
import { TeamSupportManager } from "./TeamSupportManager";
import { Volunteer, Initiative, JoinRequest, AttendanceRecord, Evaluation, Department, VolunteerTeam, IssuedCertificate, CertificateTemplate, InitiativeRating, VolunteerCardTemplate } from "../types";

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
  onBackToHome?: () => void;
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
  onSubmitRating,
  onBackToHome
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'certificates' | 'leaderboard' | 'initiatives' | 'notifications' | 'assistant' | 'profile' | 'support'>(() => {
    try {
      const saved = localStorage.getItem('reyadat_volunteer_tab');
      if (saved) return saved as any;
    } catch {}
    return 'home';
  });

  // Local synced volunteer state to allow immediate UI reflection of profile updates
  const [volunteerState, setVolunteerState] = useState<Volunteer>(currentVolunteer);
  useEffect(() => {
    setVolunteerState(currentVolunteer);
  }, [currentVolunteer]);

  // WhatsApp Profile Photo Cropper Modal State
  const [showProfileCropModal, setShowProfileCropModal] = useState(false);

  // Official Data Change Request Modal State
  const [showDataChangeModal, setShowDataChangeModal] = useState(false);
  const [changeRequestField, setChangeRequestField] = useState<string>("name");
  const [changeRequestNewValue, setChangeRequestNewValue] = useState<string>("");
  const [changeRequestReason, setChangeRequestReason] = useState<string>("");
  const [changeRequestSubmitting, setChangeRequestSubmitting] = useState(false);
  const [changeRequestSuccess, setChangeRequestSuccess] = useState<string | null>(null);
  const [changeRequestError, setChangeRequestError] = useState<string | null>(null);

  // Editable Profile Fields State
  const [editPhone, setEditPhone] = useState(volunteerState.phone || "");
  const [editEmail, setEditEmail] = useState(volunteerState.email || "");
  const [editCity, setEditCity] = useState(volunteerState.city || "مكة المكرمة");
  const [editDistrict, setEditDistrict] = useState(volunteerState.district || "العسيلة");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveFeedback, setProfileSaveFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Card Template for 3D flip renderer
  const [cardTemplate, setCardTemplate] = useState<VolunteerCardTemplate | null>(null);
  useEffect(() => {
    let isMounted = true;
    const loadTemplate = async () => {
      try {
        if (volunteerState.teamId) {
          const teamRes = await fetch(`/api/db/team-card-template/${volunteerState.teamId}`);
          if (teamRes.ok) {
            const teamData = await teamRes.json();
            if (isMounted && teamData?.template) {
              setCardTemplate(teamData.template);
              return;
            }
          }
        }
        const res = await fetch("/api/db/card-templates");
        if (res.ok) {
          const data = await res.json();
          const activeTpl = data?.templates?.find((t: any) => t.status === "active") || data?.templates?.[0];
          if (isMounted && activeTpl) {
            setCardTemplate(activeTpl);
          }
        }
      } catch (e) {
        console.warn("Could not load card template:", e);
      }
    };
    loadTemplate();
    return () => { isMounted = false; };
  }, [volunteerState.teamId]);

  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetTokenInput, setResetTokenInput] = useState(volunteerState.passwordResetToken || '');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    try {
      localStorage.setItem('reyadat_volunteer_tab', activeTab);
    } catch {}
  }, [activeTab]);

  const [showKnightsModal, setShowKnightsModal] = useState(false);
  const [cardDisplayMode, setCardDisplayMode] = useState<'3d' | 'smart'>('3d');
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState(false);

  // Modal View States
  const [viewingCertificate, setViewingCertificate] = useState<IssuedCertificate | null>(null);
  const [ratingTarget, setRatingTarget] = useState<{ initiative: { id?: string; name: string }; certificate?: IssuedCertificate } | null>(null);

  // Find current volunteer's team and department
  const myTeam = teams.find(t => t.id === volunteerState.teamId);
  const myDept = departments.find(d => d.id === volunteerState.departmentId);

  // My requests
  const myRequests = requests.filter(r => r.volunteerId === volunteerState.id);

  // My attendance logs
  const myAttendance = attendanceRecords.filter(a => a.volunteerId === volunteerState.id);
  const validAttendanceCount = myAttendance.filter(a => a.status === 'full' || (a.status as any) === 'present' || a.status === 'late').length;

  // Monthly points calculation (attendance during current month)
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const thisMonthAttendance = myAttendance.filter(a => (a.date || "").startsWith(currentMonthStr));
  const currentMonthPoints = Number(volunteerState.monthlyPoints) || (thisMonthAttendance.length * 3);

  // My issued certificates
  const myCertificates = issuedCertificates.filter(c => c.volunteerId === volunteerState.id);

  // Check if there are locked certificates that require rating
  const lockedCertificates = myCertificates.filter(c => c.status === 'locked_unrated');

  // My performance evaluations
  const myEvals = evaluations.filter(e => e.volunteerId === volunteerState.id);

  // My team leader broadcasts
  const myBroadcasts = myTeam ? myTeam.broadcasts || [] : [];

  // Rank calculations
  const sortedVolunteersAll = [...volunteers].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
  const associationRank = sortedVolunteersAll.findIndex(v => v.id === volunteerState.id) + 1;
  
  const teamVolunteers = volunteers.filter(v => v.teamId === volunteerState.teamId);
  const sortedVolunteersTeam = [...teamVolunteers].sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0));
  const teamRank = sortedVolunteersTeam.findIndex(v => v.id === volunteerState.id) + 1;

  // Team Leaderboard calculation
  const teamScores = teams.map(t => {
    const tMembers = volunteers.filter(v => v.teamId === t.id);
    const totalPts = tMembers.reduce((acc, m) => acc + (Number(m.points) || 0), 0);
    return { id: t.id, nameAr: t.nameAr, totalPts, membersCount: tMembers.length };
  }).sort((a, b) => b.totalPts - a.totalPts);
  const teamLeaderboardPos = teamScores.findIndex(t => t.id === volunteerState.teamId) + 1;

  // Find active checked-in initiative (present in attendance with NO checkoutTimestamp)
  const activeCheckinRecord = attendanceRecords.find(
    a => a.volunteerId === volunteerState.id && !a.checkoutTimestamp
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
      await onCheckoutInitiative(activeCheckinRecord.initiativeId, volunteerState.id);
      setCheckoutSuccess(true);
      setTimeout(() => setCheckoutSuccess(false), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Safe personal info save handler
  const handleSavePersonalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSaveFeedback(null);
    try {
      const res = await fetch("/api/db/volunteers/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerId: volunteerState.id,
          phone: editPhone.trim(),
          email: editEmail.trim(),
          city: editCity.trim(),
          district: editDistrict.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setVolunteerState(data.volunteer);
        setProfileSaveFeedback({ type: 'success', text: 'تم تحديث بيانات التواصل الخاصة بك بنجاح ومزامنتها مع النظام!' });
        setTimeout(() => setProfileSaveFeedback(null), 4000);
      } else {
        setProfileSaveFeedback({ type: 'error', text: data.error || 'حدث خطأ أثناء حفظ التعديلات.' });
      }
    } catch (err: any) {
      setProfileSaveFeedback({ type: 'error', text: 'تعذر الاتصال بالخادم لحفظ التعديلات.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Official locked data change request submission
  const handleSubmitDataChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeRequestNewValue.trim()) return;
    setChangeRequestSubmitting(true);
    setChangeRequestError(null);
    setChangeRequestSuccess(null);
    try {
      const res = await fetch("/api/db/volunteers/request-data-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          volunteerId: volunteerState.id,
          fieldName: changeRequestField,
          requestedValue: changeRequestNewValue.trim(),
          reason: changeRequestReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setChangeRequestSuccess("تم رفع طلب تعديل البيانات الرسمية إلى إدارة الموارد البشرية والعمليات للمراجعة والاعتماد.");
        setTimeout(() => {
          setShowDataChangeModal(false);
          setChangeRequestSuccess(null);
          setChangeRequestNewValue("");
          setChangeRequestReason("");
        }, 2500);
      } else {
        setChangeRequestError(data.error || "فشل إرسال طلب التعديل.");
      }
    } catch (err: any) {
      setChangeRequestError("تعذر الاتصال بالخادم لإرسال الطلب.");
    } finally {
      setChangeRequestSubmitting(false);
    }
  };

  // WhatsApp-style Profile Photo display helper
  const displayAvatarUrl = volunteerState.profileImage || volunteerState.profile_image || volunteerState.photo;

  return (
    <div className="space-y-6">
      {/* Top Welcome Card - Official Brand Theme: Navy Blue (#071C43) to Royal Blue (#0754C7) */}
      <div 
        style={{
          background: "linear-gradient(135deg, #071C43 0%, #0B2C6E 50%, #0754C7 100%)"
        }}
        className="p-6 sm:p-7 rounded-3xl text-white text-right shadow-xl relative overflow-hidden border border-blue-900/50" 
        dir="rtl"
      >
        <div className="absolute left-0 bottom-0 top-0 w-1/3 bg-white/5 -skew-x-12 pointer-events-none" />
        <div className="absolute -top-16 -left-16 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4 sm:gap-5">
            {/* WhatsApp-Style Circular Avatar with Camera Icon Overlay */}
            <div className="relative group cursor-pointer" onClick={() => setShowProfileCropModal(true)}>
              <img 
                src={displayAvatarUrl} 
                alt={volunteerState.name} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-3 border-white/30 shadow-lg group-hover:brightness-90 transition-all"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                className="absolute bottom-0 -right-1 bg-[#0754C7] hover:bg-blue-600 text-white p-1.5 rounded-full shadow-md border-2 border-white transition-all transform group-hover:scale-110 cursor-pointer"
                title="تحديث صورة الحساب الشخصي (واتساب)"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 text-[10px] px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{volunteerState.status === 'inactive' ? 'غير نشط' : 'متطوع نشط وفاعل'}</span>
                </span>
                <span className="bg-white/15 text-blue-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {myTeam ? myTeam.nameAr : "بانتظار التعيين"}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white">{volunteerState.name}</h2>
              
              <p className="text-xs text-blue-100/90 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>رقم العضوية: <strong className="font-mono text-white">{volunteerState.membershipNumber}</strong></span>
                <span>•</span>
                <span>رقم الملف: <strong className="font-mono text-white bg-white/20 px-2 py-0.5 rounded-md">{volunteerState.fileNumber || volunteerState.file_number || "غير مسجل"}</strong></span>
                {volunteerState.city && (
                  <>
                    <span>•</span>
                    <span>{volunteerState.city} - {volunteerState.district || "العسيلة"}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="text-center bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 min-w-[75px]">
              <strong className="text-base font-black block font-mono text-amber-300">{volunteerState.points}</strong>
              <span className="text-[10px] text-blue-100 font-bold block">مجموع النقاط</span>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 min-w-[75px]">
              <strong className="text-base font-black block font-mono text-white">
                {volunteerState.points >= 150 ? '🥇 ذهبي' : volunteerState.points >= 80 ? '🥈 فضي' : '🥉 برونزي'}
              </strong>
              <span className="text-[10px] text-blue-100 font-bold block">التصنيف</span>
            </div>
            <div className="text-center bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 min-w-[75px]">
              <strong className="text-base font-black block font-mono text-emerald-300">#{associationRank || 1}</strong>
              <span className="text-[10px] text-blue-100 font-bold block">ترتيب الجمعية</span>
            </div>
            
            {/* Quick Export Monthly Achievement Report Button */}
            <button
              onClick={() => setShowMonthlyReportModal(true)}
              className="bg-white hover:bg-blue-50 text-[#071C43] font-black text-xs px-3.5 py-2.5 rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title="تصدير تقرير الإنجاز الشهري وساعات التطوع المعتمدة إلى PDF"
            >
              <FileText className="w-4 h-4 text-[#0754C7]" />
              <span>تقرير الإنجاز (PDF)</span>
            </button>

            {/* Return to Homepage Button */}
            {onBackToHome && (
              <button
                type="button"
                id="volunteer-back-to-home-btn"
                onClick={onBackToHome}
                className="bg-white/15 hover:bg-white/25 text-white font-black text-xs px-3.5 py-2.5 rounded-2xl border border-white/20 shadow-md flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="العودة إلى الصفحة التعريفية الرئيسية للموقع"
              >
                <ArrowRight className="w-4 h-4" />
                <span>الرئيسية</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation tabs - Royal Blue theme (#0754C7) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto whitespace-nowrap pb-1" dir="rtl">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${
            activeTab === 'home' 
              ? 'border-[#0754C7] text-[#0754C7] dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${
            activeTab === 'profile' 
              ? 'border-[#0754C7] text-[#0754C7] dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>حسابي</span>
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${
            activeTab === 'leaderboard' 
              ? 'border-[#0754C7] text-[#0754C7] dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>صدارة المتطوعين والفرق</span>
        </button>
        <button
          onClick={() => setActiveTab('initiatives')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${
            activeTab === 'initiatives' 
              ? 'border-[#0754C7] text-[#0754C7] dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>الفرص والمبادرات</span>
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${
            activeTab === 'certificates' 
              ? 'border-[#0754C7] text-[#0754C7] dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
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
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${
            activeTab === 'notifications' 
              ? 'border-[#0754C7] text-[#0754C7] dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>الإشعارات ({myBroadcasts.length + (activeCheckinInitiative ? 1 : 0)})</span>
        </button>
        <button
          onClick={() => setActiveTab('assistant')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${
            activeTab === 'assistant' 
              ? 'border-[#0754C7] text-[#0754C7] dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4 text-[#0754C7] animate-pulse" />
          <span>المساعد الذكي</span>
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black transition-all cursor-pointer border-b-2 ${
            activeTab === 'support' 
              ? 'border-[#0754C7] text-[#0754C7] bg-blue-50/50 dark:bg-blue-950/30' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-[#0754C7]" />
          <span>الدعم الفني للفريق</span>
        </button>
      </div>

      {/* Main Tab content frame */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-2xs text-right" dir="rtl">
        
        {/* 1. HOME VIEW: 6 Distinctive Brand Sections */}
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
            
            {/* Active Field Checkout Notification Banner */}
            {activeCheckinInitiative && (
              <div className="bg-linear-to-br from-amber-50 to-amber-100/40 dark:from-amber-950/40 dark:to-amber-900/30 border border-amber-200 dark:border-amber-700/60 p-5 rounded-3xl space-y-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full flex items-center justify-center shrink-0">
                    <BadgeAlert className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-amber-950 dark:text-amber-200">أنت مسجل حضور ميداني نشط حالياً!</h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                      أنت متواجد حالياً بمبادرة: <strong>{activeCheckinInitiative.name}</strong> ({activeCheckinInitiative.place}). يرجى تأكيد انصرافك عند مغادرة الموقع لتوثيق الساعات بدقة.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleSelfCheckout}
                    disabled={checkoutLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer disabled:bg-neutral-300"
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
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span>تم تسجيل انصرافك بنجاح وحساب مدة العمل الميداني! شكراً لعطائك المتميز اليوم. ✓</span>
              </div>
            )}

            {/* Top Grid: Section 1 (Welcome Card), Section 2 (Points Card), Section 3 (Team Card) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* SECTION 1: بطاقة الترحيب (Welcome Card) */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0754C7]" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-white">1. بطاقة الترحيب والهوية</h3>
                  </div>
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-[#0754C7] dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold">
                    حساب المتطوع
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <div className="relative group cursor-pointer" onClick={() => setShowProfileCropModal(true)}>
                    <img 
                      src={displayAvatarUrl} 
                      alt={volunteerState.name} 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#0754C7] shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{volunteerState.name}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      رقم الملف: <strong className="font-mono text-slate-800 dark:text-slate-200">{volunteerState.fileNumber || volunteerState.file_number || "غير مسجل"}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      الفريق: <strong className="text-[#0754C7] dark:text-blue-400">{myTeam ? myTeam.nameAr : "غير مخصص"}</strong>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">حالة الحساب:</span>
                  <span className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{volunteerState.status === 'inactive' ? 'غير نشط' : 'نشط ومعتمد'}</span>
                  </span>
                </div>
              </div>

              {/* SECTION 2: بطاقة النقاط ومؤشرات الإنجاز (Points & Metric Card) */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-white">2. بطاقة النقاط والأداء</h3>
                  </div>
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full font-bold">
                    نظام النقاط
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-500 block">مجموع النقاط</span>
                    <strong className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">{volunteerState.points}</strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-500 block">نقاط الشهر الحالي</span>
                    <strong className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">+{currentMonthPoints}</strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-500 block">المبادرات المشارك بها</span>
                    <strong className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">{myAttendance.length}</strong>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] text-slate-500 block">مرات الحضور المعتمد</span>
                    <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">{validAttendanceCount}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">الترتيب بين المتطوعين:</span>
                  <span className="font-mono font-black text-[#0754C7] dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-md">
                    المركز #{associationRank || 1}
                  </span>
                </div>
              </div>

              {/* SECTION 3: بطاقة الفريق والقائد (Team Card) */}
              <div className="bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#0754C7]" />
                    <h3 className="text-xs font-black text-slate-800 dark:text-white">3. بطاقة الفريق والقائد</h3>
                  </div>
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-950/60 text-[#0754C7] dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                    المركز #{teamLeaderboardPos || 1} بالصدارة
                  </span>
                </div>

                {myTeam ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={myTeam.logoUrl || "/logo.png"} 
                        alt={myTeam.nameAr} 
                        className="w-12 h-12 rounded-xl object-contain p-1 border border-slate-200 dark:border-slate-700 bg-white"
                      />
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">{myTeam.nameAr}</h4>
                        <p className="text-[10px] text-slate-500">
                          عدد الأعضاء: <strong className="font-mono text-slate-700 dark:text-slate-300">{teamVolunteers.length} متطوع</strong>
                        </p>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0754C7] text-white flex items-center justify-center font-bold text-xs">
                          {myTeam.leaderName ? myTeam.leaderName.charAt(0) : "ق"}
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 block">قائد الفريق:</span>
                          <strong className="text-slate-800 dark:text-slate-200 text-xs block">{myTeam.leaderName || "غير محدد"}</strong>
                        </div>
                      </div>
                      <span className="text-[10px] text-[#0754C7] dark:text-blue-400 font-bold">معتمد ✓</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">لم يتم تعيين فريق لك بعد. تواصل مع إدارة التطوع.</div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">موقع الفريق بالصدارة:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    المركز {teamLeaderboardPos} من {teams.length} فرق
                  </span>
                </div>
              </div>

            </div>

            {/* Middle Grid: Section 4 (Opportunities) & Section 5 (3D Double-Sided Card Widget) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* SECTION 5: البطاقة التطوعية الذكية ذات الوجهين (3D Flip Card Widget) */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>5. البطاقة التطوعية الذكية (3D Flip)</span>
                    </h3>
                    <p className="text-[10.5px] text-slate-500">بطاقة ذات وجهين قابلة للقلب والتحقق المباشر</p>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-700 p-0.5 rounded-xl flex items-center text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setCardDisplayMode('3d')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        cardDisplayMode === '3d' 
                          ? 'bg-white dark:bg-slate-900 text-[#0754C7] dark:text-blue-300 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      بطاقة الفريق 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardDisplayMode('smart')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        cardDisplayMode === 'smart' 
                          ? 'bg-white dark:bg-slate-900 text-[#0754C7] dark:text-blue-300 shadow-xs' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      النمط السريع
                    </button>
                  </div>
                </div>

                {cardDisplayMode === '3d' && cardTemplate ? (
                  <div className="flex flex-col items-center justify-center">
                    <CardRenderer
                      template={cardTemplate}
                      volunteer={volunteerState}
                      departments={departments}
                      teams={teams}
                      scale={0.52}
                      showActions={true}
                      showControls={true}
                      onReissue={() => onReissueCard(volunteerState.id)}
                    />
                  </div>
                ) : (
                  <SmartCard 
                    volunteer={volunteerState}
                    departments={departments}
                    teams={teams}
                    onReissue={onReissueCard}
                  />
                )}

                <div className="text-[10.5px] text-slate-500 leading-relaxed bg-blue-50/50 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                  💡 <strong>ميزة الوجهين:</strong> انقر على زر "قلب البطاقة" لمعاينة الوجه الخلفي المشتمل على رمز الاستجابة السريعة (QR) الذي يفتح الموقع الرسمي للجمعية: <span className="font-mono text-[#0754C7] dark:text-blue-300">https://www.riadataleata.com</span>.
                </div>
              </div>

              {/* SECTION 4: الفرص والمبادرات التطوعية (Volunteer Opportunities Card) */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#0754C7]" />
                      <span>4. الفرص والمبادرات التطوعية</span>
                    </h3>
                    <p className="text-[10.5px] text-slate-500">الفرص المتاحة للتسجيل وسجل المشاركات الميدانية</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-[#0754C7] dark:text-blue-300">
                      المقبولة: {myRequests.filter(r => r.status === 'accepted').length}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      المتاحة: {initiatives.filter(i => i.registrationStatus === 'open').length}
                    </span>
                  </div>
                </div>

                {appliedSuccess && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تم تسجيل طلبك للمبادرة بنجاح وبانتظار اعتماد قائد الفريق! ✓</span>
                  </div>
                )}

                {/* Open Opportunities List */}
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {initiatives.filter(i => i.registrationStatus === 'open').map(i => {
                    const team = teams.find(t => t.id === i.teamId);
                    const hasApplied = myRequests.some(r => r.initiativeId === i.id);
                    return (
                      <div key={i.id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:border-[#0754C7] transition-all flex flex-col justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex justify-between items-start">
                            <strong className="text-xs font-black text-slate-900 dark:text-white block">{i.name}</strong>
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">متاح للتسجيل</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">{i.description}</p>
                          <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1 pt-1 font-medium">
                            <span>📍 {i.place}</span>
                            <span>📅 {i.date} ({i.startTime} - {i.endTime})</span>
                            <span className="text-[#0754C7] font-bold">👥 {team ? team.nameAr : "مستقل"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
                          {i.nationalPlatformUrl ? (
                            <a
                              href={i.nationalPlatformUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10.5px] font-bold text-[#0754C7] dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>المنصة الوطنية</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </a>
                          ) : <div />}

                          <button
                            onClick={() => handleApply(i.id)}
                            disabled={hasApplied}
                            className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                              hasApplied 
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                                : 'bg-[#0754C7] hover:bg-blue-700 text-white shadow-xs'
                            }`}
                          >
                            {hasApplied ? "تم التقديم مسبقاً ✓" : "انضمام للفرصة"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* SECTION 6: صندوق الإشعارات والتنبيهات الميدانية (Notifications Feed) */}
            <div className="bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-[#0754C7]" />
                  <h3 className="text-xs font-black text-slate-800 dark:text-white">6. الإشعارات والتعاميم الميدانية</h3>
                </div>
                <span className="text-[10px] text-slate-400">تحديثات فورية من القائد والإدارة</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Team broadcasts */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">📢 تعاميم قائد الفريق:</h4>
                  {myBroadcasts.length > 0 ? (
                    myBroadcasts.slice(0, 3).map((bc: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-2xl bg-blue-50/40 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>قائد الفريق:</span>
                          <span className="font-mono">{bc.timestamp ? new Date(bc.timestamp).toLocaleDateString("ar-SA") : "اليوم"}</span>
                        </div>
                        <p className="leading-relaxed">{bc.message || bc}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                      لا توجد تعاميم جديدة من قائد الفريق حالياً.
                    </div>
                  )}
                </div>

                {/* System activity & points notices */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-slate-700 dark:text-slate-300">🔔 إشعارات القبول والنقاط:</h4>
                  <div className="space-y-2">
                    {myRequests.slice(0, 2).map((r) => (
                      <div key={r.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/60 text-xs flex justify-between items-center">
                        <div>
                          <strong className="block text-slate-800 dark:text-slate-200 text-xs">{r.initiativeName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">تاريخ التقديم: {r.date || r.requestDate}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          r.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                          r.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {r.status === 'accepted' ? 'مقبول بالفرصة ✓' : r.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </div>
                    ))}

                    <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs flex items-center justify-between text-amber-900 dark:text-amber-200">
                      <span>💎 رصيد نقاطك النشط:</span>
                      <strong className="font-mono font-black">{volunteerState.points} نقطة</strong>
                    </div>
                  </div>
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
                isOpen={showKnightsModal}
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

        {/* 5. PROFILE & ACCOUNT SETTINGS (صفحة «حسابي» المستقلة) */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0754C7]" />
                  <span>صفحة «حسابي» والبيانات الرسمية للمتطوع</span>
                </h3>
                <p className="text-xs text-slate-500">
                  إدارة البيانات الشخصية، تحديث صورة الحساب، ومعاينة بياناتك المعتمدة بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDataChangeModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>طلب تعديل بيانات رسمية</span>
                </button>
              </div>
            </div>

            {/* DUAL PHOTOS DISPLAY: WhatsApp Profile Photo VS Official Card Photo */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-700/80 space-y-4">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#0754C7]" />
                <h4 className="text-xs font-black text-slate-800 dark:text-white">الصور المعتمدة: صورة الحساب الشخصي (واتساب) مقابل صورة البطاقة الرسمية</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
                {/* 1. Personal WhatsApp Profile Photo */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={displayAvatarUrl} 
                        alt={volunteerState.name} 
                        className="w-20 h-20 rounded-full object-cover border-3 border-[#0754C7] shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1 -left-1 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                        نشطة
                      </span>
                    </div>

                    <div className="space-y-1 text-right">
                      <strong className="text-xs font-black text-slate-900 dark:text-white block">صورة الحساب الشخصي (واتساب)</strong>
                      <p className="text-[10.5px] text-slate-500 leading-snug">
                        تظهر في لوحة التحكم، وأعلى الصفحة، والتواصل. قابلة للتعديل والقص والتدوير في أي وقت.
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowProfileCropModal(true)}
                      className="flex-1 sm:flex-initial bg-[#0754C7] hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>تغيير الصورة 📷</span>
                    </button>
                    {(volunteerState.profileImage || volunteerState.profile_image) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm("هل تريد حذف صورة الحساب الشخصية والرجوع للصورة الرسمية؟")) {
                            try {
                              const res = await fetch("/api/db/volunteers/profile-image", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ volunteerId: volunteerState.id, remove: true })
                              });
                              const data = await res.json();
                              if (res.ok && data.ok) {
                                setVolunteerState(data.volunteer);
                              }
                            } catch (e) {
                              console.error(e);
                            }
                          }
                        }}
                        className="flex-1 sm:flex-initial bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-3.5 py-2 rounded-xl transition-all border border-rose-200 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف 🗑️</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Official Card Photo (Strictly Locked) */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-4 justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img 
                        src={volunteerState.photo} 
                        alt="صورة البطاقة الرسمية" 
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-300 dark:border-slate-600 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute -bottom-1 -left-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> رسمية
                      </span>
                    </div>

                    <div className="space-y-1 text-right">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-xs font-black text-slate-900 dark:text-white">صورة البطاقة المعتمدة</strong>
                        <Lock className="w-3 h-3 text-amber-500" />
                      </div>
                      <p className="text-[10.5px] text-slate-500 leading-snug">
                        الصورة الرسمية المطبوعة على بطاقة التطوع الذكية. محمية ضد التعديل المباشر ولا تتأثر بتغيير صورة الحساب الشخصي.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setChangeRequestField("photo");
                      setShowDataChangeModal(true);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
                    title="طلب تعديل الصورة الرسمية للبطاقة من الإدارة"
                  >
                    طلب تغيير 🔒
                  </button>
                </div>
              </div>
            </div>

            {/* EDITABLE PERSONAL DETAILS FORM */}
            <form onSubmit={handleSavePersonalInfo} className="bg-white dark:bg-slate-800/80 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-emerald-600" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">البيانات الشخصية وبيانات التواصل (مسموح بتحديثها مباشرة):</h4>
                </div>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  تحديث فوري
                </span>
              </div>

              {profileSaveFeedback && (
                <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  profileSaveFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {profileSaveFeedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span>{profileSaveFeedback.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">رقم الجوال:</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-mono text-left text-xs text-slate-900 dark:text-white"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-mono text-left text-xs text-slate-900 dark:text-white"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">المدينة:</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="مكة المكرمة"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300 block">الحي السكني:</label>
                  <input
                    type="text"
                    value={editDistrict}
                    onChange={(e) => setEditDistrict(e.target.value)}
                    placeholder="مخطط العسيلة"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingProfile ? "جاري حفظ التعديلات..." : "حفظ تعديلات بيانات التواصل"}</span>
                </button>
              </div>
            </form>

            {/* LOCKED OFFICIAL DATA & ADMINISTRATIVE PARTICULARS */}
            <div className="bg-white dark:bg-slate-800/80 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">البيانات الرسمية المعتمدة (تخضع لرقابة واعتماد الإدارة):</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDataChangeModal(true)}
                  className="text-xs text-[#0754C7] dark:text-blue-400 hover:underline font-bold flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تقديم طلب تعديل رسمي</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">الاسم المعتمد:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white text-xs">{volunteerState.name}</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">رقم الهوية الوطنية / الإقامة:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white font-mono text-xs">{volunteerState.nationalId || "10********"}</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">رقم الملف الرسمي:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-[#0754C7] dark:text-blue-400 font-mono text-xs font-bold">{volunteerState.fileNumber || volunteerState.file_number || "غير مسجل"}</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">رقم العضوية التطوعية:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white font-mono text-xs">{volunteerState.membershipNumber}</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">الفريق التطوعي الملحق به:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white text-xs">{myTeam ? myTeam.nameAr : "غير معين"}</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">قائد الفريق المعتمد:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white text-xs">{myTeam ? myTeam.leaderName : "غير محدد"}</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">اللقب والمنصب التطوعي:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white text-xs">{volunteerState.titleAr || "متطوع فاعل"}</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">إجمالي النقاط المعتمدة:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-amber-600 dark:text-amber-400 font-mono text-xs">{volunteerState.points} نقطة</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] text-slate-400 block">تاريخ الانضمام الموثق:</span>
                  <div className="flex items-center justify-between">
                    <strong className="text-slate-900 dark:text-white font-mono text-xs">{volunteerState.joinDate || "1446-01-01"}</strong>
                    <Lock className="w-3 h-3 text-slate-400" />
                  </div>
                </div>
              </div>

              {volunteerState.passwordResetToken && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowPasswordResetModal(true)}
                    className="w-full bg-[#0754C7] hover:bg-blue-700 text-white font-bold py-2.5 rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>تعيين كلمة المرور الجديدة لحسابك (طلب معتمد)</span>
                  </button>
                </div>
              )}
            </div>

            {/* بطاقة المتطوع الرسمية ذات الوجهين */}
            <VolunteerProfileCardSection 
              volunteer={volunteerState}
              teams={teams}
              departments={departments}
              title="قسم: بطاقة المتطوع الرسمية (المعاينة والطباعة)"
              onReissue={() => onReissueCard(volunteerState.id)}
            />
          </div>
        )}

        {/* SUPPORT TAB */}
        {activeTab === 'support' && (
          <TeamSupportManager
            currentUser={currentVolunteer}
            userRole="volunteer"
            volunteer={currentVolunteer}
            team={myTeam}
          />
        )}

      </div>

      {/* Password Reset Modal for Volunteer */}
      {showPasswordResetModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!resetTokenInput || !newPasswordInput) return;
              setIsResettingPassword(true);
              setResetFeedback(null);
              try {
                const res = await fetch('/api/auth/reset-password-with-token', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: resetTokenInput.trim(),
                    newPassword: newPasswordInput.trim()
                  })
                });
                const data = await res.json();
                if (res.ok && data.status === 'success') {
                  setResetFeedback({ type: 'success', text: 'تم تحديث كلمة المرور الخاصة بك بنجاح! يمكنك استخدامها لتسجيل الدخول.' });
                  setTimeout(() => {
                    setShowPasswordResetModal(false);
                    setResetFeedback(null);
                    setNewPasswordInput('');
                  }, 2000);
                } else {
                  setResetFeedback({ type: 'error', text: data.error || 'حدث خطأ أثناء تحديث كلمة المرور.' });
                }
              } catch (err) {
                setResetFeedback({ type: 'error', text: 'تعذر الاتصال بالخادم.' });
              } finally {
                setIsResettingPassword(false);
              }
            }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-right animate-scale-up"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-neutral-150 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-neutral-800 dark:text-white">
                  تعيين كلمة مرور جديدة لحسابك
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(false)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              تم اعتماد طلب إعادة تعيين كلمة المرور لحسابك من قِبل إدارة العمليات. أدخل كود التحقق الآمن المؤقت وكلمة المرور الجديدة.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-700 dark:text-slate-300 block">
                كود التحقق الآمن المؤقت:
              </label>
              <input
                type="text"
                required
                value={resetTokenInput}
                onChange={e => setResetTokenInput(e.target.value)}
                placeholder="RST-XXXXXX-XXXX"
                className="w-full bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 font-mono text-center text-xs tracking-wider"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-neutral-700 dark:text-slate-300 block">
                كلمة المرور الجديدة:
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPasswordInput}
                onChange={e => setNewPasswordInput(e.target.value)}
                placeholder="أدخل كلمة مرور قوية (6 خانات على الأقل)..."
                className="w-full bg-white dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-xl p-2.5 text-xs font-mono"
              />
            </div>

            {resetFeedback && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                resetFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {resetFeedback.text}
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-neutral-150 dark:border-slate-700">
              <button
                type="submit"
                disabled={isResettingPassword}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all"
              >
                {isResettingPassword ? 'جاري الحفظ...' : 'تأكيد وحفظ كلمة المرور'}
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(false)}
                className="px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

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

      {/* Profile Photo WhatsApp-style Circular Crop Modal */}
      {showProfileCropModal && (
        <ProfilePhotoCropModal
          isOpen={showProfileCropModal}
          currentPhoto={displayAvatarUrl}
          volunteerId={volunteerState.id}
          volunteerName={volunteerState.name}
          onClose={() => setShowProfileCropModal(false)}
          onSaveSuccess={(newUrl) => {
            setVolunteerState(prev => ({
              ...prev,
              profileImage: newUrl,
              profile_image: newUrl
            }));
            setShowProfileCropModal(false);
          }}
        />
      )}

      {/* Official Data Change Request Modal */}
      {showDataChangeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <form
            onSubmit={handleSubmitDataChangeRequest}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-right animate-scale-up"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تقديم طلب تعديل بيانات رسمية معتمدة
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDataChangeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              البيانات الرسمية (مثل الاسم المعتمد، رقم الهوية، رقم الملف، الفريق، والنقاط) تخضع لمراجعة إدارة الموارد البشرية والعمليات قبل تعديلها في النظام.
            </p>

            {changeRequestSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{changeRequestSuccess}</span>
              </div>
            )}

            {changeRequestError && (
              <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{changeRequestError}</span>
              </div>
            )}

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                الحقل المطلوب تعديله:
              </label>
              <select
                value={changeRequestField}
                onChange={e => setChangeRequestField(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white"
              >
                <option value="name">الاسم الكامل المعتمد</option>
                <option value="nationalId">رقم الهوية الوطنية / الإقامة</option>
                <option value="fileNumber">رقم الملف الرسمي</option>
                <option value="team">الفريق التطوعي</option>
                <option value="titleAr">المنصب واللقب التطوعي</option>
                <option value="photo">صورة البطاقة الرسمية المعتمدة</option>
                <option value="points">مراجعة رصيد النقاط</option>
                <option value="other">بيان رسمي آخر</option>
              </select>
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                القيمة أو البيان الجديد المطلوب اعتماده:
              </label>
              <input
                type="text"
                required
                value={changeRequestNewValue}
                onChange={e => setChangeRequestNewValue(e.target.value)}
                placeholder="أدخل البيان الصحيح الجديد..."
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-1.5 text-xs">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                مبرر التعديل وملاحظات إضافية:
              </label>
              <textarea
                rows={3}
                value={changeRequestReason}
                onChange={e => setChangeRequestReason(e.target.value)}
                placeholder="اشرح سبب طلب التعديل (مثل: تصحيح إملائي، نقل فريق، تجديد هوية)..."
                className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-2.5 text-xs text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="submit"
                disabled={changeRequestSubmitting}
                className="flex-1 bg-[#0754C7] hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{changeRequestSubmitting ? 'جاري الإرسال...' : 'رفع الطلب للإدارة للمراجعة'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDataChangeModal(false)}
                className="px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
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
