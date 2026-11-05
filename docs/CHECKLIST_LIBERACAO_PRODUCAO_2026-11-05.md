# Checklist de liberação de produção — Edinho Chaves Tattoo Pro

Estado: **NÃO LIBERADO**. Branch de trabalho `fix/app-finalizacao-sem-whatsapp`; não alterar `master` nem publicar sem autorização explícita.

## Funcionalidades homologadas manualmente
- Login, agenda, clientes, sinal Pix, caixa e comissões.
- Autorização de menores para tatuagem e piercing, impressão A4 em uma página.

## Bloqueadores técnicos
1. Testar duas sessões independentes e simultâneas tentando registrar pagamentos cujo total supera o valor do agendamento. Confirmar um sucesso, uma rejeição e ausência de registros parciais em caixa/comissões.
2. **Confirmado por consulta SQL em 05/11/2026:** `public.studio_payments` e `public.studio_appointments` em produção não possuem `studio_id`, enquanto ambas possuem a coluna na homologação. Ambas possuem `user_id`; pagamentos possuem `appointment_id` e `amount`. Adaptar qualquer migração e o fluxo de permissões ao esquema real de produção antes de liberar.
3. A produção já possui o trigger `studio_validate_payment_before_insert` com bloqueio `FOR UPDATE`, e `studio_payment_immutable`. Preservar esses gatilhos.
4. Revisar proposta `docs/sql/production_review_appointment_paid_balance_guard.sql` com o esquema de produção, permissões e testes antes de aplicar. Não presumir compatibilidade entre ambientes.
5. **Concluído em 05/11/2026:** Vercel preview específico da branch `fix/app-finalizacao-sem-whatsapp` possui `NEXT_PUBLIC_SUPABASE_URL` apontando para `prflqdbkgxjgbidzhfbc` (homologação), distinto do projeto de produção `mxwhrefuzhhqmmlggegd`. Variável publishable key está configurada especificamente para a branch (valor secreto não inspecionado).
6. **Parcial em 05/11/2026:** RLS ativo nas cinco tabelas principais da homologação. Advisor de segurança detectou `public.my_professional_schedule` como função `SECURITY DEFINER` executável por usuários autenticados e proteção de senhas vazadas desativada. Revisar intenção, privilégios e isolamento entre contas distintas antes de publicar.
7. Solicitar autorização expressa para aplicar migrações de produção, promover deployment e/ou mesclar branch.

## Exclusões da primeira versão
Integração WhatsApp e emissão fiscal.

## Observação operacional
A consulta de colunas essenciais de produção foi concluída em 05/11/2026; o mapeamento completo das diferenças, o teste de concorrência e o teste de autorização entre contas distintas ainda estão pendentes. Não tratar como aprovação.
