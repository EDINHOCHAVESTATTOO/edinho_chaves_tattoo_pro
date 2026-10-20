
-- Edinho Chaves Tattoo: esquema inicial para Supabase/PostgreSQL.
-- Execute no SQL Editor de um projeto novo. Revise e teste RLS antes de produção.
create extension if not exists pgcrypto;

create table if not exists public.studios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  studio_id uuid not null references public.studios(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('owner','manager','artist','piercer','reception')),
  created_at timestamptz not null default now()
);

create or replace function public.current_studio_id()
returns uuid language sql stable security definer set search_path = public
as $$ select studio_id from public.profiles where id = auth.uid() $$;

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null default public.current_studio_id() references public.studios(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null default public.current_studio_id() references public.studios(id) on delete cascade,
  name text not null,
  service_type text not null check (service_type in ('tattoo','piercing','product','other')),
  default_price numeric(12,2) not null default 0 check (default_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null default public.current_studio_id() references public.studios(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  professional_id uuid references public.profiles(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled','no_show')),
  quoted_amount numeric(12,2) not null default 0 check (quoted_amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null default public.current_studio_id() references public.studios(id) on delete cascade,
  opened_by uuid not null default auth.uid() references auth.users(id),
  opened_at timestamptz not null default now(),
  opening_amount numeric(12,2) not null default 0 check (opening_amount >= 0),
  closed_by uuid references auth.users(id),
  closed_at timestamptz,
  counted_amount numeric(12,2),
  notes text,
  check (counted_amount is null or counted_amount >= 0)
);

create table if not exists public.cash_transactions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null default public.current_studio_id() references public.studios(id) on delete cascade,
  cash_session_id uuid references public.cash_sessions(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  created_by uuid not null default auth.uid() references auth.users(id),
  transaction_type text not null check (transaction_type in ('income','expense','refund')),
  category text not null,
  description text not null,
  payment_method text not null check (payment_method in ('pix','cash','debit_card','credit_card','transfer','other')),
  amount numeric(12,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  status text not null default 'confirmed' check (status in ('pending','confirmed','cancelled')),
  created_at timestamptz not null default now()
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null default public.current_studio_id() references public.studios(id) on delete cascade,
  professional_id uuid not null references public.profiles(id),
  cash_transaction_id uuid references public.cash_transactions(id) on delete set null,
  base_amount numeric(12,2) not null check (base_amount >= 0),
  rate_percent numeric(5,2) not null check (rate_percent >= 0 and rate_percent <= 100),
  commission_amount numeric(12,2) generated always as (round(base_amount * rate_percent / 100, 2)) stored,
  status text not null default 'pending' check (status in ('pending','approved','paid','cancelled')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null default public.current_studio_id() references public.studios(id) on delete cascade,
  name text not null,
  quantity numeric(12,3) not null default 0 check (quantity >= 0),
  minimum_quantity numeric(12,3) not null default 0 check (minimum_quantity >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  created_at timestamptz not null default now()
);

-- Acesso inicial: usuários autenticados só acessam linhas do próprio estúdio.
alter table public.studios enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.commissions enable row level security;
alter table public.inventory_items enable row level security;

create policy "profiles read own studio" on public.profiles for select to authenticated
using (studio_id = public.current_studio_id());
create policy "studio read own" on public.studios for select to authenticated
using (id = public.current_studio_id());

create policy "clients studio access" on public.clients for all to authenticated
using (studio_id = public.current_studio_id())
with check (studio_id = public.current_studio_id());
create policy "services studio access" on public.services for all to authenticated
using (studio_id = public.current_studio_id())
with check (studio_id = public.current_studio_id());
create policy "appointments studio access" on public.appointments for all to authenticated
using (studio_id = public.current_studio_id())
with check (studio_id = public.current_studio_id());
create policy "cash sessions studio access" on public.cash_sessions for all to authenticated
using (studio_id = public.current_studio_id())
with check (studio_id = public.current_studio_id());
create policy "cash transactions studio access" on public.cash_transactions for all to authenticated
using (studio_id = public.current_studio_id())
with check (studio_id = public.current_studio_id());
create policy "commissions studio access" on public.commissions for all to authenticated
using (studio_id = public.current_studio_id())
with check (studio_id = public.current_studio_id());
create policy "inventory studio access" on public.inventory_items for all to authenticated
using (studio_id = public.current_studio_id())
with check (studio_id = public.current_studio_id());

-- Bootstrap manual:
-- 1) Crie o estúdio e copie o UUID retornado:
-- insert into public.studios (name) values ('Edinho Chaves Tattoo') returning id;
-- 2) Crie um usuário em Supabase Auth e copie seu UUID; associe:
-- insert into public.profiles (id, studio_id, full_name, role)
-- values ('UUID-AUTH-REAL', 'UUID-ESTUDIO-REAL', 'Edinho Chaves', 'owner');
--
-- Antes de produção, revisar as permissões por papel (owner/manager/artist/piercer/reception),
-- políticas de alteração/exclusão, logs de auditoria e testes com usuários de estúdios distintos.
