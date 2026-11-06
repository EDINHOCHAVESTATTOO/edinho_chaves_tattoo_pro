# Consulta das conversas WhatsApp

A assinatura do aplicativo na conta comercial foi corrigida na Meta em 06/11/2026. Uma mensagem de texto e uma reação reais chegaram ao banco. A página principal existente não tinha uma área para consultar esse histórico.

Esta alteração acrescenta a aba WhatsApp após o login, com lista de conversas, busca na página atual, histórico paginado de 50 mensagens e atualização manual. Texto é apresentado como texto simples. Outros formatos são identificados sem simular conteúdo que o webhook não armazenou. O módulo apenas consulta dados; o envio de respostas continua no WhatsApp Business.

As consultas usam o cliente público já existente, getUser(), filtros por user_id e as políticas RLS existentes. Nenhuma credencial privilegiada é enviada ao navegador. As requisições são canceladas ao trocar de conversa ou sair do módulo. Não há alteração no webhook.

## Liberação pendente de confirmação

O papel authenticated não tem SELECT nas duas tabelas consultadas. O script `docs/whatsapp-inbox-enable.sql` concede somente leitura e recusa execução caso RLS esteja desativado. Esse script NÃO foi aplicado permanentemente. Não houve alteração de permissões anônimas, de políticas RLS ou publicação de código em produção.

Depois de aprovação específica: aplicar o script e publicar a branch revisada no projeto Vercel existente. Confirmar após login que as mensagens reais aparecem na aba WhatsApp, que a atualização traz novas mensagens e que o layout funciona no celular. Não é necessário modificar a master para revisar esta alteração.

## Validação

- Teste transacional, com rollback, da permissão proposta: proprietário vê duas mensagens e duas conversas; outro usuário vê zero mensagens e zero conversas.
- Testes sintéticos existentes do webhook: nove casos aprovados, incluindo assinatura, reenvio sem duplicação e erros de banco.
- TypeScript fixado em 5.9.3 para preservar a API transpileModule usada pelos testes; o lock anterior trazia TypeScript 7, cuja API é incompatível.
- Compilação e checagem de tipos executadas localmente; não substituem o teste autenticado da nova tela em um ambiente publicado.
