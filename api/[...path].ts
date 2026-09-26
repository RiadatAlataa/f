import app from '../server.ts';

/**
 * Vercel Catch-All Serverless Function for all /api/* routes
 * Matches /api/db, /api/auth/*, /api/inventory/*, etc.
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

  // Ensure request URL matches the /api routes in Express
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return app(req, res);
}
