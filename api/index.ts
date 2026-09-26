import app from '../server.ts';

/**
 * Vercel Serverless Function entry point
 * Directs all /api/* requests to the Express backend application
 */
export default function handler(req: any, res: any) {
  // CORS Headers
  const origin = req.headers?.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token, x-user-id, x-user-role, x-department-id, x-national-id, x-team-id'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Fallback direct JSON response for health endpoints if needed
  const cleanUrl = (req.url || '').split('?')[0];
  if (cleanUrl === '/api/health' || cleanUrl === '/api/health/' || cleanUrl === '/health' || cleanUrl === '/health/') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.statusCode = 200;
    res.end(JSON.stringify({
      ok: true,
      status: 'healthy',
      message: 'خادم جمعية ريادة العطاء لخدمة الإنسان بالعسيلة متصل وقيد العمل بنجاح',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
      environment: process.env.NODE_ENV || 'production',
      platform: 'vercel-serverless'
    }));
    return;
  }

  // Ensure request URL matches the /api routes in Express
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}
