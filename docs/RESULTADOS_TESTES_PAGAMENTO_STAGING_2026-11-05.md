# Testes executados — validação de pagamentos no staging

Projeto Supabase: prflqdbkgxjgbidzhfbc. Data: 05/11/2026.

## Casos aprovados
Os casos abaixo foram executados por SQL em uma transação explícita `BEGIN ... ROLLBACK`, usando bloco PL/pgSQL que exige a mensagem de erro esperada e gera erro caso a inserção seja aceita.

1. Pagamento de 999999999 acima do saldo do agendamento: rejeitado com `Pagamento supera o saldo do atendimento`.
2. Pagamento de -1: rejeitado com `Valor do pagamento deve ser positivo e ter no máximo duas casas decimais`.
3. Pagamento de 0.001: rejeitado com a mesma mensagem de validação de precisão.

O comando de testes terminou sem erro. Uma consulta posterior confirmou que a tabela studio_payments continua com quatro registros e um pagamento antigo com studio_id nulo; os testes não alteraram esse total.

## Ainda não testado
- Duas transações independentes em concorrência real.
- Inserção positiva e sincronização com caixa/comissões com credenciais de usuário autenticado.
- Isolamento entre usuários por RLS.
- Login, impressão e fluxo mobile de ponta a ponta.

Não interpretar estes testes como homologação final. Não houve alterações no banco principal, na master ou publicação em produção.
