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

## Dados pessoais e consentimentos (auditoria complementar)
- studio_anamneses, studio_anamnesis_signatures e studio_tattoo_consents também têm user_id, mas não studio_id.
- Não conceder acesso genérico à equipe a informações de saúde, assinaturas ou consentimentos.
- Definir regras separadas para leitura, criação e alteração desses documentos, com testes por papel e estúdio.
- Exigir rastreabilidade e preservar documentos existentes durante qualquer migração.

## Matriz inicial de permissões (proposta, ainda não aplicada)

| Operação | Proprietário | Gerente | Recepção | Tatuador / piercer |
| --- | --- | --- | --- | --- |
| Agenda: visualizar e organizar | Sim | Sim | Sim | Somente atendimentos atribuídos |
| Cadastro de clientes: dados de contato | Sim | Sim | Sim | Somente clientes atribuídos |
| Anamnese e consentimento | Sim, com necessidade de acesso | Acesso restrito e auditado | Somente coleta/registro, sem consulta geral | Somente documentos necessários ao atendimento |
| Pagamentos: registrar | Sim | Sim | Sim, sem editar histórico | Não |
| Fluxo de caixa e relatórios financeiros | Sim | Sim, se autorizado | Não | Não |
| Comissões | Sim | Sim, se autorizado | Não | Somente valores próprios, se habilitado |
| Usuários e permissões | Sim | Não por padrão | Não | Não |

**Esta matriz é uma proposta para validação antes da implementação.** As regras efetivas devem ser impostas no banco por RLS e verificadas por testes, não apenas ocultando botões na interface. Dados de saúde e assinaturas requerem acesso mínimo e rastreabilidade. Evitar que um profissional veja documentos de clientes de outro profissional sem vínculo legítimo. Nenhuma permissão é alterada por este documento.
