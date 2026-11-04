# NFS-e MEI — implementação segura (somente homologação)

## Escopo aprovado
- Gestão interna do estúdio e emissão de NFS-e para MEI.
- WhatsApp Business fora do escopo desta versão. Não modificar nem publicar integração existente.
- Trabalhar apenas na branch `feat/nfse-mei-homologacao` e no Supabase TEST `prflqdbkgxjgbidzhfbc`; não alterar `master` nem produção.

## Referências oficiais verificadas em 04/11/2026
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual
- https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/apis-prod-restrita-e-producao
- https://www.gov.br/nfse/pt-br/nt-2023-001-obrigatoriedade-da-nfs-e-nacional-para-o-mei.pdf

## Critérios de implementação
1. Registrar rascunho fiscal vinculado ao atendimento concluído, com valor e descrição; revisar CPF/CNPJ do tomador quando aplicável.
2. Isolar emissão/consulta/cancelamento em backend autenticado, autorizado exclusivamente para owner; nunca expor certificado A1, senha, chave privada ou token ao navegador, logs ou repositório.
3. Consultar documentação vigente e layouts XSD; construir DPS com assinatura digital exigida para API, usando certificado autorizado e armazenado de forma segura.
4. Enviar somente para ambiente de produção restrita durante testes; tratar rejeições, duplicidades, timeout, idempotência, reconciliação e status.
5. Persistir histórico de rascunhos, solicitações, chave de acesso, status e eventos; restringir acesso por RLS, sem permitir que profissionais vejam dados fiscais.
6. Disponibilizar DANFSe/PDF apenas quando existir documento fiscal autorizado. Não rotular recibos ou prévias como nota emitida.
7. Cancelamento somente via evento oficial e quando permitido; registrar resultado retornado pela SEFIN.
8. Testar permissão de owner, bloqueio de artist/piercer, emissão simulada, erros e download; só habilitar produção com autorização explícita.

## Pendências externas para emissão real
- Confirmar CNPJ, inscrição municipal e enquadramento fiscal vigente com o titular/contador, sem solicitar segredos pelo chat.
- Obter certificado digital válido e autorização de uso em ambiente seguro; conferir requisitos atuais da API.
- Validar códigos de serviço e tributação de tatuagem/piercing com contador/município.
- Homologar com o emissor nacional; não emitir notas reais antes da aprovação do titular.

## Estado
Planejamento técnico registrado. Nenhuma emissão, conexão fiscal ou deploy foi realizada por este documento.
