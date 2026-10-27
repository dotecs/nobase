-- Purpose: atomic server-computed coach decisions and idempotent review evidence.
-- Application: not applied. Apply after 046 and 047; date pending human review.
begin;
alter table public.learn_coach_decisions add column idempotency_key text;
alter table public.learn_coach_reviews add column idempotency_key text;
create unique index learn_coach_decisions_idempotency_idx on public.learn_coach_decisions(idempotency_key);
create unique index learn_coach_reviews_idempotency_idx on public.learn_coach_reviews(idempotency_key);
create function public.learn_record_coach_action(p_payload jsonb) returns uuid
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  learner public.learn_learners;
  action_id uuid;
  owner_id uuid := (p_payload->>'user_id')::uuid;
  coach_id uuid := (p_payload->>'coach_id')::uuid;
  idem text := p_payload->>'idempotency_key';
  state_data jsonb := p_payload->'state';
  event_data jsonb := p_payload->'event';
  review_data jsonb := p_payload->'review';
  decision_data jsonb := p_payload->'decision';
  row_data jsonb;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Server only' using errcode = '42501'; end if;
  select * into learner from public.learn_learners where user_id = owner_id for update;
  if not found then raise exception 'Learner missing'; end if;
  if coalesce(idem,'') = '' then raise exception 'Idempotency key required'; end if;
  if p_payload->>'kind' = 'attempt_review' then
    select id into action_id from public.learn_coach_reviews where idempotency_key = idem;
    if found then return action_id; end if;
    if not exists(select 1 from public.learn_attempts where id = (review_data->>'attempt_id')::uuid and user_id = owner_id) then raise exception 'Attempt ownership mismatch'; end if;
    if exists(select 1 from public.learn_coach_reviews where attempt_id = (review_data->>'attempt_id')::uuid) then raise exception 'Attempt already reviewed'; end if;
    insert into public.learn_coach_reviews(attempt_id, coach_id, verdict, note, idempotency_key)
    values((review_data->>'attempt_id')::uuid, coach_id, review_data->>'verdict', review_data->>'note', idem) returning id into action_id;
  else
    select id into action_id from public.learn_coach_decisions where idempotency_key = idem;
    if found then return action_id; end if;
    insert into public.learn_coach_decisions(user_id, coach_id, kind, payload, idempotency_key)
    values(owner_id, coach_id, decision_data->>'kind', decision_data->'payload', idem) returning id into action_id;
  end if;
  if state_data is not null and state_data <> 'null'::jsonb then
    insert into public.learn_ability_states(user_id, ability_id, state, evidence, rule_version)
    values(owner_id,state_data->>'ability_id',state_data->>'state',state_data->'evidence',state_data->'rule_version')
    on conflict(user_id,ability_id) do update set state=excluded.state,evidence=excluded.evidence,rule_version=excluded.rule_version;
  end if;
  if event_data is not null and event_data <> 'null'::jsonb then
    insert into public.learn_ability_state_events(user_id,ability_id,from_state,to_state,reason,attempt_id,rule_version)
    values(owner_id,state_data->>'ability_id',event_data->>'from_state',event_data->>'to_state',event_data->>'reason',(review_data->>'attempt_id')::uuid,event_data->'rule_version');
  end if;
  for row_data in select value from jsonb_array_elements(coalesce(p_payload->'reviews','[]'::jsonb)) loop
    insert into public.learn_review_schedule(user_id,ability_id,due_at,interval_index)
    values(owner_id,row_data->>'ability_id',(row_data->>'due_at')::timestamptz,(row_data->>'interval_index')::integer);
  end loop;
  for row_data in select value from jsonb_array_elements(coalesce(p_payload->'review_updates','[]'::jsonb)) loop
    update public.learn_review_schedule set status=row_data->>'status' where id=(row_data->>'id')::uuid and user_id=owner_id;
    if not found then raise exception 'Review schedule ownership mismatch'; end if;
  end loop;
  if p_payload->>'learner_status' is not null then
    update public.learn_learners set status=p_payload->>'learner_status',gate_decided_by=coach_id,gate_decided_at=now() where user_id=owner_id;
  end if;
  return action_id;
end;
$$;
revoke execute on function public.learn_record_coach_action(jsonb) from public, anon, authenticated;
grant execute on function public.learn_record_coach_action(jsonb) to service_role;
commit;
-- ROLLBACK: stop coach mutations and retain evidence pending forward correction.
