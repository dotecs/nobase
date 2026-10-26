-- Purpose: image authoring sources, drafts and worker queue.
-- 2026-10-26 개정(미적용 상태에서 수정): 승인 트랜잭션에 템플릿·변형 저장 통합.
-- Application: not applied; application date: pending human review.

begin;

create table public.learn_item_sources (
  id uuid primary key default uuid_generate_v4(),
  uploader_id uuid not null references auth.users(id),
  storage_path text not null,
  origin text not null check (origin in ('own','book','licensed','reference_only')),
  note text,
  created_at timestamptz not null default now()
);

alter table public.learn_item_sources enable row level security;
create policy learn_item_sources_admin on public.learn_item_sources for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.learn_item_drafts (
  id uuid primary key default uuid_generate_v4(),
  source_id uuid not null references learn_item_sources(id),
  crop jsonb,
  extract jsonb not null,
  stem_md text not null,
  answer_type text check (answer_type in ('number','fraction','expression','choice','photo','text')),
  answer_spec jsonb,
  answer_verified_by text check (answer_verified_by in ('program','coach')),
  ability_candidates text[] not null default '{}',
  ability_id text references learn_abilities(id),
  usage_suggested text,
  template jsonb,
  variants jsonb not null default '[]',
  hints jsonb not null default '[]',
  misconceptions jsonb not null default '[]',
  status text not null default 'extracted' check (status in ('extracted','needs_coach','approved','rejected')),
  provider text not null,
  model_id text not null,
  prompt_version text not null,
  is_mock boolean not null default false,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.learn_item_drafts enable row level security;
create policy learn_item_drafts_admin on public.learn_item_drafts for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.learn_item_templates (
  id uuid primary key default uuid_generate_v4(),
  ability_id text not null references learn_abilities(id),
  pattern text not null,
  params jsonb not null,
  solver text not null,
  status text not null default 'draft',
  created_from_draft_id uuid references learn_item_drafts(id)
);

alter table public.learn_item_templates enable row level security;
create policy learn_item_templates_admin on public.learn_item_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.learn_jobs (
  id uuid primary key default uuid_generate_v4(),
  kind text not null check (kind in ('item_extract','item_enrich','ocr','math_check','decision','tts')),
  ref_id uuid not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed')),
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  locked_at timestamptz,
  locked_by text,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learn_jobs enable row level security;
create policy learn_jobs_admin on public.learn_jobs for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index learn_jobs_claim_idx on public.learn_jobs(kind, status, created_at);
create index learn_item_drafts_source_idx on public.learn_item_drafts(source_id);
create trigger learn_jobs_updated_at before update on public.learn_jobs for each row execute function public.update_updated_at_column();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
('learn-authoring', 'learn-authoring', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy learn_authoring_select on storage.objects for select to authenticated
using (bucket_id = 'learn-authoring' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy learn_authoring_insert on storage.objects for insert to authenticated
with check (bucket_id = 'learn-authoring' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy learn_authoring_update on storage.objects for update to authenticated
using (bucket_id = 'learn-authoring' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
with check (bucket_id = 'learn-authoring' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy learn_authoring_delete on storage.objects for delete to authenticated
using (bucket_id = 'learn-authoring' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create function public.learn_claim_job(p_kind text, p_worker text) returns public.learn_jobs
language plpgsql security definer set search_path = public, pg_temp as $$
declare claimed public.learn_jobs;
begin
  if not (coalesce(auth.role() = 'service_role', false) or public.is_admin()) then
    raise exception 'Admin or worker required' using errcode = '42501';
  end if;
  update public.learn_jobs set status = 'failed', error = 'Worker lease expired'
  where status = 'running' and locked_at < now() - interval '2 minutes' and attempts >= max_attempts;
  select * into claimed from public.learn_jobs
  where kind = p_kind and attempts < max_attempts
    and (status = 'queued' or (status = 'running' and locked_at < now() - interval '2 minutes'))
  order by created_at, id for update skip locked limit 1;
  if not found then return null; end if;
  update public.learn_jobs set status = 'running', attempts = attempts + 1, locked_at = now(), locked_by = p_worker, error = null
  where id = claimed.id returning * into claimed;
  return claimed;
end;
$$;
revoke all on function public.learn_claim_job(text, text) from public, anon;
grant execute on function public.learn_claim_job(text, text) to authenticated, service_role;

create function public.learn_approve_draft(p_draft_id uuid, p_ability_id text, p_usage text, p_item jsonb)
returns public.learn_items
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  draft public.learn_item_drafts;
  item public.learn_items;
  next_number bigint;
  item_id text;
  variant jsonb;
begin
  if not public.is_admin() then raise exception '관리자만 승인할 수 있습니다' using errcode = '42501'; end if;
  select * into draft from public.learn_item_drafts where id = p_draft_id for update;
  if not found then raise exception '초안을 찾을 수 없습니다'; end if;
  if draft.status not in ('extracted', 'needs_coach') then raise exception '이미 처리된 초안'; end if;
  if draft.answer_verified_by is null then raise exception '정답 미확인'; end if;
  if exists (select 1 from public.learn_item_sources where id = draft.source_id and origin = 'reference_only') then
    raise exception '참고용 이미지는 승인할 수 없습니다';
  end if;
  if draft.answer_spec is null then raise exception '정답 미확인'; end if;
  if coalesce(p_item->>'stem_md', draft.stem_md) is distinct from draft.stem_md
    or coalesce(p_item->>'answer_type', draft.answer_type) is distinct from draft.answer_type
    or coalesce(p_item->'answer_spec', draft.answer_spec) is distinct from draft.answer_spec then
    raise exception '수정 내용을 검증하여 저장한 뒤 승인해 주세요';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_ability_id));
  select count(distinct id) + 1 into next_number from public.learn_items where ability_id = p_ability_id;
  item_id := p_ability_id || '-' || lpad(next_number::text, greatest(2, length(next_number::text)), '0');
  insert into public.learn_items (
    id, version, ability_id, usage, stem_md, answer_type, answer_spec, hints, rubric,
    misconception_ids, required_abilities, status, source_draft_id, variant_group
  ) values (
    item_id, 1, p_ability_id, p_usage,
    coalesce(p_item->>'stem_md', draft.stem_md), coalesce(p_item->>'answer_type', draft.answer_type),
    coalesce(p_item->'answer_spec', draft.answer_spec), coalesce(p_item->'hints', draft.hints, '[]'::jsonb), '[]'::jsonb,
    array(select jsonb_array_elements_text(coalesce(p_item->'misconception_ids', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_item->'required_abilities', '[]'::jsonb))),
    'reviewed', p_draft_id, item_id
  ) returning * into item;
  if draft.template is not null and draft.template <> 'null'::jsonb then
    if draft.template->'params'->>'source_stem' is distinct from draft.stem_md
      or draft.template->'params'->>'answer_type' is distinct from draft.answer_type then
      raise exception '씨앗 수정 후 변형을 다시 생성해 주세요';
    end if;
    insert into public.learn_item_templates (ability_id, pattern, params, solver, status, created_from_draft_id)
    values (p_ability_id, draft.template->>'pattern', draft.template->'params', draft.template->>'solver', 'reviewed', p_draft_id);
  elsif jsonb_array_length(draft.variants) > 0 then
    raise exception '변형 템플릿이 없습니다';
  end if;
  for variant in select value from jsonb_array_elements(draft.variants) loop
    if variant->>'enabled' = 'true' then
      if variant->'answer_spec' is null or variant->'answer_spec' = 'null'::jsonb then
        raise exception '변형 정답 미확인';
      end if;
      if variant->'answer_spec'->>'type' is distinct from variant->>'answer_type' then
        raise exception '변형 정답 형식 불일치';
      end if;
      next_number := next_number + 1;
      insert into public.learn_items (
        id, version, ability_id, usage, stem_md, answer_type, answer_spec, status, source_draft_id, variant_group
      ) values (
        p_ability_id || '-' || lpad(next_number::text, greatest(2, length(next_number::text)), '0'),
        1, p_ability_id, variant->>'usage', variant->>'stem_md', variant->>'answer_type', variant->'answer_spec',
        'reviewed', p_draft_id, item_id
      );
    end if;
  end loop;
  update public.learn_item_drafts set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where id = p_draft_id;
  return item;
end;
$$;
revoke execute on function public.learn_approve_draft(uuid, text, text, jsonb) from public, anon;
grant execute on function public.learn_approve_draft(uuid, text, text, jsonb) to authenticated;

commit;
