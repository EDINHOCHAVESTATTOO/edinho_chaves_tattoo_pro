-- Required service-side table access, applied 2026-11-19.
-- No new client/anon permissions; existing RLS remains unchanged.
grant select on public.studio_appointments, public.studio_clients, public.whatsapp_accounts to service_role;
grant select, insert, update on public.studio_appointment_notifications to service_role;
-- Scheduler uses timestamped HMAC, not a static bearer in net.http_request_queue.
-- Revoking net grants as postgres did not remove grants owned by supabase_admin;
-- do not claim those table/schema ACLs were changed. Vault remains inaccessible to anon/authenticated.
