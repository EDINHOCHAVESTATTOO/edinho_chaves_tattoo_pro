'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type CSSProperties } from 'react';
import { createClient } from '@/lib/supabase';
import AssinaturaAnamnese from './AssinaturaAnamnese';

type Resposta = 'sim' | 'nao' | '';
type Pergunta = { id: string; texto: string };
type Respostas = Record<string, string>;
type Registro = { id: string; answers: Respostas; status: 'rascunho' | 'finalizada'; created_at: string; finalized_at: string | null };

const perguntas: Pergunta[] = [
  { id: 'alergias', texto: 'Possui alergias (tintas, pigmentos, látex, metais, antissépticos ou outras)?' },
  { id: 'medicamentos', texto: 'Faz uso contínuo ou recente de medicamentos, inclusive anticoagulantes?' },
  { id: 'sangramento', texto: 'Possui alterações de coagulação ou histórico de sangramento excessivo?' },
  { id: 'cicatrizacao', texto: 'Já teve problemas de cicatrização ou infecção após procedimentos na pele?' },
  { id: 'queloides', texto: 'Tem tendência a queloides ou cicatrizes elevadas?' },
  { id: 'pele', texto: 'Possui condição de pele, irritação, ferida ou inflamação na região a tatuar?' },
  { id: 'diabetes', texto: 'Possui diabetes ou outra condição que possa interferir na cicatrização?' },
  { id: 'imunidade', texto: 'Possui condição ou tratamento que reduza a imunidade?' },
  { id: 'desmaios', texto: 'Já teve desmaios, convulsões ou mal-estar durante procedimentos?' },
  { id: 'gravidez', texto: 'Está grávida ou amamentando (quando aplicável)?' },
  { id: 'procedimento', texto: 'Já teve reação adversa a tatuagens ou procedimentos semelhantes?' },
  { id: 'outras', texto: 'Existe outra informação de saúde relevante que deseja comunicar ao profissional?' },
];

const campo: CSSProperties = { width: '100%', padding: 11, background: '#101010', color: '#fff', border: '1px solid #64502c', borderRadius: 7 };
const botao: CSSProperties = { padding: '10px 15px', borderRadius: 7, border: '1px solid #80642c', background: '#222', color: '#f3d17a', cursor: 'pointer' };
const formatoData = (valor: string) => new Date(valor).toLocaleString('pt-BR');
const escaparHtml = (valor: unknown) => String(valor ?? '').replace(/[&<>"']/g, caractere => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caractere] ?? caractere);

export default function AnamneseEstudio({ clientId }: { clientId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [respostas, setRespostas] = useState<Respostas>({});
  const [rascunhoId, setRascunhoId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [imprimindoId, setImprimindoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [assinandoId, setAssinandoId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) { setErro('Entre novamente no sistema.'); setCarregando(false); return; }
    const { data: cliente } = await supabase.from('studio_clients').select('name').eq('id', clientId).eq('user_id', user.id).maybeSingle();
    setClienteNome(cliente?.name ?? '');
    const { data, error } = await supabase.from('studio_anamneses')
      .select('id,answers,status,created_at,finalized_at')
      .eq('user_id', user.id).eq('client_id', clientId)
      .order('created_at', { ascending: false });
    if (error) { setErro(`Não foi possível carregar a anamnese: ${error.message}`); setRegistros([]); }
    else setRegistros((data ?? []) as Registro[]);
    setCarregando(false);
  }, [supabase, clientId]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setAberto(false); setRespostas({}); setRascunhoId(null); setDetalhe(null); setAssinandoId(null); setAviso(''); }, [clientId]);

  function iniciar() {
    const existente = registros.find(r => r.status === 'rascunho');
    setRespostas(existente?.answers ?? {});
    setRascunhoId(existente?.id ?? null);
    setAberto(true);
    setErro(''); setAviso('');
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const finalizar = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'finalizar';
    if (salvando) return;
    setErro(''); setAviso('');
    if (finalizar && perguntas.some(p => !['sim', 'nao'].includes(respostas[p.id] ?? ''))) {
      setErro('Responda Sim ou Não a todas as perguntas antes de finalizar.'); return;
    }
    setSalvando(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error('Entre novamente no sistema.');
      const valores = { answers: respostas, status: finalizar ? 'finalizada' : 'rascunho', finalized_at: finalizar ? new Date().toISOString() : null };
      const resultado = rascunhoId
        ? await supabase.from('studio_anamneses').update(valores).eq('id', rascunhoId).eq('client_id', clientId).eq('user_id', user.id).eq('status', 'rascunho').select('id').single()
        : await supabase.from('studio_anamneses').insert({ ...valores, client_id: clientId, user_id: user.id }).select('id').single();
      if (resultado.error) throw resultado.error;
      if (!resultado.data) throw new Error('Não foi possível confirmar o salvamento.');
      if (finalizar) { setAberto(false); setRascunhoId(null); setRespostas({}); setAviso('Anamnese finalizada e registrada. Assinatura e consentimento serão implementados separadamente.'); }
      else { setRascunhoId(resultado.data.id); setAviso('Rascunho salvo com sucesso.'); }
      await carregar();
    } catch (err) { setErro(err instanceof Error ? err.message : 'Erro ao salvar a anamnese.'); }
    finally { setSalvando(false); }
  }

  async function imprimir(registro: Registro) {
    if (imprimindoId) return;
    setErro('');
    // Abre a janela no clique, antes da operação assíncrona, para evitar bloqueio de pop-ups.
    const janela = window.open('', '_blank');
    if (!janela) { setErro('O navegador bloqueou a janela. Permita pop-ups para imprimir a anamnese.'); return; }
    janela.document.write('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Preparando anamnese</title></head><body><p>Preparando relatório…</p></body></html>');
    setImprimindoId(registro.id);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!user || authError) throw new Error('Sessão expirada. Entre novamente no sistema.');
      const { data: cliente, error: clientError } = await supabase.from('studio_clients')
        .select('name,phone').eq('id', clientId).eq('user_id', user.id).single();
      if (clientError || !cliente) throw new Error('Não foi possível identificar o cliente.');
      const linhas = perguntas.map(p => {
        const resposta = registro.answers?.[p.id] === 'sim' ? 'Sim' : registro.answers?.[p.id] === 'nao' ? 'Não' : 'Não respondido';
        return `<div class="pergunta"><strong>${escaparHtml(p.texto)}</strong><span>${resposta}</span></div>`;
      }).join('');
      const detalhes = escaparHtml(registro.answers?.detalhes || 'Nenhum');
      const documento = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Anamnese - ${escaparHtml(cliente.name)}</title>
<style>
*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#202020;max-width:920px;margin:24px auto;padding:0 22px;line-height:1.4}h1{font-size:29px;margin:0}h2{font-size:20px;color:#936a23;margin:25px 0 12px}.sub{color:#555;margin:4px 0 16px}.barra{border-bottom:3px solid #aa812f;margin:12px 0 20px}.acoes{margin:16px 0 22px}.acoes button{background:#a47c2c;border:0;color:white;padding:12px 18px;border-radius:5px;cursor:pointer}.dados{margin:14px 0}.pergunta{border-bottom:1px solid #ddd;padding:9px 0;break-inside:avoid;page-break-inside:avoid}.pergunta strong{display:block;font-size:13px}.pergunta span{display:block;margin-top:3px;font-size:13px}.detalhes{border:1px solid #d5c4a2;padding:12px;white-space:pre-wrap;overflow-wrap:anywhere;break-inside:avoid}.assinaturas{display:flex;gap:35px;margin-top:80px;break-inside:avoid;page-break-inside:avoid}.assinatura{flex:1;border-top:1px solid #333;text-align:center;padding-top:7px;font-size:12px}.nota{font-size:11px;color:#555;margin-top:25px}.status{font-size:12px;color:#555}@media print{@page{size:A4;margin:15mm}body{margin:0;max-width:none;padding:0}.acoes{display:none!important}h2{break-after:avoid;page-break-after:avoid}.assinaturas{margin-top:65px}}@media(max-width:550px){.assinaturas{display:block}.assinatura{margin-top:65px}}
</style></head><body><h1>Edinho Chaves Tattoo</h1><div class="sub">Ficha de anamnese · Emitida em ${escaparHtml(new Date().toLocaleDateString('pt-BR'))}</div><div class="barra"></div><div class="acoes"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div>
<h2>Identificação do cliente</h2><div class="dados"><strong>Nome:</strong> ${escaparHtml(cliente.name)}<br/><strong>Telefone:</strong> ${escaparHtml(cliente.phone)}<br/><strong>Registro:</strong> ${escaparHtml(formatoData(registro.created_at))}<br/><strong>Situação:</strong> ${registro.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}${registro.finalized_at ? `<br/><strong>Finalização:</strong> ${escaparHtml(formatoData(registro.finalized_at))}` : ''}</div>
<h2>Questionário de saúde</h2>${linhas}<h2>Informações adicionais</h2><div class="detalhes">${detalhes}</div><div class="assinaturas"><div class="assinatura">Assinatura do cliente</div><div class="assinatura">Assinatura do profissional</div></div><p class="nota">Documento de anamnese para conferência e assinatura manuscrita. Os espaços de assinatura em branco não comprovam assinatura ou consentimento. O termo de consentimento do procedimento é um documento separado. Contém dados pessoais sensíveis: armazenar e compartilhar apenas de forma autorizada.</p></body></html>`;
      janela.document.open();
      janela.document.write(documento);
      janela.document.close();
    } catch (err) {
      janela.close();
      setErro(err instanceof Error ? err.message : 'Erro ao preparar a impressão.');
    } finally { setImprimindoId(null); }
  }

  return <section style={{ border: '1px solid #64502c', borderRadius: 10, padding: 16, marginTop: 24, background: '#151515' }}>
    <h3 style={{ color: '#e0b348', marginTop: 0 }}>Ficha de anamnese</h3>
    <p style={{ color: '#c7c0b4', fontSize: 13 }}>Informações sensíveis de saúde. Acesso reservado ao estúdio. O preenchimento não substitui avaliação profissional nem o termo de consentimento.</p>
    {carregando ? <p>Carregando anamneses…</p> : <>
      <button type="button" style={botao} onClick={iniciar} disabled={salvando}>{registros.some(r => r.status === 'rascunho') ? 'Continuar rascunho' : 'Nova anamnese'}</button>
      {registros.length > 0 && <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        <strong>Histórico de anamneses</strong>
        {registros.map(r => <div key={r.id} style={{ border: '1px solid #393229', padding: 10, borderRadius: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{formatoData(r.created_at)} · {r.status === 'finalizada' ? 'Finalizada' : 'Rascunho'}</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={botao} disabled={imprimindoId !== null} onClick={() => void imprimir(r)}>{imprimindoId === r.id ? 'Preparando…' : 'Imprimir / Salvar em PDF'}</button>
              {r.status === 'finalizada' && <button type="button" style={botao} onClick={() => setAssinandoId(atual => atual === r.id ? null : r.id)}>{assinandoId === r.id ? 'Fechar assinatura' : 'Assinar digitalmente / Consultar assinatura'}</button>}
              <button type="button" style={botao} onClick={() => setDetalhe(detalhe === r.id ? null : r.id)}>{detalhe === r.id ? 'Ocultar' : 'Consultar'}</button>
            </div>
          </div>
          {r.status === 'finalizada' && assinandoId === r.id && <AssinaturaAnamnese key={r.id} anamnesisId={r.id} clientName={clienteNome} />}
          {detalhe === r.id && <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {perguntas.map(p => <div key={p.id}><strong>{p.texto}</strong><div>{r.answers?.[p.id] === 'sim' ? 'Sim' : r.answers?.[p.id] === 'nao' ? 'Não' : 'Não respondido'}</div></div>)}
            <div><strong>Detalhes informados:</strong> {r.answers?.detalhes || 'Nenhum'}</div>
            {r.finalized_at && <div><strong>Finalizada em:</strong> {formatoData(r.finalized_at)}</div>}
          </div>}
        </div>)}
      </div>}
      {aberto && <form onSubmit={e => void salvar(e)} style={{ marginTop: 18, display: 'grid', gap: 15 }}>
        <h4 style={{ margin: 0 }}>Preenchimento da anamnese</h4>
        {perguntas.map(p => <fieldset key={p.id} style={{ border: '1px solid #393229', borderRadius: 8, padding: 12 }}>
          <legend style={{ padding: '0 5px' }}>{p.texto}</legend>
          <div style={{ display: 'flex', gap: 24, paddingTop: 5 }}>
            {(['sim', 'nao'] as Resposta[]).map(v => <label key={v} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <input type="radio" name={`anamnese-${p.id}`} value={v} checked={respostas[p.id] === v} onChange={() => setRespostas(atual => ({ ...atual, [p.id]: v }))}/>{v === 'sim' ? 'Sim' : 'Não'}
            </label>)}
          </div>
        </fieldset>)}
        <label>Detalhes das respostas positivas, medicamentos e outras observações relevantes
          <textarea style={campo} rows={5} maxLength={5000} value={respostas.detalhes ?? ''} onChange={e => setRespostas(atual => ({ ...atual, detalhes: e.target.value }))} placeholder="Descreva informações adicionais fornecidas pelo cliente"/>
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="primary" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar rascunho'}</button>
          <button type="submit" value="finalizar" style={botao} disabled={salvando}>Finalizar anamnese</button>
          <button type="button" style={botao} disabled={salvando} onClick={() => setAberto(false)}>Fechar</button>
        </div>
      </form>}
    </>}
    {erro && <p className="notice" role="alert">{erro}</p>}
    {aviso && <p className="notice" role="status">{aviso}</p>}
  </section>;
}
