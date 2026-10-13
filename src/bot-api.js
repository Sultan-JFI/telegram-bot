import { getSettings } from './kv.js';

export async function resolveToken(env) {
  const s = await getSettings(env);
  return s.botToken || env.BOT_TOKEN || null;
}
export async function tgApi(token, method, payload = {}) {
  if (!token) return { ok: false, error_code: 0, description: 'token_missing' };
  try {
    const form = payload instanceof FormData;
    // Soroush+ Bot API is intentionally Telegram-compatible.
    // Base URL: https://api.splus.ir/bot<token>/METHOD_NAME
    const res = await fetch(`https://api.splus.ir/bot${token}/${method}`, {
      method: 'POST', headers: form ? undefined : { 'content-type': 'application/json' },
      body: form ? payload : JSON.stringify(payload), signal: AbortSignal.timeout(form ? 60000 : 12000),
    });
    const data = await res.json().catch(() => ({ ok: false, error_code: res.status, description: 'splus_invalid_response' }));
    if (!data.ok && payload && (form ? payload.has('reply_markup') : payload.reply_markup) && rejectedMarkup(data.description)) {
      // A keyboard the platform refuses (over-long callback data, a non-https Web App
      // URL, …) used to swallow the whole reply — /start looked dead until the
      // offending button was deleted. Deliver the text without the buttons.
      const retry = form ? payload : { ...payload };
      if (form) retry.delete('reply_markup'); else delete retry.reply_markup;
      const plain = await fetch(`https://api.splus.ir/bot${token}/${method}`, {
        method: 'POST', headers: form ? undefined : { 'content-type': 'application/json' },
        body: form ? retry : JSON.stringify(retry), signal: AbortSignal.timeout(form ? 60000 : 12000),
      });
      return plain.json().catch(() => ({ ok: false, error_code: plain.status, description: 'splus_invalid_response' }));
    }
    return data;
  } catch {
    // Never include an exception URL: API URLs contain the bot credential.
    return { ok: false, error_code: 0, description: 'splus_network_error', uncertain: true };
  }
}
// Platform reports a bad inline keyboard with these 400s; only those are worth
// retrying, anything else (blocked user, missing chat) is returned as-is.
function rejectedMarkup(description) {
  return /button|keyboard|reply markup|BUTTON_DATA_INVALID|can't parse/i.test(String(description || ''));
}
// Button taps must refresh the open message instead of stacking a new one in the chat.
// A callback handler opens an edit slot; the first reply to that same chat edits the
// original message, and anything the handler sends afterwards is delivered normally.
let EDIT_SLOT = null;
const EDITABLE_EXTRA = ['reply_markup', 'parse_mode', 'entities', 'disable_web_page_preview', 'link_preview_options'];
export function beginMessageEdit(chatId, messageId) {
  EDIT_SLOT = { chatId: String(chatId), messageId, used: false };
}
export function endMessageEdit() { EDIT_SLOT = null; }
function editableExtra(extra) {
  if (Object.keys(extra || {}).some((k) => !EDITABLE_EXTRA.includes(k))) return false;
  const markup = extra && extra.reply_markup;
  // Only navigable screens replace themselves. Plain notices, delivered content and
  // reply-keyboard prompts stay separate messages the user can keep scrolling back to.
  return !!markup && Array.isArray(markup.inline_keyboard) && markup.inline_keyboard.length > 0;
}
export async function sendToUser(token, chatId, text, extra = {}) {
  const slot = EDIT_SLOT;
  if (slot && !slot.used && String(chatId) === slot.chatId && editableExtra(extra)) {
    slot.used = true;
    const payload = { chat_id: chatId, message_id: slot.messageId, text, ...extra };
    const edited = await tgApi(token, 'editMessageText', payload);
    if (edited.ok) return edited;
    // Platform reports an unchanged message as an error; the screen is already correct.
    if (/message is not modified/i.test(edited.description || '')) return { ok: true, result: { message_id: slot.messageId, chat: { id: chatId } } };
    // Media captions, expired messages and deleted messages fall back to a new message.
  }
  return tgApi(token, 'sendMessage', { chat_id: chatId, text, ...extra });
}
export const memberPresent = member => ['creator', 'administrator', 'member'].includes(member?.status) || (member?.status === 'restricted' && member.is_member === true);
