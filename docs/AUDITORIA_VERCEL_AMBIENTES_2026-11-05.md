# Auditoria de configuração Vercel — 05/11/2026

Projeto: `prj_J85pGWAJdgug2GRwGdoeBAUckcMu`.

Consulta de variáveis de ambiente realizada com `decrypt=false` (segredos não acessados nem divulgados).

- Branches `feat/nfse-mei-homologacao`, `feat/acesso-profissionais-seguro` e `feat/gestao-interna-estudio` possuem `NEXT_PUBLIC_SUPABASE_URL` específico de preview apontando para `prflqdbkgxjgbidzhfbc.supabase.co`, com chaves publicáveis específicas.
- Existe também `NEXT_PUBLIC_SUPABASE_URL` de escopo geral para `development`, `preview` e `production`, com valor retornado em formato criptografado/indisponível para conferência direta, e chave publicável de escopo geral.
- Não foi identificada na listagem uma configuração específica para a branch `fix/app-finalizacao-sem-whatsapp`.

**Risco:** não está comprovado se o preview da branch de finalização acessa o banco de homologação ou o de produção. Não executar mais lançamentos de teste até confirmar a URL efetiva e a chave pública correspondentes ao build. Não expor valores de chaves.

**Próximas ações:** configurar de forma controlada variáveis de preview específicas da branch de finalização, apontando exclusivamente para o projeto de homologação, verificar chave publicável compatível sem registrá-la em GitHub, gerar novo preview e confirmar em runtime a origem dos dados. Isso requer autorização operacional e verificação da credencial correta.

O banco de produção possui esquema distinto de homologação (a tabela `studio_payments` não possui `studio_id`). Não aplicar SQL de homologação em produção automaticamente.

Sem publicação, merge ou alteração de produção.
