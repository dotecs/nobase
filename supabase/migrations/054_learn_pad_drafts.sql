-- Purpose: learner-owned input pad drafts. Owner update explicitly approved for this table.
-- Application: 미적용, Claude 적용. 작성일 2026-10-28.
create table public.learn_pad_drafts (
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.learn_sessions(id) on delete cascade,
  plan_index integer not null,
  draft jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id, plan_index)
);
alter table public.learn_pad_drafts enable row level security;
create policy learn_pad_drafts_owner_select on public.learn_pad_drafts for select to authenticated
  using (user_id = auth.uid());
create policy learn_pad_drafts_owner_insert on public.learn_pad_drafts for insert to authenticated
  with check (user_id = auth.uid());
create policy learn_pad_drafts_owner_update on public.learn_pad_drafts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- ROLLBACK: retain drafts and use a forward correction if needed.
