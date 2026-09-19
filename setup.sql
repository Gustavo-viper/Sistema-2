
-- =========================================================
-- GUSTAVO & EMILY - ASSISTÊNCIA TÉCNICA
-- SETUP.SQL - ESTRUTURA E SEGURANÇA DO SUPABASE
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1. TABELA DE CLIENTES
-- =========================================================

create table if not exists public.clients (
    id uuid primary key default gen_random_uuid(),

    name text not null,
    phone text not null unique,
    email text,
    address text,

    vip boolean not null default false,

    auth_user_id uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists clients_auth_user_id_idx
    on public.clients(auth_user_id);

create index if not exists clients_phone_idx
    on public.clients(phone);

-- =========================================================
-- 2. TABELA DE SERVIÇOS
-- =========================================================

create table if not exists public.services (
    id uuid primary key default gen_random_uuid(),

    client_id uuid not null
        references public.clients(id)
        on delete cascade,

    client_user_id uuid
        references auth.users(id)
        on delete set null,

    device_type text not null,
    device_model text,
    problem_type text not null,
    observations text,

    total_value numeric(10, 2) not null default 0
        check (total_value >= 0),

    signal_value numeric(10, 2) not null default 0
        check (signal_value >= 0),

    remaining_value numeric(10, 2) not null default 0
        check (remaining_value >= 0),

    signal_link text,
    remaining_link text,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'processing',
                'ready',
                'completed',
                'cancelled'
            )
        ),

    signal_paid_at timestamptz,
    remaining_paid_at timestamptz,
    completed_at timestamptz,

    rating integer
        check (rating between 1 and 5),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists services_client_id_idx
    on public.services(client_id);

create index if not exists services_client_user_id_idx
    on public.services(client_user_id);

create index if not exists services_status_idx
    on public.services(status);

-- =========================================================
-- 3. TABELA DE PERFIS
-- =========================================================

create table if not exists public.profiles (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    name text,
    phone text,
    address text,

    vip boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- =========================================================
-- 4. FUNÇÃO PARA ATUALIZAR updated_at
-- =========================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists update_clients_updated_at
    on public.clients;

create trigger update_clients_updated_at
before update on public.clients
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_services_updated_at
    on public.services;

create trigger update_services_updated_at
before update on public.services
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_profiles_updated_at
    on public.profiles;

create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();

-- =========================================================
-- 5. CRIAÇÃO AUTOMÁTICA DO PERFIL APÓS O CADASTRO
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (
        id,
        name,
        phone
    )
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data ->> 'name',
            split_part(coalesce(new.email, ''), '@', 1)
        ),
        nullif(new.raw_user_meta_data ->> 'phone', '')
    )
    on conflict (id) do update
    set
        name = excluded.name,
        phone = coalesce(
            excluded.phone,
            public.profiles.phone
        );

    return new;
end;
$$;

drop trigger if exists on_auth_user_created
    on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- =========================================================
-- 6. FUNÇÃO DE VERIFICAÇÃO DE ADMINISTRADOR
-- =========================================================
-- Substitua os e-mails abaixo pelos administradores reais.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select lower(coalesce(auth.jwt() ->> 'email', '')) in (
        'cainaoliveiraguga@gmail.com',
        'equintanilha56@gmail.com'
    );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select public.is_admin();
$$;

revoke execute on function public.is_admin()
    from public, anon;

grant execute on function public.is_admin()
    to authenticated;

revoke execute on function public.current_user_is_admin()
    from public, anon;

grant execute on function public.current_user_is_admin()
    to authenticated;

-- =========================================================
-- 7. HABILITAR RLS
-- =========================================================

alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.profiles enable row level security;

-- =========================================================
-- 8. REMOVER POLÍTICAS ANTIGAS
-- =========================================================

-- CLIENTS
drop policy if exists "Ver clientes" on public.clients;
drop policy if exists "Admin cadastra cliente" on public.clients;
drop policy if exists "Admin edita clientes" on public.clients;
drop policy if exists "Admin exclui clientes" on public.clients;
drop policy if exists "Clientes podem ver seus dados" on public.clients;

-- SERVICES
drop policy if exists "Ver servicos" on public.services;
drop policy if exists "Admin cria servicos" on public.services;
drop policy if exists "Atualizar servicos" on public.services;
drop policy if exists "Admin exclui servicos" on public.services;
drop policy if exists "Clientes podem avaliar servicos" on public.services;

-- PROFILES
drop policy if exists "Ver o proprio perfil" on public.profiles;
drop policy if exists "Criar o proprio perfil" on public.profiles;
drop policy if exists "Editar o proprio perfil" on public.profiles;

-- =========================================================
-- 9. POLÍTICAS DA TABELA PROFILES
-- =========================================================

create policy "Usuário visualiza o próprio perfil"
on public.profiles
for select
to authenticated
using (
    id = (select auth.uid())
    or (select public.is_admin())
);

create policy "Usuário cria o próprio perfil"
on public.profiles
for insert
to authenticated
with check (
    id = (select auth.uid())
);

create policy "Usuário edita o próprio perfil"
on public.profiles
for update
to authenticated
using (
    id = (select auth.uid())
)
with check (
    id = (select auth.uid())
);

-- =========================================================
-- 10. POLÍTICAS DA TABELA CLIENTS
-- =========================================================

-- Administradores visualizam todos os clientes.
-- Clientes visualizam apenas o próprio cadastro.

create policy "Visualizar clientes autorizados"
on public.clients
for select
to authenticated
using (
    (select public.is_admin())
    or auth_user_id = (select auth.uid())
);

-- Somente administradores podem cadastrar clientes.

create policy "Administrador cadastra clientes"
on public.clients
for insert
to authenticated
with check (
    (select public.is_admin())
);

-- Somente administradores podem editar clientes.
-- O cliente não pode alterar seu vínculo ou seus dados pelo frontend.

create policy "Administrador edita clientes"
on public.clients
for update
to authenticated
using (
    (select public.is_admin())
)
with check (
    (select public.is_admin())
);

-- Somente administradores podem excluir clientes.

create policy "Administrador exclui clientes"
on public.clients
for delete
to authenticated
using (
    (select public.is_admin())
);

-- =========================================================
-- 11. POLÍTICAS DA TABELA SERVICES
-- =========================================================

-- Administradores visualizam todos os serviços.
-- Clientes visualizam somente seus próprios serviços.

create policy "Visualizar serviços autorizados"
on public.services
for select
to authenticated
using (
    (select public.is_admin())
    or client_user_id = (select auth.uid())
    or exists (
        select 1
        from public.clients as c
        where c.id = services.client_id
          and c.auth_user_id = (select auth.uid())
    )
);

-- Somente administradores podem criar serviços/orçamentos.

create policy "Administrador cria serviços"
on public.services
for insert
to authenticated
with check (
    (select public.is_admin())
);

-- Somente administradores podem alterar serviços.
-- Isso impede que o cliente altere status, valores ou pagamentos.

create policy "Administrador atualiza serviços"
on public.services
for update
to authenticated
using (
    (select public.is_admin())
)
with check (
    (select public.is_admin())
);

-- Somente administradores podem excluir serviços.

create policy "Administrador exclui serviços"
on public.services
for delete
to authenticated
using (
    (select public.is_admin())
);

-- =========================================================
-- 12. PERMISSÕES DAS TABELAS
-- =========================================================

revoke all on table public.clients
    from anon;

revoke all on table public.services
    from anon;

revoke all on table public.profiles
    from anon;

grant select, insert, update, delete
    on table public.clients
    to authenticated;

grant select, insert, update, delete
    on table public.services
    to authenticated;

grant select, insert, update
    on table public.profiles
    to authenticated;

-- =========================================================
-- 13. PROTEÇÃO BÁSICA DOS VALORES
-- =========================================================
-- Garante que o valor restante corresponda ao total menos o sinal.

create or replace function public.validate_service_values()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.total_value < 0
       or new.signal_value < 0
       or new.remaining_value < 0 then
        raise exception 'Os valores do serviço não podem ser negativos';
    end if;

    if round(new.signal_value + new.remaining_value, 2)
       <> round(new.total_value, 2) then
        raise exception
            'O sinal e o restante devem corresponder ao valor total';
    end if;

    return new;
end;
$$;

drop trigger if exists validate_service_values_trigger
    on public.services;

create trigger validate_service_values_trigger
before insert or update on public.services
for each row
execute function public.validate_service_values();

-- =========================================================
-- FIM DO SCRIPT
-- =========================================================
