# 노베이스구조대 메인 페이지 개편 — 개발 명세서 (M0–M6)

- 작성일: 2026-10-23
- 대상: Codex(Next.js `nobase` 레포), 디자이너(에셋 제작)
- 입력 자료: `design-system-v0.1.md`(디자인 시스템 제안), `main-sections/` 시안 5종(01-hero, 02-programs, 03-how, 04-about-cta, 05-design-system · 1536×1024, **방향 참고용**)
- 대상 페이지: `/`(메인), `/courses`(프로그램 탐색), 공통 Header/Footer
- 브랜치: `feat/main-redesign` → PR → 대표 승인 후 머지·배포
- 선행 완료: 랜딩 개편(`/courses/n-training`), 가격 페이지, 사이트맵 1단계 — 이 명세는 **그 위에 얹는 작업**이며 과정 상세·가격·무료 레슨·로그인 흐름은 건드리지 않는다.

> `[확인]` = 게시 전 대표 확인, `[미확정]` = 결정 안 됨, `[ASSET-PENDING:ID]` = 아직 없는 이미지. 하나라도 남아 있으면 운영 배포하지 않는다.

---

## 0. 한 장 요약

| 항목 | 결정 |
|---|---|
| 페이지 목표 | 메인은 **프로그램 탐색**만 담당. 가격·기수·세부 서비스는 과정 상세(랜딩/가격 페이지)로 보낸다. 결제는 기존대로 과정 상세 → 스마트스토어 |
| 메인 섹션 | 4개: Hero → 프로그램 탐색 → 학습 방식 → 브랜드 철학+상담 CTA. 공통 헤더 1개, 공통 푸터 |
| 프로그램 데이터 | DB `courses`에 컬럼 추가 **안 함**. `content/programs.ts` 정적 레지스트리(분류·대상·요약·썸네일·정렬·comingSoon)를 DB(공개 여부·활성 기수)와 병합. 편입수학은 레지스트리에만 존재 |
| 상태 표시 | `open` 운영 중 / `closed` 모집 마감 / `comingSoon` 준비 중 — DB에서 파생, 텍스트 필수 |
| 이미지 vs 코드 | 큰 3D 장면은 **Hero 1장만**. 프로그램 썸네일 3장 + 목표 아이콘 3개는 소형 이미지. 버튼·칩·카드·스텝·아이콘은 전부 코드(SVG 라인 아이콘 `react-icons/fi`) |
| 시안과 다르게 가는 것 | Hero 좌우 화살표 없음(3개 그대로 노출). 생성 이미지 속 로고 전부 제거 → 공식 로고 SVG로 교체. 브랜드 철학 카드의 "삼각형 분해" 그래픽은 심볼 재조합 금지 규칙에 걸려 **사용 안 함**(번호+라인 아이콘). 학습 방식 섹션의 노트북 장면 이미지는 생략(텍스트 우선 규칙) |
| 금지 | 편입수학 일정·가격·지원 범위 생성 금지. 기수·레슨 수 등 운영 숫자 하드코딩 금지. 인물·후기·합격률 없음. 과정별 유료 지원을 메인에서 일괄 약속하지 않음 |
| 유지 | 기존 URL 전부 유지(`/courses/n-training`, `/courses/n-campus-math`, `/courses`, `/dashboard`, `/login`). 로그인 사용자의 `/courses` "수강중 → 커리큘럼" 링크 유지. 사이트맵 변경 없음 |

---

## 1. 결정 사항 (대표 확인 필요)

| ID | 질문 | 명세의 기본값 | 상태 |
|---|---|---|---|
| D1 | 프로그램 분류·상태를 DB 컬럼으로 넣을까, 정적 레지스트리로 둘까 | **정적 레지스트리**(`content/programs.ts`). SQL 작업 없음, 랜딩/가격 콘텐츠와 같은 방식. 과정이 5개를 넘어가면 그때 DB로 옮긴다 | `[확인]` |
| D2 | 메인·`/courses` 카드에 스마트스토어 "등록하기" 직링크를 둘까 | **두지 않음**. 카드 CTA는 "과정 자세히 보기" 하나. 등록은 과정 상세의 플랜 영역에서(이미 스마트스토어로 연결됨). 메인에서 결제로 바로 보내면 플랜 설명 없이 결제 페이지에 떨어진다 | **결정됨(뺀다, 10-23)** |
| D3 | Pretendard 폰트 패키지 추가(신규 의존성 1개) | **추가**. 현재 `--font-sans`에 이름만 있고 파일이 없어 시스템 폰트로 보인다. `pretendard` npm 패키지의 가변 서브셋 CSS를 self-host(외부 CDN 아님) | `[확인]` |
| D4 | 다크 모드 | **유지**. 사이트 전체에 ThemeToggle이 있어 메인만 빼면 어색. 새 섹션은 시맨틱 토큰으로 작성해 다크에서도 깨지지 않게 한다(3D 이미지는 밝은 카드 안에 둠) | 결정됨 |
| D5 | "학습 상담하기" 연결 | 기존 결정대로 **네이버 톡톡**(`content/contact.ts`) 새 탭. 1:1 예약 기능 완성 전까지 | 결정됨 |
| D6 | 공식 로고 SVG 추출 | `C:/노베이스구조대/logo/NOBASE_FINAL.pdf`에서 가로 조합·심볼을 SVG로 추출(M0-3). 추출이 어려우면 현재 PNG(`/logo_kr_b.png`) 유지하고 `[ASSET-PENDING:LOGO]` 표기 | `[확인]` PDF 경로 |

---

## 2. 정보 구조 · 섹션 순서 (메인 `/`)

```
Header (공통)
S1 Hero            #top       — 헤드라인 + 2 CTA + 목표별 바로가기 3
S2 프로그램 탐색    #programs  — 필터 칩 + ProgramCard 3 (1200px 3열)
S3 학습 방식        #how       — 4단계 스텝 + 2 안내 카드 + 주석
S4 브랜드 철학+CTA  #about     — Trust 3 카드 + 상담/탐색 CTA 밴드
Footer (공통)
```

헤더 메뉴 "학습 프로그램 / 학습 방식 / 브랜드 소개"는 각각 `/courses`, `/#how`, `/#about`. 메인에서는 부드러운 스크롤(`scroll-behavior: smooth`, reduced-motion이면 즉시), 다른 페이지에서는 `/#how`로 이동.

### S1 Hero (시안 01)
- 아이브로 없음. H1 2줄: `기초가 없어도,` / `목표는 시작할 수 있으니까.`(2줄째 Brand 색)
- 본문: `입학 준비부터 대학 공부, 새로운 도전까지.` / `나의 출발점에 맞는 배움을 찾아보세요.`
- CTA: Primary `프로그램 둘러보기` → `#programs` / Secondary `학습 상담하기` → `contact.href` 새 탭
- 우측: `[ASSET-PENDING:A01]` hero-scene.webp (16:10). 모바일은 문구 → CTA → 이미지(축소) 순서
- 목표별 바로가기 카드 3(제목 `어떤 목표로 시작하시나요?`): 각 카드 = 3D 아이콘(A05–A07) + 라벨 + 화살표
  - `SSIT 입학 준비` → `/courses?category=ssit-admission`
  - `대학 학습` → `/courses?category=university`
  - `편입 준비 · 준비 중` → `/courses?category=transfer` (카드 자체는 활성, 도착 페이지에서 준비 중 카드가 보임)
  - 시안의 좌우 화살표는 구현하지 않음
- 기존 메인의 통계 영역(6년차·레슨 수·1:1)과 "모집중" 표시는 **삭제**

### S2 프로그램 탐색 (시안 02, `/courses`와 동일 컴포넌트)
- 제목: `지금의 목표에 맞는 프로그램` / 부제 `과정의 대상과 학습 내용을 살펴보고 선택하세요.`
- FilterChip: 전체 / SSIT 입학 준비 / 대학 학습 / 편입 준비. 클라이언트 필터, URL `?category=` 동기화(메인에서는 동기화 안 함, `/courses`에서만)
- ProgramCard 순서: 썸네일(16:10) → StatusBadge → 과정명 → 대상(Brand 색) → 요약 1줄 → CTA
  - open: Secondary 버튼 `과정 자세히 보기 →` → `courseHref(course)`
  - closed: 같은 버튼 + 배지 `모집 마감` (상세 페이지는 열려 있으므로 링크 유지)
  - comingSoon: 비활성 버튼 `개설 예정`(disabled, `aria-disabled`), 결제·상세 링크 없음
- 카드 하단 안내: `새로운 학습 프로그램이 순차적으로 추가됩니다.`
- 메인에서는 3장을 모두 노출(캐러셀 없음). 필터 결과 0개면 EmptyState(`해당 분류의 프로그램이 아직 없습니다` + `필터 초기화`)

### S3 학습 방식 (시안 03)
- 아이브로 `HOW WE LEARN`, H2 `출발점은 달라도,` / `기초부터 차근차근.`(2줄째 Brand) / 본문 `개념을 이해하고, 반복하며, 나의 것으로 만드는 학습.`
- 스텝 4: `01 개념 이해`(FiBookOpen) `02 반복 학습`(FiRefreshCw) `03 문제 적용`(FiEdit3) `04 질문과 점검`(FiMessageCircle). 연결선은 CSS. 모바일 2×2
- 안내 카드 2(우측 세로):
  - `목표에 맞는 커리큘럼` — `각 과정의 학습 순서와 내용을 확인하세요.` → `/courses` (FiLayers)
  - `필요한 학습 지원` — `질문·피드백 등 지원 범위는 과정별로 안내합니다.` → `/courses` (FiMessageSquare)
- 시안 좌측의 큰 노트북 장면 카드(`이해하고 넘어가는 공부`)는 **텍스트 카드**로 축소: 제목 + `막막한 개념을 작은 단위로 나누어 학습합니다.` 이미지 없음
- 주석(Caption, FiInfo): `실시간 강의와 개별 피드백 제공 여부는 프로그램 및 플랜에 따라 다릅니다.`

### S4 브랜드 철학 + CTA (시안 04)
- H2 한 줄: `배움의 시작에는, 믿음이 필요합니다.`(뒷부분 Brand)
- 카드 3: 영문 소제(Brand, 14px) + 한글 2줄. 그래픽은 좌측에 **번호 01/02/03 + 라인 아이콘**(FiUser / FiUserCheck / FiUsers). 시안의 삼각형 유리 오브제는 사용하지 않음
  - `Trust Myself` — `나의 가능성을` / `믿습니다.`
  - `Trust Yourself` — `당신의 성장을` / `믿습니다.`
  - `Trust Ourselves` — `함께하는 힘을` / `믿습니다.`
- CTA 밴드(Surface 배경, 풀블리드): H2 `어디서 시작할지 막막하다면` / `함께 방향을 찾아보세요.`(Brand) + Primary `프로그램 둘러보기`(→ `/courses`) + Secondary `학습 상담하기`(톡톡). 우측 이미지는 **A01을 재사용**(max-width 480px, 모바일 숨김 `aria-hidden`) — 새 에셋 없음
- 기존 메인의 "노베이스 구조대와 함께"(3 feature) 섹션은 **삭제**

### Footer (공통, 소폭)
- 상단 행 추가: 공식 로고(심볼+워드마크, 높이 24px) + 구분선 + `기초부터, 가능성까지.`
- 우측: 이용약관 / 개인정보처리방침 / 문의(톡톡) — 현재 `더보기` 접힘 안에 있는 세 링크를 **항상 노출**로 이동
- 사업자 정보(상호·대표·사업자번호·통신판매)는 지금처럼 `더보기` 안에 유지(법정 표기 삭제 금지)

---

## 3. 디자인 토큰 (styles/globals.css에 **추가**, 기존 토큰 이름 변경 금지)

```css
--color-brand: #0072C6;          /* = --color-primary-500, 별칭 */
--color-brand-hover: #005DA3;
--color-ink: #101B33;
--color-muted: #52647A;
--color-surface-brand: #EFF7FC;
--color-border-brand: #D7E6F2;
--color-status-open-text: #137A50;    --color-status-open-bg: #EAF8F1;
--color-status-pending-text: #52647A; --color-status-pending-bg: #F1F4F8;
--color-status-closed-text: #7A2E2E;  --color-status-closed-bg: #FBEDED;   /* 시스템 문서에 없음, 제안값 [확인] */
--radius-card: 20px; --radius-button: 12px; --radius-chip: 999px;
--shadow-card: 0 8px 24px rgba(0,114,198,0.06);
--container-max: 1200px; --gutter: 32px; (모바일 20px)
--focus-ring: 0 0 0 3px var(--color-bg), 0 0 0 5px var(--color-brand-hover);  /* 2px 외곽선 + 3px 간격 */
```
- 다크 모드: `[data-theme="dark"]`에서 `--color-ink`→`#F3F6FA`, `--color-muted`→`#A9B6C6`, `--color-surface-brand`→`#0E1A2B`, `--color-border-brand`→`#1F3350`, 상태 배경은 투명도 적용. 기존 다크 토큰 방식 그대로
- 타이포: H1 `clamp(36px, 4.5vw, 56px)/1.28 700`, H2 `clamp(28px, 3.2vw, 40px)/1.4 700`, H3 24/34 700, Body 16/26, Caption 14/22. `word-break: keep-all`
- 간격: 섹션 `padding: 96px 0`(모바일 56px), 카드 간격 24px, 버튼 높이 ≥48px
- 폰트: `pretendard` 패키지 → `app/layout.tsx`에서 `import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'`. `--font-sans` 첫 항목 `'Pretendard Variable'` 유지. 외부 CDN `<link>` 금지

---

## 4. 에셋 (디자이너 → `public/`)

| ID | 파일 | 규격 | 내용 | 비고 |
|---|---|---|---|---|
| A01 | `public/home/hero-scene.webp` | 1600×1000 (16:10), ≤160KB | 시안 01 우측 3D 장면 | **아크릴판 속 로고·모든 글자 제거하고 재생성**(빈 아크릴판 또는 판 없음). 흰·연블루 배경, 좌상단 광원 |
| A02 | `public/programs/n-training.webp` | 800×500, ≤80KB | 시안 02 카드1(책·삼각자·입체) | 글자·로고 없음 |
| A03 | `public/programs/n-campus-math.webp` | 800×500, ≤80KB | 시안 02 카드2(노트북·책) | 노트북 화면의 로고 제거 → 빈 화면 또는 추상 도형 |
| A04 | `public/programs/transfer-math.webp` | 800×500, ≤80KB | 시안 02 카드3(원뿔·그래프) | 글자 없음 |
| A05 | `public/home/goal-ssit.webp` | 320×320 투명, ≤30KB | 학사모 3D | 시안 01 바로가기 아이콘 |
| A06 | `public/home/goal-university.webp` | 320×320 투명, ≤30KB | 책 더미 3D | |
| A07 | `public/home/goal-transfer.webp` | 320×320 투명, ≤30KB | 계단+깃발 3D | |
| LOGO | `public/brand/logo-kr.svg`, `public/brand/symbol.svg` | 벡터 | 공식 PDF에서 추출 | D6. PNG 폴백 유지 |

- 원본 PNG/JPG는 레포에 커밋하지 않는다(webp만). 변환은 `scripts/convert-landing-assets.mjs` 패턴 재사용(`scripts/convert-home-assets.mjs`).
- 모든 생성 이미지 안의 로고·문구는 참고용이며 그대로 쓰지 않는다. 텍스트·버튼·아이콘은 HTML/SVG.
- 에셋이 없을 때 자리표시자: 썸네일은 Surface 배경 + `FiBook`(현재 방식), Hero는 이미지 영역 자체를 렌더하지 않음(레이아웃 1열).

---

## 5. 데이터 모델 — `content/programs.ts`

```ts
export type ProgramCategory = 'ssit-admission' | 'university' | 'transfer';
export type ProgramStatus = 'open' | 'closed' | 'comingSoon';
export interface ProgramEntry {
  slug: string;                 // courses.slug 또는 레지스트리 전용 slug
  title: string;                // 표시용 (DB title과 다를 수 있음)
  category: ProgramCategory;
  audience: string;             // 카드 2행
  summary: string;              // 카드 3행, 1줄
  thumbnail: string | null;     // /programs/*.webp
  sortOrder: number;
  comingSoon?: true;            // DB에 없는 과정
}
export const programs: ProgramEntry[] = [
  { slug: 'n-training',    title: '뇌지컬 트레이닝',   category: 'ssit-admission', audience: 'SSIT 입학 준비',           summary: '수학·물리·화학의 기초부터 차근차근', thumbnail: '/programs/n-training.webp',    sortOrder: 1 },
  { slug: 'n-campus-math', title: '뇌지컬 캠퍼스 수학', category: 'university',     audience: 'SSIT 재학생을 위한 대학 수학', summary: '대학 공부의 기초를 탄탄하게',          thumbnail: '/programs/n-campus-math.webp', sortOrder: 2 },
  { slug: 'transfer-math', title: '편입수학',          category: 'transfer',       audience: '새로운 목표를 위한 수학 학습',  summary: '커리큘럼과 개설 일정은 추후 안내합니다.', thumbnail: '/programs/transfer-math.webp', sortOrder: 3, comingSoon: true },
];
export const programCategories: { id: ProgramCategory | 'all'; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'ssit-admission', label: 'SSIT 입학 준비' }, { id: 'university', label: '대학 학습' }, { id: 'transfer', label: '편입 준비' },
];
```

`lib/programs.ts`:
```ts
export interface ProgramView extends ProgramEntry {
  status: ProgramStatus;
  href: string | null;          // courseHref(course) | null(comingSoon)
  courseId: string | null;
}
export const getPrograms = cache(async (client?) => ProgramView[])
```
- 규칙: 레지스트리 순서대로 돌며 DB `courses`(`is_published=true`, `cohorts(is_active)`)와 slug로 매칭.
  - 매칭 + 활성 기수 ≥1 → `open`
  - 매칭 + 활성 기수 0 → `closed`
  - `comingSoon: true` 또는 DB에 없음 → `comingSoon`(href null)
  - DB에는 있지만 레지스트리에 없는 공개 과정 → 끝에 `category: 'ssit-admission'`? **아니오** — `category` 없이 `'all'`에만 표시, 콘솔 경고. 새 과정은 레지스트리에 등록해야 분류됨(운영 규칙, README 1줄)
- DB `courses.thumbnail_url`이 있으면 레지스트리 thumbnail보다 우선
- anon 읽기만 사용. 서비스 롤 금지. 기수 개수·레슨 수는 **표시하지 않음**(상태 파생에만 사용)

---

## 6. 컴포넌트

| 컴포넌트 | 위치 | 요구 |
|---|---|---|
| `Header` | `components/Header` (수정) | 비로그인 공개 페이지 모드: 로고 / 학습 프로그램 / 학습 방식 / 브랜드 소개 / ThemeToggle / `로그인`. 로그인 시: 같은 메뉴 + `내 강의실`(Primary 버튼, `/dashboard`) + 사용자명·로그아웃. 관리자는 `관리자` 링크 유지. 현재 `landingNavigation` prop 방식은 유지하되 기본 메뉴를 위 구성으로 교체. `app/page.tsx`의 **자체 헤더 삭제**하고 공통 Header 사용 |
| `Button` | 기존 | `focus-visible` 링(토큰), `disabled`, `pressed(:active)` 상태 추가. `outline` = Secondary. 높이 48px(lg)/44px(md) |
| `StatusBadge` | `components/StatusBadge` (신규) | `status` prop → 점 + 텍스트(`운영 중`/`준비 중`/`모집 마감`). 텍스트 필수, 색만으로 구분 금지 |
| `FilterChip` | `components/FilterChip` (신규) | `role="radio"`/`aria-checked` 그룹. 선택: Brand 배경·흰 글자. 키보드 좌우 이동 |
| `ProgramCard` | `components/ProgramCard` (신규) | §2 S2 순서. 카드 전체가 링크가 아니라 **CTA 버튼만 링크**(comingSoon은 버튼 없음). 이미지 `next/image` 16:10, `alt=""`(장식) |
| `ProgramExplorer` | `components/ProgramExplorer` (신규, client) | 칩 + 그리드 + EmptyState. props: `programs`, `syncUrl?: boolean`, `initialCategory?`. 메인(S2)과 `/courses` 공용 |
| `HomeHero`, `HowWeLearn`, `BrandValues`, `CtaBand` | `components/home/` (신규, server) | S1·S3·S4. 카피는 `content/home.ts`에 모아 둔다(코드에 문자열 박지 않음) |
| `Footer` | 기존 수정 | §2 Footer |
| `EmptyState` | `ProgramExplorer` 내부 | 필터 초기화 버튼 |

- 아이콘: `react-icons/fi` 24px, strokeWidth 2 통일. `react-icons/fa`는 메인에서 제거
- 모션: 섹션 진입 페이드 1회(opacity 0→1, 240ms)만. `prefers-reduced-motion: reduce`면 없음. 호버 이동(translateY) 2px 이내

---

## 7. 반응형 · 접근성

- 브레이크포인트: ≥1024 3열 / 768–1023 2열 / ≤767 1열. 목표 바로가기 카드는 ≤767에서 1열 세로
- 모바일 Hero: 문구 → CTA → 이미지. 이미지 높이 최대 220px. 첫 CTA가 첫 화면(≈ 667px 높이) 안에 보여야 함
- 헤더 모바일: 기존 햄버거 사이드바 유지, 메뉴 항목 교체
- 이미지: 콘텐츠 이미지 `alt` 있음(썸네일은 `alt=""` 장식 처리 — 제목이 바로 옆에 있으므로), Hero `alt=""`
- 대비: Brand `#0072C6` on white 4.6:1(AA 통과), Muted `#52647A` on white 5.9:1, Surface 위 Muted 확인. 상태 배지 텍스트 색 대비 ≥4.5
- 키보드: 헤더 → Hero CTA → 바로가기 → 칩 → 카드 CTA 순. 포커스 링 토큰 적용
- 320px 폭·200% 확대에서 가로 스크롤 없음
- `/courses?category=` 잘못된 값 → `all`로 폴백

---

## 8. 작업 분할 (Codex)

### M0 기반 (1 PR 안에서 첫 커밋)
1. `pretendard` 설치 + layout import (D3)
2. §3 토큰 추가(기존 토큰 변경 없음), 다크 변형
3. 로고 SVG 추출 → `public/brand/`(D6). Header·Footer에서 사용, 실패 시 PNG 유지
4. `Button` 상태 보강, `StatusBadge`·`FilterChip` 신규
- 완료 조건: 기존 페이지(랜딩·가격·대시보드·레슨) 시각 회귀 없음(스크린샷 비교 4장)

### M1 프로그램 데이터
1. `content/programs.ts`, `lib/programs.ts` (§5)
2. 단위 테스트 없음 → `scripts/check-programs.mjs`로 DB slug ↔ 레지스트리 불일치 출력(선택)
- 완료 조건: 로컬에서 `getPrograms()` 결과가 `[n-training open, n-campus-math open, transfer-math comingSoon]`

### M2 공통 헤더·푸터
1. Header 메뉴 교체(§6), 로그인/비로그인 분기, 활성 메뉴 표시
2. `app/page.tsx` 자체 헤더 제거 → 공통 Header
3. Footer 상단 행·링크 노출
- 완료 조건: `/`, `/courses`, `/courses/n-training`, `/dashboard`에서 헤더 1개만 렌더, 모바일 사이드바 동작

### M3 메인 페이지
1. `content/home.ts` 카피
2. `components/home/*` 4섹션 + `app/page.tsx` 교체, `home.module.css` 정리(미사용 클래스 삭제)
3. `scripts/convert-home-assets.mjs` + 에셋 반영(없으면 자리표시자)
- 완료 조건: 시안 01·03·04 대비 구조 일치, 모바일 390px 스크린샷, Lighthouse 모바일 Performance ≥85 / A11y ≥95

### M4 `/courses`
1. `ProgramExplorer` 재사용, `?category=` 동기화, EmptyState
2. 로그인 사용자: 등록된 과정은 배지 `수강중` + CTA `내 커리큘럼` → `/courses/{id}/cohorts/{cohortId}/curriculum` (기존 동작 유지)
3. 기존 기수 목록·스마트스토어 직링크 제거(D2)
- 완료 조건: 비로그인/로그인/관리자 3상태 스크린샷

### M5 삭제·정리
- `app/page.tsx`의 `react-icons/fa` 의존, 통계 영역, "노베이스 구조대와 함께" 섹션, `home.module.css` 미사용 규칙 제거
- `courses.module.css`에서 기수 목록 스타일 제거

### M6 QA 체크리스트 (PR 본문에 결과 첨부)
- [ ] 메인 4섹션·헤더·푸터가 시안 구조와 일치(이미지 속 로고·문구 미사용)
- [ ] 편입수학 카드에 일정·가격·버튼 링크 없음, `개설 예정` disabled
- [ ] 상태 배지 3종 텍스트 표시, 색 대비 AA
- [ ] 기존 URL 5개 200 응답, 사이트맵 출력 변화 없음
- [ ] 로그인 사용자 `/courses` 수강중 링크 정상
- [ ] 1024/768/390/320 폭 가로 스크롤 없음, 키보드 순서, reduced-motion
- [ ] Pretendard 로드 확인(네트워크 탭에 woff2, 외부 도메인 없음)
- [ ] 다크 모드 4섹션 확인
- [ ] 금지 문자열 검사: `합격률|후기|마감 임박|1억|기수 모집 중|개 레슨` 메인·`/courses`에 없음
- [ ] `[확인]`·`[미확정]`·`[ASSET-PENDING]` 0건

---

## 9. 미확정 · 후속
- 편입수학 상세·출시일 — 메인은 comingSoon만 표시, 추후 레지스트리 `comingSoon` 제거 + DB 과정 생성으로 전환
- 1:1 예약(`/booking`) 완성 시 D5의 톡톡 → 예약으로 교체(`content/home.ts` 한 줄)
- 디자인 시스템 문서화(토큰·컴포넌트 카탈로그 페이지)는 이번 범위 밖
- 캠퍼스 스마트스토어 URL 없음 — 변경 없음(과정 상세 fallback 유지)

---

## 10. M7 시각 보정 — 시안 대비 QA (2026-10-23, 프리뷰 nobase-ivexacf1m 기준)

구조·문구는 명세와 일치. 시안(01~04)과 느낌이 다른 원인은 아래 7개이며 **새 에셋 없이 CSS·배치로 해결**한다. 값은 데스크톱(≥1024) 기준, 모바일은 기존 비율 유지.

### M7-1 Hero (시안 01)
- 섹션 배경을 하늘색 그라데이션으로: `background: radial-gradient(900px 500px at 78% 30%, rgba(0,114,198,.14), transparent 70%), radial-gradient(700px 400px at 12% 85%, rgba(0,114,198,.08), transparent 70%), linear-gradient(180deg, #E9F3FC 0%, #F7FBFF 70%, var(--color-bg) 100%)`
- **이미지 상자 제거**: `.heroImage`의 `border-radius`·`background:#fff` 삭제. 래퍼 `.heroArt`에 가장자리 페이드 `mask-image: radial-gradient(ellipse 72% 72% at 50% 50%, #000 58%, transparent 100%)`(+`-webkit-mask-image`) 적용해 배경에 녹인다. 다크 모드(`[data-theme="dark"]`, `prefers-color-scheme: dark`)에서는 mask 없이 지금처럼 라운드 카드 유지.
- 컬럼 비율 `minmax(0,1fr) minmax(0,1.15fr)`, 이미지 `width:100%; max-width:720px`, ≥1200에서 이미지 폭 ≥ 560px 보장.
- 타이포: H1 `clamp(40px, 4.6vw, 64px)` / line-height 1.18 / letter-spacing -.04em. 본문 18px/30px. CTA 버튼 높이 56px, 글자 17px, padding 0 28px, 첫 버튼 그림자 `0 8px 20px rgba(0,114,198,.25)`.
- 목표 카드: 아이콘 이미지 **96px**(`width/height=96`, `sizes="96px"`), 카드 min-height 128, padding 20px 24px, 라벨 18px 700, 카드 배경 흰색 + `--color-border-brand` 1px, hover에서 `translateY(-2px)` + 그림자. 바깥 컨테이너 padding 40px, 제목 26px.

### M7-2 프로그램 카드 (시안 02)
- StatusBadge를 **썸네일 위 좌상단 오버레이**로 이동: `.thumbnail { position:relative }` 안에 `position:absolute; top:16px; left:16px; background:rgba(255,255,255,.92); box-shadow: var(--shadow-card)`. 본문 영역에는 "수강중" 배지만 남김.
- 카드 radius 20, 본문 padding 24, 제목 24px/34px, 대상 16px(브랜드색 700), 요약 16px muted, CTA 버튼 높이 48.
- 썸네일 배경 `--color-surface-brand`(이미지 로드 전·실패 시).
- FilterChip 높이 44px, 글자 15px 600, 선택 칩 그림자 없음.
- `/courses` 상단: 제목·부제 왼쪽, 오른쪽에 `/home/hero-scene.webp` 재사용(폭 40%, max 520px, M7-1과 같은 mask·배경 처리), ≤767 숨김. 헤더 영역 배경 = M7-1 그라데이션.

### M7-3 학습 방식 (시안 03)
- 섹션 배경: M7-1 그라데이션의 연한 버전(`linear-gradient(180deg, #EEF6FC, #F7FBFF)`), 제목 영역 우측 여백 유지(이미지 없음).
- 스텝 카드: 높이 88px, 번호 16px 700 브랜드색, 아이콘 28px, 라벨 20px 700, 카드 간 연결선 유지. 768~1023은 2×2.
- 왼쪽 큰 카드(`.textCard`): **`/programs/n-campus-math.webp` 재사용**을 카드 오른쪽 48% 영역에 `object-fit:cover; border-radius:16px`로 배치(장식, `alt=""`), 텍스트는 왼쪽. 제목 28px, 본문 17px/28px. ≤767에서는 이미지 위·텍스트 아래 세로 배치, 이미지 높이 180px.
- 오른쪽 안내 카드 2개: 아이콘을 64px 원(`--color-surface-brand`) 안 32px 라인 아이콘으로, 제목 22px, 설명 16px, 카드 padding 28px 32px.

### M7-4 브랜드 철학 (시안 04)
- H2 `clamp(32px, 3.6vw, 48px)`, 하단 여백 48.
- 카드: min-height 220, padding 40, 세로 중앙 정렬. 왼쪽 비주얼을 **112px 원형**(`--color-surface-brand` 배경, 안쪽 라인 아이콘 44px, 원 위 작은 번호 14px)으로 키움. 영문 라벨 15px 브랜드색, 한글 제목 26px/36px.
- 시안의 삼각형 유리 오브제는 심볼 재조합 금지 규칙으로 계속 제외. `[확인]` 대표가 원하면 **CSS 단일 삼각형**(clip-path, 브랜드색 12% 투명도, 카드마다 크기만 다름)을 배경 장식으로 추가 — 로고 배열(2개 삼각형)과 다른 단일 도형이므로 규칙 위반 아님.

### M7-5 CTA 밴드
- M7-1과 동일한 배경·mask 처리(상자 제거). 밴드 padding 96px 0, H2 `clamp(32px, 3.6vw, 48px)`, 버튼 M7-1과 동일 크기. 이미지 폭 44%, max 560px.

### M7-6 헤더
- 로고 폭 180px(≥1024), 메뉴 글자 16px 600, 메뉴 간격 32px. 활성 메뉴(`aria-current`)는 글자 아래 2px 브랜드색 밑줄(시안 02). 로그인 상태의 "내 강의실" 버튼 높이 40, radius 12.

### M7-7 공통
- 섹션 제목(H2) 기본 `clamp(32px, 3.4vw, 44px)`, 부제 17px/28px.
- 카드 hover: `translateY(-2px)` + `--shadow-card`, 200ms. reduced-motion이면 없음.
- 모든 수치는 1440·1280·1024·768·390에서 가로 스크롤 없음을 확인한 뒤 커밋.

완료 조건: 1440 폭 스크린샷 5장(Hero / 프로그램 / 학습 방식 / 브랜드+CTA / `/courses`)을 시안 01~04와 나란히 비교해 PR에 첨부. 이미지 상자 테두리가 보이지 않고, 목표 아이콘·제목 크기가 시안 비율(각각 카드 높이의 ~70%, H1 ≥ 56px)에 맞을 것.
