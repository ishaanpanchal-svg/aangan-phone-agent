'use strict';
// Claim button (first claim wins) and 30-minute unclaimed reminder.
const notify = require('./notify');

const REMIND_AFTER_MS = 30 * 60 * 1000;
const who = u => (u.username ? '@' + u.username : [u.first_name, u.last_name].filter(Boolean).join(' ') || 'someone');

async function handleUpdate(update, db) {
  const cb = update.callback_query;
  if (!cb || !/^claim:/.test(cb.data || '')) return { handled: false };
  const callId = cb.data.slice(6);
  const row = db.all().find(r => r.callId === callId);
  if (!row) { await notify.tgApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Lead not found' }); return { handled: true, result: 'missing' }; }

  if (row.claimedBy) {
    await notify.tgApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'Already claimed by ' + row.claimedBy });
    return { handled: true, result: 'already', by: row.claimedBy };
  }
  const name = who(cb.from);
  db.update(callId, { claimedBy: name, claimedAt: new Date().toISOString() });
  await notify.tgApi('answerCallbackQuery', { callback_query_id: cb.id, text: 'You claimed this lead' });
  if (cb.message) {
    await notify.tgApi('editMessageReplyMarkup', { chat_id: cb.message.chat.id, message_id: cb.message.message_id, reply_markup: { inline_keyboard: [] } });
    await notify.telegramSend('Claimed by ' + name, { reply_to_message_id: cb.message.message_id });
  }
  return { handled: true, result: 'claimed', by: name };
}

async function sendReminders(db, now = Date.now()) {
  let n = 0;
  for (const r of db.all()) {
    const forwarded = r.outcome === 'Forward' || r.outcome === 'Forward with flag' || r.outcome === 'Human';
    if (!forwarded || r.claimedBy || r.reminded || !r.telegramId) continue;
    if (now - new Date(r.createdAt || r.startedAt).getTime() < REMIND_AFTER_MS) continue;
    await notify.telegramSend('Reminder: this lead is still unclaimed after 30 minutes. ' + (r.fields.name || r.phone), { reply_to_message_id: r.telegramId });
    db.update(r.callId, { reminded: true });
    n++;
  }
  return n;
}

module.exports = { handleUpdate, sendReminders, REMIND_AFTER_MS };
