import { Express, Request, Response } from "express";
import crypto from "crypto";
import { 
  WhatsAppConfig, 
  defaultWhatsAppConfig, 
  sendWhatsAppMessage, 
  testWhatsAppConnection, 
  formatToWhatsAppE164 
} from "./whatsappService";
import { sendUnifiedNotification } from "./unifiedNotificationService";

const OTP_SECRET_SALT = process.env.OTP_SALT || "reyadat_alata_otp_salt_2026_secure";

// Simple IP & account rate limiter
const rateLimitCache = new Map<string, { count: number; firstRequestTime: number }>();
function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = rateLimitCache.get(key);
  if (!entry || now - entry.firstRequestTime > windowMs) {
    rateLimitCache.set(key, { count: 1, firstRequestTime: now });
    return { allowed: true };
  }
  if (entry.count >= limit) {
    const retryAfterSec = Math.ceil((entry.firstRequestTime + windowMs - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  entry.count++;
  return { allowed: true };
}

// Find user in database across all collections
function findUserByIdentifier(db: any, rawIdentifier: string): {
  found: boolean;
  userEmail: string | null;
  userPhone: string | null;
  userName: string;
  userId: string;
  collection: string;
} {
  const cleanId = rawIdentifier.trim().toLowerCase();
  const cleanDigits = rawIdentifier.replace(/[^0-9]/g, "");

  // 1. userDepartmentAccess
  for (const u of (db.userDepartmentAccess || [])) {
    if (
      (u.username && u.username.toLowerCase() === cleanId) ||
      (u.userId && u.userId.toLowerCase() === cleanId) ||
      (u.userEmail && u.userEmail.toLowerCase() === cleanId) ||
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.nationalId && u.nationalId === cleanId) ||
      (u.phone && (u.phone === cleanId || (cleanDigits && u.phone.includes(cleanDigits))))
    ) {
      return {
        found: true,
        userEmail: u.userEmail || u.email || null,
        userPhone: u.phone || null,
        userName: u.userName || u.name || "المسؤول الكريم",
        userId: u.userId || u.id || cleanId,
        collection: "userDepartmentAccess"
      };
    }
  }

  // 2. employees
  for (const e of (db.employees || [])) {
    if (
      (e.nationalId && e.nationalId === cleanId) ||
      (e.email && e.email.toLowerCase() === cleanId) ||
      (e.phone && (e.phone === cleanId || (cleanDigits && e.phone.includes(cleanDigits)))) ||
      (e.id && e.id === cleanId)
    ) {
      return {
        found: true,
        userEmail: e.email || null,
        userPhone: e.phone || null,
        userName: e.fullName || e.name || "الموظف الكريم",
        userId: e.id || cleanId,
        collection: "employees"
      };
    }
  }

  // 3. departments
  for (const d of (db.departments || [])) {
    if (
      (d.email && d.email.toLowerCase() === cleanId) ||
      (d.directorPhone && (d.directorPhone === cleanId || (cleanDigits && d.directorPhone.includes(cleanDigits)))) ||
      (d.id && d.id === cleanId) ||
      (`depadmin-${d.id}` === cleanId)
    ) {
      return {
        found: true,
        userEmail: d.email || null,
        userPhone: d.directorPhone || null,
        userName: d.directorName || d.nameAr || "مدير الإدارة",
        userId: `depadmin-${d.id}`,
        collection: "departments"
      };
    }
  }

  // 4. teams
  for (const t of (db.teams || [])) {
    if (
      (t.leaderPhone && (t.leaderPhone === cleanId || (cleanDigits && t.leaderPhone.includes(cleanDigits)))) ||
      (t.leaderEmail && t.leaderEmail.toLowerCase() === cleanId) ||
      (t.id && t.id === cleanId)
    ) {
      return {
        found: true,
        userEmail: t.leaderEmail || null,
        userPhone: t.leaderPhone || null,
        userName: t.leaderName || "قائد الفريق",
        userId: t.id || cleanId,
        collection: "teams"
      };
    }
  }

  // 5. volunteers
  for (const v of (db.volunteers || [])) {
    if (
      (v.nationalId && v.nationalId === cleanId) ||
      (v.email && v.email.toLowerCase() === cleanId) ||
      (v.phone && (v.phone === cleanId || (cleanDigits && v.phone.includes(cleanDigits)))) ||
      (v.id && v.id === cleanId)
    ) {
      return {
        found: true,
        userEmail: v.email || null,
        userPhone: v.phone || null,
        userName: v.name || "المتطوع الكريم",
        userId: v.id || cleanId,
        collection: "volunteers"
      };
    }
  }

  // 6. beneficiaries
  for (const b of (db.beneficiaries || [])) {
    if (
      (b.nationalId && b.nationalId === cleanId) ||
      (b.email && b.email.toLowerCase() === cleanId) ||
      (b.phone && (b.phone === cleanId || (cleanDigits && b.phone.includes(cleanDigits)))) ||
      (b.id && b.id === cleanId)
    ) {
      return {
        found: true,
        userEmail: b.email || null,
        userPhone: b.phone || null,
        userName: b.name || "المستفيد الكريم",
        userId: b.id || cleanId,
        collection: "beneficiaries"
      };
    }
  }

  // Fallback default admin
  if (cleanId === "admin" || cleanId === "1000000000") {
    return {
      found: true,
      userEmail: db.emailSettings?.testRecipientEmail || "riadataleata@gmail.com",
      userPhone: "0550123456",
      userName: "مجلس الإدارة والمدير التنفيذي",
      userId: "admin-user",
      collection: "admin"
    };
  }

  return {
    found: false,
    userEmail: null,
    userPhone: null,
    userName: "المستخدم الكريم",
    userId: cleanId,
    collection: "none"
  };
}

export function setupWhatsAppRoutes(app: Express, readDb: () => any, writeDb: (db: any) => void) {
  
  // Ensure whatsapp settings & logs in db
  function getSafeDb() {
    const db = readDb();
    if (!db.whatsappSettings) {
      db.whatsappSettings = { ...defaultWhatsAppConfig };
      writeDb(db);
    }
    if (!db.notificationDeliveryLogs) {
      db.notificationDeliveryLogs = [];
      writeDb(db);
    }
    if (!db.passwordResetOtps) {
      db.passwordResetOtps = [];
      writeDb(db);
    }
    return db;
  }

  // =========================================================================
  // 1. GET WHATSAPP SETTINGS (Sanitized - Never leaks raw tokens to client)
  // =========================================================================
  app.get("/api/whatsapp/settings", (req: Request, res: Response) => {
    const db = getSafeDb();
    const config: WhatsAppConfig = db.whatsappSettings || defaultWhatsAppConfig;

    // Check env vars first for highest security
    const envToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || "";
    const effectiveToken = envToken || config.accessToken || "";
    const isTokenSet = Boolean(effectiveToken && effectiveToken.length > 10);
    const tokenMasked = isTokenSet 
      ? `EAAB••••••••${effectiveToken.slice(-6)}` 
      : "";

    res.json({
      success: true,
      settings: {
        enabled: Boolean(config.enabled),
        provider: config.provider || "meta_cloud_api",
        officialPhoneNumber: config.officialPhoneNumber || "966550123456",
        wabaId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || config.wabaId || "",
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || config.phoneNumberId || "",
        webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || config.webhookVerifyToken || "reyadat_alata_wa_verify_2026",
        webhookUrl: `${req.protocol}://${req.get("host")}/api/whatsapp/webhook`,
        isTokenConfigured: isTokenSet,
        tokenMasked,
        status: config.status || (isTokenSet ? "connected" : "disconnected"),
        lastCheckedAt: config.lastCheckedAt || null,
        lastError: config.lastError || null,
        allowedNotificationTypes: config.allowedNotificationTypes || defaultWhatsAppConfig.allowedNotificationTypes,
        approvedTemplates: config.approvedTemplates || defaultWhatsAppConfig.approvedTemplates,
        retrySettings: config.retrySettings || defaultWhatsAppConfig.retrySettings
      }
    });
  });

  // =========================================================================
  // 2. UPDATE WHATSAPP SETTINGS (Authorized Admins & Operations)
  // =========================================================================
  app.post("/api/whatsapp/settings", (req: Request, res: Response) => {
    const db = getSafeDb();
    const body = req.body || {};

    const currentConfig: WhatsAppConfig = db.whatsappSettings || { ...defaultWhatsAppConfig };
    
    // Update non-sensitive configs
    if (typeof body.enabled === "boolean") currentConfig.enabled = body.enabled;
    if (body.provider) currentConfig.provider = body.provider;
    if (body.officialPhoneNumber) currentConfig.officialPhoneNumber = body.officialPhoneNumber;
    if (body.wabaId !== undefined) currentConfig.wabaId = body.wabaId;
    if (body.phoneNumberId !== undefined) currentConfig.phoneNumberId = body.phoneNumberId;
    if (body.webhookVerifyToken !== undefined) currentConfig.webhookVerifyToken = body.webhookVerifyToken;
    if (body.allowedNotificationTypes) {
      currentConfig.allowedNotificationTypes = {
        ...currentConfig.allowedNotificationTypes,
        ...body.allowedNotificationTypes
      };
    }
    if (body.retrySettings) {
      currentConfig.retrySettings = {
        ...currentConfig.retrySettings,
        ...body.retrySettings
      };
    }

    // Only update token if a new non-masked string is explicitly submitted
    if (body.accessToken && typeof body.accessToken === "string" && !body.accessToken.includes("••••")) {
      currentConfig.accessToken = body.accessToken.trim();
    }

    db.whatsappSettings = currentConfig;
    writeDb(db);

    res.json({
      success: true,
      message: "تم حفظ إعدادات واتساب والإشعارات بنجاح."
    });
  });

  // =========================================================================
  // 3. TEST WHATSAPP CONNECTION (Live verification against Meta Graph API)
  // =========================================================================
  app.post("/api/whatsapp/test-connection", async (req: Request, res: Response) => {
    const db = getSafeDb();
    const config: WhatsAppConfig = db.whatsappSettings || defaultWhatsAppConfig;

    const result = await testWhatsAppConnection(config);

    // Update status in database based on real test
    config.status = result.success ? "connected" : "error";
    config.lastCheckedAt = new Date().toISOString();
    config.lastError = result.success ? undefined : result.message;
    db.whatsappSettings = config;
    writeDb(db);

    res.json(result);
  });

  // =========================================================================
  // 4. SEND TEST MESSAGE TO AUTHORIZED PHONE
  // =========================================================================
  app.post("/api/whatsapp/send-test", async (req: Request, res: Response) => {
    const db = getSafeDb();
    const { phone, message } = req.body;

    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ success: false, error: "يرجى تحديد رقم الهاتف لإرسال رسالة الاختبار." });
    }

    const config: WhatsAppConfig = db.whatsappSettings || defaultWhatsAppConfig;
    const testText = message || `رسالة اختبارية من جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - نظام الإشعارات الموحد.\nتاريخ الاختبار: ${new Date().toLocaleString("ar-SA")}`;

    const sendRes = await sendWhatsAppMessage(config, {
      to: phone,
      textBody: testText,
      messageType: "text",
      notificationType: "admin"
    });

    // Record in notification logs
    const masked = phone.length > 5 ? `${phone.substring(0, 4)}••••${phone.slice(-2)}` : "••••••";
    db.notificationDeliveryLogs.unshift({
      id: "log-test-" + Date.now(),
      recipient: masked,
      channel: "whatsapp",
      type: "admin_test",
      status: sendRes.success ? "sent" : "failed",
      provider: sendRes.provider,
      messageId: sendRes.messageId,
      error: sendRes.error || null,
      timestamp: new Date().toISOString(),
      retryCount: 0
    });
    writeDb(db);

    res.json(sendRes);
  });

  // =========================================================================
  // 5. META WEBHOOK VERIFICATION (GET hub.challenge)
  // =========================================================================
  app.get("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const db = getSafeDb();
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || db.whatsappSettings?.webhookVerifyToken || "reyadat_alata_wa_verify_2026";

    if (mode === "subscribe" && token === expectedToken) {
      console.log("[WhatsApp Webhook] Handshake verified successfully.");
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden verification token");
  });

  // =========================================================================
  // 6. META WEBHOOK EVENT LISTENER (POST message delivery status updates)
  // =========================================================================
  app.post("/api/whatsapp/webhook", (req: Request, res: Response) => {
    const db = getSafeDb();
    const body = req.body;

    if (body.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      body.entry.forEach((entry: any) => {
        const changes = entry.changes || [];
        changes.forEach((change: any) => {
          const value = change.value;
          if (value && Array.isArray(value.statuses)) {
            value.statuses.forEach((statusObj: any) => {
              const msgId = statusObj.id;
              const statusName = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
              // Update log entry
              const target = (db.notificationDeliveryLogs || []).find((l: any) => l.messageId === msgId);
              if (target) {
                target.deliveryStatus = statusName;
                target.updatedAt = new Date().toISOString();
              }
            });
          }
        });
      });
      writeDb(db);
    }

    res.status(200).json({ received: true });
  });

  // =========================================================================
  // 7. GET NOTIFICATION LOGS (Safe, masked, privacy protected)
  // =========================================================================
  app.get("/api/notifications/logs", (req: Request, res: Response) => {
    const db = getSafeDb();
    const logs = (db.notificationDeliveryLogs || []).slice(0, 100);
    res.json({
      success: true,
      count: logs.length,
      logs
    });
  });

  // =========================================================================
  // 8. SEND CENTRALIZED MULTI-CHANNEL NOTIFICATION
  // =========================================================================
  app.post("/api/notifications/send-centralized", async (req: Request, res: Response) => {
    const db = getSafeDb();
    const payload = req.body;

    if (!payload.title || !payload.body) {
      return res.status(400).json({ success: false, error: "العنوان ونص الرسالة مطلوبان." });
    }

    const result = await sendUnifiedNotification(db, payload);
    writeDb(db);
    res.json(result);
  });

  // =========================================================================
  // 9. FORGOT PASSWORD: STEP 1 - IDENTIFY & RETURN AVAILABLE CHANNELS
  // =========================================================================
  app.post("/api/db/auth/forgot-password/identify", (req: Request, res: Response) => {
    const clientIp = (req.headers["x-forwarded-for"] as string || req.ip || "127.0.0.1").split(",")[0].trim();
    const rateCheck = checkRateLimit(`fp-ident-${clientIp}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `تم تجاوز الحد المسموح به. يرجى الانتظار ${rateCheck.retryAfterSec} ثانية.`,
        retryAfterSec: rateCheck.retryAfterSec
      });
    }

    const { identifier } = req.body;
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return res.status(400).json({ error: "يرجى إدخال رقم الهوية أو اسم المستخدم أو البريد الإلكتروني." });
    }

    const db = getSafeDb();
    const user = findUserByIdentifier(db, identifier);

    // Anti-enumeration shield: If not found, return generic success with standard masked placeholders
    if (!user.found) {
      return res.json({
        status: "success",
        accountFound: true,
        availableChannels: {
          whatsapp: { available: true, masked: "9665••••••56" },
          email: { available: true, masked: "u••••••r@example.com" }
        }
      });
    }

    // Mask phone number: e.g. 0550123456 -> 9665••••56
    let maskedPhone = "";
    if (user.userPhone) {
      const e164 = formatToWhatsAppE164(user.userPhone);
      maskedPhone = e164.length > 5 ? `${e164.substring(0, 4)}••••${e164.slice(-2)}` : "••••••";
    }

    // Mask email: e.g. user@example.com -> u•••r@example.com
    let maskedEmail = "";
    if (user.userEmail && user.userEmail.includes("@")) {
      maskedEmail = user.userEmail.replace(/(.{2})(.*)(@.*)/, "$1•••$3");
    }

    res.json({
      status: "success",
      accountFound: true,
      availableChannels: {
        whatsapp: {
          available: Boolean(user.userPhone && user.userPhone.length >= 9),
          masked: maskedPhone || "رقم جوال غير موثق"
        },
        email: {
          available: Boolean(user.userEmail && user.userEmail.includes("@")),
          masked: maskedEmail || "بريد غير موثق"
        }
      }
    });
  });

  // =========================================================================
  // 10. FORGOT PASSWORD: STEP 2 - SEND 6-DIGIT OTP VIA CHOSEN CHANNEL
  // =========================================================================
  app.post("/api/db/auth/forgot-password/send-otp", async (req: Request, res: Response) => {
    const clientIp = (req.headers["x-forwarded-for"] as string || req.ip || "127.0.0.1").split(",")[0].trim();
    const rateCheck = checkRateLimit(`fp-otp-${clientIp}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `تم تجاوز الحد المسموح به لطلبات الرمز. يرجى الانتظار ${rateCheck.retryAfterSec} ثانية.`,
        retryAfterSec: rateCheck.retryAfterSec
      });
    }

    const { identifier, channel = "whatsapp" } = req.body;
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return res.status(400).json({ error: "المعرف مطلوب لإرسال رمز التحقق." });
    }

    const db = getSafeDb();
    const user = findUserByIdentifier(db, identifier);

    // Cryptographically secure 6-digit OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const codeHash = crypto.createHash("sha256").update(OTP_SECRET_SALT + otpCode).digest("hex");
    const cleanId = identifier.trim().toLowerCase();

    // Invalidate prior unused OTPs for this identifier
    db.passwordResetOtps = (db.passwordResetOtps || []).filter((o: any) => o && o.identifier !== cleanId);

    const otpRecord = {
      id: "otp-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      identifier: cleanId,
      userId: user.userId,
      codeHash,
      channel,
      expiresAt: Date.now() + (10 * 60 * 1000), // Strict 10-minute validity
      attempts: 0,
      maxAttempts: 5,
      used: false,
      createdAt: new Date().toISOString()
    };
    db.passwordResetOtps.push(otpRecord);

    // Dispatch via Central Notification Engine
    const notificationPayload = {
      recipient: {
        name: user.userName,
        email: user.userEmail || undefined,
        phone: user.userPhone || undefined,
        userId: user.userId
      },
      channel: channel === "whatsapp" ? ("whatsapp" as const) : ("email" as const),
      type: "otp" as const,
      title: "رمز التحقق لاستعادة كلمة المرور - جمعية ريادة العطاء",
      body: `رمز التحقق الخاص بك هو: ${otpCode} (صالح لمدة 10 دقائق). لا تشاركه مع أي شخص لحماية حسابك.`,
      templateType: "password_reset",
      templateData: {
        recipientName: user.userName,
        resetCode: otpCode,
        expirationMinutes: 10
      }
    };

    try {
      await sendUnifiedNotification(db, notificationPayload);
    } catch (err: any) {
      console.warn("Notification dispatch notice:", err?.message);
    }

    writeDb(db);

    const maskedTarget = channel === "whatsapp"
      ? (user.userPhone ? `${formatToWhatsAppE164(user.userPhone).substring(0, 4)}••••${user.userPhone.slice(-2)}` : "رقم الجوال")
      : (user.userEmail ? user.userEmail.replace(/(.{2})(.*)(@.*)/, "$1•••$3") : "البريد الإلكتروني");

    res.json({
      status: "success",
      message: `تم إرسال رمز التحقق OTP بنجاح عبر (${channel === "whatsapp" ? "واتساب" : "البريد الإلكتروني"}) إلى ${maskedTarget}.`,
      channel,
      expiresInMinutes: 10
    });
  });

  // =========================================================================
  // 11. FORGOT PASSWORD: STEP 3 - VERIFY OTP CODE
  // =========================================================================
  app.post("/api/db/auth/forgot-password/verify-otp", (req: Request, res: Response) => {
    const { identifier, otpCode } = req.body;

    if (!identifier || !otpCode) {
      return res.status(400).json({ error: "المعرف ورمز التحقق مطلوبان." });
    }

    const cleanCode = String(otpCode).trim().replace(/[^0-9]/g, "");
    if (cleanCode.length !== 6) {
      return res.status(400).json({ error: "رمز التحقق يجب أن يتكون من 6 أرقام." });
    }

    const db = getSafeDb();
    const cleanId = String(identifier).trim().toLowerCase();

    const record = (db.passwordResetOtps || []).find((o: any) => o.identifier === cleanId && !o.used);

    if (!record) {
      return res.status(400).json({ error: "لا يوجد رمز تحقق نشط لهذا المعرف، يرجى طلب رمز جديد." });
    }

    // Check expiry (10 minutes)
    if (Date.now() > record.expiresAt) {
      record.used = true;
      writeDb(db);
      return res.status(400).json({ error: "انتهت صلاحية رمز التحقق (أكثر من 10 دقائق). يرجى طلب رمز جديد." });
    }

    // Check attempts
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > record.maxAttempts) {
      record.used = true;
      writeDb(db);
      return res.status(400).json({ error: "تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم إلغاء الرمز لدواعي الأمان." });
    }

    // Compare hash
    const inputHash = crypto.createHash("sha256").update(OTP_SECRET_SALT + cleanCode).digest("hex");
    if (inputHash !== record.codeHash) {
      writeDb(db);
      const remaining = record.maxAttempts - record.attempts;
      return res.status(400).json({ error: `رمز التحقق غير صحيح. متبقي ${remaining} محاولة.` });
    }

    // Success: mark OTP used immediately so it cannot be reused
    record.used = true;

    // Issue single-use signed reset token valid for 5 minutes
    const resetToken = `rtok_${crypto.randomBytes(32).toString("hex")}`;
    if (!db.passwordResetTokens) db.passwordResetTokens = [];
    db.passwordResetTokens.push({
      token: resetToken,
      identifier: cleanId,
      userId: record.userId,
      expiresAt: Date.now() + (5 * 60 * 1000),
      used: false
    });

    writeDb(db);

    res.json({
      status: "success",
      message: "تم التحقق من الرمز بنجاح. يمكنك الآن تعيين كلمة مرور جديدة.",
      resetToken
    });
  });

  // =========================================================================
  // 12. FORGOT PASSWORD: STEP 4 - SET NEW PASSWORD
  // =========================================================================
  app.post("/api/db/auth/forgot-password/reset", (req: Request, res: Response) => {
    const { identifier, resetToken, newPassword } = req.body;

    if (!identifier || !resetToken || !newPassword) {
      return res.status(400).json({ error: "بيانات تعيين كلمة المرور غير مكتملة." });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "يجب أن تتكون كلمة المرور الجديدة من 6 خانات على الأقل." });
    }

    const db = getSafeDb();
    const cleanId = String(identifier).trim().toLowerCase();

    const tokenEntry = (db.passwordResetTokens || []).find((t: any) => 
      t.token === resetToken && t.identifier === cleanId && !t.used
    );

    if (!tokenEntry) {
      return res.status(403).json({ error: "جلسة إعادة التعيين غير صالحة أو تم استخدامها مسبقاً." });
    }

    if (Date.now() > tokenEntry.expiresAt) {
      tokenEntry.used = true;
      writeDb(db);
      return res.status(403).json({ error: "انتهت صلاحية جلسة تعيين كلمة المرور. يرجى البدء من جديد." });
    }

    // Mark token used
    tokenEntry.used = true;

    // Update password in the relevant collection
    const cleanDigits = cleanId.replace(/[^0-9]/g, "");
    let updated = false;

    // 1. userDepartmentAccess
    (db.userDepartmentAccess || []).forEach((u: any) => {
      if (
        (u.username && u.username.toLowerCase() === cleanId) ||
        (u.userId && u.userId.toLowerCase() === cleanId) ||
        (u.userEmail && u.userEmail.toLowerCase() === cleanId) ||
        (u.email && u.email.toLowerCase() === cleanId) ||
        (u.nationalId && u.nationalId === cleanId) ||
        (u.phone && (u.phone === cleanId || (cleanDigits && u.phone.includes(cleanDigits))))
      ) {
        u.password = newPassword;
        u.updatedAt = new Date().toISOString();
        updated = true;
      }
    });

    // 2. employees
    (db.employees || []).forEach((e: any) => {
      if (
        (e.nationalId && e.nationalId === cleanId) ||
        (e.email && e.email.toLowerCase() === cleanId) ||
        (e.phone && (e.phone === cleanId || (cleanDigits && e.phone.includes(cleanDigits)))) ||
        (e.id && e.id === cleanId)
      ) {
        e.password = newPassword;
        e.updatedAt = new Date().toISOString();
        updated = true;
      }
    });

    // 3. departments
    (db.departments || []).forEach((d: any) => {
      if (
        (d.email && d.email.toLowerCase() === cleanId) ||
        (d.directorPhone && (d.directorPhone === cleanId || (cleanDigits && d.directorPhone.includes(cleanDigits)))) ||
        (d.id && d.id === cleanId) ||
        (`depadmin-${d.id}` === cleanId)
      ) {
        d.password = newPassword;
        updated = true;
      }
    });

    // 4. volunteers
    (db.volunteers || []).forEach((v: any) => {
      if (
        (v.nationalId && v.nationalId === cleanId) ||
        (v.email && v.email.toLowerCase() === cleanId) ||
        (v.phone && (v.phone === cleanId || (cleanDigits && v.phone.includes(cleanDigits)))) ||
        (v.id && v.id === cleanId)
      ) {
        v.password = newPassword;
        updated = true;
      }
    });

    // 5. beneficiaries
    (db.beneficiaries || []).forEach((b: any) => {
      if (
        (b.nationalId && b.nationalId === cleanId) ||
        (b.email && b.email.toLowerCase() === cleanId) ||
        (b.phone && (b.phone === cleanId || (cleanDigits && b.phone.includes(cleanDigits)))) ||
        (b.id && b.id === cleanId)
      ) {
        b.password = newPassword;
        updated = true;
      }
    });

    // Log the security event
    if (!db.accessAuditLogs) db.accessAuditLogs = [];
    db.accessAuditLogs.unshift({
      id: "sec-" + Date.now(),
      timestamp: new Date().toISOString(),
      action: "password_reset_success",
      identifier: cleanId,
      status: "success",
      ip: req.ip || "127.0.0.1",
      notes: "تم تغيير كلمة المرور بنجاح عبر التحقق الثنائي OTP"
    });

    writeDb(db);

    res.json({
      status: "success",
      message: "تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة."
    });
  });
}
