# 작업 명세서: 페이지 이동 지연시간 최소화 (2차)

- 대상 저장소: `nobase` (Next.js 15.5 App Router + Supabase, Vercel 배포)
- 작성일: 2026-10-16
- 실행 주체: Codex
- 선행 상태: 1차 작업(서버 쿼리 병렬화)이 **커밋되지 않은 상태로** 작업 트리에 있음 — T0에서 정리

---

## 0. 요약 (먼저 읽을 것)

**핵심 원인은 코드보다 배포 리전이다.**

| 항목 | 값 | 확인 방법 |
|---|---|---|
| Vercel 함수 리전 | `iad1` (미국 워싱턴 D.C.) | 최신 production 배포 `dpl_523jAmDuA5dczagCi54gh76mBBhH`의 `regions` |
| Supabase 리전 | `ap-northeast-2` (서울) | 프로젝트 `xknzbydttuschqlxyyjq` |
| 사용자 위치 | 한국 | — |

서버 컴포넌트가 Supabase를 한 번 호출할 때마다 태평양을 왕복한다(추정 RTT 약 180~200ms). 브라우저 → 서버 요청도 미국을 거친다.
따라서 **"순차 쿼리 개수 × 약 190ms"** 가 페이지 이동 지연의 대부분이다.

| 레슨 페이지(`/lessons/[id]`) 순차 왕복 수 | 순차 왕복 | 추정 서버 대기 (iad1) | 추정 서버 대기 (icn1) |
|---|---|---|---|
| 1차 작업 전 (HEAD) | 약 14회 | 약 2.6초 | 약 0.07초 |
| 1차 작업 후 (현재 작업 트리) | 약 6회 | 약 1.1초 | 약 0.03초 |
| 이번 T3 적용 후 | 약 3회 | 약 0.6초 | 약 0.02초 |

> 위 수치는 RTT를 가정한 **추정치**다. 실측은 T2에서 한다. 명세 작성 시점에는 작성 환경의 네트워크 제한으로 실측하지 못했다.

**우선순위**
1. **T1 리전을 `icn1`(서울)로 이동** — 설정 1줄 변경. 효과가 가장 크다.
2. T0 현재 변경분 검증·커밋, T2 계측 도구
3. T3~T6 남은 waterfall 제거, 로딩 UI — 리전 이동 후에는 효과가 수십 ms 수준이라 **범위를 키우지 말 것**

---

## 1. 현재 상태 (작업 트리 기준)

### 1-1. 이미 적용된 변경 (미커밋, `git diff`로 확인)

| 파일 | 변경 내용 |
|---|---|
| `lib/supabase-server.ts` | `getUser`, `getProfile`를 `React.cache()`로 감쌈 → 한 렌더 안에서 Auth 호출 중복 제거 |
| `app/(main)/dashboard/page.tsx` | 수강별 N+1(레슨·진도) 쿼리 → 코스 일괄 조회 + 페이지 처리(500행) + 진도 ID 200개 단위 분할 |
| `app/(main)/courses/page.tsx` | 강좌·프로필·수강 조회 `Promise.all` |
| `app/(main)/courses/[courseId]/cohorts/[cohortId]/page.tsx` | enrollment+profile / course+cohort / subjects+lessons+announcements 3묶음 병렬 |
| `app/(main)/courses/[courseId]/cohorts/[cohortId]/curriculum/page.tsx` | enrollment+profile / course+cohort 병렬 |
| `app/(main)/lessons/[lessonId]/page.tsx` | 쿼리 일부 병렬화, subject 접근 확인 쿼리와 공통자료 쿼리 통합 |

추적되지 않은 새 파일: `app/(main)/loading.tsx`, `app/(main)/loading.module.css` (스켈레톤 UI)

`tsc --noEmit` 통과 확인됨.

### 1-2. 문제점

- `lib/supabase-server.ts`의 줄바꿈이 LF → **CRLF로 바뀌어** diff가 파일 전체 변경으로 보인다. 실제 변경은 `cache` 적용 10줄 정도다.
- 레슨 페이지에 순차 구간이 남아 있다: `lesson` → `subject 확인` → `enrollment 확인` → 병렬 묶음 1 → 병렬 묶음 2
- 아직 병렬화되지 않은 페이지: `announcements` 목록·상세, `courses/[courseId]/enroll/[cohortId]`(순차 await 10회, `supabase.auth.getUser()` 직접 호출로 cache 우회), `workbook/interview`, `app/page.tsx`, 관리자 페이지들(`admin/enrollments`는 순차 await 13회)
- `loading.tsx`가 `(main)` 루트에만 있다. 레슨·관리자 화면에는 맞는 스켈레톤이 없다.

---

## 2. 작업 항목

### T0. 현재 변경분 정리·검증 (P0)

1. `lib/supabase-server.ts` 줄바꿈을 LF로 되돌린다(HEAD와 동일하게). 내용 변경은 유지한다.
2. 아래 회귀 포인트를 코드로 확인한다.
   - `dashboard`: `totalLessons`가 이전과 같은 의미인지 확인 (이전 = 공개 여부와 관계없이 코스 전체 레슨 수, 완료 수 = 공개 레슨 기준). `enrollment.cohorts?.courses`가 null인 수강을 걸러내는 `filter`가 추가됨 — 의도된 동작인지 주석으로 남긴다.
   - `courses/page.tsx`: 비로그인일 때 `getProfile()`가 null을 반환하는지 확인 (cache된 `getUser` → null → 조기 return).
   - `lessons/[lessonId]`: restricted subject에서 `subjects` RLS가 행을 숨길 때 `notFound()`가 그대로 동작하는지 확인.
3. `app/(main)/loading.tsx`, `loading.module.css`를 커밋에 포함한다.
4. 커밋은 다음 2개로 나눈다.
   - `perf(server): getUser/getProfile 요청 단위 cache + 주요 페이지 쿼리 병렬화`
   - `feat(ui): (main) 라우트 로딩 스켈레톤`

**완료 기준**: `npm run build` 성공, `npm run lint` 신규 경고 없음, diff에 줄바꿈만 바뀐 줄이 없음.

### T1. Vercel 함수 리전을 서울(`icn1`)로 이동 (P0, 효과 최대)

1. 저장소 루트에 `vercel.json`을 추가한다.
   ```json
   {
     "regions": ["icn1"]
   }
   ```
2. 배포 후 해당 배포의 `regions`가 `["icn1"]`인지 확인한다(Vercel 대시보드 배포 상세, 또는 `vercel inspect <url>`).
3. 플랜 제약 등으로 반영되지 않으면 **작업을 멈추고 보고한다**. 이 경우 사람이 Vercel 프로젝트 설정의 Functions 항목에서 함수 리전을 Seoul(icn1)로 바꿔야 한다.
4. 영향 확인: `app/api/payments/checkout/route.ts`(토스페이먼츠)와 auth callback이 정상 동작하는지 확인한다. 리전만 바뀌므로 코드 변경은 필요 없을 것으로 예상된다.

**완료 기준**: production 배포 regions = `icn1`, 로그인 → 대시보드 → 강의 → 레슨 이동이 정상 동작.

### T2. 계측 도구 추가 (P1)

추정이 아니라 실측으로 판단하기 위해 가벼운 타이밍 로그를 넣는다.

1. `lib/perf.ts` 추가:
   ```ts
   // PERF_LOG=1 일 때만 서버 콘솔에 소요시간 출력
   export async function timed<T>(label: string, p: PromiseLike<T>): Promise<T> {
     if (process.env.PERF_LOG !== '1') return p as Promise<T>;
     const t = performance.now();
     try { return await p; }
     finally { console.log(`[perf] ${label} ${(performance.now() - t).toFixed(0)}ms`); }
   }
   ```
2. 아래 페이지의 각 await 구간과 페이지 전체를 `timed()`로 감싼다: `dashboard`, `cohorts/[cohortId]`, `curriculum`, `lessons/[lessonId]`
3. 측정 시나리오 (한국에서, 로그인 상태, Chrome DevTools Network에서 `?_rsc=` 요청의 TTFB 기록):
   `/dashboard` → 강의 카드 클릭 → 커리큘럼 → 레슨 → 사이드바에서 다음 레슨
4. 결과를 `docs/perf-results.md`에 표로 남긴다 (T1 전/후, T3 전/후). T1 전 값은 현재 production(iad1)에서 측정한다.

**완료 기준**: `PERF_LOG`가 없으면 로그 0줄. 측정표 작성 완료.

### T3. 레슨 페이지 waterfall 제거 (P1)

현재: `getUser` → [lesson, profile] → subject → enrollment → [progress, subjects, allLessons, videos] → [courseVideos, allProgress]
목표: `getUser` → [lesson, profile] → **[나머지 전부 한 번에]** (순차 왕복 3회)

1. `available_at` 공개 예정 체크는 IO가 없으므로 병렬 묶음 **앞**에 둔다. 미공개면 쿼리 없이 바로 return한다.
2. 아래를 하나의 `Promise.all`로 합친다 (모두 `lesson`/`course.id`/`user.id`만 필요).
   - subject 접근 확인 (`lesson.subject_id`가 있을 때만, `id, resources`, `maybeSingle`)
   - enrollment 확인 (현재 쿼리 그대로)
   - 현재 레슨 progress (`.single()` → `.maybeSingle()`로 변경. 행이 없을 때 PGRST116 에러 방지)
   - subjects, allLessons, 현재 레슨 videos
   - **코스 전체 영상 길이**: `lesson_videos`를 `lessons!inner(course_id)` 임베드로 `course_id` 필터 → `lessonIds` 의존을 없앤다
   - **코스 전체 진도**: `lesson_progress`도 같은 방식 (`user_id` + `lessons.course_id`)
3. 게이트 순서는 지금과 같게 유지한다: subject 없음 → `notFound()`, enrollment 없음 → 권한 없음 화면. **데이터를 병렬로 가져오되 렌더 전에 게이트를 판정**하면 된다.
4. 코스 단위로 가져온 영상·진도는 기존 `allLessons`(접근 가능한 subject 필터 적용 후)의 id Set으로 메모리에서 필터링한다. 지금과 결과가 같아야 한다.
5. FK 임베드(`lesson_videos.lesson_id → lessons.id`, `lesson_progress.lesson_id → lessons.id`)가 동작하지 않으면 2번의 임베드 대신 기존 2단계 방식을 유지하고, 나머지만 합친다.

**완료 기준**: T2 로그 기준 순차 구간 3개. 사이드바 진행률·총 강의시간·공통자료·restricted subject 차단 동작이 변경 전과 같음.

### T4. 나머지 학생 페이지 병렬화 (P2)

같은 패턴(`cache`된 `getUser`/`getProfile` 사용 + 의존 없는 쿼리 `Promise.all`)을 적용한다.

| 파일 | 할 일 |
|---|---|
| `courses/[courseId]/enroll/[cohortId]/page.tsx` | `supabase.auth.getUser()` 직접 호출 → `getUser()`. profile / course / cohort / 기존 수강 / 수강 인원 / lessons를 한 묶음으로. videos는 lessons 결과에 의존하면 T3처럼 `lessons!inner(course_id)`로 합치기 |
| `announcements/page.tsx` | `getProfile`와 enrollments 조회 병렬 |
| `announcements/[announcementId]/page.tsx` | `getProfile` / announcement / enrollment 병렬 (enrollment가 announcement의 cohort_id에 의존하면 profile만 병렬) |
| `workbook/interview/page.tsx` | `getInterviewWorkbookAccess`와 저장 답변 조회 병렬 (접근 권한 판정은 렌더 전에) |
| `app/page.tsx` | courses와 lessons count 병렬 |

**완료 기준**: 각 페이지 동작 동일, 순차 await 구간 감소를 T2 로그로 확인.

### T5. 관리자 영역 (P2)

1. `app/(admin)/layout.tsx`: `getProfile()` 이후 `getAdminBadgeCounts()`가 순차 실행됨 → 권한 판정에 필요한 profile 조회와 counts를 병렬로 실행하고, 판정은 결과를 받은 뒤에 한다. 비관리자에게 counts를 **렌더하지만 않으면** 된다.
2. `admin-counts.ts`의 `getAdminBadgeCounts`를 `React.cache()`로 감싼다 (layout과 `admin/page.tsx`가 같은 요청에서 두 번 호출함).
3. `admin/enrollments/page.tsx`(순차 await 13회): 의존 관계를 정리해 병렬화한다.
4. `app/(admin)/admin/loading.tsx` 추가: 사이드바는 layout에 있으므로 콘텐츠 영역 스켈레톤만.

### T6. 레슨 전용 로딩 UI (P3)

- `app/(main)/lessons/[lessonId]/loading.tsx`: 현재 레이아웃(상단바 + 좌측 사이드바 + 영상 영역)에 맞는 스켈레톤. 지금은 강좌 카드 모양 스켈레톤이 떠서 레슨 사이를 이동할 때 화면이 튄다.
- 체감 속도용이다. 실제 응답 시간은 줄지 않는다.

---

## 3. 하지 말 것 (가드레일)

- 서버 코드에서 `getUser()`를 `getSession()`으로 바꾸지 말 것. 서버에서 JWT 검증을 건너뛰게 된다.
- `unstable_cache`, `fetch` 캐시 등 **요청 간 캐시**에 사용자별 데이터를 넣지 말 것. `React.cache()`(요청 단위)만 허용한다.
- RLS 정책, 마이그레이션은 이번 범위가 아니다. Supabase advisor의 `auth_rls_initplan`(32건), `multiple_permissive_policies`(78건) 경고는 알고 있지만, 현재 데이터 규모(수강생 수십 명)에서는 효과가 작아 **보류**한다.
- `middleware.ts`의 `auth.getUser()`(세션 갱신·보호 경로)는 유지한다. 제거·우회가 필요해 보이면 T2 측정 결과와 함께 보고만 한다.
- 새 npm 의존성 추가 금지.
- 기존 파일의 줄바꿈(LF)과 한국어 주석 스타일을 유지한다.
- UI·디자인 변경 금지 (T5-4, T6 스켈레톤 추가는 예외).

## 4. 보고 형식

작업 완료 후 아래를 보고한다.
1. 커밋 목록 (항목 번호 T0~T6과 매핑)
2. `docs/perf-results.md` 측정표 (페이지별 RSC TTFB: T1 전 / T1 후 / 최종)
3. 동작이 바뀐 부분과 판단이 필요한 부분 (특히 T1 리전 반영 여부, T3-5 임베드 가능 여부)
