'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { DOCUMENT_BUCKET, normalizeRecipient, validateDocument } from '@/lib/client-documents';

type Attachment = { id: string; filename: string; storage_path: string; content_type: string; created_at: string };
export default function DocumentosCliente({ clientId, phone }: { clientId: string; phone: string }) {
  const supabase = useMemo(() => createClient(), []);
  const input = useRef<HTMLInputElement>(null);
  const requests = useRef(new Map<string, string>());
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [recipient, setRecipient] = useState(phone);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [category, setCategory] = useState('Documento do cliente');
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Entre novamente no sistema.');
      const { data, error } = await supabase.from('studio_attachments')
        .select('id,filename,storage_path,content_type,created_at').eq('user_id', user.id).eq('client_id', clientId)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).range(page * 50, page * 50 + 50);
      if (error) throw error;
      setMore((data ?? []).length > 50);
      setAttachments((data ?? []).slice(0, 50) as Attachment[]);
    } catch { setError('Não foi possível consultar os documentos. Verifique seu acesso.'); }
    finally { setLoading(false); }
  }, [supabase, clientId, page]);
  useEffect(() => { void load(); }, [load]);

  async function upload() {
    const file = input.current?.files?.[0];
    if (!file || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const extension = await validateDocument(file);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Entre novamente no sistema.');
      const { data: client, error: clientError } = await supabase.from('studio_clients').select('studio_id')
        .eq('id', clientId).eq('user_id', user.id).single();
      if (clientError || !client?.studio_id) throw new Error('O cliente precisa estar vinculado ao estúdio.');
      const path = `${user.id}/${clientId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error('Não foi possível anexar o arquivo. Confira seu acesso e o limite de 5 MB.');
      const filename = `${category} - ${file.name}`.replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 180);
      const { error: insertError } = await supabase.from('studio_attachments').insert({
        user_id: user.id, studio_id: client.studio_id, client_id: clientId, filename, storage_path: path, content_type: file.type,
      });
      if (insertError) {
        const { error: cleanupError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
        throw new Error(cleanupError ? 'O arquivo foi enviado, mas não foi possível vinculá-lo à ficha. Solicite a conferência do armazenamento antes de tentar novamente.' : 'O documento não pôde ser vinculado à ficha. Nenhum arquivo foi mantido.');
      }
      if (input.current) input.current.value = '';
      setNotice('Documento anexado à ficha com acesso privado.');
      if (page) setPage(0); else await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível anexar o documento.'); }
    finally { setBusy(false); }
  }

  async function download(attachment: Attachment) {
    setBusy(true); setError('');
    try {
      const { data, error } = await supabase.storage.from(DOCUMENT_BUCKET).download(attachment.storage_path);
      if (error || !data) throw new Error('Não foi possível baixar o documento.');
      const url = URL.createObjectURL(data);
      const link = document.createElement('a'); link.href = url; link.download = attachment.filename; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Falha ao baixar.'); }
    finally { setBusy(false); }
  }

  async function send(attachment: Attachment) {
    if (busy) return;
    setError(''); setNotice('');
    let to: string;
    try { to = normalizeRecipient(recipient); } catch (e) { setError((e as Error).message); return; }
    if (!window.confirm(`Enviar o arquivo "${attachment.filename}" para +${to} pelo WhatsApp?\n\nConfira o destinatário e se o documento pode ser compartilhado com ele. O arquivo será transmitido à Meta e ao destinatário.`)) return;
    setBusy(true);
    const key = `${attachment.id}:${to}`;
    const requestId = requests.current.get(key) ?? crypto.randomUUID();
    requests.current.set(key, requestId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Entre novamente no sistema.');
      const response = await fetch('/api/whatsapp/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ attachmentId: attachment.id, recipient: to, requestId }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.retryAllowed) requests.current.delete(key);
        throw new Error(result.error || 'Não foi possível confirmar o envio. Atualize o histórico antes de tentar novamente.');
      }
      setNotice(result.status === 'accepted' ? 'Arquivo aceito pela Meta para envio. A entrega será atualizada no histórico do WhatsApp.' : 'Este envio já está registrado. Consulte o histórico do WhatsApp.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível confirmar o envio. Confira o histórico antes de reenviar.'); }
    finally { setBusy(false); }
  }

  return <section className="card" style={{ marginTop: 24 }} aria-label="Documentos do cliente">
    <h3>Documentos do cliente e do responsável</h3>
    <p className="muted">Anexe documentos e autorizações em PDF, JPG, PNG ou WebP, até 5 MB. Para anexar um termo gerado no sistema, use “Imprimir / Salvar em PDF” no termo e selecione o PDF salvo abaixo.</p>
    <div className="form" style={{ maxWidth: 650 }}>
      <label>Tipo de documento<select value={category} onChange={e => setCategory(e.target.value)} disabled={busy}>{['Documento do cliente', 'Documento do responsável', 'Comprovante de vínculo', 'Autorização assinada', 'Termo de consentimento', 'Outro documento'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Arquivo<input ref={input} type="file" accept="application/pdf,image/jpeg,image/png,image/webp" disabled={busy} /></label>
      <button className="primary" type="button" disabled={busy} onClick={() => void upload()}>{busy ? 'Aguarde…' : 'Anexar à ficha'}</button>
      <label>WhatsApp do destinatário (com DDI)<input type="tel" value={recipient} maxLength={30} placeholder="+55 51…" onChange={e => setRecipient(e.target.value)} disabled={busy} /></label>
      <p className="notice">Para documentos de menores, confira se o destinatário é o responsável correto. O envio depende da disponibilidade da conta e das regras de atendimento do WhatsApp. WebP pode ser guardado na ficha; para enviar, use PDF, JPG ou PNG.</p>
    </div>
    {error && <p className="notice" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
    {loading ? <p>Carregando documentos…</p> : <>
      {!attachments.length && <p className="muted">Nenhum documento anexado nesta página.</p>}
      <ul style={{ paddingLeft: 20 }}>{attachments.map(attachment => <li key={attachment.id} style={{ margin: '18px 0', overflowWrap: 'anywhere' }}>
        <strong>{attachment.filename}</strong><div className="muted">{new Date(attachment.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}><button className="secondary" disabled={busy} onClick={() => void download(attachment)}>Baixar</button><button className="secondary" disabled={busy || attachment.content_type === 'image/webp'} onClick={() => void send(attachment)}>Enviar pelo WhatsApp</button></div>
      </li>)}</ul>
      <div className="whatsapp-pages"><button className="secondary" disabled={busy || !page} onClick={() => setPage(p => p - 1)}>Anterior</button><span>Página {page + 1}</span><button className="secondary" disabled={busy || !more} onClick={() => setPage(p => p + 1)}>Próxima</button></div>
    </>}
  </section>;
}
