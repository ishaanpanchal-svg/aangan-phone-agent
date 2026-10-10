'use strict';
// Dashboard numbers, including the cost of the tool itself.
const cfg = require('./config');

function callCost(c) {
  const costs = cfg.costsInr;
  const voice = c.costInr != null ? c.costInr : (c.durationS / 60) * costs.voicePerMinute;
  const ai = costs.aiPerCall;
  const msg = costs.telegramPerMessage;
  return { voice: +voice.toFixed(2), ai, messaging: msg, total: +(voice + ai + msg).toFixed(2) };
}

function compute(rows) {
  const n = rows.length;
  const answered = rows.filter(r => (r.answeredAfterS ?? 0) <= cfg.responseTargetSeconds).length;
  const by = o => rows.filter(r => r.outcome === o).length;
  const forwarded = rows.filter(r => r.outcome === 'Forward' || r.outcome === 'Forward with flag');
  const booked = rows.filter(r => r.bookedSlot).length;
  const costs = rows.map(callCost);
  const total = costs.reduce((a, c) => a + c.total, 0);
  const perDay = {};
  rows.forEach(r => { const d = r.startedAt.slice(0, 10); perDay[d] = (perDay[d] || 0) + 1; });
  const afterHours = rows.filter(r => {
    const h = new Date(r.startedAt).getUTCHours() + 5.5; // IST
    const hh = h % 24;
    return hh < 10 || hh >= 19;
  }).length;
  return {
    calls: n,
    answeredWithinTargetPct: n ? Math.round((answered / n) * 100) : 0,
    afterHoursPct: n ? Math.round((afterHours / n) * 100) : 0,
    forwarded: forwarded.length,
    forwardedPct: n ? Math.round((forwarded.length / n) * 100) : 0,
    declined: by('Decline'),
    human: by('Human'),
    booked,
    perDay,
    costTotalInr: +total.toFixed(2),
    costPerCallInr: n ? +(total / n).toFixed(2) : 0,
    costPerForwardedLeadInr: forwarded.length ? +(total / forwarded.length).toFixed(2) : 0,
  };
}

module.exports = { compute, callCost };
