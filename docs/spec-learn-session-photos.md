# 세트 단위 풀이 사진 + 진단/학습 화면 구분 — 개발 명세서 (E-0 ~ E-5)

- 작성일: 2026-10-29
- 대상: Codex(`nobase` 레포, main `b727072` 이후)
- 브랜치: **`feat/learn-session-photos`**(main 끝에서 분기), 항목당 커밋 1개, 각 커밋 tsc·test·build. 검수·운영 DB 적용·머지·배포: Claude. 마이그레이션은 **파일만**.
- 참조: `docs/spec-learn-steps-pad.md`(패드·단계), `docs/spec-learn-ui-v1.md`(화면 원칙), `docs/learn-db-rules.md`.

> 결정 기록(2026-10-29, 대표): 풀이 사진은 **문항마다가 아니라 세트(세션)가 끝난 뒤 한 번에** 올린다. **진단은 사진 필수**(사진이 있어야 "진단 완료"·코치 게이트 입력), **학습·복습은 선택**("다음에 올리기" 가능, 코치 화면에 "사진 없음" 표시). 진단과 학습이 화면에서 **확실히 구분**되게 한다.

---

## 0. 한 장 요약

| 항목 | 결정 |
|---|---|
| 사진 단위 | 세션당 **1~4장**(종이 앞뒤 등). 문항별 사진 UI는 **`answer_type: 'photo'` 문항에서만** 유지 |
| 진단 | 마지막 문항 제출(또는 시간 만료) 후 **"풀이 사진 올리기" 단계**. 사진 1장 이상 올려야 "진단을 마쳤어요". 올리기 전엔 홈에 "진단 사진 올리기" 카드가 계속 뜨고, 코치 게이트 "학습 열기"는 **비활성**(코치가 사유를 적고 "사진 없이 열기"로 예외 가능) |
| 학습·복습 | 완료 화면에 "풀이 사진 올리기"와 **"다음에 올리기"** 두 버튼. 건너뛰면 세션은 그대로 완료, 코치 타임라인에 "사진 없음" 배지. 홈에 "지난 학습 사진 올리기" 작은 카드(최근 세션 1개, 24시간 안, 닫기 가능) |
| 타이머 | 사진 단계는 **타이머 밖**. 세션은 지금처럼 마지막 제출/만료 시점에 끝나고, 사진은 종료된 세션에 **뒤이어 붙는다** |
| 규칙·채점 | **변경 없음.** 시도 결과·증거 규칙·학습자 상태 전이 그대로. "사진 필수"는 화면·코치 게이트에서 강제(상태 머신 추가 없음) |
| 데이터 | `learn_session_photos`(057, 신규), evidence v6(058, `photo_required_usages: []` + `session_photo`). `learn_attempts.photo_path`는 사진 풀이 유형 문항용으로 유지 |
| 패드 | 마지막 제출 뒤 패드도 자동으로 **사진 단계**로 전환 — 폰이 가장 자연스럽게 쓰이는 순간 |
| 화면 구분 | `FocusShell`에 **톤 3종**(진단 / 학습 / 복습): 색·라벨·배지·완료 화면 구조가 다름(§3) |

---

## 1. 데이터 (파일만, Claude 적용)

### 057 `learn_session_photos`
```sql
create table public.learn_session_photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.learn_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (session_id, path)
);
create index learn_session_photos_session on public.learn_session_photos(session_id);
alter table public.learn_session_photos enable row level security;
create policy learn_session_photos_owner_select on public.learn_session_photos for select to authenticated using (user_id = auth.uid());
create policy learn_session_photos_owner_insert on public.learn_session_photos for insert to authenticated with check (user_id = auth.uid());
-- UPDATE/DELETE 정책 없음(증거 보존). 코치 조회는 서버(service role).
```
- 스토리지 경로: 기존 버킷 `learn-evidence`, `<user_id>/sessions/<session_id>/<uuid>_<name>`. `lib/storage.ts`에 `uploadSessionPhoto(userId, sessionId, file)` 추가(`uploadAttemptPhoto`와 같은 검증·10MB). 기존 스토리지 정책(`(storage.foldername(name))[1] = auth.uid()`)으로 커버되므로 **스토리지 정책 변경 없음**.
- 서버 액션 `addSessionPhoto({sessionId, path})`: 본인 세션(`sessionRow`) 확인, 세션이 **종료된 상태**여야 함(`ended_at is not null`), 경로가 `<user_id>/sessions/<session_id>/`로 시작, 세션당 최대 4장(초과는 `LearnUserError('사진은 4장까지 올릴 수 있어요')`). insert는 service role.
- `sessionPhotos(sessionId)`(서버): 코치·학생 공용 조회(서명 URL 10분).

### 058 evidence v6 (insert, v5 기반)
```json
{ "photo_required_usages": [], "session_photo": { "diagnostic": "required", "learning": "optional", "review": "optional" } }
```
- `rules/schema.ts`의 evidence에 `session_photo` **선택 필드** 추가(없으면 `{diagnostic:'required', learning:'optional', review:'optional'}`로 해석). `photo_required_usages`는 그대로 두되 비워서 문항별 사진 요구를 끈다(사진 풀이 유형은 `answer_type==='photo'`로 별도 판정 — 기존 `||item.answer_type==='photo'` 유지).
- `steps_replace_photo`는 문항별 사진에만 걸리던 값이라 그대로 두면 무해(문서에 "세트 사진 도입 후 사실상 미사용" 메모).

---

## 2. 흐름 (E-1 학생)

### 진단
1. 문항 카드에서 **사진 영역 제거**(`answer_type!=='photo'`). 제출 조건은 답 입력만.
2. 마지막 문항 제출 또는 만료 → 세션 종료(기존) → `/learn/diagnostic`이 **사진 단계** 렌더(`view.complete && photos.length===0`):
   - 제목 "마지막으로, 풀이 종이를 찍어 주세요"
   - 안내 2줄: "종이에 문제 번호가 보이게 찍어 주세요" / "최대 4장"
   - `PhotoCapture` 재사용(세션 모드: 업로드 후 즉시 `addSessionPhoto`), 썸네일 목록, "사진 더 올리기"
   - 버튼 "진단 끝내기"(사진 ≥1일 때만 활성). "다음에 올리기" **없음**
3. 사진 ≥1 → 완료 화면 "진단을 마쳤어요 · 코치가 확인하면 학습 홈에서 시작할 수 있어요"(기존).
4. 홈: `awaiting_coach`이고 사진 0장이면 첫 카드가 **"진단 사진 올리기"**(버튼 → `/learn/diagnostic`). 사진이 있으면 기존 "코치가 결과를 보고 있어요".

### 학습·복습
1. 문항 카드 사진 영역 제거(위와 동일).
2. 완료 화면(기존 숫자 3개) 아래에 사진 블록: "풀이 종이가 있다면 올려 주세요" + `PhotoCapture` + 버튼 **"다음에 올리기"**(→ 홈). 사진을 올리면 블록이 썸네일로 바뀌고 버튼은 "학습 홈으로".
3. 홈: 최근 24시간 안에 끝난 학습/복습 세션 중 **사진 0장인 가장 최근 1개**가 있으면 작은 카드 "어제 학습의 풀이 사진을 올릴 수 있어요"(버튼 → `/learn/session/[id]`, 완료 화면의 사진 블록으로). 닫기(×) 누르면 localStorage에 세션 id 저장해 다시 안 보임.
4. 완료 화면은 세션 종료 후 **언제든** 다시 열 수 있고(지금도 가능) 사진 추가 가능(최대 4장).

### 패드 (`/learn/pad`)
- 열린 세션이 없어도 **"사진 대기 중인 세션"**(진단: 사진 0장 & 종료됨 / 학습: 최근 24시간 & 사진 0장)이 있으면 패드는 그 세션의 **사진 단계**를 보여준다: 제목 "풀이 종이 찍기 · 출발점 진단" 또는 "· 오늘의 학습", `PhotoCapture`(카메라 우선), 썸네일, 진단이면 "진단 끝내기", 학습이면 "다음에 올리기".
- 노트북 화면은 폴링으로 사진 수 변화를 감지해 같은 단계를 갱신(기존 `readPadDraft` 폴링에 `photos` 수를 포함 — `PadSnapshot`에 `session_photo_count` 추가).

## 3. 진단 / 학습 / 복습 화면 구분 (E-2)

`FocusShell`에 `tone: 'diagnostic' | 'learning' | 'review'` 추가. **토큰만 사용**(새 토큰 금지).

| | 진단 | 학습 | 복습 |
|---|---|---|---|
| 상단 바 배지 | "진단 · 정답 비공개" (배경 `--color-secondary-subtle`/글자 `--color-secondary-700`) | "학습" (`--color-info-subtle`/`--color-primary-700`) | "복습" (`--color-success-subtle`/`--color-success-700`) |
| 상단 바 하단 선 | 2px `--color-secondary` | 2px `--color-primary` | 2px `--color-success` |
| 제목 | "출발점 진단" | "오늘의 학습" | "오늘의 복습" |
| 진행 표시 | "문항 n"(개수 비공개, 기존) | 점 진행(기존) | 점 진행 |
| 피드백 패널 | 없음(기존). 대신 상단 바 배지가 "정답 비공개"를 상시 표시 | 있음 | 있음 |
| 문항 카드 왼쪽 테두리 | 3px `--color-secondary` | 없음 | 없음 |
| 완료 화면 구조 | **3단계 스테퍼** "1 풀기 ✓ → 2 사진 올리기 → 3 코치 확인" (현재 단계 강조) | 숫자 3개 + 사진 블록(선택) | 동일 |
| 홈 카드 | 진단 카드 왼쪽 테두리 `--color-secondary`, 버튼 라벨 "진단 시작" | 학습 카드 기본, "학습 시작" | 복습 배너(기존 주의색) |

- 색만으로 구분하지 않는다: 배지 텍스트와 제목이 항상 함께 있다(접근성).
- 다크 모드: 모두 토큰이라 자동. `--color-secondary-subtle`이 없으면 `--color-secondary-50`/다크 `color-mix(in srgb, var(--color-secondary-700) 15%, transparent)`로 — 이미 쓰는 복습 배너 패턴과 동일하게 라이트·다크 둘 다 정의.
- 테스트: 톤별 배지 텍스트 3개, 진단에 피드백 패널 없음 1개, 완료 화면 스테퍼 단계 표시 2개(사진 전/후).

## 4. 코치 화면 (E-3)

- 학습자 상세 시도 타임라인: **세션 머리글**(종류 배지 + 시작 시각 + 사진 N장 썸네일 묶음). 사진 0장이면 진단은 "진단 사진 대기" 배지(경고색), 학습·복습은 "사진 없음"(회색).
- 코치 게이트: 최신 진단 세션 사진이 0장이면 "학습 열기" **비활성** + 문구 "학생이 풀이 사진을 올리면 열 수 있어요". 그 옆 "사진 없이 열기" 버튼 — 메모가 비어 있으면 거부(`LearnUserError('사유를 입력해 주세요')`), 결정 payload에 `without_photo: true` 기록. 기존 `diagnostic_gate` 액션의 입력에 **선택 필드** `withoutPhoto?: boolean` 추가(시그니처 유지).
- 썸네일 클릭 → 서명 URL 새 탭(기존 시도 사진과 같은 방식).
- 테스트: 게이트 비활성/예외 2개, 세션 머리글 배지 3개.

## 5. 커밋 계획 (E-4) / 완료 기준 (E-5)

| 커밋 | 내용 |
|---|---|
| 1 | 057·058 파일, `uploadSessionPhoto`, `addSessionPhoto`·`sessionPhotos` 액션 + 테스트(소유·종료 확인·4장 제한·경로 검증) |
| 2 | 학생: 문항 카드 사진 제거(사진 풀이 유형 제외), 진단 사진 단계·완료 스테퍼, 학습 완료 사진 블록·"다음에 올리기", 홈 카드 2종 |
| 3 | `FocusShell` 톤 3종 + 홈 카드 구분 + 테스트 |
| 4 | 패드 사진 단계 + 폴링 `session_photo_count` |
| 5 | 코치: 세션 머리글·배지·게이트 비활성/예외 |

완료 기준(Claude 운영 실측): 진단 6문항을 사진 없이 통과 → 사진 단계 → 패드에서 사진 1장 → 노트북 화면이 "진단을 마쳤어요"로 전환 → 코치 게이트 활성 → 학습 세션 완료 화면에서 "다음에 올리기" → 코치 타임라인 "사진 없음" → 홈에 "지난 학습 사진 올리기" 카드. 사진 풀이 유형 문항(`answer_type: 'photo'`)이 있으면 문항별 사진 UI가 그대로인지 단위 테스트로만 확인(운영 문항 없음).

## 6. 범위 밖
- 사진 OCR·LLM 전사, 사진 자동 문항 매칭, 사진 삭제·교체(증거 보존 원칙), 코치의 사진 주석.
