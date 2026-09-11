-- FAMILY FINANCE
-- Migração para carteira compartilhada
-- ============================================================

-- ============================================================
-- 1. PERFIS
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  gender text not null default 'male'
    check (gender in ('male', 'female')),
  created_at timestamptz default now()
);

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
    coalesce(
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(new.raw_user_meta_data ->> 'gender', 'male')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- ============================================================
-- 2. CARTEIRAS
-- ============================================================

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),

  name text not null default 'Nossa Família',

  invite_code text not null unique
    default upper(substr(md5(random()::text), 1, 6)),

  created_at timestamptz default now()
);


-- ============================================================
-- 3. MEMBROS
-- ============================================================

create table if not exists public.household_members (
  household_id uuid not null
    references public.households(id)
    on delete cascade,

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  created_at timestamptz default now(),

  primary key (household_id, user_id)
);


-- ============================================================
-- 4. ADICIONAR CARTEIRA ÀS TRANSAÇÕES EXISTENTES
-- ============================================================

alter table public.transactions
add column if not exists household_id uuid
references public.households(id)
on delete cascade;


-- ============================================================
-- 5. CRIAR CARTEIRA PARA QUEM JÁ TEM LANÇAMENTOS
-- ============================================================

do $$
declare
  u record;
  hid uuid;
begin

  for u in
    select distinct user_id
    from public.transactions
    where user_id is not null
      and household_id is null
  loop

    select hm.household_id
    into hid
    from public.household_members hm
    where hm.user_id = u.user_id
    limit 1;

    if hid is null then

      insert into public.households default values
      returning id into hid;

      insert into public.household_members (
        household_id,
        user_id
      )
      values (
        hid,
        u.user_id
      );

    end if;

    update public.transactions
    set household_id = hid
    where user_id = u.user_id
      and household_id is null;

  end loop;

end;
$$;


-- ============================================================
-- 6. VERIFICAR SE SOBROU ALGUMA TRANSAÇÃO SEM CARTEIRA
-- ============================================================

select count(*) as transacoes_sem_carteira
from public.transactions
where household_id is null;


-- ============================================================
-- 7. DEPOIS DE CONFIRMAR QUE O RESULTADO É 0
-- ============================================================

alter table public.transactions
alter column household_id set not null;


-- ============================================================
-- 8. ÍNDICE
-- ============================================================

create index if not exists transactions_household_date_idx
on public.transactions (
  household_id,
  date desc,
  created_at desc
);


-- ============================================================
-- 9. FUNÇÃO PARA DESCOBRIR A CARTEIRA DO UTILIZADOR
-- ============================================================

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


-- ============================================================
-- 10. CRIAR CARTEIRA AUTOMATICAMENTE
-- ============================================================

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

  select household_id
  into hid
  from public.household_members
  where user_id = auth.uid()
  limit 1;

  if hid is null then

    insert into public.households default values
    returning id into hid;

    insert into public.household_members (
      household_id,
      user_id
    )
    values (
      hid,
      auth.uid()
    );

  end if;

  return hid;

end;
$$;


-- ============================================================
-- 11. ENTRAR NA CARTEIRA DO PAR
-- ============================================================

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


  select id
  into target
  from public.households
  where invite_code = upper(trim(code));


  if target is null then
    raise exception 'Código inválido';
  end if;


  select household_id
  into current_hid
  from public.household_members
  where user_id = auth.uid()
  limit 1;


  if current_hid = target then
    return target;
  end if;


  -- Se já possui uma carteira,
  -- transfere os seus lançamentos para a nova.
  if current_hid is not null then

    update public.transactions
    set household_id = target
    where household_id = current_hid
      and user_id = auth.uid();


    delete from public.household_members
    where user_id = auth.uid()
      and household_id = current_hid;


    delete from public.households h
    where h.id = current_hid
      and not exists (
        select 1
        from public.household_members m
        where m.household_id = h.id
      );

  end if;


  insert into public.household_members (
    household_id,
    user_id
  )
  values (
    target,
    auth.uid()
  )
  on conflict do nothing;


  return target;

end;
$$;


-- ============================================================
-- 12. RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.transactions enable row level security;


-- ============================================================
-- 13. PROFILES
-- ============================================================

drop policy if exists "Ver perfis da carteira"
on public.profiles;

create policy "Ver perfis da carteira"
on public.profiles
for select
using (
  id = auth.uid()
  or id in (
    select hm.user_id
    from public.household_members hm
    where hm.household_id in (
      select public.my_household_ids()
    )
  )
);


drop policy if exists "Editar o próprio perfil"
on public.profiles;

create policy "Editar o próprio perfil"
on public.profiles
for update
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);


-- ============================================================
-- 14. HOUSEHOLDS
-- ============================================================

drop policy if exists "Ver a própria carteira"
on public.households;

create policy "Ver a própria carteira"
on public.households
for select
using (
  id in (
    select public.my_household_ids()
  )
);


drop policy if exists "Renomear a própria carteira"
on public.households;

create policy "Renomear a própria carteira"
on public.households
for update
using (
  id in (
    select public.my_household_ids()
  )
);


-- ============================================================
-- 15. MEMBROS
-- ============================================================

drop policy if exists "Ver os membros da carteira"
on public.household_members;

create policy "Ver os membros da carteira"
on public.household_members
for select
using (
  household_id in (
    select public.my_household_ids()
  )
);


drop policy if exists "Sair da carteira"
on public.household_members;

create policy "Sair da carteira"
on public.household_members
for delete
using (
  user_id = auth.uid()
);


-- ============================================================
-- 16. TRANSAÇÕES
-- ============================================================

drop policy if exists "Users can view their transactions"
on public.transactions;

drop policy if exists "Users can insert their transactions"
on public.transactions;

drop policy if exists "Users can update their transactions"
on public.transactions;

drop policy if exists "Users can delete their transactions"
on public.transactions;


drop policy if exists "Ver as transações da carteira"
on public.transactions;

create policy "Ver as transações da carteira"
on public.transactions
for select
using (
  household_id in (
    select public.my_household_ids()
  )
);


drop policy if exists "Inserir na carteira"
on public.transactions;

create policy "Inserir na carteira"
on public.transactions
for insert
with check (
  household_id in (
    select public.my_household_ids()
  )
  and user_id = auth.uid()
);


drop policy if exists "Editar na carteira"
on public.transactions;

create policy "Editar na carteira"
on public.transactions
for update
using (
  household_id in (
    select public.my_household_ids()
  )
);


drop policy if exists "Excluir na carteira"
on public.transactions;

create policy "Excluir na carteira"
on public.transactions
for delete
using (
  household_id in (
    select public.my_household_ids()
  )
);
