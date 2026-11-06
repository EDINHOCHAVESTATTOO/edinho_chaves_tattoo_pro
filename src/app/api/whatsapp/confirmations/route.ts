import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalize=(v:string)=>{const d=v.replace(/\D/g,'');return d.startsWith('55')?d:`55${d}`;};
const reply=(error:string,status:number)=>NextResponse.json({error},{status});

export async function POST(request:Request){
 const authorization=request.headers.get('authorization');
 if(!authorization?.startsWith('Bearer '))return reply('Entre novamente no sistema.',401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, publicKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 const secretKey=process.env.SUPABASE_SECRET_KEY, accessToken=process.env.WHATSAPP_ACCESS_TOKEN;
 const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID, version=process.env.WHATSAPP_GRAPH_VERSION||'v26.0';
 if(!url||!publicKey||!secretKey||!accessToken||!phoneId)return reply('O envio pelo WhatsApp ainda não está configurado no servidor.',503);
 const userClient=createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error:authError}=await userClient.auth.getUser(authorization.slice(7));
 if(authError||!user)return reply('Sessão inválida ou expirada.',401);
 let body:{appointmentId:string;recipientType:'client'|'professional';requestId:string};
 try{const v=await request.json();if(!uuid.test(v.appointmentId)||!uuid.test(v.requestId)||!['client','professional'].includes(v.recipientType))throw new Error();body=v;}catch{return reply('Pedido inválido.',400);}
 const {data:a,error:aError}=await userClient.from('studio_appointments').select('id,client_id,professional_id,procedure_name,starts_at,status').eq('id',body.appointmentId).eq('user_id',user.id).maybeSingle();
 if(aError||!a)return reply('Agendamento não encontrado.',404);
 const table=body.recipientType==='client'?'studio_clients':'studio_professionals';
 const id=body.recipientType==='client'?a.client_id:a.professional_id;
 const {data:person,error:pError}=await userClient.from(table).select('name,phone').eq('id',id).eq('user_id',user.id).maybeSingle();
 if(pError||!person)return reply('Destinatário não encontrado.',404);
 if(!person.phone)return reply(body.recipientType==='client'?'Cliente sem WhatsApp cadastrado.':'Profissional sem WhatsApp cadastrado.',400);
 const recipient=normalize(person.phone);if(!/^55\d{10,11}$/.test(recipient))return reply('Número de WhatsApp inválido.',400);
 const admin=createClient(url,secretKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:account}=await admin.from('whatsapp_accounts').select('phone_number_id').eq('user_id',user.id).eq('phone_number_id',phoneId).maybeSingle();
 if(!account)return reply('A conta WhatsApp não está vinculada ao usuário.',403);
 const {data:previous}=await admin.from('whatsapp_messages').select('status').eq('id',body.requestId).eq('user_id',user.id).maybeSingle();
 if(previous)return NextResponse.json({status:previous.status,duplicate:true});
 const {data:conversation,error:cError}=await admin.from('whatsapp_conversations').upsert({user_id:user.id,phone:recipient,contact_name:person.name,updated_at:new Date().toISOString()},{onConflict:'user_id,phone'}).select('id').single();
 if(cError||!conversation)return reply('Não foi possível registrar a conversa.',503);
 const {data:lastIncoming}=await admin.from('whatsapp_messages').select('created_at').eq('user_id',user.id).eq('conversation_id',conversation.id).eq('direction','incoming').order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(!lastIncoming||Date.now()-new Date(lastIncoming.created_at).getTime()>24*60*60*1000)return reply('A janela de 24 horas do WhatsApp está fechada para este contato. É necessário um modelo de mensagem aprovado pela Meta para enviar a confirmação automaticamente.',409);
 const when=new Date(a.starts_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
 const text=body.recipientType==='client'
  ?`Olá, ${person.name}! Confirmamos seu horário no Edinho Chaves Tattoo para ${when}. Procedimento: ${a.procedure_name}. Se precisar alterar, responda esta mensagem.`
  :`Olá, ${person.name}! Agendamento confirmado para ${when}. Procedimento: ${a.procedure_name}. Cliente vinculado ao atendimento no sistema Edinho Chaves Tattoo Pro.`;
 const {error:reserve}=await admin.from('whatsapp_messages').insert({id:body.requestId,user_id:user.id,conversation_id:conversation.id,whatsapp_message_id:`outbox:${user.id}:${body.requestId}`,direction:'outgoing',message_type:'text',message_text:text,status:'queued'});
 if(reserve)return reply(reserve.code==='23505'?'Este envio já está sendo processado.':'Não foi possível registrar o envio.',reserve.code==='23505'?409:503);
 let started=false,knownFailure=false;
 try{
  started=true;
  const res=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:recipient,type:'text',text:{preview_url:false,body:text}}),signal:AbortSignal.timeout(20000)});
  const result=await res.json();if(!res.ok){knownFailure=true;throw new Error(String(result?.error?.code||'META'));}
  const mid=result?.messages?.[0]?.id;if(typeof mid!=='string')throw new Error('UNCONFIRMED');
  await admin.from('whatsapp_messages').update({whatsapp_message_id:mid,status:'accepted'}).eq('id',body.requestId).eq('user_id',user.id);
  return NextResponse.json({status:'accepted'});
 }catch(e){
  await admin.from('whatsapp_messages').update({status:started&&!knownFailure?'unknown':'failed'}).eq('id',body.requestId).eq('user_id',user.id);
  return reply(started&&!knownFailure?'O envio pode ter ocorrido, mas não foi possível confirmar. Confira o histórico antes de reenviar.':'A Meta recusou o envio. Confira a janela de atendimento, o número e a configuração da conta.',502);
 }
}
