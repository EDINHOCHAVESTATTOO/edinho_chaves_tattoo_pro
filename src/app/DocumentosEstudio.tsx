'use client';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {createClient} from '@/lib/supabase';
const TERMS='Declaro que recebi orientações sobre o procedimento, riscos, cuidados posteriores e necessidade de informar condições de saúde relevantes. Autorizo o procedimento indicado, após esclarecimento das minhas dúvidas. Para menores de 18 anos, é indispensável a presença e assinatura do responsável legal e a verificação presencial de documentos. O cadastro digital não substitui assinatura ou exigências legais locais.';
type Client={id:string;name:string};
type Consent={id:string;client_id:string;service_type:string;birth_date:string|null;guardian_name:string|null;accepted:boolean;created_at:string};
type Attachment={id:string;client_id:string;filename:string;storage_path:string;created_at:string};
export default function DocumentosEstudio({clients}:{clients:Client[]}){
 const db=useMemo(()=>createClient(),[]);
 const [clientId,setClientId]=useState(''),[service,setService]=useState('Tatuagem'),[birth,setBirth]=useState(''),[guardian,setGuardian]=useState(''),[guardianDoc,setGuardianDoc]=useState(''),[relationship,setRelationship]=useState(''),[health,setHealth]=useState(''),[accepted,setAccepted]=useState(false);
 const [consents,setConsents]=useState<Consent[]>([]),[attachments,setAttachments]=useState<Attachment[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const reload=async()=>{const [a,b]=await Promise.all([db.from('studio_consents').select('id,client_id,service_type,birth_date,guardian_name,accepted,created_at').order('created_at',{ascending:false}).limit(100),db.from('studio_attachments').select('id,client_id,filename,storage_path,created_at').order('created_at',{ascending:false}).limit(100)]);if(a.error||b.error)setMessage(a.error?.message||b.error?.message||'Erro ao carregar');else{setConsents(a.data||[]);setAttachments(b.data||[])}};
 useEffect(()=>{void reload()},[db]);
 const minor=Boolean(birth&&new Date(birth+'T12:00:00')>new Date(new Date().getFullYear()-18,new Date().getMonth(),new Date().getDate()));
 const clientName=(id:string)=>clients.find(c=>c.id===id)?.name||'Cliente';
 const save=async(e:FormEvent)=>{e.preventDefault();if(!clientId)return setMessage('Selecione o cliente.');if(minor&&(!guardian.trim()||!guardianDoc.trim()||!relationship.trim()))return setMessage('Preencha todos os dados do responsável legal.');if(!accepted)return setMessage('Registre o aceite antes de salvar.');setBusy(true);setMessage('');try{const {data:{user}}=await db.auth.getUser();if(!user)throw Error('Entre novamente.');const {error}=await db.from('studio_consents').insert({user_id:user.id,client_id:clientId,service_type:service,birth_date:birth||null,guardian_name:guardian||null,guardian_document:guardianDoc||null,guardian_relationship:relationship||null,health_notes:health||null,consent_text:TERMS,accepted:true,accepted_at:new Date().toISOString()});if(error)throw error;setMessage('Ficha registrada. Colete assinatura e confira documentos presencialmente.');setAccepted(false);await reload()}catch(err){setMessage(err instanceof Error?err.message:'Falha ao salvar')}finally{setBusy(false)}};
 const upload=async(file:File|null)=>{if(!file||!clientId)return setMessage('Selecione um cliente e um arquivo.');if(file.size>5242880)return setMessage('Limite de 5 MB por arquivo.');if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))return setMessage('Envie PDF, JPG, PNG ou WebP.');setBusy(true);try{const {data:{user}}=await db.auth.getUser();if(!user)throw Error('Entre novamente.');const path=user.id+'/'+clientId+'/'+crypto.randomUUID()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const {error:uploadError}=await db.storage.from('studio-private-docs').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;const {error}=await db.from('studio_attachments').insert({user_id:user.id,client_id:clientId,filename:file.name,storage_path:path,content_type:file.type});if(error){await db.storage.from('studio-private-docs').remove([path]);throw error}setMessage('Arquivo anexado com acesso privado.');await reload()}catch(err){setMessage(err instanceof Error?err.message:'Erro no anexo')}finally{setBusy(false)}};
 const open=async(path:string)=>{const {data,error}=await db.storage.from('studio-private-docs').createSignedUrl(path,60);if(error||!data?.signedUrl)return setMessage('Não foi possível abrir o anexo.');window.open(data.signedUrl,'_blank','noopener,noreferrer')};
 return <div style={{display:'grid',gap:16}}>
 <section className="card"><h2>Ficha de atendimento e consentimento</h2><p>Registro interno. Menores exigem responsável legal, documentos e assinatura presencial. Verifique as regras locais antes do procedimento.</p>
 <form className="form" onSubmit={save} style={{maxWidth:620}}>
 <label>Cliente<select required value={clientId} onChange={e=>setClientId(e.target.value)}><option value="">Selecione</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 <label>Procedimento<select value={service} onChange={e=>setService(e.target.value)}><option>Tatuagem</option><option>Piercing</option><option>Retoque</option></select></label>
 <label>Data de nascimento<input type="date" value={birth} onChange={e=>setBirth(e.target.value)}/></label>
 {minor&&<p className="notice">Menor de 18 anos: autorização do responsável legal obrigatória. A ficha não libera o atendimento automaticamente.</p>}
 <label>Nome do responsável legal<input value={guardian} onChange={e=>setGuardian(e.target.value)} required={minor}/></label>
 <label>Documento do responsável (para conferência presencial)<input value={guardianDoc} onChange={e=>setGuardianDoc(e.target.value)} required={minor}/></label>
 <label>Vínculo com menor<input value={relationship} onChange={e=>setRelationship(e.target.value)} required={minor}/></label>
 <label>Informações relevantes declaradas pelo cliente<textarea rows={3} value={health} onChange={e=>setHealth(e.target.value)} placeholder="Preencher somente informações necessárias ao atendimento"/></label>
 <p style={{whiteSpace:'pre-wrap'}}>{TERMS}</p>
 <label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Declaro que o texto foi apresentado e o aceite registrado.</label>
 <button className="primary" disabled={busy||!clientId}>Salvar ficha</button></form></section>
 <section className="card"><h2>Anexos privados</h2><p>Comprovantes, autorizações assinadas e documentos necessários. PDF ou imagem até 5 MB. Evite armazenar dados desnecessários.</p><label>Cliente selecionado: {clientName(clientId)}<input type="file" accept=".pdf,image/jpeg,image/png,image/webp" disabled={busy||!clientId} onChange={e=>{void upload(e.target.files?.[0]||null);e.target.value=''}}/></label>
 {attachments.map(a=><p key={a.id}><button type="button" onClick={()=>void open(a.storage_path)}>{a.filename}</button> — {clientName(a.client_id)}</p>)}</section>
 <section className="card"><h2>Fichas registradas</h2>{consents.length===0?<p>Nenhuma ficha registrada.</p>:consents.map(c=><p key={c.id}>{clientName(c.client_id)} · {c.service_type} · {new Date(c.created_at).toLocaleDateString('pt-BR')} · {c.guardian_name?'Responsável: '+c.guardian_name:'Adulto / idade não informada'} · Aceite registrado</p>)}</section>
 {message&&<p className="notice" role="status">{message}</p>}
 </div>;
}
