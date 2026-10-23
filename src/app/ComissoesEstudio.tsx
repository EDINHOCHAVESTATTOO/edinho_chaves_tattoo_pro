'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Comissao = {
  id: string;
  payment_id: string;
  professional_id: string;
  base_amount: number;
  rate_percent: number;
  commission_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

const moeda = (valor: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const nomes: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  paid: 'Paga',
  cancelled: 'Cancelada',
};

export default function ComissoesEstudio() {
  const supabase = useMemo(() => createClient(), []);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [profissionais, setProfissionais] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [filtro, setFiltro] = useState('todos');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');

    const { data: { user }, error: erroAuth } = await supabase.auth.getUser();
    if (erroAuth || !user) {
      setErro('Faça login novamente.');
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from('studio_commissions')
      .select('id,payment_id,professional_id,base_amount,rate_percent,commission_amount,status,created_at,paid_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setErro(error.message);
      setCarregando(false);
      return;
    }

    const registros = (data ?? []) as Comissao[];
    setComissoes(registros);
    const ids = [...new Set(registros.map(c => c.professional_id))];

    if (ids.length > 0) {
      const { data: lista, error: erroProfissionais } = await supabase
        .from('studio_professionals')
        .select('id,name')
        .eq('user_id', user.id)
        .in('id', ids);

      if (erroProfissionais) setErro(erroProfissionais.message);
      else setProfissionais(Object.fromEntries((lista ?? []).map(p => [p.id, p.name])));
    } else {
      setProfissionais({});
    }
    setCarregando(false);
  }, [supabase]);

  useEffect(() => { void carregar(); }, [carregar]);

  const total = (status: string) =>
    comissoes.filter(c => c.status === status)
      .reduce((soma, c) => soma + Number(c.commission_amount), 0);

  const filtradas = filtro === 'todos'
    ? comissoes
    : comissoes.filter(c => c.status === filtro);

  async function marcarComoPaga(comissao: Comissao) {
    if (comissao.status !== 'approved' || salvandoId !== null) return;
    if (!window.confirm(`Confirmar que a comissão de ${moeda(Number(comissao.commission_amount))} já foi paga? Esta ação não poderá ser desfeita pela tela.`)) return;

    setSalvandoId(comissao.id);
    setErro('');
    setAviso('');

    try {
      const { data: { user }, error: erroAuth } = await supabase.auth.getUser();
      if (erroAuth || !user) throw new Error('Sessão expirada. Entre novamente.');

      // A condição status=approved impede pagar novamente ou liberar uma comissão pendente.
      // O gatilho no banco valida a transição e protege registros já pagos.
      const { data, error } = await supabase
        .from('studio_commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', comissao.id)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .select('id');

      if (error) throw error;
      if (!data || data.length !== 1) {
        throw new Error('A comissão não foi atualizada. Ela pode já ter sido paga ou ter mudado de situação.');
      }

      await carregar();
      setAviso('Pagamento da comissão registrado com sucesso.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar o pagamento.');
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="cards">
        {([
          ['Pendentes', total('pending')],
          ['Aprovadas', total('approved')],
          ['Pagas', total('paid')],
        ] as const).map(([titulo, valor]) => (
          <div className="card" key={titulo}>
            <span>{titulo}</span>
            <h2>{moeda(valor)}</h2>
          </div>
        ))}
      </div>

      <section className="card">
        <h2>Controle de comissões</h2>
        <p style={{ color: '#c9bda4' }}>
          Comissões calculadas sobre os pagamentos recebidos.
          A liberação acontece após a conclusão da tatuagem.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <select
            aria-label="Filtrar comissões"
            value={filtro}
            onChange={e => setFiltro(e.target.value)}
            style={{ background: '#191919', color: '#e0b348', padding: 10, border: '1px solid #705a30', borderRadius: 6 }}
          >
            <option value="todos">Todas</option>
            <option value="pending">Pendentes</option>
            <option value="approved">Aprovadas</option>
            <option value="paid">Pagas</option>
            <option value="cancelled">Canceladas</option>
          </select>
          <button type="button" className="secondary" disabled={carregando || salvandoId !== null} onClick={() => void carregar()}>
            Atualizar
          </button>
        </div>

        {erro && <p className="notice" role="alert">{erro}</p>}
        {aviso && <p className="notice" role="status">{aviso}</p>}

        {carregando ? <p>Carregando...</p> : filtradas.length === 0 ? <p>Nenhuma comissão encontrada.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Profissional', 'Recebido', '%', 'Comissão', 'Situação', 'Data do pagamento', 'Ação'].map(t => (
                  <th key={t} style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #66512d', color: '#e0b348', whiteSpace: 'nowrap' }}>{t}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtradas.map(c => (
                  <tr key={c.id}>
                    <td style={{ padding: 12, borderBottom: '1px solid #333' }}>{profissionais[c.professional_id] ?? 'Profissional'}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #333' }}>{moeda(Number(c.base_amount))}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #333' }}>{Number(c.rate_percent)}%</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #333' }}>{moeda(Number(c.commission_amount))}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #333' }}>{nomes[c.status] ?? c.status}</td>
                    <td style={{ padding: 12, borderBottom: '1px solid #333', whiteSpace: 'nowrap' }}>
                      {c.paid_at ? new Date(c.paid_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #333' }}>
                      {c.status === 'approved' ? (
                        <button type="button" className="primary" disabled={salvandoId !== null} onClick={() => void marcarComoPaga(c)} style={{ whiteSpace: 'nowrap' }}>
                          {salvandoId === c.id ? 'Registrando...' : 'Marcar como paga'}
                        </button>
                      ) : <span style={{ color: '#b5a98f' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
