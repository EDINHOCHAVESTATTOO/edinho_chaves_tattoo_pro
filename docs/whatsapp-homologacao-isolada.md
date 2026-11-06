# Homologação isolada — WhatsApp Business

## Situação verificada em 05/11/2026
- Preview do commit 707f54f compilou com sucesso.
- Na Vercel, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN e SUPABASE_SECRET_KEY existem apenas no ambiente Production; não estão configuradas para a branch Preview.
- Projeto Supabase de testes: prflqdbkgxjgbidzhfbc. Não possui tabelas whatsapp_* no schema public. Não apontar o webhook de teste para o banco de produção.
- A chegada de uma mensagem ao aplicativo WhatsApp Business **não** comprova entrega ao webhook.

## Preparação segura (ainda não executada)
1. Criar um app Meta de testes e um número de teste distinto; registrar sua própria chave de aplicativo e token de verificação, sem reutilizar credenciais de produção.
2. Preparar schema de whatsapp_accounts, whatsapp_conversations e whatsapp_messages no Supabase de testes, com constraints e permissões revisadas; usar somente dados fictícios.
3. Na Vercel, configurar variáveis **restritas à branch** fix/whatsapp-webhook-supabase (Preview): NEXT_PUBLIC_SUPABASE_URL apontando para projeto de testes; SUPABASE_SECRET_KEY desse projeto; WHATSAPP_APP_SECRET e WHATSAPP_VERIFY_TOKEN do app Meta de testes. Nunca usar NEXT_PUBLIC_ para secrets.
4. Gerar novo preview após configurar variáveis; não promover para Production.
5. Na Meta, configurar Callback URL com o endpoint /api/whatsapp **da preview**, verificar com o token de testes e assinar o campo messages do objeto whatsapp_business_account.
6. Enviar mensagem do número autorizado para o número de testes. Confirmar HTTP 200 no POST e registros em whatsapp_conversations e whatsapp_messages no banco de testes. Se falhar, correlacionar horário e logs da função; nunca registrar corpo integral da mensagem ou tokens.

## Atenção
- Meta pode exigir número de teste ou WABA separado; não alterar o callback da WABA de produção para um preview sem planejamento explícito.
- Nenhum segredo deve ser enviado por chat ou commitado.
- Não alterar master nem publicar automaticamente.
