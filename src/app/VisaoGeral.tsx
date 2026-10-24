'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Caixa = { id: string; kind: 'receita' | 'despesa'; description: string; category: string; amount: number; occurred_on: string; payment_method: string };
type Agenda = { id: string; procedure_name: string; starts_at: string; status: string; price: number };
type AtendimentoFinanceiro = { id: string; procedure_name: string; status: string; price: number };
type Pagamento = { appointment_id: string; amount: number };
type Comissao = { id: string; commission_amount: number; status: string; created_at: string; paid_at: string | null };
const moeda = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
const dataLocal = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const mesAtual = () => dataLocal().slice(0, 7);
const soma = (valores: number[]) => valores.reduce((a, b) => a + b, 0);
const estiloCard: React.CSSProperties = { background: '#141414', border: '1px solid #35302a', borderRadius: 14, padding: 20 };

export default function VisaoGeral() {
  const supabase = useMemo(() => createClient(), []);
  const [mes, setMes] = useState(mesAtual);
  const [caixa, setCaixa] = useState<Caixa[]>([]);
  const [agenda, setAgenda] = useState<Agenda[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [aReceber, setAReceber] = useState(0);
  const [quantidadeEmAberto, setQuantidadeEmAberto] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [atualizado, setAtualizado] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Sessão expirada. Entre novamente.');
      const [ano, numeroMes] = mes.split('-').map(Number);
      const inicio = `${mes}-01`;
      const fim = new Date(Date.UTC(ano, numeroMes, 1)).toISOString().slice(0, 10);
      // Intervalo de hoje em horário de Brasília, convertido para UTC.
      const hoje = dataLocal();
      const inicioHoje = `${hoje}T00:00:00-03:00`;
      const fimHoje = `${hoje}T23:59:59.999-03:00`;
      const [resCaixa, resAgenda, resComissoes] = await Promise.all([
        supabase.from('cash_entries').select('id,kind,description,category,amount,occurred_on,payment_method').eq('user_id', user.id).gte('occurred_on', inicio).lt('occurred_on', fim).order('occurred_on', { ascending: false }),
        supabase.from('studio_appointments').select('id,procedure_name,starts_at,status,price').eq('user_id', user.id).gte('starts_at', inicioHoje).lte('starts_at', fimHoje).order('starts_at', { ascending: true }),
        supabase.from('studio_commissions').select('id,commission_amount,status,created_at,paid_at').eq('user_id', user.id),
      ]);
      if (resCaixa.error) throw resCaixa.error;
      if (resAgenda.error) throw resAgenda.error;
      if (resComissoes.error) throw resComissoes.error;
      setCaixa((resCaixa.data ?? []) as Caixa[]);
      setAgenda((resAgenda.data ?? []) as Agenda[]);
      setComissoes((resComissoes.data ?? []) as Comissao[]);

      // Busca todos os atendimentos não cancelados e seus pagamentos,
      // inclusive de meses anteriores. Não utiliza lançamentos manuais do caixa.
      const atendimentos: AtendimentoFinanceiro[] = [];
      const pagamentos: Pagamento[] = [];
      const tamanhoPagina = 500;
      for (let pagina = 0; ; pagina++) {
        const { data, error } = await supabase.from('studio_appointments')
          .select('id,procedure_name,status,price')
          .eq('user_id', user.id).neq('status', 'cancelado')
          .order('id', { ascending: true })
          .range(pagina * tamanhoPagina, (pagina + 1) * tamanhoPagina - 1);
        if (error) throw error;
        atendimentos.push(...((data ?? []) as AtendimentoFinanceiro[]));
        if ((data ?? []).length < tamanhoPagina) break;
      }
      for (let pagina = 0; ; pagina++) {
        const { data, error } = await supabase.from('studio_payments')
          .select('appointment_id,amount')
          .eq('user_id', user.id)
          .order('id', { ascending: true })
          .range(pagina * tamanhoPagina, (pagina + 1) * tamanhoPagina - 1);
        if (error) throw error;
        pagamentos.push(...((data ?? []) as Pagamento[]));
        if ((data ?? []).length < tamanhoPagina) break;
      }
      const pagoPorAtendimento = new Map<string, number>();
      for (const pagamento of pagamentos) {
        pagoPorAtendimento.set(pagamento.appointment_id,
          (pagoPorAtendimento.get(pagamento.appointment_id) ?? 0) + Number(pagamento.amount));
      }
      const saldos = atendimentos.map(a => Math.max(0,
        Math.round((Number(a.price) - (pagoPorAtendimento.get(a.id) ?? 0)) * 100) / 100));
      setAReceber(soma(saldos));
      setQuantidadeEmAberto(saldos.filter(valor => valor > 0).length);
      setAtualizado(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível carregar os dados.'); }
    finally { setCarregando(false); }
  }, [supabase, mes]);

  useEffect(() => { void carregar(); }, [carregar]);
  const receitas = soma(caixa.filter(x => x.kind === 'receita').map(x => Number(x.amount)));
  const despesas = soma(caixa.filter(x => x.kind === 'despesa').map(x => Number(x.amount)));
  const ativosHoje = agenda.filter(x => x.status !== 'cancelado');
  const pagasMes = comissoes.filter(x => x.status === 'paid' && x.paid_at?.slice(0, 7) === mes);
  const pendentes = comissoes.filter(x => x.status === 'pending');
  const aprovadas = comissoes.filter(x => x.status === 'approved');
  const dias = Array.from({ length: new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate() }, (_, i) => i + 1);
  const valoresDia = dias.map(d => {
    const data = `${mes}-${String(d).padStart(2, '0')}`;
    return { dia: d, receita: soma(caixa.filter(x => x.occurred_on === data && x.kind === 'receita').map(x => Number(x.amount))), despesa: soma(caixa.filter(x => x.occurred_on === data && x.kind === 'despesa').map(x => Number(x.amount))) };
  });
  const maximo = Math.max(1, ...valoresDia.flatMap(x => [x.receita, x.despesa]));
  const categorias = Object.entries(caixa.filter(x => x.kind === 'despesa').reduce<Record<string, number>>((acc, x) => { acc[x.category] = (acc[x.category] ?? 0) + Number(x.amount); return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const totalComissao = (items: Comissao[]) => soma(items.map(x => Number(x.commission_amount)));
  const mesExtenso = new Date(`${mes}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return <div style={{ display: 'grid', gap: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div><p style={{ margin: 0, color: '#cbb994' }}>Indicadores reais do estúdio · {mesExtenso}</p>{atualizado && <small style={{ color: '#999' }}>Atualizado às {atualizado}</small>}</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="month" aria-label="Selecionar mês" value={mes} onChange={e => setMes(e.target.value)} style={{ background: '#171717', color: '#e1b44d', border: '1px solid #71582a', padding: 10, borderRadius: 8 }} /><button className="secondary" type="button" onClick={() => void carregar()} disabled={carregando}>Atualizar</button></div>
    </div>
    {erro && <p className="notice" role="alert">{erro}</p>}
    {carregando ? <p>Carregando informações...</p> : <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
        {([['Faturamento recebido', moeda(receitas), '↗'], ['Despesas pagas', moeda(despesas), '↘'], ['Saldo do mês', moeda(receitas - despesas), '▣'], ['Agendamentos hoje', String(ativosHoje.length), '▦'], ['Valores a receber', moeda(aReceber), '◷']] as const).map(([titulo, valor, simbolo]) => <div key={titulo} style={estiloCard}><span style={{ color: '#d6ac50', fontSize: 22 }}>{simbolo}</span><p style={{ color: '#c8bda9', marginBottom: 10 }}>{titulo}</p><strong style={{ fontSize: 25 }}>{valor}</strong></div>)}
      </div>
      <p style={{ margin: '-8px 0 0', color: '#cbb994', fontSize: 12 }}>Valores a receber: {quantidadeEmAberto} atendimento(s) não cancelado(s) com saldo pendente, de qualquer mês. Não entram no caixa até o pagamento.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))', gap: 16 }}>
        <section style={estiloCard}><h2 style={{ marginTop: 0 }}>Movimentação do mês</h2><div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#c9c9c9' }}><span>🟢 Receitas</span><span>🔴 Despesas</span></div><div style={{ display: 'flex', alignItems: 'end', height: 170, gap: 3, borderBottom: '1px solid #51483b', marginTop: 15 }}>{valoresDia.map(x => <div key={x.dia} title={`${x.dia}/${mes.slice(5)}/${mes.slice(0,4)} · Receitas: ${moeda(x.receita)} · Despesas: ${moeda(x.despesa)}`} style={{ flex: 1, display: 'flex', alignItems: 'end', height: '100%', gap: 1 }}><div style={{ width: '50%', background: '#25a775', height: `${Math.max(0, x.receita / maximo * 100)}%`, minHeight: x.receita ? 2 : 0, borderRadius: '3px 3px 0 0' }} /><div style={{ width: '50%', background: '#df5151', height: `${Math.max(0, x.despesa / maximo * 100)}%`, minHeight: x.despesa ? 2 : 0, borderRadius: '3px 3px 0 0' }} /></div>)}</div><div style={{ display: 'flex', justifyContent: 'space-between', color: '#999', fontSize: 11, marginTop: 6 }}><span>Dia 1</span><span>Dia {dias.length}</span></div></section>
        <section style={estiloCard}><h2 style={{ marginTop: 0 }}>Despesas por categoria</h2>{categorias.length === 0 ? <p style={{ color: '#aaa' }}>Nenhuma despesa no período.</p> : categorias.map(([nome, valor]) => <div key={nome} style={{ marginBottom: 15 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{nome}</span><strong>{moeda(valor)}</strong></div><div style={{ height: 7, background: '#28231c', borderRadius: 5, marginTop: 7 }}><div style={{ width: `${despesas ? valor / despesas * 100 : 0}%`, height: '100%', background: '#d5a63c', borderRadius: 5 }} /></div></div>)}</section>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
        <section style={estiloCard}><h2 style={{ marginTop: 0 }}>Agendamentos de hoje</h2>{ativosHoje.length === 0 ? <p style={{ color: '#aaa' }}>Nenhum agendamento para hoje.</p> : ativosHoje.slice(0, 6).map(a => <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #333' }}><strong style={{ color: '#e0b348' }}>{new Date(a.starts_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}</strong> · {a.procedure_name}<div style={{ color: '#aaa', fontSize: 12 }}>{a.status} · {moeda(Number(a.price))}</div></div>)}</section>
        <section style={estiloCard}><h2 style={{ marginTop: 0 }}>Últimas movimentações</h2>{caixa.length === 0 ? <p style={{ color: '#aaa' }}>Nenhuma movimentação neste mês.</p> : caixa.slice(0, 6).map(x => <div key={x.id} style={{ padding: '10px 0', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><strong>{x.description}</strong><div style={{ color: '#999', fontSize: 12 }}>{x.occurred_on.split('-').reverse().join('/')} · {x.category}</div></div><strong style={{ whiteSpace: 'nowrap', color: x.kind === 'receita' ? '#43c58c' : '#f07373' }}>{x.kind === 'receita' ? '+' : '−'} {moeda(Number(x.amount))}</strong></div>)}</section>
        <section style={estiloCard}><h2 style={{ marginTop: 0 }}>Comissões</h2><p style={{ color: '#aaa', fontSize: 12 }}>Pendentes e aprovadas: saldo atual. Pagas: mês selecionado.</p>{([['Pendentes', pendentes], ['Aprovadas', aprovadas], ['Pagas no mês', pagasMes]] as const).map(([titulo, lista]) => <div key={titulo} style={{ display: 'flex', justifyContent: 'space-between', padding: '13px 0', borderBottom: '1px solid #333' }}><span>{titulo} ({lista.length})</span><strong style={{ color: '#e0b348' }}>{moeda(totalComissao(lista))}</strong></div>)}</section>
      </div>
    </>}
  </div>;
}
