-- Purpose: cap the least common denominator of generated fraction operands.
-- Application: not applied; representative applies after backup. Date: pending.
insert into public.learn_rule_configs(key, version, config)
select 'variants', 2, config || '{"max_lcd":60}'::jsonb
from public.learn_rule_configs where key = 'variants' and version = 1
on conflict (key, version) do nothing;
-- ROLLBACK: retain existing rules and use a new version for further corrections.
