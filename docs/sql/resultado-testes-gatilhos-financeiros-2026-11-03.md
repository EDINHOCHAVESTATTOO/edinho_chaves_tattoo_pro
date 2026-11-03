# Testes dos gatilhos financeiros — 03/11/2026

Ambiente: Supabase TEST `prflqdbkgxjgbidzhfbc`. Migração aplicada: `test_propagate_studio_id_financial_triggers`. Produção não modificada.

## Alterações aplicadas no TEST
- `public.studio_generate_commission()`: deriva o `studio_id` do agendamento, exige correspondência com o pagamento e o grava na comissão.
- `public.sync_studio_payment_to_cash()`: exige estúdio correspondente e o grava na receita.
- `public.studio_commission_to_cash()`: resolve o estúdio pelo pagamento/agendamento, exige correspondência com a comissão e o grava na despesa.
- Funções mantêm `SECURITY DEFINER` e `search_path = ''`; EXECUTE revogado de PUBLIC, anon e authenticated.
- Pagamentos antigos imutáveis não foram atualizados.

## Resultados
1. INSERT sintético de pagamento de R$ 10,00 dentro de transação revertida: `payment_studio = commission_studio = cash_studio = 99999999-9999-4999-8999-999999999999`. PASSOU.
2. INSERT sintético de pagamento de R$ 11,00, seguido de comissão paga, em transação revertida: despesa de R$ 3,30 e `expense_studio = commission_studio`. PASSOU.
3. Tentativa sintética de pagamento com `studio_id = 22222222-2222-4222-8222-222222222222` para agendamento do estúdio `99999999-9999-4999-8999-999999999999`: rejeitada; zero pagamentos indevidos. PASSOU.

## Restrições e pendências
- Os testes foram executados por SQL administrativo, **não** com sessões reais do Supabase Auth.
- As políticas RLS do TEST ainda bloqueiam INSERT de pagamento e UPDATE de comissão para authenticated; não estão prontas para uso completo da interface.
- O TEST é uma reprodução parcial e os vínculos de triggers não foram comparados integralmente com a produção.
- Não publicar ou promover sem revisar RLS, permissões por papel, pagamentos imutáveis e teste E2E com login.
