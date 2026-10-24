'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase';
import AnamneseEstudio from './AnamneseEstudio';
import TermoConsentimento from './TermoConsentimento';

type Cliente = { id: string; user_id: string; name: string; phone: string; notes: string; created_at: string };
type Agendamento = { id: string; client_id: string; procedure_name: string; starts_at: string; price: number; status: string; professional_id: string | null };
type Pagamento = { id: string; appointment_id: string; amount: number; payment_type: string; payment_method: string; paid_on: string };
type Comissao = { payment_id: string; commission_amount: number; rate_percent: number; status: string };
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
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
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
    if (!selecionado) { setAgendamentos([]); setPagamentos([]); setComissoes([]); return; }
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
        if (resultadoPagamentos.error) {
          setErro(resultadoPagamentos.error.message);
          setPagamentos([]);
          setComissoes([]);
        } else {
          const listaPagamentos = (resultadoPagamentos.data ?? []) as Pagamento[];
          setPagamentos(listaPagamentos);
          const idsPagamentos = listaPagamentos.map(p => p.id);
          if (idsPagamentos.length) {
            const resultadoComissoes = await supabase.from('studio_commissions')
              .select('payment_id,commission_amount,rate_percent,status')
              .eq('user_id', user.id).in('payment_id', idsPagamentos);
            if (!ativo) return;
            if (resultadoComissoes.error) {
              setComissoes([]);
              setErro(`Não foi possível carregar as comissões: ${resultadoComissoes.error.message}`);
            } else setComissoes((resultadoComissoes.data ?? []) as Comissao[]);
          } else setComissoes([]);
        }
        if (resultadoProfissionais.error) setErro(resultadoProfissionais.error.message);
        else setProfissionais(Object.fromEntries((resultadoProfissionais.data ?? []).map(p => [p.id, p.name])));
      } else { setPagamentos([]); setComissoes([]); setProfissionais({}); }
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

  function imprimirFicha(modelo: 'cliente' | 'administrativo') {
    if (!clienteAtual || carregandoHistorico) return;
    const janela = window.open('', '_blank');
    if (!janela) { setErro('Permita a abertura de janelas para imprimir a ficha.'); return; }
    const escapar = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
    const dataBR = (v: string) => v.split('-').reverse().join('/');
    const administrativo = modelo === 'administrativo';
    const linhas = agendamentos.map(a => {
      const pagos = pagamentos.filter(p => p.appointment_id === a.id).sort((x, y) => x.paid_on.localeCompare(y.paid_on));
      const recebido = pagos.reduce((s, p) => s + Number(p.amount), 0);
      const pagamentosHtml = pagos.length ? pagos.map(p => {
        const comissao = administrativo ? comissoes.find(c => c.payment_id === p.id) : undefined;
        return `<tr><td>${escapar(dataBR(p.paid_on))}</td><td>${escapar(p.payment_type)}</td><td>${escapar(p.payment_method)}</td><td>${escapar(moeda(Number(p.amount)))}</td>${administrativo ? `<td>${comissao ? escapar(`${moeda(Number(comissao.commission_amount))} (${Number(comissao.rate_percent)}%) · ${comissao.status === 'paid' ? 'Paga' : comissao.status === 'approved' ? 'Aprovada' : comissao.status === 'pending' ? 'Pendente' : comissao.status}`) : '—'}</td>` : ''}</tr>`;
      }).join('') : `<tr><td colspan="${administrativo ? 5 : 4}">Nenhum pagamento registrado</td></tr>`;
      return `<section class="atendimento"><h3>${escapar(a.procedure_name)} <small>${escapar(a.status)}</small></h3><p>${escapar(dataHora(a.starts_at))} · Profissional: ${escapar(a.professional_id ? (profissionais[a.professional_id] ?? 'Não identificado') : 'Não informado')}</p><p>Valor: <b>${escapar(moeda(Number(a.price)))}</b> · Recebido: <b>${escapar(moeda(recebido))}</b> · Pendente: <b>${escapar(moeda(Math.max(0, Number(a.price) - recebido)))}</b></p><table><thead><tr><th>Data</th><th>Tipo</th><th>Forma</th><th>Valor</th>${administrativo ? '<th>Comissão</th>' : ''}</tr></thead><tbody>${pagamentosHtml}</tbody></table></section>`;
    }).join('');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${administrativo ? 'Relatório administrativo' : 'Relatório do cliente'} - ${escapar(clienteAtual.name)}</title><style>body{font-family:Arial,sans-serif;color:#222;max-width:900px;margin:35px auto;padding:0 22px}header{border-bottom:3px solid #a78332;padding-bottom:16px}h1{margin-bottom:4px}h2{margin-top:28px;color:#795b22}h3{margin-bottom:8px}.resumo{display:flex;gap:12px;flex-wrap:wrap}.resumo div{border:1px solid #bda774;border-radius:7px;padding:12px;flex:1;min-width:160px}.resumo strong{display:block;margin-top:7px;font-size:19px}.atendimento{border-top:1px solid #bbb;margin-top:22px;padding-top:10px;break-inside:avoid}small{font-size:12px;font-weight:normal;margin-left:8px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;border-bottom:1px solid #ddd;padding:9px 5px}th{background:#f4efe4}.acoes{margin:20px 0}.acoes button{padding:10px 18px;background:#9c772e;color:white;border:0;border-radius:6px;cursor:pointer}@media print{.acoes{display:none}body{margin:0;max-width:none;padding:0}@page{size:A4;margin:15mm}}</style></head><body><header><h1>Edinho Chaves Tattoo</h1><div>${administrativo ? 'Relatório administrativo (uso interno)' : 'Relatório financeiro do cliente'} · Emitido em ${escapar(new Date().toLocaleDateString('pt-BR'))}</div></header><div class="acoes"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div><h2>${escapar(clienteAtual.name)}</h2><p><b>Telefone:</b> ${escapar(clienteAtual.phone)}</p>${administrativo ? `<p><b>Observações:</b> ${escapar(clienteAtual.notes || 'Nenhuma')}</p>` : ''}<h2>Resumo financeiro</h2><div class="resumo"><div>Total dos atendimentos<strong>${escapar(moeda(totalContratado))}</strong></div><div>Total recebido<strong>${escapar(moeda(totalRecebido))}</strong></div><div>Saldo pendente<strong>${escapar(moeda(totalPendente))}</strong></div></div><h2>Histórico de atendimentos</h2>${linhas || '<p>Nenhum atendimento registrado.</p>'}</body></html>`;
    janela.document.open();
    janela.document.write(html);
    janela.document.close();
  }

  const filtrados = clientes.filter(c => `${c.name} ${c.phone}`.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')));
  const clienteAtual = clientes.find(c => c.id === selecionado);
  const totalContratado = agendamentos.filter(a => a.status !== 'cancelado').reduce((s, a) => s + Number(a.price), 0);
  const idsValidos = new Set(agendamentos.filter(a => a.status !== 'cancelado').map(a => a.id));
  const totalRecebido = pagamentos.filter(p => idsValidos.has(p.appointment_id)).reduce((s, p) => s + Number(p.amount), 0);
  const totalPendente = Math.max(0, totalContratado - totalRecebido);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Ficha de {clienteAtual.name}</h2>
        <button type="button" style={botao} disabled={carregandoHistorico} onClick={() => imprimirFicha('cliente')}>Relatório do cliente / PDF</button>
        <button type="button" style={botao} disabled={carregandoHistorico} onClick={() => imprimirFicha('administrativo')}>Relatório administrativo / PDF</button>
      </div>
      <p><strong>Telefone:</strong> {clienteAtual.phone}</p>
      <p><strong>Observações:</strong> {clienteAtual.notes || 'Nenhuma observação.'}</p>
      <AnamneseEstudio key={clienteAtual.id} clientId={clienteAtual.id} />
      <TermoConsentimento key={clienteAtual.id} clientId={clienteAtual.id} />
      <h3>Resumo financeiro</h3>
      {carregandoHistorico ? <p>Carregando valores…</p> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 22 }}>
        {[['Total dos atendimentos', totalContratado], ['Total recebido', totalRecebido], ['Saldo pendente', totalPendente]].map(([rotulo, valor]) =>
          <div key={String(rotulo)} style={{ padding: 14, border: '1px solid #64502c', borderRadius: 9, background: '#161513' }}>
            <div style={{ color: '#d6c5a1', fontSize: 13 }}>{rotulo}</div>
            <strong style={{ display: 'block', marginTop: 8, fontSize: 22, color: '#e0b348' }}>{moeda(Number(valor))}</strong>
          </div>)}
      </div>}
      <h3>Histórico de atendimentos</h3>
      {carregandoHistorico ? <p>Carregando histórico…</p> : agendamentos.length === 0 ? <p>Este cliente ainda não tem agendamentos registrados.</p> :
        <div style={{ display: 'grid', gap: 14 }}>
          {agendamentos.map(a => {
            const pagos = pagamentos.filter(p => p.appointment_id === a.id).sort((x, y) => y.paid_on.localeCompare(x.paid_on));
            const recebido = pagos.reduce((s, p) => s + Number(p.amount), 0);
            const falta = Math.max(0, Number(a.price) - recebido);
            const comissoesAtendimento = pagos.map(p => comissoes.find(c => c.payment_id === p.id)).filter((c): c is Comissao => Boolean(c));
            const totalComissao = comissoesAtendimento.reduce((s, c) => s + Number(c.commission_amount), 0);
            return <div key={a.id} style={{ border: '1px solid #51442e', borderRadius: 10, padding: 16, background: '#151515' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <strong style={{ color: '#e0b348', fontSize: 17 }}>{a.procedure_name}</strong>
                <span style={{ border: '1px solid #64502c', borderRadius: 20, padding: '4px 10px', fontSize: 12 }}>{a.status}</span>
              </div>
              <p style={{ marginBottom: 8 }}>Data: {dataHora(a.starts_at)} · Profissional: {a.professional_id ? (profissionais[a.professional_id] ?? 'Não identificado') : 'Não informado'}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 12 }}>
                <span>Valor: <strong>{moeda(Number(a.price))}</strong></span>
                <span>Recebido: <strong style={{ color: '#e0b348' }}>{moeda(recebido)}</strong></span>
                <span>Falta: <strong>{moeda(falta)}</strong></span>
              </div>
              <div style={{ borderTop: '1px solid #3c3529', paddingTop: 12 }}>
                <strong>Histórico de pagamentos</strong>
                {pagos.length === 0 ? <p style={{ color: '#b9b2a4' }}>Nenhum pagamento registrado.</p> :
                  <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                    {pagos.map(p => {
                      const comissao = comissoes.find(c => c.payment_id === p.id);
                      return <div key={p.id} style={{ padding: 11, border: '1px solid #36312a', borderRadius: 7, background: '#101010' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}>
                          <span>{p.paid_on.split('-').reverse().join('/')} · {p.payment_method} · {p.payment_type}</span>
                          <strong style={{ color: '#e0b348' }}>{moeda(Number(p.amount))}</strong>
                        </div>
                        <div style={{ marginTop: 7, fontSize: 13, color: '#c7c0b4' }}>
                          {comissao ? `Comissão: ${moeda(Number(comissao.commission_amount))} (${Number(comissao.rate_percent)}%) · ${comissao.status === 'paid' ? 'Paga' : comissao.status === 'approved' ? 'Aprovada' : comissao.status === 'pending' ? 'Pendente' : comissao.status}` : 'Comissão não encontrada para este pagamento'}
                        </div>
                      </div>;
                    })}
                  </div>}
                {comissoesAtendimento.length > 0 && <p style={{ marginTop: 10 }}>Total de comissões geradas: <strong>{moeda(totalComissao)}</strong></p>}
              </div>
              {a.status !== 'cancelado' && Math.round(falta * 100) > 0 && (
                <div style={{ marginTop: 12 }}>
                  {pagandoId !== a.id ? (
                    <button type="button" style={botao} onClick={() => { setPagandoId(a.id); setValorPagamento(''); setErro(''); setAviso(''); }}>Registrar pagamento</button>
                  ) : (
                    <form onSubmit={e => void registrarPagamento(e, a)} style={{ display: 'grid', gap: 12, maxWidth: 550, padding: 16, border: '1px solid #80642c', borderRadius: 8 }}>
                      <h4 style={{ margin: 0, color: '#e0b348' }}>Novo recebimento · saldo {moeda(falta)}</h4>
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
