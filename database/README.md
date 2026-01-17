# 📦 Database Schema Documentation

노베이스구조대 SaaS 데이터베이스 스키마 정의 파일들입니다.

## 📁 폴더 구조

```
database/                  ← 참조용 문서 (읽기 전용)
├── README.md              # 이 파일
├── schema/                # 테이블 정의 (현재 상태)
│   ├── 00_extensions.sql  # PostgreSQL 확장
│   ├── 01_types.sql       # ENUM 타입
│   ├── 02_profiles.sql    # 사용자 프로필
│   ├── 03_courses.sql     # 강좌
│   ├── 04_cohorts.sql     # 기수
│   ├── 05_lessons.sql     # 레슨
│   ├── 06_enrollments.sql # 수강 등록
│   ├── 07_lesson_progress.sql # 학습 진도
│   └── 08_announcements.sql   # 공지사항
├── functions/             # 함수 정의
│   └── 01_functions.sql   # 헬퍼 함수들
├── triggers/              # 트리거 정의
│   └── 01_triggers.sql    # 자동 업데이트 트리거
├── rls/                   # Row Level Security
│   └── 01_policies.sql    # RLS 정책
└── seeds/                 # 시드 데이터
    └── 01_sample_data.sql # 테스트 데이터

supabase/                  ← 실제 마이그레이션 (Single Source of Truth)
└── migrations/
    └── 001_initial_schema.sql  # 변경 이력
```

> ⚠️ **주의**: `database/` 폴더는 **참조용 문서**입니다.
> 실제 DB 변경은 `supabase/migrations/`에 마이그레이션 파일을 추가하세요.

## 🔄 ERD (Entity Relationship Diagram)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   courses   │────<│   cohorts   │────<│   lessons   │
└─────────────┘     └─────────────┘     └─────────────┘
                          │                    │
                          │                    │
                          ▼                    ▼
                    ┌─────────────┐     ┌───────────────────┐
                    │ enrollments │     │  lesson_progress  │
                    └─────────────┘     └───────────────────┘
                          │                    │
                          │                    │
                          └────────┬───────────┘
                                   │
                                   ▼
┌─────────────┐              ┌─────────────┐
│ auth.users  │─────────────>│  profiles   │
└─────────────┘              └─────────────┘
```

## 📊 테이블 요약

| 테이블 | 설명 | 주요 컬럼 |
|--------|------|-----------|
| `profiles` | 사용자 프로필 | user_id, role, name, phone |
| `courses` | 강좌 | title, slug, description |
| `cohorts` | 기수 | course_id, title, starts_at, ends_at |
| `lessons` | 레슨 | cohort_id, title, vimeo_url, resources |
| `enrollments` | 수강 등록 | user_id, cohort_id, status |
| `lesson_progress` | 학습 진도 | user_id, lesson_id, completed |
| `announcements` | 공지사항 | cohort_id, title, body, is_pinned |

## 🚀 사용법

### 개발 시 테이블 구조 확인

이 폴더의 SQL 파일들을 참조하여 현재 DB 구조를 파악하세요.

### DB 변경이 필요할 때

1. `supabase/migrations/`에 새 마이그레이션 파일 추가
   ```
   supabase/migrations/002_add_phone_to_profiles.sql
   ```

2. Supabase SQL Editor에서 실행

3. 이 폴더의 해당 schema 파일도 업데이트 (문서 동기화)

### TypeScript 타입 동기화

DB 변경 후 `lib/database.types.ts`도 함께 업데이트하세요.

## 📝 업데이트 이력

- **2025-12-24**: phone 컬럼 추가 (profiles)
- **2025-12-24**: 초기 스키마 문서화
