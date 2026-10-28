-- Purpose: optional learner-entered solution steps.
-- Application: 미적용, Claude 적용. 작성일 2026-10-28.
alter table public.learn_attempts add column steps jsonb;
comment on column public.learn_attempts.steps is '학습자가 입력한 선택 풀이 단계. 채점 결과에 영향 없음.';
-- ROLLBACK: preserve evidence and use a forward correction if needed.
