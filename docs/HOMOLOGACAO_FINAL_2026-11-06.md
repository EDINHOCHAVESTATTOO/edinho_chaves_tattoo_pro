# Homologação final — Edinho Chaves Tattoo Pro (06/11/2026)

## Escopo e proteção
- Branch de trabalho: `chore/final-homologacao-20261106`, criada de `feat/guardian-documents-review-20261106`.
- Não alterar `master` nem promover/publicar produção sem aprovação específica.
- Preservar WhatsApp Business, autorização de menores, documentos privados e funcionalidades existentes.
- Não usar clientes reais em testes destrutivos; testar escrita no ambiente isolado somente após conferir migrações e dados de homologação.

## Evidências verificadas (somente leitura)
- Supabase produção `mxwhrefuzhhqmmlggegd` ativo; banco com 24 tabelas públicas, todas com RLS habilitada e ao menos uma política (isso não comprova correção das políticas).
- Ambiente isolado `prflqdbkgxjgbidzhfbc` ativo; esquema distinto da produção: não presumir paridade.
- Produção: 5 agendamentos, 2 clientes, 3 pagamentos, 3 comissões, 1 anexo, 0 registros na tabela studio_consents (pode haver consentimentos em outras tabelas).
- WhatsApp: 6 conversas, 12 mensagens; 9 recebidas, 1 saída lida, 2 saídas com falha. Verificar envios posteriores.
- Vercel: deploy de produção `52170a94bd2fa51a976e34c18f18f1a50705ac2e` da branch `feat/guardian-documents-review-20261106`, estado READY. Nenhum erro retornado na consulta de 1h; ausência de erros não prova testes ponta a ponta.
- A branch `fix/app-finalizacao-sem-whatsapp` divergiu da versão de produção: não realizar merge automático. Há também branches distintas de gestão, profissionais e WhatsApp.

## Bloqueadores para liberação definitiva
1. Validar autenticação, autorização e isolamento entre usuários/estúdios com testes negativos; conferir políticas e acesso a anexos privados.
2. Testar CRUD e integridade de agenda, clientes, pagamentos, comissões, caixa e campanhas no ambiente isolado.
3. Testar ficha, consentimento, assinatura, autorização de menores, anexos e proteção de documentos.
4. Testar mensagens WhatsApp recebidas e enviadas; investigar dois envios históricos com falha, sem expor dados ou credenciais.
5. Testar interface em celular, fluxos de erro, estados vazios, e controles de acesso.
6. Conferir cobertura de testes, builds e versões das dependências; preservar lockfile e revisar atualizações.
7. Conciliar branches por comparação de mudanças, sem sobrescrever módulos já publicados.
8. Após aprovação de testes e revisão humana de dados reais, solicitar confirmação específica antes de merge ou publicação.

## Resultado desta etapa
Branch de homologação criada e checklist registrado. Não houve migração, escrita de dados de clientes, merge, nem novo deploy de produção.
