import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DOCUMENT_BUCKET, normalizeRecipient, validateDocument } from '@/lib/client-documents';

export const runtime = 'nodejs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function metaRejection(stage: 'media' | 'message', status: number, value: unknown): Error {
  const payload = value && typeof value === 'object' ? value as { error?: { code?: unknown; error_subcode?: unknown } } : {};
  const code = typeof payload.error?.code === 'number' ? payload.error.code : 0;
  const subcode = typeof payload.error?.error_subcode === 'number' ? payload.error.error_subcode : 0;
  console.warn('WhatsApp: arquivo recusado pela Meta', { stage, status, code, subcode });
  return new Error(`META_${code}`);
}
const reply = (error: string, status: number, retryAllowed = false) => NextResponse.json({ error, retryAllowed }, { status });

export async function POST(request: Request) {
  // A bearer token is required; cookies alone cannot trigger a transmission.
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return reply('Entre novamente no sistema.', 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_GRAPH_VERSION || 'v26.0';
  if (!url || !publicKey || !secretKey || !accessToken || !phoneId || !/^\d+$/.test(phoneId) || !/^v\d+\.0$/.test(version))
    return reply('O envio de documentos ainda não está configurado no servidor.', 503);

  const userClient = createClient(url, publicKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: authError } = await userClient.auth.getUser(authorization.slice(7));
  if (authError || !user) return reply('Sessão inválida ou expirada.', 401);
  let body: { attachmentId: string; recipient: string; requestId: string };
  try {
    if (Number(request.headers.get('content-length')) > 8192) return reply('Pedido inválido.', 400);
    const raw = await request.text();
    if (raw.length > 8192) return reply('Pedido inválido.', 400);
    const value = JSON.parse(raw);
    if (!value || typeof value.attachmentId !== 'string' || !uuid.test(value.attachmentId) || typeof value.requestId !== 'string' || !uuid.test(value.requestId) || typeof value.recipient !== 'string' || value.recipient.length > 30)
      return reply('Documento e destinatário inválidos.', 400);
    body = { attachmentId: value.attachmentId, recipient: normalizeRecipient(value.recipient), requestId: value.requestId };
  } catch { return reply('Documento e destinatário inválidos.', 400); }

  // The public client enforces the existing owner/studio RLS policies before
  // any privileged query or external transmission is attempted.
  const { data: attachment, error: attachmentError } = await userClient.from('studio_attachments')
    .select('id,client_id,filename,storage_path,content_type').eq('id', body.attachmentId).eq('user_id', user.id).maybeSingle();
  if (attachmentError) return reply('Não foi possível consultar o documento.', 403);
  if (!attachment || !attachment.storage_path.startsWith(`${user.id}/${attachment.client_id}/`)) return reply('Documento não encontrado.', 404);
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(attachment.content_type)) return reply('Para enviar pelo WhatsApp, use PDF, JPG ou PNG.', 400);

  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: account, error: accountError } = await admin.from('whatsapp_accounts').select('phone_number_id')
    .eq('user_id', user.id).eq('phone_number_id', phoneId).maybeSingle();
  if (accountError || !account) return reply('A conta WhatsApp não está vinculada ao usuário.', 403);

  const { data: previous, error: previousError } = await admin.from('whatsapp_messages').select('status')
    .eq('id', body.requestId).eq('user_id', user.id).maybeSingle();
  if (previousError) return reply('Não foi possível verificar o histórico de envio.', 503);
  if (previous) return previous.status === 'failed'
    ? reply('A tentativa anterior falhou. Confira o histórico antes de iniciar outro envio.', 409, true)
    : NextResponse.json({ status: previous.status, duplicate: true });
  const { count, error: limitError } = await admin.from('whatsapp_messages').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('direction', 'outgoing').gte('created_at', new Date(Date.now() - 60000).toISOString());
  if (limitError) return reply('Não foi possível verificar o limite de envios.', 503);
  if ((count ?? 0) >= 10) return reply('Aguarde um minuto antes de enviar mais arquivos.', 429, true);

  const { data: file, error: downloadError } = await userClient.storage.from(DOCUMENT_BUCKET).download(attachment.storage_path);
  if (downloadError || !file) return reply('Não foi possível acessar o arquivo privado.', 403);
  try { await validateDocument(new Blob([file], { type: attachment.content_type })); }
  catch { return reply('O arquivo não é válido ou supera o limite de 5 MB.', 400); }

  const { data: conversation, error: conversationError } = await admin.from('whatsapp_conversations')
    .upsert({ user_id: user.id, phone: body.recipient, updated_at: new Date().toISOString() }, { onConflict: 'user_id,phone' }).select('id').single();
  if (conversationError || !conversation) return reply('Não foi possível registrar a conversa.', 503);
  const filename = String(attachment.filename).replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 180);
  const messageType = attachment.content_type === 'application/pdf' ? 'document' : 'image';
  // Reserve a unique request before contacting Meta. Retries with the same ID
  // cannot transmit again, including when a prior HTTP response was lost.
  const { error: reserveError } = await admin.from('whatsapp_messages').insert({
    id: body.requestId, user_id: user.id, conversation_id: conversation.id,
    whatsapp_message_id: `outbox:${user.id}:${body.requestId}`, direction: 'outgoing',
    message_type: messageType, message_text: filename, status: 'queued',
  });
  if (reserveError) return reply(reserveError.code === '23505' ? 'Este envio já está sendo processado. Confira o histórico.' : 'Não foi possível registrar o envio.', reserveError.code === '23505' ? 409 : 503);

  let sendStarted = false;
  let knownFailure = false;
  let acceptedId: string | null = null;
  try {
    const form = new FormData();
    form.set('messaging_product', 'whatsapp');
    form.set('type', attachment.content_type);
    form.set('file', new Blob([file], { type: attachment.content_type }), filename);
    const mediaResponse = await fetch(`https://graph.facebook.com/${version}/${phoneId}/media`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form, signal: AbortSignal.timeout(20000),
    });
    const media = await mediaResponse.json();
    if (!mediaResponse.ok || typeof media.id !== 'string') { knownFailure = true; throw metaRejection('media', mediaResponse.status, media); }
    const payload = messageType === 'document' ? { id: media.id, filename } : { id: media.id, caption: filename };
    sendStarted = true;
    const sendResponse = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: body.recipient, type: messageType, [messageType]: payload }), signal: AbortSignal.timeout(20000),
    });
    const result = await sendResponse.json();
    if (!sendResponse.ok) {
      knownFailure = true;
      throw metaRejection('message', sendResponse.status, result);
    }
    if (typeof result.messages?.[0]?.id !== 'string') throw new Error('UNCONFIRMED');
    acceptedId = result.messages[0].id;
    const { error: saveError } = await admin.from('whatsapp_messages').update({ whatsapp_message_id: acceptedId, status: 'accepted' })
      .eq('id', body.requestId).eq('user_id', user.id);
    if (saveError) throw new Error('SAVE_FAILED');
    return NextResponse.json({ status: 'accepted' });
  } catch (e) {
    const uncertain = sendStarted && !knownFailure;
    const values = { status: uncertain ? 'unknown' : 'failed', ...(acceptedId ? { whatsapp_message_id: acceptedId } : {}) };
    const { error: recordError } = await admin.from('whatsapp_messages').update(values).eq('id', body.requestId).eq('user_id', user.id);
    // Log only the phase. Never log file contents, contact data or Meta tokens.
    if (recordError) console.error('WhatsApp: falha ao atualizar registro de envio de arquivo');
    if (uncertain) return reply('O envio pode ter ocorrido, mas não foi possível confirmar. Confira o histórico e o WhatsApp antes de reenviar.', 502);
    const code = e instanceof Error ? e.message : '';
    const message = code === 'META_190' ? 'O token de acesso do WhatsApp está inválido ou expirou. Atualize a credencial do servidor antes de tentar novamente.'
      : ['META_10', 'META_200'].includes(code) ? 'A credencial do servidor não tem permissão para enviar pela conta WhatsApp configurada.'
      : code === 'META_131047' ? 'A janela de atendimento do WhatsApp encerrou. Peça ao destinatário que envie uma nova mensagem antes de tentar novamente.'
      : code === 'META_131030' ? 'A conta está em modo de teste e este destinatário não está autorizado na Meta.'
      : code === 'META_131026' ? 'A Meta não conseguiu entregar para este destinatário. Confira o número e se ele usa WhatsApp.'
      : 'Não foi possível concluir o envio. Confira a configuração da conta e a janela de atendimento antes de tentar novamente.';
    return reply(message, 502, true);
  }
}
