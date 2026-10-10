'use strict';
// Telegram (handoff, claim button, transcript reply) and Resend (booking email).
// With no credentials set it runs in dry-run: messages are collected in `sent` and nothing leaves the machine.

const sent = [];
const env = () => process.env;

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return res.json();
}

const live = () => Boolean(env().TELEGRAM_BOT_TOKEN && env().TELEGRAM_CHAT_ID);

async function telegramSend(text, extra = {}) {
  if (!live()) { const m = { channel: 'telegram', text, ...extra, id: sent.length + 1 }; sent.push(m); return m; }
  const r = await post(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/sendMessage`, { chat_id: env().TELEGRAM_CHAT_ID, text, ...extra });
  return { id: r.result && r.result.message_id, ok: r.ok };
}

function chunk(text, size = 4000) {
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

async function sendLead(row, note, transcriptText) {
  const lead = await telegramSend(note, {
    reply_markup: { inline_keyboard: [[{ text: 'Claim this lead', callback_data: `claim:${row.callId}` }]] },
  });
  for (const part of chunk(transcriptText)) {
    await telegramSend('Transcript\n' + part, { reply_to_message_id: lead.id });
  }
  return lead.id;
}

async function sendBookingEmail(row, note) {
  const to = env().NOTIFY_EMAILS;
  const msg = { channel: 'email', to: to || '(dry-run)', subject: `Consultation booked: ${row.fields.name || row.phone} - ${row.bookedSlot}`, body: note };
  if (!env().RESEND_API_KEY || !to) { sent.push(msg); return msg; }
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env().RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env().MAIL_FROM || 'onboarding@resend.dev', to: to.split(','), subject: msg.subject, text: note }),
  });
  return msg;
}

async function tgApi(method, body) {
  if (!live()) { sent.push({ channel: 'telegram-api', method, ...body }); return { ok: true }; }
  return post(`https://api.telegram.org/bot${env().TELEGRAM_BOT_TOKEN}/${method}`, body);
}

module.exports = { sendLead, sendBookingEmail, telegramSend, tgApi, sent, chunk };
