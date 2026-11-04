'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { isValidTaxId } from '@/lib/validarDocumentoFiscal';
type Draft={id:string;appointment_id:string;service_description:string;amount:number;status:string;customer_name:string|null;customer_tax_id:string|null};
export default function NotasFiscaisEstudio(){
 const [drafts,setDrafts]=useState<Draft[]>([]);
 const [message,setMessage]=useState('Carregando rascunhos...');
 const [appointments,setAppointments]=useState<{id:string;procedure_name:string;price:number;status:string;client_id:string}[]>([]);
 const [selected,setSelected]=useState('');
 const [clients,setClients]=useState<{id:string;name:string}[]>([]);
 const [studio,setStudio]=useState('');
 const [owner,setOwner]=useState('');
 const [busy,setBusy]=useState(false);
 const [authorized,setAuthorized]=useState(false);
 const [customerName,setCustomerName]=useState('');
 const [customerTaxId,setCustomerTaxId]=useState('');
 const [description,setDescription]=useState('');
 useEffect(()=>{
  let active=true;
  async function load(){
   const db=createClient();
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user){if(active)setMessage('Faça login novamente.');return;}
   const {data:profile,error:profileError}=await db.from('profiles').select('studio_id,role').eq('id',user.id).single();
   if(profileError||profile?.role!=='owner'||!profile.studio_id){if(active)setMessage('Acesso restrito ao administrador.');return;}
   const {data,error}=await db.from('studio_nfse_drafts').select('id,appointment_id,service_description,amount,status,customer_name,customer_tax_id').eq('studio_id',profile.studio_id).order('created_at',{ascending:false}).limit(100);
   const ap=await db.from('studio_appointments').select('id,procedure_name,price,status,client_id').eq('studio_id',profile.studio_id).eq('status','concluido').order('starts_at',{ascending:false}).limit(500);
   const customerList=await db.from('studio_clients').select('id,name').eq('studio_id',profile.studio_id).limit(1000);
   if(active){
    const loadError=error||ap.error||customerList.error;
    if(loadError){setMessage('Não foi possível carregar os dados fiscais. Atualize a página e tente novamente.');return;}
    setClients((customerList.data??[]) as {id:string;name:string}[]);
    setDrafts((data??[]) as Draft[]);
    setAppointments((ap.data??[]) as typeof appointments);
    setStudio(profile.studio_id);setOwner(user.id);setAuthorized(true);setMessage('');
   }
  }
  void load();return()=>{active=false};
 },[]);
 async function saveDraft(){
  const appointment=appointments.find(a=>a.id===selected);
  if(!appointment||busy||drafts.some(d=>d.appointment_id===selected))return;
  setBusy(true);setMessage('');
  try{
   const db=createClient();const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user||user.id!==owner)throw new Error('Sessão inválida.');
   const {data:profile,error:profileError}=await db.from('profiles').select('studio_id,role').eq('id',user.id).single();
   if(profileError||profile?.role!=='owner'||!profile.studio_id||profile.studio_id!==studio)throw new Error('Acesso ao estúdio não autorizado.');
   const {data:currentAppointment,error:appointmentError}=await db.from('studio_appointments').select('id,price,status').eq('id',appointment.id).eq('studio_id',studio).single();
   if(appointmentError||!currentAppointment||currentAppointment.status!=='concluido'||!Number.isFinite(Number(currentAppointment.price))||Number(currentAppointment.price)<=0)throw new Error('Atendimento indisponível para rascunho fiscal. Atualize a página.');
   const cleanTaxId=customerTaxId.replace(/\D/g,'');
   if(!description.trim()||description.trim().length>500)throw new Error('Informe uma descrição válida (até 500 caracteres).');
   if(cleanTaxId&&!isValidTaxId(cleanTaxId))throw new Error('CPF/CNPJ inválido: confira os dígitos verificadores.');
   if(customerTaxId.trim()&&!/^[0-9.\/-]+$/.test(customerTaxId.trim()))throw new Error('CPF/CNPJ contém caracteres inválidos.');
   const {error}=await db.from('studio_nfse_drafts').insert({studio_id:studio,user_id:owner,appointment_id:appointment.id,service_description:description.trim(),amount:currentAppointment.price,customer_name:customerName.trim()||null,customer_tax_id:cleanTaxId||null});
   if(error){if(error.code==='23505')throw new Error('Já existe um rascunho fiscal para este atendimento. Atualize a página.');throw error;}
   setMessage('Rascunho criado. Nenhuma nota foi emitida.');setSelected('');setCustomerName('');setCustomerTaxId('');setDescription('');
   const {data,error:refreshError}=await db.from('studio_nfse_drafts').select('id,appointment_id,service_description,amount,status,customer_name,customer_tax_id').eq('studio_id',studio).order('created_at',{ascending:false}).limit(100);
   if(refreshError)setMessage('Rascunho criado, mas não foi possível atualizar a lista. Reabra a página para conferir.');
   else setDrafts((data??[]) as Draft[]);
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar.');}finally{setBusy(false)}
 }
 if(!authorized)return <section className="card"><h2>Notas fiscais MEI</h2><p role="status">{message}</p></section>;
 return <section className="card"><h2>Notas fiscais MEI</h2><p className="notice">Módulo em homologação. Nenhuma nota fiscal é emitida nesta tela.</p>{message&&<p role="status">{message}</p>}<h3>Novo rascunho</h3>{appointments.length===0&&<p className="notice">Nenhum atendimento concluído disponível. Finalize um atendimento na Agenda antes de preparar uma nota fiscal.</p>}<p>Selecione um atendimento concluído. O valor é obtido diretamente da agenda.</p><label>Atendimento <select value={selected} onChange={e=>{setSelected(e.target.value);setDescription(appointments.find(a=>a.id===e.target.value)?.procedure_name||'');setCustomerName(clients.find(c=>c.id===appointments.find(a=>a.id===e.target.value)?.client_id)?.name||'');setCustomerTaxId('');}}><option value="">Selecione</option>{appointments.filter(a=>Number(a.price)>0&&!drafts.some(d=>d.appointment_id===a.id)).map(a=><option key={a.id} value={a.id}>{a.procedure_name} · {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(a.price))}</option>)}</select></label><label>Descrição do serviço <input maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} /></label><label>Nome do tomador <input value={customerName} onChange={e=>setCustomerName(e.target.value)} /></label><label>CPF/CNPJ (quando aplicável) <input inputMode="numeric" value={customerTaxId} onChange={e=>setCustomerTaxId(e.target.value)} /></label><button className="primary" disabled={!selected||busy||!description.trim()} onClick={()=>void saveDraft()}>{busy?'Salvando...':'Criar rascunho'}</button><h3>Rascunhos fiscais</h3>{drafts.length===0?<p>Nenhum rascunho cadastrado.</p>:<ul>{drafts.map(d=><li key={d.id}>{d.service_description} · {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(d.amount))} · {d.status}</li>)}</ul>}</section>;
}
