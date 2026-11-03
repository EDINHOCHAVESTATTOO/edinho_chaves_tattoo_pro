# Correção planejada — propagação de studio_id nos gatilhos financeiros

**Escopo:** banco TEST `prflqdbkgxjgbidzhfbc`. Não executar em produção sem revisão do schema e teste de autorização.

## Falha confirmada em 03/11/2026

As funções SECURITY DEFINER `studio_generate_commission()`, `sync_studio_payment_to_cash()` e `studio_commission_to_cash()` criam registros sem preencher `studio_id`, embora o frontend agora filtre comissões e caixa por estúdio. O pagamento novo já recebe `studio_id` da interface.

## Alteração proposta

- `studio_generate_commission()`: obter o estúdio pelo agendamento associado ao pagamento e inserir `studio_id` em `studio_commissions`.
- `sync_studio_payment_to_cash()`: obter o estúdio pelo agendamento e inserir `studio_id` em `cash_entries`.
- `studio_commission_to_cash()`: obter o estúdio pelo vínculo da comissão ao pagamento/agendamento e inserir `studio_id` no lançamento de despesa.
- Validar que o estúdio do agendamento corresponde ao `studio_id` do pagamento novo, quando preenchido, e ao vínculo do usuário autorizado.
- Preservar a imutabilidade de `studio_payments`; registros antigos com `studio_id IS NULL` devem ser resolvidos por JOIN com agendamento, sem UPDATE.
- Preservar `ON CONFLICT` para evitar lançamentos duplicados.
- Não permitir EXECUTE direto dessas funções trigger a `anon` ou `authenticated`; revisar search_path e privilégios.

## Testes obrigatórios

1. Pagamento novo: receita e comissão geradas com o mesmo `studio_id` do agendamento.
2. Conclusão de atendimento e comissão paga: despesa gerada no mesmo estúdio.
3. Tentativa de vincular pagamento ao estúdio errado deve falhar.
4. Outro estúdio não pode ler nem alterar dados.
5. Pagamento imutável continua rejeitando UPDATE e DELETE.
6. Verificar os gatilhos reais de produção antes de adaptar qualquer SQL de TEST.
