'use client';

import { FormEvent, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Tab = 'inicio' | 'caixa' | 'agenda' | 'clientes' | 'comissoes';
export default function Home() {
  const [tab, setTab] = useState<Tab>('inicio');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function signIn(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setSessionEmail(data.user?.email ?? email);
      setMessage('Login realizado. As telas de gestão serão conectadas às tabelas na próxima etapa.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível entrar.');
    } finally { setBusy(false); }
  }

  async function signOut() {
    try { await createClient().auth.signOut(); } catch {}
    setSessionEmail(''); setMessage('Sessão encerrada.');
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id:'inicio', label:'Visão geral', icon:'◫' }, { id:'caixa', label:'Fluxo de caixa', icon:'R$' },
    { id:'agenda', label:'Agenda', icon:'▦' }, { id:'clientes', label:'Clientes', icon:'♙' },
    { id:'comissoes', label:'Comissões', icon:'%' }
  ];

  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><img src="/logo-original.png" alt="Logotipo original Edinho Chaves Tattoo" onError={e => { (e.currentTarget as HTMLImageElement).src='/logo-original.jpeg'; }} /><div className="brandText">EDINHO CHAVES<small>TATTOO · DESDE 2013</small></div></div>
      <nav>{tabs.map(t => <button key={t.id} className={tab===t.id?'nav active':'nav'} onClick={()=>setTab(t.id)}><span>{t.icon}</span>{t.label}</button>)}</nav>
      <div className="sidebarFoot">SISTEMA DE GESTÃO<br/>DO ESTÚDIO</div>
    </aside>
    <section className="content">
      <header className="top"><div><div className="eyebrow">GESTÃO DO ESTÚDIO</div><h1>{tabs.find(t=>t.id===tab)?.label}</h1></div><span className="date">{new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</span></header>
      {!sessionEmail ? <section className="login card">
        <div className="eyebrow">ACESSO SEGURO</div><h2>Entrar no sistema</h2><p className="muted">Use um usuário criado em Authentication → Users no Supabase.</p>
        <form onSubmit={signIn} className="form">
          <label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label>
          <label>Senha<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label>
          <button className="primary" disabled={busy}>{busy?'Entrando…':'Entrar'}</button>
        </form>{message&&<p className="notice">{message}</p>}
        <p className="notice">Configure as variáveis Supabase antes de entrar. Não existe senha padrão.</p>
      </section> : <>
        <div className="welcome"><div><strong>Bem-vindo ao Edinho Chaves Tattoo</strong><p>{sessionEmail}</p></div><button className="secondary" onClick={signOut}>Sair</button></div>
        {tab==='inicio' && <><div className="cards">{[['Receitas','R$ 0,00'],['Despesas','R$ 0,00'],['Saldo operacional','R$ 0,00'],['Agendamentos hoje','0']].map(c=><div className="card" key={c[0]}><span>{c[0]}</span><strong>{c[1]}</strong><small>Conecte os registros para ver os totais</small></div>)}</div><div className="card"><h2>Próximas etapas</h2><p>O login usa Supabase Auth. O próximo passo de desenvolvimento é conectar o fluxo de caixa, agenda, clientes e comissões ao banco com permissões por estúdio.</p></div></>}
        {tab!=='inicio' && <div className="card"><h2>{tabs.find(t=>t.id===tab)?.label}</h2><p>Estrutura da tela preparada. A operação ainda precisa ser ligada às tabelas e validada antes do uso com dados reais.</p><p className="notice">Não registre dados reais nesta tela enquanto o módulo estiver em construção.</p></div>}
        {message&&<p className="notice">{message}</p>}
      </>}
      <p className="footerNote">O logotipo original é mantido sem redesenho. A aplicação ainda precisa de testes de segurança e configuração de produção.</p>
    </section>
  </main>;
}
