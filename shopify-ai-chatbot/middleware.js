/**
 * Vercel Edge Middleware — runs at the network edge before any serverless
 * function is invoked.
 *
 * Returning a Response from this function SHORT-CIRCUITS the request — the
 * serverless function is never called.  For OPTIONS preflight requests that
 * is exactly what we want: return 204 with CORS headers immediately.
 *
 * For every other method, returning undefined passes the request through to
 * the serverless function as normal (the functions set their own CORS headers).
 */

export function middleware(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }
  // Non-OPTIONS: fall through to the serverless function
}

export const config = {
  matcher: '/api/:path*',
};
