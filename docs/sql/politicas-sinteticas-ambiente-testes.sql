-- APENAS PARA O PROJETO DE TESTES prflqdbkgxjgbidzhfbc.
-- NUNCA aplicar no banco oficial: políticas simplificadas por user_id.
-- Testar com dois usuários fictícios autenticados e conferir isolamento.
BEGIN;
CREATE POLICY "fixture_cash_entries_read" ON public.cash_entries FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_appointments_read" ON public.studio_appointments FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_clients_read" ON public.studio_clients FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_commissions_read" ON public.studio_commissions FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_payments_read" ON public.studio_payments FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_professionals_read" ON public.studio_professionals FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_tattoo_consents_read" ON public.studio_tattoo_consents FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_anamnesis_signatures_read" ON public.studio_anamnesis_signatures FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
CREATE POLICY "fixture_profiles_read" ON public.profiles FOR SELECT TO authenticated USING (id = (select auth.uid()));
CREATE POLICY "fixture_studio_appointments_insert" ON public.studio_appointments FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_appointments_update" ON public.studio_appointments FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_clients_insert" ON public.studio_clients FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_clients_update" ON public.studio_clients FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_professionals_insert" ON public.studio_professionals FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_professionals_update" ON public.studio_professionals FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_tattoo_consents_insert" ON public.studio_tattoo_consents FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "fixture_studio_tattoo_consents_update" ON public.studio_tattoo_consents FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
COMMIT;
-- Pagamentos, comissões, assinaturas e caixa permanecem sem políticas
-- de alteração direta neste ensaio; gatilhos e fluxos internos exigem testes.
