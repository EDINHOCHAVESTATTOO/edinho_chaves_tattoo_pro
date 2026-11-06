'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createClient } from '@/lib/supabase';
import { guardianAuthorization } from '@/lib/client-documents';

type Termo = {
  id: string;
  procedure_description: string;
  tattoo_location: string;
  consent_text: string;
  signer_name: string;
  signature_data: string;
  signed_at: string;
};

const textoConsentimento = `Declaro que solicitei voluntariamente a realização do procedimento de tatuagem descrito neste documento e que recebi explicações sobre suas características e cuidados necessários.

Estou ciente de que a tatuagem envolve perfuração da pele e aplicação de pigmentos, podendo causar dor, sangramento, inchaço, irritação, infecção, reações alérgicas, alterações de pigmentação e cicatrização, inclusive cicatrizes ou queloides. Entendo que o resultado e a cicatrização variam de pessoa para pessoa e que pode haver necessidade de retoques.

Confirmo que tive oportunidade de esclarecer dúvidas, informei ao profissional condições de saúde relevantes e compreendo a importância de seguir as orientações de higiene e cuidados posteriores recebidas do estúdio. Sei que devo procurar atendimento de saúde se surgirem sinais de complicação.

Autorizo a realização da tatuagem identificada abaixo, após receber as informações necessárias, e compreendo que posso desistir antes do início do procedimento. A assinatura deste termo não afasta direitos previstos em lei nem substitui avaliação profissional ou a ficha de anamnese.`;

const campo: CSSProperties = { width: '100%', padding: 11, background: '#101010', color: '#fff', border: '1px solid #64502c', borderRadius: 7, boxSizing: 'border-box' };
const botao: CSSProperties = { padding: '10px 15px', borderRadius: 7, border: '1px solid #80642c', background: '#222', color: '#f3d17a', cursor: 'pointer' };
const escapar = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

export default function TermoConsentimento({ clientId, guardian = false }: { clientId: string; guardian?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const [nascimento, setNascimento] = useState('');
  const [documentoMenor, setDocumentoMenor] = useState('');
  const [documentoResponsavel, setDocumentoResponsavel] = useState('');
  const [vinculo, setVinculo] = useState('');
  const [telefoneResponsavel, setTelefoneResponsavel] = useState('');
  const [profissional, setProfissional] = useState('');
  const [conferiu, setConferiu] = useState(false);
  const titulo = guardian ? 'Autorização do responsável por menor de 18 anos' : 'Termo de Consentimento para Tatuagem';
  const [termos, setTermos] = useState<Termo[]>([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [assinante, setAssinante] = useState('');
  const [aceitou, setAceitou] = useState(false);
  const [temTraco, setTemTraco] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const authorizationPreview = useMemo(() => {
    if (!guardian) return { text: textoConsentimento, error: '' };
    try { return { text: guardianAuthorization({ clientName: nomeCliente, birthDate: nascimento, clientDocument: documentoMenor, guardianName: assinante, guardianDocument: documentoResponsavel, relationship: vinculo, guardianPhone: telefoneResponsavel, procedure: descricao, location: local, professional: profissional }), error: '' }; }
    catch (e) { return { text: '', error: e instanceof Error ? e.message : 'Confira os dados.' }; }
  }, [guardian, nomeCliente, nascimento, documentoMenor, assinante, documentoResponsavel, vinculo, telefoneResponsavel, descricao, local, profissional]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setErro('Entre novamente no sistema.'); setCarregando(false); return; }
    const [cliente, historico] = await Promise.all([
      supabase.from('studio_clients').select('name,phone').eq('id', clientId).eq('user_id', user.id).single(),
      supabase.from('studio_tattoo_consents').select('id,procedure_description,tattoo_location,consent_text,signer_name,signature_data,signed_at').eq('client_id', clientId).eq('user_id', user.id).order('signed_at', { ascending: false }),
    ]);
    if (cliente.error) setErro(`Não foi possível consultar o cliente: ${cliente.error.message}`);
    else { setNomeCliente(cliente.data.name); setTelefoneCliente(cliente.data.phone); setAssinante(guardian ? '' : cliente.data.name); }
    if (historico.error) setErro(`Não foi possível carregar os termos: ${historico.error.message}`);
    else setTermos(((historico.data ?? []) as Termo[]).filter(t => t.consent_text.startsWith('AUTORIZAÇÃO DO RESPONSÁVEL LEGAL') === guardian));
    setCarregando(false);
  }, [clientId, supabase, guardian]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setAberto(false); setDescricao(''); setLocal(''); setAceitou(false); setTemTraco(false); setAviso(''); }, [clientId]);

  useEffect(() => {
    if (!aberto) return;
    setTemTraco(false); setAceitou(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const largura = Math.max(1, Math.floor(canvas.getBoundingClientRect().width));
    const escala = window.devicePixelRatio || 1;
    canvas.width = Math.round(largura * escala);
    canvas.height = Math.round(180 * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(escala, 0, 0, escala, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, largura, 180);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [aberto]);

  // A signature applies only to the data that was displayed when it was drawn.
  useEffect(() => {
    setAceitou(false);
    limpar();
  }, [descricao, local, assinante, nascimento, documentoMenor, documentoResponsavel, vinculo, telefoneResponsavel, profissional]);

  function ponto(e: PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function iniciar(e: PointerEvent<HTMLCanvasElement>) {
    if (salvando) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = ponto(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y + 0.1); ctx.stroke();
    desenhando.current = true; setTemTraco(true);
  }
  function mover(e: PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const p = ponto(e); ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore();
    desenhando.current = false; setTemTraco(false);
  }

  async function salvar() {
    if (salvando) return;
    setErro(''); setAviso('');
    if (!descricao.trim() || !local.trim() || !assinante.trim()) { setErro('Preencha procedimento, região do corpo e nome do assinante.'); return; }
    if (guardian && authorizationPreview.error) { setErro(authorizationPreview.error); return; }
    if (!aceitou) { setErro(guardian ? 'O responsável precisa ler e concordar com a autorização.' : 'O cliente precisa ler e concordar com o termo.'); return; }
    if (!temTraco || !canvasRef.current) { setErro(guardian ? 'O responsável precisa assinar antes de confirmar.' : 'O cliente precisa assinar antes de confirmar.'); return; }
    if (!window.confirm(guardian ? 'Confirmar a autorização e registrar a assinatura do responsável legal? O documento assinado não poderá ser alterado nesta tela.' : 'Confirmar o consentimento e registrar a assinatura? O documento assinado não poderá ser alterado nesta tela.')) return;
    const signatureSnapshot = canvasRef.current.toDataURL('image/png');
    setSalvando(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Entre novamente no sistema.');
      if (guardian && !conferiu) throw new Error('Confira os documentos e o vínculo do responsável antes de salvar.');
      const consentText = authorizationPreview.text;
      const { error } = await supabase.from('studio_tattoo_consents').insert({
        user_id: user.id,
        client_id: clientId,
        procedure_description: descricao.trim(),
        tattoo_location: local.trim(),
        consent_text: consentText,
        signer_name: assinante.trim(),
        signature_data: signatureSnapshot,
      });
      if (error) throw error;
      setAberto(false); setDescricao(''); setLocal(''); setAceitou(false); setTemTraco(false);
      await carregar();
      setAviso(guardian ? 'Autorização do responsável assinada e salva.' : 'Termo de consentimento assinado e salvo com sucesso.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar o termo.'); }
    finally { setSalvando(false); }
  }

  function imprimir(termo: Termo) {
    const janela = window.open('', '_blank');
    if (!janela) { setErro('Permita pop-ups para imprimir o documento.'); return; }
    const tituloDocumento = termo.consent_text.startsWith('AUTORIZAÇÃO DO RESPONSÁVEL LEGAL') ? 'Autorização do responsável por menor de 18 anos' : 'Termo de Consentimento para Tatuagem';
    const papelAssinante = termo.consent_text.startsWith('AUTORIZAÇÃO DO RESPONSÁVEL LEGAL') ? 'responsável legal' : 'cliente';
    const imagemValida = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(termo.signature_data);
    const texto = escapar(termo.consent_text).replace(/\n/g, '<br>');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Termo de consentimento - ${escapar(nomeCliente)}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:30px auto;padding:0 24px;color:#222;line-height:1.5}h1{margin-bottom:4px}h2{color:#906b29;font-size:20px}.linha{border-bottom:3px solid #ad8537;margin:12px 0 24px}.texto{white-space:normal;text-align:justify}.assinatura{margin-top:30px;break-inside:avoid}.assinatura img{max-width:300px;width:100%;height:110px;object-fit:contain;object-position:left bottom;display:block}.nota{font-size:11px;color:#555;margin-top:25px}.acoes{margin:20px 0}.acoes button{padding:10px 16px;background:#906b29;color:#fff;border:0;border-radius:5px}@media print{@page{size:A4;margin:15mm}body{margin:0;padding:0}.acoes{display:none}}</style></head><body><h1>Edinho Chaves Tattoo</h1><div>${escapar(tituloDocumento)}</div><div class="linha"></div><div class="acoes"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div><p><b>Cliente:</b> ${escapar(nomeCliente)}<br><b>Telefone:</b> ${escapar(telefoneCliente)}<br><b>Procedimento:</b> ${escapar(termo.procedure_description)}<br><b>Região do corpo:</b> ${escapar(termo.tattoo_location)}</p><h2>${escapar(tituloDocumento)}</h2><div class="texto">${texto}</div><div class="assinatura">${imagemValida ? `<img src="${termo.signature_data}" alt="Assinatura do cliente">` : '<p>Assinatura não disponível.</p>'}<b>Assinatura do ${papelAssinante}:</b> ${escapar(termo.signer_name)}<br><b>Registrada em:</b> ${escapar(new Date(termo.signed_at).toLocaleString('pt-BR'))}</div><p class="nota">Assinatura gráfica registrada eletronicamente; não constitui, por si só, verificação de identidade. Documento sujeito à revisão jurídica e às normas sanitárias aplicáveis.</p></body></html>`;
    janela.document.open(); janela.document.write(html); janela.document.close();
  }

  return <section style={{ border: '1px solid #64502c', borderRadius: 10, padding: 16, marginTop: 24, background: '#151515' }}>
    <h3 style={{ color: '#e0b348', marginTop: 0 }}>{titulo}</h3>
    <p style={{ fontSize: 13, color: '#c7c0b4' }}>{guardian ? 'O responsável legal deve apresentar seus documentos, esclarecer dúvidas e assinar pessoalmente. A autorização é específica para o procedimento e não substitui o consentimento informado e a anamnese.' : 'Documento separado da anamnese. O cliente deve ler, esclarecer dúvidas e assinar pessoalmente antes do procedimento.'}</p>
    {carregando ? <p>Carregando termos…</p> : <>
      <button type="button" style={botao} onClick={() => { setAberto(v => !v); setErro(''); }}>{aberto ? 'Fechar formulário' : guardian ? 'Nova autorização para menor' : 'Novo termo de consentimento'}</button>
      {termos.length > 0 && <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <strong>Histórico de termos assinados</strong>
        {termos.map(t => <div key={t.id} style={{ border: '1px solid #393229', borderRadius: 7, padding: 12 }}>
          <div>{new Date(t.signed_at).toLocaleString('pt-BR')} · {t.procedure_description} · {t.tattoo_location}</div>
          <div style={{ marginTop: 8 }}><button type="button" style={botao} onClick={() => imprimir(t)}>Imprimir / Salvar em PDF</button></div>
        </div>)}
      </div>}
      {aberto && <div style={{ display: 'grid', gap: 14, marginTop: 18, maxWidth: 740 }}>
        {guardian && <>
          <label>Data de nascimento do menor<input type="date" style={campo} value={nascimento} onChange={e => setNascimento(e.target.value)} /></label>
          <label>Documento de identificação do menor<input style={campo} maxLength={40} value={documentoMenor} onChange={e => setDocumentoMenor(e.target.value)} /></label>
          <label>Documento do responsável (RG ou CPF)<input style={campo} maxLength={40} value={documentoResponsavel} onChange={e => setDocumentoResponsavel(e.target.value)} /></label>
          <label>Vínculo com o menor<input style={campo} placeholder="Pai, mãe ou responsável legal" maxLength={100} value={vinculo} onChange={e => setVinculo(e.target.value)} /></label>
          <label>Telefone do responsável<input style={campo} type="tel" maxLength={30} value={telefoneResponsavel} onChange={e => setTelefoneResponsavel(e.target.value)} /></label>
          <label>Profissional que realizará o procedimento<input style={campo} maxLength={150} value={profissional} onChange={e => setProfissional(e.target.value)} /></label>
          <label><input type="checkbox" checked={conferiu} onChange={e => setConferiu(e.target.checked)} /> Conferi a identificação do menor, do responsável e o vínculo de representação legal.</label>
        </>}
        <label>{guardian ? 'Procedimento autorizado (tatuagem ou piercing)' : 'Descrição da tatuagem'}<input style={campo} value={descricao} maxLength={500} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: tatuagem floral em preto e cinza" /></label>
        <label>Região do corpo<input style={campo} value={local} maxLength={200} onChange={e => setLocal(e.target.value)} placeholder="Ex.: antebraço direito" /></label>
        <div style={{ border: '1px solid #64502c', borderRadius: 7, padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.55, color: '#e6dfd1' }}>{authorizationPreview.text || authorizationPreview.error}</div>
        <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}><input type="checkbox" checked={aceitou} onChange={e => setAceitou(e.target.checked)} />Li, compreendi e concordo com o termo acima.</label>
        <label>{guardian ? 'Nome completo do responsável legal' : 'Nome completo de quem assina'}<input style={campo} maxLength={150} value={assinante} onChange={e => setAssinante(e.target.value)} /></label>
        <p style={{ margin: 0, fontSize: 13 }}>{guardian ? 'O responsável legal deve desenhar sua assinatura no campo abaixo.' : 'O cliente deve desenhar sua assinatura no campo abaixo.'}</p>
        <canvas ref={canvasRef} onPointerDown={iniciar} onPointerMove={mover} onPointerUp={() => { desenhando.current = false; }} onPointerCancel={() => { desenhando.current = false; }} aria-label={guardian ? 'Área de assinatura do responsável legal' : 'Área de assinatura do cliente'} style={{ width: '100%', maxWidth: 460, height: 180, background: '#fff', border: '1px solid #80642c', borderRadius: 6, touchAction: 'none', cursor: 'crosshair' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" style={botao} disabled={salvando} onClick={limpar}>Limpar assinatura</button>
          <button type="button" className="primary" disabled={salvando || !aceitou || !temTraco || (guardian && !conferiu)} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Confirmar e salvar termo'}</button>
        </div>
      </div>}
    </>}
    {erro && <p className="notice" role="alert">{erro}</p>}
    {aviso && <p className="notice" role="status">{aviso}</p>}
  </section>;
}
