# 작업 명세서: 수강 상태 관리(철회·일시정지·종료·재개) — 관리자 UI

- 대상 저장소: `nobase` / 실행 주체: Codex / 검수: Claude / 작성일: 2026-10-27
- 선행 상태: main(`09d577f`, Phase 1 머지됨)에서 `feat/enrollment-status` 분기 — 진행 중. `git -c core.autocrlf=true status --porcelain`이 비어 있어야 시작.
- 규칙: `docs/learn-db-rules.md` 1~9 그대로 적용(기존 테이블·정책·함수 수정 금지, 삭제 문장은 주석에도 금지, FK `ON DELETE` 절은 허용). 새 의존성 없음. CSS Modules. 명세 밖 파일 수정 금지. 항목마다 커밋 1개. 각 커밋 전 `npx tsc --noEmit`, 마지막에 `npm test`·`npm run build`.

## 0. 왜 하는가 (조사 결과)
- 관리자 화면에 **등록만 있고 철회·종료가 없다**(`app/(admin)/admin/users/actions.ts`의 `enrollUsersInCohort` 하나). 환불·휴학·오등록 때마다 DB를 직접 만져야 한다.
- 기존 버그: `app/(admin)/admin/enrollments/page.tsx`의 `rejectEnrollment`가 `status='cancelled'`로 갱신하는데 enum `enrollment_status`는 `pending, active, paused, ended`뿐이라 **실행 시 DB 오류**.
- 상태 의미가 코드 전반에 고정돼 있다: `paused` = **입금 대기**(`PaymentModal`, `admin-counts.ts`, 관리자 대시보드 "입금 대기", `/admin/enrollments` 승인 대기 목록). 따라서 **휴학에 `paused`를 재사용하지 않는다.**
- 접근 제어(`has_enrollment()`, `can_access_lesson()`, `lib/learn/access.ts`)는 전부 `status = 'active'`만 통과시킨다 → `active`가 아니면 어떤 값이든 접근이 끊긴다. 상태 변경 외에 접근 코드 수정은 필요 없다.

## 1. 상태 정의 (이 명세로 고정)
| 값 | 의미 | 접근 | 누가 만드나 |
|---|---|---|---|
| `pending` | 결제 진행 중(토스 자동결제 플로우) | 없음 | 결제 코드(기존) |
| `paused` | 입금 대기(계좌이체 신청) | 없음 | 학생 신청(기존) |
| `active` | 수강 중 | 있음 | 관리자 등록/승인, 결제 승인 |
| `on_hold` | **일시정지(휴학)** — 신규 | 없음 | 관리자만 |
| `ended` | 종료(철회·환불·수료·오등록 정리) | 없음 | 관리자만 |

허용 전이(관리자): `active → on_hold`, `active → ended`, `on_hold → active`, `on_hold → ended`, `ended → active`(재개), `paused → ended`(신청 거절 — 기존 `rejectEnrollment` 수정), `paused → active`(승인 — 기존). 그 외 전이는 서버에서 거부.

## 2. 작업 항목

### E-1. 마이그레이션 2개
- `supabase/migrations/043_enrollment_status_on_hold.sql`: `ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'on_hold' AFTER 'active';` **이 파일만 `begin/commit` 없이**(enum 값 추가는 같은 트랜잭션에서 사용할 수 없음). 머리말에 목적·미적용 표기.
- `supabase/migrations/044_enrollment_status_events.sql`: 이력 테이블 `enrollment_status_events(id uuid pk default uuid_generate_v4(), enrollment_id uuid not null references enrollments(id) on delete cascade, from_status text not null, to_status text not null, reason text, actor_id uuid references auth.users(id), created_at timestamptz not null default now())`, 인덱스 `(enrollment_id, created_at)`. RLS enable, 정책은 `is_admin()` SELECT/INSERT만(UPDATE/DELETE 정책 없음 — append-only). `lib/database.types.ts`에 수동 추가 + `EnrollmentStatus`에 `'on_hold'` 추가. `database/README.md` 적용 이력에 2줄.
- 완료 기준: 두 파일에 삭제 문장 0(주석 포함), 기존 객체 변경은 enum 값 추가뿐.

### E-2. 서버 액션 `updateEnrollmentStatus`
- 위치 `app/(admin)/admin/users/actions.ts`에 추가. 시그니처 `updateEnrollmentStatus(input: { enrollmentId: string; to: 'active'|'on_hold'|'ended'; reason: string })` → `{ ok: true } | { ok: false; error: string }`.
- 순서: zod 검증(`reason` 2~200자 필수) → 관리자 재확인(기존 `enrollUsersInCohort` 패턴) → 현재 행 조회 → §1 전이표로 허용 여부 검사(불허면 "현재 상태 X에서 Y로 바꿀 수 없습니다") → `enrollments.update({status}).eq('id').eq('status', 현재값)`(낙관적 동시성; 0행이면 "다른 곳에서 먼저 변경됨") → `enrollment_status_events` insert(from/to/reason/actor) → `revalidatePath('/admin/users', '/admin/users/[userId]', '/admin/enrollments', '/dashboard')`.
- 이력 insert가 실패하면 상태 변경을 되돌리지 않고(트랜잭션 없음) 반환 메시지에 "이력 기록 실패"를 덧붙인다. 이력 누락은 허용, 상태 오염은 불허.
- 테스트 `lib/enrollment-status.test.ts`: 전이표 함수 `canTransition(from, to)`를 순수 함수로 분리해 허용 7건·불허 예시 5건 검증.

### E-3. 기존 버그 수정 `/admin/enrollments`
- `rejectEnrollment`: `'cancelled'` → `'ended'`, 그리고 E-2의 이력 insert를 같은 방식으로 추가(이유 고정값 "신청 거절"). 승인(`approveEnrollment`)도 이력 1행 남기기(이유 "입금 확인").
- `otherEnrollments` 섹션 라벨에 `on_hold → 일시정지`, `ended → 종료` 표시.

### E-4. 사용자 상세 화면 UI (`app/(admin)/admin/users/UserDetail.tsx`)
- 수강 목록 각 행에 현재 상태 배지(`수강 중 / 입금 대기 / 결제 중 / 일시정지 / 종료`)와 **상태 변경 버튼**: 현재 상태에서 허용되는 전이만 버튼으로 노출(`active`: 일시정지·종료 / `on_hold`: 재개·종료 / `ended`: 재개 / `paused`·`pending`: 버튼 없음 — 승인은 기존 화면에서).
- 버튼 클릭 → 작은 확인 패널(모달 X, 인라인): 사유 입력(필수), "확인" → 액션 호출 → 결과 메시지. `window.confirm`/`alert` 사용 금지(기존 코드 스타일 유지).
- 행 아래에 최근 이력 3건(일시·from→to·사유·처리자 이름). 처리자 이름은 `profiles.name` 조인, 없으면 "관리자".
- 사용자 목록(`/admin/users`)의 "수강 현황" 배지도 `on_hold`·`ended` 라벨 반영(`UserEnrollPanel.tsx` 라벨 맵에 `on_hold: '일시정지'` 추가).

### E-5. 관리자 대시보드·카운트
- `app/(admin)/admin/page.tsx` 208행의 상태 라벨 삼항을 공용 라벨 맵(`lib/enrollment-status.ts`의 `ENROLLMENT_STATUS_LABEL`)으로 교체. `admin-counts.ts`는 변경 없음(`paused` 카운트 의미 유지).

### E-6. 기수 일괄 종료 (`app/(admin)/admin/cohorts/[cohortId]`)
- 기수 상세 화면에 **"이 기수 수강 전원 종료"** 버튼. 인라인 확인 패널: 현재 `active` 인원 수 표시, 사유 입력(필수), 확인 문구 입력(기수명 그대로 타이핑) 후 실행. `window.confirm` 금지.
- 서버 액션 `endCohortEnrollments({ cohortId, reason })`: 관리자 재확인 → 해당 기수 `status='active'` 행을 전부 `ended`로 `update … .eq('cohort_id').eq('status','active').select('id,user_id')` → 반환된 행마다 `enrollment_status_events` insert(from `active`, to `ended`, 사유, actor) → `revalidatePath`. 결과 메시지 "N명 종료, 이력 N건".
- 되돌리기는 사용자 상세에서 한 명씩 **재개**(E-4). 일괄 재개는 만들지 않는다(오조작 방지).
- 테스트: 대상 필터·이력 행 생성을 순수 함수로 분리해 단위 테스트 2개.

### E-7. (결정 보류 — 구현하지 않음) 기수 종료일 자동 차단
- 현재 구조에서는 **기수 `ends_at`이 지나도 접근이 유지된다**. `can_access_lesson()`·`has_enrollment()`·`lib/learn/access.ts`·강의 페이지 모두 `enrollments.status='active'`만 보고, 기수 `is_active`·`ends_at`은 어디서도 검사하지 않는다(2026-10-27 조사).
- 자동 차단은 두 DB 함수 수정(규칙 위반·결제/대시보드 영향)이 필요하므로 이번 범위 밖. E-6 수동 일괄 종료로 운영하고, 자동화는 대표 결정 후 별도 명세.

## 3. 사람이 해야 할 것 (대표)
1. 043 → 044 순서로 적용(백업 후). **043은 단독 실행**(SQL Editor에서 그 파일만 따로 Run).
2. 적용 후 테스트 계정으로: 오등록된 "뇌지컬 캠퍼스 4기" 행을 **종료** 처리 → `테스트 기수`에 등록 → `/learn` 접근 확인 → 다시 **일시정지** → 접근 차단 확인 → **재개**.

## 4. 범위 밖
- 학생 측 화면(내 수강 상태 표시 변화) — 현재 `active`만 "수강 중"으로 보이면 충분.
- 환불 금액 처리·결제사 연동.
- 일시정지 기간 자동 복귀.

## 5. 검수 체크리스트 (Claude)
| # | 확인 |
|---|---|
| 1 | 043·044 삭제 문장 0, 기존 객체 변경은 enum 값 추가뿐 |
| 2 | `paused` 의미 불변: `admin-counts.ts`·`PaymentModal`·`/admin/enrollments` 승인 대기 로직 diff 없음 |
| 3 | 전이표 테스트 통과, 불허 전이 서버 거부 |
| 4 | 낙관적 동시성: 같은 행 동시 변경 시 한쪽은 오류 |
| 5 | `rejectEnrollment`가 `ended`로 바뀌고 이력 남김 |
| 6 | 운영 화면: 종료 → 접근 차단, 재개 → 복구(테스트 계정) |
| 7 | 명세 밖 파일 변경 없음, 키 누출 없음 |
| 8 | E-6: `active`만 대상, 다른 상태 변경 0, 이력 건수 = 변경 건수, 확인 문구 불일치 시 실행 안 됨 |

## 6. 보고 형식
```
## 결과  (커밋 목록, tsc/test/build)
## 명세와 다르게 한 것 / 질문
## 사람이 해야 할 것 (043 단독 실행 포함)
```
