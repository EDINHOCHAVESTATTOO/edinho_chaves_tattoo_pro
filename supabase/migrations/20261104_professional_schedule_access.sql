-- Etapa 1: estrutura de acesso restrito para profissionais.
-- Preparada para o ambiente TESTE. Não executar em produção sem revisão.
-- O vínculo de uma conta é criado somente por um administrador autorizado.
alter table public.profiles
  add column if not exists professional_id uuid references public.studio_professionals(id);

create index if not exists profiles_professional_id_idx
  on public.profiles (professional_id)
  where professional_id is not null;

-- Exposição mínima: sem preço, comissão, telefone, anamnese ou caixa.
-- SECURITY DEFINER é necessário porque as políticas existentes de agenda
-- permitem SELECT apenas ao proprietário. A função aplica sua própria
-- autorização a cada execução e não aceita user_id fornecido pelo cliente.
create or replace function public.my_professional_schedule(
  from_time timestamptz,
  until_time timestamptz
)
returns table (
  appointment_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  procedure_name text,
  status text
)
language plpgsql
security definer
set search_path = ''
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado' using errcode = '42501';
  end if;
  if from_time is null or until_time is null
     or until_time <= from_time
     or until_time > from_time + interval '93 days' then
    raise exception 'Intervalo inválido' using errcode = '22023';
  end if;

  return query
  select a.id, a.starts_at, a.ends_at, a.procedure_name, a.status
  from public.studio_appointments a
  join public.profiles p
    on p.id = (select auth.uid())
   and p.role in ('artist','piercer')
   and p.studio_id = a.studio_id
   and p.professional_id = a.professional_id
  join public.studio_professionals sp
    on sp.id = p.professional_id
   and sp.studio_id = p.studio_id
   and sp.active is true
  where a.starts_at < until_time
    and a.ends_at > from_time
  order by a.starts_at;
end;
$$;

revoke all on function public.my_professional_schedule(timestamptz,timestamptz) from public;
revoke all on function public.my_professional_schedule(timestamptz,timestamptz) from anon;
grant execute on function public.my_professional_schedule(timestamptz,timestamptz) to authenticated;

-- Não ampliar as políticas SELECT das tabelas financeiras, clientes ou
-- anamnese. O administrador continua usando as permissões atuais.
