/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Department {
  id: string;
  nameAr: string;
  nameEn: string;
  directorName: string;
  nationalId?: string;
  password?: string;
  email?: string;
  phone?: string;
  supervisorIds?: string[];
  descriptionAr?: string;
  descriptionEn?: string;
  tasks?: string[];
  icon?: string;
}

export interface DepartmentDirective {
  id: string;
  departmentId: string;
  departmentNameAr: string;
  title: string;
  description: string;
  priority: 'urgent' | 'high' | 'normal';
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'needs_review';
  createdAt: string;
  createdBy: string; // e.g. "مجلس الإدارة"
  completionNotes?: string;
  attachmentUrl?: string;
}

export interface TeamAttachment {
  id: string;
  title: string;
  type: 'license' | 'profile' | 'certificates' | 'other' | string;
  fileUrl: string;
  fileName?: string;
  uploadedAt?: string;
  fileSize?: string;
}

export interface TeamSocialLinks {
  x?: string;
  instagram?: string;
  snapchat?: string;
  tiktok?: string;
  youtube?: string;
  facebook?: string;
  whatsapp?: string;
  telegram?: string;
  website?: string;
}

export interface TeamApplication {
  id: string;
  applicationNumber: string; // e.g. TEAM-2026-0001
  appliedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_correction';
  
  // Basic Team Info
  teamName: string;
  teamNameEn?: string;
  city: string;
  establishedDate: string;
  membersCount: number;
  pastInitiativesCount?: number;
  teamColor: string;
  description?: string;

  // Leader Info
  leaderName: string;
  leaderPhone: string;
  leaderEmail?: string;
  leaderNationalId?: string;
  leaderBirthDate?: string;
  leaderCity?: string;
  leaderAddress?: string;
  preferredContactMethod?: 'whatsapp' | 'call' | 'email' | 'telegram' | string;

  // Vision, Mission, Goals, Services
  vision?: string;
  mission?: string;
  goals?: string;
  services?: string[]; // Array of categories: الإغاثة، خدمة المجتمع، الفعاليات، التعليم والتدريب، الصحة، البيئة، رعاية كبار السن، خدمة ذوي الإعاقة، الأمن والسلامة...

  // Meaningful Idea for Society
  meaningfulIdeaTitle?: string;
  meaningfulIdea?: string; // Problem, Solution, Expected Impact

  // Logo & Media
  logoUrl?: string;

  // Documents & Attachments
  attachments?: TeamAttachment[];

  // Social Media Links
  socialLinks?: TeamSocialLinks;

  // Past Experience & Achievements
  pastBeneficiariesCount?: number;
  pastVolunteerHours?: number;
  pastPartnerEntities?: string;
  majorPastInitiatives?: string;
  achievementsAndExperience?: string;
  awardsAndHonors?: string;

  // Agreements & Declarations
  agreedToTerms: boolean;
  agreedToVolunteerPolicy: boolean;
  agreedToPrivacyPolicy: boolean;
  agreedToDataAccuracy: boolean;
  agreedToRegulations: boolean;
  agreementTimestamp: string;

  // Admin Review Fields
  reviewedBy?: string;
  reviewedAt?: string;
  approvedDepartmentId?: string;
  rejectionReason?: string;
  correctionNotes?: string;
  createdTeamId?: string;
}

export interface TeamPointsRecord {
  id: string;
  teamId: string;
  teamName: string;
  initiativeId: string;
  initiativeName: string;
  basePoints: number; // 5 نقاط أساسية
  evaluationPoints: number; // 5 (أكمل المبادرة بأفضل وجه) or 3 (المبادرة متوسطة وفيها بعض الملاحظات)
  totalPoints: number; // 10 or 8
  evaluationType: 'completed_best' | 'average_with_notes';
  evaluationLabel: string;
  evaluatedBy: string;
  evaluatedAt: string;
  notes?: string;
}

export interface VolunteerTeam {
  id: string;
  nameAr: string;
  nameEn: string;
  departmentId: string;
  leaderName: string;
  descriptionAr?: string;
  descriptionEn?: string;
  city?: string;
  establishedDate?: string;
  membersCount?: number;
  initiativesCount?: number;
  color?: string;
  leaderPhone?: string;
  leaderEmail?: string;
  leaderNationalId?: string;
  vision?: string;
  mission?: string;
  goals?: string;
  services?: string[] | string;
  meaningfulIdea?: string;
  logoUrl?: string;
  status?: 'active' | 'suspended' | 'pending' | 'approved' | 'rejected';
  socialLinks?: TeamSocialLinks;
  attachments?: TeamAttachment[];
  pastBeneficiariesCount?: number;
  pastVolunteerHours?: number;
  pastPartnerEntities?: string;
  majorPastInitiatives?: string;
  achievementsAndExperience?: string;
  awardsAndHonors?: string;
  applicationNumber?: string;
  approvedBy?: string;
  approvedAt?: string;
  cardTemplateBg?: 'emerald-gold' | 'royal-blue' | 'deep-purple' | 'ruby-crimson' | 'slate-dark' | 'custom-bg' | string;
  cardBgImageUrl?: string;
  cardThemeColor?: string;
  cardBadgeTitle?: string;
  cardHeaderStyle?: string;
  cardTemplateId?: string;
  points?: number;
  pointsHistory?: TeamPointsRecord[];
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo: string; // URL or base64 or placeholder
  membershipNumber: string;
  teamId: string;
  departmentId: string;
  titleAr: string;
  titleEn: string;
  status: 'active' | 'inactive' | 'suspended';
  points: number;
  qrCode: string; // text representation
  barcode: string; // text representation
  issueDate: string;
  expiryDate: string;
  role?: 'admin' | 'leader' | 'supervisor' | 'volunteer' | 'executive' | 'board' | string;
  permissions?: string[];
  password?: string;
  nationalId?: string;
  gender?: 'male' | 'female';
  nationality?: string;
  birthDate?: string;
  bloodType?: string;
  volunteerHours?: number;
  completedInitiativesCount?: number;
  issuedCardId?: string;
  issuedCard?: IssuedVolunteerCard;
}

// -------------------------------------------------------------
// Volunteer Card Templates & Automatic Card Issuance Interfaces
// -------------------------------------------------------------
export type CardCategory = 'volunteer' | 'employee' | 'leader';

export type CardElementType = 
  | 'name' 
  | 'photo' 
  | 'nationalId' 
  | 'membershipNumber' 
  | 'employeeNumber' 
  | 'leaderNumber' 
  | 'leadershipTitle' 
  | 'commissionDate' 
  | 'hireDate' 
  | 'nationality' 
  | 'gender' 
  | 'birthDate' 
  | 'bloodType' 
  | 'jobTitle' 
  | 'teamName' 
  | 'departmentName' 
  | 'joinDate' 
  | 'expiryDate' 
  | 'points' 
  | 'qrCode' 
  | 'barcode' 
  | 'associationLogo' 
  | 'teamLogo' 
  | 'customText';

export interface CardElementConfig {
  id: string;
  type: CardElementType;
  labelAr: string;
  visible: boolean;
  x: number; // percentage X position (0-100%)
  y: number; // percentage Y position (0-100%)
  width?: number; // width in px or %
  height?: number; // height in px or %
  rotation?: number; // element rotation in degrees (0-360)
  zIndex?: number;
  fontFamily?: 'Cairo' | 'Tajawal' | 'IBM Plex Sans Arabic' | 'Almarai' | 'El Messiri' | 'Arial' | string;
  fontSize?: number; // in px
  fontWeight?: 'normal' | '500' | 'bold' | '900';
  color?: string; // hex color e.g. #15803d
  textAlign?: 'right' | 'center' | 'left';
  direction?: 'rtl' | 'ltr';
  showLabelPrefix?: boolean;
  labelPrefix?: string;
  photoShape?: 'circle' | 'square' | 'rounded' | 'rectangle';
  borderWidth?: number;
  borderColor?: string;
  qrSize?: number;
  qrDarkColor?: string;
  qrLightColor?: string;
  customTextValue?: string;
}

export interface VolunteerCardTemplate {
  id: string;
  name: string;
  description?: string;
  category?: CardCategory; // 'volunteer' | 'employee' | 'leader'
  cardType: 'standard' | 'leader' | 'executive' | 'honorary' | 'seasonal' | 'vip' | 'field' | string;
  targetGender: 'all' | 'male' | 'female';
  useFemaleUnifiedPhoto: boolean; // إذا كان للمتطوعة أنثى، يتم استخدام الصورة الموحدة تلقائياً
  isActive: boolean;
  isDefault?: boolean;
  isDefaultMale?: boolean;
  isDefaultFemale?: boolean;
  backgroundUrl: string;
  width: number; // e.g. 856
  height: number; // e.g. 540
  orientation: 'landscape' | 'portrait';
  elements: CardElementConfig[];
  teamId?: string;
  teamName?: string;
  sourceType?: 'system' | 'team' | 'employee' | 'leader';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface IssuedVolunteerCard {
  id: string;
  volunteerId: string;
  templateId: string;
  templateName: string;
  cardNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'active' | 'expired' | 'suspended';
  photoUrlUsed: string;
  isFemaleUnifiedPhotoUsed: boolean;
  qrVerificationUrl: string;
  cardSnapshot: {
    backgroundUrl: string;
    orientation: 'landscape' | 'portrait';
    width: number;
    height: number;
    elements: CardElementConfig[];
    volunteerData: {
      name: string;
      photo: string;
      nationalId: string;
      maskedNationalId: string;
      membershipNumber: string;
      nationality?: string;
      gender?: 'male' | 'female';
      birthDate?: string;
      bloodType?: string;
      jobTitle: string;
      teamName: string;
      departmentName: string;
      joinDate: string;
      expiryDate: string;
      points: number;
    };
  };
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// Initiative Rating & Certificate Management Interfaces
// -------------------------------------------------------------
export interface InitiativeRating {
  id: string;
  initiativeId: string;
  initiativeName: string;
  volunteerId: string;
  volunteerName: string;
  overallRating: number; // 1-5 stars (التجربة العامة)
  organizationRating: number; // 1-5 (التنظيم)
  clarityRating?: number; // 1-5 (وضوح التعليمات)
  leaderSupportRating: number; // 1-5 (تعامل القائد)
  teamworkRating?: number; // 1-5 (التعاون بين الفريق)
  benefitRating?: number; // 1-5 (الاستفادة من المبادرة)
  impactRating?: number; // 1-5 (الأثر المجتمعي)
  feedbackText: string;
  createdAt: string;
}

export interface CertificateTemplate {
  id: string;
  title: string;
  backgroundUrl: string;
  // Dynamic X,Y positioning in percentages (0-100%) and font properties
  nameX: number;
  nameY: number;
  nameFontSize: number;
  nameColor: string;
  initiativeX: number;
  initiativeY: number;
  initiativeFontSize: number;
  initiativeColor: string;
  hoursX: number;
  hoursY: number;
  hoursFontSize: number;
  hoursColor: string;
  dateX: number;
  dateY: number;
  dateFontSize: number;
  dateColor: string;
  qrX: number;
  qrY: number;
  qrSize: number;
  createdAt: string;
}

export interface IssuedCertificate {
  id: string;
  templateId: string;
  certificateCode: string;
  volunteerId: string;
  volunteerName: string;
  initiativeId?: string;
  initiativeName?: string;
  hours: number;
  issueDate: string;
  status: 'locked_unrated' | 'unlocked';
  
  // Template snapshot properties for robust rendering
  templateBackgroundUrl: string;
  nameX: number;
  nameY: number;
  nameFontSize: number;
  nameColor: string;
  initiativeX: number;
  initiativeY: number;
  initiativeFontSize: number;
  initiativeColor: string;
  hoursX: number;
  hoursY: number;
  hoursFontSize: number;
  hoursColor: string;
  dateX: number;
  dateY: number;
  dateFontSize: number;
  dateColor: string;
  qrX: number;
  qrY: number;
  qrSize: number;
}

export interface Initiative {
  id: string;
  name: string;
  description: string;
  place: string;
  date: string;
  startTime: string;
  endTime: string;
  departmentId: string;
  teamId: string;
  leaderId: string;
  supervisorId: string;
  neededCount: number;
  acceptedCount: number;
  waitlistCount: number;
  registrationStatus: 'open' | 'closed' | 'archived' | 'full';
  acceptedVolunteerIds: string[];
  waitlistVolunteerIds: string[];
  applicantVolunteerIds: string[];
  
  // Extended fields for National Platform & Leader Requests
  nationalPlatformUrl?: string;
  registrationUrl?: string;
  nameEn?: string;
  details?: string;
  pointsGained?: number;
  targetVolunteers?: number;
  goals?: string[];
  opportunityType?: string;
  domain?: string;
  startDate?: string;
  endDate?: string;
  opportunityCode?: string;
  imageUrl?: string;
  scope?: 'public' | 'private';
  lifecycleStatus?: 'draft' | 'pending' | 'accepted' | 'open' | 'full' | 'closed' | 'finished' | 'cancelled';
  reviewHistory?: OpportunityReviewLog[];

  // Team Points & Volunteer Management Evaluation
  teamPointsAwarded?: boolean;
  teamBasePoints?: number; // 5 نقاط أساسية
  teamEvaluationPoints?: number; // 5 (أكمل بأفضل وجه) أو 3 (متوسطة بملاحظات)
  teamTotalPoints?: number; // 10 أو 8 نقاط
  teamEvaluationStatus?: 'pending' | 'completed_best' | 'average_with_notes';
  evaluatedBy?: string;
  evaluatedAt?: string;
  evaluationNotes?: string;
  volunteerRatingsCount?: number;
  averageVolunteerRating?: number;
}

export interface OpportunityReviewLog {
  id: string;
  timestamp: string; // ISO date string
  action: 'created' | 'submitted' | 'returned' | 'resubmitted' | 'accepted' | 'rejected' | 'code_assigned' | 'draft_saved' | 'url_generated' | 'status_changed' | 'volunteer_registered';
  actorName: string;
  actorRole: string; // e.g. "قائد الفريق" | "إدارة التطوع" | "الإدارة العليا"
  notes?: string;
  opportunityCode?: string;
  registrationUrl?: string;
}

export interface OpportunityRequest {
  id: string;
  opportunityCode?: string; // معرف الفرصة المعتمد من إدارة التطوع فقط
  registrationUrl?: string; // رابط التسجيل المعتمد من إدارة التطوع
  title: string;
  opportunityType: string;
  domain: string;
  scope?: 'public' | 'private'; // عامة لكافة المتطوعين أو خاصة بأعضاء الفريق
  neededCount: number;
  acceptedVolunteersCount?: number;
  place?: string;
  goals?: string[];
  description?: string;
  imageUrl?: string;
  status: 'draft' | 'pending' | 'accepted' | 'rejected' | 'returned' | 'returned_for_correction' | 'open' | 'full' | 'closed' | 'finished' | 'cancelled';
  teamId?: string;
  teamName?: string;
  departmentId?: string;
  departmentName?: string;
  leaderId?: string;
  leaderName?: string;
  createdAt: string;
  updatedAt?: string;
  
  // Review & Approval details
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  returnedBy?: string;
  returnedAt?: string;
  reviewHistory?: OpportunityReviewLog[];
  
  // Admin filled fields before approval
  startDate?: string;
  endDate?: string;
  nationalPlatformUrl?: string;
  rejectionReason?: string;
  correctionNotes?: string;
}

export interface JoinRequest {
  id: string;
  volunteerId: string;
  volunteerName: string;
  teamId: string;
  departmentId: string;
  initiativeId: string;
  initiativeName: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlist';
  date: string;
}

export interface AttendanceRecord {
  id: string;
  initiativeId: string;
  volunteerId: string;
  date: string;
  status: 'full' | 'late' | 'excused' | 'unexcused';
  wearingVest: boolean;
  recordedBy: string;
  timestamp: string;
  checkoutTimestamp?: string;
  durationMinutes?: number;
  checkedOutBy?: string;
  badgePresent?: boolean;
  method?: 'barcode' | 'manual' | 'qr';
  notes?: string;
}

export interface Evaluation {
  id: string;
  volunteerId: string;
  initiativeId: string;
  commitment: number; // 1-5
  ethics: number; // 1-5
  cooperation: number; // 1-5
  discipline: number; // 1-5
  interaction: number; // 1-5
  wearingVest: boolean;
  taskExecution: number; // 1-5
  comments: string;
}

export interface OperationLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
  device: string;
}

export interface Notification {
  id: string;
  userId: string; // 'all' or volunteerId or beneficiaryId or 'role:admin' | 'role:support' | 'role:supervisor' | 'team:teamId'
  recipientType?: 'all' | 'volunteers' | 'beneficiaries' | 'admins' | 'supervisors' | 'support' | 'team_members' | 'custom' | string;
  recipientIds?: string[];
  targetRole?: string;
  teamId?: string;
  titleAr: string;
  titleEn?: string;
  bodyAr: string;
  bodyEn?: string;
  type?: 'normal' | 'important' | 'urgent';
  category?: 'system' | 'support' | 'volunteer' | 'beneficiary' | 'initiative' | 'points' | 'attendance' | 'certificate' | 'announcement';
  linkUrl?: string;
  imageUrl?: string;
  scheduledAt?: string;
  createdAt?: string;
  date: string;
  read: boolean;
  readByUsers?: { [userId: string]: string };
  readAt?: string;
  senderName?: string;
  senderRole?: string;
}

export interface SystemStats {
  departmentsCount: number;
  teamsCount: number;
  leadersCount: number;
  supervisorsCount: number;
  volunteersCount: number;
  initiativesCount: number;
  attendanceRate: number;
  absenceRate: number;
  requestsCount: number;
  acceptedCount: number;
  rejectedCount: number;
}

export interface SystemSettings {
  // 1. General Settings
  systemName: string;
  teamName: string;
  logoUrl: string;
  faviconUrl: string;
  loginBgImage: string;
  systemDescription: string;
  licenseNumber: string;
  registrationNumber: string;
  foundationYear: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultLanguage: 'ar' | 'en';
  timezone: string;
  dateTimeFormat: string;

  // 2. Team Info
  commanderInChief: string;
  viceCommander: string;
  officialEmail: string;
  mobileNumber: string;
  landlineNumber: string;
  address: string;
  websiteUrl: string;
  googleMapsEmbedUrl: string;

  // 3. Social Media Links
  socialLinks: Array<{
    id: string;
    platform: 'twitter' | 'instagram' | 'facebook' | 'tiktok' | 'snapchat' | 'youtube' | 'linkedin' | 'whatsapp' | 'telegram' | 'threads';
    titleAr: string;
    url: string;
    enabled: boolean;
    order: number;
  }>;

  // 4. Volunteer Settings
  allowVolunteerRegistration: boolean;
  approvalType: 'manual' | 'auto';
  minAge: number;
  maxAge: number;
  requireNationalIdPhoto: boolean;
  requirePersonalPhoto: boolean;
  requireCharterPdf: boolean;
  enableOtpVerification: boolean;
  applicationValidityDays: number;

  // 5. Roles & Permissions
  customRoles: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
    allowedPages: string[];
    description: string;
  }>;

  // 6. Notification Settings
  notifications: {
    enableEmail: boolean;
    enableSms: boolean;
    enableWhatsapp: boolean;
    enableInApp: boolean;
    enableBrowserPush: boolean;
    templates: {
      acceptVolunteer: string;
      rejectVolunteer: string;
      initiativeInvite: string;
      supportTicketCreated: string;
    };
  };

  // 7. AI Settings
  aiAssistant: {
    enabled: boolean;
    name: string;
    welcomeMessage: string;
    maxAttemptsBeforeTransfer: number;
    escalationKeywords: string[];
    supportWorkingHours: string;
    cannedResponses: Array<{ id: string; keyword: string; response: string }>;
    knowledgeBaseArticles: Array<{ id: string; title: string; content: string }>;
  };

  // 8. Documents Management
  documents: {
    privacyPolicyAr: string;
    termsOfUseAr: string;
    volunteerCharterAr: string;
    faqAr: Array<{ id: string; question: string; answer: string }>;
    userAgreementAr: string;
  };

  // 9. Appearance Settings
  appearance: {
    mode: 'light' | 'dark' | 'system';
    primaryColor: string;
    secondaryColor: string;
    buttonColor: string;
    sidebarColor: string;
    fontFamily: string;
    fontSize: 'normal' | 'large' | 'xlarge';
    bgImageUrl: string;
    loginBgImageUrl: string;
  };

  // 10. Backup Settings
  backup: {
    autoBackupFrequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
    lastBackupDate?: string;
  };

  // 11. Security Settings
  security: {
    enable2FA: boolean;
    maxLoginAttempts: number;
    sessionTimeoutMinutes: number;
    logIpAddresses: boolean;
    blockedIps: string[];
  };

  // 12. Official Files & Seals
  files: {
    siteLogo: string;
    loginLogo: string;
    certificateLogo: string;
    volunteerCardLogo: string;
    officialStampUrl: string;
    commanderSignatureUrl: string;
    emergencyPhone: string;
    defaultFemaleAvatarUrl?: string;
  };
}

export interface HomeSettings {
  logoUrl: string;
  videoUrl: string;
  videoCoverUrl: string;
  associationNameAr: string;
  associationNameEn: string;
  licenseNumber: string;
  heroTitleAr: string;
  heroTitleEn: string;
  heroDescAr: string;
  heroDescEn: string;
  aboutUsAr: string;
  aboutUsEn: string;
  visionAr: string;
  visionEn: string;
  missionAr: string;
  missionEn: string;
  goalsAr: string[];
  goalsEn: string[];
  valuesAr: string[];
  valuesEn: string[];
  donationLink: string;
  contactPhone: string;
  contactEmail: string;
  contactLocationAr: string;
  contactLocationEn: string;
  contactHoursAr: string;
  contactHoursEn: string;
  socialTwitter?: string;
  socialInstagram?: string;
  socialYoutube?: string;
  socialSnapchat?: string;
  themePrimary: string;
  themeSecondary: string;
  fontFamily: string;
  volunteerCardTemplateUrl?: string;
  femaleUnifiedCardPhoto?: string;
  licenseConfig?: {
    enabled?: boolean;
    imageUrl?: string;
    width?: number;
    maxHeight?: number;
    alignment?: 'right' | 'center' | 'left' | 'right_margin';
    titleAr?: string;
    notes?: string;
  };
  partnersSectionSettings?: {
    enabled?: boolean;
    placement?: 'after_hero' | 'after_about' | 'after_stats' | 'after_initiatives' | 'after_news' | 'after_gallery' | 'before_contact';
    heightPadding?: 'compact' | 'normal' | 'spacious';
    logoSize?: 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large';
    cardSpacing?: 'tight' | 'normal' | 'wide';
    gap?: 'small' | 'medium' | 'large' | string;
    displayMode?: 'animated_marquee' | 'grid';
    animationSpeed?: 'slow' | 'normal' | 'fast';
    speed?: number;
    showDescription?: boolean;
    titleAr?: string;
    titleEn?: string;
    subtitleAr?: string;
    subtitleEn?: string;
  };
  socialLinks?: Array<{
    id: string;
    platform: string;
    titleAr: string;
    url: string;
    enabled: boolean;
    order: number;
  }>;
  heroSlides?: HeroSlide[];
  orgMembers?: OrgMember[];
  sectionVisibility: {
    about: boolean;
    orgChart?: boolean;
    stats: boolean;
    initiatives: boolean;
    news: boolean;
    achievements: boolean;
    partners: boolean;
    gallery: boolean;
    contact: boolean;
  };
}

export interface OrgMember {
  id: string;
  name: string;
  roleTitle: string; // المسمى الوظيفي
  level: number; // 1: مجلس الإدارة, 2: الإدارة التنفيذية, 3: الإدارات والأقسام, 4: الموظفون والمسؤولون
  levelName?: string;
  parentId?: string | null; // الشخص الأعلى / الرئيس المباشر
  parentName?: string;
  imageUrl?: string;
  description?: string;
  order: number;
  isActive: boolean;
  department?: string;
  email?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroSlide {
  id: string;
  title?: string;
  subtitle?: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  linkUrl?: string;
  createdAt?: string;
}

export interface VolunteerApplication {
  id: string;
  fullName: string;
  nationalId: string;
  fileNumber: string;
  gender: 'male' | 'female';
  nationality: string;
  birthDate: string;
  age: number;
  phone: string;
  email: string;
  position: string;
  joinDate: string;
  address: string;
  bloodType: string;
  hasChronicIllness: boolean;
  illnessDetails?: string;
  guardianName: string;
  guardianPhone: string;
  photo: string;
  idPhoto: string;
  charterPdfUrl?: string;
  charterPdfName?: string;
  experiences: string;
  agreedToTerms: boolean;
  status: 'pending' | 'leader_accepted' | 'pending_admin_approval' | 'approved' | 'accepted' | 'leader_rejected' | 'admin_rejected' | 'rejected';
  appliedAt: string;
  rejectionReason?: string;
  assignedTeamId?: string;
  requestedTeamId?: string;
  requestedTeamName?: string;
  leaderAcceptedBy?: string;
  leaderAcceptedAt?: string;
  leaderAcceptedNotes?: string;
  leaderRejectedBy?: string;
  leaderRejectedAt?: string;
  adminApprovedBy?: string;
  adminApprovedAt?: string;
  adminRejectedBy?: string;
  adminRejectedAt?: string;
  generatedCardNumber?: string;
  generatedCardId?: string;
  opportunityId?: string;
  opportunityCode?: string;
  opportunityTitle?: string;
}

export interface Employee {
  id: string;
  name: string;
  employeeNumber: string;
  departmentId: string;
  departmentName?: string;
  jobTitle: string;
  nationalId: string;
  phone: string;
  email: string;
  photo?: string;
  hireDate: string;
  expiryDate: string;
  status: 'active' | 'inactive';
  qrCode?: string;
  barcode?: string;
  activeCardId?: string;
  activeCardNumber?: string;
  nationality?: string;
  section?: string;
  qualification?: string;
  birthDate?: string;
  employmentType?: 'full_time' | 'part_time' | 'contractor' | 'volunteer_staff' | string;
  notes?: string;
  documents?: {
    id: string;
    title: string;
    fileName: string;
    fileUrl: string;
    fileSize?: string;
  }[];
  basicSalary?: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  contractType?: 'full_time' | 'part_time' | 'seasonal' | 'consultant';
  contractStartDate?: string;
  contractEndDate?: string;
  leaveBalance?: number;
  approvedBy?: string;
  approvedAt?: string;
  requestId?: string;
}

export interface HRLeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'annual' | 'sick' | 'emergency' | 'unpaid';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerNotes?: string;
  requestedAt: string;
}

export interface HRAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  notes?: string;
}

export interface HRPayrollRecord {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  deductions: number;
  netSalary: number;
  status: 'draft' | 'paid';
}

export interface HRPayrollSheet {
  id: string;
  month: string; // e.g. "2026-03"
  year: number;
  generatedAt: string;
  totalAmount: number;
  records: HRPayrollRecord[];
}

export interface HRDecision {
  id: string;
  decisionNumber: string;
  type: 'assignment' | 'promotion' | 'warning' | 'salary_cert' | 'appreciation';
  title: string;
  employeeId: string;
  employeeName: string;
  issueDate: string;
  content: string;
  signedBy: string;
}

export interface EmployeeRequestDocument {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
}

export interface EmployeeRequestReviewStep {
  date: string;
  action: 'submitted' | 'resubmitted' | 'approved' | 'rejected' | 'needs_modification';
  performedBy: string;
  notes?: string;
}

export interface EmployeeRequest {
  id: string;
  requestNumber: string; // e.g. EMP-REQ-2026-001
  departmentId: string;
  departmentName: string;
  requestedBy: string; // اسم مدير الإدارة
  requestedByPhone?: string;
  createdAt: string;
  updatedAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_modification';
  
  // Required Employee Details
  fullName: string;
  candidateName?: string;
  nationalId: string;
  phone: string;
  email: string;
  nationality?: string;
  jobTitle: string;
  section?: string;
  qualification?: string;
  birthDate?: string;
  hireDate: string;
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'volunteer_staff' | string;
  notes?: string;
  documents?: EmployeeRequestDocument[];
  
  // Upper Admin Review Decision
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  modificationNotes?: string;
  approvedEmployeeId?: string;
  reviewHistory?: EmployeeRequestReviewStep[];
}

export interface TeamStaffAssignment {
  id: string;
  teamId: string;
  teamName: string;
  employeeId: string;
  employeeName: string;
  employeeNationalId?: string;
  employeePhone?: string;
  employeeJobTitle?: string;
  teamRole: string; // e.g. 'مسؤول المتطوعين' | 'مسؤول الإعلام' | 'مسؤول التجهيزات' | 'مسؤول العمليات' | 'مسؤول الميدان' | custom
  assignedByLeaderName: string;
  assignedAt: string;
  status: 'active' | 'inactive';
  notes?: string;
}

export interface LeaderMember {
  id: string;
  name: string;
  leaderNumber: string;
  teamId: string;
  teamName: string;
  departmentId: string;
  departmentName?: string;
  leadershipTitle: string;
  commissionDate: string;
  expiryDate: string;
  phone: string;
  email: string;
  nationalId: string;
  photo?: string;
  status: 'active' | 'inactive';
  qrCode?: string;
  barcode?: string;
  activeCardId?: string;
  activeCardNumber?: string;
}

export interface NewsItem {
  id: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  image: string;
  date: string;
}

export interface PartnerItem {
  id: string;
  nameAr: string;
  nameEn: string;
  logo: string;
  link: string;
  category?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  active?: boolean;
  order?: number;
}

export interface GalleryItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  titleAr: string;
  titleEn: string;
  date: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationalId: string;
  familySize: number;
  address: string;
  beneficiaryNumber?: string; // e.g. BEN-2026-0001
  barcodeId?: string; // e.g. BC-BEN-884920 (Unique permanent internal barcode ID)
  category?: string; // e.g. "أيتام", "أرامل", "أسر متعففة", "ذوي الاحتياجات", إلخ
  notes?: string;
  photo?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  password?: string;
}

export interface AidDistribution {
  id: string;
  title: string; // e.g. "توزيع سلال غذائية - رمضان 1448"
  aidType: 'food_basket' | 'clothing' | 'water' | 'meals' | 'financial' | 'medical' | 'school_supplies' | 'other' | string;
  aidTypeLabel?: string;
  description: string;
  distributionDate: string; // YYYY-MM-DD
  quantityPerBeneficiary: string; // e.g. "1 سلة غذائية متكاملة"
  targetAudience: 'all' | 'approved_only' | 'orphans' | 'widows' | 'large_families' | 'custom' | string;
  targetedBeneficiaryIds?: string[];
  status: 'active' | 'planned' | 'completed' | 'archived';
  location?: string;
  createdAt: string;
  createdBy?: string;
  notes?: string;
  // Inventory Direct Link (إدارة المخزون والتوزيعات)
  inventoryItemId?: string;
  inventoryItemName?: string;
  unit?: string;
  unitPrice?: number;
  availableStockAtCreation?: number;
  allocatedQuantity?: number;
  unitQuantityPerBeneficiary?: number;
  reservedStock?: number;
  distributedCount?: number;
  remainingAllocated?: number;
  completionRate?: number; // 0 - 100%
  // Beneficiary Custom Allocation (تخصيص كميات متفاوتة لكل مستفيد من قبل إدارة المستفيدين)
  beneficiaryAllocations?: { [beneficiaryId: string]: number };
  eligibilityFilterCategory?: string;
  approvedBy?: string;
  approvedAt?: string;
  deliveryBatchNumber?: string;
}

export interface DistributionHandoverRecord {
  id: string;
  distributionId: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryNumber?: string;
  barcodeId: string;
  nationalId?: string;
  phone?: string;
  familySize?: number;
  receivedAt: string; // ISO datetime
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  handedByUserId?: string;
  handedByUserName: string;
  handedByUserRole?: string;
  method: 'camera_scanner' | 'hardware_scanner' | 'manual';
  notes?: string;
  itemName?: string;
  inventoryItemId?: string;
  handoverDate?: string;
  beneficiaryBarcode?: string;
  distributionTitle?: string;
  quantity?: number | string;
  unit?: string;
  // Photo proof of handover (توثيق الاستلام بالصورة الحية)
  photoUrl?: string;
  proofPhotos?: string[];
  handedDepartment?: string;
  beneficiaryConfirmedReceipt?: boolean;
  isRated?: boolean;
  ratingId?: string;
}

// سجل صرف المستودع للمتطوعين مع توثيق الباركود والصورة الحية
export interface VolunteerIssuanceRecord {
  id: string;
  volunteerId: string;
  volunteerName: string;
  volunteerMembershipNumber?: string;
  volunteerBarcode: string;
  volunteerPhone?: string;
  volunteerNationalId?: string;
  itemId: string;
  itemName: string;
  itemBarcode: string;
  quantity: number;
  unit: string;
  date: string;
  time: string;
  issuedAt: string;
  handedByUserId: string;
  handedByUserName: string;
  handedByUserRole: string;
  warehouseName: string;
  photoUrl?: string;
  notes?: string;
  initiativeId?: string;
  initiativeName?: string;
  status: 'completed' | 'returned' | 'cancelled';
}

export interface BenefitRequest {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  type: 'financial' | 'food' | 'medical' | 'housing' | 'other' | string;
  details: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  date: string;
  notes?: string;
  beneficiaryConfirmedReceipt?: boolean;
  receivedAt?: string;
  isRated?: boolean;
  ratingId?: string;
}

export interface BeneficiaryRating {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  nationalId?: string;
  phone?: string;
  aidId: string; // id of BenefitRequest or DistributionHandoverRecord
  aidType: string; // e.g. "سلة غذائية", "دعم مالي", etc.
  aidTitle?: string;
  receivedDate: string; // YYYY-MM-DD
  rating: number; // 1 to 5 stars
  notes?: string; // Optional beneficiary feedback
  createdAt: string; // ISO timestamp
}

// -------------------------------------------------------------
// Chat & Messaging Interfaces (Internal WhatsApp-style Chat)
// -------------------------------------------------------------
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole?: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'video';
  content: string; // Text content or URL for media
  fileName?: string;
  fileSize?: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface ChatConversation {
  id: string;
  type: 'direct' | 'group';
  name: string;
  avatar?: string;
  participantIds: string[];
  participantNames?: string[];
  teamId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: { [userId: string]: number };
  isTyping?: { [userId: string]: boolean };
  createdAt: string;
}

// -------------------------------------------------------------
// AI Technical Support & Ticket Interfaces
// -------------------------------------------------------------
export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderType: 'user' | 'ai' | 'agent';
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterPhone?: string;
  requesterRole: 'admin' | 'leader' | 'volunteer' | 'beneficiary' | 'public';
  subject: string;
  status: 'new' | 'in_progress' | 'pending_user' | 'closed';
  priority: 'low' | 'medium' | 'urgent';
  assignedToAgentName?: string;
  chatTranscript: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
  escalatedFromAi: boolean;
  escalationReason?: string;
}

// -------------------------------------------------------------
// Store, Financial Management & Smart Project Linkage Interfaces
// -------------------------------------------------------------
export interface StoreProject {
  id: string;
  titleAr: string;
  titleEn?: string;
  category: 'سقيا الماء' | 'توزيع المصاحف' | 'السلال الغذائية' | 'سقيا ماء زمزم' | string;
  descriptionAr: string;
  imageUrl: string;
  targetAmount: number;
  raisedAmount: number;
  availableBalance: number;
  totalExpenses: number;
  donationCount: number;
  unitPrice: number;
  status: 'active' | 'completed' | 'paused';
  accountCode: string; // الحساب المالي المستقل للمشروع
  createdAt: string;
}

export interface StoreDonation {
  id: string;
  donationNumber: string; // e.g. DON-2026-8910
  donorName: string;
  donorPhone: string;
  donorEmail?: string;
  projectId: string;
  projectNameAr: string;
  amount: number;
  paymentMethod: 'mada' | 'visa' | 'apple_pay' | 'mastercard' | 'stc_pay' | string;
  paymentStatus: 'completed' | 'pending' | 'failed';
  transactionRef: string; // e.g. TXN-90812341
  receiptUrl?: string;
  notes?: string;
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  type: 'income' | 'expense';
  category: 'donation' | 'grant' | 'project_expense' | 'operational_expense' | string;
  projectId?: string;
  projectNameAr?: string;
  amount: number;
  paymentMethod: string;
  status: 'completed' | 'pending' | 'cancelled';
  referenceNumber: string;
  donorOrVendor: string;
  description: string;
  accountCode: string;
  date: string;
  createdAt: string;
}

// -------------------------------------------------------------
// Enterprise Inventory & Stock Audit Management Interfaces
// -------------------------------------------------------------
export interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: string;
  managerName: string;
  managerPhone?: string;
  managerEmail?: string;
  itemsCount: number;
  totalQty: number;
  notes?: string;
  createdAt: string;
}

export interface InventoryVendor {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  contactPerson?: string;
  crNumber?: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryItemComponent {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  linkedItemId?: string; // صنف المخزون الفعلي المرتبط به
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  shortName?: string;
  description: string;
  imageUrl: string;
  images?: string[];
  type: 'مواد غذائية' | 'عهد مستديمة' | 'مستلزمات مكتبية' | 'أجهزة ومعدات' | 'أدوية ومستلزمات طبية' | 'كسوة وملابس' | 'عام';
  category: string;
  subCategory?: string;
  brand?: string;
  vendorId?: string;
  vendorName?: string;
  warehouseId: string;
  warehouseName: string;
  shelf?: string;
  exactLocation?: string;

  // Compound items & Components (السلال الغذائية، الكراتين، الحزم الإغاثية)
  isCompound?: boolean;
  components?: InventoryItemComponent[];

  
  // Identification
  barcode: string;
  qrCode?: string;
  serialNumber?: string;
  internalCode: string;
  
  // Quantities
  currentQty: number;
  initialQty: number;
  issuedQty: number;
  receivedQty: number;
  reservedQty: number;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  
  // Measurements
  unitOfMeasure: 'قطعة' | 'كرتون' | 'كيس' | 'صندوق' | 'عبوة' | 'لتر' | 'كيلو' | 'صحن' | 'وجبة' | string;
  
  // Pricing & Valuation
  purchasePrice: number;
  unitPrice: number;
  totalValue: number;
  lastPurchasePrice?: number;
  avgPrice?: number;
  
  // Expiry
  productionDate?: string;
  expiryDate?: string;
  shelfLifeDays?: number;
  expWarningDaysThreshold: number; // default e.g. 30 days
  
  // Audit Status
  isAudited: boolean;
  lastAuditDate?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  barcode: string;
  type: 'inbound' | 'outbound' | 'transfer' | 'write_off' | 'audit_adjustment';
  quantity: number;
  reason: string;
  vendorName?: string;
  invoiceNumber?: string;
  recipientName?: string;
  beneficiaryName?: string;
  initiativeId?: string;
  initiativeName?: string;
  sourceWarehouseId?: string;
  sourceWarehouseName?: string;
  targetWarehouseId?: string;
  targetWarehouseName?: string;
  approvedBy?: string;
  proofPhotos?: string[];
  ipAddress?: string;
  date: string;
  createdAt: string;
}

export interface InventoryAuditItem {
  itemId: string;
  itemName: string;
  barcode: string;
  systemQty: number;
  actualQty: number;
  variance: number;
  unitOfMeasure: string;
  reasonForDiscrepancy?: string;
}

export interface InventoryAudit {
  id: string;
  auditNumber: string;
  title: string;
  auditType: 'full' | 'partial' | 'warehouse' | 'category';
  warehouseId?: string;
  warehouseName?: string;
  category?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'approved';
  items: InventoryAuditItem[];
  totalSystemQty: number;
  totalActualQty: number;
  totalVariance: number;
  matchPercentage: number;
  performedBy: string;
  approvedBy?: string;
  notes?: string;
  auditDate: string;
  createdAt: string;
}

export interface Storekeeper {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
  email?: string;
  password?: string;
  assignedWarehouseId: string; // "all" or specific warehouse ID
  assignedWarehouseName: string;
  status: 'active' | 'inactive';
  permissions?: string[];
  notes?: string;
  createdAt: string;
}

export interface InventoryLog {
  id: string;
  timestamp: string;
  storekeeperId?: string;
  storekeeperName: string;
  actionType: 'add_item' | 'edit_item' | 'delete_item' | 'inbound' | 'outbound' | 'transfer' | 'write_off' | 'audit' | 'warehouse_update' | string;
  actionTitle: string;
  details: string;
  itemId?: string;
  itemName?: string;
  quantity?: number;
  warehouseName?: string;
  ip?: string;
  device?: string;
}

export interface OfficialLetterPartnership {
  whatYouOffer?: string; // ماذا تقدمون لنا؟ (ما هي مساهمتكم)
  whatYouWant?: string; // ماذا تريدون منا؟ (ما هو طلبكم)
  ourRole?: string; // دورنا (ريادة العطاء)
  yourRole?: string; // دوركم (الجهة المرسلة)
}

export interface OfficialLetter {
  id: string;
  letterNumber: string; // e.g. LTR-2026-0001
  submissionType: 'ready_file' | 'custom_letter'; // "خطاب جاهز" أو "خطاب مخصص"

  // معلومات المرسل - البيانات الأساسية
  senderName: string; // الاسم الكامل *
  senderType: 'قائد' | 'موظف' | 'زائر' | 'قائد فريق' | string; // نوع ومصدر الخطاب المحدد تلقائياً
  senderPhone: string; // رقم الجوال *
  senderEmail?: string; // البريد الإلكتروني (اختياري)
  senderRole?: string; // المنصب / الوظيفة (اختياري)
  senderOrganization?: string; // اسم الجهة / المنظمة (اختياري)

  // ربط الحساب عند تسجيل الدخول
  userId?: string;
  userRole?: string;
  teamId?: string;
  departmentId?: string;
  senderAccountId?: string; // معرف الحساب المرتبط
  senderAccountRole?: string; // نوع الحساب
  senderAccountName?: string; // اسم الحساب أو الفريق أو الإدارة
  senderAccountPerson?: string; // الاسم الرسمي المسجل بالحساب
  senderAccountDetails?: {
    id: string;
    role?: string;
    teamName?: string;
    departmentName?: string;
    jobTitle?: string;
    phone?: string;
    email?: string;
    nationalId?: string;
  };

  // رفع الخطاب الجاهز
  letterFileUrl?: string; // ملف الخطاب *
  letterFileName?: string;
  letterFileSize?: string;

  // تفاصيل الخطاب المخصص
  subject?: string; // عنوان الخطاب / الموضوع *
  messageContent?: string; // نص الخطاب / الرسالة *

  // تفاصيل الشراكة والعطاء - مقترح الشراكة
  partnershipDetails?: OfficialLetterPartnership;

  // الملفات المرفقة - اختياري
  attachmentFileUrl?: string; // رفع ملف مرفق (خطاب، مستند، صورة)
  attachmentFileName?: string;
  attachmentFileSize?: string;

  // المراجعة الإدارية
  status: 'new' | 'read' | 'under_review' | 'approved' | 'rejected' | 'archived';
  isRead: boolean;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// Electronic Custody Management System (نظام العهدة الإلكترونية)
// -------------------------------------------------------------
export interface CustodyHistoryItem {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  notes?: string;
}

export interface ElectronicCustody {
  id: string;
  custodyCode: string; // كود العهدة مثل CUST-2026-001
  recipientName: string; // اسم المستلم
  recipientType: 'volunteer' | 'employee' | 'leader' | 'authorized_user'; // نوع الحساب
  recipientIdNumber?: string; // رقم الهوية / رقم الموظف / معرف الحساب
  recipientEmail?: string; // البريد الإلكتروني للمستلم
  recipientPhone?: string; // رقم جوال المستلم
  itemName: string; // اسم العهدة
  itemCategory: string; // تصنيف أو نوع العهدة
  description: string; // وصف تفصيلي للعهدة
  quantity: number; // الكمية
  serialNumber?: string; // الرقم التسلسلي إن وجد
  status: 'delivered' | 'returned' | 'damaged' | 'under_maintenance'; // حالة العهدة
  conditionOnDelivery: string; // حالة العهدة عند الاستلام (ممتازة / جيدة / جديدة)
  deliveryDate: string; // تاريخ التسليم
  expectedReturnDate?: string; // تاريخ الإرجاع المتوقع أو الاستحقاق
  actualReturnDate?: string; // تاريخ الإرجاع الفعلي
  notes?: string; // ملاحظات إضافية
  adminName: string; // اسم المسؤول الذي سلم العهدة
  adminRole?: string; // صفة المسؤول
  emailStatus: 'sent' | 'failed' | 'not_available' | 'resent'; // حالة إرسال البريد
  emailSentAt?: string;
  pdfUrl?: string; // رابط أو معرف ملف PDF
  createdAt: string;
  updatedAt: string;
  history: CustodyHistoryItem[];
}

// -------------------------------------------------------------
// Technical Support & Team Management Interfaces (نظام الدعم الفني)
// -------------------------------------------------------------
export interface SupportAgent {
  id: string;
  name: string;
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  role: 'support_agent';
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  managerId: string;
  createdAt: string;
  activeTasksCount?: number;
  completedTasksCount?: number;
}

export interface SupportManager {
  id: string;
  name: string;
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  role: 'support_manager';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface SupportTaskHistory {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  notes?: string;
}

export interface SupportTask {
  id: string;
  taskNumber: string; // TASK-2026-001
  ticketId?: string; // معرف التذكرة المرتبطة إن وجدت
  title: string;
  description: string;
  requesterName: string;
  requesterContact?: string;
  requesterRole?: string;
  assignedAgentId: string;
  assignedAgentName: string;
  priority: 'low' | 'medium' | 'urgent' | 'critical';
  status: 'new' | 'in_progress' | 'waiting_reply' | 'completed' | 'closed' | 'cancelled';
  createdAt: string;
  dueDate?: string;
  completedAt?: string;
  notes?: string;
  attachments?: string[];
  history: SupportTaskHistory[];
}

// Export Financial Management System types
export * from './types/finance';

// Email System & Sender / SMTP Interfaces
export interface EmailSettings {
  provider: 'resend' | 'smtp' | 'both_auto';
  senderName: string;
  senderEmail: string;
  replyToEmail?: string;
  resendApiKey?: string;
  hasResendApiKey?: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPassword?: string;
  hasSmtpPassword?: boolean;
  enabled: boolean;
  enableAutoFallback?: boolean;
  testRecipientEmail?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EmailLog {
  id: string;
  timestamp: string;
  recipient: string;
  recipientName?: string;
  subject: string;
  templateType: string;
  status: 'sent' | 'failed' | 'simulated';
  provider: 'resend' | 'smtp' | 'simulation';
  errorMessage?: string;
  messageId?: string;
  metadata?: Record<string, any>;
  durationMs?: number;
}

// ==========================================
// Department-Based RBAC & Data Isolation Types
// ==========================================

export type DepartmentPermissionKey = 
  | 'view_department'         // عرض بيانات الإدارة
  | 'create_data'             // إضافة بيانات وأصناف وسجلات جديدة
  | 'edit_data'               // تعديل وتحديث البيانات
  | 'delete_data'             // حذف البيانات والسجلات
  | 'approve_data'            // اعتماد وتوثيق القرارات والمحاضر
  | 'disburse_data'           // صرف (صرف مستودع / أوامر صرف / توزيع)
  | 'receive_data'            // استلام وتوريد (استلام مستودع / توريد عيني)
  | 'print_data'              // طباعة المستندات والبطاقات
  | 'export_pdf'              // تصدير PDF
  | 'export_excel'            // تصدير Excel
  | 'manage_staff'            // إدارة موظفي الإدارة وطلبات التوظيف
  | 'manage_tasks'            // إدارة المهام والتكليفات
  | 'view_reports'            // مشاهدة واستعراض التقارير
  | 'cross_department_access' // الوصول إلى بيانات إدارة أخرى
  | 'super_admin';            // الإشراف العام للإدارة العليا

export interface UserDepartmentAccess {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  nationalId: string;
  phone?: string;
  jobTitle?: string;
  role: 'admin' | 'department_admin' | 'employee' | 'leader' | 'volunteer' | 'storekeeper' | string;
  primaryDepartmentId: string;
  primaryDepartmentName: string;
  additionalDepartmentIds?: string[]; // Multiple department binding for cross-functioning staff
  permissions: DepartmentPermissionKey[];
  allowedDepartmentIds?: string[]; // Explicit departments allowed for cross-access
  allowedPages?: string[]; // Explicit workspaces/modules allowed for this user
  teamId?: string; // If team leader
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PermissionChangeLog {
  id: string;
  timestamp: string;
  adminName: string;
  targetUserId: string;
  targetUserName: string;
  targetDepartment: string;
  oldPermissions: string[];
  newPermissions: string[];
  allowedDepartments: string[];
  reason: string;
}

export interface AccessAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  userDepartmentId: string;
  targetDepartmentId: string;
  action: string;
  resource: string;
  endpoint: string;
  status: 'allowed' | 'denied';
  ip?: string;
  device?: string;
  notes?: string;
}
