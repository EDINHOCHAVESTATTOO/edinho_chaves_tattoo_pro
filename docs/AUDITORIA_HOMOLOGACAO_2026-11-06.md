# Resultado da auditoria de homologação — 06/11/2026

## Status
**BLOQUEADO para aprovação definitiva.** Auditoria de leitura executada; testes funcionais com escrita e navegador não foram executados nesta etapa. Não confundir ausência de erro nos logs com validação de todos os fluxos.

## Evidências
- Produção e homologação possuem estruturas diferentes: produção com 24 tabelas públicas, homologação com 22 tabelas públicas (inclui fixtures, Google Calendar e NFSe; produção inclui outras tabelas de gestão).
- Todas as tabelas públicas examinadas em ambos os ambientes possuem RLS habilitada.
- Homologação: `whatsapp_accounts`, `whatsapp_conversations` e `whatsapp_messages` têm zero políticas RLS. O serviço com chave privilegiada pode operar, mas o usuário autenticado comum não tem acesso via Data API por essas tabelas. **Não criar política genérica sem validar identidade, propriedade, modelo de acesso e fluxo da caixa de entrada.**
- Produção: WhatsApp registrou 9 entradas recebidas, 1 saída lida e 2 saídas falhadas (consulta anterior). Revalidar após testes reais.
- Testes históricos de RLS em `docs/HOMOLOGACAO_RLS_05NOV2026.md` na branch `fix/app-finalizacao-sem-whatsapp`: identidade simulada em SQL, escrita revertida; testes de browser não concluídos.
- Webhook da branch base valida HMAC, reconhece eventos de status, usa chave Supabase no servidor, mas depende de teste de ponta a ponta para certificar persistência e entrega.

## Próximos testes obrigatórios antes da liberação
1. Confrontar migrations/esquemas do ambiente de homologação com os requisitos reais da versão candidata; não copiar esquema de produção sem plano de dados e rollback.
2. Testar autorização com duas contas reais de teste em estúdios diferentes, incluindo documentos e armazenamento privado.
3. Testar no ambiente isolado: criar/editar/confirmar agenda, clientes, pagamentos, comissões, caixa, consentimentos, documentos de responsáveis e anexos, com reversão ou fixtures.
4. Testar caixa de entrada com usuário autenticado e acesso ao serviço no backend; negar acesso cruzado.
5. Executar testes automatizados, build e teste de navegação móvel, documentando resultados concretos.
6. Consolidar módulos de branches divergentes por revisão de diff e testes, nunca merge indiscriminado.
7. Exigir aprovação explícita antes de promover para produção.

## Restrições
Sem mudança em `master`, sem publicação, sem escrita de dados reais, sem credenciais no repositório.
