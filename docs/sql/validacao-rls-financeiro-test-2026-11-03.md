# Validação de políticas financeiras no Supabase TEST — 03/11/2026

Projeto de teste: `prflqdbkgxjgbidzhfbc`. Migração aplicada: `test_owner_financial_write_policies`.

## Políticas aplicadas
- INSERT `studio_payments`: usuário autenticado deve ser proprietário de perfil do mesmo estúdio e agendamento deve pertencer ao mesmo usuário/estúdio.
- UPDATE `studio_commissions`: somente owner do mesmo estúdio; estado de origem `approved`, destino `paid`, `paid_at` obrigatório.
- Revogado UPDATE geral de `studio_commissions` para authenticated; concedido UPDATE apenas às colunas `status` e `paid_at`.
- INSERT `cash_entries`: somente owner do mesmo estúdio, sem vínculo automático com pagamento ou comissão (lançamento manual).
- Gatilhos financeiros já corrigidos para propagar `studio_id`.

## Testes SQL com SET LOCAL ROLE authenticated e JWT simulado
- Owner A: pagamento INSERT e comissão gerada: PASSOU.
- Owner A: comissão approved → paid, despesa automática e lançamento manual: PASSOU (1 comissão paga, 1 despesa de comissão, 1 lançamento manual).
- Outro usuário/estúdio: INSERT de pagamento negado, zero pagamentos indevidos: PASSOU.
- authenticated: UPDATE da coluna `commission_amount` indisponível, UPDATE de `status` permitido: PASSOU.
- Operações de teste executadas com BEGIN/ROLLBACK, sem persistir registros de pagamento de teste.

## Limites
- Identidades simuladas via SQL, não sessões reais de Supabase Auth.
- Ainda é preciso testar a interface completa com login real e validar diferenças entre schema TEST e produção.
- Políticas financeiras existentes e permissões de tabelas relacionadas devem passar por auditoria final antes de migração de produção.
- Nenhuma alteração aplicada em produção ou na master.
