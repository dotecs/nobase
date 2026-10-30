-- Purpose: versioned lessons, sentence audio, private storage and learner activity.
-- Application: not applied; date and operator pending Claude.
create table public.learn_lessons (
 id text not null, version int not null default 1 check(version>0),
 pack_id text not null references public.learn_packs(id),
 kind text not null check(kind in ('concept','worked')), title text not null,
 ability_ids text[] not null default '{}', body jsonb not null,
 status text not null default 'draft' check(status in ('draft','reviewed','live','retired')),
 created_at timestamptz not null default now(), primary key(id,version)
);
create table public.learn_lesson_audio (
 lesson_id text not null, lesson_version int not null, sentence_id text not null,
 text_hash text not null, path text not null, duration_ms int check(duration_ms>=0),
 created_at timestamptz not null default now(), primary key(lesson_id,lesson_version,sentence_id),
 foreign key(lesson_id,lesson_version) references public.learn_lessons(id,version)
);
create table public.learn_lesson_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
 lesson_id text not null, lesson_version int not null,
 type text not null check(type in ('open','scene','sentence','why_click','quiz','dontknow','gap','complete')),
 payload jsonb not null default '{}', created_at timestamptz not null default now(),
 foreign key(lesson_id,lesson_version) references public.learn_lessons(id,version)
);
create index learn_lesson_events_user_created_idx on public.learn_lesson_events(user_id,created_at desc);
alter table public.learn_lessons enable row level security;
alter table public.learn_lesson_audio enable row level security;
alter table public.learn_lesson_events enable row level security;
create policy learn_lessons_published_read on public.learn_lessons for select to authenticated using(status in ('reviewed','live'));
create policy learn_lesson_audio_read on public.learn_lesson_audio for select to authenticated using(true);
create policy learn_lesson_events_own_read on public.learn_lesson_events for select to authenticated using(user_id=auth.uid());
create policy learn_lesson_events_own_insert on public.learn_lesson_events for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.learn_lessons l where l.id=lesson_id and l.version=lesson_version and l.status in ('reviewed','live')));
grant select on public.learn_lessons,public.learn_lesson_audio to authenticated;
grant select,insert on public.learn_lesson_events to authenticated;
grant all on public.learn_lessons,public.learn_lesson_audio,public.learn_lesson_events to service_role;
insert into storage.buckets(id,name,public) values('learn-lessons','learn-lessons',false) on conflict(id) do nothing;
-- Storage access is through service-role signed URLs; no client write policy is created.
-- ROLLBACK: retain history and stop publishing new lesson versions.
