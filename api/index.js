'use strict';
// Vercel entry point: every route is rewritten here (see vercel.json). Storage is Supabase when its env vars are set.
const { createHandler } = require('../src/app');

const handler = createHandler({ remindOnRequest: true });

module.exports = (req, res) => {
  // vercel.json rewrites "/x/y?k=v" to "/api/index?path=x/y&k=v"; restore the original path for the router.
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/index') {
    const p = u.searchParams.get('path') || '';
    u.searchParams.delete('path');
    req.url = '/' + p + u.search;
  }
  return handler(req, res);
};
