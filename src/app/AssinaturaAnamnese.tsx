'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Assinatura = {
  id: string;
  signer_name: string;
  signature_data: string;
  signed_at: string;
};

type Props = {
  anamnesisId: string;
  clientName: string;
};

export default function AssinaturaAnamnese({ anamnesisId, clientName }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const [nome, setNome] = useState(clientName);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [temTraco, setTemTraco] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => { setNome(clientName); }, [clientName]);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      setMensagem('');
      setAssinatura(null);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (!ativo) return;
      if (authError || !user) {
        setMensagem('Entre novamente no sistema.');
        setCarregando(false);
        return;
      }
      const { data, error } = await supabase
        .from('studio_anamnesis_signatures')
        .select('id,signer_name,signature_data,signed_at')
        .eq('user_id', user.id)
        .eq('anamnesis_id', anamnesisId)
        .maybeSingle();
      if (!ativo) return;
      if (error) setMensagem(`Não foi possível consultar a assinatura: ${error.message}`);
      else setAssinatura((data ?? null) as Assinatura | null);
      setCarregando(false);
    }
    void carregar();
    return () => { ativo = false; };
  }, [anamnesisId, supabase]);

  useEffect(() => {
    if (carregando || assinatura) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ajustar = () => {
      if (temTraco) return;
      const largura = Math.max(280, Math.floor(canvas.getBoundingClientRect().width));
      const altura = 180;
      const escala = window.devicePixelRatio || 1;
      canvas.width = Math.round(largura * escala);
      canvas.height = Math.round(altura * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, largura, altura);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };
    ajustar();
    window.addEventListener('resize', ajustar);
    return () => window.removeEventListener('resize', ajustar);
  }, [carregando, assinatura, temTraco]);

  function ponto(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = e.currentTarget;
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (salvando) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = ponto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
    desenhando.current = true;
    setTemTraco(true);
  }

  function mover(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = e.currentTarget.getContext('2d');
    if (!ctx) return;
    const p = ponto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function parar() { desenhando.current = false; }

  function limpar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setTemTraco(false);
    setMensagem('');
  }

  async function confirmar() {
    if (salvando || assinatura) return;
    if (!nome.trim()) { setMensagem('Informe o nome de quem está assinando.'); return; }
    if (!temTraco || !canvasRef.current) { setMensagem('Faça a assinatura antes de confirmar.'); return; }
    if (!window.confirm('Confirmar o registro desta assinatura? Depois de salva, ela não poderá ser substituída nesta tela.')) return;
    setSalvando(true);
    setMensagem('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Entre novamente no sistema.');
      const imagem = canvasRef.current.toDataURL('image/png');
      const { data, error } = await supabase
        .from('studio_anamnesis_signatures')
        .insert({ user_id: user.id, anamnesis_id: anamnesisId, signer_name: nome.trim(), signature_data: imagem })
        .select('id,signer_name,signature_data,signed_at')
        .single();
      if (error) throw error;
      setAssinatura(data as Assinatura);
      setMensagem('Assinatura registrada com sucesso.');
    } catch (err) {
      setMensagem(err instanceof Error ? err.message : 'Não foi possível registrar a assinatura.');
    } finally { setSalvando(false); }
  }

  return (
    <section style={{ marginTop: 16, padding: 16, border: '1px solid #80642c', borderRadius: 8 }}>
      <h4 style={{ marginTop: 0, color: '#e0b348' }}>Assinatura do cliente</h4>
      {carregando ? <p>Carregando assinatura…</p> : assinatura ? (
        <div>
          <p><strong>Assinada por:</strong> {assinatura.signer_name}</p>
          <p><strong>Registrada em:</strong> {new Date(assinatura.signed_at).toLocaleString('pt-BR')}</p>
          {/* Imagem sensível: exibida apenas dentro da ficha autenticada. */}
          <img src={assinatura.signature_data} alt="Assinatura registrada" style={{ display: 'block', maxWidth: '100%', width: 460, background: '#fff', borderRadius: 5 }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <label>Nome de quem assina
            <input value={nome} maxLength={150} onChange={e => setNome(e.target.value)} style={{ display: 'block', width: '100%', maxWidth: 460, padding: 10, marginTop: 6 }} />
          </label>
          <p style={{ margin: 0, fontSize: 13 }}>O cliente deve assinar pessoalmente na tela, com o dedo, caneta ou mouse.</p>
          <canvas ref={canvasRef} onPointerDown={iniciar} onPointerMove={mover} onPointerUp={parar} onPointerCancel={parar} aria-label="Área para desenhar a assinatura" style={{ width: '100%', maxWidth: 460, height: 180, display: 'block', border: '1px solid #80642c', borderRadius: 6, background: '#fff', touchAction: 'none', cursor: 'crosshair' }} />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" onClick={limpar} disabled={salvando}>Limpar</button>
            <button type="button" className="primary" onClick={() => void confirmar()} disabled={salvando || !temTraco}>{salvando ? 'Salvando…' : 'Confirmar assinatura'}</button>
          </div>
        </div>
      )}
      {mensagem && <p role="status" style={{ fontSize: 13 }}>{mensagem}</p>}
      <p style={{ fontSize: 12, opacity: 0.75 }}>Este registro gráfico não verifica, por si só, a identidade do assinante nem substitui o termo de consentimento do procedimento.</p>
    </section>
  );
}
