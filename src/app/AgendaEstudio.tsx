'use client';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase';
import CalendarioEstudio from './CalendarioEstudio';
import HorariosEstudio from './HorariosEstudio';
import DocumentosEstudio from './DocumentosEstudio';

type Pro = {id:string;name:string;role:string;commission_percent:number;active:boolean};
type Client = {id:string;name:string;phone:string;notes:string};
type Appointment = {id:string;client_id:string;professional_id:string;procedure_name:string;starts_at:string;ends_at:string;price:number;commission_percent:number;status:string;notes:string};
type Payment = {id:string;appointment_id:string;amount:number;payment_type:string;payment_method:string;paid_on:string};
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
const localDate=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const parseAmount=(v:string)=>Number(v.trim().replace(/\./g,'').replace(',','.'));
const timeLabel=(v:string)=>new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
// Exportação manual: não representa sincronização bidirecional.
const googleCalendarUrl=(a:Appointment)=>{
 const utc=(v:string)=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
 const query=new URLSearchParams({action:'TEMPLATE',text:'Atendimento — Edinho Chaves Tattoo',dates:`${utc(a.starts_at)}/${utc(a.ends_at)}`,details:'Horário reservado pelo Edinho Chaves Tattoo Pro. Confira alterações diretamente com o estúdio.'});
 return `https://calendar.google.com/calendar/render?${query.toString()}`;
};
const localDateTime=(iso:string)=>{
 const d=new Date(iso);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

export default function AgendaEstudio(){
 const supabase=useMemo(()=>createClient(),[]);
 const [pros,setPros]=useState<Pro[]>([]),[clients,setClients]=useState<Client[]>([]),[appointments,setAppointments]=useState<Appointment[]>([]),[payments,setPayments]=useState<Payment[]>([]);
 const [section,setSection]=useState<'agenda'|'clientes'|'profissionais'|'documentos'|'campanhas'>('agenda');
 const [day,setDay]=useState(localDate),[filterPro,setFilterPro]=useState('');
 const [slotPro,setSlotPro]=useState('');
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[clientNotes,setClientNotes]=useState('');
 const [proName,setProName]=useState(''),[role,setRole]=useState('Tatuador'),[percent,setPercent]=useState('0');
 const [clientId,setClientId]=useState(''),[professionalId,setProfessionalId]=useState(''),[procedure,setProcedure]=useState(''),[start,setStart]=useState(''),[duration,setDuration]=useState('60'),[price,setPrice]=useState(''),[notes,setNotes]=useState('');
 const [payAppointment,setPayAppointment]=useState(''),[payType,setPayType]=useState('sinal'),[payAmount,setPayAmount]=useState(''),[payMethod,setPayMethod]=useState('Pix'),[payDate,setPayDate]=useState(localDate);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState('');
 const [editingId,setEditingId]=useState<string|null>(null);
 const [googleSetup,setGoogleSetup]=useState<'checking'|'configured'|'pending'>('checking');
 const [googleBusy,setGoogleBusy]=useState(false);
 const [googleConnected,setGoogleConnected]=useState(false);
 const [googleSlots,setGoogleSlots]=useState<{id:string;start:string;end:string;allDay:boolean}[]>([]);
 const [googleSlotsMessage,setGoogleSlotsMessage]=useState('');
 const [googleSlotsBusy,setGoogleSlotsBusy]=useState(false);
 const [googlePublishBusy,setGooglePublishBusy]=useState(false);
 const publishGoogle=async()=>{setGooglePublishBusy(true);try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Faça login novamente.');const response=await fetch('/api/google-calendar/publish',{method:'POST',headers:{Authorization:'Bearer '+session.access_token}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Falha ao enviar horários');setGoogleSlotsMessage('Prévia segura: '+data.ready+' horários aptos, '+data.already+' já existentes, '+data.failed+' falhas, '+data.conflicts+' conflitos. Nenhum evento foi criado ou modificado.')}catch(e){setGoogleSlotsMessage(e instanceof Error?e.message:'Falha no envio')}finally{setGooglePublishBusy(false)}};
 const loadGoogleSlots=async()=>{setGoogleSlotsBusy(true);setGoogleSlotsMessage('');try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Entre novamente no aplicativo.');const response=await fetch('/api/google-calendar/events',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'Erro ao consultar agenda Google');setGoogleSlots(data.events||[]);setGoogleSlotsMessage(data.hasMore?'Mostrando os primeiros 250 horários ocupados.':'Consulta somente leitura concluída. Nenhum compromisso foi modificado.')}catch(error){setGoogleSlotsMessage(error instanceof Error?error.message:'Erro ao consultar Google Agenda')}finally{setGoogleSlotsBusy(false)}};
 useEffect(()=>{let active=true;supabase.auth.getUser().then(async({data:{user}})=>{if(!user)return;const {data}=await supabase.from('google_calendar_connections').select('user_id').eq('user_id',user.id).maybeSingle();if(active)setGoogleConnected(Boolean(data))});return()=>{active=false}},[supabase]);
 useEffect(()=>{const outcome=new URLSearchParams(window.location.search).get('google_calendar');if(outcome==='connected')setMessage('Google Agenda autorizado. Sincronização automática ainda não está ativa.');else if(outcome)setMessage('Não foi possível concluir a autorização Google: '+outcome)},[]);
 useEffect(()=>{let alive=true;fetch('/api/google-calendar/status',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject()).then(data=>{if(alive)setGoogleSetup(data.configured?'configured':'pending')}).catch(()=>{if(alive)setGoogleSetup('pending')});return()=>{alive=false}},[]);
 const [editClient,setEditClient]=useState(''),[editPro,setEditPro]=useState(''),[editProcedure,setEditProcedure]=useState('');
 const [editStart,setEditStart]=useState(''),[editDuration,setEditDuration]=useState('60');
 const [editPrice,setEditPrice]=useState(''),[editNotes,setEditNotes]=useState('');
 const load=useCallback(async()=>{
  setLoading(true);
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setMessage('Sessão expirada. Entre novamente.');setLoading(false);throw new Error('Sessão expirada. Entre novamente.');}
  const [p,c,a,pay]=await Promise.all([
   supabase.from('studio_professionals').select('id,name,role,commission_percent,active').eq('user_id',user.id).order('name'),
   supabase.from('studio_clients').select('id,name,phone,notes').eq('user_id',user.id).order('name'),
   supabase.from('studio_appointments').select('id,client_id,professional_id,procedure_name,starts_at,ends_at,price,commission_percent,status,notes').eq('user_id',user.id).order('starts_at',{ascending:false}).limit(1000),
   supabase.from('studio_payments').select('id,appointment_id,amount,payment_type,payment_method,paid_on').eq('user_id',user.id).order('paid_on',{ascending:false}).limit(2000)
  ]);
  const err=[p.error,c.error,a.error,pay.error].find(Boolean);
  if(err){setMessage(`Erro ao carregar: ${err.message}`);setLoading(false);throw new Error(`Erro ao carregar: ${err.message}`);}
  else {setPros(p.data as Pro[]);setClients(c.data as Client[]);setAppointments(a.data as Appointment[]);setPayments(pay.data as Payment[]);}
  setLoading(false);
 },[supabase]);
 useEffect(()=>{void load().catch(err=>{setMessage(err instanceof Error?err.message:'Não foi possível carregar os dados.');setLoading(false);})},[load]);
 async function owner(){const {data:{user},error}=await supabase.auth.getUser();if(error||!user)throw new Error('Faça login novamente.');return user.id;}
 async function studioForOwner(userId:string){const {data,error}=await supabase.from('profiles').select('studio_id').eq('id',userId).eq('role','owner').single();if(error||!data?.studio_id)throw new Error('Estúdio não identificado.');return data.studio_id;}
 async function submit(e:FormEvent<HTMLFormElement>,action:()=>Promise<void>){e.preventDefault();setBusy(true);setMessage('');try{await action();await load();setMessage('Salvo com sucesso.')}catch(err){
  const erro = err as { code?: string; message?: string };

  setMessage(
    erro.code === '23P01'
      ? '⚠️ Este profissional já possui um atendimento nesse horário. Escolha outro horário disponível.'
      : erro.message || 'Não foi possível salvar.'
  );
}finally{setBusy(false)}}
 async function addClient(){const user_id=await owner();if(!name.trim())throw new Error('Informe o nome.');const {error}=await supabase.from('studio_clients').insert({user_id,studio_id:await studioForOwner(user_id),name:name.trim(),phone:phone.trim(),notes:clientNotes.trim()});if(error)throw error;setName('');setPhone('');setClientNotes('');}
 async function addPro(){const user_id=await owner();const commission_percent=parseAmount(percent);if(!Number.isFinite(commission_percent)||commission_percent<0||commission_percent>100)throw new Error('Comissão deve estar entre 0 e 100%.');const {error}=await supabase.from('studio_professionals').insert({user_id,studio_id:await studioForOwner(user_id),name:proName.trim(),role,commission_percent});if(error)throw error;setProName('');setPercent('0');}
 async function addAppointment(){
  const user_id=await owner();const p=pros.find(x=>x.id===professionalId);if(!p||!p.active)throw new Error('Selecione um profissional ativo.');
  if(!clientId||!procedure.trim()||!start)throw new Error('Preencha cliente, procedimento e horário.');
  const minutes=Number(duration),value=parseAmount(price),startAt=new Date(start);
  if(!Number.isInteger(minutes)||minutes<15||minutes>720||!Number.isFinite(value)||value<0||Number.isNaN(startAt.getTime()))throw new Error('Confira duração e valor.');
  const endAt=new Date(startAt.getTime()+minutes*60000);
  // Busca conflitos diretamente no banco, inclusive em outros dias carregados.
  const {data:conflicts,error:checkError}=await supabase.from('studio_appointments').select('id').eq('user_id',user_id).eq('professional_id',professionalId).neq('status','cancelado').lt('starts_at',endAt.toISOString()).gt('ends_at',startAt.toISOString()).limit(1);
  if(checkError)throw checkError;if(conflicts?.length)throw new Error('Esse profissional já tem atendimento nesse horário.');
  const {error}=await supabase.from('studio_appointments').insert({user_id,studio_id:await studioForOwner(user_id),client_id:clientId,professional_id:professionalId,procedure_name:procedure.trim(),starts_at:startAt.toISOString(),ends_at:endAt.toISOString(),price:value,commission_percent:p.commission_percent,notes:notes.trim()});
  if(error)throw error;setProcedure('');setStart('');setPrice('');setNotes('');
 }
 function beginEdit(a:Appointment){
  const minutes=Math.round((new Date(a.ends_at).getTime()-new Date(a.starts_at).getTime())/60000);
  setEditingId(a.id);setEditClient(a.client_id);setEditPro(a.professional_id);
  setEditProcedure(a.procedure_name);setEditStart(localDateTime(a.starts_at));
  setEditDuration(String(minutes));setEditPrice(Number(a.price).toFixed(2).replace('.',','));
  setEditNotes(a.notes??'');setMessage('');
 }
 async function saveEdit(){
  const user_id=await owner();
  const original=appointments.find(a=>a.id===editingId);
  if(!original)throw new Error('Agendamento não encontrado. Atualize a página.');
  const pro=pros.find(p=>p.id===editPro);
  if(!pro||(editPro!==original.professional_id&&!pro.active))throw new Error('Selecione um profissional ativo.');
  if(!clients.some(c=>c.id===editClient)||!editProcedure.trim()||!editStart)throw new Error('Preencha cliente, procedimento e horário.');
  const minutes=Number(editDuration),value=parseAmount(editPrice),startAt=new Date(editStart);
  if(!Number.isInteger(minutes)||minutes<15||minutes>720||!Number.isFinite(value)||value<0||Number.isNaN(startAt.getTime()))
   throw new Error('Confira a duração, o horário e o valor.');
  const paid=paidFor(original.id);
  if(Math.round(value*100)<Math.round(paid*100))
   throw new Error(`O valor total não pode ser menor que o já recebido (${money(paid)}).`);
  if(paid>0&&editPro!==original.professional_id)
   throw new Error('Este atendimento já possui pagamento. Para preservar as comissões, não é possível trocar o profissional.');
  const endAt=new Date(startAt.getTime()+minutes*60000);
  const {data:conflicts,error:checkError}=await supabase.from('studio_appointments')
   .select('id').eq('user_id',user_id).eq('professional_id',editPro)
   .neq('id',original.id).neq('status','cancelado')
   .lt('starts_at',endAt.toISOString()).gt('ends_at',startAt.toISOString()).limit(1);
  if(checkError)throw checkError;
  if(original.status!=='cancelado'&&conflicts?.length)throw new Error('Esse profissional já tem atendimento nesse horário.');
  const updates={
   client_id:editClient,professional_id:editPro,procedure_name:editProcedure.trim(),
   starts_at:startAt.toISOString(),ends_at:endAt.toISOString(),price:value,
   commission_percent:editPro===original.professional_id?original.commission_percent:pro.commission_percent,
   notes:editNotes.trim()
  };
  const {data,error}=await supabase.from('studio_appointments').update(updates)
   .eq('id',original.id).eq('user_id',user_id).select('id');
  if(error)throw error;
  if(!data?.length)throw new Error('Não foi possível atualizar o agendamento. Verifique as permissões no Supabase.');
  setEditingId(null);
  const localDay=localDateTime(startAt.toISOString()).slice(0,10);
  setDay(localDay);
 }
 async function submitEdit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage('');
  try{await saveEdit();await load();setMessage('Agendamento atualizado com sucesso. Os pagamentos existentes foram preservados.');}
  catch(err){
  const erro = err as { code?: string; message?: string };

  setMessage(
    erro.code === '23P01'
      ? '⚠️ Este profissional já possui um atendimento nesse horário. Escolha outro horário disponível.'
      : erro.message || 'Não foi possível atualizar o agendamento.'
  );
}
  finally{setBusy(false);}
 }
 async function setStatus(a:Appointment,status:string){
  setBusy(true);
  setMessage('');
  try {
    const user_id = await owner();
    const {data,error} = await supabase.from('studio_appointments')
      .update({status}).eq('id',a.id).eq('user_id',user_id).select('id');
    if(error) throw error;
    if(!data?.length) throw new Error('Agendamento não encontrado ou sem permissão para atualizar.');
    await load();
    setMessage('Status atualizado. Registrar pagamento é uma ação separada.');
  } catch(err) {
    setMessage(err instanceof Error ? err.message : 'Não foi possível atualizar o status.');
  } finally {
    setBusy(false);
  }
 }
 async function addPayment(){
  const user_id=await owner();
  const a=appointments.find(x=>x.id===payAppointment);
  if(!a)throw new Error('Selecione um agendamento.');
  const amount=parseAmount(payAmount);
  if(!Number.isFinite(amount)||amount<=0)
    throw new Error('Valor inválido. Digite 10,00 sem símbolo de moeda.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(payDate)||Number.isNaN(new Date(`${payDate}T12:00:00`).getTime()))
    throw new Error('Data inválida. Toque no campo de data e selecione o dia novamente.');
  const {data:current,error:appointmentError}=await supabase.from('studio_appointments')
    .select('id,price,status').eq('id',a.id).eq('user_id',user_id).single();
  if(appointmentError||!current)throw appointmentError??new Error('Atendimento não encontrado.');
  if(current.status==='cancelado')throw new Error('Não é possível receber pagamento de atendimento cancelado.');
  const {data:previous,error:paymentsError}=await supabase.from('studio_payments')
    .select('amount').eq('user_id',user_id).eq('appointment_id',a.id);
  if(paymentsError)throw paymentsError;
  const paid=(previous??[]).reduce((sum,p)=>sum+Number(p.amount),0);
  if(Math.round((paid+amount)*100)>Math.round(Number(current.price)*100))
    throw new Error('O valor supera o saldo disponível do atendimento.');
  const {error}=await supabase.from('studio_payments').insert({
    user_id,studio_id:await studioForOwner(user_id),appointment_id:a.id,payment_type:payType,amount,payment_method:payMethod,paid_on:payDate
  });
  if(error)throw error;
  setPayAmount('');setPayAppointment('');
 }
 const shown=appointments.filter(a=>localDateTime(a.starts_at).slice(0,10)===day).filter(a=>!filterPro||a.professional_id===filterPro).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
 const paidFor=(id:string)=>payments.filter(p=>p.appointment_id===id).reduce((s,p)=>s+Number(p.amount),0);
 const clientName=(id:string)=>clients.find(x=>x.id===id)?.name??'Cliente';
 const proNameOf=(id:string)=>pros.find(x=>x.id===id)?.name??'Profissional';
 const inputStyle={maxWidth:580};
 return <div style={{display:'grid',gap:18}}>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>{(['agenda','clientes','profissionais','documentos','campanhas'] as const).map(s=><button key={s} type="button" className={section===s?'primary':'secondary'} onClick={()=>setSection(s)}>{s==='agenda'?'Agenda':s==='clientes'?'Clientes':s==='documentos'?'Fichas e anexos':s==='campanhas'?'Campanhas':'Profissionais'}</button>)}</div>
  {loading&&<p>Carregando registros...</p>}
  {section==='documentos'&&<DocumentosEstudio clients={clients}/>}
  {section==='campanhas'&&<section className="card"><h2>Campanhas e valores de referência</h2><p>Confira condições e disponibilidade antes de confirmar cada atendimento. Não são descontos aplicados automaticamente.</p>{[['Tatuagem — valor mínimo','R$ 120'],['Flash tattoo — 3 unidades','R$ 150'],['Mini fine line — 10 unidades','R$ 399'],['Piercing em aço simples','R$ 50'],['Vale-tattoo','R$ 120 ou R$ 150']].map(([name,value])=><p key={name}><strong>{name}</strong> · {value}</p>)}<p>Especialidades: realismo colorido e preto e branco, freehand, fine line, tatuagens delicadas e piercing.</p></section>}
  {section==='profissionais'&&<><section className="card"><h2>Novo profissional</h2><form className="form" style={inputStyle} onSubmit={e=>void submit(e,addPro)}><label>Nome<input required value={proName} onChange={e=>setProName(e.target.value)}/></label><label>Atuação<select value={role} onChange={e=>setRole(e.target.value)}><option>Tatuador</option><option>Body piercer</option><option>Outro</option></select></label><label>Comissão (%)<input required inputMode="decimal" value={percent} onChange={e=>setPercent(e.target.value)}/></label><button className="primary" disabled={busy}>Cadastrar profissional</button></form></section><section className="card"><h2>Profissionais cadastrados</h2>{pros.map(p=><p key={p.id}>{p.name} — {p.role} — comissão {p.commission_percent}%</p>)}</section></>}
  {section==='clientes'&&<><section className="card"><h2>Novo cliente</h2><form className="form" style={inputStyle} onSubmit={e=>void submit(e,addClient)}><label>Nome<input required value={name} onChange={e=>setName(e.target.value)}/></label><label>Telefone / WhatsApp<input value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Observações<input value={clientNotes} onChange={e=>setClientNotes(e.target.value)}/></label><button className="primary" disabled={busy}>Cadastrar cliente</button></form></section><section className="card"><h2>Clientes e histórico</h2>{clients.map(c=><div key={c.id} style={{marginBottom:16}}><strong>{c.name}</strong> — {c.phone}<div>{appointments.filter(a=>a.client_id===c.id).map(a=><p key={a.id}>{timeLabel(a.starts_at)} · {a.procedure_name} · {proNameOf(a.professional_id)} · {a.status}</p>)}</div></div>)}</section></>}
  {section==='agenda'&&<><section className="card" style={{display:'none'}}><h2>Google Agenda</h2><p><strong>{googleSetup==='checking'?'Verificando configuração…':googleSetup==='configured'?'Credenciais disponíveis — autorização Google pronta para teste.':'Configuração ou verificação pendente.'}</strong></p><p>Você pode adicionar atendimentos individualmente pelo botão disponível em cada horário. A sincronização automática nos dois sentidos exige a autorização da conta Google e a configuração segura do aplicativo.</p><p className="notice">{googleConnected?'Conta Google autorizada. Sincronização automática ainda não está ativa.':'Nenhuma conta Google autorizada neste usuário. Alterações feitas diretamente no Google ainda não são importadas.'}</p>
<button type="button" disabled={googleBusy||googleSetup!=='configured'} onClick={async()=>{setGoogleBusy(true);try{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sessão expirada');const response=await fetch('/api/google-calendar/connect',{method:'POST',headers:{Authorization:'Bearer '+session.access_token}});const data=await response.json();if(!response.ok)throw new Error(data.error||'Erro na autorização');window.location.assign(data.url)}catch(e){setMessage(e instanceof Error?e.message:'Erro na autorização');setGoogleBusy(false)}}}>Conectar Google Agenda</button>
 <div style={{marginTop:12}}><button type="button" disabled={!googleConnected||googleSlotsBusy} onClick={loadGoogleSlots}>{googleSlotsBusy?'Consultando…':'Consultar horários ocupados no Google (somente leitura)'}</button> <button type="button" disabled={!googleConnected||googlePublishBusy} onClick={publishGoogle}>{googlePublishBusy?'Enviando…':'Verificar envio ao Google (prévia sem alterações)'}</button><p className="notice">{googleSlotsMessage}</p>{googleSlots.length>0&&<div style={{maxHeight:260,overflowY:'auto'}}><strong>{googleSlots.length} eventos ocupados encontrados (sem dados pessoais)</strong><ul>{googleSlots.slice(0,30).map(slot=><li key={slot.id}>{slot.allDay?'Dia inteiro: ':''}{new Date(slot.start).toLocaleString('pt-BR')} — {new Date(slot.end).toLocaleString('pt-BR')}</li>)}</ul></div>}</div></section><section className="card"><h2>Novo agendamento</h2><form className="form" style={inputStyle} onSubmit={e=>void submit(e,addAppointment)}><label>Cliente<select required value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Selecione</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Profissional<select required value={professionalId} onChange={e=>setProfessionalId(e.target.value)}><option value="">Selecione</option>{pros.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Procedimento<input required value={procedure} onChange={e=>setProcedure(e.target.value)} placeholder="Tatuagem, piercing..."/></label><label>Início<input required type="datetime-local" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Duração (minutos)<input required type="number" min="15" max="720" step="15" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>Valor total (R$)<input required inputMode="decimal" value={price} onChange={e=>setPrice(e.target.value)} placeholder="200,00"/></label><label>Observações<input value={notes} onChange={e=>setNotes(e.target.value)}/></label><button className="primary" disabled={busy}>Salvar agendamento</button></form><p className="notice">Cadastre antes um cliente e um profissional nas abas acima.</p></section>
  <HorariosEstudio day={day} professionalId={slotPro} setProfessionalId={setSlotPro} pros={pros} clients={clients} appointments={appointments}
   onFree={(dateTime,proId)=>{setStart(dateTime);setProfessionalId(proId);setMessage('Horário selecionado. Preencha os dados em Novo agendamento e salve.');window.scrollTo({top:0,behavior:'smooth'});}}
   onOccupied={(a)=>{setDay(localDateTime(a.starts_at).slice(0,10));beginEdit(a);setMessage('Atendimento selecionado. Edite na Agenda por dia, logo abaixo.');}} />
  <section className="card"><h2>Calendário mensal</h2><CalendarioEstudio day={day} setDay={setDay} appointments={appointments} clients={clients} filterPro={filterPro}/><h2>Agenda por dia</h2><div style={{display:'flex',gap:12,flexWrap:'wrap'}}><label>Data <input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label><label>Profissional <select value={filterPro} onChange={e=>setFilterPro(e.target.value)}><option value="">Todos</option>{pros.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>{shown.length===0?<p>Nenhum agendamento nessa data.</p>:shown.map(a=><div key={a.id} style={{borderBottom:'1px solid #555',padding:'14px 0'}}><strong>{timeLabel(a.starts_at)} — {clientName(a.client_id)}</strong><p>{a.procedure_name} · {proNameOf(a.professional_id)} · {money(Number(a.price))}</p><p>Status: {a.status} · Recebido: {money(paidFor(a.id))} · Falta: {money(Math.max(0,Number(a.price)-paidFor(a.id)))}</p><label>Alterar status <select value={a.status} disabled={busy} onChange={e=>void setStatus(a,e.target.value)}>{['agendado','confirmado','concluido','cancelado'].map(s=><option key={s} value={s}>{s}</option>)}</select></label>
   
   {editingId===a.id?(
    <form className="form" style={{...inputStyle,marginTop:16,padding:16,border:'1px solid #a88331',borderRadius:10}} onSubmit={e=>void submitEdit(e)}>
     <h3 style={{color:'#d9aa3d',marginTop:0}}>Editar ou remarcar atendimento</h3>
     <label>Cliente<select required value={editClient} onChange={e=>setEditClient(e.target.value)}>
      {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
     </select></label>
     <label>Profissional<select required value={editPro} onChange={e=>setEditPro(e.target.value)}
      disabled={busy||paidFor(a.id)>0}>
      {pros.filter(p=>p.active||p.id===a.professional_id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
     </select></label>
     {paidFor(a.id)>0&&<p className="notice">Profissional bloqueado porque este atendimento já tem pagamentos e comissões vinculados.</p>}
     <label>Procedimento<input required value={editProcedure} onChange={e=>setEditProcedure(e.target.value)}/></label>
     <label>Nova data e horário<input required type="datetime-local" value={editStart} onChange={e=>setEditStart(e.target.value)}/></label>
     <label>Duração (minutos)<input required type="number" min="15" max="720" step="15" value={editDuration} onChange={e=>setEditDuration(e.target.value)}/></label>
     <label>Valor total (R$)<input required inputMode="decimal" value={editPrice} onChange={e=>setEditPrice(e.target.value)}/></label>
     <label>Observações<input value={editNotes} onChange={e=>setEditNotes(e.target.value)}/></label>
     <p className="notice">Já recebido: {money(paidFor(a.id))}. Os pagamentos anteriores não serão alterados.</p>
     <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
      <button className="primary" disabled={busy}>Salvar alterações</button>
      <button type="button" className="secondary" disabled={busy} onClick={()=>setEditingId(null)}>Cancelar edição</button>
     </div>
    </form>
   ):<button type="button" className="secondary" style={{marginTop:12}} disabled={busy} onClick={()=>beginEdit(a)}>Editar / Remarcar</button>}
   </div>)}</section>
  <section className="card"><h2>Registrar pagamento recebido</h2><p>O sinal ou pagamento final entra automaticamente no fluxo de caixa. Marcar como concluído, sozinho, não registra dinheiro.</p><form className="form" style={inputStyle} onSubmit={e=>void submit(e,addPayment)}><label>Atendimento<select required value={payAppointment} onChange={e=>setPayAppointment(e.target.value)}><option value="">Selecione</option>{appointments.filter(a=>a.status!=='cancelado'&&paidFor(a.id)<Number(a.price)).map(a=><option key={a.id} value={a.id}>{clientName(a.client_id)} · {a.procedure_name} · {timeLabel(a.starts_at)} · saldo {money(Number(a.price)-paidFor(a.id))}</option>)}</select></label><label>Tipo<select value={payType} onChange={e=>setPayType(e.target.value)}><option value="sinal">Sinal</option><option value="restante">Restante</option><option value="outro">Outro pagamento</option></select></label><label>Valor recebido (R$)<input required inputMode="decimal" value={payAmount} onChange={e=>setPayAmount(e.target.value)}/></label><label>Forma de pagamento<select value={payMethod} onChange={e=>setPayMethod(e.target.value)}>{['Pix','Dinheiro','Cartão de débito','Cartão de crédito','Transferência','Outro'].map(m=><option key={m}>{m}</option>)}</select></label><label>Data do recebimento<input required type="date" value={payDate} onChange={e=>setPayDate(e.target.value)}/></label><button className="primary" disabled={busy}>Registrar recebimento</button></form></section>
  <section className="card"><h2>Comissões previstas</h2><p>Valores calculados sobre os recebimentos registrados, sem criar despesas automáticas.</p>{pros.map(p=><p key={p.id}>{p.name}: {money(appointments.filter(a=>a.professional_id===p.id&&a.status!=='cancelado').reduce((sum,a)=>sum+paidFor(a.id)*Number(a.commission_percent)/100,0))}</p>)}</section></>}
  {message&&<p className="notice" role="status">{message}</p>}
 </div>;
}
