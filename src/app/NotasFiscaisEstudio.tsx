'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
type Draft={id:string;appointment_id:string;service_description:string;amount:number;status:string;customer_name:string|null;customer_tax_id:string|null};
export default function NotasFiscaisEstudio(){
 const [drafts,setDrafts]=useState<Draft[]>([]);
 const [message,setMessage]=useState('Carregando rascunhos...');
 const [appointments,setAppointments]=useState<{id:string;procedure_name:string;price:number;status:string}[]>([]);
 const [selected,setSelected]=useState('');
 const [studio,setStudio]=useState('');
 const [owner,setOwner]=useState('');
 const [busy,setBusy]=useState(false);
 const [customerName,setCustomerName]=useState('');
 const [customerTaxId,setCustomerTaxId]=useState('');
 const [description,setDescription]=useState('');
 useEffect(()=>{
  let active=true;
  async function load(){
   const db=createClient();
   const {data:{user}}=await db.auth.getUser();
   if(!user){if(active)setMessage('Faça login.');return;}
   const {data:profile}=await db.from('profiles').select('studio_id,role').eq('id',user.id).single();
   if(profile?.role!=='owner'||!profile.studio_id){if(active)setMessage('Acesso restrito ao administrador.');return;}
   const {data,error}=await db.from('studio_nfse_drafts').select('id,appointment_id,service_description,amount,status,customer_name,customer_tax_id').eq('studio_id',profile.studio_id).limit(100);
   const ap=await db.from('studio_appointments').select('id,procedure_name,price,status').eq('studio_id',profile.studio_id).eq('status','concluido').limit(500);
   if(active){setDrafts((data??[]) as Draft[]);setAppointments((ap.data??[]) as typeof appointments);setStudio(profile.studio_id);setOwner(user.id);setMessage(error?.message||ap.error?.message||'');}
  }
  void load();return()=>{active=false};
 },[]);
 async function saveDraft(){
  const appointment=appointments.find(a=>a.id===selected);
  if(!appointment||busy||drafts.some(d=>d.appointment_id===selected))return;
  setBusy(true);setMessage('');
  try{
   const db=createClient();const {data:{user}}=await db.auth.getUser();
   if(user?.id!==owner)throw new Error('Sessão inválida.');
   const cleanTaxId=customerTaxId.replace(/\D/g,'');
   if(!description.trim()||description.length>500)throw new Error('Informe uma descrição válida (até 500 caracteres).');
   if(cleanTaxId&&!([11,14].includes(cleanTaxId.length)))throw new Error('CPF/CNPJ deve ter 11 ou 14 dígitos.');
   const {error}=await db.from('studio_nfse_drafts').insert({studio_id:studio,user_id:owner,appointment_id:appointment.id,service_description:description.trim(),amount:appointment.price,customer_name:customerName.trim()||null,customer_tax_id:cleanTaxId||null});
   if(error)throw error;
   setMessage('Rascunho criado. Nenhuma nota foi emitida.');setSelected('');setCustomerName('');setCustomerTaxId('');setDescription('');
   const {data}=await db.from('studio_nfse_drafts').select('id,appointment_id,service_description,amount,status,customer_name,customer_tax_id').eq('studio_id',studio).limit(100);
   setDrafts((data??[]) as Draft[]);
  }catch(e){setMessage(e instanceof Error?e.message:'Falha ao salvar.');}finally{setBusy(false)}
 }
 return <section className="card"><h2>Notas fiscais MEI</h2><p className="notice">Módulo em homologação. Nenhuma nota fiscal é emitida nesta tela.</p>{message&&<p role="status">{message}</p>}<h3>Novo rascunho</h3><p>Selecione um atendimento concluído. O valor é obtido diretamente da agenda.</p><label>Atendimento <select value={selected} onChange={e=>{setSelected(e.target.value);setDescription(appointments.find(a=>a.id===e.target.value)?.procedure_name||'');setCustomerName('');setCustomerTaxId('');}}><option value="">Selecione</option>{appointments.filter(a=>Number(a.price)>0&&!drafts.some(d=>d.appointment_id===a.id)).map(a=><option key={a.id} value={a.id}>{a.procedure_name} · R$ {Number(a.price).toFixed(2)}</option>)}</select></label><label>Descrição do serviço <input maxLength={500} value={description} onChange={e=>setDescription(e.target.value)} /></label><label>Nome do tomador <input value={customerName} onChange={e=>setCustomerName(e.target.value)} /></label><label>CPF/CNPJ (quando aplicável) <input inputMode="numeric" value={customerTaxId} onChange={e=>setCustomerTaxId(e.target.value)} /></label><button className="primary" disabled={!selected||busy||!description.trim()} onClick={()=>void saveDraft()}>{busy?'Salvando...':'Criar rascunho'}</button><h3>Rascunhos fiscais</h3>{drafts.length===0?<p>Nenhum rascunho cadastrado.</p>:<ul>{drafts.map(d=><li key={d.id}>{d.service_description} · R$ {Number(d.amount).toFixed(2)} · {d.status}</li>)}</ul>}</section>;
}
