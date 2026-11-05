# Diagnóstico do banco de testes — 05/11/2026

Projeto: edinho-tattoo-seguranca-testes (prflqdbkgxjgbidzhfbc). Inspeção somente leitura. Não houve modificação dos registros.

## Diferenças importantes
- O projeto de testes possui 14 tabelas em public, enquanto o principal possui 21.
- As tabelas studio_appointments e studio_payments não possuem PRIMARY KEY no banco de testes, conforme pg_constraint.
- Nessas tabelas foi encontrada apenas a FK de studio_id para studios; não há as FKs compostas de propriedade existentes no principal.
- Há dados preexistentes no banco de testes. Não presumir que podem ser apagados.

## Gatilhos existentes em studio_payments
- fixture_payment_cash: AFTER INSERT, executa sync_studio_payment_to_cash, valida studio_id e insere lançamento no caixa com proteção contra duplicidade por studio_payment_id.
- fixture_payment_commission: AFTER INSERT, executa studio_generate_commission, valida studio_id, gera comissão e usa ON CONFLICT(payment_id) DO NOTHING.
- fixture_payment_immutable: BEFORE UPDATE OR DELETE, executa studio_block_payment_changes, que impede edição/exclusão de pagamentos.

## Risco ainda não resolvido
Nenhum dos três gatilhos examinados impõe o teto da soma dos pagamentos do agendamento. A verificação no frontend não é suficiente contra gravações concorrentes. Não foi executado teste simultâneo e não foi aplicada proteção transacional.

## Próximas ações
1. Corrigir o esquema de testes com migração revisada, preservando dados e validando duplicidades antes de criar chaves primárias.
2. Revisar todas as funções e políticas de acesso antes de testar contas de usuários distintos.
3. Adicionar proteção transacional para pagamento com bloqueio por agendamento, evitando duplicar os gatilhos existentes.
4. Executar teste concorrente reproduzível e comparar pagamentos, caixa e comissões.
5. Não copiar automaticamente migrações para o banco principal e não publicar sem aprovação.
