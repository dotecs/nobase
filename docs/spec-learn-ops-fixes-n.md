# 운영 보수 묶음 N — 플래너 다양성·조기 종료, 코치 사진 뷰어, 지시문 필수, 미리보기 크기 (N-0 ~ N-5)

- 작성일: 2026-10-29
- 대상: Codex(`nobase` 레포, main `1495701` 이후)
- 브랜치: **`fix/learn-ops-n`**. 항목당 커밋 1개(N-0 → N-5), 각 커밋 tsc·vitest·build 통과. 기존 테스트는 동작 변경이 있는 것만 수정하고 사유를 커밋 메시지에.
- DB: 마이그레이션 **파일 1개**(059, 아래 N-1) — Codex는 파일만 작성, 적용·README 기록은 Claude.
- 참조: `docs/spec-learn-phase2.md`(규칙 엔진), `docs/spec-learn-session-photos.md`, `docs/spec-learn-ui-v1.md`, `lib/learn/rules/README.md`.

> 배경(2026-10-29 운영 관찰, 테스트 계정): 학습 세션 8문항이 02-5·01-4를 4개씩 번갈아 냈다. 02-5는 2문항 만에 verified 조건을 채웠는데 나머지 2개가 더 나왔고, 01-4는 4문항 모두 정답인데 전부 같은 변형 그룹(01-4-01)이라 `distinct_groups_needed: 2`를 못 채워 verified가 안 됐다(01-4-07 그룹이 있었음). 코치 화면의 세션 사진은 100px 썸네일 → 새 탭 원본(옆으로 누움, 5분 서명 URL). 03-1-01 그룹 6문항은 지시문 없이 승인돼 있었다(데이터는 v2로 수정 완료).

---

## 0. 한 장 요약

| 항목 | 결정 |
|---|---|
| N-0 그룹 다양성 | 학습 플래너 `choose()`가 **그 소주제에서 아직 증거에 없는 변형 그룹**을 우선 선택. 진단 플래너의 `group_diversity`와 같은 이름의 reason. |
| N-1 소주제별 상한 + 조기 종료 | 계획 시 소주제당 문항 수 = `max(1, independent_correct_needed − 현재 independent_correct) + per_ability_buffer`. 세션 중 소주제가 `verified`가 되면 그 소주제의 남은 문항은 **건너뜀**(`skipped`). 세션은 8문항보다 짧아질 수 있다. `session` 규칙 v3(059). |
| N-2 코치 사진 뷰어 | 페이지 안 라이트박스(`<dialog>`), 회전·확대, 클릭 시점 서명 URL 발급, 썸네일 200px. 업로드 시 클라이언트 리사이즈(긴 변 2000px, JPEG 0.85, EXIF 방향 반영). |
| N-3 지시문 필수 | 저작 승인 시 지문에 한글 지시문이 없으면 **승인 차단** + 초안 목록에 "지시문 없음" 배지. |
| N-4 미리보기 크기 | "보이는 식"을 입력창과 같은 글자 크기(`--text-base`)로, KaTeX 1.15em. 패드 포함. |
| N-5 문서 | rules README·database README·phase2 스펙의 세션 길이 서술 갱신. |
| 범위 밖 | 학습 모드(설명 카드·풀이 보기) — 별도 묶음 L. 사진 OCR — 별도 묶음 V. |

---

## N-0 학습 플래너 그룹 다양성 (`lib/learn/rules/recommend.ts`)

- `choose(ability, usageOrder)` 정렬 키를 다음 순서로:
  1. `unseen`(학생이 한 번도 안 본 문항) 우선 — 현행
  2. **새 그룹 우선**: `(row.variant_group ?? row.id)`가 (a) 그 소주제의 `evidence.distinct_groups`에 없고 (b) 이번 세션에서 그 소주제로 이미 고른 그룹에도 없으면 0, 아니면 1
  3. `usageOrder` 순서 — 현행
  4. `id` — 현행
- `no_adjacent_group`(직전 문항과 같은 그룹 금지)은 유지.
- `planSession` 시그니처에 `states`가 이미 들어오므로 evidence 접근 가능. `reasons`에 `group_diversity` 추가.
- 테스트(`recommend.test.ts`): 01-4에 그룹 A(문항 5개)·B(1개)가 있고 evidence.distinct_groups=[A]일 때 첫 선택이 B. B가 없으면 A에서 고름(기존 동작). 두 소주제 번갈아 낼 때 각 소주제의 2번째 문항은 1번째와 다른 그룹.

## N-1 소주제별 상한 + verified 조기 종료

### 규칙 설정 — `session` v3 (`supabase/migrations/059_learn_session_cap_config.sql`, 파일만)
- `learn_rule_configs`에 `session` version 3 삽입(v2 값 복사 + `per_ability_buffer: 1`, `stop_when_verified: true`), `active_from = now()`. `rules/schema.ts`의 `session`에 두 필드 추가(둘 다 `.optional()` — 구버전 세션 plan에 박힌 config를 읽을 때 깨지지 않게). 기본값: buffer 1, stop true.
- `database/README.md`에 059 줄 추가(적용자 칸은 비워 둠 — Claude가 기록).

### 계획 (`recommend.ts`)
- 소주제별 상한 `cap(ability) = max(1, evidence.independent_correct_needed − evidence.independent_correct) + per_ability_buffer`. evidence가 없는(`unknown`) 소주제는 `independent_correct_needed + buffer`. `needs_repair`/`recheck`도 같은 식(현재 independent_correct 사용).
- 라운드로빈 루프에서 `countFor(ability) >= cap(ability)`인 소주제는 건너뜀. 모든 후보가 상한에 닿으면 종료 — **세션이 `items_per_session`보다 짧아도 된다**(최소 1문항). `max_abilities_in_progress`는 그대로(상한 때문에 자리가 남아도 3번째 소주제를 열지 않음 — 세션은 짧게, 집중은 유지).
- 복습(`due_review`) 문항은 상한 계산에서 제외(복습은 소주제당 1개 규칙이 이미 있음).
- `reasons`에 `per_ability_cap:<ability>=<n>` 기록.
- 테스트: unknown 1개 + learning 1개(independent_correct 1) → 3 + 2 = 5문항. 문항 부족이면 있는 만큼.

### 실행 — 건너뜀 (`lib/learn/learning-session.ts`, `learning-runtime.ts`)
- `learningOutcome(raw,item,result, options:{verifiedAbilities:string[]})`: 상태 전이 후 `after.state==='verified' && before.state!=='verified'`이고 `stop_when_verified`이면, 큐의 **아직 안 푼** 같은 `ability_id` 문항을 `{type:'skipped', item, queue_index, reason:'verified'}` 엔트리로 plan에 append하고, 다음 안 건너뛴 문항으로 진행. 남은 게 없으면 `complete`.
- 재시도(`can_retry`) 중인 현재 문항은 건너뛰지 않는다(이미 제출한 문항은 결과대로).
- `readLearningPlan`: `skipped` 엔트리를 읽어 `meta.remaining`(남은 유효 문항 수)·`total`(건너뛴 것을 뺀 전체)을 노출. FocusShell 진행 점(dots)은 `total` 기준 — 건너뛰면 점 개수가 줄어든다(끝난 문항 점은 유지).
- 피드백 패널: verified 전이가 일어난 문항의 피드백에 한 줄 추가 — "이 소주제는 확인됐어요. 남은 N문제는 건너뛰어요." (`FeedbackPanel` caption 아래, `role="status"`). N=0이면 문구 생략.
- 세션 `summary`에 `skipped: n` 추가. 코치 타임라인 세션 헤더에 "건너뜀 n" 표시(n>0일 때만).
- 패드(`PadClient`·`pad-runtime`): 현재 문항/총 수는 서버 view에서 오므로 자동 반영. 건너뜀으로 `complete`가 되면 기존 사진 단계로 넘어간다.
- 테스트(`learning-session.test.ts` 등): 큐 [A,B,A,B,A,B]에서 2번째 A 정답으로 A verified → 남은 A 2개 skipped, 다음은 B; 모두 verified면 complete; `stop_when_verified:false`면 현행 동작.

## N-2 코치 사진 뷰어 + 업로드 리사이즈

### 업로드 (`components/learn/PhotoCapture.tsx`, `lib/storage.ts`)
- 파일 선택 후 업로드 전에 `createImageBitmap(file, { imageOrientation: 'from-image' })` → 캔버스에 긴 변 **2000px** 이하로 그려 `image/jpeg` 품질 0.85로 변환(EXIF 방향이 픽셀에 반영됨). HEIC 등 `createImageBitmap` 실패 시 원본 그대로 업로드(현행). 결과 파일명 확장자 `.jpg`.
- 상한: 변환 후에도 8MB 초과면 "사진 용량이 커요. 다시 찍어 주세요." (`LearnUserError` 아님 — 클라이언트 메시지).
- 테스트: 변환 함수를 순수 함수로 분리(`lib/learn/photo-resize.ts`: 입력 크기 → 출력 크기 계산)하고 그 부분만 단위 테스트. 브라우저 API 호출부는 테스트 제외.

### 코치 뷰어 (`components/learn/SessionPhotoPanel.tsx` → `SessionPhotoThumbnails`, 코치 전용 `CoachPhotoViewer.tsx` 신규)
- 코치 타임라인의 썸네일을 **200×200**(object-fit cover)으로. 클릭 → 같은 페이지 `<dialog>` 라이트박스: 사진을 뷰포트에 맞춰 표시, 버튼 **회전(90°)**, **확대(1×/2×, 드래그로 이동 대신 스크롤)**, 이전/다음(세션에 여러 장일 때), 닫기(ESC·바깥 클릭). 회전 상태는 저장하지 않음(코치가 보는 동안만).
- 서명 URL: 페이지 렌더 시 발급하던 것을 **클릭 시 서버 액션 `signedSessionPhotoUrl(photoId)`**(코치 또는 본인만, 300초)으로 변경. 썸네일용 URL은 렌더 시 발급 유지하되 만료 시(`img onError`) 자동 재발급 1회.
- 학생 쪽 `SessionPhotoThumbnails`(업로드 직후 확인용)는 변경 없음.
- 접근성: dialog `aria-label="풀이 사진 보기"`, 버튼 44px, 포커스 트랩은 네이티브 dialog에 맡김.
- 테스트: 뷰어 컴포넌트 렌더·회전 버튼이 `style.transform`을 바꾸는지, 서명 URL 액션의 권한 분기(코치/본인/타인).

## N-3 저작: 지시문 없는 문항 승인 차단 (`app/(admin)/admin/learn/authoring/actions.ts`, 저작 UI)

- `hasInstruction(stem_md)`: 수식 구간(`$…$`, `$$…$$`, `\(…\)`, `\[…\]`)을 제거한 뒤 **한글 2자 이상**이 남으면 true. `lib/learn/authoring/instruction.ts` 순수 함수 + 테스트(03-1-01 v1 → false, v2 → true, "다음을 계산하시오. $1+2$" → true, "$x$를 구하시오" → true).
- `approveDraft`: false면 `throw new Error('지시문이 없는 문항은 승인할 수 없어요. 지문에 "다음 식을 전개하시오." 같은 문장을 넣어 주세요.')`.
- 변형 추가(`addVariants` 쪽)도 원본 문항에 지시문이 없으면 같은 메시지로 차단(이미 승인된 구 문항 보호).
- 저작 목록: 초안 카드에 "지시문 없음" 경고 배지(기존 경고 배지 토큰 재사용), 승인 버튼 비활성 + 툴팁 문구.
- OCR 추출 프롬프트(`lib/learn/llm/authoring.ts`)에 한 줄 추가: "지문에 지시문이 보이지 않으면 `stem_md` 맨 앞에 가장 알맞은 지시문을 넣고 `needs_coach: true`로 표시" — 자동 보정이 아니라 **코치 확인을 유도**하는 용도.

## N-4 "보이는 식" 크기 (`components/learn/math-preview.module.css`, `input.module.css`)

- `.preview` 글자 크기를 `var(--text-base)`로, KaTeX 루트 `font-size: 1.15em`, 줄 높이 28px. 캡션 "보이는 식:"은 `--text-sm`·secondary 색 유지, 수식은 primary 텍스트 색.
- 패드(`PadClient`)·단계 입력 줄 미리보기도 같은 클래스 사용 → 자동 반영. 390px 폭에서 긴 식은 가로 스크롤(현행 `overflow-x:auto`).
- 스냅샷/렌더 테스트가 있으면 클래스명만 확인.

## N-5 문서

- `lib/learn/rules/README.md`: `group_diversity`, `per_ability_cap`, `skipped` 엔트리, `session` v3 필드 설명.
- `docs/spec-learn-phase2.md`의 "세션은 8문항" 서술에 "소주제 상한·조기 종료로 더 짧을 수 있음" 각주.
- `database/README.md` 059 줄(적용자 비움).

---

## 검수 체크리스트(Claude)
1. tsc·전체 테스트·build. 059 적용 후 `learn_rule_configs`에서 `session` v3 해석 확인.
2. 운영(테스트 계정): 새 학습 세션 문항 수가 8 미만이고 소주제별로 그룹이 섞여 나오는지(`plan.trace.reasons`에 `group_diversity`, `per_ability_cap:*`); 2문항 정답 후 verified → "남은 N문제는 건너뛰어요" → 점 개수 감소; 코치 타임라인 "건너뜀 n".
3. 코치 화면: 썸네일 200px → 라이트박스 회전·확대, 5분 뒤 클릭해도 열림.
4. 저작: 지시문 없는 초안 승인 시도 → 차단 메시지.
5. 보이는 식 글자 크기 입력창과 동일.
