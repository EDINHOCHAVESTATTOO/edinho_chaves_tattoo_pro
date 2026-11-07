-- REVIEW ONLY: do not apply without production change approval.
-- Prevent lowering appointment price below already received payments.
-- Tested equivalent rule on staging. Review permissions and migration window first.
create or replace function public.studio_guard_appointment_paid_balance()
returns trigger language plpgsql security invoker set search_path = ''
as $$
declare v_paid numeric;
begin
 if new.price is null or new.price < 0 then
   raise exception 'Preço do atendimento inválido';
 end if;
 if new.price is distinct from old.price then
   select coalesce(sum(amount),0) into v_paid
   from public.studio_payments where appointment_id=old.id and user_id=old.user_id;
   if new.price < v_paid then
     raise exception 'Preço não pode ser inferior ao total já recebido';
   end if;
 end if;
 return new;
end;
$$;
create trigger studio_guard_appointment_paid_balance_before_update
before update of price on public.studio_appointments
for each row execute function public.studio_guard_appointment_paid_balance();
