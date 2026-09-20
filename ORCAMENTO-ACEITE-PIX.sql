-- Atualização: aceite/recusa do orçamento pelo cliente e sinal PIX
alter table public.budget_requests
  add column if not exists client_decision text,
  add column if not exists client_decision_at timestamptz,
  add column if not exists signal_value numeric(10,2),
  add column if not exists signal_paid_at timestamptz;

alter table public.budget_requests
  drop constraint if exists budget_requests_client_decision_check;
alter table public.budget_requests
  add constraint budget_requests_client_decision_check
  check (client_decision is null or client_decision in ('accepted','declined'));

drop policy if exists "Cliente atualiza decisão do orçamento" on public.budget_requests;
create policy "Cliente atualiza decisão do orçamento"
on public.budget_requests for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant update on public.budget_requests to authenticated;
notify pgrst, 'reload schema';
