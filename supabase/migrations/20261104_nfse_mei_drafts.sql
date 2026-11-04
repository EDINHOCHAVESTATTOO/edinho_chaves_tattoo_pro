-- NFS-e MEI: rascunhos fiscais. Não emite documentos fiscais.
create table if not exists public.studio_nfse_drafts (
 id uuid primary key default gen_random_uuid(),
 studio_id uuid not null,
 user_id uuid not null references auth.users(id),
 appointment_id uuid not null,
 service_description text not null,
 amount numeric(12,2) not null check(amount > 0),
 customer_name text,
 customer_tax_id text,
 status text not null default 'draft' check(status in ('draft','ready_for_review')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(studio_id,appointment_id)
);
alter table public.studio_nfse_drafts enable row level security;
revoke all on public.studio_nfse_drafts from anon;
grant select,insert,update on public.studio_nfse_drafts to authenticated;
drop policy if exists nfse_owner_select on public.studio_nfse_drafts;
create policy nfse_owner_select on public.studio_nfse_drafts for select to authenticated using (
 user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner' and p.studio_id=studio_nfse_drafts.studio_id)
);
drop policy if exists nfse_owner_insert on public.studio_nfse_drafts;
create policy nfse_owner_insert on public.studio_nfse_drafts for insert to authenticated with check (
 user_id=(select auth.uid()) and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner' and p.studio_id=studio_nfse_drafts.studio_id)
 and exists(select 1 from public.studio_appointments a where a.id=studio_nfse_drafts.appointment_id and a.user_id=(select auth.uid()) and a.studio_id=studio_nfse_drafts.studio_id and a.status='concluido' and a.price=studio_nfse_drafts.amount)
);
drop policy if exists nfse_owner_update on public.studio_nfse_drafts;
create policy nfse_owner_update on public.studio_nfse_drafts for update to authenticated using (
 user_id=(select auth.uid()) and status='draft' and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner' and p.studio_id=studio_nfse_drafts.studio_id)
) with check (
 user_id=(select auth.uid()) and status in ('draft','ready_for_review') and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner' and p.studio_id=studio_nfse_drafts.studio_id)
);
