'use client';

import { useMemo, useState } from 'react';

type AtendimentoCalendario = { starts_at: string; professional_id: string; status: string };
type Props = {
  day: string;
  setDay: (day: string) => void;
  appointments: AtendimentoCalendario[];
  filterPro: string;
};

const localISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dateOf = (iso: string) => localISO(new Date(iso));
const week = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function CalendarioEstudio({day, setDay, appointments, filterPro}: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => day.slice(0,7));
  const [year, month] = visibleMonth.split('-').map(Number);
  const first = new Date(year, month-1, 1);
  const offset = first.getDay();
  const count = new Date(year, month, 0).getDate();
  const today = localISO(new Date());
  const totals = useMemo(() => {
    const result: Record<string,number> = {};
    for (const a of appointments) {
      if (filterPro && a.professional_id !== filterPro) continue;
      if (a.status === 'cancelado') continue;
      const key = dateOf(a.starts_at);
      result[key] = (result[key] ?? 0) + 1;
    }
    return result;
  }, [appointments,filterPro]);
  const move = (delta:number) => {
    const d = new Date(year, month-1+delta, 1);
    setVisibleMonth(localISO(d).slice(0,7));
  };
  const monthName = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(first);
  return <div style={{marginBottom:22,maxWidth:680}}>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:14}}>
      <button type="button" className="secondary" onClick={()=>move(-1)} aria-label="Mês anterior">‹</button>
      <strong style={{textTransform:'capitalize',color:'#d9aa3d'}}>{monthName}</strong>
      <button type="button" className="secondary" onClick={()=>move(1)} aria-label="Próximo mês">›</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(7,minmax(0,1fr))',gap:5}}>
      {week.map(w=><span key={w} style={{textAlign:'center',fontSize:12,color:'#c9b88f',padding:'7px 0'}}>{w}</span>)}
      {Array.from({length:offset},(_,i)=><span key={`empty-${i}`} />)}
      {Array.from({length:count},(_,i)=>{
        const d = `${visibleMonth}-${String(i+1).padStart(2,'0')}`;
        const n = totals[d] ?? 0;
        const selected = day===d;
        return <button key={d} type="button" onClick={()=>setDay(d)} aria-label={`${i+1} de ${monthName}, ${n} agendamentos`} aria-pressed={selected}
          style={{minHeight:57,padding:'6px 2px',borderRadius:9,border:selected?'2px solid #e0b044':d===today?'1px solid #a88331':'1px solid #343434',background:selected?'#d9aa3d':'#1b1b1b',color:selected?'#111':'#f4f4f4',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4}}>
          <strong>{i+1}</strong>
          <span style={{fontSize:10,color:selected?'#171717':n?'#d9aa3d':'#888'}}>{n ? `${n} marcado${n===1?'':'s'}` : '—'}</span>
        </button>;
      })}
    </div>
    <p style={{fontSize:12,color:'#c9b88f',marginTop:10}}>Selecione um dia para ver os horários abaixo. Agendamentos cancelados não entram na contagem.</p>
  </div>;
}
