-- DO NOT APPLY until deployment, Meta approval and explicit activation approval.
-- Save the endpoint's CRON_SECRET securely in Vault as edinho_reminder_cron_secret.
-- Never paste its value into this file or cron.command.
-- Uses existing pg_cron and pg_net extensions. This file does not send WhatsApp directly.
begin;
do $$
begin
 if not exists (select 1 from vault.decrypted_secrets where name='edinho_reminder_cron_secret' and length(decrypted_secret)>=32) then
  raise exception 'Configure edinho_reminder_cron_secret in Vault first';
 end if;
end $$;
select cron.schedule(
 'edinho-whatsapp-reminders-24h',
 '*/5 * * * *',
 $job$
 select net.http_get(
  url := 'https://www.edinhochavestattoo.com.br/api/cron/whatsapp-reminders',
  headers := jsonb_build_object('x-reminder-timestamp', floor(extract(epoch from now()))::bigint::text, 'x-reminder-signature', encode(extensions.hmac('GET:/api/cron/whatsapp-reminders:' || floor(extract(epoch from now()))::bigint::text, (select decrypted_secret from vault.decrypted_secrets where name='edinho_reminder_cron_secret'), 'sha256'), 'hex')),
  timeout_milliseconds := 280000
 );
 $job$
);
commit;
-- Stop: select cron.unschedule('edinho-whatsapp-reminders-24h');
-- Monitor cron.job_run_details AND net._http_response (HTTP 2xx), plus notification ledger.
