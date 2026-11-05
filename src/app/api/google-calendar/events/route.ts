import { createDecipheriv } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime='nodejs';
export const dynamic='force-dynamic';
function decrypt(ciphertext:string,secret:string){
 const key=Buffer.from(secret,'base64url');
 if(key.length!==32)throw new Error('Invalid encryption key');
 const [iv,tag,data]=ciphertext.split('.');
 if(!iv||!tag||!data)throw new Error('Invalid token payload');
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'base64url'));
 decipher.setAuthTag(Buffer.from(tag,'base64url'));
 return Buffer.concat([decipher.update(Buffer.from(data,'base64url')),decipher.final()]).toString('utf8');
}
export async function GET(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const key=process.env.GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY,clientId=process.env.GOOGLE_CALENDAR_CLIENT_ID,secret=process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
 if(!url||!anon||!key||!clientId||!secret)return NextResponse.json({error:'Configuração incompleta'},{status:503});
 const bearer=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
 if(!bearer)return NextResponse.json({error:'Autenticação necessária'},{status:401});
 const supabase=createClient(url,anon,{global:{headers:{Authorization:'Bearer '+bearer}},auth:{persistSession:false}});
 const {data:{user},error}=await supabase.auth.getUser(bearer);
 if(error||!user)return NextResponse.json({error:'Sessão inválida'},{status:401});
 const {data:connections,error:dbError}=await supabase.rpc('calendar_server_connection',{p_secret:process.env.GOOGLE_CALENDAR_DB_ACCESS_SECRET||''});
 const connection=connections?.[0];
 if(dbError)return NextResponse.json({error:'Não foi possível consultar conexão'},{status:500});
 if(!connection)return NextResponse.json({connected:false,events:[]});
 try{
  const refresh=decrypt(connection.encrypted_refresh_token,key);
  const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:secret,refresh_token:refresh,grant_type:'refresh_token'}),cache:'no-store'});
  if(!tokenResponse.ok)return NextResponse.json({connected:true,error:'Google solicitou nova autorização'},{status:502});
  const tokenData=await tokenResponse.json();
  const start=new Date();start.setDate(start.getDate()-7);
  const end=new Date();end.setDate(end.getDate()+60);
  const calendarId=encodeURIComponent(connection.calendar_id||'primary');
  const events:{id:string;start:string|undefined;end:string|undefined;allDay:boolean}[]=[];
  let pageToken:string|undefined;
  let pages=0;
  do{
   const params=new URLSearchParams({timeMin:start.toISOString(),timeMax:end.toISOString(),singleEvents:'true',orderBy:'startTime',maxResults:'250',fields:'nextPageToken,items(id,start,end,status,transparency)'});
   if(pageToken)params.set('pageToken',pageToken);
   const response=await fetch('https://www.googleapis.com/calendar/v3/calendars/'+calendarId+'/events?'+params,{headers:{Authorization:'Bearer '+tokenData.access_token},cache:'no-store'});
   if(!response.ok)return NextResponse.json({connected:true,error:'Falha ao consultar Google Agenda'},{status:502});
   const data=await response.json();
   events.push(...(data.items||[]).filter((e:{status?:string;transparency?:string})=>e.status!=='cancelled'&&e.transparency!=='transparent').map((e:{id:string;start?:{dateTime?:string;date?:string};end?:{dateTime?:string;date?:string}})=>({id:e.id,start:e.start?.dateTime||e.start?.date,end:e.end?.dateTime||e.end?.date,allDay:!!e.start?.date})));
   pageToken=data.nextPageToken;
   pages++;
  }while(pageToken&&pages<8);
  return NextResponse.json({connected:true,events,hasMore:Boolean(pageToken),readOnly:true},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({connected:true,error:'Falha ao ler agenda conectada'},{status:500})}
}
