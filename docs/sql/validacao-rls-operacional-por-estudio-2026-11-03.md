# RLS operacional por estúdio — Supabase TEST, 03/11/2026

Migração aplicada no projeto TEST `prflqdbkgxjgbidzhfbc`: `test_scope_operational_rls_by_owner_studio`.

Foram substituídas as políticas SELECT, INSERT e UPDATE de `studio_appointments`, `studio_clients` e `studio_professionals` que antes validavam apenas `user_id = auth.uid()`. As novas políticas exigem, conjuntamente: `user_id = auth.uid()`, `studio_id IS NOT NULL` e perfil do usuário com `role='owner'` e `profiles.studio_id = <tabela>.studio_id`. Todas as referências a colunas de tabelas externas são qualificadas.

Teste SQL com `SET LOCAL ROLE authenticated` e JWT simulado: owner do estúdio A inseriu cliente no estúdio A (1 registro); tentativa de inserir cliente no estúdio B foi rejeitada (0 registros). Teste em transação revertida. Nenhum cliente real foi modificado.

**Limites:** somente TEST, schema sintético parcial. Outros módulos, policies, grants, triggers e sessões reais de autenticação ainda precisam de auditoria antes da produção. A master e a produção não foram alteradas.
