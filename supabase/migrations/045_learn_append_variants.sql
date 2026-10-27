-- 목적: 승인된 초안의 검증된 변형을 씨앗 그룹에 추가 (2026-10-27).
-- 적용 여부: 미적용. 적용일: 대표 적용 후 기록.
create function public.learn_append_variants(p_draft_id uuid)
returns integer
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  draft public.learn_item_drafts;
  seed public.learn_items;
  variant jsonb;
  next_number bigint;
  added integer := 0;
begin
  if not public.is_admin() then raise exception '관리자만 적용할 수 있습니다' using errcode = '42501'; end if;
  select * into draft from public.learn_item_drafts where id = p_draft_id for update;
  if not found or draft.status <> 'approved' then raise exception '승인된 초안만 변형을 추가할 수 있습니다'; end if;
  if draft.answer_verified_by is distinct from 'program'
    or draft.answer_spec is null or draft.answer_spec = 'null'::jsonb then raise exception '프로그램 정답 검증 필요'; end if;
  if draft.template->'params'->>'source_stem' is distinct from draft.stem_md
    or draft.template->'params'->>'answer_type' is distinct from draft.answer_type then raise exception '템플릿 원문 불일치'; end if;
  if jsonb_typeof(draft.variants) is distinct from 'array' then raise exception '변형 목록 없음'; end if;
  select * into seed from public.learn_items where source_draft_id = p_draft_id and variant_group = id order by version desc limit 1 for update;
  if not found then raise exception '씨앗 문항 없음'; end if;
  if seed.stem_md is distinct from draft.stem_md or seed.answer_type is distinct from draft.answer_type
    or seed.ability_id is distinct from draft.ability_id then raise exception '승인된 씨앗 원문 불일치'; end if;
  perform pg_advisory_xact_lock(hashtext(seed.ability_id));
  select coalesce(max(substring(id from '[0-9]+$')::bigint), 0) into next_number
    from public.learn_items where ability_id = seed.ability_id and id ~ ('^' || seed.ability_id || '-[0-9]+$');
  for variant in select value from jsonb_array_elements(draft.variants) loop
    if variant->>'enabled' = 'true' then
      if variant->'answer_spec' is null or variant->'answer_spec' = 'null'::jsonb then raise exception '변형 정답 미확인'; end if;
      if variant->'answer_spec'->>'type' is distinct from variant->>'answer_type'
        or variant->>'answer_type' is distinct from seed.answer_type then raise exception '변형 정답 형식 불일치'; end if;
      if coalesce(btrim(variant->>'stem_md'), '') = '' then raise exception '변형 본문 없음'; end if;
      if exists(select 1 from public.learn_items where variant_group = seed.variant_group and stem_md = variant->>'stem_md') then continue; end if;
      next_number := next_number + 1;
      insert into public.learn_items(id, version, ability_id, usage, stem_md, answer_type, answer_spec, status, source_draft_id, variant_group)
      values(seed.ability_id || '-' || lpad(next_number::text, greatest(2, length(next_number::text)), '0'),
        1, seed.ability_id, variant->>'usage', variant->>'stem_md', variant->>'answer_type', variant->'answer_spec',
        'reviewed', p_draft_id, seed.variant_group);
      added := added + 1;
    end if;
  end loop;
  return added;
end;
$$;
revoke execute on function public.learn_append_variants(uuid) from public, anon;
grant execute on function public.learn_append_variants(uuid) to authenticated;
-- ROLLBACK: 추가 액션 사용을 중지하고 함수를 보존한다. 문항 데이터는 유지한다.
