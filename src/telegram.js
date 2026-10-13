import { serviceMessage, serviceCallback, serviceHome, serviceError } from './services/bot.js';
import { starsPreCheckout, starsSuccessful } from './services/payments.js';

import {
  getMenu, getSettings, getUser, putUser, bumpStats, pushRecentUser,
  getPoll, putPoll, pollTotals, getPost, putPost,
  getTicket, ticketAppendUser, getStats,
} from './kv.js';
import { getJson, putJson } from './kv.js';
import { tgApi, resolveToken, sendToUser, beginMessageEdit, endMessageEdit } from './bot-api.js';
export { tgApi, resolveToken, sendToUser } from './bot-api.js';
import { membershipGate, sendMembershipLock, joinUrl } from './gate.js';
import { PURPOSES, enabled, text as tr, assert, str, label, cutBytes, httpsUrl } from './config.js';
import { entityKey, allEntities } from './storage.js';
import { commerceMessage, commerceCallback, catalog, showProduct, showCart, myOrders, checkoutError, resumeMemberDeliveries, searchProducts } from './commerce.js';
import { completeSignup, showPoints, progress } from './crm.js';
import { moderateMessage, groupMemberUpdate, captchaCallback, raffleCallback } from './groups.js';
import { channelPost, relayMessage } from './automation.js';
import { engagementCallback } from './engagement.js';
import { ratesHome, ratesCallback } from './rates.js';
import { newsHome, newsCallback } from './news.js';
import { adminCallback, adminFlow, adminHome, isAdminUser } from './admin-bot.js';
export { renderPollText, pollKeyboard, sendPollToChat, reactMarkup } from './engagement.js';

const BOT_T = {
  fa: {
    chooseLang: '🌍 زبان خود را انتخاب کنید:',
    unknown: '🤔 متوجه نشدم. برای دیدن راهنما /help را بزنید.',
    langSet: '✅ زبان به فارسی تغییر کرد.',
    yourId: '🆔 آیدی عددی شما:',
    pong: '🏓 پونگ! ربات فعال است.',
    singleLang: '🌍 این ربات فقط به فارسی پاسخ می‌دهد.',
    lock: '🔒 برای استفاده از ربات، ابتدا در کانال ما عضو شوید:',
    lockOk: '✅ عضویت تایید شد! ربات برای شما فعال شد. /start را بزنید.',
    lockNo: '❌ هنوز عضو کانال نشده‌اید. ابتدا عضو شوید و دوباره بزنید.',
    lockBtn: '📢 عضویت در کانال',
    lockCheck: '✅ عضو شدم',
    supportIntro: '🛡 حالا در حالت گفتگو با پشتیبانی هستید.\nپیام خود را بنویسید؛ کارشناسان ما در اولین فرصت پاسخ می‌دهند.\n\nبرای پایان /end را بزنید.',
    supportSent: '✅ پیام شما به پشتیبانی ارسال شد. پاسخ را همین‌جا دریافت می‌کنید.',
    supportClosed: '✅ گفتگوی پشتیبانی بسته شد. مجدداً نیاز بود /support را بفرستید.',
    supportReply: '💬 پاسخ پشتیبانی:',
    voteDone: '✅ رأی شما ثبت شد',
    voteMoved: '✅ رأی شما تغییر کرد',
    voteSame: ' شما همین گزینه را انتخاب کرده‌اید',
    voteRefresh: '🔄 نتایج بروزرسانی شد',
    voteGone: '⌛ این نظرسنجی منقضی شده است',
    reactDone: '👍 ثبت شد',
    reactOff: 'برداشته شد',
    back: '⬅️ بازگشت',
    refresh: '🔄 بروزرسانی نتایج',
  },
  en: {
    chooseLang: '🌍 Choose your language:',
    unknown: '🤔 I did not understand. Send /help for guidance.',
    langSet: '✅ Language set to English.',
    yourId: '🆔 Your numeric ID:',
    pong: '🏓 Pong! The bot is online.',
    singleLang: '🌍 This bot only responds in English.',
    lock: '🔒 Join our channel first to use the bot:',
    lockOk: '✅ Membership confirmed! The bot is now active for you. Send /start.',
    lockNo: '❌ You are not a member yet. Join first, then try again.',
    lockBtn: '📢 Join channel',
    lockCheck: '✅ I joined',
    supportIntro: '🛡 You are now in support mode.\nWrite your message; our team will reply here.\n\nSend /end to leave support mode.',
    supportSent: '✅ Your message was sent to support. Replies will appear here.',
    supportClosed: '✅ Support chat closed. Send /support if you need help again.',
    supportReply: '💬 Support reply:',
    voteDone: '✅ Your vote was recorded',
    voteMoved: '✅ Your vote was updated',
    voteSame: 'You already selected this option',
    voteRefresh: '🔄 Results refreshed',
    voteGone: '⌛ This poll has expired',
    reactDone: '👍 Saved',
    reactOff: 'Removed',
    back: '⬅️ Back',
    refresh: '🔄 Refresh results',
  },
};

function effectiveLang(user, settings) {
  if (settings.botLangMode === 'fa') return 'fa';
  if (settings.botLangMode === 'en') return 'en';
  return user?.lang === 'en' ? 'en' : 'fa';
}

async function touchUser(env, from) {
  const id = String(from.id);
  let user = await getUser(env, id);
  const isNew = !user;
  if (!user) {
    user = {
      id,
      firstName: from.first_name || '',
      username: from.username || '',
      lang: '',
      joinedAt: Date.now(),
      lastSeen: Date.now(),
      banned: false,
      blockedBot: false,
      privateStarted: false,
      supportOpen: false,
      flow: null,
      pendingStart: '',
      referredBy: '',
    };
    await bumpStats(env, { users: 1 });
  } else {
    user.firstName = from.first_name || user.firstName || '';
    user.username = from.username || user.username || '';
    user.lastSeen = Date.now();
    user.blockedBot = false;
  }
  await putUser(env, user);
  await pushRecentUser(env, id);
  return { user, isNew };
}

export async function handleUpdate(env, update) {
  const duplicateKey = Number.isSafeInteger(update.update_id) ? entityKey('update', update.update_id) : null;
  if (duplicateKey && await getJson(env, duplicateKey)) return;
  const token = await resolveToken(env); if (!token) return;
  const settings = await getSettings(env);
  if (update.pre_checkout_query && await starsPreCheckout(env, update.pre_checkout_query)) {}
  else if (update.message?.successful_payment && await starsSuccessful(env, update.message)) {}
  else if (update.my_chat_member || update.chat_member) await groupMemberUpdate(env, token, update, settings);
  else if (update.channel_post) await channelPost(env, token, update.channel_post, settings);
  else if (update.message || update.edited_message) await onMessage(env, update.message || update.edited_message, token, settings);
  else if (update.callback_query) await onCallback(env, update.callback_query, token, settings);
  if (duplicateKey) await putJson(env, duplicateKey, { at: Date.now() }, { ttl: 7 * 86400 });
}

async function onMessage(env, msg, token, settings) {
  // Soroush+ private chats may use non-Telegram id ranges. Never treat a chat as a
  // group solely because id < 0 — that routed private commands into moderation and
  // made /start + reply-keyboard text look dead while inline callbacks still worked.
  const chatType = msg.chat?.type;
  const isGroup = chatType === 'group' || chatType === 'supergroup'
    || (chatType !== 'private' && chatType !== 'channel' && Number(msg.chat?.id) < 0);
  if (isGroup) return moderateMessage(env, token, msg, settings);
  const from = msg.from; if (!from || from.is_bot || msg.edit_date) return;
  const { user, isNew } = await touchUser(env, from); if (user.banned) return;
  const text = String(msg.text || msg.caption || '').trim(), chatId = msg.chat.id, lang = effectiveLang(user, settings), T = BOT_T[lang];
  let cmd = '';
  if (text.startsWith('/')) cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();
  else if (/^(start|help|lang|id|support|ping|cancel|end|admin|panel)$/i.test(text)) cmd = '/' + text.toLowerCase();
  user.privateStarted = true;
  if (cmd === '/start') {
    const param = text.split(/\s+/)[1] || ''; user.pendingStart = param.slice(0, 64);
    if (isNew && /^ref_\d+$/.test(param) && param.slice(4) !== String(user.id)) user.referredBy = param.slice(4);
    user.supportOpen = false; user.flow = null;
  }
  await putUser(env, user);
  const gate = await membershipGate(env, token, user, settings);
  if (!gate.ok) return sendMembershipLock(token, chatId, gate, lang, user.id);
  await completeSignup(env, user, settings); await bumpStats(env, { messages: 1 });
  const menu = await getMenu(env);
  if (cmd === '/cancel' || cmd === '/end') { user.flow = null; user.supportOpen = false; await putUser(env, user); return sendToUser(token, chatId, T.supportClosed); }
  try {
    if (await adminFlow(env, token, user, settings, lang, msg)) return;
    if (await serviceMessage(env, user, lang, msg)) return;
    if (!cmd && await commerceMessage(env, token, user, settings, lang, msg)) return;
    if (user.supportOpen && !cmd && enabled(settings, 'support')) {
      if (!text) return sendToUser(token, chatId, tr('لطفاً پیام متنی ارسال کنید.', 'Please send a text message.', lang));
      await ticketAppendUser(env, user, text); return sendToUser(token, chatId, T.supportSent);
    }
    if (cmd) {
      switch (cmd) {
        case '/start': {
          const param = user.pendingStart; user.pendingStart = ''; await putUser(env, user);
          if (settings.botPurpose === 'vpn') return serviceHome(env, user, lang);
          return sendStart(token, chatId, user, menu, lang, settings);
        }
        case '/id': return sendToUser(token, chatId, `${T.yourId} ${user.id}`);
        case '/ping': return sendToUser(token, chatId, T.pong);
        case '/help': return sendToUser(token, chatId, renderTpl(menu.help[lang] || menu.help.fa, user));
        case '/lang': return sendToUser(token, chatId, settings.botLangMode === 'both' ? T.chooseLang : T.singleLang, settings.botLangMode === 'both' ? { reply_markup: langKeyboard() } : {});
        case '/support': if (enabled(settings, 'support')) { user.supportOpen = true; user.flow = null; await putUser(env, user); return sendToUser(token, chatId, T.supportIntro); } break;
        case '/admin':
        case '/panel': {
          const isAdminUser = (settings.adminId && String(user.id) === String(settings.adminId)) || (env.ADMIN_ID && String(user.id) === String(env.ADMIN_ID));
          if (!isAdminUser) return sendToUser(token, chatId, tr('⛔ این بخش فقط برای ادمین ربات در دسترس است.', '⛔ Admin only.', lang));
          return adminHome(env, token, chatId, settings, lang);
        }
      }
    }
    if (!cmd && await relayMessage(env, token, msg, user, settings, lang)) return;
  } catch (e) {
    return sendToUser(token, chatId, str(e.message || 'error', 200) + '\n/cancel');
  }
  return sendToUser(token, chatId, T.unknown);
}

function renderTpl(text = '', user = {}) {
  return String(text)
    .replace(/\{name\}/g, user.firstName || '')
    .replace(/\{username\}/g, user.username ? `@${user.username}` : '')
    .replace(/\{id\}/g, String(user.id || ''));
}

function langKeyboard() {
  return { inline_keyboard: [[{ text: '🇮🇷 فارسی', callback_data: 'setlang:fa' }, { text: '🇬🇧 English', callback_data: 'setlang:en' }]] };
}

function telegramButton(b) {
  if (!b || typeof b !== 'object') return null;
  const text = label(b.text, 64);
  if (!text) return null;
  if (b.type === 'url') {
    const url = String(b.value || '').trim();
    return /^(https?|tg):\/\//i.test(url) ? { text, url: cutBytes(url, 512) } : null;
  }
  if (b.type === 'submenu') {
    const value = cutBytes(String(b.value || '').trim(), 32);
    return value ? { text, callback_data: `sub:${value}` } : null;
  }
  if (b.type === 'text') {
    const src = String(b._src || 'root'), r = Number.isFinite(+b._r) ? +b._r : 0, c = Number.isFinite(+b._c) ? +b._c : 0;
    return { text, callback_data: cutBytes(`txt:${src}:${r}:${c}`, 64) };
  }
  const value = cutBytes(String(b.value || '').trim(), 64);
  return { text, callback_data: value || 'noop' };
}

export function pageMarkup(rows, { withBack = false, T = BOT_T.fa } = {}) {
  const kb = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!Array.isArray(row)) continue;
    const line = [];
    for (const b of row) {
      const btn = telegramButton(b);
      if (btn) line.push(btn);
    }
    if (line.length) kb.push(line.slice(0, 8));
  }
  if (withBack) kb.push([{ text: label(T.back, 64), callback_data: 'sub:root' }]);
  return { inline_keyboard: kb };
}

function tagButtons(rows, src) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, r) => (Array.isArray(row) ? row : []).map((b, c) => ({ ...(b || {}), _src: src, _r: r, _c: c })));
}

function customButtonsOf(menu) {
  return Array.isArray(menu?.explicitInlineButtons) ? menu.explicitInlineButtons : (menu?.inlineButtons || []);
}

function withSupport(rows, settings, lang) {
  if (!enabled(settings, 'support') || !settings.supportButton?.enabled) return rows || [];
  const text = label((lang === 'en' ? settings.supportButton?.en : settings.supportButton?.fa) || '🛡 Support', 64);
  return [...(rows || []), [{ text, type: 'callback', value: 'support:open' }]];
}

export function inlineMarkup(menu, settings, lang, user = null) {
  const rows = withSupport(tagButtons(customButtonsOf(menu), 'root'), settings, lang);
  return pageMarkup(rows, { T: BOT_T[lang] || BOT_T.fa });
}

export async function sendStart(token, chatId, user, menu, lang, settings) {
  const purpose = PURPOSES[settings.botPurpose] || PURPOSES.custom;
  let welcome;
  const customButtons = customButtonsOf(menu);
  if (settings.botPurpose === 'custom' && !customButtons.length && !menu.customized) {
    welcome = `${tr('سلام', 'Hello', lang)} ${user.firstName || ''} 👋\n${lang === 'en' ? purpose.en : purpose.fa}`;
  } else {
    welcome = settings.botPurpose === 'custom' || menu.customized ? renderTpl(menu.welcome[lang] || menu.welcome.fa, user) : `${tr('سلام', 'Hello', lang)} ${user.firstName || ''} 👋\n${lang === 'en' ? purpose.en : purpose.fa}\n${tr('از گزینه‌های زیر استفاده کنید.', 'Choose an option below.', lang)}`;
  }
  const result = await sendToUser(token, chatId, welcome, { reply_markup: inlineMarkup(menu, settings, lang, user), disable_web_page_preview: true });
  const rows = Array.isArray(menu?.mainKeyboard) ? menu.mainKeyboard : [];
  if (rows.length) {
    const keyboard = rows.filter(Array.isArray).map((row) => row.map((cell) => ({ text: String(cell || '').slice(0, 64) })).filter((b) => b.text)).filter((row) => row.length).slice(0, 8);
    if (keyboard.length) {
      await tgApi(token, 'sendMessage', {
        chat_id: chatId,
        text: lang === 'en' ? '⌨️ Quick commands' : '⌨️ دستورات سریع',
        reply_markup: { keyboard, resize_keyboard: true },
      });
    }
  }
  return result;
}

async function onCallback(env, cb, token, settings) {
  if (!cb?.from || cb.from.is_bot) return;
  const { user } = await touchUser(env, cb.from), lang = effectiveLang(user, settings), T = BOT_T[lang];
  const data = String(cb.data || ''), chatId = cb.message?.chat.id, messageId = cb.message?.message_id;
  const answer = (text = '', alert = false) => tgApi(token, 'answerCallbackQuery', { callback_query_id: cb.id, text, show_alert: alert });
  if (user.banned || !chatId) return answer();
  try {
    if (data === 'setlang:fa' || data === 'setlang:en') {
      const l = data.endsWith('en') ? 'en' : 'fa';
      user.lang = l; await putUser(env, user);
      const menu = await getMenu(env);
      await sendStart(token, chatId, user, menu, l, settings);
      return answer(BOT_T[l].langSet);
    }
    if (data === 'support:open' && enabled(settings, 'support')) {
      user.supportOpen = true; user.flow = null; await putUser(env, user);
      await sendToUser(token, chatId, T.supportIntro);
      return answer();
    }
    if (data === 'sub:root') {
      const menu = await getMenu(env);
      await sendStart(token, chatId, user, menu, lang, settings);
      return answer();
    }
    if (data.startsWith('sub:')) {
      const pageId = data.slice(4);
      const menu = await getMenu(env);
      const sm = menu.submenus?.[pageId];
      if (!sm) return answer(tr('صفحه پیدا نشد', 'Page not found', lang), true);
      await tgApi(token, 'editMessageText', {
        chat_id: chatId, message_id: messageId,
        text: `${sm.title ? sm.title + '\n\n' : ''}${sm.text}`,
        reply_markup: pageMarkup(tagButtons(withSupport(sm.buttons, settings, lang), pageId), { withBack: true, T }),
        disable_web_page_preview: true,
      });
      return answer();
    }
    if (await engagementCallback(env, token, user, settings, lang, cb)) return;
    if (await serviceCallback(env, user, lang, data)) return answer();
    if (await commerceCallback(env, token, user, settings, lang, data)) return answer();
  } catch (e) {
    return answer(str(e.message || 'error', 120), true);
  }
  return answer();
}
