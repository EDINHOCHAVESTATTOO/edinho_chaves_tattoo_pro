-- Auditoria somente leitura para preparar migração de acesso por estúdio.
-- Execute com permissão administrativa em ambiente de teste.
-- Não altera tabelas, políticas ou registros.
select 'studio_clients' as tabela,count(*) as total,count(*) filter(where p.id is null) as sem_perfil
from public.studio_clients t left join public.profiles p on p.id=t.user_id
union all select 'studio_professionals',count(*),count(*) filter(where p.id is null)
from public.studio_professionals t left join public.profiles p on p.id=t.user_id
union all select 'studio_appointments',count(*),count(*) filter(where p.id is null)
from public.studio_appointments t left join public.profiles p on p.id=t.user_id
union all select 'studio_payments',count(*),count(*) filter(where p.id is null)
from public.studio_payments t left join public.profiles p on p.id=t.user_id
union all select 'studio_commissions',count(*),count(*) filter(where p.id is null)
from public.studio_commissions t left join public.profiles p on p.id=t.user_id
union all select 'cash_entries',count(*),count(*) filter(where p.id is null)
from public.cash_entries t left join public.profiles p on p.id=t.user_id
union all select 'studio_anamneses',count(*),count(*) filter(where p.id is null)
from public.studio_anamneses t left join public.profiles p on p.id=t.user_id
union all select 'studio_anamnesis_signatures',count(*),count(*) filter(where p.id is null)
from public.studio_anamnesis_signatures t left join public.profiles p on p.id=t.user_id
union all select 'studio_tattoo_consents',count(*),count(*) filter(where p.id is null)
from public.studio_tattoo_consents t left join public.profiles p on p.id=t.user_id;

-- Verificar referências entre módulos antes de preencher studio_id.
select 'appointment_client_different_studio' as check_name,count(*) as violations
from public.studio_appointments a
join public.studio_clients c on c.id=a.client_id
join public.profiles pa on pa.id=a.user_id
join public.profiles pc on pc.id=c.user_id
where pa.studio_id is distinct from pc.studio_id
union all
select 'payment_appointment_different_studio',count(*)
from public.studio_payments p
join public.studio_appointments a on a.id=p.appointment_id
join public.profiles pp on pp.id=p.user_id
join public.profiles pa on pa.id=a.user_id
where pp.studio_id is distinct from pa.studio_id
union all
select 'anamnesis_client_different_studio',count(*)
from public.studio_anamneses an
join public.studio_clients c on c.id=an.client_id
join public.profiles pan on pan.id=an.user_id
join public.profiles pc on pc.id=c.user_id
where pan.studio_id is distinct from pc.studio_id
union all
select 'consent_client_different_studio',count(*)
from public.studio_tattoo_consents tc
join public.studio_clients c on c.id=tc.client_id
join public.profiles pt on pt.id=tc.user_id
join public.profiles pc on pc.id=c.user_id
where pt.studio_id is distinct from pc.studio_id;
