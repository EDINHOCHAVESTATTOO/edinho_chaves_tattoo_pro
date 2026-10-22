'use client';

import { useEffect, useMemo, useState } from 'react';

type AtendimentoCalendario = {
  starts_at: string;
  professional_id: string;
  status: string;
  client_id: string;
  procedure_name: string;
};
type ClienteCalendario = { id: string; name: string };
type Props = {
  day: string;
  setDay: (day: string) => void;
  appointments: AtendimentoCalendario[];
  clients: ClienteCalendario[];
  filterPro: string;
};

const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const week = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const appointmentDay = (iso: string) => localISO(new Date(iso));
const appointmentTime = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function CalendarioEstudio({ day, setDay, appointments, clients, filterPro }: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => day.slice(0, 7));
  useEffect(() => {
    if (day && day.slice(0, 7) !== visibleMonth) setVisibleMonth(day.slice(0, 7));
    // Sincroniza a visualização somente quando a data selecionada mudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);
  const [year, month] = visibleMonth.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const offset = first.getDay();
  const count = new Date(year, month, 0).getDate();
  const today = localISO(new Date());
  const names = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);
  const byDay = useMemo(() => {
    const result: Record<string, AtendimentoCalendario[]> = {};
    for (const a of appointments) {
      if (filterPro && a.professional_id !== filterPro) continue;
      if (a.status === 'cancelado') continue;
      const key = appointmentDay(a.starts_at);
      (result[key] ??= []).push(a);
    }
    for (const items of Object.values(result)) items.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return result;
  }, [appointments, filterPro]);
  const move = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setVisibleMonth(localISO(d).slice(0, 7));
  };
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(first);

  return <div style={{ marginBottom: 22, maxWidth: 900 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
      <button type="button" className="secondary" onClick={() => move(-1)} aria-label="Mês anterior">‹</button>
      <strong style={{ textTransform: 'capitalize', color: '#d9aa3d' }}>{monthName}</strong>
      <button type="button" className="secondary" onClick={() => move(1)} aria-label="Próximo mês">›</button>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 5 }}>
      {week.map(w => <span key={w} style={{ textAlign: 'center', fontSize: 12, color: '#c9b88f', padding: '7px 0' }}>{w}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={`empty-${i}`} />)}
      {Array.from({ length: count }, (_, i) => {
        const d = `${visibleMonth}-${String(i + 1).padStart(2, '0')}`;
        const items = byDay[d] ?? [];
        const selected = day === d;
        const visible = items.slice(0, 2);
        return <button key={d} type="button" onClick={() => setDay(d)}
          aria-label={`${i + 1} de ${monthName}, ${items.length} agendamentos`}
          aria-pressed={selected}
          title={items.map(a => `${appointmentTime(a.starts_at)} - ${names.get(a.client_id) ?? 'Cliente'}`).join('\n')}
          style={{ minHeight: 78, padding: '7px 4px', borderRadius: 9, border: selected ? '2px solid #e0b044' : d === today ? '1px solid #a88331' : items.length ? '1px solid #9a762b' : '1px solid #343434', background: selected ? '#d9aa3d' : items.length ? '#262117' : '#1b1b1b', color: selected ? '#111' : '#f4f4f4', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: 3, overflow: 'hidden', width: '100%' }}>
          <strong>{i + 1}</strong>
          {items.length ? <>
            <span style={{ fontSize: 10, fontWeight: 700, color: selected ? '#171717' : '#d9aa3d' }}>{items.length} atendimento{items.length === 1 ? '' : 's'}</span>
            {visible.map((a, index) => <span key={`${a.client_id}-${a.starts_at}-${index}`} style={{ fontSize: 10, lineHeight: 1.3, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? '#111' : '#eee' }}>
              {appointmentTime(a.starts_at)} {names.get(a.client_id) ?? 'Cliente'}
            </span>)}
            {items.length > 2 && <span style={{ fontSize: 10, color: selected ? '#111' : '#d9aa3d' }}>+{items.length - 2} mais</span>}
          </> : <span style={{ fontSize: 10, color: selected ? '#171717' : '#888' }}>—</span>}
        </button>;
      })}
    </div>
    <p style={{ fontSize: 12, color: '#c9b88f', marginTop: 10 }}>Selecione um dia para ver os horários abaixo. Até dois clientes aparecem por dia; os demais ficam na agenda diária. Cancelados não entram na contagem.</p>
  </div>;
}
