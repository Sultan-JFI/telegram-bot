import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import worker, { BotCoordinator } from '../src/index.js';
import { DurableKV, allEntities, entityKey, prefixEnd } from '../src/storage.js';
import { MemoryKV, telegramMock } from './helpers.mjs';
import { getSettings, getUser, getJson, putJson, K } from '../src/kv.js';
import { verifyAdminPassword, bootstrapRequired, setAdminPassword, sha256hex } from '../src/auth.js';

function storageAdapter() {
  const db = new DatabaseSync(':memory:'); let alarm = null;
  return {
    db,
    sql: { exec(sql, ...args) { const rows = db.prepare(sql).all(...args); return { toArray: () => rows }; } },
    transactionSync(fn) { db.exec('BEGIN IMMEDIATE'); try { const value=fn(); db.exec('COMMIT'); return value; } catch(e) { db.exec('ROLLBACK'); throw e; } },
    async getAlarm() { return alarm; }, async setAlarm(value) { alarm=value; },
  };
}
let env, legacy, storage, coordinator, tg, token, updateId;
const originalFetch = globalThis.fetch;
beforeEach(async()=>{
  tg=telegramMock();globalThis.fetch=tg.fetcher;legacy=new MemoryKV();storage=storageAdapter();
  const context={storage,waitUntil(p){return p;}};
  const outer={BOT_KV:legacy,BOT_TOKEN:'123:TEST_TOKEN',WEBHOOK_SECRET:'test-hook',TEST_MODE:true};
  outer.BOT_STATE={idFromName:()=> 'test',get:()=>coordinator};
  coordinator=new BotCoordinator(context,outer);env=coordinator.env;updateId=100;
  const login=await raw('POST','/api/auth/login',{password:'botpanel123'},false);token=(await login.json()).data.token;
  await api('POST','/auth/change-password',{currentPassword:'botpanel123',newPassword:'durable-test-private-password'});
});
afterEach(()=>{globalThis.fetch=originalFetch;storage.db.close();});
function raw(method,path,body,auth=true,headers={}) {
  return worker.fetch(new Request('https://panel.example.com'+path,{method,headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+token}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,{waitUntil(p){return p;}});
}
async function api(method,path,body){const res=await raw(method,'/api'+path,body);return {status:res.status,...await res.json()};}
async function update(data,uid){const res=await raw('POST','/telegram/webhook',{update_id:uid??updateId++,...data},false,{'x-telegram-bot-api-secret-token':'test-hook'});assert.equal(res.status,200);return res;}
const msg=(uid,text)=>update({message:{message_id:updateId,from:{id:uid,first_name:'U'},chat:{id:uid,type:'private'},text}});
const cb=(uid,data)=>update({callback_query:{id:'c'+updateId,from:{id:uid,first_name:'U'},message:{message_id:10,chat:{id:uid,type:'private'}},data}});

test('legacy KV import is read-only and local writes/deletes never resurrect old values',async()=>{
  await legacy.put('legacy_key',JSON.stringify({old:true}));assert.deepEqual(JSON.parse(await env.BOT_KV.get('legacy_key')),{old:true});
  await env.BOT_KV.put('legacy_key','new');assert.equal(await legacy.get('legacy_key'),'{"old":true}');assert.equal(await env.BOT_KV.get('legacy_key'),'new');
  await env.BOT_KV.delete('legacy_key');assert.equal(await env.BOT_KV.get('legacy_key'),null);assert.equal(await legacy.get('legacy_key'),'{"old":true}');
});
test('legacy session credentials are deliberately not imported',async()=>{
  await legacy.put('session:old-secret','old-session');assert.equal(await env.BOT_KV.get('session:old-secret'),null);assert.equal((await env.BOT_KV.list({prefix:'session:'})).keys.some(k=>k.name==='session:old-secret'),false);
});
test('SQLite batch rolls back all writes on a mid-transaction failure',async()=>{
  await env.BOT_KV.put('v2:test:stock','1');
  storage.db.exec("CREATE TRIGGER fail_test BEFORE INSERT ON panel_kv WHEN NEW.key='v2:test:fail' BEGIN SELECT RAISE(ABORT, 'simulated failure'); END;");
  await assert.rejects(()=>env.BOT_KV.batch([{key:'v2:test:stock',value:'0'},{key:'v2:test:fail',value:'x'}]),/simulated failure/);
  assert.equal(await env.BOT_KV.get('v2:test:stock'),'1');assert.equal(await env.BOT_KV.get('v2:test:fail'),null);
});
test('SQLite listing supports metadata, pagination and TTL expiration',async()=>{
  for(const n of [1,2,3])await env.BOT_KV.put('v2:test:'+n,JSON.stringify(n),{metadata:{n}});
  const first=await env.BOT_KV.list({prefix:'v2:test:',limit:2});assert.equal(first.keys.length,2);assert.equal(first.keys[0].metadata.n,1);assert.equal(first.list_complete,false);
  const second=await env.BOT_KV.list({prefix:'v2:test:',cursor:first.cursor,limit:2});assert.equal(second.keys.length,1);assert.equal(second.list_complete,true);
  await env.BOT_KV.put('v2:test:expired','x',{expiration:1});assert.equal(await env.BOT_KV.get('v2:test:expired'),null);assert.equal((await env.BOT_KV.list({prefix:'v2:test:'})).keys.length,3);
});
test('simultaneous checkout callbacks cannot oversell the final item',async()=>{
  await api('PUT','/settings',{shop:{cardNumber:'6037991234567890'}});
  const p=(await api('POST','/studio/products',{title:'Last item',price:5000,stock:1,deliveryMode:'manual'})).data.product;
  for(const u of [42,43]){await msg(u,'/start');await cb(u,'cart:add:'+p.id);await cb(u,'checkout:start');await msg(u,'Customer Name');await msg(u,'09123456789');}
  const [a,b]=await Promise.all([getUser(env,42),getUser(env,43)]);assert.equal(a.flow.step,'confirm');assert.equal(b.flow.step,'confirm');
  await Promise.all([cb(42,'checkout:confirm:'+a.flow.checkoutId),cb(43,'checkout:confirm:'+b.flow.checkoutId)]);
  const orders=await allEntities(env,'order');assert.equal(orders.length,1);assert.equal((await getJson(env,entityKey('product',p.id))).stock,0);
});
test('simultaneous poll votes are serialized without lost counts',async()=>{
  const p=(await api('POST','/broadcast',{kind:'poll',target:'chat',chatId:'@destination',poll:{question:'Q',options:['A','B']}})).data.job.pollId;
  await Promise.all(Array.from({length:20},(_,i)=>cb(1000+i,'poll:'+p+':0')));const poll=await getJson(env,K.POLL(p));assert.equal(poll.opts[0].n,20);assert.equal(poll.participants,20);
});
test('busy groups use separate ordered queues instead of waiting for a slow broadcast',async()=>{
  await api('POST','/studio/groups',{chatId:'-1001234',title:'Group',captcha:false,penalty:'delete'});await msg(42,'/start');
  const j=(await api('POST','/broadcast',{text:'slow broadcast',target:'all'})).data.job.id;
  let release, reached;const reachedPromise=new Promise(r=>reached=r), gate=new Promise(r=>release=r);
  tg.setOverride(async(u,m,p)=>{if(m==='sendMessage'&&p.text==='slow broadcast'){reached();await gate;}return undefined;});
  const sending=api('POST','/broadcast/'+j+'/tick');await reachedPromise;
  await update({message:{message_id:500,chat:{id:-1001234,type:'supergroup'},from:{id:88},text:'https://spam.com'}});
  assert(tg.calls.some(c=>c.method==='deleteMessage'&&c.payload.message_id===500));release();await sending;
});
test('production supports no-env initial passwords; salted passwords migrate legacy hashes',async()=>{
  const production={BOT_KV:new MemoryKV()};assert.equal(await bootstrapRequired(production),false);assert.equal(await verifyAdminPassword(production,'botpanel123'),true);
  production.ADMIN_PASSWORD='unique-bootstrap-password';assert.equal(await verifyAdminPassword(production,production.ADMIN_PASSWORD),true);
  await putJson(production,'admin_auth',{hash:await sha256hex('legacy-password')});assert.equal(await verifyAdminPassword(production,'legacy-password'),true);
  const record=await getJson(production,'admin_auth');assert.equal(record.algorithm,'pbkdf2-sha256');assert(record.salt);assert.equal(record.hash===await sha256hex('legacy-password'),false);
  await setAdminPassword(production,'new-password');assert.equal(await verifyAdminPassword(production,'legacy-password'),false);assert.equal(await verifyAdminPassword(production,'new-password'),true);
});
test('external requests cannot call internal scheduler endpoints',async()=>{assert.equal((await raw('POST','/internal/tick',{})).status,404);});

test('active legacy broadcast jobs import paused, never start sending from a second Worker',async()=>{
  await legacy.put('broadcast:legacy',JSON.stringify({id:'legacy',status:'running',targets:[42],cursor:0,errors:[]}));
  const job=JSON.parse(await env.BOT_KV.get('broadcast:legacy'));assert.equal(job.status,'paused');assert.equal(job.legacyImported,true);assert.equal(JSON.parse(await legacy.get('broadcast:legacy')).status,'running');
});

/* Cloudflare bills SQLite-backed Durable Objects per row scanned and the Workers Free plan
 * allows 5M of them per day; once spent, every SELECT throws until 00:00 UTC and the panel
 * answers `internal_error` to everything (login included). A prefix listing that walked the
 * whole table did that with a few hundred rows, because the tick lists a dozen prefixes twice
 * a minute — so every recurring statement must stay an index lookup or a narrow index range. */
test('prefix listings and expiry cleanup are index ranges, never whole-table walks',async()=>{
  for(let i=0;i<300;i++)await env.BOT_KV.put('user:'+(1000+i),'{}');
  for(let i=0;i<5;i++)await env.BOT_KV.put('v2:order:'+i,'{}',i?{expirationTtl:3600}:{expiration:1});
  const statements=[];const exec=storage.sql.exec;
  storage.sql.exec=(sql,...args)=>{statements.push({sql,args});return exec(sql,...args);};
  try{
    await env.BOT_KV.list({prefix:'v2:order:'});
    const first=await env.BOT_KV.list({prefix:'user:',limit:100});await env.BOT_KV.list({prefix:'user:',cursor:first.cursor,limit:100});
    coordinator.kv.cleanup();
  } finally { storage.sql.exec=exec; }
  const recurring=statements.filter(s=>/^\s*(SELECT key,metadata|DELETE)/.test(s.sql));
  assert.equal(recurring.length,4);
  for(const s of recurring){
    const plan=storage.db.prepare('EXPLAIN QUERY PLAN '+s.sql).all(...s.args).map(r=>r.detail).join(' | ');
    assert.match(plan,/USING INDEX/,s.sql);
    assert.doesNotMatch(plan,/SCAN panel_kv/,s.sql);
    assert.doesNotMatch(plan,/\(key>\?\)$/,'an open-ended range walks the whole table: '+s.sql);
  }
  // The listing stays exact at the prefix boundaries: neighbours that share leading characters
  // (`v2:order` vs `v2:orders:`) and the row equal to the prefix itself.
  await env.BOT_KV.put('v2:orders:1','{}');await env.BOT_KV.put('v2:order','{}');await env.BOT_KV.put('v2:order:','{}');
  const keys=(await env.BOT_KV.list({prefix:'v2:order:'})).keys.map(k=>k.name);
  assert.deepEqual(keys,['v2:order:','v2:order:1','v2:order:2','v2:order:3','v2:order:4']);
  // …and cleanup() really removed the expired v2 row (and nothing else).
  assert.equal(storage.db.prepare("SELECT COUNT(*) AS n FROM panel_kv WHERE key='v2:order:0'").get().n,0);
  assert.equal((await env.BOT_KV.list({prefix:'user:',limit:1000})).keys.length,300);
  assert.equal((await env.BOT_KV.list({})).keys.length>=308,true);
  assert.equal(prefixEnd('v2:order:'),'v2:order;');assert.equal(prefixEnd(''),null);assert.equal(prefixEnd('a\uffff'),'b');
});
