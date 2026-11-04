-- Hardening: fiscal drafts cannot be edited directly from browser.
-- Later edits must use a dedicated, audited backend workflow.
revoke update on public.studio_nfse_drafts from authenticated;
drop policy if exists nfse_owner_update on public.studio_nfse_drafts;
drop policy if exists nfse_owner_insert on public.studio_nfse_drafts;
create policy nfse_owner_insert on public.studio_nfse_drafts
for insert to authenticated with check (
 status='draft'
 and user_id=(select auth.uid())
 and exists (select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner' and p.studio_id=studio_nfse_drafts.studio_id)
 and exists (select 1 from public.studio_appointments a where a.id=studio_nfse_drafts.appointment_id and a.user_id=(select auth.uid()) and a.studio_id=studio_nfse_drafts.studio_id and a.status='concluido' and a.price=studio_nfse_drafts.amount)
);
