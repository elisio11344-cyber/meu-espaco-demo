# Meu espaço

Base de uma plataforma pessoal de produtividade, com Next.js 15 (App Router), TypeScript estrito e Tailwind CSS 4. A interface principal usa uma identidade amarela e preta e funciona de forma responsiva.

Este repositório é a demonstração do produto. Cada atualização concluída passa por lint, testes e build antes de ser enviada ao GitHub.

## Demonstração pública

Acesse: **[elisio11344-cyber.github.io/meu-espaco-demo](https://elisio11344-cyber.github.io/meu-espaco-demo/)**

A versão estática em GitHub Pages é gerada com `npm run build:pages` e publicada a partir da pasta `docs`. Ela preserva a navegação, os tutoriais, o tema e os cadastros salvos no navegador. A captura inteligente usa um interpretador local nessa demonstração; autenticação, Gemini e sincronização com o Supabase exigem a aplicação completa.

> Estado atual: cadastro, confirmação de e-mail, login, proteção de rotas e logout estão prontos. Sem credenciais do Supabase, a aplicação mantém o modo local para permitir o desenvolvimento da interface; ao configurar `.env.local`, a autenticação é ativada automaticamente.

## Executar

Requer Node.js 22 ou superior e npm.

```sh
npm install
cp .env.example .env.local
npm run dev
```

As variáveis do Supabase não são necessárias enquanto o modo local estiver ativo. Acesse http://localhost:3000.

## Configurar o Supabase

1. Habilite o provedor Email em Authentication / Providers.
2. Configure Site URL em Authentication / URL Configuration como `http://localhost:3000` no desenvolvimento, ou a origem HTTPS em produção.
3. Copie a Project URL e a Publishable key para `.env.local`. Defina também `NEXT_PUBLIC_SITE_URL` com a origem da aplicação.
4. Para exigir confirmação de e-mail (recomendado), mantenha Confirm email habilitado. Em Authentication / Email Templates / Confirm signup, use este destino no link de confirmação:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirmar meu e-mail</a>
```

O cadastro informa que é necessário consultar a caixa de entrada; o link verifica o token no servidor, cria a sessão e abre `/dashboard`. Se Confirm email estiver desabilitado no projeto, o cadastro inicia a sessão imediatamente. As restrições de senha adicionais configuradas no Supabase continuam válidas.

As migrations em `supabase/migrations` preparam o banco para hábitos, metas, notas interligadas, gamificação, recompensas, agenda e finanças multi-moedas. Todas as tabelas de dados privados têm `user_id` e políticas RLS restritas a `auth.uid()`. Depois de criar e vincular o projeto remoto, aplique-as em ordem com `supabase db push`. A interface ainda usa `localStorage`; a próxima etapa de persistência é trocar os adaptadores locais pelas consultas ao Supabase, módulo por módulo.

## Configurar a captura inteligente com Gemini

O dashboard aceita comandos em linguagem natural para criar movimentações, notas e compromissos. Na aplicação autenticada, o navegador envia o comando para a Edge Function `quick-capture`; somente essa função acessa o Gemini. A chave nunca é enviada ao cliente nem versionada.

```sh
supabase db push
supabase secrets set GEMINI_API_KEY=sua-chave
supabase secrets set GEMINI_MODEL=gemini-3.5-flash-lite
supabase secrets set ALLOWED_ORIGINS=http://localhost:3000,https://seu-dominio.com
supabase functions deploy quick-capture
```

A tabela `assistant_requests` registra somente usuário, provedor, modelo, tipo da ação, tamanho da entrada e status. O texto digitado não é armazenado nessa telemetria. Há um limite de 20 comandos por minuto por usuário. A versão do GitHub Pages mantém um interpretador local para demonstrar o fluxo sem chave privada ou chamadas pagas.

## Rotas e estado atual

- A aplicação abre diretamente em `/dashboard` e permite navegar entre `/agenda`, `/habitos`, `/notas`, `/metas`, `/recompensas` e `/financas`.
- O dashboard reúne hábitos, metas, finanças, nota recente e um Brain visual com as conexões entre anotações.
- A captura inteligente na visão geral interpreta despesas, receitas, notas e compromissos, grava no módulo correspondente e permite desfazer a última criação.
- Hábitos, notas, metas, recompensas, contas bancárias e movimentações financeiras podem ser criados, editados e excluídos. Os dados ficam salvos no `localStorage` do navegador enquanto o modo local estiver ativo.
- Notas aceitam etiquetas e conexões bidirecionais. O módulo de notas alterna entre cartões e um mapa de conhecimento no estilo Obsidian.
- Concluir hábitos e metas credita pontos uma única vez. O painel de recompensas permite definir o custo, acompanhar o extrato e comprar itens com débito automático do saldo.
- Finanças armazena valores em centavos e separa contas, saldos, histórico e análise de gastos por AUD, BRL e USD. Contas podem ser vinculadas a instituições bancárias do país e da moeda escolhidos.
- O menu é lateral no desktop e abre como painel no celular.
- `/login`, `/registro` e o fluxo do Supabase protegem as rotas quando as variáveis do projeto estão configuradas.
- O middleware usa `getUser()` para validar a sessão no Supabase e propaga cookies renovados inclusive em redirecionamentos. Respostas protegidas não são armazenadas em cache público.
- Sair encerra a sessão do navegador atual. Não há recuperação de senha nem login social.

## Verificação

```sh
npm run lint
npm test
npm run build
```

O build e a aplicação funcionam sem credenciais no modo local. Com as credenciais configuradas, teste cadastro, confirmação de e-mail, login, navegação protegida e logout.

Teste manual no modo local: percorra os módulos, crie e edite um item de cada tipo, conclua um hábito e uma meta, compre uma recompensa e alterne entre AUD, BRL e USD em Finanças. Verifique também o menu em largura de celular.

## Dependências

Next.js, React, TypeScript e ESLint sustentam o framework e as verificações. Tailwind e seu plugin PostCSS implementam a interface responsiva. `@supabase/supabase-js` é o SDK de autenticação; `@supabase/ssr` integra a sessão com cookies; Zod valida os formulários no servidor. Vitest executa os testes automatizados. Nenhuma biblioteca nova foi necessária para esta atualização.

Referências: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) e [Next.js](https://nextjs.org/docs/app/getting-started/installation).

O override de PostCSS mantém a versão corrigida usada pelo Next.js. A auditoria de produção está sem alertas; a cadeia de lint (`eslint-config-next → fast-glob → micromatch → braces`) ainda apresenta cinco alertas altos de desenvolvimento, sem correção publicada para `braces` na data da implementação.
