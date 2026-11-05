# Integridade financeira no banco de testes — 05/11/2026

Inspeção somente leitura no projeto edinho-tattoo-seguranca-testes. Nenhum registro modificado.

- studio_appointments: 5 registros, 5 IDs distintos, nenhum ID nulo.
- studio_payments: 4 registros, 4 IDs distintos, nenhum ID nulo.
- Pagamentos sem agendamento correspondente (mesmo user_id): 0.
- Agendamentos cuja soma de pagamentos supera o preço: 0.
- Pagamentos com user_id diferente do agendamento: 0.
- Pagamentos com studio_id nulo: 1.
- Agendamentos associados com studio_id nulo: 0.
- Pagamentos com studio_id diferente do agendamento, quando ambos preenchidos: 0.

## Bloqueio identificado
Existe um pagamento de teste com studio_id ausente. Não preencher automaticamente sem inspecionar as dependências de caixa e comissões. A ausência também pode impedir a ativação de validações mais rígidas.

## Pendências
Revisar o registro e suas dependências, corrigir com transação segura em staging, adicionar constraints/validação transacional, executar testes concorrentes e RLS com contas distintas. Não aplicar mudanças em produção.
