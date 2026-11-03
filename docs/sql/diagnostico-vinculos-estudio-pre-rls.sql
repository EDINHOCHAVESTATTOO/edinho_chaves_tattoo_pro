-- MIGRAÇÃO EXPERIMENTAL: executar SOMENTE em projeto de testes.
-- Não aplicar em produção sem backup, conferência de vínculos e contas reais.
-- Mantém políticas atuais intactas até aprovação explícita.
-- Consultas diagnósticas: verificar linhas sem studio_id e associações.
select 'studio_clients' as tabela, count(*) filter (where studio_id is null) as sem_estudio, count(*) as total from public.studio_clients
union all select 'studio_appointments', count(*) filter (where studio_id is null), count(*) from public.studio_appointments
union all select 'studio_professionals', count(*) filter (where studio_id is null), count(*) from public.studio_professionals
union all select 'studio_payments', count(*) filter (where studio_id is null), count(*) from public.studio_payments
union all select 'studio_commissions', count(*) filter (where studio_id is null), count(*) from public.studio_commissions
union all select 'cash_entries', count(*) filter (where studio_id is null), count(*) from public.cash_entries;

-- Perfis: só habilitar acesso por estúdio depois de validar que
-- profiles.id é auth.uid() e que studio_id é definido por administrador.
-- Nunca permitir UPDATE de profiles.studio_id/role pelo próprio usuário.
-- Profissionais sem ligação auth_user_id não devem receber acesso
-- a agenda individual apenas por coincidência de nome.
