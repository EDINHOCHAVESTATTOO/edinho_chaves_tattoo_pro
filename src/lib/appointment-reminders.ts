export const DAY_MS = 24 * 60 * 60 * 1000;
export const GRACE_MS = 15 * 60 * 1000;
export function dueReminder(a: {starts_at:string;status:string;is_homologation:boolean}, now:number) {
 const due = Date.parse(a.starts_at) - DAY_MS;
 return a.is_homologation === false && ['agendado','confirmado'].includes(a.status) && Number.isFinite(due) && due <= now && due > now-GRACE_MS;
}
export function reminderPhone(value:string) {
 if(!/^[+0-9().\s-]+$/.test(value))throw new Error('invalid_phone');
 const digits=value.replace(/[^0-9]/g,'');
 const phone=digits.startsWith('55')?digits:`55${digits}`;
 if(!/^55[0-9]{10,11}$/.test(phone))throw new Error('invalid_phone');
 return phone;
}
export function reminderTemplate(name:string, language:string, client:string, startsAt:string) {
 const when=new Date(startsAt);
 const date=when.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 const time=when.toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
 return {name,language:{code:language},components:[{type:'body',parameters:[client,date,time].map(text=>({type:'text',text}))}]};
}
