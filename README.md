
# Edinho Chaves Tattoo — starter profissional com ferramentas gratuitas

Este projeto é um ponto de partida para evoluir o protótipo para uma aplicação web com autenticação, banco de dados e permissões.

## Stack sugerida (planos gratuitos sujeitos a limites)
- **Supabase**: autenticação + PostgreSQL + políticas de segurança (RLS).
- **Vercel**: hospedagem do frontend.
- **GitHub**: versionamento do código.
- **Next.js + TypeScript**: interface web responsiva.
- O logotipo original fornecido foi copiado para `public/` sem alterações.

> Planos gratuitos têm limites e regras que podem mudar. Não há cobrança automática por este código; você cria as contas e escolhe os planos. Não coloque dados reais de clientes antes de configurar e testar a segurança.

## O que está incluído
- Estrutura inicial de aplicação Next.js.
- Tela de login via Supabase Auth.
- Esquema SQL para perfis, clientes, serviços, agendamentos, caixa, pagamentos e comissões.
- RLS (Row Level Security) inicial para isolar dados por estúdio.
- Tela inicial com navegação e o logo original.
- Guia de implantação.

## Pré-requisitos
Instale Node.js LTS e Git. Crie contas gratuitas em GitHub, Supabase e Vercel.

## Configuração
1. Crie um projeto no Supabase.
2. No Supabase, abra **SQL Editor**, cole `supabase/schema.sql` e execute.
3. Em **Authentication → Users**, crie o primeiro usuário. Depois, associe esse usuário ao estúdio usando o SQL de bootstrap indicado abaixo.
4. Copie `.env.example` para `.env.local` e preencha as variáveis do projeto Supabase.
5. Instale dependências e execute:
   ```bash
   npm install
   npm run dev
   ```
6. Abra `http://localhost:3000`.

## Variáveis de ambiente
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave publicável/anon do projeto.
- Nunca coloque `service_role` ou segredos privados em variáveis `NEXT_PUBLIC_*`.

## Criar o primeiro estúdio e associar proprietário
Depois de criar o usuário em **Authentication → Users**, execute no SQL Editor, substituindo os valores:
```sql
insert into public.studios (name) values ('Edinho Chaves Tattoo') returning id;
```
Copie o `id` retornado e execute:
```sql
insert into public.profiles (id, studio_id, full_name, role)
values ('UUID-DO-USUARIO-AUTH', 'UUID-DO-ESTUDIO', 'Edinho Chaves', 'owner');
```
Substitua os UUIDs reais. Não use exemplos literalmente.

## Publicação gratuita
1. Suba o projeto para um repositório GitHub privado.
2. Importe o repositório na Vercel.
3. Configure as mesmas variáveis de ambiente em Project Settings → Environment Variables.
4. Faça o deploy.
5. Configure URLs de redirecionamento no Supabase Auth para o domínio local e o domínio publicado.

## Segurança antes de uso real
- Teste RLS com dois usuários de dois estúdios diferentes.
- Configure recuperação de senha e URLs autorizadas.
- Não armazene dados médicos detalhados ou fotos sensíveis sem revisar base legal, consentimento, controle de acesso e retenção conforme LGPD.
- Configure backups/exportações e teste restauração.
- O fechamento de caixa precisa ser validado contra pagamentos e estornos; este starter não integra adquirentes nem bancos.
- A comissão tem uma tabela base, mas as regras de cálculo e pagamento precisam ser definidas para o negócio.

## Estado do projeto
É um starter técnico, não um SaaS pronto para produção. O login e o esquema estão preparados, mas as telas de cadastro/caixa/comissões ainda precisam ser ligadas às consultas do Supabase e testadas.
