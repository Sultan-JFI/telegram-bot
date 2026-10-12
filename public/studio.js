'use strict';
const V2 = { settings: null, summary: null, tab: 'overview', cache: {}, uploads: 0, urls: new Set(), offset: 0 };
const L = (fa, en) => S.lang === 'en' ? en : fa;
Object.assign(I18N.fa, { studio: 'کارگاه ربات', edit: 'ویرایش', delete: 'حذف', close: 'بستن', menu: 'منو و دکمه‌ها', pwMinLen: 'رمز جدید باید حداقل ۱۰ کاراکتر باشد', scheduled: 'زمان‌بندی‌شده', needs_review: 'نیاز به بررسی', photoHint: 'عکس یا فایل را مستقیماً از دستگاه انتخاب کنید.', targetHint: 'ارسال در سرور ادامه می‌یابد؛ لازم نیست پنل باز بماند.' });
Object.assign(I18N.en, { studio: 'Bot studio', edit: 'Edit', delete: 'Delete', close: 'Close', menu: 'Menus & Buttons', pwMinLen: 'The new password must be at least 10 characters', scheduled: 'Scheduled', needs_review: 'Needs review', photoHint: 'Upload a photo or file directly from your device.', targetHint: 'Delivery continues on the server even when the panel is closed.' });
const vModules = () => V2.settings?.modules || ['catalog','shop','channel','moderation','relay','crm','faq','learning','broadcast','support','menu'];
const vHas = module => vModules().includes(module);
// The button/menu editor is core to every bot type, so the "menu" route (and the
// mobile "More" sheet that lists it) stays available even when the optional menu
// module is off for the selected purpose.
function visibleRoute(route) { return route === 'menu' || !['broadcast', 'support', 'menu'].includes(route) || vHas(route); }
const vIcon = icon => `<i data-lucide="${icon}" aria-hidden="true"></i>`;
const vButton = (label, act, data = '', primary = false) => `<button type="button" data-act="${act}" ${data} class="${primary ? CLS.btnP : CLS.btnS}">${label}</button>`;
const vNote = (html, warning = false) => `<div class="v-note${warning ? ' warn' : ''}">${html}</div>`;
const vField = (id, label, value = '', attrs = '') => `<label class="v-field" for="${id}"><span>${label}</span><input id="${id}" value="${esc(value)}" class="${CLS.input}" ${attrs}></label>`;
const vArea = (id, label, value = '', rows = 3, attrs = '') => `<label class="v-field" for="${id}"><span>${label}</span><textarea id="${id}" rows="${rows}" class="${CLS.input}" ${attrs}>${esc(value)}</textarea></label>`;
const vSelect = (id, label, options, value) => `<div class="v-field"><label for="${id}">${label}</label><div class="mt-1.5">${ddHtml({ id, current: String(value ?? ''), options: options.map(o => [String(o[0]), o[1]]) })}</div></div>`;
const vCheck = (id, label, checked = false) => `<label class="v-check" for="${id}"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
const vVal = id => $(id)?.value?.trim() || '';
const vNum = id => Number(vVal(id));
const vOn = id => !!$(id)?.checked;
const vLines = value => String(value).split('\n').map(v => v.trim()).filter(Boolean);
const vList = value => String(value).split(/[,،\s]+/).map(v => v.trim()).filter(Boolean);
const vMoney = n => `${fmtNum(n)} ${L('تومان', 'toman')}`;
const vEmpty = (message, icon = 'inbox') => `<div class="v-empty"><span class="v-icon">${vIcon(icon)}</span><p>${message}</p></div>`;
// Every workspace block is an accordion: the arrow collapses it and the state is remembered.
let vSecOpenDefault = false;
const vSectionDefault = (open) => { vSecOpenDefault = open !== false; };
function vSecId(title) {
  const text = String(title).replace(/<[^>]*>/g, '');
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash * 33) ^ text.charCodeAt(i)) >>> 0;
  return 's' + hash.toString(36);
}
const vSection = (title, inner, buttons = '', opts = {}) =>
  accPanel(opts.group || 'v', opts.id || vSecId(title), title, inner, buttons, { open: opts.open !== undefined ? opts.open : vSecOpenDefault, icon: opts.icon });
const MODULE_LABELS = { catalog: ['محصولات و فایل‌ها','Catalog'], shop: ['فروش و سفارش','Commerce'], channel: ['انتشار و زمان‌بندی','Publishing'], moderation: ['امنیت گروه‌ها','Moderation'], relay: ['حذف فوروارد','Relay'], crm: ['باشگاه مشتریان','Loyalty'], faq: ['پرسش‌های متداول','FAQ'], learning: ['پیشرفت آموزشی','Learning'], broadcast: ['ارسال همگانی','Broadcast'], support: ['پشتیبانی','Support'], menu: ['منو و دکمه‌ها','Menus'] };
const vModuleName = key => MODULE_LABELS[key]?.[S.lang === 'en' ? 1 : 0] || key;
function vError(code) {
  const messages = {
    password_change_required: ['ابتدا رمز خصوصی پنل را تعیین کنید.', 'Set your private panel password first.'],
    default_password_not_allowed: ['رمز عمومی اولیه را نمی‌توان به عنوان رمز خصوصی ذخیره کرد.', 'The public initial password cannot be your private password.'],
    request_too_large: ['حجم درخواست بیش از حد مجاز است.', 'The request exceeds the size limit.'],
    legacy_job_imported_paused_review_before_resume: ['ارسال ناتمام نسخه قبلی، برای جلوگیری از ارسال دوباره متوقف وارد شده است؛ قبل از ادامه مقصدها را بررسی کنید.', 'An unfinished legacy broadcast was imported paused. Inspect its recipients before resuming.'],
    upload_chat_required: ['ابتدا در تنظیمات ← فایل و رسانه، آیدی چت ذخیره‌سازی را ثبت کنید و ربات را ادمین آن کنید.', 'Configure a storage chat in Settings → Media first and make the bot an administrator.'],
    token_missing: ['ابتدا توکن ربات را در تنظیمات ثبت کنید.', 'Set the bot token in Settings first.'], file_too_large: ['حجم مجاز: عکس ۱۰، سایر فایل‌ها ۲۰ مگابایت.', 'Limit: photos 10 MB, other files 20 MB.'], media_required: ['ابتدا فایل را انتخاب کنید و تا پایان آپلود صبر کنید.', 'Select a file and wait for the upload.'], media_kind_mismatch: ['نوع فایل با روش ارسال سازگار نیست؛ دوباره انتخاب کنید.', 'Select the file again with a matching media type.'],
    media_processor_not_configured: ['این عملیات به سرویس پردازش رسانه نیاز دارد. راهنمای V2 را ببینید.', 'This operation needs the external media processor. See the V2 guide.'],
    telegram_network_error: ['ارتباط با تلگرام برقرار نشد؛ ارسال نامشخص را قبل از تکرار بررسی کنید.', 'Telegram could not be reached; inspect uncertain deliveries before retrying.'],
    invalid_schedule_time: ['زمان ارسال باید در آینده باشد (حداکثر یک سال).', 'Choose a future time within one year.'], invalid_schedule_interval: ['حذف خودکار حداکثر ۴۷ ساعت؛ تکرار حداقل ۵ دقیقه.', 'Auto-delete: up to 47 hours. Repeat: at least 5 minutes.'],
    no_targets: ['کاربری برای ارسال پیدا نشد.', 'No recipients found.'], invalid_chat_id: ['شناسه کانال/گروه یا کاربر معتبر نیست.', 'Invalid chat ID or username.'],
    private_chat_invite_required: ['برای کانال یا گروه خصوصی، لینک دعوت معتبر هم وارد کنید.', 'Private chats need a valid invite link.'], invalid_join_url: ['لینک عضویت باید با https://t.me/ شروع شود.', 'Use an https://t.me/ invite link.'], lock_needs_targets: ['حداقل یک کانال یا گروه برای قفل عضویت اضافه کنید.', 'Add at least one required chat.'],
    invalid_card_number: ['شماره کارت باید ۱۶ رقم انگلیسی باشد.', 'The card number must contain 16 digits.'], invalid_product: ['عنوان، قیمت صحیح و موجودی را وارد کنید؛ موجودی نامحدود: ۱-.', 'Enter a title, integer price and stock. Unlimited stock: -1.'],
    delivery_content_required: ['متن یا فایل تحویل را وارد کنید.', 'Enter delivery text or a file.'], stock_has_reservations: ['این محصول سفارش باز دارد. برای حفظ رزروها، ابتدا سفارش‌ها را تعیین تکلیف کنید یا موجودی را تغییر ندهید.', 'This item has reserved orders. Resolve those orders before changing stock.'],
    category_has_products: ['ابتدا محصولات این دسته را به دسته دیگری منتقل کنید.', 'Move the category’s products before deleting it.'], invalid_order_transition: ['این تغییر وضعیت برای مرحله فعلی مجاز نیست.', 'This status transition is not allowed.'], receipt_or_payment_review_required: ['فقط سفارش دارای فیش یا پرداخت در انتظار بررسی قابل تأیید است.', 'Only receipts or verified payments awaiting review can be approved.'],
    rejection_reason_required: ['دلیل رد فیش را وارد کنید.', 'Enter a rejection reason.'], payment_required: ['ابتدا پرداخت سفارش باید تأیید شود.', 'Payment must be approved first.'], tracking_required: ['کد یا توضیح رهگیری ارسال را وارد کنید.', 'Enter shipment tracking details.'], delivery_already_attempted: ['تحویل قبلاً انجام شده یا نتیجه آن نامشخص است؛ مقصد را بررسی کنید.', 'Delivery has already been attempted; inspect the destination.'],
    recipient_membership_required: ['خریدار هنوز عضو همه قفل‌های عضویت نیست؛ پیام راهنمای عضویت برای او ارسال شد.', 'The buyer has not joined every required chat. Membership instructions were sent.'],
    media_belongs_to_another_bot: ['این فایل برای توکن ربات قبلی است؛ با ربات جدید دوباره آپلود کنید.', 'This file belongs to a previous bot. Re-upload it with the new token.'],
    invalid_coupon: ['کد لاتین (۳ تا ۳۲ کاراکتر) و مقدار تخفیف را بررسی کنید.', 'Check the discount code and value.'], invalid_coupon_dates: ['پایان اعتبار باید بعد از شروع و زمان فعلی باشد.', 'Expiry must be after the start and the current time.'], duplicate_coupon: ['این کد تخفیف قبلاً ثبت شده است.', 'This discount code already exists.'],
    numeric_group_id_required: ['آیدی عددی منفی گروه، مانند -1001234567890 را وارد کنید.', 'Enter the negative numeric group ID.'], group_already_exists: ['گروه قبلاً ثبت شده؛ همان گروه را ویرایش کنید.', 'The group already exists; edit it instead.'], disable_group_and_wait_for_restore: ['ابتدا گروه را غیرفعال کنید و برای بازگردانی دسترسی‌ها یک دقیقه صبر کنید.', 'Disable the group first and wait for permission restoration.'], invalid_night_hours: ['ساعت‌های شروع و پایان باید متفاوت و با فرمت 00:00 باشند.', 'Start and end must differ and use 00:00 format.'], invalid_timezone: ['نام منطقه زمانی معتبر نیست.', 'Invalid timezone.'],
    unsafe_feed_url: ['آدرس فید باید HTTPS عمومی باشد، نه IP یا آدرس داخلی.', 'Use a public HTTPS feed URL, not an IP or internal address.'], invalid_youtube_channel_id: ['آیدی کانال یوتیوب باید با UC شروع شود (۲۴ کاراکتر).', 'Use a 24-character YouTube channel ID starting with UC.'], channel_repost_cycle: ['این تنظیم یک حلقه بازنشر می‌سازد؛ مقصدها را اصلاح کنید.', 'These rules create a repost loop. Change the destinations.'],
    invalid_destinations: ['حداقل یک مقصد معتبر وارد کنید.', 'Enter at least one valid destination.'], relay_already_processed: ['این پیام قبلاً بررسی یا ارسال شده است.', 'This message was already processed.'], module_disabled: ['این بخش در نوع فعلی ربات فعال نیست.', 'This feature is disabled for the selected bot type.'],
    photo_must_be_jpeg_or_png: ['برای عکس از JPEG یا PNG استفاده کنید؛ سایر فرمت‌ها را به‌صورت فایل بفرستید.', 'Photos must be JPEG or PNG; send other formats as documents.'], segment_product_required: ['محصول هدف‌گیری را انتخاب کنید.', 'Choose a product for audience targeting.'], channel_module_required: ['زمان‌بندی در نوع فعلی ربات فعال نیست؛ حالت سفارشی را انتخاب کنید.', 'Scheduling is not enabled for this bot type. Use Custom mode.'],
    invalid_faq: ['پرسش و پاسخ را کامل کنید.', 'Enter a question and an answer.'], invalid_watermark_logo: ['لوگوی PNG/JPEG/WebP کوچک‌تر از ۲۰۰ کیلوبایت انتخاب کنید.', 'Choose a PNG/JPEG/WebP logo under 200 KB.'], watermark_content_required: ['متن یا لوگوی واترمارک را وارد کنید.', 'Enter watermark text or a logo.'], internal_error: ['خطای داخلی؛ صفحه را تازه کنید و دوباره تلاش کنید.', 'Internal error; refresh and try again.'],
    invalid_body: ['درخواست به‌درستی به سرور نرسید؛ صفحه را تازه کنید و دوباره ذخیره را بزنید.', 'The request did not reach the server intact. Refresh the page and save again.'],
    invalid_form_body: ['فایل به‌درستی ارسال نشد؛ دوباره انتخاب و آپلود کنید.', 'The file was not uploaded correctly. Choose and upload it again.'],
    operation_not_found: ['این عملیات دیگر وجود ندارد؛ فهرست را تازه کنید.', 'This operation no longer exists. Refresh the list.']
  };
  return messages[code]?.[S.lang === 'en' ? 1 : 0] || code;
}
async function initV2() {
  const d = await api('/settings'); V2.settings = d.settings;
  try { V2.summary = await api('/studio/summary'); } catch {}
  document.documentElement.dataset.motion = localStorage.getItem('bp_motion') || 'auto';
  try { await creatorState(); creatorMaybePopup(); } catch {}
}
async function vSaveSettings(body, refresh = false) {
  if (V2.uploads) throw new Error(L('تا پایان آپلود صبر کنید.', 'Wait for the upload to finish.'));
  const d = await api('/settings', { method: 'PUT', body }); V2.settings = d.settings; toast(t('saved'), 'success');
  if (refresh) render(); return d.settings;
}
function vModal(title, body, action, saveLabel = t('save')) {
  openModal(`<div class="p-5 md:p-6"><div class="flex items-center justify-between gap-3 mb-6"><h3 class="font-bold">${title}</h3><button type="button" data-act="modalClose" class="${CLS.iconBtn}" aria-label="${t('close')}">${vIcon('x')}</button></div><form id="v-form" data-submit="${action}" class="space-y-4">${body}<div class="v-divider"></div><div class="flex justify-end gap-2">${vButton(t('cancel'), 'modalClose')}<button type="submit" class="${CLS.btnP}">${vIcon('check')}${saveLabel}</button></div></form></div>`);
  paintDropdowns();
}
document.addEventListener('submit', async e => {
  const form = e.target; if (!form.matches('[data-submit]')) return; e.preventDefault();
  if (!form.reportValidity()) return;
  if (V2.uploads) return toast(L('آپلود هنوز تمام نشده است.', 'Upload still in progress.'), 'info');
  const btn = form.querySelector('[type=submit]'); btn.disabled = true;
  try { await ACTIONS[form.dataset.submit]({}, btn); } catch (err) { toast(vError(err.message), 'error'); }
  finally { if (btn.isConnected) btn.disabled = false; }
});
ACTIONS.vMoreNav = () => { openModal(`<div class="p-6"><h3 class="font-bold mb-4">${L('همه بخش‌ها','All sections')}</h3><div class="space-y-2">${NAV.filter(n => visibleRoute(n.id)).map(n => `<button data-act="vNav" data-to="${n.id}" class="${CLS.btnS} w-full !justify-start">${vIcon(n.icon)}${t(n.id)}</button>`).join('')}<button data-act="creatorSupport" class="${CLS.btnS} w-full !justify-start relative">${vIcon('life-buoy')}${t('creatorSupport')}</button></div></div>`); creatorState(); };
ACTIONS.vNav = d => { closeModal(); go(d.to); };
const vCloseBase = closeModal;
closeModal = function () { ddClose(); for (const url of V2.urls) URL.revokeObjectURL(url); V2.urls.clear(); vCloseBase(); };
function vBlobUrl(blob) { const url = URL.createObjectURL(blob); V2.urls.add(url); return url; }
async function vAuthorizedFile(path) {
  const r = await fetch(apiURL(path), { headers: { Authorization: 'Bearer ' + S.token } });
  if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error || 'file_unavailable'); }
  return r.blob();
}
function vMediaQuickActions() {
  return `<div class="v-upload-heading"><h4>${L('عکس یا فایل را از دستگاه اضافه کنید','Add a photo or file from your device')}</h4><p>${L('بدون لینک؛ از گالری یا فایل‌های گوشی و کامپیوتر','No URL needed; choose from your gallery or files')}</p></div>
  <div class="v-media-actions">
    <button type="button" data-act="vAddMedia" data-kind="photo" class="v-media-pick v-media-photo"><span class="v-icon">${vIcon('image-plus')}</span><span><strong>${L('افزودن عکس','Add photo')}</strong><small>JPEG / PNG · ${L('تا ۱۰ مگابایت','up to 10 MB')}</small></span>${vIcon('plus')}</button>
    <button type="button" data-act="vAddMedia" data-kind="document" class="v-media-pick v-media-file"><span class="v-icon">${vIcon('file-plus-2')}</span><span><strong>${L('افزودن فایل','Add file')}</strong><small>${L('همه فرمت‌ها · تا ۲۰ مگابایت','Any format · up to 20 MB')}</small></span>${vIcon('plus')}</button>
  </div>`;
}
ACTIONS.vAddMedia = d => {
  if (V2.uploads) return toast(L('تا پایان آپلود صبر کنید.','Wait for the upload to finish.'), 'info');
  const input = document.querySelector('[data-upload="ph-media"]');
  if (!input || !['photo', 'document'].includes(d.kind)) return;
  input.dataset.pickerKind = d.kind;
  input.accept = d.kind === 'photo' ? 'image/jpeg,image/png' : '';
  input.click();
};
document.addEventListener('cancel', e => {
  if (e.target.matches?.('[data-upload="ph-media"]')) {
    delete e.target.dataset.pickerKind;
    e.target.accept = vVal('ph-kind') === 'photo' ? 'image/jpeg,image/png' : '';
  }
}, true);
function purposePreview(key, customModules = V2.settings?.customModules || []) {
  const purpose = V2.settings?.purposes?.[key]; if (!purpose) return '';
  const modules = key === 'custom' ? customModules : purpose.modules;
  const applied = key === V2.settings.botPurpose && (key !== 'custom' || [...modules].sort().join(',') === [...V2.settings.customModules].sort().join(','));
  const description = key === 'channel'
    ? L('پنل مخصوص کانال: محصولات و دیپ‌لینک اختصاصی، دسته‌بندی شیشه‌ای، زمان‌بندی و انتشار خودکار، نظرسنجی و قفل عضویت. ابزارهای سفارش فروشگاه و بی‌نام‌ساز در این حالت پنهان می‌شوند.','Channel workspace: product deep links, inline categories, scheduling, auto-publishing, polls and membership gates. Store orders and anonymous relaying are hidden in this mode.')
    : key === 'custom'
      ? L('همه ابزارها در دسترس‌اند؛ ماژول‌های دلخواه را انتخاب کنید. تغییر نوع، اطلاعات قبلی را حذف نمی‌کند.','Every tool is available. Choose your own modules; changing the type does not delete data.')
      : L('پس از اعمال، پنل و منوی ربات فقط ابزارهای مرتبط با این نوع را نشان می‌دهند. اطلاعات سایر بخش‌ها حفظ می‌شود.','Once applied, the panel and bot menu show tools relevant to this type. Other data is preserved.');
  return `<div class="v-purpose-summary"><div class="flex items-start gap-3"><span class="v-icon shrink-0">${vIcon(purpose.icon)}</span><div><h4 class="text-sm font-bold">${esc(S.lang==='en' ? purpose.en : purpose.fa)}</h4><p class="v-meta">${description}</p></div></div><div class="flex gap-2 flex-wrap mt-3">${modules.map(m=>`<span class="v-badge">${vModuleName(m)}</span>`).join('')}</div><p class="v-meta mt-3">${applied ? L('نوع فعلی ربات','Current bot type') : L('این پیش‌نمایش است؛ برای ذخیره، «اعمال نوع ربات» را بزنید.','This is a preview. Use “Apply bot type” to save.')}</p></div>`;
}
function uploadField(id, label, value = '', kind = 'auto') {
  const record = (V2.cache.media || []).find(m => m.id === value);
  return `<div class="v-upload" data-slot="${id}"><label class="v-field mb-2">${label}</label><input id="${id}" type="hidden" value="${esc(value)}"><input id="${id}-kind" type="hidden" value="${esc(record?.kind || '')}"><label class="v-drop" data-drop="${id}">${vIcon('cloud-upload')}<span><b class="block text-sm">${L('انتخاب مستقیم از دستگاه', 'Choose from your device')}</b><span class="text-[11px] text-slate-400">${L('یا فایل را اینجا رها کنید • عکس ۱۰، فایل ۲۰ مگابایت', 'or drop a file here • Photo 10 MB / File 20 MB')}</span></span><input type="file" data-upload="${id}" data-kind="${kind}" aria-label="${esc(label)}" ${kind === 'photo' ? 'accept="image/jpeg,image/png"' : ''}></label><div id="${id}-status" class="v-upload-status text-slate-400" aria-live="polite">${value ? vIcon('check') + ' ' + esc(record?.name || L('فایل ثبت‌شده', 'Saved file')) : ''}</div><div class="flex gap-3 mt-1"><button type="button" data-act="vMediaClear" data-slot="${id}" class="text-xs text-rose-400">${L('حذف انتخاب','Clear selection')}</button><button type="button" data-act="vMediaChoose" data-slot="${id}" data-kind="${kind}" class="text-xs text-brand-500">${L('انتخاب از فایل‌های قبلی','Choose an existing file')}</button></div></div>`;
}
ACTIONS.vMediaClear = d => { $(d.slot).value = ''; $(d.slot + '-kind').value = ''; $(d.slot + '-status').textContent = ''; const img = document.querySelector(`[data-slot="${d.slot}"] .v-preview`); if (img) { URL.revokeObjectURL(img.src); img.remove(); } };
ACTIONS.vMediaChoose = async d => {
  const host = $(d.slot + '-status'); const { rows } = await api('/media'); V2.cache.media = rows;
  const wantedKind = d.slot === 'ph-media' ? vVal('ph-kind') || 'auto' : d.kind;
  const items = rows.filter(m => wantedKind === 'auto' || m.kind === wantedKind);
  host.innerHTML = items.length ? `<div class="max-h-40 overflow-y-auto rounded-xl border border-slate-500/20 mt-2 p-2">${items.map(m => `<button type="button" class="block w-full text-start p-2 hover:text-brand-500" data-act="vMediaPick" data-slot="${d.slot}" data-id="${m.id}">${esc(m.name)} · ${esc(m.kind)}</button>`).join('')}</div>` : L('هنوز فایلی آپلود نشده است.', 'No uploaded files yet.');
};
ACTIONS.vMediaPick = d => { const m = V2.cache.media.find(m => m.id === d.id); if (!m) return; $(d.slot).value = m.id; $(d.slot + '-kind').value = m.kind; { const stEl = $(d.slot + '-status'); if (stEl) { stEl.innerHTML = vIcon('check') + ' '; stEl.appendChild(document.createTextNode(m.name)); refreshIcons(); } } };
async function vWatermark(file) {
  const w = V2.settings?.uploads?.watermark; if (!w?.enabled) return file;
  const bitmap = await createImageBitmap(file); const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const padding = Math.max(14, canvas.width * .025), fontSize = Math.max(16, Math.round(canvas.width * .025));
  ctx.globalAlpha = w.opacity || .65;
  if (w.logo) { const logo = await createImageBitmap(await (await fetch(w.logo)).blob()); const width = Math.min(canvas.width * .18, 220), height = width * logo.height / logo.width; ctx.drawImage(logo, padding, canvas.height - padding - height, width, height); logo.close(); }
  if (w.text) { ctx.font = `600 ${fontSize}px Vazirmatn, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.lineWidth = Math.max(2, fontSize / 10); ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.strokeText(w.text, canvas.width - padding, canvas.height - padding, canvas.width * .7); ctx.fillStyle = '#ffffff'; ctx.fillText(w.text, canvas.width - padding, canvas.height - padding, canvas.width * .7); }
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .9)); canvas.width = canvas.height = 1;
  if (!blob) throw new Error('watermark_failed'); return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-watermarked.jpg', { type: 'image/jpeg' });
}
async function uploadSelected(input, file) {
  if (!file) return;
  const slot = input.dataset.upload, host = $(slot + '-status'), zone = input.closest('.v-drop');
  let kind = input.dataset.kind || 'auto';
  if (slot === 'ph-media') {
    kind = input.dataset.pickerKind || vVal('ph-kind') || 'auto';
    delete input.dataset.pickerKind;
  }
  if (kind === 'auto') kind = /^image\/(jpeg|png)$/.test(file.type) ? 'photo' : file.type === 'image/gif' ? 'animation' : file.type === 'video/mp4' ? 'video' : /^audio\/(mpeg|mp4|x-m4a)$/.test(file.type) ? 'audio' : 'document';
  if (file.size > (kind === 'photo' ? 10 : 20) * 1024 * 1024) return toast(vError('file_too_large'), 'error');
  if (!V2.settings?.uploads?.chatId) return toast(vError('upload_chat_required'), 'error');
  ACTIONS.vMediaClear({ slot });
  if (slot === 'ph-media') { $('ph-kind').value = kind; paintDropdowns(); }
  V2.uploads++; zone.classList.add('uploading'); host.textContent = L('در حال آماده‌سازی…', 'Preparing…');
  try {
    if (kind === 'photo') file = await vWatermark(file);
    const form = new FormData(); form.append('file', file); form.append('kind', kind);
    if (slot === 'ph-media' && vVal('ph-operation') !== 'none') form.append('operation', vVal('ph-operation'));
    host.innerHTML = `<span>${L('در حال آپلود…', 'Uploading…')}</span><progress class="v-progress" max="100" value="0"></progress>`;
    const data = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest(); xhr.open('POST', apiURL('/media')); xhr.setRequestHeader('Authorization', 'Bearer ' + S.token); xhr.timeout = 120000;
      xhr.upload.onprogress = e => { if (e.lengthComputable && host.isConnected) host.querySelector('progress').value = Math.round(e.loaded * 100 / e.total); };
      xhr.onload = () => { let d; try { d = JSON.parse(xhr.responseText); } catch { return reject(new Error('upload_failed')); } xhr.status < 300 && d.ok ? resolve(d.data.media) : reject(new Error(d.error || 'upload_failed')); };
      xhr.onerror = () => reject(new Error(t('offline'))); xhr.ontimeout = () => reject(new Error('telegram_network_error')); xhr.send(form);
    });
    V2.cache.media = [data, ...(V2.cache.media || [])];
    if (!input.isConnected || !$(slot) || $(slot).closest('.v-upload') !== input.closest('.v-upload')) return;
    $(slot).value = data.id; $(slot + '-kind').value = data.kind;
    host.innerHTML = vIcon('check') + ' '; host.appendChild(document.createTextNode(`${data.name} · ${(data.size / 1024 / 1024).toFixed(2)} MB`)); refreshIcons();
    const old = zone.parentElement.querySelector('.v-preview'); if (old) { URL.revokeObjectURL(old.src); old.remove(); }
    if (kind === 'photo') { const img = document.createElement('img'); img.alt = L('پیش‌نمایش عکس آپلودشده', 'Uploaded image preview'); img.className = 'v-preview'; img.src = vBlobUrl(file); zone.parentElement.appendChild(img); }
  } catch (e) { host.textContent = vError(e.message); toast(vError(e.message), 'error'); }
  finally { V2.uploads--; zone.classList.remove('uploading'); input.value = ''; }
}
document.addEventListener('change', async e => {
  if (e.target.matches('[data-upload]')) await uploadSelected(e.target, e.target.files[0]);
  if (e.target.id === 'v-watermark-logo') {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 200000 || !/^image\/(png|jpeg|webp)$/.test(f.type)) return toast(vError('invalid_watermark_logo'), 'error');
    const reader = new FileReader(); reader.onload = () => { V2.logoDraft = reader.result; { const ll = $('v-logo-label'); ll.innerHTML = vIcon('check') + ' '; ll.appendChild(document.createTextNode(f.name)); refreshIcons(); } }; reader.readAsDataURL(f);
  }
});
document.addEventListener('dragover', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('drag'); } });
document.addEventListener('dragleave', e => e.target.closest('[data-drop]')?.classList.remove('drag'));
document.addEventListener('drop', e => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.remove('drag'); uploadSelected(z.querySelector('input[type=file]'), e.dataTransfer.files[0]); } });

const vOriginalSettings = renderSettings;
renderSettings = function () {
  vOriginalSettings();
  const legacy = document.querySelector('[data-acc="set:channel"]'); if (legacy) legacy.classList.add('hidden');
  $('view').insertAdjacentHTML('afterbegin', '<div id="v-profile-settings" class="mb-6"></div>');
  $('view').insertAdjacentHTML('beforeend', '<div id="v-extra-settings" class="space-y-4 mt-6"></div>');
  $('v-profile-settings').innerHTML = '<div class="v-skeleton"></div>';
  $('v-extra-settings').innerHTML = '<div class="v-skeleton"></div>';
};
const vOriginalLoadSettings = loadSettings;
loadSettings = async function () { await vOriginalLoadSettings(); if (S.route !== 'settings') return; try { const d = await api('/settings'); V2.settings = d.settings; paintV2Settings(); } catch (e) { toast(vError(e.message), 'error'); } };
function profileCards(selected) {
  const purposes = V2.settings?.purposes || {};
  return `<div class="v-grid v-stagger">${Object.entries(purposes).map(([key, p]) => `<button type="button" class="v-profile ${selected === key ? 'selected' : ''}" data-act="vChoosePurpose" data-id="${key}" aria-pressed="${selected === key}"><span class="v-icon">${vIcon(p.icon)}</span><strong>${esc(S.lang === 'en' ? p.en : p.fa)}</strong><p>${esc(S.lang === 'en' ? p.modules.map(vModuleName).slice(0, 4).join(' · ') : p.desc)}</p></button>`).join('')}</div>`;
}
function paintV2Settings() {
  const s = V2.settings; if (!$('v-profile-settings') || !s) return;
  V2.purposeDraft = s.botPurpose; V2.lockDraft = structuredClone(s.requiredChats.targets || []); V2.logoDraft = s.uploads.watermark.logo || '';
  $('v-profile-settings').innerHTML = vSection(
    L('ربات برای چه کاری باشد؟', 'What should your bot do?'),
    `<div id="v-profile-cards">${profileCards(s.botPurpose)}</div><div id="v-purpose-preview" class="mt-5" aria-live="polite">${purposePreview(s.botPurpose)}</div><div id="v-custom-modules" class="${s.botPurpose === 'custom' ? '' : 'hidden'} mt-5"><p class="text-xs text-slate-400 mb-2">${L('ماژول‌های دلخواه در حالت پیش‌فرض:', 'Choose modules in Custom mode:')}</p><div class="grid grid-cols-2 sm:grid-cols-3 gap-x-3">${Object.keys(MODULE_LABELS).map(m => vCheck('v-mod-' + m, vModuleName(m), s.customModules.includes(m))).join('')}</div></div><p class="text-xs text-slate-400 mt-5">${L('یک ربات، متناسب با کار شما. ابزارهای مرتبط می‌مانند و بخش‌های اضافی پنهان می‌شوند. تغییر نوع ربات، اطلاعات و تنظیمات قبلی را پاک نمی‌کند.', 'One bot, built around your workflow. Relevant tools stay; the rest step aside. Changing the bot type never deletes your existing data.')}</p>`,
    vButton(L('اعمال نوع ربات', 'Apply bot type'), 'vSavePurpose', '', true),
    { group: 'v', id: 'purpose', icon: 'sliders-horizontal', open: true }
  );
  const u = s.uploads, sh = s.shop, rl = s.relay, lo = s.loyalty;
  $('v-extra-settings').innerHTML = [
    vSection(L('قفل عضویت چند کانال و گروه', 'Multiple membership locks'), vCheck('v-lock-on', L('فعال؛ دسترسی فقط پس از عضویت در همه مقصدهای مربوط به این نوع ربات', 'Require membership in every matching chat before granting access'), s.requiredChats.enabled) + '<div id="v-lock-rows" class="space-y-3 mt-3"></div><div class="mt-3">' + vButton(L('افزودن قفل جدید','Add required chat'), 'vLockAdd') + '</div><div class="mt-4">' + vNote(L('ربات باید ادمین همه مقصدها باشد. برای گروه/کانال خصوصی، لینک دعوت الزامی است. خطای تلگرام دسترسی را باز نمی‌کند؛ عضویت در هر درخواست دوباره بررسی می‌شود. «همه حالت‌ها» بر تمام انواع ربات اعمال می‌شود.', 'The bot must be an administrator in every target. Private chats need invite links. Telegram errors keep access locked; membership is rechecked on each request. Global locks apply to every bot type.')) + '</div>', vButton(t('save'), 'vSaveLocks', '', true), { icon: 'lock' }),
    vSection(L('فایل و رسانه · آپلود مستقیم', 'Media · direct uploads'), `<div class="grid sm:grid-cols-2 gap-4">${vField('v-upload-chat', L('چت موقت ذخیره‌سازی (آیدی مدیر یا کانال)', 'Staging chat (admin ID or channel)'), u.chatId, 'dir="ltr" placeholder="@media_channel / -100… / 123456"')}${vField('v-bot-username', L('یوزرنیم ربات برای دیپ‌لینک', 'Bot username for deep links'), s.botUsername, 'dir="ltr" placeholder="your_bot"')}</div><div class="flex gap-2 mt-3">${vButton(L('آزمایش اتصال و دریافت یوزرنیم', 'Test connection & get username'), 'vTestBot')}</div><div class="mt-4">${vNote(L('برای آیدی مدیر: مدیر ابتدا /start بزند. برای کانال: ربات را ادمین کنید. فایل یک‌بار به تلگرام آپلود می‌شود و سپس با file_id برای مخاطبان فرستاده می‌شود؛ توکن به مرورگر یا لینک فایل عمومی داده نمی‌شود.', 'For an admin ID, start the bot first. For a channel, grant bot admin rights. Each file is uploaded once and reused by Telegram file_id; no bot token or public file URL is exposed.'))}</div><div class="v-divider"></div>${vCheck('v-watermark-on', L('واترمارک خودکار تصاویر آپلودشده از پنل', 'Automatically watermark images uploaded through the panel'), u.watermark.enabled)}<div class="grid sm:grid-cols-2 gap-4">${vField('v-watermark-text', L('متن یا آیدی کانال', 'Text or channel username'), u.watermark.text, 'maxlength="100"')}${vField('v-watermark-opacity', L('شفافیت (۰٫۱ تا ۱)', 'Opacity (0.1–1)'), u.watermark.opacity, 'type="number" min="0.1" max="1" step="0.05"')}<label class="v-field"><span>${L('لوگو؛ اختیاری، حداکثر ۲۰۰ KB', 'Logo; optional, up to 200 KB')}</span><input id="v-watermark-logo" type="file" accept="image/png,image/jpeg,image/webp" class="text-xs max-w-full"><span id="v-logo-label" class="text-xs mt-2">${V2.logoDraft ? L('لوگو ذخیره شده است','Logo saved') : ''}</span></label><div>${vButton(L('حذف لوگو','Remove logo'), 'vRemoveLogo')}</div></div><div class="mt-4">${vNote(L('واترمارک عکس در مرورگر انجام می‌شود (حداکثر ضلع ۲۵۶۰ پیکسل). تبدیل/فشرده‌سازی ویدیو و واترمارک ویدیو به سرویس خارجی نیاز دارند. این قابلیت‌ها بدون اتصال سرویس، فعال اعلام نمی‌شوند.', 'Image watermarks are applied in the browser (up to 2560 px per side). Video conversion, compression and video watermarks require an external processor.'))}</div><div class="mt-3"><span class="v-badge ${s.integrations.mediaProcessor ? 'good' : 'warn'}">${s.integrations.mediaProcessor ? L('پردازشگر خارجی تنظیم شده', 'External processor configured') : L('پردازشگر خارجی متصل نیست', 'External processor not configured')}</span></div>`, vButton(t('save'), 'vSaveMediaSettings', '', true), { icon: 'paperclip' }),
    ...(vHas('shop') ? [vSection(L('فروشگاه · پرداخت و تحویل', 'Store · payment & delivery'), `<div class="grid sm:grid-cols-2 gap-4">${vSelect('v-pay-method', L('روش پرداخت','Payment method'), [['manual',L('کارت‌به‌کارت + تأیید دستی فیش','Bank transfer + manual receipt review')],['zarinpal',L('زرین‌پال + استعلام سرور','Zarinpal + server verification')]], sh.payment)}${vField('v-shop-notify', L('مقصد اعلان سفارش برای مدیر','Admin order notification chat'), sh.notifyChatId, 'dir="ltr"')}${vField('v-card-number', L('شماره کارت ۱۶ رقمی','16-digit card number'), sh.cardNumber, 'dir="ltr" inputmode="numeric" maxlength="19"')}${vField('v-card-holder', L('نام صاحب کارت','Card holder'), sh.cardHolder, 'maxlength="100"')}${vField('v-reservation', L('مهلت پرداخت و رزرو موجودی (دقیقه)','Payment & stock reservation (minutes)'), sh.reservationMinutes, 'type="number" min="5" max="1440"')}${vArea('v-delivery-slots', L('بازه‌های تحویل؛ هر خط یک گزینه','Delivery windows; one per line'), sh.deliverySlots.join('\n'), 3)}</div>${vCheck('v-shop-address', L('دریافت آدرس برای همه محصولات (برای کالای فیزیکی همیشه لازم است)','Collect an address for all products (always required for physical items)'), sh.requireAddress)}${vCheck('v-shop-protect', L('محافظت تلگرامی محتوای تحویل‌شده (تضمین جلوگیری از کپی نیست)','Telegram content protection (not a guarantee against copying)'), sh.protectContent)}<div class="mt-3">${vNote(L('تمام قیمت‌ها تومان هستند؛ در زرین‌پال به ریال تبدیل می‌شوند. فیش تصویری فقط به صف بررسی مدیر می‌رود؛ OCR یا ظاهر رسید اثبات پرداخت نیست. درگاه با secret در Cloudflare تنظیم می‌شود. سایر درگاه‌ها و رمزارزها در این نسخه پیاده‌سازی نشده‌اند.', 'Prices are in toman and converted to IRR for Zarinpal. Receipt images require manual review, never automatic approval. Configure gateway credentials as Cloudflare secrets. Other gateways and crypto are not implemented in this version.'), true)}</div><div class="mt-3"><span class="v-badge ${s.integrations.zarinpal ? 'good' : 'warn'}">${s.integrations.zarinpal ? L('زرین‌پال تنظیم شده','Zarinpal configured') : L('زرین‌پال تنظیم نشده','Zarinpal not configured')}${s.integrations.sandbox ? ' · SANDBOX' : ''}</span></div>`, vButton(t('save'), 'vSaveShopSettings', '', true), { icon: 'shopping-bag' })] : []),
    ...(vHas('relay') ? [vSection(L('حذف فوروارد / بی‌نام‌ساز', 'Forward attribution removal'), vCheck('v-relay-on', L('دریافت و کپی پیام‌های خصوصی کاربران فعال باشد','Accept and copy private user messages'), rl.enabled) + vCheck('v-relay-approval', L('انتشار فقط پس از تأیید مدیر','Require administrator approval before publishing'), rl.approval) + vCheck('v-relay-echo', L('یک نسخه بدون برچسب فوروارد به خود کاربر هم بده','Also return a clean copy to the sender'), rl.echoToUser) + vArea('v-relay-dest', L('مقصدها؛ هر خط عنوان | آیدی','Destinations; one Title | Chat ID per line'), rl.destinations.map(d => `${d.title || 'مقصد'} | ${d.chatId}`).join('\n')) + '<div class="mt-3">' + vNote(L('ربات از copyMessage / copyMessages استفاده می‌کند. پیام اصلی کاربر پاک نمی‌شود. هویت فرستنده در پنل مدیر محفوظ است و فقط برچسب فوروارد در مقصد حذف می‌شود. پیام‌های محافظت‌شده ممکن است قابل کپی نباشند.', 'Uses copyMessage / copyMessages. The original is not deleted. The administrator can see the sender; recipients see no forward attribution. Protected messages may not be copyable.')) + '</div>', vButton(t('save'), 'vSaveRelaySettings', '', true), { icon: 'copy' })] : []),
    ...(vHas('crm') ? [vSection(L('باشگاه مشتریان و دعوت دوستان', 'Loyalty & referrals'), vCheck('v-loyalty-on', L('سیستم امتیاز فعال باشد','Enable points'), lo.enabled) + `<div class="grid sm:grid-cols-2 gap-4">${vField('v-ref-points', L('امتیاز دعوت معتبر','Points per qualified referral'), lo.referralPoints, 'type="number" min="0" max="10000"')}${vField('v-signup-points', L('امتیاز ثبت‌نام','Signup points'), lo.signupPoints, 'type="number" min="0" max="10000"')}${vField('v-purchase-unit', L('هر چند تومان خرید = ۱ امتیاز','Purchase amount per point (toman)'), lo.purchaseUnit, 'type="number" min="1" max="1000000000"')}${vField('v-point-value', L('ارزش هر امتیاز (تومان)','Value per point (toman)'), lo.pointValue, 'type="number" min="0" max="1000000"')}${vField('v-point-cap', L('سقف درصد تخفیف امتیازی','Maximum points discount (%)'), lo.maxDiscountPercent, 'type="number" min="0" max="100"')}</div><div class="mt-3">${vNote(L('دعوت وقتی ثبت می‌شود که کاربر جدید با لینک معرفی وارد ربات شود و از همه قفل‌های عضویت عبور کند. دعوت از خود و امتیاز تکراری رد می‌شود؛ این روش اثبات یکتایی انسان یا شمارنده قطعی دعوت تلگرام نیست.', 'A referral qualifies when a new user enters using the referral link and passes all membership gates. Self-referrals and duplicate rewards are rejected. This is not identity verification or a native Telegram invite counter.'))}</div>`, vButton(t('save'), 'vSaveLoyalty', '', true), { icon: 'star' })] : []),
    ...((vHas('channel') || V2.settings.botPurpose === 'news') ? [vNewsSettingsSection(s)] : []),
    ...((vHas('catalog') || V2.settings.botPurpose === 'rates' || V2.settings.botPurpose === 'custom') ? [vRatesSettingsSection(s)] : []),
    vSection(L('حرکت و انیمیشن','Motion & animation'), vSelect('v-motion', L('انیمیشن پنل','Panel animation'), [['auto',L('روان و سبک (تطبیق با تنظیم دستگاه)','Smooth & lightweight (respects device preference)')],['off',L('خاموش','Off')]], localStorage.getItem('bp_motion') || 'auto') + '<p class="v-meta">' + L('حرکت کوتاه هنگام ورود صفحه، باز شدن کارت و انتخاب نوع ربات؛ بدون ذرات متحرک یا حلقه سنگین. کاهش حرکت سیستم‌عامل رعایت می‌شود.', 'Short page, card and selection transitions. No particle effects or heavy loops. Respects reduced-motion preferences.') + '</p>', vButton(t('save'), 'vSaveMotion', '', true), { icon: 'sparkles' }),
  ].join('');
  renderLockRows(); refreshIcons(); paintDropdowns();
  if ($('v-rates-live') && !$('v-rates-live').dataset.loaded) ACTIONS.vRatesLive();
  if (typeof updateSaveBar === 'function') updateSaveBar();
}
function renderLockRows() {
  const purposes = V2.settings.purposes;
  $('v-lock-rows').innerHTML = V2.lockDraft.map((row, i) => `<div class="rounded-xl border border-slate-500/20 p-4" data-lock-row="${i}"><div class="flex justify-between mb-3"><span class="v-badge">${L('قفل','Lock')} ${fmtNum(i + 1)}</span><button data-act="vLockRemove" data-index="${i}" class="text-rose-400 text-xs">${t('delete')}</button></div><div class="grid sm:grid-cols-2 gap-3">${vField(`vl-title-${i}`,L('عنوان دکمه','Button title'),row.title)}${vField(`vl-chat-${i}`,L('آیدی کانال یا گروه','Chat ID / username'),row.chatId,'dir="ltr" placeholder="@channel / -100…"')}${vField(`vl-url-${i}`,L('لینک دعوت (برای خصوصی الزامی)','Invite link (required for private chats)'),row.url,'dir="ltr" placeholder="https://t.me/+…"')}${vSelect(`vl-scope-${i}`,L('اعمال در کدام نوع ربات؟','Apply to which bot type?'),[['all',L('همه حالت‌ها','All bot types')],...Object.entries(purposes).map(([key,p])=>[key,S.lang==='en'?p.en:p.fa])],row.scope || 'all')}</div></div>`).join('');
  refreshIcons(); paintDropdowns();
}
function syncLocks() { V2.lockDraft = V2.lockDraft.map((_, i) => ({ title: vVal(`vl-title-${i}`), chatId: vVal(`vl-chat-${i}`), url: vVal(`vl-url-${i}`), scope: vVal(`vl-scope-${i}`) })); }
function paintPurposeSelection(key) {
  V2.purposeDraft = key;
  document.querySelectorAll('.v-profile').forEach(card => {
    const selected = card.dataset.id === key;
    card.classList.toggle('selected', selected); card.setAttribute('aria-pressed', String(selected));
  });
  if (!$('v-purpose-preview')) return;
  $('v-purpose-preview').innerHTML = purposePreview(key, Object.keys(MODULE_LABELS).filter(m => vOn('v-mod-' + m)));
  $('v-custom-modules').classList.toggle('hidden', key !== 'custom');
  refreshIcons();
}
ACTIONS.vChoosePurpose = async d => {
  if (V2.purposeSaving || !Object.hasOwn(V2.settings.purposes, d.id)) return;
  paintPurposeSelection(d.id);
  if (d.id !== V2.settings.botPurpose) {
    V2.purposeSaving = true;
    try { await ACTIONS.vSavePurpose(); }
    finally { V2.purposeSaving = false; paintPurposeSelection(V2.settings.botPurpose); }
  }
};
ACTIONS.vSavePurpose = async () => { const body = { botPurpose: V2.purposeDraft, customModules: Object.keys(MODULE_LABELS).filter(m => vOn('v-mod-' + m)) }; if (!(await confirmDlg(L('نوع و رفتار ربات تغییر کند؟ اطلاعات قبلی حذف نمی‌شود. زمان‌بندی ماژول‌های پنهان متوقف و دسترسی حالت شب غیرفعال بازگردانی می‌شود.', 'Change the bot type and behavior? Data is preserved. Disabled schedules pause and night permissions are restored.'), L('اعمال تغییر','Apply')))) return; await vSaveSettings(body, true); };
ACTIONS.vLockAdd = () => { syncLocks(); if (V2.lockDraft.length >= 20) return; V2.lockDraft.push({ chatId: '', url: '', title: '', scope: 'all' }); renderLockRows(); };
ACTIONS.vLockRemove = d => { syncLocks(); V2.lockDraft.splice(Number(d.index), 1); renderLockRows(); };
ACTIONS.vSaveLocks = async () => { syncLocks(); await vSaveSettings({ requiredChats: { enabled: vOn('v-lock-on'), targets: V2.lockDraft } }); };
ACTIONS.vRemoveLogo = () => { V2.logoDraft = ''; $('v-logo-label').textContent = ''; };
ACTIONS.vSaveMediaSettings = () => vSaveSettings({ botUsername: vVal('v-bot-username'), uploads: { chatId: vVal('v-upload-chat'), watermark: { enabled: vOn('v-watermark-on'), text: vVal('v-watermark-text'), logo: V2.logoDraft, opacity: vNum('v-watermark-opacity') } } });
ACTIONS.vTestBot = async () => { const d = await api('/settings/test', { method: 'POST' }); V2.settings = d.settings; $('v-bot-username').value = d.bot.username; toast('@' + d.bot.username, 'success'); };
ACTIONS.vSaveShopSettings = () => vSaveSettings({ shop: { payment: vVal('v-pay-method'), cardNumber: vVal('v-card-number').replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c)), cardHolder: vVal('v-card-holder'), notifyChatId: vVal('v-shop-notify'), reservationMinutes: vNum('v-reservation'), requireAddress: vOn('v-shop-address'), protectContent: vOn('v-shop-protect'), deliverySlots: vLines(vVal('v-delivery-slots')) } });
ACTIONS.vSaveRelaySettings = () => vSaveSettings({ relay: { enabled: vOn('v-relay-on'), approval: vOn('v-relay-approval'), echoToUser: vOn('v-relay-echo'), destinations: vLines(vVal('v-relay-dest')).map(line => { const [title, chatId] = line.split('|').map(s => s.trim()); return { title: chatId ? title : '', chatId: chatId || title }; }) } });
const NEWS_CATS = [['all', L('همه دسته‌ها (ترکیبی)', 'All categories (mixed)')], ['world', L('اخبار کل جهان', 'World news')], ['breaking', L('خبر فوری', 'Breaking')], ['politics', L('سیاسی', 'Politics')], ['economy', L('اقتصادی', 'Economy')], ['sports', L('ورزشی', 'Sports')], ['tech', L('فناوری', 'Tech')]];
const vNewsConfig = () => ({ enabled: vOn('v-news-on'), category: vVal('v-news-cat') || 'all', intervalMinutes: vNum('v-news-int') || 60, time: vVal('v-news-time') || '', destinations: vLines(vVal('v-news-dest')).map(line => { const [title, chatId] = line.split('|').map(s => s.trim()); return { title: chatId ? title : '', chatId: chatId || title }; }) });
function vNewsSettingsSection(s) {
  const n = s.news?.autoSend || { enabled: false, category: 'all', intervalMinutes: 60, time: '', destinations: [] };
  return vSection(L('بخش خبر · ارسال دسته‌بندی‌شده و زمان‌بندی', 'News · categorized & scheduled publishing'),
    vNote(L('اخبار ایران و خبرهای کل جهان (با ترجمه فارسی) جداگانه از منابع عمومی جمع‌آوری و دسته‌بندی می‌شوند. می‌توانید هر دسته را همین حالا به کانال/گروه بفرستید یا ارسال خودکار را با فاصله تکراری یا با ساعت مشخص هر روز زمان‌بندی کنید. همین کارها از تلگرام هم با /admin برای ادمین امکان‌پذیر است.', 'Iran news and world news (translated to Persian) are collected separately from public sources. Send any category to a channel/group now, or schedule automatic delivery by a repeating interval or a fixed daily time. The admin can do the same from Telegram via /admin.'))
    + vCheck('v-news-on', L('ارسال خودکار زمان‌بندی‌شده فعال باشد', 'Enable scheduled automatic sending'), n.enabled)
    + `<div class="grid sm:grid-cols-3 gap-4">${vSelect('v-news-cat', L('دسته ارسال خودکار', 'Auto-send category'), NEWS_CATS, n.category)}${vField('v-news-time', L('ساعت روزانه (تهران)؛ خالی = حالت فاصله', 'Daily time (Tehran); empty = interval mode'), n.time || '', 'type="time"')}${vField('v-news-int', L('فاصله ارسال (۱۰ تا ۱۴۴۰ دقیقه)', 'Interval (10–1440 minutes)'), n.intervalMinutes, 'type="number" min="10" max="1440"')}</div>`
    + vArea('v-news-dest', L('مقصدها؛ هر خط: عنوان | آیدی کانال یا گروه', 'Destinations; one per line: Title | Channel/Group ID'), (n.destinations || []).map(d => `${d.title || 'مقصد'} | ${d.chatId}`).join('\n'), 3, 'dir="ltr" placeholder="کانال خبر | @newschannel"')
    + `<div class="v-divider"></div><h4 class="text-sm font-bold mb-3">${L('ارسال فوری به کانال یا گروه', 'Send now to a channel/group')}</h4><div class="grid sm:grid-cols-2 gap-4">${vSelect('v-news-send-cat', L('دسته این ارسال', 'Category to send'), NEWS_CATS, n.category)}</div><div class="v-actions !justify-start mt-3">${vButton(vIcon('radio-tower') + L('ارسال فوری خبر', 'Send news now'), 'vNewsSendNow', '', true)}${vButton(L('پیش‌نمایش آخرین اخبار', 'Preview latest news'), 'vNewsPreview')}</div><div id="v-news-preview" class="mt-3"></div>`,
    vButton(t('save'), 'vSaveNewsSettings', '', true), { icon: 'newspaper' });
}
ACTIONS.vSaveNewsSettings = () => vSaveSettings({ news: { autoSend: vNewsConfig() } });
ACTIONS.vNewsSendNow = async () => {
  const d = await api('/news/send', { method: 'POST', body: { category: vVal('v-news-send-cat') || 'all' } });
  toast(d.sent ? L('به N مقصد ارسال شد', 'Sent to N destination(s)').replace('N', fmtNum(d.sent)) + (d.failed ? ` · ${fmtNum(d.failed)} ${L('ناموفق', 'failed')}` : '') : L('ارسالی انجام نشد؛ مقصدها را بررسی کنید.', 'Nothing was delivered; check the destinations.'), d.sent ? 'success' : 'error');
};
ACTIONS.vNewsPreview = async () => {
  const host = $('v-news-preview');
  if (host) host.innerHTML = `<div class="v-meta">${t('loading')}</div>`;
  try {
    const d = await api('/news/latest?category=' + encodeURIComponent(vVal('v-news-send-cat') || 'all'));
    if (host) host.innerHTML = d.items.length ? d.items.map(i => `<div class="v-row !py-2"><div class="v-row-main"><p class="text-xs font-semibold">${esc(i.title)}</p><p class="v-meta">${esc(i.source || '')} · ${esc(newsCatKey(i))}</p></div><a href="${esc(i.url)}" target="_blank" rel="noopener" class="v-badge">↗</a></div>`).join('') : vEmpty(L('خبری یافت نشد.', 'No news found.'));
  } catch (e) { if (host) host.innerHTML = vNote(esc(vError(e.message)), true); }
};
const newsCatKey = item => item.category && item.category !== 'breaking' ? ({ world: L('اخبار کل جهان', 'World'), politics: 'سیاسی', economy: 'اقتصادی', sports: 'ورزشی', tech: 'فناوری' })[item.category] || item.category : L('خبر فوری', 'Breaking');

const RATES_CATS = [['all', L('همه (طلا، ارز، کریپتو)', 'All (gold, FX, crypto)')], ['gold', L('طلا و انواع سکه', 'Gold & coins')], ['fiat', L('ارزهای بازار آزاد', 'Fiat currencies')], ['crypto', L('رمزارزها و تتر', 'Crypto & Tether')]];
const vRatesConfig = () => ({ enabled: vOn('v-rates-on'), category: vVal('v-rates-cat') || 'all', time: vVal('v-rates-time') || '09:00', destinations: vLines(vVal('v-rates-dest')).map(line => { const [title, chatId] = line.split('|').map(x => x.trim()); return { title: chatId ? title : '', chatId: chatId || title }; }) });
function vRatesSettingsSection(s) {
  const r = s.rates?.autoSend || { enabled: false, category: 'all', time: '09:00', destinations: [] };
  return vSection(L('بخش قیمت · دلار، طلا و تتر با زمان‌بندی', 'Rates · USD, gold & Tether with scheduling'),
    vNote(L('قیمت لحظه‌ای طلا، سکه، ارزها و رمزارزها را می‌توانید همین حالا به کانال/گروه بفرستید یا یک ساعت روزانه (تهران) انتخاب کنید تا جدول هر روز در آن ساعت ارسال شود؛ نوع ارز (طلا / ارز / کریپتو / همه) هم قابل انتخاب است. همین کارها از تلگرام با /admin هم امکان‌پذیر است.', 'Send the live gold, currency and crypto table to a channel/group now, or pick a daily Tehran time to publish it automatically — choose which asset family (gold / FX / crypto / all) to include. The admin can do the same from Telegram via /admin.'))
    + vCheck('v-rates-on', L('ارسال خودکار روزانه فعال باشد', 'Enable daily automatic sending'), r.enabled)
    + `<div class="grid sm:grid-cols-2 gap-4">${vSelect('v-rates-cat', L('نوع ارز برای ارسال', 'Asset type to publish'), RATES_CATS, r.category)}${vField('v-rates-time', L('ساعت روزانه ارسال (تهران)', 'Daily delivery time (Tehran)'), r.time || '09:00', 'type="time"')}</div>`
    + vArea('v-rates-dest', L('مقصدها؛ هر خط: عنوان | آیدی کانال یا گروه', 'Destinations; one per line: Title | Channel/Group ID'), (r.destinations || []).map(d => `${d.title || 'مقصد'} | ${d.chatId}`).join('\n'), 3, 'dir="ltr" placeholder="کانال قیمت | @rateschannel"')
    + `<div class="v-divider"></div><h4 class="text-sm font-bold mb-3">${L('ارسال فوری به کانال یا گروه', 'Send now to a channel/group')}</h4><div class="grid sm:grid-cols-2 gap-4">${vSelect('v-rates-send-cat', L('نوع ارز این ارسال', 'Asset type to send'), RATES_CATS, r.category)}</div><div class="v-actions !justify-start mt-3">${vButton(vIcon('radio-tower') + L('ارسال فوری قیمت', 'Send rates now'), 'vRatesSendNow', '', true)}${vButton(L('پیش‌نمایش جدول قیمت', 'Preview rate table'), 'vRatesPreview')}</div><div id="v-rates-preview" class="mt-3"></div><div class="v-divider"></div><h4 class="text-sm font-bold mb-3 flex items-center gap-2">${vIcon('line-chart')}${L('جدول زنده بازار ایران', 'Live Iran-market table')}</h4><div class="v-actions !justify-start mb-3">${vButton(L('بروزرسانی جدول', 'Refresh table'), 'vRatesLive')}${vButton(vIcon('plug-zap') + L('بررسی منابع نرخ', 'Check rate sources'), 'vRatesSources')}</div><div id="v-rates-live"></div><div id="v-rates-sources" class="mt-3"></div>`,
    vButton(t('save'), 'vSaveRatesSettings', '', true), { icon: 'line-chart' });
}
ACTIONS.vSaveRatesSettings = () => vSaveSettings({ rates: { autoSend: vRatesConfig() } });
ACTIONS.vRatesSendNow = async () => {
  const d = await api('/rates/send', { method: 'POST', body: { category: vVal('v-rates-send-cat') || 'all' } });
  toast(d.sent ? L('به N مقصد ارسال شد', 'Sent to N destination(s)').replace('N', fmtNum(d.sent)) + (d.failed ? ` · ${fmtNum(d.failed)} ${L('ناموفق', 'failed')}` : '') : L('ارسالی انجام نشد؛ مقصدها را بررسی کنید.', 'Nothing was delivered; check the destinations.'), d.sent ? 'success' : 'error');
};
const vRatesTrend = (ch) => {
  const v = Number(ch) || 0;
  const cls = v > 0 ? 'text-emerald-500' : v < 0 ? 'text-rose-500' : 'text-slate-400';
  const ic = v > 0 ? 'trending-up' : v < 0 ? 'trending-down' : 'minus';
  return `<span class="${cls} inline-flex items-center gap-1">${vIcon(ic)}${v > 0 ? '+' : ''}${fmtNum(v)}%</span>`;
};
const vRatesSourceName = (name, labels) => {
  const label = labels?.[name];
  return label ? (S.lang === 'en' ? label.en : label.fa) : name;
};
// Which feeds answered, which ones failed and why — the panel used to only say
// «اتصال ناموفق», which hid the fact that the Iranian hosts are blocked while
// the global feeds are still keeping the table fresh.
function vRatesSourcesHtml(d) {
  const list = d?.sources || d?.diagnostics || [];
  if (!list.length) return '';
  return `<details class="v-media-details"><summary>${vIcon('plug-zap')}${L('وضعیت منابع نرخ', 'Rate source status')}</summary><div class="pt-3">` +
    list.map(s => `<div class="v-row !py-1.5"><div class="v-row-main"><p class="text-xs font-semibold">${esc(vRatesSourceName(s.name, d.labels))}${s.kind === 'reference' ? ` · ${L('مرجع محاسبه', 'calculation reference')}` : ''}${s.via ? ` · ${L('از طریق رله', 'via relay')} ${esc(s.via)}` : ''}</p>${s.error ? `<p class="v-meta" dir="ltr">${esc(s.error)}</p>` : ''}</div>` +
      `<div class="text-end shrink-0"><span class="v-badge ${s.ok ? 'good' : 'warn'}">${s.ok ? '✓' + (s.hits ? ' ' + fmtNum(s.hits) : '') : '✗'}</span><p class="v-meta">${fmtNum(s.ms || 0)} ms</p></div></div>`).join('') +
    `</div></details>`;
}
function vRatesLiveHtml(d) {
  const unit = L('تومان', 'toman');
  const nm = (item) => esc(S.lang === 'en' ? item.en : item.fa);
  const row = (name, price, ch) =>
    `<div class="v-row !py-2"><div class="v-row-main"><p class="text-xs font-semibold">${name}</p></div>` +
    `<div class="text-end shrink-0"><p class="text-xs font-bold tabular">${price}</p><p class="mt-0.5">${vRatesTrend(ch)}</p></div></div>`;
  const block = (icon, title, html) =>
    `<h5 class="text-xs font-bold mt-4 mb-1 flex items-center gap-1.5">${vIcon(icon)}${title}</h5>${html}`;
  const g = d.gold || {}, f = d.fiat || {}, c = d.crypto || {};
  const goldOrder = ['gold18', 'gold24', 'mesghal', 'emami', 'bahar', 'nim', 'rob', 'gerami', 'ounce'];
  const fiatOrder = ['usd', 'eur', 'aed', 'gbp', 'try', 'iqd', 'cny', 'cad'];
  const cryptoOrder = ['usdt', 'btc', 'eth', 'ton', 'trx', 'sol', 'not'];
  const failed = (d.diagnostics || []).filter(s => !s.ok);
  return `<div class="flex flex-wrap items-center gap-2 mb-2">` +
    `<span class="v-badge ${d.stale ? 'warn' : 'good'}">${d.stale ? L('آخرین نرخ ذخیره‌شده (اتصال ناموفق)', 'Last saved rates (market unreachable)') : L('نرخ زنده بازار ایران', 'Live Iran market rates')}</span>` +
    (d.source && d.source !== 'fallback' ? `<span class="v-meta" dir="ltr">${esc(d.source)}</span>` : '') +
    `<span class="v-meta">${fmtDate(d.updatedAt)}</span></div>` +
    (d.stale && failed.length ? `<div class="mb-2">${failed.slice(0, 3).map(s => `<span class="v-badge warn" dir="ltr">${esc(s.name)}: ${esc(s.error || 'failed')}</span>`).join(' ')}</div>` : '') +
    (d.derived ? vNote(L(`${fmtNum(d.derived)} ردیف از نرخ‌های زندهٔ جهانی (انس طلا و دلار) محاسبه شده است؛ با سبز شدن منابع بازار ایران، نرخ دقیق همین ردیف‌ها جایگزین می‌شود.`, `${fmtNum(d.derived)} row(s) are calculated from the live global gold and dollar quotes; exact market quotes replace them as soon as the Iranian feeds answer.`)) : '') +
    block('coins', L('طلا و سکه', 'Gold & coins'), goldOrder.filter((k) => g[k]).map((k) =>
      row(nm(g[k]), g[k].isUsd ? '$' + fmtNum(g[k].price) : fmtNum(g[k].price) + ' ' + unit, g[k].change)).join('')) +
    block('banknote', L('ارزهای بازار آزاد', 'Fiat currencies'), fiatOrder.filter((k) => f[k]).map((k) =>
      row(nm(f[k]), fmtNum(f[k].price) + ' ' + unit, f[k].change)).join('')) +
    block('bitcoin', L('رمزارزها و تتر', 'Crypto & Tether'), cryptoOrder.filter((k) => c[k]).map((k) =>
      row(nm(c[k]), fmtNum(c[k].priceToman) + ' ' + unit + (c[k].priceUsd ? ' · $' + fmtNum(c[k].priceUsd) : ''), c[k].change)).join('')) +
    `<div class="mt-3">${vRatesSourcesHtml(d)}</div>`;
}
ACTIONS.vRatesLive = async () => {
  const host = $('v-rates-live');
  if (!host || host.dataset.loading) return;
  host.dataset.loading = '1';
  host.innerHTML = `<div class="v-meta">${t('loading')}</div>`;
  try {
    const d = await api('/rates/live');
    if (host.isConnected) { host.innerHTML = vRatesLiveHtml(d); host.dataset.loaded = '1'; }
  } catch (e) { if (host.isConnected) host.innerHTML = vNote(esc(vError(e.message)), true); }
  finally { delete host.dataset.loading; }
  refreshIcons();
};
// Forces a fresh pull from every source and lists what each one answered, so a
// failing feed can be named instead of guessed at.
ACTIONS.vRatesSources = async () => {
  const host = $('v-rates-sources');
  if (!host || host.dataset.loading) return;
  host.dataset.loading = '1';
  host.innerHTML = `<div class="v-meta">${t('loading')}</div>`;
  try {
    const d = await api('/rates/sources');
    if (host.isConnected) {
      host.innerHTML = `<div class="flex flex-wrap items-center gap-2 mb-2"><span class="v-badge ${d.stale ? 'warn' : 'good'}">${d.stale ? L('همه منابع قطع بودند', 'Every source was unreachable') : L('بررسی منابع انجام شد', 'Source check finished')}</span>` +
        (d.derived ? `<span class="v-badge">${L('محاسبه‌شده', 'calculated')}: ${fmtNum(d.derived)}</span>` : '') +
        `<span class="v-meta" dir="ltr">${esc(d.source || '')}</span></div>` + (vRatesSourcesHtml(d) || vNote(L('منبعی پاسخ نداد.', 'No source answered.'), true));
    }
  } catch (e) { if (host.isConnected) host.innerHTML = vNote(esc(vError(e.message)), true); }
  finally { delete host.dataset.loading; }
  refreshIcons();
};
ACTIONS.vRatesPreview = async () => {
  const host = $('v-rates-preview');
  if (host) host.innerHTML = `<div class="v-meta">${t('loading')}</div>`;
  try {
    const d = await api('/rates/preview?category=' + encodeURIComponent(vVal('v-rates-send-cat') || 'all'));
    if (host) host.innerHTML = `<pre class="v-meta whitespace-pre-wrap leading-6">${esc(d.text)}</pre>`;
  } catch (e) { if (host) host.innerHTML = vNote(esc(vError(e.message)), true); }
};
ACTIONS.vSaveLoyalty = () => vSaveSettings({ loyalty: { enabled: vOn('v-loyalty-on'), referralPoints: vNum('v-ref-points'), signupPoints: vNum('v-signup-points'), purchaseUnit: vNum('v-purchase-unit'), pointValue: vNum('v-point-value'), maxDiscountPercent: vNum('v-point-cap') } });
ACTIONS.vSaveMotion = () => { localStorage.setItem('bp_motion', vVal('v-motion')); document.documentElement.dataset.motion = vVal('v-motion'); toast(t('saved'),'success'); };
document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('page-hidden', document.hidden));

ACC_DEF.bc = ACC_DEF.bc || [];
const vOriginalBroadcast = renderBroadcast;
renderBroadcast = function () {
  vOriginalBroadcast();
  const host = document.querySelector('[data-acc="bc:photo"] .bp-sec-inner > div');
  host.innerHTML = `${vMediaQuickActions()}${uploadField('ph-media',L('یا فایل را اینجا رها کنید','Or drop your file here'))}
    <div class="mt-4">${vArea('ph-cap',L('متن همراه عکس یا فایل؛ اختیاری','Photo or file caption; optional'),'',3,'maxlength="1024"')}</div>
    <details id="v-media-options" class="v-media-details mt-4"><summary>${vIcon('sliders-horizontal')}${L('تنظیمات بیشتر؛ نوع رسانه، پردازش و دکمه‌ها','More options; media type, processing & buttons')}</summary><div class="space-y-4 pt-4">
      <div class="grid sm:grid-cols-2 gap-4">${vSelect('ph-kind',L('ارسال به شکل','Send as'),[['auto',L('تشخیص خودکار','Automatic')],['photo',L('عکس','Photo')],['document',L('فایل اصلی (هر فرمت)','Original file (any format)')],['video',L('ویدیو MP4','MP4 video')],['animation',L('گیف / انیمیشن','GIF / animation')],['audio',L('صوت MP3 / M4A','MP3 / M4A audio')]],'auto')}${vSelect('ph-operation',L('پردازش رسانه','Media processing'),[['none',L('بدون پردازش خارجی','No external processing')],['compress',L('فشرده‌سازی · سرویس خارجی','Compress · external processor')],['video_to_gif',L('ویدیو به گیف · سرویس خارجی','Video to GIF · external processor')],['watermark',L('واترمارک ویدیو · سرویس خارجی','Video watermark · external processor')]],'none')}</div>
      ${vCheck('ph-react',t('withReactions'),true)}${vCheck('ph-feedback',L('دکمه ثبت نظر متنی (یوزرنیم ربات لازم است)','Text feedback button (requires bot username)'),false)}
      ${vArea('ph-buttons',L('دکمه‌های شیشه‌ای؛ هر خط عنوان | لینک مقصد دکمه (نه لینک فایل)','Inline buttons; one Title | Button destination URL per line (not a file URL)'),'',2)}
    </div></details>
    <div class="mt-4">${vNote(V2.settings?.uploads?.chatId ? L('فایل مستقیماً از دستگاه آپلود می‌شود؛ لینک عمومی لازم نیست. تا پایان آپلود صبر کنید و سپس ارسال را بزنید.','Files upload directly from your device; no public URL is needed. Wait for completion, then send.') : L('تنظیم اولیه: در تنظیمات ← فایل و رسانه، چت ذخیره‌سازی تلگرام را مشخص کنید. پس از آن فقط فایل را انتخاب کنید؛ نیازی به ساخت لینک نیست.','First configure a Telegram storage chat in Settings → Media. After that, simply choose a file; no file-hosting link is needed.'), !V2.settings?.uploads?.chatId)}</div>
    ${bcSendBtn('photo')}${bcMiniHist('photo')}`;
  const photoSection = document.querySelector('[data-acc="bc:photo"]');
  document.querySelector('[data-acc="bc:target"]').after(photoSection);
  photoSection.querySelector('[data-act="accToggle"] .font-bold').textContent = L('عکس و فایل · آپلود مستقیم','Photos & files · direct upload');
  const pollHost = document.querySelector('[data-acc="bc:poll"] .bp-sec-inner > div');
  pollHost.insertAdjacentHTML('beforeend', `<div class="v-divider"></div><div class="grid sm:grid-cols-2 gap-4">${vSelect('poll-mode',L('نوع نظرسنجی','Poll mode'),[['single',L('تک‌گزینه‌ای','Single choice')],['multiple',L('چندگزینه‌ای','Multiple choice')],['quiz',L('مسابقه / کوییز','Quiz')]],'single')}${vField('poll-end',L('پایان رأی‌گیری؛ اختیاری','Voting deadline; optional'),'','type="datetime-local"')}${vField('poll-correct',L('شماره پاسخ صحیح (فقط کوییز)','Correct answer number (quiz only)'),1,'type="number" min="1" max="10"')}${vField('poll-reward',L('امتیاز پاسخ صحیح','Points for a correct answer'),1,'type="number" min="0" max="1000"')}</div>${vCheck('poll-members',L('فقط اعضای کانال/گروه مقصد بتوانند رأی بدهند','Only members of the target channel/group may vote'),true)}<p class="v-meta">${L('برای مقصد خصوصی، لینک دعوت آن را در قفل‌های عضویت تنظیم کنید. پاسخ کوییز یک‌بار ثبت می‌شود و قابل تغییر نیست.', 'For private targets, configure an invite link in membership settings. Quiz answers are final and cannot be changed.')}</p>`);
  if (vHas('channel')) $('view').insertAdjacentHTML('afterbegin', `<div class="mb-4">${accCard('bc','schedule','calendar-clock',L('زمان‌بندی، تکرار و حذف خودکار','Schedule, repeat & auto-delete'),`<div class="grid sm:grid-cols-3 gap-4">${vField('bc-schedule',L('زمان ارسال (خالی = همین حالا)','Send time (empty = now)'),'','type="datetime-local"')}${vField('bc-delete-hours',L('حذف پس از چند ساعت؟ (۰ = نکن)','Delete after hours (0 = never)'),0,'type="number" min="0" max="47" step="0.25"')}${vField('bc-repeat-min',L('تکرار هر چند دقیقه؟ (۰ = نکن)','Repeat every minutes (0 = never)'),0,'type="number" min="0" max="525600"')}</div><div class="mt-4">${vNote(L('زمان بر اساس منطقه زمانی دستگاه شماست: ','Time uses your device timezone: ') + esc(Intl.DateTimeFormat().resolvedOptions().timeZone) + '<br>' + L('اجرای زمان‌بندی در سرور، با دقت تقریبی یک دقیقه است و به بازبودن پنل وابسته نیست. حداقل تکرار ۵ دقیقه، حداکثر حذف ۴۷ ساعت (محدودیت تلگرام).', 'Runs on the server, approximately once per minute, even with the panel closed. Minimum repeat: 5 minutes. Maximum auto-delete: 47 hours (Telegram limit).'))}</div>`)}</div>`);
  if ($('bc-chat')) { $('bc-chat').removeAttribute('inputmode'); $('bc-chat').placeholder = '@channel, -1001234567890'; }
  const target = document.querySelector('[data-acc="bc:target"] .bp-sec-inner > div');
  if (vHas('shop')) {
    target.insertAdjacentHTML('beforeend', `<div class="mt-4">${vCheck('bc-segment',L('ارسال فقط به خریداران یک محصول (جایگزین مخاطب بالا)','Send only to buyers of a product (overrides audience above)'),false)}<div id="bc-segment-product"></div></div>`);
    api('/studio/products?limit=200').then(d => { if ($('bc-segment-product')) { $('bc-segment-product').innerHTML = vSelect('bc-product',L('محصول خریداری‌شده','Purchased product'),[['',L('انتخاب محصول','Choose product')],...d.rows.map(p=>[p.id,p.title])],''); paintDropdowns(); } }).catch(()=>{});
  }
  refreshIcons(); paintDropdowns();
};
const vParseButtons = text => vLines(text).map(line => { const [label, ...url] = line.split('|'); return [{ text: label.trim(), url: url.join('|').trim() }]; }).filter(row=>row[0].text && row[0].url);
bcSend = async function (d) {
  if (V2.uploads) return toast(L('تا پایان آپلود صبر کنید.','Wait for upload completion.'),'info');
  let kind = d.kind || 'text'; const originalKind = kind;
  const body = { kind, target: vOn('bc-segment') ? 'purchased' : BC.target };
  if (body.target === 'users') body.userIds = vVal('bc-users');
  if (body.target === 'chat') body.chatIds = vList(vVal('bc-chat'));
  if (body.target === 'purchased') body.productId = vVal('bc-product');
  if (kind === 'text') { body.text = vVal('bc-text'); body.parseMode = vVal('bc-parse') || null; body.buttons = BC.rows.map(r=>r.filter(b=>b.text.trim() && b.url.trim())).filter(r=>r.length); if (!body.text) return toast(t('invalidForm'),'error'); }
  else if (kind === 'poll') { syncPollOpts(); body.poll = { question: vVal('poll-q'), options: BC.pollOpts.map(v=>v.trim()).filter(Boolean), mode: vVal('poll-mode'), correctIndex: vNum('poll-correct') - 1, rewardPoints: vNum('poll-reward'), closesAt: vVal('poll-end') ? new Date(vVal('poll-end')).getTime() : 0, membersOnly: vOn('poll-members') }; if (!body.poll.question || body.poll.options.length < 2) return toast(t('invalidForm'),'error'); }
  else { body.mediaId = vVal('ph-media'); body.kind = vVal('ph-media-kind') || (V2.cache.media || []).find(m=>m.id===body.mediaId)?.kind || 'photo'; body.caption = vVal('ph-cap'); body.reactions = vOn('ph-react'); body.feedback = vOn('ph-feedback'); body.buttons = vParseButtons(vVal('ph-buttons')); if (!body.mediaId) return toast(vError('media_required'),'error'); }
  body.scheduledAt = vVal('bc-schedule') ? new Date(vVal('bc-schedule')).getTime() : 0; body.deleteAfterSec = Math.round(vNum('bc-delete-hours') * 3600); body.repeatEverySec = Math.round(vNum('bc-repeat-min') * 60);
  const btn = document.querySelector(`[data-act="bcSend"][data-kind="${originalKind}"]`); btn.disabled = true; btn.innerHTML = vIcon('loader-2') + t('sending'); refreshIcons();
  try {
    const data = await api('/broadcast', { method: 'POST', body });
    if (data.job) { BC.jobId = data.job.id; bcPaint(data.job); }
    if (data.mode === 'direct') toast(data.failed ? t('directPart') + ` (${data.sent}/${data.sent + data.failed})` : t('directSent'), data.failed ? 'info' : 'success');
    else toast(body.scheduledAt ? L('زمان‌بندی در سرور ثبت شد.','Schedule saved on the server.') : L('ارسال در صف سرور قرار گرفت.','Broadcast queued on the server.'),'success');
    if (data.job?.status === 'running') { BC.running = true; bcLoop(data.job.id); }
    loadHistory(); if (BC.engLoaded) loadEngagement();
  } catch(e) { toast(vError(e.message),'error'); }
  finally { btn.disabled = false; btn.innerHTML = vIcon('rocket') + t('startBroadcast'); refreshIcons(); }
};
const vOldChip = bcChip;
bcChip = status => ['scheduled','needs_review'].includes(status) ? `<span class="v-badge ${status === 'needs_review' ? 'warn' : ''}">${t(status)}</span>` : vOldChip(status);
loadHistory = async function () {
  try {
    const d = await api('/broadcast'); V2.cache.jobs = d.jobs || [];
    const markup = jobs => jobs.length ? jobs.map(j=>`<div class="py-3 border-b border-slate-500/10">${bcHistRow(j)}${j.nextRunAt && j.status === 'scheduled' ? `<p class="v-meta">${L('اجرای بعدی','Next run')}: ${fmtDate(j.nextRunAt)}</p>` : ''}<div class="v-actions mt-2">${['running','scheduled'].includes(j.status) ? vButton(t('pause'),'vJobAction',`data-id="${j.id}" data-action="pause"`) : ''}${j.status === 'paused' ? vButton(t('resume'),'vJobAction',`data-id="${j.id}" data-action="resume"`) : ''}${j.status === 'needs_review' ? vButton(L('بررسی و عبور از مقصد نامشخص','Review & skip uncertain recipient'),'vJobAction',`data-id="${j.id}" data-action="skip"`) : ''}${['paused','running','scheduled','needs_review'].includes(j.status) ? vButton(t('stop'),'vJobAction',`data-id="${j.id}" data-action="stop"`) : ''}${j.errors?.length ? `<span class="text-[10px] text-rose-400 max-w-full break-words">${esc(vError(j.errors.at(-1).d || ''))}</span>` : ''}</div></div>`).join('') : vEmpty(t('noHistory'));
    if ($('bc-hist')) $('bc-hist').innerHTML = markup(V2.cache.jobs.slice(0,20));
    for (const kind of ['text','poll','photo']) if ($('bc-hist-' + kind)) $('bc-hist-' + kind).innerHTML = markup(V2.cache.jobs.filter(j=> kind === 'photo' ? !['text','poll'].includes(j.kind) : j.kind === kind).slice(0,5));
    if ($('v-schedule-list')) $('v-schedule-list').innerHTML = markup(V2.cache.jobs.filter(j=>j.scheduledAt || j.repeatEverySec || j.deleteAfterSec).slice(0,30));
    refreshIcons();
  } catch(e) { if ($('bc-hist')) $('bc-hist').textContent = vError(e.message); }
};
ACTIONS.vJobAction = async d => {
  if (d.action === 'skip' && !await confirmDlg(L('ابتدا مقصد را بررسی کنید. نتیجه این ارسال به‌علت قطع ارتباط نامشخص است؛ با ادامه، این مقصد دوباره ارسال نمی‌شود و صف جلو می‌رود.', 'Inspect the destination first. This delivery is uncertain. Continuing skips it without resending.'), L('عبور از این مقصد','Skip recipient'))) return;
  await api(`/broadcast/${d.id}/${d.action}`, { method: 'POST' }); await loadHistory();
};

const V_TABS = [ ['overview','layout-grid',null,['نمای کلی','Overview']], ['services','network','services',['سرویس / VPN','Services / VPN']], ['catalog','package','catalog',['محصولات','Catalog']], ['orders','shopping-bag','shop',['سفارش‌ها','Orders']], ['coupons','ticket-percent','shop',['تخفیف‌ها','Discounts']], ['channel','calendar-clock','channel',['انتشار خودکار','Publishing']], ['groups','shield-check','moderation',['گروه‌ها','Groups']], ['relay','copy','relay',['حذف فوروارد','Relay']], ['crm','trophy','crm',['باشگاه مشتریان','Loyalty']], ['faq','messages-square','faq',['پرسش و پاسخ','FAQ']], ['media','folder-open',null,['رسانه‌ها','Media']] ];
function renderStudio() {
  const tabs = V_TABS.filter(t=>!t[2] || vHas(t[2])); if (!tabs.some(t=>t[0] === V2.tab)) V2.tab = 'overview';
  const p = V2.settings?.purposes?.[V2.settings?.botPurpose];
  $('view').innerHTML = `<div class="v-hero"><div class="v-eyebrow">BOT STUDIO / WORKSPACE</div><div class="flex items-center justify-between flex-wrap gap-4"><div><h2 class="text-2xl font-extrabold">${L('از ایده تا ربات شما','Your idea. Your bot.')}</h2><p class="text-sm text-slate-400 mt-2 leading-7">${L('ابزارهای مرتبط، در یک فضای منظم و اختصاصی.','The right tools, in one focused workspace.')}</p></div><button data-act="nav" data-to="settings" class="v-badge !text-xs !p-3">${vIcon(p?.icon || 'sliders-horizontal')}<span class="ms-2">${esc(p ? (S.lang === 'en' ? p.en : p.fa) : L('سفارشی','Custom'))}</span></button></div></div><nav class="v-tabs" aria-label="${L('بخش‌های کارگاه','Studio sections')}">${tabs.map(t=>`<button class="v-tab ${V2.tab === t[0] ? 'active' : ''}" data-act="vTab" data-id="${t[0]}" aria-selected="${V2.tab === t[0]}">${vIcon(t[1])}${t[3][S.lang==='en'?1:0]}</button>`).join('')}</nav><div id="v-studio-body"><div class="v-skeleton"></div></div>`;
  refreshIcons(); loadStudio();
}
ACTIONS.vTab = d => { V2.tab = d.id; V2.offset = 0; renderStudio(); };
ACTIONS.vReload = () => loadStudio();
ACTIONS.vPage = d => { V2.offset = Number(d.offset) || 0; loadStudio(); };
function vPagination(data) { return `<div class="flex justify-between items-center mt-4"><span class="v-meta">${fmtNum(data.total || 0)} ${L('مورد','records')}</span><div class="flex gap-2">${V2.offset ? vButton('‹','vPage',`data-offset="${Math.max(0,V2.offset-50)}"`) : ''}${data.nextOffset !== null && data.nextOffset !== undefined ? vButton('›','vPage',`data-offset="${data.nextOffset}"`) : ''}</div></div>`; }
async function loadStudio() {
  const tab = V2.tab, host = $('v-studio-body'); if (!host) return;
  try {
    const html = await ({ overview: studioOverview, catalog: studioCatalog, orders: studioOrders, coupons: studioCoupons, channel: studioChannel, groups: studioGroups, relay: studioRelay, crm: studioCRM, faq: studioFAQ, media: studioMedia, services: studioServices })[tab]();
    if (S.route === 'studio' && V2.tab === tab && $('v-studio-body')) { $('v-studio-body').innerHTML = html; refreshIcons(); paintDropdowns(); if (tab === 'channel') loadHistory(); }
  } catch(e) { if (host.isConnected) host.innerHTML = vNote(esc(vError(e.message)),true) + '<div class="mt-4">' + vButton(t('refresh'),'vReload') + '</div>'; }
}
async function studioOverview() {
  const d = await api('/studio/summary'); V2.summary = d;
  const c = d.counts;
  const tiles = [ ['catalog','package',c.products,L('محصول و فایل','Products & files'),'catalog'], ['orders','shopping-bag',c.orders,L('سفارش ثبت‌شده','Orders'),'shop'], ['orders','scan-line',c.review,L('در انتظار بررسی پرداخت','Payments to review'),'shop'], ['groups','shield-check',c.groups,L('گروه فعال','Active groups'),'moderation'], ['channel','rss',c.feeds,L('منبع خودکار','Automatic sources'),'channel'], ['relay','copy',c.relay,L('پیام منتظر تأیید','Messages to approve'),'relay'] ].filter(t=>vHas(t[4]));
  return `<div class="v-grid v-stagger">${tiles.map(a=>`<button data-act="vTab" data-id="${a[0]}" class="${CLS.card} p-5 text-start"><span class="v-icon">${vIcon(a[1])}</span><div class="text-2xl font-extrabold mt-4">${fmtNum(a[2])}</div><p class="v-meta">${a[3]}</p></button>`).join('')}</div><div class="mt-5">${vSection(L('مسیر راه‌اندازی','Getting started'),`<div class="space-y-4">${[[1,L('نوع ربات را انتخاب کنید','Choose a bot type'),L('در تنظیمات، هدف ربات و قفل‌های عضویت را مشخص کنید.','Configure the bot type and membership gates in Settings.')],[2,L('اتصال و رسانه را آماده کنید','Connect Telegram and media'),L('توکن، وب‌هوک و چت آپلود را تنظیم کنید. سپس تست اتصال بگیرید.','Configure the token, webhook and upload chat, then test the connection.')],[3,L('محتوای واقعی خود را اضافه کنید','Add your own content'),L('محصول، فایل، منبع خبر یا قوانین گروه را از زبانه‌های بالا بسازید.','Create products, upload files, add feeds or configure group rules.')]].map(([n,title,desc])=>`<div class="flex gap-4"><span class="v-icon shrink-0 text-sm font-bold">${n}</span><div><h4 class="text-sm font-semibold">${title}</h4><p class="v-meta">${desc}</p></div></div>`).join('')}</div>`,vButton(t('settings'),'nav','data-to="settings"'))}</div><div class="mt-4">${vNote(L('از «ربات‌های من» می‌توانید ربات‌های مستقل با فضای داده جدا اضافه کنید. نوار بالای پنل ربات جاری را نشان می‌دهد. تغییر نوع به‌تنهایی ربات جدید BotFather نمی‌سازد.', 'Use My bots to add independent bots with isolated storage. The top bar identifies the bot being managed. Switching a type does not create a new BotFather bot.'))}</div>`;
}
async function studioCatalog() {
  const [p,c] = await Promise.all([api('/studio/products?offset='+V2.offset),api('/studio/categories')]); V2.cache.products = p.rows; V2.cache.categories = c.rows;
  const cats = c.rows.map(c=>`<div class="v-row !py-2"><div class="v-row-main text-xs">${esc(c.title)} ${c.hidden ? vIcon('eye-off') : ''}</div><div class="v-actions">${vButton(t('edit'),'vCategoryEdit',`data-id="${c.id}"`)}${vButton(t('delete'),'vDelete',`data-type="categories" data-id="${c.id}"`)}</div></div>`).join('');
  return `<div class="space-y-4">${vSection(L('دسته‌بندی‌ها · دکمه شیشه‌ای خودکار','Categories · automatic inline buttons'),cats || vEmpty(L('دسته اول را بسازید؛ دسته‌ها در ربات به دکمه شیشه‌ای تبدیل می‌شوند.','Create a category; categories become inline buttons in the bot.'),'folders'),vButton(L('دسته جدید','New category'),'vCategoryEdit','',true))}${vSection(L('محصولات و فایل‌های قابل دریافت','Products & downloadable files'),p.rows.length ? p.rows.map(item=>`<div class="v-row"><span class="v-icon shrink-0">${vIcon(item.deliveryMode==='physical'?'package':'file-box')}</span><div class="v-row-main"><p class="text-sm font-semibold">${esc(item.title)}</p><p class="v-meta">${vMoney(item.price)} · ${L('موجودی','Stock')}: ${item.stock<0?'∞':fmtNum(item.stock)} · ${item.hidden?L('مخفی','Hidden'):L('نمایان','Visible')}</p></div><div class="v-actions">${vButton(L('دیپ‌لینک','Deep link'),'vProductLink',`data-id="${item.id}"`)}${vButton(t('edit'),'vProductEdit',`data-id="${item.id}"`)}${vButton(t('delete'),'vDelete',`data-type="products" data-id="${item.id}"`)}</div></div>`).join('') + vPagination(p) : vEmpty(L('اولین محصول یا فایل را اضافه کنید. برای فایل رایگان، قیمت را صفر بگذارید.','Add your first product or file. Set price to zero for free downloads.'),'package-plus'),vButton(L('افزودن محصول','Add product'),'vProductEdit','',true))}</div>`;
}
ACTIONS.vCategoryEdit = d => { const c = (V2.cache.categories || []).find(c=>c.id===d.id) || {}; V2.editId = c.id || ''; vModal(L('دسته‌بندی','Category'), `<div class="grid sm:grid-cols-2 gap-4">${vField('v-cat-title',L('عنوان فارسی','Persian title'),c.title,'required maxlength="64"')}${vField('v-cat-en','English title',c.titleEn,'maxlength="64" dir="ltr"')}${vField('v-cat-sort',L('ترتیب نمایش','Sort order'),c.sort||0,'type="number" min="0" max="10000"')}</div>${vCheck('v-cat-hidden',L('مخفی کردن دسته و محصولاتش در ربات','Hide the category and its products in the bot'),c.hidden)}`,'vCategorySave'); };
ACTIONS.vCategorySave = async () => { await api('/studio/categories'+(V2.editId?'/'+V2.editId:''),{method:V2.editId?'PUT':'POST',body:{title:vVal('v-cat-title'),titleEn:vVal('v-cat-en'),sort:vNum('v-cat-sort'),hidden:vOn('v-cat-hidden')}}); closeModal(); toast(t('saved'),'success'); loadStudio(); };
ACTIONS.vProductEdit = async d => {
  const p = (V2.cache.products || []).find(p=>p.id===d.id) || { price:0,stock:-1,deliveryMode:'ready' }; V2.editId = p.id || '';
  const c = V2.cache.categories || (await api('/studio/categories')).rows;
  vModal(L('مدیریت محصول','Product editor'), `<div class="grid sm:grid-cols-2 gap-4">${vField('vp-title',L('عنوان محصول','Product title'),p.title,'required maxlength="120"')}${vField('vp-title-en','English title',p.titleEn,'dir="ltr" maxlength="120"')}${vField('vp-price',L('قیمت (تومان)؛ صفر = رایگان','Price (toman); zero = free'),p.price,'type="number" min="0" max="1000000000" step="1" required')}${vField('vp-stock',L('موجودی؛ ۱- = نامحدود','Stock; -1 = unlimited'),p.stock,'type="number" min="-1" max="1000000" step="1" required')}${vSelect('vp-category',L('دسته‌بندی','Category'),[['',L('بدون دسته','Uncategorized')],...c.map(c=>[c.id,c.title])],p.categoryId||'')}${vSelect('vp-mode',L('روش تحویل','Delivery method'),[['ready',L('آماده؛ تحویل خودکار متن/فایل','Ready; automatic text/file')],['manual',L('دستی؛ ارسال توسط مدیر','Manual; administrator delivery')],['physical',L('کالای فیزیکی؛ دریافت آدرس','Physical; collect address')]],p.deliveryMode)}</div>${vArea('vp-desc',L('توضیحات محصول','Product description'),p.description,3,'maxlength="3000"')}${vArea('vp-desc-en','English description',p.descriptionEn,2,'dir="ltr" maxlength="3000"')}${uploadField('vp-image',L('عکس محصول؛ اختیاری','Product photo; optional'),p.imageId,'photo')}<div class="v-divider"></div><h4 class="text-sm font-bold">${L('محتوای تحویل پس از خرید / دریافت رایگان','Content delivered after purchase / free download')}</h4>${vNote(L('این بخش در توضیحات عمومی محصول نمایش داده نمی‌شود. برای تحویل آماده، متن یا فایل لازم است. تغییر محتوا سفارش‌های قبلی را تغییر نمی‌دهد.', 'This content is never included in the public product description. Ready delivery needs text or a file. Editing it does not change existing orders.'))}${vArea('vp-delivery-text',L('متن، کد یا لینک محصول خریداری‌شده','Purchased content, code or download URL'),p.deliveryText,3,'maxlength="3500"')}${uploadField('vp-delivery-file',L('فایل آماده تحویل','Ready delivery file'),p.deliveryMediaId)}${vCheck('vp-hidden',L('مخفی کردن محصول (اطلاعات باقی می‌ماند)','Hide product (keep its data)'),p.hidden)}`,'vProductSave');
};
ACTIONS.vProductSave = async () => { const body = {title:vVal('vp-title'),titleEn:vVal('vp-title-en'),description:vVal('vp-desc'),descriptionEn:vVal('vp-desc-en'),price:vNum('vp-price'),stock:vNum('vp-stock'),categoryId:vVal('vp-category'),deliveryMode:vVal('vp-mode'),deliveryText:vVal('vp-delivery-text'),deliveryMediaId:vVal('vp-delivery-file'),imageId:vVal('vp-image'),hidden:vOn('vp-hidden')}; await api('/studio/products'+(V2.editId?'/'+V2.editId:''),{method:V2.editId?'PUT':'POST',body}); closeModal();toast(t('saved'),'success');loadStudio(); };
ACTIONS.vProductLink = d => {
  if (!V2.settings.botUsername) return toast(L('ابتدا در تنظیمات رسانه، «آزمایش اتصال» را بزنید تا یوزرنیم ربات ثبت شود.','Test the bot connection in Settings to register its username.'),'info');
  const url = `https://t.me/${V2.settings.botUsername}?start=p_${d.id}`;
  openModal(`<div class="p-6"><h3 class="font-bold mb-3">${L('دیپ‌لینک اختصاصی محصول','Product deep link')}</h3><p class="v-meta mb-4">${L('کاربر با این لینک مستقیماً همین محصول را می‌بیند؛ قفل‌های عضویت همچنان اعمال می‌شوند.','This link opens the product directly. Membership gates still apply.')}</p><input id="v-copy-value" class="${CLS.input}" dir="ltr" readonly value="${esc(url)}"><div class="flex gap-2 mt-4">${vButton(L('کپی لینک','Copy link'),'vCopyValue','',true)}${vButton(t('close'),'modalClose')}</div></div>`);
};
ACTIONS.vCopyValue = async () => { const value = $('v-copy-value'); try { await navigator.clipboard.writeText(value.value); toast(L('کپی شد','Copied'),'success'); } catch { value.focus(); value.select(); document.execCommand('copy'); } };
ACTIONS.vDelete = async d => { if (!await confirmDlg(L('این مورد حذف یا بایگانی شود؟ سوابق سفارش حفظ می‌شوند.','Delete or archive this item? Order history is preserved.'),t('delete'))) return; await api('/studio/'+d.type+'/'+encodeURIComponent(d.id),{method:'DELETE'});toast(t('saved'),'success');loadStudio(); };

const V_STATUS = { awaiting_payment:['در انتظار پرداخت','Awaiting payment'],receipt_review:['بررسی فیش','Receipt review'],paid:['پرداخت تأیید شده','Paid'],preparing:['آماده‌سازی','Preparing'],shipped:['ارسال شده','Shipped'],delivered:['تحویل داده‌شده','Delivered'],rejected:['رد شده','Rejected'],cancelled:['لغو شده','Cancelled'],expired:['منقضی','Expired'],payment_review:['بررسی پرداخت دیرهنگام','Late payment review'] };
const vStatus = s => V_STATUS[s]?.[S.lang==='en'?1:0] || s;
async function studioOrders() {
  const data = await api('/studio/orders?offset='+V2.offset+(V2.orderFilter?'&status='+V2.orderFilter:'')); V2.cache.orders = data.rows;
  return vSection(L('سفارش‌ها و تأیید فیش','Orders & receipt review'), `<div class="mb-4">${vSelect('v-order-filter',L('وضعیت سفارش','Order status'),[['',L('همه سفارش‌ها','All orders')],...Object.keys(V_STATUS).map(k=>[k,vStatus(k)])],V2.orderFilter||'')}</div>`+(data.rows.length ? data.rows.map(o=>`<div class="v-row"><span class="v-icon shrink-0">${vIcon(o.receipt?'scan-line':'shopping-bag')}</span><div class="v-row-main"><p class="text-sm font-semibold">${esc(o.buyer?.name || o.userName || o.userId)} <span class="v-badge ${['receipt_review','payment_review'].includes(o.status)?'warn':['paid','delivered'].includes(o.status)?'good':''}">${vStatus(o.status)}</span></p><p class="v-meta"><span class="v-code">#${o.id}</span> · ${vMoney(o.total)} · ${fmtDate(o.createdAt)}</p></div>${vButton(L('جزئیات / بررسی','Details / review'),'vOrderOpen',`data-id="${o.id}"`)}</div>`).join('') + vPagination(data) : vEmpty(L('سفارشی با این وضعیت وجود ندارد.','No orders in this status.'),'shopping-bag')),vButton(t('refresh'),'vReload'));
}
document.addEventListener('change',e=>{if(e.target.id==='v-order-filter'){V2.orderFilter=e.target.value;V2.offset=0;loadStudio();}});
ACTIONS.vOrderOpen = async d => {
  const { order:o } = await api('/studio/orders/'+d.id); V2.order = o;
  const paid = ['paid','preparing','shipped','delivered'].includes(o.status), review = ['receipt_review','payment_review'].includes(o.status);
  openModal(`<div class="p-5 md:p-6"><div class="flex justify-between gap-3 mb-5"><h3 class="font-bold">${L('جزئیات سفارش','Order details')}</h3><button data-act="modalClose" class="${CLS.iconBtn}">${vIcon('x')}</button></div><span class="v-badge ${review?'warn':''}">${vStatus(o.status)}</span><p class="v-code mt-3">#${o.id}</p><dl class="v-detail mt-4">${[[L('گیرنده','Recipient'),o.buyer?.name],[L('شماره تماس','Phone'),o.buyer?.phone],[L('آدرس','Address'),o.buyer?.address],[L('زمان تحویل','Delivery window'),o.buyer?.slot],[L('کاربر تلگرام','Telegram user'),o.userId],[L('مبلغ پرداختی','Total'),vMoney(o.total)],[L('روش پرداخت','Payment method'),o.paymentMethod],[L('کد تراکنش / رهگیری','Reference / tracking'),o.payment?.refId || o.trackingCode || '—']].map(([t,v])=>`<div><dt>${t}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl><div class="v-divider"></div><div>${o.items.map(i=>`<div class="v-row"><div class="v-row-main text-xs">${esc(i.title)} × ${i.qty}<p class="v-meta">${vMoney(i.price)} · ${esc(i.deliveryMode)} · ${esc(i.fulfillment)}${i.deliveryError?' · '+esc(vError(i.deliveryError)):''}</p></div></div>`).join('')}</div>${o.receipt?`<div class="mt-4">${vButton(L('مشاهده / دانلود فیش','View / download receipt'),'vReceipt',`data-id="${o.id}"`)}<div id="v-receipt-box" class="mt-3"></div></div>`:''}${o.deliveryLocked?'<div class="mt-3">'+vNote(L('پرداخت تأیید شده، اما تحویل تا عضویت خریدار در کانال‌ها/گروه‌های اجباری قفل است.','Payment is approved, but delivery is locked until the buyer passes membership gates.'),true)+'</div>':''}${o.lastNotification?.ok===false?'<div class="mt-3">'+vNote(L('اعلان تلگرام تحویل نشده؛ وضعیت سفارش ذخیره شده است.','Telegram notification failed; the order state is saved.'),true)+'</div>':''}<div class="v-divider"></div>${review?vNote(L('تأیید یعنی شما مبلغ و واریز واقعی را بررسی کرده‌اید. پس از تأیید، محصول آماده خودکار ارسال می‌شود؛ ظاهر فیش کافی نیست.','Approval means you verified the actual transfer and amount. Ready products are delivered automatically after approval. Receipt appearance is not proof.'),true):''}<div class="mt-4 space-y-3">${vField('v-order-note',L('دلیل رد / کد رهگیری ارسال','Rejection reason / shipment tracking'),o.trackingCode||'','maxlength="300"')}<div class="v-actions !justify-start">${review?vButton(L('تأیید پرداخت','Approve payment'),'vOrderAction','data-action="approve"',true):''}${['awaiting_payment','receipt_review'].includes(o.status)?vButton(L('رد سفارش / فیش','Reject order / receipt'),'vOrderAction','data-action="reject"'):''}${o.status==='paid'?vButton(L('آماده‌سازی','Prepare'),'vOrderAction','data-action="preparing"'):''}${['paid','preparing'].includes(o.status)?vButton(L('ارسال شد','Mark shipped'),'vOrderAction','data-action="shipped"'):''}${['paid','preparing','shipped'].includes(o.status)?vButton(L('تحویل شد','Mark delivered'),'vOrderAction','data-action="delivered"'):''}${vButton(L('ارسال دوباره اعلان وضعیت','Resend status notification'),'vOrderAction','data-action="notify"')}</div></div>${paid&&o.status!=='delivered'?`<div class="v-divider"></div><h4 class="text-sm font-bold mb-4">${L('تحویل دستی محصول','Manual delivery')}</h4><div class="space-y-4">${vArea('v-manual-text',L('متن یا محصول آماده‌شده برای این سفارش','Text or prepared content for this order'),'',3,'maxlength="3500"')}${uploadField('v-manual-file',L('فایل محصول؛ اختیاری','Product file; optional'))}${vButton(L('ارسال محصول و ثبت تحویل','Send product & mark delivered'),'vOrderAction','data-action="deliver"',true)}</div>`:''}<div class="v-divider"></div><h4 class="text-xs font-bold mb-3">${L('سوابق تغییر وضعیت','Status history')}</h4>${o.history.map(h=>`<p class="v-meta">${vStatus(h.status)} · ${fmtDate(h.at)}${h.reason?' · '+esc(h.reason):''}</p>`).join('')}</div>`);
};
ACTIONS.vReceipt = async d => { const box=$('v-receipt-box'); box.textContent=t('loading'); const blob=await vAuthorizedFile('/studio/orders/'+d.id+'/receipt'); if(!box.isConnected)return;const url=vBlobUrl(blob); if(blob.type.startsWith('image/')) box.innerHTML=`<img alt="${L('فیش واریز؛ نیازمند بررسی مدیر','Receipt; requires manual review')}" class="v-preview" src="${url}">`; else { const a=document.createElement('a');a.href=url;a.download=V2.order.receipt.name;a.textContent=L('دانلود فایل فیش','Download receipt');a.className=CLS.btnS;box.replaceChildren(a); } };
ACTIONS.vOrderAction = async d => {
  if(V2.uploads)return toast(L('آپلود هنوز تمام نشده است.','Upload still in progress.'),'info');
  const oid=V2.order.id, body={reason:vVal('v-order-note'),trackingCode:vVal('v-order-note'),text:vVal('v-manual-text'),mediaId:vVal('v-manual-file')};
  if (['approve','reject','deliver','delivered'].includes(d.action) && !await confirmDlg(L('این عملیات برای سفارش ثبت شود؟ تأیید پرداخت و تحویل را فقط بعد از بررسی انجام دهید.','Apply this order action? Approve payment or delivery only after verification.'),L('تأیید عملیات','Confirm action'))) return ACTIONS.vOrderOpen({id:oid});
  const data=await api('/studio/orders/'+oid+'/'+d.action,{method:'POST',body});toast(data.order.manualDelivery?.ok===false?L('تحویل ناموفق؛ جزئیات را بررسی کنید.','Delivery failed; inspect the details.'):t('saved'),data.order.manualDelivery?.ok===false?'error':'success');await ACTIONS.vOrderOpen({id:oid});loadStudio();
};
const vLocalTime = ts => ts ? new Date(ts - new Date(ts).getTimezoneOffset()*60000).toISOString().slice(0,16) : '';
async function studioCoupons() {
  const d=await api('/studio/coupons');V2.cache.coupons=d.rows;
  return vSection(L('کدهای تخفیف','Discount codes'),d.rows.length?d.rows.map(c=>`<div class="v-row"><div class="v-row-main"><p class="v-code font-bold">${esc(c.code)} <span class="v-badge ${c.hidden?'warn':''}">${c.type==='percent'?fmtNum(c.value)+'%':vMoney(c.value)}</span></p><p class="v-meta">${L('استفاده','Used')}: ${fmtNum(c.used)} · ${L('رزرو','Reserved')}: ${fmtNum(c.reserved)} / ${c.maxUses||'∞'} · ${c.expiresAt?fmtDate(c.expiresAt):L('بدون انقضا','No expiry')}${c.hidden?' · '+L('غیرفعال','Disabled'):''}</p></div><div class="v-actions">${vButton(t('edit'),'vCouponEdit',`data-id="${c.id}"`)}${vButton(L('غیرفعال','Disable'),'vDelete',`data-type="coupons" data-id="${c.id}"`)}</div></div>`).join(''):vEmpty(L('کد تخفیف درصدی یا مبلغی بسازید.','Create a percentage or fixed-amount discount code.'),'ticket-percent'),vButton(L('کد جدید','New code'),'vCouponEdit','',true));
}
ACTIONS.vCouponEdit=d=>{const c=(V2.cache.coupons||[]).find(c=>c.id===d.id)||{type:'percent',value:10,maxUses:0};V2.editId=c.id||'';vModal(L('کد تخفیف','Discount code'),`<div class="grid sm:grid-cols-2 gap-4">${vField('vc-code',L('کد لاتین','Code (Latin)'),c.code,'required dir="ltr" pattern="[A-Za-z0-9_-]{3,32}" maxlength="32"')}${vSelect('vc-type',L('نوع تخفیف','Discount type'),[['percent',L('درصدی','Percentage')],['amount',L('مبلغی (تومان)','Fixed amount (toman)')]],c.type)}${vField('vc-value',L('مقدار','Value'),c.value,'required type="number" min="1" max="1000000000"')}${vField('vc-uses',L('تعداد استفاده؛ ۰ = نامحدود','Usage limit; 0 = unlimited'),c.maxUses,'type="number" min="0" max="1000000"')}${vField('vc-start',L('شروع اعتبار؛ اختیاری','Starts at; optional'),vLocalTime(c.startsAt),'type="datetime-local"')}${vField('vc-end',L('پایان اعتبار؛ اختیاری','Expires at; optional'),vLocalTime(c.expiresAt),'type="datetime-local"')}</div>${vCheck('vc-hidden',L('غیرفعال','Disabled'),c.hidden)}`,'vCouponSave');};
ACTIONS.vCouponSave=async()=>{await api('/studio/coupons'+(V2.editId?'/'+V2.editId:''),{method:V2.editId?'PUT':'POST',body:{code:vVal('vc-code'),type:vVal('vc-type'),value:vNum('vc-value'),maxUses:vNum('vc-uses'),startsAt:vVal('vc-start')?new Date(vVal('vc-start')).getTime():0,expiresAt:vVal('vc-end')?new Date(vVal('vc-end')).getTime():0,hidden:vOn('vc-hidden')}});closeModal();toast(t('saved'),'success');loadStudio();};

async function studioChannel() {
  const d = await api('/studio/feeds'); V2.cache.feeds = d.rows;
  return `<div class="space-y-4">${vSection(L('زمان‌بندی و انتشار','Scheduling & publishing'),vNote(L('پست متنی، نظرسنجی، عکس یا فایل بسازید؛ چند مقصد، زمان انتشار، تکرار و حذف خودکار را در «ارسال همگانی» انتخاب کنید.','Compose text, polls, photos or files. Choose multiple targets, schedule, repeat and auto-delete in Broadcast.'))+'<div id="v-schedule-list" class="mt-3"></div>',vButton(L('پست جدید / زمان‌بندی','New post / schedule'),'vOpenSchedule','',true))}${vSection(L('منابع پست‌گذار خودکار','Auto-poster sources'),d.rows.length?d.rows.map(f=>`<div class="v-row"><span class="v-icon shrink-0">${vIcon(f.type==='youtube'?'youtube':f.type==='channel'?'radio':'rss')}</span><div class="v-row-main"><p class="text-sm font-bold">${esc(f.title)} <span class="v-badge ${f.enabled?'good':'warn'}">${f.enabled?L('فعال','Active'):L('غیرفعال','Disabled')}</span></p><p class="v-meta">${esc(f.type)} · ${f.type==='channel'?esc(f.sourceChatId):L('هر','Every')+' '+f.intervalMinutes+' '+L('دقیقه','min')} · ${L('آخرین بررسی','Last scan')}: ${fmtDate(f.lastAt)}</p>${f.lastError?`<p class="text-xs text-rose-400 mt-2">${esc(vError(f.lastError))}</p>`:''}</div><div class="v-actions">${vButton(t('edit'),'vFeedEdit',`data-id="${f.id}"`)}${f.type!=='channel'?vButton(L('بررسی در نوبت بعد','Scan next tick'),'vFeedScan',`data-id="${f.id}"`):''}${vButton(t('delete'),'vDelete',`data-type="feeds" data-id="${f.id}"`)}</div></div>`).join(''):vEmpty(L('یک فید RSS، کانال یوتیوب یا کانال تلگرام مجاز اضافه کنید.','Add an RSS feed, YouTube channel or authorized Telegram channel.'),'rss'),vButton(L('افزودن منبع','Add source'),'vFeedEdit','',true))}${vNote(L('اولین بررسی فید فقط خط مبنا می‌سازد؛ مطالب قدیمی یک‌باره ارسال نمی‌شوند. یوتیوب: عنوان و لینک ویدیو منتشر می‌شود، نه دانلود ویدیو. تلگرام: ربات فقط پست‌های کانال‌هایی را می‌گیرد که در آن حضور دارد و دسترسی لازم دارد؛ کانال دلخواه قابل خواندن نیست. فقط محتوای دارای مجوز بازنشر کنید.','The first feed scan establishes a baseline without flooding old posts. YouTube publishes video titles and links, not video downloads. Telegram can only deliver updates from channels where the bot has the necessary access. Only repost content you have permission to use.'))}${d.deletionErrors.length?vSection(L('حذف‌های خودکار ناموفق','Failed auto-deletions'),d.deletionErrors.map(e=>`<p class="v-meta">${esc(e.chatId)} / ${e.messageId} · ${esc(e.error)}</p>`).join('')):''}</div>`;
}
ACTIONS.vOpenSchedule = () => { BC.target='chat';accSet('bc','schedule',true);accSet('bc','target',true);go('broadcast'); };
ACTIONS.vFeedEdit=d=>{
  const f=(V2.cache.feeds||[]).find(f=>f.id===d.id)||{type:'rss',enabled:true,intervalMinutes:15,destinations:[]};V2.editId=f.id||'';
  vModal(L('منبع انتشار خودکار','Auto-poster source'),`${vField('vf-title',L('نام منبع','Source name'),f.title,'required maxlength="100"')}${vSelect('vf-type',L('نوع منبع','Source type'),[['rss','RSS / Atom'],['youtube','YouTube'],['channel',L('کانال تلگرام با دسترسی ربات','Telegram channel accessible to bot')]],f.type)}<div id="vf-rss" class="${f.type==='rss'?'':'hidden'}">${vField('vf-url',L('آدرس فید HTTPS','HTTPS feed URL'),f.url,'dir="ltr" placeholder="https://site.com/feed.xml"')}</div><div id="vf-youtube" class="${f.type==='youtube'?'':'hidden'}">${vField('vf-youtube-id',L('شناسه کانال یوتیوب (نه هندل)','YouTube channel ID (not handle)'),f.youtubeChannelId,'dir="ltr" placeholder="UC…"')}</div><div id="vf-channel" class="${f.type==='channel'?'':'hidden'}">${vField('vf-source',L('آیدی کانال مبدأ','Source channel ID'),f.sourceChatId,'dir="ltr" placeholder="@source / -100…"')}</div>${vArea('vf-targets',L('آیدی مقصدها؛ هر خط یک کانال یا گروه','Destination IDs; one channel/group per line'),f.destinations.join('\n'),3,'dir="ltr" required')}${vField('vf-interval',L('فاصله بررسی فید (۵ تا ۱۴۴۰ دقیقه)','Feed check interval (5–1440 minutes)'),f.intervalMinutes,'type="number" min="5" max="1440"')}${vCheck('vf-enabled',L('فعال باشد','Enabled'),f.enabled)}${vNote(L('مبدأ و مقصد یکسان یا حلقه بازنشر مجاز نیست. برای کانال‌ها، ربات باید اجازه دریافت پست و ارسال در مقصد را داشته باشد.','Source and destination must differ and cannot form a repost loop. The bot needs permission to receive source posts and publish to destinations.'))}`,'vFeedSave');
};
document.addEventListener('change',e=>{if(e.target.id==='vf-type')for(const t of ['rss','youtube','channel'])$('vf-'+t)?.classList.toggle('hidden',e.target.value!==t);});
ACTIONS.vFeedSave=async()=>{await api('/studio/feeds'+(V2.editId?'/'+V2.editId:''),{method:V2.editId?'PUT':'POST',body:{title:vVal('vf-title'),type:vVal('vf-type'),url:vVal('vf-url'),youtubeChannelId:vVal('vf-youtube-id'),sourceChatId:vVal('vf-source'),destinations:vList(vVal('vf-targets')),intervalMinutes:vNum('vf-interval'),enabled:vOn('vf-enabled')}});closeModal();toast(t('saved'),'success');loadStudio();};
ACTIONS.vFeedScan=async d=>{await api('/studio/feeds/'+d.id+'/scan',{method:'POST'});toast(L('در نوبت بعدی سرور بررسی می‌شود.','Will scan on the next server tick.'),'success');};

const GROUP_FLAGS = {lockChat:['قفل کامل گروه (جلوگیری از ارسال پیام اعضا)','Lock entire group'],blockLinks:['حذف لینک و تبلیغ لینک‌دار','Delete links'],blockForwards:['حذف پیام فورواردشده','Delete forwarded messages'],blockMentions:['حذف منشن و یوزرنیم (@)','Delete mentions (@)'],blockBots:['جلوگیری از ورود حساب‌های ربات','Block bot accounts joining'],forceMembership:['اعمال قفل‌های عضویت کانال/گروه','Apply membership gates'],autoClean:['پاکسازی پیام ورود و خروج اعضا','Clean join/leave service messages'],welcomeClean:['پاکسازی خودکار پیام خوش‌آمد','Auto-clean welcome message'],captcha:['تأیید ورود با کپچا','New member captcha'],rulesRequired:['پذیرش قوانین قبل از گفتگو','Accept rules before chatting'],welcome:['پیام خوش‌آمدگویی','Welcome messages']};
const MEDIA_LABELS={photo:['عکس','Photo'],document:['فایل','File'],video:['ویدیو','Video'],animation:['گیف','GIF'],voice:['ویس','Voice'],audio:['موسیقی','Audio'],sticker:['استیکر','Sticker'],video_note:['ویدیومسیج','Video note'],poll:['نظرسنجی','Poll'],contact:['مخاطب','Contact'],location:['لوکیشن','Location']};
async function studioGroups() {
  const [d,a]=await Promise.all([api('/studio/groups'),api('/studio/audit?limit=50')]);V2.cache.groups=d.rows;V2.groupDefaults=d.defaults;
  return `<div class="space-y-4">${vNote(L('ربات باید ادمین باشد و مجوز حذف پیام، محدودکردن اعضا و تغییر دسترسی‌ها را داشته باشد. کپچا و سکوت به سوپرگروه نیاز دارند. برای دیدن پیام‌های عادی، ربات را ادمین کنید یا Privacy Mode را در BotFather خاموش کنید. تشخیص قطعی اکانت مخرب ممکن نیست؛ کنترل ورود و محدودیت نرخ به کاهش اسپم کمک می‌کند.','Grant the bot administrator rights to delete messages, restrict members and change permissions. Captchas/mutes require a supergroup. Use admin rights or disable BotFather privacy mode to receive normal messages. Account intent cannot be reliably detected; entry checks and rate limits reduce spam.'),true)}${vSection(L('گروه‌ها و بخش نظرات متصل به کانال','Groups & linked channel discussions'),d.rows.length?d.rows.map(g=>`<div class="v-row"><span class="v-icon shrink-0">${vIcon('shield-check')}</span><div class="v-row-main"><p class="text-sm font-bold">${esc(g.title)} <span class="v-badge ${g.enabled?'good':'warn'}">${g.enabled?L('فعال','Active'):L('غیرفعال','Disabled')}</span> ${g.nightActive ? vIcon('moon') : ''}</p><p class="v-meta v-code">${esc(g.chatId)}${g.botStatus?' · '+esc(g.botStatus):''}</p>${g.lastError?`<p class="text-xs text-rose-400 mt-1">${esc(g.lastError)}</p>`:''}</div><div class="v-actions">${vButton(t('edit'),'vGroupEdit',`data-id="${g.chatId}"`)}${vButton(L('آزمایش دسترسی','Check rights'),'vGroupCheck',`data-id="${g.chatId}"`)}${vButton(t('delete'),'vDelete',`data-type="groups" data-id="${g.chatId}"`)}</div></div>`).join(''):vEmpty(L('گروه اول را اضافه کنید. گروه‌های شناسایی‌شده خودکار، تا فعال‌سازی مدیر خاموش می‌مانند.','Add your first group. Auto-discovered groups remain disabled until an administrator enables them.'),'users'),vButton(L('افزودن گروه','Add group'),'vGroupEdit','',true))}${vSection(L('گزارش تخلف‌ها و رویدادهای اخیر','Recent reports & moderation log'),a.rows.length?a.rows.map(e=>`<div class="v-row"><div class="v-row-main"><p class="text-xs font-semibold">${e.kind === 'report' ? vIcon('flag') + ' ' + L('گزارش کاربر','User report') : esc(e.action || e.kind)} <span class="v-badge ${e.ok===false?'bad':e.resolved?'good':''}">${e.ok===false?L('ناموفق','Failed'):e.resolved?L('بررسی شد','Resolved'):''}</span></p><p class="v-meta">${esc(e.chatId||e.source||'')} · ${esc(e.userId||'')} · ${fmtDate(e.at)}<br>${esc(e.text||e.reason||e.error||'')}</p></div>${e.kind==='report'&&!e.resolved?vButton(L('بررسی شد','Resolve'),'vResolveReport',`data-id="${e.id}"`):''}</div>`).join(''):vEmpty(L('هنوز رویدادی ثبت نشده است.','No moderation events yet.')))}${vNote('<span class="v-code">/ban · /unban · /mute 2h · /unmute · /warn · /resetwarn · /lock · /unlock · /raffle · /clean 20 · /report · /rules · /link</span><br>'+L('دستورات مدیریتی با ریپلای روی پیام یا آیدی عددی کاربر اجرا می‌شوند؛ فقط ادمین واقعی گروه مجاز است. /report با ریپلای برای همه اعضا آزاد است.','Reply to a message or specify a user ID. Administrative commands require current Telegram admin permissions. Members can reply with /report.'))}</div>`;
}
ACTIONS.vGroupEdit=d=>{
  const g=(V2.cache.groups||[]).find(g=>g.chatId===d.id)||structuredClone(V2.groupDefaults||V2.summary.groupDefaults||{});V2.editId=d.id||'';
  const penalty=[['delete',L('فقط حذف','Delete only')],['warn',L('حذف + اخطار','Delete + warn')],['mute',L('حذف + سکوت','Delete + mute')],['ban',L('حذف + بن','Delete + ban')]];
  const respLines=Object.entries(g.responses||{}).map(([k,v])=>`${k} | ${v}`).join('\n');
  vModal(L('تنظیمات مدیریت و نگهبانی گروه','Group Management Settings'),`<div class="grid sm:grid-cols-2 gap-4">${vField('vg-title',L('نام گروه','Group name'),g.title,'required maxlength="100"')}${vField('vg-id',L('آیدی عددی گروه','Numeric group ID'),g.chatId,'required dir="ltr" '+(V2.editId?'readonly':''))}${vSelect('vg-language',L('زبان پیام‌های گروه','Group message language'),[['fa','فارسی'],['en','English']],g.language)}${vField('vg-notify',L('مقصد گزارش‌ها برای مدیر؛ اختیاری','Admin report chat; optional'),g.notifyChatId,'dir="ltr"')}</div>${vCheck('vg-enabled',L('مدیریت این گروه فعال باشد','Enable group management'),g.enabled)}<div class="v-divider"></div><h4 class="text-sm font-bold">${L('امنیت و قفل‌های گروه','Security & Group Locks')}</h4><div class="grid sm:grid-cols-2 gap-x-4">${Object.entries(GROUP_FLAGS).map(([key,l])=>vCheck('vg-'+key,l[S.lang==='en'?1:0],g[key])).join('')}</div><div class="grid grid-cols-2 gap-4">${[['maxEmojis',L('حداکثر ایموجی؛ ۰ = بدون محدودیت','Max emojis; 0 = unlimited'),0,200],['maxHashtags',L('حداکثر هشتگ؛ ۰ = نامحدود','Max hashtags; 0 = unlimited'),0,100],['minWords',L('حداقل کلمات پیام؛ ۰ = نامحدود','Min words; 0 = unlimited'),0,100],['maxWords',L('حداکثر کلمات پیام؛ ۰ = نامحدود','Max words; 0 = unlimited'),0,500],['maxLength',L('حداکثر طول متن؛ ۰ = نامحدود','Max text length; 0 = unlimited'),0,4096],['floodCount',L('حداکثر پیام در بازه (ضداسپم)؛ ۰ = خاموش','Max messages per window; 0 = off'),0,50],['floodSeconds',L('بازه ضداسپم (ثانیه)','Flood window (seconds)'),1,60],['warnLimit',L('حد نصاب اخطار','Warning limit'),1,20],['muteSeconds',L('مدت سکوت (ثانیه)','Mute duration (seconds)'),60,2592000],['welcomeSeconds',L('مهلت حذف خوش‌آمد (ثانیه)','Welcome clean timeout (s)'),0,3600],['captchaSeconds',L('مهلت کپچا (ثانیه)','Captcha timeout (seconds)'),30,600]].map(([k,l,min,max])=>vField('vg-'+k,l,g[k]??0,`type="number" min="${min}" max="${max}" required`)).join('')}${vSelect('vg-penalty',L('جریمه تخلف','Violation penalty'),penalty,g.penalty)}${vSelect('vg-warnPenalty',L('پس از حد نصاب اخطار','When warning limit is reached'),penalty.filter(p=>['mute','ban'].includes(p[0])),g.warnPenalty)}${vSelect('vg-captchaMode',L('نوع کپچا','Captcha type'),[['math',L('جمع ساده با دکمه','Simple math buttons')],['button',L('دکمه تأیید ورود','Verification button')]],g.captchaMode)}</div>${vField('vg-requiredWord',L('کلمه یا هشتگ اجباری در پیام (اختیاری)','Required keyword in message (optional)'),g.requiredWord||'','maxlength="100"')}${vField('vg-groupLink',L('لینک گروه (برای دستور /link)','Group invite link for /link'),g.groupLink||'','dir="ltr"')}${vArea('vg-words',L('کلمات ممنوعه؛ هر خط یک عبارت','Forbidden words; one phrase per line'),(g.words||[]).join('\n'),3)}<div class="v-divider"></div><h4 class="text-sm font-bold">${L('قفل رسانه‌ها (حذف خودکار نوع محتوا)','Media Locks')}</h4><div class="grid grid-cols-3 gap-x-3">${Object.entries(MEDIA_LABELS).map(([k,l])=>vCheck('vg-media-'+k,l[S.lang==='en'?1:0],(g.blockedMedia||[]).includes(k))).join('')}</div><div class="v-divider"></div><h4 class="text-sm font-bold flex items-center gap-2">${vIcon('users')} ${L('عضوگیر / اد اجباری','Forced Add Requirement')}</h4><div class="grid sm:grid-cols-2 gap-4">${vCheck('vg-forcedAdd-on',L('فعال‌سازی اد اجباری','Enable forced add'),!!g.forcedAdd?.enabled)}${vField('vg-forcedAdd-count',L('تعداد اد لازم برای ارسال پیام','Required added members to chat'),g.forcedAdd?.count||3,'type="number" min="1" max="50"')}</div><div class="v-divider"></div><h4 class="text-sm font-bold flex items-center gap-2">${vIcon('message-circle')} ${L('پاسخ‌های سریع و آماده (Canned Responses)','Canned Responses')}</h4>${vArea('vg-responses',L('هر خط: کلیدواژه | پاسخ سریع','One per line: trigger | response'),respLines,3)}<div class="v-divider"></div>${vArea('vg-rules',L('قوانین فارسی','Rules (Persian)'),g.rules||'',3,'maxlength="1500"')}${vArea('vg-rulesEn','Rules (English)',g.rulesEn||'',2,'dir="ltr" maxlength="1500"')}${vArea('vg-welcomeText',L('خوش‌آمد فارسی؛ {name} و {id} و {time}','Persian welcome; {name}, {id}, {time}'),g.welcomeText||'',2,'maxlength="1500"')}${vArea('vg-welcomeTextEn','English welcome; {name}, {id}, {time}',g.welcomeTextEn||'',2,'dir="ltr" maxlength="1500"')}${uploadField('vg-photo',L('عکس خوش‌آمد؛ اختیاری','Welcome photo; optional'),g.welcomeMediaId||'','photo')}<div class="v-divider"></div><h4 class="text-sm font-bold flex items-center gap-2">${vIcon('moon')} ${L('حالت شب / خاموشی گروه','Night Mode / Auto Shutdown')}</h4>${vCheck('vg-night-on',L('قفل خودکار گروه در بازه شب','Automatically lock group during night hours'),!!g.night?.enabled)}<div class="grid sm:grid-cols-2 gap-4">${vField('vg-night-start',L('ساعت شروع خاموشی','Start time'),g.night?.start||'23:00','type="time" required')}${vField('vg-night-end',L('ساعت پایان و بازگشایی','End time'),g.night?.end||'07:00','type="time" required')}${vField('vg-night-zone',L('منطقه زمانی IANA','IANA timezone'),g.night?.timezone||'Asia/Tehran','dir="ltr" required placeholder="Asia/Tehran"')}</div>${vNote(L('دستورات ربات در گروه: /ban, /unban, /mute, /unmute, /warn, /resetwarn, /lock, /unlock, /raffle, /clean, /rules, /link, /report, /admin, /help','Group bot commands: /ban, /unban, /mute, /unmute, /warn, /resetwarn, /lock, /unlock, /raffle, /clean, /rules, /link, /report, /admin, /help'))}`,'vGroupSave');
};
ACTIONS.vGroupSave=async()=>{
  const responses={};
  for(const line of vLines(vVal('vg-responses'))){
    const parts=line.split('|');
    if(parts.length>=2){
      const k=parts[0].trim().toLowerCase();
      const v=parts.slice(1).join('|').trim();
      if(k&&v)responses[k]=v;
    }
  }
  const body={title:vVal('vg-title'),chatId:vVal('vg-id'),enabled:vOn('vg-enabled'),language:vVal('vg-language'),notifyChatId:vVal('vg-notify'),requiredWord:vVal('vg-requiredWord'),groupLink:vVal('vg-groupLink'),words:vLines(vVal('vg-words')),responses,forcedAdd:{enabled:vOn('vg-forcedAdd-on'),count:vNum('vg-forcedAdd-count')||3},blockedMedia:Object.keys(MEDIA_LABELS).filter(k=>vOn('vg-media-'+k)),welcomeMediaId:vVal('vg-photo'),night:{enabled:vOn('vg-night-on'),start:vVal('vg-night-start'),end:vVal('vg-night-end'),timezone:vVal('vg-night-zone')}};
  for(const k of Object.keys(GROUP_FLAGS))body[k]=vOn('vg-'+k);
  for(const k of ['maxEmojis','maxHashtags','minWords','maxWords','maxLength','floodCount','floodSeconds','warnLimit','muteSeconds','welcomeSeconds','captchaSeconds'])body[k]=vNum('vg-'+k);
  for(const k of ['penalty','warnPenalty','captchaMode','rules','rulesEn','welcomeText','welcomeTextEn'])body[k]=vVal('vg-'+k);
  await api('/studio/groups'+(V2.editId?'/'+V2.editId:''),{method:V2.editId?'PUT':'POST',body});closeModal();toast(t('saved'),'success');loadStudio();
};
ACTIONS.vGroupCheck=async d=>{const r=await api('/studio/groups/'+d.id+'/check',{method:'POST'});const p=r.permissions||{};openModal(`<div class="p-6"><h3 class="font-bold mb-4">${L('دسترسی‌های واقعی تلگرام','Telegram permissions')}</h3><div class="space-y-3 text-sm">${[[L('ادمین','Administrator'),['administrator','creator'].includes(p.status)],[L('حذف پیام','Delete messages'),p.can_delete_messages],[L('محدودکردن اعضا','Restrict members'),p.can_restrict_members],[L('تغییر اطلاعات','Change info'),p.can_change_info]].map(([l,on])=>`<p class="flex items-center gap-2"><span class="${on ? 'text-emerald-500' : 'text-rose-500'} inline-flex">${on ? vIcon('check-circle-2') : vIcon('x-circle')}</span><span>${l}</span></p>`).join('')}${r.error?'<p class="text-rose-400 text-xs">'+esc(r.error)+'</p>':''}</div><div class="mt-5">${vButton(t('close'),'modalClose')}</div></div>`);};
ACTIONS.vResolveReport=async d=>{await api('/studio/audit/'+d.id+'/resolve',{method:'POST'});loadStudio();};

const vRelayState=s=>({collecting:L('جمع‌آوری آلبوم','Collecting album'),pending:L('منتظر تأیید','Awaiting approval'),ready:L('آماده انتشار','Ready'),publishing:L('در حال انتشار','Publishing'),sent:L('ارسال شد','Sent'),failed:L('ارسال ناموفق/ناقص','Failed/partial'),rejected:L('رد شد','Rejected'),review:L('نتیجه نامشخص','Uncertain result')}[s]||s);
async function studioRelay(){
  const d=await api('/studio/relay?offset='+V2.offset);V2.cache.relays=d.rows;
  return `<div class="space-y-4">${vNote(L('پیام کاربران پس از عبور از قفل عضویت اینجا ثبت می‌شود. در حالت تأیید مدیر، می‌توانید مقصد هر پیام را انتخاب کنید. کپی تلگرام نام فرستنده/برچسب فوروارد را به مقصد نمی‌فرستد؛ اما مدیر هویت فرستنده را می‌بیند.','User messages arrive here after the membership gate. With manual approval, select destinations per message. Telegram copies remove forward attribution; administrators can still see sender identities.'))}${vSection(L('صندوق ورودی و بازنشر بدون فوروارد','Inbox & clean-copy publishing'),d.rows.length?d.rows.map(r=>`<div class="v-row"><span class="v-icon shrink-0">${vIcon(r.messageIds.length>1?'images':'copy')}</span><div class="v-row-main"><p class="text-sm font-semibold">${esc(r.userName||r.userId)} <span class="v-badge ${r.status==='pending'?'warn':r.status==='sent'?'good':''}">${vRelayState(r.status)}</span></p><p class="v-meta">${esc(r.text||L('فایل یا رسانه','File or media'))}<br>${fmtDate(r.createdAt)} · ${fmtNum(r.messageIds.length)} ${L('پیام','messages')}</p></div>${vButton(L('بررسی پیام','Review message'),'vRelayOpen',`data-id="${r.id}"`)}</div>`).join('')+vPagination(d):vEmpty(L('هنوز پیامی برای کپی ثبت نشده است. دریافت پیام را در تنظیمات بی‌نام‌ساز فعال کنید.','No relay messages yet. Enable the relay in Settings.'),'copy'),vButton(t('settings'),'nav','data-to="settings"'))}</div>`;
}
ACTIONS.vRelayOpen=d=>{
  const r=V2.cache.relays.find(r=>r.id===d.id);if(!r)return;V2.relayId=r.id;
  openModal(`<div class="p-6"><div class="flex justify-between mb-4"><h3 class="font-bold">${L('بررسی پیام','Review message')}</h3>${vButton(t('close'),'modalClose')}</div><span class="v-badge">${vRelayState(r.status)}</span><p class="v-meta">${esc(r.userName)} · ${esc(r.userId)} · ${fmtDate(r.createdAt)}</p><p class="text-sm whitespace-pre-wrap leading-7 mt-4">${esc(r.text)}</p><div class="v-actions !justify-start mt-4">${(r.attachments||[]).map((f,i)=>vButton(L('مشاهده رسانه','View attachment')+' '+fmtNum(i+1),'vRelayMedia',`data-index="${i}"`)).join('')}</div><div id="v-relay-preview" class="mt-3"></div><div class="v-divider"></div>${r.status==='pending'?`${vArea('vr-targets',L('آیدی مقصدها؛ هر خط یک مقصد','Destination IDs; one per line'),V2.settings.relay.destinations.map(d=>d.chatId).join('\n'),3,'dir="ltr"')}<div class="v-actions !justify-start mt-4">${vButton(L('تأیید و کپی به مقصدها','Approve & copy to targets'),'vRelayApprove','',true)}${vButton(L('رد پیام','Reject message'),'vRelayReject')}</div>`:(r.destinations||[]).map(d=>`<p class="v-meta">${esc(d.chatId)} · ${vRelayState(d.status)}${d.error?' · '+esc(d.error):''}</p>`).join('')}${['failed','review','publishing'].includes(r.status)?'<div class="mt-4">'+vNote(L('قبل از ارسال دوباره، مقصد را بررسی کنید. این پنل ارسال نامشخص را خودکار تکرار نمی‌کند تا پیام تکراری نسازد.','Inspect destinations before resending. Uncertain sends are not automatically retried to avoid duplicates.'),true)+'</div>':''}</div>`);
};
ACTIONS.vRelayMedia=async d=>{const host=$('v-relay-preview');host.textContent=t('loading');const blob=await vAuthorizedFile(`/studio/relay/${V2.relayId}/attachment/${d.index}`);if(!host.isConnected)return;const url=vBlobUrl(blob);if(blob.type.startsWith('image/'))host.innerHTML=`<img class="v-preview" alt="${L('رسانه دریافتی','Received media')}" src="${url}">`;else{const a=document.createElement('a');a.href=url;a.download='attachment';a.textContent=L('دانلود رسانه','Download media');a.className=CLS.btnS;host.replaceChildren(a);}};
ACTIONS.vRelayApprove=async()=>{const id=V2.relayId,targets=vList(vVal('vr-targets'));const r=await api('/studio/relay/'+id+'/approve',{method:'POST',body:{destinations:targets}});closeModal();toast(r.relay.status==='sent'?L('پیام بدون برچسب فوروارد کپی شد.','Message copied without forward attribution.'):L('برخی ارسال‌ها ناموفق بود؛ جزئیات در صندوق ثبت شد.','Some deliveries failed; check the inbox details.'),r.relay.status==='sent'?'success':'info');loadStudio();};
ACTIONS.vRelayReject=async()=>{await api('/studio/relay/'+V2.relayId+'/reject',{method:'POST'});closeModal();toast(t('saved'),'success');loadStudio();};

async function studioCRM(){const d=await api('/studio/crm');return `<div class="space-y-4">${vSection(L('جدول امتیاز و معرفی دوستان','Points & referral leaderboard'),d.accounts.length?d.accounts.map((a,i)=>`<div class="v-row"><span class="v-icon font-bold">${i < 3 ? `<span class="v-rank r${i + 1}">${fmtNum(i + 1)}</span>` : fmtNum(i + 1)}</span><div class="v-row-main"><p class="text-sm font-semibold">${esc(a.name)}</p><p class="v-meta">${esc(a.userId)} · ${L('دعوت معتبر','Qualified referrals')}: ${fmtNum(a.referrals)}</p></div><div class="text-end"><p class="font-bold text-brand-500">${fmtNum(a.points)} ${vIcon('star')}</p><p class="v-meta">${L('کل دریافتی','Lifetime earned')}: ${fmtNum(a.earned)}</p></div></div>`).join(''):vEmpty(L('با ثبت‌نام، خرید و معرفی معتبر، امتیازها اینجا دیده می‌شوند.','Signup, purchase and qualified referral points appear here.'),'trophy'),vButton(t('settings'),'nav','data-to="settings"'), { icon: 'trophy' })}${vSection(L('رویدادهای اخیر امتیاز','Recent points events'),d.events.length?d.events.map(e=>`<div class="v-row"><div class="v-row-main"><p class="text-xs">${esc(e.userId)} · ${esc(e.reason)}</p><p class="v-meta">${fmtDate(e.at)}</p></div><span class="font-bold text-sm ${e.amount>0?'text-emerald-500':'text-amber-500'}">${e.amount>0?'+':''}${fmtNum(e.amount)}</span></div>`).join(''):vEmpty(L('هنوز رویدادی ثبت نشده است.','No points events yet.')))}</div>`;}
async function studioFAQ(){const d=await api('/studio/faq');V2.cache.faq=d.rows;return vSection(L('پرسش‌ها و پاسخ‌های آماده','Frequently asked questions'),d.rows.length?d.rows.map(f=>`<div class="v-row"><div class="v-row-main"><p class="text-sm font-semibold">${esc(f.question)}${f.hidden ? ' ' + vIcon('eye-off') : ''}</p><p class="v-meta">${esc(f.answer.slice(0,140))}</p></div><div class="v-actions">${vButton(t('edit'),'vFAQEdit',`data-id="${f.id}"`)}${vButton(t('delete'),'vDelete',`data-type="faq" data-id="${f.id}"`)}</div></div>`).join(''):vEmpty(L('پرسش و پاسخ اضافه کنید؛ در ربات با دکمه شیشه‌ای نمایش داده می‌شود.','Add questions and answers; the bot displays them as inline buttons.'),'messages-square'),vButton(L('پرسش جدید','New question'),'vFAQEdit','',true));}
ACTIONS.vFAQEdit=d=>{const f=(V2.cache.faq||[]).find(f=>f.id===d.id)||{};V2.editId=f.id||'';vModal(L('پرسش و پاسخ','Question & answer'),`${vField('vq-question',L('پرسش فارسی','Persian question'),f.question,'required maxlength="100"')}${vField('vq-en','English question',f.questionEn,'dir="ltr" maxlength="100"')}${vArea('vq-answer',L('پاسخ فارسی','Persian answer'),f.answer,5,'required maxlength="3500"')}${vArea('vq-answer-en','English answer',f.answerEn,4,'dir="ltr" maxlength="3500"')}${vCheck('vq-hidden',L('مخفی باشد','Hidden'),f.hidden)}`,'vFAQSave');};
ACTIONS.vFAQSave=async()=>{await api('/studio/faq'+(V2.editId?'/'+V2.editId:''),{method:V2.editId?'PUT':'POST',body:{question:vVal('vq-question'),questionEn:vVal('vq-en'),answer:vVal('vq-answer'),answerEn:vVal('vq-answer-en'),hidden:vOn('vq-hidden')}});closeModal();toast(t('saved'),'success');loadStudio();};
async function studioMedia(){const d=await api('/media'+(V2.mediaCursor?'?cursor='+encodeURIComponent(V2.mediaCursor):''));V2.cache.media=d.rows;return vSection(L('فایل‌های آپلودشده','Uploaded media'),uploadField('v-library-upload',L('آپلود عکس یا فایل جدید','Upload a new photo or file'))+'<div class="v-divider"></div>'+(d.rows.length?d.rows.map(m=>`<div class="v-row"><span class="v-icon shrink-0">${vIcon(m.kind==='photo'?'image':'file')}</span><div class="v-row-main"><p class="text-sm font-semibold break-all">${esc(m.name)}</p><p class="v-meta">${esc(m.kind)} · ${(m.size/1024/1024).toFixed(2)} MB · ${fmtDate(m.createdAt)}</p></div>${vButton(L('مشاهده / دانلود','View / download'),'vMediaView',`data-id="${m.id}"`)}</div>`).join(''):vEmpty(L('فایل‌های آپلودشده اینجا نگهداری می‌شوند؛ اطلاعات file_id ذخیره می‌شود، نه باینری فایل در KV.','Uploaded file records appear here. Telegram file IDs, not binary files, are stored in the database.'),'folder-open'))+`<div class="v-actions mt-4">${V2.mediaCursor?vButton(L('صفحه اول','First page'),'vMediaNext','data-cursor=""'):''}${d.cursor?vButton(L('صفحه بعد','Next page'),'vMediaNext',`data-cursor="${esc(d.cursor)}"`):''}</div>`,vButton(t('refresh'),'vReload'));}
ACTIONS.vMediaNext=d=>{V2.mediaCursor=d.cursor;loadStudio();};
ACTIONS.vMediaView=async d=>{const m=V2.cache.media.find(m=>m.id===d.id);const blob=await vAuthorizedFile('/media/'+d.id+'/content');const url=vBlobUrl(blob);openModal(`<div class="p-6"><h3 class="font-bold break-all">${esc(m.name)}</h3>${blob.type.startsWith('image/')?`<img class="v-preview" alt="${esc(m.name)}" src="${url}">`:''}<div class="flex gap-2 mt-5"><a href="${url}" download="${esc(m.name)}" class="${CLS.btnP}">${L('دانلود فایل','Download file')}</a>${vButton(t('close'),'modalClose')}</div></div>`);};

document.addEventListener('change', e => {
  if (['ph-kind', 'ph-operation'].includes(e.target.id) && vVal('ph-media')) {
    ACTIONS.vMediaClear({ slot: 'ph-media' });
    toast(L('نوع یا پردازش رسانه تغییر کرد؛ فایل را دوباره انتخاب کنید.', 'Media type or processing changed. Select the file again.'), 'info');
  }
});

document.addEventListener('change', e => {
  if (e.target.id.startsWith('v-mod-') && V2.purposeDraft === 'custom' && $('v-purpose-preview')) {
    $('v-purpose-preview').innerHTML = purposePreview('custom', Object.keys(MODULE_LABELS).filter(m => vOn('v-mod-' + m)));
    refreshIcons();
  }
});
