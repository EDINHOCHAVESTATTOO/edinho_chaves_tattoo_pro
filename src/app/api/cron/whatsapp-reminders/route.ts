import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual, createHmac } from 'node:crypto';
import { DAY_MS, GRACE_MS, dueReminder, reminderPhone, reminderTemplate } from '@/lib/appointment-reminders';
export const runtime='nodejs';
export const maxDuration=300;
export const dynamic='force-dynamic';
function authorized(request:Request) {
 const secret=process.env.CRON_SECRET;
 if(!secret || secret.length<32)return false;
 const timestamp=request.headers.get('x-reminder-timestamp')||'';
 const signature=request.headers.get('x-reminder-signature')||'';
 if(!/^[0-9]{10}$/.test(timestamp)||!/^[a-f0-9]{64}$/.test(signature)||Math.abs(Date.now()/1000-Number(timestamp))>300)return false;
 const actual=Buffer.from(signature);
 const expected=Buffer.from(createHmac('sha256',secret).update(`GET:/api/cron/whatsapp-reminders:${timestamp}`).digest('hex'));
 return actual.length===expected.length && timingSafeEqual(actual,expected);
}
export async function GET(request:Request) {
 if(!authorized(request))return Response.json({error:'Unauthorized'},{status:401});
 if(process.env.WHATSAPP_REMINDERS_ENABLED!=='true')return Response.json({enabled:false});
 const e=process.env;
 const required=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SECRET_KEY','WHATSAPP_ACCESS_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_BUSINESS_ACCOUNT_ID','WHATSAPP_REMINDER_TEMPLATE','WHATSAPP_REMINDER_USER_ID'];
 if(required.some(k=>!e[k]))return Response.json({error:'Reminder configuration incomplete'},{status:503});
 const db=createClient(e.NEXT_PUBLIC_SUPABASE_URL!,e.SUPABASE_SECRET_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const now=Date.now(), userId=e.WHATSAPP_REMINDER_USER_ID!;
 const version=e.WHATSAPP_GRAPH_VERSION||'v26.0', language=e.WHATSAPP_REMINDER_LANGUAGE||'pt_BR';
 const headers={Authorization:`Bearer ${e.WHATSAPP_ACCESS_TOKEN}`,'Content-Type':'application/json'};
 try {
  // Never fall back to free text outside the customer-service window.
  const check=await fetch(`https://graph.facebook.com/${version}/${e.WHATSAPP_BUSINESS_ACCOUNT_ID}/message_templates?name=${encodeURIComponent(e.WHATSAPP_REMINDER_TEMPLATE!)}&fields=name,status,language,category,components`,{headers,signal:AbortSignal.timeout(10000)});
  const templates=await check.json();
  const template=templates.data?.find((t:{name:string;status:string;language:string;category:string})=>t.name===e.WHATSAPP_REMINDER_TEMPLATE&&t.status==='APPROVED'&&t.language===language&&t.category==='UTILITY');
  const body=template?.components?.find((c:{type:string})=>c.type==='BODY')?.text;
  const expectedBody='Olá, {{1}}! Lembramos que seu atendimento no Edinho Chaves Tattoo está agendado para {{2}} às {{3}}. Para confirmar ou solicitar alteração, responda esta mensagem.';
  if(!check.ok||body!==expectedBody)return Response.json({error:'Approved reminder template unavailable or incompatible'},{status:503});
  const {data:account,error:accountError}=await db.from('whatsapp_accounts').select('id').eq('user_id',userId).eq('phone_number_id',e.WHATSAPP_PHONE_NUMBER_ID!).maybeSingle();
  if(accountError||!account)throw new Error('account');
  const {data:appointments,error}=await db.from('studio_appointments').select('id,user_id,client_id,starts_at,status,is_homologation').eq('user_id',userId).eq('is_homologation',false).in('status',['agendado','confirmado']).gt('starts_at',new Date(now+DAY_MS-GRACE_MS).toISOString()).lte('starts_at',new Date(now+DAY_MS).toISOString()).order('starts_at').limit(100);
  if(error)throw new Error('appointments');
  let accepted=0,skipped=0,failed=0;
  const deadline=Date.now()+240000;
  for(const a of appointments||[]) {
   if(Date.now()>deadline)break;
   if(!dueReminder(a,now)){skipped++;continue;}
   const {data:client,error:clientError}=await db.from('studio_clients').select('name,phone,whatsapp_reminder_consent_at').eq('id',a.client_id).eq('user_id',userId).maybeSingle();
   if(clientError)throw new Error('client');
   if(!client?.whatsapp_reminder_consent_at){skipped++;continue;}
   let phone:string;
   try{phone=reminderPhone(client.phone||'');}catch{skipped++;continue;}
   const scheduledFor=new Date(Date.parse(a.starts_at)-DAY_MS).toISOString();
   // Unique DB constraint is the atomic claim across parallel invocations.
   const {data:claim,error:claimError}=await db.from('studio_appointment_notifications').insert({user_id:userId,appointment_id:a.id,recipient_type:'client',notification_type:'reminder_24h',recipient_phone:phone,scheduled_for:scheduledFor,status:'processing'}).select('id').single();
   if(claimError){if(claimError.code==='23505'){skipped++;continue;}throw new Error('claim');}
   // Re-read just before transmission to skip cancellations/reschedules.
   const {data:current,error:currentError}=await db.from('studio_appointments').select('starts_at,status,is_homologation,client_id').eq('id',a.id).eq('user_id',userId).maybeSingle();
   const {data:latestClient,error:latestClientError}=await db.from('studio_clients').select('phone,whatsapp_reminder_consent_at').eq('id',a.client_id).eq('user_id',userId).maybeSingle();
   let outcome:{status:string;error_message:string|null;provider_message_id?:string;sent_at?:string};
   if(latestClientError||!latestClient?.whatsapp_reminder_consent_at||latestClient.phone!==client.phone||currentError||!current||current.starts_at!==a.starts_at||current.client_id!==a.client_id||!dueReminder(current,Date.now())) {
    outcome={status:'failed',error_message:'appointment_changed_or_unavailable'};
   }else {
    try {
     const response=await fetch(`https://graph.facebook.com/${version}/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers,body:JSON.stringify({messaging_product:'whatsapp',to:phone,type:'template',template:reminderTemplate(e.WHATSAPP_REMINDER_TEMPLATE!,language,client.name,a.starts_at)}),signal:AbortSignal.timeout(10000)});
     const result=await response.json();
     if(response.ok&&typeof result.messages?.[0]?.id==='string') {
      outcome={status:'sent',error_message:null,provider_message_id:result.messages[0].id,sent_at:new Date().toISOString()};accepted++;
     }else {outcome={status:'failed',error_message:response.ok?'unknown_delivery_state':`meta_error_${Number(result.error?.code)||response.status}`};failed++;}
    }catch {outcome={status:'failed',error_message:'unknown_delivery_state_do_not_retry'};failed++;}
   }
   const {error:saveError}=await db.from('studio_appointment_notifications').update(outcome).eq('id',claim.id).eq('status','processing');
   if(saveError)throw new Error('persist_outcome');
   // Failed/uncertain/processing claims are never automatically retried.
  }
  return Response.json({enabled:true,accepted,skipped,failed});
 }catch {console.error('WhatsApp reminder execution failed; inspect notification ledger.');return Response.json({error:'Reminder execution failed'},{status:503});}
}
