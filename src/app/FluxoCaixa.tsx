'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase';

type Entry = {
  id: string;
  kind: 'receita' | 'despesa';
  description: string;
  category: string;
  payment_method: string;
  amount: number;
  occurred_on: string;
  studio_payment_id: string | null;
};
const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);

const today = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export default function FluxoCaixa() {
  const [items, setItems] = useState<Entry[]>([]);
  const [kind, setKind] = useState<'receita' | 'despesa'>('receita');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tatuagem');
  const [payment, setPayment] = useState('Pix');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [editKind,setEditKind]=useState<'receita'|'despesa'>('receita'),[editDescription,setEditDescription]=useState(''),[editCategory,setEditCategory]=useState('Tatuagem'),[editPayment,setEditPayment]=useState('Pix'),[editAmount,setEditAmount]=useState(''),[editDate,setEditDate]=useState(today);
  const [month, setMonth] = useState(() => today().slice(0,7));
  const supabase = useMemo(() => createClient(), []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setMessage('Sessão expirada. Saia e entre novamente.'); setLoading(false); return; }
    const { data, error } = await supabase.from('cash_entries').select('id,kind,description,category,payment_method,amount,occurred_on,studio_payment_id').eq('user_id', user.id).gte('occurred_on', `${month}-01`).lt('occurred_on', (() => { const [y,m] = month.split('-').map(Number); return new Date(Date.UTC(y,m,1)).toISOString().slice(0,10); })()).order('occurred_on', { ascending: false });
    if (error) setMessage(`Erro ao carregar: ${error.message}`);
    else { setItems((data ?? []) as Entry[]); setMessage(''); }
    setLoading(false);
  }, [supabase, month]);

  useEffect(() => { void load(); }, [load]);
  const income = items.filter(x => x.kind === 'receita').reduce((a,x) => a + Number(x.amount),0);
  const expense = items.filter(x => x.kind === 'despesa').reduce((a,x) => a + Number(x.amount),0);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage('');
    const parsed = Number(amount.replace(/\./g,'').replace(',','.'));
    if (!Number.isFinite(parsed) || parsed <= 0) { setMessage('Informe um valor maior que zero.'); setBusy(false); return; }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setMessage('Faça login novamente.'); setBusy(false); return; }
    const { error } = await supabase.from('cash_entries').insert({ user_id: user.id, kind, description: description.trim(), category, payment_method: payment, amount: parsed, occurred_on: date });
    if (error) setMessage(`Não foi possível salvar: ${error.message}`);
    else { setDescription(''); setAmount(''); if (month === date.slice(0,7)) await load(); else setMonth(date.slice(0,7)); setMessage('Lançamento salvo com sucesso.'); }
    setBusy(false);
  }

  function beginEdit(entry:Entry){
    if(entry.studio_payment_id){setMessage('Este recebimento pertence à agenda. Faça a correção no atendimento.');return;}
    setEditingId(entry.id);setEditKind(entry.kind);setEditDescription(entry.description);setEditCategory(entry.category);setEditPayment(entry.payment_method);setEditAmount(Number(entry.amount).toFixed(2).replace('.',','));setEditDate(entry.occurred_on);setMessage('');
  }
  async function saveEdit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!editingId)return;setBusy(true);setMessage('');
    const parsed=Number(editAmount.replace(/\./g,'').replace(',','.'));
    if(!Number.isFinite(parsed)||parsed<=0){setMessage('Informe um valor maior que zero.');setBusy(false);return;}
    const {data:{user},error:authError}=await supabase.auth.getUser();
    if(authError||!user){setMessage('Faça login novamente.');setBusy(false);return;}
    const {data,error}=await supabase.from('cash_entries').update({kind:editKind,description:editDescription.trim(),category:editCategory,payment_method:editPayment,amount:parsed,occurred_on:editDate}).eq('id',editingId).eq('user_id',user.id).is('studio_payment_id',null).select('id');
    if(error)setMessage(`Não foi possível atualizar: ${error.message}`);else if(!data?.length)setMessage('Este lançamento não pode ser editado aqui.');else{setEditingId(null);if(month===editDate.slice(0,7))await load();else setMonth(editDate.slice(0,7));setMessage('Lançamento atualizado com sucesso.');}
    setBusy(false);
  }

async function remove(id: string) {
  const entry = items.find(x => x.id === id);

  if (!entry) return;

  if (entry.studio_payment_id) {
    setMessage('Este recebimento pertence à agenda. Faça a correção no atendimento.');
    return;
  }

  if (!window.confirm('Excluir este lançamento manual?')) return;

  setBusy(true);
  setMessage('');

  const { data: { user }, error: authError } =
    await supabase.auth.getUser();

  if (authError || !user) {
    setMessage('Faça login novamente.');
    setBusy(false);
    return;
  }

  const { error } = await supabase
    .from('cash_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .is('studio_payment_id', null);

  if (error) {
    setMessage(`Erro ao excluir: ${error.message}`);
  } else {
    await load();
    setMessage('Lançamento manual excluído.');
  }

  setBusy(false);
}

  return <div style={{display:'grid',gap:18}}>
    <div className="cards">{[['Receitas',money(income)],['Despesas',money(expense)],['Saldo do mês',money(income-expense)]].map(([label,value]) => <div className="card" key={label}><span>{label}</span><h2 style={{marginTop:10}}>{value}</h2></div>)}</div>
    <section className="card"><h2>Novo lançamento</h2><form className="form" onSubmit={add} style={{display:'grid',gap:12,maxWidth:600}}>
      <label>Tipo<select value={kind} onChange={e => { const v=e.target.value as 'receita'|'despesa'; setKind(v); setCategory(v==='receita'?'Tatuagem':'Material'); }}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label>
      <label>Descrição<input required maxLength={150} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: Tatuagem no braço" /></label>
      <label>Categoria<select value={category} onChange={e=>setCategory(e.target.value)}>{(kind==='receita'?['Tatuagem','Piercing','Joias','Outros']:['Material','Aluguel','Contas','Comissão','Marketing','Outros']).map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Forma de pagamento<select value={payment} onChange={e=>setPayment(e.target.value)}>{['Pix','Dinheiro','Cartão de débito','Cartão de crédito','Transferência','Outro'].map(p=><option key={p}>{p}</option>)}</select></label>
      <label>Valor (R$)<input required inputMode="decimal" placeholder="150,00" value={amount} onChange={e=>setAmount(e.target.value)} /></label>
      <label>Data<input required type="date" value={date} onChange={e=>setDate(e.target.value)} /></label>
      <button className="primary" disabled={busy}>{busy?'Salvando...':'Salvar lançamento'}</button>
    </form></section>
    <section className="card"><h2>Movimentações do mês</h2><label style={{display:'block',marginBottom:14}}>Mês <input type="month" value={month} onChange={e=>setMonth(e.target.value)} /></label>
      {loading?<p>Carregando...</p>:items.length===0?<p>Nenhum lançamento neste mês.</p>:<div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',textAlign:'left'}}><thead><tr>{['Data','Tipo','Descrição','Categoria','Pagamento','Valor',''].map(h=><th key={h} style={{padding:10,borderBottom:'1px solid #444'}}>{h}</th>)}</tr></thead><tbody>{items.map(x=><tr key={x.id}>{[x.occurred_on.split('-').reverse().join('/'),x.kind,x.description,x.category,x.payment_method,money(Number(x.amount))].map((v,i)=><td key={i} style={{padding:10,borderBottom:'1px solid #333'}}>{v}</td>)}<td>
  {x.studio_payment_id ? (
    <span style={{ color: '#d9aa3b', fontSize: 12 }}>
      Vinculado à agenda
    </span>
  ) : (
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="button" disabled={busy} onClick={()=>beginEdit(x)}>Editar</button><button type="button" disabled={busy} onClick={() => void remove(x.id)}>Excluir</button></div>
  )}
</td></tr>)}{editingId&&<tr><td colSpan={7} style={{padding:12,borderBottom:'1px solid #333'}}><form className="form" onSubmit={saveEdit} style={{display:'grid',gap:10}}><strong>Editar lançamento</strong><label>Tipo<select value={editKind} onChange={e=>{const v=e.target.value as 'receita'|'despesa';setEditKind(v);setEditCategory(v==='receita'?'Tatuagem':'Material');}}><option value="receita">Receita</option><option value="despesa">Despesa</option></select></label><label>Descrição<input required maxLength={150} value={editDescription} onChange={e=>setEditDescription(e.target.value)}/></label><label>Categoria<select value={editCategory} onChange={e=>setEditCategory(e.target.value)}>{(editKind==='receita'?['Tatuagem','Piercing','Joias','Outros']:['Material','Aluguel','Contas','Comissão','Marketing','Outros']).map(v=><option key={v}>{v}</option>)}</select></label><label>Forma de pagamento<select value={editPayment} onChange={e=>setEditPayment(e.target.value)}>{['Pix','Dinheiro','Cartão de débito','Cartão de crédito','Transferência','Outro'].map(v=><option key={v}>{v}</option>)}</select></label><label>Valor (R$)<input required inputMode="decimal" value={editAmount} onChange={e=>setEditAmount(e.target.value)}/></label><label>Data<input required type="date" value={editDate} onChange={e=>setEditDate(e.target.value)}/></label><div style={{display:'flex',gap:8}}><button className="primary" disabled={busy}>{busy?'Salvando...':'Salvar alterações'}</button><button type="button" disabled={busy} onClick={()=>setEditingId(null)}>Cancelar</button></div></form></td></tr>}</tbody></table></div>}
    </section>{message&&<p className="notice" role="status">{message}</p>}
  </div>;
}
