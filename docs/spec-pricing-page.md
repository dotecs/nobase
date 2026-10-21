# 작업 명세서: 플랜·가격 소개 페이지 `/courses/[slug]/pricing`

- 대상 저장소: `nobase` (Next.js 15 App Router + Supabase + CSS Modules, Vercel)
- 작성일: 2026-10-21
- 실행 주체: Codex
- 선행 상태: `main`에 사이트맵 1단계(T1~T5, `docs/spec-sitemap.md`) 머지·운영 배포 완료. DB 037·038 적용 완료.
- 시안: `C:\Users\hcm07\Documents\Codex\2026-10-21\dnl-x20\outputs\04-white-blue-brand.png`
- 에셋: 같은 경로의 `page-assets\` (아래 §3)

---

## 0. 요약 (먼저 읽을 것)

**위치 결정: 강좌 하위 `/courses/[slug]/pricing`.** 별도 `/pricing`이 아니다.

| 근거 | 내용 |
|---|---|
| 플랜 = 기수 | 시안의 BASIC/STANDARD/PREMIUM 3개 플랜은 DB의 활성 기수 3개(`7기 BASIC/STANDARD/PREMIUM`)와 1:1이고 가격(890,000 / 1,290,000 / 1,490,000)도 DB `cohorts.price`와 **정확히 일치**한다. 플랜 카드는 기수 데이터 위에 카피를 얹는 것 |
| 강좌마다 다르다 | 캠퍼스(`n-campus-math`)는 플랜 1개·250,000원. 가격 페이지는 강좌별이어야 한다 |
| 현재 CTA 결함 수정 | 랜딩의 "수강 신청" CTA가 `cohorts[0]`(임의의 첫 기수) 신청 페이지로 간다. 플랜이 3개인데 하나로 보내는 건 잘못이다. 이 페이지가 그 자리를 대신한다 |
| 미들웨어 | `/courses/[slug]/pricing`은 보호 패턴(`enroll|cohorts`)에 안 걸려 비로그인 공개. 변경 불필요 |

**구조**: 페이지는 DB에서 활성 기수(가격·id·시작일)를 읽고, 강좌별 **콘텐츠 파일**(`content/pricing/<slug>.ts`)에서 플랜 카피·아이콘·공통 혜택을 읽어 합친다. 기수 ↔ 플랜 매칭은 기수 제목에 포함된 키워드(`BASIC`/`STANDARD`/`PREMIUM`)로 한다. **DB 변경 없음, 의존성 추가 없음.**

**가격의 출처는 DB다.** 콘텐츠 파일에 가격을 쓰지 않는다. 시안과 DB가 다르면 DB가 맞다.

**작업 순서**: P1 에셋 → P2 콘텐츠·타입 → P3 페이지 → P4 랜딩 연결 → P5 메타·사이트맵 → P6 검증.

---

## 1. 실행 규칙 (Codex)

`docs/spec-sitemap.md` §1과 동일. 요점:
1. 브랜치 `feat/pricing-page`. 작업 항목마다 커밋 1개 `feat(P3): …`.
2. 이 명세에 없는 파일 수정 금지. 리팩터링·포맷·CRLF 변환 금지. 새 의존성 금지 (이미지 변환은 `node_modules/sharp` 0.34가 Next 의존성으로 이미 설치돼 있으니 그것을 쓴다 — `package.json`에 추가하지 않는다).
3. CSS Modules만. 커밋마다 `npx tsc --noEmit`, 마지막에 `npm run build`.
4. 판단이 필요하면 멈추고 보고서에 질문. 운영 DB 변경 없음.

---

## 2. 데이터 (변경 없음)

```
courses (id, slug, title, description, thumbnail_url, is_published)
cohorts (id, course_id, title, price, original_price, starts_at, ends_at, is_active, max_students)
```
운영 기준 `n-training` 활성 기수: `7기 BASIC (…)` 890,000 / `7기 STANDARD (…)` 1,290,000 / `7기 PREMIUM (…)` 1,490,000. 비활성(6기) 3개는 표시하지 않는다.

---

## 3. 작업 항목

### P1. 에셋 변환 → `public/pricing/n-training/`

원본 PNG(0.6~1.3 MB, 1254~2172px)를 **그대로 커밋하지 않는다.** `scripts/convert-pricing-assets.mjs`(신규, sharp 사용)로 변환해 결과만 커밋한다. 원본 경로는 스크립트 인자로 받는다.

| 원본 (`page-assets/`) | 출력 | 폭 | 포맷 | 용도 |
|---|---|---|---|---|
| `01-hero-brand.png` | `hero-brand.webp` | 1200 | webp, 알파 유지 | 히어로 우측 3D 브랜드 오브제 |
| `02-hero-background.png` | `hero-bg.webp` | 1800 | webp | 히어로 배경 (CSS `background-image`) |
| `03-plan-basic.png` | `plan-basic.webp` | 160 | webp, 알파 | 카드 아이콘 |
| `04-plan-standard.png` | `plan-standard.webp` | 160 | webp, 알파 | |
| `05-plan-premium.png` | `plan-premium.webp` | 160 | webp, 알파 | |
| `06-benefit-pdf.png` | `benefit-pdf.webp` | 96 | webp, 알파 | 공통 혜택 아이콘 |
| `07-benefit-calendar.png` | `benefit-calendar.webp` | 96 | webp, 알파 | |
| `08-benefit-feedback.png` | `benefit-feedback.webp` | 96 | webp, 알파 | |

목표 용량: 히어로 2개 각 ≤ 150 KB, 아이콘 각 ≤ 15 KB. 초과하면 품질을 80→70으로 낮춘다. `generation-prompts.txt`·`.zip`·원본 PNG는 레포에 넣지 않는다.

**완료 조건**: 8개 webp 존재, 용량 기준 충족, 아이콘 알파 투명 확인.

### P2. 콘텐츠 파일·타입

- `content/pricing/types.ts` (신규)
- `content/pricing/index.ts` (신규): `getPricingContent(slug): PricingContent | null` — 정적 import 매핑
- `content/pricing/n-training.ts` (신규): 시안 카피를 **그대로** 넣는다 (아래). 가격 없음.

```ts
// content/pricing/types.ts
export interface PricingPlan {
  match: string;          // cohorts.title에 포함된 키워드 (대소문자 무시). 예: 'BASIC'
  eyebrow: string;        // 'BASIC TRAINING'
  name: string;           // '기본 트레이닝'
  tagline: string;        // '기초부터 차근차근 시작하고 싶다면'
  icon: string;           // '/pricing/n-training/plan-basic.webp'
  features: { text: string; emphasis?: boolean }[];  // emphasis: 플랜 고유 항목(굵게)
  highlight?: boolean;    // 추천 플랜 — 파란 테두리 + 채운 버튼
}
export interface PricingContent {
  hero: { title: [string, string]; subtitle: string; brandImage: string; background: string };
  plans: PricingPlan[];
  commonBenefits: { title: string; subtitle: string; items: { icon: string; title: string; description: string }[] };
  footnote?: string;
}
```

`n-training.ts` 값 (시안 그대로):
- hero.title: `['나에게 맞는', '트레이닝을 선택하세요']`, subtitle: `'기초부터 실전까지, 나에게 필요한 학습을 시작하세요.'`
- plans:
  - BASIC — eyebrow `BASIC TRAINING`, name `기본 트레이닝`, tagline `기초부터 차근차근 시작하고 싶다면`, features: `기본 개념 강의 + 개념 요약 PDF 교재`, `등록일부터 시험 당일까지 이용`, **`실전모의고사 1회`**
  - STANDARD — `STANDARD TRAINING`, `스탠다드 트레이닝`, `1:1 강의와 실전 연습을 함께 원한다면`, features: 공통 2개 + **`실시간 1:1 강의 20시간`**, **`실전모의고사 3회`**, `highlight: true`
  - PREMIUM — `PREMIUM TRAINING`, `프리미엄 트레이닝`, `더 많은 1:1 강의와 질문 지원이 필요하다면`, features: 공통 2개 + **`실시간 1:1 강의 무제한`**, **`실전모의고사 5회`**, **`전용 질문 카톡방`**
- commonBenefits: title `모든 플랜 공통`, subtitle `어떤 플랜을 선택하셔도, 아래의 혜택은 모두 포함됩니다.`, items 3개:
  - pdf — `기본 개념 강의 + 개념 요약 PDF 교재` / `탄탄한 개념 이해를 위한 핵심 강의와 요약 교재를 제공합니다.`
  - calendar — `등록일부터 시험 당일까지 이용` / `등록한 날부터 시험 당일까지 모든 콘텐츠를 이용할 수 있습니다.`
  - feedback — `모의고사 응시권 + 1:1 피드백 + 해설강의` / `실전 감각을 키우는 모의고사와 1:1 피드백, 상세한 해설강의를 제공합니다.`
- footnote: `※ 실시간 강의는 Zoom으로 진행 · 오전반 / 오후반 운영`

시안에 없는 문구를 만들어 넣지 않는다 (할인·평점·수강생 수 등 금지).

### P3. 페이지 `app/(main)/courses/[courseId]/pricing/page.tsx` + `pricing.module.css`

**데이터**: `resolveCourse` → 미발행이면 `notFound()`. UUID로 오면 slug로 `redirect`. `cohorts` 활성만 `starts_at, created_at` 순. 로그인 시 `enrollments(active)` 조회(기존 랜딩과 같은 패턴). `getPricingContent(course.slug)`.

**플랜 ↔ 기수 매칭** (`lib/pricing.ts` 신규, 순수 함수 — 테스트 가능하게):
- 각 플랜의 `match`를 활성 기수 제목에서 대소문자 무시로 찾는다. 매칭된 기수가 없는 플랜은 **표시하지 않는다**.
- 한 플랜에 기수가 둘 이상 매칭되면 `starts_at`이 가장 빠른 것 하나.
- 어떤 플랜에도 매칭되지 않은 활성 기수는 **일반 카드**(제목·가격·등록하기, 아이콘·태그라인 없음)로 플랜 카드 뒤에 붙인다.
- 콘텐츠 파일이 없는 강좌(캠퍼스 등)는 플랜 없이 일반 카드만 — 히어로는 `course.title` + `description`.
- 활성 기수 0개 → 카드 영역 대신 "현재 모집 중인 기수가 없습니다" + 비로그인이면 `다음 기수 알림 받기 → /login?returnTo=/courses/[slug]/pricing`.

**화면 (시안 순서)**
1. 기존 `Header` (시안의 상단 메뉴는 쓰지 않는다 — 사이트 공통 헤더 유지)
2. 히어로: 좌측 두 줄 제목(1행 네이비, 2행 파랑) + 부제. 우측 `hero-brand.webp`(`next/image`, `priority`). 배경 `hero-bg.webp`를 섹션 `background-image`로. 모바일에서는 오브제를 제목 아래로 내리고 높이 축소.
3. 플랜 카드 3열 (`grid`, 모바일 1열). 카드: eyebrow → name → tagline → 아이콘(우상단) → 구분선 → **가격(DB)** `1,290,000원` 형식 → 체크 목록(emphasis는 굵게) → `등록하기` 버튼. `highlight` 카드는 파란 2px 테두리 + 채운 파란 버튼, 나머지는 외곽선 버튼. 버튼 하단 정렬(카드 `flex-direction: column`, 버튼 `margin-top: auto`).
   - `original_price > price`면 가격 위에 취소선으로 표시 (현재 데이터엔 없음 — 조건부만).
   - `max_students`가 있으면 가격 아래 작은 글씨 `정원 N명`.
   - 버튼 링크: `/courses/[slug]/enroll/[cohortId]`. 로그인 사용자가 **그 기수**에 이미 active 등록이면 버튼을 `이어서 학습하기 → /courses/[course.id]/cohorts/[cohortId]/curriculum`으로 바꾼다. 다른 기수 카드는 그대로 등록하기.
4. 공통 혜택 스트립: 연한 파랑 배경, 좌측 타이틀 블록 + 아이콘 항목 3개 (모바일 세로).
5. 푸트노트 (작은 회색 글씨, 가운데).
6. 하단에 `← 커리큘럼 소개로` 링크 (`/courses/[slug]`).

**스타일**: 시안 팔레트 — 배경 `#F6F9FF` 계열, 네이비 `#0F1F4D` 계열, 파랑 `#2563EB` 계열, 카드 흰색 + 큰 라운드(20px) + 옅은 그림자. 기존 `styles/globals.css`의 CSS 변수에 같은 계열이 있으면 **그것을 우선** 쓰고, 없을 때만 모듈 안에 로컬 변수로 둔다. 다크 테마 토글이 있으므로(`ThemeToggle`) `[data-theme="dark"]`에서 카드·배경이 깨지지 않게 최소 대응 (히어로 배경 이미지는 다크에서 `opacity` 낮춤).

**금지**: `lessons`·`lessons_public` 조회 불필요 — 이 페이지는 커리큘럼을 보여주지 않는다. `resources` 당연히 없음.

### P4. 랜딩 연결 (`app/(main)/courses/[courseId]/page.tsx`, `lib/courses.ts`)

- `getCourseCta` 2순위 변경: 활성 기수 있음 → `수강 신청` → **`/courses/[slug]/pricing`** (기존 `cohorts[0]` enroll 제거). 1·3·4순위는 그대로.
- 랜딩의 "모집 기수" 섹션을 요약으로 교체: 제목 `모집 기수` 유지, 본문은 `플랜 N개 · {최저가}원부터` 한 줄 + `플랜·가격 보기 →` 버튼(`/courses/[slug]/pricing`). 기수별 카드 나열은 제거(가격 페이지와 중복). 활성 기수 0개일 때의 "다음 기수 알림 받기" 분기는 그대로.
- 무료 레슨 페이지 하단 CTA는 `getCourseCta`를 쓰므로 자동 반영.
- `/courses` 카탈로그·홈의 기수별 "신청하기" 링크는 **이번 범위에서 손대지 않는다** (직접 enroll로 가도 틀리지 않음).

### P5. 메타·사이트맵

- `generateMetadata`: title `{course.title} 플랜·가격 | 노베이스구조대`, description = hero.subtitle ?? course.description, OG 이미지 = `hero-brand.webp` 절대경로(`metadataBase` 있음).
- `app/sitemap.ts`: 발행 강좌별 `/courses/[slug]/pricing` 추가 (활성 기수 유무와 무관 — 페이지는 항상 200).

### P6. 검증

| # | 확인 | 수행 |
|---|---|---|
| 1 | 비로그인 `/courses/n-training/pricing` 200, 카드 3개, 가격이 DB와 일치(890,000 / 1,290,000 / 1,490,000), STANDARD만 강조 | Codex (`curl` HTML) + 사람 (시크릿 창) |
| 2 | `/courses/n-campus-math/pricing` — 플랜 콘텐츠 없이 일반 카드 1개(250,000원) | Codex |
| 3 | `/courses/<uuid>/pricing` → slug로 리다이렉트 | Codex |
| 4 | 등록하기 → 비로그인 시 `/login?returnTo=/courses/n-training/enroll/<id>` | Codex |
| 5 | 랜딩 CTA "수강 신청"이 pricing으로, 모집 기수 섹션이 요약+버튼으로 | Codex |
| 6 | 모바일 폭(375px)에서 카드 1열, 히어로 오브제 제목 아래, 가로 스크롤 없음 | 사람 (DevTools) |
| 7 | 다크 테마에서 카드·텍스트 가독 | 사람 |
| 8 | 수강 중 계정: 등록한 기수 카드만 "이어서 학습하기" | 사람 |
| 9 | `lib/pricing.ts` 매칭 함수 단위 테스트: 매칭 없음 / 중복 매칭 / 미매칭 기수 일반 카드 | Codex |
| 10 | `/sitemap.xml`에 pricing 2개 추가, `tsc`·`build` 통과 | Codex |

---

## 4. 범위 밖

- 어드민에서 플랜 카피 편집 (콘텐츠 파일로 충분)
- `cohorts.tier` 컬럼 — 제목 키워드 매칭이 깨질 만큼 기수 명명이 흔들리면 그때 추가
- 비교표(03-comparison 시안), 다크 프리미엄 시안(02) — 채택하지 않음
- 홈·카탈로그의 기수 링크 변경

---

## 5. 완료 보고 형식

`docs/spec-sitemap.md` §7과 동일 (커밋 목록, tsc/build, 사람이 할 것, 명세와 다르게 한 것).
