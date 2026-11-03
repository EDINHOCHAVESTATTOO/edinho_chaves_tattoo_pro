# Proposta de políticas de acesso (não aplicada)

**Não executar em produção.** Esta proposta complementa `docs/sql/rascunho-escopo-estudio.sql`. Não substitui auditoria de triggers, relacionamentos, privilégios e testes com contas separadas.

## Princípios de autorização

- A identidade vem de `auth.uid()`, nunca de valores enviados pelo navegador ou de `user_metadata`.
- O papel e o estúdio vêm do cadastro de membros `profiles`, validado pelo banco a cada operação.
- Para cada tabela, validar `studio_id` do registro e o papel do usuário; não confiar em filtros da interface.
- Separar permissões de SELECT, INSERT, UPDATE e DELETE; não usar uma política ALL indiscriminada.
- Garantir que UPDATE tenha USING e WITH CHECK; proibir troca arbitrária de studio_id e user_id.
- Manter a política antiga até a migração de dados e frontend estar completa; depois substituir de forma atômica, sem deixar acesso aberto entre etapas.

## Regras por domínio

| Domínio | owner | manager | reception | artist/piercer |
| --- | --- | --- | --- | --- |
| Agenda e clientes básicos | integral | integral | consultar e organizar | apenas atribuições legítimas |
| Recebimentos | integral | autorizado | registrar, sem apagar histórico | nenhum |
| Caixa | integral | autorizado | nenhum | nenhum |
| Comissões | integral | autorizado | nenhum | próprias, quando habilitado |
| Anamnese e consentimentos | acesso mínimo justificado | acesso mínimo auditado | coleta sem acesso amplo | apenas atendimento vinculado |
| Gerenciar membros | integral | não por padrão | nenhum | nenhum |

## Validações obrigatórias antes de habilitar

1. Revisar a segurança da função `current_studio_id()` e os privilégios de EXECUTE, incluindo o acesso anônimo.
2. Verificar referências cruzadas: cliente, profissional, agendamento, pagamento, assinatura e consentimento devem pertencer ao mesmo estúdio.
3. Impedir que profissionais atribuam agendamentos a si mesmos para obter acesso indevido a dados.
4. Validar acesso por papel com pelo menos dois estúdios, usuários distintos, desligamento de membro e sessões antigas.
5. Verificar triggers financeiros e proteção contra pagamentos duplicados antes de conceder acesso de gravação.
6. Planejar logs de acesso e alteração dos documentos sensíveis e políticas de retenção.
7. Revisar todas as consultas frontend que hoje filtram por `user_id`.

**Status:** documentação de desenho de segurança; nenhuma política RLS ou conta de usuário foi alterada.

## Achado adicional: privilégios SQL de profiles (03/11/2026)

Auditoria somente leitura confirmou RLS habilitado em dez tabelas principais. O papel de banco `authenticated` tem privilégios SELECT, REFERENCES, TRIGGER e TRUNCATE em `public.profiles`. **TRUNCATE não é restringido por RLS**, portanto é necessário revisar e revogar privilégios desnecessários em ambiente controlado antes de liberar novas contas. Não executar comandos de revogação sem analisar dependências e testes de regressão. Uma política RLS correta não substitui a revisão de GRANTs.

## Verificação de privilégios (confirmada)

A consulta `has_table_privilege` confirmou TRUNCATE para `authenticated` em nove das dez tabelas examinadas e para `anon` em oito. A tabela `studio_anamneses` não apresentou TRUNCATE para esses papéis. Como TRUNCATE ignora RLS, é obrigatório revisar e revogar os privilégios desnecessários antes de habilitar acesso de funcionários. A revogação ainda não foi executada.

## Teste de regressão dos privilégios (plano)

Consulta de 03/11 confirmou que o papel authenticated mantém SELECT em todas as dez tabelas examinadas e INSERT nas tabelas operacionais que recebem cadastros e pagamentos. A proposta de revogação atinge apenas TRUNCATE, TRIGGER e REFERENCES, sem revogar SELECT/INSERT/UPDATE/DELETE. Ainda é obrigatório testar privilégios herdados, funções/triggers e fluxos reais em ambiente isolado antes de executar REVOKE. Não há evidência de que a revogação tenha sido aplicada.
