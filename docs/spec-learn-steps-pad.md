# 풀이 단계 입력 + 폰 입력 패드 — 개발 명세서 (S-0 ~ S-4, P-0 ~ P-3)

- 작성일: 2026-10-28
- 대상: Codex(`nobase` 레포, main `274d399` 이후)
- 브랜치: **1단계 `feat/learn-steps`**(S-0~S-4) → Claude 검수·머지·배포 → **2단계 `feat/learn-pad`**(P-0~P-3). 항목당 커밋 1개, 각 커밋 tsc·test·build.
- 검수·운영 DB 적용·머지·배포: Claude. Codex는 마이그레이션 **파일만** 작성.
- 참조: `docs/spec-learn-phase2.md`(런타임·규칙), `docs/spec-learn-ui-v1.md`(학생 화면 원칙 — 토큰·접근성·문구 규칙 그대로 적용), `docs/learn-db-rules.md`.

> 결정 기록(2026-10-28, 대표): 폰 패드는 **계정 기반 페어링**(QR·토큰 없음). 패드에서 문항 지문은 **접어서 보여줌**(탭하면 펼침). 손글씨 캔버스·음성·사진 LLM 전사는 범위 밖.

---

## 0. 한 장 요약

| 항목 | 결정 |
|---|---|
| 목적 | (1) 학생이 풀이를 **줄 단위로 입력**하면 서버가 줄마다 동치를 검사해 "몇 번째 줄에서 틀렸는지"를 즉시 알려준다. (2) 노트북으로 풀 때 **폰을 입력 패드**(키패드·단계 줄·카메라)로 쓸 수 있다 |
| 채점 영향 | **없음.** 시도 결과(`correct_independent` 등)는 지금처럼 최종 답으로만 결정. 단계 검사는 피드백·코치 참고·증거 후보일 뿐. 규칙 엔진(`rules/`) 변경 없음 |
| 데이터 | `learn_attempts.steps jsonb`(053, 컬럼 추가), `learn_pad_drafts` 테이블(054, 신규). 기존 컬럼·RPC 시그니처 변경 없음 — `learn_record_attempt`는 payload에 `steps`가 있으면 저장하도록 **055에서 `create or replace`**(050 방식) |
| 동기화 | 1차는 **2초 폴링**(서버 액션). Supabase Realtime(publication 변경)은 보류 — 비-learn 객체 수정 금지 규칙과 충돌 가능 |
| 페어링 | 없음. 폰은 "내 계정의 열린 세션"(학습·복습·진단 중 1개, 049 유니크 인덱스)을 따라간다. 폰에 "패드 모드" 선호만 localStorage |
| 보안 | 패드 초안 테이블은 RLS 본인만. 패드 화면은 기존 학생 DTO(`toStudentItem`)만 사용 — 정답·부등호·answer_spec 비노출 유지 |
| 범위 밖 | 손글씨 캔버스, 음성, 사진→LLM 전사, Realtime, 힌트 요청 버튼 |

---

## 1단계. 풀이 단계 입력 (S)

### S-0 동치 검사 규칙 (`lib/learn/mathcheck/steps.ts`, 순수 함수)

`checkSteps(stem: string, answerType: AnswerType, steps: string[]): StepCheck`

- 입력 정규화: 각 줄에 기존 `normalizeStem`과 같은 전처리(유니코드 −·≤·≥, `$` 제거, 공백 제거).
- **기준 줄**: 0번째 비교 대상은 **문항의 식**(지문의 단일 수식 구간; 대입형은 대입 후 식). 즉 1번째 줄은 문항과, i번째 줄은 i−1번째 줄과 비교.
- 동치 판정(답 유형별):
  - `expression`: `equivalent(parse(a).left, parse(b).left)` (기존 다항식 동치).
  - `number`/`fraction`이고 **관계가 없는 계산식**(`(-3)+7-(-5)`, `1/2+1/3`): 두 줄을 각각 유리수로 평가해 같은 값.
  - `number`이고 **방정식·부등식**(변수 있음): 양쪽을 `solveItem(line,'number')`로 풀어 `variable`·`relation`·`value`가 같으면 동치. `x=-3`처럼 해만 쓴 줄도 `solveItem`이 처리.
  - 마지막 줄이 **최종 답 형태**(`-3`, `x=-3`, `5/6`, `3(2x+3)`)여도 동일 규칙으로 비교.
- 결과: `{ checked: number, first_error_index: number | null, lines: { input: string; status: 'ok' | 'error' | 'unparsed' }[] }`. 파싱 실패 줄은 `unparsed`로 표시하고 **다음 줄은 마지막으로 성공한 줄과 비교**(한 줄 오타로 전체가 무너지지 않게).
- 제한: 줄 최대 12, 줄당 200자. 초과는 `input_issue`가 아니라 **무시하고 12줄까지만** 검사(제출은 막지 않음).
- 테스트(최소 10): 방정식 3줄 정상 / 2번째 줄 부호 오류 → `first_error_index: 1` / 부등식에서 음수로 나눠 부등호 뒤집힌 올바른 줄은 ok, 안 뒤집힌 줄은 error / 분수 덧셈 통분 단계(`3/6+2/6`) ok / 식 정리 중간 줄 ok / unparsed 건너뜀 / 대입형(`x=-2, 3x+5` → `3(-2)+5` → `-6+5` → `-1`) / 인수분해(`6x+9` → `3(2x+3)`) / 빈 배열 → checked 0 / 13줄 입력 → 12줄만.

### S-1 제출 입력 확장 (런타임, **시그니처 유지**)

- `submitLearningAttempt`·`submitAttempt`의 zod 입력에 **선택 필드** `steps: z.array(z.string().max(200)).max(12).optional()` 추가. 기존 호출(필드 없음)은 그대로 동작.
- 런타임: `grade = gradeAttempt(...)` 뒤에 `steps`가 1줄 이상이면 `checkSteps` 실행 → `auto_grade.step_check`에 결과 저장(trace 형식 없이 객체 그대로), `recordAttempt` payload에 `attempt.steps: string[] | null` 추가.
- **진단에서도 단계 입력을 받되** 피드백은 규칙대로 보여주지 않는다(저장만).
- 멱등 키·결과 판정·상태 전이 **변경 없음**.
- 테스트: steps 없이 제출 → 기존 테스트 전부 통과(변경 0), steps 있으면 `auto_grade.step_check` 존재, 진단은 피드백 null 유지.

### S-2 DB (파일만, Claude 적용)

- `053_learn_attempt_steps.sql`: `alter table public.learn_attempts add column steps jsonb;` + 코멘트. (컬럼 추가만 — 허용 범위.)
- `055_learn_record_attempt_steps.sql`: 050의 함수 전문을 `create or replace`로 복사하고 insert 컬럼에 `steps`를 추가(`attempt_data->'steps'`). 다른 줄 변경 금지. 머리말에 "050 이후 적용" 명시. (번호 054는 P-1 테이블용으로 비움.)
- `database/README.md`에 두 파일 "미적용, Claude 적용" 기록.

### S-3 학생 화면 — 단계 입력 UI (`components/learn/StepInput.tsx`)

- 문항 카드에서 답 입력 **위**에 "풀이 과정 (선택)" 영역. 기본은 접힘("풀이 과정 적기 ▸"), 펼치면 줄 입력 목록.
- 줄 입력: 텍스트 입력 1개 + 키패드(`AnswerInput`의 키패드를 **공유 컴포넌트로 분리**해 재사용 — `components/learn/Keypad.tsx`). 키패드에 `x`, `(`, `)`, `=`, `<`, `≤`, `>`, `≥`, `^` 키를 가진 **두 번째 페이지**(탭 전환) 추가. 모바일 `inputMode="text"`.
- 엔터 또는 "줄 추가" → 다음 줄. 각 줄 왼쪽에 번호, 오른쪽에 ⌫(줄 삭제). 최대 12줄.
- 마지막 줄을 "이 줄을 답으로" 버튼으로 **답 입력에 복사**할 수 있음(복사만, 자동 아님).
- 제출 시 `steps`는 **빈 줄을 제외**하고 전송. 답 입력이 비어 있고 단계만 있으면 제출 불가(안내: "마지막 답을 답 입력에 적어 주세요").
- 접힘/펼침 상태는 세션 동안 유지(localStorage `learn:steps-open`).
- 테스트: 렌더 1(접힘 기본), 키패드 2페이지 전환 1, 12줄 제한 1, 빈 줄 제외 1.

### S-4 피드백·코치 화면

- **피드백 패널**(학습·복습만): `step_check`가 있으면 기존 문구 아래 한 줄 —
  - 전부 ok: "풀이 {n}줄 모두 맞아요"
  - 오류 있음: "풀이 {k+1}번째 줄부터 다시 확인해 보세요" + 해당 줄 내용을 작은 글씨로(학생 본인 입력이므로 노출 가능). **정답·다음 줄 힌트는 보여주지 않음.**
  - 최종 답은 맞았지만 단계 오류가 있으면: 결과 문구는 "정답이에요" 그대로, 아래에 "풀이 {k+1}번째 줄은 다시 봐 두세요"(경고색 아님, 회색).
- **코치 학습자 상세** 시도 타임라인: 시도에 `steps`가 있으면 줄 목록 + 줄별 ✓/✗/– 표시. 사진 썸네일과 같은 위치.
- 테스트: 피드백 3상태 1개씩, 코치 타임라인 렌더 1.

### 1단계 완료 기준
- 테스트 계정으로 운영에서: 방정식 문항에 3줄 입력(2번째 줄 고의 오류) → "2번째 줄부터 다시 확인" 표시, DB `learn_attempts.steps`·`auto_grade.step_check` 저장, 코치 화면에 ✓✗ 표시 — Claude 실측.
- steps 없이 제출한 기존 흐름 회귀 0건.

---

## 2단계. 폰 입력 패드 (P)

### P-0 패드 초안 저장 (DB, 파일만)

- `054_learn_pad_drafts.sql`:
  ```sql
  create table public.learn_pad_drafts (
    user_id uuid not null references auth.users(id) on delete cascade,
    session_id uuid not null references public.learn_sessions(id) on delete cascade,
    plan_index integer not null,
    draft jsonb not null default '{}'::jsonb,   -- { answer, steps, photo_path, source: 'pad'|'screen' }
    updated_at timestamptz not null default now(),
    primary key (user_id, session_id, plan_index)
  );
  alter table public.learn_pad_drafts enable row level security;
  create policy learn_pad_drafts_owner on public.learn_pad_drafts for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());
  ```
  (DELETE 정책은 두지 않는다 — 세션 종료 시 행은 남겨도 무해. 정리는 Phase 4.)
- 서버 액션 `savePadDraft({sessionId, planIndex, draft})`(upsert, 본인 세션인지 `sessionRow`로 확인), `readPadDraft({sessionId, planIndex})` → `{draft, updated_at} | null`. 둘 다 `app/(main)/learn/actions.ts`에 추가. 입력 zod 검증, draft 크기 8KB 제한.

### P-1 폰 패드 화면 `/learn/pad`

- 서버 컴포넌트: 로그인·수강 확인 후 **열린 세션 조회**(`learn_sessions where user_id and ended_at is null`). 없으면 "지금 진행 중인 학습이 없어요. 노트북에서 학습을 시작한 뒤 다시 열어 주세요" + "학습 홈으로".
- 있으면 현재 문항(`learningView`/`diagnosticView`의 DTO 재사용 — **새 조회 함수 만들지 않음**)으로 `PadClient` 렌더:
  - 상단: "입력 패드 · 문항 {n}/{total}" + "패드 모드 끄기"(localStorage 해제 후 `/learn`).
  - **지문: 접힌 카드**("문제 보기 ▸", 탭하면 펼침, 기본 접힘).
  - 본문: `StepInput`(S-3) + `AnswerInput` + `PhotoCapture` **그대로 재사용**(폰 전용 UI 금지), 키패드 키 높이만 56px.
  - 제출 버튼: 기존 `submitLearningAttempt`/`submitAttempt` 그대로 호출(멱등 키가 같으므로 노트북과 이중 제출 안 됨). 제출 후 다음 문항으로 자동 갱신(기존 `router.refresh()` 패턴).
  - 입력이 바뀔 때마다 300ms 디바운스로 `savePadDraft`(source `'pad'`).
- 홈 `/learn`: 열린 세션이 있고 화면 폭이 좁으면(≤ 767px) 카드 하나 추가 — "노트북으로 풀고 있나요? **이 폰을 입력 패드로 쓰기**". 누르면 localStorage `learn:pad-mode=1` 저장 후 `/learn/pad`. 이후 폰에서 `/learn`을 열 때 열린 세션이 있고 `pad-mode`면 `/learn/pad`로 바로 이동(클라이언트 리다이렉트, 해제 가능).

### P-2 노트북(화면 모드) 연동

- 세션·진단 화면 상단 바에 토글 "폰 입력 받기"(기본 꺼짐, localStorage 기억). 켜면 2초마다 `readPadDraft` 폴링:
  - 초안의 `updated_at`이 마지막 반영보다 새롭고 `source==='pad'`면 답·단계·사진 상태를 **덮어씀**(폰이 우선). 노트북에서 직접 타이핑하면 그 시점부터 폰 초안보다 새로우므로 노트북 값 유지(`source:'screen'`으로 저장).
  - 상단 바에 "폰에서 입력 중 · 3초 전" 표시. 60초 이상 갱신 없으면 "폰 연결 대기".
- 제출은 어느 기기에서든. 제출 후 두 기기 모두 다음 문항으로(노트북은 폴링 중 `plan_index` 변화를 감지해 `router.refresh()`).
- 세션 화면에 작은 QR(선택): 내용은 `https://nobase911.com/learn/pad` 고정 링크. QR 라이브러리 **추가 금지** — SVG를 서버에서 직접 그리지 말고, 1차는 **링크 텍스트만**("폰에서 nobase911.com/learn/pad 열기"). QR은 Phase 4.

### P-3 테스트·완료 기준
- 단위: `savePadDraft` 본인 아닌 세션 거부, 8KB 초과 거부, `readPadDraft` 없음→null, 홈 리다이렉트 조건(좁은 폭+열린 세션+pad-mode), 패드 화면 세션 없음 상태.
- 운영 실측(Claude): 테스트 계정 — Browser 1(노트북 화면)에서 세션 시작 + "폰 입력 받기" 켬 → 같은 계정 다른 브라우저(폰 역할, 창 폭 420)에서 `/learn/pad` → 키패드로 답 입력 → 노트북 화면에 2초 내 반영 → 폰에서 제출 → 양쪽 다음 문항. 사진은 폰 역할 창에서 파일 업로드로 대체.
- 회귀: 패드를 쓰지 않는 학생의 흐름 변화 0.

---

## 3. 설정 (DB 적용은 Claude)

- `learn_rule_configs.evidence` v5(파일 056, insert): `steps_replace_photo: false`, `steps_min_lines: 2`. **1차는 false** — 단계 입력이 사진 필수를 대체하지 않는다. 파일럿에서 학생이 단계 입력을 실제로 쓰는지 본 뒤 대표가 켠다. 런타임은 이 값을 읽어 `photo_required` 계산에만 반영(`true`이고 유효 단계 ≥ min이면 사진 선택으로 전환). 규칙 엔진 변경 없음.

## 4. 커밋 계획

| 브랜치 | 커밋 | 내용 |
|---|---|---|
| `feat/learn-steps` | 1 S-0 | `steps.ts` + 테스트 10 |
| | 2 S-1/S-2 | 입력 확장, 저장, 053·055 파일, README |
| | 3 S-3 | `Keypad.tsx` 분리, `StepInput.tsx`, 세션·진단 화면 연결 |
| | 4 S-4 | 피드백·코치 타임라인 |
| `feat/learn-pad` | 5 P-0 | 054 파일, 액션 2개 + 테스트 |
| | 6 P-1 | `/learn/pad`, 홈 카드·리다이렉트 |
| | 7 P-2 | 노트북 폴링·표시, 설정 056 파일 |

## 5. `[확인]` 대표 확인 사항
1. 단계 오류가 있어도 **최종 답이 맞으면 "정답"**으로 처리(결과 불변). 단계 오류를 결과에 반영하려면 규칙 엔진 변경이 필요해 이번 범위 밖 — 괜찮으신지.
2. 패드 모드 진입 조건을 "좁은 화면"으로 추정합니다. 태블릿(폭 768 이상)에서는 홈 카드가 안 보이고 `/learn/pad` 직접 접속만 됩니다 — 괜찮으신지.
