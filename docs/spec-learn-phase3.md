# 학습 모듈 Phase 3 — P3-1 Jev 보조 소주제 분류

작성일: 2026-10-28. 구현 브랜치: `feat/learn-phase2` (기존 작업 브랜치 유지).

## 목적과 범위

규칙 기반 `suggestAbilities`는 폴백으로 유지한다. 추출된 한국어 문항의 소주제 후보를 TypeSafe Jev로 보조하고, 최종 승인은 계속 코치가 수행한다. 기존 초안의 일괄 재분류는 범위 밖이다. 신규 패키지·Cron·운영 DB 실행은 없다.

## 제공받은 실측 결과

대표가 제공한 사전 실측: 한국어 문항 20개 중 20개 정분류, 평균 189ms, 입력 약 1,300토큰/건. 04-6 대 04-3의 확률 0.59/0.41이 유일한 저신뢰 사례였다. 이 수치는 이번 구현의 모킹 테스트 결과가 아니며, 이번 작업에서 유료 API 실측을 재실행하지 않는다.

## P3-1 구현

### 1. 어댑터와 설정

- 서버 전용 `lib/learn/llm/classifier.ts`, `fetch` 직접 사용. `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer` 인증. 공식 API 참조: https://api.typesafe.ai/redoc (2026-10-28 확인).
- 입력: `{ stem_md, abilities: {id,name,action}[] }`. `criteria`는 DB `learn_abilities`의 ID를 키로, `name — action`을 값으로 구성한다.
- 요청: `{ model, state: { problem_stem_markdown }, questions: { ability: { type: 'choice', instructions, criteria } } }`.
- instructions: “이 한국어 중학 수학 문제를 푸는 데 필요한 핵심 소주제 하나를 고르시오. 문제의 수식($...$는 LaTeX)이 요구하는 연산·개념을 기준으로 판단하시오.”
- Zod로 `answers.ability.{choice,confidence,probabilities}`, `usage.input_tokens`, `model`을 검증한다. 후보 밖 ID는 실패 처리한다. 확률 내림차순으로 `top2`를 계산한다.
- 출력: `{choice, confidence, probabilities, top2:[{id,p}], model, input_tokens, latency_ms}`. 5초 `AbortController`, 재시도 없음, 실패는 throw.
- `052_learn_llm_classifier.sql`: llm v1 설정을 보존하고 v2에 `classifier: { provider:'typesafe', model:'jev-latest', auto_threshold:0.9, enabled:true }` 병합. **파일만 작성, 적용은 Claude**. 040 수정 금지.
- `LlmConfig.classifier?` 및 Zod 기본값으로 하위 호환. 기존 설정에 classifier가 없으면 비활성. `TYPESAFE_API_KEY`가 없거나 `enabled:false`면 호출하지 않는다. 키는 서버 환경변수만 사용한다.

### 2. 추출 연결

- 기존 규칙 결과는 `extract.rule`에 보관한다.
- 성공: `extract.classifier = {provider, model, choice, confidence, top2, input_tokens, latency_ms, error:null}`.
- 실패: `extract.classifier = {error:message}`만 추가하고 규칙으로 계속 추출한다.
- 성공한 분류기의 상위 2개 뒤에 규칙 후보를 합쳐 중복 제거 후 2개를 사용한다.
- 성공 시 `confidence >= auto_threshold`이면 `ability_id=choice`, 미만이면 null. 꺼짐·실패 시에만 기존 규칙 첫 후보를 기본값으로 사용한다.
- 분류는 정답·검증 상태·승인 권한을 변경하지 않는다. 이미지 지시문 방어와 코치 승인 단계는 유지한다.

### 3. 승인 UI와 기록

- `소주제 참고: Jev 02-5 0.99 · 05-3 0.01 (신뢰도 0.99) / 규칙 05-3, 05-4` 형식으로 표시한다. 오류는 회색 `분류기 오류: …`로 표시한다.
- `ability_id=null`이면 select는 `선택하세요`로 시작하며 후보는 기존 정렬대로 상단에 `추천 ·` 표시한다.
- `saveDraftReview`에서 기존 extract와 classifier 속성을 보존하고 `classifier.coach_final`을 선택 소주제로 병합 저장한다. 이 저장 성공 후 승인 RPC를 호출하는 기존 흐름을 유지한다.
- 검증: 응답 파싱·스키마 오류·타임아웃, 임계 이상/미만·실패·꺼짐, null 선택과 확률/오류 UI, coach_final 병합·승인 흐름. tsc·전체 test·build 및 `.next/static`의 `typesafe.ai` 0건 확인.

## 한 달 뒤 비용·정확도 점검 SQL

읽기 전용이다. `input_usd_per_million`에 계약상 입력 단가를 입력해야 비용이 계산된다(기본 NULL: 단가 미확인). 실패 호출의 토큰 사용량은 저장되지 않으므로 성공 호출의 입력 비용 추정이며 실제 청구액과 대조한다. 정확도는 승인 완료된 초안의 코치 최종 선택과 일치하는 비율이며, 독립 정답 라벨 기반 정확도는 아니다.

```sql
with params as (
  select null::numeric as input_usd_per_million
), classified as (
  select status, extract->'classifier' as c
  from public.learn_item_drafts
  where created_at >= now() - interval '30 days'
    and ((extract->'classifier') ? 'choice' or (extract->'classifier') ? 'error')
)
select coalesce(c->>'model', 'error_without_model') as model,
       count(*) as calls,
       count(*) filter (where c->>'error' is not null) as failures,
       avg((c->>'latency_ms')::numeric) as avg_latency_ms,
       sum((c->>'input_tokens')::bigint) as recorded_input_tokens,
       sum((c->>'input_tokens')::numeric) / 1000000 * p.input_usd_per_million as estimated_input_usd,
       count(*) filter (where status = 'approved' and c->>'choice' is not null and c->>'coach_final' is not null) as reviewed,
       avg(case when status = 'approved' and c->>'choice' is not null and c->>'coach_final' is not null
                then (c->>'choice' = c->>'coach_final')::int end) as coach_agreement_rate
from classified cross join params p
group by coalesce(c->>'model', 'error_without_model'), p.input_usd_per_million;
```
