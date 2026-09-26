/**
 * Direct Vercel Serverless Function for /api/health & /api/health/
 * Guarantees valid application/json response and prevents 404 HTML fallback on Vercel
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

  res.statusCode = 200;
  res.end(JSON.stringify({
    ok: true,
    status: 'healthy',
    message: 'خادم جمعية ريادة العطاء لخدمة الإنسان بالعسيلة متصل وقيد العمل بنجاح',
    service: 'جمعية ريادة العطاء لخدمة الإنسان بالعسيلة - API Health Check',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime ? process.uptime() : 0),
    environment: process.env.NODE_ENV || 'production',
    platform: process.env.VERCEL ? 'vercel-serverless' : 'node-express',
    runtime: 'Node.js',
    domain: req.headers?.host || 'localhost'
  }));
}
