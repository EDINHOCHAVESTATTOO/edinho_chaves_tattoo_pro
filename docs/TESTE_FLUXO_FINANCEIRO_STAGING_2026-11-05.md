# Teste de fluxo financeiro positivo no staging — 05/11/2026

Projeto: Supabase prflqdbkgxjgbidzhfbc. Sem mudanças em produção.

Em transação explícita, foi inserido pagamento fictício de R$ 10 para um agendamento existente e com saldo disponível. O INSERT omitiu studio_id intencionalmente para verificar a normalização pelo gatilho de validação.

Resultados consultados dentro da transação:
- 1 pagamento para o agendamento.
- 1 cash_entries vinculado ao pagamento.
- 1 studio_commissions vinculado ao pagamento.
- 1 pagamento com studio_id normalizado ao estúdio do agendamento.

A transação foi finalizada com ROLLBACK. Consulta posterior confirmou que studio_payments continua com quatro registros, sem persistir o lançamento fictício.

Não se trata de teste de concorrência entre conexões independentes, nem de teste autenticado de RLS. Permanecem pendentes a homologação completa do aplicativo e a aprovação de publicação.
