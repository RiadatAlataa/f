import app, { readDb } from '../server.ts';

/**
 * Vercel Serverless Function entry point
 * Directs all /api/* requests to the Express backend application
 */
export default function handler(req: any, res: any) {
  // CORS Headers
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token, x-user-id, x-user-role, x-department-id, x-national-id, x-team-id'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // 1. Resolve actual path from Vercel rewrite headers or query parameters
  try {
    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    const matchedPath = req.headers?.['x-matched-path'] || req.headers?.['x-vercel-matched-path'] || req.headers?.['x-original-url'] || '';
    const paramPath = parsedUrl.searchParams.get('__path') || req.query?.__path || parsedUrl.searchParams.get('path') || req.query?.path || '';

    if (matchedPath && matchedPath.startsWith('/api')) {
      req.url = matchedPath;
    } else if (paramPath) {
      req.url = `/api/${paramPath.replace(/^\/+/, '')}`;
    } else if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    } else if (parsedUrl.pathname === '/api/index' || parsedUrl.pathname === '/api/index.ts') {
      req.url = '/api';
    }
  } catch (e) {
    console.error("Error parsing URL in api/index.ts handler:", e);
  }

  const cleanUrl = (req.url || '').split('?')[0];

  // 2. Direct Root API Info Endpoint
  if (cleanUrl === '/api' || cleanUrl === '/api/') {
    try {
      const db = readDb();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        message: 'بوابة واجهة برمجة التطبيقات لجمعية ريادة العطاء لخدمة الإنسان بالعسيلة',
        service: 'Reyadat Al-Ataa Central API Gateway',
        status: 'healthy',
        database: {
          connected: Boolean(db && Array.isArray(db.departments) && db.departments.length > 0),
          departmentsCount: (db?.departments || []).length,
          volunteersCount: (db?.volunteers || []).length,
          initiativesCount: (db?.initiatives || []).length
        },
        timestamp: new Date().toISOString()
      }));
      return;
    } catch (err: any) {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
  }

  // 3. Direct Health Check with DB verification
  if (cleanUrl === '/api/health' || cleanUrl === '/api/health/' || cleanUrl === '/health' || cleanUrl === '/health/') {
    try {
      const db = readDb();
      const isDbConnected = Boolean(db && Array.isArray(db.departments) && db.departments.length > 0);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

      if (!isDbConnected) {
        res.statusCode = 503;
        res.end(JSON.stringify({
          ok: false,
          status: 'unhealthy',
          error: 'قاعدة البيانات المركزية غير متصلة أو لم يتم تهيئتها بنجاح',
          timestamp: new Date().toISOString(),
          database: { status: 'disconnected' }
        }));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        ok: true,
        status: 'healthy',
        message: 'خادم جمعية ريادة العطاء لخدمة الإنسان بالعسيلة وقاعدة البيانات متصلان وقيد العمل بنجاح',
        service: 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - البوابة المركزية',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
        environment: process.env.NODE_ENV || 'production',
        platform: 'vercel-serverless',
        configuredApiUrl: process.env.VITE_API_URL || process.env.API_URL || null,
        database: {
          status: 'connected',
          departmentsCount: (db.departments || []).length,
          volunteersCount: (db.volunteers || []).length,
          initiativesCount: (db.initiatives || []).length,
          beneficiariesCount: (db.beneficiaries || []).length,
          inventoryCount: (db.inventoryItems || []).length
        },
        services: {
          database: 'operational',
          auth: 'operational',
          volunteering: 'operational',
          beneficiaries: 'operational',
          warehouse: 'operational',
          finance: 'operational'
        }
      }));
      return;
    } catch (err: any) {
      res.statusCode = 503;
      res.end(JSON.stringify({
        ok: false,
        status: 'unhealthy',
        error: err.message || 'خطأ في فحص صحة الخادم'
      }));
      return;
    }
  }

  // 4. Delegate to Express App
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("Critical error in api/index.ts handler:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({
        ok: false,
        error: err.message || "حدث خطأ داخلي في معالجة طلب الخادم",
        code: "SERVERLESS_HANDLER_EXCEPTION",
        path: req.url,
        timestamp: new Date().toISOString()
      }));
    }
  }
}
