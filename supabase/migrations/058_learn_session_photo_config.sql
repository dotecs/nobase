-- Purpose: evidence v6, session-level photo requirements (v5 preserved).
-- Application: 미적용, Claude 적용. 작성일 2026-10-29.
insert into public.learn_rule_configs(key,version,config)
select 'evidence',6,config || '{"photo_required_usages":[],"session_photo":{"diagnostic":"required","learning":"optional","review":"optional"}}'::jsonb
from public.learn_rule_configs where key='evidence' and version=5
on conflict (key,version) do nothing;
-- steps_replace_photo: 세트 사진 도입 후 사실상 미사용. 기존 키는 보존.
-- ROLLBACK: preserve configuration history and use a forward version.
