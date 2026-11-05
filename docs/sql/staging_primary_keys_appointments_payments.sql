-- Applied and verified on staging prflqdbkgxjgbidzhfbc on 2026-11-05.
-- Do not blindly reapply to production; inspect existing constraints first.
alter table public.studio_appointments add constraint studio_appointments_pkey primary key (id);
alter table public.studio_payments add constraint studio_payments_pkey primary key (id);

-- Verified in pg_constraint: both pkey constraints exist.
-- Existing records were retained. Production database unchanged.
