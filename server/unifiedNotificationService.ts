/**
 * Unified Central Notification Engine (Email & WhatsApp Multi-Channel Service)
 * جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 */

import { sendCentralEmail } from "./emailService";
import { sendWhatsAppMessage, formatToWhatsAppE164, WhatsAppConfig } from "./whatsappService";

export interface UnifiedNotificationPayload {
  recipient: {
    name?: string;
    email?: string;
    phone?: string;
    userId?: string;
  };
  channel?: 'email' | 'whatsapp' | 'both' | 'auto';
  type: 'otp' | 'beneficiary_aid_ready' | 'volunteer_status' | 'admin_alert' | 'warehouse_order' | 'reminder' | 'general';
  title: string;
  body: string;
  templateType?: string;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UnifiedNotificationResult {
  success: boolean;
  emailResult?: {
    attempted: boolean;
    success: boolean;
    error?: string;
  };
  whatsappResult?: {
    attempted: boolean;
    success: boolean;
    messageId?: string;
    error?: string;
  };
  logs: any[];
}

export async function sendUnifiedNotification(
  db: any,
  payload: UnifiedNotificationPayload
): Promise<UnifiedNotificationResult> {
  const logs: any[] = [];
  const now = new Date().toISOString();
  if (!db.notificationDeliveryLogs) db.notificationDeliveryLogs = [];

  const recipientName = payload.recipient.name || "عزيزنا المستفيد / العضو";
  const recipientEmail = payload.recipient.email ? payload.recipient.email.trim() : "";
  const recipientPhone = payload.recipient.phone ? payload.recipient.phone.trim() : "";

  // Channel determination
  let sendEmail = false;
  let sendWhatsApp = false;

  const reqChannel = payload.channel || 'auto';

  if (reqChannel === 'both') {
    sendEmail = !!(recipientEmail && recipientEmail.includes("@"));
    sendWhatsApp = !!(recipientPhone && recipientPhone.length >= 9);
  } else if (reqChannel === 'email') {
    sendEmail = !!(recipientEmail && recipientEmail.includes("@"));
  } else if (reqChannel === 'whatsapp') {
    sendWhatsApp = !!(recipientPhone && recipientPhone.length >= 9);
  } else {
    // 'auto' mode: prefer WhatsApp if mobile available and enabled, else fallback to email
    const waConfig: WhatsAppConfig = db.whatsappSettings || {};
    if (waConfig.enabled && recipientPhone && recipientPhone.length >= 9) {
      sendWhatsApp = true;
    } else if (recipientEmail && recipientEmail.includes("@")) {
      sendEmail = true;
    }
  }

  const result: UnifiedNotificationResult = {
    success: false,
    emailResult: { attempted: false, success: false },
    whatsappResult: { attempted: false, success: false },
    logs: []
  };

  // 1. Send via Email if selected
  if (sendEmail) {
    result.emailResult!.attempted = true;
    try {
      const emailResp = await sendCentralEmail(db, {
        to: recipientEmail,
        recipientName,
        subject: payload.title,
        templateType: payload.templateType || 'broadcast_general',
        templateData: {
          recipientName,
          title: payload.title,
          message: payload.body,
          ...(payload.templateData || {})
        }
      });

      result.emailResult!.success = emailResp.success;
      if (!emailResp.success) {
        result.emailResult!.error = emailResp.error;
      }

      // Safe masked log
      const maskedEmail = recipientEmail.replace(/(.{2})(.*)(@.*)/, "$1•••$3");
      const logEntry = {
        id: "log-notif-" + Date.now() + "-em",
        recipient: maskedEmail,
        channel: "email",
        type: payload.type,
        status: emailResp.success ? "sent" : "failed",
        provider: emailResp.provider || "smtp",
        error: emailResp.error || null,
        timestamp: now,
        retryCount: 0
      };
      db.notificationDeliveryLogs.unshift(logEntry);
      logs.push(logEntry);
    } catch (err: any) {
      result.emailResult!.success = false;
      result.emailResult!.error = err.message || "فشل إرسال البريد";
    }
  }

  // 2. Send via WhatsApp if selected
  if (sendWhatsApp) {
    result.whatsappResult!.attempted = true;
    const waConfig: WhatsAppConfig = db.whatsappSettings || {};

    try {
      let waBody = payload.body;
      let templateName: string | undefined = undefined;

      if (payload.type === 'otp') {
        templateName = 'auth_otp_code';
      } else if (payload.type === 'beneficiary_aid_ready') {
        templateName = 'beneficiary_aid_ready';
      } else if (payload.type === 'volunteer_status') {
        templateName = 'volunteer_accepted';
      }

      const waResp = await sendWhatsAppMessage(waConfig, {
        to: recipientPhone,
        recipientName,
        templateName,
        messageType: templateName ? 'template' : 'text',
        textBody: `${payload.title}\n\n${payload.body}\n\nمع تحيات جمعية ريادة العطاء لخدمة الإنسان بالعسيلة`,
        templateParameters: payload.templateData || {}
      });

      result.whatsappResult!.success = waResp.success;
      result.whatsappResult!.messageId = waResp.messageId;
      if (!waResp.success) {
        result.whatsappResult!.error = waResp.error;
      }

      // Safe masked log
      const formatted = formatToWhatsAppE164(recipientPhone);
      const maskedPhone = formatted.length > 5 ? `${formatted.substring(0, 4)}••••${formatted.slice(-2)}` : "••••••";
      const logEntry = {
        id: "log-notif-" + Date.now() + "-wa",
        recipient: maskedPhone,
        channel: "whatsapp",
        type: payload.type,
        status: waResp.status,
        provider: waResp.provider,
        messageId: waResp.messageId,
        error: waResp.error || null,
        timestamp: now,
        retryCount: 0
      };
      db.notificationDeliveryLogs.unshift(logEntry);
      logs.push(logEntry);
    } catch (err: any) {
      result.whatsappResult!.success = false;
      result.whatsappResult!.error = err.message || "فشل إرسال الواتساب";
    }
  }

  // Success if any attempted channel succeeded
  result.success = (result.emailResult?.success || false) || (result.whatsappResult?.success || false);
  result.logs = logs;

  return result;
}
