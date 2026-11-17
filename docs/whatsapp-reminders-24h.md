# Lembretes 24h — implementação preparada, não ativada

Modelo Meta: `edinho_lembrete_agendamento_24h`, categoria UTILITY, idioma pt_BR.

Texto exato:
Olá, {{1}}! Lembramos que seu atendimento no Edinho Chaves Tattoo está agendado para {{2}} às {{3}}. Para confirmar ou solicitar alteração, responda esta mensagem.

Payload de submissão preparado em docs/whatsapp-reminder-template.json.

Exemplos fictícios: Cliente de teste; 20/11/2026; 14:30.
Não incluir dados do procedimento no lembrete.

## Ativação depois da aprovação
1. Submeter o modelo à conta comercial real e aguardar APPROVED. O endpoint verifica status, idioma, categoria e texto antes de enviar.
2. Aplicar docs/sql/whatsapp-reminder-consent.sql. Registrar consentimento real por cliente; nunca preencher retroativamente em massa.
3. Configurar variáveis server-only: WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_REMINDER_TEMPLATE, WHATSAPP_REMINDER_LANGUAGE=pt_BR, WHATSAPP_REMINDER_USER_ID, CRON_SECRET aleatório com pelo menos 32 caracteres. Reutilizar o token e phone ID seguros existentes. WHATSAPP_REMINDERS_ENABLED=false até validação final.
4. Publicar a branch com aprovação específica. Configurar chamada GET /api/cron/whatsapp-reminders a cada 5 minutos, Authorization Bearer CRON_SECRET. Vercel Pro permite essa frequência; se Hobby, usar Supabase Cron+Vault+pg_net após validar documentação, sem trocar plano automaticamente. Script de ativação preparado: docs/sql/activate-whatsapp-reminder-cron.sql (Supabase Cron + Vault, independente do plano Vercel). Não há cron ativado neste commit.
5. Homologar com destinatário autorizado e consentimento registrado; ativar enabled=true somente após confirmação específica.

## Regras
Apenas agendado/confirmado, nunca homologação, cancelado ou concluído. Janela: entre 24h e 23h45 antes (tolerância a atraso); verificar a cada 5min normalmente resulta em até 5min de atraso. Não promete precisão de segundos. Não recupera lembretes antigos em massa após interrupção.
Restrito ao owner configurado e conta vinculada. Dados lidos novamente antes do envio. UNIQUE (appointment_id, recipient_type, notification_type, scheduled_for) existente impede duplicação concorrente; reagendamento tem nova chave. Falhas, timeouts e processing interrompido não são reenviados automaticamente: revisar no livro de notificações para evitar duplicação.
`sent` significa aceito pela API, não entregue/lido. provider_message_id permite correlacionar; callback de entrega ao livro de notificações ainda deve ser validado antes de afirmar entrega. Monitorar falhas/processing e execução do cron.

## Validação 17/11/2026
37 testes automatizados aprovados (9 novos), TypeScript e build de produção aprovados. npm audit --omit=dev: zero vulnerabilidades após Next.js 16.4.3 → 16.4.6. Modelo e cron não submetidos/ativados: Meta requer login; nenhuma mensagem real enviada. Migração e scheduler preparados, ainda não aplicados no banco. Homologação ponta a ponta e monitoramento de execução continuam pendentes antes da ativação.
