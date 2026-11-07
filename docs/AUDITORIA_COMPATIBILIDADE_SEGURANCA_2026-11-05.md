# Auditoria de compatibilidade e segurança — 05/11/2026

## Estado
**Não promover para produção ainda.** Revisão baseada em consultas de leitura e no deployment preview READY; não equivale a teste de concorrência nem teste E2E.

## Diferença comprovada
- Produção Supabase `mxwhrefuzhhqmmlggegd`: `studio_appointments` e `studio_payments` possuem `user_id`, mas não `studio_id`.
- Homologação `prflqdbkgxjgbidzhfbc`: as duas tabelas possuem `user_id` e `studio_id`.
- O preview da branch `fix/app-finalizacao-sem-whatsapp` aponta para o projeto de homologação.
- **Não copiar migrações, políticas ou gatilhos do staging para produção sem adaptar as referências a `studio_id`.**

## RLS
- Produção: `studio_clients`, `studio_appointments`, `studio_payments` usam políticas ALL com `user_id = auth.uid()` tanto para leitura/modificação quanto WITH CHECK; `studio_commissions` possui SELECT/UPDATE restritos a `user_id`; `cash_entries` SELECT/INSERT/DELETE restritos a `user_id`.
- Homologação: políticas adicionais de owner e `studio_id` (não portáveis diretamente para produção).
- **Pendente**: teste de isolamento com duas contas reais de homologação, inclusive tentativas de UPDATE e INSERT com `user_id` de outra conta.

## Função privilegiada
- Advisor da homologação alerta que `public.my_professional_schedule(timestamptz,timestamptz)` é SECURITY DEFINER e executável por `authenticated`.
- Antes de revogar EXECUTE ou mudar para SECURITY INVOKER, revisar implementação e consumidores da RPC, para não quebrar agenda dos profissionais.
- Aviso de proteção contra senhas vazadas desativada: habilitar na configuração Auth do Supabase após revisão operacional.

## Pagamentos
- Checagens somente leitura na homologação: 0 pagamentos órfãos, 0 comissões órfãs, 0 pagamentos com valor não positivo.
- Produção já possui trigger `studio_validate_payment_before_insert` com bloqueio FOR UPDATE e `studio_payment_immutable`. Não substituir.
- Pendente: teste de duas sessões concorrentes contra o mesmo agendamento, verificar um sucesso/uma rejeição e ausência de lançamentos parciais em caixa e comissões.

## Gate de liberação
1. Conferir implementação de `my_professional_schedule` e reduzir privilégios apenas se seguro.
2. Executar teste de concorrência com contas e registros fictícios isolados.
3. Executar testes de RLS com dois usuários independentes.
4. Validar a funcionalidade de autorização de menores com revisão jurídica/sanitária ou desativar até revisão.
5. Revisar e adaptar migrações de produção, com backup e rollback.
6. Revalidar compilação e teste manual do preview atualizado.
7. Somente depois promover mediante aprovação do proprietário.

WhatsApp e emissão fiscal excluídos desta entrega.
