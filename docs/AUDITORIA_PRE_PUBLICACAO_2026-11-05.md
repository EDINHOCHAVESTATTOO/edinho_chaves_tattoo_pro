# Auditoria de pré-publicação — 05/11/2026

Escopo: somente leitura no Supabase e inspeção do deploy de preview. **Nenhuma alteração aplicada ao banco de dados de produção.** WhatsApp e NFS-e fora do escopo.

## Verificações realizadas
- Último preview da branch `fix/app-finalizacao-sem-whatsapp`: Vercel READY no commit `e35c589a029774c9534cedb23b98b12c6de1653f`. READY confirma compilação, **não** testes de negócio.
- 21 tabelas do schema public com RLS habilitada e pelo menos uma política.
- `studio_appointments`: FKs compostas (client_id,user_id) e (professional_id,user_id).
- `studio_payments`: FK composta (appointment_id,user_id).
- `studio_commissions`: FK composta (payment_id,user_id); relação com professional_id exige verificação adicional de consistência de proprietário.
- Não foram realizados testes autenticados com usuários diferentes, nem testes de escrita com dados fictícios.

## Alertas do Supabase Security Advisor
1. `authenticated_security_definer_function_executable`: funções `public.current_role()` e `public.current_studio_id()` podem ser chamadas por authenticated. **Revisar implementações, dependências e privilégios EXECUTE** antes de revogar; não modificar às cegas. https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
2. `extension_in_public`: extensão `btree_gist` no schema public. **Avaliar migração segura** sem afetar constraints dependentes. https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
3. `auth_leaked_password_protection`: proteção de senhas vazadas desativada. Ativar após conferir disponibilidade e efeitos na configuração Auth. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Performance Advisor
- 33 avisos de chaves estrangeiras sem índice de cobertura. Priorizar tabelas em uso (`studio_appointments`, `studio_payments`, `studio_commissions`), revisar índices já existentes e plano de consultas antes de criar índices. https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## Critérios de liberação
- [ ] Revisar e tratar os alertas de segurança sem quebrar funções ou constraints.
- [ ] Validar isolamento entre dois usuários de teste (RLS + vínculos de registros).
- [ ] Executar cliente → agenda → pagamento → caixa → comissão, com dados fictícios em ambiente isolado.
- [ ] Conferir anamnese, consentimento, assinatura e impressão em celular e computador.
- [ ] Validar juridicamente autorização para menores antes de uso real.
- [ ] Obter aprovação explícita para merge/publicação; não alterar master ou produção antes disso.
