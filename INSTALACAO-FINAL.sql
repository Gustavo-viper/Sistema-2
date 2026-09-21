-- GUSTAVO & EMILY — INSTALAÇÃO FINAL
-- Execute este arquivo no Supabase SQL Editor.
-- Ele é idempotente para as estruturas desta versão.

-- Execute primeiro o arquivo ETAPA-COMPLETA.sql.
-- Em seguida, execute este complemento para garantir colunas, índices e permissões.

create extension if not exists pgcrypto;

alter table if exists public.budget_requests
  add column if not exists status text not null default 'pending',
  add column if not exists quoted_value numeric(10,2),
  add column if not exists admin_response text,
  add column if not exists responded_at timestamptz,
  add column if not exists updated_at timestamptz default now();

alter table if exists public.notifications
  add column if not exists type text not null default 'info',
  add column if not exists read_at timestamptz,
  add column if not exists created_at timestamptz default now();

alter table if exists public.chat_messages
  add column if not exists read_at timestamptz;

alter table if exists public.client_attachments
  add column if not exists service_id uuid references public.services(id) on delete cascade,
  add column if not exists budget_request_id uuid references public.budget_requests(id) on delete cascade,
  add column if not exists mime_type text,
  add column if not exists file_size bigint;

alter table if exists public.service_ratings
  add column if not exists comment text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists service_ratings_service_id_unique
  on public.service_ratings(service_id);

create index if not exists budget_requests_user_created_idx
  on public.budget_requests(user_id, created_at desc);

create index if not exists client_attachments_user_created_idx
  on public.client_attachments(user_id, created_at desc);

create index if not exists service_ratings_user_idx
  on public.service_ratings(user_id);

-- Recarrega o cache do PostgREST.
notify pgrst, 'reload schema';

-- IMPORTANTE:
-- 1) No Storage, confirme que existe o bucket privado client-attachments.
-- 2) A chave PIX é configurada no client.js.
-- 3) Não desative o RLS em produção.
