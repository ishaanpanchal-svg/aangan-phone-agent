'use strict';
// Zero-dependency test runner. `npm test`
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const S = require('../samples/calls');
const { classify } = require('../src/classify');
const handoff = require('../src/handoff');
const { priceReply, isPriceQuestion, stripPrices } = require('../src/pricing');
const { compute } = require('../src/stats');
const notify = require('../src/notify');
const store = require('../src/store');
const { processCall } = require('../src/pipeline');
const { createServer } = require('../src/server');

const tests = [];
const t = (name, fn) => tests.push([name, fn]);
const tmp = () => store.open(path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'aangan-')), 'c.json'));
const clone = o => JSON.parse(JSON.stringify(o));

// ---- classify against the 18 real September phone calls (D1, A6, A8, A10)
const REAL = require('../samples/enquiries');
for (const e of REAL) t('D1 real call ' + e.callId + ' is ' + e.expected + ' (' + e.why + ')', () => assert.strictEqual(classify(e).outcome, e.expected, JSON.stringify(classify(e).reasons)));
t('A6 firm deadline under 6 weeks is declined', () => assert.strictEqual(classify(S.rushed).outcome, 'Decline'));
t('D1 low budget is declined', () => assert.strictEqual(classify(S.lowBudget).outcome, 'Decline'));
t('A10 out of scope is declined', () => assert.strictEqual(classify(S.outOfScope).outcome, 'Decline'));
t('A8 complaint goes to a human', () => assert.strictEqual(classify(S.complaint).outcome, 'Human'));
t('office over 3000 sq ft is flagged', () => assert(classify(S.bigOffice).flags.includes('Office above about 3,000 sq ft')));
t('no project described is declined', () => assert.strictEqual(classify(S.empty).outcome, 'Decline'));

// ---- pricing (A4, A5, C3)
t('A4 price reply is the fixed deflection with no number', () => {
  const p = priceReply();
  assert(!/[0-9]/.test(p) && /designer will walk you through it/i.test(p));
  assert(isPriceQuestion('what might it cost?') && !isPriceQuestion('I have a 3BHK in Baner'));
});
t('A4/A5 agent prompt carries the same rules', () => {
  const p = fs.readFileSync(path.join(__dirname, '..', 'agent', 'agent_instructions.md'), 'utf8');
  assert(/ONE question per turn/.test(p) && /Never say any number, range, per-sq-ft figure/.test(p) && /Never ask for an email/i.test(p));
  assert(/walk you through it in detail at the consultation/.test(p));
});
t('A11 no template leftovers in live prompt', () => {
  const p = fs.readFileSync(path.join(__dirname, '..', 'agent', 'agent_instructions.md'), 'utf8');
  assert(!/\{\{|TODO|lorem|example\.com/i.test(p));
});
t('C3 prices never reach a stored record', () => {
  const r = classify(S.qualified);
  assert(stripPrices({ note: handoff.build(S.qualified, r) }));
  assert(!stripPrices({ note: 'Standard Rs 1,800 per sq ft' }));
});

// ---- handoff (C1, C2)
t('C1/C2 note has every field, missing ones say not given', () => {
  const r = classify(S.qualified);
  const n = handoff.build(S.qualified, r);
  ['Asha Rao', '+919800000001', 'Baner', '1400 sq ft', 'Rs 12 lakh', 'Mon 12 Oct'].forEach(x => assert(n.includes(x), x));
  assert(handoff.build({ ...S.qualified, bookedSlot: null }, r).includes('not booked'));
});

// ---- notify (C4)
t('C4 telegram lead has claim button and transcript reply, long transcripts split', async () => {
  notify.sent.length = 0;
  const db = tmp();
  await processCall(clone(S.qualified), db);
  assert(notify.sent[0].reply_markup.inline_keyboard[0][0].callback_data === 'claim:s1');
  assert(notify.sent.some(m => m.text.startsWith('Transcript')));
  assert(notify.chunk('x'.repeat(9000)).every(c => c.length <= 4000));
});
t('booking email only when booked and never for a decline', async () => {
  notify.sent.length = 0;
  const db = tmp();
  await processCall(clone(S.qualified), db);
  assert(notify.sent.some(m => m.channel === 'email'));
  notify.sent.length = 0;
  await processCall({ ...clone(S.lowBudget), bookedSlot: 'x' }, db);
  assert(!notify.sent.some(m => m.channel === 'email'));
});

t('C4 claim button: first claim wins, second is refused', async () => {
  const claims = require('../src/claims');
  const db = tmp();
  await processCall(clone(S.qualified), db);
  const mk = (id, name) => ({ callback_query: { id, data: 'claim:s1', from: { first_name: name }, message: { chat: { id: 1 }, message_id: 9 } } });
  const a = await claims.handleUpdate(mk('c1', 'Aryan'), db);
  const b = await claims.handleUpdate(mk('c2', 'Neel'), db);
  assert.strictEqual(a.result, 'claimed');
  assert.strictEqual(b.result, 'already');
  assert.strictEqual((await db.all())[0].claimedBy, 'Aryan');
});
t('C4 reminder after 30 minutes, once, and not if claimed', async () => {
  const claims = require('../src/claims');
  const db = tmp();
  await processCall(clone(S.qualified), db);
  assert.strictEqual(await claims.sendReminders(db, Date.now() + 10 * 60000), 0);
  assert.strictEqual(await claims.sendReminders(db, Date.now() + 31 * 60000), 1);
  assert.strictEqual(await claims.sendReminders(db, Date.now() + 90 * 60000), 0);
});

// ---- store (C5)
t('C5 repeat caller recognised, webhook retry is idempotent', async () => {
  const db = tmp();
  await processCall(clone(S.qualified), db);
  const again = await processCall(clone(S.qualified), db);
  assert(again.duplicate);
  const second = await processCall({ ...clone(S.qualified), callId: 'r2' }, db);
  assert(second.row.note.includes('repeat caller'));
  assert.strictEqual((await db.all()).length, 2);
});

// ---- dashboard (E1, E2)
t('E1/E2 stats include cost per call and per forwarded lead', async () => {
  const db = tmp();
  for (const k of ['qualified', 'bigOffice', 'lowBudget', 'complaint']) await processCall(clone(S[k]), db);
  const s = compute(await db.all());
  assert.strictEqual(s.calls, 4);
  assert.strictEqual(s.forwarded, 2);
  assert.strictEqual(s.human, 1);
  assert.strictEqual(s.declined, 1);
  assert(s.costTotalInr > 0 && s.costPerCallInr > 0 && s.costPerForwardedLeadInr > s.costPerCallInr);
  assert(s.afterHoursPct > 0);
});

// ---- regressions from the first real Vaani test call
t('real call: curly apostrophe name, word-number months, unlisted place are read', () => {
  const { extract } = require('../src/classify');
  const e = extract([{ role: 'caller', text: "Hello. I’m Rahul Mehta. I have a three BHK in Court Road. It is 1,300 square feet. I want it done in three months." }], '2026-10-10T15:00:00Z');
  assert.strictEqual(e.name, 'Rahul Mehta');
  assert.strictEqual(e.location, 'Court Road');
  assert.strictEqual(Math.round(e.timelineWeeks), 13);
});
t('agent claims a booking that Cal.com does not have: flagged for a human call', async () => {
  const vaani = require('../src/vaani');
  const p = { event: 'call_postprocessing', call_id: 'v2', timestamp: '2026-10-10T14:00:00Z', data: { transcript: '[15:17:51] AGENT: Hello.\n[15:18:03] USER: I am Rahul Mehta, 3BHK in Baner, 1200 sq ft, done in four months.\n[15:18:41] AGENT: I have scheduled your consultation for October 12th at 9:30 AM.' } };
  const c = await vaani.toCall(p, { env: {} });
  assert(c.bookingClaimed && !c.bookedSlot && c.durationS > 0);
  assert(classify(c).flags.some(f => /none exists in Cal\.com/.test(f)));
});

// ---- Supabase store (mock fetch: same behaviour as PostgREST)
t('Supabase store: add is idempotent, byPhone/has/update work', async () => {
  const rows = [];
  const fake = async (url, opts = {}) => {
    const u = new URL(url);
    const q = u.searchParams;
    const m = opts.method || 'GET';
    const ok = body => ({ ok: true, status: 200, text: async () => JSON.stringify(body) });
    if (m === 'POST') {
      const b = JSON.parse(opts.body);
      if (rows.some(r => r.call_id === b.call_id)) return ok([]);
      rows.push({ ...b, created_at: new Date().toISOString() });
      return ok([b]);
    }
    const pick = f => rows.filter(r => (!q.get('call_id') || r.call_id === q.get('call_id').replace('eq.', '')) && (!q.get('phone') || r.phone === q.get('phone').replace('eq.', '')));
    if (m === 'PATCH') { const r = pick()[0]; Object.assign(r, JSON.parse(opts.body)); return { ok: true, status: 204, text: async () => '' }; }
    return ok(pick().map(r => ({ data: r.data, call_id: r.call_id })));
  };
  const db = require('../src/store').openSupabase('https://x.supabase.co', 'key', fake);
  assert.strictEqual(await db.add({ callId: 'a', phone: '1', n: 1 }), true);
  assert.strictEqual(await db.add({ callId: 'a', phone: '1', n: 2 }), false);
  assert.strictEqual(await db.has('a'), true);
  assert.strictEqual((await db.byPhone('1')).length, 1);
  await db.update('a', { claimedBy: 'Aryan' });
  assert.strictEqual((await db.all())[0].claimedBy, 'Aryan');
});
t('Vercel entry restores the original path after the rewrite', async () => {
  const seen = [];
  const handler = require('../src/server').createHandler({ store: tmp(), env: { DASHBOARD_PASSWORD: 'pw' } });
  const entry = require('../api/index.js');
  const res = { writeHead: c => seen.push(c), end: () => {} };
  await entry({ url: '/api/index?path=api%2Fstats', headers: {}, method: 'GET' }, res);
  assert(seen.length === 1);
});

// ---- Vaani adapter
t('Vaani webhook payload becomes a classified call; other events are ignored', async () => {
  const vaani = require('../src/vaani');
  const p = { event: 'call_postprocessing', call_id: 'v1', timestamp: '2026-10-10T14:00:00Z', data: { call_duration: 150000, recording_url: 'https://x/r.ogg',
    transcript: 'AGENT: Hello, this is Aangan Studio.' + String.fromCharCode(10, 10) + 'USER: Hi, I am Priya. I have a 3BHK in Baner, 1200 sq ft. I need it in four months.' } };
  const c = await vaani.toCall(p, { env: {} });
  assert.strictEqual(c.transcript[0].role, 'agent');
  assert.strictEqual(c.transcript[1].role, 'caller');
  assert.strictEqual(c.durationS, 150);
  assert.strictEqual(classify(c).outcome, 'Forward');
  assert.deepStrictEqual(vaani.toTranscript([{ role: 'assistant', text: 'a' }, { speaker: 'user', text: 'b' }]).map(x => x.role), ['agent', 'caller']);
});

// ---- server (E3)
t('E3 server: dashboard locked without password, webhook needs secret', async () => {
  const db = tmp();
  const srv = createServer({ store: db, env: { DASHBOARD_PASSWORD: 'pw', WEBHOOK_SECRET: 'sec' } });
  await new Promise(r => srv.listen(0, r));
  const port = srv.address().port;
  const req = (method, p, headers = {}, body) => new Promise(res => {
    const r = http.request({ port, method, path: p, headers }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res({ code: x.statusCode, d })); });
    if (body) r.write(body);
    r.end();
  });
  assert.strictEqual((await req('GET', '/api/calls')).code, 401);
  const auth = { authorization: 'Basic ' + Buffer.from('u:pw').toString('base64') };
  assert.strictEqual((await req('GET', '/api/calls', auth)).code, 200);
  assert.strictEqual((await req('GET', '/api/calls', { authorization: 'Basic ' + Buffer.from('u:no').toString('base64') })).code, 401);
  assert.strictEqual((await req('POST', '/webhook/call-ended', {}, '{}')).code, 401);
  const ok = await req('POST', '/webhook/call-ended', { 'x-webhook-secret': 'sec' }, JSON.stringify(S.qualified));
  assert.strictEqual(ok.code, 200);
  assert.strictEqual(JSON.parse(ok.d).outcome, 'Forward');
  assert.strictEqual((await req('POST', '/webhook/call-ended', { 'x-webhook-secret': 'sec' }, '{"x":1}')).code, 400);
  const noPw = createServer({ store: db, env: {} });
  await new Promise(r => noPw.listen(0, r));
  noPw.close(); srv.close();
});

(async () => {
  let fail = 0;
  for (const [name, fn] of tests) {
    try { await fn(); console.log('PASS', name); } catch (e) { fail++; console.log('FAIL', name, '\n    ', e.message); }
  }
  console.log(`\n${tests.length - fail}/${tests.length} passed`);
  process.exit(fail ? 1 : 0);
})();
