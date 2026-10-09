import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Building2, Users, Calendar, ShieldCheck, Heart, Sparkles, Smartphone, 
  Moon, Sun, HelpCircle, Bot, RefreshCw, Layers, ChevronRight, CheckCircle2,
  AlertCircle, BookOpen, ExternalLink, Award, Globe, HeartHandshake, Boxes, Shield,
  LogOut, ArrowRight, Settings, Sliders, X, Menu
} from "lucide-react";
import { 
  Department, VolunteerTeam, Volunteer, Initiative, JoinRequest, 
  AttendanceRecord, Evaluation, OperationLog, SystemStats,
  HomeSettings, NewsItem, PartnerItem, GalleryItem, Beneficiary, BenefitRequest,
  VolunteerApplication, CertificateTemplate, IssuedCertificate, InitiativeRating,
  OpportunityRequest, DepartmentDirective, Notification, TeamApplication,
  OfficialLetter, AidDistribution, DistributionHandoverRecord,
  Employee, EmployeeRequest, TeamStaffAssignment, BeneficiaryRating,
  OrgMember, HeroSlide
} from "./types";
import { AdminDashboard } from "./components/AdminDashboard";
import { LeaderDashboard } from "./components/LeaderDashboard";
import { VolunteerDashboard } from "./components/VolunteerDashboard";
import { DepartmentDashboard } from "./components/DepartmentDashboard";
import { AiChatAssistant } from "./components/AiChatAssistant";
import { OfficialHomePage } from "./components/OfficialHomePage";
import { MaintenancePage } from "./components/MaintenancePage";
import { BeneficiaryDashboard } from "./components/BeneficiaryDashboard";
import { InventoryManager } from "./components/InventoryManager";
import { AuthScreen } from "./components/AuthScreen";
import { SupportBubbleWidget } from "./components/SupportBubbleWidget";
import { NotificationBell } from "./components/NotificationBell";
import { UserSettingsModal } from "./components/UserSettingsModal";
import { ForceChangePasswordModal } from "./components/ForceChangePasswordModal";
import { playApplicationSubmittedChime } from "./utils/audioNotification";
import { DashboardErrorBoundary } from "./components/DashboardErrorBoundary";
import { 
  getApiBaseUrl, 
  buildApiUrl, 
  checkHealthEndpoint,
  getHttpStatusDescription
} from "./config/api";

export default function App() {
  // Global App States
  const [dbData, setDbData] = useState<{
    departments: Department[];
    teams: VolunteerTeam[];
    volunteers: Volunteer[];
    initiatives: Initiative[];
    requests: JoinRequest[];
    attendance: AttendanceRecord[];
    evaluations: Evaluation[];
    logs: OperationLog[];
    stats: SystemStats;
    homeSettings?: HomeSettings;
    news?: NewsItem[];
    partners?: PartnerItem[];
    gallery?: GalleryItem[];
    beneficiaries?: Beneficiary[];
    benefitRequests?: BenefitRequest[];
    volunteerApplications?: VolunteerApplication[];
    teamApplications?: TeamApplication[];
    certificateTemplates?: CertificateTemplate[];
    issuedCertificates?: IssuedCertificate[];
    initiativeRatings?: InitiativeRating[];
    opportunityRequests?: OpportunityRequest[];
    departmentDirectives?: DepartmentDirective[];
    notifications?: Notification[];
    letters?: OfficialLetter[];
    storeProjects?: any[];
    storeDonations?: any[];
    financialTransactions?: any[];
    distributions?: AidDistribution[];
    distributionHandovers?: DistributionHandoverRecord[];
    employees?: Employee[];
    employeeRequests?: EmployeeRequest[];
    teamStaffAssignments?: TeamStaffAssignment[];
    beneficiaryRatings?: BeneficiaryRating[];
    orgMembers?: OrgMember[];
    heroSlides?: HeroSlide[];
    systemSettings?: any;
    maintenance_mode?: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  
  // Dedicated persistent maintenance status fetched immediately from PostgreSQL / Backend
  const [maintenanceStatus, setMaintenanceStatus] = useState<{
    checked: boolean;
    active: boolean;
    message: string;
    loading: boolean;
    error: string | null;
  }>({
    checked: false,
    active: false,
    message: "نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.",
    loading: true,
    error: null
  });
  const [connectionDiagnostics, setConnectionDiagnostics] = useState<{
    status?: number;
    url?: string;
    details?: string;
    timestamp?: string;
  } | null>(null);
  
  // Customization preferences with localStorage persistence
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('reyadat_theme');
      if (saved) return saved === 'dark';
      return typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('reyadat_theme', isDark ? 'dark' : 'light');
    } catch (e) {
      console.error(e);
    }
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  // Session Persistence: Retrieve saved session on initial mount / page refresh
  const AUTH_SESSION_KEY = 'reyadat_auth_session';

  const getStoredSession = (): {
    role: 'admin' | 'operations_manager' | 'department_admin' | 'employee' | 'leader' | 'volunteer' | 'beneficiary' | 'storekeeper' | 'public';
    user: any;
    activeMainTab?: 'system' | 'ai' | 'guide';
    adminSubTab?: string;
    sessionToken?: string;
  } | null => {
    try {
      const raw = localStorage.getItem(AUTH_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role && parsed.user) {
        return parsed;
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  };

  const initialAuthSession = getStoredSession();

  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [currentRole, setCurrentRole] = useState<'admin' | 'operations_manager' | 'department_admin' | 'employee' | 'leader' | 'volunteer' | 'beneficiary' | 'storekeeper' | 'public'>(() => {
    try {
      const viewMode = localStorage.getItem('reyadat_view_mode');
      if (viewMode === 'public') return 'public';
    } catch {}
    return initialAuthSession?.role || (typeof window !== 'undefined' && window.location.search.includes('resetToken') ? 'admin' : 'public');
  });
  const [activeMainTab, setActiveMainTab] = useState<'system' | 'ai' | 'guide'>(
    initialAuthSession?.activeMainTab || 'system'
  );
  const [adminSubTab, setAdminSubTab] = useState<string | undefined>(
    initialAuthSession?.adminSubTab || 'stats'
  );
  const [authenticatedUser, setAuthenticatedUser] = useState<any | null>(
    initialAuthSession?.user || null
  );
  const [savedUserRole, setSavedUserRole] = useState<'admin' | 'operations_manager' | 'department_admin' | 'employee' | 'leader' | 'volunteer' | 'beneficiary' | 'storekeeper' | null>(() => {
    const stored = getStoredSession();
    return stored?.role && stored.role !== 'public' ? (stored.role as any) : null;
  });
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState<boolean>(false);
  const [isPortalMobileMenuOpen, setIsPortalMobileMenuOpen] = useState<boolean>(false);

  // Track user dashboard role whenever in internal view
  useEffect(() => {
    if (currentRole && currentRole !== 'public') {
      setSavedUserRole(prev => (prev === currentRole ? prev : currentRole));
    }
  }, [currentRole]);

  // Centralized Navigation between Public Site and Management Dashboards
  const handleNavigateToPublicHome = () => {
    if (currentRole && currentRole !== 'public') {
      setSavedUserRole(currentRole);
    }
    setCurrentRole('public');
    try {
      localStorage.setItem('reyadat_view_mode', 'public');
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReturnToDashboard = () => {
    try {
      localStorage.removeItem('reyadat_view_mode');
    } catch {}
    const stored = getStoredSession();
    const targetRole = savedUserRole || (stored?.role && stored.role !== 'public' ? stored.role : null) || authenticatedUser?.role || 'admin';
    setCurrentRole(targetRole as any);
    setActiveMainTab('system');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Synchronize authenticated session state to localStorage
  useEffect(() => {
    try {
      if (authenticatedUser) {
        const stored = getStoredSession();
        const roleToSave = (currentRole && currentRole !== 'public') 
          ? currentRole 
          : (savedUserRole || stored?.role || authenticatedUser?.role || 'admin');
        const payload = {
          role: roleToSave,
          user: authenticatedUser,
          activeMainTab,
          adminSubTab,
          sessionToken: stored?.sessionToken || authenticatedUser?.sessionToken,
          timestamp: Date.now()
        };
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(payload));
      } else if (!authenticatedUser && currentRole === 'public') {
        localStorage.removeItem(AUTH_SESSION_KEY);
      }
    } catch (e) {
      console.error("Failed to persist session to localStorage", e);
    }
  }, [authenticatedUser, currentRole, savedUserRole, activeMainTab, adminSubTab]);

  // Session Re-hydration on mount: verify session token with server
  useEffect(() => {
    const rehydrateSession = async () => {
      try {
        const stored = getStoredSession();
        if (!stored?.user) return;

        const headers: Record<string, string> = {};
        if (stored.sessionToken) {
          headers['x-session-token'] = stored.sessionToken;
        }
        if (stored.user.id) {
          headers['x-user-id'] = stored.user.id;
          headers['x-user-role'] = stored.role;
        }

        const res = await fetch(buildApiUrl("/api/db/auth/session"), { headers });
        if (res.ok) {
          const sessionData = await res.json();
          if (sessionData && sessionData.status === "success" && sessionData.user) {
            setAuthenticatedUser(sessionData.user);
            setCurrentRole(sessionData.role);
            const token = sessionData.sessionToken || stored.sessionToken;
            localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
              ...stored,
              role: sessionData.role,
              user: sessionData.user,
              sessionToken: token,
              timestamp: Date.now()
            }));
          }
        }
      } catch (err) {
        console.warn("Session rehydration check failed:", err);
      }
    };

    rehydrateSession();
  }, []);

  // Centralized safe logout handler (destroys session cleanly)
  const handleLogout = async () => {
    try {
      const stored = getStoredSession();
      if (stored?.sessionToken) {
        await fetch(buildApiUrl("/api/db/auth/logout"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionToken: stored.sessionToken })
        }).catch(() => {});
      }
      localStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem('reyadat_view_mode');
    } catch {
      // Ignore
    }
    setAuthenticatedUser(null);
    setSavedUserRole(null);
    setCurrentRole('public');
    setActiveMainTab('system');
    setAdminSubTab(undefined);
  };

  // Centralized login success handler (persists session immediately)
  const handleLoginSuccess = (role: string, user: any) => {
    setAuthenticatedUser(user);
    setSavedUserRole(role as any);
    setCurrentRole(role as any);
    setActiveMainTab('system');
    try {
      const sessionToken = user?.sessionToken || `tok_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
        role,
        user,
        sessionToken,
        activeMainTab: 'system',
        adminSubTab: undefined,
        timestamp: Date.now()
      }));
    } catch {
      // Ignore
    }
  };

  // Simulation Active Profiles
  const [selectedLeaderId, setSelectedLeaderId] = useState<string>("");
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>("");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>("");

  // Memoized handlers to stabilize dashboard rendering and prevent re-render loops
  const handleAdminSubTabChange = useCallback((newTab: string) => {
    setAdminSubTab(newTab);
  }, []);

  const handleRefreshGlobalData = useCallback(() => {
    fetchDatabase(true);
  }, []);

  // Backend Connection & Health Check States
  const [isCheckingHealth, setIsCheckingHealth] = useState<boolean>(false);
  const [healthStatusBadge, setHealthStatusBadge] = useState<{ ok: boolean; message: string } | null>(null);

  // Helper to build auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    const session = getStoredSession();
    if (session?.sessionToken) headers['x-session-token'] = session.sessionToken;
    if (session?.user?.id) headers['x-user-id'] = session.user.id;
    if (session?.role) headers['x-user-role'] = session.role;
    if (session?.user?.departmentId) headers['x-department-id'] = session.user.departmentId;
    if (session?.user?.nationalId) headers['x-national-id'] = session.user.nationalId;
    if (session?.user?.teamId) headers['x-team-id'] = session.user.teamId;
    return headers;
  };

  // Fetch Dedicated Maintenance Status directly from PostgreSQL / Backend (Instant & lightweight with safe retry)
  const fetchMaintenanceStatus = async (retryCount = 0): Promise<boolean | null> => {
    try {
      setMaintenanceStatus(prev => ({ ...prev, loading: true, error: null }));
      const cacheBuster = `t=${Date.now()}`;
      const statusUrl = `${buildApiUrl("/api/maintenance/status")}?${cacheBuster}`;
      const res = await fetch(statusUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const isActive = Boolean(data.maintenance_mode === 1 || data.maintenanceMode === true);
        const msg = data.maintenance_message || "نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.";
        setMaintenanceStatus({
          checked: true,
          active: isActive,
          message: msg,
          loading: false,
          error: null
        });
        return isActive;
      } else {
        throw new Error(`HTTP Error: ${res.status}`);
      }
    } catch (err: any) {
      console.warn(`[Maintenance Status Check Attempt ${retryCount + 1} Warning]:`, err);
      if (retryCount < 2) {
        await new Promise(r => setTimeout(r, 700));
        return fetchMaintenanceStatus(retryCount + 1);
      }
      // Never silently force active: false upon connection failure!
      setMaintenanceStatus(prev => ({
        ...prev,
        loading: false,
        error: "تعذر التحقق من حالة وضع الصيانة بسبب خطأ في الاتصال بالخادم الرئيسي"
      }));
    }
    return null;
  };

  // Fetch Database (Supports silent background fetch without unmounting active components)
  const fetchDatabase = async (isBackground = false) => {
    try {
      if (!isBackground && !dbData) {
        setLoading(true);
      }
      setIsRetrying(true);
      const headers = getAuthHeaders();
      const targetUrl = buildApiUrl("/api/db");
      const res = await fetch(targetUrl, { 
        headers,
        cache: 'no-store'
      });

      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      const isJson = contentType.includes("application/json");

      if (!res.ok) {
        let errorDetails = "";
        if (isJson) {
          try {
            const errJson = await res.json();
            errorDetails = errJson.message || errJson.error || JSON.stringify(errJson);
          } catch {
            errorDetails = await res.text().catch(() => "");
          }
        } else {
          const rawText = await res.text().catch(() => "");
          const titleMatch = rawText.match(/<title[^>]*>([^<]+)<\/title>/i);
          const pageTitle = titleMatch ? titleMatch[1].trim() : "";
          const cleanSnippet = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
          if (pageTitle) {
            errorDetails = `صفحة ويب بعنوان: "${pageTitle}"`;
          } else if (cleanSnippet) {
            errorDetails = `محتوى غير JSON (${cleanSnippet})`;
          } else {
            errorDetails = `نوع المحتوى: ${contentType || "HTML/Text"}`;
          }
        }

        const statusDesc = getHttpStatusDescription(res.status, res.statusText);
        const diagInfo = {
          status: res.status,
          url: targetUrl,
          details: errorDetails || `HTTP Error ${res.status}: ${statusDesc}`,
          timestamp: new Date().toLocaleTimeString("ar-SA")
        };
        setConnectionDiagnostics(diagInfo);
        throw new Error(`فشل في الاتصال بالخادم الرئيسي (رمز الاستجابة: ${res.status} - ${statusDesc})`);
      }

      if (!isJson) {
        const rawText = await res.text().catch(() => "");
        const cleanSnippet = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
        throw new Error(`الخادم أعاد كود 200 ولكن نوع المحتوى (${contentType}) ليس JSON (${cleanSnippet || 'HTML/Text'})`);
      }

      const data = await res.json();
      setDbData(data);
      setError(null);
      setConnectionDiagnostics(null);
      setHealthStatusBadge(null);

      // Synchronize maintenance status from database payload
      if (data?.systemSettings || typeof data?.maintenance_mode !== 'undefined') {
        const isMActive = Boolean(
          data?.systemSettings?.maintenanceMode === true ||
          data?.systemSettings?.maintenance_mode === 1 ||
          data?.maintenance_mode === 1
        );
        const msg = data?.systemSettings?.maintenance_message || data?.systemSettings?.maintenanceMessage;
        setMaintenanceStatus(prev => {
          // If already verified active via /api/maintenance/status, NEVER demote to inactive via background /api/db!
          if (prev.checked && prev.active && !isMActive) {
            return prev;
          }
          return {
            checked: true,
            active: isMActive,
            message: msg || prev.message,
            loading: false,
            error: null
          };
        });
      }
      
      // Auto-select simulation IDs only when not authenticated
      const currentStored = getStoredSession();
      if (!currentStored?.user) {
        if (data.teams && data.teams.length > 0) {
          setSelectedLeaderId(data.teams[0].id);
        }
        if (data.volunteers && data.volunteers.length > 0) {
          setSelectedVolunteerId(data.volunteers[0].id);
        }
        if (data.beneficiaries && data.beneficiaries.length > 0) {
          setSelectedBeneficiaryId(data.beneficiaries[0].id);
        }
      }
    } catch (err: any) {
      console.error("[System Connection Error]:", err);
      const isNetworkError = err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network');
      const friendlyMessage = isNetworkError 
        ? "تعذر الوصول إلى خادم الجمعية عبر هذا النطاق، يرجى التحقق من اتصالك بالإنترنت وصلاحية شهادة SSL أو إعدادات CORS."
        : (err.message || "حدث خطأ غير متوقع في جلب البيانات من الخادم الرئيسي");
      
      // Only set fatal error if we do not have dbData yet.
      // If data is already loaded, background polling or transient network errors must NEVER unmount the active UI.
      if (!dbData) {
        setError(friendlyMessage);
      }
      if (!connectionDiagnostics) {
        setConnectionDiagnostics({
          status: 0,
          url: buildApiUrl("/api/db"),
          details: err.stack || err.message,
          timestamp: new Date().toLocaleTimeString("ar-SA")
        });
      }
    } finally {
      setIsRetrying(false);
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchMaintenanceStatus();
    fetchDatabase();
  }, []);

  // Track incoming applications in real time to play subtle chime alert
  const prevVolAppsCountRef = useRef<number | null>(null);
  const prevTeamAppsCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!dbData) return;
    const currentVolCount = (dbData.volunteerApplications || []).length;
    const currentTeamCount = (dbData.teamApplications || []).length;

    if (prevVolAppsCountRef.current !== null && prevTeamAppsCountRef.current !== null) {
      if (currentVolCount > prevVolAppsCountRef.current || currentTeamCount > prevTeamAppsCountRef.current) {
        // Play subtle sound when a new volunteer or team application arrives
        playApplicationSubmittedChime();
      }
    }

    prevVolAppsCountRef.current = currentVolCount;
    prevTeamAppsCountRef.current = currentTeamCount;
  }, [dbData?.volunteerApplications, dbData?.teamApplications]);

  // Background polling every 25 seconds so applications submitted on other devices trigger alert
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchDatabase(true);
    }, 25000);
    return () => clearInterval(pollInterval);
  }, []);

  // Post / Sync database state helper (never unmounts views on refresh)
  const syncWithServer = async (endpoint: string, payload: any, actionDescription: string) => {
    try {
      const authHeaders = getAuthHeaders();
      const finalUrl = buildApiUrl(endpoint);
      const res = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || `فشل الخادم في تنفيذ العملية: ${actionDescription}`);
      }
      const updatedData = await res.json();
      
      // Update state with robust response matching
      if (updatedData && updatedData.departments && updatedData.teams) {
        setDbData(updatedData);
      } else if (updatedData && updatedData.db) {
        setDbData(updatedData.db);
      } else {
        // Silent background refresh preserves active page, form, and tab states
        await fetchDatabase(true);
      }
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  // Centralized Maintenance Mode Handler (Persistent in database & audit logs)
  const handleToggleMaintenance = async (enabled: boolean, message?: string): Promise<{ success: boolean; error?: string }> => {
    const authHeaders = getAuthHeaders();
    const finalUrl = buildApiUrl("/api/maintenance/toggle");
    const session = getStoredSession();
    const performerName = session?.user?.name || authenticatedUser?.name || "الإدارة العامة";
    const userRole = currentRole || session?.role || authenticatedUser?.role || 'operations_manager';
    const userId = authenticatedUser?.id || session?.user?.id || 'ops-manager';
    
    const payload = {
      enabled,
      message,
      performerName,
      role: userRole,
      userRole: userRole,
      userId: userId
    };

    console.log(`[Maintenance Toggle Request]:`, {
      requestUrl: finalUrl,
      httpMethod: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        ...authHeaders,
        'x-user-role': userRole,
        'x-user-id': userId
      },
      payload
    });

    try {
      const res = await fetch(finalUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          ...authHeaders,
          'x-user-role': userRole,
          'x-user-id': userId
        },
        body: JSON.stringify(payload)
      });

      const resText = await res.text().catch(() => "");
      let resJson: any = null;
      try {
        resJson = resText ? JSON.parse(resText) : null;
      } catch {}

      // Explicitly print Request URL, HTTP Method, HTTP Status, Response Body to console
      console.log(`[Maintenance Toggle Response]:`, {
        requestUrl: finalUrl,
        httpMethod: 'POST',
        httpStatus: res.status,
        responseBody: resJson || resText
      });

      if (!res.ok) {
        const statusDesc = getHttpStatusDescription(res.status, res.statusText);
        const errorMsg = resJson?.error || `فشل الخادم في تغيير حالة وضع الصيانة (رمز الاستجابة: ${res.status} - ${statusDesc})`;
        throw new Error(errorMsg);
      }

      if (resJson) {
        const isMActive = Boolean(resJson.maintenance_mode === 1 || resJson.maintenanceMode === true);
        const msg = resJson.maintenance_message || message || "نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.";
        setMaintenanceStatus({
          checked: true,
          active: isMActive,
          message: msg,
          loading: false
        });

        if (resJson.db) {
          setDbData(resJson.db);
        } else if (resJson.systemSettings) {
          setDbData((prev: any) => prev ? {
            ...prev,
            systemSettings: resJson.systemSettings,
            maintenance_mode: resJson.maintenance_mode
          } : prev);
        }
      }

      // Refresh database in background to ensure all records sync smoothly
      fetchDatabase(true).catch(() => {});
      return { success: true };
    } catch (err: any) {
      console.error("[Maintenance Toggle Error]:", {
        requestUrl: finalUrl,
        httpMethod: 'POST',
        error: err?.message || err
      });
      return {
        success: false,
        error: err?.message || "تعذر الاتصال بالخادم لتغيير حالة وضع الصيانة."
      };
    }
  };

  // CRUD & Interactive Event Handlers

  const handleAddDepartment = async (dep: Partial<Department>) => {
    const payload = {
      ...dep,
      id: dep.id || "dep-" + Date.now()
    };
    await syncWithServer("/api/db/departments/add", payload, "إضافة إدارة");
  };

  const handleDeleteDepartment = async (id: string) => {
    await syncWithServer("/api/db/departments/delete", { id }, "حذف إدارة");
  };

  const handleAddTeam = async (team: Partial<VolunteerTeam>) => {
    const payload = {
      ...team,
      id: team.id || "team-" + Date.now(),
      broadcasts: (team as any).broadcasts || []
    };
    await syncWithServer("/api/db/teams/add", payload, "إنشاء فريق");
  };

  const handleDeleteTeam = async (id: string) => {
    await syncWithServer("/api/db/teams/delete", { id }, "حذف فريق تطوعي");
  };

  const handleAddVolunteer = async (vol: Partial<Volunteer>) => {
    const payload = {
      ...vol,
      id: vol.id || "vol-" + Date.now(),
      points: vol.points ?? 0,
      membershipNumber: vol.membershipNumber || "VOL-" + Math.floor(100000 + Math.random() * 900000),
      barcode: vol.barcode || "" + Math.floor(1000000000 + Math.random() * 9000000000),
      photo: vol.photo || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop"
    };
    await syncWithServer("/api/db/volunteers/add", payload, "إضافة متطوع");
  };

  const handleDeleteVolunteer = async (id: string) => {
    await syncWithServer("/api/db/volunteers/delete", { id }, "حذف متطوع");
  };

  const handleBatchCreateVolunteers = async (list: Array<{ name: string; email?: string; phone?: string; teamId: string; departmentId: string }>) => {
    const payload = { volunteers: list };
    await syncWithServer("/api/db/volunteers/batch", payload, "استيراد جماعي للمتطوعين");
  };

  const handleAddInitiative = async (init: Partial<Initiative>) => {
    const payload = {
      ...init,
      id: init.id || "init-" + Date.now(),
      acceptedVolunteerIds: init.acceptedVolunteerIds || [],
      registrationStatus: init.registrationStatus || "open"
    };
    await syncWithServer("/api/db/initiatives/add", payload, "طرح مبادرة");
  };

  const handleCopyInitiative = async (originalId: string, newDate: string, newName: string) => {
    const payload = { originalId, newDate, newName };
    await syncWithServer("/api/db/initiatives/copy", payload, "نسخ مبادرة تطوعية");
  };

  const handleResetDb = async () => {
    await syncWithServer("/api/db/reset", {}, "إعادة ضبط قاعدة البيانات");
  };

  const handleRestoreDb = async (fullJson: any) => {
    await syncWithServer("/api/db/restore", { db: fullJson }, "استرجاع قاعدة البيانات");
  };

  const handleReissueCard = async (volunteerId: string) => {
    await syncWithServer("/api/db/reissue-card", { volunteerId }, "إعادة إصدار بطاقة المتطوع");
  };

  const handleActionRequest = async (requestId: string, action: 'accepted' | 'rejected' | 'waitlist' | 'transfer', targetTeamId?: string) => {
    const payload = { requestId, action, targetTeamId };
    await syncWithServer("/api/db/requests/action", payload, "التحكم في طلب الانضمام");
  };

  const handleRecordAttendance = async (record: {
    initiativeId: string;
    volunteerId: string;
    status: 'full' | 'late' | 'excused' | 'unexcused';
    wearingVest: boolean;
    recorderBy: string;
  }) => {
    await syncWithServer("/api/db/attendance/record", record, "تأكيد وتحضير المتطوع");
  };

  const handleSendBroadcast = async (teamId: string, message: string) => {
    await syncWithServer("/api/db/teams/broadcast", { teamId, message }, "بث رسالة دائرية");
  };

  const handleSaveEvaluation = async (evaluation: Evaluation) => {
    await syncWithServer("/api/db/evaluations/add", { evaluation }, "حفظ تقييم أداء المتطوع");
  };

  const handleApplyInitiative = async (initiativeId: string) => {
    await syncWithServer("/api/db/initiatives/apply", { volunteerId: selectedVolunteerId || (authenticatedUser?.id), initiativeId }, "التقديم على مبادرة تطوعية");
    playApplicationSubmittedChime();
  };

  const handleCheckoutInitiative = async (initiativeId: string, volunteerId: string) => {
    await syncWithServer("/api/db/attendance/checkout", { initiativeId, volunteerId }, "تسجيل انصراف متطوع");
  };

  const handleToggleVolunteerStatus = async (id: string, status: 'active' | 'inactive' | 'suspended') => {
    await syncWithServer("/api/db/volunteers/toggle-status", { id, status }, "تغيير حالة بطاقة المتطوع");
  };

  const handleAddDepartmentDirective = async (directive: Partial<DepartmentDirective>) => {
    await syncWithServer("/api/db/departmentDirectives/add", { directive }, "إصدار وتوجيه قرار/تكليف جديد من مجلس الإدارة");
  };

  const handleUpdateDirectiveStatus = async (directiveId: string, status: 'pending' | 'in_progress' | 'completed', completionNotes?: string) => {
    await syncWithServer("/api/db/departmentDirectives/updateStatus", { directiveId, status, completionNotes }, "تحديث حالة التكليف الإداري");
  };

  const handleDeleteDepartmentDirective = async (directiveId: string) => {
    await syncWithServer("/api/db/departmentDirectives/delete", { directiveId }, "حذف التكليف الإداري");
  };

  const handleUpdateVolunteerPermissions = async (id: string, role: string, permissions: string[]) => {
    await syncWithServer("/api/db/volunteers/permissions", { id, role, permissions }, "تحديث الصلاحيات والأدوار");
  };

  const handleSendMultiChannelBroadcast = async (data: {
    type: 'all' | 'department' | 'team' | 'initiative' | 'individual';
    targetId: string;
    titleAr: string;
    titleEn: string;
    bodyAr: string;
    bodyEn: string;
    channels: { system: boolean; whatsapp: boolean; sms: boolean; email: boolean };
  }) => {
    await syncWithServer("/api/db/notifications/add", data, "إرسال تعميم متعدد القنوات");
  };

  const handleUpdateHomeSettings = async (updated: HomeSettings) => {
    return await syncWithServer("/api/db/homeSettings", updated, "تحديث إعدادات الصفحة الرئيسية والألوان والهوية");
  };

  const handleAddNewsItem = async (item: Partial<NewsItem>) => {
    return await syncWithServer("/api/db/news/add", item, "إضافة أو تعديل تغطية إخبارية");
  };

  const handleDeleteNewsItem = async (id: string) => {
    return await syncWithServer("/api/db/news/delete", { id }, "حذف تغطية إخبارية");
  };

  const handleAddPartnerItem = async (item: Partial<PartnerItem>) => {
    return await syncWithServer("/api/db/partners/add", item, "إضافة أو تعديل شريك أو راعٍ");
  };

  const handleDeletePartnerItem = async (id: string) => {
    return await syncWithServer("/api/db/partners/delete", { id }, "حذف شريك أو راعٍ");
  };

  const handleBatchUpdatePartners = async (partnersList: PartnerItem[]) => {
    return await syncWithServer("/api/db/partners/batch-update", { partners: partnersList }, "تحديث قائمة الشركاء وترتيبهم");
  };

  const handleAddGalleryItem = async (item: Partial<GalleryItem>) => {
    return await syncWithServer("/api/db/gallery/add", item, "إضافة ميديا جديدة");
  };

  const handleDeleteGalleryItem = async (id: string) => {
    return await syncWithServer("/api/db/gallery/delete", { id }, "حذف ميديا من المعرض");
  };

  // Org Members Handlers (الهيكل الإداري)
  const handleAddOrgMember = async (member: Partial<OrgMember>) => {
    return await syncWithServer("/api/db/org-members/add", member, "إضافة عضو في الهيكل الإداري");
  };

  const handleDeleteOrgMember = async (id: string) => {
    return await syncWithServer("/api/db/org-members/delete", { id }, "حذف عضو من الهيكل الإداري");
  };

  const handleToggleOrgMemberActive = async (id: string, isActive?: boolean) => {
    return await syncWithServer("/api/db/org-members/toggle-active", { id, isActive }, "تغيير حالة تفعيل العضو");
  };

  const handleBatchUpdateOrgMembers = async (members: OrgMember[]) => {
    return await syncWithServer("/api/db/org-members/batch-update", { members }, "تحديث أعضاء وترتيب الهيكل الإداري");
  };

  const handleImportDirectors = async () => {
    return await syncWithServer("/api/db/org-members/import-directors", {}, "استيراد أعضاء مجلس الإدارة الرسمي");
  };

  // Hero Slides Handlers (معرض صور الصفحة الرئيسية)
  const handleAddHeroSlide = async (slide: Partial<HeroSlide>) => {
    return await syncWithServer("/api/db/hero-slides/add", slide, "إضافة شريحة صورة جديدة");
  };

  const handleDeleteHeroSlide = async (id: string) => {
    return await syncWithServer("/api/db/hero-slides/delete", { id }, "حذف شريحة صورة");
  };

  const handleToggleSlideActive = async (id: string, isActive?: boolean) => {
    return await syncWithServer("/api/db/hero-slides/toggle-active", { id, isActive }, "تغيير حالة تفعيل الشريحة");
  };

  const handleBatchUpdateHeroSlides = async (slides: HeroSlide[]) => {
    return await syncWithServer("/api/db/hero-slides/batch-update", { slides }, "تحديث ترتيب صور الواجهة الرئيسية");
  };

  const handleUpdateBeneficiaryStatus = async (id: string, status: "approved" | "pending" | "rejected") => {
    return await syncWithServer("/api/db/beneficiaries/status", { id, status }, "تحديث حالة حساب مستفيد");
  };

  const handleAddCertificateTemplate = async (tmpl: any) => {
    return await syncWithServer("/api/db/certificates/templates/add", tmpl, "حفظ قالب الشهادة");
  };

  const handleDeleteCertificateTemplate = async (id: string) => {
    return await syncWithServer("/api/db/certificates/templates/delete", { id }, "حذف قالب الشهادة");
  };

  const handleAddOpportunityRequest = async (opp: Partial<OpportunityRequest>) => {
    return await syncWithServer("/api/db/opportunity-requests/add", opp, "رفع طلب فرصة تطوعية");
  };

  const handleResubmitOpportunityRequest = async (payload: any) => {
    return await syncWithServer("/api/db/opportunity-requests/resubmit", payload, "إعادة إرسال الفرصة بعد التعديل");
  };

  const handleUpdateOpportunityRequest = async (payload: { id: string; status: string; startDate?: string; endDate?: string; nationalPlatformUrl?: string; neededCount?: number; rejectionReason?: string; correctionNotes?: string; updatedFields?: any; opportunityCode?: string; reviewerName?: string; isLeaderResubmit?: boolean; leaderName?: string }) => {
    return await syncWithServer("/api/db/opportunity-requests/update", payload, "تحديث ومراجعة فرصة التطوع");
  };

  const handleIssueCertificates = async (payload: any) => {
    return await syncWithServer("/api/db/certificates/issue", payload, "إصدار شهادات التطوع");
  };

  const handleSubmitRating = async (ratingPayload: any) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/initiatives/rate-by-volunteer"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ratingPayload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل تسجيل التقييم");
      }
      if (data.db) setDbData(data.db);
      else await fetchDatabase();
      return true;
    } catch (err: any) {
      console.warn("Falling back to standard rating handler:", err.message);
      return await syncWithServer("/api/db/ratings/add", ratingPayload, "إرسال تقييم المبادرة وتفعيل الشهادة المعلقة");
    }
  };

  const handleEvaluateTeamPoints = async (payload: {
    initiativeId: string;
    evaluationType: 'completed_best' | 'average_with_notes';
    notes?: string;
    evaluatorName?: string;
    evaluatorRole?: string;
  }) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/initiatives/evaluate-points"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "فشل تقييم المبادرة واحتساب النقاط");
        return false;
      }
      if (data.db) setDbData(data.db);
      else await fetchDatabase();
      return true;
    } catch (err: any) {
      alert(err.message || "حدث خطأ أثناء تقييم المبادرة");
      return false;
    }
  };

  const handleUpdateBenefitRequestStatus = async (id: string, status: "pending" | "approved" | "in_progress" | "completed" | "rejected", notes: string) => {
    return await syncWithServer("/api/db/benefitRequests/status", { id, status, notes }, "تحديث حالة طلب دعم وملاحظات الصرف");
  };

  const handleSubmitVolunteerApplication = async (appData: Partial<VolunteerApplication>) => {
    const success = await syncWithServer("/api/db/volunteerApplications/submit", appData, "تقديم طلب انضمام متطوع جديد");
    if (success) {
      playApplicationSubmittedChime();
    }
    return success;
  };

  const handleAcceptVolunteerApplication = async (applicationId: string, teamId: string) => {
    return await syncWithServer("/api/db/volunteerApplications/accept", { applicationId, teamId }, "قبول طلب انضمام متطوع وإسناد الفريق");
  };

  const handleRejectVolunteerApplication = async (applicationId: string, rejectionReason: string) => {
    return await syncWithServer("/api/db/volunteerApplications/reject", { applicationId, rejectionReason }, "رفض طلب انضمام متطوع");
  };

  const handleAddBeneficiary = async (ben: Partial<Beneficiary>) => {
    return await syncWithServer("/api/db/beneficiaries/add", ben, "تسجيل حساب مستفيد جديد");
  };

  const handleAddBenefitRequest = async (req: Partial<BenefitRequest>) => {
    return await syncWithServer("/api/db/benefitRequests/add", req, "تقديم طلب دعم ومساعدة إنسانية");
  };

  const handleConfirmAidReceipt = async (payload: { aidId: string; aidType?: string; beneficiaryId: string }) => {
    return await syncWithServer("/api/db/aid/confirm-receipt", payload, "تأكيد استلام المساعدة الإنسانية بنجاح");
  };

  const handleSubmitBeneficiaryRating = async (ratingData: Partial<BeneficiaryRating>) => {
    return await syncWithServer("/api/db/beneficiaryRatings/add", ratingData, "إرسال تقييم المستفيد للخدمة المقدمة");
  };

  const handleRegisterVolunteer = async (vol: Partial<Volunteer>) => {
    try {
      await handleAddVolunteer(vol);
      return true;
    } catch {
      return false;
    }
  };

  const handleRegisterBeneficiary = async (ben: Partial<Beneficiary>) => {
    try {
      await handleAddBeneficiary(ben);
      return true;
    } catch {
      return false;
    }
  };

  const handleDonateFromStore = async (donationData: {
    projectId: string;
    amount: number;
    donorName: string;
    donorPhone?: string;
    paymentMethod: string;
    unitsCount?: number;
  }) => {
    return await syncWithServer("/api/db/store/donate", donationData, "إتمام عملية التبرع المباشر المربوط بالفاتورة الحية");
  };

  const handleAddExpense = async (data: {
    projectId: string;
    amount: number;
    vendorName: string;
    description: string;
    paymentMethod?: string;
  }) => {
    return await syncWithServer("/api/db/financial/transactions/add_expense", data, "تسجيل قيد مصروف جديد لمشروع");
  };

  const handleAddStoreProject = async (project: any) => {
    return await syncWithServer("/api/db/store/projects/add", project, "إضافة مشروع جديد لمتجر الجمعية");
  };

  // Beneficiaries Import Handler (Excel / PDF)
  const handleImportBeneficiaries = async (beneficiariesList: Partial<Beneficiary>[], fileType: 'excel' | 'pdf') => {
    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch(buildApiUrl("/api/db/beneficiaries/import"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          beneficiaries: beneficiariesList,
          fileType,
          importedBy: authenticatedUser?.name || 'الإدارة العامة'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل استيراد المستفيدين");
      }
      if (data && data.departments && data.teams) {
        setDbData(data);
      } else if (data.db) {
        setDbData(data.db);
      } else {
        await fetchDatabase(true);
      }
      return true;
    } catch (err: any) {
      alert(`خطأ في الاستيراد: ${err.message}`);
      return false;
    }
  };

  // Aid Distributions CRUD & Handover Handlers
  const handleCreateDistribution = async (distData: Partial<AidDistribution>) => {
    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch(buildApiUrl("/api/db/distributions/create"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(distData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء التوزيعة");
      if (data && data.departments && data.teams) setDbData(data);
      else if (data.db) setDbData(data.db);
      else await fetchDatabase(true);
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  const handleUpdateDistribution = async (distData: Partial<AidDistribution>) => {
    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch(buildApiUrl("/api/db/distributions/update"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(distData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تحديث التوزيعة");
      if (data && data.departments && data.teams) setDbData(data);
      else if (data.db) setDbData(data.db);
      else await fetchDatabase(true);
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  const handleDeleteDistribution = async (distributionId: string) => {
    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch(buildApiUrl("/api/db/distributions/delete"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ distributionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل حذف التوزيعة");
      if (data && data.departments && data.teams) setDbData(data);
      else if (data.db) setDbData(data.db);
      else await fetchDatabase(true);
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  const handleHandoverSubmit = async (handoverData: any) => {
    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch(buildApiUrl("/api/db/distributions/handover"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(handoverData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "فشل تسجيل الاستلام" };
      }
      if (data && data.departments && data.teams) setDbData(data);
      else if (data.db) setDbData(data.db);
      else await fetchDatabase(true);
      return { success: true, record: data.record, beneficiary: data.beneficiary };
    } catch (err: any) {
      return { success: false, error: err.message || "حدث خطأ غير متوقع" };
    }
  };

  const handleCancelHandover = async (handoverId: string) => {
    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch(buildApiUrl("/api/db/distributions/handover/cancel"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ handoverId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إلغاء الاستلام");
      if (data && data.departments && data.teams) setDbData(data);
      else if (data.db) setDbData(data.db);
      else await fetchDatabase(true);
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  const handleRegisterTeam = async (team: Partial<VolunteerTeam>) => {
    try {
      await handleAddTeam(team);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmitTeamApplication = async (app: Partial<TeamApplication>) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/teamApplications/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(app)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.db) setDbData(data.db);
        playApplicationSubmittedChime();
        return { success: true, applicationNumber: data.applicationNumber, message: data.message };
      }
      return { success: false, message: data.error || "فشل إرسال الطلب" };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const handleAcceptTeamApplication = async (appId: string, departmentId: string, reviewerNotes?: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/teamApplications/accept"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, departmentId, reviewerNotes })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل اعتماد طلب انضمام الفريق");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  const handleRejectTeamApplication = async (appId: string, reason: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/teamApplications/reject"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, rejectionReason: reason })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل رفض طلب انضمام الفريق");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  const handleRequestTeamApplicationCorrection = async (appId: string, notes: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/teamApplications/request-correction"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, correctionNotes: notes })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل إعادة الطلب للتصحيح");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  const handleDeleteTeamApplication = async (appId: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/teamApplications/delete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل حذف طلب انضمام الفريق");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      alert(`خطأ: ${err.message}`);
      return false;
    }
  };

  const handleApplyInitiativePublic = async (initId: string, volId: string) => {
    try {
      await syncWithServer("/api/db/initiatives/apply", { volunteerId: volId, initiativeId: initId }, "التقديم على مبادرة تطوعية");
      playApplicationSubmittedChime();
      return true;
    } catch {
      return false;
    }
  };

  // Notification Handlers
  const handleSendCustomNotification = async (payload: any) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/notifications/send"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.db) setDbData(data.db);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleMarkNotificationRead = async (notificationId?: string, markAll?: boolean) => {
    try {
      const userId = authenticatedUser?.id || (currentRole === 'admin' ? 'admin' : currentRole === 'leader' ? 'leader' : currentRole === 'supervisor' ? 'supervisor' : currentRole === 'support' ? 'support' : 'all');
      const res = await fetch(buildApiUrl("/api/db/notifications/mark-read"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId, markAll })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.db) setDbData(data.db);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleDeleteNotification = async (notificationId?: string, clearAll?: boolean) => {
    try {
      const userId = authenticatedUser?.id || (currentRole === 'admin' ? 'admin' : currentRole === 'leader' ? 'leader' : currentRole === 'supervisor' ? 'supervisor' : currentRole === 'support' ? 'support' : 'all');
      const res = await fetch(buildApiUrl("/api/db/notifications/delete"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId, clearAll })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.db) setDbData(data.db);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Official Letters Handlers
  const handleSendOfficialLetter = async (letterData: Partial<OfficialLetter>) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/letters/send"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(letterData)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        if (result.db) {
          setDbData(result.db);
        } else {
          fetchDatabase();
        }
        return { success: true, letter: result.letter, message: result.message };
      }
      return { success: false, message: result.message || "تعذر إرسال الخطاب" };
    } catch (err: any) {
      return { success: false, message: err.message || "حدث خطأ في الاتصال بالخادم" };
    }
  };

  const handleUpdateLetterStatus = async (letterId: string, status: OfficialLetter['status'], adminNotes?: string) => {
    await syncWithServer("/api/db/letters/update-status", { letterId, status, adminNotes }, "تحديث حالة الخطاب");
  };

  const handleMarkLetterAsRead = async (letterId: string) => {
    await syncWithServer("/api/db/letters/mark-read", { letterId }, "تحديد الخطاب كمقروء");
  };

  const handleDeleteLetter = async (letterId: string) => {
    await syncWithServer("/api/db/letters/delete", { letterId }, "حذف الخطاب");
  };

  const handleResendNotification = async (notificationId: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/notifications/resend"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.db) setDbData(data.db);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // AI Chat message sender
  const handleAiSendMessage = async (prompt: string, history: { role: string; text: string }[]) => {
    const res = await fetch(buildApiUrl("/api/ai/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history })
    });
    if (!res.ok) throw new Error("AI Endpoint returned error");
    return await res.json();
  };

  // Staff & Employee Requests Handlers (Department & Admin)
  const handleSubmitEmployeeRequest = async (requestData: Partial<EmployeeRequest>) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/employee-requests/create"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل إرسال طلب التوظيف");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء إرسال طلب التوظيف");
      return false;
    }
  };

  const handleUpdateEmployeeRequest = async (requestId: string, updates: Partial<EmployeeRequest>) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/employee-requests/update"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, updates })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل تعديل طلب التوظيف");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء تعديل طلب التوظيف");
      return false;
    }
  };

  const handleApproveEmployeeRequest = async (requestId: string, reviewerName: string, notes?: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/employee-requests/approve"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, reviewerName, notes })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل اعتماد طلب التوظيف");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء اعتماد طلب التوظيف");
      return false;
    }
  };

  const handleRejectEmployeeRequest = async (requestId: string, reviewerName: string, rejectionReason: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/employee-requests/reject"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, reviewerName, rejectionReason })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل رفض طلب التوظيف");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء رفض الطلب");
      return false;
    }
  };

  const handleRequestEmployeeModification = async (requestId: string, reviewerName: string, modificationNotes: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/employee-requests/request-modification"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, reviewerName, modificationNotes })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل طلب تعديل بيانات الطلب");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء طلب تعديل الطلب");
      return false;
    }
  };

  const handleAssignTeamStaff = async (data: {
    teamId: string;
    teamName: string;
    employeeId: string;
    teamRole: string;
    assignedByLeaderName: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/team-staff/assign"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل تكليف الموظف بالفريق");
      }
      const resData = await res.json();
      if (resData.db) setDbData(resData.db);
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء تكليف الموظف بالفريق");
      return false;
    }
  };

  const handleRemoveTeamStaff = async (assignmentId: string) => {
    try {
      const res = await fetch(buildApiUrl("/api/db/team-staff/remove"), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل إلغاء تكليف الموظف");
      }
      const data = await res.json();
      if (data.db) setDbData(data.db);
      return true;
    } catch (err: any) {
      console.error(err);
      alert(err.message || "حدث خطأ أثناء إلغاء تكليف الموظف");
      return false;
    }
  };

  const handleQuickHealthCheck = async () => {
    setIsCheckingHealth(true);
    try {
      const activeBase = getApiBaseUrl();
      const res = await checkHealthEndpoint(activeBase || undefined);
      
      setConnectionDiagnostics({
        status: res.httpStatus,
        url: res.url,
        details: res.ok 
          ? `اتصال سليم بنجاح (${res.serverSource}) - وقت التشغيل: ${res.uptimeSeconds || 0} ثانية | البيئة: ${res.environment || 'production'}` 
          : (res.errorMessage || res.statusText),
        timestamp: new Date().toLocaleTimeString("ar-SA")
      });

      if (res.ok) {
        setHealthStatusBadge({
          ok: true,
          message: `✅ الخادم متصل وقيد العمل بنجاح (${res.httpStatus} OK) - ${res.serverSource}`
        });
        alert(`✅ فحص تشخيصي سريع لخادم النطاق (/api/health):\n\n• عنوان الخادم المعتمد: ${activeBase || (typeof window !== 'undefined' ? window.location.origin : '')}\n• مسار الصحة: ${res.url}\n• رمز HTTP الفعلي: ${res.httpStatus} (${res.statusText})\n• نوع المحتوى: ${res.contentType}\n• منصة الخادم ومصدر الاستجابة: ${res.serverSource}\n• وقت التشغيل: ${res.uptimeSeconds || 0} ثانية\n• الخدمة: ${res.service || 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة'}\n\nنتيجة الفحص: نجح الاتصال بالخادم وقاعدة البيانات جاهزة للعمل.`);
        fetchDatabase(false);
      } else {
        setHealthStatusBadge({
          ok: false,
          message: `❌ فشل الاتصال (${res.httpStatus || 'خطأ شبكة'}) - المصدر: ${res.serverSource}`
        });
        alert(`⚠️ نتيجة الفحص التشخيصي لمسار الصحة (/api/health):\n\n• عنوان الخادم المختبر: ${activeBase || (typeof window !== 'undefined' ? window.location.origin : '')}\n• مسار الصحة: ${res.url}\n• رمز HTTP الفعلي: ${res.httpStatus || 0} (${res.statusText})\n• نوع المحتوى المستلم: ${res.contentType || 'غير معروف'}\n• مصدر الاستجابة: ${res.serverSource}\n\n• سبب الفشل والتفاصيل:\n${res.errorMessage}`);
      }
    } catch (err: any) {
      alert(`❌ تعذر إتمام فحص الصحة: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // 1. Initial Checking Guard: Never display normal site before verifying backend maintenance status
  if (maintenanceStatus.loading && !maintenanceStatus.checked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans" dir="rtl">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full space-y-4">
          <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</h2>
          <p className="text-xs text-slate-400">جاري التحقق من جاهزية الموقع والاتصال الآمن بالخادم...</p>
        </div>
      </div>
    );
  }

  // 2. Safe Connection Failure Guard: Never bypass maintenance on network error
  if (maintenanceStatus.error && !maintenanceStatus.checked) {
    return (
      <div className="min-h-screen bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center font-sans" dir="rtl">
        <div className="bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-2xl max-w-md w-full space-y-5 text-right">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">تعذر الاتصال بخادم الجمعية</h2>
              <p className="text-xs text-slate-400">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200 leading-relaxed text-center">
            {maintenanceStatus.error}
            <br />
            لحماية أمن وسجلات الجمعية، يرجى إعادة المحاولة للتأكد من حالة الخادم.
          </div>
          <button 
            onClick={() => fetchMaintenanceStatus(0)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>إعادة فحص الاتصال بالخادم</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Database Initial Load (Only needed if maintenance is NOT active)
  if (loading && !dbData && !maintenanceStatus.active) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
        <div className="bg-white p-8 rounded-2xl border border-neutral-100 shadow-xl max-w-sm w-full space-y-4">
          <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
          <h2 className="text-sm font-black text-neutral-800">جاري تشغيل محرك ريادة العطاء الذكي...</h2>
          <p className="text-xs text-neutral-400">يرجى الانتظار بينما نقوم بمزامنة قاعدة البيانات وتدشين واجهة الذكاء الاصطناعي</p>
        </div>
      </div>
    );
  }

  if (((error && !dbData) || (!loading && !dbData)) && !maintenanceStatus.active) {
    return (
      <div className="min-h-screen bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center font-sans" dir="rtl">
        <div className="bg-white dark:bg-slate-950 p-6 sm:p-8 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-2xl max-w-md w-full space-y-5 text-right">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-rose-900 dark:text-rose-200">تعذر الاتصال بالخادم</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة</p>
            </div>
          </div>

          <div className="bg-rose-50/80 dark:bg-rose-950/30 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 text-xs text-rose-800 dark:text-rose-300 leading-relaxed text-center">
            {error || "تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى."}
          </div>

          <button 
            onClick={() => fetchDatabase(false)}
            disabled={isRetrying}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? "جاري إعادة الاتصال..." : "إعادة المحاولة"}</span>
          </button>

          <div className="text-[11px] text-neutral-400 text-center">
            يعتمد النظام على الاتصال التلقائي المركزي لكافة الإدارات والمستفيدين والمتطوعين دون الحاجة لضبط يدوي.
          </div>
        </div>
      </div>
    );
  }

  // Active Leader Object
  const activeLeaderTeam = authenticatedUser?.role === 'leader' 
    ? (dbData?.teams?.find(t => t.id === authenticatedUser.teamId) || dbData?.teams?.find(t => t.leaderName === authenticatedUser.name) || dbData?.teams?.[0])
    : (dbData?.teams?.find(t => t.id === selectedLeaderId) || dbData?.teams?.[0]);
  const activeLeaderDept = dbData?.departments?.find(d => d.id === activeLeaderTeam?.departmentId) || dbData?.departments?.[0] || { id: 'dep-5', nameAr: 'إدارة التطوع' };

  // Active Volunteer Object
  const activeVolunteer = authenticatedUser?.role === 'volunteer'
    ? (dbData?.volunteers?.find(v => v.id === authenticatedUser.id || v.email === authenticatedUser.email || v.nationalId === authenticatedUser.nationalId) || authenticatedUser)
    : (currentRole === 'volunteer' && selectedVolunteerId ? (dbData?.volunteers?.find(v => v.id === selectedVolunteerId) || dbData?.volunteers?.[0]) : null);

  // Active Beneficiary Object
  const activeBeneficiary = authenticatedUser?.role === 'beneficiary'
    ? (dbData?.beneficiaries?.find(b => b.id === authenticatedUser.id) || dbData?.beneficiaries?.[0])
    : (dbData?.beneficiaries?.find(b => b.id === selectedBeneficiaryId) || dbData?.beneficiaries?.[0]);

  // Centralized Maintenance Mode Status Check (Persistent from PostgreSQL / Backend)
  const isMaintenanceActive = maintenanceStatus.checked
    ? maintenanceStatus.active
    : Boolean(
        dbData?.systemSettings?.maintenanceMode === true ||
        dbData?.systemSettings?.maintenance_mode === 1 ||
        (dbData as any)?.maintenance_mode === 1
      );
  const maintenanceMessage = maintenanceStatus.message || 
    dbData?.systemSettings?.maintenance_message || 
    dbData?.systemSettings?.maintenanceMessage || 
    "نعتذر عن عدم إتاحة الموقع مؤقتًا، ونعمل على تحسين خدماتنا. نعود إليكم قريبًا بإذن الله.";

  // Authorization Check: Operations Manager and Admin are exclusively authorized during maintenance mode
  const isAuthorizedMaintenanceStaff = Boolean(
    authenticatedUser && (
      currentRole === 'admin' ||
      currentRole === 'operations_manager' ||
      authenticatedUser?.role === 'admin' ||
      authenticatedUser?.role === 'operations_manager' ||
      authenticatedUser?.permissions?.includes?.('super_admin') ||
      authenticatedUser?.permissions?.includes?.('operations_manager')
    )
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`} dir="rtl">
      
      {/* INTERNAL PORTAL HEADER (Shown only when in management portal AND authenticated, and never for blocked users during maintenance) */}
      {currentRole !== 'public' && authenticatedUser && (!isMaintenanceActive || isAuthorizedMaintenanceStaff) && (
        <header 
          style={{
            paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))',
          }}
          className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs sticky top-0 z-[999] no-print max-w-full box-border"
        >
          <div className="w-full max-w-[1860px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-2.5">
            {/* Main Header Bar */}
            <div className="flex justify-between items-center gap-2 sm:gap-4">
              
              {/* Right Side: Association Identity & Return to Public Site (Desktop) */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-xs shrink-0 font-black text-xs sm:text-sm">
                  ر
                </div>
                <div className="text-right min-w-0">
                  <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight tracking-tight truncate max-w-[150px] min-[390px]:max-w-[210px] sm:max-w-none">
                    جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
                  </h1>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                    بوابة الإدارة والأنظمة الموحدة
                  </p>
                </div>

                <button 
                  onClick={handleNavigateToPublicHome}
                  className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800 transition-all cursor-pointer shrink-0"
                  title="العودة إلى الصفحة الرئيسية للجمعية مع الحفاظ على تسجيل الدخول"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>الرئيسية</span>
                </button>
              </div>

              {/* Center: Core System Navigation Switcher (Desktop: md and up) */}
              <div className="hidden md:flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl gap-1 border border-slate-200/70 dark:border-slate-700/70 shadow-2xs shrink-0">
                <button
                  id="main-tab-system"
                  onClick={() => setActiveMainTab('system')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMainTab === 'system'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-slate-200/60 dark:border-slate-600 shadow-xs font-black'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  <span>النظام الإداري</span>
                </button>
                <button
                  id="main-tab-ai"
                  onClick={() => setActiveMainTab('ai')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeMainTab === 'ai'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 border border-slate-200/60 dark:border-slate-600 shadow-xs font-black'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                  <span>المساعد الذكي</span>
                </button>
              </div>

              {/* Left Side: Actions, Utilities & Mobile Hamburger Menu */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <NotificationBell
                  notifications={dbData?.notifications || []}
                  currentUserId={authenticatedUser?.id || (currentRole === 'admin' ? 'admin' : currentRole === 'leader' ? 'leader' : currentRole === 'supervisor' ? 'supervisor' : currentRole === 'support' ? 'support' : 'all')}
                  currentUserRole={currentRole}
                  onMarkRead={handleMarkNotificationRead}
                  onDelete={handleDeleteNotification}
                  onOpenUserSettings={() => setIsUserSettingsOpen(true)}
                />

                {/* User Settings & Preferences Button (Desktop) */}
                <button
                  id="btn-header-user-settings"
                  onClick={() => setIsUserSettingsOpen(true)}
                  className="hidden md:flex text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer items-center justify-center text-xs"
                  title="إعدادات وتفضيلات المستخدم والتنبيهات الصوتية"
                  aria-label="إعدادات وتفضيلات المستخدم"
                >
                  <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </button>

                {/* System Settings for Admin / Operations (Desktop) */}
                {(currentRole === 'admin' || currentRole === 'operations_manager') && (
                  <button
                    id="btn-header-settings"
                    onClick={() => {
                      setActiveMainTab('system');
                      setAdminSubTab('system_settings');
                    }}
                    className="hidden md:flex text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer items-center justify-center text-xs"
                    title="إعدادات النظام الشاملة"
                    aria-label="إعدادات النظام"
                  >
                    <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  </button>
                )}

                {/* Theme Toggle */}
                <button
                  id="btn-dark-toggle"
                  onClick={() => setIsDark(!isDark)}
                  className="text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 transition-all cursor-pointer flex items-center justify-center text-xs shrink-0"
                  title={isDark ? "تفعيل الوضع المضيء ☀️" : "تفعيل الوضع الليلي 🌙"}
                  aria-label="تبديل مظهر العرض"
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '12s' }} />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  )}
                </button>

                {/* User Logout Button (Desktop) */}
                {authenticatedUser && (
                  <button
                    onClick={handleLogout}
                    className="hidden md:flex bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/80 text-rose-700 dark:text-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer items-center gap-1.5 shadow-2xs shrink-0"
                    title="تسجيل الخروج من النظام"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>خروج ({authenticatedUser.name.split(" ")[0]})</span>
                  </button>
                )}

                {/* Clean Mobile Hamburger Menu Button (max-width: 768px / md:hidden) */}
                <button
                  onClick={() => setIsPortalMobileMenuOpen(prev => !prev)}
                  className="md:hidden flex items-center justify-center p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
                  title="القائمة"
                  aria-label="القائمة"
                >
                  {isPortalMobileMenuOpen ? (
                    <X className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
                  )}
                </button>
              </div>

            </div>

            {/* Mobile Collapsible Navigation Menu (max-width: 768px) */}
            {isPortalMobileMenuOpen && (
              <div className="md:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2 animate-fadeIn">
                {/* Core Navigation Switcher */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70">
                  <button
                    onClick={() => {
                      setActiveMainTab('system');
                      setIsPortalMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeMainTab === 'system'
                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>النظام الإداري</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveMainTab('ai');
                      setIsPortalMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeMainTab === 'ai'
                        ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Bot className="w-4 h-4 text-indigo-500" />
                    <span>المساعد الذكي</span>
                  </button>
                </div>

                {/* Return to Public Home */}
                <button
                  onClick={() => {
                    handleNavigateToPublicHome();
                    setIsPortalMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200/60 dark:border-emerald-800 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                    <span>العودة إلى الصفحة الرئيسية للجمعية</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-emerald-500 rtl:rotate-180" />
                </button>

                {/* User Settings */}
                <button
                  onClick={() => {
                    setIsUserSettingsOpen(true);
                    setIsPortalMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200/70 dark:border-slate-700/70 transition-all cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>إعدادات وتفضيلات المستخدم والتنبيهات الصوتية</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
                </button>

                {/* Admin System Settings */}
                {(currentRole === 'admin' || currentRole === 'operations_manager') && (
                  <button
                    onClick={() => {
                      setActiveMainTab('system');
                      setAdminSubTab('system_settings');
                      setIsPortalMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200/70 dark:border-slate-700/70 transition-all cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                      <span>إعدادات النظام الشاملة</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
                  </button>
                )}

                {/* User Logout Button */}
                {authenticatedUser && (
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsPortalMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800/80 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>تسجيل الخروج ({authenticatedUser.name})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* MAIN LAYOUT CONTAINER */}
      <main className={(currentRole === 'public' || !authenticatedUser) ? "w-full overflow-x-hidden" : "w-full max-w-[1860px] mx-auto px-3 sm:px-6 lg:px-8 xl:px-10 py-4 md:py-6"}>
        
        {/* MAIN TAB 1: SYSTEM MANAGEMENT MODULES */}
        {activeMainTab === 'system' && (
          <div className={currentRole === 'public' ? "w-full" : "space-y-6"}>
            
            {currentRole !== 'public' && !authenticatedUser ? (
              <AuthScreen
                lang={lang}
                onToggleLang={setLang}
                homeSettings={dbData?.homeSettings}
                onLoginSuccess={handleLoginSuccess}
                isMaintenanceMode={isMaintenanceActive}
                onBackToHome={() => {
                  setCurrentRole('public');
                }}
                onRegisterNewAccount={() => {
                  setCurrentRole('public');
                }}
              />
            ) : isMaintenanceActive && !isAuthorizedMaintenanceStaff ? (
              <MaintenancePage
                message={maintenanceMessage}
                associationName={dbData?.homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"}
                licenseNumber={dbData?.homeSettings?.licenseNumber || "1000888600"}
                logoUrl={dbData?.homeSettings?.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop"}
                onOpenLogin={() => {
                  setCurrentRole('admin');
                  setActiveMainTab('system');
                }}
                onRefresh={() => {
                  fetchMaintenanceStatus(0);
                  fetchDatabase(true);
                }}
                isDark={isDark}
                authenticatedUser={authenticatedUser}
                isAuthorizedStaff={false}
                onLogout={handleLogout}
              />
            ) : (
              <>
                {/* 1. ADMINISTRATION & OPERATIONS VIEW */}
                {(currentRole === 'admin' || currentRole === 'operations_manager') && (
                  <DashboardErrorBoundary pageName="لوحة التحكم العامة للإدارة والعمليات">
                    <AdminDashboard 
                      data={dbData}
                      initialSubTab={adminSubTab}
                      onSubTabChange={handleAdminSubTabChange}
                      onAddDepartment={handleAddDepartment}
                      onDeleteDepartment={handleDeleteDepartment}
                      onAddTeam={handleAddTeam}
                      onDeleteTeam={handleDeleteTeam}
                      onAddVolunteer={handleAddVolunteer}
                      onDeleteVolunteer={handleDeleteVolunteer}
                      onBatchCreateVolunteers={handleBatchCreateVolunteers}
                      onAddInitiative={handleAddInitiative}
                      onCopyInitiative={handleCopyInitiative}
                      onResetDb={handleResetDb}
                      onRestoreDb={handleRestoreDb}
                      onReissueCard={handleReissueCard}
                      onToggleVolunteerStatus={handleToggleVolunteerStatus}
                      onUpdateVolunteerPermissions={handleUpdateVolunteerPermissions}
                      onSendMultiChannelBroadcast={handleSendMultiChannelBroadcast}
                      isDark={isDark}
                      onToggleDark={() => setIsDark(!isDark)}
                      lang={lang}
                      onUpdateHomeSettings={handleUpdateHomeSettings}
                      onAddNewsItem={handleAddNewsItem}
                      onDeleteNewsItem={handleDeleteNewsItem}
                      onAddPartnerItem={handleAddPartnerItem}
                      onDeletePartnerItem={handleDeletePartnerItem}
                      onBatchUpdatePartners={handleBatchUpdatePartners}
                      onAddGalleryItem={handleAddGalleryItem}
                      onDeleteGalleryItem={handleDeleteGalleryItem}
                      onAddOrgMember={handleAddOrgMember}
                      onDeleteOrgMember={handleDeleteOrgMember}
                      onToggleOrgMemberActive={handleToggleOrgMemberActive}
                      onBatchUpdateOrgMembers={handleBatchUpdateOrgMembers}
                      onImportDirectors={handleImportDirectors}
                      onAddHeroSlide={handleAddHeroSlide}
                      onDeleteHeroSlide={handleDeleteHeroSlide}
                      onToggleSlideActive={handleToggleSlideActive}
                      onBatchUpdateHeroSlides={handleBatchUpdateHeroSlides}
                      onUpdateBeneficiaryStatus={handleUpdateBeneficiaryStatus}
                      onUpdateBenefitRequestStatus={handleUpdateBenefitRequestStatus}
                      onAddCertificateTemplate={handleAddCertificateTemplate}
                      onDeleteCertificateTemplate={handleDeleteCertificateTemplate}
                      onIssueCertificates={handleIssueCertificates}
                      opportunityRequests={dbData.opportunityRequests || []}
                      onUpdateOpportunityRequest={handleUpdateOpportunityRequest}
                      onAddDepartmentDirective={handleAddDepartmentDirective}
                      onDeleteDepartmentDirective={handleDeleteDepartmentDirective}
                      onSendCustomNotification={handleSendCustomNotification}
                      onDeleteNotification={handleDeleteNotification}
                      onResendNotification={handleResendNotification}
                      onAddExpense={handleAddExpense}
                      onAddProject={handleAddStoreProject}
                      onAddBeneficiary={handleAddBeneficiary}
                      onAcceptTeamApplication={handleAcceptTeamApplication}
                      onRejectTeamApplication={handleRejectTeamApplication}
                      onRequestTeamApplicationCorrection={handleRequestTeamApplicationCorrection}
                      onDeleteTeamApplication={handleDeleteTeamApplication}
                      onUpdateLetterStatus={handleUpdateLetterStatus}
                      onMarkLetterAsRead={handleMarkLetterAsRead}
                      onDeleteLetter={handleDeleteLetter}
                      onCreateDistribution={handleCreateDistribution}
                      onUpdateDistribution={handleUpdateDistribution}
                      onDeleteDistribution={handleDeleteDistribution}
                      onHandoverSubmit={handleHandoverSubmit}
                      onCancelHandover={handleCancelHandover}
                      onImportBeneficiaries={handleImportBeneficiaries}
                      onEvaluateTeamPoints={handleEvaluateTeamPoints}
                      employees={dbData.employees || []}
                      employeeRequests={dbData.employeeRequests || []}
                      teamStaffAssignments={dbData.teamStaffAssignments || []}
                      onApproveEmployeeRequest={handleApproveEmployeeRequest}
                      onRejectEmployeeRequest={handleRejectEmployeeRequest}
                      onRequestEmployeeModification={handleRequestEmployeeModification}
                      onBackToHome={handleNavigateToPublicHome}
                      authenticatedUser={authenticatedUser}
                      onRefreshGlobalData={handleRefreshGlobalData}
                      onToggleMaintenance={handleToggleMaintenance}
                      isMaintenanceMode={isMaintenanceActive}
                    />
                  </DashboardErrorBoundary>
                )}

                {/* 1.5 DEPARTMENT ADMIN / EMPLOYEE / STOREKEEPER VIEW */}
                {(currentRole === 'department_admin' || currentRole === 'employee' || currentRole === 'storekeeper') && (
                  <DashboardErrorBoundary pageName="لوحة تحكم الإدارة">
                    <DepartmentDashboard
                      currentDepartment={
                        dbData?.departments?.find(d => d.id === authenticatedUser?.departmentId) || 
                        (currentRole === 'storekeeper' ? dbData?.departments?.find(d => d.id === 'dep-8') : undefined) || 
                        dbData?.departments?.[0] ||
                        { id: authenticatedUser?.departmentId || 'dep-1', nameAr: authenticatedUser?.departmentName || 'إدارة الجمعية' }
                      }
                      currentUser={authenticatedUser}
                      userRole={currentRole}
                      userDepartmentId={authenticatedUser?.departmentId || (currentRole === 'storekeeper' ? 'dep-8' : undefined)}
                      directives={dbData.departmentDirectives || []}
                      teams={dbData.teams || []}
                      volunteers={dbData.volunteers || []}
                      initiatives={dbData.initiatives || []}
                      requests={dbData.requests || []}
                      onUpdateDirectiveStatus={handleUpdateDirectiveStatus}
                      onActionRequest={handleActionRequest}
                      beneficiaries={dbData.beneficiaries || []}
                      onUpdateBeneficiaryStatus={handleUpdateBeneficiaryStatus}
                      homeSettings={dbData.homeSettings}
                      employees={dbData.employees || []}
                      employeeRequests={dbData.employeeRequests || []}
                      onSubmitEmployeeRequest={handleSubmitEmployeeRequest}
                      onUpdateEmployeeRequest={handleUpdateEmployeeRequest}
                      onSubmitOfficialLetter={handleSendOfficialLetter}
                      distributions={dbData.distributions || []}
                      distributionHandovers={dbData.distributionHandovers || []}
                      inventoryItems={dbData.inventoryItems || []}
                      notifications={dbData.notifications || []}
                      financialTransactions={(dbData as any).financialTransactions || []}
                      storeDonations={(dbData as any).storeDonations || []}
                      storeProjects={(dbData as any).storeProjects || []}
                      news={dbData.news || []}
                      partners={dbData.partners || []}
                      gallery={dbData.gallery || []}
                      heroSlides={dbData.heroSlides || []}
                      letters={dbData.letters || []}
                      onCreateDistribution={handleCreateDistribution}
                      onUpdateDistribution={handleUpdateDistribution}
                      onDeleteDistribution={handleDeleteDistribution}
                      onHandoverSubmit={handleHandoverSubmit}
                      onCancelHandover={handleCancelHandover}
                      onAddBeneficiary={handleAddBeneficiary}
                      onAddInitiative={handleAddInitiative}
                      onCopyInitiative={handleCopyInitiative}
                      onAddExpense={handleAddExpense}
                      onAddProject={handleAddStoreProject}
                      onAddNewsItem={handleAddNewsItem}
                      onDeleteNewsItem={handleDeleteNewsItem}
                      onAddPartnerItem={handleAddPartnerItem}
                      onDeletePartnerItem={handleDeletePartnerItem}
                      onAddGalleryItem={handleAddGalleryItem}
                      onDeleteGalleryItem={handleDeleteGalleryItem}
                      onRefreshGlobalData={fetchDatabase}
                      onLogout={handleLogout}
                      onBackToHome={handleNavigateToPublicHome}
                    />
                  </DashboardErrorBoundary>
                )}

            {/* 2. TEAM LEADER VIEW */}
            {currentRole === 'leader' && activeLeaderTeam && (
              <LeaderDashboard 
                currentTeam={activeLeaderTeam}
                currentDepartment={activeLeaderDept}
                volunteers={dbData.volunteers || []}
                initiatives={dbData.initiatives || []}
                requests={dbData.requests || []}
                attendanceRecords={dbData.attendance || []}
                evaluations={dbData.evaluations || []}
                teams={dbData.teams || []}
                opportunityRequests={dbData.opportunityRequests || []}
                notifications={dbData.notifications || []}
                employees={dbData.employees || []}
                teamStaffAssignments={dbData.teamStaffAssignments || []}
                onAssignTeamStaff={handleAssignTeamStaff}
                onRemoveTeamStaff={handleRemoveTeamStaff}
                onActionRequest={handleActionRequest}
                onRecordAttendance={handleRecordAttendance}
                onSendBroadcast={handleSendBroadcast}
                onSaveEvaluation={handleSaveEvaluation}
                onCheckoutInitiative={handleCheckoutInitiative}
                onAddOpportunityRequest={handleAddOpportunityRequest}
                onResubmitOpportunityRequest={handleResubmitOpportunityRequest}
                onUpdateOpportunityRequest={handleUpdateOpportunityRequest}
                onSubmitOfficialLetter={handleSendOfficialLetter}
                onBackToHome={handleNavigateToPublicHome}
              />
            )}

            {/* 3. VOLUNTEER VIEW */}
            {currentRole === 'volunteer' && activeVolunteer && (
              <VolunteerDashboard 
                currentVolunteer={activeVolunteer}
                volunteers={dbData.volunteers || []}
                departments={dbData.departments || []}
                teams={dbData.teams || []}
                initiatives={dbData.initiatives || []}
                requests={dbData.requests || []}
                attendanceRecords={dbData.attendance || []}
                evaluations={dbData.evaluations || []}
                issuedCertificates={dbData.issuedCertificates || []}
                certificateTemplates={dbData.certificateTemplates || []}
                initiativeRatings={dbData.initiativeRatings || []}
                onApplyInitiative={handleApplyInitiative}
                onReissueCard={handleReissueCard}
                onCheckoutInitiative={handleCheckoutInitiative}
                onSubmitRating={handleSubmitRating}
                onBackToHome={handleNavigateToPublicHome}
              />
            )}

            {/* 4. OFFICIAL PUBLIC HOME PAGE VIEW OR MAINTENANCE MODE PREVIEW */}
            {(currentRole === 'public' || (!authenticatedUser && currentRole !== 'admin')) && (
              isMaintenanceActive ? (
                <MaintenancePage
                  message={maintenanceMessage}
                  associationName={dbData?.homeSettings?.associationNameAr || "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة"}
                  licenseNumber={dbData?.homeSettings?.licenseNumber || "1000888600"}
                  logoUrl={dbData?.homeSettings?.logoUrl || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop"}
                  onOpenLogin={() => {
                    setCurrentRole('admin');
                    setActiveMainTab('system');
                  }}
                  onRefresh={() => {
                    fetchMaintenanceStatus(0);
                    fetchDatabase(true);
                  }}
                  isDark={isDark}
                  authenticatedUser={authenticatedUser}
                  isAuthorizedStaff={isAuthorizedMaintenanceStaff}
                  onReturnToDashboard={handleReturnToDashboard}
                  onDisableMaintenance={() => handleToggleMaintenance(false)}
                  onLogout={handleLogout}
                />
              ) : (
                <OfficialHomePage
                  settings={dbData.homeSettings || {
                    logoUrl: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=120&h=120&fit=crop",
                    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-growing-sprout-42234-large.mp4",
                    videoCoverUrl: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1600&h=900&fit=crop",
                    associationNameAr: "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة",
                    associationNameEn: "Reyadat Al-Ata Association",
                    licenseNumber: "5081",
                    heroTitleAr: "ريادةٌ في العطاء.. وخدمةٌ للإنسان",
                    heroTitleEn: "Leadership in Giving",
                    heroDescAr: "نسعى لتقديم الخدمات التنموية والخيرية المبتكرة والمستدامة لتأهيل وتنمية المجتمع بمخطط العسيلة المكي",
                    heroDescEn: "We strive to provide innovative and sustainable developmental and charitable services",
                    aboutUsAr: "تأسست جمعية ريادة العطاء لخدمة الإنسان بالعسيلة لتباشر مسؤوليتها المجتمعية والخيرية",
                    aboutUsEn: "Established to carry out community and charitable responsibility",
                    visionAr: "الريادة في تمكين العمل الخيري والتطوعي وخدمة ضيوف الرحمن وأهالي العسيلة بجودة وتميز",
                    visionEn: "Leadership in charity",
                    missionAr: "تقديم خدمات إنسانية وتنموية ومبادرات تطوعية مبتكرة تسهم في سد الاحتياجات وبناء القدرات",
                    missionEn: "Providing innovative humanitarian and developmental services",
                    goalsAr: [],
                    goalsEn: [],
                    valuesAr: [],
                    valuesEn: [],
                    donationLink: "https://store.riadataleata.org.sa",
                    contactPhone: "0550123456",
                    contactEmail: "info@riadataleata.org.sa",
                    contactLocationAr: "مكة المكرمة - مخطط العسيلة",
                    contactLocationEn: "Mecca - Al-Asilah Scheme",
                    contactHoursAr: "الأحد - الخميس",
                    contactHoursEn: "Sunday - Thursday",
                    themePrimary: "#059669",
                    themeSecondary: "#0d9488",
                    fontFamily: "Inter",
                    sectionVisibility: {
                      about: true,
                      stats: true,
                      initiatives: true,
                      news: true,
                      achievements: true,
                      partners: true,
                      gallery: true,
                      contact: true
                    }
                  }}
                  newsList={dbData.news || []}
                  partnersList={dbData.partners || []}
                  galleryList={dbData.gallery || []}
                  initiatives={dbData.initiatives || []}
                  volunteers={dbData.volunteers || []}
                  teams={dbData.teams || []}
                  departments={dbData.departments || []}
                  beneficiaries={dbData.beneficiaries || []}
                  notifications={dbData?.notifications || []}
                  onMarkNotificationRead={handleMarkNotificationRead}
                  onDeleteNotification={handleDeleteNotification}
                  isDark={isDark}
                  onToggleDark={() => setIsDark(!isDark)}
                  lang={lang}
                  onChangeLang={setLang}
                  onOpenLogin={(role) => {
                    setCurrentRole(role);
                    setActiveMainTab('system');
                  }}
                  onRegisterVolunteer={handleRegisterVolunteer}
                  onSubmitVolunteerApplication={handleSubmitVolunteerApplication}
                  onRegisterBeneficiary={handleRegisterBeneficiary}
                  onRegisterTeam={handleRegisterTeam}
                  teamApplications={dbData.teamApplications || []}
                  onSubmitTeamApplication={handleSubmitTeamApplication}
                  onApplyInitiative={handleApplyInitiativePublic}
                  currentVolunteer={authenticatedUser?.role === 'volunteer' ? activeVolunteer : null}
                  currentBeneficiary={authenticatedUser?.role === 'beneficiary' ? activeBeneficiary : null}
                  storeProjects={(dbData as any)?.storeProjects || []}
                  onDonate={handleDonateFromStore}
                  onSubmitOfficialLetter={handleSendOfficialLetter}
                  orgMembers={dbData.orgMembers || dbData.homeSettings?.orgMembers || []}
                  heroSlides={dbData.heroSlides || dbData.homeSettings?.heroSlides || []}
                  authenticatedUser={authenticatedUser}
                  onReturnToDashboard={handleReturnToDashboard}
                />
              )
            )}

            {/* 5. BENEFICIARY PORTAL VIEW */}
            {currentRole === 'beneficiary' && activeBeneficiary && (
              <BeneficiaryDashboard
                beneficiary={activeBeneficiary}
                requests={dbData.benefitRequests || []}
                initiatives={dbData.initiatives || []}
                handovers={dbData.distributionHandovers || []}
                distributions={dbData.distributions || []}
                beneficiaryRatings={dbData.beneficiaryRatings || []}
                onConfirmAidReceipt={handleConfirmAidReceipt}
                onSubmitBeneficiaryRating={handleSubmitBeneficiaryRating}
                onUpdateProfile={async (updated) => {
                  try {
                    await handleAddBeneficiary({ ...activeBeneficiary, ...updated });
                    return true;
                  } catch {
                    return false;
                  }
                }}
                onSubmitRequest={async (req) => {
                  try {
                    await handleAddBenefitRequest({ 
                      ...req, 
                      beneficiaryId: activeBeneficiary.id, 
                      beneficiaryName: activeBeneficiary.name 
                    });
                    return true;
                  } catch {
                    return false;
                  }
                }}
                onLogout={handleLogout}
                onBackToHome={handleNavigateToPublicHome}
                lang={lang}
              />
            )}



              </>
            )}

          </div>
        )}

        {/* MAIN TAB 2: AI SMART CHAT ASSISTANT */}
        {activeMainTab === 'ai' && (!isMaintenanceActive || isAuthorizedMaintenanceStaff) && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-neutral-100 shadow-2xs text-right" dir="rtl">
              <h2 className="text-xs font-black text-neutral-800 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>المستشار الذكي وأتمتة المراسلات الإدارية</span>
              </h2>
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                مرحباً بك في وحدة الذكاء الاصطناعي المسؤولة عن تيسير وتوفير أتمتة شاملة لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة. يمكنك استخدام المساعد لصياغة وثائق الفعاليات التطوعية، كتابة الخطابات الرسمية، وتحليل الغياب أو تقييم أداء الفرق. وإذا لم يتمكن الذكاء الاصطناعي من تلبية طلبك، فإنه يحيل المحادثة كاملة فوراً للدعم الفني.
              </p>
            </div>

            <AiChatAssistant onSendMessage={handleAiSendMessage} />
          </div>
        )}

        {/* MAIN TAB 3: SYSTEM GUIDE AND GLOSSARY */}
        {activeMainTab === 'guide' && (!isMaintenanceActive || isAuthorizedMaintenanceStaff) && (
          <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-2xs text-right space-y-6" dir="rtl">
            <div>
              <h2 className="text-md font-black text-neutral-800">دليل استخدام نظام ريادة العطاء التطوعي</h2>
              <p className="text-xs text-neutral-500 mt-1">تفاصيل الهيكل الإداري، القواعد الحسابية للنقاط، والقوانين المعتمدة بالنظام</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-3.5">
                <h3 className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg inline-block">الهيكل الإداري والتشغيلي (الجمعية):</h3>
                <ul className="text-xs text-neutral-600 space-y-2.5 list-disc list-inside">
                  <li><strong>مجلس الإدارة والمدير التنفيذي:</strong> يملك الصلاحية الكاملة لمتابعة كافة الإحصائيات، الإدارات، الفرق، المتطوعين، والتحكم بالنسخ الاحتياطي وتكرار المبادرات.</li>
                  <li><strong>قادة الفرق التطوعية:</strong> يتولون تحضير وتأكيد حضور متطوعيهم ميدانياً بالبطاقة الذكية، والتحكم في طلبات الانضمام، وتقييم السلوك الميداني للأعضاء وبث التعاميم الميدانية.</li>
                  <li><strong>المتطوعون:</strong> يملكون بطاقة الهوية الرقمية الذكية بالباركود، ويقدمون على المبادرات ويتابعون سجلاتهم ونقاطهم وتصنيفاتهم.</li>
                </ul>
              </div>

              <div className="space-y-3.5">
                <h3 className="text-xs font-black text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg inline-block">حساب صحيفة النقاط التطوعية (بديل الساعات):</h3>
                <ul className="text-xs text-neutral-600 space-y-2.5 list-disc list-inside">
                  <li><strong>تسجيل الحضور الكامل بالفعالية:</strong> يمنح المتطوع تلقائياً <b>+3 نقاط</b> في رصيد عضويته.</li>
                  <li><strong>تسجيل حضور متأخر:</strong> يمنحه <b>+1 نقطة</b> واحدة فقط.</li>
                  <li><strong>الالتزام بارتداء السديري والبطاقة الذكية:</strong> الالتزام بالزي الرسمي يضيف <b>+2 نقطة إضافية</b> تلقائياً في رصيد نقاط التقييم الخاصة بالمتطوع.</li>
                  <li><strong>الغياب بدون عذر مسبق:</strong> يخصم من رصيد نقاط العضوية <b>-2 نقطة</b> كإجراء تنظيمي لضمان جدية الميدان والالتزام.</li>
                </ul>
              </div>

            </div>

            <div className="border-t border-neutral-100 pt-5 text-center">
              <span className="text-[10px] text-neutral-400 font-bold">جمعية ريادة العطاء لخدمة الإنسان بالعسيلة • ترخيص رقم: 100088868 • بمكة المكرمة</span>
            </div>
          </div>
        )}

      </main>

      {/* INTERNAL DASHBOARD FOOTER (Only shown for authenticated internal management views, NEVER on public website or during maintenance) */}
      {currentRole !== 'public' && (!isMaintenanceActive || isAuthorizedMaintenanceStaff) && (
        <footer className="border-t border-neutral-100 bg-white py-6 mt-12 text-center text-xs text-neutral-400 no-print">
          <p className="font-bold">© {new Date().getFullYear()} جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بمكة المكرمة.</p>
          <p className="text-[10px] text-neutral-400 mt-1">جميع الحقوق محفوظة للنظام التقني الموحد لإدارة التطوع • ترخيص وزارة الموارد البشرية والتنمية الاجتماعية: 100088868</p>
        </footer>
      )}

      {/* FLOATING SUPPORT BUBBLE (TECHNICAL SUPPORT ABOVE BOTTOM NAV BAR) */}
      {currentRole !== 'admin' && !isMaintenanceActive && (
        <SupportBubbleWidget currentUser={authenticatedUser ? {
          id: authenticatedUser.id,
          name: authenticatedUser.name,
          email: authenticatedUser.email,
          phone: authenticatedUser.phone,
          role: authenticatedUser.role
        } : undefined} />
      )}

      {/* USER SETTINGS & AUDIO PREFERENCES MODAL */}
      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        lang={lang}
        currentUser={authenticatedUser}
        currentUserRole={currentRole}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
      />

      {/* MANDATORY FORCE PASSWORD CHANGE MODAL */}
      {authenticatedUser && !!authenticatedUser.mustChangePassword && (
        <ForceChangePasswordModal
          isOpen={true}
          userId={authenticatedUser.id || authenticatedUser.userId}
          userName={authenticatedUser.name}
          userRole={currentRole}
          onSuccess={() => {
            const updatedUser = { ...authenticatedUser, mustChangePassword: false };
            setAuthenticatedUser(updatedUser);
            try {
              const currentStored = getStoredSession();
              if (currentStored) {
                localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({
                  ...currentStored,
                  user: updatedUser
                }));
              }
            } catch {}
          }}
          onLogout={handleLogout}
        />
      )}

    </div>
  );
}
