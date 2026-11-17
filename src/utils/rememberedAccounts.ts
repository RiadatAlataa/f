// Privacy-Safe Remembered Accounts & Device Correlation Storage
// STRICT SECURITY INVARIANT: NEVER store passwords, PINs, nationalId, phone, email, or session tokens here.

export interface RememberedAccountCard {
  rememberId: string;
  firstName: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
  roleLabel: string;
  hasPinEnabled: boolean;
  rememberConsent: true;
  lastUsedAt: string;
  pinLockedUntil?: number | null;
  requireFullLogin?: boolean;
}

const REMEMBERED_ACCOUNTS_KEY = "reyadat_remembered_accounts_v1";
const DEVICE_ID_KEY = "reyadat_device_id_v1";
const LEGACY_SENSITIVE_KEY = "reyadat_saved_identifier";

export function purgeLegacySensitiveAuthStorage(): void {
  try {
    if (localStorage.getItem(LEGACY_SENSITIVE_KEY) !== null) {
      localStorage.removeItem(LEGACY_SENSITIVE_KEY);
    }
  } catch {
    // Ignore storage restriction
  }
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.startsWith("dev_") && existing.length >= 12) {
      return existing;
    }
    const randomPart =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
    const nextId = `dev_${randomPart}`;
    localStorage.setItem(DEVICE_ID_KEY, nextId);
    return nextId;
  } catch {
    return `dev_${Date.now().toString(36)}`;
  }
}

export function getPlatformDeviceLabel(): string {
  if (typeof navigator === "undefined") return "متصفح ويب";
  const ua = navigator.userAgent || "";
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches || (window.navigator as any)?.standalone === true);

  let os = "جهاز سطح مكتب";
  if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "متصفح";
  if (isStandalone) browser = "تطبيق PWA المثبت";
  else if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";

  return `${browser} • ${os}`;
}

function sanitizeCard(raw: any): RememberedAccountCard | null {
  if (!raw || typeof raw.rememberId !== "string" || !raw.rememberId.startsWith("rem_")) {
    return null;
  }
  return {
    rememberId: String(raw.rememberId),
    firstName: String(raw.firstName || "ضيفنا").trim(),
    displayName: String(raw.displayName || raw.firstName || "مستخدم").trim(),
    avatarUrl: typeof raw.avatarUrl === "string" ? raw.avatarUrl : "",
    role: String(raw.role || "user"),
    roleLabel: String(raw.roleLabel || "مستخدم مسجل"),
    hasPinEnabled: Boolean(raw.hasPinEnabled),
    rememberConsent: true,
    lastUsedAt: String(raw.lastUsedAt || new Date().toISOString()),
    pinLockedUntil: typeof raw.pinLockedUntil === "number" ? raw.pinLockedUntil : null,
    requireFullLogin: Boolean(raw.requireFullLogin),
  };
}

export function getRememberedAccounts(): RememberedAccountCard[] {
  purgeLegacySensitiveAuthStorage();
  try {
    const raw = localStorage.getItem(REMEMBERED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeCard)
      .filter((c): c is RememberedAccountCard => Boolean(c))
      .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
  } catch {
    return [];
  }
}

export function saveRememberedAccount(card: Omit<RememberedAccountCard, "rememberConsent" | "lastUsedAt"> & { lastUsedAt?: string }): RememberedAccountCard[] {
  purgeLegacySensitiveAuthStorage();
  const clean = sanitizeCard({
    ...card,
    rememberConsent: true,
    lastUsedAt: card.lastUsedAt || new Date().toISOString(),
  });
  if (!clean) return getRememberedAccounts();

  const existing = getRememberedAccounts().filter((a) => a.rememberId !== clean.rememberId);
  const next = [clean, ...existing].slice(0, 6);
  try {
    localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota error
  }
  return next;
}

export function replaceRememberedAccountsFromServer(accounts: RememberedAccountCard[]): RememberedAccountCard[] {
  purgeLegacySensitiveAuthStorage();
  const next = accounts
    .map(sanitizeCard)
    .filter((c): c is RememberedAccountCard => Boolean(c))
    .slice(0, 6);
  try {
    if (next.length === 0) {
      localStorage.removeItem(REMEMBERED_ACCOUNTS_KEY);
    } else {
      localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore
  }
  return next;
}

export function updateRememberedAccountPinState(rememberId: string, hasPinEnabled: boolean): void {
  const accounts = getRememberedAccounts();
  let changed = false;
  const next = accounts.map((a) => {
    if (a.rememberId === rememberId) {
      changed = true;
      return { ...a, hasPinEnabled, lastUsedAt: new Date().toISOString() };
    }
    return a;
  });
  if (changed) {
    try {
      localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(next));
    } catch {
      // Ignore
    }
  }
}

export function removeRememberedAccount(rememberId: string): RememberedAccountCard[] {
  const next = getRememberedAccounts().filter((a) => a.rememberId !== rememberId);
  try {
    if (next.length === 0) {
      localStorage.removeItem(REMEMBERED_ACCOUNTS_KEY);
    } else {
      localStorage.setItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore
  }
  return next;
}

export function clearAllRememberedAccounts(): void {
  purgeLegacySensitiveAuthStorage();
  try {
    localStorage.removeItem(REMEMBERED_ACCOUNTS_KEY);
  } catch {
    // Ignore
  }
}

export function validatePinClientSide(pin: string): { valid: boolean; reason?: string } {
  const clean = String(pin || "").trim();
  if (!/^\d{6}$/.test(clean)) {
    return { valid: false, reason: "يجب إدخال 6 أرقام بالضبط." };
  }
  if (/^(\d)\1{5}$/.test(clean)) {
    return { valid: false, reason: "لا يُسمح بتكرار نفس الرقم 6 مرات (مثل 000000 أو 111111)." };
  }
  if (new Set(clean.split("")).size <= 2) {
    return { valid: false, reason: "الرمز ضعيف جداً، يرجى اختيار أرقام أكثر تنوعاً." };
  }
  const commonWeak = new Set([
    "123456", "654321", "012345", "543210", "234567", "765432", "345678", "876543", "456789", "987654",
    "112233", "332211", "121212", "212121", "123123", "321321", "123321", "102030", "010203", "000001", "111222"
  ]);
  if (commonWeak.has(clean)) {
    return { valid: false, reason: "الرمز متسلسل أو سهل التخمين، يرجى اختيار رمز أقوى." };
  }
  let isAsc = true;
  let isDesc = true;
  for (let i = 1; i < clean.length; i++) {
    if (Number(clean[i]) !== Number(clean[i - 1]) + 1) isAsc = false;
    if (Number(clean[i]) !== Number(clean[i - 1]) - 1) isDesc = false;
  }
  if (isAsc || isDesc) {
    return { valid: false, reason: "لا يُسمح باستخدام أرقام متتالية تصاعدياً أو تنازلياً." };
  }
  if ((clean[0] === clean[1] && clean[2] === clean[3] && clean[4] === clean[5]) || clean.slice(0, 3) === clean.slice(3, 6)) {
    return { valid: false, reason: "الرمز يحتوي على نمط متكرر، يرجى اختيار أرقام مختلفة." };
  }
  return { valid: true };
}
