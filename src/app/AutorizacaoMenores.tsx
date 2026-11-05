'use client';
import { useState } from 'react';

export default function AutorizacaoMenores(){
 const [tipo,setTipo]=useState<'tatuagem'|'piercing'>('tatuagem');
 const [menor,setMenor]=useState('');const [nascimento,setNascimento]=useState('');
 const [responsavel,setResponsavel]=useState('');const [parentesco,setParentesco]=useState('');const [documento,setDocumento]=useState('');
 const [identificacaoMenor,setIdentificacaoMenor]=useState('');const [procedimento,setProcedimento]=useState('');const [local,setLocal]=useState('');
 const [profissional,setProfissional]=useState('');const [data,setData]=useState('');
 const [conferido,setConferido]=useState(false);
 const [documentosConferidos,setDocumentosConferidos]=useState(false);
 const [normasConferidas,setNormasConferidas]=useState(false);
 const idade=nascimento?(()=>{const d=new Date(nascimento+'T12:00:00');const hoje=new Date();let n=hoje.getFullYear()-d.getFullYear();if(hoje.getMonth()<d.getMonth()||(hoje.getMonth()===d.getMonth()&&hoje.getDate()<d.getDate()))n--;return n;})():null;
 const idadeNaData = nascimento && data ? (() => { const d = new Date(nascimento + 'T12:00:00'); const a = new Date(data + 'T12:00:00'); let n = a.getFullYear() - d.getFullYear(); if (a.getMonth() < d.getMonth() || (a.getMonth() === d.getMonth() && a.getDate() < d.getDate())) n--; return n; })() : null;
 const valido=!!(menor.trim()&&nascimento&&responsavel.trim()&&parentesco.trim()&&documento.trim()&&identificacaoMenor.trim()&&procedimento.trim()&&local.trim()&&profissional.trim()&&data&&new Date(data+'T12:00:00').getTime()>=new Date(nascimento+'T12:00:00').getTime()&&conferido&&documentosConferidos&&normasConferidas&&idadeNaData!==null&&idadeNaData>=0&&idadeNaData<18);
 return <section className="card">
 <h2>Autorização para menores de 18 anos</h2>
 <p className="notice"><strong>Modelo para impressão, não autorização automática para executar o procedimento.</strong> Antes de atender, confirme a legislação vigente e as exigências da Vigilância Sanitária de Parobé/RS. A assinatura não substitui a verificação de identidade, vínculo legal, documentação e eventuais restrições de idade ou de região do corpo.</p>
 <div className="form noPrint">
 <label>Procedimento<select value={tipo} onChange={e=>{setTipo(e.target.value as 'tatuagem'|'piercing');setNormasConferidas(false)}}><option value="tatuagem">Tatuagem</option><option value="piercing">Piercing</option></select></label>
 <label>Nome completo do menor<input value={menor} onChange={e=>{setMenor(e.target.value);setDocumentosConferidos(false)}}/></label>
 <label>Data de nascimento<input type="date" value={nascimento} onChange={e=>{setNascimento(e.target.value);setNormasConferidas(false)}}/></label>
 {idadeNaData!==null&&idadeNaData>=18&&<p className="notice">Na data prevista, o cliente será maior de idade. Utilize o termo para adultos.</p>}
 {idade!==null&&<p className="muted">Idade calculada: {idade} anos{idade>=18?' — utilize o termo de adulto.':''}</p>}
 <label>Documento de identificação do menor<input value={identificacaoMenor} onChange={e=>{setIdentificacaoMenor(e.target.value);setDocumentosConferidos(false)}}/></label>
 <label>Nome completo do pai, mãe ou responsável legal<input value={responsavel} onChange={e=>{setResponsavel(e.target.value);setDocumentosConferidos(false)}}/></label>
 <label>Vínculo com o menor<input value={parentesco} onChange={e=>{setParentesco(e.target.value);setDocumentosConferidos(false)}} placeholder="Mãe, pai, tutor legal..."/></label>
 <label>Documento do responsável<input value={documento} onChange={e=>{setDocumento(e.target.value);setDocumentosConferidos(false)}}/></label>
 <label>Descrição do procedimento<input value={procedimento} onChange={e=>{setProcedimento(e.target.value);setNormasConferidas(false)}}/></label>
 <label>Região do corpo<input value={local} onChange={e=>{setLocal(e.target.value);setNormasConferidas(false)}}/></label>
 <label>Profissional responsável<input value={profissional} onChange={e=>setProfissional(e.target.value)}/></label>
 <label>Data prevista<input type="date" value={data} onChange={e=>{setData(e.target.value);setNormasConferidas(false)}}/></label>
 <label><input type="checkbox" checked={conferido} onChange={e=>setConferido(e.target.checked)}/> Confirmo que a identidade, o vínculo legal e a possibilidade jurídica/sanitária do procedimento serão verificados antes do atendimento.</label>
 <label><input type="checkbox" checked={documentosConferidos} onChange={e=>setDocumentosConferidos(e.target.checked)}/> Conferi presencialmente os documentos de identidade do menor e do responsável e a comprovação de vínculo legal.</label>
 <label><input type="checkbox" checked={normasConferidas} onChange={e=>setNormasConferidas(e.target.checked)}/> Confirmei que este procedimento, nesta idade e região do corpo, é permitido pelas normas locais aplicáveis.</label>
 <button type="button" className="primary" disabled={!valido} onClick={()=>window.print()}>Imprimir / salvar em PDF</button>
 </div>
 {valido&&<article className="autorizacaoImpressa">
 <h2>EDINHO CHAVES TATTOO</h2><h3>Autorização de responsável legal — {tipo==='tatuagem'?'Tatuagem':'Piercing'}</h3>
 <p><strong>Menor:</strong> {menor} · <strong>Nascimento:</strong> {nascimento.split('-').reverse().join('/')} · <strong>Documento:</strong> {identificacaoMenor}</p>
 <p><strong>Responsável:</strong> {responsavel} · <strong>Vínculo:</strong> {parentesco} · <strong>Documento:</strong> {documento}</p>
 <p><strong>Procedimento:</strong> {procedimento} · <strong>Região:</strong> {local} · <strong>Profissional:</strong> {profissional} · <strong>Data:</strong> {data.split('-').reverse().join('/')}</p>
 <p>Eu, responsável legal acima identificado(a), declaro que fui informado(a) sobre a natureza do procedimento, seus riscos, incluindo dor, sangramento, infecção, alergias, cicatrização e possíveis resultados permanentes. Declaro ter recebido orientações de cuidados e autorizo o procedimento descrito, <strong>somente se sua realização for permitida pela legislação e pelas normas sanitárias aplicáveis.</strong></p>
 <p>Declaro que os documentos apresentados são autênticos e que possuo poderes legais para representar o(a) menor. Reconheço que esta autorização não dispensa a avaliação profissional, a anamnese, o consentimento informado e as exigências da autoridade sanitária.</p>
 <p style={{marginTop:20}}>________________________________________<br/>Assinatura do menor (ciência, quando aplicável)</p>
 <p style={{marginTop:40}}>________________________________________<br/>Assinatura do responsável legal</p>
 <p style={{marginTop:30}}>________________________________________<br/>Assinatura do profissional</p>
 <p style={{marginTop:30}}>Local e data: ________________________________________</p>
 <small>Modelo sujeito à revisão jurídica e sanitária. Nenhum dado deste formulário é enviado ao banco de dados pelo aplicativo.</small>
 </article>}
 <style>{`.noPrint select{background:#0c0c0c;border:1px solid #383838;color:#f4f1ea;border-radius:8px;padding:12px}.noPrint input[type=checkbox]{width:18px;height:18px;accent-color:#d5a83e;padding:0}.noPrint label:has(input[type=checkbox]){display:flex;align-items:flex-start;gap:10px}@media print {@page{size:A4;margin:12mm}body *{visibility:hidden!important}.autorizacaoImpressa,.autorizacaoImpressa *{visibility:visible!important}.autorizacaoImpressa{position:absolute;top:0;left:0;box-sizing:border-box;width:100%;padding:15mm;color:#111;background:white;font:10.5pt Arial,sans-serif;line-height:1.4}.autorizacaoImpressa h2{text-align:center}.autorizacaoImpressa p{break-inside:avoid}}@media screen {.autorizacaoImpressa{margin-top:24px;border-top:1px solid #aaa;padding-top:20px}}`}</style>
 </section>;
}
