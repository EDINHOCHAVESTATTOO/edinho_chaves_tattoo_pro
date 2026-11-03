-- MIGRAÇÃO PREPARADA, NÃO EXECUTADA.
-- Revisar e testar em banco isolado antes de aplicar ao banco oficial.
-- As cinco funções SECURITY DEFINER abaixo retornam trigger/event_trigger.
BEGIN;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE
 public.cash_entries, public.profiles, public.studio_anamnesis_signatures,
 public.studio_appointments, public.studio_clients, public.studio_commissions,
 public.studio_payments, public.studio_professionals, public.studio_tattoo_consents
FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.studio_commission_to_cash() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.studio_generate_commission() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.studio_update_commission_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_studio_payment_to_cash() FROM PUBLIC, anon, authenticated;
ALTER FUNCTION public.studio_block_payment_changes() SET search_path = '';
ALTER FUNCTION public.studio_protect_cash_entry() SET search_path = '';
COMMIT;
-- Verificar permissões efetivas, advisors, fluxos de caixa, comissões e agenda.
-- Não alterar extensão btree_gist sem avaliar suas dependências.
