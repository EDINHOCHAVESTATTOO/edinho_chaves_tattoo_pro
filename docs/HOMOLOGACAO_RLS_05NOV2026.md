# Verificações de acesso no ambiente de testes

Data: 05/11/2026.

Sessões SQL com papel authenticated e identidade simulada:
- O proprietário visualizou quatro agendamentos e três pagamentos próprios.
- O profissional visualizou zero agendamentos e zero pagamentos do proprietário.
- Uma tentativa do profissional de inserir um pagamento atribuído ao proprietário foi rejeitada.
- O proprietário conseguiu inserir um pagamento válido em transação revertida.

Todos os testes de escrita foram revertidos. Nenhum registro de produção foi alterado.

Pendente: teste de concorrência entre conexões independentes e teste funcional em navegador com autenticação real.
