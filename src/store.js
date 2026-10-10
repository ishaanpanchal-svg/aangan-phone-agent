'use strict';
// Call store with the same async interface on two backends:
//   - Supabase (SUPABASE_URL + SUPABASE_SERVICE_KEY set): table public.calls(call_id, phone, data jsonb, created_at)
//   - a local JSON file (default; used by tests and local runs)
const fs = require('fs');
const path = require('path');

function openFile(file) {
  const f = file || path.join(__dirname, '..', 'data', 'calls.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const load = () => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []);
  const save = rows => fs.writeFileSync(f, JSON.stringify(rows, null, 2));
  return {
    kind: 'file',
    async all() { return load(); },
    async byPhone(phone) { return load().filter(r => r.phone === phone); },
    async has(id) { return load().some(r => r.callId === id); },
    async add(row) {
      const rows = load();
      if (rows.some(r => r.callId === row.callId)) return false; // webhook retries are idempotent
      rows.push(row);
      save(rows);
      return true;
    },
    async update(id, patch) {
      const rows = load();
      const r = rows.find(x => x.callId === id);
      if (!r) return false;
      Object.assign(r, patch);
      save(rows);
      return true;
    },
  };
}

function openSupabase(url, key, fetchFn = fetch) {
  const base = url.replace(/\/$/, '') + '/rest/v1/calls';
  const headers = { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'application/json' };
  const call = async (query, opts = {}) => {
    const res = await fetchFn(base + query, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    if (!res.ok) throw new Error('supabase ' + res.status + ' ' + (await res.text()).slice(0, 200));
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  };
  return {
    kind: 'supabase',
    async all() { return (await call('?select=data&order=created_at.asc')).map(r => r.data); },
    async byPhone(phone) { return (await call('?select=data&phone=eq.' + encodeURIComponent(phone))).map(r => r.data); },
    async has(id) { return (await call('?select=call_id&call_id=eq.' + encodeURIComponent(id))).length > 0; },
    async add(row) {
      const out = await call('?on_conflict=call_id', {
        method: 'POST',
        headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ call_id: row.callId, phone: row.phone, data: row }),
      });
      return out.length > 0; // empty = it already existed
    },
    async update(id, patch) {
      const cur = await call('?select=data&call_id=eq.' + encodeURIComponent(id));
      if (!cur.length) return false;
      await call('?call_id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify({ data: { ...cur[0].data, ...patch } }) });
      return true;
    },
  };
}

function open(file, env = process.env) {
  if (!file && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) return openSupabase(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
  return openFile(file);
}

module.exports = { open, openFile, openSupabase };
