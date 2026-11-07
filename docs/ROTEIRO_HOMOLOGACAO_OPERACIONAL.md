# Roteiro de homologação operacional

Status: testes pendentes. Usar exclusivamente ambiente isolado e contas de teste. Não utilizar dados pessoais reais.

## Login e segurança
- Entrar e sair; confirmar que tela privada não mostra dados após sair.
- Testar recuperação de senha e sessão expirada.
- Com dois usuários de teste, verificar que nenhum lê, altera ou exclui dados do outro.

## Fluxo operacional
- Cadastrar cliente e profissional fictícios.
- Agendar atendimento e verificar horário local, conflito e alteração de status.
- Registrar pagamento parcial e quitação; conferir caixa e comissões.
- Tentar receber mais que o preço e pagar atendimento cancelado; confirmar bloqueio.
- Excluir lançamento manual; confirmar que recebimento vinculado à agenda não pode ser excluído por essa tela.
- Abrir relatório do cliente e imprimir ficha.

## Documentos
- Conferir anamnese, consentimento, assinatura, impressão e exportação PDF em computador e celular.
- Conferir se dados de menores não são persistidos indevidamente.
- Submeter conteúdo de autorização de menores à validação jurídica local.

## Concorrência financeira
- Em banco de teste, simular duas gravações simultâneas de pagamentos para o mesmo atendimento.
- A soma deve permanecer dentro do preço e caixa/comissões não devem duplicar.
- Não considerar homologado até existir proteção transacional no banco e teste automatizado reproduzível.

## Registro de execução
Para cada caso registrar data, ambiente, usuário de teste, resultado, evidência sem dados sensíveis e correção necessária. Compilação READY não equivale a teste aprovado.

## Publicação
Somente depois de todos os testes, revisão de alertas de segurança e autorização explícita. Não modificar master ou produção antes disso.
