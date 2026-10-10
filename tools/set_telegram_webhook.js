'use strict';
// node --env-file=.env tools/set_telegram_webhook.js https://your-app.vercel.app
// Points Telegram button presses (Claim) at the given server. Run it after changing where the server lives.
(async () => {
  const base = (process.argv[2] || '').replace(/\/$/, '');
  if (!/^https:\/\//.test(base)) { console.log('usage: set_telegram_webhook.js https://host'); process.exit(1); }
  const r = await fetch('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/setWebhook', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: base + '/telegram/webhook', secret_token: process.env.WEBHOOK_SECRET, allowed_updates: ['callback_query'] }),
  });
  console.log((await r.json()).description);
})();
