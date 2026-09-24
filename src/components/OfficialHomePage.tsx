import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  Building2, Users, Calendar, Award, Phone, Mail, MapPin, 
  Clock, Heart, ShieldCheck, ArrowRight, ArrowLeft, Send, 
  ExternalLink, Globe, Moon, Sun, BookOpen, Volume2, Video, 
  Image as ImageIcon, CheckCircle, ChevronRight, ChevronDown, X, AlertCircle, Play, Sparkles,
  Menu, Home, ShoppingBag, Lock, Sliders, Trophy, Crown, Medal, Star, Maximize2, Printer
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { ImagePickerControl } from "./ImagePickerControl";
import { TeamRegistrationModal } from "./TeamRegistrationModal";
import { SendLetterModal } from "./SendLetterModal";
import { VolunteerKnightsHomeCard, VolunteerKnightsModal } from "./VolunteerKnights";
import { 
  HomeSettings, NewsItem, PartnerItem, GalleryItem, 
  Initiative, Volunteer, Beneficiary, VolunteerTeam, Department,
  VolunteerApplication, StoreProject, Notification, TeamApplication,
  OfficialLetter
} from "../types";
import { NotificationBell } from "./NotificationBell";
import { OpportunitiesPage } from "./OpportunitiesPage";
import { HeroSlider } from "./HeroSlider";
import { OrgChartSection } from "./OrgChartSection";
import { OrgMember, HeroSlide } from "../types";
import { UserSettingsModal } from "./UserSettingsModal";
import { playApplicationSubmittedChime } from "../utils/audioNotification";

// -------------------------------------------------------------
// Reusable Animated Counter (Counts up from 0 when scrolled into view)
// -------------------------------------------------------------
interface AnimatedCounterProps {
  value: number | string;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, prefix = "", suffix = "", duration = 2000, className = "" }: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });

  const rawStr = String(value ?? 0);
  const numericMatch = rawStr.match(/\d+/g);
  const targetNum = numericMatch ? parseInt(numericMatch.join(""), 10) : 0;

  const hasPercent = rawStr.includes("%");
  const hasPlus = rawStr.includes("+");

  const displayPrefix = prefix || (hasPlus ? "+" : "");
  const displaySuffix = suffix || (hasPercent ? "%" : "");

  useEffect(() => {
    if (!isInView) return;
    if (targetNum === 0) {
      setCount(0);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Smooth cubic ease-out formula for continuous gradual counting
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.floor(easedProgress * targetNum);
      setCount(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(targetNum);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isInView, targetNum, duration]);

  return (
    <span ref={ref} className={className}>
      {displayPrefix}{count.toLocaleString("en-US")}{displaySuffix}
    </span>
  );
}

interface OfficialHomePageProps {
  settings: HomeSettings;
  newsList: NewsItem[];
  partnersList: PartnerItem[];
  galleryList: GalleryItem[];
  initiatives: Initiative[];
  volunteers: Volunteer[];
  teams: VolunteerTeam[];
  departments: Department[];
  beneficiaries: Beneficiary[];
  notifications?: Notification[];
  onMarkNotificationRead?: (notificationId?: string, markAll?: boolean) => void;
  onDeleteNotification?: (notificationId?: string, clearAll?: boolean) => void;
  isDark: boolean;
  onToggleDark: () => void;
  lang: "ar" | "en";
  onChangeLang: (l: "ar" | "en") => void;
  onOpenLogin: (role: 'admin' | 'leader' | 'volunteer' | 'beneficiary') => void;
  onRegisterVolunteer: (vol: Partial<Volunteer>) => Promise<boolean>;
  onSubmitVolunteerApplication?: (app: Partial<VolunteerApplication>) => Promise<boolean>;
  onRegisterBeneficiary: (ben: Partial<Beneficiary>) => Promise<boolean>;
  onRegisterTeam?: (team: Partial<VolunteerTeam>) => Promise<boolean>;
  teamApplications?: TeamApplication[];
  onSubmitTeamApplication?: (app: Partial<TeamApplication>) => Promise<{ success: boolean; applicationNumber?: string; message?: string }>;
  onApplyInitiative: (initId: string, volId: string) => Promise<boolean>;
  currentVolunteer: Volunteer | null;
  currentBeneficiary: Beneficiary | null;
  storeProjects?: StoreProject[];
  onDonate?: (data: any) => Promise<boolean>;
  onSubmitOfficialLetter?: (letter: Partial<OfficialLetter>) => Promise<{ success: boolean; letter?: OfficialLetter; message?: string }>;
  orgMembers?: OrgMember[];
  heroSlides?: HeroSlide[];
}

export function OfficialHomePage({
  settings,
  newsList,
  partnersList,
  galleryList,
  initiatives,
  volunteers,
  teams,
  departments,
  beneficiaries,
  notifications = [],
  onMarkNotificationRead,
  onDeleteNotification,
  isDark,
  onToggleDark,
  lang = "ar",
  onChangeLang,
  onOpenLogin,
  onRegisterVolunteer,
  onSubmitVolunteerApplication,
  onRegisterBeneficiary,
  onRegisterTeam,
  teamApplications = [],
  onSubmitTeamApplication,
  onApplyInitiative,
  currentVolunteer,
  currentBeneficiary,
  storeProjects = [],
  onDonate,
  onSubmitOfficialLetter,
  orgMembers = [],
  heroSlides = []
}: OfficialHomePageProps) {
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  
  // Customization Colors Injection
  const primaryColor = settings?.themePrimary || "#059669";
  const secondaryColor = settings?.themeSecondary || "#0d9488";
  
  // Modals state
  const [currentPublicPage, setCurrentPublicPage] = useState<"home" | "opportunities">("home");
  const [selectedOpportunityForJoin, setSelectedOpportunityForJoin] = useState<Initiative | null>(null);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [selectedJoinType, setSelectedJoinType] = useState<"none" | "volunteer" | "leader" | "beneficiary" | "register_new">("none");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);
  const [galleryTab, setGalleryTab] = useState<"all" | "photos" | "videos">("all");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showKnightsModal, setShowKnightsModal] = useState(false);
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState(false);
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);

  // License Document URL
  const licenseImageUrl = settings?.licenseConfig?.imageUrl || "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80";

  // Registration Form States
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regNationalId, setRegNationalId] = useState("");
  const [regFamilySize, setRegFamilySize] = useState(4);
  const [regAddress, setRegAddress] = useState("");
  const [regTeam, setRegTeam] = useState("");
  const [regDept, setRegDept] = useState("");

  // Volunteer Team Registration States
  const [teamName, setTeamName] = useState("");
  const [teamCity, setTeamCity] = useState("");
  const [teamEstablishedDate, setTeamEstablishedDate] = useState("");
  const [teamMembersCount, setTeamMembersCount] = useState(1);
  const [teamInitiativesCount, setTeamInitiativesCount] = useState(0);
  const [teamColor, setTeamColor] = useState("#0d6efd");
  const [teamLeaderName, setTeamLeaderName] = useState("");
  const [teamLeaderPhone, setTeamLeaderPhone] = useState("");
  const [teamLeaderEmail, setTeamLeaderEmail] = useState("");
  const [teamVision, setTeamVision] = useState("");
  const [teamMission, setTeamMission] = useState("");
  const [teamGoals, setTeamGoals] = useState("");
  const [teamServices, setTeamServices] = useState("");
  const [teamMeaningfulIdea, setTeamMeaningfulIdea] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [isTeamSubmitting, setIsTeamSubmitting] = useState(false);

  // Step Wizard States
  const [volunteerStep, setVolunteerStep] = useState(1);
  const [teamStep, setTeamStep] = useState(1);
  const [beneficiaryStep, setBeneficiaryStep] = useState(1);

  // Extended Volunteer Application Form States
  const [regGender, setRegGender] = useState<'male' | 'female'>('male');
  const [regNationality, setRegNationality] = useState('سعودي');
  const [regBirthDate, setRegBirthDate] = useState('1998-01-01');
  const [regPosition, setRegPosition] = useState('متطوع');
  const [regBloodType, setRegBloodType] = useState('O+');
  const [regHasChronicIllness, setRegHasChronicIllness] = useState(false);
  const [regIllnessDetails, setRegIllnessDetails] = useState('');
  const [regGuardianName, setRegGuardianName] = useState('');
  const [regGuardianPhone, setRegGuardianPhone] = useState('');
  const [regPhoto, setRegPhoto] = useState('');
  const [regIdPhoto, setRegIdPhoto] = useState('');
  const [regCharterPdfName, setRegCharterPdfName] = useState('ميثاق_التطوع_المعتمد.pdf');
  const [regExperiences, setRegExperiences] = useState('');
  const [regAgreedToTerms, setRegAgreedToTerms] = useState(true);

  const [isRegSubmitting, setIsRegSubmitting] = useState(false);

  // Feedback Form State
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [isFeedbackSubmitting, setIsFeedbackSubmitting] = useState(false);

  // Video autoplay workaround Ref
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log("Video autoplay blocked by browser, using poster"));
    }
  }, [settings?.videoUrl]);

  // Lock body scroll and close on Escape for off-canvas mobile menu
  useEffect(() => {
    if (isMobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsMobileMenuOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isMobileMenuOpen]);

  // Lock body scroll and close on Escape for Join Modal
  useEffect(() => {
    if (isJoinModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsJoinModalOpen(false);
          setSelectedJoinType("none");
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isJoinModalOpen]);

  // Live Stats calculation
  const totalVolunteers = volunteers.length;
  const totalBeneficiaries = beneficiaries.length;
  const totalInitiatives = initiatives.length;
  const totalTeams = teams.length;
  const totalDepts = departments.length;
  const totalPoints = volunteers.reduce((acc, v) => acc + (v.points || 0), 0);

  // Calculate field hours (3 hours average per initiative attendance)
  const totalHours = totalInitiatives * 12 * 3; 

  // Dynamically compute published initiatives and latest single opportunity
  const publishedInitiatives = useMemo(() => {
    return (initiatives || []).filter(init => init.registrationStatus !== 'archived');
  }, [initiatives]);

  const latestOpportunity = useMemo(() => {
    if (publishedInitiatives.length === 0) {
      return (initiatives && initiatives.length > 0) ? initiatives[0] : null;
    }
    return [...publishedInitiatives].sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return timeB - timeA;
    })[0];
  }, [publishedInitiatives, initiatives]);

  // Dynamically compute Top volunteers sorted by points from props
  const sortedVolunteersByPoints = useMemo(() => {
    return [...(volunteers || [])].sort((a, b) => {
      const ptsA = typeof a.points === "number" ? a.points : (a.volunteerHours ? a.volunteerHours * 5 : 0);
      const ptsB = typeof b.points === "number" ? b.points : (b.volunteerHours ? b.volunteerHours * 5 : 0);
      if (ptsB !== ptsA) return ptsB - ptsA;
      const hrsA = typeof a.volunteerHours === "number" ? a.volunteerHours : 0;
      const hrsB = typeof b.volunteerHours === "number" ? b.volunteerHours : 0;
      return hrsB - hrsA;
    });
  }, [volunteers]);

  const top1Volunteer = sortedVolunteersByPoints.length > 0 ? sortedVolunteersByPoints[0] : null;
  const top1VolunteerTeam = top1Volunteer ? teams.find(t => t.id === top1Volunteer.teamId) : null; 

  // Step navigation validation handlers for Mobile Wizards
  const handleVolunteerStepNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (volunteerStep === 1) {
      if (!regName.trim()) {
        alert("الرجاء إدخال الاسم الكامل (رباعي).");
        return;
      }
      if (!regNationalId.trim() || regNationalId.trim().length !== 10) {
        alert("الرجاء إدخال رقم الهوية الوطنية/الإقامة (10 خانات).");
        return;
      }
      if (teams.length > 0 && !regTeam) {
        alert("الرجاء اختيار الفريق الذي ترغب بالانضمام إليه.");
        return;
      }
      setVolunteerStep(2);
    } else if (volunteerStep === 2) {
      if (!regPhone.trim()) {
        alert("الرجاء إدخال رقم الجوال الفعال.");
        return;
      }
      setVolunteerStep(3);
    } else if (volunteerStep === 3) {
      setVolunteerStep(4);
    }
  };

  const handleTeamStepNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (teamStep === 1) {
      if (!teamName.trim()) {
        alert("الرجاء إدخال اسم الفريق التطوعي.");
        return;
      }
      if (!teamCity || teamCity === "-- اختر المدينة --") {
        alert("الرجاء اختيار المدينة.");
        return;
      }
      if (!teamEstablishedDate) {
        alert("الرجاء تحديد تاريخ التأسيس.");
        return;
      }
      setTeamStep(2);
    } else if (teamStep === 2) {
      if (!teamLeaderName.trim()) {
        alert("الرجاء إدخال اسم قائد الفريق.");
        return;
      }
      if (!teamLeaderPhone.trim()) {
        alert("الرجاء إدخال رقم جوال قائد الفريق.");
        return;
      }
      setTeamStep(3);
    } else if (teamStep === 3) {
      setTeamStep(4);
    }
  };

  const handleBeneficiaryStepNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (beneficiaryStep === 1) {
      if (!regName.trim()) {
        alert("الرجاء إدخال الاسم الرباعي للمستفيد.");
        return;
      }
      if (!regNationalId.trim() || regNationalId.trim().length !== 10) {
        alert("الرجاء إدخال رقم الهوية الوطنية (10 خانات).");
        return;
      }
      if (!regPhone.trim()) {
        alert("الرجاء إدخال رقم جوال للتواصل.");
        return;
      }
      setBeneficiaryStep(2);
    }
  };

  const handleRegisterTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !teamCity || teamCity === "-- اختر المدينة --") {
      alert("الرجاء إدخال اسم الفريق واختيار المدينة.");
      return;
    }
    if (!teamEstablishedDate) {
      alert("الرجاء اختيار/إدخال تاريخ التأسيس.");
      return;
    }
    if (!teamLeaderName || !teamLeaderPhone) {
      alert("الرجاء إدخال اسم قائد الفريق ورقم الجوال.");
      return;
    }

    setIsTeamSubmitting(true);
    
    const teamPayload = {
      nameAr: teamName,
      nameEn: teamName,
      leaderName: teamLeaderName,
      leaderPhone: teamLeaderPhone,
      leaderEmail: teamLeaderEmail,
      departmentId: departments[0]?.id || "dep-1",
      city: teamCity,
      establishedDate: teamEstablishedDate,
      membersCount: Number(teamMembersCount) || 1,
      initiativesCount: Number(teamInitiativesCount) || 0,
      color: teamColor || "#0d6efd",
      vision: teamVision,
      mission: teamMission,
      goals: teamGoals,
      services: teamServices,
      meaningfulIdea: teamMeaningfulIdea,
      logoUrl: teamLogoUrl,
      descriptionAr: `فريق تطوعي في ${teamCity} - قائد الفريق: ${teamLeaderName}`,
      status: 'pending' as const
    };

    let success = false;
    if (onRegisterTeam) {
      success = await onRegisterTeam(teamPayload);
    } else {
      try {
        const res = await fetch("/api/db/teams/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(teamPayload)
        });
        success = res.ok;
      } catch {
        success = false;
      }
    }

    if (success) {
      alert("تم إرسال طلب تسجيل الفريق التطوعي بنجاح! شكراً لانضمامكم إلى ريادة العطاء. فريق واحد .. أثر واحد.");
      setIsJoinModalOpen(false);
      setSelectedJoinType("none");
      setTeamName("");
      setTeamCity("");
      setTeamEstablishedDate("");
      setTeamMembersCount(1);
      setTeamInitiativesCount(0);
      setTeamColor("#0d6efd");
      setTeamLeaderName("");
      setTeamLeaderPhone("");
      setTeamLeaderEmail("");
      setTeamVision("");
      setTeamMission("");
      setTeamGoals("");
      setTeamServices("");
      setTeamMeaningfulIdea("");
      setTeamLogoUrl("");
    } else {
      alert("تعذر إرسال الطلب، يرجى المحاولة مرة أخرى.");
    }

    setIsTeamSubmitting(false);
  };

  const handleRegisterVolunteerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regNationalId) {
      alert(lang === "ar" ? "الرجاء تعبئة الاسم الكامل، ورقم الهوية الوطنية، ورقم الجوال" : "Full name, National ID, and Phone are required");
      return;
    }
    if (!regAgreedToTerms) {
      alert(lang === "ar" ? "يرجى الموافقة والتعهد على صحة البيانات والميثاق قبل الإرسال" : "Please agree to terms and conditions");
      return;
    }

    setIsRegSubmitting(true);

    const selectedTeamObj = teams.find(t => t.id === regTeam);
    const chosenTeamId = regTeam || (teams[0]?.id || "");
    const chosenTeamName = selectedTeamObj?.nameAr || (teams[0]?.nameAr || "");

    if (onSubmitVolunteerApplication) {
      const oppId = selectedOpportunityForJoin?.id || "";
      const oppCode = selectedOpportunityForJoin?.opportunityCode || selectedOpportunityForJoin?.id || "";
      const oppTitle = selectedOpportunityForJoin?.name || "";

      const success = await onSubmitVolunteerApplication({
        fullName: regName,
        nationalId: regNationalId,
        gender: regGender,
        nationality: regNationality,
        birthDate: regBirthDate,
        phone: regPhone,
        email: regEmail,
        position: regPosition || "متطوع",
        address: regAddress || "مكة المكرمة - مخطط العسيلة",
        bloodType: regBloodType,
        hasChronicIllness: regHasChronicIllness,
        illnessDetails: regIllnessDetails,
        guardianName: regGuardianName,
        guardianPhone: regGuardianPhone,
        photo: regGender === 'female' ? 'female_unified' : regPhoto,
        idPhoto: regIdPhoto,
        charterPdfName: regCharterPdfName,
        experiences: regExperiences,
        agreedToTerms: regAgreedToTerms,
        requestedTeamId: chosenTeamId,
        requestedTeamName: chosenTeamName,
        assignedTeamId: chosenTeamId,
        opportunityId: oppId,
        opportunityCode: oppCode,
        opportunityTitle: oppTitle
      });

      if (success) {
        playApplicationSubmittedChime();
        if (selectedOpportunityForJoin) {
          alert(`تم استلام طلبك بنجاح للفرصة: ${selectedOpportunityForJoin.name}`);
        } else {
          alert(lang === "ar" 
            ? `تم تقديم طلب الانضمام بنجاح! تم تسجيل رغبتك بالانضمام إلى (${chosenTeamName})، وسيقوم المسؤول باعتمادك والتواصل معك.` 
            : "Volunteer application submitted successfully! It is pending admin approval.");
        }
        setIsJoinModalOpen(false);
        setSelectedJoinType("none");
        setSelectedOpportunityForJoin(null);
        setRegTeam("");
        resetRegForm();
      }
    } else {
      const success = await onRegisterVolunteer({
        name: regName,
        email: regEmail || `${Date.now()}@reyada.sa`,
        phone: regPhone,
        teamId: chosenTeamId,
        departmentId: regDept || (departments[0]?.id || "dep-3"),
        titleAr: regPosition || "متطوع ميداني",
        titleEn: "Field Volunteer",
        status: "active"
      });
      if (success) {
        playApplicationSubmittedChime();
        alert(lang === "ar" ? "تم تسجيل طلبك كمتطوع بنجاح!" : "Volunteer application registered!");
        setIsJoinModalOpen(false);
        setSelectedJoinType("none");
        setSelectedOpportunityForJoin(null);
        setRegTeam("");
        resetRegForm();
      }
    }
    setIsRegSubmitting(false);
  };

  const handleRegisterBeneficiarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regNationalId || !regPhone) {
      alert(lang === "ar" ? "الرجاء إدخال الاسم ورقم الهوية ورقم الجوال" : "Name, National ID and Phone are required");
      return;
    }
    setIsRegSubmitting(true);
    const success = await onRegisterBeneficiary({
      name: regName,
      email: regEmail || `${regNationalId}@example.com`,
      phone: regPhone,
      nationalId: regNationalId,
      familySize: Number(regFamilySize),
      address: regAddress || "مكة المكرمة - العسيلة",
      status: "pending"
    });
    if (success) {
      alert(lang === "ar" ? "تم تقديم طلب التسجيل كمسفيد وجاري مراجعته والتحقق منه من قبل الباحث الاجتماعي." : "Beneficiary registration request submitted! It is under review.");
      setIsJoinModalOpen(false);
      setSelectedJoinType("none");
      resetRegForm();
    }
    setIsRegSubmitting(false);
  };

  const resetRegForm = () => {
    setRegName("");
    setRegEmail("");
    setRegPhone("");
    setRegNationalId("");
    setRegFamilySize(4);
    setRegAddress("");
    setRegTeam("");
    setRegDept("");
    setRegPhoto("");
    setRegIdPhoto("");
    setVolunteerStep(1);
    setTeamStep(1);
    setBeneficiaryStep(1);
    setSelectedOpportunityForJoin(null);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackName || !feedbackMsg) {
      alert(lang === "ar" ? "يرجى ملء جميع الحقول المطلوبة" : "Please fill in all required fields");
      return;
    }
    setIsFeedbackSubmitting(true);
    setTimeout(() => {
      alert(lang === "ar" ? "شكراً لتواصلك معنا، تم إرسال رسالتك لإدارة العلاقات العامة بنجاح." : "Thank you, your message has been sent to the PR team successfully.");
      setFeedbackName("");
      setFeedbackEmail("");
      setFeedbackMsg("");
      setIsFeedbackSubmitting(false);
    }, 1000);
  };

  const handleJoinInitiativeClick = async (init: Initiative) => {
    if (currentVolunteer) {
      const success = await onApplyInitiative(init.id, currentVolunteer.id);
      if (success) {
        alert(lang === "ar" ? `تم تسجيل انضمامك للفرصة (${init.name}) بنجاح.` : "Applied for initiative successfully.");
      }
      return;
    }
    setSelectedOpportunityForJoin(init);
    setSelectedJoinType("volunteer");
    setVolunteerStep(1);
    setIsJoinModalOpen(true);
  };

  // Gallery filtering
  const filteredGallery = galleryList.filter(item => {
    if (galleryTab === "photos") return item.type === "photo";
    if (galleryTab === "videos") return item.type === "video";
    return true;
  });

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans antialiased text-right overflow-x-hidden ${isDark ? "bg-neutral-900 text-neutral-100" : "bg-neutral-900 text-neutral-900"}`} 
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      {/* Dynamic Styling Injection */}
      <style>{`
        :root {
          --theme-primary: ${primaryColor};
          --theme-secondary: ${secondaryColor};
          --theme-primary-hover: ${primaryColor}e6;
        }
        .bg-theme-primary { background-color: ${primaryColor}; }
        .text-theme-primary { color: ${primaryColor}; }
        .border-theme-primary { border-color: ${primaryColor}; }
        .hover\\:bg-theme-primary:hover { background-color: ${primaryColor}dd; }
        .bg-theme-secondary { background-color: ${secondaryColor}; }
        .text-theme-secondary { color: ${secondaryColor}; }
        .border-theme-secondary { border-color: ${secondaryColor}; }
        .bg-theme-gradient { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); }
        .text-theme-gradient {
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* 1. Header (ثابت أثناء التمرير ومرتب هندسياً مع دمج شارة الترخيص) */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/95 dark:bg-neutral-900/95 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4.5rem] py-2 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Logo & Association Info with Integrated Compact License Badge */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 min-w-0 max-w-[70%] sm:max-w-lg lg:max-w-xl">
            <div className="relative shrink-0 flex items-center justify-center">
              <img 
                src={settings?.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop"} 
                alt="شعار الجمعية" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-xs ring-2 ring-emerald-500/25 dark:ring-emerald-400/20 bg-white shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop";
                }}
              />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 
                  className="text-xs sm:text-sm lg:text-base font-bold text-neutral-900 dark:text-white leading-snug break-words tracking-tight select-text"
                  title={lang === "ar" ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : (settings?.associationNameEn || "Reyadat Al-Ata Association")}
                >
                  {lang === "ar" ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : (settings?.associationNameEn || "Reyadat Al-Ata Association")}
                </h1>

                {/* Integrated Compact License Badge (Shield icon with 'ترخيص 5081') */}
                <button
                  type="button"
                  onClick={() => setIsLicenseModalOpen(true)}
                  className="group inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-500/30 dark:border-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 text-[10px] sm:text-xs font-bold whitespace-nowrap shrink-0 self-center"
                  title={lang === "ar" ? "اضغط لعرض وتكبير وثيقة ترخيص الجمعية الرسمية رقم 5081" : "Click to view official license certificate 5081"}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                  <span>{lang === "ar" ? `ترخيص ${settings?.licenseNumber || "5081"}` : `License ${settings?.licenseNumber || "5081"}`}</span>
                </button>
              </div>

              <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 font-semibold tracking-normal whitespace-nowrap hidden sm:block mt-0.5">
                {lang === "ar" ? "بإشراف المركز الوطني لتنمية القطاع غير الربحي" : "Supervised by the National Center for Non-Profit Sector"}
              </p>
            </div>
          </div>

          {/* Center Navigation Links (Desktop: xl and up) */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-bold text-neutral-600 dark:text-neutral-300 shrink-0">
            <a href="#about" className="hover:text-emerald-600 transition-colors whitespace-nowrap">{lang === "ar" ? "من نحن" : "About"}</a>
            {settings?.sectionVisibility?.orgChart !== false && (
              <a href="#administrative-structure" className="hover:text-emerald-600 transition-colors whitespace-nowrap">{lang === "ar" ? "الهيكل الإداري" : "Org Structure"}</a>
            )}
            {settings?.sectionVisibility?.stats && <a href="#stats" className="hover:text-emerald-600 transition-colors whitespace-nowrap">{lang === "ar" ? "الإحصائيات" : "Stats"}</a>}
            {settings?.sectionVisibility?.initiatives && (
              <button
                type="button"
                onClick={() => {
                  setCurrentPublicPage('opportunities');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer border border-emerald-200 dark:border-emerald-800/80 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === "ar" ? "الفرص التطوعية" : "Opportunities"}</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-mono font-black">{initiatives.length}</span>
              </button>
            )}
            {settings?.sectionVisibility?.initiatives && <a href="#initiatives" className="hover:text-emerald-600 transition-colors whitespace-nowrap">{lang === "ar" ? "المبادرات" : "Initiatives"}</a>}
            <a
              href={settings?.donationLink || "https://store.riadataleata.org.sa"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
              title={lang === "ar" ? "الانتقال لمتجر الجمعية والتبرعات (مشروع منفصل)" : "Go to external donation store"}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{lang === "ar" ? "متجر الجمعية والتبرعات" : "Store"}</span>
              <ExternalLink className="w-2.5 h-2.5 text-neutral-400 shrink-0" />
            </a>
            {settings?.sectionVisibility?.news && <a href="#news" className="hover:text-emerald-600 transition-colors whitespace-nowrap">{lang === "ar" ? "الأخبار" : "News"}</a>}
            {settings?.sectionVisibility?.gallery && <a href="#gallery" className="hover:text-emerald-600 transition-colors whitespace-nowrap">{lang === "ar" ? "المعرض" : "Gallery"}</a>}
            {settings?.sectionVisibility?.partners && <a href="#partners" className="hover:text-emerald-600 transition-colors whitespace-nowrap">{lang === "ar" ? "شركاء النجاح" : "Partners"}</a>}
            <a href="#contact" className="hover:text-emerald-600 transition-colors whitespace-nowrap">{lang === "ar" ? "تواصل معنا" : "Contact"}</a>
          </nav>

          {/* Right Actions & Utilities (Buttons & Responsive Menu) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* External Store & Donations Link (Desktop only: lg and up) */}
            <a 
              href={settings?.donationLink || "https://store.riadataleata.org.sa"}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-full transition-all shadow-xs cursor-pointer whitespace-nowrap"
              title={lang === "ar" ? "الانتقال لمتجر الجمعية والتبرعات الإلكتروني" : "Go to Donation Store"}
            >
              <Heart className="w-3.5 h-3.5 fill-current animate-pulse text-white shrink-0" />
              <span>{lang === "ar" ? "متجر التبرعات" : "Donate (Store)"}</span>
              <ExternalLink className="w-3 h-3 text-white/80 shrink-0" />
            </a>

            {/* Language Switch */}
            <button
              onClick={() => onChangeLang(lang === "ar" ? "en" : "ar")}
              className="p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-xs font-black transition-all cursor-pointer shrink-0"
              title="Change Language / تغيير اللغة"
              aria-label="تغيير اللغة"
            >
              <Globe className="w-4 h-4" />
            </button>

            {/* Dark / Light Toggle */}
            <button
              id="btn-homepage-theme-toggle"
              onClick={onToggleDark}
              className="p-2 text-neutral-500 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl border border-neutral-200/70 dark:border-neutral-700 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title={isDark ? "تفعيل الوضع الفاتح ☀️" : "تفعيل الوضع الداكن 🌙"}
              aria-label="تبديل المظهر"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '10s' }} />
              ) : (
                <Moon className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              )}
            </button>

            {/* Notification Bell */}
            <NotificationBell
              notifications={notifications}
              currentUserId={currentVolunteer?.id || currentBeneficiary?.id || 'all'}
              currentUserRole={currentVolunteer ? 'volunteer' : currentBeneficiary ? 'beneficiary' : 'public'}
              onMarkRead={onMarkNotificationRead}
              onDelete={onDeleteNotification}
              onOpenUserSettings={() => setIsUserSettingsOpen(true)}
            />

            {/* User Settings & Audio Preferences Button */}
            <button
              id="header-user-settings-btn"
              onClick={() => setIsUserSettingsOpen(true)}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-all cursor-pointer flex items-center justify-center text-xs"
              title={lang === "ar" ? "إعدادات وتفضيلات المستخدم والتنبيهات الصوتية" : "User Settings & Audio Notifications"}
              aria-label="User Settings"
            >
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </button>

            {/* Join / Login Actions (Desktop only: 2xl) */}
            <div className="hidden 2xl:flex items-center gap-1.5 border-r border-neutral-200 dark:border-neutral-800 pr-2">
              <button
                id="header-desktop-join-btn"
                onClick={() => {
                  setSelectedJoinType("none");
                  setIsJoinModalOpen(true);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                {lang === "ar" ? "انضم الآن" : "Join Now"}
              </button>
              
              {currentBeneficiary ? (
                <button
                  onClick={() => onOpenLogin('beneficiary')}
                  className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  {lang === "ar" ? `بوابة المستفيد` : `Beneficiary Portal`}
                </button>
              ) : (
                <button
                  onClick={() => onOpenLogin('volunteer')}
                  className="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap"
                >
                  {lang === "ar" ? "تسجيل دخول" : "Login"}
                </button>
              )}
            </div>

            {/* Menu Hamburger Toggle */}
            <button
              id="btn-homepage-menu-toggle"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="p-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 shadow-xs shrink-0"
              title="القائمة (☰)"
              aria-label="القائمة الرئيسية"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-emerald-600 shrink-0" /> : <Menu className="w-5 h-5 text-emerald-600 shrink-0" />}
              <span className="hidden sm:inline text-xs font-bold text-neutral-700 dark:text-neutral-200 whitespace-nowrap">القائمة</span>
            </button>

          </div>
        </div>


        {/* Modern Off-Canvas Right-Side Sidebar rendered in Portal at root of DOM */}
        {typeof document !== "undefined" && createPortal(
          <AnimatePresence>
            {isMobileMenuOpen && (
              <div 
                key="home-sidebar-portal-root" 
                className="fixed inset-0 z-[99999] overflow-hidden no-print select-none" 
                dir="rtl"
              >
                {/* Semi-transparent Backdrop Overlay with blur - Click to close */}
                <motion.div
                  key="home-sidebar-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="fixed inset-0 bg-neutral-950/65 dark:bg-black/80 backdrop-blur-xs transition-opacity cursor-pointer z-0"
                  aria-hidden="true"
                />

                {/* Off-Canvas Sliding Container from Right Edge */}
                <motion.div
                  key="home-sidebar-panel"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 300 }}
                  className="fixed inset-y-0 right-0 z-10 w-80 sm:w-88 max-w-[85vw] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden"
                  role="dialog"
                  aria-modal="true"
                  aria-label="القائمة الجانبية الرئيسية"
                >
                {/* Header with Clear Close Button */}
                <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/80 dark:bg-neutral-850/90 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                      ر
                    </div>
                    <div className="min-w-0 truncate">
                      <span className="font-bold text-xs text-neutral-900 dark:text-white block truncate select-text">
                        {lang === "ar" ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : (settings?.associationNameEn || "Reyadat Al-Ata Association")}
                      </span>
                      <span className="text-[10px] text-neutral-500 dark:text-neutral-400">القائمة الرئيسية</span>
                    </div>
                  </div>

                  <button
                    id="home-sidebar-close-btn"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-neutral-700 hover:text-rose-600 dark:text-neutral-200 dark:hover:text-rose-400 border border-neutral-200 dark:border-neutral-700 transition-all font-bold text-xs cursor-pointer shadow-xs"
                    aria-label="إغلاق القائمة"
                    title="إغلاق القائمة (Esc)"
                  >
                    <X className="w-4 h-4 text-rose-500" />
                    <span>إغلاق</span>
                  </button>
                </div>

                {/* Scrollable Navigation Items */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
                  <nav className="flex flex-col gap-2 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    <a 
                      href="#about" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-emerald-600 transition-all border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-750"
                    >
                      <span>{lang === "ar" ? "من نحن" : "About"}</span>
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                    </a>
                    {settings?.sectionVisibility?.orgChart !== false && (
                      <a 
                        href="#administrative-structure" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-emerald-600 transition-all border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-750"
                      >
                        <span>{lang === "ar" ? "الهيكل الإداري" : "Org Structure"}</span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                      </a>
                    )}
                    {settings?.sectionVisibility?.stats && (
                      <a 
                        href="#stats" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-emerald-600 transition-all border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-750"
                      >
                        <span>{lang === "ar" ? "الإحصائيات" : "Stats"}</span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                      </a>
                    )}
                    {settings?.sectionVisibility?.initiatives && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPublicPage('opportunities');
                          setIsMobileMenuOpen(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold transition-all border border-emerald-200 dark:border-emerald-850 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          <span>{lang === "ar" ? "الفرص التطوعية (صفحة مستقلة)" : "Volunteer Opportunities"}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-mono font-bold">
                          {initiatives.length}
                        </span>
                      </button>
                    )}
                    {settings?.sectionVisibility?.initiatives && (
                      <a 
                        href="#initiatives" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-emerald-600 transition-all border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-750"
                      >
                        <span>{lang === "ar" ? "المبادرات" : "Initiatives"}</span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                      </a>
                    )}
                    {settings?.sectionVisibility?.news && (
                      <a 
                        href="#news" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-emerald-600 transition-all border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-750"
                      >
                        <span>{lang === "ar" ? "الأخبار" : "News"}</span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                      </a>
                    )}
                    {settings?.sectionVisibility?.gallery && (
                      <a 
                        href="#gallery" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-emerald-600 transition-all border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-750"
                      >
                        <span>{lang === "ar" ? "المعرض" : "Gallery"}</span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                      </a>
                    )}
                    {settings?.sectionVisibility?.partners && (
                      <a 
                        href="#partners" 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-emerald-600 transition-all border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-750"
                      >
                        <span>{lang === "ar" ? "شركاء النجاح" : "Partners"}</span>
                        <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                      </a>
                    )}
                    <a 
                      href="#contact" 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 hover:text-emerald-600 transition-all border border-transparent hover:border-neutral-200/60 dark:hover:border-neutral-750"
                    >
                      <span>{lang === "ar" ? "تواصل معنا" : "Contact"}</span>
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-neutral-400" />
                    </a>
                  </nav>

                  <div className="flex flex-col gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    {/* Donate Now Button */}
                    <a 
                      href={settings?.donationLink || "#"} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-center gap-1.5 bg-rose-600 text-white font-bold text-xs py-2.5 rounded-xl hover:bg-rose-700 transition-all shadow-xs"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Heart className="w-3.5 h-3.5 fill-current animate-pulse text-white" />
                      <span>{lang === "ar" ? "تبرع الآن" : "Donate Now"}</span>
                    </a>

                    {/* Join Now Button */}
                    <button
                      id="mobile-drawer-join-now-btn"
                      onClick={() => { 
                        setSelectedJoinType("none");
                        setIsJoinModalOpen(true); 
                        setIsMobileMenuOpen(false); 
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
                    >
                      {lang === "ar" ? "انضم الآن" : "Join Now"}
                    </button>

                    {/* Portal Sign-ins */}
                    {currentBeneficiary ? (
                      <button
                        onClick={() => { onOpenLogin('beneficiary'); setIsMobileMenuOpen(false); }}
                        className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                      >
                        {lang === "ar" ? `بوابة المستفيد` : `Beneficiary Portal`}
                      </button>
                    ) : (
                      <button
                        onClick={() => { onOpenLogin('volunteer'); setIsMobileMenuOpen(false); }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-xs"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{lang === "ar" ? "تسجيل الدخول الموحد" : "Unified Portal Login"}</span>
                      </button>
                    )}

                    {/* Dark Mode Switcher */}
                    <button
                      onClick={() => onToggleDark()}
                      className="w-full py-2.5 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between border border-neutral-200/50 dark:border-neutral-700"
                    >
                      <span className="flex items-center gap-2">
                        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-500" />}
                        <span>{isDark ? (lang === "ar" ? "التبديل إلى الوضع الفاتح ☀️" : "Switch to Light Mode ☀️") : (lang === "ar" ? "التبديل إلى الوضع الداكن 🌙" : "Switch to Dark Mode 🌙")}</span>
                      </span>
                      <span className="text-[10px] font-mono opacity-60">
                        {isDark ? "Dark ON" : "Light ON"}
                      </span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      </header>

      {currentPublicPage === 'opportunities' ? (
        <OpportunitiesPage
          initiatives={initiatives}
          teams={teams}
          departments={departments}
          settings={settings}
          lang={lang}
          onBackToHome={() => {
            setCurrentPublicPage('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onJoinOpportunity={(opp) => {
            setSelectedOpportunityForJoin(opp);
            setSelectedJoinType("volunteer");
            setVolunteerStep(1);
            setIsJoinModalOpen(true);
          }}
          onOpenLogin={onOpenLogin}
        />
      ) : (
        <>
          {/* Main Content (البنية الدلالية لهيكل الصفحة) */}
          <main id="main-content" className={`flex-1 w-full ${isDark ? "bg-neutral-900 text-neutral-100" : "bg-white text-neutral-900"}`}>

      {/* 2. Hero Section (معرض صور متحرك في أعلى الصفحة الرئيسية) */}
      <section className="relative w-full min-h-[480px] sm:min-h-[560px] lg:min-h-[600px] bg-neutral-950 text-white text-center overflow-hidden flex flex-col">
        <HeroSlider
          slides={heroSlides && heroSlides.length > 0 ? heroSlides : (settings?.heroSlides || [])}
          fallbackImageUrl={settings?.videoCoverUrl || "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&h=900&fit=crop"}
          autoSlideInterval={1000}
          lang={lang}
        >
          {/* Content Over the Slider */}
          <div className="relative z-20 max-w-4xl mx-auto px-4 py-16 flex flex-col items-center">
            <motion.img 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              src={settings?.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop"} 
              alt="شعار ريادة العطاء" 
              className="w-20 h-20 rounded-full object-cover shadow-2xl mb-4 border border-white/20"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop";
              }}
            />

            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono"
            >
              {lang === "ar" ? settings?.associationNameAr : settings?.associationNameEn}
            </motion.p>

            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-4xl lg:text-5xl font-black mt-2 leading-tight tracking-tight"
            >
              {lang === "ar" ? settings?.heroTitleAr : settings?.heroTitleEn}
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-xs sm:text-sm text-neutral-300 mt-4 leading-relaxed max-w-2xl text-center"
            >
              {lang === "ar" ? settings?.heroDescAr : settings?.heroDescEn}
            </motion.p>

            {/* Action CTAs */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="flex flex-wrap items-center justify-center gap-3 mt-8"
            >
              <button
                id="hero-banner-join-btn"
                onClick={() => {
                  setSelectedJoinType("none");
                  setIsJoinModalOpen(true);
                }}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-full transition-all shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <span>{lang === "ar" ? "انضم إلينا الآن" : "Join Our Family"}</span>
                {lang === "ar" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onOpenLogin('volunteer')}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-full transition-all cursor-pointer"
              >
                {lang === "ar" ? "تسجيل دخول" : "Login"}
              </button>
              <a
                href="#about"
                className="px-6 py-3 bg-transparent hover:bg-white/5 text-neutral-200 font-bold text-xs rounded-full transition-all"
              >
                {lang === "ar" ? "تعرّف علينا" : "Discover Us"}
              </a>
            </motion.div>
          </div>
        </HeroSlider>
      </section>

      {/* 5. About Us Section (قسم من نحن) */}
      <section id="about" className="py-10 sm:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Text Info */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "التعريف بالجمعية الرسمية" : "Official NGO profile"}</span>
            </div>
            
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-800 dark:text-white select-text">
              {lang === "ar" ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : (settings?.associationNameEn || "Reyadat Al-Ata Association")}
            </h2>
            
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
              {lang === "ar" ? settings?.aboutUsAr : settings?.aboutUsEn}
            </p>

            {/* Vision & Mission Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800/80 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-black text-neutral-800 dark:text-white">{lang === "ar" ? "رؤيتنا" : "Our Vision"}</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {lang === "ar" ? settings?.visionAr : settings?.visionEn}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800/80 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-black text-neutral-800 dark:text-white">{lang === "ar" ? "رسالتنا" : "Our Mission"}</h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {lang === "ar" ? settings?.missionAr : settings?.missionEn}
                </p>
              </div>
            </div>
          </div>

          {/* Values, Objectives & visual graphics */}
          <div className="space-y-6 lg:pl-6">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full pointer-events-none"></div>
              <h3 className="text-xs font-black uppercase tracking-wider">{lang === "ar" ? "أهدافنا الاستراتيجية الخمسة" : "Our Five Strategic Objectives"}</h3>
              <ul className="space-y-2 text-[11px] text-emerald-100 pr-1">
                {(lang === "ar" ? settings?.goalsAr : settings?.goalsEn)?.map((g, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-white/20 text-white font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{g}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Core Values tags */}
            <div className="bg-neutral-50 dark:bg-neutral-800/30 p-6 rounded-2xl border border-neutral-100 dark:border-neutral-800 space-y-3">
              <h4 className="text-xs font-black text-neutral-800 dark:text-white">{lang === "ar" ? "قيمنا الحاكمة" : "Our Core Values"}</h4>
              <div className="flex flex-wrap gap-2">
                {(lang === "ar" ? settings?.valuesAr : settings?.valuesEn)?.map((val, idx) => (
                  <span key={idx} className="bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200/50 dark:border-neutral-700 px-3 py-1.5 rounded-lg text-[10px] font-bold">
                    {val}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 5.1 Organizational Structure Section (الهيكل الإداري للجمعية) */}
      {settings?.sectionVisibility?.orgChart !== false && (
        <OrgChartSection
          members={orgMembers && orgMembers.length > 0 ? orgMembers : (settings?.orgMembers || [])}
          lang={lang}
          associationName={lang === "ar" ? settings?.associationNameAr : settings?.associationNameEn}
        />
      )}

      {/* 6. Live Statistics (الإحصائيات المباشرة الفاخرة المتحركة عند التصفح) */}
      {settings?.sectionVisibility?.stats && (
        <section id="stats" className="py-10 sm:py-14 bg-gradient-to-b from-neutral-950 via-slate-900 to-neutral-950 text-white relative overflow-hidden border-y border-emerald-500/20 shadow-2xl">
          {/* Ambient Luxurious Glow Background */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto mb-8 sm:mb-12">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-bold tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 uppercase shadow-inner">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>{lang === "ar" ? "العطاء الميداني بلغة الأرقام الحية" : "Verified Live Operations Data"}</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-emerald-200">
                {lang === "ar" ? "أثر ريادة العطاء المباشر بمخطط العسيلة" : "Dynamic Operations Achievements"}
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-lg mx-auto">
                {lang === "ar" ? "تعد طاقات وإنجازات المتطوعين محرك الأثر التنموي في خدمة ضيوف الرحمن وأهالي مكة المكرمة" : "Volunteer efforts power our impact serving pilgrims and residents in Makkah."}
              </p>
            </div>

            {/* 5 Primary Stats Cards with Gold/Emerald Glow */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5 text-center">
              {/* Stat 1: Volunteers */}
              <motion.div 
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="p-6 rounded-3xl bg-neutral-900/90 border border-emerald-500/30 hover:border-emerald-400/80 shadow-lg hover:shadow-emerald-500/10 transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80 group-hover:opacity-100" />
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-3 flex items-center justify-center text-emerald-400">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-white mb-1">
                  <AnimatedCounter value={totalVolunteers} />
                </div>
                <p className="text-xs text-neutral-200 font-bold">{lang === "ar" ? "متطوع معتمد" : "Active Volunteers"}</p>
                <span className="text-[9px] font-semibold text-emerald-400/80 block mt-1">{lang === "ar" ? "بطاقة ذكية نشطة" : "Active Smart Pass"}</span>
              </motion.div>

              {/* Stat 2: Beneficiaries */}
              <motion.div 
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="p-6 rounded-3xl bg-neutral-900/90 border border-amber-500/30 hover:border-amber-400/80 shadow-lg hover:shadow-amber-500/10 transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400 opacity-80 group-hover:opacity-100" />
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto mb-3 flex items-center justify-center text-amber-400">
                  <Heart className="w-5 h-5 fill-current" />
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-white mb-1">
                  <AnimatedCounter value={totalBeneficiaries} />
                </div>
                <p className="text-xs text-neutral-200 font-bold">{lang === "ar" ? "مستفيد مكفول" : "Beneficiaries Helped"}</p>
                <span className="text-[9px] font-semibold text-amber-400/80 block mt-1">{lang === "ar" ? "رعاية غذائية وصحية" : "Food & Health Care"}</span>
              </motion.div>

              {/* Stat 3: Initiatives */}
              <motion.div 
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="p-6 rounded-3xl bg-neutral-900/90 border border-emerald-500/30 hover:border-emerald-400/80 shadow-lg hover:shadow-emerald-500/10 transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-400 opacity-80 group-hover:opacity-100" />
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 mx-auto mb-3 flex items-center justify-center text-teal-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-200 to-white mb-1">
                  <AnimatedCounter value={totalInitiatives} />
                </div>
                <p className="text-xs text-neutral-200 font-bold">{lang === "ar" ? "مبادرة تطوعية" : "Total Initiatives"}</p>
                <span className="text-[9px] font-semibold text-teal-400/80 block mt-1">{lang === "ar" ? "منظمة وميدانية" : "Organized Field Work"}</span>
              </motion.div>

              {/* Stat 4: Teams */}
              <motion.div 
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="p-6 rounded-3xl bg-neutral-900/90 border border-emerald-500/30 hover:border-emerald-400/80 shadow-lg hover:shadow-emerald-500/10 transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-80 group-hover:opacity-100" />
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 mx-auto mb-3 flex items-center justify-center text-cyan-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-white mb-1">
                  <AnimatedCounter value={totalTeams} />
                </div>
                <p className="text-xs text-neutral-200 font-bold">{lang === "ar" ? "فريق ميداني" : "Specialized Teams"}</p>
                <span className="text-[9px] font-semibold text-cyan-400/80 block mt-1">{lang === "ar" ? "قيادات معتمدة" : "Licensed Leaders"}</span>
              </motion.div>

              {/* Stat 5: Field Hours */}
              <motion.div 
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ y: -6, scale: 1.02 }}
                className="col-span-2 md:col-span-1 p-6 rounded-3xl bg-neutral-900/90 border border-amber-500/30 hover:border-amber-400/80 shadow-lg hover:shadow-amber-500/10 transition-all relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-emerald-400 opacity-80 group-hover:opacity-100" />
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto mb-3 flex items-center justify-center text-amber-300">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-emerald-300 to-white mb-1">
                  <AnimatedCounter value={totalHours} />
                </div>
                <p className="text-xs text-neutral-200 font-bold">{lang === "ar" ? "ساعة عمل ميداني" : "Field Work Hours"}</p>
                <span className="text-[9px] font-semibold text-amber-300/80 block mt-1">{lang === "ar" ? "مؤثرة وموثقة" : "Verified Impact"}</span>
              </motion.div>
            </div>

            {/* Sub Stats Row with Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 text-center text-xs">
              <div className="py-3.5 px-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="text-neutral-400 font-medium">{lang === "ar" ? "الإدارات النشطة" : "Active Depts"}:</span>
                <strong className="text-emerald-400 font-mono text-base font-black">
                  <AnimatedCounter value={totalDepts} />
                </strong>
              </div>
              <div className="py-3.5 px-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="text-neutral-400 font-medium">{lang === "ar" ? "شركاء النجاح والرعاة" : "Partners"}:</span>
                <strong className="text-emerald-400 font-mono text-base font-black">
                  <AnimatedCounter value={partnersList.length || 7} />
                </strong>
              </div>
              <div className="py-3.5 px-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="text-neutral-400 font-medium">{lang === "ar" ? "إجمالي نقاط التميز" : "Total Points"}:</span>
                <strong className="text-amber-400 font-mono text-base font-black">
                  <AnimatedCounter value={totalPoints} />
                </strong>
              </div>
              <div className="py-3.5 px-5 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center justify-between">
                <span className="text-neutral-400 font-medium">{lang === "ar" ? "الفرص التطوعية" : "Opportunities"}:</span>
                <strong className="text-emerald-400 font-mono text-base font-black">
                  <AnimatedCounter value={totalInitiatives * 2} />
                </strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. Latest Opportunity Section (آخر فرصة تطوعية منشورة ومفعلة فقط) */}
      {settings?.sectionVisibility?.initiatives && (
        <section id="initiatives" className="py-10 sm:py-14 bg-neutral-50 dark:bg-neutral-850 border-t border-neutral-200/60 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                    {lang === "ar" ? "الفرص التطوعية المتاحة" : "Volunteer Opportunities"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>{lang === "ar" ? "آخر فرصة منشورة ومتاحة" : "Latest Opportunity"}</span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  {lang === "ar" ? "أحدث فرصة تطوعية.. بادر بالعطاء" : "Latest Volunteer Opportunity"}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xl">
                  {lang === "ar" 
                    ? "نعرض لكم هنا أحدث فرصة تطوعية معتمدة ومفتوحة للانضمام المباشر، ويمكنكم تصفح كافة الفرص المتاحة من خلال زر عرض جميع الفرص."
                    : "Displaying the most recent active opportunity. Explore all initiatives by clicking View All Opportunities."}
                </p>
              </div>

              {/* View All Opportunities Button */}
              <button
                id="btn-view-all-opportunities-top"
                type="button"
                onClick={() => {
                  setCurrentPublicPage('opportunities');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="self-start sm:self-end px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-600/30 flex items-center gap-2 transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-4 h-4" />
                <span>{lang === "ar" ? `عرض جميع الفرص (${initiatives.length})` : `View All Opportunities (${initiatives.length})`}</span>
                {lang === "ar" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Single Featured Opportunity Card */}
            {latestOpportunity ? (
              <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xl overflow-hidden transition-all hover:shadow-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                  
                  {/* Opportunity Image with Status Overlay */}
                  <div className="lg:col-span-5 relative min-h-[220px] sm:min-h-[260px] lg:min-h-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
                    <img 
                      src={(latestOpportunity as any).imageUrl || (latestOpportunity as any).image || "https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=900&h=600&fit=crop"} 
                      alt={latestOpportunity.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent lg:hidden" />
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-black shadow-md text-white backdrop-blur-md flex items-center gap-1.5 ${
                        latestOpportunity.registrationStatus === 'open' && latestOpportunity.acceptedCount < latestOpportunity.neededCount
                          ? 'bg-emerald-600/90 border border-emerald-400/40' 
                          : 'bg-amber-600/90 border border-amber-400/40'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span>
                          {latestOpportunity.registrationStatus === 'open' && latestOpportunity.acceptedCount < latestOpportunity.neededCount
                            ? (lang === "ar" ? "مفتوحة للتسجيل" : "Open for Registration")
                            : (lang === "ar" ? "اكتملت المقاعد" : "Fully Booked")}
                        </span>
                      </span>
                    </div>

                    {/* Quick location tag overlay on mobile */}
                    <div className="absolute bottom-3 right-3 left-3 lg:hidden text-white">
                      <span className="text-xs font-bold bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{latestOpportunity.place}</span>
                      </span>
                    </div>
                  </div>

                  {/* Opportunity Details */}
                  <div className="lg:col-span-7 p-5 sm:p-7 lg:p-8 flex flex-col justify-between space-y-5">
                    <div className="space-y-3.5">
                      {/* Meta Tags */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl flex items-center gap-1.5 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{latestOpportunity.date}</span>
                        </span>
                        {latestOpportunity.time && (
                          <span className="text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-xl flex items-center gap-1.5 font-mono">
                            <Clock className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{latestOpportunity.time}</span>
                          </span>
                        )}
                        <span className="hidden sm:inline-flex text-xs font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-xl items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{latestOpportunity.place}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg sm:text-2xl font-black text-neutral-900 dark:text-white leading-snug">
                        {latestOpportunity.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-3 sm:line-clamp-4">
                        {latestOpportunity.description}
                      </p>

                      {/* Capacity & Progress */}
                      <div className="bg-neutral-50 dark:bg-neutral-800/60 rounded-2xl p-3.5 sm:p-4 border border-neutral-150 dark:border-neutral-800 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-emerald-600" />
                            <span>{lang === "ar" ? "المقاعد التطوعية:" : "Volunteer Seats:"}</span>
                          </span>
                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {latestOpportunity.acceptedCount} / {latestOpportunity.neededCount} {lang === "ar" ? "متطوع" : "volunteers"}
                          </span>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2 overflow-hidden">
                          <div 
                            className="bg-emerald-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, Math.round((latestOpportunity.acceptedCount / Math.max(1, latestOpportunity.neededCount)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                      {/* Join CTA */}
                      <button
                        id="btn-join-latest-opportunity"
                        disabled={latestOpportunity.registrationStatus !== 'open' || latestOpportunity.acceptedCount >= latestOpportunity.neededCount}
                        onClick={() => handleJoinInitiativeClick(latestOpportunity)}
                        className={`flex-1 py-2.5 sm:py-3 px-5 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                          latestOpportunity.registrationStatus === 'open' && latestOpportunity.acceptedCount < latestOpportunity.neededCount
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-emerald-600/30'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                        }`}
                      >
                        <Heart className="w-4 h-4 fill-current" />
                        <span>
                          {latestOpportunity.acceptedCount >= latestOpportunity.neededCount
                            ? (lang === "ar" ? "اكتملت المقاعد" : "Fully Booked")
                            : (lang === "ar" ? "الانضمام للفرصة" : "Apply to Opportunity")}
                        </span>
                      </button>

                      {/* Details Modal CTA */}
                      <button
                        id="btn-details-latest-opportunity"
                        onClick={() => setSelectedInit(latestOpportunity)}
                        className="py-2.5 sm:py-3 px-4 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs sm:text-sm rounded-xl transition-all border border-neutral-200 dark:border-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>{lang === "ar" ? "عرض الفرصة" : "View Opportunity"}</span>
                      </button>

                      {/* View All Opportunities CTA */}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPublicPage('opportunities');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="py-2.5 sm:py-3 px-4 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm rounded-xl transition-all border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <span>{lang === "ar" ? "عرض جميع الفرص" : "All Opportunities"}</span>
                        {lang === "ar" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              /* Fallback if no opportunities in DB */
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-8 text-center border border-neutral-200 dark:border-neutral-800">
                <Calendar className="w-12 h-12 text-neutral-400 mx-auto mb-3" />
                <h3 className="text-base font-black text-neutral-800 dark:text-white">
                  {lang === "ar" ? "لا توجد فرص تطوعية منشورة حالياً" : "No opportunities active currently"}
                </h3>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  {lang === "ar" ? "ترقبوا إطلاق الفرص التطوعية الجديدة قريباً أو استعرضوا أرشيف المبادرات السابقة." : "Stay tuned for new initiatives coming soon."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPublicPage('opportunities');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                >
                  {lang === "ar" ? "عرض جميع الفرص" : "View All Opportunities"}
                </button>
              </div>
            )}

          </div>
        </section>
      )}

      {/* 8. Top Volunteer & Team Showcase (أفضل متطوع وأفضل فريق تطوعي) */}
      <section id="top-volunteers-section" className="py-8 sm:py-12 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <VolunteerKnightsHomeCard
            volunteers={volunteers}
            teams={teams}
            initiatives={initiatives}
            lang={lang}
            onOpenLeaderboard={() => setShowKnightsModal(true)}
          />

          {/* Dedicated Full Leaderboard Modal */}
          {showKnightsModal && (
            <VolunteerKnightsModal
              isOpen={showKnightsModal}
              volunteers={volunteers}
              teams={teams}
              initiatives={initiatives}
              lang={lang}
              onClose={() => setShowKnightsModal(false)}
            />
          )}
        </div>
      </section>

      {/* 8. News & Announcements (الأخبار والإعلانات) */}
      {settings?.sectionVisibility?.news && (
        <section id="news" className="py-10 sm:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-2 max-w-xl mx-auto mb-12">
            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
              {lang === "ar" ? "منبر ريادة العطاء الصحفي المحدث" : "Association news bulletin"}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-white">
              {lang === "ar" ? "آخر مستجدات التنمية والعمل الخيري" : "News & Media Coverage"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {newsList.map(item => (
              <div 
                key={item.id} 
                className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800/80 shadow-xs overflow-hidden flex flex-col md:flex-row gap-4 hover:shadow-md transition-all"
              >
                <div className="w-full md:w-48 h-48 md:h-full relative shrink-0">
                  <img 
                    src={item.image || "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&h=400&fit=crop"} 
                    alt={item.titleAr} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 flex flex-col justify-between flex-1 space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">{item.date}</span>
                    <h3 className="text-xs sm:text-sm font-black text-neutral-850 dark:text-white leading-snug line-clamp-2">
                      {lang === "ar" ? item.titleAr : item.titleEn}
                    </h3>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                      {lang === "ar" ? item.bodyAr : item.bodyEn}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedNews(item)}
                    className="self-start text-[11px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{lang === "ar" ? "قراءة المزيد والتقارير" : "Read Full Story"}</span>
                    {lang === "ar" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 9. Achievements Timeline (الإنجازات المباشرة بالحركات) */}
      {settings?.sectionVisibility?.achievements && (
        <section className="py-10 sm:py-14 bg-gradient-to-br from-neutral-900 to-slate-950 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
              
              <div className="md:col-span-1 space-y-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{lang === "ar" ? "إنجازات فخورة ومستدامة" : "Our key achievements"}</span>
                <h3 className="text-lg font-black leading-tight text-white">{lang === "ar" ? "مسيرة ممتدة من العطاء والتمكين" : "The Legacy of Reyadat Al-Ata"}</h3>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  {lang === "ar" ? "نسير بخطى راسخة لتنمية مخطط العسيلة المكي وتحسين مستوى جودة خدمات رعاية الإنسان." : "We walk with firm steps to improve human services in Al-Asilah."}
                </p>
              </div>

              <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 relative">
                  <Award className="w-8 h-8 text-emerald-400 mb-3" />
                  <span className="text-2xl font-mono font-black text-white block">
                    <AnimatedCounter value="98%" />
                  </span>
                  <h4 className="text-xs font-bold text-neutral-200 mt-1">{lang === "ar" ? "نسبة رضا المستفيدين" : "Beneficiary Satisfaction"}</h4>
                  <p className="text-[10px] text-neutral-400 mt-1">{lang === "ar" ? "بناء على استطلاعات الرأي السنوية" : "Verified by annual surveys."}</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 relative">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mb-3" />
                  <span className="text-2xl font-mono font-black text-white block">
                    <AnimatedCounter value="100%" />
                  </span>
                  <h4 className="text-xs font-bold text-neutral-200 mt-1">{lang === "ar" ? "الامتثال والشفافية المالية" : "Financial Transparency"}</h4>
                  <p className="text-[10px] text-neutral-400 mt-1">{lang === "ar" ? "وفق معايير وزارة الموارد البشرية" : "Ministry of Human Resources standard."}</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/5 border border-white/5 relative">
                  <Users className="w-8 h-8 text-emerald-400 mb-3" />
                  <span className="text-2xl font-mono font-black text-white block">
                    <AnimatedCounter value="+20000" />
                  </span>
                  <h4 className="text-xs font-bold text-neutral-200 mt-1">{lang === "ar" ? "مستفيد تم خدمته بمكة" : "Meccans Served"}</h4>
                  <p className="text-[10px] text-neutral-400 mt-1">{lang === "ar" ? "منذ تأسيس وانطلاق أعمال الجمعية" : "Accumulated since launching."}</p>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* 11. Gallery Media (معرض الصور والفيديوهات تفاعلي بالكامل) */}
      {settings?.sectionVisibility?.gallery && (
        <section id="gallery" className="py-10 sm:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6 sm:mb-8">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                {lang === "ar" ? "الألبوم المرئي والمسموع للأنشطة" : "Media album & archives"}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-white">
                {lang === "ar" ? "معرض الصور ومقاطع الفيديو الميدانية" : "Reyadat Al-Ata Gallery & Activities"}
              </h2>
            </div>

            {/* Gallery Tabs */}
            <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 shrink-0">
              <button 
                onClick={() => setGalleryTab("all")} 
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${galleryTab === "all" ? "bg-white dark:bg-neutral-900 text-emerald-600 shadow-xs" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                {lang === "ar" ? "الكل" : "All"}
              </button>
              <button 
                onClick={() => setGalleryTab("photos")} 
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${galleryTab === "photos" ? "bg-white dark:bg-neutral-900 text-emerald-600 shadow-xs" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                {lang === "ar" ? "صور" : "Photos"}
              </button>
              <button 
                onClick={() => setGalleryTab("videos")} 
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${galleryTab === "videos" ? "bg-white dark:bg-neutral-900 text-emerald-600 shadow-xs" : "text-neutral-500 hover:text-neutral-700"}`}
              >
                {lang === "ar" ? "فيديو" : "Videos"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredGallery.map(item => (
              <div 
                key={item.id} 
                className="group relative h-64 rounded-3xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-850 shadow-xs"
              >
                {item.type === "photo" ? (
                  <img 
                    src={item.url} 
                    alt={item.titleAr} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full relative">
                    {/* Fallback to poster photo if video, we play mock button */}
                    <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center group-hover:bg-slate-950/20 transition-all z-10">
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                    {/* Video elements using mixkit loop */}
                    <video 
                      src={item.url} 
                      muted 
                      loop 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Dark gradient card text overlay */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent p-5 text-white z-20 flex flex-col justify-end h-32">
                  <span className="text-[9px] font-mono text-emerald-400">{item.date}</span>
                  <h4 className="text-xs font-bold mt-1 line-clamp-1">{lang === "ar" ? item.titleAr : item.titleEn}</h4>
                  <p className="text-[10px] text-neutral-300 mt-0.5 capitalize flex items-center gap-1">
                    {item.type === "video" ? <Video className="w-3.5 h-3.5 text-emerald-400" /> : <ImageIcon className="w-3.5 h-3.5 text-teal-400" />}
                    <span>{item.type === "video" ? (lang === "ar" ? "توثيق مرئي" : "Video documentation") : (lang === "ar" ? "ألبوم صور" : "Photo album")}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 10. Partners & Sponsors (شركاء النجاح - شريط متحرك احترافي مستمر يدعم عدد لا نهائي من الشركاء والتحكم الكامل) */}
      {settings?.sectionVisibility?.partners && (() => {
        const partnerSettings = settings?.partnersSectionSettings || {
          enabled: true,
          speed: 28,
          logoSize: "medium" as const,
          gap: "medium" as const,
          titleAr: "شركاء التنمية والنجاح والرعاة",
          titleEn: "Partners of Reyadat Al-Ata",
          subtitleAr: "الذين نعتز برعايتهم وتضافر جهودهم المباركة",
          subtitleEn: "OUR STRATEGIC ALLIANCES & VALUED PARTNERS"
        };

        if (partnerSettings.enabled === false) return null;

        // Default verified partners as base
        const defaultPartners: PartnerItem[] = [
          { id: "p-def-1", nameAr: "منصة إحسان الوطنية للعمل الخيري", nameEn: "Ehsan National Platform", logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&h=200&fit=crop", link: "https://ehsan.sa", category: "منصة وطنية", active: true, order: 1 },
          { id: "p-def-2", nameAr: "مؤسسة سليمان بن عبد العزيز الراجحي الخيرية", nameEn: "Sulaiman Al Rajhi Foundation", logo: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop", link: "https://rf.org.sa", category: "مؤسسة مانحة", active: true, order: 2 },
          { id: "p-def-3", nameAr: "المركز الوطني لتنمية القطاع غير الربحي", nameEn: "National Center for Non-Profit Sector", logo: "https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=200&h=200&fit=crop", link: "https://ncenter.gov.sa", category: "جهة إشرافية", active: true, order: 3 },
          { id: "p-def-4", nameAr: "وزارة الموارد البشرية والتنمية الاجتماعية", nameEn: "Ministry of Human Resources & Social Development", logo: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=200&h=200&fit=crop", link: "https://hrsd.gov.sa", category: "قطاع حكومي", active: true, order: 4 },
          { id: "p-def-5", nameAr: "المنصة الوطنية للعمل التطوعي (تطوع)", nameEn: "National Volunteer Platform", logo: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&h=200&fit=crop", link: "https://nvp.gov.sa", category: "منصة تطوعية", active: true, order: 5 },
          { id: "p-def-6", nameAr: "جمعية إكرام الجود لخدمة ضيوف الرحمن", nameEn: "Ekram Al-Jood Association", logo: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=200&h=200&fit=crop", link: "https://ekram.sa", category: "شريك قطاع ثالث", active: true, order: 6 },
          { id: "p-def-7", nameAr: "أمانة العاصمة المقدسة بمكة المكرمة", nameEn: "Holy Makkah Municipality", logo: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=200&h=200&fit=crop", link: "https://www.holymakkah.gov.sa", category: "قطاع بلدي حكومي", active: true, order: 7 }
        ];

        // Active user partners
        const userActive = (partnersList || []).filter(p => p.active !== false);

        // Combine user partners (prioritized) with default partners (if list is small)
        let displayList: PartnerItem[] = [];
        if (userActive.length > 0) {
          // Sort by user defined order
          const sortedUser = [...userActive].sort((a, b) => (a.order || 999) - (b.order || 999));
          // If fewer than 4 user partners, complement with defaults without duplicating IDs
          const existingIds = new Set(sortedUser.map(u => u.id));
          const complementary = defaultPartners.filter(d => !existingIds.has(d.id));
          displayList = [...sortedUser, ...(sortedUser.length < 5 ? complementary : [])];
        } else {
          displayList = defaultPartners;
        }

        // Loop array to ensure infinite seamless CSS/Framer scroll
        const loopList = [...displayList, ...displayList, ...displayList];

        // Dynamic size classes
        const logoDimensions = 
          partnerSettings.logoSize === "small" ? "w-12 h-10" :
          partnerSettings.logoSize === "large" ? "w-20 h-16" :
          "w-16 h-12"; // medium

        const cardGap = 
          partnerSettings.gap === "small" ? "gap-4" :
          partnerSettings.gap === "large" ? "gap-8" :
          "gap-6"; // medium

        const marqueeSpeed = Number(partnerSettings.speed) || 28;

        return (
          <section id="partners" className="py-8 sm:py-12 bg-neutral-50 dark:bg-neutral-900/90 border-y border-neutral-200/80 dark:border-neutral-800 overflow-hidden relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8">
              <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-widest bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-3 py-1 rounded-full inline-block mb-2">
                {lang === "ar" ? (partnerSettings.subtitleAr || "الذين نعتز برعايتهم وتضافر جهودهم") : (partnerSettings.subtitleEn || "OUR STRATEGIC ALLIANCES")}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                {lang === "ar" ? (partnerSettings.titleAr || "شركاء التنمية والنجاح والرعاة") : (partnerSettings.titleEn || "Partners of Reyadat Al-Ata")}
              </h2>
            </div>

            {/* Continuous Marquee Ticker Right to Left with pause on hover */}
            <div className="relative w-full overflow-hidden py-4">
              {/* Fade Gradient Overlay Edges */}
              <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-36 bg-gradient-to-l from-neutral-50 dark:from-neutral-900 to-transparent z-10 pointer-events-none" />
              <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-36 bg-gradient-to-r from-neutral-50 dark:from-neutral-900 to-transparent z-10 pointer-events-none" />

              <motion.div 
                className={`flex items-center ${cardGap} whitespace-nowrap w-max`}
                animate={{ x: ["0%", "-50%"] }}
                transition={{
                  x: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: marqueeSpeed,
                    ease: "linear"
                  }
                }}
                whileHover={{ animationPlayState: "paused" }}
              >
                {loopList.map((item, idx) => (
                  <a 
                    key={`${item.id}-${idx}`} 
                    href={item.link || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="group flex items-center gap-4 bg-white dark:bg-neutral-800/90 border border-neutral-200/90 dark:border-neutral-700/80 px-5 py-3 rounded-2xl shadow-xs hover:shadow-xl hover:border-emerald-500 dark:hover:border-emerald-400 transition-all transform hover:-translate-y-1 shrink-0"
                    title={item.link ? `زيارة الموقع الرسمي: ${item.nameAr}` : item.nameAr}
                  >
                    {/* Clear, High-Res Full Color Logo */}
                    <div className={`${logoDimensions} flex items-center justify-center p-1.5 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-100 dark:border-neutral-800 shrink-0`}>
                      <img 
                        src={item.logo} 
                        alt={item.nameAr} 
                        className="max-h-full max-w-full object-contain filter-none" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=150&h=150&fit=crop";
                        }}
                      />
                    </div>
                    {/* Partner Name, category and link indicator */}
                    <div className="text-right flex flex-col justify-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-neutral-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {lang === "ar" ? item.nameAr : item.nameEn}
                        </span>
                        {item.link && (
                          <ExternalLink className="w-2.5 h-2.5 text-neutral-400 group-hover:text-emerald-500 transition-colors shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-md inline-block border border-emerald-200/50 dark:border-emerald-800/50">
                          {item.category || (lang === "ar" ? "شريك معتمد" : "Verified Partner")}
                        </span>
                      </div>
                    </div>
                  </a>
                ))}
              </motion.div>
            </div>
          </section>
        );
      })()}

      {/* 13. Contact Us Section (تواصل معنا) */}
      <section id="contact" className="py-10 sm:py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10">
          
          {/* Contact details */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{lang === "ar" ? "نسعد بتواصلكم المباشر" : "Reach our support"}</span>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-800 dark:text-white">{lang === "ar" ? "معلومات التواصل والموقع الرسمي" : "Contact Details & Inquiries"}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {lang === "ar" 
                  ? "تسعد جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بمخطط العسيلة المكي بالرد على كافة أسئلة المتطوعين والمستفيدين والوفود الرسمية." 
                  : "We are glad to welcome your calls and custom queries during work hours."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{lang === "ar" ? "رقم الهاتف" : "Phone Call"}</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5" dir="ltr">{settings?.contactPhone}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{lang === "ar" ? "البريد الإلكتروني" : "Email"}</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">{settings?.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{lang === "ar" ? "العنوان السكني" : "Location"}</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {lang === "ar" ? settings?.contactLocationAr : settings?.contactLocationEn}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-700 dark:text-neutral-300">{lang === "ar" ? "ساعات العمل الرسمية" : "Duty Hours"}</h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {lang === "ar" ? settings?.contactHoursAr : settings?.contactHoursEn}
                  </p>
                </div>
              </div>
            </div>

            {/* Google Maps iFrame */}
            <div className="h-64 rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-800 shadow-xs relative mt-4">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14846.529068032738!2d39.914271810576356!3d21.463133379848507!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x15c2013f99aa9369%3A0xe54fe419996d92aa!2z2KfZhNi52LPZitmE2YfYjCDZhdmD2Kkg2KfZhNmF2YPYsdmF2Kk!5e0!3m2!1sar!2ssa!4v1700000000000" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          {/* Feedback Form */}
          <div className="bg-neutral-50 dark:bg-neutral-800/40 p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-neutral-800 dark:text-white mb-2">{lang === "ar" ? "أرسل رسالتك الفورية" : "Drop Us a Line"}</h3>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-6">
                {lang === "ar" ? "يمكنك تقديم الاقتراحات أو التقدم بطلب رعاية رسمي عبر هذا النموذج." : "Feel free to submit suggestions or general NGO partnership applications."}
              </p>
              
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">{lang === "ar" ? "الاسم الكامل" : "Your Name"}</label>
                  <input 
                    type="text" 
                    value={feedbackName}
                    onChange={(e) => setFeedbackName(e.target.value)}
                    required
                    className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">{lang === "ar" ? "البريد الإلكتروني" : "Your Email"}</label>
                  <input 
                    type="email" 
                    value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    required
                    className="w-full px-4 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 text-left font-mono" 
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">{lang === "ar" ? "مضمون الرسالة أو الاستفسار" : "Message text"}</label>
                  <textarea 
                    value={feedbackMsg}
                    onChange={(e) => setFeedbackMsg(e.target.value)}
                    required
                    rows={4}
                    className="w-full px-4 py-3 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed" 
                  />
                </div>

                <button 
                  type="submit"
                  disabled={isFeedbackSubmitting}
                  className="w-full py-2.5 bg-theme-primary text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:bg-neutral-300"
                >
                  <Send className="w-4 h-4" />
                  <span>{lang === "ar" ? "إرسال الرسالة لإدارة العلاقات" : "Send Inquiries"}</span>
                </button>
              </form>
            </div>
          </div>

        </div>
      </section>
      </main>

      {/* 14. Footer (الفوتر الرسمي) */}
      <footer className="bg-neutral-900 text-white pt-12 sm:pt-14 pb-36 sm:pb-40 lg:pb-12 border-t border-white/5 relative z-10 w-full overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img 
                src={settings?.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop"} 
                alt="ريادة العطاء" 
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="text-xs font-bold tracking-wider text-white select-text">
                {lang === "ar" ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Reyadat Al-Ata Association"}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 leading-relaxed">
              {lang === "ar" ? settings?.heroDescAr : settings?.heroDescEn}
            </p>
            <button
              type="button"
              onClick={() => setIsLicenseModalOpen(true)}
              className="group inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-white/5 border border-white/5 hover:border-emerald-400/40 px-2.5 py-1 rounded-md transition-all cursor-pointer hover:bg-white/10"
              title={lang === "ar" ? "اضغط لعرض وتكبير وثيقة الترخيص الرسمية" : "Click to view official license document"}
            >
              <img
                src={licenseImageUrl}
                alt="وثيقة الترخيص"
                className="w-4 h-3 object-cover rounded border border-emerald-400/40"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80";
                }}
              />
              <span>{lang === "ar" ? `رقم الترخيص: ${settings?.licenseNumber || "5081"}` : `Licence No: ${settings?.licenseNumber || "5081"}`}</span>
              <Maximize2 className="w-2.5 h-2.5 text-emerald-400" />
            </button>
          </div>

          {/* Col 2: Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white">{lang === "ar" ? "روابط تنقل سريعة" : "Navigation"}</h4>
            <ul className="text-[10px] text-neutral-400 space-y-2">
              <li><a href="#about" className="hover:text-emerald-400 transition-colors">{lang === "ar" ? "تعريف من نحن" : "About Us"}</a></li>
              {settings?.sectionVisibility?.orgChart !== false && <li><a href="#administrative-structure" className="hover:text-emerald-400 transition-colors">{lang === "ar" ? "الهيكل الإداري للجمعية" : "Organizational Structure"}</a></li>}
              {settings?.sectionVisibility?.stats && <li><a href="#stats" className="hover:text-emerald-400 transition-colors">{lang === "ar" ? "إحصائيات الأثر المباشر" : "Dynamic Stats"}</a></li>}
              {settings?.sectionVisibility?.initiatives && <li><a href="#initiatives" className="hover:text-emerald-400 transition-colors">{lang === "ar" ? "مبادرات التطوع بمكة" : "Active Initiatives"}</a></li>}
              {settings?.sectionVisibility?.news && <li><a href="#news" className="hover:text-emerald-400 transition-colors">{lang === "ar" ? "المركز الإعلامي والأخبار" : "Media coverage"}</a></li>}
              <li>
                <button
                  id="footer-send-letter-nav-btn"
                  type="button"
                  onClick={() => setIsLetterModalOpen(true)}
                  className="hover:text-emerald-400 transition-colors text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{lang === "ar" ? "إرسال خطاب" : "Send Letter"}</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Policies */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white">{lang === "ar" ? "الحوكمة والسياسات الرسمية" : "Governance"}</h4>
            <ul className="text-[10px] text-neutral-400 space-y-2">
              <li><a href="#" onClick={(e) => { e.preventDefault(); alert(lang === "ar" ? "سياسة الخصوصية وحماية بيانات المتطوعين معتمدة." : "Privacy Policy is certified."); }} className="hover:text-emerald-400 transition-colors">{lang === "ar" ? "سياسة خصوصية البيانات" : "Privacy Policy"}</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); alert(lang === "ar" ? "لائحة الحوكمة والتعامل المالي المعتمدة." : "Charity Governance regulations."); }} className="hover:text-emerald-400 transition-colors">{lang === "ar" ? "لائحة الحوكمة والامتثال" : "Charity Governance"}</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); alert(lang === "ar" ? "حقوق وواجبات المتطوع والمستفيد بالجمعية." : "Volunteer Charter."); }} className="hover:text-emerald-400 transition-colors">{lang === "ar" ? "ميثاق حقوق المستفيدين" : "Beneficiary Bill of Rights"}</a></li>
            </ul>
          </div>

          {/* Col 4: Social media icons with authentic brand visuals */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-white">{lang === "ar" ? "مواقع وحسابات التواصل الرسمية" : "Official Social Channels"}</h4>
            <div className="flex flex-wrap gap-2">
              {/* X / Twitter */}
              <a 
                href={settings?.socialTwitter || "https://twitter.com/riadataleata"} 
                target="_blank" 
                rel="noopener noreferrer" 
                title="منصة X"
                className="group flex items-center gap-2 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 rounded-xl transition-all shadow-sm hover:scale-105"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-[10px] font-bold">𝕏</span>
              </a>

              {/* Instagram */}
              <a 
                href={settings?.socialInstagram || "https://instagram.com/riadataleata"} 
                target="_blank" 
                rel="noopener noreferrer" 
                title="إنستغرام"
                className="group flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white rounded-xl transition-all shadow-sm hover:scale-105 hover:shadow-pink-500/20"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="text-[10px] font-bold">إنستغرام</span>
              </a>

              {/* YouTube */}
              <a 
                href={settings?.socialYoutube || "https://youtube.com/riadataleata"} 
                target="_blank" 
                rel="noopener noreferrer" 
                title="يوتيوب"
                className="group flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all shadow-sm hover:scale-105 hover:shadow-red-600/30"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span className="text-[10px] font-bold">يوتيوب</span>
              </a>

              {/* Snapchat */}
              <a 
                href={settings?.socialSnapchat || "https://snapchat.com/add/riadataleata"} 
                target="_blank" 
                rel="noopener noreferrer" 
                title="سناب شات"
                className="group flex items-center gap-2 px-3 py-2 bg-[#FFFC00] hover:bg-[#f0ed00] text-neutral-900 rounded-xl transition-all shadow-sm hover:scale-105 hover:shadow-yellow-400/30 font-bold"
              >
                <svg className="w-3.5 h-3.5 fill-current text-black" viewBox="0 0 24 24">
                  <path d="M12.002 2c-3.901 0-6.195 2.766-6.195 5.82 0 1.258.423 2.378 1.11 3.235.158.196.222.443.153.682-.132.457-.655.857-1.161.857-.353 0-.672-.186-.96-.341-.219-.118-.458-.236-.71-.236-.39 0-.756.248-.838.648-.12.585.347 1.096.864 1.487.896.678 1.97 1.01 2.915 1.01.218 0 .438-.018.65-.052.127-.02.257.017.348.102.664.622 1.83 1.206 3.824 1.206 1.995 0 3.161-.584 3.825-1.206.091-.085.22-.122.348-.102.212.034.432.052.65.052.945 0 2.019-.332 2.915-1.01.517-.391.984-.902.864-1.487-.082-.4-.448-.648-.838-.648-.252 0-.491.118-.71.236-.288.155-.607.341-.96.341-.506 0-1.029-.4-1.161-.857-.069-.239-.005-.486.153-.682.687-.857 1.11-1.977 1.11-3.235 0-3.054-2.294-5.82-6.195-5.82z"/>
                </svg>
                <span className="text-[10px] font-bold">سناب شات</span>
              </a>

              {/* WhatsApp Direct */}
              <a 
                href="https://wa.me/966550123456" 
                target="_blank" 
                rel="noopener noreferrer" 
                title="واتساب المباشر"
                className="group flex items-center gap-2 px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl transition-all shadow-sm hover:scale-105 hover:shadow-emerald-500/20 font-bold"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span className="text-[10px] font-bold">واتساب</span>
              </a>
            </div>
            <div>
              <p className="text-[9px] text-neutral-500 leading-normal">
                {lang === "ar" ? "مخطط العسيلة - الشارع التجاري العام - مكة المكرمة" : "Al-Asilah Scheme, Public Commercial St, Mecca, Saudi Arabia."}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom banner: Official Send Letter for visitors */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="bg-gradient-to-r from-emerald-900/60 via-neutral-850 to-neutral-900 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5 text-right w-full sm:w-auto">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-white">
                    {lang === "ar" ? "المراسلات والخطابات الرسمية" : "Official Correspondence"}
                  </h4>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    {lang === "ar" ? "متاح للجميع بدون تسجيل دخول" : "Open for Visitors"}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5">
                  {lang === "ar"
                    ? "هل تود إرسال خطاب رسمي أو مقترح مبادرة وشراكة مجتمعية لإدارة الجمعية؟"
                    : "Would you like to send an official letter or partnership proposal to management?"}
                </p>
              </div>
            </div>
            <button
              id="footer-send-letter-cta-btn"
              type="button"
              onClick={() => setIsLetterModalOpen(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{lang === "ar" ? "إرسال خطاب" : "Send Letter"}</span>
            </button>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-white/5 pt-6 text-center text-[10px] text-neutral-500 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© {new Date().getFullYear()} {lang === "ar" ? "جميع الحقوق محفوظة لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة." : "Reyadat Al-Ata Association. All rights reserved."}</p>
          <div className="flex gap-4">
            <span className="font-mono">VER 2.5 | VITE HYBRID</span>
            <span className="font-bold text-neutral-400">تحت إشراف المركز الوطني لتنمية القطاع غير الربحي</span>
          </div>
        </div>
      </footer>
      </>
      )}

      {/* 2.5 Official License Document Preview Modal (نافذة عرض وتكبير وثيقة الترخيص الرسمية رقم 5081) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isLicenseModalOpen && (
            <div className="fixed inset-0 z-[99999] overflow-y-auto flex items-center justify-center p-3 sm:p-5" dir={lang === "ar" ? "rtl" : "ltr"}>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLicenseModalOpen(false)}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-0 cursor-pointer"
              />

              {/* Modal Box */}
              <motion.div 
                initial={{ scale: 0.92, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 16 }}
                className="relative bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl z-20 border border-emerald-500/20 text-right overflow-hidden my-auto"
                onClick={(e) => e.stopPropagation()}
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-neutral-900 dark:text-white">
                        {lang === "ar" ? "وثيقة تسجيل وترخيص الجمعية الرسمية" : "Official NGO Registration & License"}
                      </h3>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                        {lang === "ar" ? "رقم الترخيص: 5081 | المركز الوطني لتنمية القطاع غير الربحي" : "License No: 5081 | National Center for Non-Profit Sector"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsLicenseModalOpen(false)}
                    className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors cursor-pointer"
                    title={lang === "ar" ? "إغلاق" : "Close"}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* High-res Image Preview */}
                <div className="relative rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-inner flex items-center justify-center max-h-[65vh]">
                  <img
                    src={licenseImageUrl}
                    alt="شهادة تسجيل وترخيص الجمعية الرسمية رقم 5081"
                    className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl select-none"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80";
                    }}
                  />
                </div>

                {/* Footer Controls */}
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                    {lang === "ar" ? "الجهة المصرحة: المركز الوطني لتنمية القطاع غير الربحي - مكة المكرمة" : "Authorized by: National Center for Non-Profit Sector - Makkah"}
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <a
                      href={licenseImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 text-xs font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{lang === "ar" ? "فتح بدقة كاملة" : "Open Full Image"}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const win = window.open('');
                        win?.document.write(`
                          <html>
                            <head><title>وثيقة الترخيص رقم 5081</title></head>
                            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff;">
                              <img src="${licenseImageUrl}" style="max-width:95%;max-height:95vh;object-contain:fit;" onload="window.print();window.close()"/>
                            </body>
                          </html>
                        `);
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{lang === "ar" ? "طباعة الوثيقة" : "Print License"}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 3. "Join Now" / "انضم الآن" MODAL (Rendered with React Portal to guarantee top-level visibility and prevent black screen / overlay issues) */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isJoinModalOpen && (
            <div className="fixed inset-0 z-[9999] overflow-y-auto flex items-center justify-center p-3 sm:p-4 md:p-6" dir={lang === "ar" ? "rtl" : "ltr"}>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setIsJoinModalOpen(false); setSelectedJoinType("none"); }}
                className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-0 cursor-pointer"
              />

              {/* Modal Box */}
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 16 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 16 }}
                className={`relative bg-white dark:bg-neutral-900 rounded-3xl ${selectedJoinType === "volunteer" ? "max-w-3xl" : "max-w-lg"} w-full p-5 sm:p-7 shadow-2xl z-20 border border-neutral-150 dark:border-neutral-800 text-right max-h-[92vh] overflow-y-auto ${isDark ? "text-white" : "text-neutral-900"} my-auto`}
                onClick={(e) => e.stopPropagation()}
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
              <button
                onClick={() => { setIsJoinModalOpen(false); setSelectedJoinType("none"); resetRegForm(); }}
                className="absolute top-4 left-4 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>

              <div className="border-b border-neutral-100 dark:border-neutral-800 pb-3 mb-4 pr-1">
                <h3 className="text-sm font-black flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <Heart className="w-5 h-5 fill-current" />
                  <span>{lang === "ar" ? "الانضمام لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Join Reyadat Al-Ata Association"}</span>
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                  {lang === "ar" ? "يرجى اختيار نوع الانضمام المناسب لخدمتك واحتياجك المباشر:" : "Choose the right path for your target profile:"}
                </p>
              </div>

              {selectedJoinType === "none" && (
                <div className="space-y-3 mt-4">
                  {/* Option 1: Volunteer */}
                  <button
                    onClick={() => setSelectedJoinType("volunteer")}
                    className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:border-emerald-500/30 border border-neutral-150 dark:border-neutral-800 text-right transition-all flex items-start gap-4 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-white">{lang === "ar" ? "الانضمام كمتطوع معتمد" : "Join as Certified Volunteer"}</h4>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                        شارك بمهاراتك وساعات العمل الميداني في مبادرات خدمة ضيوف الرحمن وأهالي العسيلة بمكة المكرمة.
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Join as Volunteer Team */}
                  <button
                    onClick={() => {
                      setIsJoinModalOpen(false);
                      setIsTeamModalOpen(true);
                    }}
                    className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-500/30 border border-neutral-150 dark:border-neutral-800 text-right transition-all flex items-start gap-4 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-neutral-800 dark:text-white">{lang === "ar" ? "الانضمام كفريق تطوعي تحت الجمعية" : "Join as Volunteer Team"}</h4>
                        <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">جديد</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                        انضم كفريق تطوعي وكن جزءاً من ريادة العطاء .. فريق واحد .. أثر واحد.
                      </p>
                    </div>
                  </button>

                  {/* Option 3: Beneficiary */}
                  <button
                    onClick={() => setSelectedJoinType("beneficiary")}
                    className="w-full p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-500/30 border border-neutral-150 dark:border-neutral-800 text-right transition-all flex items-start gap-4 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <Heart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-white">{lang === "ar" ? "الانضمام كمستفيد (طلب مساعدة)" : "Register as Beneficiary (Request Aid)"}</h4>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                        تسجيل ملف أسرة للحصول على الدعم والمساعدات العينية والتموينية والطبية المستحقة بالعسيلة.
                      </p>
                    </div>
                  </button>

                  {/* Option 4: Join Initiatives Directly (ينقل لتسجيل الدخول إذا لم يكن مسجلاً) */}
                  <button
                    onClick={() => {
                      setIsJoinModalOpen(false);
                      if (currentVolunteer) {
                        const el = document.getElementById("initiatives");
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        alert(lang === "ar" ? "يرجى تسجيل الدخول أولاً للتمكن من الانضمام للمبادرات التطوعية واحتساب ساعاتك المعتمدة." : "Please login first to join volunteer initiatives and track your hours.");
                        onOpenLogin('volunteer');
                      }
                    }}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-600/5 to-transparent dark:from-emerald-950/40 dark:via-neutral-800/60 border border-emerald-500/30 hover:border-emerald-500 text-right transition-all flex items-start gap-4 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">{lang === "ar" ? "الانضمام للمبادرات التطوعية المفتوحة" : "Join Open Initiatives"}</h4>
                        <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">يتطلب دخول</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 leading-normal">
                        تصفح والتقديم المباشر على فرص ومبادرات الجمعية الميدانية واحتساب الساعات التطوعية فورياً.
                      </p>
                    </div>
                  </button>

                  {/* Login Link Bar for Existing Users */}
                  <div className="pt-3 mt-1 border-t border-neutral-200/80 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-neutral-50/70 dark:bg-neutral-800/40 p-3 rounded-2xl">
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 font-bold">
                      {lang === "ar" ? "لديك حساب مسجل بالفعل في منصة ريادة العطاء؟" : "Already registered?"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsJoinModalOpen(false);
                        onOpenLogin('volunteer');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>{lang === "ar" ? "تسجيل الدخول إلى حسابك" : "Sign In to Account"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Registration: VOLUNTEER FULL APPLICATION FORM (MULTI-STEP WIZARD) */}
              {selectedJoinType === "volunteer" && (
                <form 
                  onSubmit={(e) => {
                    if (volunteerStep < 4) {
                      handleVolunteerStepNext(e);
                    } else {
                      handleRegisterVolunteerSubmit(e);
                    }
                  }} 
                  className="space-y-4 mt-2 text-right"
                >
                  {/* Opportunity Pre-selection Banner */}
                  {selectedOpportunityForJoin && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/50 dark:via-teal-950/40 dark:to-emerald-950/50 border-2 border-emerald-500/40 dark:border-emerald-600/50 shadow-sm flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-600 text-white flex-shrink-0 mt-0.5">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                            أنت تسجل الآن في فرصة: {selectedOpportunityForJoin.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedOpportunityForJoin(null)}
                            className="text-[11px] text-slate-400 hover:text-rose-600 underline font-bold cursor-pointer"
                          >
                            إلغاء ربط الفرصة
                          </button>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                          <span>كود الفرصة: <strong className="font-mono font-black">#{selectedOpportunityForJoin.opportunityCode || selectedOpportunityForJoin.id}</strong></span>
                          <span>الموقع: {selectedOpportunityForJoin.place}</span>
                          <span>التاريخ: {selectedOpportunityForJoin.date}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Login Prompt for Existing Users */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400 font-medium">
                      {lang === "ar" ? "لديك حساب متطوع مسجل بالفعل؟" : "Already have an account?"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsJoinModalOpen(false);
                        onOpenLogin('volunteer');
                      }}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>{lang === "ar" ? "تسجيل الدخول" : "Login"}</span>
                    </button>
                  </div>

                  {/* Step Progress Tracker Bar */}
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>
                          {volunteerStep === 1 && "المرحلة 1 من 4: البيانات الأساسية والهوية"}
                          {volunteerStep === 2 && "المرحلة 2 من 4: بيانات التواصل والعنوان"}
                          {volunteerStep === 3 && "المرحلة 3 من 4: الحالة الصحية ورقم الطوارئ"}
                          {volunteerStep === 4 && "المرحلة 4 من 4: الخبرات وميثاق التطوع"}
                        </span>
                      </span>
                      <span className="text-[11px] font-mono font-black bg-emerald-200/60 dark:bg-emerald-900 px-2.5 py-0.5 rounded-full text-emerald-900 dark:text-emerald-100">
                        {volunteerStep === 1 && "25%"}
                        {volunteerStep === 2 && "50%"}
                        {volunteerStep === 3 && "75%"}
                        {volunteerStep === 4 && "100%"}
                      </span>
                    </div>

                    <div className="w-full bg-emerald-200/50 dark:bg-emerald-900/50 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 dark:bg-emerald-400 h-full transition-all duration-300 rounded-full" 
                        style={{ width: `${volunteerStep * 25}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {[
                        { step: 1, label: "الأساسية" },
                        { step: 2, label: "التواصل" },
                        { step: 3, label: "الصحة" },
                        { step: 4, label: "الميثاق" },
                      ].map((item) => (
                        <div 
                          key={item.step}
                          className={`py-1 text-center rounded-lg text-[10px] font-bold transition-all ${
                            item.step < volunteerStep 
                              ? 'bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200' 
                              : item.step === volunteerStep 
                              ? 'bg-emerald-600 text-white shadow-xs' 
                              : 'bg-white/60 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                          }`}
                        >
                          {item.step < volunteerStep ? "✓" : item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* STAGE 1: البيانات الأساسية والهوية */}
                  {volunteerStep === 1 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-emerald-700 dark:text-emerald-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        <span>1. البيانات الشخصية والهوية</span>
                      </h5>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            الاسم الكامل (رباعي) <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            required
                            placeholder="أحمد بن علي بن سعيد الغامدي"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            رقم الهوية الوطنية / الإقامة (10 خانات) <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={regNationalId}
                            onChange={(e) => setRegNationalId(e.target.value)}
                            required
                            maxLength={10}
                            placeholder="1098765432"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-left font-bold"
                            dir="ltr"
                          />
                        </div>

                        {/* TEAM SELECTION FIELD (حقل اختيار الفريق الذي يرغب بالانضمام إليه) */}
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1 flex items-center justify-between">
                            <span>اختر الفريق الذي ترغب بالانضمام إليه <span className="text-rose-500">*</span></span>
                            {teams.length > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                ({teams.length} فرق متاحة في النظام)
                              </span>
                            )}
                          </label>
                          <div className="relative">
                            <select
                              id="reg-volunteer-team-select"
                              value={regTeam}
                              onChange={(e) => setRegTeam(e.target.value)}
                              required
                              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold cursor-pointer"
                            >
                              <option value="">-- اختر الفريق الذي ترغب بالانضمام إليه --</option>
                              {teams.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nameAr} {t.leaderName ? `(قائد الفريق: ${t.leaderName})` : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                          {regTeam ? (
                            <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between font-bold">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>الفريق المختار: {teams.find(t => t.id === regTeam)?.nameAr}</span>
                              </div>
                              <span className="text-[10px] text-neutral-500 dark:text-neutral-400">سيتم ربط عضويتك بهذا الفريق تلقائياً</span>
                            </div>
                          ) : (
                            <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                              اختر الفريق الذي يناسب مهاراتك وشغفك للانضمام إليه مباشرة.
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">الجنس</label>
                            <select
                              value={regGender}
                              onChange={(e) => setRegGender(e.target.value as 'male' | 'female')}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                            >
                              <option value="male">ذكر</option>
                              <option value="female">أنثى</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">الجنسية</label>
                            <input 
                              type="text" 
                              value={regNationality}
                              onChange={(e) => setRegNationality(e.target.value)}
                              required
                              placeholder="سعودي"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">تاريخ الميلاد</label>
                            <input 
                              type="date" 
                              value={regBirthDate}
                              onChange={(e) => setRegBirthDate(e.target.value)}
                              required
                              className="w-full px-2 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                            />
                          </div>
                        </div>

                        {/* Photo & ID Section based on Gender */}
                        <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 space-y-4">
                          {regGender === 'male' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full items-start isolate">
                              <div className="w-full min-w-0">
                                <ImagePickerControl
                                  label="الصورة الشخصية للبطاقة الرقمية *"
                                  description="صورة رسمية بخلفية واضحة للبطاقة العضوية"
                                  value={regPhoto}
                                  onChange={(val) => setRegPhoto(val)}
                                  aspectRatio="avatar"
                                />
                              </div>
                              <div className="w-full min-w-0">
                                <ImagePickerControl
                                  label="صورة الهوية الوطنية / الإقامة *"
                                  description="صورة واضحة لبطاقة الهوية للتحقق"
                                  value={regIdPhoto}
                                  onChange={(val) => setRegIdPhoto(val)}
                                  aspectRatio="banner"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 w-full isolate">
                              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 text-xs text-purple-900 dark:text-purple-200 space-y-1">
                                <div className="font-bold flex items-center gap-1.5">
                                  <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                                  <span>🌸 خصوصية المتطوعات (العنصر النسائي):</span>
                                </div>
                                <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                                  لحفظ الخصوصية، يتم اعتماد الصورة الشخصية الرسمية الموحدة لجميع المتطوعات على بطاقات التطوع الرقمية. مطلوب فقط إرفاق صورة الهوية الوطنية للتحقق الإداري.
                                </p>
                              </div>

                              <div className="w-full min-w-0 max-w-xl mx-auto">
                                <ImagePickerControl
                                  label="صورة الهوية الوطنية / الإقامة *"
                                  description="صورة واضحة لبطاقة الهوية للتحقق الإداري فقط"
                                  value={regIdPhoto}
                                  onChange={(val) => setRegIdPhoto(val)}
                                  aspectRatio="banner"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 2: بيانات التواصل والعنوان */}
                  {volunteerStep === 2 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-emerald-700 dark:text-emerald-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>2. بيانات التواصل والعنوان</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            رقم الجوال الفعال <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="tel" 
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            required
                            placeholder="0551234567"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-left font-mono font-bold"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">البريد الإلكتروني (اختياري)</label>
                          <input 
                            type="email" 
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="ahmed@example.com"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-left font-mono"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">المجال / المنصب المرغوب</label>
                          <input 
                            type="text" 
                            value={regPosition}
                            onChange={(e) => setRegPosition(e.target.value)}
                            placeholder="متطوع ميداني / إعلامي / تنظيم"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">العنوان والحي السكني</label>
                          <input 
                            type="text" 
                            value={regAddress}
                            onChange={(e) => setRegAddress(e.target.value)}
                            placeholder="مكة المكرمة - مخطط العسيلة"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 3: الحالة الصحية ورقم الطوارئ */}
                  {volunteerStep === 3 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-rose-600 dark:text-rose-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-500" />
                        <span>3. الحالة الصحية ورقم الطوارئ</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">فصيلة الدم</label>
                          <select
                            value={regBloodType}
                            onChange={(e) => setRegBloodType(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold font-mono"
                          >
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">هل تعاني من أمراض مزمنة؟</label>
                          <select
                            value={regHasChronicIllness ? "yes" : "no"}
                            onChange={(e) => setRegHasChronicIllness(e.target.value === "yes")}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                          >
                            <option value="no">لا (لائق طبياً ولله الحمد)</option>
                            <option value="yes">نعم (يوجد توضيح)</option>
                          </select>
                        </div>
                      </div>

                      {regHasChronicIllness && (
                        <div>
                          <label className="block text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">تفاصيل المرض والاحتياطات الطبية</label>
                          <input
                            type="text"
                            value={regIllnessDetails}
                            onChange={(e) => setRegIllnessDetails(e.target.value)}
                            placeholder="اكتب تفاصيل الاحتياط (مثال: ربو خفيف، ضغط دم...)"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">اسم ولي الأمر / القريب للطوارئ</label>
                          <input 
                            type="text" 
                            value={regGuardianName}
                            onChange={(e) => setRegGuardianName(e.target.value)}
                            placeholder="إبراهيم الغامدي"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">جوال ولي الأمر للطوارئ</label>
                          <input 
                            type="tel" 
                            value={regGuardianPhone}
                            onChange={(e) => setRegGuardianPhone(e.target.value)}
                            placeholder="0501112233"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 text-left font-mono"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 4: الخبرات والميثاق */}
                  {volunteerStep === 4 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-emerald-700 dark:text-emerald-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600" />
                        <span>4. الخبرات وميثاق التطوع</span>
                      </h5>

                      <div>
                        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">الخبرات والدورات التدريبية المكتسبة</label>
                        <textarea 
                          value={regExperiences}
                          onChange={(e) => setRegExperiences(e.target.value)}
                          placeholder="اذكر الخبرات التطوعية السابقة أو الدورات في الإسعاف والتنظيم..."
                          rows={2}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-xs space-y-1">
                        <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>📄 ميثاق التطوع بجمعية ريادة العطاء لخدمة الإنسان بالعسيلة:</span>
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-300 text-[11px] leading-relaxed">
                          يتضمن الميثاق التزام المتطوع بالسلوك القويم، المحافظة على سرية البيانات، والالتزام بالزي والتوقيت المحدد للميدان.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 pt-1">
                        <input 
                          type="checkbox"
                          id="agreedTerms"
                          checked={regAgreedToTerms}
                          onChange={(e) => setRegAgreedToTerms(e.target.checked)}
                          className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer shrink-0 mt-0.5"
                        />
                        <label htmlFor="agreedTerms" className="text-xs font-bold text-neutral-800 dark:text-neutral-200 cursor-pointer leading-tight">
                          أتعهد بصحة البيانات المدخلة والموافقة التامة على ميثاق التطوع والالتزام بالأنظمة.
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Wizard Bottom Nav Buttons */}
                  <div className="flex gap-2 justify-between items-center pt-3 border-t border-neutral-150 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (volunteerStep > 1) {
                            setVolunteerStep(volunteerStep - 1);
                          } else {
                            setSelectedJoinType("none");
                          }
                        }}
                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                      >
                        {volunteerStep === 1 ? "إلغاء / رجوع" : "السابق"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsJoinModalOpen(false);
                          onOpenLogin('volunteer');
                        }}
                        className="text-xs text-neutral-500 hover:text-emerald-600 dark:text-neutral-400 dark:hover:text-emerald-400 font-bold transition-colors"
                      >
                        العودة لتسجيل الدخول
                      </button>
                    </div>

                    {volunteerStep < 4 ? (
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>التالي</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isRegSubmitting || !regAgreedToTerms}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isRegSubmitting ? 'جاري التقديم...' : 'إرسال طلب الانضمام'}</span>
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Registration: VOLUNTEER TEAM FULL APPLICATION FORM (MULTI-STEP WIZARD) */}
              {selectedJoinType === "leader" && (
                <form 
                  onSubmit={(e) => {
                    if (teamStep < 4) {
                      handleTeamStepNext(e);
                    } else {
                      handleRegisterTeamSubmit(e);
                    }
                  }} 
                  className="space-y-4 mt-2 text-right"
                >
                  {/* Step Progress Tracker Bar */}
                  <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-2xl border border-blue-200/80 dark:border-blue-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-900 dark:text-blue-200">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                        <span>
                          {teamStep === 1 && "المرحلة 1 من 4: معلومات الفريق الأساسية"}
                          {teamStep === 2 && "المرحلة 2 من 4: بيانات قائد الفريق"}
                          {teamStep === 3 && "المرحلة 3 من 4: رؤية ورسالة وأهداف الفريق"}
                          {teamStep === 4 && "المرحلة 4 من 4: فكرة هادفة وشعار الفريق"}
                        </span>
                      </span>
                      <span className="text-[11px] font-mono font-black bg-blue-200/60 dark:bg-blue-900 px-2.5 py-0.5 rounded-full text-blue-900 dark:text-blue-100">
                        {teamStep === 1 && "25%"}
                        {teamStep === 2 && "50%"}
                        {teamStep === 3 && "75%"}
                        {teamStep === 4 && "100%"}
                      </span>
                    </div>

                    <div className="w-full bg-blue-200/50 dark:bg-blue-900/50 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 dark:bg-blue-400 h-full transition-all duration-300 rounded-full" 
                        style={{ width: `${teamStep * 25}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-1 pt-1">
                      {[
                        { step: 1, label: "الفريق" },
                        { step: 2, label: "القائد" },
                        { step: 3, label: "الأهداف" },
                        { step: 4, label: "الشعار" },
                      ].map((item) => (
                        <div 
                          key={item.step}
                          className={`py-1 text-center rounded-lg text-[10px] font-bold transition-all ${
                            item.step < teamStep 
                              ? 'bg-blue-200/80 text-blue-900 dark:bg-blue-900 dark:text-blue-200' 
                              : item.step === teamStep 
                              ? 'bg-blue-600 text-white shadow-xs' 
                              : 'bg-white/60 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                          }`}
                        >
                          {item.step < teamStep ? "✓" : item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* STAGE 1: المعلومات الأساسية */}
                  {teamStep === 1 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-blue-700 dark:text-blue-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span>1. المعلومات الأساسية للفريق</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            اسم الفريق <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            required
                            placeholder="مثال: فريق العطاء التطوعي"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            المدينة <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={teamCity}
                            onChange={(e) => setTeamCity(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          >
                            <option value="">-- اختر المدينة --</option>
                            <option value="مكة المكرمة">مكة المكرمة</option>
                            <option value="جدة">جدة</option>
                            <option value="الرياض">الرياض</option>
                            <option value="المدينة المنورة">المدينة المنورة</option>
                            <option value="الطائف">الطائف</option>
                            <option value="الدمام">الدمام</option>
                            <option value="الخبر">الخبر</option>
                            <option value="الأحساء">الأحساء</option>
                            <option value="القصيم">القصيم</option>
                            <option value="أبها">أبها</option>
                            <option value="تبوك">تبوك</option>
                            <option value="نجران">نجران</option>
                            <option value="جازان">جازان</option>
                            <option value="حائل">حائل</option>
                            <option value="أخرى">أخرى</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            تاريخ التأسيس <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="date" 
                            value={teamEstablishedDate}
                            onChange={(e) => setTeamEstablishedDate(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            عدد الأعضاء <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="number" 
                            min={1}
                            value={teamMembersCount}
                            onChange={(e) => setTeamMembersCount(Number(e.target.value))}
                            required
                            placeholder="1"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            عدد المبادرات المنفذة
                          </label>
                          <input 
                            type="number" 
                            min={0}
                            value={teamInitiativesCount}
                            onChange={(e) => setTeamInitiativesCount(Number(e.target.value))}
                            placeholder="0"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                          لون الفريق المميز <span className="text-rose-500">*</span>
                        </label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="color" 
                            value={teamColor}
                            onChange={(e) => setTeamColor(e.target.value)}
                            className="w-10 h-10 p-1 rounded-xl border border-neutral-300 dark:border-neutral-700 cursor-pointer shrink-0 bg-white"
                          />
                          <input 
                            type="text" 
                            value={teamColor}
                            onChange={(e) => setTeamColor(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-left font-bold"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 2: بيانات قائد الفريق */}
                  {teamStep === 2 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-blue-700 dark:text-blue-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span>2. بيانات قائد الفريق</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            اسم القائد <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={teamLeaderName}
                            onChange={(e) => setTeamLeaderName(e.target.value)}
                            required
                            placeholder="الاسم الكامل للقائد"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            رقم الجوال <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="tel" 
                            value={teamLeaderPhone}
                            onChange={(e) => setTeamLeaderPhone(e.target.value)}
                            required
                            placeholder="05xxxxxxxx"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-left font-bold"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                          البريد الإلكتروني (اختياري)
                        </label>
                        <input 
                          type="email" 
                          value={teamLeaderEmail}
                          onChange={(e) => setTeamLeaderEmail(e.target.value)}
                          placeholder="example@email.com"
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}

                  {/* STAGE 3: رؤية ورسالة وأهداف الفريق */}
                  {teamStep === 3 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-blue-700 dark:text-blue-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-600" />
                        <span>3. رؤية ورسالة وأهداف الفريق</span>
                      </h5>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">رؤية الفريق</label>
                          <textarea 
                            value={teamVision}
                            onChange={(e) => setTeamVision(e.target.value)}
                            placeholder="ما هي رؤية فريقكم؟"
                            rows={2}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">رسالة الفريق</label>
                          <textarea 
                            value={teamMission}
                            onChange={(e) => setTeamMission(e.target.value)}
                            placeholder="ما هي رسالة فريقكم؟"
                            rows={2}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">أهداف الفريق</label>
                          <textarea 
                            value={teamGoals}
                            onChange={(e) => setTeamGoals(e.target.value)}
                            placeholder="ما هي أهداف فريقكم؟"
                            rows={2}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">الخدمات المقدمة</label>
                          <textarea 
                            value={teamServices}
                            onChange={(e) => setTeamServices(e.target.value)}
                            placeholder="ما هي الخدمات التي يقدمها الفريق؟"
                            rows={2}
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 4: فكرة هادفة وشعار الفريق */}
                  {teamStep === 4 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-blue-700 dark:text-blue-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>4. فكرة هادفة وشعار الفريق</span>
                      </h5>

                      <div>
                        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">الفكرة الهادفة للمجتمع</label>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">مشروع أو فكرة مبتكرة تساهم في تطوير المجتمع</p>
                        <textarea 
                          value={teamMeaningfulIdea}
                          onChange={(e) => setTeamMeaningfulIdea(e.target.value)}
                          placeholder="اكتب فكرة الفريق الهادفة لتنمية المجتمع..."
                          rows={2}
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="pt-2">
                        <ImagePickerControl
                          label="شعار الفريق (اختياري)"
                          description="الملفات المدعومة: JPG, PNG, GIF, SVG, WEBP"
                          value={teamLogoUrl}
                          onChange={setTeamLogoUrl}
                          aspectRatio="logo"
                        />
                      </div>
                    </div>
                  )}

                  {/* Wizard Bottom Nav Buttons */}
                  <div className="flex gap-2 justify-between pt-3 border-t border-neutral-150 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        if (teamStep > 1) {
                          setTeamStep(teamStep - 1);
                        } else {
                          setSelectedJoinType("none");
                        }
                      }}
                      className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-xs sm:text-sm cursor-pointer transition-colors"
                    >
                      {teamStep === 1 ? "إلغاء / رجوع" : "السابق"}
                    </button>

                    {teamStep < 4 ? (
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>التالي</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isTeamSubmitting}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isTeamSubmitting ? "جاري تسجيل الفريق..." : "إرسال طلب تسجيل الفريق"}</span>
                      </button>
                    )}
                  </div>
                </form>
              )}

              {/* Registration: BENEFICIARY REGISTER FORM (MULTI-STEP WIZARD) */}
              {selectedJoinType === "beneficiary" && (
                <form 
                  onSubmit={(e) => {
                    if (beneficiaryStep < 2) {
                      handleBeneficiaryStepNext(e);
                    } else {
                      handleRegisterBeneficiarySubmit(e);
                    }
                  }} 
                  className="space-y-4 mt-2 text-right"
                >
                  {/* Step Progress Tracker Bar */}
                  <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200/80 dark:border-amber-800/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>
                          {beneficiaryStep === 1 && "المرحلة 1 من 2: البيانات الشخصية والهوية"}
                          {beneficiaryStep === 2 && "المرحلة 2 من 2: تفاصيل الأسرة والسكن"}
                        </span>
                      </span>
                      <span className="text-[11px] font-mono font-black bg-amber-200/60 dark:bg-amber-900 px-2.5 py-0.5 rounded-full text-amber-900 dark:text-amber-100">
                        {beneficiaryStep === 1 && "50%"}
                        {beneficiaryStep === 2 && "100%"}
                      </span>
                    </div>

                    <div className="w-full bg-amber-200/50 dark:bg-amber-900/50 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-600 dark:bg-amber-400 h-full transition-all duration-300 rounded-full" 
                        style={{ width: `${beneficiaryStep * 50}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1 pt-1">
                      {[
                        { step: 1, label: "بيانات الهوية" },
                        { step: 2, label: "الأسرة والسكن" },
                      ].map((item) => (
                        <div 
                          key={item.step}
                          className={`py-1 text-center rounded-lg text-[10px] font-bold transition-all ${
                            item.step < beneficiaryStep 
                              ? 'bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200' 
                              : item.step === beneficiaryStep 
                              ? 'bg-amber-600 text-white shadow-xs' 
                              : 'bg-white/60 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
                          }`}
                        >
                          {item.step < beneficiaryStep ? "✓" : item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* STAGE 1: بيانات المستفيد والهوية */}
                  {beneficiaryStep === 1 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-amber-700 dark:text-amber-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-amber-600" />
                        <span>1. بيانات المستفيد والهوية</span>
                      </h5>

                      <div>
                        <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                          الاسم الرباعي للمستفيد <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          required
                          placeholder="أبو محمد المكي"
                          className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            رقم الهوية الوطنية (10 خانات) <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            value={regNationalId}
                            onChange={(e) => setRegNationalId(e.target.value)}
                            required
                            maxLength={10}
                            placeholder="1023456789"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-mono text-left font-bold"
                            dir="ltr"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">
                            رقم جوال للتواصل <span className="text-rose-500">*</span>
                          </label>
                          <input 
                            type="tel" 
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            required
                            placeholder="0550112233"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-mono text-left font-bold"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STAGE 2: تفاصيل الأسرة والسكن */}
                  {beneficiaryStep === 2 && (
                    <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 space-y-3">
                      <h5 className="font-bold text-xs text-amber-700 dark:text-amber-400 border-b border-neutral-200 dark:border-neutral-700 pb-2 flex items-center gap-2">
                        <Home className="w-4 h-4 text-amber-600" />
                        <span>2. تفاصيل الأسرة والعنوان السكني</span>
                      </h5>

                      <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 text-xs leading-relaxed">
                        <strong>تنويه الباحث الاجتماعي:</strong> يخضع حساب المستفيد لتدقيق باحثي الضمان الاجتماعي الميداني المعتمد بالعسيلة للتحقق من أعداد الأسرة والدخل وصحة المستندات.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">عدد الأفراد <span className="text-rose-500">*</span></label>
                          <input 
                            type="number" 
                            value={regFamilySize}
                            onChange={(e) => setRegFamilySize(Number(e.target.value))}
                            min={1}
                            required
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-neutral-800 dark:text-neutral-200 mb-1">العنوان الدقيق وتفاصيل السكن بالعسيلة <span className="text-rose-500">*</span></label>
                          <input 
                            type="text" 
                            value={regAddress}
                            onChange={(e) => setRegAddress(e.target.value)}
                            required
                            placeholder="مكة المكرمة - العسيلة - الشارع التجاري"
                            className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Wizard Bottom Nav Buttons */}
                  <div className="flex gap-2 justify-between items-center pt-3 border-t border-neutral-150 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (beneficiaryStep > 1) {
                            setBeneficiaryStep(beneficiaryStep - 1);
                          } else {
                            setSelectedJoinType("none");
                          }
                        }}
                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                      >
                        {beneficiaryStep === 1 ? "إلغاء / رجوع" : "السابق"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsJoinModalOpen(false);
                          onOpenLogin('beneficiary');
                        }}
                        className="text-xs text-neutral-500 hover:text-amber-600 dark:text-neutral-400 dark:hover:text-amber-400 font-bold transition-colors"
                      >
                        العودة لتسجيل الدخول
                      </button>
                    </div>

                    {beneficiaryStep < 2 ? (
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <span>التالي</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isRegSubmitting}
                        className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>{isRegSubmitting ? 'جاري التقديم...' : 'إرسال الطلب للباحثين'}</span>
                      </button>
                    )}
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* Popover Detail: NEWS READ MORE DETAILS */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedNews(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-neutral-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl z-10 border border-neutral-100 dark:border-neutral-850 text-right text-neutral-900 dark:text-white"
            >
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 left-4 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>

              <div className="space-y-4">
                <div className="h-64 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-850">
                  <img src={selectedNews.image} alt={selectedNews.titleAr} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-md inline-block">
                  {selectedNews.date}
                </span>
                <h3 className="text-sm sm:text-base font-black leading-tight">
                  {lang === "ar" ? selectedNews.titleAr : selectedNews.titleEn}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed whitespace-pre-line">
                  {lang === "ar" ? selectedNews.bodyAr : selectedNews.bodyEn}
                </p>
                <p className="text-[10px] text-neutral-400 dark:text-neutral-500 leading-normal italic">
                  {lang === "ar" 
                    ? "* التقرير الصحفي صادر ومعتمد من إدارة الإعلام والعلاقات العامة لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة." 
                    : "* Report issued by media office at Reyadat Al-Ata Association."}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Popover Detail: INITIATIVE DETAILS POPUP */}
      <AnimatePresence>
        {selectedInit && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInit(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-neutral-900 rounded-3xl max-w-xl w-full p-6 shadow-2xl z-10 border border-neutral-100 dark:border-neutral-850 text-right text-neutral-900 dark:text-white space-y-4"
            >
              <button
                onClick={() => setSelectedInit(null)}
                className="absolute top-4 left-4 p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>

              <div className="h-48 rounded-xl overflow-hidden">
                <img 
                  src={`https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=600&h=400&fit=crop`} 
                  alt={selectedInit.name} 
                  className="w-full h-full object-cover" 
                />
              </div>

              <div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full inline-block">
                  {selectedInit.registrationStatus === 'open' ? (lang === "ar" ? "فرصة تطوعية فعالة" : "Active opportunity") : (lang === "ar" ? "مكتمل ومغلق" : "Archived")}
                </span>
                <h3 className="text-xs sm:text-sm font-black mt-1">{selectedInit.name}</h3>
              </div>

              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {selectedInit.description}
              </p>

              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-[11px] space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">{lang === "ar" ? "الموقع التفصيلي:" : "Location:"}</span>
                  <strong className="text-neutral-700 dark:text-neutral-300">{selectedInit.place}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{lang === "ar" ? "التاريخ ووقت البدء:" : "Time & Date:"}</span>
                  <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{selectedInit.date} | {selectedInit.startTime} - {selectedInit.endTime}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">{lang === "ar" ? "المقاعد والوفد المتاح:" : "Seats capacity:"}</span>
                  <strong className="text-neutral-700 dark:text-neutral-300 font-mono">{selectedInit.acceptedCount} / {selectedInit.neededCount} {lang === "ar" ? "متطوع" : "Volunteers"}</strong>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setSelectedInit(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl font-bold text-xs cursor-pointer"
                >
                  {lang === "ar" ? "إغلاق" : "Close"}
                </button>
                <button
                  disabled={selectedInit.registrationStatus !== 'open' || selectedInit.acceptedCount >= selectedInit.neededCount}
                  onClick={() => { handleJoinInitiativeClick(selectedInit); setSelectedInit(null); }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 text-white rounded-xl font-bold text-xs shadow-md cursor-pointer"
                >
                  {lang === "ar" ? "انضم الآن كمتطوع" : "Apply as volunteer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Fixed Bottom Navigation Bar for Mobile Screens (شريط التنقل السفلي الاحترافي للموبايل) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-100 dark:border-neutral-850 shadow-2xl backdrop-blur-md px-4 py-2.5 flex items-center justify-around no-print pb-safe">
        <a 
          href="#about" 
          className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
        >
          <Globe className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">{lang === "ar" ? "من نحن" : "About"}</span>
        </a>

        {settings?.sectionVisibility?.initiatives && (
          <a 
            href="#initiatives" 
            className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1">{lang === "ar" ? "المبادرات" : "Missions"}</span>
          </a>
        )}

        {/* Floating Center Action Button (تبرع الآن) */}
        <a 
          href={settings?.donationLink || "#"} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex flex-col items-center justify-center relative -top-3.5 bg-rose-600 hover:bg-rose-700 text-white w-12 h-12 rounded-full shadow-lg transition-all transform hover:scale-105 shrink-0"
          title="تبرع الآن"
        >
          <Heart className="w-5 h-5 fill-current text-white animate-pulse" />
        </a>

        {settings?.sectionVisibility?.gallery && (
          <a 
            href="#gallery" 
            className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-[9px] font-bold mt-1">{lang === "ar" ? "المعرض" : "Gallery"}</span>
          </a>
        )}

        <button 
          id="mobile-bottom-join-now-btn"
          onClick={() => {
            setSelectedJoinType("none");
            setIsJoinModalOpen(true);
          }}
          className="flex flex-col items-center justify-center text-neutral-500 dark:text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer bg-transparent border-0 outline-none"
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold mt-1">{lang === "ar" ? "انضمام" : "Join"}</span>
        </button>
      </div>

      {/* External Store is accessed directly via external links to preserve clear separation between association portal and store project */}

      {/* TEAM REGISTRATION FULL MODAL & TRACKING */}
      <TeamRegistrationModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onOpenLogin={onOpenLogin}
        onSubmitApplication={async (app) => {
          if (onSubmitTeamApplication) {
            const res = await onSubmitTeamApplication(app);
            if (res && res.success) {
              playApplicationSubmittedChime();
            }
            return res;
          }
          return { success: false, message: 'تعذر الاتصال بالخادم' };
        }}
        existingApplications={teamApplications}
        lang={lang}
      />

      {/* OFFICIAL SEND LETTER MODAL FOR VISITORS */}
      <SendLetterModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        defaultSenderType="زائر"
        onSubmitLetter={async (letterData) => {
          if (onSubmitOfficialLetter) {
            return await onSubmitOfficialLetter(letterData);
          }
          return { success: false, message: "فشل الاتصال بالخادم." };
        }}
      />

      {/* USER SETTINGS & AUDIO PREFERENCES MODAL */}
      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        lang={lang}
        currentUser={currentVolunteer || currentBeneficiary}
        currentUserRole={currentVolunteer ? 'volunteer' : currentBeneficiary ? 'beneficiary' : 'public'}
        isDark={isDark}
        onToggleDark={onToggleDark}
      />

    </div>
  );
}
