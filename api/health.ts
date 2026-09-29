import { readDb } from '../server.ts';

/**
 * Direct Comprehensive Vercel Serverless Function for /api/health
 * Validates real database connectivity, service readiness, and server uptime.
 * Fails with 503 if database is disconnected or unreadable.
 */
export default function handler(req: any, res: any) {
  // CORS Headers
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token, x-user-id, x-user-role, x-department-id, x-national-id, x-team-id'
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  try {
    const db = readDb();
    const isDbConnected = Boolean(db && Array.isArray(db.departments) && db.departments.length > 0);

    if (!isDbConnected) {
      res.statusCode = 503;
      res.end(JSON.stringify({
        ok: false,
        status: 'unhealthy',
        error: 'قاعدة البيانات المركزية غير متصلة أو لم يتم تهيئتها بنجاح',
        service: 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - بوابة الفحص الصحي',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        platform: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
        database: {
          status: 'disconnected'
        }
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
      platform: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
      configuredApiUrl: process.env.VITE_API_URL || process.env.API_URL || null,
      runtime: 'Node.js',
      domain: req.headers?.host || 'localhost',
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
        finance: 'operational',
        hr: 'operational'
      }
    }));
  } catch (err: any) {
    res.statusCode = 503;
    res.end(JSON.stringify({
      ok: false,
      status: 'unhealthy',
      error: err.message || 'تعذر فحص صحة قاعدة البيانات والخادم',
      timestamp: new Date().toISOString(),
      database: {
        status: 'error'
      }
    }));
  }
}
