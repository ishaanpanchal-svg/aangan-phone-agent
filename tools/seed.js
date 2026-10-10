'use strict';
// Loads the synthetic sample calls into data/calls.json so the dashboard has something to show.
const store = require('../src/store');
const { processCall } = require('../src/pipeline');
const S = require('../samples/calls');

(async () => {
  const db = store.open();
  for (const c of Object.values(S)) await processCall(JSON.parse(JSON.stringify(c)), db);
  console.log('seeded', (await db.all()).length, 'calls');
})();
