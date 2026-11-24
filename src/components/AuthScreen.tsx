import React, { useState, useEffect } from "react";
import { 
  Lock, Eye, EyeOff, Sparkles, ShieldCheck, AlertCircle, ShieldAlert,
  RefreshCw, Globe, ArrowRight, ArrowLeft, CheckCircle2, 
  ChevronDown, ChevronUp, HeartHandshake, Award, X,
  KeyRound, CreditCard, Mail, Check, User, Users, Heart,
  Phone, Calendar, MapPin, Clock, FileCheck, CheckCircle, Info, MessageSquare,
  Smartphone, Trash2, UserPlus, LogIn
} from "lucide-react";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import { evaluatePasswordStrength, generateStrongPassword } from "../utils/passwordSecurity";
import { BeneficiaryFormFields, BeneficiaryFormData } from "./BeneficiaryFormFields";
import { PinCodeInput } from "./PinCodeInput";
import {
  RememberedAccountCard,
  getOrCreateDeviceId,
  getRememberedAccounts,
  purgeLegacySensitiveAuthStorage,
  removeRememberedAccount,
  replaceRememberedAccountsFromServer,
  updateRememberedAccountPinState,
} from "../utils/rememberedAccounts";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement | null,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
        };
      };
    };
  }
}

// Read Google Client ID from environment variables (Vercel)
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

interface AuthScreenProps {
  onLoginSuccess: (
    role: 'admin' | 'leader' | 'volunteer' | 'beneficiary' | 'supervisor' | 'department_admin' | 'storekeeper' | string,
    user: any,
    options?: { rememberAccount?: boolean; authMethod?: 'password' | 'google' | 'pin' }
  ) => void;
  onBackToHome: () => void;
  lang?: 'ar' | 'en';
  onToggleLang?: (l: 'ar' | 'en') => void;
  onRegisterNewAccount?: () => void;
  homeSettings?: any;
  isMaintenanceMode?: boolean;
}

export function AuthScreen({ 
  onLoginSuccess, 
  onBackToHome, 
  lang = 'ar',
  onToggleLang,
  onRegisterNewAccount,
  homeSettings,
  isMaintenanceMode = false
}: AuthScreenProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Smart Remembered-User & 6-Digit Trusted-Device PIN State
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccountCard[]>([]);
  const [selectedRememberId, setSelectedRememberId] = useState<string>("");
  const [loginViewMode, setLoginViewMode] = useState<'welcome' | 'standard'>('standard');
  const [welcomeAuthMethod, setWelcomeAuthMethod] = useState<'pin' | 'password'>('password');
  const [pinInput, setPinInput] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  // Multi-Step Password Recovery with Salted OTP & Bcrypt (WhatsApp & Email)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("");
  const [recoveryRememberId, setRecoveryRememberId] = useState<string>("");
  const [recoveryChannel, setRecoveryChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [availableChannels, setAvailableChannels] = useState<{
    whatsapp: { available: boolean; masked: string };
    email: { available: boolean; masked: string };
  } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [recoveryNewPassword, setRecoveryNewPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [showRecNewPass, setShowRecNewPass] = useState(false);
  const [showRecConfirmPass, setShowRecConfirmPass] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Email-Link Recovery Flow (Active when OTP is closed - default)
  const [otpEnabled, setOtpEnabled] = useState<boolean>(false);
  const [recoveryMode, setRecoveryMode] = useState<'otp' | 'link_request' | 'link_sent' | 'link_validate' | 'link_reset' | 'link_invalid' | 'link_done'>('link_request');
  const [linkEmailInput, setLinkEmailInput] = useState("");
  const [linkTokenValue, setLinkTokenValue] = useState("");
  const [linkMaskedEmail, setLinkMaskedEmail] = useState("");

  // OTP Countdown Timer
  useEffect(() => {
    if (otpTimer <= 0) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Google Login & Completion States
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleModalError, setGoogleModalError] = useState<string | null>(null);

  const [verifiedGoogleData, setVerifiedGoogleData] = useState<{ email: string; name: string; picture?: string; registrationTicket?: string } | null>(null);
  const [showGoogleCompleteModal, setShowGoogleCompleteModal] = useState(false);
  const [googleAccountType, setGoogleAccountType] = useState<'volunteer' | 'beneficiary' | null>(null);
  const [googleRegSubmitted, setGoogleRegSubmitted] = useState(false);
  const [googleRegSuccessMsg, setGoogleRegSuccessMsg] = useState("");
  const [googleRegLoading, setGoogleRegLoading] = useState(false);
  const [googleRegError, setGoogleRegError] = useState<string | null>(null);

  // Registration Form Fields for New Google Users
  const [gRegFullName, setGRegFullName] = useState("");
  const [gRegNationalId, setGRegNationalId] = useState("");
  const [gRegPhone, setGRegPhone] = useState("");
  const [gRegBirthDate, setGRegBirthDate] = useState("");
  const [gRegGender, setGRegGender] = useState<'male' | 'female'>('male');
  const [gRegAddress, setGRegAddress] = useState("");
  // Volunteer specific
  const [gRegTeamId, setGRegTeamId] = useState("team-1");
  const [gRegBloodType, setGRegBloodType] = useState("O+");
  const [gRegHasChronicIllness, setGRegHasChronicIllness] = useState(false);
  const [gRegIllnessDetails, setGRegIllnessDetails] = useState("");
  const [gRegExperiences, setGRegExperiences] = useState("");
  // Beneficiary specific
  const [gRegFamilySize, setGRegFamilySize] = useState<number | "">("");
  const [gRegCategory, setGRegCategory] = useState("أسر أيتام");
  const [gRegMonthlyIncome, setGRegMonthlyIncome] = useState<number | "">("");
  const [gRegHousingType, setGRegHousingType] = useState("إيجار");
  const [gRegBenFormData, setGRegBenFormData] = useState<BeneficiaryFormData>({
    birthCalendarType: 'hijri',
    birthDate: '2000-01-01',
    birthDateHijri: '1420/10/24',
    age: 26,
    residencyStatus: 'مواطن سعودي',
    nationality: 'سعودي',
    city: 'مكة المكرمة',
    district: 'العسيلة (نطاق الجمعية الرئيسي)',
    customDistrict: '',
    maritalStatus: 'متزوج',
    orphanStatus: 'غير ذلك / لا ينطبق'
  });
  // Mandatory charter & terms agreement
  const [gRegAgreedToTerms, setGRegAgreedToTerms] = useState(false);

  // Sync public recovery configuration (OTP active vs Email-Link recovery)
  useEffect(() => {
    fetch("/api/db/auth/recovery-config")
      .then((r) => r.json())
      .then((cfg) => {
        if (typeof cfg?.otpEnabled === "boolean") {
          setOtpEnabled(cfg.otpEnabled);
        }
      })
      .catch(() => {});
  }, []);

  // Auto-detect password recovery link from email query parameters (?resetToken=... or /auth/reset-password?token=...)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const urlResetToken = params.get('resetToken') || params.get('token');
        if (urlResetToken) {
          setLinkTokenValue(urlResetToken);
          setResetToken(urlResetToken);
          setRecoveryMode('link_validate');
          setRecoveryError(null);
          setRecoverySuccess(null);
          setShowForgotModal(true);

          fetch("/api/db/auth/reset-password/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: urlResetToken })
          })
            .then(async (res) => {
              const data = await res.json().catch(() => null);
              if (res.ok && data?.valid) {
                setLinkMaskedEmail(data.maskedEmail || "");
                setRecoveryMode('link_reset');
                setRecoverySuccess(
                  lang === 'ar'
                    ? "تم التحقق من صلاحية رابط الاستعادة. يمكنك الآن تعيين كلمة مرور جديدة."
                    : "Reset link verified. Please enter your new password."
                );
              } else {
                setRecoveryMode('link_invalid');
                setRecoveryError(
                  data?.error ||
                  (lang === 'ar' ? "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية." : "Invalid or expired reset link.")
                );
              }
            })
            .catch(() => {
              setRecoveryMode('link_invalid');
              setRecoveryError(lang === 'ar' ? "تعذر التحقق من رابط إعادة التعيين." : "Failed to validate reset link.");
            });
        }
      }
    } catch (e) {
      console.warn("[AuthScreen] Error detecting URL reset params:", e);
    }
  }, [lang]);

  // Collapsible quick test credentials for evaluation
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Load & verify non-sensitive Remembered Accounts + Trusted Device PIN readiness on mount
  useEffect(() => {
    purgeLegacySensitiveAuthStorage();
    const localCards = getRememberedAccounts();
    if (localCards.length === 0) {
      setRememberedAccounts([]);
      setLoginViewMode('standard');
      return;
    }

    setRememberedAccounts(localCards);
    const initial = localCards[0];
    setSelectedRememberId(initial.rememberId);
    setLoginViewMode('welcome');
    setWelcomeAuthMethod(initial.hasPinEnabled && !initial.requireFullLogin ? 'pin' : 'password');

    // Sync live validity & trusted-device PIN status with server
    const syncRememberedStatus = async () => {
      try {
        const deviceId = getOrCreateDeviceId();
        const res = await fetch("/api/db/auth/remember-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId,
            handles: localCards.map((c) => ({ rememberId: c.rememberId, deviceId })),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(data?.accounts)) return;

        const statusMap = new Map<string, any>(data.accounts.map((a: any) => [a.rememberId, a]));
        const syncedCards: RememberedAccountCard[] = [];
        for (const card of localCards) {
          const live = statusMap.get(card.rememberId);
          if (live && live.valid === false) continue; // Remove deactivated/invalid accounts from welcome list
          if (live && live.valid) {
            syncedCards.push({
              ...card,
              firstName: live.firstName || card.firstName,
              displayName: live.displayName || card.displayName,
              avatarUrl: live.avatarUrl || card.avatarUrl || "",
              role: live.role || card.role,
              roleLabel: live.roleLabel || card.roleLabel,
              hasPinEnabled: Boolean(live.hasPinOnThisDevice),
              pinLockedUntil: live.pinLockedUntil || null,
              requireFullLogin: Boolean(live.requireFullLogin),
            });
          } else {
            syncedCards.push(card);
          }
        }

        const updated = replaceRememberedAccountsFromServer(syncedCards);
        setRememberedAccounts(updated);
        if (updated.length === 0) {
          setSelectedRememberId("");
          setLoginViewMode('standard');
        } else {
          const activeCard = updated.find((u) => u.rememberId === initial.rememberId) || updated[0];
          setSelectedRememberId(activeCard.rememberId);
          setWelcomeAuthMethod(activeCard.hasPinEnabled && !activeCard.requireFullLogin ? 'pin' : 'password');
        }
      } catch {
        // Keep local non-sensitive metadata if offline
      }
    };
    syncRememberedStatus();
  }, []);

  const selectedRememberedAccount =
    rememberedAccounts.find((a) => a.rememberId === selectedRememberId) || rememberedAccounts[0] || null;

  const isRtl = lang === 'ar';

  const handleSelectRememberedCard = (card: RememberedAccountCard) => {
    setSelectedRememberId(card.rememberId);
    setError(null);
    setPassword("");
    setPinInput("");
    setWelcomeAuthMethod(card.hasPinEnabled && !card.requireFullLogin ? 'pin' : 'password');
  };

  const handleRemoveRememberedCard = (rememberId: string) => {
    const next = removeRememberedAccount(rememberId);
    setRememberedAccounts(next);
    setError(null);
    setPassword("");
    setPinInput("");
    if (next.length === 0) {
      setSelectedRememberId("");
      setLoginViewMode('standard');
    } else if (selectedRememberId === rememberId) {
      setSelectedRememberId(next[0].rememberId);
      setWelcomeAuthMethod(next[0].hasPinEnabled && !next[0].requireFullLogin ? 'pin' : 'password');
    }
  };

  // Welcome Screen: Login with Password (without retyping National ID)
  const handleRememberedPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRememberedAccount) return;
    setError(null);
    if (!password.trim()) {
      setError("يرجى إدخال كلمة المرور للمتابعة.");
      return;
    }
    setLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch("/api/db/auth/login-remembered", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rememberId: selectedRememberedAccount.rememberId,
          password: password.trim(),
          deviceId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || "كلمة المرور غير صحيحة، يرجى التحقق والمحاولة مرة أخرى.");
        return;
      }
      if (data && data.status === "success" && data.role) {
        const enrichedUser = {
          ...data.user,
          authMethod: data.authMethod || 'password',
          sessionToken: data.sessionToken || data.user?.sessionToken,
        };
        onLoginSuccess(data.role, enrichedUser, { rememberAccount: true, authMethod: 'password' });
      }
    } catch {
      setError("تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.");
    } finally {
      setLoading(false);
    }
  };

  // Welcome Screen: Login with 6-Digit Trusted-Device PIN
  const handlePinLoginSubmit = async (e?: React.FormEvent, explicitPin?: string) => {
    if (e) e.preventDefault();
    if (!selectedRememberedAccount) return;
    const pinVal = (explicitPin ?? pinInput).trim();
    setError(null);
    if (!/^\d{6}$/.test(pinVal)) {
      setError("يرجى إدخال رمز الدخول المكون من 6 أرقام.");
      return;
    }

    setPinLoading(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch("/api/db/auth/pin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rememberId: selectedRememberedAccount.rememberId,
          pin: pinVal,
          deviceId,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPinInput("");
        if (data?.code === "UNTRUSTED_DEVICE") {
          updateRememberedAccountPinState(selectedRememberedAccount.rememberId, false);
          setRememberedAccounts((prev) =>
            prev.map((a) =>
              a.rememberId === selectedRememberedAccount.rememberId ? { ...a, hasPinEnabled: false } : a
            )
          );
          setWelcomeAuthMethod('password');
        } else if (data?.requireFullLogin || res.status === 423) {
          setRememberedAccounts((prev) =>
            prev.map((a) =>
              a.rememberId === selectedRememberedAccount.rememberId
                ? { ...a, requireFullLogin: true, pinLockedUntil: data?.lockedUntil || Date.now() + 15 * 60 * 1000 }
                : a
            )
          );
          setWelcomeAuthMethod('password');
        }
        setError(data?.error || "تعذر التحقق من رمز الدخول السريع.");
        return;
      }

      if (data && data.status === "success" && data.role) {
        const enrichedUser = {
          ...data.user,
          authMethod: 'pin',
          sessionToken: data.sessionToken || data.user?.sessionToken,
        };
        onLoginSuccess(data.role, enrichedUser, { rememberAccount: true, authMethod: 'pin' });
      }
    } catch {
      setError("تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى.");
    } finally {
      setPinLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client validation with accurate Arabic messages
    if (!identifier.trim()) {
      setError(
        lang === 'ar' 
          ? "يرجى إدخال رقم الهوية أو اسم المستخدم أو البريد الإلكتروني." 
          : "Please enter your National ID, username, or email."
      );
      return;
    }

    if (!password.trim()) {
      setError(
        lang === 'ar' 
          ? "يرجى إدخال كلمة المرور." 
          : "Please enter your password."
      );
      return;
    }

    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch("/api/db/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: identifier.trim(), 
          password: password.trim(),
          deviceId
        })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.error || (
          lang === 'ar' 
            ? "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." 
            : "Invalid login credentials. Please verify your details and try again."
        );
        setError(errorMsg);
        return;
      }

      if (data && data.status === "success" && data.role) {
        // Always ensure NO sensitive identifier/credentials touch localStorage
        purgeLegacySensitiveAuthStorage();

        // Successfully authenticated! Route to target role dashboard automatically
        const enrichedUser = {
          ...data.user,
          authMethod: data.authMethod || 'password',
          sessionToken: data.sessionToken || data.user?.sessionToken
        };
        onLoginSuccess(data.role, enrichedUser, {
          rememberAccount: rememberMe,
          authMethod: 'password',
        });
      } else {
        setError(
          lang === 'ar' 
            ? "بيانات الدخول غير صحيحة، يرجى التحقق من البيانات والمحاولة مرة أخرى." 
            : "Invalid login credentials."
        );
      }
    } catch {
      setError(
        lang === 'ar' 
          ? "تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة مجددًا." 
          : "Could not connect to server. Please check your network and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Google Identity Services (GIS): Send Verified ID Token to Backend
  const sendGoogleCredentialToBackend = async (credential: string) => {
    setGoogleLoading(true);
    setGoogleModalError(null);
    setError(null);

    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch("/api/db/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential, deviceId })
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Handle 403 (suspended/inactive/pending) or 401 (invalid token) or other error
        const errorMsg = data?.error || (lang === 'ar' ? "فشل تسجيل الدخول عبر Google." : "Google login failed.");
        setGoogleModalError(errorMsg);
        setError(errorMsg);
        return;
      }

      if (data?.status === "success" && data?.role && data?.user) {
        // Case 1: Existing account (Admin, Operations Manager, Employee, Volunteer, Beneficiary)
        setShowGoogleModal(false);
        const enrichedUser = {
          ...data.user,
          authMethod: data.authMethod || 'google',
          sessionToken: data.sessionToken || data.user?.sessionToken
        };
        onLoginSuccess(data.role, enrichedUser, {
          rememberAccount: rememberMe || loginViewMode === 'welcome',
          authMethod: 'google',
        });
      } else if (data?.status === "new_google_user") {
        // Case 2: New Google user -> show Choice Modal ("مستفيد" / "متطوع")
        setShowGoogleModal(false);
        setVerifiedGoogleData({
          email: data.googleEmail || "",
          name: data.googleName || "",
          picture: data.googlePicture,
          // Server-issued, single-use proof that this email was verified by Google (required to register).
          registrationTicket: data.registrationTicket || ""
        });
        setGRegFullName(data.googleName || "");
        setGoogleAccountType(null); // Step 1: Select between Volunteer and Beneficiary
        setGoogleRegSubmitted(false);
        setGoogleRegError(null);
        setShowGoogleCompleteModal(true);
      } else {
        setGoogleModalError(data?.error || (lang === 'ar' ? "استجابة غير متوقعة من خادم Google." : "Unexpected response."));
      }
    } catch {
      setGoogleModalError(lang === 'ar' ? "تعذر الاتصال بالخادم لإتمام تسجيل Google." : "Could not connect to server.");
    } finally {
      setGoogleLoading(false);
    }
  };

  // Simulation test helper (used during local preview & testing before Google Cloud Console setup)
  const submitGoogleSimulationAuth = (targetEmail: string, targetName?: string) => {
    if (!targetEmail || !targetEmail.trim() || !targetEmail.includes("@")) {
      setGoogleModalError(lang === 'ar' ? "يرجى إدخال عنوان بريد إلكتروني صالح لحساب Google." : "Please enter a valid Google email.");
      return;
    }
    const payload = JSON.stringify({
      email: targetEmail.trim().toLowerCase(),
      name: targetName?.trim() || targetEmail.split("@")[0],
      sub: "simulated-test-sub-" + Date.now()
    });
    // Create safe Base64 token for testing
    const testToken = "dev_test_token:" + btoa(unescape(encodeURIComponent(payload)));
    sendGoogleCredentialToBackend(testToken);
  };

  // Google Authentication Modal Trigger (Opens test / manual selection modal)
  const handleGoogleSignIn = () => {
    setError(null);
    setGoogleModalError(null);
    setGoogleEmailInput(identifier.includes("@") ? identifier.trim() : "");
    setShowGoogleModal(true);
  };

  // Google Identity Services (GIS) Auto-Initialization Hook
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || isMaintenanceMode) return;

    let isMounted = true;
    const initGis = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response: { credential: string }) => {
              if (response && response.credential) {
                sendGoogleCredentialToBackend(response.credential);
              }
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          const container = document.getElementById("gis-button-slot");
          if (container && isMounted) {
            container.innerHTML = "";
            window.google.accounts.id.renderButton(container, {
              type: "standard",
              theme: "outline",
              size: "large",
              text: "signin_with",
              shape: "rectangular",
              logo_alignment: "left",
              width: 320,
              locale: lang === 'ar' ? 'ar' : 'en'
            });
          }
        } catch (err) {
          console.warn("[GIS] Error initializing Google button:", err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGis();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initGis();
        }
      }, 300);
      return () => {
        clearInterval(interval);
        isMounted = false;
      };
    }

    return () => {
      isMounted = false;
    };
  }, [lang]);

  // Submit Completed Registration Form for New Google User
  const handleCompleteGoogleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleRegError(null);

    if (!googleAccountType) {
      setGoogleRegError(lang === 'ar' ? "يرجى تحديد نوع الحساب أولاً (مستفيد أو متطوع)." : "Please select account type.");
      return;
    }

    if (!gRegFullName.trim() || gRegFullName.trim().length < 3) {
      setGoogleRegError(lang === 'ar' ? "يرجى إدخال الاسم الكامل (ثلاثي أو رباعي على الأقل)." : "Full name is required.");
      return;
    }

    if (!gRegNationalId.trim() || !/^\d{10}$/.test(gRegNationalId.trim())) {
      setGoogleRegError(lang === 'ar' ? "رقم الهوية الوطنية أو الإقامة غير صحيح (يجب أن يتكون من 10 أرقام دقيقة)." : "National ID must be exactly 10 digits.");
      return;
    }

    if (!gRegPhone.trim() || gRegPhone.trim().length < 9) {
      setGoogleRegError(lang === 'ar' ? "يرجى إدخال رقم الجوال بصيغة صحيحة للتواصل والإشعارات." : "Valid phone number is required.");
      return;
    }

    if (!gRegAgreedToTerms) {
      setGoogleRegError(lang === 'ar' ? "يجب الموافقة والتعهد على صحة البيانات وميثاق الجمعية لإتمام التسجيل." : "Please agree to terms and conditions.");
      return;
    }

    setGoogleRegLoading(true);

    try {
      const payload: any = {
        accountType: googleAccountType,
        registrationTicket: verifiedGoogleData?.registrationTicket || "",
        googleEmail: verifiedGoogleData?.email || googleEmailInput,
        name: gRegFullName.trim(),
        nationalId: gRegNationalId.trim(),
        phone: gRegPhone.trim(),
        birthDate: gRegBirthDate,
        gender: gRegGender,
        address: gRegAddress,
        agreedToTerms: gRegAgreedToTerms
      };

      if (googleAccountType === 'volunteer') {
        payload.teamId = gRegTeamId;
        payload.bloodType = gRegBloodType;
        payload.hasChronicIllness = gRegHasChronicIllness;
        payload.illnessDetails = gRegIllnessDetails;
        payload.experiences = gRegExperiences;
        payload.familySize = typeof gRegFamilySize === 'number' && gRegFamilySize > 0 ? gRegFamilySize : (Number(gRegFamilySize) || 1);
        payload.category = gRegCategory;
        payload.monthlyIncome = typeof gRegMonthlyIncome === 'number' ? gRegMonthlyIncome : (Number(gRegMonthlyIncome) || 0);
        payload.housingType = gRegHousingType;
        payload.birthCalendarType = gRegBenFormData.birthCalendarType;
        payload.birthDate = gRegBenFormData.birthDate;
        payload.birthDateHijri = gRegBenFormData.birthDateHijri;
        payload.age = gRegBenFormData.age;
        payload.residencyStatus = gRegBenFormData.residencyStatus;
        payload.nationality = gRegBenFormData.nationality;
        payload.city = gRegBenFormData.city;
        payload.district = gRegBenFormData.district;
        payload.customDistrict = gRegBenFormData.customDistrict;
        payload.maritalStatus = gRegBenFormData.maritalStatus;
        payload.orphanStatus = gRegBenFormData.orphanStatus;
        payload.address = gRegAddress ? `${gRegBenFormData.city} - ${gRegBenFormData.district} (${gRegAddress})` : `${gRegBenFormData.city} - ${gRegBenFormData.district}`;
      }

      const res = await fetch("/api/db/auth/google/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setGoogleRegError(data?.error || (lang === 'ar' ? "تعذر حفظ بيانات التسجيل، يرجى المحاولة لاحقاً." : "Registration failed."));
        return;
      }

      if (data?.status === "pending_approval") {
        setGoogleRegSubmitted(true);
        setGoogleRegSuccessMsg(
          data.message || 
          (lang === 'ar' 
            ? "تم تقديم طلبك بنجاح! حسابك الآن قيد المراجعة والاعتماد من قبل إدارة الجمعية (غير نشط حتى اكتمال المراجعة). لا يمكن استخدام صلاحيات الحساب قبل الاعتماد."
            : "Registration request submitted! Your account is pending admin approval.")
        );
      }
    } catch {
      setGoogleRegError(lang === 'ar' ? "حدث خطأ أثناء الاتصال بالخادم." : "Network connection error.");
    } finally {
      setGoogleRegLoading(false);
    }
  };

  // Multi-Step Password Recovery Handlers (WhatsApp & Email OTP)
  // Step 1: Identify account and fetch available recovery channels
  const handleIdentifyAccount = async (e?: React.FormEvent, overrideRememberId?: string) => {
    if (e) e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    const activeRemId = overrideRememberId !== undefined ? overrideRememberId : recoveryRememberId;
    if (!recoveryIdentifier.trim() && !activeRemId) {
      setRecoveryError(
        lang === 'ar' 
          ? "يرجى إدخال رقم الهوية أو اسم المستخدم أو البريد الإلكتروني أو رقم الجوال." 
          : "Please enter your registered ID, username, email, or phone."
      );
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/forgot-password/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: recoveryIdentifier.trim(),
          rememberId: activeRemId || undefined
        })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success") {
        setAvailableChannels(data.availableChannels || null);
        setMaskedEmail(data.availableChannels?.email?.masked || "");
        setMaskedPhone(data.availableChannels?.whatsapp?.masked || "");
        if (data.availableChannels?.whatsapp?.available) {
          setRecoveryChannel('whatsapp');
        } else {
          setRecoveryChannel('email');
        }
        setRecoveryStep(2);
      } else {
        setRecoveryError(data?.error || (lang === 'ar' ? "تعذر التحقق من المعرف، يرجى المحاولة لاحقاً." : "Failed to verify account."));
      }
    } catch {
      setRecoveryError(lang === 'ar' ? "حدث خطأ أثناء الاتصال بالخادم." : "An error occurred.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Step 2 -> Step 3: Request 6-digit OTP via chosen channel (WhatsApp or Email)
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: recoveryIdentifier.trim(),
          rememberId: recoveryRememberId || undefined,
          channel: recoveryChannel 
        })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success") {
        setRecoveryStep(3);
        setOtpTimer(60);
        setRecoverySuccess(
          data.message || 
          (lang === 'ar' 
            ? `تم إرسال رمز التحقق OTP بنجاح عبر (${recoveryChannel === 'whatsapp' ? 'واتساب' : 'البريد الإلكتروني'}).` 
            : "OTP code has been sent.")
        );
      } else {
        setRecoveryError(data?.error || (lang === 'ar' ? "تعذر إرسال رمز التحقق، يرجى المحاولة لاحقاً." : "Failed to send code."));
      }
    } catch {
      setRecoveryError(lang === 'ar' ? "حدث خطأ أثناء الاتصال بالخادم." : "An error occurred.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Step 3 -> Step 4: Verify 6-digit OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setRecoveryError(lang === 'ar' ? "يرجى إدخال رمز التحقق المكون من 6 أرقام." : "Please enter the 6-digit OTP code.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: recoveryIdentifier.trim(),
          rememberId: recoveryRememberId || undefined,
          otpCode: otpCode.trim()
        })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success") {
        setResetToken(data.resetToken);
        setRecoveryStep(4);
        setRecoverySuccess(data.message || (lang === 'ar' ? "تم التحقق من الرمز بنجاح." : "Code verified successfully."));
      } else {
        setRecoveryError(data?.error || (lang === 'ar' ? "رمز التحقق غير صحيح أو منتهي الصلاحية." : "Invalid or expired OTP."));
      }
    } catch {
      setRecoveryError(lang === 'ar' ? "حدث خطأ أثناء الاتصال بالخادم." : "An error occurred.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Step 4 -> Step 5: Save New Password
  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!recoveryNewPassword.trim()) {
      setRecoveryError(lang === 'ar' ? "يرجى إدخال كلمة المرور الجديدة." : "Please enter new password.");
      return;
    }

    if (recoveryNewPassword.trim() !== recoveryConfirmPassword.trim()) {
      setRecoveryError(lang === 'ar' ? "كلمتا المرور غير متطابقتين، يرجى إعادة التحقق." : "Passwords do not match.");
      return;
    }

    const evalResult = evaluatePasswordStrength(recoveryNewPassword.trim());
    if (!evalResult.allPassed) {
      setRecoveryError(
        lang === 'ar'
          ? `كلمة المرور لا تستوفي شروط الأمان: ${evalResult.errors.join(" ")}`
          : "Password does not meet security criteria."
      );
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: recoveryIdentifier.trim(),
          rememberId: recoveryRememberId || undefined,
          resetToken,
          newPassword: recoveryNewPassword.trim()
        })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success") {
        setRecoveryStep(5);
        setRecoverySuccess(
          data.message || 
          (lang === 'ar' 
            ? "تم تحديث كلمة المرور وتأمين حسابك بنجاح." 
            : "Password has been successfully updated.")
        );
      } else {
        setRecoveryError(data?.error || (lang === 'ar' ? "فشل حفظ كلمة المرور الجديدة." : "Failed to reset password."));
      }
    } catch {
      setRecoveryError(lang === 'ar' ? "حدث خطأ أثناء معالجة الطلب." : "An error occurred.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Email-Link Password Recovery Handlers (Used when OTP is closed - Default)
  const handleRequestResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);
    const cleanEmail = linkEmailInput.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setRecoveryError("يرجى إدخال عنوان بريد إلكتروني صحيح.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/forgot-password/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        setRecoveryMode('link_sent');
        setRecoverySuccess(
          data.message ||
          "إذا كان البريد الإلكتروني مسجلاً في النظام، فسيتم إرسال رابط إعادة تعيين كلمة المرور إليه خلال لحظات."
        );
      } else {
        setRecoveryError(data?.error || "تعذر إرسال رابط استعادة كلمة المرور.");
      }
    } catch {
      setRecoveryError("حدث خطأ أثناء الاتصال بالخادم.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleConfirmResetWithLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!recoveryNewPassword.trim()) {
      setRecoveryError("يرجى إدخال كلمة المرور الجديدة.");
      return;
    }
    if (recoveryNewPassword.trim() !== recoveryConfirmPassword.trim()) {
      setRecoveryError("كلمتا المرور غير متطابقتين.");
      return;
    }

    const evalResult = evaluatePasswordStrength(recoveryNewPassword.trim());
    if (!evalResult.allPassed) {
      setRecoveryError(`كلمة المرور لا تستوفي شروط الأمان: ${evalResult.errors.join(" ")}`);
      return;
    }

    setRecoveryLoading(true);
    try {
      const res = await fetch("/api/db/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: linkTokenValue || resetToken,
          newPassword: recoveryNewPassword.trim(),
          confirmPassword: recoveryConfirmPassword.trim()
        })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        setRecoveryMode('link_done');
        setRecoverySuccess(data.message || "تم تعيين كلمة المرور الجديدة بنجاح.");
        try {
          if (typeof window !== 'undefined' && (window.location.search.includes('resetToken') || window.location.pathname === '/auth/reset-password')) {
            window.history.replaceState({}, '', '/login');
          }
        } catch {}
      } else {
        setRecoveryError(data?.error || "تعذر حفظ كلمة المرور الجديدة.");
      }
    } catch {
      setRecoveryError("حدث خطأ أثناء حفظ كلمة المرور الجديدة.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Quick helper to fill test accounts
  const handleSelectDemoAccount = (id: string, pass: string = "123") => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
  };

  return (
    <div 
      className="min-h-screen bg-[#f4f7fb] dark:bg-[#081426] flex flex-col font-sans transition-colors"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* 1. TOP UTILITY BAR (Official Association Bar) */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0e213d]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#1e3a66] transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[4.25rem] py-2 flex items-center justify-between gap-2 sm:gap-4">
          
          {/* Logo & Association Info */}
          <div className="flex items-center gap-2 sm:gap-3.5 shrink-0 min-w-0">
            <div className="w-10 h-10 rounded-full bg-white ring-2 ring-[#0754C7]/25 dark:ring-[#0875E1]/40 shadow-xs flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src={homeSettings?.logoUrl && !String(homeSettings.logoUrl).includes("unsplash.com") ? homeSettings.logoUrl : "/logo.png"} 
                alt="شعار جمعية ريادة العطاء" 
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col justify-center min-w-0 text-right">
              <h1 className="text-xs sm:text-sm font-black text-[#071C43] dark:text-white leading-tight tracking-tight truncate max-w-[140px] min-[390px]:max-w-[205px] sm:max-w-none">
                {lang === 'ar' ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Reyadat Al-Ata Association"}
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold tracking-normal hidden sm:block whitespace-nowrap">
                  {lang === 'ar' ? "بوابة النفاذ الموحدة" : "Unified Access Portal"}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0754C7] dark:text-blue-300 bg-[#eaf3ff] dark:bg-[#142d50] px-2 py-0.5 rounded-full border border-blue-200/70 dark:border-[#244577] shrink-0">
                  <ShieldCheck className="w-3 h-3 text-[#0754C7] dark:text-blue-300 shrink-0" />
                  <span className="hidden sm:inline">{lang === 'ar' ? "ترخيص: " : "License: "}</span>
                  <span className="font-mono">1000888600</span>
                </span>
              </div>
            </div>
          </div>

          {/* Top Actions: Language & Return to Home */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {onToggleLang && (
              <button
                type="button"
                onClick={() => onToggleLang(lang === 'ar' ? 'en' : 'ar')}
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#142d50] rounded-xl border border-slate-200/70 dark:border-[#244577] transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                title="تغيير اللغة / Switch Language"
                aria-label="تغيير اللغة"
              >
                <Globe className="w-4 h-4 text-[#0754C7] dark:text-blue-300" />
                <span className="hidden sm:inline font-mono">{lang === 'ar' ? "English" : "العربية"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onBackToHome}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-[#071C43] dark:text-slate-200 hover:text-[#0754C7] dark:hover:text-white bg-slate-100 dark:bg-[#142d50] hover:bg-[#eaf3ff] dark:hover:bg-[#1b3a66] rounded-xl border border-slate-200 dark:border-[#244577] transition-all cursor-pointer"
              title={lang === 'ar' ? "العودة للموقع الرسمي للجمعية" : "Back to official homepage"}
            >
              {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
              <span className="hidden sm:inline">{lang === 'ar' ? "الرئيسية" : "Home"}</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN BODY (SPLIT VIEW: OFFICIAL BRANDING + SMART/UNIFIED LOGIN CARD) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* ======================================================== */}
          {/* SECTION 1: CHARITY BRANDING & MISSION SIDE (Royal Navy Official Identity) */}
          {/* ======================================================== */}
          <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#071C43] via-[#09295e] to-[#0754C7] text-white shadow-xl relative overflow-hidden order-2 lg:order-1 border border-[#1d4282]">
            {/* Background Decorative Accents */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#0875E1]/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#0754C7]/25 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

            <div className="relative z-10 space-y-6">
              
              {/* Official Association Emblem */}
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center border border-white/30 shadow-lg shrink-0">
                  <img
                    src={homeSettings?.logoUrl && !String(homeSettings.logoUrl).includes("unsplash.com") ? homeSettings.logoUrl : "/logo.png"}
                    alt="شعار جمعية ريادة العطاء"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold tracking-wide text-blue-200">
                    {lang === 'ar' ? "منظومة العطاء المتكاملة" : "Nonprofit Portal"}
                  </div>
                  <div className="text-sm font-black text-white">
                    {lang === 'ar' ? "جمعية ريادة العطاء لخدمة الإنسان بالعسيلة" : "Reyadat Al-Ata Association"}
                  </div>
                </div>
              </div>

              {/* Main Headline */}
              <div className="space-y-2.5 pt-2">
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-snug tracking-tight">
                  {lang === 'ar' ? "معًا نصنع أثرًا ونبني مجتمعًا أفضل" : "Together Making Impact & Building a Better Society"}
                </h2>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-normal">
                  {lang === 'ar' 
                    ? "بوابة ذكية وآمنة لجميع المستفيدين والمتطوعين والكوادر الإدارية، مصممة لتسهيل الوصول وحماية الخصوصية."
                    : "Smart, secure portal for all beneficiaries, volunteers, and management teams."}
                </p>
              </div>

              {/* 3 Pillars */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#0875E1]/30 text-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "دخول ذكي وآمن" : "Smart & Secure Access"}
                    </h3>
                    <p className="text-[11px] text-blue-100/80 leading-relaxed">
                      {lang === 'ar' ? "دعم كلمة المرور ورمز الدخول السريع (6 أرقام) المرتبط بالأجهزة الموثوقة فقط." : "Password & trusted-device 6-digit quick PIN."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "خدمة موثوقة" : "Reliable Services"}
                    </h3>
                    <p className="text-[11px] text-blue-100/80 leading-relaxed">
                      {lang === 'ar' ? "تطبيق كامل لمعايير الحوكمة وصلاحيات الإدارات المعتمدة في الجمعية." : "Full governance and live role permissions."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-[#0875E1]/30 text-blue-200 flex items-center justify-center shrink-0 mt-0.5">
                    <HeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white">
                      {lang === 'ar' ? "مجتمع متكافل" : "Better Community"}
                    </h3>
                    <p className="text-[11px] text-blue-100/80 leading-relaxed">
                      {lang === 'ar' ? "رحلة رقمية متكاملة للمستفيدين والمتطوعين وفرق العمل الميدانية." : "Unified portal for beneficiaries and volunteers."}
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Footer Note */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/15 flex items-center justify-between text-[10px] text-blue-100/80">
              <span>{lang === 'ar' ? "العسيلة - مكة المكرمة" : "Al-Useilah, Makkah"}</span>
              <span className="flex items-center gap-1 font-bold text-white">
                <Check className="w-3 h-3 text-blue-300" />
                {lang === 'ar' ? "مصادقة مشفرة بالكامل" : "Encrypted Authentication"}
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SECTION 2: WELCOME SCREEN OR UNIFIED LOGIN CARD */}
          {/* ======================================================== */}
          <div className="w-full lg:col-span-7 flex flex-col justify-center order-1 lg:order-2 max-w-xl mx-auto lg:max-w-none">
            <div className="bg-white dark:bg-[#0e213d] rounded-3xl border border-slate-200/90 dark:border-[#1e3a66] shadow-xl p-5 sm:p-9 space-y-5">

              {/* RETURNING USER WELCOME SCREEN */}
              {loginViewMode === 'welcome' && selectedRememberedAccount ? (
                <div className="space-y-5 animate-in fade-in duration-200" data-testid="welcome-back-card">
                  {/* Association Logo + User Identity Header */}
                  <div className="flex flex-col items-center text-center space-y-3 pt-1">
                    <div className="relative">
                      {selectedRememberedAccount.avatarUrl ? (
                        <img
                          src={selectedRememberedAccount.avatarUrl}
                          alt={selectedRememberedAccount.displayName}
                          className="w-20 h-20 rounded-full object-cover ring-4 ring-[#0754C7]/20 dark:ring-[#0875E1]/40 shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#071C43] to-[#0754C7] text-white text-2xl font-black flex items-center justify-center ring-4 ring-[#0754C7]/20 dark:ring-[#0875E1]/40 shadow-md">
                          {selectedRememberedAccount.firstName.charAt(0)}
                        </div>
                      )}
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 rounded-full bg-white dark:bg-[#0e213d] p-1 border border-slate-200 dark:border-[#244577] shadow-sm flex items-center justify-center">
                        <img
                          src={homeSettings?.logoUrl && !String(homeSettings.logoUrl).includes("unsplash.com") ? homeSettings.logoUrl : "/logo.png"}
                          alt="شعار الجمعية"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h2 className="text-xl sm:text-2xl font-black text-[#071C43] dark:text-white tracking-tight">
                        مرحبًا بعودتك، {selectedRememberedAccount.firstName}!
                      </h2>
                      <p className="text-xs font-bold text-[#0754C7] dark:text-blue-300">
                        يسعدنا وجودك مجددًا في ريادة العطاء
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {selectedRememberedAccount.displayName} • {selectedRememberedAccount.roleLabel}
                      </p>
                    </div>
                  </div>

                  {/* Multi-account Switcher (when 1+ remembered accounts saved on this device) */}
                  {rememberedAccounts.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                        <span>{rememberedAccounts.length > 1 ? "الحسابات المحفوظة على هذا الجهاز:" : "الحساب المحدد:"}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setLoginViewMode('standard');
                          }}
                          className="text-[#0754C7] dark:text-blue-300 hover:underline inline-flex items-center gap-1 cursor-pointer font-black"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>استخدام حساب آخر</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {rememberedAccounts.map((acc) => {
                          const isSelected = acc.rememberId === selectedRememberedAccount.rememberId;
                          return (
                            <div
                              key={acc.rememberId}
                              className={`group flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl border text-xs transition-all ${
                                isSelected
                                  ? "bg-[#eaf3ff] dark:bg-[#142d50] border-[#0754C7] dark:border-[#0875E1] text-[#071C43] dark:text-white font-black shadow-2xs"
                                  : "bg-slate-50 dark:bg-[#081426] border-slate-200 dark:border-[#244577] text-slate-600 dark:text-slate-300 font-bold hover:border-[#0754C7]/60"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleSelectRememberedCard(acc)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <span className="w-6 h-6 rounded-full bg-[#071C43] dark:bg-[#0754C7] text-white text-[10px] font-black flex items-center justify-center shrink-0">
                                  {acc.firstName.charAt(0)}
                                </span>
                                <span className="max-w-[110px] truncate">{acc.firstName}</span>
                                {acc.hasPinEnabled && (
                                  <span title="يدعم الدخول السريع" className="inline-flex shrink-0">
                                    <KeyRound className="w-3 h-3 text-[#0754C7] dark:text-blue-300" />
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveRememberedCard(acc.rememberId)}
                                title={`إزالة ${acc.firstName} من هذا الجهاز`}
                                aria-label={`إزالة ${acc.firstName} من شاشة الترحيب`}
                                className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quick Switch Between Password Login & 6-Digit PIN Login */}
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-[#081426] border border-slate-200/80 dark:border-[#244577]">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setWelcomeAuthMethod('pin');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        welcomeAuthMethod === 'pin'
                          ? "bg-[#0754C7] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-[#071C43] dark:hover:text-white"
                      }`}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>الدخول برمز من 6 أرقام</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setWelcomeAuthMethod('password');
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        welcomeAuthMethod === 'password'
                          ? "bg-[#071C43] dark:bg-[#0875E1] text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-[#071C43] dark:hover:text-white"
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>الدخول بكلمة المرور</span>
                    </button>
                  </div>

                  {/* Error Alert Display */}
                  {error && (
                    <div
                      role="alert"
                      className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <div className="font-bold leading-relaxed text-right flex-1">{error}</div>
                    </div>
                  )}

                  {/* Option A: 6-Digit Trusted Device PIN Form */}
                  {welcomeAuthMethod === 'pin' && (
                    <div className="space-y-4">
                      {!selectedRememberedAccount.hasPinEnabled ? (
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#244577] text-center space-y-2.5">
                          <Smartphone className="w-6 h-6 text-[#0754C7] dark:text-blue-300 mx-auto" />
                          <p className="text-xs font-black text-[#071C43] dark:text-white">
                            الدخول السريع بالرمز غير مفعل على هذا الجهاز بعد
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                            لأمان حسابك، يُفعَّل الرمز من 6 أرقام من داخل «الأمان وتسجيل الدخول» بعد دخولك بكلمة المرور أو Google.
                          </p>
                          <button
                            type="button"
                            onClick={() => setWelcomeAuthMethod('password')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0754C7] hover:bg-[#0875E1] text-white text-xs font-black cursor-pointer transition-all"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>الدخول بكلمة المرور الآن</span>
                          </button>
                        </div>
                      ) : selectedRememberedAccount.requireFullLogin ? (
                        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center space-y-2.5">
                          <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto" />
                          <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                            تم قفل الدخول بالرمز مؤقتاً لحماية حسابك
                          </p>
                          <p className="text-[11px] text-amber-800/90 dark:text-amber-300 leading-relaxed">
                            يرجى إتمام تسجيل الدخول الكامل بكلمة المرور أو حساب Google لإعادة تفعيل الرمز السريع.
                          </p>
                          <button
                            type="button"
                            onClick={() => setWelcomeAuthMethod('password')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#071C43] hover:bg-[#0754C7] text-white text-xs font-black cursor-pointer transition-all"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>المتابعة بكلمة المرور</span>
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={(e) => handlePinLoginSubmit(e)} className="space-y-4">
                          <PinCodeInput
                            value={pinInput}
                            onChange={(val) => {
                              setPinInput(val);
                              if (error) setError(null);
                            }}
                            onComplete={(val) => handlePinLoginSubmit(undefined, val)}
                            disabled={pinLoading}
                            label="أدخل رمز الدخول السريع المكون من 6 أرقام"
                            idPrefix="welcome-pin"
                            autoFocus
                          />

                          <button
                            type="submit"
                            disabled={pinLoading || pinInput.length !== 6}
                            className="w-full py-3.5 px-4 bg-[#0754C7] hover:bg-[#0875E1] active:bg-[#071C43] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {pinLoading ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                                <span>جاري التحقق من الرمز...</span>
                              </>
                            ) : (
                              <>
                                <LogIn className="w-4 h-4" />
                                <span>دخول فوري برمز 6 أرقام</span>
                              </>
                            )}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Option B: Password Login without re-entering National ID / Username */}
                  {welcomeAuthMethod === 'password' && (
                    <form onSubmit={handleRememberedPasswordLogin} className="space-y-4">
                      <div className="space-y-1.5">
                        <label
                          htmlFor="remembered-password"
                          className="block text-xs font-black text-[#071C43] dark:text-slate-200 text-right"
                        >
                          كلمة المرور لحساب ({selectedRememberedAccount.firstName}):
                        </label>
                        <div className="relative">
                          <input
                            id="remembered-password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            autoFocus
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (error) setError(null);
                            }}
                            placeholder="أدخل كلمة المرور فقط"
                            className="w-full pr-10 pl-11 py-3.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50/80 dark:bg-[#081426] text-[#071C43] dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-[#0b1b34] focus:outline-none focus:ring-2 focus:ring-[#0754C7]/25 focus:border-[#0754C7] transition-all font-medium"
                            disabled={loading}
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                            className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#0754C7] dark:hover:text-blue-300 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 px-4 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {loading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin text-white" />
                            <span>جاري التحقق والدخول...</span>
                          </>
                        ) : (
                          <>
                            <LogIn className="w-4 h-4" />
                            <span>الدخول بكلمة المرور</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {/* Recovery & Alternate Account Links */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryError(null);
                        setRecoverySuccess(null);
                        if (otpEnabled) {
                          setRecoveryMode('otp');
                          setRecoveryIdentifier("");
                          setRecoveryRememberId(selectedRememberedAccount.rememberId);
                          setRecoveryStep(1);
                          setShowForgotModal(true);
                          handleIdentifyAccount(undefined, selectedRememberedAccount.rememberId);
                        } else {
                          setLinkEmailInput("");
                          setRecoveryMode('link_request');
                          setShowForgotModal(true);
                        }
                      }}
                      className="text-[#0754C7] dark:text-blue-300 hover:underline font-bold cursor-pointer"
                    >
                      نسيت كلمة المرور؟
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setLoginViewMode('standard');
                      }}
                      className="text-slate-600 dark:text-slate-300 hover:text-[#071C43] dark:hover:text-white font-bold cursor-pointer"
                    >
                      استخدام حساب آخر
                    </button>
                  </div>
                </div>
              ) : (
                /* STANDARD FULL LOGIN CARD */
                <div className="space-y-5">
                  {/* Back to Welcome Card button if user has remembered accounts */}
                  {rememberedAccounts.length > 0 && (
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#1e3a66]">
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setLoginViewMode('welcome');
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-black text-[#0754C7] dark:text-blue-300 hover:underline cursor-pointer"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>العودة إلى الترحيب السريع ({rememberedAccounts[0].firstName})</span>
                      </button>
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="space-y-1.5 text-right">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eaf3ff] dark:bg-[#142d50] text-[#0754C7] dark:text-blue-300 text-[11px] font-bold border border-blue-200/70 dark:border-[#244577]">
                      <KeyRound className="w-3 h-3 text-[#0754C7] dark:text-blue-300" />
                      <span>{lang === 'ar' ? "البوابة الموحدة لكافة الحسابات" : "Unified All-Accounts Portal"}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-[#071C43] dark:text-white tracking-tight">
                      {lang === 'ar' ? "تسجيل الدخول" : "Sign In"}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      {lang === 'ar' 
                        ? "مرحبًا بك، قم بتسجيل الدخول للوصول إلى حسابك (المدير، الموظف، المتطوع، المستفيد، الشريك)"
                        : "Welcome back! Sign in to access your account dashboard."}
                    </p>
                  </div>

                  {/* Error Alert Display */}
                  {error && (
                    <div 
                      role="alert"
                      className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-4 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-start gap-3 transition-all animate-in fade-in duration-200"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                      <div className="font-semibold leading-relaxed text-right flex-1">
                        {error}
                      </div>
                    </div>
                  )}

                  {/* Form Content */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* FIELD 1: Identifier (National ID / Username / Email / Phone) */}
                    <div className="space-y-1.5">
                      <label 
                        htmlFor="user-identifier"
                        className="block text-xs font-black text-[#071C43] dark:text-slate-300 text-right"
                      >
                        {lang === 'ar' 
                          ? "رقم الهوية الوطنية / اسم المستخدم / البريد الإلكتروني" 
                          : "National ID / Username / Email / Phone"}
                        <span className="text-rose-500 mr-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="user-identifier"
                          name="identifier"
                          type="text"
                          autoComplete="username"
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder={
                            lang === 'ar' 
                              ? "أدخل رقم الهوية أو اسم المستخدم أو البريد الإلكتروني" 
                              : "Enter your National ID, username, or email"
                          }
                          className="w-full pr-10 pl-4 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50/70 dark:bg-[#081426] text-[#071C43] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0b1b34] focus:outline-none focus:ring-2 focus:ring-[#0754C7]/20 focus:border-[#0754C7] transition-all font-medium"
                          disabled={loading}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* FIELD 2: Password with Show/Hide toggle */}
                    <div className="space-y-1.5">
                      <label 
                        htmlFor="user-password"
                        className="block text-xs font-black text-[#071C43] dark:text-slate-300 text-right"
                      >
                        {lang === 'ar' ? "كلمة المرور" : "Password"}
                        <span className="text-rose-500 mr-1">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="user-password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError(null);
                          }}
                          placeholder={lang === 'ar' ? "أدخل كلمة المرور" : "Enter your password"}
                          className="w-full pr-10 pl-11 py-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50/70 dark:bg-[#081426] text-[#071C43] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0b1b34] focus:outline-none focus:ring-2 focus:ring-[#0754C7]/20 focus:border-[#0754C7] transition-all font-medium"
                          disabled={loading}
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#0754C7] dark:hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Default Password Tip for New Beneficiaries and Volunteers */}
                      <div className="mt-2 p-2.5 rounded-xl bg-[#eaf3ff] dark:bg-[#142d50]/70 border border-blue-200/70 dark:border-[#244577] flex items-center gap-2 text-[11px] text-[#071C43] dark:text-blue-200">
                        <span className="w-2 h-2 rounded-full bg-[#0754C7] shrink-0" />
                        <span>
                          {lang === 'ar' 
                            ? <>كلمة المرور الافتراضية للمستفيدين والمتطوعين الجدد هي <strong className="font-mono font-black text-xs text-[#071C43] dark:text-white bg-blue-200/60 dark:bg-[#0754C7]/50 px-1 py-0.5 rounded">A123b456</strong> (يلزم تغييرها عند أول دخول).</>
                            : <>Default password for new beneficiaries and volunteers is <strong className="font-mono font-bold">A123b456</strong> (mandatory change upon first login).</>}
                        </span>
                      </div>
                    </div>

                    {/* ROW: Privacy-Safe Remember Me Opt-In & Forgot Password */}
                    <div className="flex items-center justify-between pt-1 text-xs gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          id="checkbox-remember-device"
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded-md border-slate-300 text-[#0754C7] focus:ring-[#0754C7] dark:border-[#244577] dark:bg-[#081426] cursor-pointer"
                        />
                        <span className="text-slate-700 dark:text-slate-300 font-bold">
                          {lang === 'ar' ? "تذكرني على هذا الجهاز" : "Remember this account"}
                        </span>
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryError(null);
                          setRecoverySuccess(null);
                          if (otpEnabled) {
                            setRecoveryMode('otp');
                            setRecoveryRememberId("");
                            setRecoveryIdentifier(identifier);
                            setRecoveryStep(1);
                            setShowForgotModal(true);
                          } else {
                            setLinkEmailInput(identifier.includes("@") ? identifier : "");
                            setRecoveryMode('link_request');
                            setShowForgotModal(true);
                          }
                        }}
                        className="text-[#0754C7] dark:text-blue-300 hover:underline font-bold transition-colors cursor-pointer"
                      >
                        {lang === 'ar' ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                      </button>
                    </div>

                    {/* SUBMIT BUTTON */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 px-4 bg-[#071C43] hover:bg-[#0754C7] active:bg-[#051533] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>{lang === 'ar' ? "جاري التحقق والمصادقة..." : "Verifying credentials..."}</span>
                        </>
                      ) : (
                        <span>{lang === 'ar' ? "تسجيل الدخول" : "Sign In"}</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {isMaintenanceMode ? (
                /* MAINTENANCE MODE NOTICE: Google login & public registration closed */
                <div className="pt-2 text-center space-y-2">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>الموقع تحت الصيانة والتطوير. تسجيل الدخول عبر Google وإنشاء الحسابات الجديدة معطّل مؤقتاً، والدخول محصور لكوادر الإدارة والعمليات فقط.</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* DIVIDER: OR (Strictly Google Only - Apple & Facebook Permanently Removed) */}
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                        {lang === 'ar' ? "أو المتابعة باستخدام" : "Or continue with"}
                      </span>
                    </div>
                  </div>

                  {/* GOOGLE SIGN IN BUTTON (OFFICIAL GOOGLE IDENTITY SERVICES) */}
                  {GOOGLE_CLIENT_ID ? (
                    <div className="w-full flex flex-col items-center justify-center min-h-[44px]">
                      <div id="gis-button-slot" className="w-full flex justify-center" />
                      {googleLoading && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 font-bold">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                          <span>{lang === 'ar' ? "جاري التحقق من هوية Google..." : "Verifying Google Identity..."}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                      className="w-full py-3 px-4 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-3 cursor-pointer shadow-xs disabled:opacity-60"
                    >
                      {googleLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                      )}
                      <span>
                        {lang === 'ar' ? "تسجيل الدخول بواسطة Google" : "Sign in with Google"}
                      </span>
                    </button>
                  )}

                  {/* CREATE NEW ACCOUNT LINK */}
                  <div className="pt-2 text-center">
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {lang === 'ar' ? "ليس لديك حساب؟" : "Don't have an account?"}{" "}
                      <button
                        type="button"
                        onClick={() => {
                          if (onRegisterNewAccount) {
                            onRegisterNewAccount();
                          } else {
                            onBackToHome();
                          }
                        }}
                        className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-black underline underline-offset-4 cursor-pointer"
                      >
                        {lang === 'ar' ? "إنشاء حساب جديد" : "Create New Account"}
                      </button>
                    </p>
                  </div>
                </>
              )}

              {/* QUICK DEMO CREDENTIALS COLLAPSIBLE (For testing and evaluating all roles) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                  className="w-full flex items-center justify-between py-2 text-[11px] font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{lang === 'ar' ? "بيانات الحسابات المعتمدة للتجربة (اضغط للتعبئة التلقائية)" : "Test Accounts Demo Access"}</span>
                  </span>
                  {showDemoCredentials ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showDemoCredentials && (
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-[11px] space-y-2">
                    <p className="text-slate-500 dark:text-slate-400 leading-normal">
                      {lang === 'ar' 
                        ? "انقر على أي حساب لتعبئة بيانات الدخول مباشرة وتجربة التعرف التلقائي على الصلاحيات:" 
                        : "Click any profile to autofill and test auto-role detection:"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      
                      {/* Admin */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("admin", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          المدير التنفيذي / الإدارة
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          ID: admin / كلمة المرور: 123
                        </div>
                      </button>

                      {/* Volunteer by National ID */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1087654321", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          متطوع (برقم الهوية)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1087654321 / 123
                        </div>
                      </button>

                      {/* Beneficiary by Email or National ID */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1023456789", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مستفيد (أبو محمد المكي)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1023456789 / 123
                        </div>
                      </button>

                      {/* Storekeeper */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000099", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          أمين المستودع الرئيسي
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000099 / 123
                        </div>
                      </button>

                      {/* Warehouse & Support Services Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000008", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مدير المخزن والخدمات المساندة
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000008 / 123
                        </div>
                      </button>

                      {/* Department Employee (HR & Warehouse) */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1034567890", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          موظف إدارة معتمد (سعود الهذلي)
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1034567890 / 123
                        </div>
                      </button>

                      {/* Volunteer Management Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000005", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مديرة إدارة التطوع
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000005 / 123
                        </div>
                      </button>

                      {/* Beneficiaries Director */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1010000004", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          مديرة إدارة المستفيدين
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          هوية: 1010000004 / 123
                        </div>
                      </button>

                      {/* Team Leader */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("سعود الحربي", "123")}
                        className="p-2 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-slate-800 dark:text-white group-hover:text-emerald-600">
                          قائد فريق تطوعي
                        </div>
                        <div className="text-[10px] text-slate-500">
                          الاسم: سعود الحربي / 123
                        </div>
                      </button>

                      {/* Test Inactive Account Error State */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1099999991", "123")}
                        className="p-2 text-right bg-rose-50/60 dark:bg-rose-950/20 hover:border-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-rose-800 dark:text-rose-300">
                          تجربة حساب غير مفعل
                        </div>
                        <div className="text-[10px] text-rose-600/80 font-mono">
                          1099999991 (رسالة الحساب غير مفعل)
                        </div>
                      </button>

                      {/* Test Suspended Account Error State */}
                      <button
                        type="button"
                        onClick={() => handleSelectDemoAccount("1099999992", "123")}
                        className="p-2 text-right bg-amber-50/60 dark:bg-amber-950/20 hover:border-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-xl transition-all cursor-pointer group"
                      >
                        <div className="font-black text-amber-800 dark:text-amber-300">
                          تجربة حساب موقوف
                        </div>
                        <div className="text-[10px] text-amber-600/80 font-mono">
                          1099999992 (رسالة الإيقاف المؤقت)
                        </div>
                      </button>

                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FORGOT PASSWORD / RECOVERY MODAL (Email Link Default + Optional OTP) */}
      {/* ======================================================== */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#071C43]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0e213d] border border-slate-200 dark:border-[#1e3a66] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-right relative">
            
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-[#142d50] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {recoveryMode !== 'otp' ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-[#eaf3ff] dark:bg-[#142d50] text-[#0754C7] dark:text-blue-300 flex items-center justify-center shadow-xs">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-[#0754C7] dark:text-blue-300 bg-[#eaf3ff] dark:bg-[#081426] px-2.5 py-1 rounded-full">
                      استعادة آمنة عبر البريد الإلكتروني
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-[#071C43] dark:text-white">
                      {recoveryMode === 'link_request' && "استعادة كلمة المرور"}
                      {recoveryMode === 'link_sent' && "تم استلام طلب الاستعادة"}
                      {recoveryMode === 'link_validate' && "جاري التحقق من رابط الاستعادة..."}
                      {recoveryMode === 'link_reset' && "تعيين كلمة مرور جديدة"}
                      {recoveryMode === 'link_invalid' && "رابط الاستعادة غير صالح"}
                      {recoveryMode === 'link_done' && "تم تحديث كلمة المرور بنجاح"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                      {recoveryMode === 'link_request' && "أدخل بريدك الإلكتروني المسجل في النظام لإرسال رابط مؤقت وآمن لإعادة تعيين كلمة المرور."}
                      {recoveryMode === 'link_sent' && "يرجى فحص صندوق الوارد (أو الرسائل غير المرغوب فيها) والضغط على الرابط المرفق خلال 30 دقيقة."}
                      {recoveryMode === 'link_reset' && (linkMaskedEmail ? `الحساب المرتبط: ${linkMaskedEmail}` : "أدخل كلمة مرور قوية ومؤكدة لحسابك.")}
                      {recoveryMode === 'link_done' && "تم حفظ كلمة المرور الجديدة وإنهاء كافة الجلسات السابقة لحمايتك."}
                    </p>
                  </div>
                </div>

                {recoveryError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="font-bold leading-relaxed">{recoveryError}</span>
                  </div>
                )}

                {recoverySuccess && recoveryMode !== 'link_done' && (
                  <div className="p-3 bg-[#eaf3ff] dark:bg-[#142d50] border border-blue-200 dark:border-[#244577] rounded-2xl text-[#071C43] dark:text-blue-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0754C7]" />
                    <span className="font-bold leading-relaxed">{recoverySuccess}</span>
                  </div>
                )}

                {recoveryMode === 'link_request' && (
                  <form onSubmit={handleRequestResetLink} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#071C43] dark:text-slate-300">
                        البريد الإلكتروني المسجل:
                      </label>
                      <input
                        type="email"
                        value={linkEmailInput}
                        onChange={(e) => setLinkEmailInput(e.target.value)}
                        placeholder="name@example.com"
                        dir="ltr"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-[#071C43] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0754C7] text-left font-mono"
                        autoFocus
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={recoveryLoading}
                        className="flex-1 py-2.5 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                      >
                        {recoveryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        <span>إرسال رابط إعادة التعيين</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForgotModal(false)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#142d50] text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
                )}

                {recoveryMode === 'link_sent' && (
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="w-full py-2.5 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl cursor-pointer"
                    >
                      حسناً، العودة لتسجيل الدخول
                    </button>
                  </div>
                )}

                {recoveryMode === 'link_validate' && (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs font-bold text-[#0754C7] dark:text-blue-300">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري فحص صلاحية رابط إعادة تعيين كلمة المرور...</span>
                  </div>
                )}

                {recoveryMode === 'link_invalid' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryError(null);
                        setRecoverySuccess(null);
                        setRecoveryMode('link_request');
                      }}
                      className="flex-1 py-2.5 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl cursor-pointer"
                    >
                      طلب رابط استعادة جديد
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-[#142d50] text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                    >
                      إغلاق
                    </button>
                  </div>
                )}

                {recoveryMode === 'link_reset' && (
                  <form onSubmit={handleConfirmResetWithLink} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-[#071C43] dark:text-slate-300">كلمة المرور الجديدة:</label>
                        <button
                          type="button"
                          onClick={() => {
                            const strong = generateStrongPassword();
                            setRecoveryNewPassword(strong);
                            setRecoveryConfirmPassword(strong);
                            setRecoveryError(null);
                          }}
                          className="text-[11px] text-[#0754C7] dark:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>توليد كلمة قوية</span>
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showRecNewPass ? "text" : "password"}
                          value={recoveryNewPassword}
                          onChange={(e) => setRecoveryNewPassword(e.target.value)}
                          placeholder="أدخل كلمة مرور قوية (8 خانات فأكثر)"
                          className="w-full bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#244577] rounded-xl p-2.5 pl-10 text-xs text-[#071C43] dark:text-white"
                          autoFocus
                          required
                        />
                        <button type="button" onClick={() => setShowRecNewPass(!showRecNewPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                          {showRecNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <PasswordStrengthMeter password={recoveryNewPassword} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#071C43] dark:text-slate-300 mb-1.5">تأكيد كلمة المرور الجديدة:</label>
                      <div className="relative">
                        <input
                          type={showRecConfirmPass ? "text" : "password"}
                          value={recoveryConfirmPassword}
                          onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                          placeholder="أعد إدخال كلمة المرور"
                          className="w-full bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#244577] rounded-xl p-2.5 pl-10 text-xs text-[#071C43] dark:text-white"
                          required
                        />
                        <button type="button" onClick={() => setShowRecConfirmPass(!showRecConfirmPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                          {showRecConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={recoveryLoading || !recoveryNewPassword || recoveryNewPassword !== recoveryConfirmPassword}
                      className="w-full py-2.5 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl cursor-pointer disabled:opacity-60"
                    >
                      {recoveryLoading ? "جاري الحفظ..." : "تعيين كلمة المرور الجديدة"}
                    </button>
                  </form>
                )}

                {recoveryMode === 'link_done' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setPassword("");
                      setError(null);
                      setRecoveryNewPassword("");
                      setRecoveryConfirmPassword("");
                      setWelcomeAuthMethod('password');
                    }}
                    className="w-full py-3 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    تسجيل الدخول الآن بكلمة المرور الجديدة
                  </button>
                )}
              </>
            ) : (
              <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#eaf3ff] dark:bg-[#142d50] text-[#0754C7] dark:text-blue-300 flex items-center justify-center shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-[#081426] px-2.5 py-1 rounded-full">
                  <span>الخطوة {recoveryStep} من 5</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0754C7]"></span>
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-[#071C43] dark:text-white">
                  {recoveryStep === 1 && "استعادة كلمة المرور"}
                  {recoveryStep === 2 && "اختيار قناة استلام الرمز"}
                  {recoveryStep === 3 && "إدخال رمز التحقق OTP"}
                  {recoveryStep === 4 && "تعيين كلمة المرور الجديدة"}
                  {recoveryStep === 5 && "تم تحديث كلمة المرور بنجاح"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
                  {recoveryStep === 1 && "أدخل رقم الهوية أو اسم المستخدم أو البريد المسجل للتحقق من حسابك."}
                  {recoveryStep === 2 && "اختر قناة استلام رمز التحقق المكون من 6 أرقام."}
                  {recoveryStep === 3 && `أدخل رمز التحقق المرسل عبر (${recoveryChannel === 'whatsapp' ? `واتساب ${maskedPhone}` : `البريد ${maskedEmail}`}).`}
                  {recoveryStep === 4 && "أدخل كلمة مرور قوية مطابقة لمعايير الأمان."}
                  {recoveryStep === 5 && "تم حفظ كلمة المرور الجديدة وإلغاء أجهزة الدخول السريع السابقة لحمايتك."}
                </p>
              </div>
            </div>

            {recoveryError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-bold leading-relaxed">{recoveryError}</span>
              </div>
            )}

            {recoverySuccess && recoveryStep !== 5 && (
              <div className="p-3 bg-[#eaf3ff] dark:bg-[#142d50] border border-blue-200 dark:border-[#244577] rounded-2xl text-[#071C43] dark:text-blue-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0754C7]" />
                <span className="font-bold leading-relaxed">{recoverySuccess}</span>
              </div>
            )}

            {recoveryStep === 1 && (
              <form onSubmit={(e) => handleIdentifyAccount(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#071C43] dark:text-slate-300">
                    رقم الهوية أو اسم المستخدم أو البريد الإلكتروني:
                  </label>
                  <input
                    type="text"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="أدخل رقم الهوية أو البريد الإلكتروني"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-[#244577] bg-slate-50 dark:bg-[#081426] text-[#071C43] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0754C7]"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2.5 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {recoveryLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                    <span>متابعة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#142d50] text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 2 && (
              <form onSubmit={handleRequestOtp} className="space-y-3">
                {availableChannels?.whatsapp?.available && (
                  <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${recoveryChannel === 'whatsapp' ? 'border-[#0754C7] bg-[#eaf3ff] dark:bg-[#142d50]' : 'border-slate-200 dark:border-[#244577]'}`}>
                    <span className="flex items-center gap-2 text-xs font-black text-[#071C43] dark:text-white">
                      <MessageSquare className="w-4 h-4 text-[#0754C7]" />
                      <span>واتساب ({maskedPhone || 'مسجل'})</span>
                    </span>
                    <input type="radio" name="recChannel" checked={recoveryChannel === 'whatsapp'} onChange={() => setRecoveryChannel('whatsapp')} />
                  </label>
                )}
                <label className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${recoveryChannel === 'email' ? 'border-[#0754C7] bg-[#eaf3ff] dark:bg-[#142d50]' : 'border-slate-200 dark:border-[#244577]'}`}>
                  <span className="flex items-center gap-2 text-xs font-black text-[#071C43] dark:text-white">
                    <Mail className="w-4 h-4 text-[#0754C7]" />
                    <span>البريد الإلكتروني ({maskedEmail || 'مسجل'})</span>
                  </span>
                  <input type="radio" name="recChannel" checked={recoveryChannel === 'email'} onChange={() => setRecoveryChannel('email')} />
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="flex-1 py-2.5 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl cursor-pointer"
                  >
                    {recoveryLoading ? "جاري الإرسال..." : "إرسال رمز التحقق OTP"}
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 3 && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <PinCodeInput
                  value={otpCode}
                  onChange={(val) => setOtpCode(val)}
                  label="أدخل رمز التحقق المكون من 6 أرقام:"
                  idPrefix="recovery-otp"
                  autoFocus
                />
                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    disabled={otpTimer > 0 || recoveryLoading}
                    onClick={() => handleRequestOtp()}
                    className="text-[#0754C7] dark:text-blue-300 font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {otpTimer > 0 ? `إعادة الإرسال بعد (${otpTimer}) ثانية` : "إعادة إرسال رمز جديد"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={recoveryLoading || otpCode.length !== 6}
                    className="flex-1 py-2.5 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    {recoveryLoading ? "جاري التحقق..." : "التحقق ومتابعة"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-[#142d50] text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 4 && (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[#071C43] dark:text-slate-300">كلمة المرور الجديدة:</label>
                    <button
                      type="button"
                      onClick={() => {
                        const strong = generateStrongPassword();
                        setRecoveryNewPassword(strong);
                        setRecoveryConfirmPassword(strong);
                        setRecoveryError(null);
                      }}
                      className="text-[11px] text-[#0754C7] dark:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>توليد كلمة قوية</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showRecNewPass ? "text" : "password"}
                      value={recoveryNewPassword}
                      onChange={(e) => setRecoveryNewPassword(e.target.value)}
                      placeholder="أدخل كلمة مرور قوية (8 خانات فأكثر)"
                      className="w-full bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#244577] rounded-xl p-2.5 pl-10 text-xs text-[#071C43] dark:text-white"
                      autoFocus
                      required
                    />
                    <button type="button" onClick={() => setShowRecNewPass(!showRecNewPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                      {showRecNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={recoveryNewPassword} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#071C43] dark:text-slate-300 mb-1.5">تأكيد كلمة المرور الجديدة:</label>
                  <div className="relative">
                    <input
                      type={showRecConfirmPass ? "text" : "password"}
                      value={recoveryConfirmPassword}
                      onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                      placeholder="أعد إدخال كلمة المرور"
                      className="w-full bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#244577] rounded-xl p-2.5 pl-10 text-xs text-[#071C43] dark:text-white"
                      required
                    />
                    <button type="button" onClick={() => setShowRecConfirmPass(!showRecConfirmPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer">
                      {showRecConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={recoveryLoading || !recoveryNewPassword || recoveryNewPassword !== recoveryConfirmPassword}
                    className="flex-1 py-2.5 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl cursor-pointer disabled:opacity-60"
                  >
                    {recoveryLoading ? "جاري الحفظ..." : "تأكيد وحفظ كلمة المرور"}
                  </button>
                </div>
              </form>
            )}

            {recoveryStep === 5 && (
              <div className="space-y-4">
                <div className="p-4 bg-[#eaf3ff] dark:bg-[#142d50] border border-blue-200 dark:border-[#244577] rounded-2xl text-[#071C43] dark:text-blue-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-[#0754C7] shrink-0" />
                    <span>تم تحديث كلمة المرور بنجاح!</span>
                  </div>
                  <p className="leading-relaxed">تم تأمين حسابك وإلغاء أي جلسات وأجهزة دخول سريع سابقة.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setPassword("");
                    setError(null);
                    setRecoveryStep(1);
                    setWelcomeAuthMethod('password');
                  }}
                  className="w-full py-3 bg-[#071C43] hover:bg-[#0754C7] text-white font-black text-xs rounded-xl cursor-pointer"
                >
                  تسجيل الدخول الآن بكلمة المرور الجديدة
                </button>
              </div>
            )}
              </>
            )}

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. GOOGLE SIGN IN MODAL */}
      {/* ======================================================== */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-right relative">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowGoogleModal(false);
                setGoogleModalError(null);
              }}
              className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-xs">
                <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {lang === 'ar' ? "تسجيل الدخول والتحقق بحساب Google" : "Sign in with Google Account"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {lang === 'ar' 
                  ? "سيتم التحقق من بريدك الإلكتروني عبر خادم Google المعتمد ومطابقته مباشرة مع حسابك المسجل، أو بدء طلب تسجيل جديد."
                  : "Verify your email via Google identity to access your registered account or register a new one."}
              </p>
            </div>

            {/* Error Message */}
            {googleModalError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-bold leading-relaxed">{googleModalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); submitGoogleSimulationAuth(googleEmailInput); }} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {lang === 'ar' ? "البريد الإلكتروني لحساب Google:" : "Google Account Email:"}
                  </label>
                  {!GOOGLE_CLIENT_ID && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-900/50">
                      وضع المعاينة والفحص
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={googleEmailInput}
                    onChange={(e) => setGoogleEmailInput(e.target.value)}
                    placeholder="example@gmail.com أو user@riadataleata.org.sa"
                    className="w-full px-3.5 py-2.5 pl-10 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    dir="ltr"
                    required
                    autoFocus
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Quick Select Buttons for Testing/Evaluation (All Scenarios) */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400">
                  {lang === 'ar' ? "أو اختر حساباً تجريبياً لفحص الحالات المطلوبة:" : "Or select a test case:"}
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmailInput("admin@riadataleata.org.sa");
                      submitGoogleSimulationAuth("admin@riadataleata.org.sa", "مجلس الجمعية والمدير التنفيذي");
                    }}
                    className="p-2 text-right bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                  >
                    👑 إداري (مجلس الإدارة)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmailInput("saud.h@reyadat-alata.org.sa");
                      submitGoogleSimulationAuth("saud.h@reyadat-alata.org.sa", "سعود الحربي (موظف)");
                    }}
                    className="p-2 text-right bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                  >
                    💼 موظف معتمد
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmailInput("ahmed.ghamdi@example.com");
                      submitGoogleSimulationAuth("ahmed.ghamdi@example.com", "أحمد الغامدي (متطوع)");
                    }}
                    className="p-2 text-right bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                  >
                    🤝 متطوع مسجل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmailInput("abumohammad@example.com");
                      submitGoogleSimulationAuth("abumohammad@example.com", "أبو محمد (مستفيد)");
                    }}
                    className="p-2 text-right bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                  >
                    🤲 مستفيد مسجل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmailInput("inactive@example.com");
                      submitGoogleSimulationAuth("inactive@example.com", "حساب غير مفعل");
                    }}
                    className="p-2 text-right bg-slate-50 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                  >
                    ⏳ حساب غير نشط
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleEmailInput("suspended@example.com");
                      submitGoogleSimulationAuth("suspended@example.com", "حساب موقوف");
                    }}
                    className="p-2 text-right bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer font-bold text-slate-700 dark:text-slate-200"
                  >
                    ⛔ حساب موقوف
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newEmail = "user.new." + Date.now().toString(36) + "@gmail.com";
                      setGoogleEmailInput(newEmail);
                      submitGoogleSimulationAuth(newEmail, "مستخدم جديد عبر Google");
                    }}
                    className="col-span-2 p-2 text-center bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800 rounded-xl transition-all cursor-pointer font-black text-emerald-800 dark:text-emerald-300 text-xs"
                  >
                    ✨ بريد جديد غير مسجل (اختيار مستفيد / متطوع)
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={googleLoading || !googleEmailInput.trim()}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {googleLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>{lang === 'ar' ? "جاري التحقق عبر Google..." : "Verifying with Google..."}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lang === 'ar' ? "متابعة تسجيل الدخول عبر Google" : "Continue with Google"}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowGoogleModal(false);
                    setGoogleModalError(null);
                  }}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'ar' ? "إلغاء" : "Cancel"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. GOOGLE COMPLETE REGISTRATION MODAL (FOR NEW USERS) */}
      {/* ======================================================== */}
      {showGoogleCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 text-right relative my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowGoogleCompleteModal(false);
                setGoogleAccountType(null);
                setGoogleRegSubmitted(false);
                setGoogleRegError(null);
              }}
              className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* SCREEN 1: SUCCESS / PENDING APPROVAL SUBMITTED */}
            {googleRegSubmitted ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-md border border-amber-200 dark:border-amber-900/50">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {lang === 'ar' ? "تم استلام طلب التسجيل بنجاح! 🎉" : "Registration Request Submitted!"}
                  </h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-black">
                    <span>{lang === 'ar' ? "حالة الحساب: قيد المراجعة والاعتماد (غير نشط)" : "Status: Pending Review (Inactive)"}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-right space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    {googleRegSuccessMsg}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    • البريد الموثق: <span className="font-mono text-emerald-600">{verifiedGoogleData?.email}</span><br />
                    • نوع الحساب المطلوب: <span className="font-bold">{googleAccountType === 'volunteer' ? 'متطوع' : 'مستفيد'}</span><br />
                    • لن يتم تفعيل الحساب أو منح حق الوصول إلى لوحة التحكم إلا بعد إتمام الفرز والمراجعة الرسمية من قبل إدارة الجمعية.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowGoogleCompleteModal(false);
                    setGoogleAccountType(null);
                    setGoogleRegSubmitted(false);
                    onBackToHome();
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-md"
                >
                  {lang === 'ar' ? "العودة إلى الصفحة الرئيسية للجمعية" : "Return to Homepage"}
                </button>
              </div>
            ) : !googleAccountType ? (
              /* SCREEN 2: CHOOSE ACCOUNT TYPE (مستفيد أو متطوع فقط - لا توجد أي خيارات إدارية) */
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تم التحقق من حساب Google: {verifiedGoogleData?.email}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {lang === 'ar' ? "اختر نوع الحساب لإكمال التسجيل" : "Select Account Type"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {lang === 'ar' 
                      ? "هذا البريد غير مسجل مسبقاً في النظام. يرجى اختيار صفتك لإكمال نموذج التسجيل المطلوب:" 
                      : "This email is not registered yet. Please select your account type to complete registration:"}
                  </p>
                </div>

                {/* THE TWO EXCLUSIVE OPTIONS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  
                  {/* OPTION 1: BENEFICIARY (مستفيد) */}
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleAccountType('beneficiary');
                      setGoogleRegError(null);
                    }}
                    className="p-5 text-right bg-white dark:bg-slate-800 hover:border-rose-500 dark:hover:border-rose-400 border-2 border-slate-200 dark:border-slate-700 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md flex flex-col justify-between space-y-3"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                      <Heart className="w-6 h-6 fill-rose-500/20" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400">
                        {lang === 'ar' ? "مستفيد" : "Beneficiary"}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        {lang === 'ar' 
                          ? "للمواطنين والمقيمين المستحقين لطلب المساعدات الإنسانية والبرامج الاجتماعية والتموينية." 
                          : "For eligible families and individuals seeking aid and humanitarian services."}
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 pt-1">
                      <span>{lang === 'ar' ? "اختيار والبدء بتعبئة النموذج" : "Select & Fill Form"}</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </div>
                  </button>

                  {/* OPTION 2: VOLUNTEER (متطوع) */}
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleAccountType('volunteer');
                      setGoogleRegError(null);
                    }}
                    className="p-5 text-right bg-white dark:bg-slate-800 hover:border-emerald-500 dark:hover:border-emerald-400 border-2 border-slate-200 dark:border-slate-700 rounded-2xl transition-all cursor-pointer group shadow-xs hover:shadow-md flex flex-col justify-between space-y-3"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {lang === 'ar' ? "متطوع" : "Volunteer"}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                        {lang === 'ar' 
                          ? "للمبادرين الراغبين بالانضمام للفرق التطوعية والمشاركة في الفعاليات والمبادرات الإنسانية والميدانية." 
                          : "For volunteers joining teams and participating in humanitarian field initiatives."}
                      </p>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pt-1">
                      <span>{lang === 'ar' ? "اختيار والبدء بتعبئة النموذج" : "Select & Fill Form"}</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </div>
                  </button>

                </div>

                {/* Security Restriction Note */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {lang === 'ar' 
                      ? "إشعار أمني: الحسابات الإدارية والموظفين يتم تعيينها حصرياً بواسطة إدارة الجمعية ولا تتاح عبر التسجيل الذاتي." 
                      : "Security note: Staff and admin accounts are strictly assigned by association management."}
                  </span>
                </div>
              </div>
            ) : (
              /* SCREEN 3: COMPLETE MANDATORY REGISTRATION FORM */
              <div className="space-y-4">
                
                {/* Header with Back button */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      {googleAccountType === 'volunteer' ? (
                        <>
                          <Users className="w-4 h-4 text-emerald-600" />
                          <span>{lang === 'ar' ? "إكمال نموذج تسجيل متطوع جديد" : "Complete Volunteer Registration"}</span>
                        </>
                      ) : (
                        <>
                          <Heart className="w-4 h-4 text-rose-600" />
                          <span>{lang === 'ar' ? "إكمال نموذج تسجيل مستفيد جديد" : "Complete Beneficiary Registration"}</span>
                        </>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {lang === 'ar' ? "جميع الحقول المشار إليها بعلامة (*) إلزامية لاستكمال الطلب." : "All marked (*) fields are required."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoogleAccountType(null)}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{lang === 'ar' ? "تغيير نوع الحساب" : "Change type"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Verified Google Email Badge */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                  <span className="text-slate-500 text-[11px] font-bold">البريد الإلكتروني الموثق عبر Google:</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-black text-[11px] flex items-center gap-1" dir="ltr">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {verifiedGoogleData?.email || googleEmailInput}
                  </span>
                </div>

                {/* Error Banner */}
                {googleRegError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span className="font-bold leading-relaxed">{googleRegError}</span>
                  </div>
                )}

                {/* Registration Form */}
                <form onSubmit={handleCompleteGoogleRegistration} className="space-y-3.5 text-xs">
                  
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      الاسم الكامل (رباعي) <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      value={gRegFullName}
                      onChange={(e) => setGRegFullName(e.target.value)}
                      placeholder="الاسم الكامل كما هو مسجل في الهوية الوطنية"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                  </div>

                  {/* National ID & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        رقم الهوية الوطنية / الإقامة (10 أرقام) <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="text"
                        maxLength={10}
                        value={gRegNationalId}
                        onChange={(e) => setGRegNationalId(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="أدخل رقم الهوية الوطنية (10 أرقام)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        dir="ltr"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        رقم الجوال <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="tel"
                        value={gRegPhone}
                        onChange={(e) => setGRegPhone(e.target.value)}
                        placeholder="أدخل رقم الجوال يبدأ بـ 05"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        dir="ltr"
                        required
                      />
                    </div>
                  </div>

                  {/* Gender (Volunteer & Beneficiary) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        الجنس:
                      </label>
                      <select
                        value={gRegGender}
                        onChange={(e) => setGRegGender(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>

                    {googleAccountType === 'volunteer' && (
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">
                          تاريخ الميلاد:
                        </label>
                        <input
                          type="date"
                          value={gRegBirthDate}
                          onChange={(e) => setGRegBirthDate(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Address (Volunteer generic or Beneficiary extra notes) */}
                  {googleAccountType === 'volunteer' && (
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700 dark:text-slate-300">
                        العنوان والحي السكني:
                      </label>
                      <input
                        type="text"
                        value={gRegAddress}
                        onChange={(e) => setGRegAddress(e.target.value)}
                        placeholder="مكة المكرمة - مخطط العسيلة"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* VOLUNTEER SPECIFIC FIELDS */}
                  {googleAccountType === 'volunteer' && (
                    <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="block font-bold text-slate-700 dark:text-slate-300">
                            الفريق التطوعي المفضل:
                          </label>
                          <select
                            value={gRegTeamId}
                            onChange={(e) => setGRegTeamId(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="team-1">الفريق التطوعي العام</option>
                            <option value="team-2">فريق ريادة العطاء الصحي</option>
                            <option value="team-3">فريق الإغاثة والمساعدات الميدانية</option>
                            <option value="team-4">فريق التوعية والمبادرات المجتمعية</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block font-bold text-slate-700 dark:text-slate-300">
                            فصيلة الدم:
                          </label>
                          <select
                            value={gRegBloodType}
                            onChange={(e) => setGRegBloodType(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      </div>

                      {/* Experiences */}
                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">
                          المهارات والخبرات السابقة:
                        </label>
                        <input
                          type="text"
                          value={gRegExperiences}
                          onChange={(e) => setGRegExperiences(e.target.value)}
                          placeholder="مثال: تنظيم الحشود، الإسعافات الأولية، التصوير والإعلام..."
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* BENEFICIARY SPECIFIC FIELDS */}
                  {googleAccountType === 'beneficiary' && (
                    <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                      {/* Standardized Beneficiary Fields */}
                      <BeneficiaryFormFields
                        values={gRegBenFormData}
                        onChange={(upd) => setGRegBenFormData(prev => ({ ...prev, ...upd }))}
                      />

                      <div className="space-y-1">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">
                          تفاصيل إضافية لمقر السكن بالعسيلة (اختياري):
                        </label>
                        <input
                          type="text"
                          value={gRegAddress}
                          onChange={(e) => setGRegAddress(e.target.value)}
                          placeholder="العنوان والشارع والحي السكني بالتفصيل"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="block font-bold text-slate-700 dark:text-slate-300">
                            عدد أفراد الأسرة <span className="text-rose-500">*</span>:
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={gRegFamilySize}
                            placeholder="أدخل عدد أفراد الأسرة"
                            onChange={(e) => setGRegFamilySize(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10)))}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block font-bold text-slate-700 dark:text-slate-300">
                            فئة الاستحقاق:
                          </label>
                          <select
                            value={gRegCategory}
                            onChange={(e) => setGRegCategory(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="أسر محتاجة">أسر محتاجة</option>
                            <option value="أيتام">أيتام</option>
                            <option value="أسر أيتام">أسر أيتام</option>
                            <option value="كبار السن">كبار السن</option>
                            <option value="ذوي الإعاقة">ذوو الإعاقة</option>
                            <option value="أرامل ومطلقات">أرامل ومطلقات</option>
                            <option value="عام">أخرى</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="block font-bold text-slate-700 dark:text-slate-300">
                            نوع السكن:
                          </label>
                          <select
                            value={gRegHousingType}
                            onChange={(e) => setGRegHousingType(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            <option value="إيجار">إيجار</option>
                            <option value="ملك">ملك</option>
                            <option value="شعبي">شعبي / خيري</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Charter and Terms Agreement (Mandatory) */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                      <input
                        type="checkbox"
                        checked={gRegAgreedToTerms}
                        onChange={(e) => setGRegAgreedToTerms(e.target.checked)}
                        className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        required
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-bold">
                        أتعهد بصحة واكتمال جميع البيانات المدخلة، وأوافق على شروط وميثاق جمعية ريادة العطاء لخدمة الإنسان بالعسيلة بمكة المكرمة. <span className="text-rose-500">*</span>
                      </span>
                    </label>
                  </div>

                  {/* Submission Notice */}
                  <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-[11px] text-slate-500 leading-relaxed flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>
                      سيتم تسجيل الحساب بحالة <strong>قيد المراجعة / غير نشط</strong>، وتخضع جميع الطلبات لتدقيق الباحث الاجتماعي ومسؤولي الجمعية قبل الاعتماد.
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={googleRegLoading}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
                    >
                      {googleRegLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>جاري تسجيل الطلب والتحقق...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>إرسال طلب التسجيل للمراجعة</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoogleAccountType(null)}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      رجوع
                    </button>
                  </div>

                </form>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
