-- PREPARAÇÃO PARA REVISÃO: NÃO EXECUTAR EM PRODUÇÃO SEM BACKUP E TESTES.
-- Migração aditiva para permitir escopo por estúdio, sem alterar políticas RLS atuais.
-- Os registros cujo proprietário não tem vínculo válido ficam sem studio_id;
-- a validação prévia precisa resolver esses casos antes de impor NOT NULL.

begin;

alter table public.studio_clients add column if not exists studio_id uuid references public.studios(id);
alter table public.studio_professionals add column if not exists studio_id uuid references public.studios(id);
alter table public.studio_appointments add column if not exists studio_id uuid references public.studios(id);
alter table public.studio_payments add column if not exists studio_id uuid references public.studios(id);
alter table public.studio_commissions add column if not exists studio_id uuid references public.studios(id);
alter table public.cash_entries add column if not exists studio_id uuid references public.studios(id);
alter table public.studio_anamneses add column if not exists studio_id uuid references public.studios(id);
alter table public.studio_anamnesis_signatures add column if not exists studio_id uuid references public.studios(id);
alter table public.studio_tattoo_consents add column if not exists studio_id uuid references public.studios(id);

-- Dados legados: manter user_id original e preencher somente quando vínculo for conhecido.
update public.studio_clients t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;
update public.studio_professionals t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;
update public.studio_appointments t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;
update public.studio_payments t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;
update public.studio_commissions t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;
update public.cash_entries t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;
update public.studio_anamneses t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;
update public.studio_anamnesis_signatures t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;
update public.studio_tattoo_consents t set studio_id=p.studio_id from public.profiles p where t.user_id=p.id and t.studio_id is null;

-- Não alterar RLS, grants, triggers ou comportamento da aplicação nesta fase.
commit;

-- Etapa independente de endurecimento de GRANTs (NÃO EXECUTAR SEM TESTES):
-- REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.cash_entries, public.profiles,
--   public.studio_anamnesis_signatures, public.studio_appointments, public.studio_clients,
--   public.studio_commissions, public.studio_payments, public.studio_professionals,
--   public.studio_tattoo_consents FROM authenticated;
-- REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.cash_entries,
--   public.studio_anamnesis_signatures, public.studio_appointments, public.studio_clients,
--   public.studio_commissions, public.studio_payments, public.studio_professionals,
--   public.studio_tattoo_consents FROM anon;
-- Verificar grants herdados, dependências, privilégios efetivos e testes funcionais.
