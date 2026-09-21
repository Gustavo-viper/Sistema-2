-- ============================================================
-- GUSTAVO & EMILY - PACOTE COMPLETO DAS 5 ETAPAS
-- Execute no Supabase SQL Editor após as etapas anteriores.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) Solicitações de orçamento
create table if not exists public.budget_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_type text not null,
  device_model text,
  problem_type text not null,
  observations text,
  status text not null default 'pending',
  quoted_value numeric(10,2),
  admin_response text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table if exists public.budget_requests
  add column if not exists quoted_value numeric(10,2),
  add column if not exists admin_response text,
  add column if not exists responded_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- 2) Notificações
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
drop policy if exists "Cliente vê suas notificações" on public.notifications;
drop policy if exists "Cliente marca notificações como lidas" on public.notifications;
drop policy if exists "Administrador gerencia notificações" on public.notifications;
create policy "Cliente vê suas notificações" on public.notifications for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Cliente marca notificações como lidas" on public.notifications for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Administrador gerencia notificações" on public.notifications for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
grant select, update, insert on public.notifications to authenticated;

create or replace function public.create_client_notification(
  p_user_id uuid, p_title text, p_message text, p_type text default 'info'
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is not null then
    insert into public.notifications(user_id, title, message, type)
    values (p_user_id, coalesce(p_title,'Notificação'), coalesce(p_message,''), coalesce(p_type,'info'));
  end if;
end;
$$;

-- 3) Chat interno cliente/admin
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_type text not null check (sender_type in ('client','admin')),
  message text not null check (length(trim(message)) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
create index if not exists chat_messages_user_created_idx on public.chat_messages(user_id, created_at);
drop policy if exists "Chat: cliente vê suas mensagens" on public.chat_messages;
drop policy if exists "Chat: cliente envia mensagens" on public.chat_messages;
drop policy if exists "Chat: administrador gerencia mensagens" on public.chat_messages;
create policy "Chat: cliente vê suas mensagens" on public.chat_messages for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Chat: cliente envia mensagens" on public.chat_messages for insert to authenticated
with check (user_id = (select auth.uid()) and sender_id = (select auth.uid()) and sender_type = 'client');
create policy "Chat: administrador gerencia mensagens" on public.chat_messages for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
grant select, insert, update on public.chat_messages to authenticated;

-- 4) Fotos e documentos enviados pelos clientes
create table if not exists public.client_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_request_id uuid references public.budget_requests(id) on delete cascade,
  service_id uuid references public.services(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  file_size bigint,
  created_at timestamptz not null default now(),
  constraint attachment_parent_check check (budget_request_id is not null or service_id is not null)
);

alter table public.client_attachments enable row level security;
create index if not exists client_attachments_user_idx on public.client_attachments(user_id);
drop policy if exists "Anexos: cliente vê os seus" on public.client_attachments;
drop policy if exists "Anexos: cliente cadastra os seus" on public.client_attachments;
drop policy if exists "Anexos: administrador gerencia" on public.client_attachments;
create policy "Anexos: cliente vê os seus" on public.client_attachments for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Anexos: cliente cadastra os seus" on public.client_attachments for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Anexos: administrador gerencia" on public.client_attachments for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
grant select, insert on public.client_attachments to authenticated;

insert into storage.buckets (id, name, public)
values ('client-attachments', 'client-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Storage: cliente envia anexos" on storage.objects;
drop policy if exists "Storage: cliente lê anexos" on storage.objects;
drop policy if exists "Storage: administrador acessa anexos" on storage.objects;
create policy "Storage: cliente envia anexos" on storage.objects for insert to authenticated
with check (bucket_id = 'client-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Storage: cliente lê anexos" on storage.objects for select to authenticated
using (bucket_id = 'client-attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Storage: administrador acessa anexos" on storage.objects for select to authenticated
using (bucket_id = 'client-attachments' and (select public.is_admin()));

-- 5) Avaliações dos serviços
create table if not exists public.service_ratings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references public.services(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_ratings enable row level security;
drop policy if exists "Avaliações: cliente vê as suas" on public.service_ratings;
drop policy if exists "Avaliações: cliente cria" on public.service_ratings;
drop policy if exists "Avaliações: cliente atualiza" on public.service_ratings;
drop policy if exists "Avaliações: administrador vê" on public.service_ratings;
create policy "Avaliações: cliente vê as suas" on public.service_ratings for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Avaliações: cliente cria" on public.service_ratings for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Avaliações: cliente atualiza" on public.service_ratings for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Avaliações: administrador vê" on public.service_ratings for select to authenticated
using ((select public.is_admin()));
grant select, insert, update on public.service_ratings to authenticated;

-- Notificação automática de atualização de orçamento
create or replace function public.notify_budget_request_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status
     or old.quoted_value is distinct from new.quoted_value
     or old.admin_response is distinct from new.admin_response then
    perform public.create_client_notification(
      new.user_id,
      'Atualização do seu orçamento',
      'Sua solicitação de orçamento foi atualizada. Confira os detalhes no painel.',
      'info'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists budget_request_notification_trigger on public.budget_requests;
create trigger budget_request_notification_trigger after update on public.budget_requests
for each row execute function public.notify_budget_request_update();

-- Notificação de novas mensagens do administrador
create or replace function public.notify_chat_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.sender_type = 'admin' then
    perform public.create_client_notification(new.user_id, 'Nova mensagem da assistência', 'Você recebeu uma nova mensagem no chat.', 'info');
  end if;
  return new;
end;
$$;

drop trigger if exists chat_message_notification_trigger on public.chat_messages;
create trigger chat_message_notification_trigger after insert on public.chat_messages
for each row execute function public.notify_chat_message();

notify pgrst, 'reload schema';
