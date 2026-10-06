import React from "react";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

export interface DashboardErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
  fallbackTitle?: string;
  onReset?: () => void;
  key?: React.Key;
}

interface DashboardErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  componentName: string | null;
  retryCount: number;
}

// Helper to sanitize sensitive information (passwords, tokens, keys) before logging
function sanitizeErrorData(text: string | null | undefined): string | null {
  if (!text) return null;
  return text
    .replace(/(password|pwd|pass|token|sessionToken|secret|key)=([^& \n\r]+)/gi, "$1=[REDACTED]")
    .replace(/(bearer\s+)([A-Za-z0-9_\-\.]+)/gi, "$1[REDACTED]")
    .replace(/("password"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
    .replace(/("token"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"')
    .replace(/("sessionToken"\s*:\s*)"[^"]+"/gi, '$1"[REDACTED]"');
}

export class DashboardErrorBoundary extends (React.Component as any) {
  public declare props: DashboardErrorBoundaryProps;
  public declare state: DashboardErrorBoundaryState;
  public declare setState: (state: Partial<DashboardErrorBoundaryState> | ((prevState: DashboardErrorBoundaryState) => Partial<DashboardErrorBoundaryState>), callback?: () => void) => void;

  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      componentName: null,
      retryCount: 0
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<DashboardErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    return { hasError: true, error, errorId };
  }

  public componentDidCatch(error: Error, errorInfo: any) {
    const errorId = this.state.errorId || `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    // Extract originating component name from React component stack
    let componentName = "Unknown";
    try {
      const match = errorInfo?.componentStack?.match(/at\s+([A-Za-z0-9_]+)/);
      if (match && match[1]) {
        componentName = match[1];
      }
    } catch {}

    this.setState({ componentName });

    // Log securely to developer console
    console.error(`[DashboardErrorBoundary] Captured error in [${this.props.pageName || 'Unknown Page'}] at Component <${componentName}>:`, error, errorInfo);

    // Sanitize and dispatch error report to server logs
    try {
      const sanitizedUrl = sanitizeErrorData(window.location.href) || "";
      const sanitizedMessage = sanitizeErrorData(error?.message || "Unknown error") || "";
      const sanitizedStack = sanitizeErrorData(error?.stack || null);
      const sanitizedCompStack = sanitizeErrorData(errorInfo?.componentStack || null);

      fetch("/api/logs/developer-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          errorId,
          pageName: this.props.pageName || "لوحة التحكم",
          componentName,
          message: sanitizedMessage,
          stack: sanitizedStack,
          componentStack: sanitizedCompStack,
          timestamp: new Date().toISOString(),
          url: sanitizedUrl,
          userAgent: navigator.userAgent
        })
      }).catch(() => {
        // Silently catch fetch failure
      });
    } catch {
      // Ignore
    }
  }

  private handleRetry = () => {
    const currentRetries = this.state.retryCount + 1;
    
    // Check if session in localStorage is expired or invalid
    try {
      const sessionRaw = localStorage.getItem("reyadat_auth_session");
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session.timestamp && Date.now() - session.timestamp > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem("reyadat_auth_session");
          window.location.reload();
          return;
        }
      }
    } catch {}

    // If repeated errors occur, clear transient subtab/filters to prevent infinite crash loops
    if (currentRetries >= 2) {
      try {
        localStorage.removeItem("reyadat_admin_subtab");
        localStorage.removeItem("reyadat_inventory_tab");
        localStorage.removeItem("reyadat_beneficiaries_tab");
      } catch {}
    }

    this.setState({ 
      hasError: false, 
      error: null, 
      errorId: null, 
      componentName: null,
      retryCount: currentRetries 
    });

    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch {}
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorId: null, retryCount: 0 });
    try {
      localStorage.removeItem("reyadat_admin_subtab");
      localStorage.removeItem("reyadat_inventory_tab");
      localStorage.removeItem("reyadat_beneficiaries_tab");
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] p-6 sm:p-10 flex items-center justify-center text-right font-sans" dir="rtl">
          <div className="max-w-xl w-full bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fade-in">
            {/* Header Icon & Title */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 text-amber-600 shadow-sm">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {this.props.fallbackTitle || "حدث خطأ أثناء تحميل الصفحة، يرجى المحاولة مرة أخرى."}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  نظام حماية الواجهة منع انهيار الشاشة. تم تسجيل تفاصيل الخطأ بأمان في سجل المطورين برقم تتبع خاص:
                </p>
                {this.state.errorId && (
                  <span className="inline-block mt-1 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    رمز التتبع: {this.state.errorId}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة محاولة التحميل</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>العودة للرئيسية والتهيئة</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
