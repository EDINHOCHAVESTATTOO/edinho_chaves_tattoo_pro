'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase';

type Cliente = { id: string; user_id: string; name: string; phone: string; notes: string; created_at: string };
type Agendamento = { id: string; client_id: string; procedure_name: string; starts_at: string; price: number; status: string; professional_id: string | null };
type Pagamento = { id: string; appointment_id: string; amount: number; payment_type: string; paid_on: string };
const moeda = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const dataHora = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function ClientesEstudio() {
  const supabase = useMemo(() => createClient(), []);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [notas, setNotas] = useState('');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [profissionais, setProfissionais] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setErro('Entre novamente no sistema.'); setCarregando(false); return; }
    const { data, error } = await supabase.from('studio_clients')
      .select('id,user_id,name,phone,notes,created_at').eq('user_id', user.id).order('name');
    if (error) setErro(error.message);
    else setClientes((data ?? []) as Cliente[]);
    setCarregando(false);
  }, [supabase]);

  useEffect(() => { void carregar(); }, [carregar]);

  useEffect(() => {
    if (!selecionado) { setAgendamentos([]); setPagamentos([]); return; }
    let ativo = true;
    async function buscarHistorico() {
      setCarregandoHistorico(true); setErro('');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) { if (ativo) { setErro('Entre novamente no sistema.'); setCarregandoHistorico(false); } return; }
      const { data: agenda, error: agendaError } = await supabase.from('studio_appointments')
        .select('id,client_id,procedure_name,starts_at,price,status,professional_id')
        .eq('user_id', user.id).eq('client_id', selecionado).order('starts_at', { ascending: false });
      if (!ativo) return;
      if (agendaError) { setErro(agendaError.message); setCarregandoHistorico(false); return; }
      const lista = (agenda ?? []) as Agendamento[];
      setAgendamentos(lista);
      const ids = lista.map(a => a.id);
      if (ids.length) {
        const [resultadoPagamentos, resultadoProfissionais] = await Promise.all([
          supabase.from('studio_payments').select('id,appointment_id,amount,payment_type,paid_on').eq('user_id', user.id).in('appointment_id', ids),
          supabase.from('studio_professionals').select('id,name').eq('user_id', user.id),
        ]);
        if (!ativo) return;
        if (resultadoPagamentos.error) setErro(resultadoPagamentos.error.message);
        else setPagamentos((resultadoPagamentos.data ?? []) as Pagamento[]);
        if (resultadoProfissionais.error) setErro(resultadoProfissionais.error.message);
        else setProfissionais(Object.fromEntries((resultadoProfissionais.data ?? []).map(p => [p.id, p.name])));
      } else { setPagamentos([]); }
      setCarregandoHistorico(false);
    }
    void buscarHistorico();
    return () => { ativo = false; };
  }, [selecionado, supabase]);

  function novo() { setEditando(null); setNome(''); setTelefone(''); setNotas(''); setAviso(''); }
  function editar(c: Cliente) { setEditando(c.id); setNome(c.name); setTelefone(c.phone); setNotas(c.notes); setAviso(''); }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErro(''); setAviso('');
    if (!nome.trim() || !telefone.trim()) { setErro('Preencha nome e telefone.'); return; }
    setSalvando(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) { setErro('Entre novamente no sistema.'); setSalvando(false); return; }
    const valores = { name: nome.trim(), phone: telefone.trim(), notes: notas.trim() };
    const resultado = editando
      ? await supabase.from('studio_clients').update(valores).eq('id', editando).eq('user_id', user.id)
      : await supabase.from('studio_clients').insert({ ...valores, user_id: user.id });
    if (resultado.error) setErro(resultado.error.message);
    else { setAviso(editando ? 'Cadastro atualizado.' : 'Cliente cadastrado.'); novo(); setAviso(editando ? 'Cadastro atualizado.' : 'Cliente cadastrado.'); await carregar(); }
    setSalvando(false);
  }

  const filtrados = clientes.filter(c => `${c.name} ${c.phone}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));
  const clienteAtual = clientes.find(c => c.id === selecionado);
  const estiloInput = { width: '100%', padding: 11, background: '#101010', color: '#fff', border: '1px solid #64502c', borderRadius: 7 };
  const botao = { padding: '10px 15px', borderRadius: 7, border: '1px solid #80642c', background: '#222', color: '#f3d17a', cursor: 'pointer' };

  return <div style={{ display: 'grid', gap: 18 }}>
    <section className="card">
      <h2>{editando ? 'Editar cliente' : 'Novo cliente'}</h2>
      <form onSubmit={salvar} style={{ display: 'grid', gap: 12, maxWidth: 700 }}>
        <label>Nome completo<input style={estiloInput} value={nome} onChange={e => setNome(e.target.value)} required maxLength={150} /></label>
        <label>Telefone / WhatsApp<input style={estiloInput} value={telefone} onChange={e => setTelefone(e.target.value)} required maxLength={40} inputMode="tel" /></label>
        <label>Observações<textarea style={estiloInput} value={notas} onChange={e => setNotas(e.target.value)} rows={3} maxLength={5000} /></label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="primary" disabled={salvando} type="submit">{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar cliente'}</button>
          {editando && <button style={botao} type="button" onClick={novo}>Cancelar edição</button>}
        </div>
      </form>
      {aviso && <p className="notice" role="status">{aviso}</p>}
      {erro && <p className="notice" role="alert">{erro}</p>}
    </section>
    <section className="card">
      <h2>Clientes cadastrados ({clientes.length})</h2>
      <input aria-label="Pesquisar clientes" style={{ ...estiloInput, maxWidth: 500 }} placeholder="Buscar por nome ou telefone" value={busca} onChange={e => setBusca(e.target.value)} />
      {carregando ? <p>Carregando clientes…</p> : filtrados.length === 0 ? <p>Nenhum cliente encontrado.</p> :
        <div style={{ overflowX: 'auto', marginTop: 16 }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Nome', 'Telefone', 'Ações'].map(t => <th key={t} style={{ textAlign: 'left', padding: 10, color: '#e0b348', borderBottom: '1px solid #68522d' }}>{t}</th>)}</tr></thead>
          <tbody>{filtrados.map(c => <tr key={c.id}>
            <td style={{ padding: 10, borderBottom: '1px solid #333' }}>{c.name}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #333' }}>{c.phone}</td>
            <td style={{ padding: 10, borderBottom: '1px solid #333' }}><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button style={botao} type="button" onClick={() => setSelecionado(selecionado === c.id ? null : c.id)}>{selecionado === c.id ? 'Fechar ficha' : 'Ver ficha'}</button>
              <button style={botao} type="button" onClick={() => editar(c)}>Editar</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    </section>
    {clienteAtual && <section className="card">
      <h2>Ficha de {clienteAtual.name}</h2>
      <p><strong>Telefone:</strong> {clienteAtual.phone}</p>
      <p><strong>Observações:</strong> {clienteAtual.notes || 'Nenhuma observação.'}</p>
      <h3>Histórico de atendimentos</h3>
      {carregandoHistorico ? <p>Carregando histórico…</p> : agendamentos.length === 0 ? <p>Este cliente ainda não tem agendamentos registrados.</p> :
        <div style={{ display: 'grid', gap: 10 }}>
          {agendamentos.map(a => {
            const pagos = pagamentos.filter(p => p.appointment_id === a.id);
            const recebido = pagos.reduce((s, p) => s + Number(p.amount), 0);
            return <div key={a.id} style={{ border: '1px solid #3c3529', borderRadius: 8, padding: 14 }}>
              <strong>{a.procedure_name}</strong> — {dataHora(a.starts_at)}
              <p>Status: {a.status} · Profissional: {a.professional_id ? (profissionais[a.professional_id] ?? 'Não identificado') : 'Não informado'}</p>
              <p>Valor: {moeda(Number(a.price))} · Recebido: {moeda(recebido)} · Falta: {moeda(Math.max(0, Number(a.price) - recebido))}</p>
              {pagos.length > 0 && <p>Pagamentos: {pagos.map(p => `${p.payment_type} ${moeda(Number(p.amount))} (${p.paid_on.split('-').reverse().join('/')})`).join(' · ')}</p>}
            </div>;
          })}
        </div>}
    </section>}
  </div>;
}
