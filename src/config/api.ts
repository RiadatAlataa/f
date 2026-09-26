/**
 * Central API Configuration & Dynamic Backend Resolver
 * 
 * Supports:
 * - Vercel Serverless (relative URLs by default)
 * - Render / Cloud Run / VPS external backend (via VITE_API_URL or runtime setting)
 * - Custom domain proxy & SSL
 * - Strict sanitization (strips duplicate /api and /api/health)
 * - Automatic fetch interception for transparent prefixing
 * - Graceful health checking with Content-Type & JSON validation (prevents "Unexpected token 'T'")
 * - Accurate HTTP status mapping (prevents "500 Not Found" mislabeling)
 */

/**
 * Standard HTTP Status Code descriptions in Arabic and English
 */
export const getHttpStatusDescription = (status: number, originalStatusText?: string): string => {
  if (originalStatusText && originalStatusText.trim() && originalStatusText.trim() !== 'OK' && originalStatusText.trim() !== 'Not Found') {
    return originalStatusText.trim();
  }
  switch (status) {
    case 200: return 'OK (200 - نجاح الاتصال)';
    case 201: return 'Created (201 - تم الإنشاء)';
    case 204: return 'No Content (204 - لا يوجد محتوى)';
    case 400: return 'Bad Request (400 - طلب غير صالح)';
    case 401: return 'Unauthorized (401 - غير مصرح)';
    case 403: return 'Forbidden (403 - وصول مرفوض)';
    case 404: return 'Not Found (404 - المسار غير موجود)';
    case 405: return 'Method Not Allowed (405 - الطريقة غير مسموحة)';
    case 408: return 'Request Timeout (408 - انتهاء مهلة الطلب)';
    case 429: return 'Too Many Requests (429 - تجاوز معدل الطلبات)';
    case 500: return 'Internal Server Error (500 - خطأ داخلي في خادم التطبيق)';
    case 502: return 'Bad Gateway (502 - تعذر الاتصال بالخادم الوسيط)';
    case 503: return 'Service Unavailable (503 - الخدمة غير متوفرة أو قيد الإقلاع)';
    case 504: return 'Gateway Timeout (504 - انتهاء مهلة استجابة الخادم)';
    default: return status ? `HTTP ${status}` : 'Network / Connection Error (خطأ شبكة)';
  }
};

/**
 * Cleans and sanitizes a user-provided Backend URL:
 * - Trims whitespace
 * - Ensures valid URL syntax
 * - Strips trailing slashes
 * - Strips trailing /api/health or /api/health/
 * - Strips trailing /api or /api/
 * - Enforces HTTPS in production
 * - Prevents double `/api` or `/api/health` in subsequent calls
 */
export const sanitizeApiBaseUrl = (rawUrl: string): { cleanUrl: string; error?: string } => {
  if (!rawUrl || !rawUrl.trim()) {
    return { cleanUrl: '' };
  }
  let url = rawUrl.trim();

  // If user pasted without protocol, auto-prefix https://
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  // Validate URL structure
  try {
    const parsed = new URL(url);

    // Enforce HTTPS in production / non-localhost environments
    const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname.endsWith('.localhost');
    const isClientHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    
    if (isClientHttps && parsed.protocol === 'http:' && !isLocalhost) {
      return {
        cleanUrl: '',
        error: 'يجب استخدام بروتوكول مشفر آمن (HTTPS) لأن الموقع يعمل عبر اتصال مشفر، والمتصفحات تمنع خلط المحتوى غير المشفر (Mixed Content).'
      };
    }

    // Clean pathname: strip trailing /api/health, /api/health/, /api, /api/
    let cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (cleanPath.endsWith('/api/health')) {
      cleanPath = cleanPath.slice(0, -'/api/health'.length);
    } else if (cleanPath.endsWith('/api')) {
      cleanPath = cleanPath.slice(0, -'/api'.length);
    }

    const cleanOrigin = `${parsed.protocol}//${parsed.host}${cleanPath}`.replace(/\/+$/, '');
    return { cleanUrl: cleanOrigin };
  } catch {
    return {
      cleanUrl: '',
      error: 'صيغة الرابط غير صحيحة، يرجى كتابة عنوان خادم صالح مثل: https://example.onrender.com'
    };
  }
};

/**
 * Returns the currently active API Base URL
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('reyadat_api_url');
      if (stored && stored.trim()) {
        const sanitized = sanitizeApiBaseUrl(stored);
        if (sanitized.cleanUrl) {
          return sanitized.cleanUrl;
        }
      }
    } catch {}
    if ((window as any).__API_URL__) {
      const sanitized = sanitizeApiBaseUrl(String((window as any).__API_URL__));
      if (sanitized.cleanUrl) {
        return sanitized.cleanUrl;
      }
    }
  }

  const envUrl = (
    import.meta.env.VITE_API_URL || 
    import.meta.env.VITE_BACKEND_URL || 
    import.meta.env.VITE_API_BASE_URL || 
    ''
  );

  if (envUrl) {
    const sanitized = sanitizeApiBaseUrl(envUrl);
    return sanitized.cleanUrl || '';
  }

  return '';
};

/**
 * Stores the API Base URL in localStorage and dispatches a notification event
 */
export const setApiBaseUrl = (rawUrl: string): { success: boolean; cleanUrl: string; error?: string } => {
  if (typeof window === 'undefined') {
    return { success: false, cleanUrl: '', error: 'Window context unavailable' };
  }

  if (!rawUrl || !rawUrl.trim()) {
    try {
      localStorage.removeItem('reyadat_api_url');
      window.dispatchEvent(new CustomEvent('reyadat_api_url_changed', { detail: { url: '' } }));
    } catch {}
    return { success: true, cleanUrl: '' };
  }

  const sanitized = sanitizeApiBaseUrl(rawUrl);
  if (sanitized.error) {
    return { success: false, cleanUrl: '', error: sanitized.error };
  }

  try {
    localStorage.setItem('reyadat_api_url', sanitized.cleanUrl);
    window.dispatchEvent(new CustomEvent('reyadat_api_url_changed', { detail: { url: sanitized.cleanUrl } }));
    return { success: true, cleanUrl: sanitized.cleanUrl };
  } catch (err: any) {
    return { success: false, cleanUrl: sanitized.cleanUrl, error: err.message || 'تعذر الحفظ في المتصفح' };
  }
};

/**
 * Builds a complete API URL from a relative path:
 * Automatically avoids duplicating /api or /api/health
 */
export const buildApiUrl = (endpoint: string, overrideBaseUrl?: string): string => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }

  let base = overrideBaseUrl !== undefined 
    ? (sanitizeApiBaseUrl(overrideBaseUrl).cleanUrl || '') 
    : getApiBaseUrl();

  base = base.replace(/\/+$/, '');

  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // If base already contains path that overlaps with cleanEndpoint, prevent duplication
  if (!base) {
    return cleanEndpoint;
  }

  return `${base}${cleanEndpoint}`;
};

export interface HealthCheckResult {
  ok: boolean;
  httpStatus: number;
  statusText: string;
  contentType: string;
  isJson: boolean;
  url: string;
  serverSource: string;
  data?: any;
  rawText?: string;
  errorMessage?: string;
  service?: string;
  environment?: string;
  uptimeSeconds?: number;
}

/**
 * Performs a robust diagnostic health check against /api/health
 * Detects server source, checks Content-Type, prevents "Unexpected token 'T'",
 * and never outputs "500 Not Found".
 */
export const checkHealthEndpoint = async (targetBaseUrl?: string): Promise<HealthCheckResult> => {
  const primaryUrl = buildApiUrl('/api/health', targetBaseUrl);
  const fallbackUrl = buildApiUrl('/api/health/', targetBaseUrl);

  const detectServerSource = (res: Response, testedUrl: string): string => {
    const serverHeader = (res.headers.get('server') || '').toLowerCase();
    const vercelId = res.headers.get('x-vercel-id');
    const cfRay = res.headers.get('cf-ray');

    if (vercelId || serverHeader.includes('vercel')) {
      return 'Vercel Serverless (دوال سيرفرليس على Vercel)';
    }
    if (testedUrl.includes('onrender.com') || serverHeader.includes('render')) {
      return 'Render Cloud Platform (خادم Render)';
    }
    if (cfRay || serverHeader.includes('cloudflare')) {
      return 'Cloudflare CDN Proxy (بروكسي كلاودفلير)';
    }
    if (testedUrl.includes('localhost') || testedUrl.includes('127.0.0.1')) {
      return 'Local Development Server (خادم التطوير المحلي)';
    }
    return 'خادم سحابي مخصص / Node.js Express';
  };

  const testUrl = async (url: string): Promise<HealthCheckResult> => {
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
      const statusDesc = getHttpStatusDescription(res.status, res.statusText);
      const serverSource = detectServerSource(res, url);

      if (!res.ok) {
        let rawText = '';
        let errorMsg = `فشل في الاتصال بالخادم الرئيسي (رمز الاستجابة: ${res.status} - ${statusDesc})`;

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
          const titleMatch = rawText.match(/<title[^>]*>([^<]+)<\/title>/i);
          const pageTitle = titleMatch ? titleMatch[1].trim() : '';
          const cleanSnippet = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

          if (pageTitle) {
            errorMsg += ` - استقبل المتصفح صفحة ويب بعنوان: "${pageTitle}" بدلاً من استجابة JSON من الخادم.`;
          } else if (cleanSnippet) {
            errorMsg += ` - المحتوى المستلم (${contentType || 'HTML/Text'}): "${cleanSnippet}"`;
          } else {
            errorMsg += ` - تم استلام محتوى (${contentType || 'HTML/Text'}) بدلاً من استجابة JSON.`;
          }
        }

        return {
          ok: false,
          httpStatus: res.status,
          statusText: statusDesc,
          contentType,
          isJson,
          url,
          serverSource,
          rawText,
          errorMessage: errorMsg
        };
      }

      if (!isJson) {
        const rawText = await res.text().catch(() => '');
        return {
          ok: false,
          httpStatus: res.status,
          statusText: statusDesc,
          contentType,
          isJson: false,
          url,
          serverSource,
          rawText,
          errorMessage: `الخادم أعاد كود 200 بنجاح لكن نوع المحتوى (${contentType}) ليس JSON. قد تكون صفحة خطأ أو إعادة توجيه خاطئة.`
        };
      }

      const data = await res.json();
      return {
        ok: true,
        httpStatus: res.status,
        statusText: statusDesc,
        contentType,
        isJson: true,
        url,
        serverSource,
        data,
        service: data.service || data.message || 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة',
        environment: data.environment || 'production',
        uptimeSeconds: data.uptimeSeconds || 0
      };
    } catch (err: any) {
      return {
        ok: false,
        httpStatus: 0,
        statusText: 'Network / CORS Error',
        contentType: '',
        isJson: false,
        url,
        serverSource: url.includes('onrender.com') ? 'Render Cloud (غير متاح)' : 'غير محدد',
        errorMessage: err.message || 'تعذر الاتصال بالخادم عبر الشبكة. يرجى التأكد من تشغيل الخادم وصلاحية شهادة SSL وإعدادات CORS.'
      };
    }
  };

  // Test primary URL (/api/health)
  const primaryResult = await testUrl(primaryUrl);
  if (primaryResult.ok) {
    return primaryResult;
  }

  // If primary returned 404, try fallback with trailing slash (/api/health/)
  if (primaryResult.httpStatus === 404) {
    const fallbackResult = await testUrl(fallbackUrl);
    if (fallbackResult.ok) {
      return fallbackResult;
    }
  }

  return primaryResult;
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
