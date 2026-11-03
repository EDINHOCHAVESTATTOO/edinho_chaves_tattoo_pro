# Bloqueios de publicação — revisão do frontend e banco (03/11/2026)

## Diagnóstico confirmado no código da branch `feat/gestao-interna-estudio`

O frontend usa o proprietário da sessão como escopo dos registros, em vez do estúdio e da função do membro. Isso é incompatível com a autorização multiestúdio validada apenas em tabelas sintéticas.

- `src/app/AgendaEstudio.tsx`: linhas 44–47 consultam profissionais, clientes, agendamentos e pagamentos com `.eq('user_id', user.id)`; linhas 65–76 criam registros usando `user_id` do login; linhas 114–115 e 148 restringem updates por `user_id`.
- `src/app/FluxoCaixa.tsx`: linhas 67 e 101 gravam/filtram por `user_id`.
- `src/app/ComissoesEstudio.tsx`: linhas 50–52, 67–69 e 105–108 filtram por `user_id`.
- `src/app/ClientesEstudio.tsx`: linhas 59–60, 75–77, 85–86, 98–100, 128–129, 148–159 usam `user_id` como escopo.
- `src/lib/supabase.ts` usa chave publicável, correto para frontend, mas a autorização deve ocorrer no RLS do banco, não somente em filtros de interface.

## Correções necessárias ANTES da publicação multiusuário

1. Projetar vínculo entre `auth.uid()`, `profiles`, `studio_id` e função, incluindo múltiplos membros do mesmo estúdio; validar os dados existentes.
2. Criar política RLS por operação e função em **esquema de teste fiel ao oficial**, inclusive com FKs e triggers financeiros; jamais usar política sintética por `user_id` em produção.
3. Substituir consultas e mutações do frontend por escopo `studio_id`, sem confiar em `studio_id` enviado pelo cliente; derivar/autorizá-lo no banco. Manter identificação do criador quando necessária para auditoria.
4. Resolver pagamentos antigos por vínculo validado sem alterar valor, proprietário ou histórico; não desabilitar gatilho de imutabilidade sem plano auditado.
5. Testar owner, manager, reception, artist e piercer, dois estúdios, acesso anônimo, inserções indevidas e transações financeiras.
6. Rodar build, testes E2E com contas de teste e validação de preview conectada ao banco isolado.
7. Só então executar migração de produção com backup/rollback verificados e publicar versão compatível.

## Estado de validação

- Produção: dois pagamentos antigos, ambos com perfil, estúdio e agendamento válidos; nenhum proprietário divergente.
- Teste: primeira etapa aditiva da migração passou, sem alterar pagamentos; RLS sintética por função passou, mas não equivale ao esquema real.
- Preview Vercel READY é build, **não** aprovação funcional.
- **Não promover a produção enquanto os bloqueios acima não forem resolvidos.**
