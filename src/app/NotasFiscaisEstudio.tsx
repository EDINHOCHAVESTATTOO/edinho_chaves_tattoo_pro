'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
type Draft={id:string;service_description:string;amount:number;status:string};
export default function NotasFiscaisEstudio(){
 const [drafts,setDrafts]=useState<Draft[]>([]);
 const [message,setMessage]=useState('Carregando rascunhos...');
 useEffect(()=>{
  let active=true;
  async function load(){
   const db=createClient();
   const {data:{user}}=await db.auth.getUser();
   if(!user){if(active)setMessage('Faça login.');return;}
   const {data:profile}=await db.from('profiles').select('studio_id,role').eq('id',user.id).single();
   if(profile?.role!=='owner'||!profile.studio_id){if(active)setMessage('Acesso restrito ao administrador.');return;}
   const {data,error}=await db.from('studio_nfse_drafts').select('id,service_description,amount,status').eq('studio_id',profile.studio_id).limit(100);
   if(active){setDrafts((data??[]) as Draft[]);setMessage(error?error.message:'');}
  }
  void load();return()=>{active=false};
 },[]);
 return <section className="card"><h2>Notas fiscais MEI</h2><p className="notice">Módulo em homologação. Nenhuma nota fiscal é emitida nesta tela.</p>{message&&<p role="status">{message}</p>}<h3>Rascunhos fiscais</h3>{drafts.length===0?<p>Nenhum rascunho cadastrado.</p>:<ul>{drafts.map(d=><li key={d.id}>{d.service_description} · R$ {Number(d.amount).toFixed(2)} · {d.status}</li>)}</ul>}</section>;
}
