# Finalização do Edinho Chaves Tattoo Pro (sem WhatsApp)

## Escopo
- Cadastro e histórico de clientes
- Agenda, profissionais e prevenção de conflitos
- Pagamentos e fluxo de caixa
- Comissões
- Anamnese e termos de consentimento
- Autenticação e recuperação de senha
- Responsividade e acessibilidade

A integração com WhatsApp está fora do escopo desta entrega. Não remover as configurações existentes nem reativar o webhook.

## Segurança — verificado em 04/11/2026
- [x] RLS habilitado nas tabelas do schema public (auditoria de tabelas)
- [x] Revogado EXECUTE de PUBLIC, anon e authenticated em cinco funções internas: rls_auto_enable, studio_commission_to_cash, studio_generate_commission, studio_update_commission_status, sync_studio_payment_to_cash
- [x] search_path fixado nas funções studio_block_payment_changes e studio_protect_cash_entry
- [x] Auditoria repetida: alertas correspondentes resolvidos
- [ ] Revisar execução autenticada de current_role e current_studio_id (usadas em políticas RLS; não revogar sem análise)
- [ ] Avaliar extensão btree_gist no schema public
- [ ] Habilitar proteção contra senhas vazadas no Supabase Auth

## Validação necessária antes da publicação
- [ ] Build de produção e testes automatizados
- [ ] Login, logout e recuperação de senha
- [ ] Criar/editar cliente e verificar isolamento por usuário
- [ ] Criar, reagendar e cancelar agendamento, inclusive conflito simultâneo
- [ ] Receber sinal e restante sem ultrapassar preço; confirmar sincronização no caixa
- [ ] Concluir atendimento e verificar comissões e baixa financeira
- [ ] Gerar/imprimir anamnese e consentimento
- [ ] Conferir uso no celular e mensagens de erro
- [ ] Testar acesso com usuário sem permissão e backup/restauração
- [ ] Conferir variáveis do Vercel sem expor segredos
- [ ] Testar a versão candidata antes de publicar no domínio principal

## Restrições
Não alterar master, não apagar dados existentes e não promover uma versão sem testes bem-sucedidos.
