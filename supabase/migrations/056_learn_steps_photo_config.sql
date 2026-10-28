-- Purpose: preserve current evidence configuration and add optional steps/photo settings in v5.
-- Application: 미적용, Claude 적용. 작성일 2026-10-28.
insert into public.learn_rule_configs (key,version,config)
select 'evidence',5,config || '{"steps_replace_photo":false,"steps_min_lines":2}'::jsonb
from public.learn_rule_configs
where key='evidence' and version<5 and active_from<=now()
order by version desc limit 1
on conflict (key,version) do nothing;
-- ROLLBACK: keep version history and use a forward configuration version if needed.
