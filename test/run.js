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

// ---- store (C5)
t('C5 repeat caller recognised, webhook retry is idempotent', async () => {
  const db = tmp();
  await processCall(clone(S.qualified), db);
  const again = await processCall(clone(S.qualified), db);
  assert(again.duplicate);
  const second = await processCall({ ...clone(S.qualified), callId: 'r2' }, db);
  assert(second.row.note.includes('repeat caller'));
  assert.strictEqual(db.all().length, 2);
});

// ---- dashboard (E1, E2)
t('E1/E2 stats include cost per call and per forwarded lead', async () => {
  const db = tmp();
  for (const k of ['qualified', 'bigOffice', 'lowBudget', 'complaint']) await processCall(clone(S[k]), db);
  const s = compute(db.all());
  assert.strictEqual(s.calls, 4);
  assert.strictEqual(s.forwarded, 2);
  assert.strictEqual(s.human, 1);
  assert.strictEqual(s.declined, 1);
  assert(s.costTotalInr > 0 && s.costPerCallInr > 0 && s.costPerForwardedLeadInr > s.costPerCallInr);
  assert(s.afterHoursPct > 0);
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
