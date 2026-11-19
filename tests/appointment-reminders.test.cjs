const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(file,imports,globals={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,require:n=>imports[n],Date,Response,Buffer,AbortSignal,encodeURIComponent,console,...globals});return module.exports;}
const helper=load('src/lib/appointment-reminders.ts',{});
const now=Date.now();
const a={id:'appointment',client_id:'client',starts_at:new Date(now+helper.DAY_MS-60000).toISOString(),status:'agendado',is_homologation:false};
test('reminders: due window excludes early, stale, canceled, completed and test appointments',()=>{
 assert.equal(helper.dueReminder(a,now),true);
 for(const change of [{status:'cancelado'},{status:'concluido'},{is_homologation:true},{is_homologation:null},{starts_at:'invalid'},{starts_at:new Date(now+helper.DAY_MS+1).toISOString()},{starts_at:new Date(now+helper.DAY_MS-helper.GRACE_MS).toISOString()}])assert.equal(helper.dueReminder({...a,...change},now),false);
});
test('reminders: template parameters use Brasilia and valid Brazilian phone',()=>{
 assert.equal(helper.reminderPhone('(51) 99578-8082'),'5551995788082');
 assert.throws(()=>helper.reminderPhone('123'));
 const t=helper.reminderTemplate('test','pt_BR','Synthetic','2026-11-18T01:30:00Z');
 assert.equal(t.components[0].parameters[1].text,'17/11/2026');assert.equal(t.components[0].parameters[2].text,'22:30');
});
function setup(options={}){
 const claims=new Map(),calls=[];
 const client={name:'Synthetic',phone:'51995788082',whatsapp_reminder_consent_at:options.noConsent?null:'2026-11-01T00:00:00Z'};
 function from(table){let op='read',data;const q={select(){return q;},eq(){return q;},in(){return q;},gt(){return q;},lte(){return q;},order(){return q;},limit(){return q;},insert(d){op='insert';data=d;return q;},update(d){op='update';data=d;return q;},async maybeSingle(){if(table==='whatsapp_accounts')return {data:{id:'account'}};if(table==='studio_clients')return {data:client};return {data:options.canceled?{...a,status:'cancelado'}:a};},async single(){const key=data.appointment_id+data.scheduled_for;if(claims.has(key))return {error:{code:'23505'}};claims.set(key,{...data,id:'claim'});return {data:{id:'claim'}};},then(resolve,reject){if(op==='update')Object.assign([...claims.values()][0],data);return Promise.resolve(table==='studio_appointments'?{data:[a]}:{error:null}).then(resolve,reject);}};return q;}
 const env={CRON_SECRET:'x'.repeat(40),WHATSAPP_REMINDERS_ENABLED:'true',NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEY:'synthetic',WHATSAPP_ACCESS_TOKEN:'synthetic',WHATSAPP_PHONE_NUMBER_ID:'phone',WHATSAPP_BUSINESS_ACCOUNT_ID:'waba',WHATSAPP_REMINDER_TEMPLATE:'edinho_lembrete_agendamento_24h',WHATSAPP_REMINDER_USER_ID:'owner',...options.env};
 const body='Olá, {{1}}! Lembramos que seu atendimento no Edinho Chaves Tattoo está agendado para {{2}} às {{3}}. Para confirmar ou solicitar alteração, responda esta mensagem.';
 const route=load('src/app/api/cron/whatsapp-reminders/route.ts',{'@supabase/supabase-js':{createClient:()=>({from})},'node:crypto':require('node:crypto'),'@/lib/appointment-reminders':helper},{process:{env},fetch:async(url,init)=>{calls.push({url,init});if(url.includes('message_templates'))return Response.json({data:[{name:env.WHATSAPP_REMINDER_TEMPLATE,status:options.unapproved?'PENDING':'APPROVED',category:'UTILITY',language:'pt_BR',components:[{type:'BODY',text:body}]}]});if(options.timeout)throw new Error('synthetic timeout');return Response.json(options.rejected?{error:{code:131026}}:{messages:[{id:'wamid.synthetic'}]},{status:options.rejected?400:200});}});
 const req=(auth=true,delta=0)=>{const t=String(Math.floor(Date.now()/1000)+delta);const sig=require('node:crypto').createHmac('sha256',env.CRON_SECRET).update('GET:/api/cron/whatsapp-reminders:'+t).digest('hex');return new Request('https://example.invalid/api/cron/whatsapp-reminders',{headers:auth?{'x-reminder-timestamp':t,'x-reminder-signature':sig}:{}});};
 return {route,calls,claims,req};
}
test('reminders: rejects unauthorized and disabled execution without external calls',async()=>{const s=setup();assert.equal((await s.route.GET(s.req(false))).status,401);assert.equal(s.calls.length,0);const d=setup({env:{WHATSAPP_REMINDERS_ENABLED:'false'}});await d.route.GET(d.req());assert.equal(d.calls.length,0);});
for(const [label,option] of [['unapproved template',{unapproved:true}],['no consent',{noConsent:true}],['canceled before send',{canceled:true}]])test('reminders: no send for '+label,async()=>{const s=setup(option);await s.route.GET(s.req());assert.equal(s.calls.filter(c=>c.url.endsWith('/messages')).length,0);});
test('reminders: concurrent invocations send once and persist provider acceptance',async()=>{const s=setup();await Promise.all([s.route.GET(s.req()),s.route.GET(s.req())]);assert.equal(s.calls.filter(c=>c.url.endsWith('/messages')).length,1);assert.equal([...s.claims.values()][0].provider_message_id,'wamid.synthetic');assert.equal([...s.claims.values()][0].status,'sent');});
for(const option of [{timeout:true},{rejected:true}])test('reminders: failures and uncertain delivery are not retried',async()=>{const s=setup(option);await s.route.GET(s.req());await s.route.GET(s.req());assert.equal(s.calls.filter(c=>c.url.endsWith('/messages')).length,1);assert.equal([...s.claims.values()][0].status,'failed');});

test('reminders: expired signatures are rejected without external calls',async()=>{const s=setup();assert.equal((await s.route.GET(s.req(true,-301))).status,401);assert.equal(s.calls.length,0);});
