/**
 * Central API Configuration & Dynamic Backend Resolver
 * 
 * Supports:
 * - Vercel Serverless (relative URLs by default)
 * - Render / Cloud Run / VPS external backend (via VITE_API_URL or runtime setting)
 * - Custom domain proxy & SSL
 * - Automatic fetch interception for transparent prefixing
 * - Graceful health checking with Content-Type & JSON validation (prevents "Unexpected token 'T'")
 */

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('reyadat_api_url');
      if (stored && stored.trim()) {
        return stored.trim().replace(/\/+$/, '');
      }
    } catch {}
    if ((window as any).__API_URL__) {
      return String((window as any).__API_URL__).trim().replace(/\/+$/, '');
    }
  }

  const envUrl = (
    import.meta.env.VITE_API_URL || 
    import.meta.env.VITE_BACKEND_URL || 
    import.meta.env.VITE_API_BASE_URL || 
    ''
  );

  return envUrl ? envUrl.trim().replace(/\/+$/, '') : '';
};

export const setApiBaseUrl = (url: string) => {
  if (typeof window !== 'undefined') {
    try {
      if (!url || !url.trim()) {
        localStorage.removeItem('reyadat_api_url');
      } else {
        localStorage.setItem('reyadat_api_url', url.trim().replace(/\/+$/, ''));
      }
    } catch {}
  }
};

/**
 * Builds a complete API URL from a relative path
 */
export const buildApiUrl = (endpoint: string, overrideBaseUrl?: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const base = overrideBaseUrl !== undefined ? overrideBaseUrl.replace(/\/+$/, '') : getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!base) {
    return cleanEndpoint;
  }
  return `${base}${cleanEndpoint}`;
};

export interface HealthCheckResult {
  ok: boolean;
  httpStatus: number;
  statusText: string;
  isJson: boolean;
  url: string;
  data?: any;
  rawText?: string;
  errorMessage?: string;
  service?: string;
  environment?: string;
  uptimeSeconds?: number;
}

/**
 * Performs a robust diagnostic health check against /api/health and /api/health/
 * Prevents "Unexpected token 'T'" errors by inspecting Content-Type first
 */
export const checkHealthEndpoint = async (targetBaseUrl?: string): Promise<HealthCheckResult> => {
  const primaryUrl = buildApiUrl('/api/health', targetBaseUrl);
  const fallbackUrl = buildApiUrl('/api/health/', targetBaseUrl);
  
  const testUrl = async (url: string): Promise<HealthCheckResult | null> => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json'
        }
      });

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const isJson = contentType.includes('application/json');

      if (!res.ok) {
        let rawText = '';
        let errorMsg = `فشل في الاتصال بالخادم الرئيسي (رمز الاستجابة ${res.status}: ${res.statusText || 'Not Found'})`;
        
        if (isJson) {
          try {
            const jsonBody = await res.json();
            rawText = JSON.stringify(jsonBody);
            errorMsg = jsonBody.message || jsonBody.error || errorMsg;
          } catch {
            rawText = await res.text().catch(() => '');
          }
        } else {
          rawText = await res.text().catch(() => '');
          // Extract title or text snippet from HTML for clear user understanding
          const titleMatch = rawText.match(/<title[^>]*>([^<]+)<\/title>/i);
          const pageTitle = titleMatch ? titleMatch[1].trim() : '';
          const cleanSnippet = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
          
          if (pageTitle) {
            errorMsg += ` - تم استلام صفحة ويب بعنوان: "${pageTitle}" بدلاً من استجابة JSON.`;
          } else if (cleanSnippet) {
            errorMsg += ` - المحتوى المستلم (HTML/Text): "${cleanSnippet}"`;
          } else {
            errorMsg += ` - تم استلام محتوى (${contentType || 'HTML/Text'}) بدلاً من استجابة JSON.`;
          }
        }

        return {
          ok: false,
          httpStatus: res.status,
          statusText: res.statusText,
          isJson,
          url,
          rawText,
          errorMessage: errorMsg
        };
      }

      if (!isJson) {
        const rawText = await res.text().catch(() => '');
        return {
          ok: false,
          httpStatus: res.status,
          statusText: res.statusText,
          isJson: false,
          url,
          rawText,
          errorMessage: `الخادم أعاد كود 200 بنجاح لكن نوع المحتوى (${contentType}) ليس JSON. يرجى التحقق من توجيه المسار إلى الخادم الصحيح.`
        };
      }

      const data = await res.json();
      return {
        ok: true,
        httpStatus: res.status,
        statusText: res.statusText,
        isJson: true,
        url,
        data,
        service: data.service || data.message,
        environment: data.environment,
        uptimeSeconds: data.uptimeSeconds
      };
    } catch (err: any) {
      return {
        ok: false,
        httpStatus: 0,
        statusText: 'Network / CORS Error',
        isJson: false,
        url,
        errorMessage: err.message || 'تعذر الاتصال بالخادم عبر الشبكة. يرجى التأكد من تشغيل الخادم وصلاحية شهادة SSL وإعدادات CORS.'
      };
    }
  };

  // Test primary URL (/api/health)
  const primaryResult = await testUrl(primaryUrl);
  if (primaryResult && primaryResult.ok) {
    return primaryResult;
  }

  // If primary returned 404, try fallback with trailing slash (/api/health/)
  if (primaryResult && primaryResult.httpStatus === 404) {
    const fallbackResult = await testUrl(fallbackUrl);
    if (fallbackResult && fallbackResult.ok) {
      return fallbackResult;
    }
    // Return primary failure with full context
    return primaryResult;
  }

  return primaryResult || {
    ok: false,
    httpStatus: 0,
    statusText: 'Unknown Error',
    isJson: false,
    url: primaryUrl,
    errorMessage: 'حدث خطأ غير متوقع أثناء فحص نقطة نهاية الصحة'
  };
};

/**
 * Installs a global fetch interceptor in the browser so that any relative API call (e.g. fetch('/api/db'))
 * is transparently rewritten to use getApiBaseUrl() if configured (e.g. on Render).
 */
export const installGlobalFetchInterceptor = () => {
  if (typeof window === 'undefined') return;
  if ((window as any).__reyadat_fetch_installed__) return;
  (window as any).__reyadat_fetch_installed__ = true;

  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let resolvedInput = input;

    if (typeof input === 'string') {
      if (input.startsWith('/api/') || input === '/api') {
        const baseUrl = getApiBaseUrl();
        if (baseUrl) {
          resolvedInput = `${baseUrl}${input}`;
        }
      }
    } else if (input instanceof URL) {
      if (input.pathname.startsWith('/api')) {
        const baseUrl = getApiBaseUrl();
        if (baseUrl) {
          resolvedInput = new URL(`${baseUrl}${input.pathname}${input.search}`);
        }
      }
    }

    return originalFetch.call(this, resolvedInput, init);
  };
};

// Auto-install fetch interceptor on import
if (typeof window !== 'undefined') {
  installGlobalFetchInterceptor();
}
