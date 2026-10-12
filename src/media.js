import { Hono } from 'hono';
import { requireAuth } from './auth.js';
import { getSettings, getJson, putJson } from './kv.js';
import { resolveToken, tgApi } from './bot-api.js';
import { assert, id, str } from './config.js';
import { entities, entityKey } from './storage.js';
import { boundedBytes } from './network.js';
import { readForm } from './body.js';

export const MEDIA_LIMITS = { photo: 10 * 1024 * 1024, document: 20 * 1024 * 1024, video: 20 * 1024 * 1024, animation: 20 * 1024 * 1024, audio: 20 * 1024 * 1024 };
const METHODS = { photo: 'sendPhoto', document: 'sendDocument', video: 'sendVideo', animation: 'sendAnimation', audio: 'sendAudio' };
export const getMedia = (env, mediaId) => getJson(env, entityKey('media', mediaId));
export function checkBotMedia(media, token) {
  assert(media && media.fileId, 'media_not_found', 404);
  assert(!media.botId || media.botId === token?.split(':')[0], 'media_belongs_to_another_bot');
}
export async function sendMedia(env, token, chatId, mediaId, { caption, reply_markup, parse_mode, protect_content = false } = {}) {
  const m = await getMedia(env, mediaId); checkBotMedia(m, token);
  return tgApi(token, METHODS[m.kind], { chat_id: chatId, [m.kind]: m.fileId, caption: caption || undefined, reply_markup, parse_mode, protect_content });
}

export async function fileResponse(token, fileId, { inline = false, name = 'file' } = {}) {
  const res = await tgApi(token, 'getFile', { file_id: fileId });
  assert(res.ok && res.result?.file_path, 'splus_file_unavailable', 502);
  assert((res.result.file_size || 0) <= MEDIA_LIMITS.document, 'file_download_limit', 413);
  const path = res.result.file_path;
  assert(!path.includes('..') && /^[A-Za-z0-9_/.\-]+$/.test(path), 'invalid_file_path', 502);
  let f;
  // Soroush+ file download base: https://api.splus.ir/file/bot<token>/<file_path>
  try { f = await fetch(`https://api.splus.ir/file/bot${token}/${path}`, { signal: AbortSignal.timeout(15000) }); } catch { throw new Error('splus_network_error'); }
  assert(f.ok, 'splus_file_unavailable', 502);
  const safeName = encodeURIComponent(name.replace(/[\r\n"]/g, ''));
  const type = f.headers.get('content-type') || 'application/octet-stream';
  const isImage = /^image\/(jpeg|png|webp|gif)$/.test(type);
  return new Response(f.body, { headers: { 'content-type': isImage ? type : 'application/octet-stream', 'content-disposition': `${inline && isImage ? 'inline' : 'attachment'}; filename*=UTF-8''${safeName}`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox" } });
}

const r = new Hono();
r.use('*', requireAuth);
r.get('/', async c => c.json({ ok: true, data: await entities(c.env, 'media', { limit: 60, cursor: c.req.query('cursor') }) }));
r.get('/:id/content', async c => {
  const token = await resolveToken(c.env), m = await getMedia(c.env, c.req.param('id'));
  checkBotMedia(m, token);
  return fileResponse(token, m.fileId, { inline: m.kind === 'photo', name: m.name });
});
r.post('/', async c => {
  assert(Number(c.req.header('content-length') || 0) <= MEDIA_LIMITS.document + 1024 * 1024, 'file_too_large', 413);
  assert((c.req.header('content-type') || '').startsWith('multipart/form-data'), 'multipart_required');
  const settings = await getSettings(c.env), token = await resolveToken(c.env);
  assert(token, 'token_missing'); assert(settings.uploads.chatId, 'upload_chat_required');
  const form = await readForm(c);
  let file = form.get('file');
  const kind = str(form.get('kind'), 16) || 'document';
  assert(METHODS[kind], 'invalid_media_kind');
  assert(file && typeof file.arrayBuffer === 'function' && file.size > 0, 'file_required');
  assert(file.size <= MEDIA_LIMITS[kind], 'file_too_large', 413);
  if (kind === 'photo') {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    assert((bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) || (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47), 'photo_must_be_jpeg_or_png');
  }
  if (kind === 'video') assert(file.type === 'video/mp4', 'video_must_be_mp4');
  if (kind === 'animation') assert(['image/gif', 'video/mp4'].includes(file.type), 'animation_must_be_gif_or_mp4');
  if (kind === 'audio') assert(['audio/mpeg', 'audio/mp4', 'audio/x-m4a'].includes(file.type), 'audio_must_be_mp3_or_m4a');
  const operation = str(form.get('operation'), 24);
  if (operation && operation !== 'none') {
    assert(['video_to_gif', 'compress', 'watermark'].includes(operation), 'invalid_media_operation');
    assert(c.env.MEDIA_PROCESSOR_URL && c.env.MEDIA_PROCESSOR_SECRET, 'media_processor_not_configured', 503);
    assert(c.env.MEDIA_PROCESSOR_URL.startsWith('https://'), 'invalid_processor_url');
    const input = new FormData(); input.set('file', file, file.name || 'file'); input.set('operation', operation);
    input.set('watermark', JSON.stringify(settings.uploads.watermark));
    let processed;
    try { processed = await fetch(c.env.MEDIA_PROCESSOR_URL, { method: 'POST', headers: { authorization: `Bearer ${c.env.MEDIA_PROCESSOR_SECRET}` }, body: input, signal: AbortSignal.timeout(60000), redirect: 'error' }); } catch { throw new Error('media_processor_unavailable'); }
    const bytes = await boundedBytes(processed, MEDIA_LIMITS[kind]);
    file = new File([bytes], str(processed.headers.get('x-output-name') || file.name, 120), { type: processed.headers.get('content-type') || file.type });
  }
  const upload = new FormData(); upload.set('chat_id', settings.uploads.chatId); upload.set('disable_notification', 'true');
  upload.set(kind, file, str(file.name || 'upload', 160));
  const outputKind = operation === 'video_to_gif' ? 'animation' : kind;
  if (outputKind !== kind) { upload.delete(kind); upload.set(outputKind, file, 'animation.mp4'); }
  const sent = await tgApi(token, METHODS[outputKind], upload);
  assert(sent.ok, sent.description || 'upload_failed', 502);
  const item = outputKind === 'photo' ? sent.result.photo?.at(-1) : sent.result[outputKind];
  assert(item?.file_id, 'splus_media_missing', 502);
  const m = { id: id(), kind: outputKind, fileId: item.file_id, botId: token.split(':')[0], name: str(file.name || 'upload', 160), mime: file.type, size: file.size, createdAt: Date.now() };
  await putJson(c.env, entityKey('media', m.id), m);
  // file_id remains usable after deleting the staging message.
  await tgApi(token, 'deleteMessage', { chat_id: settings.uploads.chatId, message_id: sent.result.message_id });
  return c.json({ ok: true, data: { media: m } });
});
export default r;
