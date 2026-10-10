'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const store = require('./store');
const { processCall } = require('./pipeline');
const { compute } = require('./stats');

const safeEq = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function createServer(opts = {}) {
  const db = opts.store || store.open();
  const env = opts.env || process.env;
  const dashPw = env.DASHBOARD_PASSWORD;
  const hookSecret = env.WEBHOOK_SECRET;

  const authed = req => {
    if (!dashPw) return false; // no password configured = locked, never open
    const h = req.headers.authorization || '';
    if (!h.startsWith('Basic ')) return false;
    const pw = Buffer.from(h.slice(6), 'base64').toString().split(':').slice(1).join(':');
    return safeEq(pw, dashPw);
  };
  const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const deny = res => { res.writeHead(401, { 'www-authenticate': 'Basic realm="Aangan"' }); res.end('Password needed'); };

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      if (req.method === 'POST' && url.pathname === '/webhook/call-ended') {
        if (!hookSecret || !safeEq(req.headers['x-webhook-secret'] || '', hookSecret)) return json(res, 401, { error: 'bad secret' });
        let body = '';
        for await (const c of req) { body += c; if (body.length > 1e6) return json(res, 413, { error: 'too large' }); }
        const call = JSON.parse(body);
        if (!call.callId || !call.phone || !Array.isArray(call.transcript)) return json(res, 400, { error: 'callId, phone, transcript required' });
        const out = await processCall(call, db);
        return json(res, 200, { ok: true, duplicate: out.duplicate, outcome: out.row && out.row.outcome });
      }
      if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true });
      if (req.method === 'GET' && ['/', '/api/calls', '/api/stats'].includes(url.pathname)) {
        if (!authed(req)) return deny(res);
        if (url.pathname === '/api/calls') return json(res, 200, db.all());
        if (url.pathname === '/api/stats') return json(res, 200, compute(db.all()));
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(path.join(__dirname, 'dashboard.html')));
      }
      json(res, 404, { error: 'not found' });
    } catch (e) {
      json(res, 500, { error: 'server error' });
    }
  });
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port, () => console.log(`Aangan dashboard on http://localhost:${port}`));
}

module.exports = { createServer };
