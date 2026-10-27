# 📦 Database Schema Documentation

## 마이그레이션 적용 이력

- **043_enrollment_status_on_hold.sql — 미적용**: 수강 일시정지 `on_hold` 추가. 백업 후 043 파일만 단독 실행하고, 완료 뒤 044를 적용한다.
- **044_enrollment_status_events.sql — 미적용**: 관리자 전용 SELECT/INSERT 수강 상태 이력 테이블 추가. 적용 후 DB 타입을 재생성한다. 롤백은 생성 역순으로 제거하며 기존 수강 데이터는 보존한다.

- **2026-10-27 R8 개정(미적용 상태에서 수정)**: 040 `variants.reduced_retry`를 20에서 200으로 늘렸다. 대표는 이 개정 이후의 040을 적용한다.

- **2026-10-27 P1-6c 개정(미적용 상태에서 수정)**: 041에 `enrichment` 컬럼, 대기 중 보강 job 중복 방지 인덱스, `learn_apply_enrichment` RPC를 추가했다. 선택 적용은 씨앗 version+1·오개념·이유 문항·적용 시각을 같은 트랜잭션에서 저장한다. 적용은 대표가 수행한다.

- **2026-10-27 R5 개정(미적용 상태에서 수정)**: 040 `variants`에 `coefficient_range`와 `exclude_zero_answer`를 추가했다.

- **2026-10-26 R3·R4 개정(미적용 상태에서 수정)**: `040_learn_content.sql`의 `variants` 규칙에 정수 범위, 진분수·기약 피연산자, 씨앗 정답 형태 유지, 정답 절댓값 상한을 추가했다. 적용은 대표가 수행한다.

- **2026-10-26 개정(미적용 상태에서 수정)**: `040_learn_content.sql`에 `variants` 규칙을 추가하고, `041_learn_authoring.sql`의 승인 RPC에 템플릿·선택한 변형의 트랜잭션 저장을 통합했다. 두 파일 모두 미적용이며 대표가 적용한다.

근거: `docs/db/remote-schema-2026-10-26.md`와 각 마이그레이션 파일의 적용 주석.
적용 방식이 확인되지 않은 파일은 미확인으로 기록한다. 039b는 원격의 세 MCP 마이그레이션을 역추적한 파일이며, 039b 자체를 운영에 적용한 것은 아니다.

| 파일 | 적용 방식 |
|---|---|
| 001_initial_schema.sql | 미확인 |
| 002_add_phone_to_profiles.sql | 미확인 |
| 002_rls_policies.sql | 미확인 |
| 003_seed_data.sql | 미확인 |
| 004_storage_setup.sql | 미확인 |
| 005_lessons_course_fk.sql | 미확인 |
| 006_seed_math_lessons.sql | 미확인 |
| 007_lesson_videos.sql | 미확인 |
| 008_lessons_is_free.sql | 미확인 |
| 009_cohorts_max_students.sql | 미확인 |
| 010_fix_courses_rls.sql | 미확인 |
| 011_cohorts_price.sql | 미확인 |
| 012_enrollments_receipt_contact.sql | 미확인 |
| 013_enrollments_depositor_name.sql | 미확인 |
| 014_enrollments_delete_policy.sql | 미확인 |
| 015_enrollments_count_policy.sql | 미확인 |
| 016_lessons_available_at.sql | 미확인 |
| 017_fix_can_access_lesson.sql | 미확인 |
| 018_lesson_videos_duration.sql | 미확인 |
| 019_lesson_questions.sql | 미확인 |
| 020_profiles_email_migration.sql | 미확인 |
| 021_legacy_user_id_columns.sql | 미확인 |
| 022_migration_tables.sql | 미확인 |
| 023_link_migrated_data_function.sql | 미확인 |
| 024_subjects.sql | 미확인 |
| 025_seed_math_lessons.sql | 미확인 |
| 026_subjects_resources.sql | 미확인 |
| 027_storage_bump_resource_limit.sql | 미확인 |
| 028_lesson_progress_position.sql | 미확인 |
| 029_backfill_lesson_video_duration.sql | 미확인 |
| 030_kakao_id_columns.sql | 미확인 |
| 031_link_migrated_data_with_kakao.sql | 미확인 |
| 032_migrated_legacy_user_id_nullable.sql | 미확인 |
| 033_link_migrated_data_search_path_fix.sql | 미확인 |
| 034_interview_workbook_access.sql | MCP |
| 034_subject_visibility.sql | 미확인 |
| 035_enrollments_insert_block_written_passed.sql | MCP |
| 036_interview_workbook_answers.sql | MCP |
| 037_public_read_and_lead_source.sql | 수동(SQL Editor) |
| 038_lessons_public_tighten.sql | 수동(SQL Editor) |
| 039_cohorts_select_enrolled.sql | 미확인 |
| 039b_remote_only_schema.sql | MCP (remote 3 migrations; 039b not applied) |

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
# 학습 콘텐츠 팩 적용 이력

- **2026-10-27 P2-5 보완**: 미적용 046의 `evidence` v2에 `coach_verdict_map` 추가. `partial`은 설정에 따라 `correct_assisted`로 반영.

- **2026-10-27 작성**: `048_learn_record_coach_action.sql` — service role 전용 코치 저장 트랜잭션·멱등 키. 미적용. 적용 순서 **046 → 047 → 048**, 백업 후 대표 적용.

- **2026-10-27 작성**: `047_learn_record_attempt.sql` — service role 전용 시도 저장 트랜잭션·중복 제출 키. 미적용, 대표가 백업 후 046과 함께 적용.

- **2026-10-27 작성**: `046_learn_runtime.sql` — Phase 2 학습 기록 8개 테이블, 최신 문항 공개 뷰, 비공개 풀이 사진 버킷과 규칙 설정. 미적용, 대표가 백업 후 적용. 040~045 변경 없음.

- **2026-10-27 작성**: `045_learn_append_variants.sql` — 승인된 초안에 검증된 변형 추가. 미적용, 대표가 백업 후 적용. 기존 `learn_approve_draft` 변경 없음.

- `040_learn_content.sql`: 미적용 — 대표가 백업 후 적용. 롤백 절차: 생성 역순으로 제거.
- **2026-10-27 적용 기록**: 운영(nobase911)에 `040`·`041`이 적용됐으나 P1-6a 시점 버전이었음(검수 쿼리로 확인: `variants` 설정·`enrichment` 컬럼·`learn_apply_enrichment`·보강 인덱스 없음, learn_ 테이블 전부 0행). 최종본(`be5b8e4`)과의 차이는 `042_learn_phase1_delta.sql`로 추가 보정한다. 새 환경에서는 040·041(최종본)만 적용하면 되고 042는 멱등이라 적용해도 무해하다.
