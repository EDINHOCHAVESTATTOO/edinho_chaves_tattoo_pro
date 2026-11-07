import { createDecipheriv } from 'node:crypto';
import { NextRequest,NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime='nodejs';
function decrypt(payload:string,secret:string){const key=Buffer.from(secret,'base64url');if(key.length!==32)throw Error('invalid key');const [iv,tag,data]=payload.split('.');if(!iv||!tag||!data)throw Error('invalid payload');const d=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));d.setAuthTag(Buffer.from(tag,'base64url'));return Buffer.concat([d.update(Buffer.from(data,'base64url')),d.final()]).toString('utf8')}
export async function POST(request:NextRequest){
 if(request.headers.get('origin')!==new URL(request.url).origin)return NextResponse.json({error:'Origem não autorizada'},{status:403});
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!token)return NextResponse.json({error:'Faça login'},{status:401});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,key=process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY,client=process.env.GOOGLE_CALENDAR_CLIENT_ID,secret=process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
 if(!url||!anon||!key||!client||!secret)return NextResponse.json({error:'Configuração incompleta'},{status:503});
 const supabase=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
 const {data:{user},error}=await supabase.auth.getUser(token);
 if(error||!user)return NextResponse.json({error:'Sessão inválida'},{status:401});
 const {data:connections,error:connError}=await supabase.rpc('calendar_server_connection',{p_secret:process.env.GOOGLE_CALENDAR_DB_ACCESS_SECRET||''});
 const conn=connections?.[0];
 if(connError||!conn)return NextResponse.json({error:'Google Agenda não conectado'},{status:409});
 const dryRun=true; // Fail closed: writing is disabled until server-side token isolation and synchronization tests are complete.
 const {data:appointments,error:dbError}=await supabase.from('studio_appointments').select('id,starts_at,ends_at,status').eq('user_id',user.id).eq('status','agendado').gte('starts_at',new Date().toISOString()).lte('starts_at',new Date(Date.now()+60*86400000).toISOString()).order('starts_at').limit(100);
 if(dbError)return NextResponse.json({error:'Falha ao consultar atendimentos'},{status:500});
 try{
 const refresh=decrypt(conn.encrypted_refresh_token,key);
 const auth=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:client,client_secret:secret,refresh_token:refresh,grant_type:'refresh_token'}),cache:'no-store'});
 if(!auth.ok)return NextResponse.json({error:'Reautorize o Google Agenda'},{status:502});
 const access=(await auth.json()).access_token;
 let created=0,already=0,failed=0,conflicts=0,ready=0;
 const min=new Date(Date.now()-7*86400000).toISOString(),max=new Date(Date.now()+60*86400000).toISOString();
 const listUrl='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(conn.calendar_id||'primary')+'/events';
 const existingEvents: {id?:string;start?:{dateTime?:string;date?:string};end?:{dateTime?:string;date?:string};status?:string;transparency?:string}[]=[];
 let pageToken:string|undefined;
 do{
  const q=new URLSearchParams({timeMin:min,timeMax:max,singleEvents:'true',maxResults:'250',fields:'nextPageToken,items(id,start,end,status,transparency)'});
  if(pageToken)q.set('pageToken',pageToken);
  const res=await fetch(listUrl+'?'+q,{headers:{Authorization:'Bearer '+access},cache:'no-store'});
  if(!res.ok)return NextResponse.json({error:'Não foi possível verificar conflitos. Nenhum evento criado.'},{status:502});
  const data=await res.json();
  existingEvents.push(...(data.items||[]));pageToken=data.nextPageToken;
  if(existingEvents.length>2000)return NextResponse.json({error:'Muitos eventos para verificar com segurança. Nenhum evento criado.'},{status:409});
 }while(pageToken);
 for(const a of appointments||[]){
  if(!a.starts_at||!a.ends_at||Date.parse(a.ends_at)<=Date.parse(a.starts_at)){failed++;continue}
  const eventId='e'+a.id.replace(/-/g,'');
  if(existingEvents.some(e=>e.id===eventId&&e.status!=='cancelled')){already++;continue}
  const occupied=existingEvents.some(e=>{
   if(e.status==='cancelled'||e.transparency==='transparent'||e.id===eventId)return false;
   const start=e.start?.dateTime||e.start?.date,end=e.end?.dateTime||e.end?.date;
   return !!start&&!!end&&Date.parse(start)<Date.parse(a.ends_at)&&Date.parse(end)>Date.parse(a.starts_at);
  });
  if(occupied){conflicts++;continue}
  if(dryRun){ready++;continue}
  const endpoint=listUrl+'/'+eventId;
  const headers={Authorization:'Bearer '+access,'Content-Type':'application/json'};
  const existing=await fetch(endpoint,{headers:{Authorization:headers.Authorization},cache:'no-store'});
  if(existing.ok){already++;continue}
  if(existing.status!==404){failed++;continue}
  const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(conn.calendar_id||'primary')+'/events',{method:'POST',headers,body:JSON.stringify({id:eventId,summary:'Atendimento reservado — Edinho Chaves Tattoo',start:{dateTime:a.starts_at},end:{dateTime:a.ends_at},description:'Reserva criada no Edinho Chaves Tattoo Pro. Dados do cliente permanecem no sistema.'}),cache:'no-store'});
  if(response.ok)created++;else if(response.status===409)already++;else failed++;
 }
 return NextResponse.json({created,already,failed,conflicts,ready,dryRun,checked:(appointments||[]).length,mode:'create-only',message:'Eventos existentes não foram alterados ou excluídos.'},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Falha ao sincronizar. Nenhuma exclusão foi realizada.'},{status:500})}
}
