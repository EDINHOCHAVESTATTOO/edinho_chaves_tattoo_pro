# Testes de banco da NFS-e MEI — 04/11/2026

Ambiente: Supabase TEST `prflqdbkgxjgbidzhfbc`. Produção não acessada.

## Cenários executados
1. Criados cliente, profissional e atendimento fictícios de R$ 150 com status `concluido` dentro de transação SQL.
2. Simulada sessão autenticada do administrador; inserção de rascunho de R$ 150 foi aceita e o administrador visualizou 1 registro.
3. Simulada sessão autenticada de profissional; consulta ao mesmo registro retornou 0.
4. Tentativa de criar rascunho com valor divergente (R$ 149 para atendimento de R$ 150) foi bloqueada; consulta retornou 0.
5. Todos os cenários foram encerrados com `ROLLBACK`. Nenhum dado fictício permaneceu no banco.

## Limites dos testes
- Testes feitos em SQL com role `authenticated` e claim de usuário simulada, não por login real no navegador.
- Ainda não há integração com API do Emissor Nacional, certificado, DPS, DANFSe, cancelamento ou emissão real.
- Ainda não foi testada uma emissão por API ou a navegação completa da tela.
- Não habilitar emissão fiscal de produção sem homologação e aprovação expressa.
