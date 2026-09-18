-- =========================================================
-- SISTEMA GUSTAVO & EMILY - SQL COMPLETO
-- Cole este arquivo inteiro no: SQL Editor do Supabase
-- (https://supabase.com/dashboard → seu projeto → SQL Editor → New query → Run)
-- =========================================================

-- ============ 1. TABELA PROFILES ============
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  phone text,
  address text,
  vip boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- ============ 2. TABELA SERVICES ============
create table if not exists public.services (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references auth.users on delete cascade not null,
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
create index if not exists services_status_idx on public.services (status);

-- ============ 3. FUNÇÃO updated_at ============
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_services_updated_at on public.services;
create trigger update_services_updated_at
  before update on public.services
  for each row execute function public.update_updated_at_column();

-- ============ 4. CRIAR PERFIL AUTOMATICAMENTE NO CADASTRO ============
-- (usa os dados enviados em user_metadata: name, phone)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ 5. SINALIZAR ADMIN ============
-- Administradores do sistema (verificados por e-mail)
create or replace function public.is_admin()
returns boolean as $$
  select lower(auth.jwt() ->> 'email') in (
    'cainaoliveiraguga@gmail.com',
    'equintanilha56@gmail.com'
  );
$$ language sql stable security definer set search_path = public;

-- ============ 6. RLS (SEGURANÇA) ============
alter table public.profiles enable row level security;
alter table public.services enable row level security;

-- Perfil: cada usuário vê e edita apenas o próprio
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

-- Serviços: cliente vê os dele; admin vê tudo e gerencia
drop policy if exists "Cliente ve os proprios servicos" on public.services;
create policy "Cliente ve os proprios servicos"
  on public.services for select
  using (auth.uid() = client_id or is_admin());

drop policy if exists "Admin cria servicos" on public.services;
create policy "Admin cria servicos"
  on public.services for insert
  with check (is_admin());

drop policy if exists "Admin atualiza servicos" on public.services;
create policy "Admin atualiza servicos"
  on public.services for update
  using (auth.uid() = client_id or is_admin());

drop policy if exists "Cliente paga sinal e avalia" on public.services;
create policy "Cliente paga sinal e avalia"
  on public.services for update
  using (auth.uid() = client_id);

drop policy if exists "Admin cancela servicos" on public.services;
create policy "Admin cancela servicos"
  on public.services for delete
  using (is_admin());

-- =========================================================
-- FIM - Após rodar, cadastre um cliente pelo site (login.html)
-- e o perfil será criado automaticamente!
-- =========================================================