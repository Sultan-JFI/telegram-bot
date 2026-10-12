/* Administrator controls inside Telegram itself. Every feature that can be
 * managed from the web panel — news publishing/scheduling, forward-removal
 * approvals and the menu/button editor — has an equivalent here, driven by
 * inline buttons and short input flows, restricted to the bot administrator. */
import {
  getSettings, saveSettings, getMenu, saveMenu, putUser, getUser, getStats,
  listUsersPage, getRecentBroadcasts, getEngagementLists, getTicketsList,
  getTicket, markTicketRead, ticketAppendAdmin, closeTicket,
} from './kv.js';
import { entityKey, allEntities } from './storage.js';
import { str, int, isChatId, text as tr, assert, PURPOSES, MODULES, enabled, isValidTime, label, byteLength } from './config.js';
import { sendToUser, resolveToken, tgApi } from './bot-api.js';
import { NEWS_CATEGORIES, sendNewsDigest } from './news.js';
import { RATES_CATEGORIES, RATES_SEND_CATS, getLiveRates, ratesSourcesText, sendRatesNow } from './rates.js';
import { publishRelay } from './automation.js';
import { patchV2Settings } from './config.js';
import { createBroadcast } from './broadcast.js';
import { getOrder, updateOrder, statusTitle, validateProduct } from './commerce.js';

export const isAdminUser = (env, settings, user) =>
  !!user && ((settings.adminId && String(user.id) === String(settings.adminId)) || (env.ADMIN_ID && String(user.id) === String(env.ADMIN_ID)));

const T = {
  adminOnly: ['⛔ این بخش فقط برای ادمین ربات در دسترس است.', '⛔ Admin access only.'],
  invalidValue: ['❌ مقدار واردشده معتبر نیست؛ دوباره تلاش کنید یا /cancel را بزنید.', '❌ Invalid value; try again or send /cancel.'],
  noDest: ['⚠️ ابتدا مقصدها را ثبت کنید.', '⚠️ Set destinations first.'],
  newsSent: ['✅ خبر ارسال شد به', '✅ News sent to'],
  newsFailed: ['مقصد ناموفق', 'failed destination(s)'],
  btnTextSaved: ['✅ متن دکمه به‌روزرسانی شد.', '✅ Button text updated.'],
  btnValueSaved: ['✅ مقدار دکمه به‌روزرسانی شد.', '✅ Button value updated.'],
  btnAdded: ['✅ دکمه اضافه شد.', '✅ Button added.'],
  btnDeleted: ['🗑 دکمه حذف شد.', '🗑 Button deleted.'],
  btnMoved: ['↔️ جای دکمه تغییر کرد.', '↔️ Button moved.'],
  saved: ['✅ ذخیره شد.', '✅ Saved.'],
  destSaved: (n) => [`✅ ${n} مقصد ثبت شد.`, `✅ ${n} destinations saved.`],
  sendTextPrompt: ['متن دکمه را بفرستید (حداکثر ۶۴ کاراکتر). /cancel برای انصراف', 'Send the button text (max 64 chars). /cancel to abort'],
  sendValuePrompt: ['مقدار دکمه را بفرستید:\n• لینک: با https شروع شود\n• کال‌بک: حداکثر ۶۴ کاراکتر\n• پاپ‌آپ متن: حداکثر ۲۰۰ کاراکتر', 'Send the button value:\n• URL: must start with https\n• Callback: up to 64 chars\n• Text popup: up to 200 chars'],
  addTextPrompt: ['متن دکمه جدید را بفرستید. /cancel برای انصراف', 'Send the new button text. /cancel to abort'],
  addValuePrompt: ['مقدار دکمه جدید را بفرستید (لینک کامل، کال‌بک یا متن پاپ‌آپ).', 'Send the new button value (full URL, callback or popup text).'],
  newsDestPrompt: ['آیدی مقصدهای خبر را بفرستید؛ هر خط: عنوان | آیدی\nمثال:\nکانال خبر | @mychannel\nگروه ورزشی | -1001234567890', 'Send news destinations; one per line: Title | ChatID'],
  relayDestPrompt: ['آیدی مقصدهای حذف‌فوروارد را بفرستید؛ هر خط: عنوان | آیدی', 'Send relay destinations; one per line: Title | ChatID'],
  typePrompt: ['نوع دکمه جدید را انتخاب کنید:', 'Choose the button type:'],
  adminIdPrompt: ['آیدی عددی ادمین جدید را بفرستید. برای حذف، 0 بفرستید.', 'Send the new numeric administrator ID. Send 0 to clear it.'],
  userMessagePrompt: ['متن پیام برای این کاربر را بفرستید:', 'Send the message for this user:'],
  broadcastTextPrompt: ['متن پیام همگانی را بفرستید (حداکثر ۴۰۹۶ کاراکتر):', 'Send the broadcast text (max 4096 characters):'],
  faqPrompt: ['هر خط با قالب «سؤال | پاسخ» ارسال کنید:', 'Send one line in the format “Question | Answer”:'],
  ratesDestPrompt: ['آیدی مقصدهای قیمت را بفرستید؛ هر خط: عنوان | آیدی\nمثال:\nکانال قیمت | @rateschannel\nگروه اقتصادی | -1001234567890', 'Send rate destinations; one per line: Title | ChatID'],
  productAddPrompt: ['محصول جدید را با این قالب بفرستید:\nعنوان | قیمت (تومان)\nمثال:\nلایسنس ۱ماهه | 150000', 'Send the new product as: Title | Price (toman)'],
  couponAddPrompt: ['کد تخفیف را با این قالب بفرستید:\nکد | نوع (percent یا amount) | مقدار\nمثال:\nOFF10 | percent | 10', 'Send the coupon as: CODE | percent|amount | value'],
  lockSetPrompt: ['قفل کانال را با این قالب بفرستید:\nآیدی کانال | لینک عضویت\nبرای غیرفعال کردن فقط کلمه off را بفرستید.', 'Send the channel lock as: ChannelID | Join URL. Send "off" to disable.'],
  sbTextPrompt: ['متن دکمه پشتیبانی را بفرستید؛ هر خط: متن فارسی | متن انگلیسی', 'Send the support button text; one line: Persian | English'],
  tokenPrompt: ['توکن جدید ربات را بفرستید (از BotFather).', 'Send the new bot token (from BotFather).'],
  notifyChatPrompt: ['آیدی چت اعلان سفارش را بفرستید؛ برای حذف، 0 بفرستید.', 'Send the order-notification chat ID; send 0 to clear.'],
  cardPrompt: ['اطلاعات کارت بانکی را بفرستید؛ هر خط: شماره کارت | نام دارنده\nبرای پاک کردن فقط کلمه off را بفرستید.', 'Send the bank card as: CardNumber | Holder. Send "off" to clear.'],
};
const t2 = (key, lang) => tr(T[key]?.[0] || key, T[key]?.[1] || key, lang);

const typeName = (type, lang) => ({
  url: tr('لینک', 'URL', lang), callback: tr('کال‌بک', 'Callback', lang),
  submenu: tr('زیرمنو', 'Submenu', lang), text: tr('پاپ‌آپ متن', 'Text popup', lang),
}[type] || type);
const catName = (key, lang) => key === 'all' ? tr('همه دسته‌ها (ترکیبی)', 'All categories (mixed)', lang) : (NEWS_CATEGORIES[key] ? (lang === 'en' ? NEWS_CATEGORIES[key].en : NEWS_CATEGORIES[key].fa) : key);
const onOff = (v, lang) => v ? tr('روشن ✅', 'On ✅', lang) : tr('خاموش ❌', 'Off ❌', lang);

async function patch(env, body) {
  const s = await getSettings(env);
  patchV2Settings(s, body);
  await saveSettings(env, s);
  return s;
}

const backRow = (lang) => [{ text: '🔙 ' + tr('پنل ادمین', 'Admin panel', lang), callback_data: 'adm:root' }];
const cancelMarkup = (lang) => ({ reply_markup: { inline_keyboard: [[{ text: '❌ ' + tr('انصراف', 'Cancel', lang), callback_data: 'adm:cancel' }]] } });
async function promptFlow(env, token, chatId, user, flow, text, lang, extra = {}) {
  const sent = await sendToUser(token, chatId, text, { ...cancelMarkup(lang), ...extra });
  user.flow = { ...flow, messageId: sent.result?.message_id || null };
  await putUser(env, user);
  return sent;
}
// Follow-up steps of a text-input flow replace the prompt message itself, so the
// admin conversation never stacks a new screen after every tap/entry.
async function editPrompt(token, chatId, messageId, text, extra) {
  if (messageId) {
    const edited = await tgApi(token, 'editMessageText', { chat_id: chatId, message_id: messageId, text, ...extra });
    if (edited.ok || /message is not modified/i.test(edited.description || '')) return edited;
  }
  return sendToUser(token, chatId, text, extra);
}

/* ============ Main admin screen ============
 * Every section of the web panel has a glass-button twin here. Taps refresh the
 * open message in place — the admin chat never fills up with duplicate screens. */
export async function adminHome(env, token, chatId, settings, lang = 'fa') {
  const url = settings.publicBaseUrl || env.PUBLIC_BASE_URL || '';
  const rows = [
    [
      { text: '📊 ' + tr('آمار ربات', 'Bot Stats', lang), callback_data: 'adm:stats' },
      { text: '👥 ' + tr('کاربران', 'Users', lang), callback_data: 'adm:users' },
    ],
    [
      { text: '⚙️ ' + tr('تنظیمات اصلی', 'Bot settings', lang), callback_data: 'adm:settings' },
      { text: '📣 ' + tr('ارسال همگانی', 'Broadcast', lang), callback_data: 'adm:broadcast' },
    ],
    [
      { text: '📰 ' + tr('مدیریت اخبار', 'News manager', lang), callback_data: 'adm:news' },
      { text: '📈 ' + tr('نرخ‌ها و قیمت‌ها', 'Rates & prices', lang), callback_data: 'adm:rates' },
    ],
    [
      { text: '🪄 ' + tr('حذف فوروارد', 'Forward removal', lang), callback_data: 'adm:relay' },
      { text: '🛒 ' + tr('فروش و سفارش‌ها', 'Shop & orders', lang), callback_data: 'adm:orders' },
    ],
    [
      { text: '📦 ' + tr('محصولات', 'Products', lang), callback_data: 'adm:products' },
      { text: '🎟 ' + tr('کدهای تخفیف', 'Coupons', lang), callback_data: 'adm:coupons' },
    ],
    [
      { text: '🎛 ' + tr('دکمه‌ها و منو', 'Buttons & menu', lang), callback_data: 'adm:menu' },
      { text: '💬 ' + tr('پشتیبانی', 'Support', lang), callback_data: 'adm:support' },
    ],
    [
      { text: '📊 ' + tr('تعامل و نظرسنجی', 'Engagement', lang), callback_data: 'adm:engagement' },
      { text: '🛡 ' + tr('گروه‌ها', 'Groups', lang), callback_data: 'adm:groups' },
    ],
    [
      { text: '📡 ' + tr('فیدها', 'Feeds', lang), callback_data: 'adm:feeds' },
      { text: '❓ ' + tr('پرسش‌های متداول', 'FAQ', lang), callback_data: 'adm:faq' },
    ],
    [
      { text: '⭐ ' + tr('وفاداری و امتیاز', 'Loyalty & CRM', lang), callback_data: 'adm:crm' },
      { text: '🖼 ' + tr('رسانه‌ها', 'Media', lang), callback_data: 'adm:media' },
    ],
    [
      { text: '🔐 ' + tr('قفل کانال', 'Channel lock', lang), callback_data: 'adm:lock' },
      { text: '🔌 ' + tr('وب‌هوک', 'Webhook', lang), callback_data: 'adm:webhook' },
    ],
    [
      { text: '🎚 ' + tr('تنظیم ارسال همگانی', 'Broadcast tuning', lang), callback_data: 'adm:tuning' },
      { text: '🛍 ' + tr('فروشگاه', 'Shop settings', lang), callback_data: 'adm:shop' },
    ],
    [
      { text: '🔑 ' + tr('توکن ربات', 'Bot token', lang), callback_data: 'adm:token' },
      { text: '🛡 ' + tr('دکمه پشتیبانی', 'Support button', lang), callback_data: 'adm:sb' },
    ],
    [
      { text: '📡 ' + tr('سرویس‌ها (VPN)', 'Services (VPN)', lang), callback_data: 'adm:services' },
    ],
  ];
  if (url) rows.push([{ text: '🚀 ' + tr('پنل مدیریت (مینی‌اپ)', 'Admin Mini App', lang), web_app: { url } }]);
  rows.push(backRow(lang));
  return sendToUser(token, chatId,
    `🛠 <b>${tr('مدیریت ربات از تلگرام', 'Manage the bot from Telegram', lang)}</b>\n\n` +
    tr('تمام بخش‌های قابل کنترل پنل وب از همین‌جا با دکمه‌های شیشه‌ای قابل مشاهده، ویرایش و ذخیره هستند؛ با هر انتخاب همین پیام ویرایش می‌شود و پیام جدیدی ساخته نمی‌گردد.',
      'All web-panel controls are available here with inline buttons, editing and saving. Every tap edits this message in place — no new messages.', lang),
    { reply_markup: { inline_keyboard: rows }, disable_web_page_preview: true });
}

/* ============ News manager ============ */
async function newsScreen(env, token, chatId, settings, lang) {
  const cfg = settings.news?.autoSend || {};
  const state = await env.BOT_KV.get('v2:news:state').then(v => v ? JSON.parse(v) : {});
  const dest = cfg.destinations || [];
  const lines = [
    `📰 <b>${tr('مدیریت اخبار', 'News manager', lang)}</b>`,
    '',
    `${tr('ارسال خودکار', 'Auto-send', lang)}: ${onOff(cfg.enabled, lang)}`,
    `${tr('دسته', 'Category', lang)}: ${catName(cfg.category, lang)}`,
    `${tr('فاصله ارسال', 'Interval', lang)}: ${tr('هر', 'every', lang)} ${cfg.intervalMinutes} ${tr('دقیقه', 'min', lang)}`,
    `${tr('مقصدها', 'Destinations', lang)}: ${dest.length ? dest.map(d => d.title || d.chatId).join('، ') : tr('ثبت نشده', 'none', lang)}`,
    state.nextAt && cfg.enabled ? `⏰ ${tr('ارسال بعدی', 'Next send', lang)}: ${new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' }).format(state.nextAt)}` : '',
    state.lastError ? `⚠️ ${state.lastError}` : '',
    '',
    tr('برای ارسال فوری، دسته را انتخاب کنید:', 'Tap a category to send it right now:', lang),
  ].filter(Boolean);
  const rows = [
    [
      { text: '🚨 ' + tr('فوری', 'Breaking', lang), callback_data: 'adm:nsend:breaking' },
      { text: '🏛 ' + tr('سیاسی', 'Politics', lang), callback_data: 'adm:nsend:politics' },
      { text: '📈 ' + tr('اقتصاد', 'Economy', lang), callback_data: 'adm:nsend:economy' },
    ],
    [
      { text: '⚽ ' + tr('ورزشی', 'Sports', lang), callback_data: 'adm:nsend:sports' },
      { text: '💻 ' + tr('فناوری', 'Tech', lang), callback_data: 'adm:nsend:tech' },
      { text: '🌍 ' + tr('جهان', 'World', lang), callback_data: 'adm:nsend:world' },
    ],
    [
      { text: '🌐 ' + tr('همه', 'All', lang), callback_data: 'adm:nsend:all' },
    ],
    [
      { text: '⏱ ' + tr('زمان‌بندی', 'Schedule', lang), callback_data: 'adm:nintmenu' },
      { text: '🎯 ' + catName(cfg.category, lang), callback_data: 'adm:ncatmenu' },
    ],
    [
      { text: `${cfg.enabled ? '⏸' : '▶️'} ${tr('ارسال خودکار', 'Auto-send', lang)}: ${onOff(cfg.enabled, lang)}`, callback_data: 'adm:nauto' },
      { text: `📡 ${tr('مقصدها', 'Destinations', lang)} (${dest.length})`, callback_data: 'adm:ndest' },
    ],
    backRow(lang),
  ];
  return sendToUser(token, chatId, lines.join('\n'), { reply_markup: { inline_keyboard: rows } });
}

async function newsCatPickScreen(env, token, chatId, settings, lang) {
  const rows = [[{ text: '🌐 ' + tr('همه دسته‌ها', 'All categories', lang), callback_data: 'adm:ncat:all' }]];
  for (const [key, cat] of Object.entries(NEWS_CATEGORIES)) {
    rows.push([{ text: cat.fa, callback_data: `adm:ncat:${key}` }]);
  }
  rows.push([{ text: '🔙 ' + tr('بازگشت', 'Back', lang), callback_data: 'adm:news' }]);
  return sendToUser(token, chatId, tr('دسته ارسال خودکار را انتخاب کنید:', 'Choose the auto-send category:', lang), { reply_markup: { inline_keyboard: rows } });
}

async function newsIntervalScreen(env, token, chatId, settings, lang) {
  const options = [15, 30, 60, 180, 360, 720, 1440];
  const rows = [];
  for (let i = 0; i < options.length; i += 2) {
    rows.push(options.slice(i, i + 2).map(m => ({ text: tr('هر', 'Every', lang) + ' ' + m + ' ' + tr('دقیقه', 'min', lang), callback_data: `adm:nint:${m}` })));
  }
  rows.push([{ text: '🔙 ' + tr('بازگشت', 'Back', lang), callback_data: 'adm:news' }]);
  return sendToUser(token, chatId, tr('فاصله ارسال خودکار خبر (با انتخاب، ارسال خودکار روشن می‌شود):', 'Auto-send interval (picking one turns auto-send on):', lang), { reply_markup: { inline_keyboard: rows } });
}

/* ============ Rates (gold / dollar / crypto) manager ============ */
async function ratesScreen(env, token, chatId, settings, lang) {
  const cfg = settings.rates?.autoSend || {};
  const state = await env.BOT_KV.get('v2:rates:state').then(v => v ? JSON.parse(v) : {});
  const dest = cfg.destinations || [];
  const catName = key => key === 'all' ? tr('همه (طلاب، ارز، کریپتو)', 'All (gold, FX, crypto)', lang) : (RATES_CATEGORIES[key] ? (lang === 'en' ? RATES_CATEGORIES[key].en : RATES_CATEGORIES[key].fa) : key);
  const lines = [
    `📈 <b>${tr('نرخ‌ها و قیمت‌ها', 'Rates & prices', lang)}</b>`,
    '',
    `${tr('ارسال خودکار', 'Auto-send', lang)}: ${onOff(cfg.enabled, lang)}`,
    `${tr('نوع ارز', 'Asset type', lang)}: ${catName(cfg.category)}`,
    `${tr('زمان روزانه', 'Daily time', lang)}: ${cfg.time || tr('ثبت نشده', 'none', lang)}`,
    `${tr('مقصدها', 'Destinations', lang)}: ${dest.length ? dest.map(d => d.title || d.chatId).join('، ') : tr('ثبت نشده', 'none', lang)}`,
    state.lastAt ? `🕐 ${tr('آخرین ارسال', 'Last send', lang)}: ${new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' }).format(state.lastAt)}` : '',
    state.lastError ? `⚠️ ${state.lastError}` : '',
    '',
    tr('برای ارسال فوری، نوع ارز را انتخاب کنید:', 'Tap an asset type to send it right now:', lang),
  ].filter(Boolean);
  const rows = [
    [
      { text: '🪙 ' + tr('طلا و سکه', 'Gold', lang), callback_data: 'adm:rsend:gold' },
      { text: '💵 ' + tr('ارزها', 'FX', lang), callback_data: 'adm:rsend:fiat' },
      { text: '💎 ' + tr('کریپتو', 'Crypto', lang), callback_data: 'adm:rsend:crypto' },
    ],
    [{ text: '📊 ' + tr('جدول کامل', 'Full table', lang), callback_data: 'adm:rsend:all' }],
    [
      { text: '🕐 ' + (cfg.time ? cfg.time + ' — ' : '') + tr('زمان ارسال', 'Schedule time', lang), callback_data: 'adm:rtmenu' },
      { text: '🎯 ' + catName(cfg.category), callback_data: 'adm:rcatmenu' },
    ],
    [
      { text: `${cfg.enabled ? '⏸' : '▶️'} ${tr('ارسال خودکار', 'Auto-send', lang)}: ${onOff(cfg.enabled, lang)}`, callback_data: 'adm:rauto' },
      { text: `📡 ${tr('مقصدها', 'Destinations', lang)} (${dest.length})`, callback_data: 'adm:rddest' },
    ],
    [{ text: '🔌 ' + tr('بررسی منابع نرخ', 'Check rate sources', lang), callback_data: 'adm:rsrc' }],
    backRow(lang),
  ];
  return sendToUser(token, chatId, lines.join('\n'), { reply_markup: { inline_keyboard: rows } });
}

async function ratesCatPickScreen(env, token, chatId, settings, lang) {
  const rows = [[{ text: '📊 ' + tr('همه (طلاب، ارز، کریپتو)', 'All (gold, FX, crypto)', lang), callback_data: 'adm:rcat:all' }]];
  for (const [key, cat] of Object.entries(RATES_CATEGORIES)) {
    rows.push([{ text: lang === 'en' ? cat.en : cat.fa, callback_data: `adm:rcat:${key}` }]);
  }
  rows.push([{ text: '🔙 ' + tr('بازگشت', 'Back', lang), callback_data: 'adm:rates' }]);
  return sendToUser(token, chatId, tr('نوع ارزی که هر روز ارسال شود را انتخاب کنید:', 'Choose which asset type to publish daily:', lang), { reply_markup: { inline_keyboard: rows } });
}

async function ratesTimeScreen(env, token, chatId, settings, lang) {
  const times = ['06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  const rows = [];
  for (let i = 0; i < times.length; i += 2) {
    rows.push(times.slice(i, i + 2).map(t => ({ text: '🕐 ' + t, callback_data: `adm:rt:${t}` })));
  }
  rows.push([{ text: settings.rates?.autoSend?.time ? '⏸ ' + tr('بدون زمان مشخص (خاموش)', 'No daily time (off)', lang) : '✅ ' + tr('حذف زمان', 'Remove time', lang), callback_data: 'adm:rt:off' }]);
  rows.push([{ text: '🔙 ' + tr('بازگشت', 'Back', lang), callback_data: 'adm:rates' }]);
  return sendToUser(token, chatId, tr('ساعت روزانه ارسال قیمت در زمان‌بندی تهران را انتخاب کنید:', 'Choose the daily delivery time (Tehran):', lang), { reply_markup: { inline_keyboard: rows } });
}

/* ============ Forward-removal (relay) manager ============ */
async function relayScreen(env, token, chatId, settings, lang) {
  const rl = settings.relay || {};
  const pending = (await allEntities(env, 'relay')).filter(r => ['pending', 'ready'].includes(r.status)).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
  const dest = rl.destinations || [];
  const lines = [
    `🪄 <b>${tr('حذف فوروارد / بی‌نام‌ساز', 'Forward removal / relay', lang)}</b>`,
    '',
    `${tr('دریافت پیام کاربران', 'Receive user messages', lang)}: ${onOff(rl.enabled, lang)}`,
    `${tr('تأیید مدیر پیش از ارسال', 'Admin approval', lang)}: ${onOff(rl.approval !== false, lang)}`,
    `${tr('مقصدها', 'Destinations', lang)}: ${dest.length ? dest.map(d => d.title || d.chatId).join('، ') : tr('ثبت نشده', 'none', lang)}`,
    '',
    pending.length ? tr('پیام‌های در انتظار تصمیم شما:', 'Messages waiting for your decision:', lang) : tr('پیام در انتظاری وجود ندارد.', 'Nothing is waiting right now.', lang),
  ];
  const rows = [];
  for (const [i, r] of pending.entries()) {
    rows.push([{ text: `#${i + 1} ${String(r.userName || r.userId).slice(0, 16)}: ${String(r.text || tr('فایل/رسانه', 'file/media', lang)).slice(0, 24)}`, callback_data: `adm:relayview:${r.id}` }]);
  }
  rows.push([
    { text: `${rl.approval !== false ? '⏭' : '🛡'} ${tr('تأیید مدیر', 'Admin approval', lang)}: ${onOff(rl.approval !== false, lang)}`, callback_data: 'adm:rapp' },
  ]);
  rows.push([
    { text: `${rl.enabled ? '⏸' : '▶️'} ${tr('دریافت پیام', 'Receive messages', lang)}`, callback_data: 'adm:ron' },
    { text: `📡 ${tr('مقصدها', 'Destinations', lang)} (${dest.length})`, callback_data: 'adm:rdest' },
  ]);
  rows.push(backRow(lang));
  return sendToUser(token, chatId, lines.join('\n'), { reply_markup: { inline_keyboard: rows } });
}

async function relayViewScreen(env, token, chatId, settings, lang, relayId) {
  const r = await env.BOT_KV.get(entityKey('relay', relayId)).then(v => v ? JSON.parse(v) : null);
  if (!r) return sendToUser(token, chatId, tr('این پیام پیدا نشد؛ شاید قبلاً بررسی شده است.', 'Message not found; it may already be processed.', lang), { reply_markup: { inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'adm:relay' }]] } });
  const attachments = (r.attachments || []).length;
  const rows = [['pending', 'ready'].includes(r.status) ? [
    { text: '✅ ' + tr('انتشار در مقصدها', 'Publish to destinations', lang), callback_data: `rl:pub:${r.id}` },
    { text: '❌ ' + tr('رد', 'Reject', lang), callback_data: `rl:rej:${r.id}` },
  ] : [{ text: `ℹ️ ${tr('وضعیت', 'Status', lang)}: ${r.status}`, callback_data: 'noop' }]];
  rows.push([{ text: '🔙 ' + tr('بازگشت', 'Back', lang), callback_data: 'adm:relay' }]);
  return sendToUser(token, chatId,
    `🪄 <b>${tr('بررسی پیام', 'Review message', lang)}</b>\n\n` +
    `👤 ${r.userName || ''} (${r.userId})\n` +
    `🕐 ${new Intl.DateTimeFormat('fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' }).format(r.createdAt || Date.now())}\n` +
    `📝 ${String(r.text || '—').slice(0, 1000)}\n` +
    `📎 ${attachments} ${tr('پیوست', 'attachment(s)', lang)}\n` +
    `🧾 ${tr('وضعیت', 'Status', lang)}: ${r.status}\n\n` +
    tr('با تأیید، پیام با copyMessage و بدون برچسب فوروارد به مقصدها ارسال می‌شود.', 'On approval the message is delivered with copyMessage — no forward attribution.', lang),
    { reply_markup: { inline_keyboard: rows } });
}

/* ============ Menu & button editor ============ */
function menuListScreen(menu, lang) {
  const rows = (Array.isArray(menu.inlineButtons) ? menu.inlineButtons : []).filter((row) => Array.isArray(row));
  const lines = [`🎛 <b>${tr('دکمه‌های صفحه اصلی', 'Main-page buttons', lang)}</b>`, '', tr('برای ویرایش، جابجایی یا حذف، دکمه هر ردیف را لمس کنید:', 'Tap a row to edit, move or delete it:', lang)];
  rows.forEach((row, r) => row.forEach((b, bi) => {
    const btn = b || {};
    const meta = typeName(btn.type, lang) + (btn.type === 'submenu' ? ` → ${btn.value}` : btn.value ? ` → ${String(btn.value).slice(0, 28)}` : '');
    lines.push(`${r + 1}-${bi + 1}. ${str(btn.text, 64)} <i>(${meta})</i>`);
  }));
  const kb = [];
  rows.forEach((row, r) => row.forEach((b, bi) => {
    kb.push([
      { text: `✏️ ${r + 1}-${bi + 1} ${str((b || {}).text, 18)}`, callback_data: `adm:mb:${r}:${bi}` },
      { text: '🗑', callback_data: `adm:mbx:${r}:${bi}` },
    ]);
  }));
  kb.push([{ text: '➕ ' + tr('افزودن دکمه جدید', 'Add a button', lang), callback_data: 'adm:mbadd' }]);
  kb.push(backRow(lang));
  return { text: lines.join('\n').slice(0, 4000), reply_markup: { inline_keyboard: kb }, disable_web_page_preview: true };
}

function buttonEditorScreen(menu, r, b, lang) {
  const row = menu.inlineButtons[r];
  const btn = row?.[b];
  if (!btn) return menuListScreen(menu, lang);
  const lines = [
    `🎛 <b>${tr('ویرایش دکمه', 'Edit button', lang)}</b>`,
    '',
    `#${r + 1}-${b + 1}`,
    `${tr('متن', 'Text', lang)}: ${btn.text}`,
    `${tr('نوع', 'Type', lang)}: ${typeName(btn.type, lang)}`,
    `${tr('مقدار', 'Value', lang)}: ${btn.value || '—'}`,
    '',
    tr('جابجایی: عقب/جلو در همان ردیف، یا انتقال به ردیف بالا/پایین.', 'Move: back/forward inside the row, or to the row above/below.', lang),
  ];
  const kb = [
    [
      { text: '✏️ ' + tr('متن', 'Text', lang), callback_data: `adm:mbt:${r}:${b}` },
      { text: '🔤 ' + tr('مقدار', 'Value', lang), callback_data: `adm:mbv:${r}:${b}` },
    ],
    [
      { text: '◀️ ' + tr('عقب', 'Back', lang), callback_data: `adm:mbl:${r}:${b}` },
      { text: '▶️ ' + tr('جلو', 'Fwd', lang), callback_data: `adm:mbr:${r}:${b}` },
    ],
    [
      { text: '⬆️ ' + tr('ردیف بالا', 'Row up', lang), callback_data: `adm:mbu:${r}:${b}` },
      { text: '⬇️ ' + tr('ردیف پایین', 'Row down', lang), callback_data: `adm:mbd:${r}:${b}` },
    ],
    [
      { text: '🗑 ' + tr('حذف دکمه', 'Delete', lang), callback_data: `adm:mbx:${r}:${b}` },
      { text: '🔙 ' + tr('لیست دکمه‌ها', 'Button list', lang), callback_data: 'adm:menu' },
    ],
  ];
  return { text: lines.join('\n'), reply_markup: { inline_keyboard: kb } };
}

function validateMenuButton(btn, menu) {
  const text = label(btn.text, 64);
  assert(text, 'invalid_menu_button');
  const type = ['url', 'callback', 'submenu', 'text'].includes(btn.type) ? btn.type : 'callback';
  const value = String(btn.value ?? '').trim();
  if (type === 'url') { assert(/^https?:\/\//i.test(value), 'invalid_menu_button'); return { text, type, value: value.slice(0, 512) }; }
  // Callback data is limited to 64 UTF-8 bytes, so Persian values count double.
  if (type === 'callback') { assert(byteLength(value) >= 1 && byteLength(value) <= 64, 'callback_too_long'); return { text, type, value }; }
  if (type === 'text') { assert(value.length >= 1 && value.length <= 200, 'invalid_menu_button'); return { text, type, value }; }
  assert(menu?.submenus?.[value], 'submenu_not_found');
  return { text, type, value };
}

async function mutateMenu(env, mutator) {
  const menu = await getMenu(env);
  mutator(menu.inlineButtons, menu);
  menu.inlineButtons = menu.inlineButtons.filter(r => Array.isArray(r) && r.length);
  await saveMenu(env, menu);
  return menu;
}

const errText = (e, lang) => ({
  invalid_menu_button: tr('مقدار دکمه معتبر نیست (لینک با https، کال‌بک ≤۶۴ بایت، متن ≤۲۰۰).', 'Invalid button value (https URL, callback ≤64 bytes, text ≤200).', lang),
  callback_too_long: tr('مقدار کال‌بک حداکثر ۶۴ بایت است (حروف فارسی ۲ بایت). مقدار کوتاه‌تری بنویسید.', 'Callback data is limited to 64 bytes (Persian letters count as 2). Use a shorter value.', lang),
  submenu_not_found: tr('زیرمنوی انتخابی وجود ندارد؛ ابتدا از پنل وب بسازید.', 'The submenu does not exist; create it in the web panel first.', lang),
  invalid_destinations: tr('مقصد معتبری ثبت نشده؛ با دکمه «مقصدها» آیدی کانال یا گروه را ثبت کنید.', 'No valid destinations; set channel/group IDs with the Destinations button first.', lang),
  news_empty: tr('فعلاً خبر تازه‌ای برای این دسته پیدا نشد؛ بعداً تلاش کنید.', 'No fresh news found for this category right now; try again later.', lang),
  module_disabled: tr('این ماژول در نوع فعلی ربات غیرفعال است.', 'This module is disabled for the current bot type.', lang),
  token_missing: tr('ابتدا توکن ربات را در پنل ثبت کنید.', 'Set the bot token in the panel first.', lang),
  invalid_product: tr('قالب محصول صحیح نیست؛ «عنوان | قیمت» بفرستید.', 'Bad product format; send “Title | Price”.', lang),
  invalid_coupon: tr('قالب کد تخفیف صحیح نیست؛ «CODE | percent|amount | مقدار» بفرستید.', 'Bad coupon format; send “CODE | percent|amount | value”.', lang),
  invalid_card_number: tr('شماره کارت باید ۱۶ رقم باشد.', 'The card number must have 16 digits.', lang),
  invalid_join_url: tr('لینک عضویت باید با https شروع شود.', 'The join URL must start with https.', lang),
  invalid_chat_id: tr('آیدی چت معتبر نیست.', 'Invalid chat ID.', lang),
  invalid_bot_token: tr('فرمت توکن معتبر نیست (123:ABC…).', 'The token format is invalid (123:ABC…).', lang),
  invalid_admin_id: tr('آیدی عددی معتبر نیست.', 'Invalid numeric ID.', lang),
  invalid_text: tr('متن معتبر نیست.', 'Invalid text.', lang),
  invalid_faq: tr('قالب سؤال و پاسخ صحیح نیست؛ «سؤال | پاسخ» بفرستید.', 'Bad FAQ format; send “Question | Answer”.', lang),
  invalid_news_time: tr('ساعت معتبر نیست (فرمت 09:00).', 'Invalid time (use HH:MM).', lang),
  invalid_rates_time: tr('ساعت معتبر نیست (فرمت 09:00).', 'Invalid time (use HH:MM).', lang),
  telegram_connection_failed: tr('اتصال به تلگرام ناموفق بود؛ توکن را بررسی کنید.', 'Telegram connection failed; check the token.', lang),
  webhook_secret_missing: tr('متغیر WEBHOOK_SECRET در محیط تنظیم نشده است.', 'WEBHOOK_SECRET is not configured in the environment.', lang),
  public_url_required: tr('آدرس عمومی پنل (PUBLIC_BASE_URL) تنظیم نشده است.', 'The public panel URL (PUBLIC_BASE_URL) is not configured.', lang),
  lock_needs_targets: tr('ابتدا با «ویرایش کانال» یک کانال ثبت کنید.', 'Register a channel with “Edit channel” first.', lang),
  product_not_found: tr('محصول پیدا نشد.', 'Product not found.', lang),
  coupon_not_found: tr('کد تخفیف پیدا نشد.', 'Coupon not found.', lang),
  user_not_found: tr('کاربر پیدا نشد.', 'User not found.', lang),
  group_not_found: tr('گروه پیدا نشد.', 'Group not found.', lang),
  feed_not_found: tr('فید پیدا نشد.', 'Feed not found.', lang),
  faq_not_found: tr('مورد پیدا نشد.', 'Entry not found.', lang),
  invalid_purpose: tr('نوع ربات معتبر نیست.', 'Invalid bot purpose.', lang),
  invalid_modules: tr('ماژول معتبر نیست.', 'Invalid module.', lang),
}[e.message] || e.message);


/* ============ Web-panel parity screens ============
 * These screens intentionally use the same callback/edit path as the news and
 * menu screens. A tap edits the current admin message; it never creates a new
 * screen message. Text entry is used only where Telegram needs a value. */
const adminRows = (rows, lang) => [...rows, backRow(lang)];
const sendView = (token, chatId, view) => sendToUser(token, chatId, view.text, { reply_markup: view.reply_markup, ...(view.disable_web_page_preview ? { disable_web_page_preview: true } : {}) });
const dateText = (value, lang = 'fa') => value ? new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'fa-IR', { timeZone: 'Asia/Tehran', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';

async function statsScreen(env, token, chatId, lang) {
  const s = await getStats(env);
  const users = await listUsersPage(env, { limit: 1 });
  const unread = (await getTicketsList(env)).reduce((n, t) => n + (t.unread || 0), 0);
  const text = `📊 <b>${tr('آمار ربات', 'Bot statistics', lang)}</b>\n\n` +
    `👥 ${tr('کاربران', 'Users', lang)}: ${s.users || users.rows.length || 0}\n` +
    `💬 ${tr('پیام‌ها', 'Messages', lang)}: ${s.messages || 0}\n` +
    `📣 ${tr('ارسال‌های همگانی', 'Broadcasts', lang)}: ${s.broadcasts || 0}\n` +
    `🚫 ${tr('مسدودها', 'Banned', lang)}: ${s.banned || 0}\n` +
    `📩 ${tr('تیکت‌های خوانده‌نشده', 'Unread tickets', lang)}: ${unread}`;
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows([[{ text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:stats' }]], lang) } });
}

async function settingsScreen(env, token, chatId, settings, lang, messageId = null) {
  const purpose = PURPOSES[settings.botPurpose] || PURPOSES.custom;
  const text = `⚙️ <b>${tr('تنظیمات اصلی ربات', 'Main bot settings', lang)}</b>\n\n` +
    `${tr('نوع ربات', 'Bot purpose', lang)}: ${lang === 'en' ? purpose.en : purpose.fa}\n` +
    `${tr('زبان پیش‌فرض', 'Default language', lang)}: ${settings.defaultLang === 'en' ? 'English' : 'فارسی'}\n` +
    `${tr('حالت زبان', 'Language mode', lang)}: ${settings.botLangMode}\n` +
    `${tr('آیدی ادمین', 'Admin ID', lang)}: ${settings.adminId || '—'}\n` +
    `${tr('ماژول‌های سفارشی', 'Custom modules', lang)}: ${(settings.customModules || []).length}`;
  const rows = [
    [{ text: '🧩 ' + tr('نوع ربات', 'Bot purpose', lang), callback_data: 'adm:setpurpose' }, { text: '🌍 ' + tr('حالت زبان', 'Language mode', lang), callback_data: 'adm:langmode' }],
    [{ text: '🆔 ' + tr('تغییر آیدی ادمین', 'Change admin ID', lang), callback_data: 'adm:adminid' }],
    [{ text: '📦 ' + tr('ماژول‌های سفارشی', 'Custom modules', lang), callback_data: 'adm:modules' }],
  ];
  const extra = { reply_markup: { inline_keyboard: adminRows(rows, lang) } };
  if (messageId) { const edited = await tgApi(token, 'editMessageText', { chat_id: chatId, message_id: messageId, text, ...extra }); if (edited.ok) return edited; }
  return sendToUser(token, chatId, text, extra);
}

async function purposeScreen(env, token, chatId, lang) {
  const rows = Object.entries(PURPOSES).map(([key, p]) => [{ text: `${p.fa}${key === 'custom' ? ' ✨' : ''}`, callback_data: `adm:purpose:${key}` }]);
  return sendToUser(token, chatId, tr('نوع ربات را انتخاب کنید:', 'Choose the bot purpose:', lang), { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function moduleScreen(env, token, chatId, settings, lang) {
  const active = new Set(settings.customModules || []);
  const rows = MODULES.map(key => [{ text: `${active.has(key) ? '✅' : '⬜'} ${key}`, callback_data: `adm:module:${key}` }]);
  rows.push([{ text: '💾 ' + tr('ذخیره و بازگشت', 'Save and back', lang), callback_data: 'adm:settings' }]);
  return sendToUser(token, chatId, tr('ماژول‌های فعال ربات سفارشی را انتخاب کنید:', 'Choose active custom-bot modules:', lang), { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function usersScreen(env, token, chatId, lang) {
  const page = await listUsersPage(env, { limit: 8 });
  const rows = page.rows.map(u => [{ text: `${u.banned ? '🚫' : '👤'} ${String(u.firstName || u.username || u.id).slice(0, 28)} · ${u.id}`, callback_data: `adm:user:${u.id}` }]);
  rows.push([{ text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:users' }]);
  return sendToUser(token, chatId, `👥 <b>${tr('کاربران اخیر', 'Recent users', lang)}</b>\n${tr('برای مدیریت یک کاربر انتخاب کنید:', 'Choose a user to manage:', lang)}`, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function userScreen(env, token, chatId, id, lang) {
  const u = await getUser(env, id);
  if (!u) return usersScreen(env, token, chatId, lang);
  const text = `👤 <b>${String(u.firstName || '—')}</b>\n\n🆔 ${u.id}\n👤 @${u.username || '—'}\n🌍 ${u.lang || '—'}\n🕐 ${dateText(u.lastSeen, lang)}\n${u.banned ? '🚫 ' + tr('مسدود', 'Banned', lang) : '✅ ' + tr('فعال', 'Active', lang)}`;
  const rows = [[{ text: u.banned ? '✅ ' + tr('رفع مسدودی', 'Unban', lang) : '🚫 ' + tr('مسدود کردن', 'Ban', lang), callback_data: `adm:user:${id}:${u.banned ? 'unban' : 'ban'}` }], [{ text: '✉️ ' + tr('ارسال پیام', 'Send message', lang), callback_data: `adm:usermsg:${id}` }]];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function broadcastScreen(env, token, chatId, lang) {
  const jobs = await getRecentBroadcasts(env);
  const text = `📣 <b>${tr('ارسال همگانی', 'Broadcasts', lang)}</b>\n\n` + (jobs.length ? jobs.slice(0, 6).map(j => `#${j.id} · ${j.status} · ${j.sent || 0}/${j.total || 0} · ${dateText(j.createdAt, lang)}`).join('\n') : tr('ارسالی ثبت نشده است.', 'No broadcasts yet.', lang));
  const rows = [[{ text: '➕ ' + tr('ارسال متن جدید', 'New text broadcast', lang), callback_data: 'adm:broadcast:new' }], [{ text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:broadcast' }]];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function engagementScreen(env, token, chatId, lang) {
  const data = await getEngagementLists(env);
  const text = `📊 <b>${tr('تعامل و نظرسنجی', 'Engagement', lang)}</b>\n\n` +
    `${tr('نظرسنجی‌ها', 'Polls', lang)}: ${data.polls.length}\n` + data.polls.slice(0, 8).map(p => `• ${String(p.q).slice(0, 54)} (${p.total || 0})`).join('\n') + '\n\n' +
    `${tr('پست‌ها', 'Posts', lang)}: ${data.posts.length}\n` + data.posts.slice(0, 5).map(p => `• ${String(p.caption || '—').slice(0, 54)} 👍${p.likes || 0}`).join('\n');
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows([[{ text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:engagement' }]], lang) } });
}

async function supportScreen(env, token, chatId, lang, messageId = null) {
  const tickets = await getTicketsList(env);
  const rows = tickets.slice(0, 12).map(t => [{ text: `${t.unread ? '🔴' : '💬'} ${String(t.name || t.id).slice(0, 24)} · ${t.unread || 0}`, callback_data: `adm:ticket:${t.id}` }]);
  rows.push([{ text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:support' }]);
  const text = `💬 <b>${tr('صندوق پشتیبانی', 'Support inbox', lang)}</b>\n\n${tr('یک گفت‌وگو را برای پاسخ یا بستن انتخاب کنید.', 'Choose a conversation to reply or close.', lang)}`;
  const extra = { reply_markup: { inline_keyboard: adminRows(rows, lang) } };
  if (messageId) { const edited = await tgApi(token, 'editMessageText', { chat_id: chatId, message_id: messageId, text, ...extra }); if (edited.ok) return edited; }
  return sendToUser(token, chatId, text, extra);
}

async function ticketScreen(env, token, chatId, id, lang) {
  const t = await getTicket(env, id);
  if (!t) return supportScreen(env, token, chatId, lang);
  await markTicketRead(env, id);
  const excerpt = (t.messages || []).slice(-8).map(m => `${m.s === 'u' ? '👤' : '🛠'} ${String(m.t).slice(0, 300)}`).join('\n\n');
  const rows = [[{ text: '✉️ ' + tr('پاسخ', 'Reply', lang), callback_data: `adm:reply:${id}` }, { text: '🔒 ' + tr('بستن', 'Close', lang), callback_data: `adm:close:${id}` }]];
  return sendToUser(token, chatId, `💬 <b>${t.userName || id}</b>\n🆔 ${id}\n\n${excerpt || '—'}`, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function ordersScreen(env, token, chatId, lang) {
  const orders = (await allEntities(env, 'order')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);
  const rows = orders.map(o => [{ text: `📦 #${o.id} · ${statusTitle(o.status, lang)}`, callback_data: `adm:order:${o.id}` }]);
  rows.push([{ text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:orders' }]);
  return sendToUser(token, chatId, `🛒 <b>${tr('سفارش‌ها', 'Orders', lang)}</b>\n\n${orders.length ? tr('برای تغییر وضعیت انتخاب کنید:', 'Choose an order to change its status:', lang) : tr('سفارشی ثبت نشده است.', 'No orders yet.', lang)}`, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function orderScreen(env, token, chatId, id, lang) {
  const o = await getOrder(env, id);
  if (!o) return ordersScreen(env, token, chatId, lang);
  const rows = [];
  if (['receipt_review', 'payment_review'].includes(o.status)) rows.push([{ text: '✅ ' + tr('تأیید پرداخت', 'Approve payment', lang), callback_data: `adm:orderact:${id}:approve` }, { text: '❌ ' + tr('رد پرداخت', 'Reject payment', lang), callback_data: `adm:orderact:${id}:reject` }]);
  rows.push([{ text: '⏳ ' + tr('آماده‌سازی', 'Preparing', lang), callback_data: `adm:orderact:${id}:preparing` }, { text: '🚚 ' + tr('ارسال شد', 'Shipped', lang), callback_data: `adm:orderact:${id}:shipped` }]);
  rows.push([{ text: '✅ ' + tr('تحویل', 'Delivered', lang), callback_data: `adm:orderact:${id}:delivered` }, { text: '🚫 ' + tr('لغو', 'Cancel', lang), callback_data: `adm:orderact:${id}:cancelled` }]);
  return sendToUser(token, chatId, `📦 <b>#${o.id}</b>\n\n👤 ${o.userName || o.userId}\n💰 ${o.total}\n📌 ${statusTitle(o.status, lang)}\n🕐 ${dateText(o.createdAt, lang)}`, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function groupsScreen(env, token, chatId, lang) {
  const groups = await allEntities(env, 'group');
  const rows = groups.slice(0, 12).map(g => [{ text: `${g.enabled ? '✅' : '⏸'} ${String(g.title || g.chatId).slice(0, 35)}`, callback_data: `adm:group:${g.chatId}` }]);
  return sendToUser(token, chatId, `🛡 <b>${tr('گروه‌ها', 'Groups', lang)}</b>\n\n${groups.length ? tr('گروه را انتخاب کنید:', 'Choose a group:', lang) : tr('گروهی ثبت نشده است.', 'No groups registered.', lang)}`, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function groupScreen(env, token, chatId, id, lang) {
  const g = await getJson(env, entityKey('group', id));
  if (!g) return groupsScreen(env, token, chatId, lang);
  return sendToUser(token, chatId, `🛡 <b>${g.title || id}</b>\n\n🆔 ${id}\n${g.enabled ? '✅ ' + tr('فعال', 'Enabled') : '⏸ ' + tr('غیرفعال', 'Disabled')}\n${g.botStatus || ''}`, { reply_markup: { inline_keyboard: adminRows([[{ text: g.enabled ? '⏸ ' + tr('غیرفعال کردن', 'Disable', lang) : '▶️ ' + tr('فعال کردن', 'Enable', lang), callback_data: `adm:grouptoggle:${id}` }]], lang) } });
}

async function feedsScreen(env, token, chatId, lang) {
  const feeds = await allEntities(env, 'feed');
  const rows = feeds.slice(0, 12).map(f => [{ text: `${f.enabled ? '✅' : '⏸'} ${String(f.title || f.id).slice(0, 35)}`, callback_data: `adm:feed:${f.id}` }]);
  return sendToUser(token, chatId, `📡 <b>${tr('فیدها', 'Feeds', lang)}</b>\n\n${feeds.length ? tr('فید را برای اسکن یا حذف انتخاب کنید:', 'Choose a feed to scan or delete:', lang) : tr('فیدی ثبت نشده است.', 'No feeds configured.', lang)}`, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function feedScreen(env, token, chatId, id, lang) {
  const f = await getJson(env, entityKey('feed', id));
  if (!f) return feedsScreen(env, token, chatId, lang);
  return sendToUser(token, chatId, `📡 <b>${f.title || id}</b>\n\n${f.url || f.sourceChatId || ''}\n${f.enabled ? '✅ ' + tr('فعال', 'Enabled', lang) : '⏸ ' + tr('غیرفعال', 'Disabled', lang)}\n⏱ ${f.intervalMinutes || 0} min`, { reply_markup: { inline_keyboard: adminRows([[{ text: '🔎 ' + tr('اسکن الآن', 'Scan now', lang), callback_data: `adm:feedscan:${id}` }, { text: '🗑 ' + tr('حذف', 'Delete', lang), callback_data: `adm:feeddelete:${id}` }]], lang) } });
}

async function faqScreen(env, token, chatId, lang) {
  const rowsData = (await allEntities(env, 'faq')).slice(0, 15);
  const rows = rowsData.map(f => [{ text: `${f.hidden ? '⏸' : '❓'} ${String(f.question).slice(0, 48)}`, callback_data: `adm:faqitem:${f.id}` }]);
  rows.push([{ text: '➕ ' + tr('افزودن پرسش', 'Add FAQ', lang), callback_data: 'adm:faqadd' }]);
  return sendToUser(token, chatId, `❓ <b>${tr('پرسش‌های متداول', 'FAQ', lang)}</b>\n\n${tr('یک مورد را انتخاب یا مورد جدید اضافه کنید:', 'Choose an item or add a new one:', lang)}`, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function faqItemScreen(env, token, chatId, id, lang) {
  const f = await getJson(env, entityKey('faq', id));
  if (!f) return faqScreen(env, token, chatId, lang);
  return sendToUser(token, chatId, `❓ <b>${f.question}</b>\n\n${String(f.answer || '').slice(0, 1200)}\n\n${f.hidden ? '⏸' : '✅'} ${tr('وضعیت', 'Status', lang)}`, { reply_markup: { inline_keyboard: adminRows([[{ text: f.hidden ? '▶️ ' + tr('نمایش', 'Show', lang) : '⏸ ' + tr('مخفی کردن', 'Hide', lang), callback_data: `adm:faqtoggle:${id}` }, { text: '🗑', callback_data: `adm:faqdelete:${id}` }]], lang) } });
}

async function crmScreen(env, token, chatId, lang) {
  const settings = await getSettings(env), accounts = (await allEntities(env, 'points')).sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 10);
  const text = `⭐ <b>${tr('وفاداری و امتیاز', 'Loyalty & CRM', lang)}</b>\n\n${tr('وضعیت', 'Status', lang)}: ${onOff(settings.loyalty.enabled, lang)}\n${tr('امتیاز دعوت', 'Referral points', lang)}: ${settings.loyalty.referralPoints}\n${tr('امتیاز ثبت‌نام', 'Signup points', lang)}: ${settings.loyalty.signupPoints}\n${tr('حساب‌های فعال', 'Accounts', lang)}: ${accounts.length}`;
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows([[{ text: settings.loyalty.enabled ? '⏸ ' + tr('خاموش کردن', 'Disable', lang) : '▶️ ' + tr('روشن کردن', 'Enable', lang), callback_data: 'adm:crm.toggle' }]], lang) } });
}

/* ============ More web-panel parity screens ============ */
async function productsScreen(env, token, chatId, lang) {
  const products = (await allEntities(env, 'product')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);
  const rows = products.map(p => [{ text: `${p.hidden ? '⏸' : '📦'} ${String(p.title).slice(0, 32)} · ${p.price}`, callback_data: `adm:prod:${p.id}` }]);
  rows.push([
    { text: '➕ ' + tr('افزودن محصول', 'Add product', lang), callback_data: 'adm:prodadd' },
    { text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:products' },
  ]);
  return sendToUser(token, chatId,
    `📦 <b>${tr('محصولات فروشگاه', 'Store products', lang)}</b>\n\n` +
    (products.length ? tr('محصول را برای مشاهده و ویرایش انتخاب کنید:', 'Choose a product to view or edit:', lang) : tr('محصولی ثبت نشده است.', 'No products yet.', lang)),
    { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function productScreen(env, token, chatId, id, lang) {
  const p = await env.BOT_KV.get(entityKey('product', id)).then(v => v ? JSON.parse(v) : null);
  if (!p) return productsScreen(env, token, chatId, lang);
  const text = `📦 <b>${String(p.title).slice(0, 120)}</b>\n\n` +
    `💰 ${tr('قیمت', 'Price', lang)}: ${p.price}\n📊 ${tr('موجودی', 'Stock', lang)}: ${p.stock === -1 ? tr('نامحدود', 'unlimited', lang) : p.stock}\n` +
    `🚚 ${tr('تحویل', 'Delivery', lang)}: ${p.deliveryMode}\n${p.hidden ? '⏸ ' + tr('مخفی', 'Hidden', lang) : '✅ ' + tr('فعال', 'Active', lang)}`;
  const rows = [
    [{ text: p.hidden ? '▶️ ' + tr('نمایش', 'Show', lang) : '⏸ ' + tr('مخفی کردن', 'Hide', lang), callback_data: `adm:prodtoggle:${id}` }, { text: '🗑 ' + tr('حذف', 'Delete', lang), callback_data: `adm:proddelete:${id}` }],
  ];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function couponsScreen(env, token, chatId, lang) {
  const coupons = (await allEntities(env, 'coupon')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);
  const rows = coupons.map(c => [{ text: `${c.hidden ? '⏸' : '🎟'} ${c.code} · ${c.type === 'percent' ? c.value + '%' : c.value}`, callback_data: `adm:coupon:${c.id}` }]);
  rows.push([
    { text: '➕ ' + tr('کد تخفیف جدید', 'New coupon', lang), callback_data: 'adm:couponadd' },
    { text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:coupons' },
  ]);
  return sendToUser(token, chatId,
    `🎟 <b>${tr('کدهای تخفیف', 'Discount coupons', lang)}</b>\n\n` +
    (coupons.length ? tr('یک کد را انتخاب کنید:', 'Choose a coupon:', lang) : tr('کدی ثبت نشده است.', 'No coupons yet.', lang)),
    { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function couponScreen(env, token, chatId, id, lang) {
  const c = await env.BOT_KV.get(entityKey('coupon', id)).then(v => v ? JSON.parse(v) : null);
  if (!c) return couponsScreen(env, token, chatId, lang);
  const text = `🎟 <b>${c.code}</b>\n\n${tr('نوع', 'Type', lang)}: ${c.type} · ${c.value}\n${tr('استفاده', 'Used', lang)}: ${c.used || 0}/${c.maxUses || '—'}\n${c.hidden ? '⏸ ' + tr('مخفی', 'Hidden', lang) : '✅ ' + tr('فعال', 'Active', lang)}`;
  const rows = [[
    { text: c.hidden ? '▶️ ' + tr('فعال کردن', 'Enable', lang) : '⏸ ' + tr('غیرفعال کردن', 'Disable', lang), callback_data: `adm:coupon:${id}:${c.hidden ? 'on' : 'off'}` },
    { text: '🗑 ' + tr('حذف', 'Delete', lang), callback_data: `adm:coupon:${id}:del` },
  ]];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function mediaScreen(env, token, chatId, lang) {
  const rows = (await allEntities(env, 'media')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);
  const kb = rows.map(m => [{ text: `${m.kind === 'photo' ? '🖼' : '📄'} ${String(m.name).slice(0, 32)}`, callback_data: `adm:media:${m.id}` }]);
  kb.push([{ text: '🔄 ' + tr('به‌روزرسانی', 'Refresh', lang), callback_data: 'adm:media' }]);
  return sendToUser(token, chatId,
    `🖼 <b>${tr('رسانه‌های آپلودشده', 'Uploaded media', lang)}</b>\n\n` +
    (rows.length ? tr('فایل را برای حذف انتخاب کنید:', 'Choose a file to delete:', lang) : tr('فایلی آپلود نشده است.', 'No media uploaded.', lang)),
    { reply_markup: { inline_keyboard: adminRows(kb, lang) } });
}

async function mediaItemScreen(env, token, chatId, id, lang) {
  const m = await env.BOT_KV.get(entityKey('media', id)).then(v => v ? JSON.parse(v) : null);
  if (!m) return mediaScreen(env, token, chatId, lang);
  const text = `🖼 <b>${String(m.name).slice(0, 120)}</b>\n\n${m.kind} · ${((m.size || 0) / 1024 / 1024).toFixed(2)} MB\n🕐 ${dateText(m.createdAt, lang)}`;
  const rows = [[{ text: '🗑 ' + tr('حذف فایل', 'Delete file', lang), callback_data: `adm:mediadel:${id}` }]];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function lockScreen(env, token, chatId, settings, lang) {
  const rc = settings.requiredChats || {}, legacy = settings.requiredChannel || {};
  const targets = rc.targets || (legacy.enabled && legacy.chatId ? [{ chatId: legacy.chatId, url: legacy.url, title: '' }] : []);
  const text = `🔐 <b>${tr('قفل عضویت کانال', 'Channel membership lock', lang)}</b>\n\n` +
    `${tr('وضعیت', 'Status', lang)}: ${rc.enabled ? tr('روشن ✅', 'On ✅', lang) : tr('خاموش ❌', 'Off ❌', lang)}\n` +
    (targets.length ? targets.map(t => `${t.title || t.chatId}${t.url ? ' · ' + t.url : ''}`).join('\n') : tr('کانالی ثبت نشده است.', 'No channel configured.', lang));
  const rows = [
    [{ text: rc.enabled ? '⏸ ' + tr('غیرفعال کردن قفل', 'Disable lock', lang) : '▶️ ' + tr('روشن کردن قفل', 'Enable lock', lang), callback_data: 'adm:locktoggle' },
     { text: '📝 ' + tr('ویرایش کانال', 'Edit channel', lang), callback_data: 'adm:lockset' }],
  ];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function webhookScreen(env, token, chatId, settings, lang, editId = null) {
  const tk = await resolveToken(env);
  let info = null, error = '';
  if (tk) {
    try { info = await tgApi(token, 'getWebhookInfo'); } catch { error = tr('خطای شبکه', 'network error', lang); }
  }
  const url = info?.result?.url || '';
  const text = `🔌 <b>${tr('مدیریت وب‌هوک', 'Webhook management', lang)}</b>\n\n` +
    (tk ? (url ? `🔗 ${url}\n${info.result.pending_update_count !== undefined ? `📮 ${tr('به‌روزرسانی‌های در انتظار', 'Pending updates', lang)}: ${info.result.pending_update_count}` : ''}` : tr('وب‌هوک تنظیم نشده است.', 'No webhook configured.', lang)) : tr('توکن ربات ثبت نشده است؛ ابتدا توکن را تنظیم کنید.', 'No bot token saved; set it first.', lang)) +
    (error ? `\n⚠️ ${error}` : '');
  const rows = tk ? [
    [{ text: '🔌 ' + tr('تنظیم وب‌هوک', 'Set webhook', lang), callback_data: 'adm:whset' },
     { text: '🗑 ' + tr('حذف وب‌هوک', 'Delete webhook', lang), callback_data: 'adm:whdel' }],
  ] : [];
  const extra = { reply_markup: { inline_keyboard: adminRows(rows, lang) } };
  if (editId) { const edited = await tgApi(token, 'editMessageText', { chat_id: chatId, message_id: editId, text, ...extra }); if (edited.ok) return edited; }
  return sendToUser(token, chatId, text, extra);
}

async function tuningScreen(env, token, chatId, settings, lang) {
  const b = settings.broadcast || {};
  const text = `🎚 <b>${tr('تنظیم ارسال همگانی', 'Broadcast tuning', lang)}</b>\n\n` +
    `📦 ${tr('حجم هر دسته', 'Batch size', lang)}: ${b.batchSize || 25}\n⏱ ${tr('تأخیر بین دسته‌ها', 'Delay between batches', lang)}: ${b.delayMs || 40} ms`;
  const rows = [
    [{ text: `📦 ${tr('حجم', 'Batch', lang)}: ${b.batchSize || 25}`, callback_data: 'adm:batch' },
     { text: `⏱ ${tr('تأخیر', 'Delay', lang)}: ${b.delayMs || 40}ms`, callback_data: 'adm:delay' }],
  ];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function shopScreen(env, token, chatId, settings, lang) {
  const s = settings.shop || {};
  const text = `🛍 <b>${tr('تنظیمات فروشگاه', 'Shop settings', lang)}</b>\n\n` +
    `💳 ${tr('روش پرداخت', 'Payment', lang)}: ${s.payment === 'zarinpal' ? 'Zarinpal' : tr('کارت‌به‌کارت دستی', 'manual card-to-card', lang)}\n` +
    `🔖 ${tr('کارت بانکی', 'Card', lang)}: ${s.cardNumber ? `${'•'.repeat(8)}${s.cardNumber.slice(-4)} — ${s.cardHolder || '—'}` : tr('ثبت نشده', 'none', lang)}\n` +
    `🧾 ${tr('آدرس الزامی', 'Require address', lang)}: ${onOff(s.requireAddress, lang)}\n` +
    `🛡 ${tr('محافظت محتوا', 'Protect content', lang)}: ${onOff(s.protectContent, lang)}\n` +
    `📢 ${tr('چت اعلان سفارش', 'Order notify chat', lang)}: ${s.notifyChatId || '—'}`;
  const rows = [
    [{ text: '💳 ' + tr('روش پرداخت', 'Payment', lang), callback_data: 'adm:shpay' },
     { text: '🧾 ' + tr('آدرس الزامی', 'Address', lang), callback_data: 'adm:shaddr' }],
    [{ text: '🔖 ' + tr('کارت بانکی', 'Card', lang), callback_data: 'adm:shcard' },
     { text: '🛡 ' + tr('محافظت محتوا', 'Protect', lang), callback_data: 'adm:shprotect' }],
    [{ text: '📢 ' + tr('چت اعلان سفارش', 'Notify chat', lang), callback_data: 'adm:shnotify' }],
  ];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function tokenScreen(env, token, chatId, settings, lang) {
  const cur = settings.botToken || env.BOT_TOKEN || '';
  const text = `🔑 <b>${tr('توکن ربات', 'Bot token', lang)}</b>\n\n` +
    (cur ? `✓ ${'•'.repeat(8)}${String(cur).slice(-4)} (${settings.botToken ? tr('ذخیره‌شده در پنل', 'stored in panel', lang) : tr('از متغیر محیطی', 'from environment', lang)})` : tr('توکنی ثبت نشده است.', 'No token saved yet.', lang)) +
    `\n\n${tr('با ارسال توکن تازه، هویت ربات با BotFather راستی‌آزمایی می‌شود.', 'A new token is verified against BotFather before saving.', lang)}`;
  const rows = [[{ text: '🔄 ' + tr('تغییر توکن', 'Change token', lang), callback_data: 'adm:tokenset' }]];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
}

async function servicesScreen(env, token, chatId, settings, lang) {
  const url = settings.publicBaseUrl || env.PUBLIC_BASE_URL || '';
  const text = `📡 <b>${tr('سرویس و VPN', 'Services & VPN', lang)}</b>\n\n` +
    (enabled(settings, 'services')
      ? tr('اتصال پنل‌ها، پلن‌ها، انبار کانفیگ، کیف پول و نمایندگی در کارگاه پنل (بخش سرویس‌ها) مدیریت می‌شوند.', 'Panel connections, plans, config warehouse, wallet and agents are managed in the web panel workspace (Services section).', lang)
      : tr('ماژول سرویس در نوع فعلی ربات فعال نیست؛ از «تنظیمات اصلی» نوع ربات را تغییر دهید.', 'The services module is disabled for this bot type; change the bot purpose in Bot settings.', lang)) +
    (url ? `\n\n${tr('برای دسترسی کامل، پنل را از دکمه زیر باز کنید.', 'For full control, open the panel from the button below.', lang)}` : '');
  const rows = url ? [[{ text: '🚀 ' + tr('پنل مدیریت (مینی‌اپ)', 'Admin Mini App', lang), web_app: { url } }]] : [];
  return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) }, disable_web_page_preview: true });
}

/* ============ Callback router ============ */
export async function adminCallback(env, cb, token, user, settings, lang, { answer }) {
  const data = String(cb.data || '');
  if (!(data.startsWith('adm:') || data.startsWith('rl:'))) return false;
  const chatId = cb.message?.chat?.id;
  if (!isAdminUser(env, settings, user)) { await answer(t2('adminOnly', lang), true); return true; }
  if (!chatId || Number(chatId) < 0) return true;
  const refresh = { token, chatId, lang, settings };
  try {
    if (data === 'adm:root') { user.flow = null; await putUser(env, user); await adminHome(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:cancel') { user.flow = null; await putUser(env, user); await answer(); await adminHome(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:stats') { await statsScreen(env, token, chatId, lang); return true; }
    if (data === 'adm:settings') { await settingsScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:setpurpose') { await purposeScreen(env, token, chatId, lang); return true; }
    if (data === 'adm:modules') { await moduleScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:langmode') {
      const s = await getSettings(env), modes = ['both', 'fa', 'en'], next = modes[(modes.indexOf(s.botLangMode) + 1) % modes.length];
      s.botLangMode = next; await saveSettings(env, s); await answer(t2('saved', lang)); await settingsScreen(env, token, chatId, s, lang); return true;
    }
    if (data.startsWith('adm:purpose:')) {
      const purpose = data.slice('adm:purpose:'.length); assert(PURPOSES[purpose], 'invalid_purpose');
      await patch(env, { botPurpose: purpose }); await answer(t2('saved', lang)); await settingsScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data.startsWith('adm:module:')) {
      const key = data.slice('adm:module:'.length); assert(MODULES.includes(key), 'invalid_modules');
      const s = await getSettings(env), modules = new Set(s.customModules || []);
      if (modules.has(key)) modules.delete(key); else modules.add(key);
      await patch(env, { customModules: [...modules] }); await moduleScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data === 'adm:users') { await usersScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:user:')) {
      const [, , id, action] = data.split(':');
      if (!action) { await userScreen(env, token, chatId, id, lang); return true; }
      const u = await getUser(env, id); assert(u, 'user_not_found');
      u.banned = action === 'ban'; u.bannedAt = u.banned ? Date.now() : 0; await putUser(env, u);
      await answer(t2('saved', lang)); await userScreen(env, token, chatId, id, lang); return true;
    }
    if (data === 'adm:adminid') {
      await answer(); await promptFlow(env, token, chatId, user, { type: 'adm_admin_id' }, t2('adminIdPrompt', lang), lang); return true;
    }
    if (data.startsWith('adm:usermsg:')) {
      await answer(); await promptFlow(env, token, chatId, user, { type: 'adm_user_message', userId: data.slice('adm:usermsg:'.length) }, t2('userMessagePrompt', lang), lang); return true;
    }
    if (data === 'adm:broadcast') { await broadcastScreen(env, token, chatId, lang); return true; }
    if (data === 'adm:broadcast:new') { await answer(); await promptFlow(env, token, chatId, user, { type: 'adm_broadcast_text' }, t2('broadcastTextPrompt', lang), lang); return true; }
    if (data.startsWith('adm:bt:')) {
      if (user.flow?.type !== 'adm_broadcast_target') return answer(t2('invalidValue', lang), true);
      const target = data.slice('adm:bt:'.length); assert(['all', 'active7d', 'active30d'].includes(target), 'invalid_target');
      const out = await createBroadcast(env, { kind: 'text', text: user.flow.text, target }); user.flow = null; await putUser(env, user);
      await answer(t2('saved', lang)); await broadcastScreen(env, token, chatId, lang); return true;
    }
    if (data === 'adm:engagement') { await engagementScreen(env, token, chatId, lang); return true; }
    if (data === 'adm:support') { await supportScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:ticket:')) { await ticketScreen(env, token, chatId, data.slice('adm:ticket:'.length), lang); return true; }
    if (data.startsWith('adm:reply:')) {
      const id = data.slice('adm:reply:'.length); await answer(); await promptFlow(env, token, chatId, user, { type: 'adm_ticket_reply', userId: id }, t2('userMessagePrompt', lang), lang); return true;
    }
    if (data.startsWith('adm:close:')) {
      await closeTicket(env, data.slice('adm:close:'.length)); await answer(t2('saved', lang)); await supportScreen(env, token, chatId, lang); return true;
    }
    if (data === 'adm:orders') { await ordersScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:order:')) { await orderScreen(env, token, chatId, data.slice('adm:order:'.length), lang); return true; }
    if (data.startsWith('adm:orderact:')) {
      const [, , id, action] = data.split(':');
      const body = action === 'shipped' ? { trackingCode: 'ثبت‌شده توسط ادمین' } : action === 'reject' ? { reason: 'رد شده توسط ادمین' } : {};
      await updateOrder(env, id, action, body); await answer(t2('saved', lang)); await orderScreen(env, token, chatId, id, lang); return true;
    }
    if (data === 'adm:groups') { await groupsScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:group:')) { await groupScreen(env, token, chatId, data.slice('adm:group:'.length), lang); return true; }
    if (data.startsWith('adm:grouptoggle:')) {
      const id = data.slice('adm:grouptoggle:'.length), g = await getJson(env, entityKey('group', id)); assert(g, 'group_not_found'); g.enabled = !g.enabled; await putJson(env, entityKey('group', id), g); await answer(t2('saved', lang)); await groupScreen(env, token, chatId, id, lang); return true;
    }
    if (data === 'adm:feeds') { await feedsScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:feed:')) { await feedScreen(env, token, chatId, data.slice('adm:feed:'.length), lang); return true; }
    if (data.startsWith('adm:feedscan:')) {
      const id = data.slice('adm:feedscan:'.length), f = await getJson(env, entityKey('feed', id)); assert(f, 'feed_not_found'); f.nextAt = 0; await putJson(env, entityKey('feed', id), f); await answer(t2('saved', lang)); await feedScreen(env, token, chatId, id, lang); return true;
    }
    if (data.startsWith('adm:feeddelete:')) {
      await env.BOT_KV.delete(entityKey('feed', data.slice('adm:feeddelete:'.length))); await answer(t2('saved', lang)); await feedsScreen(env, token, chatId, lang); return true;
    }
    if (data === 'adm:faq') { await faqScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:faqitem:')) { await faqItemScreen(env, token, chatId, data.slice('adm:faqitem:'.length), lang); return true; }
    if (data === 'adm:faqadd') { await answer(); await promptFlow(env, token, chatId, user, { type: 'adm_faq_add' }, t2('faqPrompt', lang), lang); return true; }
    if (data.startsWith('adm:faqtoggle:')) {
      const id = data.slice('adm:faqtoggle:'.length), f = await getJson(env, entityKey('faq', id)); assert(f, 'faq_not_found'); f.hidden = !f.hidden; await putJson(env, entityKey('faq', id), f); await answer(t2('saved', lang)); await faqItemScreen(env, token, chatId, id, lang); return true;
    }
    if (data.startsWith('adm:faqdelete:')) { await env.BOT_KV.delete(entityKey('faq', data.slice('adm:faqdelete:'.length))); await answer(t2('saved', lang)); await faqScreen(env, token, chatId, lang); return true; }
    if (data === 'adm:crm') { await crmScreen(env, token, chatId, lang); return true; }
    if (data === 'adm:crm.toggle') {
      const s = await getSettings(env); s.loyalty.enabled = !s.loyalty.enabled; await saveSettings(env, s); await answer(t2('saved', lang)); await crmScreen(env, token, chatId, lang); return true;
    }
    if (data === 'adm:rates' || data.startsWith('adm:rauto') || data.startsWith('adm:rsend:') || data.startsWith('adm:rcat:') || data.startsWith('adm:rt:') || data.startsWith('adm:rsrc')) {
      return await handleRates(env, token, chatId, user, lang, data, answer);
    }
    if (data === 'adm:rtmenu') { await ratesTimeScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:rcatmenu') { await ratesCatPickScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:rddest') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_rates_dest' }, t2('ratesDestPrompt', lang), lang);
      return true;
    }
    if (data === 'adm:products') { await productsScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:prod:')) { await productScreen(env, token, chatId, data.slice('adm:prod:'.length), lang); return true; }
    if (data === 'adm:prodadd') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_product_add' }, t2('productAddPrompt', lang), lang);
      return true;
    }
    if (data.startsWith('adm:prodtoggle:')) {
      const id = data.slice('adm:prodtoggle:'.length), p = await env.BOT_KV.get(entityKey('product', id)).then(v => v ? JSON.parse(v) : null);
      assert(p, 'product_not_found'); p.hidden = !p.hidden; p.updatedAt = Date.now(); await env.BOT_KV.put(entityKey('product', id), JSON.stringify(p));
      await answer(t2('saved', lang)); await productScreen(env, token, chatId, id, lang); return true;
    }
    if (data.startsWith('adm:proddelete:')) {
      const id = data.slice('adm:proddelete:'.length), p = await env.BOT_KV.get(entityKey('product', id)).then(v => v ? JSON.parse(v) : null);
      assert(p, 'product_not_found');
      const used = (await allEntities(env, 'order')).some(o => (o.items || []).some(i => i.id === id));
      if (used) { p.hidden = true; await env.BOT_KV.put(entityKey('product', id), JSON.stringify(p)); }
      else await env.BOT_KV.delete(entityKey('product', id));
      await answer(t2('btnDeleted', lang)); await productsScreen(env, token, chatId, lang); return true;
    }
    if (data === 'adm:coupons') { await couponsScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:coupon:')) {
      const [, , id, action] = data.split(':');
      if (!action) { await couponScreen(env, token, chatId, id, lang); return true; }
      const c = await env.BOT_KV.get(entityKey('coupon', id)).then(v => v ? JSON.parse(v) : null);
      assert(c, 'coupon_not_found');
      if (action === 'on' || action === 'off') { c.hidden = action === 'off'; await env.BOT_KV.put(entityKey('coupon', id), JSON.stringify(c)); await answer(t2('saved', lang)); await couponScreen(env, token, chatId, id, lang); return true; }
      await env.BOT_KV.delete(entityKey('coupon', id));
      await answer(t2('btnDeleted', lang)); await couponsScreen(env, token, chatId, lang); return true;
    }
    if (data === 'adm:couponadd') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_coupon_add' }, t2('couponAddPrompt', lang), lang);
      return true;
    }
    if (data === 'adm:media') { await mediaScreen(env, token, chatId, lang); return true; }
    if (data.startsWith('adm:media:')) { await mediaItemScreen(env, token, chatId, data.slice('adm:media:'.length), lang); return true; }
    if (data.startsWith('adm:mediadel:')) {
      await env.BOT_KV.delete(entityKey('media', data.slice('adm:mediadel:'.length)));
      await answer(t2('btnDeleted', lang)); await mediaScreen(env, token, chatId, lang); return true;
    }
    if (data === 'adm:lock') { await lockScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:locktoggle') {
      const s = await getSettings(env);
      const rc = s.requiredChats || { enabled: false, targets: [] };
      if (!rc.enabled) assert((rc.targets || []).length, 'lock_needs_targets');
      await patch(env, { requiredChats: { ...rc, enabled: !rc.enabled } });
      await answer(t2('saved', lang)); await lockScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data === 'adm:lockset') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_lock_set' }, t2('lockSetPrompt', lang), lang);
      return true;
    }
    if (data === 'adm:webhook') { await webhookScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:whset' || data === 'adm:whdel') {
      const tk = await resolveToken(env);
      assert(tk, 'token_missing');
      let res;
      if (data === 'adm:whdel') res = await tgApi(tk, 'deleteWebhook', { drop_pending_updates: false });
      else {
        assert(env.WEBHOOK_SECRET, 'webhook_secret_missing');
        const base = env.MANAGED_BASE_URL || env.PUBLIC_BASE_URL || '';
        assert(base, 'public_url_required');
        res = await tgApi(tk, 'setWebhook', {
          url: `${String(base).replace(/\/$/, '')}/telegram/webhook`,
          secret_token: env.WEBHOOK_SECRET,
          allowed_updates: ['message', 'edited_message', 'callback_query', 'channel_post', 'my_chat_member', 'chat_member', 'pre_checkout_query'],
          drop_pending_updates: false,
        });
      }
      assert(res.ok, res.description || 'telegram_error');
      await answer(t2('saved', lang)); await webhookScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data === 'adm:tuning') { await tuningScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:batch') {
      const s = await getSettings(env), sizes = [10, 15, 20, 25, 35, 50], next = sizes[(sizes.indexOf(s.broadcast.batchSize) + 1) % sizes.length];
      s.broadcast.batchSize = next; await saveSettings(env, s);
      await answer(`📦 ${t2('saved', lang)} ${next}`); await tuningScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data === 'adm:delay') {
      const s = await getSettings(env), delays = [20, 40, 80, 120, 200], next = delays[(delays.indexOf(s.broadcast.delayMs) + 1) % delays.length];
      s.broadcast.delayMs = next; await saveSettings(env, s);
      await answer(`⏱ ${t2('saved', lang)} ${next}ms`); await tuningScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data === 'adm:shop') { await shopScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:shpay') {
      const s = await getSettings(env);
      s.shop.payment = s.shop.payment === 'zarinpal' ? 'manual' : 'zarinpal';
      await saveSettings(env, s); await answer(t2('saved', lang)); await shopScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data === 'adm:shaddr') {
      const s = await getSettings(env); s.shop.requireAddress = !s.shop.requireAddress; await saveSettings(env, s);
      await answer(t2('saved', lang)); await shopScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data === 'adm:shprotect') {
      const s = await getSettings(env); s.shop.protectContent = !s.shop.protectContent; await saveSettings(env, s);
      await answer(t2('saved', lang)); await shopScreen(env, token, chatId, await getSettings(env), lang); return true;
    }
    if (data === 'adm:shcard') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_shop_card' }, t2('cardPrompt', lang), lang);
      return true;
    }
    if (data === 'adm:shnotify') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_shop_notify' }, t2('notifyChatPrompt', lang), lang);
      return true;
    }
    if (data === 'adm:token') { await tokenScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:tokenset') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_token_set' }, t2('tokenPrompt', lang), lang);
      return true;
    }
    if (data === 'adm:sb') {
      const s = await getSettings(env), sb = s.supportButton || {};
      const text = `🛡 <b>${tr('دکمه پشتیبانی', 'Support button', lang)}</b>\n\n${tr('وضعیت', 'Status', lang)}: ${onOff(sb.enabled !== false, lang)}\n🇷 ${sb.fa || ''}\n🇬🇧 ${sb.en || ''}`;
      const rows = [
        [{ text: sb.enabled === false ? '▶️ ' + tr('فعال کردن', 'Enable', lang) : '⏸ ' + tr('غیرفعال کردن', 'Disable', lang), callback_data: 'adm:sbtoggle' },
         { text: '📝 ' + tr('متن دکمه', 'Edit text', lang), callback_data: 'adm:sbtext' }],
      ];
      return sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
    }
    if (data === 'adm:sbtoggle') {
      const s = await getSettings(env);
      s.supportButton = { ...(s.supportButton || {}), enabled: s.supportButton?.enabled === false ? true : false };
      await saveSettings(env, s); await answer(t2('saved', lang));
      const sb = s.supportButton || {};
      const text = `🛡 <b>${tr('دکمه پشتیبانی', 'Support button', lang)}</b>\n\n${tr('وضعیت', 'Status', lang)}: ${onOff(sb.enabled !== false, lang)}\n🇷 ${sb.fa || ''}\n🇬🇧 ${sb.en || ''}`;
      const rows = [
        [{ text: sb.enabled === false ? '▶️ ' + tr('فعال کردن', 'Enable', lang) : '⏸ ' + tr('غیرفعال کردن', 'Disable', lang), callback_data: 'adm:sbtoggle' },
         { text: '📝 ' + tr('متن دکمه', 'Edit text', lang), callback_data: 'adm:sbtext' }],
      ];
      await sendToUser(token, chatId, text, { reply_markup: { inline_keyboard: adminRows(rows, lang) } });
      return true;
    }
    if (data === 'adm:sbtext') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_sb_text' }, t2('sbTextPrompt', lang), lang);
      return true;
    }
    if (data === 'adm:services') { await servicesScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:news' || data.startsWith('adm:nauto') || data.startsWith('adm:nsend:') || data.startsWith('adm:ncat:') || data.startsWith('adm:nint:')) {
      return await handleNews(env, token, chatId, user, lang, data, answer);
    }
    if (data === 'adm:nintmenu') { await newsIntervalScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:ncatmenu') { await newsCatPickScreen(env, token, chatId, await getSettings(env), lang); return true; }
    if (data === 'adm:relay' || data === 'adm:rapp' || data === 'adm:ron') {
      if (data === 'adm:rapp') await patch(env, { relay: { ...settings.relay, approval: !(settings.relay.approval !== false) } });
      if (data === 'adm:ron') await patch(env, { relay: { ...settings.relay, enabled: !settings.relay.enabled } });
      await relayScreen(env, token, chatId, await getSettings(env), lang);
      return true;
    }
    if (data.startsWith('adm:relayview:')) { await relayViewScreen(env, token, chatId, await getSettings(env), lang, data.slice('adm:relayview:'.length)); return true; }
    if (data.startsWith('rl:pub:')) return await handleRelayPublish(env, token, chatId, lang, data.slice('rl:pub:'.length), answer, true);
    if (data.startsWith('rl:rej:')) {
      const key = entityKey('relay', data.slice('rl:rej:'.length));
      const r = await env.BOT_KV.get(key).then(v => v ? JSON.parse(v) : null);
      if (r && ['pending', 'ready', 'failed'].includes(r.status)) { r.status = 'rejected'; await env.BOT_KV.put(key, JSON.stringify(r)); }
      await answer(t2('saved', lang));
      await relayScreen(env, token, chatId, await getSettings(env), lang);
      return true;
    }
    if (data === 'adm:menu') {
      const menu = await getMenu(env);
      const view = menuListScreen(menu, lang);
      await sendView(token, chatId, view);
      return true;
    }
    if (data.startsWith('adm:mb:')) {
      const [, , r, b] = data.split(':');
      const menu = await getMenu(env);
      const view = buttonEditorScreen(menu, Number(r), Number(b), lang);
      await sendView(token, chatId, view);
      return true;
    }
    if (data.startsWith('adm:mbt:') || data.startsWith('adm:mbv:')) {
      const [, tag, r, b] = data.split(':');
      await answer();
      await promptFlow(env, token, chatId, user, { type: tag === 'mbt' ? 'adm_menu_text' : 'adm_menu_value', r: Number(r), b: Number(b) }, t2(tag === 'mbt' ? 'sendTextPrompt' : 'sendValuePrompt', lang), lang);
      return true;
    }
    if (data.startsWith('adm:mbl:') || data.startsWith('adm:mbr:') || data.startsWith('adm:mbu:') || data.startsWith('adm:mbd:')) {
      const [, tag, r, b] = data.split(':');
      let moved = null;
      await mutateMenu(env, (rows) => {
        const row = rows[Number(r)];
        const i = Number(r), j = Number(b);
        if (!row?.[j]) return;
        if (tag === 'mbl' && j > 0) { [row[j - 1], row[j]] = [row[j], row[j - 1]]; moved = [i, j - 1]; }
        else if (tag === 'mbr' && j < row.length - 1) { [row[j + 1], row[j]] = [row[j], row[j + 1]]; moved = [i, j + 1]; }
        else if (tag === 'mbu' && i > 0) { const [x] = row.splice(j, 1); rows[i - 1].push(x); if (!row.length) rows.splice(i, 1); moved = [i - 1, rows[i - 1].length - 1]; }
        else if (tag === 'mbd' && i < rows.length - 1) { const [x] = row.splice(j, 1); rows[i + 1].push(x); if (!row.length) rows.splice(i, 1); moved = [i + 1, rows[i + 1].length - 1]; }
      });
      await answer(moved ? t2('btnMoved', lang) : '—');
      const menu = await getMenu(env);
      const view = moved ? buttonEditorScreen(menu, moved[0], moved[1], lang) : menuListScreen(menu, lang);
      await sendView(token, chatId, view);
      return true;
    }
    if (data.startsWith('adm:mbx:')) {
      const [, , r, b] = data.split(':');
      await mutateMenu(env, (rows) => { const row = rows[Number(r)]; if (row) row.splice(Number(b), 1); });
      await answer(t2('btnDeleted', lang));
      const menu = await getMenu(env);
      const view = menuListScreen(menu, lang);
      await sendView(token, chatId, view);
      return true;
    }
    if (data === 'adm:mbadd') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_add_text' }, t2('addTextPrompt', lang), lang);
      return true;
    }
    if (data.startsWith('adm:atype:')) {
      if (user.flow?.type !== 'adm_add_type') return answer(t2('invalidValue', lang), true);
      const type = data.slice('adm:atype:'.length);
      if (!['url', 'callback', 'text', 'submenu'].includes(type)) return answer(t2('invalidValue', lang), true);
      await answer();
      await promptFlow(env, token, chatId, user, { type: 'adm_add_value', pending: { ...user.flow.pending, type } }, t2('addValuePrompt', lang), lang);
      return true;
    }
    if (data === 'adm:ndest' || data === 'adm:rdest') {
      await answer();
      await promptFlow(env, token, chatId, user, { type: data === 'adm:ndest' ? 'adm_news_dest' : 'adm_relay_dest' }, t2(data === 'adm:ndest' ? 'newsDestPrompt' : 'relayDestPrompt', lang), lang);
      return true;
    }
    await answer('—');
    return true;
  } catch (e) {
    await answer(errText(e, lang), true);
    return true;
  }
}

async function handleNews(env, token, chatId, user, lang, data, answer) {
  const settings = await getSettings(env);
  if (data.startsWith('adm:nsend:')) {
    const category = data.slice('adm:nsend:'.length);
    const out = await sendNewsDigest(env, { category });
    await answer(`${t2('newsSent', lang)} ${out.sent} ${tr('مقصد', 'destination(s)', lang)}${out.failed ? ` · ${out.failed} ${t2('newsFailed', lang)}` : ''}`, false);
    await newsScreen(env, token, chatId, await getSettings(env), lang);
    return true;
  }
  if (data.startsWith('adm:ncat:')) {
    const category = data.slice('adm:ncat:'.length);
    await patch(env, { news: { autoSend: { ...settings.news.autoSend, category, enabled: true } } });
    await answer(t2('saved', lang));
    await newsScreen(env, token, chatId, await getSettings(env), lang);
    return true;
  }
  if (data.startsWith('adm:nint:')) {
    const intervalMinutes = int(data.slice('adm:nint:'.length), 10, 1440, 60);
    await patch(env, { news: { autoSend: { ...settings.news.autoSend, intervalMinutes, enabled: true } } });
    await answer(t2('saved', lang));
    await newsScreen(env, token, chatId, await getSettings(env), lang);
    return true;
  }
  if (data === 'adm:nauto') {
    await patch(env, { news: { autoSend: { ...settings.news.autoSend, enabled: !settings.news.autoSend.enabled } } });
    const next = await getSettings(env);
    await answer(next.news.autoSend.enabled ? '▶️ ' + tr('ارسال خودکار روشن شد', 'Auto-send enabled', lang) : '⏸ ' + tr('ارسال خودکار خاموش شد', 'Auto-send disabled', lang));
    await newsScreen(env, token, chatId, next, lang);
    return true;
  }
  await newsScreen(env, token, chatId, settings, lang);
  return true;
}

async function handleRates(env, token, chatId, user, lang, data, answer) {
  const settings = await getSettings(env);
  const cfg = settings.rates?.autoSend || { enabled: false, category: 'all', time: '09:00', destinations: [] };
  if (data.startsWith('adm:rsrc')) {
    // Force a fresh pull and report every feed: this is how an admin sees *why*
    // the table was showing the last saved snapshot.
    await answer();
    const live = await getLiveRates(env, { force: true });
    await sendToUser(token, chatId, ratesSourcesText(live, lang).slice(0, 4096), {
      reply_markup: { inline_keyboard: [[{ text: '🔙 ' + tr('بازگشت', 'Back', lang), callback_data: 'adm:rates' }]] },
    });
    return true;
  }
  if (data.startsWith('adm:rsend:')) {
    const category = data.slice('adm:rsend:'.length);
    const out = await sendRatesNow(env, { category });
    await answer(`${t2('newsSent', lang).replace(tr('خبر', 'News', lang), tr('قیمت', 'Rates', lang))} ${out.sent} ${tr('مقصد', 'destination(s)', lang)}${out.failed ? ` · ${out.failed} ${t2('newsFailed', lang)}` : ''}`, false);
    await ratesScreen(env, token, chatId, await getSettings(env), lang);
    return true;
  }
  if (data.startsWith('adm:rcat:')) {
    const category = data.slice('adm:rcat:'.length);
    await patch(env, { rates: { autoSend: { ...cfg, category, enabled: true } } });
    await answer(t2('saved', lang));
    await ratesScreen(env, token, chatId, await getSettings(env), lang);
    return true;
  }
  if (data === 'adm:rt:off') {
    await patch(env, { rates: { autoSend: { ...cfg, time: '', enabled: false } } });
    await answer('⏸ ' + tr('زمان روزانه حذف شد؛ ارسال خودکار خاموش شد.', 'Daily time removed; auto-send off.', lang));
    await ratesScreen(env, token, chatId, await getSettings(env), lang);
    return true;
  }
  if (data.startsWith('adm:rt:')) {
    const time = data.slice('adm:rt:'.length);
    assert(isValidTime(time), 'invalid_rates_time');
    await patch(env, { rates: { autoSend: { ...cfg, time, enabled: true } } });
    await answer(`🕐 ${t2('saved', lang)} ${time}`);
    await ratesScreen(env, token, chatId, await getSettings(env), lang);
    return true;
  }
  if (data === 'adm:rauto') {
    await patch(env, { rates: { autoSend: { ...cfg, enabled: !cfg.enabled } } });
    const next = await getSettings(env);
    await answer(next.rates.autoSend.enabled ? '▶️ ' + tr('ارسال خودکار قیمت روشن شد', 'Rate auto-send enabled', lang) : '⏸ ' + tr('ارسال خودکار قیمت خاموش شد', 'Rate auto-send disabled', lang));
    await ratesScreen(env, token, chatId, next, lang);
    return true;
  }
  await ratesScreen(env, token, chatId, settings, lang);
  return true;
}

async function handleRelayPublish(env, token, chatId, lang, relayId, answer, refresh) {
  const settings = await getSettings(env);
  const dest = (settings.relay.destinations || []).map(d => d.chatId);
  if (!dest.length) { await answer(t2('noDest', lang), true); return true; }
  const r = await publishRelay(env, relayId, dest, true);
  const ok = r.destinations?.filter(d => d.status === 'sent').length || 0;
  const fail = (r.destinations?.length || 0) - ok;
  await answer(`✅ ${tr('بدون برچسب فوروارد ارسال شد به', 'Copied without forward attribution to', lang)} ${ok}${fail ? ` · ${fail} ✗` : ''}`);
  if (refresh) await relayScreen(env, token, chatId, await getSettings(env), lang);
  return true;
}

/* ============ Text-input flows ============ */
export async function adminFlow(env, token, user, settings, lang, msg) {
  if (!isAdminUser(env, settings, user) || !user.flow?.type?.startsWith('adm_')) return false;
  const text = String(msg.text || '').trim();
  const chatId = msg.chat.id;
  const finish = async (reply, markup) => {
    const messageId = flow.messageId;
    user.flow = null; await putUser(env, user);
    const screenMarkup = markup || { reply_markup: { inline_keyboard: [backRow(lang)] } };
    if (messageId) {
      const edited = await tgApi(token, 'editMessageText', { chat_id: chatId, message_id: messageId, text: reply, ...screenMarkup });
      if (edited.ok || /message is not modified/i.test(edited.description || '')) return edited;
    }
    return sendToUser(token, chatId, reply, screenMarkup);
  };
  const flow = user.flow;
  if (!text) { await sendToUser(token, chatId, t2('invalidValue', lang)); return true; }
  try {
    if (flow.type === 'adm_admin_id') {
      const adminId = text === '0' ? '' : str(text.replace(/^@/, ''), 32);
      assert(!adminId || /^\d{1,16}$/.test(adminId), 'invalid_admin_id');
      await patch(env, { adminId }); user.flow = null; await putUser(env, user);
      await settingsScreen(env, token, chatId, await getSettings(env), lang, flow.messageId); return true;
    }
    if (flow.type === 'adm_user_message') {
      assert(text.length <= 4096, 'invalid_text'); const target = await getUser(env, flow.userId); assert(target && !target.banned, 'user_not_found');
      const out = await sendToUser(token, target.id, text, { disable_web_page_preview: true }); assert(out.ok, out.description || 'telegram_error');
      await finish(t2('saved', lang)); return true;
    }
    if (flow.type === 'adm_ticket_reply') {
      assert(text.length <= 3000, 'invalid_text'); const ticket = await ticketAppendAdmin(env, flow.userId, text); assert(ticket, 'not_found');
      const target = await getUser(env, flow.userId); if (target) await sendToUser(token, target.id, `💬 ${tr('پاسخ پشتیبانی:', 'Support reply:', target.lang || lang)}\n\n${text}`);
      user.flow = null; await putUser(env, user); await supportScreen(env, token, chatId, lang, flow.messageId); return true;
    }
    if (flow.type === 'adm_broadcast_text') {
      assert(text.length <= 4096, 'invalid_text'); user.flow = { type: 'adm_broadcast_target', text }; await putUser(env, user);
      await editPrompt(token, chatId, flow.messageId, tr('مخاطبان ارسال را انتخاب کنید:', 'Choose broadcast recipients:', lang), { reply_markup: { inline_keyboard: [
        [{ text: tr('👥 همه کاربران', '👥 All users', lang), callback_data: 'adm:bt:all' }],
        [{ text: tr('🟢 فعال ۷ روز اخیر', '🟢 Active in 7 days', lang), callback_data: 'adm:bt:active7d' }, { text: tr('🟢 فعال ۳۰ روز اخیر', '🟢 Active in 30 days', lang), callback_data: 'adm:bt:active30d' }],
        backRow(lang),
      ] } }); return true;
    }
    if (flow.type === 'adm_faq_add') {
      const [question, answer] = text.split('|').map(v => String(v || '').trim()); assert(question && answer, 'invalid_faq');
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16); await putJson(env, entityKey('faq', id), { id, question: str(question, 100), questionEn: '', answer: str(answer, 3500), answerEn: '', hidden: false, createdAt: Date.now() });
      await finish(t2('saved', lang)); return true;
    }
    if (flow.type === 'adm_news_dest' || flow.type === 'adm_relay_dest') {
      const dest = text.split('\n').map(line => {
        const [title, chat] = line.split('|').map(s => s.trim());
        return { title: chat ? title : '', chatId: chat || title };
      }).filter(d => d.chatId);
      assert(dest.length && dest.length <= 10 && dest.every(d => isChatId(d.chatId)), 'invalid_destinations');
      if (flow.type === 'adm_news_dest') await patch(env, { news: { autoSend: { ...settings.news.autoSend, destinations: dest } } });
      else await patch(env, { relay: { ...settings.relay, destinations: dest } });
      const [fa, en] = T.destSaved(dest.length);
      await finish(tr(fa, en, lang));
      return true;
    }
    if (flow.type === 'adm_menu_text') {
      const btnText = str(text, 64);
      assert(btnText, 'invalid_menu_button');
      await mutateMenu(env, (rows) => { const b = rows[flow.r]?.[flow.b]; assert(b, 'invalid_menu_button'); b.text = btnText; });
      await finish(t2('btnTextSaved', lang));
      return true;
    }
    if (flow.type === 'adm_menu_value') {
      const menu = await getMenu(env);
      const btn = menu.inlineButtons[flow.r]?.[flow.b];
      assert(btn, 'invalid_menu_button');
      const clean = validateMenuButton({ ...btn, value: text }, menu);
      await mutateMenu(env, (rows) => { const target = rows[flow.r]?.[flow.b]; assert(target, 'invalid_menu_button'); target.value = clean.value; });
      await finish(t2('btnValueSaved', lang));
      return true;
    }
    if (flow.type === 'adm_add_text') {
      const btnText = str(text, 64);
      assert(btnText, 'invalid_menu_button');
      user.flow = { type: 'adm_add_type', pending: { text: btnText }, messageId: flow.messageId };
      await putUser(env, user);
      await editPrompt(token, chatId, flow.messageId, t2('typePrompt', lang), { reply_markup: { inline_keyboard: [
        [{ text: '🔗 ' + tr('لینک', 'URL', lang), callback_data: 'adm:atype:url' }, { text: '⚡ ' + tr('کال‌بک', 'Callback', lang), callback_data: 'adm:atype:callback' }],
        [{ text: '📂 ' + tr('زیرمنو', 'Submenu', lang), callback_data: 'adm:atype:submenu' }, { text: '💬 ' + tr('پاپ‌آپ متن', 'Text popup', lang), callback_data: 'adm:atype:text' }],
      ] } });
      return true;
    }
    if (flow.type === 'adm_product_add') {
      const parts = text.split('|').map(v => String(v || '').trim());
      assert(parts[0] && parts[1], 'invalid_product');
      const price = Number(parts[1].replace(/[^\d]/g, ''));
      assert(Number.isFinite(price) && price >= 0, 'invalid_product');
      const p = await validateProduct(env, { title: parts[0], price, stock: -1 });
      await env.BOT_KV.put(entityKey('product', p.id), JSON.stringify(p));
      user.flow = null; await putUser(env, user);
      await finish(t2('btnAdded', lang));
      return true;
    }
    if (flow.type === 'adm_coupon_add') {
      const parts = text.split('|').map(v => String(v || '').trim());
      assert(parts.length === 3, 'invalid_coupon');
      const code = str(parts[0], 32).toUpperCase(), type = parts[1].toLowerCase(), value = Number(parts[2]);
      assert(/^[A-Z0-9_-]{3,32}$/.test(code) && ['percent', 'amount'].includes(type) && Number.isFinite(value) && value > 0, 'invalid_coupon');
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
      await env.BOT_KV.put(entityKey('coupon', id), JSON.stringify({ id, code, type, value: type === 'percent' ? Math.min(100, Math.round(value)) : Math.round(value), startsAt: 0, expiresAt: 0, maxUses: 0, used: 0, reserved: 0, hidden: false, createdAt: Date.now() }));
      user.flow = null; await putUser(env, user);
      await finish(t2('btnAdded', lang));
      return true;
    }
    if (flow.type === 'adm_lock_set') {
      const cur = await getSettings(env);
      if (text.toLowerCase() === 'off') {
        await patch(env, { requiredChats: { ...(cur.requiredChats || {}), enabled: false } });
        user.flow = null; await putUser(env, user);
        await finish(t2('saved', lang));
        return true;
      }
      const [chat, url] = text.split('|').map(v => String(v || '').trim());
      assert(isChatId(chat), 'invalid_chat_id');
      assert(!url || /^https?:\/\/[^\s]+$/.test(url), 'invalid_join_url');
      const targets = [{ chatId: chat, url: url || '', title: '' }];
      const enabledNow = url ? true : (cur.requiredChats?.enabled ?? true);
      await patch(env, { requiredChats: { enabled: enabledNow, targets } });
      user.flow = null; await putUser(env, user);
      await finish(t2('saved', lang));
      return true;
    }
    if (flow.type === 'adm_shop_card') {
      const cur = await getSettings(env);
      if (text.toLowerCase() === 'off') {
        cur.shop.cardNumber = ''; cur.shop.cardHolder = '';
        await saveSettings(env, cur);
        user.flow = null; await putUser(env, user);
        await finish(t2('saved', lang));
        return true;
      }
      const [card, holder] = text.split('|').map(v => String(v || '').trim());
      const cleanCard = card.replace(/[\s-]/g, '');
      assert(/^6\d{15}$/.test(cleanCard) || /^\d{16}$/.test(cleanCard), 'invalid_card_number');
      cur.shop.cardNumber = cleanCard; cur.shop.cardHolder = str(holder, 100);
      await saveSettings(env, cur);
      user.flow = null; await putUser(env, user);
      await finish(t2('saved', lang));
      return true;
    }
    if (flow.type === 'adm_shop_notify') {
      const cur = await getSettings(env);
      const chat = text === '0' ? '' : str(text, 64);
      assert(!chat || isChatId(chat), 'invalid_chat_id');
      cur.shop.notifyChatId = chat;
      await saveSettings(env, cur);
      user.flow = null; await putUser(env, user);
      await finish(t2('saved', lang));
      return true;
    }
    if (flow.type === 'adm_token_set') {
      const tk = str(text, 256);
      assert(/^\d+:[A-Za-z0-9_-]+$/.test(tk), 'invalid_bot_token');
      const me = await tgApi(tk, 'getMe');
      assert(me.ok && me.result?.is_bot, 'telegram_connection_failed');
      const cur = await getSettings(env);
      cur.botToken = tk; cur.botUsername = me.result.username || '';
      await saveSettings(env, cur);
      user.flow = null; await putUser(env, user);
      await finish(`✅ ${tr('توکن جدید راستی‌آزمایی و ذخیره شد.', 'New token verified and saved.', lang)} @${me.result.username || ''}`);
      return true;
    }
    if (flow.type === 'adm_sb_text') {
      const [fa, en] = text.split('|').map(v => String(v || '').trim());
      assert(fa, 'invalid_text');
      const cur = await getSettings(env);
      cur.supportButton = { enabled: cur.supportButton?.enabled !== false, fa: str(fa, 64) || '🛡 پشتیبانی', en: str(en, 64) || '🛡 Support' };
      await saveSettings(env, cur);
      user.flow = null; await putUser(env, user);
      await finish(t2('saved', lang));
      return true;
    }
    if (flow.type === 'adm_rates_dest') {
      const dest = text.split('\n').map(line => {
        const [title, chat] = line.split('|').map(s => s.trim());
        return { title: chat ? title : '', chatId: chat || title };
      }).filter(d => d.chatId);
      assert(dest.length && dest.length <= 10 && dest.every(d => isChatId(d.chatId)), 'invalid_destinations');
      const cur = await getSettings(env);
      await patch(env, { rates: { autoSend: { ...(cur.rates?.autoSend || {}), destinations: dest, enabled: true } } });
      user.flow = null; await putUser(env, user);
      const [fa, en] = T.destSaved(dest.length);
      await finish(tr(fa, en, lang));
      return true;
    }
    if (flow.type === 'adm_add_value') {
      const { text: btnText, type } = flow.pending || {};
      assert(btnText && type, 'invalid_menu_button');
      const menu = await getMenu(env);
      const clean = validateMenuButton({ text: btnText, type, value: text }, menu);
      await mutateMenu(env, (rows) => {
        let row = [...rows].reverse().find(r => r.length < 8);
        if (!row && rows.length < 10) { row = []; rows.push(row); }
        assert(row, 'invalid_menu_button');
        row.push(clean);
      });
      await finish(t2('btnAdded', lang));
      return true;
    }
  } catch (e) {
    user.flow = null;
    await putUser(env, user);
    await sendToUser(token, chatId, errText(e, lang) + '\n/cancel');
    return true;
  }
  return false;
}
