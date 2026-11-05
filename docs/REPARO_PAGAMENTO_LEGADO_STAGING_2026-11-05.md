# Reparação concluída — pagamento legado no staging

Data: 05/11/2026. Projeto Supabase de testes: `prflqdbkgxjgbidzhfbc`.

O pagamento legado com ID `d28824cc-72b3-4458-aeac-73d2aa6e8ed7` tinha `studio_id` nulo. Foram verificadas, antes da correção, as correspondências de usuário, agendamento, estúdio e vínculos existentes com caixa e comissão. Uma migração transacional removeu temporariamente o gatilho de imutabilidade, atualizou exclusivamente esse registro, restaurou o mesmo gatilho e validou as invariantes. A migração foi aplicada com sucesso.

Verificação posterior: `payments_without_studio=0`, `total_payments=4`, `immutable_trigger_enabled=1`.

O banco principal não foi alterado. O teste de concorrência entre sessões independentes e a homologação autenticada/mobile ainda estão pendentes; não publicar sem essas verificações.
