import app from '../server-core';

/**
 * Vercel Catch-All Serverless Function for all /api/* routes
 * Matches /api/db, /api/auth/*, /api/inventory/*, etc.
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

  // Ensure request URL matches the /api routes in Express
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  try {
    return app(req, res);
  } catch (err: any) {
    console.error("Critical error in api/[...path].ts handler:", err);
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
