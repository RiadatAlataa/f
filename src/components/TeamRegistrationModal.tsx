import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, MapPin, Calendar, Palette, User, Phone, Mail, 
  CreditCard, Compass, Target, Sparkles, Image as ImageIcon, FileText, 
  Upload, CheckCircle2, ShieldCheck, ArrowRight, ArrowLeft, X, 
  Search, AlertCircle, Clock, Link as LinkIcon, Award, MessageSquare, 
  Check, RefreshCw, Eye, ExternalLink, HelpCircle, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeamApplication, TeamAttachment, TeamSocialLinks } from '../types';
import { DEFAULT_SAUDI_CITIES, VOLUNTEER_DOMAINS_AND_SERVICES, TEAM_COLOR_PRESETS } from '../data/saudiCities';

interface TeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitApplication: (app: Partial<TeamApplication>) => Promise<{ success: boolean; applicationNumber?: string; message?: string }>;
  existingApplications?: TeamApplication[];
  lang?: 'ar' | 'en';
  onOpenLogin?: (role?: string) => void;
}

export const TeamRegistrationModal: React.FC<TeamRegistrationModalProps> = ({
  isOpen,
  onClose,
  onSubmitApplication,
  existingApplications = [],
  lang = 'ar',
  onOpenLogin
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'track'>('register');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ success: boolean; appNumber: string } | null>(null);

  // Form State
  const [teamName, setTeamName] = useState('');
  const [teamNameEn, setTeamNameEn] = useState('');
  const [city, setCity] = useState(DEFAULT_SAUDI_CITIES[0]);
  const [customCity, setCustomCity] = useState('');
  const [establishedDate, setEstablishedDate] = useState('');
  const [membersCount, setMembersCount] = useState<number | ''>(10);
  const [pastInitiativesCount, setPastInitiativesCount] = useState<number | ''>(3);
  const [teamColor, setTeamColor] = useState(TEAM_COLOR_PRESETS[0].value);
  const [description, setDescription] = useState('');

  // Leader Info
  const [leaderName, setLeaderName] = useState('');
  const [leaderPhone, setLeaderPhone] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderNationalId, setLeaderNationalId] = useState('');
  const [leaderBirthDate, setLeaderBirthDate] = useState('');
  const [leaderCity, setLeaderCity] = useState(DEFAULT_SAUDI_CITIES[0]);
  const [leaderAddress, setLeaderAddress] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState<'whatsapp' | 'call' | 'email' | 'telegram'>('whatsapp');

  // Vision, Mission, Goals, Services
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [goals, setGoals] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "الإغاثة والمساعدات الإنسانية",
    "خدمة المجتمع والتنمية"
  ]);

  // Meaningful Idea for Society
  const [meaningfulIdeaTitle, setMeaningfulIdeaTitle] = useState('');
  const [meaningfulIdea, setMeaningfulIdea] = useState('');

  // Logo & Media
  const [logoUrl, setLogoUrl] = useState('');

  // Attachments
  const [attachments, setAttachments] = useState<TeamAttachment[]>([]);
  const [newAttachmentTitle, setNewAttachmentTitle] = useState('');
  const [newAttachmentType, setNewAttachmentType] = useState<'license' | 'profile' | 'certificates' | 'other'>('profile');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');

  // Social Links
  const [socialLinks, setSocialLinks] = useState<TeamSocialLinks>({
    x: '',
    instagram: '',
    snapchat: '',
    tiktok: '',
    youtube: '',
    facebook: '',
    whatsapp: '',
    telegram: '',
    website: ''
  });

  // Past Experience
  const [pastBeneficiariesCount, setPastBeneficiariesCount] = useState<number | ''>('');
  const [pastVolunteerHours, setPastVolunteerHours] = useState<number | ''>('');
  const [pastPartnerEntities, setPastPartnerEntities] = useState('');
  const [majorPastInitiatives, setMajorPastInitiatives] = useState('');
  const [achievementsAndExperience, setAchievementsAndExperience] = useState('');
  const [awardsAndHonors, setAwardsAndHonors] = useState('');

  // Agreements
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToVolunteerPolicy, setAgreedToVolunteerPolicy] = useState(false);
  const [agreedToPrivacyPolicy, setAgreedToPrivacyPolicy] = useState(false);
  const [agreedToDataAccuracy, setAgreedToDataAccuracy] = useState(false);
  const [agreedToRegulations, setAgreedToRegulations] = useState(false);

  // Tracking State
  const [trackSearchQuery, setTrackSearchQuery] = useState('');
  const [foundApp, setFoundApp] = useState<TeamApplication | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isEditingCorrection, setIsEditingCorrection] = useState(false);
  const [editingAppId, setEditingAppId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Toggle domain service checkbox
  const handleToggleService = (serviceLabel: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceLabel) 
        ? prev.filter(s => s !== serviceLabel) 
        : [...prev, serviceLabel]
    );
  };

  // Add attachment handler
  const handleAddAttachment = () => {
    if (!newAttachmentTitle || !newAttachmentUrl) {
      alert("يرجى إدخال مسمى المرفق والرابط أو رفع الملف");
      return;
    }
    const newAtt: TeamAttachment = {
      id: "att-" + Date.now(),
      title: newAttachmentTitle,
      type: newAttachmentType,
      fileUrl: newAttachmentUrl,
      fileName: newAttachmentTitle,
      uploadedAt: new Date().toISOString()
    };
    setAttachments(prev => [...prev, newAtt]);
    setNewAttachmentTitle('');
    setNewAttachmentUrl('');
  };

  // Handle Logo Upload Simulation / File
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLogoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Attachment File Upload
  const handleAttachmentFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setNewAttachmentUrl(reader.result);
          if (!newAttachmentTitle) {
            setNewAttachmentTitle(file.name.replace(/\.[^/.]+$/, ""));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Step Validation
  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      if (!teamName.trim()) {
        alert("يرجى إدخال اسم الفريق التطوعي");
        return false;
      }
      if (!city) {
        alert("يرجى تحديد المدينة");
        return false;
      }
      if (!establishedDate) {
        alert("يرجى تحديد تاريخ تأسيس الفريق");
        return false;
      }
      if (!membersCount || Number(membersCount) < 1) {
        alert("يرجى إدخال عدد أعضاء الفريق (عضو واحد على الأقل)");
        return false;
      }
      if (!teamColor) {
        alert("يرجى اختيار لون الفريق");
        return false;
      }
    } else if (currentStep === 2) {
      if (!leaderName.trim()) {
        alert("يرجى إدخال اسم قائد الفريق");
        return false;
      }
      if (!leaderPhone.trim()) {
        alert("يرجى إدخال رقم جوال قائد الفريق");
        return false;
      }
      if (!leaderPhone.startsWith("05") || leaderPhone.length !== 10) {
        alert("يرجى التأكد من كتابة رقم جوال سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام");
        return false;
      }
    } else if (currentStep === 3) {
      if (selectedServices.length === 0) {
        alert("يرجى اختيار مجال واحد على الأقل من مجالات وخدمات الفريق");
        return false;
      }
    } else if (currentStep === 4) {
      if (!meaningfulIdea.trim()) {
        alert("يرجى كتابة فكرة أو مشروع مبتكر يساهم في تطوير المجتمع");
        return false;
      }
    } else if (currentStep === 7) {
      if (!agreedToTerms || !agreedToVolunteerPolicy || !agreedToPrivacyPolicy || !agreedToDataAccuracy || !agreedToRegulations) {
        alert("يرجى الموافقة على جميع الشروط والإقرارات المعتمدة للمتابعة");
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 7));
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit handler
  const handleSubmitForm = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    const chosenCity = city === "أخرى (إضافة يدوية)" ? (customCity || "مكة المكرمة") : city;

    const payload: Partial<TeamApplication> = {
      id: editingAppId || undefined,
      teamName: teamName.trim(),
      teamNameEn: teamNameEn.trim(),
      city: chosenCity,
      establishedDate,
      membersCount: Number(membersCount) || 1,
      pastInitiativesCount: Number(pastInitiativesCount) || 0,
      teamColor,
      description: description.trim(),

      leaderName: leaderName.trim(),
      leaderPhone: leaderPhone.trim(),
      leaderEmail: leaderEmail.trim(),
      leaderNationalId: leaderNationalId.trim(),
      leaderBirthDate,
      leaderCity,
      leaderAddress: leaderAddress.trim(),
      preferredContactMethod,

      vision: vision.trim(),
      mission: mission.trim(),
      goals: goals.trim(),
      services: selectedServices,

      meaningfulIdeaTitle: meaningfulIdeaTitle.trim(),
      meaningfulIdea: meaningfulIdea.trim(),

      logoUrl: logoUrl || undefined,
      attachments,
      socialLinks,

      pastBeneficiariesCount: Number(pastBeneficiariesCount) || 0,
      pastVolunteerHours: Number(pastVolunteerHours) || 0,
      pastPartnerEntities: pastPartnerEntities.trim(),
      majorPastInitiatives: majorPastInitiatives.trim(),
      achievementsAndExperience: achievementsAndExperience.trim(),
      awardsAndHonors: awardsAndHonors.trim(),

      agreedToTerms,
      agreedToVolunteerPolicy,
      agreedToPrivacyPolicy,
      agreedToDataAccuracy,
      agreedToRegulations,
      agreementTimestamp: new Date().toISOString(),
      status: 'pending'
    };

    const res = await onSubmitApplication(payload);
    setIsSubmitting(false);

    if (res.success && res.applicationNumber) {
      setSubmissionSuccess({
        success: true,
        appNumber: res.applicationNumber
      });
      setIsEditingCorrection(false);
      setEditingAppId(null);
    }
  };

  // Tracking query
  const handleSearchTracking = () => {
    setHasSearched(true);
    const query = trackSearchQuery.trim().toLowerCase();
    if (!query) {
      setFoundApp(null);
      return;
    }
    const match = existingApplications.find(a => 
      a.applicationNumber.toLowerCase() === query || 
      a.leaderPhone === query ||
      (a.leaderNationalId && a.leaderNationalId === query) ||
      a.teamName.toLowerCase().includes(query)
    );
    setFoundApp(match || null);
  };

  // Populate form from found app for correction editing
  const handleLoadAppForEditing = (app: TeamApplication) => {
    setEditingAppId(app.id);
    setTeamName(app.teamName || '');
    setTeamNameEn(app.teamNameEn || '');
    setCity(app.city || DEFAULT_SAUDI_CITIES[0]);
    setEstablishedDate(app.establishedDate || '');
    setMembersCount(app.membersCount || 10);
    setPastInitiativesCount(app.pastInitiativesCount || 0);
    setTeamColor(app.teamColor || TEAM_COLOR_PRESETS[0].value);
    setDescription(app.description || '');

    setLeaderName(app.leaderName || '');
    setLeaderPhone(app.leaderPhone || '');
    setLeaderEmail(app.leaderEmail || '');
    setLeaderNationalId(app.leaderNationalId || '');
    setLeaderBirthDate(app.leaderBirthDate || '');
    setLeaderCity(app.leaderCity || DEFAULT_SAUDI_CITIES[0]);
    setLeaderAddress(app.leaderAddress || '');
    setPreferredContactMethod((app.preferredContactMethod as any) || 'whatsapp');

    setVision(app.vision || '');
    setMission(app.mission || '');
    setGoals(app.goals || '');
    setSelectedServices(app.services || ["الإغاثة والمساعدات الإنسانية"]);

    setMeaningfulIdeaTitle(app.meaningfulIdeaTitle || '');
    setMeaningfulIdea(app.meaningfulIdea || '');

    setLogoUrl(app.logoUrl || '');
    setAttachments(app.attachments || []);
    setSocialLinks(app.socialLinks || {});

    setPastBeneficiariesCount(app.pastBeneficiariesCount || '');
    setPastVolunteerHours(app.pastVolunteerHours || '');
    setPastPartnerEntities(app.pastPartnerEntities || '');
    setMajorPastInitiatives(app.majorPastInitiatives || '');
    setAchievementsAndExperience(app.achievementsAndExperience || '');
    setAwardsAndHonors(app.awardsAndHonors || '');

    setAgreedToTerms(app.agreedToTerms || false);
    setAgreedToVolunteerPolicy(app.agreedToVolunteerPolicy || false);
    setAgreedToPrivacyPolicy(app.agreedToPrivacyPolicy || false);
    setAgreedToDataAccuracy(app.agreedToDataAccuracy || false);
    setAgreedToRegulations(app.agreedToRegulations || false);

    setIsEditingCorrection(true);
    setActiveTab('register');
    setCurrentStep(1);
  };

  const stepsHeader = [
    { num: 1, title: "بيانات الفريق" },
    { num: 2, title: "بيانات القائد" },
    { num: 3, title: "الرؤية والخدمات" },
    { num: 4, title: "فكرة المجتمع" },
    { num: 5, title: "الشعار والملفات" },
    { num: 6, title: "التواصل والخبرات" },
    { num: 7, title: "الإقرار والإرسال" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs overflow-y-auto" dir="rtl">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-4xl rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="relative bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 pb-5">
          <button 
            onClick={onClose}
            className="absolute left-4 top-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="p-1.5 rounded-lg bg-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>بوابة انضمام الفرق التطوعية</span>
                </span>
                <span className="text-[11px] bg-white/15 px-2.5 py-0.5 rounded-full font-bold">
                  ريادة العطاء
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">تسجيل فريق تطوعي</h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-1">
                انضم كفريق تطوعي وكن جزءاً من ريادة العطاء • <span className="font-bold text-amber-300">فريق واحد .. أثر واحد</span>
              </p>
            </div>

            {/* Switch between New Registration & Track Application + Login Button */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
              <div className="flex items-center bg-black/20 p-1 rounded-xl">
                <button
                  onClick={() => {
                    setActiveTab('register');
                    setSubmissionSuccess(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'register' ? 'bg-white text-emerald-900 shadow-xs' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  {isEditingCorrection ? 'تعديل الطلب' : 'تقديم طلب جديد'}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('track');
                    setSubmissionSuccess(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'track' ? 'bg-white text-emerald-900 shadow-xs' : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  متابعة حالة الطلب
                </button>
              </div>

              {onOpenLogin && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLogin('team');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-emerald-500/30 hover:bg-emerald-500/50 text-white border border-emerald-400/40 flex items-center gap-1.5 shadow-xs"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>تسجيل الدخول</span>
                </button>
              )}
            </div>
          </div>

          {/* Steps Progress Indicator (When in Register Mode) */}
          {activeTab === 'register' && !submissionSuccess && (
            <div className="mt-5 pt-4 border-t border-emerald-600/50">
              <div className="flex items-center justify-between overflow-x-auto pb-1 text-[11px] font-bold no-scrollbar gap-2">
                {stepsHeader.map((st) => (
                  <button
                    key={st.num}
                    onClick={() => {
                      if (st.num < currentStep) setCurrentStep(st.num);
                    }}
                    className={`flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-lg transition-all ${
                      currentStep === st.num 
                        ? 'bg-white text-emerald-900 shadow-xs font-black' 
                        : currentStep > st.num 
                        ? 'bg-emerald-600/70 text-emerald-100 hover:bg-emerald-600 cursor-pointer' 
                        : 'text-emerald-300/60 opacity-60'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      currentStep === st.num 
                        ? 'bg-emerald-700 text-white font-bold' 
                        : currentStep > st.num 
                        ? 'bg-emerald-500 text-white' 
                        : 'bg-white/20 text-white'
                    }`}>
                      {currentStep > st.num ? '✓' : st.num}
                    </span>
                    <span className="hidden sm:inline">{st.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 text-neutral-800 dark:text-neutral-200">
          
          {/* TAB 1: REGISTRATION FLOW */}
          {activeTab === 'register' && (
            <>
              {/* If Submission Was Successful */}
              {submissionSuccess ? (
                <div className="text-center py-10 px-4 space-y-5 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-lg border border-emerald-200">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-300">تم إرسال طلب انضمام فريقكم بنجاح</h3>
                    <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
                      سيتم مراجعة البيانات من قبل إدارة جمعية ريادة العطاء لخدمة الإنسان بالعسيلة، وسيتم إشعاركم عند قبول أو مراجعة الطلب.
                    </p>
                  </div>

                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-1">
                    <span className="text-xs text-neutral-500 font-bold block">رقم طلب الانضمام المعتمد:</span>
                    <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 tracking-wider select-all">
                      {submissionSuccess.appNumber}
                    </span>
                    <span className="text-[11px] text-neutral-400 block mt-1">احتفظ بهذا الرقم للاستعلام عن حالة طلب الفريق</span>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={() => {
                        setTrackSearchQuery(submissionSuccess.appNumber);
                        setActiveTab('track');
                        setSubmissionSuccess(null);
                        handleSearchTracking();
                      }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      استعراض حالة الطلب الآن
                    </button>
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      إغلاق النافذة
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">

                  {/* Correction Banner if editing */}
                  {isEditingCorrection && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-black text-amber-900 dark:text-amber-200 block">أنت تقوم الآن بتعديل طلب الانضمام رقم: {editingAppId}</span>
                        <p className="text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                          يرجى استيفاء الملاحظات المطلوبة من الإدارة ثم الضغط على "إعادة إرسال الطلب".
                        </p>
                      </div>
                    </div>
                  )}

                  {/* STEP 1: Basic Team Info */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <Users className="w-5 h-5 text-emerald-600" />
                          <span>المعلومات الأساسية للفريق التطوعي</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">البيانات التعريفية واللون والهوية والموقع الجغرافي للفريق</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            اسم الفريق التطوعي <span className="text-rose-500">* (إجباري)</span>
                          </label>
                          <input
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            placeholder="مثال: فريق ريادة المستقبل التطوعي"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            الاسم بالإنجليزية (اختياري)
                          </label>
                          <input
                            type="text"
                            value={teamNameEn}
                            onChange={(e) => setTeamNameEn(e.target.value)}
                            placeholder="e.g. Reyadat Al-Mustaqbal Volunteer Team"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            المدينة <span className="text-rose-500">* (إجباري)</span>
                          </label>
                          <select
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium cursor-pointer"
                          >
                            {DEFAULT_SAUDI_CITIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="أخرى (إضافة يدوية)">+ أخرى (إضافة يدوية)</option>
                          </select>
                          {city === "أخرى (إضافة يدوية)" && (
                            <input
                              type="text"
                              value={customCity}
                              onChange={(e) => setCustomCity(e.target.value)}
                              placeholder="اكتب اسم المدينة..."
                              className="w-full mt-2 px-3.5 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            تاريخ التأسيس <span className="text-rose-500">* (إجباري)</span>
                          </label>
                          <input
                            type="date"
                            value={establishedDate}
                            onChange={(e) => setEstablishedDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            عدد أعضاء الفريق <span className="text-rose-500">* (إجباري)</span>
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={membersCount}
                            onChange={(e) => setMembersCount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="مثال: 15"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            عدد المبادرات المنفذة سابقاً
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={pastInitiativesCount}
                            onChange={(e) => setPastInitiativesCount(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="مثال: 5"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                          />
                        </div>
                      </div>

                      {/* Team Color Picker */}
                      <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-2.5">
                        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          لون وشعار الفريق المعتمد <span className="text-rose-500">* (إجباري)</span>
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {TEAM_COLOR_PRESETS.map((preset) => (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setTeamColor(preset.value)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                teamColor === preset.value
                                  ? 'ring-2 ring-emerald-500 ring-offset-2 border-transparent text-white'
                                  : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                              }`}
                              style={{
                                backgroundColor: teamColor === preset.value ? preset.value : undefined
                              }}
                            >
                              <span 
                                className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0" 
                                style={{ backgroundColor: preset.value }}
                              />
                              <span>{preset.label}</span>
                            </button>
                          ))}

                          <div className="flex items-center gap-2 mr-auto">
                            <span className="text-xs text-neutral-500 font-medium">لون مخصص:</span>
                            <input
                              type="color"
                              value={teamColor}
                              onChange={(e) => setTeamColor(e.target.value)}
                              className="w-8 h-8 rounded-lg border border-neutral-300 dark:border-neutral-700 cursor-pointer p-0.5"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                          وصف مختصر عن الفريق وأنشطته
                        </label>
                        <textarea
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="اكتب نبذة موجزة عن الفريق وتاريخ تأسيسه ونطاق عمله..."
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Leader Info */}
                  {currentStep === 2 && (
                    <div className="space-y-5">
                      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <User className="w-5 h-5 text-emerald-600" />
                          <span>بيانات قائد الفريق التطوعي</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">معلومات التواصل والتحقق الرسمية لقائد الفريق المسؤول</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            اسم قائد الفريق الثلاثي أو الرباعي <span className="text-rose-500">* (إجباري)</span>
                          </label>
                          <input
                            type="text"
                            value={leaderName}
                            onChange={(e) => setLeaderName(e.target.value)}
                            placeholder="مثال: فهد بن عبد العزيز السالم"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            رقم الجوال الرسمي للقائد <span className="text-rose-500">* (إجباري)</span>
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            value={leaderPhone}
                            onChange={(e) => setLeaderPhone(e.target.value)}
                            placeholder="05xxxxxxxx"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-mono font-medium"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            البريد الإلكتروني
                          </label>
                          <input
                            type="email"
                            value={leaderEmail}
                            onChange={(e) => setLeaderEmail(e.target.value)}
                            placeholder="leader@example.com"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            رقم الهوية الوطنية / الإقامة
                          </label>
                          <input
                            type="text"
                            maxLength={10}
                            value={leaderNationalId}
                            onChange={(e) => setLeaderNationalId(e.target.value)}
                            placeholder="10xxxxxxxx"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-mono font-medium"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            تاريخ الميلاد
                          </label>
                          <input
                            type="date"
                            value={leaderBirthDate}
                            onChange={(e) => setLeaderBirthDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            مدينة إقامة القائد
                          </label>
                          <select
                            value={leaderCity}
                            onChange={(e) => setLeaderCity(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                          >
                            {DEFAULT_SAUDI_CITIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            العنوان والحي السكني
                          </label>
                          <input
                            type="text"
                            value={leaderAddress}
                            onChange={(e) => setLeaderAddress(e.target.value)}
                            placeholder="مثال: مكة المكرمة - مخطط العسيلة"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            وسيلة التواصل المفضلة
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'whatsapp', label: 'واتساب مباشر', icon: MessageSquare },
                              { id: 'call', label: 'اتصال هاتفي', icon: Phone },
                              { id: 'email', label: 'بريد إلكتروني', icon: Mail },
                              { id: 'telegram', label: 'تيليجرام', icon: Send }
                            ].map((method) => (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => setPreferredContactMethod(method.id as any)}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  preferredContactMethod === method.id
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500'
                                    : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100'
                                }`}
                              >
                                <method.icon className="w-3.5 h-3.5" />
                                <span>{method.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Vision, Mission, Goals, and Services */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <Compass className="w-5 h-5 text-emerald-600" />
                          <span>رؤية ورسالة وأهداف الفريق والمجالات</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">التوجه الاستراتيجي ومجالات العمل التطوعي للفريق</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            رؤية الفريق (Vision)
                          </label>
                          <textarea
                            rows={3}
                            value={vision}
                            onChange={(e) => setVision(e.target.value)}
                            placeholder="ما الذي يطمح الفريق للوصول إليه في المستقبل؟"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium resize-none leading-relaxed"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            رسالة الفريق (Mission)
                          </label>
                          <textarea
                            rows={3}
                            value={mission}
                            onChange={(e) => setMission(e.target.value)}
                            placeholder="ما هي الغاية الأساسية والأثر الذي يعمل الفريق على تحقيقه يومياً؟"
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium resize-none leading-relaxed"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                          أهداف الفريق الرئيسية (Goals)
                        </label>
                        <textarea
                          rows={3}
                          value={goals}
                          onChange={(e) => setGoals(e.target.value)}
                          placeholder="اكتب الأهداف التي يسعى الفريق لتحقيقها (مثال: تأهيل 100 متطوع، تنفيذ 10 مبادرات مجتمعية نوعية...)"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium resize-none leading-relaxed"
                        />
                      </div>

                      {/* Services & Volunteer Domains Checkboxes */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          الخدمات والمجالات التي يعمل بها الفريق <span className="text-rose-500">* (اختر مجالاً أو أكثر)</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                          {VOLUNTEER_DOMAINS_AND_SERVICES.map((domain) => {
                            const isSelected = selectedServices.includes(domain.label);
                            return (
                              <button
                                key={domain.id}
                                type="button"
                                onClick={() => handleToggleService(domain.label)}
                                className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200 shadow-2xs font-bold'
                                    : 'bg-neutral-50 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100'
                                }`}
                              >
                                <span className="text-xs leading-tight">{domain.label}</span>
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-xs font-bold ${
                                  isSelected ? 'bg-emerald-600 text-white' : 'border border-neutral-300 dark:border-neutral-600 text-transparent'
                                }`}>
                                  ✓
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Meaningful Idea for Society */}
                  {currentStep === 4 && (
                    <div className="space-y-5">
                      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                            <Sparkles className="w-5 h-5" />
                          </span>
                          <div>
                            <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">فكرة هادفة للمجتمع</h3>
                            <p className="text-xs text-neutral-500 mt-0.5">مشروع أو فكرة مبتكرة تساهم في تطوير المجتمع وخدمة الإنسان</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-50/70 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 space-y-1 text-xs">
                        <strong className="text-amber-900 dark:text-amber-300 font-bold block">💡 إرشادات كتابة الفكرة المجتمعية:</strong>
                        <p className="text-amber-800/90 dark:text-amber-400 leading-relaxed">
                          تقوم إدارة ريادة العطاء بتقييم الفرق بناءً على عمق وأثر المبادرات المجتمعية المقترحة. يرجى شرح فكرتكم، والمشكلة أو الاحتياج الذي تعالجه، والأثر المرجو على المستفيدين والمجتمع.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                          عنوان الفكرة أو المشروع المبتكر (اختياري)
                        </label>
                        <input
                          type="text"
                          value={meaningfulIdeaTitle}
                          onChange={(e) => setMeaningfulIdeaTitle(e.target.value)}
                          placeholder="مثال: مبادرة حقيبة الإسعاف المدرسي الذكية / ملتقى ريادة التطوع"
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                          تفاصيل الفكرة والمشكلة والأثر المتوقع <span className="text-rose-500">* (إجباري)</span>
                        </label>
                        <textarea
                          rows={6}
                          value={meaningfulIdea}
                          onChange={(e) => setMeaningfulIdea(e.target.value)}
                          placeholder="اشرح بالتفصيل: ما هي المشكلة أو الفجوة في المجتمع؟ ما هو الحل والمبادرة التي يقترحها فريقك؟ وما هي الفئات المستفيدة والأثر التنموي المتوقع تحقيقه؟"
                          className="w-full px-3.5 py-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-medium resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Team Logo & Documents */}
                  {currentStep === 5 && (
                    <div className="space-y-6">
                      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-emerald-600" />
                          <span>شعار الفريق ومستندات التوثيق</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">رفع شعار الفريق والمرفقات الرسمية (اختياري / داعم للطلب)</p>
                      </div>

                      {/* Logo Upload & Preview */}
                      <div className="bg-neutral-50 dark:bg-neutral-800/60 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100">شعار الفريق الرسمي (Logo)</h4>
                            <p className="text-[11px] text-neutral-500 mt-0.5">صيغ مدعومة: JPG, PNG, GIF, SVG, WEBP</p>
                          </div>

                          {/* Upload input button */}
                          <label className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>رفع صورة الشعار من الجهاز</span>
                            <input
                              type="file"
                              accept="image/*,.svg"
                              onChange={handleLogoUpload}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Preview box */}
                        <div className="flex items-center gap-4 pt-2">
                          <div className="w-20 h-20 rounded-2xl bg-white dark:bg-neutral-900 border-2 border-dashed border-emerald-400/80 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                            {logoUrl ? (
                              <img 
                                src={logoUrl} 
                                alt="معاينة الشعار" 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-[10px] text-neutral-400 text-center font-bold px-1">لا يوجد شعار</span>
                            )}
                          </div>
                          <div className="space-y-1.5 flex-1">
                            <input
                              type="text"
                              value={logoUrl}
                              onChange={(e) => setLogoUrl(e.target.value)}
                              placeholder="أو الصق رابط صورة الشعار المعتمد مباشرة (URL)..."
                              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-mono"
                              dir="ltr"
                            />
                            {logoUrl && (
                              <button
                                type="button"
                                onClick={() => setLogoUrl("")}
                                className="text-[10px] text-rose-500 hover:text-rose-600 font-bold cursor-pointer inline-flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                <span>إزالة الشعار</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Documents & Attachments Management */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-black text-neutral-900 dark:text-neutral-100">المستندات والملفات الداعمة</h4>
                            <p className="text-[11px] text-neutral-500">وثيقة التأسيس أو الترخيص، ملف التعريف، شهادات الإنجازات السابقة</p>
                          </div>
                        </div>

                        {/* Add new attachment box */}
                        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div>
                              <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">نوع المستند</label>
                              <select
                                value={newAttachmentType}
                                onChange={(e) => setNewAttachmentType(e.target.value as any)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium"
                              >
                                <option value="license">وثيقة أو ترخيص الفريق</option>
                                <option value="profile">ملف تعريف الفريق (Company Profile)</option>
                                <option value="certificates">شهادات وتكريمات سابقة</option>
                                <option value="other">مستند داعم آخر</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">عنوان الملف / الوثيقة</label>
                              <input
                                type="text"
                                value={newAttachmentTitle}
                                onChange={(e) => setNewAttachmentTitle(e.target.value)}
                                placeholder="مثال: ترخيص الفريق الرسمي 2025"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">رابط أو رفع الملف</label>
                              <div className="flex gap-1.5">
                                <input
                                  type="text"
                                  value={newAttachmentUrl}
                                  onChange={(e) => setNewAttachmentUrl(e.target.value)}
                                  placeholder="رابط الملف..."
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 font-mono text-[11px]"
                                  dir="ltr"
                                />
                                <label className="p-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 rounded-xl cursor-pointer shrink-0">
                                  <Upload className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                                  <input
                                    type="file"
                                    onChange={handleAttachmentFileUpload}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleAddAttachment}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                            >
                              <span>+ إضافة المستند لقائمة المرفقات</span>
                            </button>
                          </div>
                        </div>

                        {/* List of added attachments */}
                        {attachments.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {attachments.map((att) => (
                              <div key={att.id} className="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-2 shadow-2xs">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div className="overflow-hidden">
                                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block truncate">{att.title}</span>
                                    <span className="text-[10px] text-neutral-400 font-mono block">
                                      {att.type === 'license' ? 'وثيقة ترخيص' : att.type === 'profile' ? 'ملف تعريفي' : 'مستند إثبات'}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                                  className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                                >
                                  حذف
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-neutral-400 italic text-center py-2">لا توجد مستندات مضافة بعد (المرفقات اختيارية حسب رغبة الفريق).</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Social Media & Past Experience */}
                  {currentStep === 6 && (
                    <div className="space-y-6">
                      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <LinkIcon className="w-5 h-5 text-emerald-600" />
                          <span>حسابات التواصل وبيانات الخبرة السابقة</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">روابط الحسابات الرقمية للفريق والإنجازات السابقة لتقييم الطلب</p>
                      </div>

                      {/* Social Links Section */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200">حسابات التواصل الاجتماعي والموقع الإلكتروني</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {[
                            { key: 'x', label: 'حساب منصة X (تويتر)', placeholder: 'https://x.com/team' },
                            { key: 'instagram', label: 'إنستغرام Instagram', placeholder: 'https://instagram.com/team' },
                            { key: 'snapchat', label: 'سناب شات Snapchat', placeholder: 'https://snapchat.com/add/team' },
                            { key: 'tiktok', label: 'تيك توك TikTok', placeholder: 'https://tiktok.com/@team' },
                            { key: 'youtube', label: 'قناة يوتيوب YouTube', placeholder: 'https://youtube.com/@team' },
                            { key: 'whatsapp', label: 'رابط واتساب الفريق', placeholder: 'https://wa.me/966xxxxxxxxx' },
                            { key: 'telegram', label: 'قناة تيليجرام', placeholder: 'https://t.me/team' },
                            { key: 'facebook', label: 'صفحة فيسبوك', placeholder: 'https://facebook.com/team' },
                            { key: 'website', label: 'الموقع الإلكتروني الرسمي', placeholder: 'https://team.org' }
                          ].map((item) => (
                            <div key={item.key}>
                              <label className="block text-[10.5px] font-bold text-neutral-600 dark:text-neutral-400 mb-1">{item.label}</label>
                              <input
                                type="text"
                                value={(socialLinks as any)[item.key] || ''}
                                onChange={(e) => setSocialLinks(prev => ({ ...prev, [item.key]: e.target.value }))}
                                placeholder={item.placeholder}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-mono text-[11px]"
                                dir="ltr"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Past Experience Evaluation Metrics */}
                      <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-600" />
                          <span>بيانات وإحصائيات الخبرة السابقة للفريق</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                              عدد المستفيدين السابقين من المبادرات
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={pastBeneficiariesCount}
                              onChange={(e) => setPastBeneficiariesCount(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="مثال: 1500"
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                              إجمالي الساعات التطوعية المنفذة سابقاً
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={pastVolunteerHours}
                              onChange={(e) => setPastVolunteerHours(e.target.value === '' ? '' : Number(e.target.value))}
                              placeholder="مثال: 320"
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                            الجهات والقطاعات التي سبق التعاون معها
                          </label>
                          <input
                            type="text"
                            value={pastPartnerEntities}
                            onChange={(e) => setPastPartnerEntities(e.target.value)}
                            placeholder="مثال: وزارة الموارد البشرية، أمانة العاصمة المقدسة، جامعات، جمعيات خيرية..."
                            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                              أهم المبادرات والإنجازات السابقة
                            </label>
                            <textarea
                              rows={3}
                              value={majorPastInitiatives}
                              onChange={(e) => setMajorPastInitiatives(e.target.value)}
                              placeholder="اكتب أبرز 3 مبادرات نفذها الفريق..."
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium resize-none leading-relaxed"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                              الجوائز والتكريمات إن وجدت
                            </label>
                            <textarea
                              rows={3}
                              value={awardsAndHonors}
                              onChange={(e) => setAwardsAndHonors(e.target.value)}
                              placeholder="أوسمة التميز، خطابات الشكر، جوائز العمل التطوعي..."
                              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 font-medium resize-none leading-relaxed"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 7: Agreements & Submission */}
                  {currentStep === 7 && (
                    <div className="space-y-5">
                      <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-emerald-600" />
                          <span>الإقرارات والتعهد المعتمد</span>
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">الموافقة على ميثاق العمل التطوعي وأنظمة ولوائح جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
                      </div>

                      {/* Summary recap card */}
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">فريق: {teamName}</span>
                          <span className="text-[11px] bg-white dark:bg-neutral-900 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                            {city} • {membersCount} أعضاء
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-400 flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-emerald-200/50">
                          <span>القائد: <strong>{leaderName}</strong></span>
                          <span>الجوال: <strong>{leaderPhone}</strong></span>
                          <span>المجالات: <strong>{selectedServices.slice(0, 3).join('، ')}...</strong></span>
                        </div>
                      </div>

                      {/* Agreements Checkboxes */}
                      <div className="space-y-3 bg-neutral-50 dark:bg-neutral-800/60 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700">
                        {[
                          { id: 'terms', label: 'أوافق على شروط ومعايير الانضمام إلى جمعية ريادة العطاء لخدمة الإنسان بالعسيلة.', state: agreedToTerms, setter: setAgreedToTerms },
                          { id: 'policy', label: 'أتعهد بالالتزام باللائحة التنظيمية للعمل التطوعي المنبثقة من المركز الوطني لتنمية القطاع غير الربحي.', state: agreedToVolunteerPolicy, setter: setAgreedToVolunteerPolicy },
                          { id: 'privacy', label: 'أوافق على سياسة الخصوصية وسرية المعلومات ومشاركتها للأغراض التوثيقية والتشغيلية المعتمدة.', state: agreedToPrivacyPolicy, setter: setAgreedToPrivacyPolicy },
                          { id: 'accuracy', label: 'أقر بصحة ودقة جميع البيانات والمستندات والخبرات المدخلة في هذا الطلب وأتحمل كامل المسؤولية النظامية.', state: agreedToDataAccuracy, setter: setAgreedToDataAccuracy },
                          { id: 'regulations', label: 'أتعهد بتمثيل ريادة العطاء بأعلى درجات المهنية والأمانة وإتباع توجيهات مجلس الإدارة والإدارة التنفيذية.', state: agreedToRegulations, setter: setAgreedToRegulations }
                        ].map((item) => (
                          <label key={item.id} className="flex items-start gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.state}
                              onChange={(e) => item.setter(e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
                            />
                            <span className="text-xs text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed">
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>

                      <div className="text-[11px] text-neutral-400 text-center">
                        يتم تسجيل تاريخ ووقت التقديم وعنوان المعرف تلقائياً لتوثيق الطلب رسمياً.
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons Footer */}
                  <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      {currentStep > 1 ? (
                        <button
                          type="button"
                          onClick={handlePrevStep}
                          className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                          <span>السابق</span>
                        </button>
                      ) : null}

                      {onOpenLogin && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenLogin('team');
                          }}
                          className="px-3.5 py-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/30"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>العودة لتسجيل الدخول</span>
                        </button>
                      )}
                    </div>

                    {currentStep < 7 ? (
                      <button
                        type="button"
                        onClick={handleNextStep}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <span>متابعة (الخطوة {currentStep + 1})</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmitForm}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جارٍ إرسال طلب انضمام الفريق...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{isEditingCorrection ? 'إعادة إرسال طلب الانضمام بعد التعديل' : 'إرسال طلب الانضمام رسمياً'}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: TRACK APPLICATION STATUS */}
          {activeTab === 'track' && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-neutral-900 dark:text-neutral-100">الاستعلام عن طلبات انضمام الفرق</h3>
                <p className="text-xs text-neutral-500">
                  يمكنك الاستعلام برقم الطلب (TEAM-xxxx) أو برقم جوال القائد أو اسم الفريق
                </p>
              </div>

              {/* Search Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3.5 top-3 w-4 h-4 text-neutral-400" />
                  <input
                    type="text"
                    value={trackSearchQuery}
                    onChange={(e) => setTrackSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchTracking()}
                    placeholder="أدخل رقم الطلب مثل TEAM-2026-0001 أو رقم الجوال..."
                    className="w-full pr-10 pl-4 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:bg-white dark:focus:bg-neutral-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-hidden font-mono font-medium"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchTracking}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  استعلام
                </button>
              </div>

              {/* Search Results */}
              {hasSearched && (
                <div>
                  {foundApp ? (
                    <div className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                        <div>
                          <span className="text-[10.5px] font-mono text-neutral-400 block">{foundApp.applicationNumber}</span>
                          <h4 className="text-sm font-black text-neutral-900 dark:text-neutral-100">{foundApp.teamName}</h4>
                        </div>
                        <div>
                          <span className={`px-3 py-1 rounded-full text-xs font-black inline-flex items-center gap-1.5 ${
                            foundApp.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : foundApp.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300'
                              : foundApp.status === 'needs_correction'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                            <span>
                              {foundApp.status === 'approved' ? '🟢 تم قبول واعتماد الفريق' :
                               foundApp.status === 'rejected' ? '🔴 تم رفض الطلب' :
                               foundApp.status === 'needs_correction' ? '🔵 يحتاج إلى تعديل بيانات' :
                               '🟡 قيد المراجعة والتدقيق'}
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl">
                          <span className="text-[10px] text-neutral-400 block">المدينة:</span>
                          <span className="font-bold">{foundApp.city}</span>
                        </div>
                        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl">
                          <span className="text-[10px] text-neutral-400 block">قائد الفريق:</span>
                          <span className="font-bold">{foundApp.leaderName}</span>
                        </div>
                        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl">
                          <span className="text-[10px] text-neutral-400 block">عدد الأعضاء:</span>
                          <span className="font-bold">{foundApp.membersCount} عضو</span>
                        </div>
                        <div className="bg-neutral-50 dark:bg-neutral-800/60 p-2.5 rounded-xl">
                          <span className="text-[10px] text-neutral-400 block">تاريخ التقديم:</span>
                          <span className="font-bold">{new Date(foundApp.appliedAt).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>

                      {/* Status Notes Breakdown */}
                      {foundApp.status === 'needs_correction' && (
                        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-4 rounded-xl space-y-3">
                          <div>
                            <span className="text-xs font-black text-blue-900 dark:text-blue-300 block">📝 ملاحظات وتعديلات الإدارة المطلوبة:</span>
                            <p className="text-xs text-blue-800 dark:text-blue-200 mt-1 leading-relaxed">
                              {foundApp.correctionNotes || "يرجى تعديل بعض البيانات المرفقة وإعادة إرسال الطلب."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLoadAppForEditing(foundApp)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>تعديل البيانات وإعادة الإرسال الآن</span>
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {foundApp.status === 'rejected' && foundApp.rejectionReason && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-xl text-xs">
                          <span className="font-black text-rose-900 dark:text-rose-300 block">سبب الرفض:</span>
                          <p className="text-rose-800 dark:text-rose-200 mt-1">{foundApp.rejectionReason}</p>
                        </div>
                      )}

                      {foundApp.status === 'approved' && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl text-xs space-y-1">
                          <span className="font-black text-emerald-900 dark:text-emerald-300 block">تهانينا! أصبح فريقكم الآن معتمداً لدى ريادة العطاء.</span>
                          <p className="text-emerald-800 dark:text-emerald-200 leading-relaxed">
                            تم ربط حساب قائد الفريق ويمكنكم الآن تسجيل الدخول وإدارة المبادرات والأعضاء.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-500 text-xs">
                      لم يتم العثور على طلب مطابق لمعايير البحث. تأكد من صحة رقم الطلب أو رقم الجوال.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
