import app from '../server';

/**
 * Vercel Serverless Function entry point
 * Directs all /api/* requests to the Express backend application
 */
export default function handler(req: any, res: any) {
  // Ensure request URL matches the /api routes in Express
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
