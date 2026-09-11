# Family Finance

Controle simples das finanças da família. Next.js 16 (App Router) + Tailwind v4 + lucide-react.

## Estrutura

```
src/
├── app/
│   ├── login/          entrar
│   ├── register/       criar conta (escolhe o tema: azul ou rosa)
│   ├── dashboard/      saldo, receitas, despesas, últimos gastos
│   ├── expenses/       lista de gastos — editar e excluir
│   ├── income/         lista de receitas
│   ├── layout.tsx      raiz, envolve tudo no StoreProvider
│   ├── globals.css     tema (variáveis --accent)
│   └── page.tsx        redireciona para /login ou /dashboard
│
├── components/
│   ├── Header.tsx            saudação + sair
│   ├── Card.tsx              cartão de valor (saldo em destaque ou resumo)
│   ├── ExpenseItem.tsx       linha da lista, com ícone da categoria
│   ├── BottomNav.tsx         navegação inferior
│   ├── AppShell.tsx          guarda de sessão + Header + BottomNav
│   ├── AuthCard.tsx          moldura de login/registo
│   ├── TransactionModal.tsx  formulário de novo/editar lançamento
│   └── TransactionsView.tsx  lista usada por expenses e income
│
└── lib/
    ├── supabase.ts     cliente (ainda sem credenciais)
    ├── store.tsx       estado + persistência
    ├── categories.ts   categorias, ícones e cores
    ├── format.ts       euro e datas
    └── types.ts
```

O alias `@/` aponta para `src/`.

## Rodar

```bash
npm run dev
```

## Dados

O app tem dois backends e escolhe sozinho, conforme o `.env.local`:

| | sem `.env.local` | com `.env.local` |
|---|---|---|
| dados | `localStorage`, com exemplos | tabela `public.transactions` |
| login | falso (qualquer email entra) | Supabase Auth, com confirmação por email |

As telas não sabem a diferença — falam só com `useStore()` ([lib/store.tsx](src/lib/store.tsx)).

### Ligar ao Supabase

1. No painel: **SQL Editor** → correr [supabase/schema.sql](supabase/schema.sql)
   (cria a tabela e as policies de RLS — cada pessoa só vê os seus lançamentos).
2. Copiar `.env.example` para `.env.local` e preencher com os valores de
   **Project Settings → API**:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
3. Reiniciar o `npm run dev`.

Depois disso é preciso **criar uma conta nova** em `/register` e confirmar o
email — as contas antigas viviam só no navegador. Os lançamentos de exemplo
também não são migrados: a tabela começa vazia.

### Carteira partilhada

As policies dão acesso **por carteira**, não por pessoa: quem partilha a
carteira vê, edita e exclui os mesmos lançamentos. `user_id` fica só como
registo de quem lançou, e aparece na lista quando há mais de uma pessoa.

Para juntar duas contas:

1. cada pessoa cria a sua conta em `/register`;
2. uma delas copia o **código do convite** no cartão "Carteira partilhada"
   do dashboard;
3. a outra cola esse código e clica em Entrar — os lançamentos que já tinha
   vão com ela para a carteira partilhada.

### Categorias

A coluna `category` é texto livre. O app guarda ids próprios
(`mercado`, `carro`, `comida`, `contas`, `saude`…), cada um com ícone e cor
em [lib/categories.ts](src/lib/categories.ts).
