# Integração bidirecional Google Agenda — projeto (não ativada)

## Estado
A integração ainda **não está conectada**. A aplicação não possui credenciais Google OAuth, consentimento do titular nem endpoints de sincronização implantados. Não apresentar como funcional.

## Comportamento acordado
- Agenda do Edinho Chaves Tattoo Pro ↔ Google Agenda, em ambos os sentidos.
- O usuário escolhe explicitamente qual calendário Google sincronizar. Preferir calendário exclusivo do estúdio, nunca o calendário pessoal principal por padrão.
- O aplicativo mantém sua própria agenda como fonte de verdade para cliente, profissional, preço, pagamento, comissões, consentimento e status.
- Google recebe somente título genérico (ex.: 'Atendimento — Edinho Chaves Tattoo'), horário, duração e identificador opaco. Não transmitir nome/telefone, anamnese, documentos de menores, valor ou observações sensíveis.
- Eventos criados diretamente no Google Agenda entram no aplicativo inicialmente como **bloqueios provisórios de horário**, não como agendamentos confirmados com cliente fictício. Alterações e exclusões exigem regras explícitas de conciliação.
- Nunca apagar automaticamente registros financeiros, documentos ou agendamentos pagos em resposta à exclusão de evento Google.
- Timezone padrão: America/Sao_Paulo, armazenar instantes UTC no banco.

## Autorização e credenciais
1. Criar projeto Google Cloud, configurar OAuth consent screen e escopo mínimo de eventos do calendário escolhido.
2. Configurar client ID/secret e redirect URI do ambiente de preview em variáveis privadas da Vercel; jamais NEXT_PUBLIC_ para segredos.
3. OAuth 2.0 com state e PKCE, vinculado à sessão Supabase do proprietário; armazenar refresh token cifrado em tabela privada, sem exposição por API do navegador.
4. Permitir revogação/desconexão e exclusão dos tokens, sem apagar eventos de terceiros.

## Sincronização segura
- Tabela de mapeamento `appointment_id ↔ google_event_id` por usuário, calendário e profissional; unicidade e RLS.
- Outbox transacional para alterações locais; job idempotente envia alterações e grava etag/versão; retries exponenciais.
- Google → aplicativo: incremental sync com syncToken e/ou push channels com renovação e validação; fallback por reconciliação periódica.
- Evitar loop de eco com identificadores privados, idempotência e comparação de versões.
- Resolver concorrência com controle otimista/etag; conflitos viram pendência para revisão, não sobrescrita silenciosa.
- Bloqueios externos respeitam indisponibilidade do profissional; conflitos devem ser verificados no banco, não só no cliente.
- Logs sem dados sensíveis e sem tokens.

## Critérios de homologação
- Conectar, desconectar, renovar token e tratar token revogado.
- Criar, editar, remarcar e cancelar do app e observar efeito no Google.
- Criar, editar e excluir evento no Google e observar bloqueio/atualização no app.
- Dois profissionais e calendários distintos; horários sobrepostos; fuso horário e horário de verão.
- Testar perda de rede, duplicidade de notificações, reenvio, evento apagado e conflitos simultâneos.
- Confirmar que informações financeiras, de clientes e menores não saem para o Google.

## Próximo pré-requisito
Autorização OAuth do proprietário e configuração do projeto Google Cloud. Não há conta Google autorizada para este aplicativo ainda.
