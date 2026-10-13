import { serviceMessage, serviceCallback, serviceHome, serviceError } from './services/bot.js';
import { starsPreCheckout, starsSuccessful } from './services/payments.js';

// TEMPORARY STUB - full file follows in next commit if this works
export async function handleUpdate() { console.error('[telegram] STUB — full restore pending'); }
export { tgApi, resolveToken, sendToUser } from './bot-api.js';
export function renderPollText() { return ''; }
export function pollKeyboard() { return { inline_keyboard: [] }; }
export async function sendPollToChat() {}
export function reactMarkup() { return { inline_keyboard: [] }; }
