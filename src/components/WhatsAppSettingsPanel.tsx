import React, { useState, useEffect } from "react";
import { 
  MessageSquare, Shield, CheckCircle2, AlertCircle, RefreshCw, 
  Send, Key, Phone, Settings, ToggleLeft, ToggleRight, 
  ExternalLink, Copy, Check, Clock, Server, FileText, 
  Bell, Database, ShieldAlert, Sparkles, Filter, ChevronDown
} from "lucide-react";

interface WhatsAppSettingsData {
  enabled: boolean;
  provider: string;
  officialPhoneNumber: string;
  wabaId: string;
  phoneNumberId: string;
  webhookVerifyToken: string;
  webhookUrl: string;
  isTokenConfigured: boolean;
  tokenMasked: string;
  status: 'connected' | 'disconnected' | 'error';
  lastCheckedAt?: string | null;
  lastError?: string | null;
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
    category: string;
    status: string;
    bodyAr: string;
  }[];
  retrySettings: {
    maxRetries: number;
    backoffMs: number;
  };
}

export interface WhatsAppSettingsPanelProps {
  isDark?: boolean;
}

export const WhatsAppSettingsPanel: React.FC<WhatsAppSettingsPanelProps> = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<WhatsAppSettingsData | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'templates' | 'logs'>('config');

  // Form edit states
  const [enabled, setEnabled] = useState(false);
  const [officialPhone, setOfficialPhone] = useState("966550123456");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [newToken, setNewToken] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState("");
  const [allowedTypes, setAllowedTypes] = useState({
    otp: true,
    beneficiaryAid: true,
    volunteerStatus: true,
    hrNotice: true,
    adminNotice: true,
    warehouseNotice: true,
    reminders: true
  });

  // Action feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Test Message Dialog
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [sendTestResult, setSendTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/whatsapp/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings(data.settings);
          setEnabled(data.settings.enabled);
          setOfficialPhone(data.settings.officialPhoneNumber || "966550123456");
          setPhoneNumberId(data.settings.phoneNumberId || "");
          setWabaId(data.settings.wabaId || "");
          setWebhookVerifyToken(data.settings.webhookVerifyToken || "reyadat_alata_wa_verify_2026");
          if (data.settings.allowedNotificationTypes) {
            setAllowedTypes(data.settings.allowedNotificationTypes);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load WhatsApp settings:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Logs
  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch("/api/notifications/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch notification logs:", err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload: any = {
        enabled,
        officialPhoneNumber: officialPhone,
        phoneNumberId,
        wabaId,
        webhookVerifyToken,
        allowedNotificationTypes: allowedTypes
      };

      if (newToken.trim()) {
        payload.accessToken = newToken.trim();
      }

      const res = await fetch("/api/whatsapp/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveSuccess(true);
        setNewToken("");
        await fetchSettings();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Error saving WhatsApp settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/whatsapp/test-connection", {
        method: "POST"
      });
      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? "الاتصال ناجح" : "فشل التحقق")
      });
      await fetchSettings();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: "تعذر إتمام اختبار الاتصال بالخادم."
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Send Test Message
  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;

    setIsSendingTest(true);
    setSendTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: testPhone.trim(),
          message: testMessage.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSendTestResult({
          success: true,
          message: data.status === 'simulated'
            ? "تم الإرسال عبر محاكي الإشعارات الآمن (الخدمة تعمل في وضع المحاكاة حتى توفير مفتاح Meta)."
            : "تم إرسال رسالة الاختبار بنجاح عبر Meta Cloud API!"
        });
        fetchLogs();
      } else {
        setSendTestResult({
          success: false,
          message: data.error || "فشل إرسال رسالة الاختبار."
        });
      }
    } catch (err: any) {
      setSendTestResult({
        success: false,
        message: "حدث خطأ في الاتصال بالخادم."
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-white dark:bg-neutral-800 rounded-3xl border border-neutral-200 dark:border-neutral-700">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-2" />
        <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400">جاري تحميل إعدادات واتساب والإشعارات...</p>
      </div>
    );
  }

  const isConnected = settings?.status === 'connected' && settings?.isTokenConfigured;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
            <MessageSquare className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                إعدادات واتساب والإشعارات المركزية
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/30 border border-emerald-300/40 text-emerald-200">
                Meta Cloud API المعتمدة
              </span>
            </div>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-xl">
              إدارة قناة WhatsApp Business Platform الرسمية، التحقق من Webhook، ربط القوالب، وتوحيد قنوات الإرسال للبريد والواتساب مع الحماية الأمنية للأسرار.
            </p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2.5 bg-black/25 px-4 py-2.5 rounded-2xl border border-white/15 shrink-0">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? 'bg-emerald-400 animate-pulse' : settings?.status === 'error' ? 'bg-rose-400' : 'bg-neutral-400'
          }`} />
          <div className="text-right">
            <p className="text-[10px] text-emerald-200 font-mono">حالة خدمة واتساب:</p>
            <p className="text-xs font-black">
              {isConnected ? "متصل ومعتمد (Connected)" : settings?.status === 'error' ? "يوجد خطأ في الربط (Error)" : "غير متصل (Disconnected)"}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'config'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>إعدادات الربط والمفاتيح</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'templates'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>قوالب الرسائل المعتمدة ({settings?.approvedTemplates?.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('logs'); fetchLogs(); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'logs'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل الإشعارات والإرسال ({logs.length})</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: CONFIGURATION & CREDENTIALS                                  */}
      {/* =================================================================== */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveSettings} className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-neutral-200/90 dark:border-neutral-700 shadow-xs space-y-6">
              
              {/* Channel Enable Toggle (Without disabling Email) */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200">
                    تفعيل قناة واتساب في النظام
                  </h4>
                  <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80">
                    يمكن تفعيل أو تعطيل واتساب دون التأثير على عمل خدمة البريد الإلكتروني الأساسية.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className="cursor-pointer focus:outline-none"
                >
                  {enabled ? (
                    <ToggleRight className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-neutral-400" />
                  )}
                </button>
              </div>

              {/* Provider Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    مزود الخدمة المعتمد:
                  </label>
                  <select 
                    value={settings?.provider || 'meta_cloud_api'}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-bold"
                  >
                    <option value="meta_cloud_api">WhatsApp Cloud API (Meta Official)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    رقم واتساب الرسمي للجمعية:
                  </label>
                  <input
                    type="text"
                    value={officialPhone}
                    onChange={(e) => setOfficialPhone(e.target.value)}
                    placeholder="966550123456"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-mono text-left"
                    dir="ltr"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    Phone Number ID (معرّف رقم الهاتف):
                  </label>
                  <input
                    type="text"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    placeholder="e.g. 109283746501928"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                    WABA ID (معرّف حساب واتساب للأعمال):
                  </label>
                  <input
                    type="text"
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    placeholder="e.g. 100293847561029"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Secure Token Configuration */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-emerald-600" />
                    <label className="text-xs font-black text-neutral-800 dark:text-neutral-200">
                      رمز الوصول السري (Meta Permanent Access Token)
                    </label>
                  </div>
                  {settings?.isTokenConfigured && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                      محفوظ ومحمي ({settings.tokenMasked})
                    </span>
                  )}
                </div>

                <input
                  type="password"
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder={settings?.isTokenConfigured ? "أدخل مفتاحاً جديداً لاستبدال الحالي، أو اتركه فارغاً" : "EAAB..."}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-mono text-left"
                  dir="ltr"
                />

                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                  <Shield className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>متطلبات الأمان الصارمة:</strong> المفاتيح لا تُحفظ في LocalStorage ولا تظهر في كود الواجهة. للنشر المستدام على Render، يوصى بإضافة المتغيرات: <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">WHATSAPP_ACCESS_TOKEN</code> و <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono font-bold">WHATSAPP_PHONE_NUMBER_ID</code> في لوحة Render.
                  </span>
                </div>
              </div>

              {/* Webhook Configuration */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-emerald-600" />
                    <span>رابط الـ Webhook ورمز التحقق (Meta Callback)</span>
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">Webhook Callback URL:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={settings?.webhookUrl || `${window.location.origin}/api/whatsapp/webhook`}
                      className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 text-left"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(settings?.webhookUrl || `${window.location.origin}/api/whatsapp/webhook`)}
                      className="px-3 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWebhook ? "تم النسخ" : "نسخ"}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-neutral-500 mb-1">Verify Token (رمز التحقق المطابق في Meta):</label>
                  <input
                    type="text"
                    value={webhookVerifyToken}
                    onChange={(e) => setWebhookVerifyToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 font-mono text-[11px] text-neutral-700 dark:text-neutral-300 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Notification Types Allowed */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-neutral-800 dark:text-neutral-200">
                  أنواع الإشعارات المسموح بإرسالها عبر واتساب:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    { key: 'otp', label: 'رموز التحقق واستعادة الحساب (OTP)' },
                    { key: 'beneficiaryAid', label: 'إشعارات جاهزية واستلام المساعدات للمستفيدين' },
                    { key: 'volunteerStatus', label: 'إشعارات قبول وانضمام المتطوعين' },
                    { key: 'hrNotice', label: 'إشعارات الموظفين والشؤون الإدارية' },
                    { key: 'warehouseNotice', label: 'إشعارات طلبات المستودع والصرف' },
                    { key: 'reminders', label: 'التذكيرات والتعاميم الميدانية العامة' },
                  ].map((item) => (
                    <label 
                      key={item.key} 
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50 hover:bg-emerald-50/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={(allowedTypes as any)[item.key]}
                        onChange={(e) => setAllowedTypes({ ...allowedTypes, [item.key]: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-neutral-700 dark:text-neutral-300 text-[11px]">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center gap-2">
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم حفظ التغييرات بنجاح</span>
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                  <span>{isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Side Actions (1 col): Test Connection & Test Send */}
          <div className="space-y-6">
            
            {/* Box 1: Test Connection */}
            <div className="bg-white dark:bg-neutral-800 rounded-3xl p-5 border border-neutral-200/90 dark:border-neutral-700 shadow-xs space-y-4">
              <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                <span>اختبار صحة الربط مع Meta</span>
              </h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                يتحقق هذا الاختبار من صحة Access Token و Phone Number ID عبر استعلام مباشر لخوادم Meta Graph API.
              </p>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>{isTesting ? "جاري الفحص المباشر..." : "اختبار الاتصال بالخادم"}</span>
              </button>

              {testResult && (
                <div className={`p-3 rounded-2xl text-xs leading-relaxed flex items-start gap-2 ${
                  testResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200'
                }`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Box 2: Send Live Test Message */}
            <form onSubmit={handleSendTestMessage} className="bg-white dark:bg-neutral-800 rounded-3xl p-5 border border-neutral-200/90 dark:border-neutral-700 shadow-xs space-y-4">
              <h4 className="text-xs font-black text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <span>إرسال رسالة اختبارية إلى رقم محدد</span>
              </h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                أدخل رقم جوال مخول لتجربة الإرسال المباشر للواتساب والتأكد من وصول الإشعار.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  رقم الهاتف (بالصيغة الدولية):
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="0550123456 أو 966550123456"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs font-mono text-left"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                  نص الرسالة (اختياري):
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="رسالة اختبارية من جمعية ريادة العطاء..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingTest || !testPhone.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingTest ? "جاري الإرسال..." : "إرسال رسالة الاختبار"}</span>
              </button>

              {sendTestResult && (
                <div className={`p-3 rounded-2xl text-xs leading-relaxed flex items-start gap-2 ${
                  sendTestResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200'
                }`}>
                  {sendTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{sendTestResult.message}</span>
                </div>
              )}
            </form>

          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: APPROVED MESSAGE TEMPLATES                                   */}
      {/* =================================================================== */}
      {activeTab === 'templates' && (
        <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-neutral-200/90 dark:border-neutral-700 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700 pb-4">
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white">
                قوالب رسائل واتساب الرسمية المعتمدة لدى Meta
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                تتطلب سياسة Meta استخدام قوالب معتمدة مسبقاً للرسائل التي تبدأها الجمعية (Business-Initiated Messages).
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
              {settings?.approvedTemplates?.length || 0} قوالب جاهزة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(settings?.approvedTemplates || []).map((tmpl) => (
              <div 
                key={tmpl.id} 
                className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">
                    {tmpl.name}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200">
                    {tmpl.status === 'APPROVED' ? 'معتمد (APPROVED)' : tmpl.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
                  <span>التصنيف: {tmpl.category}</span>
                  <span>•</span>
                  <span>اللغة: {tmpl.language}</span>
                </div>

                <div className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/80 dark:border-neutral-700 font-mono text-[11px] leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  {tmpl.bodyAr}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: NOTIFICATION & DELIVERY LOGS                                 */}
      {/* =================================================================== */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-neutral-800 rounded-3xl p-6 border border-neutral-200/90 dark:border-neutral-700 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-4">
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>سجل الإشعارات المركزية وحالات التسليم</span>
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                يتم تسجيل جميع عمليات الإرسال للبريد وواتساب مع تمويه البيانات الحساسة وحجب رموز التحقق.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchLogs}
              disabled={logsLoading}
              className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
              <span>تحديث السجل</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-bold">لا توجد سجلات إشعارات مرسلة حتى الآن.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700 text-neutral-500 text-[11px]">
                    <th className="py-2.5 px-3">القناة</th>
                    <th className="py-2.5 px-3">نوع الإشعار</th>
                    <th className="py-2.5 px-3">الوجهة (مموه)</th>
                    <th className="py-2.5 px-3">الحالة</th>
                    <th className="py-2.5 px-3">التاريخ والوقت</th>
                    <th className="py-2.5 px-3">ملاحظات / خطأ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-750">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-750/50">
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.channel === 'whatsapp' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {log.channel === 'whatsapp' ? 'واتساب' : 'البريد'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-bold text-neutral-800 dark:text-neutral-200">
                        {log.type === 'otp' ? 'رمز تحقق (OTP)' :
                         log.type === 'beneficiary_aid_ready' ? 'جاهزية مساعدة' :
                         log.type === 'volunteer_status' ? 'قبول متطوع' :
                         log.type === 'admin_test' ? 'رسالة اختبار' : log.type}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-neutral-600 dark:text-neutral-400" dir="ltr">
                        {log.recipient}
                      </td>

                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          log.status === 'sent' || log.status === 'delivered' || log.status === 'simulated'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {log.status === 'simulated' ? 'محاكاة ناجحة' :
                           log.status === 'sent' ? 'تم الإرسال' :
                           log.status === 'delivered' ? 'تم التسليم' : 'فشل'}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px] font-mono text-neutral-500">
                        {new Date(log.timestamp).toLocaleString('ar-SA')}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-neutral-500 max-w-xs truncate">
                        {log.error || (log.messageId ? `Message ID: ${log.messageId}` : '-')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppSettingsPanel;
