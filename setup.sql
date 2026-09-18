-- =========================================================
-- SISTEMA GUSTAVO & EMILY - SQL v2 (INTEGRAÇÃO COMPLETA)
-- Cole no SQL Editor do Supabase e clique em Run.
-- Pode rodar novamente a qualquer momento (é idempotente).
-- =========================================================

-- ============ 1. TABELA CLIENTS (clientes da loja) ============
-- Cadastrados pelo admin; clientes com conta ficam vinculados
-- por auth_user_id e por phone.
create table if not exists public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  phone text not null unique,
  email text,
  address text,
  vip boolean default false,
  auth_user_id uuid references auth.users on delete set null,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- ============ 2. TABELA SERVICES ============
create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.clients on delete cascade not null,
  client_user_id uuid references auth.users on delete set null,
  device_type text not null,
  device_model text,
  problem_type text not null,
  observations text,
  total_value numeric(10,2) default 0,
  signal_value numeric(10,2) default 0,
  remaining_value numeric(10,2) default 0,
  signal_link text,
  remaining_link text,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','completed','cancelled')),
  signal_paid_at timestamptz,
  remaining_paid_at timestamptz,
  completed_at timestamptz,
  rating integer check (rating between 1 and 5),
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists services_client_id_idx on public.services (client_id);
create index if not exists services_client_user_idx on public.services (client_user_id);
create index if not exists services_status_idx on public.services (status);

-- ============ 3. TABELA PROFILES (contas) ============
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  phone text,
  address text,
  vip boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- ============ 4. TRIGGER updated_at ============
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists update_clients_updated_at on public.clients;
create trigger update_clients_updated_at
  before update on public.clients
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_services_updated_at on public.services;
create trigger update_services_updated_at
  before update on public.services
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- ============ 5. NOVO USUARIO: cria profile + vincula client ============
-- Trigger simples: cria o profile. O vinculo com clients e feito por
-- auth_user_id (admin cadastra com o e-mail) ou pelo telefone.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $func$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update
    set name = excluded.name,
        phone = coalesce(excluded.phone, public.profiles.phone);
  return new;
end;
$func$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ 6. ADMIN ============
-- Administradores do sistema (verificados por e-mail)
create or replace function public.is_admin()
returns boolean as $$
  select lower(auth.jwt() ->> 'email') in (
    'cainaoliveiraguga@gmail.com',
    'equintanilha56@gmail.com'
  );
$$ language sql stable security definer set search_path = public;

-- RPC para o front-end saber se o usuário logado é admin
create or replace function public.current_user_is_admin()
returns boolean as $$
  select public.is_admin();
$$ language sql stable security definer set search_path = public;

-- ============ 7. RLS (SEGURANÇA) ============
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.profiles enable row level security;

-- --- profiles: cada conta vê/edita apenas o próprio ---
drop policy if exists "Ver o proprio perfil" on public.profiles;
create policy "Ver o proprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Criar o proprio perfil" on public.profiles;
create policy "Criar o proprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Editar o proprio perfil" on public.profiles;
create policy "Editar o proprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- --- clients: admin gerencia todos; cliente vê/edita o próprio ---
drop policy if exists "Ver clientes" on public.clients;
create policy "Ver clientes"
  on public.clients for select
  using (is_admin() or auth_user_id = auth.uid());

drop policy if exists "Admin cadastra cliente" on public.clients;
create policy "Admin cadastra cliente"
  on public.clients for insert
  with check (is_admin());

drop policy if exists "Admin edita clientes" on public.clients;
create policy "Admin edita clientes"
  on public.clients for update
  using (is_admin() or auth_user_id = auth.uid());

drop policy if exists "Admin exclui clientes" on public.clients;
create policy "Admin exclui clientes"
  on public.clients for delete
  using (is_admin());

-- --- services: cliente ve os seus; admin ve/gerencia tudo ---
-- (Cliente e vinculado por client_user_id OU pelo clients.auth_user_id)
drop policy if exists "Ver servicos" on public.services;
create policy "Ver servicos"
  on public.services for select
  using (
    is_admin()
    or client_user_id = auth.uid()
    or exists (
      select 1 from public.clients c
      where c.id = client_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Admin cria servicos" on public.services;
create policy "Admin cria servicos"
  on public.services for insert
  with check (is_admin());

drop policy if exists "Atualizar servicos" on public.services;
create policy "Atualizar servicos"
  on public.services for update
  using (
    is_admin()
    or client_user_id = auth.uid()
    or exists (
      select 1 from public.clients c
      where c.id = client_id and c.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Admin exclui servicos" on public.services;
create policy "Admin exclui servicos"
  on public.services for delete
  using (is_admin());

-- =========================================================
-- FIM - Execute "Run" no SQL Editor.
-- Depois: cadastre clientes no painel admin e crie orçamentos.
-- =========================================================
