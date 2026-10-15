# Funções do sistema

O que cada parte do Family Finance faz, onde vive e o que se pode esperar
dela. Serve de mapa para quem mexe no código e de resposta rápida para
quem só quer saber "isto já faz o quê?".

---

## 1. Visão geral

| Camada | Onde | Papel |
|---|---|---|
| Telas | `src/app/**` | páginas do App Router (Next.js 16) |
| Componentes | `src/components/**` | cartões, listas, modais |
| Estado | `src/lib/store.tsx` | tudo o que as telas sabem passa por aqui |
| Dados do cliente | `@supabase/supabase-js` | sessão e CRUD com RLS |
| Dados do servidor | Prisma (`src/lib/prisma.ts`) | painel admin e registo de acessos |
| Esquema | `supabase/*.sql` | tabelas, RLS, triggers e funções SQL |

Duas regras que explicam quase todo o desenho:

1. **O acesso é da carteira, não da pessoa.** Quem partilha a carteira vê
   e edita os mesmos lançamentos e os mesmos desejos.
2. **O cliente nunca decide permissões.** Quem manda é o RLS do Postgres
   (para o que vem do navegador) e `src/lib/server-auth.ts` (para o que
   passa pelas rotas `/api`).

---

## 2. Contas e sessão

| Função | Ficheiro | O que faz |
|---|---|---|
| `signUp(name, email, password, gender)` | `lib/store.tsx` | cria a conta no Supabase Auth; o `gender` escolhe o tema (azul/rosa) |
| `signIn(email, password)` | `lib/store.tsx` | entra; devolve `null` em sucesso ou a mensagem de erro |
| `signOut()` | `lib/store.tsx` | termina a sessão |
| `handle_new_user()` | `supabase/schema.sql` | trigger que cria o `profiles` a cada registo |
| `AppShell` | `components/AppShell.tsx` | guarda de sessão: sem utilizador, manda para `/login` |

Sem `.env.local`, o login é falso e tudo vive no `localStorage` — útil
para desenvolver sem base de dados. As telas não notam a diferença.

---

## 3. Carteira partilhada

| Função | Ficheiro | O que faz |
|---|---|---|
| `ensure_household()` | SQL | devolve a carteira da pessoa, criando-a na primeira vez |
| `join_household(code)` | SQL | entra na carteira de outra pessoa pelo código e leva os lançamentos que já tinha |
| `my_household_ids()` | SQL | as carteiras de quem está autenticado; é a base de todas as policies |
| `joinHousehold(code)` | `lib/store.tsx` | chama o RPC acima e recarrega tudo |
| `HouseholdCard` | `components/` | mostra o código do convite e o campo para entrar noutra carteira |

As três funções SQL são `security definer` de propósito: se corressem sob
RLS, as policies que consultam `household_members` entravam em recursão.

---

## 4. Lançamentos (receitas e gastos)

| Função | Ficheiro | O que faz |
|---|---|---|
| `addTransaction(tx)` | `lib/store.tsx` | insere na carteira atual, com `user_id` de quem lançou |
| `updateTransaction(id, tx)` | `lib/store.tsx` | edita, desde que o lançamento seja da carteira |
| `removeTransaction(id)` | `lib/store.tsx` | exclui |
| `totals` | `lib/store.tsx` | saldo, receitas e despesas, recalculados a cada mudança |
| `findCategory(id)` | `lib/categories.ts` | ícone e cor da categoria; cai em "Outros" se não conhecer |
| `formatMoney` / `formatDate` | `lib/format.ts` | euro e datas em pt-PT |

Telas: `/dashboard` (saldo, gastos por categoria, últimos lançamentos),
`/expenses` e `/income` (lista com busca, editar e excluir).

---

## 5. Página de desejos — `/wishes`

O que a família quer comprar, com o quanto já está guardado para isso.
É a lista do que ainda não é despesa.

Cada desejo tem: título, preço, valor já guardado, categoria (as mesmas
dos gastos), prioridade (**alta**, **média**, **baixa**), notas, uma data
alvo opcional e a marca de comprado.

| Função | Ficheiro | O que faz |
|---|---|---|
| `addWish(wish)` | `lib/store.tsx` | acrescenta um desejo à carteira |
| `updateWish(id, wish)` | `lib/store.tsx` | edita |
| `removeWish(id)` | `lib/store.tsx` | exclui |
| `toggleWishBought(id)` | `lib/store.tsx` | marca como comprado (e dá o valor por juntado) ou devolve à lista |
| `wishTotals(wishes)` | `lib/wishes.ts` | quanto se quer ao todo, quanto está guardado e quanto falta |
| `progressOf(wish)` | `lib/wishes.ts` | percentagem guardada, de 0 a 100 |
| `sortWishes(wishes)` | `lib/wishes.ts` | por realizar primeiro, depois por prioridade |

A tela mostra, por cima, o total desejado e a barra do que já está
guardado; depois "A caminho" e, se houver, "Realizados". Em modo local a
lista vem com dois exemplos, como acontece com os lançamentos.

Tabela: `public.wishes`, com as mesmas quatro policies das transações —
ver, inserir, editar e excluir, sempre por carteira.

---

## 6. Registo de acessos

Cada entrada no sistema fica registada em `public.access_logs`. É o que
alimenta o painel admin.

Como funciona, do início ao fim:

1. o `store` deteta a sessão e chama `POST /api/track`, com o access
   token no `Authorization` (`event: "login"` quando a pessoa acabou de
   entrar, `"resume"` quando abriu com a sessão já aberta);
2. a rota valida o token no Supabase e, só depois, escreve;
3. `parseUserAgent` (`lib/user-agent.ts`) lê o `user-agent` e tira daí o
   **tipo de aparelho** (telemóvel, tablet, computador, robô), o modelo
   quando existe, o **sistema operativo** com versão e o navegador;
4. `resolveGeo` (`lib/geo.ts`) descobre **país, estado/região e cidade**:
   primeiro pelos cabeçalhos da rede (`x-vercel-ip-*`, `cf-*`), senão por
   consulta ao IP (`GEO_LOOKUP_URL`, por omissão `ipapi.co`). IPs
   privados não são consultados;
5. um `"resume"` só conta como acesso novo passada meia hora, para um
   refresh na página não encher a tabela.

Nada disto pode travar a entrada de ninguém: falha de rede, falta de
`DATABASE_URL` ou serviço de IP fora do ar respondem em silêncio e o app
segue igual.

O que fica guardado por acesso: data e hora, tipo de evento, IP, tipo e
modelo do aparelho, sistema operativo, navegador, país, código do país,
região, cidade, fuso horário e o `user-agent` em bruto (500 caracteres).
Cada pessoa pode ler o seu próprio histórico (policy "Ver os próprios
acessos"); escrever, só o servidor.

---

## 7. Painel admin — `/admin`

Quem tem conta, quem está ativo e por onde entrou.

**Cabeçalho:** contas, contas ativas, ativos nas últimas 24 horas e total
de acessos.

**Lista:** uma linha por pessoa, com nome, email, selo de *admin* ou *por
confirmar*, o último login (data, hora e "há quanto tempo"), o aparelho e
o sistema do último acesso, o local (cidade, estado, país) e o IP. Há
busca por nome, email ou cidade, e um filtro de contas ativas.

**Ao abrir uma linha:** o track completo dessa pessoa — os últimos 50
acessos, cada um com data e hora, se entrou ou retomou, aparelho, sistema
operativo, navegador, local, fuso e IP.

Conta ativa = email confirmado, sem banimento em vigor e não apagada.

| Rota | O que devolve |
|---|---|
| `GET /api/admin/users` | toda a gente com conta, o último acesso de cada e os totais |
| `GET /api/admin/accesses?user=&limit=` | o histórico de acessos de uma pessoa (máx. 200) |
| `GET /api/admin/me` | se quem pergunta pode abrir o painel (é o que mostra o atalho no cabeçalho) |

**Quem é admin:** quem tiver `profiles.is_admin = true`, ou cujo email
esteja em `ADMIN_EMAILS` — esta segunda via existe só para marcar o
primeiro. A verificação é feita em `requireAdmin` (`lib/server-auth.ts`),
no servidor; sem sessão dá 401, sem permissão dá 403.

Para promover alguém:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'eu@exemplo.com');
```

---

## 8. Prisma

O Prisma é o ORM do lado do servidor. Usa-se onde o cliente do navegador
não chega: ler `auth.users` (email, último login, confirmação) e escrever
os acessos.

- esquema: `prisma/schema.prisma`, com os schemas `public` e `auth`;
- cliente: `src/lib/prisma.ts` — um só por processo, para o `next dev`
  não esgotar o pool;
- ligação: `DATABASE_URL` (com pool, porta 6543) e `DIRECT_URL` (direta,
  porta 5432).

**Não corremos `prisma migrate`.** O dono do esquema é o Supabase: as
tabelas, o RLS, os triggers e as funções SQL nascem de `supabase/*.sql`,
que o Prisma não sabe representar. O fluxo é: mudar o SQL → correr no SQL
Editor → `npm run db:pull` (ou editar o `schema.prisma` à mão) →
`npm run db:generate`.

Como o Prisma se liga como dono das tabelas, **passa ao lado do RLS**.
Por isso nunca é importado por um ficheiro `"use client"`, e toda a rota
que o usa começa por validar quem está do outro lado.

Scripts: `db:generate`, `db:pull`, `db:studio`.

---

## 9. Modelo de dados

| Tabela | Para quê | Acesso |
|---|---|---|
| `auth.users` | contas (Supabase Auth) | só o servidor, via Prisma |
| `public.profiles` | nome, tema, `is_admin` | o próprio e quem partilha a carteira |
| `public.households` | carteiras | os membros |
| `public.household_members` | quem está em que carteira | os membros |
| `public.transactions` | receitas e gastos | por carteira |
| `public.wishes` | desejos | por carteira |
| `public.access_logs` | acessos | leitura: o próprio; escrita: só o servidor |
| `public.admin_users_overview` | view que junta conta + perfil + nº de acessos | `security_invoker` |

Ordem dos ficheiros SQL: `schema.sql` num projeto vazio; num projeto que
já tinha dados, `002_carteira_partilhada.sql` e depois
`003_desejos_e_acessos.sql`.

---

## 10. Variáveis de ambiente

| Variável | Sem ela |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `..._ANON_KEY` | o app corre em modo local (localStorage), com login falso |
| `DATABASE_URL` / `DIRECT_URL` | sem painel admin e sem registo de acessos; o resto funciona |
| `ADMIN_EMAILS` | só entra no painel quem já tiver `is_admin` na base |
| `GEO_LOOKUP_URL` | usa-se o `ipapi.co` por omissão |

O Prisma CLI lê o `.env`; o Next lê o `.env` e o `.env.local`. O mais
simples é pôr as ligações da base no `.env` e as chaves do Supabase no
`.env.local`.

---

## 11. Privacidade

O registo de acessos guarda IP e localização aproximada de quem usa o
app. É informação pessoal: convém dizer às pessoas que existe, não a
partilhar para fora e apagar o que já não serve. Uma limpeza periódica,
por exemplo:

```sql
delete from public.access_logs where occurred_at < now() - interval '180 days';
```
