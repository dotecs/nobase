-- Purpose: add optional TypeSafe classification to llm v2, preserving v1 settings.
-- Application: applied to production by Claude on 2026-10-28 (Supabase MCP).
insert into public.learn_rule_configs(key, version, config)
select 'llm', 2, config || '{"classifier":{"provider":"typesafe","model":"jev-latest","auto_threshold":0.9,"enabled":true}}'::jsonb
from public.learn_rule_configs where key = 'llm' and version = 1
on conflict (key, version) do nothing;
-- ROLLBACK: retain records and disable classifier in a subsequent config version.
