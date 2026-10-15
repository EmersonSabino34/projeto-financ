-- FAMILY FINANCE
-- Página de desejos, registo de acessos e marca de administrador.
-- Correr no Supabase > SQL Editor, depois de 002_carteira_partilhada.sql.
-- ============================================================

-- ============================================================
-- 1. ADMINISTRADOR
-- ============================================================
-- Quem pode abrir /admin. A coluna é a fonte de verdade; a variável
-- ADMIN_EMAILS serve só para promover o primeiro admin (ver secção 8).

alter table public.profiles
add column if not exists is_admin boolean not null default false;


-- ============================================================
-- 2. DESEJOS
-- ============================================================
-- Mesma regra das transações: o acesso é da carteira, não da pessoa.

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),

  household_id uuid not null
    references public.households(id)
    on delete cascade,

  -- quem pediu; fica como registo
  user_id uuid
    references auth.users(id)
    on delete set null,

  title text not null,

  -- quanto custa e quanto já está guardado para isso
  price numeric(12,2) not null,
  saved numeric(12,2) not null default 0,

  category text not null default 'outros',

  priority text not null default 'media'
    check (priority in ('alta', 'media', 'baixa')),

  notes text not null default '',

  -- para quando se quer ter
  target_date date,

  -- preenchido quando o desejo vira compra
  bought_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists wishes_household_idx
on public.wishes (
  household_id,
  bought_at,
  created_at desc
);


-- ============================================================
-- 3. ACESSOS
-- ============================================================
-- Uma linha por entrada no sistema. Escrita só pelo servidor
-- (Prisma, com a DATABASE_URL) — o cliente não toca nesta tabela.

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  occurred_at timestamptz not null default now(),

  -- 'login' (entrou agora) ou 'resume' (sessão já aberta)
  event text not null default 'login',

  ip text,

  -- mobile | tablet | desktop | bot
  device_type text,
  device_model text,
  os text,
  browser text,

  country text,
  country_code text,
  region text,
  city text,
  timezone text,

  user_agent text
);

create index if not exists access_logs_user_idx
on public.access_logs (
  user_id,
  occurred_at desc
);

create index if not exists access_logs_recent_idx
on public.access_logs (
  occurred_at desc
);


-- ============================================================
-- 4. RLS
-- ============================================================

alter table public.wishes enable row level security;
alter table public.access_logs enable row level security;


-- ============================================================
-- 5. DESEJOS — POLICIES
-- ============================================================

drop policy if exists "Ver os desejos da carteira"
on public.wishes;

create policy "Ver os desejos da carteira"
on public.wishes
for select
using (
  household_id in (
    select public.my_household_ids()
  )
);


drop policy if exists "Pedir na carteira"
on public.wishes;

create policy "Pedir na carteira"
on public.wishes
for insert
with check (
  household_id in (
    select public.my_household_ids()
  )
  and user_id = auth.uid()
);


drop policy if exists "Editar desejos da carteira"
on public.wishes;

create policy "Editar desejos da carteira"
on public.wishes
for update
using (
  household_id in (
    select public.my_household_ids()
  )
);


drop policy if exists "Excluir desejos da carteira"
on public.wishes;

create policy "Excluir desejos da carteira"
on public.wishes
for delete
using (
  household_id in (
    select public.my_household_ids()
  )
);


-- ============================================================
-- 6. ACESSOS — POLICIES
-- ============================================================
-- Sem policy de escrita: nenhuma sessão do navegador insere aqui.
-- O servidor liga-se com a DATABASE_URL (dono da tabela) e passa
-- ao lado do RLS. Cada pessoa pode ver o seu próprio histórico.

drop policy if exists "Ver os próprios acessos"
on public.access_logs;

create policy "Ver os próprios acessos"
on public.access_logs
for select
using (
  user_id = auth.uid()
);


-- ============================================================
-- 7. QUEM ESTÁ ATIVO
-- ============================================================
-- Conta ativa = email confirmado, não banida, não apagada.
-- A view junta o que o painel admin mostra numa linha por pessoa.

create or replace view public.admin_users_overview
with (security_invoker = true)
as
select
  u.id,
  u.email,
  p.name,
  p.gender,
  p.is_admin,
  u.created_at,
  u.email_confirmed_at,
  u.last_sign_in_at,
  (
    u.email_confirmed_at is not null
    and (u.banned_until is null or u.banned_until < now())
    and u.deleted_at is null
  ) as is_active,
  (
    select count(*)
    from public.access_logs a
    where a.user_id = u.id
  ) as access_count
from auth.users u
left join public.profiles p
on p.id = u.id;


-- ============================================================
-- 8. PROMOVER O PRIMEIRO ADMIN
-- ============================================================
-- Trocar o email e correr uma vez.

-- update public.profiles
-- set is_admin = true
-- where id = (
--   select id from auth.users where email = 'eu@exemplo.com'
-- );
