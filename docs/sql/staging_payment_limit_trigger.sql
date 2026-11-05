-- Applied only to Supabase staging project prflqdbkgxjgbidzhfbc on 2026-11-05.
-- Production application requires independent review, migration and approval.
create or replace function public.studio_validate_payment_limit()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare v_appointment record; v_paid numeric;
begin
  if new.amount is null or new.amount <= 0 or round(new.amount,2) <> new.amount then
    raise exception 'Valor do pagamento deve ser positivo e ter no máximo duas casas decimais';
  end if;
  select a.user_id,a.studio_id,a.price,a.status into v_appointment
    from public.studio_appointments a
    where a.id=new.appointment_id for update;
  if not found or v_appointment.user_id is distinct from new.user_id then
    raise exception 'Agendamento inválido para este usuário';
  end if;
  if v_appointment.status='cancelado' then
    raise exception 'Não é possível receber pagamento de atendimento cancelado';
  end if;
  if v_appointment.studio_id is null then
    raise exception 'Agendamento sem estúdio associado';
  end if;
  if new.studio_id is not null and new.studio_id<>v_appointment.studio_id then
    raise exception 'Estúdio do pagamento não corresponde ao agendamento';
  end if;
  new.studio_id:=v_appointment.studio_id;
  select coalesce(sum(p.amount),0) into v_paid from public.studio_payments p
    where p.appointment_id=new.appointment_id;
  if v_paid+new.amount>coalesce(v_appointment.price,0) then
    raise exception 'Pagamento supera o saldo do atendimento';
  end if;
  return new;
end;
$$;
create trigger studio_payment_limit_before_insert
before insert on public.studio_payments
for each row execute function public.studio_validate_payment_limit();
