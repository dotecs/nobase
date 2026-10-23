# 노베이스구조대 - 온라인 강의 SaaS MVP

공개 과정을 추가하면 `content/programs.ts`에도 등록해야 프로그램 분류에 표시됩니다. 미등록 공개 과정은 전체 필터에만 표시되며 서버에 경고를 남깁니다.

🛟 프로그래밍 경험이 없어도 괜찮아요! 노베이스구조대와 함께 시작하세요.

## 📚 프로젝트 개요

노베이스구조대는 온라인 강의 플랫폼 MVP입니다.

### 주요 특징
- **결제 분리**: 네이버 스마트스토어에서 결제 처리 (웹앱에서 결제 연동 없음)
- **자동 등록**: 센드맨을 통해 수강 시작 링크 발송 → 회원가입/로그인 → 자동 등록
- **Vimeo 임베드**: 동영상 강의 재생
- **진도 관리**: 레슨별 완료 체크 및 진행률 표시

## 🛠 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **데이터베이스**: Supabase (PostgreSQL + Auth + RLS)
- **스타일링**: CSS Modules (Tailwind/CSS-in-JS 미사용)
- **배포**: Vercel

## 📁 폴더 구조

```
nobase-platform/
├── app/
│   ├── (auth)/              # 인증 페이지 그룹
│   │   ├── login/
│   │   ├── signup/
│   │   └── reset-password/
│   ├── (main)/              # 인증 필요 페이지 그룹
│   │   ├── dashboard/
│   │   ├── courses/[courseId]/cohorts/[cohortId]/
│   │   ├── lessons/[lessonId]/
│   │   └── announcements/
│   ├── start/               # 온보딩 플로우
│   │   ├── confirm/
│   │   └── done/
│   └── layout.tsx
├── components/
│   ├── Header/
│   ├── Button/
│   ├── Input/
│   ├── CourseCard/
│   └── ErrorPage/
├── lib/
│   ├── database.types.ts    # Supabase 타입 정의
│   ├── supabase-server.ts   # 서버 컴포넌트용 클라이언트
│   ├── supabase-client.ts   # 브라우저용 클라이언트
│   └── supabase-middleware.ts
├── styles/
│   └── globals.css          # Reset + CSS 변수 토큰
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_seed_data.sql
├── middleware.ts
└── README.md
```

## 🚀 시작하기

### 1. 저장소 클론 및 의존성 설치

```bash
cd nobase-platform
npm install
```

### 2. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Project Settings > API에서 다음 정보 확인:
   - Project URL
   - anon public key

### 3. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열어 Supabase 정보 입력:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. 데이터베이스 마이그레이션

Supabase Dashboard > SQL Editor에서 순서대로 실행:

1. `supabase/migrations/001_initial_schema.sql` - 테이블 생성
2. `supabase/migrations/002_rls_policies.sql` - RLS 정책 설정
3. `supabase/migrations/003_seed_data.sql` - 샘플 데이터 (개발용)

### 5. Supabase Auth 설정

Supabase Dashboard > Authentication > Settings:

1. **Site URL**: `http://localhost:3000` (개발용)
2. **Redirect URLs**: 
   - `http://localhost:3000/**`
3. **Email Auth**: 활성화

### 6. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인

## 📖 주요 페이지 설명

### 인증
- `/login` - 로그인
- `/signup` - 회원가입
- `/reset-password` - 비밀번호 재설정

### 온보딩 (수강 등록)
- `/start?course=SLUG&cohort=ID` - 수강 시작 진입점
- `/start/confirm` - 수강 등록 확인
- `/start/done` - 등록 완료

### 학습
- `/dashboard` - 내 강좌 목록, 진행률, 공지사항 요약
- `/courses/[courseId]/cohorts/[cohortId]` - 강좌 홈
- `/courses/[courseId]/cohorts/[cohortId]/curriculum` - 커리큘럼 (레슨 목록)
- `/lessons/[lessonId]` - 레슨 상세 (Vimeo + 자료 + 완료 버튼)
- `/announcements` - 공지사항 목록

## 🔐 RLS (Row Level Security) 정책

모든 테이블에 RLS가 적용되어 있습니다:

| 테이블 | Student 권한 | Admin 권한 |
|--------|-------------|-----------|
| profiles | 본인만 조회/수정 | 전체 CRUD |
| courses | 등록된 cohort의 course만 조회 | 전체 CRUD |
| cohorts | 등록된 cohort만 조회 | 전체 CRUD |
| lessons | 등록된 cohort의 lesson만 조회 | 전체 CRUD |
| enrollments | 본인만 조회/생성 | 전체 CRUD |
| lesson_progress | 본인만 조회/생성/수정 | 전체 CRUD |
| announcements | 등록된 cohort의 공지만 조회 | 전체 CRUD |

## 🔗 온보딩 플로우

```
[스마트스토어 결제 완료]
       ↓
[센드맨이 수강 시작 링크 발송]
       ↓
[사용자가 링크 클릭]
  /start?course=web-dev-bootcamp&cohort=2024-jan-1st
       ↓
[비로그인 시 → /login → returnTo로 복귀]
       ↓
[/start/confirm - 등록 정보 확인]
       ↓
[enrollment 생성 (upsert)]
       ↓
[/start/done - 완료 후 대시보드로]
```

## 🎨 스타일링 규칙

- **CSS Modules만 사용** (Tailwind, CSS-in-JS 금지)
- **인라인 스타일 금지**
- **globals.css**: Reset + CSS 변수만 포함
- 각 컴포넌트/페이지에 대응되는 `*.module.css` 파일 생성

## 📝 추가 개발 예정

- [ ] Admin 대시보드
- [ ] 강좌/기수/레슨 관리 (CRUD)
- [ ] 사용자 관리
- [ ] 통계 대시보드
- [ ] 이메일 알림 설정

## 🤝 기여

이 프로젝트는 노베이스구조대 MVP입니다. 문의사항이 있으시면 연락해 주세요.

## 📄 라이선스

Private - All Rights Reserved
