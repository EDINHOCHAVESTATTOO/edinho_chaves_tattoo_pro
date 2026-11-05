# Checklist de liberação de produção — Edinho Chaves Tattoo Pro

Estado: **NÃO LIBERADO**. Branch de trabalho `fix/app-finalizacao-sem-whatsapp`; não alterar `master` nem publicar sem autorização explícita.

## Funcionalidades homologadas manualmente
- Login, agenda, clientes, sinal Pix, caixa e comissões.
- Autorização de menores para tatuagem e piercing, impressão A4 em uma página.

## Bloqueadores técnicos
1. Testar duas sessões independentes e simultâneas tentando registrar pagamentos cujo total supera o valor do agendamento. Confirmar um sucesso, uma rejeição e ausência de registros parciais em caixa/comissões.
2. Revisar e documentar o esquema real de produção. Foi constatado por consulta SQL que `public.studio_payments` em produção **não possui coluna `studio_id`**, enquanto o banco de homologação possui. Não executar migrações de homologação na produção sem revisão e adaptação.
3. A produção já possui o trigger `studio_validate_payment_before_insert` com bloqueio `FOR UPDATE`, e `studio_payment_immutable`. Preservar esses gatilhos.
4. Revisar proposta `docs/sql/production_review_appointment_paid_balance_guard.sql` com o esquema de produção, permissões e testes antes de aplicar. Não presumir compatibilidade entre ambientes.
5. Verificar a configuração do Supabase usado no preview Vercel, para não misturar dados reais com testes.
6. Verificar RLS, funções `SECURITY DEFINER`, credenciais e variáveis de ambiente antes da publicação.
7. Solicitar autorização expressa para aplicar migrações de produção, promover deployment e/ou mesclar branch.

## Exclusões da primeira versão
Integração WhatsApp e emissão fiscal.

## Observação operacional
A consulta adicional de colunas do banco de produção foi bloqueada pela ferramenta durante a revisão; por isso o mapeamento de diferenças ainda está incompleto. Não tratar como aprovação.
