import { Hono } from 'hono';
import { requireAuth, randomToken } from '../auth.js';
import { getSettings, saveSettings } from '../kv.js';
import { resolveToken, tgApi } from '../bot-api.js';
import { patchV2Settings, PURPOSES, activeModules, assert } from '../config.js';
import { readJson } from '../body.js';

const r = new Hono();
r.use('*', requireAuth);

const fail = (c, error, status = 400) => c.json({ ok: false, error }, status);

/** Prefer Worker secret; otherwise use/persist a panel-managed secret in settings. */
export async function resolveWebhookSecret(env) {
  if (env.WEBHOOK_SECRET) return env.WEBHOOK_SECRET;
  const settings = await getSettings(env);
  if (settings.webhookSecret && String(settings.webhookSecret).length >= 16) {
    return String(settings.webhookSecret);
  }
  const secret = randomToken();
  settings.webhookSecret = secret;
  await saveSettings(env, settings);
  return secret;
}

export function publicView(settings, envToken, env = {}) {
  const token = settings.botToken || envToken || '';
  const adminId = settings.adminId || env.ADMIN_ID || '';
  const publicBaseUrl = env.PUBLIC_BASE_URL || settings.publicBaseUrl || '';
  return {
    hasToken: !!token,
    tokenMasked: token ? `${'•'.repeat(8)}${token.slice(-4)}` : '',
    source: settings.botToken ? 'kv' : envToken ? 'env' : 'none',
    hasWebhookSecret: !!(env.WEBHOOK_SECRET || settings.webhookSecret),
    adminId,
    defaultLang: settings.defaultLang,
    botLangMode: settings.botLangMode || 'both',
    supportButton: settings.supportButton,
    broadcast: settings.broadcast,
    requiredChannel: settings.requiredChannel,
    botPurpose: settings.botPurpose, customModules: settings.customModules, modules: activeModules(settings), purposes: PURPOSES,
    botUsername: settings.botUsername, requiredChats: settings.requiredChats, uploads: settings.uploads,
    shop: settings.shop, relay: settings.relay, loyalty: settings.loyalty, news: settings.news,
    miniApp: {
      url: publicBaseUrl,
      adminId,
      configured: !!(token && adminId && publicBaseUrl),
    },
    integrations: { zarinpal: !!env.ZARINPAL_MERCHANT_ID, sandbox: env.ZARINPAL_SANDBOX === 'true', mediaProcessor: !!(env.MEDIA_PROCESSOR_URL && env.MEDIA_PROCESSOR_SECRET), durableStorage: !!env.BOT_STATE || !!env.__coordinated, publicBaseUrl },
  };
}

r.get('/', async (c) => {
  const settings = await getSettings(c.env);
  return c.json({ ok: true, data: { settings: publicView(settings, c.env.BOT_TOKEN, c.env) } });
});

r.put('/', async (c) => {
  const env = c.env;
  const body = await readJson(c);
  const settings = await getSettings(env);

  if (typeof body.botToken === 'string' && body.botToken.trim()) {
    assert(!env.MANAGED_BOT_ID, 'managed_token_change_use_manager');
    assert(/^\d+:[A-Za-z0-9_-]+$/.test(body.botToken.trim()), 'invalid_bot_token');
    if (settings.botToken !== body.botToken.trim()) settings.botUsername = '';
    settings.botToken = body.botToken.trim();
  }

  if (['fa', 'en'].includes(body.defaultLang)) settings.defaultLang = body.defaultLang;

  if (['fa', 'en', 'both'].includes(body.botLangMode)) settings.botLangMode = body.botLangMode;

  if (body.supportButton && typeof body.supportButton === 'object') {
    const sb = body.supportButton;
    settings.supportButton = {
      enabled: !!sb.enabled,
      fa: String(sb.fa || '').trim().slice(0, 64) || '🛡 پشتیبانی',
      en: String(sb.en || '').trim().slice(0, 64) || '🛡 Support',
    };
  }

  if (body.requiredChannel && typeof body.requiredChannel === 'object') {
    const rc = body.requiredChannel;
    settings.requiredChannel = {
      enabled: !!rc.enabled,
      chatId: String(rc.chatId || '').trim().slice(0, 64),
      url: /^https?:\/\//i.test(String(rc.url || '')) ? String(rc.url).trim().slice(0, 512) : '',
    };
    settings.requiredChats = { enabled: !!rc.enabled, targets: rc.chatId ? [{ chatId: settings.requiredChannel.chatId, url: settings.requiredChannel.url, title: '', scope: 'all' }] : [] };
  }

  if (body.broadcast && typeof body.broadcast === 'object') {
    const bs = Number(body.broadcast.batchSize);
    const dm = Number(body.broadcast.delayMs);
    if (Number.isFinite(bs)) settings.broadcast.batchSize = Math.min(Math.max(bs, 1), 50);
    if (Number.isFinite(dm)) settings.broadcast.delayMs = Math.min(Math.max(dm, 20), 500);
  }

  patchV2Settings(settings, body);
  await saveSettings(env, settings);
  return c.json({ ok: true, data: { settings: publicView(settings, env.BOT_TOKEN, env) } });
});

r.post('/webhook', async (c) => {
  const env = c.env;
  const body = await readJson(c);
  const action = body.action === 'delete' ? 'delete' : 'set';

  const token = await resolveToken(env);
  if (!token) return fail(c, 'token_missing');

  let res;
  if (action === 'delete') {
    res = await tgApi(token, 'deleteWebhook', { drop_pending_updates: false });
  } else {
    const secret = await resolveWebhookSecret(env);
    const publicBase = env.MANAGED_BASE_URL || env.PUBLIC_BASE_URL || new URL(c.req.url).origin;
    const url = `${publicBase.replace(/\/$/, '')}/soroush/webhook`;
    res = await tgApi(token, 'setWebhook', {
      url,
      secret_token: secret,
      allowed_updates: ['message', 'edited_message', 'callback_query', 'channel_post', 'my_chat_member', 'chat_member', 'pre_checkout_query'],
      drop_pending_updates: false,
    });
    if (res.ok) {
      const settings = await getSettings(env);
      settings.publicBaseUrl = publicBase.replace(/\/$/, '');
      if (!env.WEBHOOK_SECRET) settings.webhookSecret = secret;
      await saveSettings(env, settings);
      return c.json({ ok: true, data: { url, miniAppUrl: settings.publicBaseUrl, result: res.result } });
    }
  }

  // Surface Soroush API errors clearly (e.g. Unauthorized from bad token).
  if (!res.ok) {
    const desc = res.description || 'splus_error';
    const status = res.error_code === 401 || /unauthorized/i.test(desc) ? 401 : 400;
    return fail(c, desc, status);
  }
  return c.json({ ok: true, data: { result: res.result } });
});

r.post('/test', async c => {
  const token = await resolveToken(c.env); assert(token, 'token_missing');
  const me = await tgApi(token, 'getMe'); assert(me.ok, me.description || 'splus_connection_failed');
  const settings = await getSettings(c.env); settings.botUsername = me.result.username || ''; await saveSettings(c.env, settings);
  return c.json({ ok: true, data: { bot: me.result, settings: publicView(settings, c.env.BOT_TOKEN, c.env) } });
});
export default r;
