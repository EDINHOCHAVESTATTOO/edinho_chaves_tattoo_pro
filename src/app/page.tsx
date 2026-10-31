'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase';
import FluxoCaixa from './FluxoCaixa';
import AgendaEstudio from './AgendaEstudio';
import ComissoesEstudio from './ComissoesEstudio';
import VisaoGeral from './VisaoGeral';
import ClientesEstudio from './ClientesEstudio';
type Tab = 'inicio' | 'caixa' | 'agenda' | 'clientes' | 'comissoes';

export default function Home() {
  const [tab, setTab] = useState<Tab>('inicio');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [clienteParaAbrir, setClienteParaAbrir] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.slice(1));
    const recoveryLink = url.searchParams.get('type') === 'recovery' ||
      hash.get('type') === 'recovery' ||
      url.searchParams.has('token_hash') ||
      url.searchParams.has('code') ||
      hash.has('access_token');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryMode(true);
        setRecoveryReady(true);
        setMessage('Digite sua nova senha.');
      } else if (event === 'SIGNED_OUT') {
        setSessionEmail('');
      }
    });

    async function authorizeUser(userId: string) {
      const { data, error } = await supabase.from('profiles').select('id,studio_id').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (!data?.studio_id) throw new Error('Sua conta ainda não foi autorizada para acessar o estúdio.');
    }

    async function initialize() {
      try {
        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const code = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active) return;
        if (recoveryLink) {
          if (!session) throw new Error('Link inválido ou expirado. Solicite um novo e-mail de recuperação.');
          setRecoveryMode(true);
          setRecoveryReady(true);
          setMessage('Digite sua nova senha.');
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          if (session?.user) {
            await authorizeUser(session.user.id);
          }
          setSessionEmail(session?.user.email ?? '');
        }
      } catch (err) {
        if (!active) return;
        if (recoveryLink) {
          setRecoveryMode(true);
          setRecoveryReady(false);
        }
        setMessage(err instanceof Error ? err.message : 'Não foi possível validar a sessão.');
      } finally {
        if (active) setCheckingSession(false);
      }
    }
    void initialize();
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function updatePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!recoveryReady) return;
    setBusy(true);
    setMessage('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      await supabase.auth.signOut();
      setRecoveryMode(false);
      setRecoveryReady(false);
      setNewPassword('');
      setPassword('');
      setSessionEmail('');
      setMessage('Senha alterada com sucesso! Entre com sua nova senha.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível alterar a senha.');
    } finally { setBusy(false); }
  }

  async function signIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: profile, error: profileError } = await supabase.from('profiles').select('studio_id').eq('id', data.user.id).maybeSingle();
      if (profileError || !profile?.studio_id) {
        await supabase.auth.signOut();
        throw new Error('Conta autenticada, mas sem vínculo com o estúdio. É necessário autorizar este usuário no Supabase.');
      }
      setSessionEmail(data.user?.email ?? email);
      setMessage('Login realizado com sucesso.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    try { await createClient().auth.signOut(); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'Não foi possível sair.'); return; }
    setSessionEmail('');
    setMessage('Sessão encerrada.');
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'inicio', label: 'Visão geral', icon: '◫' },
    { id: 'caixa', label: 'Fluxo de caixa', icon: 'R$' },
    { id: 'agenda', label: 'Agenda', icon: '▦' },
    { id: 'clientes', label: 'Clientes', icon: '♙' },
    { id: 'comissoes', label: 'Comissões', icon: '%' },
  ];

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-original.png" alt="Logotipo original Edinho Chaves Tattoo" onError={e => {
          const img = e.currentTarget;
          if (!img.src.endsWith('.jpeg')) img.src = '/logo-original.jpeg';
        }} />
        <div className="brandText">EDINHO CHAVES<small>TATTOO · DESDE 2013</small></div>
      </div>
      <nav>{tabs.map(t => <button key={t.id} className={tab === t.id ? 'nav active' : 'nav'} onClick={() => setTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}</nav>
      <div className="sidebarFoot">SISTEMA DE GESTÃO<br />DO ESTÚDIO</div>
    </aside>
    <section className="content">
      <header className="top"><div><div className="eyebrow">GESTÃO DO ESTÚDIO</div><h1>{tabs.find(t => t.id === tab)?.label}</h1></div><span className="date">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></header>
      {checkingSession ? <section className="login card" role="status"><h2>Verificando acesso…</h2><p className="muted">Aguarde enquanto validamos sua sessão.</p></section> : recoveryMode ? <section className="login card">
        <div className="eyebrow">ACESSO SEGURO</div>
        <h2>Cadastrar nova senha</h2>
        <p className="muted">Escolha uma nova senha para acessar o sistema.</p>
        {recoveryReady && <form onSubmit={updatePassword} className="form">
          <label>Nova senha<input type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoComplete="new-password" /></label>
          <button className="primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>}
        {message && <p className="notice">{message}</p>}
      </section> : !sessionEmail ? <section className="login card">
        <div className="eyebrow">ACESSO SEGURO</div><h2>Entrar no sistema</h2>
        <p className="muted">Acesso exclusivo ao Edinho e à equipe autorizada do estúdio.</p>
        <form onSubmit={signIn} className="form">
          <label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" /></label>
          <label>Senha<input type="password" required value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></label>
          <button className="primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
        </form>
        {message && <p className="notice">{message}</p>}
        <p className="notice">Não possui acesso? Solicite ao responsável pelo estúdio.</p>
      </section> : <>
        <div className="welcome"><div><strong>Bem-vindo ao Edinho Chaves Tattoo</strong><p>{sessionEmail}</p></div><button className="secondary" onClick={signOut}>Sair</button></div>
        {tab === 'inicio' && (
  <VisaoGeral
    onOpenClient={(clientId) => {
      setClienteParaAbrir(clientId);
      setTab('clientes');
    }}
  />
)}
        {tab === 'clientes' && (
  <ClientesEstudio clienteParaAbrir={clienteParaAbrir} />
)}
        {tab === 'caixa' && <FluxoCaixa />}{tab === 'agenda' && <AgendaEstudio />}{tab === 'comissoes' && <ComissoesEstudio />}{tab !== 'inicio' && tab !== 'caixa' && tab !== 'agenda' && tab !== 'comissoes'&& tab !== 'clientes' && <div className="card"><h2>{tabs.find(t => t.id === tab)?.label}</h2><p>Estrutura da tela preparada. A operação ainda precisa ser ligada às tabelas e validada antes do uso com dados reais.</p><p className="notice">Não registre dados reais nesta tela enquanto o módulo estiver em construção.</p></div>}
        {message && <p className="notice">{message}</p>}
        </>}
      <p className="footerNote">Edinho Chaves Tattoo · Sistema interno de gestão do estúdio.</p>
    </section>
  </main>;
}