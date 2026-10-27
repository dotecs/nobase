-- Purpose: Phase 2 runtime records, answer-safe latest items and evidence storage.
-- Application: not applied. Application date: pending human review.

begin;

create table public.learn_learners (
  user_id uuid primary key references auth.users(id),
  pack_id text not null references public.learn_packs(id),
  goal_id text not null references public.learn_goals(id),
  status text not null default 'diagnostic_pending' check (status in ('diagnostic_pending','diagnostic_in_progress','awaiting_coach','active','paused')),
  gate_decided_by uuid references auth.users(id),
  gate_decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.learn_learners enable row level security;
create policy learn_learners_select on public.learn_learners for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy learn_learners_admin on public.learn_learners for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger learn_learners_updated_at before update on public.learn_learners for each row execute function public.update_updated_at_column();

create table public.learn_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('diagnostic','practice','review','assessment')),
  plan jsonb not null,
  rule_version jsonb not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary jsonb,
  created_at timestamptz not null default now()
);
alter table public.learn_sessions enable row level security;
create policy learn_sessions_select on public.learn_sessions for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy learn_sessions_admin on public.learn_sessions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.learn_attempts (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.learn_sessions(id),
  user_id uuid not null references auth.users(id),
  item_id text not null,
  item_version integer not null,
  ability_id text not null references public.learn_abilities(id),
  usage text not null check (usage in ('diagnostic','practice','review','assessment')),
  answer_input jsonb not null,
  result text not null check (result in ('correct_independent','correct_assisted','incorrect','no_response','input_issue','pending_review')),
  auto_grade jsonb not null,
  hints_used integer not null default 0 check (hints_used >= 0),
  photo_path text,
  duration_ms integer check (duration_ms >= 0),
  rule_version jsonb not null,
  created_at timestamptz not null default now(),
  foreign key (item_id, item_version) references public.learn_items(id, version)
);
alter table public.learn_attempts enable row level security;
create policy learn_attempts_select on public.learn_attempts for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy learn_attempts_insert on public.learn_attempts for insert to authenticated with check (public.is_admin());

create table public.learn_ability_states (
  user_id uuid not null references auth.users(id),
  ability_id text not null references public.learn_abilities(id),
  state text not null check (state in ('unknown','needs_repair','learning','verified','retained','recheck')),
  evidence jsonb not null,
  rule_version jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, ability_id)
);
alter table public.learn_ability_states enable row level security;
create policy learn_ability_states_select on public.learn_ability_states for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy learn_ability_states_admin on public.learn_ability_states for all to authenticated using (public.is_admin()) with check (public.is_admin());
create trigger learn_ability_states_updated_at before update on public.learn_ability_states for each row execute function public.update_updated_at_column();

create table public.learn_ability_state_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  ability_id text not null references public.learn_abilities(id),
  from_state text not null check (from_state in ('unknown','needs_repair','learning','verified','retained','recheck')),
  to_state text not null check (to_state in ('unknown','needs_repair','learning','verified','retained','recheck')),
  reason text not null,
  attempt_id uuid references public.learn_attempts(id),
  rule_version jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.learn_ability_state_events enable row level security;
create policy learn_ability_state_events_select on public.learn_ability_state_events for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy learn_ability_state_events_insert on public.learn_ability_state_events for insert to authenticated with check (public.is_admin());

create table public.learn_review_schedule (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  ability_id text not null references public.learn_abilities(id),
  due_at timestamptz not null,
  interval_index integer not null check (interval_index >= 0),
  status text not null default 'due' check (status in ('due','done','skipped')),
  session_id uuid references public.learn_sessions(id),
  created_at timestamptz not null default now()
);
alter table public.learn_review_schedule enable row level security;
create policy learn_review_schedule_select on public.learn_review_schedule for select to authenticated using (public.is_admin() or user_id = auth.uid());
create policy learn_review_schedule_admin on public.learn_review_schedule for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.learn_coach_reviews (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references public.learn_attempts(id),
  coach_id uuid not null references auth.users(id),
  verdict text not null check (verdict in ('correct','incorrect','partial')),
  note text not null,
  created_at timestamptz not null default now()
);
alter table public.learn_coach_reviews enable row level security;
create policy learn_coach_reviews_select on public.learn_coach_reviews for select to authenticated using (public.is_admin() or exists (select 1 from public.learn_attempts a where a.id = attempt_id and a.user_id = auth.uid()));
create policy learn_coach_reviews_admin on public.learn_coach_reviews for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.learn_coach_decisions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id),
  kind text not null check (kind in ('diagnostic_gate','path_override','state_override')),
  payload jsonb not null,
  coach_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.learn_coach_decisions enable row level security;
create policy learn_coach_decisions_select on public.learn_coach_decisions for select to authenticated using (public.is_admin());
create policy learn_coach_decisions_insert on public.learn_coach_decisions for insert to authenticated with check (public.is_admin());

create index learn_sessions_user_idx on public.learn_sessions(user_id, started_at);
create index learn_attempts_session_idx on public.learn_attempts(session_id, created_at);
create index learn_attempts_user_ability_idx on public.learn_attempts(user_id, ability_id, created_at);
create index learn_review_schedule_due_idx on public.learn_review_schedule(user_id, status, due_at);
create index learn_ability_state_events_user_idx on public.learn_ability_state_events(user_id, ability_id, created_at);

create view public.learn_items_latest with (security_invoker = false) as
select distinct on (id) * from public.learn_items_public order by id, version desc;
revoke all on public.learn_items_latest from public, anon;
grant select on public.learn_items_latest to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
('learn-evidence', 'learn-evidence', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;
create policy learn_evidence_select on storage.objects for select to authenticated
using (bucket_id = 'learn-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy learn_evidence_insert on storage.objects for insert to authenticated
with check (bucket_id = 'learn-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy learn_evidence_update on storage.objects for update to authenticated
using (bucket_id = 'learn-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())) with check (bucket_id = 'learn-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy learn_evidence_delete on storage.objects for delete to authenticated
using (bucket_id = 'learn-evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

insert into public.learn_rule_configs (key, version, config) values
('gate', 1, '{"coach_gate_after_diagnostic":true}'::jsonb),
('session', 1, '{"items_per_session":8,"max_minutes":20,"max_hints_per_item":2,"new_ability_per_session":1,"max_review_items":2}'::jsonb),
('recommendation', 1, '{"order":"book","prefer_states":["needs_repair","recheck","unknown","learning"],"max_abilities_in_progress":2,"skip_duplicate_stems":true,"diagnostic_usage_order":["diagnostic","assessment","practice"],"practice_usage_order":["practice","assessment"],"review_usage_order":["review","practice"]}'::jsonb),
('evidence', 2, '{"independent_correct_needed":2,"distinct_variants":true,"unexposed_needed":1,"retained_after_days":3,"retained_reviews":3,"photo_required_usages":["diagnostic","assessment"],"photo_optional_usages":["practice","review"],"distinct_groups_needed":2,"coach_verdict_map":{"correct":"correct_independent","partial":"correct_assisted","incorrect":"incorrect"}}'::jsonb),
('solvers', 1, '{"default":"mathcheck","by_pack":{"root-math":"mathcheck"}}'::jsonb)
on conflict (key, version) do nothing;

commit;
-- ROLLBACK: stop runtime writes and retain all evidence; review a forward migration.
