-- Purpose: persist optional attempt steps. 050 이후 적용 (053 컬럼 추가 후).
-- Application: 미적용, Claude 적용. 작성일 2026-10-28.
create or replace function public.learn_record_attempt(p_payload jsonb) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  session public.learn_sessions;
  attempt_data jsonb := p_payload->'attempt';
  state_data jsonb := p_payload->'state';
  event_data jsonb := p_payload->'event';
  row_data jsonb;
  attempt_id uuid;
  owner_id uuid := (p_payload->>'user_id')::uuid;
  idem text := p_payload->>'idempotency_key';
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server only' using errcode = '42501'; end if;
  select * into session from public.learn_sessions where id = (p_payload->>'session_id')::uuid for update;
  if not found or session.user_id is distinct from owner_id or session.ended_at is not null then raise exception 'Invalid active session'; end if;
  if coalesce(idem, '') = '' then raise exception 'Idempotency key required'; end if;
  select id into attempt_id from public.learn_attempts where session_id = session.id and idempotency_key = idem;
  if found then return attempt_id; end if;
  insert into public.learn_attempts(session_id, user_id, item_id, item_version, ability_id, usage, answer_input, result, auto_grade, hints_used, photo_path, duration_ms, rule_version, idempotency_key, steps)
  values(session.id, owner_id, attempt_data->>'item_id', (attempt_data->>'item_version')::integer, attempt_data->>'ability_id', attempt_data->>'usage',
    attempt_data->'answer_input', attempt_data->>'result', attempt_data->'auto_grade', coalesce((attempt_data->>'hints_used')::integer,0),
    attempt_data->>'photo_path', (attempt_data->>'duration_ms')::integer, attempt_data->'rule_version', idem, attempt_data->'steps') returning id into attempt_id;
  if state_data is not null and state_data <> 'null'::jsonb then
    insert into public.learn_ability_states(user_id, ability_id, state, evidence, rule_version)
    values(owner_id, state_data->>'ability_id', state_data->>'state', state_data->'evidence', state_data->'rule_version')
    on conflict (user_id, ability_id) do update set state = excluded.state, evidence = excluded.evidence, rule_version = excluded.rule_version;
  end if;
  if event_data is not null and event_data <> 'null'::jsonb then
    insert into public.learn_ability_state_events(user_id, ability_id, from_state, to_state, reason, attempt_id, rule_version)
    values(owner_id, coalesce(state_data->>'ability_id',attempt_data->>'ability_id'), event_data->>'from_state', event_data->>'to_state', event_data->>'reason', attempt_id, event_data->'rule_version');
  end if;
  for row_data in select value from jsonb_array_elements(coalesce(p_payload->'reviews','[]'::jsonb)) loop
    insert into public.learn_review_schedule(user_id, ability_id, due_at, interval_index, session_id)
    values(owner_id, row_data->>'ability_id', (row_data->>'due_at')::timestamptz, (row_data->>'interval_index')::integer, session.id);
  end loop;
  for row_data in select value from jsonb_array_elements(coalesce(p_payload->'review_updates','[]'::jsonb)) loop
    update public.learn_review_schedule set status = row_data->>'status' where id = (row_data->>'id')::uuid and user_id = owner_id;
    if not found then raise exception 'Review schedule ownership mismatch'; end if;
  end loop;
  if p_payload->'session_plan_append' is not null and p_payload->'session_plan_append' <> 'null'::jsonb then
    update public.learn_sessions set plan = plan || (p_payload->'session_plan_append') where id = session.id;
  end if;
  if p_payload->>'learner_status' is not null then
    update public.learn_learners set status = p_payload->>'learner_status' where user_id = owner_id;
    if not found then raise exception 'Learner missing'; end if;
  end if;
  return attempt_id;
end;
$$;
revoke execute on function public.learn_record_attempt(jsonb) from public, anon, authenticated;
grant execute on function public.learn_record_attempt(jsonb) to service_role;
-- ROLLBACK: preserve evidence and use a forward correction if needed.
