-- Family Finance — esquema completo (carteira partilhada).
-- Correr no Supabase > SQL Editor, num projeto novo/vazio.
-- Se a tabela `transactions` já existir com dados, correr antes
-- `002_carteira_partilhada.sql`, que migra sem apagar nada.

-- ---------------------------------------------------------------- perfis
-- O nome e o tema (azul/rosa) precisam ser legíveis pelo par,
-- e `auth.users` só é legível pelo próprio. Daí uma tabela de perfis.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  gender text not null default 'male' check (gender in ('male', 'female')),
  created_at timestamp with time zone default now()
);

-- Cria o perfil automaticamente a cada registo, a partir do signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, gender)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'gender', 'male')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------- carteiras

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nossa Família',
  -- código curto para o par entrar na mesma carteira
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_at timestamp with time zone default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (household_id, user_id)
);

-- --------------------------------------------------------- transações

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),

  -- a carteira manda no acesso; user_id diz apenas quem lançou
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,

  type text not null check (type in ('income', 'expense')),

  amount numeric(12,2) not null,

  description text not null,

  category text not null default 'other',

  date date not null default current_date,

  created_at timestamp with time zone default now()
);

create index if not exists transactions_household_date_idx
  on public.transactions (household_id, date desc, created_at desc);

-- ------------------------------------------------------------- funções
-- SECURITY DEFINER: lê `household_members` por fora do RLS, senão as
-- policies que consultam essa tabela entrariam em recursão infinita.

create or replace function public.my_household_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id
  from public.household_members
  where user_id = auth.uid();
$$;

-- Devolve a carteira do utilizador, criando uma na primeira vez.
create or replace function public.ensure_household()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão';
  end if;

  select household_id into hid
  from public.household_members
  where user_id = auth.uid()
  limit 1;

  if hid is null then
    insert into public.households default values returning id into hid;
    insert into public.household_members (household_id, user_id)
    values (hid, auth.uid());
  end if;

  return hid;
end;
$$;

-- Entra na carteira de outra pessoa pelo código do convite e leva
-- consigo os lançamentos que já tinha.
create or replace function public.join_household(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  current_hid uuid;
begin
  if auth.uid() is null then
    raise exception 'Sem sessão';
  end if;

  select id into target
  from public.households
  where invite_code = upper(trim(code));

  if target is null then
    raise exception 'Código inválido';
  end if;

  select household_id into current_hid
  from public.household_members
  where user_id = auth.uid()
  limit 1;

  if current_hid = target then
    return target;
  end if;

  if current_hid is not null then
    update public.transactions
    set household_id = target
    where household_id = current_hid
      and user_id = auth.uid();

    delete from public.household_members
    where user_id = auth.uid() and household_id = current_hid;

    -- apaga a carteira antiga se ficou sem ninguém
    delete from public.households h
    where h.id = current_hid
      and not exists (
        select 1 from public.household_members m where m.household_id = h.id
      );
  end if;

  insert into public.household_members (household_id, user_id)
  values (target, auth.uid())
  on conflict do nothing;

  return target;
end;
$$;

-- --------------------------------------------------------------- RLS

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.transactions enable row level security;

-- perfis: o próprio e quem partilha a carteira
drop policy if exists "Ver perfis da carteira" on public.profiles;
create policy "Ver perfis da carteira"
on public.profiles for select
using (
  id = auth.uid()
  or id in (
    select user_id from public.household_members
    where household_id in (select public.my_household_ids())
  )
);

drop policy if exists "Editar o próprio perfil" on public.profiles;
create policy "Editar o próprio perfil"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

-- carteiras
drop policy if exists "Ver a própria carteira" on public.households;
create policy "Ver a própria carteira"
on public.households for select
using (id in (select public.my_household_ids()));

drop policy if exists "Renomear a própria carteira" on public.households;
create policy "Renomear a própria carteira"
on public.households for update
using (id in (select public.my_household_ids()));

-- membros
drop policy if exists "Ver os membros da carteira" on public.household_members;
create policy "Ver os membros da carteira"
on public.household_members for select
using (household_id in (select public.my_household_ids()));

drop policy if exists "Sair da carteira" on public.household_members;
create policy "Sair da carteira"
on public.household_members for delete
using (user_id = auth.uid());

-- transações: o acesso é da carteira, não da pessoa.
-- É isto que deixa os dois verem, editarem e excluírem os mesmos lançamentos.
drop policy if exists "Users can view their transactions" on public.transactions;
drop policy if exists "Users can insert their transactions" on public.transactions;
drop policy if exists "Users can update their transactions" on public.transactions;
drop policy if exists "Users can delete their transactions" on public.transactions;

drop policy if exists "Ver as transações da carteira" on public.transactions;
create policy "Ver as transações da carteira"
on public.transactions for select
using (household_id in (select public.my_household_ids()));

drop policy if exists "Inserir na carteira" on public.transactions;
create policy "Inserir na carteira"
on public.transactions for insert
with check (
  household_id in (select public.my_household_ids())
  and user_id = auth.uid()
);

drop policy if exists "Editar na carteira" on public.transactions;
create policy "Editar na carteira"
on public.transactions for update
using (household_id in (select public.my_household_ids()));

drop policy if exists "Excluir na carteira" on public.transactions;
create policy "Excluir na carteira"
on public.transactions for delete
using (household_id in (select public.my_household_ids()));
