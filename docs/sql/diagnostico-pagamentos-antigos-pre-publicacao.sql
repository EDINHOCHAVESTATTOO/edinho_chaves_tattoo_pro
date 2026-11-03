-- DIAGNÓSTICO SOMENTE LEITURA. Executar em SQL Editor autorizado,
-- conferir resultados antes de qualquer backfill em produção.
-- Não modifica dados nem desativa gatilhos.
SELECT count(*) AS total_pagamentos,
       count(*) FILTER (WHERE p.user_id IS NULL) AS sem_proprietario,
       count(*) FILTER (WHERE owner.id IS NULL) AS sem_perfil,
       count(*) FILTER (WHERE owner.id IS NOT NULL AND owner.studio_id IS NULL) AS perfil_sem_estudio,
       count(*) FILTER (WHERE owner.studio_id IS NOT NULL) AS com_estudio_resolvido
FROM public.studio_payments p
LEFT JOIN public.profiles owner ON owner.id=p.user_id;
-- Conferir consistência dos vínculos entre pagamento, agendamento e usuário:
SELECT count(*) AS pagamentos_sem_agendamento,
       count(*) FILTER (WHERE a.id IS NOT NULL AND a.user_id IS DISTINCT FROM p.user_id) AS proprietario_divergente
FROM public.studio_payments p
LEFT JOIN public.studio_appointments a ON a.id=p.appointment_id
WHERE a.id IS NULL OR a.user_id IS DISTINCT FROM p.user_id;
-- O backfill de pagamentos NÃO pode ser executado com o gatilho de
-- imutabilidade atual. Exige decisão explícita de migração auditável,
-- transacional, após backup e reconciliação dos valores retornados.
