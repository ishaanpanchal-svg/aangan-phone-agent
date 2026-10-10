'use strict';
// Turns Vaani's `call_postprocessing` webhook into our call record, and finds the Cal.com booking made during the call.
const cfg = require('./config');

function toTranscript(t) {
  const out = [];
  const push = (who, text) => { text = String(text || '').trim(); if (text) out.push({ role: /agent|assistant|bot|ai/i.test(who) ? 'agent' : 'caller', text }); };
  if (Array.isArray(t)) {
    for (const x of t) push(x.role || x.speaker || x.from || '', x.text || x.content || x.message || x.transcript || '');
  } else if (typeof t === 'string') {
    // "AGENT: hello\n\nUSER: hi" (possibly with a [timestamp] prefix)
    for (const block of t.split(/\n+(?=\s*(?:\[[^\]]*\]\s*)?(?:AGENT|USER|ASSISTANT|CALLER)\s*:)/i)) {
      const m = block.match(/^\s*(?:\[[^\]]*\]\s*)?(AGENT|USER|ASSISTANT|CALLER)\s*:\s*([\s\S]*)$/i);
      if (m) push(m[1], m[2]); else push('caller', block);
    }
  }
  return out;
}

async function findBooking(sinceMs, env = process.env, fetchFn = fetch) {
  if (!env.CAL_API_KEY) return null;
  try {
    const r = await fetchFn('https://api.cal.com/v2/bookings?status=upcoming&sortStart=asc', { headers: { authorization: 'Bearer ' + env.CAL_API_KEY, 'cal-api-version': '2024-08-13' } });
    const j = await r.json();
    const hit = (j.data || []).filter(b => b.createdAt && new Date(b.createdAt).getTime() >= sinceMs).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (!hit) return null;
    return new Date(hit.start).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST';
  } catch { return null; }
}

// payload: {event:'call_postprocessing', call_id, timestamp, data:{room_name,call_id,call_duration(ms),transcript,summary,recording_url,entities}}
async function toCall(payload, opts = {}) {
  const d = payload.data || {};
  const durationS = Math.round((d.call_duration || 0) / 1000);
  const endMs = payload.timestamp ? new Date(payload.timestamp).getTime() : Date.now();
  const startedAt = new Date(endMs - durationS * 1000).toISOString();
  const bookedSlot = await findBooking(endMs - durationS * 1000 - 60000, opts.env, opts.fetchFn);
  return {
    callId: String(payload.call_id || d.call_id || d.room_name),
    phone: d.phone_number || (d.entities && (d.entities.phone || d.entities.phone_number)) || 'unknown (web call)',
    startedAt,
    durationS,
    answeredAfterS: 0, // the agent answers immediately
    transcript: toTranscript(d.transcript),
    recordingUrl: d.recording_url || null,
    summary: d.summary || null,
    bookedSlot,
    costInr: +((durationS / 60) * cfg.costsInr.voicePerMinute).toFixed(2),
  };
}

module.exports = { toCall, toTranscript, findBooking };
