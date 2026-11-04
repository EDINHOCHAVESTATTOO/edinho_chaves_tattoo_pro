alter table public.studio_nfse_drafts
 add constraint nfse_description_valid check (char_length(btrim(service_description)) between 1 and 500),
 add constraint nfse_customer_tax_id_valid check (customer_tax_id is null or customer_tax_id ~ '^[0-9]{11}([0-9]{3})?$');
drop policy if exists nfse_owner_update on public.studio_nfse_drafts;
create policy nfse_owner_update on public.studio_nfse_drafts for update to authenticated
 using (user_id=(select auth.uid()) and status='draft'
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner' and p.studio_id=studio_nfse_drafts.studio_id))
 with check (user_id=(select auth.uid()) and status in ('draft','ready_for_review')
 and exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='owner' and p.studio_id=studio_nfse_drafts.studio_id)
 and exists(select 1 from public.studio_appointments a where a.id=studio_nfse_drafts.appointment_id and a.user_id=(select auth.uid()) and a.studio_id=studio_nfse_drafts.studio_id and a.status='concluido' and a.price=studio_nfse_drafts.amount));
