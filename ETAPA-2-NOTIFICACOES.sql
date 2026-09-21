-- ETAPA 2: notificações internas para clientes
-- Execute depois da ETAPA 1 no SQL Editor do Supabase.

create extension if not exists pgcrypto;

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
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

drop policy if exists "Cliente vê suas notificações" on public.notifications;
drop policy if exists "Cliente marca notificações como lidas" on public.notifications;

create policy "Cliente vê suas notificações"
on public.notifications for select to authenticated
using (user_id = (select auth.uid()));

create policy "Cliente marca notificações como lidas"
on public.notifications for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant select, update on public.notifications to authenticated;

create or replace function public.create_client_notification(
    p_user_id uuid, p_title text, p_message text, p_type text default 'info'
) returns void
language plpgsql security definer set search_path = public
as $$
begin
    if p_user_id is not null then
        insert into public.notifications(user_id, title, message, type)
        values (p_user_id, p_title, p_message, coalesce(p_type, 'info'));
    end if;
end;
$$;

create or replace function public.notify_budget_request_update()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
    if tg_op = 'UPDATE' and (
        old.status is distinct from new.status or
        old.quoted_value is distinct from new.quoted_value or
        old.admin_response is distinct from new.admin_response
    ) then
        perform public.create_client_notification(
            new.user_id,
            'Atualização do seu orçamento',
            'Sua solicitação de orçamento foi atualizada. Acesse o painel para conferir os detalhes.',
            'info'
        );
    end if;
    return new;
end;
$$;

drop trigger if exists budget_request_notification_trigger on public.budget_requests;
create trigger budget_request_notification_trigger
after update on public.budget_requests
for each row execute function public.notify_budget_request_update();

create or replace function public.notify_service_update()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
    target_user uuid;
    status_changed boolean := false;
begin
    select coalesce(new.client_user_id, c.auth_user_id) into target_user
    from public.clients c where c.id = new.client_id;

    if target_user is null then
        target_user := new.client_user_id;
    end if;

    if tg_op = 'INSERT' then
        perform public.create_client_notification(
            target_user, 'Novo atendimento registrado',
            'Um novo serviço foi registrado para você. Consulte os detalhes no painel.', 'info'
        );
    elsif old.status is distinct from new.status then
        perform public.create_client_notification(
            target_user, 'Status do serviço atualizado',
            'O status do seu serviço foi alterado para: ' || coalesce(new.status, 'não informado') || '.', 'info'
        );
    end if;
    return new;
end;
$$;

drop trigger if exists service_notification_trigger on public.services;
create trigger service_notification_trigger
after insert or update on public.services
for each row execute function public.notify_service_update();

notify pgrst, 'reload schema';
