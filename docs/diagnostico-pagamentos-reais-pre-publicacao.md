# Diagnóstico real dos pagamentos anteriores — 03/11/2026

Consulta **somente leitura** realizada no projeto de produção `mxwhrefuzhhqmmlggegd`:

| Métrica | Resultado |
|---|---:|
| Pagamentos existentes | 2 |
| Pagamentos sem perfil proprietário | 0 |
| Pagamentos cujo perfil não tem estúdio | 0 |
| Pagamentos sem agendamento correspondente | 0 |
| Divergência de proprietário entre pagamento e agendamento | 0 |

**Decisão técnica:** não desativar o gatilho `studio_block_payment_changes` para preencher `studio_id` nos pagamentos históricos. A etapa 1 da migração aditiva foi aprovada apenas no projeto sintético; no teste, o pagamento antigo permaneceu intacto e os registros associados foram vinculados ao estúdio.

Uma visão de resolução por associação a `profiles.studio_id` foi criada apenas no projeto de testes, com acesso público revogado. Não foi implantada em produção nem validada via aplicação.

**Antes de publicar:** validar backups e recuperação, políticas de autorização reais, relações e integridade do esquema oficial, compatibilidade do frontend, e executar E2E com contas de teste. A existência de preview READY e auditoria sem alertas não substitui essas verificações.

**Não alterar master, dados oficiais ou promover deployment com base somente neste diagnóstico.**
