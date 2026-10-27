-- Purpose: versioned learning-session retry and review sizing, single open runtime session.
-- Application: not applied; application date pending human review.
begin;
insert into public.learn_rule_configs(key,version,config) values
('session', 2, '{"items_per_session":8,"max_minutes":20,"max_hints_per_item":2,"new_ability_per_session":1,"max_review_items":2,"retry_per_item":1,"review_items_per_ability":1}'::jsonb)
on conflict(key,version) do nothing;
create unique index learn_sessions_one_active_runtime_idx on public.learn_sessions(user_id)
where ended_at is null and kind in ('practice','review');
commit;
-- ROLLBACK: stop new runtime sessions and retain all learning evidence.
