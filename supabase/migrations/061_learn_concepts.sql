-- Purpose: fine-grained concept nodes and prerequisite edges.
-- Application: not applied; date and operator pending Claude.
create table public.learn_concepts (
 id text primary key, pack_id text not null references public.learn_packs(id),
 ability_id text references public.learn_abilities(id), name text not null, one_line text not null,
 check_question jsonb, lesson_id text, created_at timestamptz not null default now()
);
create table public.learn_concept_edges (
 source_id text not null references public.learn_concepts(id), target_id text not null references public.learn_concepts(id),
 type text not null default 'prerequisite' check(type='prerequisite'),
 primary key(source_id,target_id,type), check(source_id<>target_id)
);
alter table public.learn_concepts enable row level security;
alter table public.learn_concept_edges enable row level security;
create policy learn_concepts_read on public.learn_concepts for select to authenticated using(true);
create policy learn_concept_edges_read on public.learn_concept_edges for select to authenticated using(true);
grant select on public.learn_concepts,public.learn_concept_edges to authenticated;
grant all on public.learn_concepts,public.learn_concept_edges to service_role;
-- ROLLBACK: retain concept history; omit unused nodes from future lesson versions.
