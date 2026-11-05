# Checklist de homologação — Edinho Chaves Tattoo Pro

Status: **pré-publicação**. Não usar dados reais de menores nos testes. Não publicar a branch antes de aprovação.

## Testes automatizados já observados
- [x] Vercel compilou o commit anterior com status READY.
- [ ] Executar testes automatizados de interface (ainda não configurados).
- [ ] Testar impressão/PDF no navegador autenticado (não executado).
- [ ] Confirmar requisitos jurídicos e sanitários locais antes de usar termos para menores.

## Roteiro de teste manual com dados fictícios

### Acesso e permissões
- [ ] Login com conta autorizada e logout.
- [ ] Senha errada apresenta erro sem revelar informações.
- [ ] Acesso sem login não exibe dados de clientes.
- [ ] Usuário de outro estúdio não vê nem altera registros alheios.

### Clientes
- [ ] Cadastrar cliente fictício, recarregar e conferir persistência.
- [ ] Editar cliente, recarregar e conferir alterações.
- [ ] Abrir histórico e relatório sem erros.

### Agenda
- [ ] Cadastrar profissional fictício.
- [ ] Agendar atendimento, recarregar e verificar persistência.
- [ ] Impedir agendamentos sobrepostos do mesmo profissional.
- [ ] Alterar status e verificar consistência.
- [ ] Tentar pagamento acima do valor e conferir bloqueio.

### Caixa e comissões
- [ ] Registrar pagamento e verificar lançamento no caixa.
- [ ] Confirmar valores, totais e comissão calculada.
- [ ] Testar exclusão permitida e recusa de exclusão protegida.

### Autorização de menores — tatuagem e piercing
- [ ] Testar cada procedimento separadamente, com nomes/documentos fictícios.
- [ ] Bloquear impressão com campos obrigatórios incompletos.
- [ ] Bloquear data anterior ao nascimento.
- [ ] Bloquear idade igual ou superior a 18 anos na data prevista.
- [ ] Ao alterar identificação após conferência, exigir nova conferência documental.
- [ ] Ao alterar procedimento, região ou data, exigir nova conferência das normas.
- [ ] Imprimir A4 em desktop e salvar PDF; verificar assinaturas e que não aparece o menu do app.
- [ ] Verificar impressão em iPhone/Safari e Android/Chrome.
- [ ] Validar modelo com profissional jurídico e Vigilância Sanitária municipal/estadual.

## Critérios para publicação
- [ ] Nenhum defeito bloqueante no fluxo principal.
- [ ] Segurança e RLS revisadas com contas de teste distintas.
- [ ] Documento de menor juridicamente revisado ou funcionalidade desativada até revisão.
- [ ] Backup e plano de reversão conferidos.
- [ ] Aprovação explícita do proprietário para publicar na master/produção.

WhatsApp e emissão de notas fiscais estão fora do escopo desta entrega.
