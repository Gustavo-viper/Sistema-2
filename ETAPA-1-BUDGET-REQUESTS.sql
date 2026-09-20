-- ETAPA 1: solicitações de orçamento do cliente
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.budget_requests (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    device_type text not null,
    device_model text,
    problem_type text not null,
    observations text,
    status text not null default 'pending',
    quoted_value numeric(10, 2),
    admin_response text,
    responded_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.budget_requests enable row level security;

create index if not exists budget_requests_user_id_idx
    on public.budget_requests(user_id);

create index if not exists budget_requests_status_idx
    on public.budget_requests(status);

create or replace function public.update_budget_request_timestamp()
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

drop trigger if exists budget_requests_updated_at_trigger
    on public.budget_requests;

create trigger budget_requests_updated_at_trigger
before update on public.budget_requests
for each row
execute function public.update_budget_request_timestamp();

drop policy if exists "Cliente vê suas solicitações" on public.budget_requests;
drop policy if exists "Cliente cria sua solicitação" on public.budget_requests;
drop policy if exists "Administrador vê solicitações" on public.budget_requests;
drop policy if exists "Administrador atualiza solicitações" on public.budget_requests;

create policy "Cliente vê suas solicitações"
on public.budget_requests
for select to authenticated
using (
    user_id = (select auth.uid())
    or (select public.is_admin())
);

create policy "Cliente cria sua solicitação"
on public.budget_requests
for insert to authenticated
with check (user_id = (select auth.uid()));

create policy "Administrador vê solicitações"
on public.budget_requests
for select to authenticated
using ((select public.is_admin()));

create policy "Administrador atualiza solicitações"
on public.budget_requests
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

grant select, insert, update on public.budget_requests to authenticated;

notify pgrst, 'reload schema';
