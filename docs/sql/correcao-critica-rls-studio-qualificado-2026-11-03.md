# Correção crítica de RLS no Supabase TEST — 03/11/2026

## Problema detectado
A expressão original `p.studio_id = studio_id` em subconsulta correlacionada foi interpretada pelo PostgreSQL como `p.studio_id = p.studio_id`. A verificação não comparava o perfil com a linha financeira.

## Correção aplicada
Migração TEST `test_fix_financial_rls_studio_qualification`:
- Substituídas políticas `test_owner_payment_insert`, `test_owner_commission_update` e `test_owner_cash_insert` usando referências explicitamente qualificadas: `studio_payments.studio_id`, `studio_commissions.studio_id`, `cash_entries.studio_id`.
- Criada política `test_owner_cash_delete`: somente proprietário do mesmo estúdio pode excluir lançamentos manuais; lançamentos vinculados a pagamento ou comissão não podem ser excluídos pela política.
- Nenhum pagamento antigo foi alterado.

## Evidências
- `pg_policies` confirmou que as comparações agora são `p.studio_id = <tabela>.studio_id`, sem comparação reflexiva.
- JWT simulado de owner: INSERT de pagamento gera comissão; INSERT e DELETE de lançamento manual funcionam; 0 lançamentos manuais restantes (teste em transação revertida).
- JWT simulado de owner do estúdio A: tentativa de INSERT de caixa no estúdio B rejeitada; 0 registros indevidos (transação revertida).

## Limites
Ainda faltam login real no frontend, revisão de todas as políticas legadas, validação contra schema real de produção e E2E completo. Banco de produção e master permanecem intactos.
