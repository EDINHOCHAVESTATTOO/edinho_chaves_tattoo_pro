# Testes de concorrencia financeira

Status: planejamento. Nenhuma alteracao no banco.

- Verificar triggers e constraints atuais de studio_payments.
- Testar dois pagamentos simultaneos para o mesmo atendimento em ambiente isolado.
- Confirmar que o total recebido nao ultrapassa o preco.
- Validar que caixa e comissoes nao duplicam registros.
- Testar permissoes entre usuarios diferentes.
- Somente aplicar mudancas ao banco depois de testes e aprovacao.
