# 작업 명세서: 적응형 학습 모듈 Phase 0 — 운영 DB 위 개발 안전망

- 대상 저장소: `nobase` (Next.js 15 App Router + Supabase + CSS Modules, Vercel 배포)
- 작성일: 2026-10-26
- 실행 주체: Codex / 검수: Claude
- 선행 상태: HEAD `109e28a` (main, 2026-10-26 정리 커밋 2개 포함). `git status`로 작업 트리가 깨끗한지 먼저 확인. 미커밋 변경이 있으면 건드리지 말고 보고 후 중단.
- 상위 문서: 「노베이스 적응형 수학 학습 MVP 설계안」(Claude Docs, 2026-10-26). 이 명세는 설계안 §8 Phase 0을 실행 단위로 옮긴 것이다.
- 확정된 결정 (2026-10-26)
  1. **개발/운영 환경을 분리하지 않는다.** Supabase 프로젝트 `nobase911` 하나에서 바로 개발한다. 대신 아래 P0-1 규칙이 시작 조건이다.
  2. 커리큘럼의 뼈대는 교재 「뿌리 깊은 수학」 단원·소주제 순서다. 1차 범위 01~06단원.
  3. LLM은 OpenAI를 먼저 쓰고 Anthropic으로 교체 가능하게 만든다. 제공자 선택은 환경변수가 아니라 DB 설정(`learn_rule_configs`)으로 한다. 환경변수에는 API 키만 둔다 (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY` — Vercel Production/Preview와 로컬 `.env.local`에 이미 설정됨).

---

## 0. 요약 (먼저 읽을 것)

**이 Phase는 기능을 만들지 않는다.** 수강생 24명이 쓰는 운영 DB 위에서 학습 모듈(테이블 10개 이상)을 개발해도 기존 서비스가 다치지 않도록 규칙·도구·테스트 뼈대를 먼저 놓는다.

| 왜 필요한가 | 확인한 사실 | 근거 |
|---|---|---|
| 운영 DB 하나뿐 | Supabase 프로젝트 `nobase911` 1개, 브랜치 없음, Edge Function 없음 | Supabase MCP `list_branches` (2026-10-26) |
| 마이그레이션 이력 불일치 | 레포 `supabase/migrations/001~039`는 SQL Editor 수동 적용 전제. 원격 이력에는 6건만 기록(2026-07~10 MCP 적용분) | MCP `list_migrations` |
| 레포에 없는 원격 스키마 | `payments` 테이블(토스 결제, 2026-08-10), `enrollment_status`의 `pending` 값, `migrated_*` 테이블 RLS | 원격 이력 `create_payments_table`, `add_pending_to_enrollment_status`, `enable_rls_migrated_tables` |
| 자동 테스트 0건 | `package.json`에 test 스크립트 없음 | `package.json` |
| 수식 파서 중복 | `$…$`/`$$…$$` 파서가 `AnswerForm.tsx`와 `QuestionCard.tsx`에 각각 구현 | `app/(admin)/admin/questions/AnswerForm.tsx`, `app/(main)/lessons/[lessonId]/QuestionCard.tsx` |
| 로컬 개발이 운영 DB를 바라봄 | `.env.local`의 Supabase URL = 운영 | `.env.local` (값은 보지 말 것) |

**작업 순서**: P0-1 → P0-2 → P0-3 → P0-4 → P0-5. P0-1은 문서라 30분, 나머지는 각 1~2시간 규모.

---

## 1. 실행 규칙 (Codex)

1. 브랜치 `feat/learn-phase0`. 작업 항목마다 커밋 1개. 메시지 `chore(P0-3): Vitest 도입` 형식.
2. **이 명세에 없는 파일은 수정하지 않는다.** 리팩터링·포맷 정리·CRLF 변환 금지. 줄바꿈 LF.
3. 새 의존성은 P0-3의 `vitest`(devDependency)만 허용. 그 외 금지.
4. 각 커밋 전 `npx tsc --noEmit` 통과. 마지막에 `npm run build`, `npm test` 통과.
5. **운영 DB에 쓰는 코드·스크립트를 실행하지 않는다.** P0-2의 스키마 조회 스크립트는 `information_schema`·`pg_catalog` SELECT만 한다. 마이그레이션 파일은 작성만 하고 적용은 대표가 한다.
6. `.env.local`의 값을 읽거나 출력하지 않는다. 키 이름만 다룬다.
7. 판단이 필요한 지점은 임의로 결정하지 말고 보고서 "질문" 절에 적고 멈춘다. §2 "확인 후 분기" 항목만 스스로 결정한다.
8. 완료 보고 형식은 §6.

---

## 2. 전제 (Codex가 코드를 읽고 확인할 것)

| 항목 | 확인 방법 | 분기 |
|---|---|---|
| `lessons_public` 뷰가 원격에 있는가 | `lib/database.types.ts`의 Views, 레포 037/038 | 있음이 전제. 없으면 P0-2 보고서에 기록 |
| 두 수식 파서의 차이 | `AnswerForm.tsx` 9~70행, `QuestionCard.tsx`의 KaTeX 사용부 | 동작이 다르면 **합집합**으로 통합하고 차이를 보고서에 적는다. 렌더 결과가 바뀌면 안 된다 |
| `react-katex` 타입 | `lib/react-katex.d.ts` | 그대로 사용 |
| ESLint 설정 | `.eslintrc.json` | Vitest 파일이 lint 대상이면 `**/*.test.ts`에 필요한 env만 추가 |

---

## 3. 작업 항목

### P0-1. 운영 DB 위 개발 규칙 문서 `docs/learn-db-rules.md`

Phase 1 이후 모든 학습 모듈 작업이 따르는 규칙. 내용은 아래를 그대로 옮기고 Codex가 보완할 것은 없다.

```
# 학습 모듈(learn_*) DB 작업 규칙

적용 대상: supabase/migrations/040_* 이후의 모든 파일, lib/learn/**, app/(main)/learn/**, app/(admin)/admin/learn/**

1. 추가만 한다. CREATE TABLE / CREATE INDEX / CREATE POLICY / CREATE FUNCTION / ALTER TABLE ... ADD COLUMN 만 허용.
2. learn_ 접두사가 없는 기존 테이블·정책·함수·트리거·뷰는 수정·삭제하지 않는다. (예외: 없음. 필요하면 명세에 적고 대표 승인)
3. DROP / TRUNCATE / DELETE / ALTER COLUMN TYPE 금지. 롤백 SQL은 같은 파일 하단에 주석(-- ROLLBACK:)으로 동봉한다.
4. 적용은 대표가 Supabase MCP apply_migration 또는 SQL Editor로 한다. 적용 직전 대시보드 백업(또는 supabase db dump) 1회.
5. 모든 learn_ 테이블은 RLS ENABLE. 정책은 "본인 행 읽기 + 본인 insert" 또는 "admin 전체"만. 학습자에게 UPDATE/DELETE 정책을 주지 않는다.
6. 테스트 계정은 /dev-login으로 만들고 profiles.name을 "[TEST] "로 시작한다. 코칭 과정 cohort는 is_active=false로 두어 공개 목록에 노출하지 않는다.
7. /learn 경로는 해당 course('root-math')에 active enrollment가 있는 계정만 진입한다.
8. 파일명 번호는 040부터 순차. 한 파일 = 한 목적. 파일 상단 주석에 목적·적용 여부·적용일을 적는다.
9. API 키·시크릿은 서버 환경변수만. NEXT_PUBLIC_ 접두사 금지. 코드·로그·보고서에 값 출력 금지.
```

**완료 기준**: 파일 존재, 위 9개 항목 포함. 이후 Phase의 마이그레이션 초안이 1~3을 위반하면 검수에서 반려.

### P0-2. 원격 전용 스키마 역추적 문서화

목적: 레포 파일만으로 운영 스키마를 재현할 수 없는 상태를 기록으로 메운다. **적용하지 않는다.**

> 2026-10-26 개정: Data API(PostgREST)로는 `information_schema`·`pg_catalog`를 조회할 수 없으므로 스크립트 작성 항목을 삭제한다. 대신 Claude가 Supabase MCP로 읽기 전용 조회한 결과를 `docs/db/remote-schema-2026-10-26.md`에 넣어 두었다. Codex는 **이 파일만 근거로** 작성하고 추측하지 않는다.

1. `supabase/migrations/039b_remote_only_schema.sql` 작성. 상단 주석: `-- 원격(nobase911)에 MCP/대시보드로 기적용된 스키마의 역추적본. 새 환경 재현용. 운영에 다시 적용하지 말 것. 근거: docs/db/remote-schema-2026-10-26.md`. 내용 3블록, 각 블록에 원격 마이그레이션 이름을 주석으로:
   - `ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'active';` (`20260707063000_add_pending_to_enrollment_status`)
   - `ALTER TABLE migrated_profiles ENABLE ROW LEVEL SECURITY;` 외 2개 테이블 (`20260707062847_enable_rls_migrated_tables`, 정책 없음이 의도)
   - `CREATE TABLE IF NOT EXISTS payments (...)` + 인덱스 2개 + RLS ENABLE + 정책 `payments_select_own` + 코멘트 (`20260810070703_create_payments_table`). 컬럼·제약·기본값은 문서의 표와 글자 단위로 일치시킨다.
2. `database/README.md`에 "마이그레이션 적용 이력" 절 추가: 레포 001~039b 각각 수동(SQL Editor)/MCP/미확인 표. 034~036은 파일 주석에 MCP 적용이라 적혀 있고, 037·038은 "수동 적용" 주석이 있다. 그 외는 "미확인"으로 둔다.
3. `lib/database.types.ts`에 `payments` 테이블 타입과 `enrollment_status`의 `'pending'`을 수동 추가(현재 `app/api/payments/checkout/route.ts`가 `as never`로 우회 중 — 그 우회는 **건드리지 않는다**, 타입만 추가).
4. ~~`.env.local.example`에 LLM 키 이름 추가~~ — **이미 완료됨**(커밋 `109e28a`). 건드리지 않는다.

**완료 기준**: `039b`의 테이블·컬럼·enum·정책이 `docs/db/remote-schema-2026-10-26.md`와 일치(검수에서 대조). 파일에 `DROP`·`DELETE` 없음. `npx tsc --noEmit` 통과.
### P0-3. Vitest 도입

1. `npm i -D vitest` (버전은 설치 시점 최신 안정). `package.json` scripts에 `"test": "vitest run"`, `"test:watch": "vitest"`.
2. `vitest.config.ts`: `test.include = ['lib/**/*.test.ts', 'lib/**/*.test.tsx']`, `environment: 'node'`. 경로 별칭 `@/` 는 `tsconfig.json`의 `paths`와 동일하게.
3. `lib/learn/README.md`(짧게: 이 폴더는 순수 함수만, Supabase 클라이언트 import 금지, 모든 규칙 값은 인자로 받음).
4. `lib/learn/version.test.ts` — `export const LEARN_MODULE_VERSION = '0.1.0'`를 가진 `lib/learn/version.ts`와 그것을 검사하는 테스트 1개.

**완료 기준**: `npm test` 통과, `npm run build` 영향 없음, `npx tsc --noEmit` 통과.

### P0-4. 수식 마크다운 파서 통합 `lib/math-markdown.tsx`

> 2026-10-26 개정: "기존 렌더 유지"가 우선이다. 닫히지 않은 `$`는 두 화면 모두 지금처럼 **일반 텍스트로** 둔다. KaTeX 파싱 실패 시의 차이(관리자=오류 문구, 수강생=원문)는 옵션으로 보존한다.

1. `renderMathMarkdown(text: string, opts?: { onError?: 'message' | 'raw'; blockClassName?: string; errorClassName?: string }): React.ReactNode[]`. 기본 `onError: 'raw'`(수강생 화면 동작). 관리자 `AnswerForm.tsx`는 `onError: 'message'`로 호출.
2. 두 파일은 새 함수를 호출하도록만 바꾼다. 각 화면의 렌더 결과는 변경 전과 동일해야 한다.
3. `lib/math-markdown.test.tsx` 4개: (a) `$$` 블록 1개, (b) `$` 인라인 2개가 섞인 문장, (c) 닫히지 않은 `$`가 **일반 텍스트로** 그대로 출력, (d) KaTeX가 던지는 잘못된 수식(예 `$rac{$`)에서 `onError:'message'`면 오류 노드, `'raw'`면 원문 노드. jsdom이 필요하면 해당 테스트 파일에만 `// @vitest-environment jsdom` + `jsdom` devDependency(이 경우만 의존성 1개 추가 허용).

**완료 기준**: 테스트 4개 통과. 관리자 답변 화면·수강생 질문 카드 스크린샷 전/후 동일(보고서 첨부).
### P0-5. 학습 모듈 코드 골격 (빈 껍데기)

Phase 1에서 채울 자리만 만든다. 로직 없음.

```
lib/learn/
  version.ts
  types.ts              // AbilityId, UnitId, AttemptResult enum 등 타입만 (설계안 §3·§4 enum 값 그대로)
  llm/provider.ts       // interface LlmProvider { extractItemsFromImage(...); completeJson(...) }  + createProvider(name): 'openai'|'anthropic'|'mock' → 각 구현 파일은 Phase 1
  rules/README.md       // "규칙 값은 learn_rule_configs에서 읽어 인자로 넘긴다"
```

`types.ts`의 enum:
- `AttemptResult = 'correct_independent' | 'correct_assisted' | 'incorrect' | 'no_response' | 'input_issue' | 'pending_review'`
- `AbilityState = 'unknown' | 'needs_repair' | 'learning' | 'verified' | 'retained' | 'recheck'`
- `AnswerType = 'number' | 'fraction' | 'choice' | 'photo' | 'text'`
- `ItemUsage = 'diagnostic' | 'practice' | 'assessment' | 'review'`

**완료 기준**: `npx tsc --noEmit` 통과. 런타임 코드 0줄(타입·인터페이스·주석만).

---

## 4. 범위 밖 (이 명세에서 하지 말 것)

- `learn_*` 테이블 생성, 콘텐츠 팩, 관리자 화면, 학습자 화면 — Phase 1·2
- LLM 실제 호출 — Phase 1 (P1-6)
- 레거시 Supabase 환경변수·`payments` 테이블 정리(삭제) — 대표 결정 후 별도
- dev Supabase 프로젝트·브랜치 생성 — 하지 않기로 결정됨

---

## 5. 검증 체크리스트 (Claude 검수 항목)

| # | 확인 | 방법 | 수행 |
|---|---|---|---|
| 1 | `docs/learn-db-rules.md` 9개 항목 | 파일 읽기 | Claude |
| 2 | `039b`에 `DROP`·`DELETE`·`TRUNCATE` 없음 | 파일 검색 | Claude |
| 3 | `039b` 내용이 `docs/db/remote-schema-2026-10-26.md`와 일치 | 표 vs 파일 대조 | Claude |
| 4 | `039b`가 적용되지 않았음 | Supabase MCP `list_migrations`에 없음 | Claude |
| 5 | `npm test`, `npx tsc --noEmit`, `npm run build` 통과 | 로그 | Codex 로그 + Claude 재실행 |
| 6 | 수식 렌더 전/후 동일 | 스크린샷 2쌍 | Claude |
| 7 | 명세 밖 파일 변경 없음 | `git diff --stat main..feat/learn-phase0` | Claude |
| 8 | `.env.local` 값이 어디에도 출력되지 않음 | 보고서·커밋 검색 `sk-`, `eyJ` | Claude |

---

## 6. 완료 보고 형식

```
## 결과
- 커밋 목록 (해시 + 메시지)
- npm test / tsc / build 결과

## §2 전제 확인 결과
- lessons_public 존재 여부: ...
- 두 파서의 차이와 통합 방식: ...

## P0-2 스크립트 출력 (스키마 전문)
...

## 사람이 해야 할 것
1. (없음 — 이 Phase는 적용할 마이그레이션이 없다)

## 질문 / 명세와 다르게 한 것
- (없으면 "없음")
```
