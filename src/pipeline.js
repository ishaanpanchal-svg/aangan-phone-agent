'use strict';
// One finished call in, one stored row + notifications out.
const { classify } = require('./classify');
const handoff = require('./handoff');
const notify = require('./notify');
const { stripPrices } = require('./pricing');
const { callCost } = require('./stats');

async function processCall(call, store) {
  if (store.has(call.callId)) return { duplicate: true };
  const prior = store.byPhone(call.phone);
  call.repeatCaller = prior.length > 0;

  const result = classify(call);
  const note = handoff.build(call, result);
  if (!stripPrices({ note, fields: result.fields })) throw new Error('price figure found in stored record');

  const row = {
    callId: call.callId,
    phone: call.phone,
    startedAt: call.startedAt,
    createdAt: new Date().toISOString(),
    durationS: call.durationS,
    answeredAfterS: call.answeredAfterS ?? 0,
    outcome: result.outcome,
    reasons: result.reasons,
    flags: result.flags,
    fields: result.fields,
    bookedSlot: call.bookedSlot || null,
    note,
    transcript: call.transcript,
    recordingUrl: call.recordingUrl || null,
    cost: callCost(call),
    costInr: call.costInr,
  };
  store.add(row);

  const transcriptText = call.transcript.map(t => `${t.role === 'caller' ? 'Caller' : 'Agent'}: ${t.text}`).join('\n');
  if (result.outcome === 'Forward' || result.outcome === 'Forward with flag' || result.outcome === 'Human') {
    row.telegramId = await notify.sendLead(row, (result.outcome === 'Human' ? 'NEEDS A PERSON\n' : '') + note, transcriptText);
  }
  if (row.bookedSlot && result.outcome !== 'Decline') await notify.sendBookingEmail(row, note);
  store.update(row.callId, { telegramId: row.telegramId || null });
  return { duplicate: false, row };
}

module.exports = { processCall };
