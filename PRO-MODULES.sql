-- Recursos Pro: estoque, financeiro, agendamentos, anexos e auditoria
-- Execute depois do setup.sql. É seguro executar mais de uma vez.
create table if not exists public.inventory_items (
 id uuid primary key default gen_random_uuid(), name text not null, quantity integer not null default 0 check(quantity>=0),
 unit_cost numeric(10,2) not null default 0 check(unit_cost>=0), minimum_quantity integer not null default 0 check(minimum_quantity>=0), supplier text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(), description text not null, amount numeric(10,2) not null check(amount>=0), category text, created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.appointments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, scheduled_for timestamptz not null, service_type text not null, notes text, status text not null default 'pending' check(status in ('pending','confirmed','completed','cancelled')), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id), action text not null, details text, created_at timestamptz not null default now()
);
create table if not exists public.client_attachments (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, file_name text not null, storage_path text not null, description text, created_at timestamptz not null default now()
);
create index if not exists inventory_items_name_idx on public.inventory_items(name);
create index if not exists appointments_user_id_idx on public.appointments(user_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

alter table public.inventory_items enable row level security;
alter table public.expenses enable row level security;
alter table public.appointments enable row level security;
alter table public.audit_logs enable row level security;
alter table public.client_attachments enable row level security;

drop policy if exists "Admins manage inventory" on public.inventory_items;
create policy "Admins manage inventory" on public.inventory_items for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Admins manage expenses" on public.expenses;
create policy "Admins manage expenses" on public.expenses for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Clients view own appointments" on public.appointments;
create policy "Clients view own appointments" on public.appointments for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "Clients create own appointments" on public.appointments;
create policy "Clients create own appointments" on public.appointments for insert to authenticated with check(user_id=auth.uid());
drop policy if exists "Admins manage appointments" on public.appointments;
create policy "Admins manage appointments" on public.appointments for update to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "Admins view audit logs" on public.audit_logs;
create policy "Admins view audit logs" on public.audit_logs for select to authenticated using(public.is_admin());
drop policy if exists "Users manage own attachments" on public.client_attachments;
create policy "Users manage own attachments" on public.client_attachments for select to authenticated using(user_id=auth.uid() or public.is_admin());
drop policy if exists "Users create own attachments" on public.client_attachments;
create policy "Users create own attachments" on public.client_attachments for insert to authenticated with check(user_id=auth.uid());

-- Bucket privado para anexos. Se já existir, o comando pode ser ignorado pelo painel.
insert into storage.buckets(id,name,public) values('client-attachments','client-attachments',false) on conflict(id) do nothing;
drop policy if exists "Authenticated upload client attachments" on storage.objects;
create policy "Authenticated upload client attachments" on storage.objects for insert to authenticated with check(bucket_id='client-attachments' and (name like (auth.uid()::text || '/%')));
drop policy if exists "Users read client attachments" on storage.objects;
create policy "Users read client attachments" on storage.objects for select to authenticated using(bucket_id='client-attachments' and (name like (auth.uid()::text || '/%') or public.is_admin()));
