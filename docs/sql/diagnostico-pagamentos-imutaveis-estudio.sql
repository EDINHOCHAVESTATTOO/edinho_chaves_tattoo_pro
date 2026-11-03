-- Consulta de leitura: pagamentos imutáveis associados ao estúdio do agendamento.
-- Não faz UPDATE, não desativa triggers e não concede acesso automaticamente.
-- Executar somente após validar políticas RLS de ambas as tabelas.
select
 p.id as payment_id,
 p.appointment_id,
 p.user_id as payment_owner_id,
 a.user_id as appointment_owner_id,
 a.studio_id as resolved_studio_id,
 p.studio_id as stored_studio_id,
 case
  when a.id is null then 'agendamento_ausente'
  when a.studio_id is null then 'agendamento_sem_estudio'
  when p.user_id is distinct from a.user_id then 'proprietario_divergente'
  when p.studio_id is not null and p.studio_id is distinct from a.studio_id then 'estudio_divergente'
  when p.studio_id is null then 'vinculo_resolvido_por_agendamento'
  else 'vinculo_consistente'
 end as diagnostic_status
from public.studio_payments p
left join public.studio_appointments a on a.id = p.appointment_id
order by p.id;
