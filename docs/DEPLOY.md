# Going live on Vercel + Supabase

Live address: **https://aangan-phone-agent-blond.vercel.app** (opens directly, no login).
Status: LIVE. Env vars set, Supabase connected, Telegram button pointed here. Only the Vaani webhook still points at the laptop tunnel (step 4).

## What is left (needs your logins; secrets are never typed by the assistant)

1. **Supabase secret key.** Supabase → Project Settings → API Keys → Secret key → Reveal → copy.
2. **Vercel environment variables.** Vercel → aangan-phone-agent → Settings → Environment Variables.
   Click the first Key box and paste the block from `vercel_env.txt` (Vercel splits `KEY=value` lines into rows).
   Replace `PASTE_THE_SUPABASE_SECRET_KEY_HERE` with the key from step 1. Save.
3. **Redeploy.** Deployments → latest → ⋯ → Redeploy (variables apply to new deployments only).
4. **Vaani webhook.** Vaani → Developers → Webhooks → edit "Aangan lead pipeline" → Endpoint URL = the line in `webhook_url_vercel.txt`.
5. **Telegram button.** `node --env-file=.env tools/set_telegram_webhook.js https://aangan-phone-agent-blond.vercel.app`
6. Check: `https://aangan-phone-agent-blond.vercel.app/api/stats` (password) shows `calls`.

## Notes
- Vercel's free plan runs cron once a day, so the 30-minute reminder runs on each request instead (and daily).
- Until step 4, Vaani keeps calling the laptop tunnel (`flowers-try-staying-maintain.trycloudflare.com`), which only works while the laptop is on.
- Rotate the Telegram, Cal.com, Vaani and Gemini keys after the demo.
