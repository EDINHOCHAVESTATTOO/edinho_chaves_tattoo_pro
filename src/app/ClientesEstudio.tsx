'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase';

type Cliente = { id: string; user_id: string; name: string; phone: string; notes: string; created_at: string };
type Agendamento = { id: string; client_id: string; procedure_name: string; starts_at: string; price: number; status: string; professional_id: string | null };
type Pagamento = { id: string; appointment_id: string; amount: number; payment_type: string; payment_method: string; paid_on: string };
const moeda = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const hoje = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const lerValor = (v: string) => Number(v.trim().replace(/\./g, '').replace(',', '.'));
const dataHora = (s: string) => new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export default function ClientesEstudio({
  clienteParaAbrir,
}: {
  clienteParaAbrir?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState('');
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const fichaRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (clienteParaAbrir) {
      setBusca('');
      setSelecionado(clienteParaAbrir);
    }
  }, [clienteParaAbrir]);
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
  const [pagandoId, setPagandoId] = useState<string | null>(null);
  const [valorPagamento, setValorPagamento] = useState('');
  const [tipoPagamento, setTipoPagamento] = useState('sinal');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [atualizarHistorico, setAtualizarHistorico] = useState(0);

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
          supabase.from('studio_payments').select('id,appointment_id,amount,payment_type,payment_method,paid_on').eq('user_id', user.id).in('appointment_id', ids),
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
  }, [selecionado, supabase, atualizarHistorico]);

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

  async function registrarPagamento(e: FormEvent<HTMLFormElement>, agendamento: Agendamento) {
    e.preventDefault();
    if (salvandoPagamento) return;
    setErro(''); setAviso('');
    const valor = lerValor(valorPagamento);
    if (!Number.isFinite(valor) || valor <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(dataPagamento)) {
      setErro('Informe um valor positivo e uma data válida.'); return;
    }
    if (agendamento.status === 'cancelado') { setErro('Não é possível receber pagamento de atendimento cancelado.'); return; }
    setSalvandoPagamento(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error('Entre novamente no sistema.');
      const { data: registro, error: registroErro } = await supabase.from('studio_appointments')
        .select('id,price,status').eq('id', agendamento.id).eq('user_id', user.id).single();
      if (registroErro || !registro) throw registroErro ?? new Error('Atendimento não encontrado.');
      if (registro.status === 'cancelado') throw new Error('Atendimento cancelado.');
      const { data: anteriores, error: pagamentosErro } = await supabase.from('studio_payments')
        .select('amount').eq('user_id', user.id).eq('appointment_id', agendamento.id);
      if (pagamentosErro) throw pagamentosErro;
      const jaPago = (anteriores ?? []).reduce((s, p) => s + Number(p.amount), 0);
      if (Math.round((jaPago + valor) * 100) > Math.round(Number(registro.price) * 100))
        throw new Error(`O valor supera o saldo disponível de ${moeda(Math.max(0, Number(registro.price) - jaPago))}.`);
      const { error: insertErro } = await supabase.from('studio_payments').insert({
        user_id: user.id, appointment_id: agendamento.id, amount: valor,
        payment_type: tipoPagamento, payment_method: formaPagamento, paid_on: dataPagamento,
      });
      if (insertErro) throw insertErro;
      setPagandoId(null); setValorPagamento(''); setAviso('Pagamento registrado com sucesso.');
      setAtualizarHistorico(v => v + 1);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível registrar o pagamento.');
    } finally { setSalvandoPagamento(false); }
  }

  const filtrados = clientes.filter(c => `${c.name} ${c.phone}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));
  const clienteAtual = clientes.find(c => c.id === selecionado);

  useEffect(() => {
    if (clienteAtual && clienteParaAbrir === clienteAtual.id) {
      fichaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [clienteAtual, clienteParaAbrir]);
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
    {clienteAtual && <section ref={fichaRef} className="card" style={{ scrollMarginTop: 20 }}>
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
              {a.status !== 'cancelado' && Math.round((Number(a.price) - recebido) * 100) > 0 && (
                <div style={{ marginTop: 12 }}>
                  {pagandoId !== a.id ? (
                    <button type="button" style={botao} onClick={() => { setPagandoId(a.id); setValorPagamento(''); setErro(''); setAviso(''); }}>Registrar pagamento</button>
                  ) : (
                    <form onSubmit={e => void registrarPagamento(e, a)} style={{ display: 'grid', gap: 12, maxWidth: 550, padding: 16, border: '1px solid #80642c', borderRadius: 8 }}>
                      <h4 style={{ margin: 0, color: '#e0b348' }}>Novo recebimento · saldo {moeda(Math.max(0, Number(a.price) - recebido))}</h4>
                      <label>Tipo de pagamento<select style={estiloInput} value={tipoPagamento} onChange={e => setTipoPagamento(e.target.value)}><option value="sinal">Sinal</option><option value="restante">Restante</option><option value="outro">Outro pagamento</option></select></label>
                      <label>Valor recebido (R$)<input style={estiloInput} required inputMode="decimal" placeholder="100,00" value={valorPagamento} onChange={e => setValorPagamento(e.target.value)} /></label>
                      <label>Forma de pagamento<select style={estiloInput} value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>{['Pix', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito', 'Transferência', 'Outro'].map(m => <option key={m} value={m}>{m}</option>)}</select></label>
                      <label>Data do recebimento<input style={estiloInput} required type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} /></label>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button className="primary" type="submit" disabled={salvandoPagamento}>{salvandoPagamento ? 'Salvando…' : 'Confirmar recebimento'}</button>
                        <button style={botao} type="button" disabled={salvandoPagamento} onClick={() => setPagandoId(null)}>Cancelar</button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>;
          })}
        </div>}
    </section>}
  </div>;
}
