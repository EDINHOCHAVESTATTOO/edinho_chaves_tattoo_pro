# Plano de acesso compartilhado do estúdio (não aplicado)

Auditoria em 03/11/2026. **Não aplicar parcialmente no banco de produção.**

## Estado confirmado
- profiles tem id, studio_id e role; studios tem id.
- studio_clients, studio_professionals, studio_appointments, studio_payments, studio_commissions e cash_entries têm user_id, mas não studio_id.
- RLS dos módulos usa user_id = auth.uid(); profiles permite SELECT pelo studio_id = current_studio_id().
- Frontend também filtra dados com .eq('user_id', user.id). Portanto, só alterar RLS não compartilha os dados.

## Implementação planejada
1. Fazer inventário completo de tabelas, constraints, triggers, funções, privilégios e políticas antes da migração.
2. Adicionar studio_id com backfill validado pela associação do dono em profiles, sem apagar user_id nem registros existentes.
3. Impedir mudança arbitrária de studio_id/user_id pelo cliente; conferir integridade das referências entre cliente, profissional, agendamento e pagamento.
4. Projetar políticas RLS por função: owner/manager, reception, artist/piercer; limitar finanças, comissões e dados sensíveis por papel. Verificar revogação de acesso.
5. Atualizar todas as consultas, mutações e módulos para escopo do studio_id, removendo os filtros exclusivos por user_id somente após a migração estar validada.
6. Testar com usuários distintos e estúdios diferentes: acesso permitido, acesso negado, alteração de papel, remoção de membro, dados legados e concorrência.
7. Só então habilitar convites/cadastro de funcionários. Não criar contas ou migrar dados reais automaticamente.

## Critérios de aceite
- Dono continua acessando dados anteriores.
- Dois funcionários do mesmo estúdio veem somente dados permitidos.
- Funcionário de outro estúdio não acessa nenhum registro.
- Recepção não acessa dados financeiros restritos.
- Desligamento de funcionário revoga acesso.
- Master e produção preservadas até aprovação e testes.
