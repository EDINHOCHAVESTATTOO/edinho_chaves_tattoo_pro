-- Aplicar somente junto da publicação aprovada da tela de conversas.
-- Não concede escrita e não altera as políticas de isolamento por user_id.
begin;
do $$
begin
  if exists (
    select 1 from pg_class
    where oid in ('public.whatsapp_conversations'::regclass, 'public.whatsapp_messages'::regclass)
      and not relrowsecurity
  ) then
    raise exception 'RLS deve estar ativo nas tabelas do WhatsApp antes de liberar a leitura';
  end if;
end $$;
grant select on public.whatsapp_conversations, public.whatsapp_messages to authenticated;
commit;
