-- Aplicado SOMENTE ao projeto de homologação prflqdbkgxjgbidzhfbc em 06/11/2026.
-- Não executar em produção sem revisão do esquema, políticas e identidades.
grant select on public.whatsapp_conversations, public.whatsapp_messages to authenticated;

create policy "homologacao conversations read own"
on public.whatsapp_conversations for select to authenticated
using (user_id = (select auth.uid()));

create policy "homologacao messages read own"
on public.whatsapp_messages for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.whatsapp_conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  )
);
-- whatsapp_accounts continua sem concessão de leitura ao cliente.
-- Não concede INSERT, UPDATE ou DELETE ao frontend.
