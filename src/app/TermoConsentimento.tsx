'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { createClient } from '@/lib/supabase';

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

export default function TermoConsentimento({ clientId }: { clientId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
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
    else { setNomeCliente(cliente.data.name); setTelefoneCliente(cliente.data.phone); setAssinante(cliente.data.name); }
    if (historico.error) setErro(`Não foi possível carregar os termos: ${historico.error.message}`);
    else setTermos((historico.data ?? []) as Termo[]);
    setCarregando(false);
  }, [clientId, supabase]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setAberto(false); setDescricao(''); setLocal(''); setAceitou(false); setTemTraco(false); setAviso(''); }, [clientId]);

  useEffect(() => {
    if (!aberto) return;
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
    if (!aceitou) { setErro('O cliente precisa ler e concordar com o termo.'); return; }
    if (!temTraco || !canvasRef.current) { setErro('O cliente precisa assinar antes de confirmar.'); return; }
    if (!window.confirm('Confirmar o consentimento e registrar a assinatura? O documento assinado não poderá ser alterado nesta tela.')) return;
    setSalvando(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Entre novamente no sistema.');
      const { error } = await supabase.from('studio_tattoo_consents').insert({
        user_id: user.id,
        client_id: clientId,
        procedure_description: descricao.trim(),
        tattoo_location: local.trim(),
        consent_text: textoConsentimento,
        signer_name: assinante.trim(),
        signature_data: canvasRef.current!.toDataURL('image/png'),
      });
      if (error) throw error;
      setAberto(false); setDescricao(''); setLocal(''); setAceitou(false); setTemTraco(false);
      await carregar();
      setAviso('Termo de consentimento assinado e salvo com sucesso.');
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar o termo.'); }
    finally { setSalvando(false); }
  }

  function imprimir(termo: Termo) {
    const janela = window.open('', '_blank');
    if (!janela) { setErro('Permita pop-ups para imprimir o documento.'); return; }
    const imagemValida = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(termo.signature_data);
    const texto = escapar(termo.consent_text).replace(/\n/g, '<br>');
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Termo de consentimento - ${escapar(nomeCliente)}</title><style>body{font-family:Arial,sans-serif;max-width:850px;margin:30px auto;padding:0 24px;color:#222;line-height:1.5}h1{margin-bottom:4px}h2{color:#906b29;font-size:20px}.linha{border-bottom:3px solid #ad8537;margin:12px 0 24px}.texto{white-space:normal;text-align:justify}.assinatura{margin-top:30px;break-inside:avoid}.assinatura img{max-width:300px;width:100%;height:110px;object-fit:contain;object-position:left bottom;display:block}.nota{font-size:11px;color:#555;margin-top:25px}.acoes{margin:20px 0}.acoes button{padding:10px 16px;background:#906b29;color:#fff;border:0;border-radius:5px}@media print{@page{size:A4;margin:15mm}body{margin:0;padding:0}.acoes{display:none}}</style></head><body><h1>Edinho Chaves Tattoo</h1><div>Termo de Consentimento para Tatuagem</div><div class="linha"></div><div class="acoes"><button onclick="window.print()">Imprimir / Salvar em PDF</button></div><p><b>Cliente:</b> ${escapar(nomeCliente)}<br><b>Telefone:</b> ${escapar(telefoneCliente)}<br><b>Procedimento:</b> ${escapar(termo.procedure_description)}<br><b>Região do corpo:</b> ${escapar(termo.tattoo_location)}</p><h2>Declaração de consentimento</h2><div class="texto">${texto}</div><div class="assinatura">${imagemValida ? `<img src="${termo.signature_data}" alt="Assinatura do cliente">` : '<p>Assinatura não disponível.</p>'}<b>Assinatura do cliente:</b> ${escapar(termo.signer_name)}<br><b>Registrada em:</b> ${escapar(new Date(termo.signed_at).toLocaleString('pt-BR'))}</div><p class="nota">Assinatura gráfica registrada eletronicamente; não constitui, por si só, verificação de identidade. Documento sujeito à revisão jurídica e às normas sanitárias aplicáveis.</p></body></html>`;
    janela.document.open(); janela.document.write(html); janela.document.close();
  }

  return <section style={{ border: '1px solid #64502c', borderRadius: 10, padding: 16, marginTop: 24, background: '#151515' }}>
    <h3 style={{ color: '#e0b348', marginTop: 0 }}>Termo de Consentimento para Tatuagem</h3>
    <p style={{ fontSize: 13, color: '#c7c0b4' }}>Documento separado da anamnese. O cliente deve ler, esclarecer dúvidas e assinar pessoalmente antes do procedimento.</p>
    {carregando ? <p>Carregando termos…</p> : <>
      <button type="button" style={botao} onClick={() => { setAberto(v => !v); setErro(''); }}>{aberto ? 'Fechar formulário' : 'Novo termo de consentimento'}</button>
      {termos.length > 0 && <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        <strong>Histórico de termos assinados</strong>
        {termos.map(t => <div key={t.id} style={{ border: '1px solid #393229', borderRadius: 7, padding: 12 }}>
          <div>{new Date(t.signed_at).toLocaleString('pt-BR')} · {t.procedure_description} · {t.tattoo_location}</div>
          <div style={{ marginTop: 8 }}><button type="button" style={botao} onClick={() => imprimir(t)}>Imprimir / Salvar em PDF</button></div>
        </div>)}
      </div>}
      {aberto && <div style={{ display: 'grid', gap: 14, marginTop: 18, maxWidth: 740 }}>
        <label>Descrição da tatuagem<input style={campo} value={descricao} maxLength={500} onChange={e => setDescricao(e.target.value)} placeholder="Ex.: tatuagem floral em preto e cinza" /></label>
        <label>Região do corpo<input style={campo} value={local} maxLength={200} onChange={e => setLocal(e.target.value)} placeholder="Ex.: antebraço direito" /></label>
        <div style={{ border: '1px solid #64502c', borderRadius: 7, padding: 14, whiteSpace: 'pre-wrap', lineHeight: 1.55, color: '#e6dfd1' }}>{textoConsentimento}</div>
        <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}><input type="checkbox" checked={aceitou} onChange={e => setAceitou(e.target.checked)} />Li, compreendi e concordo com o termo acima.</label>
        <label>Nome completo de quem assina<input style={campo} maxLength={150} value={assinante} onChange={e => setAssinante(e.target.value)} /></label>
        <p style={{ margin: 0, fontSize: 13 }}>O cliente deve desenhar sua assinatura no campo abaixo.</p>
        <canvas ref={canvasRef} onPointerDown={iniciar} onPointerMove={mover} onPointerUp={() => { desenhando.current = false; }} onPointerCancel={() => { desenhando.current = false; }} aria-label="Área de assinatura do cliente" style={{ width: '100%', maxWidth: 460, height: 180, background: '#fff', border: '1px solid #80642c', borderRadius: 6, touchAction: 'none', cursor: 'crosshair' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" style={botao} disabled={salvando} onClick={limpar}>Limpar assinatura</button>
          <button type="button" className="primary" disabled={salvando || !aceitou || !temTraco} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Confirmar e salvar termo'}</button>
        </div>
      </div>}
    </>}
    {erro && <p className="notice" role="alert">{erro}</p>}
    {aviso && <p className="notice" role="status">{aviso}</p>}
  </section>;
}
