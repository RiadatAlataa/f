import crypto from "crypto";
import type { Express } from "express";
import { sendCentralEmail } from "./emailService";

export interface PasswordResetDeps {
  readDb: () => any;
  mutateDb: <T>(mutator: (db: any) => Promise<T> | T) => Promise<T>;
  hashPassword: (pwd: string) => string;
  validatePasswordStrength: (pwd: string) => { isValid: boolean; errors: string[] };
  invalidateUserSessions: (userId: string, exceptToken?: string) => number;
  revokeAllTrustedDevicesForUser: (db: any, userId: string, nationalId?: string) => number;
  checkRateLimit: (
    bucket: "login" | "pinLogin" | "forgotPassword" | "forgotIdentify" | "forgotSendOtp" | "registration",
    key: string,
    maxRequests: number,
    windowMs: number
  ) => { allowed: boolean; retryAfterSec?: number };
}

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const GENERIC_LINK_RESPONSE_MSG =
  "إذا كان البريد الإلكتروني مسجلاً في النظام، فسيتم إرسال رابط إعادة تعيين كلمة المرور إليه خلال لحظات (الرابط صالح لمدة 30 دقيقة).";

function hashResetToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "";
  return email.replace(/(.{2})(.*)(@.*)/, "$1•••$3");
}

function resolvePublicOrigin(req: any): string {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/+$/, "");
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const origin = typeof req.headers?.origin === "string" ? req.headers.origin.trim() : "";
  if (origin && origin.startsWith("http")) return origin.replace(/\/+$/, "");
  const host = req.get?.("host");
  if (host) {
    const proto =
      req.headers?.["x-forwarded-proto"]?.toString().split(",")[0].trim() ||
      req.protocol ||
      "https";
    return `${proto}://${host}`;
  }
  return "https://www.riadataleata.com";
}

function isAccountActiveForReset(rec: any): boolean {
  if (!rec) return false;
  if (rec.isArchived === true || rec.loginDisabled === true || rec.hasLoginAccount === false) return false;
  const blocked = new Set(["suspended", "inactive", "banned", "rejected", "archived", "deactivated"]);
  if (rec.status && blocked.has(String(rec.status).toLowerCase())) return false;
  return true;
}

export function findActiveAccountByEmail(
  db: any,
  rawEmail: string
): { userId: string; userName: string; email: string; nationalId?: string } | null {
  const email = String(rawEmail || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;

  // 1. userDepartmentAccess (Admins, Ops, Managers, Staff)
  const access = (db.userDepartmentAccess || []).find(
    (u: any) =>
      u &&
      isAccountActiveForReset(u) &&
      ((u.userEmail && u.userEmail.toLowerCase().trim() === email) ||
        (u.email && u.email.toLowerCase().trim() === email))
  );
  if (access) {
    return {
      userId: access.userId || access.id,
      userName: access.userName || access.name || "المستخدم الكريم",
      email,
      nationalId: access.nationalId || ""
    };
  }

  // 2. employees
  const emp = (db.employees || []).find(
    (e: any) => e && isAccountActiveForReset(e) && e.email && e.email.toLowerCase().trim() === email
  );
  if (emp) {
    return {
      userId: emp.userId || emp.id,
      userName: emp.fullName || emp.name || "الموظف الكريم",
      email,
      nationalId: emp.nationalId || ""
    };
  }

  // 3. departments
  const dep = (db.departments || []).find(
    (d: any) => d && !d.isArchived && d.email && d.email.toLowerCase().trim() === email
  );
  if (dep) {
    return {
      userId: dep.directorUserId || `depadmin-${dep.id}`,
      userName: dep.directorName || dep.nameAr || "مدير الإدارة",
      email,
      nationalId: dep.nationalId || ""
    };
  }

  // 4. storekeepers
  const sk = (db.storekeepers || []).find(
    (s: any) => s && isAccountActiveForReset(s) && s.email && s.email.toLowerCase().trim() === email
  );
  if (sk) {
    return {
      userId: sk.id,
      userName: sk.name || "أمين المستودع",
      email,
      nationalId: sk.nationalId || ""
    };
  }

  // 5. teams
  const tm = (db.teams || []).find(
    (t: any) => t && isAccountActiveForReset(t) && t.leaderEmail && t.leaderEmail.toLowerCase().trim() === email
  );
  if (tm) {
    return {
      userId: `leader-${tm.id}`,
      userName: tm.leaderName || tm.nameAr || "قائد الفريق",
      email
    };
  }

  // 6. volunteers
  const vol = (db.volunteers || []).find(
    (v: any) => v && isAccountActiveForReset(v) && v.email && v.email.toLowerCase().trim() === email
  );
  if (vol) {
    return {
      userId: vol.id,
      userName: vol.name || "المتطوع الكريم",
      email,
      nationalId: vol.nationalId || ""
    };
  }

  // 7. beneficiaries
  const ben = (db.beneficiaries || []).find(
    (b: any) => b && isAccountActiveForReset(b) && b.email && b.email.toLowerCase().trim() === email
  );
  if (ben) {
    return {
      userId: ben.id,
      userName: ben.name || "المستفيد الكريم",
      email,
      nationalId: ben.nationalId || ""
    };
  }

  // 8. supportManagers & supportAgents
  const sm = (db.supportManagers || []).find(
    (s: any) => s && isAccountActiveForReset(s) && s.email && s.email.toLowerCase().trim() === email
  );
  if (sm) {
    return { userId: sm.id, userName: sm.name || "مدير الدعم", email };
  }
  const sa = (db.supportAgents || []).find(
    (s: any) => s && isAccountActiveForReset(s) && s.email && s.email.toLowerCase().trim() === email
  );
  if (sa) {
    return { userId: sa.id, userName: sa.name || "موظف الدعم", email };
  }

  // 9. Built-in executive admin / operations emails
  const adminTestMail = (db.emailSettings?.testRecipientEmail || "").toLowerCase().trim();
  const sysOfficialMail = (db.systemSettings?.officialEmail || "").toLowerCase().trim();
  if (
    email === "admin@riadataleata.org.sa" ||
    email === "riadataleata@gmail.com" ||
    (adminTestMail && email === adminTestMail) ||
    (sysOfficialMail && email === sysOfficialMail)
  ) {
    return {
      userId: "admin-user",
      userName: "مجلس الإدارة والمدير التنفيذي",
      email,
      nationalId: "1000000000"
    };
  }

  if (email === "operations@riadataleata.org.sa") {
    return {
      userId: "ops-manager",
      userName: "مدير العمليات والتشغيل",
      email,
      nationalId: "1020000000"
    };
  }

  return null;
}

export function applyNewPasswordToAccountRecords(
  db: any,
  targetUserId: string,
  cleanEmail: string,
  hashedPassword: string
) {
  const emailLower = String(cleanEmail || "").trim().toLowerCase();

  if (Array.isArray(db.userDepartmentAccess)) {
    for (const acc of db.userDepartmentAccess) {
      if (
        acc &&
        (acc.userId === targetUserId ||
          acc.id === targetUserId ||
          (emailLower &&
            ((acc.userEmail && acc.userEmail.toLowerCase() === emailLower) ||
              (acc.email && acc.email.toLowerCase() === emailLower))))
      ) {
        acc.passwordHash = hashedPassword;
        delete acc.password;
        acc.mustChangePassword = false;
        acc.updatedAt = new Date().toISOString();
      }
    }
  }

  if (Array.isArray(db.employees)) {
    for (const emp of db.employees) {
      if (
        emp &&
        (emp.id === targetUserId ||
          emp.userId === targetUserId ||
          (emailLower && emp.email && emp.email.toLowerCase() === emailLower))
      ) {
        emp.password = hashedPassword;
        emp.passwordHash = hashedPassword;
        emp.mustChangePassword = false;
      }
    }
  }

  if (Array.isArray(db.departments)) {
    for (const dep of db.departments) {
      if (
        dep &&
        (dep.id === targetUserId ||
          dep.directorUserId === targetUserId ||
          `depadmin-${dep.id}` === targetUserId ||
          (emailLower && dep.email && dep.email.toLowerCase() === emailLower))
      ) {
        dep.password = hashedPassword;
        dep.passwordHash = hashedPassword;
      }
    }
  }

  if (Array.isArray(db.storekeepers)) {
    for (const sk of db.storekeepers) {
      if (sk && (sk.id === targetUserId || (emailLower && sk.email && sk.email.toLowerCase() === emailLower))) {
        sk.password = hashedPassword;
        sk.passwordHash = hashedPassword;
      }
    }
  }

  if (Array.isArray(db.teams)) {
    for (const tm of db.teams) {
      if (
        tm &&
        (tm.id === targetUserId ||
          `leader-${tm.id}` === targetUserId ||
          (emailLower && tm.leaderEmail && tm.leaderEmail.toLowerCase() === emailLower))
      ) {
        tm.password = hashedPassword;
        tm.passwordHash = hashedPassword;
      }
    }
  }

  if (Array.isArray(db.volunteers)) {
    for (const vol of db.volunteers) {
      if (vol && (vol.id === targetUserId || (emailLower && vol.email && vol.email.toLowerCase() === emailLower))) {
        vol.password = hashedPassword;
        vol.passwordHash = hashedPassword;
        vol.mustChangePassword = false;
      }
    }
  }

  if (Array.isArray(db.beneficiaries)) {
    for (const ben of db.beneficiaries) {
      if (ben && (ben.id === targetUserId || (emailLower && ben.email && ben.email.toLowerCase() === emailLower))) {
        ben.password = hashedPassword;
        ben.passwordHash = hashedPassword;
        ben.mustChangePassword = false;
      }
    }
  }

  for (const collKey of ["supportManagers", "supportAgents"]) {
    if (Array.isArray(db[collKey])) {
      for (const item of db[collKey]) {
        if (item && (item.id === targetUserId || (emailLower && item.email && item.email.toLowerCase() === emailLower))) {
          item.password = hashedPassword;
          item.passwordHash = hashedPassword;
        }
      }
    }
  }
}

export function setupPasswordResetLinkRoutes(app: Express, deps: PasswordResetDeps) {
  // Public recovery configuration (tells login UI whether OTP is active or closed without exposing any settings)
  app.get("/api/db/auth/recovery-config", (req: any, res: any) => {
    const db = deps.readDb();
    return res.json({
      status: "success",
      otpEnabled: Boolean(db?.systemSettings?.enableOtpVerification === true),
      linkRecoveryEnabled: true,
      tokenTtlMinutes: 30
    });
  });

  // Request Email-Link Password Reset (Active when OTP is closed, and also always works cleanly via email link)
  app.post("/api/db/auth/forgot-password/request-link", async (req: any, res: any) => {
    const clientIp = (
      (req.headers["x-forwarded-for"] as string) ||
      req.ip ||
      "127.0.0.1"
    )
      .split(",")[0]
      .trim();

    const ipRate = deps.checkRateLimit("forgotPassword", `ip:${clientIp}`, 6, 15 * 60 * 1000);
    if (!ipRate.allowed) {
      return res.status(429).json({
        error: `تم تجاوز الحد المسموح به لطلبات استعادة كلمة المرور. يرجى الانتظار ${ipRate.retryAfterSec} ثانية.`,
        retryAfterSec: ipRate.retryAfterSec
      });
    }

    const rawEmail = req.body?.email || req.body?.identifier || "";
    const cleanEmail = String(rawEmail).trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        error: "يرجى إدخال عنوان بريد إلكتروني صحيح."
      });
    }

    const emailRate = deps.checkRateLimit("forgotPassword", `email:${cleanEmail}`, 4, 15 * 60 * 1000);
    if (!emailRate.allowed) {
      return res.status(429).json({
        error: `تم إرسال عدة طلبات لهذا البريد مؤخراً. يرجى الانتظار ${emailRate.retryAfterSec} ثانية.`,
        retryAfterSec: emailRate.retryAfterSec
      });
    }

    const dbSnapshot = deps.readDb();
    const account = findActiveAccountByEmail(dbSnapshot, cleanEmail);

    // Anti-enumeration shield: always return generic success when account doesn't exist
    if (!account) {
      return res.json({
        status: "success",
        message: GENERIC_LINK_RESPONSE_MSG
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = Date.now() + RESET_TOKEN_TTL_MS;
    const baseUrl = resolvePublicOrigin(req);
    const resetLink = `${baseUrl}/?resetToken=${rawToken}`;

    await deps.mutateDb((db) => {
      if (!Array.isArray(db.passwordResetTokens)) db.passwordResetTokens = [];
      const nowMs = Date.now();
      // Remove expired tokens & invalidate prior unused tokens for this user/email
      db.passwordResetTokens = db.passwordResetTokens.filter((t: any) => {
        if (!t) return false;
        if (t.expiresAt && t.expiresAt < nowMs - 24 * 60 * 60 * 1000) return false;
        return true;
      });
      for (const t of db.passwordResetTokens) {
        if (t && !t.used && (t.userId === account.userId || t.email === cleanEmail)) {
          t.used = true;
          t.usedAt = new Date().toISOString();
        }
      }

      db.passwordResetTokens.push({
        id: `prt-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`,
        tokenHash,
        userId: account.userId,
        userName: account.userName,
        email: cleanEmail,
        nationalId: account.nationalId || "",
        expiresAt,
        used: false,
        usedAt: null,
        createdAt: new Date().toISOString()
      });
    });

    // Send reset link email via central email service (without OTP or passwords)
    const freshDb = deps.readDb();
    const isolatedDb = { ...freshDb, emailLogs: [] };
    let sendRes: any;
    try {
      sendRes = await sendCentralEmail(isolatedDb, {
        to: cleanEmail,
        recipientName: account.userName,
        subject: "رابط إعادة تعيين كلمة المرور - جمعية ريادة العطاء",
        templateType: "password_reset_link",
        templateData: {
          recipientName: account.userName,
          resetLink,
          expirationMinutes: 30,
          logoUrl: `${baseUrl}/logo.png`
        }
      });
    } catch (err: any) {
      sendRes = { success: false, provider: "simulation", error: err?.message || "فشل إرسال البريد" };
    }

    await deps.mutateDb((db) => {
      if (!Array.isArray(db.accessAuditLogs)) db.accessAuditLogs = [];
      db.accessAuditLogs.unshift({
        id: `audit-pwdlink-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: account.userId,
        userName: account.userName,
        userRole: "user",
        userDepartmentId: "auth",
        targetDepartmentId: "auth",
        action: "request_password_reset_link",
        resource: "أمان الحسابات",
        endpoint: "/api/db/auth/forgot-password/request-link",
        status: "allowed",
        ip: clientIp,
        device: (req.headers["user-agent"] || "Web Client").substring(0, 100),
        notes: `طلب رابط إعادة تعيين كلمة المرور عبر البريد (${maskEmail(cleanEmail)}) - حالة الإرسال: ${sendRes?.success ? "نجح" : "قيد المعالجة"}`
      });
      if (Array.isArray(isolatedDb.emailLogs) && isolatedDb.emailLogs.length > 0) {
        if (!Array.isArray(db.emailLogs)) db.emailLogs = [];
        db.emailLogs.unshift(...isolatedDb.emailLogs);
        if (db.emailLogs.length > 500) db.emailLogs = db.emailLogs.slice(0, 500);
      }
    });

    if (!sendRes?.success && sendRes?.provider !== "simulation") {
      return res.status(502).json({
        error: `تعذر إرسال رابط استعادة كلمة المرور عبر مزود البريد (${sendRes?.error || "خطأ غير معروف"}). يرجى المحاولة لاحقاً.`
      });
    }

    return res.json({
      status: "success",
      message: GENERIC_LINK_RESPONSE_MSG
    });
  });

  // Validate single-use reset token (GET and POST supported)
  const handleValidateToken = (req: any, res: any) => {
    const rawToken = String(req.body?.token || req.query?.token || req.body?.resetToken || "").trim();
    if (!rawToken) {
      return res.status(400).json({ valid: false, error: "رمز إعادة تعيين كلمة المرور مفقود." });
    }
    const tokenHash = hashResetToken(rawToken);
    const db = deps.readDb();
    const record = (db.passwordResetTokens || []).find((t: any) => t && t.tokenHash === tokenHash);

    if (!record) {
      return res.status(400).json({
        valid: false,
        error: "رابط إعادة تعيين كلمة المرور غير صالح أو غير موجود."
      });
    }
    if (record.used) {
      return res.status(400).json({
        valid: false,
        error: "تم استخدام هذا الرابط مسبقاً ولا يمكن إعادة استخدامه. يرجى طلب رابط جديد."
      });
    }
    if (Date.now() > record.expiresAt) {
      return res.status(400).json({
        valid: false,
        error: "انتهت صلاحية رابط إعادة تعيين كلمة المرور (صالح لمدة 30 دقيقة فقط). يرجى طلب رابط جديد."
      });
    }

    return res.json({
      valid: true,
      maskedEmail: maskEmail(record.email),
      expiresAt: record.expiresAt
    });
  };

  app.post("/api/db/auth/reset-password/validate", handleValidateToken);
  app.get("/api/db/auth/reset-password/validate", handleValidateToken);

  // Confirm Password Reset with Token -> Hash Password + Invalidate Sessions + Single-Use Mark
  app.post("/api/db/auth/reset-password/confirm", async (req: any, res: any) => {
    const rawToken = String(req.body?.token || req.body?.resetToken || "").trim();
    const newPassword = req.body?.newPassword;
    const confirmPassword = req.body?.confirmPassword;

    if (!rawToken || !newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ error: "يرجى إدخال رمز التحقق وكلمة المرور الجديدة." });
    }
    const cleanPassword = newPassword.trim();
    if (confirmPassword !== undefined && cleanPassword !== String(confirmPassword).trim()) {
      return res.status(400).json({ error: "كلمة المرور الجديدة وتأكيدها غير متطابقتين." });
    }

    const strength = deps.validatePasswordStrength(cleanPassword);
    if (!strength.isValid) {
      return res.status(400).json({
        error: `كلمة المرور لا تستوفي متطلبات الأمان: ${strength.errors.join(" ")}`,
        errors: strength.errors
      });
    }

    const tokenHash = hashResetToken(rawToken);

    const outcome = await deps.mutateDb((db) => {
      if (!Array.isArray(db.passwordResetTokens)) db.passwordResetTokens = [];
      const record = db.passwordResetTokens.find((t: any) => t && t.tokenHash === tokenHash);

      if (!record) {
        return { ok: false as const, status: 400, error: "رابط إعادة تعيين كلمة المرور غير صالح." };
      }
      if (record.used) {
        return { ok: false as const, status: 400, error: "تم استخدام رابط إعادة التعيين هذا مسبقاً، يرجى طلب رابط جديد." };
      }
      if (Date.now() > record.expiresAt) {
        return { ok: false as const, status: 400, error: "انتهت صلاحية رابط إعادة تعيين كلمة المرور (30 دقيقة)." };
      }

      const hashed = deps.hashPassword(cleanPassword);
      applyNewPasswordToAccountRecords(db, record.userId, record.email, hashed);

      record.used = true;
      record.usedAt = new Date().toISOString();

      const revokedPins = deps.revokeAllTrustedDevicesForUser(db, record.userId, record.nationalId);
      const terminatedSessions = deps.invalidateUserSessions(record.userId);

      if (!Array.isArray(db.accessAuditLogs)) db.accessAuditLogs = [];
      db.accessAuditLogs.unshift({
        id: `audit-pwdreset-ok-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId: record.userId,
        userName: record.userName || record.userId,
        userRole: "user",
        userDepartmentId: "auth",
        targetDepartmentId: "auth",
        action: "reset_password_email_link",
        resource: "أمان الحسابات",
        endpoint: "/api/db/auth/reset-password/confirm",
        status: "allowed",
        ip: (req.headers["x-forwarded-for"] as string || req.ip || "127.0.0.1").split(",")[0].trim(),
        device: (req.headers["user-agent"] || "Web Client").substring(0, 100),
        notes: `إعادة تعيين كلمة المرور عبر رابط البريد بنجاح وإنهاء (${terminatedSessions}) جلسة وإلغاء (${revokedPins}) جهاز دخول سريع`
      });

      return { ok: true as const };
    });

    if (!outcome.ok) {
      return res.status(outcome.status).json({ error: outcome.error });
    }

    return res.json({
      status: "success",
      message: "تم تعيين كلمة المرور الجديدة وتأمين حسابك بنجاح. يمكنك تسجيل الدخول الآن."
    });
  });
}
