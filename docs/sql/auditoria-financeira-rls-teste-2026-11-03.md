# Auditoria financeira — ambiente de testes (03/11/2026)

## Evidência consultada
- Deploy de preview do commit `4da7de7`: READY.
- Banco TEST: `prflqdbkgxjgbidzhfbc` (não produção).
- `studio_commissions`: política `fixture_studio_commissions_read` somente SELECT para authenticated, filtrada por `user_id=auth.uid()`; não há política UPDATE.
- `studio_payments`: somente SELECT para authenticated, filtrado por `user_id=auth.uid()`; não há política INSERT.
- `cash_entries`: somente SELECT para authenticated, filtrado por `user_id=auth.uid()`; não há política INSERT.
- GRANTs de tabela para authenticated incluem INSERT/UPDATE em algumas tabelas, mas RLS impede as operações sem política correspondente.
- Um pagamento sintético antigo tem `studio_id IS NULL`; seu agendamento vinculado tem `studio_id` válido. Não modificar o pagamento imutável.

## Consequências
1. A interface pode compilar e falhar ao registrar pagamento, comissão paga ou lançamento manual.
2. Políticas `user_id` não implementam compartilhamento de dados por estúdio, apesar dos novos filtros `studio_id` no frontend.
3. Triggers SECURITY DEFINER devem ser avaliados junto das políticas e privilégios, para não criar bypass indevido.
4. A base TEST é uma reprodução parcial, não um clone exato da produção.

## Próximas condições de liberação
- Definir modelo de autorização no banco (owner e demais funções) e testar operações reais com usuários autenticados.
- Preservar imutabilidade de pagamentos antigos e vínculo via agendamento.
- Verificar INSERT de pagamento, geração de comissão e caixa; atualização de comissão para paga; edição/cancelamento e isolamento entre estúdios.
- Revalidar privilégios e políticas efetivas antes de aplicar qualquer migração na produção.
- Não publicar na master nem promover preview a produção sem testes concluídos.
