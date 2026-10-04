import app, { readDb } from '../server-core';

const allowedOrigins = [
  'https://www.riadataleata.com',
  'https://riadataleata.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

/**
 * Vercel Serverless Function entry point
 * Directs all /api/* requests to the Express backend application in server-core.ts
 */
export default function handler(req: any, res: any) {
  // 1. CORS Headers with Credentials support (No wildcard with credentials)
  const reqOrigin = req.headers?.origin;
  if (reqOrigin) {
    const isAllowed = allowedOrigins.includes(reqOrigin) || 
      reqOrigin.endsWith('.run.app') || 
      reqOrigin.endsWith('.vercel.app');
    res.setHeader('Access-Control-Allow-Origin', isAllowed ? reqOrigin : allowedOrigins[0]);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

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

  // 2. Resolve and normalize actual path from Vercel headers or URL
  const rawPath = req.headers?.['x-original-url'] || req.headers?.['x-matched-path'] || req.url || '/';
  console.log(`[API ROUTER] incoming request: ${req.method} ${rawPath}`);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(req.url || '/', 'http://localhost');
  } catch {
    parsedUrl = new URL('/', 'http://localhost');
  }

  let clientPath = '';
  const originalUrlHeader = req.headers?.['x-original-url'];
  if (originalUrlHeader && typeof originalUrlHeader === 'string' && originalUrlHeader.startsWith('/api')) {
    clientPath = originalUrlHeader.split('?')[0];
  } else if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/api') && !parsedUrl.pathname.startsWith('/api/index')) {
    clientPath = parsedUrl.pathname;
  } else {
    const queryParam = parsedUrl.searchParams.get('__path') || req.query?.__path || parsedUrl.searchParams.get('path');
    if (queryParam) {
      clientPath = `/api/${String(queryParam).replace(/^\/+/, '')}`;
    } else if (parsedUrl.pathname.startsWith('/api/index')) {
      clientPath = '/api';
    } else if (parsedUrl.pathname.startsWith('/api')) {
      clientPath = parsedUrl.pathname;
    } else {
      clientPath = `/api${parsedUrl.pathname.startsWith('/') ? parsedUrl.pathname : '/' + parsedUrl.pathname}`;
    }
  }

  // Avoid duplicate /api/api
  clientPath = clientPath.replace(/^\/api\/api(\/|$)/, '/api$1');
  if (!clientPath.startsWith('/api')) {
    clientPath = `/api${clientPath.startsWith('/') ? clientPath : '/' + clientPath}`;
  }

  // Preserve query string
  const search = parsedUrl.search || '';
  const normalizedUrl = `${clientPath}${search}`;

  req.url = normalizedUrl;
  req.originalUrl = normalizedUrl;
  req.path = clientPath;

  console.log(`[API ROUTER] normalized path: ${normalizedUrl}`);
  console.log(`[API ROUTER] forwarding to Express`);

  // Ensure req.socket is defined for Serverless runtime compatibility
  if (!req.socket) {
    req.socket = { remoteAddress: '127.0.0.1' };
  } else if (!req.socket.remoteAddress) {
    req.socket.remoteAddress = '127.0.0.1';
  }

  // 3. Forward request to Express App with error handling
  try {
    const result = app(req, res);
    if (result && typeof result.then === 'function') {
      result.then(() => {
        console.log(`[API EXPRESS] completed: ${req.method} ${normalizedUrl}`);
      }).catch((err: any) => {
        console.error(`[API EXPRESS] promise rejection:`, err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ success: false, error: "Internal Server Error" }));
        }
      });
      return result;
    }
    console.log(`[API EXPRESS] completed: ${req.method} ${normalizedUrl}`);
    return result;
  } catch (err: any) {
    console.error(`[API EXPRESS] synchronous error:`, err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ success: false, error: "Internal Server Error" }));
    }
  }
}

export { readDb };
