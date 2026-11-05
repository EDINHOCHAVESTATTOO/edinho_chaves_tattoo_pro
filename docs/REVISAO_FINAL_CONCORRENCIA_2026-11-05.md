# Revisão final de concorrência — 05/11/2026

## Banco de produção (somente leitura)
Projeto `mxwhrefuzhhqmmlggegd` possui trigger `studio_validate_payment_before_insert` em `studio_payments`, que executa `studio_validate_payment()`. A função seleciona o agendamento com `FOR UPDATE`, confere usuário e status, exige valor positivo e rejeita total de pagamentos superior ao preço. A proteção contra pagamento duplicado por concorrência está implementada no código do banco. Há também gatilhos de imutabilidade, caixa e comissões. Nenhuma alteração foi aplicada à produção.

## Banco de testes
Projeto `prflqdbkgxjgbidzhfbc` possui gatilho equivalente `studio_payment_limit_before_insert`, testado com pagamentos válidos, negativos, de precisão inválida e acima do saldo. Os testes foram revertidos. O banco permanece com quatro pagamentos de fixture, sem `studio_id` nulo.

## Teste simultâneo
Foram disparadas duas chamadas SQL paralelas: uma segurou um lock de agendamento por sete segundos; a outra tentou inserir um pagamento com timeout de dois segundos. Ambas concluíram sem erro, mas a ferramenta de execução não demonstrou sobreposição efetiva das transações. Portanto, **não considerar o teste de concorrência entre sessões independentes aprovado**. A prova exige duas conexões independentes com barreira de sincronização, uma operação confirmada e outra rejeitada ao ultrapassar o saldo, usando registros isolados e limpeza segura.

## Homologação manual no iPhone
Login, agendamento, cadastro de cliente, pagamento de sinal, entrada no caixa, comissão de 40% e autorização para menor em uma página A4 foram confirmados pelo usuário. A autorização impressa continua sujeita à revisão jurídica e sanitária.

## Pendências para publicar
1. Prova real de concorrência com conexões independentes.
2. Verificação final das configurações de segurança e dos riscos de alterações no valor de agendamentos após pagamentos.
3. Aprovação explícita do proprietário para publicação; sem alteração da branch master nem do banco principal antes disso.

WhatsApp e emissão de notas fiscais ficam fora desta versão.
