-- Execute este arquivo no SQL Editor do Supabase.
-- A função permite ao cliente aceitar ou recusar apenas um orçamento
-- pertencente a ele e que ainda esteja aguardando decisão.

alter table if exists public.budget_requests
  add column if not exists client_decision text,
  add column if not exists client_decision_at timestamptz;

alter table if exists public.budget_requests
  drop constraint if exists budget_requests_client_decision_check;

alter table if exists public.budget_requests
  add constraint budget_requests_client_decision_check
  check (client_decision is null or client_decision in ('accepted', 'declined'));

create or replace function public.decide_budget_request(
  p_request_id uuid,
  p_decision text
)
returns public.budget_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_request public.budget_requests;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  if p_decision not in ('accepted', 'declined') then
    raise exception 'Decisão inválida';
  end if;

  update public.budget_requests
     set client_decision = p_decision,
         client_decision_at = now(),
         status = case when p_decision = 'accepted' then 'approved' else 'rejected' end
   where id = p_request_id
     and user_id = auth.uid()
     and status = 'quoted'
     and client_decision is null
   returning * into updated_request;

  if not found then
    raise exception 'Orçamento inexistente, não pertence ao usuário ou já foi respondido';
  end if;

  return updated_request;
end;
$$;

grant execute on function public.decide_budget_request(uuid, text) to authenticated;
