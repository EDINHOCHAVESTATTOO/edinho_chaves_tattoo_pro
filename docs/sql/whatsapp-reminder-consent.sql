-- Apply only after production approval. Existing clients remain opted out.
alter table public.studio_clients add column if not exists whatsapp_reminder_consent_at timestamptz;
comment on column public.studio_clients.whatsapp_reminder_consent_at is 'Record only after client consents to appointment reminders on WhatsApp; NULL means no automatic reminders.';
