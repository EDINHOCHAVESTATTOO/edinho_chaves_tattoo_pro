-- Applied to Supabase staging only on 2026-11-05.
-- Checked each table for duplicate or NULL id values before applying.
alter table public.cash_entries add constraint cash_entries_pkey primary key (id);
alter table public.profiles add constraint profiles_pkey primary key (id);
alter table public.studio_anamnesis_signatures add constraint studio_anamnesis_signatures_pkey primary key (id);
alter table public.studio_clients add constraint studio_clients_pkey primary key (id);
alter table public.studio_commissions add constraint studio_commissions_pkey primary key (id);
alter table public.studio_professionals add constraint studio_professionals_pkey primary key (id);
alter table public.studio_tattoo_consents add constraint studio_tattoo_consents_pkey primary key (id);
-- Post-migration verification: zero public base tables without a primary key.
-- Do not apply to production without independent schema review.
