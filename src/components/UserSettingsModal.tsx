import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Volume2, VolumeX, Bell, BellRing, Sparkles, Moon, Sun,
  Check, Music, Sliders, ShieldCheck, Server, CheckCircle2,
  Lock, KeyRound, Eye, EyeOff, AlertCircle, RefreshCw,
  Smartphone, Trash2, LogOut, Laptop, Fingerprint, ShieldAlert, UserCog
} from 'lucide-react';
import { buildApiUrl, getAuthHeaders } from '../config/api';
import { useApplicationAudio, GENERAL_AUDIO_STORAGE_KEY } from '../utils/audioNotification';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PinCodeInput } from './PinCodeInput';
import { GoogleSignInApprovalCard } from './GoogleSignInApprovalCard';
import { generateStrongPassword, evaluatePasswordStrength } from '../utils/passwordSecurity';
import {
  getOrCreateDeviceId,
  getPlatformDeviceLabel,
  getRememberedAccounts,
  saveRememberedAccount,
  updateRememberedAccountPinState,
  removeRememberedAccount,
  validatePinClientSide
} from '../utils/rememberedAccounts';

interface TrustedDeviceItem {
  id: string;
  deviceLabel: string;
  createdAt?: string;
  lastUsedAt?: string;
  isCurrentDevice: boolean;
}

interface SecurityOverviewData {
  authMethod: 'password' | 'google' | 'pin' | string;
  hasPinOnCurrentDevice: boolean;
  rememberId: string | null;
  trustedDevices: TrustedDeviceItem[];
  otherSessionsCount: number;
}

interface UserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: 'ar' | 'en';
  currentUser?: any;
  currentUserRole?: string;
  isDark?: boolean;
  onToggleDark?: () => void;
  initialTab?: 'security' | 'preferences';
  initialSecurityAction?: 'pin_setup' | null;
  onRememberedStateChanged?: () => void;
  onUserNameUpdated?: (newName: string) => void;
}

function getStoredAuthToken(): string {
  try {
    const raw = localStorage.getItem('reyadat_auth_session');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed?.sessionToken || parsed?.user?.sessionToken || '';
  } catch {
    return '';
  }
}

function getRoleArabicBadge(role: string, user?: any): string {
  if (user?.jobTitle) return user.jobTitle;
  switch (role) {
    case 'admin': return 'الإدارة العليا';
    case 'operations_manager': return 'مدير العمليات والتشغيل';
    case 'department_admin': return 'مدير إدارة';
    case 'employee': return 'موظف إداري';
    case 'storekeeper': return 'أمين المستودع';
    case 'leader': return 'قائد فريق تطوعي';
    case 'volunteer': return 'متطوع مسجل';
    case 'beneficiary': return 'مستفيد مسجل';
    case 'supervisor': return 'مشرف ميداني';
    case 'support_manager': return 'مدير الدعم الفني';
    case 'support_agent': return 'موظف دعم فني';
    default: return 'مستخدم مسجل';
  }
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  currentUser,
  currentUserRole = 'public',
  isDark = false,
  onToggleDark,
  initialTab = 'security',
  initialSecurityAction = null,
  onRememberedStateChanged,
  onUserNameUpdated
}) => {
  const { isAudioEnabled, toggleAudio, testSound } = useApplicationAudio();

  const [activeTab, setActiveTab] = useState<'security' | 'preferences'>(initialTab);
  const [generalSound, setGeneralSound] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GENERAL_AUDIO_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [isPlayingTest, setIsPlayingTest] = useState(false);

  // Live Security Overview State
  const [securityOverview, setSecurityOverview] = useState<SecurityOverviewData | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isDeviceRemembered, setIsDeviceRemembered] = useState(false);
  const [isTogglingRemember, setIsTogglingRemember] = useState(false);

  // Security Section Feedback
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);

  // Quick PIN Form State ('closed' | 'setup' | 'change' | 'forgot')
  const [pinMode, setPinMode] = useState<'closed' | 'setup' | 'change' | 'forgot'>('closed');
  const [pinCurrentPassword, setPinCurrentPassword] = useState('');
  const [showPinCurrentPwd, setShowPinCurrentPwd] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinConfirmValue, setPinConfirmValue] = useState('');
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);

  // Inline confirmation prompt for sensitive actions (PIN disable / device revoke / sign out others)
  const [confirmAction, setConfirmAction] = useState<
    null | {
      type: 'disable_this' | 'disable_all' | 'revoke_one' | 'revoke_all' | 'revoke_other_sessions';
      trustedDeviceId?: string;
      label: string;
      requiresPassword: boolean;
    }
  >(null);
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showConfirmPwdInput, setShowConfirmPwdInput] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);

  // Change Password Form State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Administrative Self-Service Display Name Edit State (تعديل الاسم للمستخدمين الإداريين)
  const isAdminStaffAccount = [
    'admin',
    'super_admin',
    'operations_manager',
    'department_admin',
    'employee',
    'storekeeper',
    'supervisor',
    'support_manager',
    'support_agent'
  ].includes(String(currentUserRole || ''));
  const [displayNameInput, setDisplayNameInput] = useState(
    currentUser?.name || currentUser?.userName || currentUser?.directorName || ''
  );
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameSuccess, setDisplayNameSuccess] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const base = getAuthHeaders();
    const token = getStoredAuthToken();
    const headers: Record<string, string> = { ...base, 'Content-Type': 'application/json' };
    if (token && !headers['x-session-token']) headers['x-session-token'] = token;
    if ((currentUser?.id || currentUser?.userId) && !headers['x-user-id']) {
      headers['x-user-id'] = currentUser.id || currentUser.userId;
    }
    if (currentUserRole && !headers['x-user-role']) headers['x-user-role'] = currentUserRole;
    return headers;
  }, [currentUser?.id, currentUser?.userId, currentUserRole]);

  const loadSecurityOverview = useCallback(async () => {
    if (!currentUser) return;
    setIsLoadingOverview(true);
    try {
      const deviceId = getOrCreateDeviceId();
      const res = await fetch(`/api/db/auth/security-overview?deviceId=${encodeURIComponent(deviceId)}`, {
        headers: authHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const ov: SecurityOverviewData = {
          authMethod: data.authMethod || 'password',
          hasPinOnCurrentDevice: Boolean(data.hasPinOnCurrentDevice),
          rememberId: data.rememberId || null,
          trustedDevices: Array.isArray(data.trustedDevices) ? data.trustedDevices : [],
          otherSessionsCount: Number(data.otherSessionsCount || 0)
        };
        setSecurityOverview(ov);

        const localCards = getRememberedAccounts();
        const isRememberedLocally = Boolean(
          ov.rememberId && localCards.some((c) => c.rememberId === ov.rememberId)
        );
        setIsDeviceRemembered(isRememberedLocally);
        if (ov.rememberId && isRememberedLocally) {
          updateRememberedAccountPinState(ov.rememberId, ov.hasPinOnCurrentDevice);
        }
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setIsLoadingOverview(false);
    }
  }, [authHeaders, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'security');
      setSecurityError(null);
      setSecuritySuccess(null);
      setFormError(null);
      setFormSuccess(null);
      setConfirmAction(null);
      setConfirmPasswordInput('');
      setPinValue('');
      setPinConfirmValue('');
      setPinCurrentPassword('');
      setPinMode(initialSecurityAction === 'pin_setup' ? 'setup' : 'closed');
      setShowPasswordSection(false);
      setDisplayNameInput(currentUser?.name || currentUser?.userName || currentUser?.directorName || '');
      setDisplayNameError(null);
      setDisplayNameSuccess(null);
      loadSecurityOverview();
    }
  }, [isOpen, initialTab, initialSecurityAction, loadSecurityOverview, currentUser?.name, currentUser?.userName, currentUser?.directorName]);

  if (!isOpen) return null;

  const isPublicGuest = !currentUser || currentUserRole === 'public';

  const handleToggleGeneralSound = () => {
    const next = !generalSound;
    setGeneralSound(next);
    try {
      localStorage.setItem(GENERAL_AUDIO_STORAGE_KEY, String(next));
    } catch {}
  };

  const handleTestSound = () => {
    setIsPlayingTest(true);
    testSound();
    setTimeout(() => {
      setIsPlayingTest(false);
    }, 700);
  };

  const handleToggleRememberDevice = async () => {
    if (isPublicGuest) return;
    setSecurityError(null);
    setSecuritySuccess(null);
    setIsTogglingRemember(true);
    try {
      if (isDeviceRemembered && securityOverview?.rememberId) {
        removeRememberedAccount(securityOverview.rememberId);
        setIsDeviceRemembered(false);
        setSecuritySuccess('تمت إزالة حفظ هذا الحساب من المتصفح الحالي. عند تسجيل الخروج ستحتاج لإدخال بيانات الدخول يدوياً.');
        onRememberedStateChanged?.();
      } else {
        const res = await fetch('/api/db/auth/remember-handle', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ deviceId: getOrCreateDeviceId() })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'تعذر تفعيل تذكر الحساب على هذا الجهاز.');
        }
        saveRememberedAccount({
          rememberId: data.rememberId,
          firstName: data.firstName,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl || '',
          role: data.role,
          roleLabel: data.roleLabel,
          hasPinEnabled: Boolean(data.hasPinOnThisDevice)
        });
        setIsDeviceRemembered(true);
        setSecuritySuccess('تم تفعيل تذكر هذا الحساب بأمان على هذا الجهاز (دون حفظ كلمة المرور أو البيانات الحساسة).');
        await loadSecurityOverview();
        onRememberedStateChanged?.();
      }
    } catch (err: any) {
      setSecurityError(err.message || 'تعذر تحديث تفضيل تذكر الحساب.');
    } finally {
      setIsTogglingRemember(false);
    }
  };

  const pinClientValidation = pinValue.length === 6 ? validatePinClientSide(pinValue) : null;

  const handlePinFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (pinValue.length !== 6) {
      setSecurityError('يرجى إدخال 6 أرقام بالضبط للرمز السريع.');
      return;
    }
    const validation = validatePinClientSide(pinValue);
    if (!validation.valid) {
      setSecurityError(validation.reason || 'الرمز المدخل ضعيف، يرجى اختيار رمز أقوى.');
      return;
    }
    if (pinValue !== pinConfirmValue) {
      setSecurityError('رمز الدخول السريع وتأكيده غير متطابقين.');
      return;
    }

    setIsPinSubmitting(true);
    try {
      const endpoint = pinMode === 'setup' ? '/api/db/auth/pin/setup' : '/api/db/auth/pin/change';
      const payload =
        pinMode === 'setup'
          ? {
              pin: pinValue,
              confirmPin: pinConfirmValue,
              currentPassword: pinCurrentPassword.trim(),
              deviceId: getOrCreateDeviceId(),
              deviceLabel: getPlatformDeviceLabel()
            }
          : {
              newPin: pinValue,
              confirmPin: pinConfirmValue,
              currentPassword: pinCurrentPassword.trim(),
              deviceId: getOrCreateDeviceId(),
              deviceLabel: getPlatformDeviceLabel()
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'تعذر حفظ رمز الدخول السريع.');
      }

      if (data?.rememberId) {
        saveRememberedAccount({
          rememberId: data.rememberId,
          firstName: data.firstName,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl || '',
          role: data.role,
          roleLabel: data.roleLabel,
          hasPinEnabled: true
        });
        setIsDeviceRemembered(true);
      } else if (securityOverview?.rememberId) {
        updateRememberedAccountPinState(securityOverview.rememberId, true);
      }

      setSecuritySuccess(data?.message || 'تم حفظ وتشفير رمز الدخول السريع على هذا الجهاز الموثوق بنجاح.');
      setPinMode('closed');
      setPinValue('');
      setPinConfirmValue('');
      setPinCurrentPassword('');
      await loadSecurityOverview();
      onRememberedStateChanged?.();
    } catch (err: any) {
      setSecurityError(err.message || 'حدث خطأ أثناء حفظ الرمز السريع.');
    } finally {
      setIsPinSubmitting(false);
    }
  };

  const executeConfirmedSecurityAction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!confirmAction) return;
    setSecurityError(null);
    setSecuritySuccess(null);

    if (confirmAction.requiresPassword && !confirmPasswordInput.trim()) {
      setSecurityError('يرجى إدخال كلمة المرور الحالية لتأكيد هذا الإجراء الأمني.');
      return;
    }

    setIsActionRunning(true);
    try {
      let endpoint = '';
      let body: Record<string, any> = {
        currentPassword: confirmPasswordInput.trim() || undefined
      };

      if (confirmAction.type === 'disable_this') {
        endpoint = '/api/db/auth/pin/disable';
        body.deviceId = getOrCreateDeviceId();
        body.allDevices = false;
      } else if (confirmAction.type === 'disable_all') {
        endpoint = '/api/db/auth/pin/disable';
        body.allDevices = true;
      } else if (confirmAction.type === 'revoke_one') {
        endpoint = '/api/db/auth/devices/revoke';
        body.trustedDeviceId = confirmAction.trustedDeviceId;
      } else if (confirmAction.type === 'revoke_all') {
        endpoint = '/api/db/auth/devices/revoke';
        body.revokeAll = true;
      } else if (confirmAction.type === 'revoke_other_sessions') {
        endpoint = '/api/db/auth/sessions/revoke-others';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.code === 'PASSWORD_REQUIRED' && !confirmAction.requiresPassword) {
          setConfirmAction({ ...confirmAction, requiresPassword: true });
          throw new Error(data?.error || 'يرجى إدخال كلمة المرور لتأكيد الإجراء.');
        }
        throw new Error(data?.error || 'تعذر تنفيذ الإجراء الأمني.');
      }

      setSecuritySuccess(data?.message || 'تم تنفيذ الإجراء الأمني بنجاح.');
      setConfirmAction(null);
      setConfirmPasswordInput('');
      await loadSecurityOverview();
      onRememberedStateChanged?.();
    } catch (err: any) {
      setSecurityError(err.message || 'تعذر إتمام الإجراء.');
    } finally {
      setIsActionRunning(false);
    }
  };

  const requestSecurityAction = (
    type: 'disable_this' | 'disable_all' | 'revoke_one' | 'revoke_all' | 'revoke_other_sessions',
    label: string,
    trustedDeviceId?: string
  ) => {
    setSecurityError(null);
    setSecuritySuccess(null);
    const isPinSession = securityOverview?.authMethod === 'pin';
    const isPrivileged = currentUserRole === 'admin' || currentUserRole === 'operations_manager';
    const requiresPassword =
      type === 'disable_all' ||
      isPinSession ||
      ((type === 'revoke_one' || type === 'revoke_all') && isPrivileged);

    setConfirmPasswordInput('');
    setConfirmAction({ type, label, trustedDeviceId, requiresPassword });
  };

  const handleGenerateStrong = () => {
    const strong = generateStrongPassword();
    setNewPassword(strong);
    setConfirmPassword(strong);
    setFormError(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!currentPassword.trim()) {
      setFormError('يرجى إدخال كلمة المرور الحالية لتأكيد هويتك.');
      return;
    }
    if (!newPassword.trim()) {
      setFormError('يرجى إدخال كلمة المرور الجديدة.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setFormError('كلمة المرور الجديدة وتأكيد كلمة المرور غير متطابقين.');
      return;
    }
    if (newPassword.trim() === currentPassword.trim()) {
      setFormError('يجب أن تكون كلمة المرور الجديدة مختلفة عن كلمة المرور الحالية.');
      return;
    }

    const evalResult = evaluatePasswordStrength(newPassword.trim());
    if (!evalResult.allPassed) {
      setFormError(`كلمة المرور لا تستوفي شروط الأمان: ${evalResult.errors.join(' ')}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/db/auth/self-change-password', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: currentUser?.id || currentUser?.userId || currentUserRole,
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim()
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'فشل تغيير كلمة المرور.');
      }

      if (securityOverview?.rememberId) {
        updateRememberedAccountPinState(securityOverview.rememberId, false);
      }

      setFormSuccess(data?.message || 'تم تغيير كلمة المرور وإلغاء ربط أجهزة الدخول السريع السابقة لحماية حسابك.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await loadSecurityOverview();
      onRememberedStateChanged?.();
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء الاتصال بالخادم.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelfUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisplayNameError(null);
    setDisplayNameSuccess(null);
    const cleanName = displayNameInput.trim();
    if (cleanName.length < 2 || cleanName.length > 80) {
      setDisplayNameError('يرجى إدخال اسم صالح يتكون من حرفين إلى 80 حرفاً.');
      return;
    }

    setIsSavingDisplayName(true);
    try {
      const res = await fetch(buildApiUrl('/api/db/auth/self-update-name'), {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({
          userId: currentUser?.id || currentUser?.userId,
          name: cleanName
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'تعذر تحديث الاسم الشخصي.');
      }

      const updatedName = data.name || cleanName;
      setDisplayNameInput(updatedName);
      setDisplayNameSuccess(data.message || 'تم تحديث الاسم الشخصي بنجاح مع الحفاظ على جميع الصلاحيات.');
      onUserNameUpdated?.(updatedName);
      await loadSecurityOverview();
    } catch (err: any) {
      setDisplayNameError(err?.message || 'تعذر الاتصال بالخادم لتحديث الاسم.');
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const formatDateShort = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return iso;
    }
  };

  const authMethodLabel =
    securityOverview?.authMethod === 'pin'
      ? 'دخول برمز سريع (6 أرقام)'
      : securityOverview?.authMethod === 'google'
      ? 'دخول عبر Google'
      : 'دخول بكلمة المرور';

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-3 sm:p-4 bg-[#071C43]/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0B1B34] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-[#1E3B68] overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Official Brand Modal Header (Royal Navy -> Royal Blue) */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#071C43] via-[#0B2A63] to-[#0754C7] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-inner shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2 flex-wrap">
                <span>{lang === 'ar' ? 'الأمان وتسجيل الدخول والإعدادات' : 'Security & Account Settings'}</span>
                {!isPublicGuest && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-white/15 text-[10px] font-bold text-blue-100 border border-white/20">
                    {getRoleArabicBadge(currentUserRole, currentUser)}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-blue-100/85 mt-0.5 truncate">
                {lang === 'ar'
                  ? 'إدارة رمز الدخول السريع (6 أرقام)، الأجهزة الموثوقة، كلمة المرور، والتفضيلات'
                  : 'Manage Quick PIN, trusted devices, password & audio preferences'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title={lang === 'ar' ? 'إغلاق النافذة' : 'Close'}
            aria-label="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-[#081426] p-1.5 gap-1.5 border-b border-slate-200 dark:border-[#1E3B68] shrink-0">
          {!isPublicGuest && (
            <button
              type="button"
              id="tab-settings-security"
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-white dark:bg-[#0E2447] text-[#0754C7] dark:text-blue-300 shadow-xs border border-slate-200/70 dark:border-[#244577]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-[#071C43] dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>{lang === 'ar' ? 'الأمان وتسجيل الدخول' : 'Security & Sign-in'}</span>
            </button>
          )}

          <button
            type="button"
            id="tab-settings-preferences"
            onClick={() => setActiveTab('preferences')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'preferences' || isPublicGuest
                ? 'bg-white dark:bg-[#0E2447] text-[#0754C7] dark:text-blue-300 shadow-xs border border-slate-200/70 dark:border-[#244577]'
                : 'text-slate-600 dark:text-slate-400 hover:text-[#071C43] dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>{lang === 'ar' ? 'التفضيلات والمظهر والصوتيات' : 'Preferences & Audio'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto">
          {/* TAB 1: SECURITY & SIGN-IN */}
          {activeTab === 'security' && !isPublicGuest && (
            <div className="space-y-5">
              {(currentUserRole === 'admin' || currentUserRole === 'operations_manager') && (
                <GoogleSignInApprovalCard lang={lang} />
              )}
              {/* Account Identity & Session Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#F4F8FF] to-white dark:from-[#0E2447] dark:to-[#091830] border border-blue-200/80 dark:border-[#244577] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0754C7] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-xs sm:text-sm font-black text-[#071C43] dark:text-white">
                        {currentUser?.name || currentUser?.userName || 'الحساب الشخصي'}
                      </strong>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#071C43]/10 dark:bg-blue-900/50 text-[#071C43] dark:text-blue-200">
                        {authMethodLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      يتم حفظ تفضيل التذكر محلياً بمعرف مشفر دون تخزين كلمات المرور أو الرموز أو الهوية في المتصفح.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadSecurityOverview}
                  disabled={isLoadingOverview}
                  className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#244577] text-[11px] font-bold text-[#0754C7] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-[#132C55] cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOverview ? 'animate-spin' : ''}`} />
                  <span>تحديث</span>
                </button>
              </div>

              {/* Session PIN warning when logged in with Quick PIN */}
              {securityOverview?.authMethod === 'pin' && (
                <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800/70 text-[#071C43] dark:text-blue-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-[#0754C7] dark:text-blue-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    أنت مسجل حالياً عبر <strong>رمز الدخول السريع</strong>. لأمان حسابك، تتطلب التعديلات الحساسة مثل تغيير الرمز أو إلغاء الأجهزة تأكيد كلمة المرور.
                  </span>
                </div>
              )}

              {/* Global Security Feedback */}
              {securityError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span className="font-bold leading-relaxed">{securityError}</span>
                </div>
              )}

              {securitySuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span className="font-bold leading-relaxed">{securitySuccess}</span>
                </div>
              )}

              {/* 0. Administrative Account Display Name Editor */}
              {isAdminStaffAccount && (
                <div
                  id="admin-self-update-name-section"
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#081426] border border-blue-200/80 dark:border-[#1E3B68] space-y-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0754C7]/10 dark:bg-[#0E2447] text-[#0754C7] dark:text-blue-300 flex items-center justify-center shrink-0">
                      <UserCog className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-[#071C43] dark:text-white">
                        تعديل الاسم الشخصي للحساب الإداري
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        يمكنك تعديل اسمك الظاهر في النظام وتوثيقه في سجل المراجعة دون تغيير البريد الإلكتروني أو الدور أو الصلاحيات.
                      </p>
                    </div>
                  </div>

                  {displayNameError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span className="font-bold">{displayNameError}</span>
                    </div>
                  )}

                  {displayNameSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="font-bold">{displayNameSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleSelfUpdateDisplayName} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                          الاسم الشخصي (اسم العرض في اللوحة والسجلات):
                        </label>
                        <input
                          id="input-admin-display-name"
                          type="text"
                          value={displayNameInput}
                          onChange={(e) => setDisplayNameInput(e.target.value)}
                          placeholder="أدخل الاسم الكامل"
                          minLength={2}
                          maxLength={80}
                          required
                          className="w-full bg-slate-50 dark:bg-[#0B1B34] border border-slate-200 dark:border-[#244577] rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0754C7]/25 focus:border-[#0754C7]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          البريد الإلكتروني (ثابت):
                        </label>
                        <input
                          type="text"
                          value={currentUser?.email || '—'}
                          disabled
                          dir="ltr"
                          className="w-full bg-slate-100 dark:bg-[#091830] border border-slate-200 dark:border-[#1E3B68] rounded-xl p-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono text-left"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                          الدور والصلاحية (ثابتة):
                        </label>
                        <input
                          type="text"
                          value={getRoleArabicBadge(currentUserRole, currentUser)}
                          disabled
                          className="w-full bg-slate-100 dark:bg-[#091830] border border-slate-200 dark:border-[#1E3B68] rounded-xl p-2 text-[11px] font-bold text-slate-500 dark:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        id="btn-submit-admin-display-name"
                        disabled={isSavingDisplayName || displayNameInput.trim().length < 2}
                        className="px-4 py-2 rounded-xl bg-[#0754C7] hover:bg-[#0645a8] disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                      >
                        {isSavingDisplayName ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>جاري الحفظ...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>حفظ الاسم الجديد</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 1. Remember Account on This Device Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <strong className="text-xs font-black text-[#071C43] dark:text-white block">
                    تذكر هذا الحساب على هذا الجهاز عند تسجيل الخروج
                  </strong>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    يعرض لك شاشة ترحيب باسمك الأول لتسريع الدخول القادم بكلمة المرور أو برمز 6 أرقام.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-toggle-remember-device"
                  role="switch"
                  aria-checked={isDeviceRemembered}
                  disabled={isTogglingRemember}
                  onClick={handleToggleRememberDevice}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isDeviceRemembered ? 'bg-[#0754C7]' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      isDeviceRemembered ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 2. Quick 6-Digit PIN Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      securityOverview?.hasPinOnCurrentDevice
                        ? 'bg-[#0754C7] text-white'
                        : 'bg-slate-100 dark:bg-[#0E2447] text-[#0754C7] dark:text-blue-300'
                    }`}>
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-black text-[#071C43] dark:text-white">
                          رمز الدخول السريع (6 أرقام)
                        </h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          securityOverview?.hasPinOnCurrentDevice
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}>
                          {securityOverview?.hasPinOnCurrentDevice ? 'مفعّل على هذا الجهاز ✓' : 'غير مفعّل (اختياري)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        رمز شخصي مكون من 6 أرقام مشفر بـ Bcrypt ومربوط حصرياً بشهادة أمان هذا الجهاز. يُقفل مؤقتاً بعد 5 محاولات خاطئة.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons when PIN form is closed */}
                {pinMode === 'closed' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {!securityOverview?.hasPinOnCurrentDevice ? (
                      <button
                        type="button"
                        id="btn-open-pin-setup"
                        onClick={() => {
                          setPinMode('setup');
                          setPinValue('');
                          setPinConfirmValue('');
                          setPinCurrentPassword('');
                          setSecurityError(null);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#0754C7] hover:bg-[#0645a8] text-white text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                      >
                        <KeyRound className="w-4 h-4" />
                        <span>إنشاء رمز دخول سريع (6 أرقام) لهذا الجهاز</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          id="btn-open-pin-change"
                          onClick={() => {
                            setPinMode('change');
                            setPinValue('');
                            setPinConfirmValue('');
                            setPinCurrentPassword('');
                            setSecurityError(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#0754C7] hover:bg-[#0645a8] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>تغيير الرمز السريع</span>
                        </button>

                        <button
                          type="button"
                          id="btn-open-pin-forgot"
                          onClick={() => {
                            setPinMode('forgot');
                            setPinValue('');
                            setPinConfirmValue('');
                            setPinCurrentPassword('');
                            setSecurityError(null);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-[#0E2447] hover:bg-blue-100 dark:hover:bg-[#143261] text-[#0754C7] dark:text-blue-200 border border-blue-200 dark:border-[#244577] text-xs font-bold cursor-pointer transition-all"
                        >
                          نسيت رمز الدخول؟
                        </button>

                        <button
                          type="button"
                          id="btn-disable-pin-device"
                          onClick={() => requestSecurityAction('disable_this', 'تعطيل رمز الدخول السريع لهذا الجهاز')}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold cursor-pointer transition-all"
                        >
                          تعطيل على هذا الجهاز
                        </button>

                        <button
                          type="button"
                          id="btn-disable-pin-all"
                          onClick={() => requestSecurityAction('disable_all', 'تعطيل وإلغاء رمز الدخول السريع من جميع الأجهزة')}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-700 dark:text-slate-300 hover:text-rose-700 text-xs font-bold cursor-pointer transition-all"
                        >
                          تعطيل في جميع الأجهزة
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Active PIN Setup / Change / Forgot Form */}
                {pinMode !== 'closed' && (
                  <form
                    onSubmit={handlePinFormSubmit}
                    className="p-4 rounded-2xl bg-[#F6F9FF] dark:bg-[#0E2447]/65 border border-blue-200/80 dark:border-[#244577] space-y-4 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs sm:text-sm font-black text-[#071C43] dark:text-white">
                        {pinMode === 'setup'
                          ? 'إعداد رمز دخول سريع جديد لهذا الجهاز'
                          : pinMode === 'forgot'
                          ? 'إعادة تعيين رمز الدخول السريع (بعد التحقق من الهوية)'
                          : 'تغيير رمز الدخول السريع'}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          setPinMode('closed');
                          setSecurityError(null);
                        }}
                        className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-300 cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>

                    {pinMode === 'forgot' && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                        حمايةً لخصوصيتك وأمان حسابك، لا يتم عرض أو إرسال الرمز القديم نهائياً. أدخل كلمة المرور الخاصة بحسابك لتعيين رمز سريع جديد فوراً.
                      </div>
                    )}

                    {/* Identity Verification Password */}
                    <div>
                      <label className="block text-xs font-black text-[#071C43] dark:text-slate-200 mb-1.5">
                        كلمة المرور الحالية (لتأكيد الهوية):
                      </label>
                      <div className="relative">
                        <input
                          id="input-pin-verify-password"
                          type={showPinCurrentPwd ? 'text' : 'password'}
                          value={pinCurrentPassword}
                          onChange={(e) => setPinCurrentPassword(e.target.value)}
                          placeholder="أدخل كلمة المرور الخاصة بحسابك"
                          className="w-full bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#244577] rounded-xl p-3 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0754C7]/25 focus:border-[#0754C7]"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPinCurrentPwd((v) => !v)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPinCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <PinCodeInput
                      idPrefix="settings-new-pin"
                      label="الرمز السريع الجديد (6 أرقام غير متكررة أو متسلسلة):"
                      value={pinValue}
                      onChange={setPinValue}
                      disabled={isPinSubmitting}
                    />

                    {pinClientValidation && !pinClientValidation.valid && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold text-center">
                        {pinClientValidation.reason}
                      </p>
                    )}

                    <PinCodeInput
                      idPrefix="settings-confirm-pin"
                      label="تأكيد الرمز السريع (أعد إدخال نفس الأرقام الستة):"
                      value={pinConfirmValue}
                      onChange={setPinConfirmValue}
                      disabled={isPinSubmitting}
                    />

                    {pinConfirmValue.length === 6 && pinValue !== pinConfirmValue && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold text-center">
                        الرمزان غير متطابقين.
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="submit"
                        id="btn-submit-pin-form"
                        disabled={
                          isPinSubmitting ||
                          pinValue.length !== 6 ||
                          pinConfirmValue.length !== 6 ||
                          pinValue !== pinConfirmValue ||
                          Boolean(pinClientValidation && !pinClientValidation.valid)
                        }
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0754C7] hover:bg-[#0645a8] disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all"
                      >
                        {isPinSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جاري الحفظ والتشفير...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>حفظ وتفعيل الرمز السريع</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Inline Confirmation Prompt for Sensitive Revoke / Disable Actions */}
              {confirmAction && (
                <form
                  onSubmit={executeConfirmedSecurityAction}
                  className="p-4 rounded-2xl bg-rose-50/90 dark:bg-rose-950/35 border border-rose-200 dark:border-rose-800/70 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-xs font-black text-rose-900 dark:text-rose-200">
                      تأكيد الإجراء: {confirmAction.label}
                    </strong>
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      className="text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>

                  {confirmAction.requiresPassword && (
                    <div className="relative">
                      <input
                        id="input-confirm-action-password"
                        type={showConfirmPwdInput ? 'text' : 'password'}
                        value={confirmPasswordInput}
                        onChange={(e) => setConfirmPasswordInput(e.target.value)}
                        placeholder="أدخل كلمة المرور الحالية لإتمام التأكيد"
                        className="w-full bg-white dark:bg-[#081426] border border-rose-200 dark:border-rose-800 rounded-xl p-2.5 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/25"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwdInput((v) => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
                        tabIndex={-1}
                      >
                        {showConfirmPwdInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                    >
                      تراجع
                    </button>
                    <button
                      type="submit"
                      id="btn-confirm-security-action"
                      disabled={isActionRunning}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isActionRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>تأكيد التنفيذ</span>
                    </button>
                  </div>
                </form>
              )}

              {/* 3. Trusted Devices & Active Sessions Management */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-[#071C43] dark:text-white flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                      <span>الأجهزة الموثوقة للدخول السريع ({securityOverview?.trustedDevices.length || 0})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      يمكنك إلغاء ثقة أي جهاز في أي وقت ليصبح الدخول السريع معطلاً عليه فوراً.
                    </p>
                  </div>

                  {(securityOverview?.trustedDevices.length || 0) > 0 && (
                    <button
                      type="button"
                      id="btn-revoke-all-devices"
                      onClick={() => requestSecurityAction('revoke_all', 'إلغاء جميع أجهزة الدخول السريع')}
                      className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>إلغاء جميع أجهزة الدخول السريع</span>
                    </button>
                  )}
                </div>

                {securityOverview && securityOverview.trustedDevices.length > 0 ? (
                  <div className="space-y-2">
                    {securityOverview.trustedDevices.map((dev) => (
                      <div
                        key={dev.id}
                        className="p-3 rounded-xl bg-white dark:bg-[#0B1B34] border border-slate-200 dark:border-[#244577] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#0E2447] text-[#0754C7] dark:text-blue-300 flex items-center justify-center shrink-0">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-[#071C43] dark:text-white truncate">
                                {dev.deviceLabel}
                              </span>
                              {dev.isCurrentDevice && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#0754C7]/10 text-[#0754C7] dark:bg-blue-900/50 dark:text-blue-200">
                                  هذا الجهاز
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">
                              آخر استخدام: {formatDateShort(dev.lastUsedAt || dev.createdAt)}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => requestSecurityAction('revoke_one', `إلغاء ثقة الجهاز (${dev.deviceLabel})`, dev.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[11px] font-bold cursor-pointer shrink-0"
                        >
                          إلغاء
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-white dark:bg-[#0B1B34] border border-dashed border-slate-300 dark:border-[#244577] text-center text-[11px] text-slate-500 dark:text-slate-400">
                    لا توجد أجهزة مربوطة بالدخول السريع حالياً.
                  </div>
                )}

                {/* Other Active Sessions Row */}
                <div className="pt-3 border-t border-slate-200 dark:border-[#1E3B68] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    الجلسات النشطة على متصفحات أو أجهزة أخرى:{' '}
                    <strong className="text-[#071C43] dark:text-white">
                      {securityOverview?.otherSessionsCount ?? 0}
                    </strong>
                  </div>
                  <button
                    type="button"
                    id="btn-revoke-other-sessions"
                    onClick={() =>
                      requestSecurityAction('revoke_other_sessions', 'تسجيل الخروج من جميع الأجهزة والجلسات الأخرى')
                    }
                    className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-white dark:bg-[#0E2447] hover:bg-slate-100 dark:hover:bg-[#143261] text-[#071C43] dark:text-blue-200 border border-slate-200 dark:border-[#244577] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <span>تسجيل الخروج من جميع الأجهزة الأخرى</span>
                  </button>
                </div>
              </div>

              {/* 4. Change Account Password Card (Collapsible so modal stays clean) */}
              <div className="rounded-2xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] overflow-hidden">
                <button
                  type="button"
                  id="btn-toggle-change-password-section"
                  onClick={() => setShowPasswordSection((prev) => !prev)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-right hover:bg-slate-50 dark:hover:bg-[#0E2447]/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#071C43] text-white flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-xs sm:text-sm font-black text-[#071C43] dark:text-white block">
                        تغيير كلمة المرور الأساسية للحساب
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        تحديث كلمة المرور المشفرة عبر Bcrypt (يلغي أجهزة الدخول السريع تلقائياً للأمان)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#0754C7] dark:text-blue-300 shrink-0">
                    {showPasswordSection ? 'إخفاء' : 'فتح'}
                  </span>
                </button>

                {showPasswordSection && (
                  <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-[#1E3B68] space-y-4">
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed">
                      ملاحظة أمنية: عند تغيير كلمة المرور، يتم تلقائياً إلغاء ربط جميع أجهزة الدخول السريع السابقة وإنهاء الجلسات الأخرى لحماية حسابك.
                    </div>

                    {formError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span className="font-bold">{formError}</span>
                      </div>
                    )}

                    {formSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span className="font-bold">{formSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                          كلمة المرور الحالية:
                        </label>
                        <div className="relative">
                          <input
                            id="input-settings-current-password"
                            type={showCurrent ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="أدخل كلمة المرور الحالية لتأكيد هويتك"
                            className="w-full bg-slate-50 dark:bg-[#0B1B34] border border-slate-200 dark:border-[#244577] rounded-xl p-3 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0754C7]/25 focus:border-[#0754C7]"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                            كلمة المرور الجديدة:
                          </label>
                          <button
                            type="button"
                            onClick={handleGenerateStrong}
                            className="text-[11px] text-[#0754C7] dark:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>توليد كلمة مرور قوية</span>
                          </button>
                        </div>

                        <div className="relative">
                          <input
                            id="input-settings-new-password"
                            type={showNew ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="أدخل كلمة مرور قوية (8 خانات فأكثر)"
                            className="w-full bg-slate-50 dark:bg-[#0B1B34] border border-slate-200 dark:border-[#244577] rounded-xl p-3 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0754C7]/25 focus:border-[#0754C7]"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <PasswordStrengthMeter password={newPassword} />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-1.5">
                          تأكيد كلمة المرور الجديدة:
                        </label>
                        <div className="relative">
                          <input
                            id="input-settings-confirm-password"
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="أعد إدخال كلمة المرور الجديدة للتطابق"
                            className="w-full bg-slate-50 dark:bg-[#0B1B34] border border-slate-200 dark:border-[#244577] rounded-xl p-3 pl-10 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0754C7]/25 focus:border-[#0754C7]"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                          <p className="text-[11px] text-rose-500 font-bold mt-1">
                            كلمتا المرور غير متطابقتين.
                          </p>
                        )}
                        {confirmPassword && newPassword === confirmPassword && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            كلمتا المرور متطابقتان تماماً.
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        id="btn-submit-self-change-password"
                        disabled={isSubmitting || !currentPassword || !newPassword || newPassword !== confirmPassword}
                        className="w-full py-3 px-4 bg-[#071C43] hover:bg-[#0b2a61] text-white font-black text-xs rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جاري التحديث والتشفير...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>حفظ كلمة المرور الجديدة</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PREFERENCES & AUDIO NOTIFICATIONS */}
          {(activeTab === 'preferences' || isPublicGuest) && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                    <h3 className="text-xs font-black text-[#071C43] dark:text-white uppercase tracking-wider">
                      {lang === 'ar' ? 'التنبيهات الصوتية لطلبات الانضمام' : 'Application Audio Notifications'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-[#0754C7] dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                    {isAudioEnabled ? (lang === 'ar' ? 'مفعّل ✓' : 'Enabled') : (lang === 'ar' ? 'معطّل ✕' : 'Disabled')}
                  </span>
                </div>

                <div className={`p-4 rounded-2xl border transition-all duration-200 ${
                  isAudioEnabled
                    ? 'bg-blue-50/60 dark:bg-blue-950/25 border-blue-200 dark:border-[#244577] shadow-xs'
                    : 'bg-slate-50 dark:bg-[#081426] border-slate-200 dark:border-[#1E3B68] text-slate-500'
                }`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isAudioEnabled
                          ? 'bg-[#0754C7] text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                      }`}>
                        {isAudioEnabled ? <BellRing className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <strong className="text-xs font-black text-[#071C43] dark:text-white block">
                          {lang === 'ar' ? 'نغمة هادئة لطلبات التطوع والفرق' : 'Subtle Chime for Volunteer & Team Applications'}
                        </strong>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {lang === 'ar'
                            ? 'تشغيل نغمة صوتية هادئة وفورية فور تقديم طلب انضمام متطوع جديد أو طلب انضمام فريق تطوعي جديد إلى الجمعية.'
                            : 'Plays a subtle, pleasant chime whenever a new volunteer application or team application is submitted.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isAudioEnabled}
                      onClick={toggleAudio}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isAudioEnabled ? 'bg-[#0754C7]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          isAudioEnabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-[#1E3B68] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Music className="w-3.5 h-3.5 text-[#0754C7] dark:text-blue-400" />
                      <span>{lang === 'ar' ? 'نغمة ثلاثية هادئة (Chord D-F#-A)' : 'Gentle 3-tone chime'}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestSound}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isPlayingTest
                          ? 'bg-[#0754C7] text-white scale-95 shadow-sm'
                          : 'bg-white dark:bg-[#0E2447] hover:bg-blue-50 dark:hover:bg-[#143261] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#244577]'
                      }`}
                    >
                      <Volume2 className={`w-3.5 h-3.5 ${isPlayingTest ? 'animate-pulse text-white' : 'text-[#0754C7] dark:text-blue-300'}`} />
                      <span>{isPlayingTest ? (lang === 'ar' ? 'جاري التشغيل...' : 'Playing...') : (lang === 'ar' ? 'تجربة الصوت' : 'Test Chime')}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#0E2447] text-[#0754C7] dark:text-blue-300">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-[#071C43] dark:text-slate-200 block">
                        {lang === 'ar' ? 'أصوات الإشعارات العامة والتعاميم' : 'General Notifications Sound'}
                      </strong>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'ar' ? 'تنبيه صوتي عند وصول تعاميم أو تحديثات مهام أخرى' : 'Plays a sound for incoming general alerts'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={generalSound}
                    onClick={handleToggleGeneralSound}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      generalSound ? 'bg-[#0754C7]' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        generalSound ? '-translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#1E3B68]">
                <h3 className="text-xs font-black text-[#071C43] dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{lang === 'ar' ? 'المظهر والعرض' : 'Appearance'}</span>
                </h3>

                {onToggleDark && (
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-[#081426] border border-slate-200 dark:border-[#1E3B68] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-[#0E2447] text-slate-600 dark:text-slate-300">
                        {isDark ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div>
                        <strong className="text-xs font-bold text-[#071C43] dark:text-slate-200 block">
                          {lang === 'ar' ? 'الوضع الليلي (Dark Mode)' : 'Dark Theme'}
                        </strong>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {isDark
                            ? (lang === 'ar' ? 'المظهر الليلي الداكن مفعّل حالياً' : 'Dark mode is currently enabled')
                            : (lang === 'ar' ? 'المظهر الفاتح المضيء مفعّل حالياً' : 'Light mode is currently enabled')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isDark}
                      onClick={onToggleDark}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isDark ? 'bg-[#0754C7]' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isDark ? '-translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#1E3B68]">
                <h3 className="text-xs font-black text-[#071C43] dark:text-white uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#0754C7] dark:text-blue-400" />
                    <span>{lang === 'ar' ? 'الاتصال التلقائي الموحد بالخادم' : 'Unified Backend Connection'}</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#0754C7] dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                    {lang === 'ar' ? 'تلقائي موحد ✓' : 'Automatic ✓'}
                  </span>
                </h3>

                <div className="p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-[#1E3B68] space-y-2">
                  <div className="flex items-center gap-2 text-[#071C43] dark:text-blue-200 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#0754C7] shrink-0" />
                    <span>{lang === 'ar' ? 'الاتصال يعمل تلقائياً لكافة الإدارات والمستخدمين' : 'Connection active for all departments & users'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {lang === 'ar'
                      ? 'يتم توجيه كافة طلبات الواجهة وقاعدة البيانات تلقائياً ومركزياً إلى الخادم المعتمد لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة دون الحاجة لأي إعدادات يدوية من قبل المستخدمين.'
                      : 'All API and database requests are automatically routed centrally to the official Reyadat Al-Ataa server.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-[#081426] border-t border-slate-200 dark:border-[#1E3B68] flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#0754C7] dark:text-blue-400" />
            <span>حماية وتشفير البيانات والرموز عبر Bcrypt + HttpOnly Trust</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#071C43] hover:bg-[#0b2a61] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'إغلاق' : 'Close'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
