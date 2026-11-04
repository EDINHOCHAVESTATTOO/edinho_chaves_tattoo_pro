'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';

type ScheduleItem = {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  procedure_name: string;
  status: string;
};

function localDay() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

export default function AgendaProfissional() {
  const supabase = useMemo(() => createClient(), []);
  const [day, setDay] = useState(localDay);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      // A consulta não recebe o ID do profissional: o banco identifica
      // o usuário autenticado e filtra o vínculo autorizado.
      const start = new Date(day + 'T00:00:00');
      if (Number.isNaN(start.getTime())) {
        setError('Escolha uma data válida.');
        setLoading(false);
        return;
      }
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const { data, error: queryError } = await supabase.rpc('my_professional_schedule', {
        from_time: start.toISOString(),
        until_time: end.toISOString(),
      });
      if (!active) return;
      if (queryError) {
        setItems([]);
        setError('Não foi possível carregar a agenda. Peça ao administrador para verificar seu vínculo.');
      } else {
        setItems((data ?? []) as ScheduleItem[]);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [day, supabase]);

  return <section className="card">
    <h2>Minha agenda</h2>
    <p className="muted">Visualização dos seus atendimentos. Informações financeiras e dados de saúde não são exibidos.</p>
    <label>Data <input type="date" value={day} onChange={e => setDay(e.target.value)} /></label>
    {loading ? <p role="status">Carregando horários…</p> : error ? <p role="alert">{error}</p> : items.length === 0 ?
      <p>Nenhum atendimento encontrado nesta data.</p> :
      <ul>{items.map(item => <li key={item.appointment_id}>
        <strong>{new Date(item.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
        {' – '}{new Date(item.ends_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        {' · '}{item.procedure_name} · {item.status}
      </li>)}</ul>}
  </section>;
}
