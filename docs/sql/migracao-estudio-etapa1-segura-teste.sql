-- ETAPA 1: aditiva, sem modificar pagamentos lançados. EXECUTAR SOMENTE EM TESTE.
-- O rascunho original falhou no teste porque studio_block_payment_changes impede
-- UPDATE em studio_payments. Não desabilitar o gatilho.
BEGIN;
ALTER TABLE public.studio_clients ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
ALTER TABLE public.studio_professionals ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
ALTER TABLE public.studio_appointments ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
ALTER TABLE public.studio_payments ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
ALTER TABLE public.studio_commissions ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
ALTER TABLE public.cash_entries ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
ALTER TABLE public.studio_anamneses ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
ALTER TABLE public.studio_anamnesis_signatures ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
ALTER TABLE public.studio_tattoo_consents ADD COLUMN IF NOT EXISTS studio_id uuid REFERENCES public.studios(id);
UPDATE public.studio_clients t SET studio_id=p.studio_id FROM public.profiles p WHERE t.user_id=p.id AND t.studio_id IS NULL AND p.studio_id IS NOT NULL;
UPDATE public.studio_professionals t SET studio_id=p.studio_id FROM public.profiles p WHERE t.user_id=p.id AND t.studio_id IS NULL AND p.studio_id IS NOT NULL;
UPDATE public.studio_appointments t SET studio_id=p.studio_id FROM public.profiles p WHERE t.user_id=p.id AND t.studio_id IS NULL AND p.studio_id IS NOT NULL;
UPDATE public.studio_commissions t SET studio_id=p.studio_id FROM public.profiles p WHERE t.user_id=p.id AND t.studio_id IS NULL AND p.studio_id IS NOT NULL;
UPDATE public.cash_entries t SET studio_id=p.studio_id FROM public.profiles p WHERE t.user_id=p.id AND t.studio_id IS NULL AND p.studio_id IS NOT NULL;
UPDATE public.studio_anamneses t SET studio_id=p.studio_id FROM public.profiles p WHERE t.user_id=p.id AND t.studio_id IS NULL AND p.studio_id IS NOT NULL;
UPDATE public.studio_anamnesis_signatures t SET studio_id=p.studio_id FROM public.profiles p WHERE t.user_id=p.id AND t.studio_id IS NULL AND p.studio_id IS NOT NULL;
UPDATE public.studio_tattoo_consents t SET studio_id=p.studio_id FROM public.profiles p WHERE t.user_id=p.id AND t.studio_id IS NULL AND p.studio_id IS NOT NULL;
-- Não atualizar studio_payments; seu gatilho proíbe alterações.
COMMIT;
-- Antes da etapa 2, auditar pagamentos com studio_id NULL, divergências
-- entre agendamento, pagamento, comissão e caixa, e dados sem perfil.
-- Não habilitar novas políticas nem NOT NULL enquanto houver pendências.
