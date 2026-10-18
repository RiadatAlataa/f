/**
 * WhatsApp Business Platform Service (Meta Cloud API Official Integration)
 * جمعية ريادة العطاء لخدمة الإنسان بالعسيلة
 */

export interface WhatsAppConfig {
  enabled: boolean;
  provider: 'meta_cloud_api' | 'custom_provider' | 'simulation';
  officialPhoneNumber: string;
  wabaId?: string;
  phoneNumberId?: string;
  accessToken?: string;
  webhookVerifyToken?: string;
  webhookUrl?: string;
  status: 'connected' | 'disconnected' | 'error';
  lastCheckedAt?: string;
  lastError?: string;
  allowedNotificationTypes: {
    otp: boolean;
    beneficiaryAid: boolean;
    volunteerStatus: boolean;
    hrNotice: boolean;
    adminNotice: boolean;
    warehouseNotice: boolean;
    reminders: boolean;
  };
  approvedTemplates: {
    id: string;
    name: string;
    language: string;
    category: 'AUTHENTICATION' | 'UTILITY' | 'MARKETING';
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    bodyAr: string;
  }[];
  retrySettings: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface WhatsAppSendPayload {
  to: string; // E.164 phone number, e.g. "966550123456"
  recipientName?: string;
  templateName?: string;
  templateCategory?: string;
  messageType?: 'template' | 'text';
  textBody?: string;
  templateParameters?: Record<string, any>;
  notificationType?: 'otp' | 'beneficiary_aid' | 'volunteer' | 'admin' | 'hr' | 'general';
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  status: 'sent' | 'delivered' | 'failed' | 'simulated';
  error?: string;
  timestamp: string;
  provider: string;
}

// Default Configuration with Official Non-Profit Parameters
export const defaultWhatsAppConfig: WhatsAppConfig = {
  enabled: false,
  provider: 'meta_cloud_api',
  officialPhoneNumber: "966550123456",
  wabaId: "",
  phoneNumberId: "",
  accessToken: "",
  webhookVerifyToken: "reyadat_alata_wa_verify_2026",
  webhookUrl: "/api/whatsapp/webhook",
  status: 'disconnected',
  allowedNotificationTypes: {
    otp: true,
    beneficiaryAid: true,
    volunteerStatus: true,
    hrNotice: true,
    adminNotice: true,
    warehouseNotice: true,
    reminders: true
  },
  approvedTemplates: [
    {
      id: "tpl_otp",
      name: "auth_otp_code",
      language: "ar",
      category: "AUTHENTICATION",
      status: "APPROVED",
      bodyAr: "رمز التحقق الخاص بحسابكم في جمعية ريادة العطاء هو: {{otp_code}}. الرمز صالح لمدة 10 دقائق ولا تشاركه مع أي شخص."
    },
    {
      id: "tpl_aid_ready",
      name: "beneficiary_aid_ready",
      language: "ar",
      category: "UTILITY",
      status: "APPROVED",
      bodyAr: "السلام عليكم {{name}}، نفيدكم بجاهزية المساعدة المخصصة لكم ({{aid_title}}) للاستلام الفوري في ({{location}}). رقم الطلب: {{dist_number}}."
    },
    {
      id: "tpl_volunteer_accept",
      name: "volunteer_accepted",
      language: "ar",
      category: "UTILITY",
      status: "APPROVED",
      bodyAr: "مرحباً {{name}}، تم قبول طلب انضمامكم إلى ({{team_name}}) في جمعية ريادة العطاء. يمكنكم الدخول للبدء في المبادرات التطوعية."
    },
    {
      id: "tpl_admin_notice",
      name: "admin_urgent_notification",
      language: "ar",
      category: "UTILITY",
      status: "APPROVED",
      bodyAr: "إشعار إداري عاجل من جمعية ريادة العطاء: {{message}}."
    }
  ],
  retrySettings: {
    maxRetries: 3,
    backoffMs: 3000
  }
};

/**
 * Standardize Saudi & International Phone Numbers into E.164 format (e.g. 0550123456 -> 966550123456)
 */
export function formatToWhatsAppE164(phone: string): string {
  if (!phone) return "";
  let clean = phone.replace(/[^0-9]/g, "");
  if (clean.startsWith("00")) {
    clean = clean.substring(2);
  }
  if (clean.startsWith("05")) {
    clean = "966" + clean.substring(1);
  } else if (clean.startsWith("5") && clean.length === 9) {
    clean = "966" + clean;
  }
  return clean;
}

/**
 * Test WhatsApp API credentials with Meta Graph API
 */
export async function testWhatsAppConnection(config: Partial<WhatsAppConfig>): Promise<{ success: boolean; message: string; details?: any }> {
  const token = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return {
      success: false,
      message: "بيانات الربط غير مكتملة. يرجى توفير Access Token و Phone Number ID من Meta for Developers."
    };
  }

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}?fields=verified_name,display_phone_number,quality_rating`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (res.ok && !data.error) {
      return {
        success: true,
        message: `تم التحقق بنجاح! رقم الواتساب: ${data.display_phone_number || config.officialPhoneNumber} (اسم الحساب: ${data.verified_name || 'جمعية ريادة العطاء'})`,
        details: data
      };
    } else {
      return {
        success: false,
        message: `خطأ من Meta WhatsApp API: ${data.error?.message || "تعذر التحقق من بيانات الربط"}`,
        details: data.error
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `تعذر الاتصال بخادم Meta: ${err.message || "خطأ في الشبكة"}`
    };
  }
}

/**
 * Send a WhatsApp Message via Meta Cloud API or Safe Simulated Queue
 */
export async function sendWhatsAppMessage(
  config: Partial<WhatsAppConfig>,
  payload: WhatsAppSendPayload
): Promise<WhatsAppSendResult> {
  const timestamp = new Date().toISOString();
  const formattedPhone = formatToWhatsAppE164(payload.to);

  if (!formattedPhone || formattedPhone.length < 10) {
    return {
      success: false,
      status: "failed",
      error: "رقم الهاتف غير صالح للإرسال عبر واتساب.",
      timestamp,
      provider: config.provider || "meta_cloud_api"
    };
  }

  const token = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;

  // If live credentials are not yet configured or disabled, simulate delivery without breaking workflows
  if (!config.enabled || !token || !phoneId) {
    console.log(`[WhatsApp Simulation] To: ${formattedPhone} | Content: ${payload.textBody || payload.templateName || 'Message'}`);
    return {
      success: true,
      messageId: "wa-sim-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      status: "simulated",
      timestamp,
      provider: "simulation"
    };
  }

  // Live Meta WhatsApp Business Cloud API Call
  try {
    const endpoint = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    let requestBody: any;

    if (payload.messageType === 'template' && payload.templateName) {
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: {
          name: payload.templateName,
          language: { code: "ar" },
          components: payload.templateParameters ? [
            {
              type: "body",
              parameters: Object.values(payload.templateParameters).map(val => ({
                type: "text",
                text: String(val)
              }))
            }
          ] : []
        }
      };
    } else {
      // Freeform Text Message (Standard Meta WhatsApp format for customer-initiated sessions or tests)
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          preview_url: false,
          body: payload.textBody || `إشعار من جمعية ريادة العطاء لخدمة الإنسان بالعسيلة: ${payload.templateName || ''}`
        }
      };
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (response.ok && data.messages && data.messages[0]) {
      return {
        success: true,
        messageId: data.messages[0].id,
        status: "sent",
        timestamp,
        provider: "meta_cloud_api"
      };
    } else {
      const errMsg = data.error?.message || "فشل إرسال رسالة الواتساب عبر Meta Cloud API";
      return {
        success: false,
        status: "failed",
        error: errMsg,
        timestamp,
        provider: "meta_cloud_api"
      };
    }
  } catch (err: any) {
    return {
      success: false,
      status: "failed",
      error: err.message || "خطأ أثناء الاتصال بواجهة برمجة تطبيقات واتساب",
      timestamp,
      provider: "meta_cloud_api"
    };
  }
}
