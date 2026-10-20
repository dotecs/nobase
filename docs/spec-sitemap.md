# 작업 명세서: 사이트맵 재편 1단계 — 공개 커리큘럼 랜딩 + 무료강의

- 대상 저장소: `nobase` (Next.js 15 App Router + Supabase + CSS Modules, Vercel 배포)
- 작성일: 2026-10-20
- 실행 주체: Codex
- 선행 상태: HEAD `a8abfd2`. 작업 트리가 깨끗한지 `git status`로 먼저 확인하고, 미커밋 변경이 있으면 건드리지 말고 보고 후 중단.
- 확정된 결정: 무료강의 게이트 = **B안** — 커리큘럼당 첫 무료 레슨 1개는 비로그인 재생, 그 외 무료 레슨은 로그인(카카오/구글) 후 재생

---

## 0. 요약 (먼저 읽을 것)

**지금 사이트에는 "수강생용 LMS"만 있고 "마케팅 사이트"가 없다.** 비로그인 방문자는 강좌 정보를 아무것도 볼 수 없다.

| 증상 | 실제 원인 | 근거 파일 |
|---|---|---|
| 홈에 "0개 강의 레슨" | RLS SELECT 정책이 전부 `auth.uid() IS NOT NULL` 요구 → 비로그인에게 빈 결과 | `supabase/migrations/010_fix_courses_rls.sql` |
| `/courses`가 비시즌에 빈 화면 | `cohorts.is_active` 기수가 있는 강좌만 표시, 등록 수강생에겐 그 강좌를 숨김 | `app/(main)/courses/page.tsx` 29~36행 |
| 커리큘럼 소개 페이지 없음 | `app/(main)/courses/[courseId]/page.tsx` 부재. 링크가 `/enroll/[cohortId]` 직행 | — |
| 무료강의 화면 없음 | `lessons.is_free`(008)와 어드민 토글은 있으나 뷰어 없음. `lesson_videos` SELECT가 `TO authenticated` | `007_lesson_videos.sql` 74행 |
| URL이 UUID | `courses.slug UNIQUE` 컬럼이 있으나 라우팅 미사용 | `app/(main)/courses/**` |
| 검색 노출 불가 | `app/sitemap.ts`, `app/robots.ts` 없음. `generateMetadata`는 약관·워크북에만 | — |
| 수강신청 비로그인 복귀 깨짐 | enroll 페이지가 `/login?redirect=`로 보내는데 로그인은 `returnTo`만 읽음 | `enroll/[cohortId]/page.tsx` 27행, `LoginForm.tsx` 11행 |

**목표 구조 (이번 단계)**

```
[공개 — 비로그인]
/                                   홈 (RLS 수정으로 숫자 정상화, 카드 → /courses/[slug])
/courses                            커리큘럼 카탈로그. 항상 노출. "모집중"/"수강중"/"무료 N개" 배지
/courses/[slug]                     커리큘럼 랜딩 — 광고·검색 랜딩
/courses/[slug]/free/[lessonId]     무료 레슨 뷰어 (B안)
/courses/[slug]/enroll/[cohortId]   수강 신청 (기존, 경로 파라미터만 slug 허용)
/sitemap.xml, /robots.txt

[학습 — 로그인]  이번 단계 변경 없음
/dashboard, /courses/[id]/cohorts/[id]/curriculum, /lessons/[id], /workbook/interview
```

**DB 변경**: 마이그레이션 1개 (`037`). anon SELECT 정책 추가(`courses`·`cohorts`·`lesson_videos`), `subjects` 정책 1개 교체, `lessons_public` 뷰 1개 신설(`resources` 제외), `profiles.lead_source` 컬럼 1개. 신규 테이블 없음. **`lessons` 테이블에는 anon 정책을 추가하지 않는다** (2026-10-20 개정, 사유는 T1).

**작업 순서**: T0 → T1 → T2 → T3 → T4 → T5 → T6. T1 없이는 T2~T5가 비로그인에게 아무것도 못 보여준다.

---

## 1. 실행 규칙 (Codex)

1. 브랜치 `feat/public-course-landing`에서 작업. 작업 항목(T1~T5)마다 커밋 1개. 커밋 메시지는 `feat(T2): 커리큘럼 랜딩 /courses/[slug]` 형식.
2. **이 명세에 없는 파일은 수정하지 않는다.** 리팩터링·포맷 정리·CRLF 변환 금지 (지난 작업에서 `lib/supabase-server.ts`가 CRLF로 바뀌어 diff가 오염된 적 있음). 줄바꿈은 LF.
3. 스타일은 CSS Modules. Tailwind·CSS-in-JS·UI 라이브러리 추가 금지. 새 의존성 추가 금지 (마크다운 라이브러리 포함 — T2에서 TS 파일로 해결).
4. 각 커밋 전 `npx tsc --noEmit` 통과. T5 뒤 `npm run build` 통과.
5. 마이그레이션은 **파일만 작성**한다. 실제 적용(`supabase db push` 또는 대시보드)은 사람이 한다. T6-5의 anon 검증도 사람이 한다 — 명세의 SQL을 결과 보고에 그대로 붙일 것.
6. 판단이 필요한 지점은 **임의로 결정하지 말고** 작업을 멈추고 질문을 보고서에 적는다. 단, §2의 "확인 후 분기" 항목은 코드를 읽고 스스로 결정한다.
7. 완료 보고 형식은 §7.

---

## 2. 전제 (Codex가 코드를 읽고 확인할 것)

| 항목 | 확인 방법 | 분기 |
|---|---|---|
| `profiles` 행이 언제 생기는가 | `database/schema/02_profiles.sql`, `supabase/migrations/020_*`의 트리거 | auth.users INSERT 트리거면 T3의 lead_source 로직을 콜백에서 처리. 아니면(complete-profile에서 생성) 그 지점에서 처리 |
| `VideoPlayer` 컴포넌트 의존성 | `app/(main)/lessons/[lessonId]/VideoPlayer.tsx` | 진도 저장(`/api/lessons/[id]/progress`) 호출이 안에 박혀 있으면 `disableProgress` prop 추가. 분리돼 있으면 그대로 재사용 |
| `getUser`/`getProfile` | `lib/supabase-server.ts` | `React.cache` 적용돼 있음. 새 페이지에서도 이 함수만 사용, `supabase.auth.getUser()` 직접 호출 금지 |
| 헤더 네비게이션 | `components/Header/Header.tsx` 78행 `{isLoggedIn && (<nav>` | 비로그인에는 nav 자체가 없음 → T4에서 수정 |

---

## 3. 작업 항목

### T0. 커밋 `2d7c2e1` 분리 (2026-10-20 추가)

`2d7c2e1 chore: preserve navigation performance changes and project materials`에 **소스와 무관한 자료**가 섞여 있다: `brain100-evidence.tgz`, `dowork-brand/`, `dowork-evidence/`(마크다운 다수). 이 파일들은 레포에 올라가면 안 된다. 브랜치가 아직 push되지 않았으므로 되돌리기 쉽다.

```bash
git reset --soft main                      # 2d7c2e1의 변경을 스테이지에 풀어놓기
git restore --staged brain100-evidence.tgz dowork-brand dowork-evidence
printf '\n# 로컬 자료 (레포 제외)\nbrain100-evidence.tgz\ndowork-brand/\ndowork-evidence/\ndowork-output/\n' >> .gitignore
git add .gitignore
git commit -m "chore: 페이지 이동 지연 개선분 커밋 + 사이트맵 명세 추가"   # 나머지(성능 변경, loading.tsx, docs/*)만
```

커밋 후 `git status`에서 위 세 경로가 untracked에도 보이지 않아야 한다(.gitignore 적용). `.claude/worktrees/` 하위는 건드리지 않는다.

**완료 조건**: `git show --stat HEAD`에 `dowork-*`, `brain100-*` 없음.

---

### T1. 비로그인 읽기 RLS + `lessons_public` 뷰 + `profiles.lead_source` (2026-10-20 개정)

**파일**: `supabase/migrations/037_public_read_and_lead_source.sql` (신규)

**개정 사유** (Codex 검토에서 발견)
1. `lessons`에 anon SELECT 정책을 추가하면 페이지에서 `resources`를 빼더라도 PostgREST(`/rest/v1/lessons?select=resources`)로 직접 조회된다. → `lessons` 테이블에는 anon 정책을 **추가하지 않고**, `resources`를 제외한 **뷰**를 만들어 그 뷰만 읽게 한다.
2. 기존 `subjects` 정책(`034`, "Subjects visible per visibility rule")은 역할 제한이 없고 `visibility='public'` 분기에 `auth.uid()` 조건이 없어 **이미 anon에게 열려 있다.** 소속 강좌 발행 여부도 보지 않는다. 정책은 OR 결합이라 추가만으로는 못 막으므로 이 정책 하나는 **교체**한다.

**1-1. anon SELECT 정책 추가** (기존 정책 유지)

| 테이블 | 정책명 | anon에 허용할 행 |
|---|---|---|
| `courses` | `courses_select_anon_public` | `is_published = TRUE` |
| `cohorts` | `cohorts_select_anon_public` | `is_active = TRUE` AND 소속 course `is_published = TRUE` |
| `lesson_videos` | `lesson_videos_select_anon_public` | 소속 lesson `is_free = TRUE AND is_published = TRUE` AND 그 course `is_published = TRUE` |

```sql
CREATE POLICY "lesson_videos_select_anon_public" ON lesson_videos
    FOR SELECT TO anon
    USING (EXISTS (
        SELECT 1 FROM lessons l JOIN courses c ON c.id = l.course_id
        WHERE l.id = lesson_videos.lesson_id
          AND l.is_free = TRUE AND l.is_published = TRUE AND c.is_published = TRUE
    ));
```

**1-2. `subjects` 정책 교체** — 같은 이름으로 DROP 후 재생성. 변경점은 `course.is_published` 조건 추가뿐이며, 관리자 분기는 그대로 둔다.

```sql
DROP POLICY IF EXISTS "Subjects visible per visibility rule" ON subjects;
CREATE POLICY "Subjects visible per visibility rule"
ON subjects FOR SELECT
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
    OR (
        is_published = true
        AND EXISTS (SELECT 1 FROM courses c WHERE c.id = subjects.course_id AND c.is_published = true)
        AND (
            visibility = 'public'
            OR EXISTS (SELECT 1 FROM subject_visibility sv
                       WHERE sv.subject_id = subjects.id AND sv.user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM subject_visibility_cohorts svc
                       JOIN enrollments e ON e.cohort_id = svc.cohort_id
                       WHERE svc.subject_id = subjects.id AND e.user_id = auth.uid() AND e.status = 'active')
        )
    )
);
```

**1-3. `lessons_public` 뷰** — `resources` 없음. 뷰 자체가 필터링하므로 `lessons` 테이블 RLS에 의존하지 않는다.

```sql
CREATE OR REPLACE VIEW lessons_public AS
SELECT l.id, l.course_id, l.subject_id, l.title, l.description,
       l.sort_order, l.is_free, l.available_at, l.created_at
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE l.is_published = TRUE AND c.is_published = TRUE;

COMMENT ON VIEW lessons_public IS '공개 목차용. resources(첨부자료) 제외. 발행 강좌의 발행 레슨만.';
GRANT SELECT ON lessons_public TO anon, authenticated;
```

뷰 소유자는 `postgres`이므로 기본(security definer)으로 기반 테이블 RLS를 우회한다 — 이것이 의도다. `security_invoker`를 **켜지 말 것** (켜면 anon이 `lessons` RLS에 막혀 빈 결과). T6-5에서 anon으로 실측한다.

`lib/database.types.ts`에 `lessons_public` 뷰 타입(`Views`)을 추가하거나, 없으면 `Pick<Lesson, ...>` 형태의 수동 타입을 `lib/courses.ts`에 둔다.

**1-4. `profiles.lead_source`**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_source VARCHAR(50);
COMMENT ON COLUMN profiles.lead_source IS '가입 경로. free_lesson: 무료강의 게이트에서 가입. NULL: 기타';
```
`lib/database.types.ts`의 `profiles` 타입에 `lead_source: string | null` 추가.

**앱 코드 규칙 (T2~T5 공통)**: 비로그인도 접근하는 페이지(`/`, `/courses`, `/courses/[slug]`, `/courses/[slug]/free/*`, `sitemap.ts`)에서 레슨 목록·레슨 수는 **반드시 `lessons_public`** 으로 조회한다. `lessons` 테이블 직접 조회는 로그인 전용 페이지(`/lessons/[id]`, curriculum, dashboard, admin)에만 남긴다. `courses` 임베드 `lessons(count)` 는 뷰로 대체 — `lessons_public`을 `course_id in (...)`로 한 번에 읽어 앱에서 센다.

**하지 말 것**: `lessons`, `enrollments`, `lesson_progress`, `profiles`, `announcements`, `lesson_questions`, `lesson_answers`, `interview_workbook_*`, `subject_visibility*`에 anon 정책 추가 금지.

**완료 조건**: 마이그레이션 파일이 T6-5 SQL과 일치. 사람 적용 후 T6-5 통과.

---

### T2. 커리큘럼 랜딩 `/courses/[slug]`

**파일**
- `lib/courses.ts` (신규): `isUuid(s)`, `resolveCourse(param)`, `courseHref(course)`, `getFirstFreeLesson(courseId)`
- `content/courses/types.ts` (신규): `CourseLanding` 타입
- `content/courses/index.ts` (신규): `getCourseLanding(slug): CourseLanding | null`
- `content/courses/brain-training-100.ts` (신규): 뇌지컬트레이닝100 본문 — **내용은 placeholder로 두고 TODO 주석**. 실제 카피는 사람이 채운다. slug는 DB의 실제 `courses.slug` 값을 조회해 맞출 것 (어드민 또는 `003_seed_data.sql` 참고). 값이 비어 있거나 UUID스러우면 보고서에 적고 `brain-training-100` 가정으로 진행
- `app/(main)/courses/[courseId]/page.tsx` (신규) + `course.module.css`
- 수정: `app/(main)/courses/[courseId]/enroll/[cohortId]/page.tsx`, `cohorts/[cohortId]/page.tsx`, `cohorts/[cohortId]/curriculum/page.tsx` — `courseId` 파라미터를 `resolveCourse`로 받도록. 조회 로직 변경은 그것뿐, 나머지 코드는 손대지 않는다.
- 수정 (2026-10-20 추가): `lib/supabase-middleware.ts` 92행 — `protectedPaths`에 `/courses`가 통째로 들어 있어 새 공개 경로가 전부 로그인으로 307 이동한다. 아래처럼 바꾼다. 다른 줄은 손대지 않는다 (110행은 T3에서 별도 수정).

```ts
// 92~95행 교체
const protectedPrefixes = ['/dashboard', '/lessons', '/announcements', '/start/confirm', '/start/done', '/workbook']
const protectedCoursePattern = /^\/courses\/[^/]+\/(enroll|cohorts)(\/|$)/   // 신청·학습 경로만 보호
const pathname = request.nextUrl.pathname
const isProtectedPath =
  protectedPrefixes.some(path => pathname.startsWith(path)) ||
  protectedCoursePattern.test(pathname)
```

공개로 풀리는 경로: `/courses`, `/courses/[slug]`, `/courses/[slug]/free/*`. 계속 보호: `/courses/[slug]/enroll/*`, `/courses/[slug]/cohorts/*`, 그 외 기존 목록 전부. 무료 레슨의 "두 번째부터 로그인" 판정은 미들웨어가 아니라 T3 페이지가 한다.

**라우팅 규칙**
- `isUuid`: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- `resolveCourse(param)`: UUID면 `id`로, 아니면 `slug`로 `courses` 조회. 없으면 `null` → 페이지에서 `notFound()`.
- `/courses/<uuid>` 로 들어오면 `/courses/<slug>` 로 `redirect()` (Next `redirect`는 307; 그대로 둔다). `enroll`·`cohorts` 하위 경로는 UUID로 들어와도 **리다이렉트하지 않고 그냥 동작**시킨다 — 센드맨·스마트스토어에 박힌 링크가 깨지면 안 된다.
- 앱 내부 링크 생성은 모두 `courseHref(course)` = `/courses/${course.slug ?? course.id}`.

**랜딩 본문 타입**
```ts
// content/courses/types.ts
export interface CourseLanding {
  tagline: string;                       // 히어로 한 줄
  audience: string[];                    // "이런 분을 위한 과정"
  outcomes: string[];                    // "끝나면 할 수 있는 것"
  body: { heading: string; paragraphs: string[] }[];  // 자유 서술 섹션
  testimonials: { name: string; text: string }[];
  faq: { q: string; a: string }[];
}
```
`getCourseLanding`은 slug → 모듈 매핑 객체(정적 import)로 구현. 동적 `import()` 금지.

**페이지 구성 (위→아래)**
1. 히어로: `course.title`, `landing.tagline`(없으면 `course.description`), 썸네일, **주 CTA** (아래 규칙)
2. 무료 레슨 블록: `is_free AND is_published` 레슨. 첫 번째는 "로그인 없이 바로 보기", 나머지는 "로그인 후 보기" 라벨. 링크 `/courses/[slug]/free/[lessonId]`
3. 커리큘럼 목차: `subjects`(public) → `lessons` 제목 전체. 과목 수·레슨 수 표시. 무료 레슨에 배지
4. `audience` / `outcomes` / `body` / `testimonials` / `faq` — landing 파일이 없으면 이 영역 전체 생략
5. 모집 기수: `cohorts.is_active` 기수 있으면 `price`·`starts_at`·"신청하기" → `/courses/[slug]/enroll/[cohortId]`. 없으면 "다음 기수 알림 받기" → `/login?returnTo=/courses/[slug]` (비로그인) / 안내 문구만 (로그인)

**주 CTA 규칙** (위에서부터 첫 매칭)
| 상태 | CTA |
|---|---|
| 로그인 + 이 강좌 `active` 등록 있음 | "이어서 학습하기" → `/courses/[course.id]/cohorts/[cohortId]/curriculum` (기존 학습 경로, UUID 그대로) |
| 활성 기수 있음 | "수강 신청" → enroll |
| 첫 무료 레슨 있음 | "무료 레슨 보기" → free |
| 그 외 | "다음 기수 알림 받기" |

"첫 번째 무료 레슨" 정의 = `is_free AND is_published` 레슨을 (`subjects.sort_order`, `lessons.sort_order`, `lessons.created_at`) 오름차순 정렬한 1번. `subject_id`가 NULL인 레슨은 맨 뒤. 이 함수(`getFirstFreeLesson`)를 T3·T5가 공유하며 `lessons_public`을 읽는다.

**쿼리**: `getUser`+`getProfile`, course+cohorts, subjects+`lessons_public`, enrollment 확인 — 3묶음 `Promise.all`. 목차·무료 레슨은 **`lessons_public` 뷰**로만 조회 (`lessons` 테이블 금지, T1 규칙).

**메타데이터**: `generateMetadata` — title `${course.title} | 노베이스구조대`, description = tagline ?? course.description, openGraph.images = thumbnail_url (있을 때).

**완료 조건**: 시크릿 창에서 `/courses`, `/courses/<slug>`가 로그인 없이 열리고 목차 전체 + 무료 레슨 블록 표시. `/courses/<uuid>` → slug로 리다이렉트. 비로그인으로 `/courses/<slug>/enroll/<cohortId>`, `/courses/<slug>/cohorts/<id>/curriculum` 접근 시 여전히 `/login?returnTo=…`로 이동. 기존 `/courses/<uuid>/enroll/<cohortId>` 로그인 후 정상 동작.

---

### T3. 무료 레슨 뷰어 `/courses/[slug]/free/[lessonId]` (B안 게이트)

**파일**
- `app/(main)/courses/[courseId]/free/[lessonId]/page.tsx` (신규) + `free.module.css`
- `VideoPlayer` 재사용: `app/(main)/lessons/[lessonId]/VideoPlayer.tsx`를 `components/VideoPlayer/VideoPlayer.tsx`로 **이동**하고 원래 위치에 `export { default } from '@/components/VideoPlayer/VideoPlayer'` 한 줄 남김. §2 분기에 따라 `disableProgress?: boolean` prop 추가
- 수정: `app/auth/callback/route.ts` (returnTo 검증 + lead_source), `app/(main)/courses/[courseId]/enroll/[cohortId]/page.tsx` 27행 (`redirect=` → `returnTo=`)

**접근 규칙 (서버 컴포넌트, 위에서부터 첫 매칭)**
| 조건 | 결과 |
|---|---|
| 레슨 없음 / `is_free = FALSE` / `is_published = FALSE` / 다른 강좌 소속 | `notFound()` |
| 로그인 + 이 강좌 `active` 등록 | `redirect('/lessons/[lessonId]')` — 진도 기록되는 수강생 화면 |
| 이 강좌의 첫 번째 무료 레슨 (`getFirstFreeLesson`) | 누구나 재생 |
| 비로그인 | `redirect('/login?returnTo=/courses/[slug]/free/[lessonId]')` |
| 로그인 | 재생 |

쿠키·세션으로 "1개 봤음"을 세지 **않는다.** 첫 레슨은 고정 URL이어야 광고 링크로 쓰고 검색 인덱싱된다.

**화면**: `Header` + `VideoPlayer`(main 영상, 진도 저장 끔) + 레슨 제목·설명 + "이 강좌의 무료 레슨" 목록(현재 레슨 강조, 잠긴 레슨에 자물쇠) + 하단 CTA(T2 주 CTA 규칙 재사용). 레슨 정보는 **`lessons_public`** 으로 읽는다(`resources` 컬럼 자체가 없음). 레슨 질문(`lesson_questions`)도 표시하지 않는다.

**로그인 복귀 (`app/auth/callback/route.ts`)**
- `returnTo` 검증 함수 `safeReturnTo(raw)`: `/`로 시작하고 `//`로 시작하지 않으며 `:`를 포함하지 않는 상대경로만 허용. 그 외 `/dashboard`. 현재 코드는 `new URL(returnTo, origin)`에 그대로 넣어 절대 URL이 오면 외부로 튄다 — 이 함수로 감싼다.
- `lead_source`: 세션 획득 후, `returnTo`가 `^/courses/[^/]+/free/` 패턴이고 **신규 가입**(`session.user.created_at`이 현재 시각 기준 5분 이내)이면 `profiles.lead_source = 'free_lesson'`을 `createAdminSupabaseClient()`로 UPDATE (`lead_source IS NULL`일 때만). §2 분기 결과 profiles 생성이 complete-profile에서 일어나면 그쪽에서 같은 규칙 적용.
- `safeReturnTo`는 `lib/safe-return-to.ts`로 분리해 두 곳에서 쓴다: `app/auth/callback/route.ts`(8행, 92행, 99행)와 **`lib/supabase-middleware.ts` 110행** (로그인 상태로 `/login?returnTo=https://evil.example` 접근 시 외부로 튐 — 같은 결함). (2026-10-20 추가)
- `LoginForm.tsx`는 이미 `returnTo`를 `/auth/callback?returnTo=`로 넘기고 있음 — 수정 불필요.

**완료 조건**: 시크릿 창에서 첫 무료 레슨 재생 → 두 번째 무료 레슨 클릭 → 로그인 → 그 레슨으로 복귀 → `profiles.lead_source = 'free_lesson'` (신규 계정일 때).

---

### T4. 카탈로그 `/courses` 상시 노출 + 홈 + 헤더

**`app/(main)/courses/page.tsx`**
- 29~36행 필터 제거: `is_published` 강좌 전부 표시. 활성 기수 유무·등록 여부로 숨기지 않는다.
- 카드 전체 링크 → `courseHref(course)`. 기수별 "신청하기" 링크는 유지(→ enroll).
- 배지 (위에서부터 첫 매칭): 로그인 + `active` 등록 → "수강중"(카드 링크는 curriculum 경로로) / 활성 기수 있음 → "모집중" / 무료 레슨 있음 → "무료 레슨 N개" / 없음 → 배지 없음
- 제목 "수강 신청" → "커리큘럼", 부제 유지. 빈 상태 문구는 `is_published` 강좌가 0개일 때만.
- 정렬 `created_at desc` 유지.

**`app/page.tsx`**
- 강좌 카드 링크 → `courseHref`. 히어로 "모집 중인 강좌 보기" → "커리큘럼 보기"(`/courses`). 활성 기수가 하나라도 있으면 버튼 옆 "모집중" 배지.
- 레슨 총수(33행)와 강좌 카드의 `lessons(count)` 임베드(21행)는 **`lessons_public`** 조회로 교체 (뷰는 발행 레슨만 담으므로 조건 불필요). T1 적용 후 비로그인에도 0이 아닌지 확인.

**`components/Header/Header.tsx`**
- 78행 `{isLoggedIn && (<nav>` → nav를 항상 렌더. 비로그인: `홈`, `커리큘럼`(`/courses`). 로그인: 기존 항목 + "수강신청" 라벨을 "커리큘럼"으로. 모바일 햄버거(≈120행 `{isLoggedIn && (<button`)도 같은 조건으로 완화. 모바일 메뉴(167~194행 부근) 동일 적용.

**완료 조건**: 비로그인 시크릿 창에서 `/` → 헤더 "커리큘럼" → `/courses`에 발행 강좌 전부 → 카드 클릭 → `/courses/[slug]`.

---

### T5. sitemap / robots / 메타데이터

**파일**: `app/sitemap.ts`, `app/robots.ts` (신규), `app/layout.tsx` (수정)

- `app/layout.tsx` metadata에 `metadataBase: new URL('https://nobase911.com')` 추가. 다른 필드는 손대지 않는다.
- `sitemap.ts`: `/`, `/courses`, 발행 강좌별 `/courses/[slug]`, 강좌별 첫 무료 레슨 `/courses/[slug]/free/[lessonId]`. Supabase 서버 클라이언트(anon)로 `courses` + `lessons_public` 조회 — T1 정책으로 충분해야 한다. 그 외 경로 포함 금지.
- `robots.ts`: `disallow: ['/admin', '/dashboard', '/lessons', '/api', '/start', '/payments', '/workbook', '/auth', '/dev-login', '/math-test', '/complete-profile']`, `sitemap: 'https://nobase911.com/sitemap.xml'`.
- T3 페이지 `generateMetadata`: 첫 무료 레슨은 index 허용, 그 외(로그인 필요)는 `robots: { index: false, follow: false }`.

**완료 조건**: `/sitemap.xml`에 공개 경로만. `/robots.txt` 정상. `npm run build` 통과.

---

### T6. 검증 체크리스트

| # | 확인 | 방법 | 수행 |
|---|---|---|---|
| 1 | 비로그인 `/`에서 레슨 수 ≠ 0 | 시크릿 창 | 사람 (T1 적용 후) |
| 2 | 비로그인 `/courses/[slug]` 목차 전체 표시 | 시크릿 창 | 사람 |
| 3 | 비로그인 첫 무료 레슨 재생, 브라우저 콘솔 Vimeo 오류 없음 | 시크릿 창 | 사람 |
| 4 | 두 번째 무료 레슨 → 로그인 → 카카오 → 복귀 → `lead_source` 기록 | 시크릿 창 + Supabase 테이블 | 사람 |
| 5 | anon으로 유료 영상 미조회 | 아래 SQL | 사람 |
| 6 | 비로그인 응답에 `resources` URL 없음 | 페이지 소스에서 `storage` 검색 + `curl -H "apikey: <anon key>" "$SUPABASE_URL/rest/v1/lessons?select=resources"` 가 빈 배열/권한 오류 | Codex (`curl`) |
| 7 | 기존 `/courses/<uuid>/enroll/<cohortId>` 동작 | 센드맨 발송 링크 1개 | 사람 |
| 8 | 수강 중 계정 `/courses/[slug]` → "이어서 학습하기" | 테스트 계정 | 사람 |
| 9 | `/sitemap.xml`에 학습·관리자 경로 없음 | 직접 열기 | Codex |
| 10 | `npx tsc --noEmit`, `npm run build` | CI | Codex |
| 11 | `returnTo=https://evil.example` 로 (a) 비로그인 로그인 플로우, (b) 로그인 상태에서 `/login?returnTo=…` 접근 — 둘 다 `/dashboard`로 떨어짐 | 직접 | Codex (유닛 테스트 또는 수동) |

T6-5 SQL (Supabase SQL editor):
```sql
set role anon;
select count(*) from lessons;                              -- 0  (테이블 직접 조회 불가)
select count(*) from lessons_public;                       -- 발행 강좌의 발행 레슨 수 (> 0)
select count(*) from lessons_public lp join courses c on c.id = lp.course_id where c.is_published = false;  -- 0
select count(*) from subjects s join courses c on c.id = s.course_id where c.is_published = false;          -- 0
select count(*) from subjects where visibility = 'restricted';                                              -- 0
select count(*) as free_videos from lesson_videos;        -- 무료 레슨 영상 수와 같아야 함
select count(*) from lesson_videos v where not exists (select 1 from lessons_public lp where lp.id = v.lesson_id and lp.is_free);  -- 0
select count(*) from enrollments;                          -- 0
select count(*) from lesson_progress;                      -- 0
reset role;
```

---

## 4. 범위 밖 (이 명세에서 하지 말 것)

- `/programs/[track]` 시장별 랜딩, `courses.track` 컬럼 — 두 번째 시장 확정 후
- `/learn/[slug]/...` 로 학습 경로 이전 + 리다이렉트
- 어드민 랜딩 본문 편집 UI
- 홈 전면 리디자인, 디자인 시스템 변경
- 뇌지컬트레이닝100 랜딩 카피 작성 (placeholder + TODO만)

---

## 5. 이 단계가 끝나면 생기는 신시장 런칭 템플릿

1. 어드민에서 강좌 생성(`slug` 지정) + 과목/레슨 등록, 무료로 풀 레슨 2~3개 `is_free` 체크
2. `content/courses/<slug>.ts` 작성 (`brain-training-100.ts` 복사)
3. 기수 생성 → `/courses/<slug>`가 곧바로 광고 랜딩

코드 변경 없음.

---

## 6. 측정 (적용 후 다음 모집까지)

| 지표 | 출처 |
|---|---|
| `/courses/[slug]` 방문 → 첫 무료 레슨 재생 | Vercel Web Analytics 페이지뷰 (별도 구현 없음) |
| 무료강의 경유 가입 수 | `select count(*) from profiles where lead_source = 'free_lesson'` |
| 그 중 다음 기수 등록 | `profiles.lead_source = 'free_lesson'` ∩ `enrollments` |

---

## 7. 완료 보고 형식

```
## 결과
- 커밋 목록 (해시 + 메시지)
- tsc / build 결과

## §2 전제 확인 결과
- profiles 생성 시점: ...
- VideoPlayer 분기: ...

## 사람이 해야 할 것
1. 마이그레이션 037 적용
2. T6-1,2,3,4,5,7,8 수동 검증
3. content/courses/brain-training-100.ts 카피 채우기

## 질문 / 명세와 다르게 한 것
- (없으면 "없음")
```
