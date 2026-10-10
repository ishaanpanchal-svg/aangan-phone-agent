'use strict';
// Tiny JSON-file store. Swap for Supabase in production (same four functions).
const fs = require('fs');
const path = require('path');

function open(file) {
  const f = file || path.join(__dirname, '..', 'data', 'calls.json');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const load = () => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : []);
  const save = rows => fs.writeFileSync(f, JSON.stringify(rows, null, 2));
  return {
    all: load,
    byPhone: phone => load().filter(r => r.phone === phone),
    has: id => load().some(r => r.callId === id),
    add(row) {
      const rows = load();
      if (rows.some(r => r.callId === row.callId)) return false; // webhook retries are idempotent
      rows.push(row);
      save(rows);
      return true;
    },
    update(id, patch) {
      const rows = load();
      const r = rows.find(x => x.callId === id);
      if (!r) return false;
      Object.assign(r, patch);
      save(rows);
      return true;
    },
  };
}

module.exports = { open };
