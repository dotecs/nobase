-- Purpose: session v3 ability caps and verified early completion.
-- Application: not applied; application date and operator pending.
insert into public.learn_rule_configs(key, version, config, active_from)
select 'session', 3, config || '{"per_ability_buffer":1,"stop_when_verified":true}'::jsonb, now()
from public.learn_rule_configs where key = 'session' and version = 2
on conflict (key, version) do nothing;
-- ROLLBACK: retain v3 history; publish a newer reviewed configuration to disable early completion.
