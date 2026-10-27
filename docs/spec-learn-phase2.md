# 작업 명세서: 적응형 학습 모듈 Phase 2 — 학습자 화면(진단 → 학습 → 복습) + 코치 게이트

- 대상 저장소: `nobase` / 실행 주체: Codex / 검수: Claude / 작성일: 2026-10-27
- 선행 상태: main(`b3f8744` 이상, Phase 1 + 후속 패치 ⑥ 배포됨). 운영 DB에 040~045 적용, 진단 기본 6개 소주제에 문항 6개 이상(총 43문항) 존재. **브랜치 `feat/learn-phase2`를 main에서 분기. main 직접 커밋 금지.**
- 상위 문서: 설계안 §3(화면·상태), §4-B/C(학습 데이터), §6-2(진단), §6-3(추천), §8 Phase 2, `docs/spec-learn-phase1.md`
- 확정된 결정 (2026-10-27, 대표)
  1. **답 제출 = 입력 + 자동 채점.** 풀이 사진은 `evidence.photo_required_usages`(기본 `["diagnostic","assessment"]`)에 든 용도에서만 필수, 나머지는 선택. 설정값만 바꾸면 전 문항 필수로 확장.
  2. **진단 후 코치 게이트.** `gate.coach_gate_after_diagnostic = true`(기본). 코치가 진단 결과·추천 경로를 확인해야 학습이 열린다. 설정값으로 자동 전환 가능.
  3. **채점기 플러그인.** 채점·검증은 `lib/learn/solvers/` 레지스트리를 거친다. 지금은 `mathcheck` 하나. 팩/소주제가 `solver` 이름을 지정하면 그걸 쓴다(향후 선형대수 = SymPy 서비스).
  4. 학생 6명·1차 기수(`root-math` / `테스트 기수` + 실제 기수) 대상. 질문 챗·OCR·음성은 범위 밖(§11·§12 트랙).

---

## 0. 요약
**Phase 2가 끝나면 등록 학생이 `/learn`에서 진단(15분)을 보고, 코치가 승인하면 매일 추천 세션(8문항)을 풀고, 1·3·7일 뒤 복습을 받는다.** 모든 시도·판정·상태 변화는 규칙 버전과 함께 append-only로 남는다.

| 만드는 것 | 위치 |
|---|---|
| 학습 데이터 테이블 7개 + 설정 3키 | `046_learn_runtime.sql` |
| 규칙 엔진(순수 함수) | `lib/learn/rules/*` |
| 채점 엔진 + 입력 컴포넌트 | `lib/learn/grade.ts`, `lib/learn/solvers/*`, `components/learn/*` |
| 학습자 화면 4개 | `/learn`, `/learn/diagnostic`, `/learn/session/[id]`, `/learn/review` |
| 코치 화면 2개 | `/admin/learn/learners`, `/admin/learn/learners/[userId]` |

**순서**: P2-1 → P2-2 → **(체크포인트 1)** → P2-3 → P2-4 → P2-5 → **(체크포인트 2)** → P2-6 → P2-7 → P2-8 → 최종 보고.

## 1. 실행 규칙 (Phase 1 §1 그대로 + 추가)
1. 항목마다 커밋 1개. 각 커밋 전 `npx tsc --noEmit`, 마지막 `npm test`·`npm run build`. 새 의존성 **없음**(KaTeX·zod·yaml 기존 사용).
2. `docs/learn-db-rules.md` 1~9. 040~045 수정 금지(적용됨). 삭제 문장은 주석에도 금지. FK `ON DELETE`·`FOR DELETE` 정책 허용.
3. **학습자 데이터 접근 원칙**: 학생 세션 클라이언트는 `learn_items_public`(정답 없음)과 자기 행(`learn_attempts` 등)만 읽는다. **정답(`answer_spec`)·채점·상태 갱신·추천은 전부 서버 액션에서 service role로** 수행한다. 과정·기수 메타(`courses`, `cohorts`)는 비공개 과정 RLS 때문에 서버 조회(`lib/learn/access.ts` 교훈).
4. 브라우저 번들에 `openai`·`@anthropic-ai/sdk`·`SUPABASE_SERVICE_ROLE_KEY` 0건(빌드 후 검색).
5. 규칙 상수 하드코딩 금지: 숫자·목록은 `learn_rule_configs`에서 읽고, 판정 행마다 `rule_version`(사용한 키:버전 맵)을 기록한다.
6. `window.confirm/alert` 금지. CSS Modules. 수식 렌더는 `lib/math-markdown.tsx`.
7. 판단이 필요하면 멈추고 §7 형식으로 질문. 체크포인트에서 보고·대기.

## 2. 전제 (Codex 확인)
| 항목 | 확인 | 분기 |
|---|---|---|
| `hasLearnAccess` | `lib/learn/access.ts`(service role 조회) | 모든 `/learn/*` 서버 컴포넌트 첫 줄에서 호출 |
| `learn_items_public` 뷰 | 040 | 학생 화면 문항 조회 전용 |
| `learn_rule_configs` 읽기 패턴 | `generateDraftVariants`의 `variants` 조회 | `lib/learn/rules/config.ts`로 공용화(키별 최신 버전, 메모리 캐시 60초) |
| 스토리지 업로드 패턴 | `uploadAuthoringImage` | `uploadAttemptPhoto(userId, file)` 버킷 `learn-evidence` 신설 |
| 문항 최신 version 규칙 | 같은 `id`에 여러 version | **id별 최대 version만** 사용(P2-1 뷰 `learn_items_latest`) |
| 중복 본문 | 02-5에 같은 본문 씨앗 2개 | 추천 시 `stem_md` 중복 제거 |

## 3. 작업 항목

### P2-1. 마이그레이션 `046_learn_runtime.sql` + 타입
모두 `id uuid default uuid_generate_v4()`, `created_at timestamptz default now()`. 학생 행은 `user_id uuid references auth.users(id)`.

| 테이블 | 컬럼 | RLS |
|---|---|---|
| `learn_learners` | `user_id uuid PK`, `pack_id text → learn_packs`, `goal_id text → learn_goals`, `status text check in (diagnostic_pending, diagnostic_in_progress, awaiting_coach, active, paused)` default `diagnostic_pending`, `gate_decided_by uuid null`, `gate_decided_at`, `created_at`, `updated_at` | 본인 SELECT, admin ALL. INSERT는 서버(service role) |
| `learn_sessions` | `id`, `user_id`, `kind text check in (diagnostic, practice, review, assessment)`, `plan jsonb`(시작 시 확정한 문항 목록·근거), `rule_version jsonb`, `started_at`, `ended_at null`, `summary jsonb null` | 본인 SELECT, admin ALL |
| `learn_attempts`(append-only: **admin도 SELECT/INSERT만**, UPDATE/DELETE 정책 없음) | `id`, `session_id → learn_sessions`, `user_id`, `item_id text`, `item_version int`, `ability_id text`, `usage text`, `answer_input jsonb`(학생이 입력한 원문), `result text check in (correct_independent, correct_assisted, incorrect, no_response, input_issue, pending_review)`, `auto_grade jsonb`(채점기 이름·판정·정규화 값), `hints_used int default 0`, `photo_path text null`, `duration_ms int null`, `rule_version jsonb`, `created_at` | 본인 SELECT/INSERT(단 `result`·`auto_grade`는 서버가 채움 — INSERT는 서버에서만, 학생 정책은 SELECT만), admin ALL. **UPDATE/DELETE 정책 없음** |
| `learn_ability_states` | `user_id`, `ability_id`, `state text check in (unknown, needs_repair, learning, verified, retained, recheck)`, `evidence jsonb`(`{independent_correct, distinct_groups[], assisted, incorrect, last_attempt_at, verified_at, reviews_passed}` — `verified_at`은 `verified` 전이 시각. **`recheck`로 떨어지면 `independent_correct`·`distinct_groups`·`reviews_passed`·`verified_at`을 초기화**해 새 증거로 다시 검증한다. 과거 누적은 `learn_ability_state_events`에 남는다), `rule_version jsonb`, `updated_at`, PK(user_id, ability_id) | 본인 SELECT, admin ALL. 쓰기는 서버 |
| `learn_ability_state_events`(append-only: admin도 SELECT/INSERT만) | `id`, `user_id`, `ability_id`, `from_state`, `to_state`, `reason text`, `attempt_id uuid null`, `rule_version jsonb`, `created_at` | 본인 SELECT, admin ALL. append-only |
| `learn_review_schedule` | `id`, `user_id`, `ability_id`, `due_at timestamptz`, `interval_index int`, `status text check in (due, done, skipped)` default `due`, `session_id uuid null`, `created_at` | 본인 SELECT, admin ALL. 쓰기는 서버 |
| `learn_coach_reviews` | `id`, `attempt_id → learn_attempts`, `coach_id uuid`, `verdict text check in (correct, incorrect, partial)`, `note text`, `created_at` | admin ALL. 본인 SELECT(결과 열람) |
| `learn_coach_decisions`(append-only: admin도 SELECT/INSERT만) | `id`, `user_id`, `kind text check in (diagnostic_gate, path_override, state_override)`, `payload jsonb`, `coach_id uuid`, `created_at` | admin ALL. append-only |

뷰 `learn_items_latest`(security_invoker=false, authenticated SELECT): `learn_items_public`에서 `id`별 최대 `version` 행만. 버킷 `learn-evidence`(비공개, 10MB, jpeg/png/webp/heic), 정책은 `learn-authoring`과 동일(본인 폴더 + admin).

초기 설정(`learn_rule_configs`, `ON CONFLICT DO NOTHING`):
- `('gate', 1, '{"coach_gate_after_diagnostic":true}')`
- `('session', 1, '{"items_per_session":8,"max_minutes":20,"max_hints_per_item":2,"new_ability_per_session":1}')`
- `('recommendation', 1, '{"order":"book","prefer_states":["needs_repair","recheck","unknown","learning"],"max_abilities_in_progress":2,"skip_duplicate_stems":true}')`
- `evidence` **version 2**: 기존 키 + `"photo_required_usages":["diagnostic","assessment"]`, `"photo_optional_usages":["practice","review"]`
- `('solvers', 1, '{"default":"mathcheck","by_pack":{"root-math":"mathcheck"}}')`
- **2026-10-27 Codex 질문 반영(명세 자체의 하드코딩 제거)**: `evidence` v2에 `"distinct_groups_needed":2`, `session`에 `"max_review_items":2`, `recommendation`에 `"diagnostic_usage_order":["diagnostic","assessment","practice"]`, `"practice_usage_order":["practice","assessment"]`, `"review_usage_order":["review","practice"]` 추가. 규칙 엔진은 이 값들만 읽는다.

`lib/database.types.ts` 수동 추가. `database/README.md` 적용 이력. **완료 기준**: 삭제 문장 0, 기존 객체 변경 0, 학생 정책에 UPDATE/DELETE 없음.

### P2-2. 규칙 엔진 — 순수 함수 + 테스트 (`lib/learn/rules/`)
입력은 전부 값(설정·상태·문항 목록), DB 접근 없음. 각 함수는 `{ result, trace }`를 반환하고 `trace`는 세션 `plan`/판정 `auto_grade`에 그대로 저장한다(코치가 "왜 이 문항인가"를 볼 수 있게).

- `config.ts`: `loadRuleConfigs(keys)` → `{ configs, rule_version }`(키:버전 맵). 서버 전용.
- `diagnostic.ts`
  - `planDiagnosticBase(pack, items, config)`: `diagnostic.base_abilities` 순서대로 소주제당 1문항(`usage in (diagnostic, assessment)` 우선, 없으면 practice; 최신 version; 그룹 다양성). 6개 미만이면 오류(문항 부족 소주제 명시).
  - `nextDiagnosticFollowup(state, lastAttempt, pack, items, config)`: `followup_rule = same_unit_previous` — 틀리면 같은 단원의 `order_in_unit - 1` 소주제 문항을 낸다(보강 소주제는 건너뛰고 `is_supplement=false` 중 직전). 단원 첫 소주제까지 틀리면 중단. 총 후속 ≤ `max_followups`. 맞으면 다음 기본 문항으로.
  - `summarizeDiagnostic(attempts, pack)`: 소주제별 초기 상태 — 기본·후속에서 `correct_independent` → `learning`(evidence 1), `incorrect`/`no_response` → `needs_repair`, 출제 안 됨 → `unknown`. 단, 어떤 소주제가 `needs_repair`면 **그 소주제를 선수로 갖는 뒤 소주제들**(엣지 기준)은 출제 여부와 무관하게 `unknown` 유지(추정하지 않음).
- `states.ts`: `applyAttempt(state, attempt, config)` → 새 상태 + 이벤트. 전이:
  - `correct_independent`: evidence 누적. `independent_correct ≥ evidence.independent_correct_needed` **그리고** `distinct_groups` 수 ≥ 2(`distinct_variants=true`일 때) → `verified`. `learning`/`needs_repair`/`unknown`/`recheck`에서 적용.
  - `correct_assisted`(힌트 사용): evidence.assisted +1, 상태 유지(verified로 못 감).
  - `incorrect`/`no_response`: `verified` → `recheck`, 그 외 → `needs_repair`. evidence.incorrect +1.
  - `input_issue`/`pending_review`: 상태 변화 없음.
  - 복습 통과(`review` 세션에서 correct_independent): `reviews_passed +1`; `verified`이고 `reviews_passed ≥ retained_reviews`이고 마지막 verified 이후 `retained_after_days` 경과 → `retained`.
- `recommend.ts`: `planSession(learner, states, pack, items, history, config)` → 세션 `plan`. 규칙(`recommendation` 설정):
  1. 대상 소주제 = 목표(`learn_goal_requirements`) 중 `prefer_states` 순서(`needs_repair` → `recheck` → `unknown` → `learning`), 같은 상태면 교재 순서(`order`). 동시 진행 소주제 ≤ `max_abilities_in_progress`. 새로 여는 `unknown` 소주제는 세션당 `new_ability_per_session`개.
  2. **선수 조건**: 소주제 X의 prerequisite 중 `needs_repair`가 있으면 X 대신 그 선수를 먼저.
  3. 문항 선택: 해당 소주제의 `practice` → `assessment` 순, **아직 안 푼 문항** 우선, 같은 `variant_group` 연속 금지, `stem_md` 중복 제거, 틀린 문항은 같은 세션에 재출제하지 않음(다음 세션에서 다른 변형).
  4. 세션 길이 `items_per_session`. 복습 기한이 지난 소주제(`learn_review_schedule.due`)가 있으면 세션 앞에 복습 문항을 최대 2개 끼운다(`review` usage 우선, 없으면 practice).
  5. 추천할 문항이 없으면(모든 소주제 verified/retained 또는 문항 부족) `plan.empty_reason`에 사유.
- `review.ts`: `scheduleReviews(ability, verifiedAt, config)` → `review_intervals.days`마다 `due_at` 행 생성. `markReview(schedule, attempt)`: 통과 → `done` + 다음 interval 유지, 실패 → 해당 소주제 `recheck` + 남은 일정 `skipped` + verified 후 재스케줄.
- `grade` 연계: 규칙 엔진은 `result`만 받는다(채점은 P2-3).
- **테스트**(≥40): 진단 계획(문항 부족 오류, 기본 6개 선택, 후속 분기 3단계, max_followups 상한, 시간 초과 시 남은 문항 `no_response`), 상태 전이 표 전부, 추천(선수 우선, 중복 그룹 금지, 복습 끼우기, 빈 사유), 복습 일정(1·3·7, 실패 시 skipped).

**체크포인트 1**: P2-2 커밋 후 §7 보고·대기. (규칙은 Claude가 설계안과 대조 검수)

### P2-3. 채점 엔진 + 입력 컴포넌트
- `lib/learn/solvers/index.ts`: `getSolver(name)` 레지스트리. `mathcheck` 구현: `grade(answerType, answerSpec, input) → { result: 'correct'|'incorrect'|'input_issue', normalized, detail }`. 유리수 동치(`number`/`fraction`, `require_reduced`면 비기약은 `correct`지만 `detail.not_reduced=true` → 결과는 `correct_assisted`로 기록), 식 동치(`expression`), 관계식(`number`+`variable`: 입력 `x=-3` 또는 `-3` 모두 허용, 부등식은 방향 포함), `choice`(id 집합 일치), `photo`/`text` → `pending_review`.
- `lib/learn/grade.ts`: 서버 전용. `gradeAttempt(item(answer_spec 포함, service role 조회), input, hintsUsed, solverName)` → `AttemptResult` + `auto_grade`. `hintsUsed > 0`이고 correct → `correct_assisted`.
- 컴포넌트 `components/learn/AnswerInput.tsx`: 타입별 — 수/분수: 숫자 키패드(−, /, 소수점) + 미리보기; 식: 텍스트 입력 + KaTeX 실시간 미리보기(`lib/math-markdown`); 선택형: 버튼; 사진/서술: 사진 업로드 + 짧은 글. `PhotoCapture.tsx`: `<input type=file accept=image/* capture=environment>` + 미리보기 + 업로드(`uploadAttemptPhoto`). 사진 필수 여부는 서버가 내려준 `photo_required`로 결정.
- 테스트: 채점 표 20개 이상(기약/비기약, `x=-3`/`-3`, 부등호 방향 반대 → incorrect, 공백·전각 기호 정규화, 빈 입력 → input_issue).

### P2-4. 학습자 진단 흐름
- `/learn`(기존 임시 페이지 교체): 접근 없음 → 안내. 있음 → `learn_learners` 행 없으면 서버가 생성(`pack root-math`, goal `g-linear-eq-basic`). 상태별 화면: `diagnostic_pending` → "진단 시작"(소요 15분·사진 안내), `diagnostic_in_progress` → 이어하기, `awaiting_coach` → "코치가 확인 중입니다", `active` → 오늘 세션 카드(P2-8), `paused` → 안내.
- `/learn/diagnostic`: 서버 액션 `startDiagnostic()` → `planDiagnosticBase`로 세션 생성(`kind diagnostic`, `plan`, `rule_version`). 한 문항씩: 문항(공개 뷰) → 입력 → 사진(필수) → `submitAttempt(sessionId, itemId, input, photoPath, durationMs)` 서버 액션: 채점 → `learn_attempts` insert → `nextDiagnosticFollowup`로 다음 문항 결정(세션 `plan`에 append) → 남은 문항 없으면 `finishDiagnostic`: `summarizeDiagnostic` → `learn_ability_states` upsert + 이벤트 → 학습자 상태 `awaiting_coach`(게이트 설정 true) 또는 `active`.
- 시간 제한: 시작 시각 + `time_limit_min` 지나면 남은 문항 `no_response`로 기록하고 종료. 새로고침해도 이어짐(세션 기준).
- 힌트 없음(진단). 정오답 **즉시 표시하지 않음**(진단 종료 후 "코치 확인 후 결과를 알려드려요").
- 완료 기준: 테스트 계정으로 6문항 + 후속 흐름 완주, DB에 세션 1·시도 6~12·상태 24행·이벤트, `awaiting_coach`.

### P2-5. 코치 게이트 + 학습자 상세
- `/admin/learn/learners`: 학생 목록(이름·상태·마지막 활동·검토 대기 사진 수·`awaiting_coach` 배지). 사이드바 "학습자".
- `/admin/learn/learners/[userId]`: ① 소주제 24개 상태 지도(단원별 행, 상태 색) ② 진단 결과(문항·입력·판정·사진 썸네일·소요) ③ **추천 경로 미리보기**(`planSession`을 dry-run한 다음 2세션 분량과 trace) ④ 게이트 패널: "학습 열기" / 상태 수동 조정(소주제별 `state_override`, 사유 필수) / "진단 다시"(세션 새로 시작, 기존 기록 보존) ⑤ 시도 타임라인(세션별, 사진 확대, `pending_review` 항목에 채점 버튼 → `learn_coach_reviews` insert + attempt 결과 반영은 **새 행이 아니라** `auto_grade`를 건드리지 않고 `learn_coach_reviews`로만 — 상태 엔진은 coach verdict를 `correct_independent`/`incorrect`로 매핑해 `applyAttempt`).
- 액션: `approveLearnerGate(userId, note)` → `learn_coach_decisions(diagnostic_gate)` + 학습자 `active`. `overrideAbilityState(userId, abilityId, state, reason)` → 이벤트 + decision. `reviewAttempt(attemptId, verdict, note)`.
- 완료 기준: 테스트 계정 진단 → 코치 화면에 나타남 → 열기 → 학생 `/learn`에 세션 카드.

**체크포인트 2**: P2-5 커밋 후 §7 보고·대기.

### P2-6. 학습 세션
- `/learn` 세션 카드 "오늘 학습 시작" → `startSession()`: `planSession` → `learn_sessions(kind practice)`. `/learn/session/[id]`: 한 문항씩, 상단 진행도. 문항마다: 입력 → 제출 → **즉시 피드백**(정답/오답, 오답이면 정답은 숨기고 힌트 1 제공 → 재시도 1회 허용 → 그래도 오답이면 정답·풀이 요지(`hints[1]`) 표시). 힌트 사용 수 기록. 사진은 `photo_optional_usages`면 선택 버튼.
- 각 제출은 `submitAttempt` → 채점 → `applyAttempt`로 상태 갱신 + 이벤트 → `verified`가 되면 `scheduleReviews`. 세션 끝: `summary`(정답 수·새로 verified된 소주제·다음 복습일) 저장·표시.
- `max_minutes` 초과 시 "오늘은 여기까지" 종료(남은 문항은 기록 안 함).
- 완료 기준: 테스트 계정으로 세션 2회 → 소주제 1개 `verified`, 복습 일정 3행, 이벤트 로그에 전이 근거.

### P2-7. 복습
- `/learn/review`: `learn_review_schedule.due_at <= now()`인 소주제 목록 → "복습 시작" → `kind review` 세션(소주제당 1~2문항, `review` usage 우선, 안 푼 변형). 통과/실패를 `markReview`로 반영(`recheck` 전이 포함). Cron 없음 — 기한 계산은 화면 로드 시.
- `/learn` 카드에 "오늘 복습 N개" 배지.
- 완료 기준: `due_at`을 과거로 둔 테스트 행으로 복습 세션 완주, 실패 시 `recheck`·`skipped` 확인.

### P2-8. 학습자 홈 대시보드
- `/learn`: 상태 요약(verified/retained 수 ÷ 목표 소주제 수), 단원별 진행 바, 오늘 세션·복습 카드, 최근 7일 활동. 숫자는 전부 서버 집계. 디자인은 기존 `/dashboard` 카드 패턴 재사용.
- 완료 기준: 3개 상태(진단 전·코치 대기·active) 스크린샷.

## 4. 사람이 해야 할 것 (대표)
1. 046 적용(백업 후). 적용 후 `learn_items_latest` 뷰 존재 확인은 Claude가.
2. 테스트 계정으로 진단 완주 → 코치 게이트 열기 → 세션 2회 → 복습 1회 (Claude가 Chrome으로 동행).
3. 실제 1차 기수 학생 등록 시점 결정.

## 5. 범위 밖
질문 챗, 풀이 사진 OCR·Jev 판단, 음성, 선형대수 등 새 팩, 학부모 리포트, 푸시 알림, Cron.

## 6. 검수 체크리스트 (Claude)
| # | 확인 |
|---|---|
| 1 | 046 삭제 문장 0, 학생 정책에 UPDATE/DELETE 없음, 학생이 `answer_spec` 못 읽음(테스트 계정 SQL) |
| 2 | 규칙 엔진 테스트 ≥40, 설계안 §6-2/6-3과 전이표 대조 |
| 3 | 모든 판정 행에 `rule_version`·trace 존재 |
| 4 | 채점이 클라이언트에서 불가능(정답이 응답에 없음 — 네트워크 탭) |
| 5 | 사진 필수 범위가 설정값으로 바뀜(evidence v3 임시 insert 후 practice에서 필수 → 되돌림) |
| 6 | 게이트 설정 false면 진단 후 바로 active(테스트) |
| 7 | 진단 시간 초과·새로고침 이어하기 |
| 8 | 시나리오: 테스트 계정 진단→게이트→세션 2회→복습, DB 행 수와 상태 전이 로그 일치 |
| 9 | 번들에 SDK·service key 0건, 명세 밖 파일 변경 0, 키 누출 0 |

## 7. 보고 형식
```
## 결과 (커밋 목록, tsc/test/build, 번들 검색)
## §2 전제 확인 결과
## 규칙 엔진 요약 (함수별 입력→출력 1줄, 테스트 수)
## 사람이 해야 할 것 (046 등)
## 질문 / 명세와 다르게 한 것
```
