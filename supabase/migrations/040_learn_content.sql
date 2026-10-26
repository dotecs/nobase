-- Purpose: learn content packs, policies and answer-safe view.
-- Application: not applied; application date: pending human review.

begin;

create table public.learn_packs (
  id text primary key,
  title text not null,
  version integer not null,
  status text not null default 'draft' check (status in ('draft','reviewed','live')),
  source_book text,
  map_version text,
  checksum text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learn_units (
  id text primary key,
  pack_id text not null references learn_packs(id),
  "order" integer not null,
  title text not null,
  slide_pages text,
  tier text not null check (tier in ('mvp1','next')),
  unique(pack_id,"order")
);

create table public.learn_abilities (
  id text primary key,
  pack_id text not null references learn_packs(id),
  unit_id text not null references learn_units(id),
  order_in_unit integer not null,
  name text not null,
  action text not null,
  kind text not null check (kind in ('concept','procedure','representation')),
  slide_pages text,
  is_supplement boolean not null default false,
  request_ability text,
  source_node_id text,
  status text not null default 'draft',
  unique(unit_id,order_in_unit)
);

create table public.learn_ability_edges (
  id uuid primary key default uuid_generate_v4(),
  pack_id text not null references learn_packs(id),
  source_id text not null references learn_abilities(id),
  target_id text not null references learn_abilities(id),
  type text not null check (type in ('prerequisite','support')),
  origin text not null check (origin in ('book_order','map_v02','coach')),
  status text not null default 'hypothesis',
  reason text,
  unique(source_id,target_id,type,origin)
);

create table public.learn_goals (
  id text primary key,
  pack_id text not null references learn_packs(id),
  title text not null,
  track text,
  year integer,
  evidence text
);

create table public.learn_goal_requirements (
  goal_id text not null references learn_goals(id),
  ability_id text not null references learn_abilities(id),
  required_level text not null check (required_level in ('verified','retained')),
  format_notes text,
  primary key(goal_id,ability_id)
);

create table public.learn_materials (
  id uuid primary key default uuid_generate_v4(),
  ability_id text not null references learn_abilities(id),
  type text not null check (type in ('slide','text','image','video','lesson')),
  slide_pages text,
  body_md text,
  storage_path text,
  lesson_id uuid references lessons(id) on delete set null,
  role text not null check (role in ('explain','example','visual')),
  status text not null default 'draft',
  version integer not null default 1
);

create table public.learn_items (
  id text not null,
  version integer not null,
  ability_id text not null references learn_abilities(id),
  usage text not null check (usage in ('diagnostic','practice','assessment','review')),
  variant_group text,
  stem_md text not null,
  answer_type text not null check (answer_type in ('number','fraction','expression','choice','photo','text')),
  answer_spec jsonb not null,
  hints jsonb not null default '[]',
  rubric jsonb not null default '[]',
  required_abilities text[] not null default '{}',
  misconception_ids text[] not null default '{}',
  status text not null default 'draft',
  exposure text not null default 'assessment_only',
  source_draft_id uuid,
  created_at timestamptz not null default now(),
  primary key(id,version)
);

create table public.learn_misconceptions (
  id text primary key,
  ability_id text not null references learn_abilities(id),
  pattern text not null,
  suggests text[] not null default '{}',
  coach_note text
);

create table public.learn_diagnostic_scripts (
  id uuid primary key default uuid_generate_v4(),
  goal_id text not null references learn_goals(id),
  version integer not null,
  base_abilities text[] not null default '{}',
  followup_rule text,
  base_items text[] not null default '{}',
  followups jsonb not null default '[]',
  unique(goal_id,version)
);

create table public.learn_rule_configs (
  id uuid primary key default uuid_generate_v4(),
  key text not null,
  version integer not null,
  config jsonb not null,
  active_from timestamptz not null default now(),
  note text,
  unique(key,version)
);

alter table public.learn_packs enable row level security;
create policy learn_packs_select on public.learn_packs for select to authenticated using (public.is_admin() or (status = 'live'));
create policy learn_packs_insert on public.learn_packs for insert to authenticated with check (public.is_admin());
create policy learn_packs_update on public.learn_packs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_packs_delete on public.learn_packs for delete to authenticated using (public.is_admin());

alter table public.learn_units enable row level security;
create policy learn_units_select on public.learn_units for select to authenticated using (public.is_admin() or (exists (select 1 from public.learn_packs p where p.id = learn_units.pack_id and p.status = 'live')));
create policy learn_units_insert on public.learn_units for insert to authenticated with check (public.is_admin());
create policy learn_units_update on public.learn_units for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_units_delete on public.learn_units for delete to authenticated using (public.is_admin());

alter table public.learn_abilities enable row level security;
create policy learn_abilities_select on public.learn_abilities for select to authenticated using (public.is_admin() or (exists (select 1 from public.learn_packs p where p.id = learn_abilities.pack_id and p.status = 'live')));
create policy learn_abilities_insert on public.learn_abilities for insert to authenticated with check (public.is_admin());
create policy learn_abilities_update on public.learn_abilities for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_abilities_delete on public.learn_abilities for delete to authenticated using (public.is_admin());

alter table public.learn_ability_edges enable row level security;
create policy learn_ability_edges_select on public.learn_ability_edges for select to authenticated using (public.is_admin() or (exists (select 1 from public.learn_packs p where p.id = learn_ability_edges.pack_id and p.status = 'live')));
create policy learn_ability_edges_insert on public.learn_ability_edges for insert to authenticated with check (public.is_admin());
create policy learn_ability_edges_update on public.learn_ability_edges for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_ability_edges_delete on public.learn_ability_edges for delete to authenticated using (public.is_admin());

alter table public.learn_goals enable row level security;
create policy learn_goals_select on public.learn_goals for select to authenticated using (public.is_admin() or (exists (select 1 from public.learn_packs p where p.id = learn_goals.pack_id and p.status = 'live')));
create policy learn_goals_insert on public.learn_goals for insert to authenticated with check (public.is_admin());
create policy learn_goals_update on public.learn_goals for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_goals_delete on public.learn_goals for delete to authenticated using (public.is_admin());

alter table public.learn_goal_requirements enable row level security;
create policy learn_goal_requirements_select on public.learn_goal_requirements for select to authenticated using (public.is_admin() or (exists (select 1 from public.learn_abilities a join public.learn_packs p on p.id = a.pack_id where a.id = learn_goal_requirements.ability_id and p.status = 'live') and exists (select 1 from public.learn_goals g join public.learn_packs p on p.id = g.pack_id where g.id = learn_goal_requirements.goal_id and p.status = 'live')));
create policy learn_goal_requirements_insert on public.learn_goal_requirements for insert to authenticated with check (public.is_admin());
create policy learn_goal_requirements_update on public.learn_goal_requirements for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_goal_requirements_delete on public.learn_goal_requirements for delete to authenticated using (public.is_admin());

alter table public.learn_materials enable row level security;
create policy learn_materials_select on public.learn_materials for select to authenticated using (public.is_admin() or (exists (select 1 from public.learn_abilities a join public.learn_packs p on p.id = a.pack_id where a.id = learn_materials.ability_id and p.status = 'live')));
create policy learn_materials_insert on public.learn_materials for insert to authenticated with check (public.is_admin());
create policy learn_materials_update on public.learn_materials for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_materials_delete on public.learn_materials for delete to authenticated using (public.is_admin());

alter table public.learn_items enable row level security;
create policy learn_items_select on public.learn_items for select to authenticated using (public.is_admin());
create policy learn_items_insert on public.learn_items for insert to authenticated with check (public.is_admin());
create policy learn_items_update on public.learn_items for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_items_delete on public.learn_items for delete to authenticated using (public.is_admin());

alter table public.learn_misconceptions enable row level security;
create policy learn_misconceptions_select on public.learn_misconceptions for select to authenticated using (public.is_admin() or (exists (select 1 from public.learn_abilities a join public.learn_packs p on p.id = a.pack_id where a.id = learn_misconceptions.ability_id and p.status = 'live')));
create policy learn_misconceptions_insert on public.learn_misconceptions for insert to authenticated with check (public.is_admin());
create policy learn_misconceptions_update on public.learn_misconceptions for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_misconceptions_delete on public.learn_misconceptions for delete to authenticated using (public.is_admin());

alter table public.learn_diagnostic_scripts enable row level security;
create policy learn_diagnostic_scripts_select on public.learn_diagnostic_scripts for select to authenticated using (public.is_admin() or (exists (select 1 from public.learn_goals g join public.learn_packs p on p.id = g.pack_id where g.id = learn_diagnostic_scripts.goal_id and p.status = 'live')));
create policy learn_diagnostic_scripts_insert on public.learn_diagnostic_scripts for insert to authenticated with check (public.is_admin());
create policy learn_diagnostic_scripts_update on public.learn_diagnostic_scripts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_diagnostic_scripts_delete on public.learn_diagnostic_scripts for delete to authenticated using (public.is_admin());

alter table public.learn_rule_configs enable row level security;
create policy learn_rule_configs_select on public.learn_rule_configs for select to authenticated using (public.is_admin());
create policy learn_rule_configs_insert on public.learn_rule_configs for insert to authenticated with check (public.is_admin());
create policy learn_rule_configs_update on public.learn_rule_configs for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy learn_rule_configs_delete on public.learn_rule_configs for delete to authenticated using (public.is_admin());

create trigger learn_packs_updated_at before update on public.learn_packs
for each row execute function public.update_updated_at_column();

create view public.learn_items_public with (security_invoker = false) as
select i.id, i.version, i.ability_id, i.usage, i.variant_group, i.stem_md, i.answer_type, i.required_abilities, i.misconception_ids, i.status, i.exposure, i.source_draft_id, i.created_at
from public.learn_items i
join public.learn_abilities a on a.id = i.ability_id
join public.learn_packs p on p.id = a.pack_id
where p.status = 'live';
revoke all on public.learn_items_public from public, anon;
grant select on public.learn_items_public to authenticated;

insert into public.learn_rule_configs (key, version, config) values
('llm', 1, '{"default":"openai","tasks":{"item_extract":"openai","item_enrich":"openai"}}'::jsonb),
('evidence', 1, '{"independent_correct_needed":2,"distinct_variants":true,"unexposed_needed":1,"retained_after_days":3,"retained_reviews":3}'::jsonb),
('review_intervals', 1, '{"days":[1,3,7]}'::jsonb),
('diagnostic', 1, '{"base_items":6,"max_followups":6,"time_limit_min":15}'::jsonb)
on conflict (key, version) do nothing;

commit;
