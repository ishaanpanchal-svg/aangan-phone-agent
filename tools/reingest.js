'use strict';
// Rebuilds one call from Vaani's call_details API and sends it through the pipeline.  node --env-file=.env tools/reingest.js <call_id>
const store = require('../src/store');
const { processCall } = require('../src/pipeline');
const vaani = require('../src/vaani');

(async () => {
  const id = process.argv[2];
  const r = await fetch('https://api.vaanivoice.ai/api/call_details/' + id, { headers: { 'X-API-Key': process.env.VAANI_API_KEY } });
  const j = await r.json();
  const call = await vaani.toCall({ event: 'call_postprocessing', call_id: id, timestamp: new Date().toISOString(), data: { transcript: j.transcription, summary: j.summary } });
  const db = store.open();
  const out = await processCall(call, db);
  console.log(out.duplicate ? 'already stored' : `stored: ${out.row.outcome} | ${out.row.fields.name} | ${out.row.fields.location} | ${out.row.durationS}s | slot ${out.row.bookedSlot}`);
})();
