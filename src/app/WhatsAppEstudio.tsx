'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Conversation = { id: string; phone: string; contact_name: string | null; updated_at: string };
type Message = { id: string; direction: string; message_type: string; message_text: string | null; status: string; created_at: string };
const PAGE_SIZE = 50;
const dateTime = (value: string) => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
const mediaLabels: Record<string, string> = { reaction: 'Reação recebida', image: 'Imagem', audio: 'Áudio', video: 'Vídeo', document: 'Documento', sticker: 'Figurinha', location: 'Localização', contacts: 'Contato' };

export default function WhatsAppEstudio() {
  const supabase = useMemo(() => createClient(), []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState('');
  const [conversationPage, setConversationPage] = useState(0);
  const [messagePage, setMessagePage] = useState(0);
  const [moreConversations, setMoreConversations] = useState(false);
  const [moreMessages, setMoreMessages] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversationError, setConversationError] = useState('');
  const [messageError, setMessageError] = useState('');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoadingConversations(true);
    setConversationError('');
    setConversations([]);
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Sessão expirada. Entre novamente.');
        const start = conversationPage * PAGE_SIZE;
        const { data, error } = await supabase.from('whatsapp_conversations')
          .select('id,phone,contact_name,updated_at').eq('user_id', user.id)
          .order('updated_at', { ascending: false }).order('id', { ascending: false })
          .range(start, start + PAGE_SIZE).abortSignal(controller.signal);
        if (error) throw error;
        if (!active) return;
        const rows = (data ?? []) as Conversation[];
        setMoreConversations(rows.length > PAGE_SIZE);
        setConversations(rows.slice(0, PAGE_SIZE));
        setSelectedId(previous => rows.slice(0, PAGE_SIZE).some(row => row.id === previous) ? previous : null);
      } catch {
        if (active) setConversationError('Não foi possível carregar as conversas. Verifique sua sessão e tente atualizar.');
      } finally { if (active) setLoadingConversations(false); }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [supabase, conversationPage, revision]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setMessages([]);
    setMoreMessages(false);
    setMessageError('');
    setLoadingMessages(Boolean(selectedId));
    if (!selectedId) return () => { active = false; controller.abort(); };
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Sessão expirada.');
        const start = messagePage * PAGE_SIZE;
        const { data, error } = await supabase.from('whatsapp_messages')
          .select('id,direction,message_type,message_text,status,created_at')
          .eq('user_id', user.id).eq('conversation_id', selectedId)
          .order('created_at', { ascending: false }).order('id', { ascending: false })
          .range(start, start + PAGE_SIZE).abortSignal(controller.signal);
        if (error) throw error;
        if (!active) return;
        const rows = (data ?? []) as Message[];
        setMoreMessages(rows.length > PAGE_SIZE);
        setMessages(rows.slice(0, PAGE_SIZE).reverse());
      } catch {
        if (active) setMessageError('Não foi possível carregar as mensagens. Tente atualizar.');
      } finally { if (active) setLoadingMessages(false); }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [supabase, selectedId, messagePage, revision]);

  const selected = conversations.find(row => row.id === selectedId);
  const filtered = conversations.filter(row => `${row.contact_name ?? ''} ${row.phone}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  function refresh() { setMessagePage(0); setRevision(value => value + 1); }
  function changeConversationPage(page: number) { setSelectedId(null); setMessagePage(0); setConversationPage(page); }

  return <section className="card whatsapp-inbox" aria-label="Conversas do WhatsApp">
    <div className="whatsapp-heading">
      <div><h2>WhatsApp do estúdio</h2><p className="muted">Consulte as mensagens recebidas. Respostas continuam pelo aplicativo WhatsApp Business.</p></div>
      <button className="secondary" type="button" onClick={refresh} disabled={loadingConversations || loadingMessages}>Atualizar mensagens</button>
    </div>
    {conversationError && <p role="alert" className="notice">{conversationError}</p>}
    <div className="whatsapp-columns">
      <aside aria-label="Lista de conversas">
        <label className="whatsapp-search">Buscar nesta página<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nome ou telefone" /></label>
        {loadingConversations ? <p role="status">Carregando conversas…</p> : <>
          {filtered.length === 0 && <p className="muted">{conversations.length ? 'Nenhuma conversa corresponde à busca nesta página.' : 'Nenhuma conversa recebida nesta página.'}</p>}
          <div className="whatsapp-conversations">{filtered.map(row => <button className={selectedId === row.id ? 'whatsapp-contact selected' : 'whatsapp-contact'} key={row.id} type="button" aria-pressed={selectedId === row.id} onClick={() => { setMessagePage(0); setSelectedId(row.id); }}>
            <strong>{row.contact_name || row.phone}</strong><span>{row.phone}</span><small>Última atividade: {dateTime(row.updated_at)}</small>
          </button>)}</div>
          <div className="whatsapp-pages"><button className="secondary" disabled={conversationPage === 0} onClick={() => changeConversationPage(conversationPage - 1)}>Anterior</button><span>Página {conversationPage + 1}</span><button className="secondary" disabled={!moreConversations} onClick={() => changeConversationPage(conversationPage + 1)}>Próxima</button></div>
        </>}
      </aside>
      <section className="whatsapp-thread" aria-label="Histórico da conversa" aria-busy={loadingMessages}>
        {!selected ? <p className="muted">Selecione uma conversa para ver as mensagens.</p> : <>
          <h3>{selected.contact_name || selected.phone}</h3><p className="muted">{selected.phone} · Horários de Brasília</p>
          {messageError && <p role="alert" className="notice">{messageError}</p>}
          {loadingMessages ? <p role="status">Carregando mensagens…</p> : <>
            <div className="whatsapp-messages">{messages.length === 0 && !messageError && <p className="muted">Nenhuma mensagem registrada nesta página.</p>}{messages.map(message => <article key={message.id} className={`whatsapp-message ${message.direction === 'outgoing' ? 'outgoing' : ''}`}>
              <small>{message.direction === 'outgoing' ? 'Enviada pelo estúdio' : 'Recebida'}</small>
              <p>{message.message_type === 'text' ? (message.message_text || '(Mensagem sem texto)') : `${mediaLabels[message.message_type] || 'Mensagem de outro formato'} · conteúdo não disponível nesta tela`}</p>
              <time dateTime={message.created_at}>{dateTime(message.created_at)}</time>
            </article>)}</div>
            <div className="whatsapp-pages"><button className="secondary" disabled={!moreMessages} onClick={() => setMessagePage(value => value + 1)}>Mais antigas</button><span>Página {messagePage + 1}</span><button className="secondary" disabled={messagePage === 0} onClick={() => setMessagePage(value => value - 1)}>Mais recentes</button></div>
          </>}
        </>}
      </section>
    </div>
  </section>;
}
