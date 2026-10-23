'use client';

import { useMemo } from 'react';

type Pro = { id: string; name: string; active: boolean };
type Client = { id: string; name: string };
type Appointment = {
  id: string;
  client_id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  procedure_name: string;
  price: number;
  commission_percent: number;
  notes: string;
}; 
type Props = { day: string; professionalId: string; setProfessionalId: (id: string) => void; pros: Pro[]; clients: Client[]; appointments: Appointment[]; onFree: (dateTime: string, proId: string) => void; onOccupied: (appointment: Appointment) => void };

const pad = (n: number) => String(n).padStart(2, '0');
export default function HorariosEstudio({ day, professionalId, setProfessionalId, pros, clients, appointments, onFree, onOccupied }: Props) {
  const slots = useMemo(() => {
    const rows: { label: string; local: string; matching: Appointment[] }[] = [];
    if (!day || !professionalId) return rows;
    for (let minutes = 8 * 60; minutes < 20 * 60; minutes += 30) {
      const label = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
      const local = `${day}T${label}`;
      const instant = new Date(local).getTime();
      const matching = appointments.filter(a => a.professional_id === professionalId && a.status !== 'cancelado' && new Date(a.starts_at).getTime() <= instant && new Date(a.ends_at).getTime() > instant);
      rows.push({ label, local, matching });
    }
    return rows;
  }, [day, professionalId, appointments]);
  const clientName = (id: string) => clients.find(c => c.id === id)?.name ?? 'Cliente';
  return <section className="card">
    <h2>Horários do estúdio</h2>
    <p className="notice">Visualização de 08:00 às 20:00, em intervalos de 30 minutos. Horários livres são apenas indicativos; confirme a disponibilidade antes de agendar.</p>
    <label style={{ display: 'grid', gap: 7, maxWidth: 350, marginBottom: 16 }}>Profissional
      <select value={professionalId} onChange={e => setProfessionalId(e.target.value)}>
        <option value="">Selecione um profissional</option>
        {pros.filter(p => p.active || p.id === professionalId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
    {professionalId && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 9 }}>
      {slots.map(slot => {
        const occupied = slot.matching[0];
        return <button key={slot.local} type="button" onClick={() => occupied ? onOccupied(occupied) : onFree(slot.local, professionalId)}
          style={{ textAlign: 'left', padding: 12, borderRadius: 10, border: `1px solid ${occupied ? '#a88331' : '#3b5944'}`, background: occupied ? '#2c2415' : '#17221a', color: '#f7f3e9', cursor: 'pointer', minHeight: 80 }}>
          <strong style={{ display: 'block', marginBottom: 5 }}>{slot.label}</strong>
          <span style={{ color: occupied ? '#e5b746' : '#9bd0a3', fontSize: 12 }}>{occupied ? 'Ocupado' : 'Disponível'}</span>
          {occupied && <span style={{ display: 'block', fontSize: 12, marginTop: 5, overflowWrap: 'anywhere' }}>{clientName(occupied.client_id)} · {occupied.procedure_name}</span>}
        </button>;
      })}
    </div>}
  </section>;
}
