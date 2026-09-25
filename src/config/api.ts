/**
 * Central API Configuration & Dynamic Backend Resolver
 * 
 * Supports:
 * - Vercel Serverless (relative URLs by default)
 * - Render / Cloud Run / VPS external backend (via VITE_API_URL or runtime setting)
 * - Custom domain proxy & SSL
 * - Graceful health checking with Content-Type & JSON validation
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
}

/**
 * Performs a robust diagnostic health check against /api/health
 * Prevents "Unexpected token 'T'" errors by inspecting Content-Type first
 */
export const checkHealthEndpoint = async (targetBaseUrl?: string): Promise<HealthCheckResult> => {
  const targetUrl = buildApiUrl('/api/health', targetBaseUrl);
  
  try {
    const res = await fetch(targetUrl, {
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
      let errorMsg = `رمز الاستجابة: ${res.status} (${res.statusText})`;
      
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
        // Clean out HTML tags for safe UI display
        const cleanSnippet = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
        if (cleanSnippet) {
          errorMsg += ` - المحتوى المستلم (HTML/Text): "${cleanSnippet}"`;
        }
      }

      return {
        ok: false,
        httpStatus: res.status,
        statusText: res.statusText,
        isJson,
        url: targetUrl,
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
        url: targetUrl,
        rawText,
        errorMessage: `الخادم أعاد استجابة بنجاح لكن نوع المحتوى (${contentType}) ليس JSON. قد تكون صفحة خطأ أو تحويل.`
      };
    }

    const data = await res.json();
    return {
      ok: true,
      httpStatus: res.status,
      statusText: res.statusText,
      isJson: true,
      url: targetUrl,
      data
    };
  } catch (err: any) {
    return {
      ok: false,
      httpStatus: 0,
      statusText: 'Network / CORS Error',
      isJson: false,
      url: targetUrl,
      errorMessage: err.message || 'تعذر الاتصال بالخادم عبر الشبكة. يرجى التأكد من شهادة SSL وإعدادات CORS.'
    };
  }
};
