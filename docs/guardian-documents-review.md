# Autorização de responsáveis e documentos de clientes

## O que muda

A ficha do cliente passa a ter uma autorização separada para responsáveis legais de menores de 18 anos. Registra nascimento e documento do menor, nome e documento do responsável, vínculo, telefone, profissional, procedimento e região do corpo. O texto integral é apresentado antes da assinatura. Mudanças nos dados invalidam a assinatura desenhada e o aceite. O documento é preservado na tabela de termos existente, com histórico e impressão/PDF; não se altera termo já assinado.

A autorização não substitui a anamnese e o consentimento informado, nem afirma que qualquer procedimento em qualquer idade seja permitido. Referência estadual consultada: Portaria SES-RS 482/2005, item 3.1, alíneas g–j, disponível em https://www.cevs.rs.gov.br/upload/arquivos/201612/27151533-20120425143852portaria-estadual-n-482-05.pdf . Regras municipais e situações individuais precisam ser conferidas pelo estúdio; não foi validada uma regra municipal específica de Parobé.

A seção Documentos permite anexar e baixar PDF/JPG/PNG/WebP de até 5 MB. Utiliza studio_attachments e o bucket privado studio-private-docs existentes. Caminhos contêm usuário/cliente/UUID; os arquivos não são publicados por URL. Acesso continua reservado ao proprietário segundo as políticas RLS existentes. Se a vinculação do upload à ficha falhar, o arquivo temporário é removido; falhas de limpeza são informadas.

Para um termo gerado: imprimir/salvar o PDF e anexar à ficha. O sistema não gera automaticamente um arquivo PDF binário do termo.

## Envio via WhatsApp

O botão Enviar pelo WhatsApp fica em cada anexo na ficha. O usuário confere/edita o telefone, e confirma o arquivo e o destinatário exatos antes da transmissão. PDF é enviado como document; JPG/PNG como image. WebP pode ser armazenado, mas não é enviado nesta versão.

A rota /api/whatsapp/documents verifica bearer token por getUser, propriedade do anexo via RLS e conta WhatsApp do usuário. Baixa o arquivo por acesso autenticado e o transmite à Meta pela API de mídia, sem criar link público. A mensagem é registrada antes da transmissão e um requestId exclusivo bloqueia repetições do mesmo pedido. Há limite de 10 pedidos por minuto por usuário. Em timeout de confirmação, registra unknown e orienta conferir o WhatsApp antes de reenviar. Aceitação da API não é tratada como entrega ao destinatário; as atualizações chegam pelo webhook existente.

Variáveis de servidor: SUPABASE_SECRET_KEY, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_GRAPH_VERSION (padrão v26.0), mais as variáveis públicas Supabase existentes. Nenhum segredo foi inserido no código. Não houve mudança de schema, bucket ou permissões.

## Validação e pendências de publicação

- 26 testes sintéticos aprovados: validação de conteúdo/tamanho, nascimento, captura dos dados do responsável, destino, autenticação, propriedade, limite, upload à Meta simulado, PDF/imagem, duplicação, janela encerrada e timeout, além dos nove testes originais do webhook.
- Testes RLS transacionais de anexos no banco, revertidos: proprietário cria e consulta seu anexo de teste; outro usuário não o vê.
- TypeScript e build Next.js aprovados.
- Não foram enviadas mensagens ou documentos reais. Ainda é necessário testar o upload/download por navegador e um envio de arquivo sintético a um destinatário expressamente autorizado, com as credenciais do ambiente de publicação.
- Alterações preparadas em branch separada. Master preservada. Publicação em produção depende de confirmação específica do usuário.
