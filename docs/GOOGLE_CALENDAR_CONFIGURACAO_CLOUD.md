# Configuração do Google Agenda — Edinho Chaves Tattoo Pro

## Estado atual

A exportação manual de horários está disponível. **OAuth, armazenamento de tokens e sincronização bidirecional ainda não estão implementados.** Não ativar sincronização em produção antes de validar segurança, RLS, reconciliação de conflitos e testes ponta a ponta.

## Configuração no Google Cloud (responsável pela conta Google)

1. Abrir https://console.cloud.google.com/ e selecionar/criar um projeto sob controle do estúdio.
2. Ativar **Google Calendar API**.
3. Configurar a tela de consentimento OAuth (nome do aplicativo, contatos e usuários de teste quando aplicável).
4. Criar **ID do cliente OAuth 2.0** do tipo **Aplicativo da Web**.
5. Adicionar como URI de redirecionamento autorizado a URL HTTPS **exata** do ambiente de testes seguida de `/api/google-calendar/callback`. Preferir domínio estável de preview; URLs de deploy individuais mudam.
6. Cadastrar as variáveis **somente no ambiente Preview** da Vercel, nunca em arquivos versionados nem com prefixo `NEXT_PUBLIC_`:
   - `GOOGLE_CALENDAR_CLIENT_ID`
   - `GOOGLE_CALENDAR_CLIENT_SECRET`
   - `GOOGLE_CALENDAR_REDIRECT_URI`
   - `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` (chave criptográfica aleatória de 32 bytes, definida pelo serviço de criptografia quando implementado)
7. O titular deverá autorizar o aplicativo na tela oficial do Google quando o fluxo OAuth estiver implementado. **Nunca compartilhar senha, código de autenticação, client secret ou refresh token no chat.**

## Implementação obrigatória antes de conectar

- Rotas autenticadas OAuth start/callback com state, PKCE, validação da sessão e bloqueio de redirecionamento aberto.
- Persistência privada de refresh token criptografado, sem acesso direto do navegador; revogação/desconexão.
- Mapeamento estável dos eventos e bloqueios de disponibilidade, sincronização incremental, tratamento de concorrência e erros.
- Escopos mínimos, limites e consentimento; calendário existente do Edinho.
- Não enviar nomes, telefones, documentos de menores, valores ou observações privadas ao Google.
- Eventos criados no Google devem entrar como bloqueios provisórios, sem inventar clientes ou pagamentos.
- Testes de reconciliação, reautorização, conflitos, revogação, falhas de rede e não duplicação.

O endpoint `GET /api/google-calendar/status` informa apenas se as variáveis existem; **não indica conexão real**.
