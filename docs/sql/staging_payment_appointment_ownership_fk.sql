-- Applied and verified on staging only, 2026-11-05.
-- Before applying: zero mismatched/orphan payments.
alter table public.studio_appointments
  add constraint studio_appointments_id_user_studio_unique unique (id,user_id,studio_id);
alter table public.studio_payments
  add constraint studio_payments_appointment_owner_fk
  foreign key (appointment_id,user_id,studio_id)
  references public.studio_appointments(id,user_id,studio_id)
  on update restrict on delete restrict;
-- Verified with pg_get_constraintdef. Production unchanged.
