# AGENTS.md

## Sobre o projeto
Plataforma pessoal de produtividade: hábitos/rotinas (incluindo treinos), notas interligadas,
metas e controle financeiro. Usuário único por conta; todos os dados são privados por usuário.

## Stack
- Next.js 14+ (App Router), TypeScript estrito, Tailwind CSS
- Supabase (Postgres + Auth). Toda tabela tem coluna user_id e Row Level Security ativa.
- Recharts para gráficos. Zod para validação de formulários.

## Comandos
- Instalar: npm install
- Dev: npm run dev
- Lint: npm run lint
- Testes: npm test
- Antes de finalizar qualquer tarefa, rode lint, testes e build e corrija os erros.

## Entrega
- Depois que lint, testes e build passarem, crie um commit descritivo e envie a atualização ao repositório GitHub configurado em `origin`.
- Nunca versione `.env.local`, credenciais, chaves, arquivos de vínculo local do Supabase ou dados pessoais.

## Convenções
- Código e nomes de variáveis em inglês; textos da interface em português (pt-BR).
- Estrutura por módulo: src/app/(app)/<modulo>, src/lib/<modulo>, src/components/<modulo>.
- Migrations SQL em supabase/migrations, uma por mudança, nunca editar migration antiga.
- Valores monetários em centavos (integer), nunca float.
- Datas em UTC no banco; exibir no fuso do usuário.

## Regras
- Não instale bibliotecas novas sem justificar no resumo da tarefa.
- Não altere módulos fora do escopo pedido.
- Toda nova tabela precisa de política RLS que restrinja ao auth.uid().
- Interface responsiva (mobile primeiro).
