# 원격 DB(nobase911) 스키마 조회 결과 — 2026-10-26

- 조회 주체: Claude (Supabase MCP `execute_sql`, SELECT만)
- 목적: 레포 `supabase/migrations/`에 파일이 없는 원격 전용 스키마를 `039b_remote_only_schema.sql`로 역추적하기 위한 1차 자료
- 원격 마이그레이션 이력(`list_migrations`): `20260707062847_enable_rls_migrated_tables`, `20260707063000_add_pending_to_enrollment_status`, `20260810070703_create_payments_table`, `20261012043029_interview_workbook_access`, `20261012044537_enrollments_insert_block_written_passed`, `20261012045624_interview_workbook_answers`
- 데이터는 조회하지 않았다(스키마만).

## 1. `public.payments` (레포에 파일 없음 → 039b 대상)

| pos | column | type | nullable | default |
|---|---|---|---|---|
| 1 | id | uuid | NO | gen_random_uuid() |
| 2 | order_id | text | NO | |
| 3 | user_id | uuid | NO | |
| 4 | cohort_id | uuid | NO | |
| 5 | amount | integer | NO | |
| 6 | status | text | NO | 'ready' |
| 7 | payment_key | text | YES | |
| 8 | method | text | YES | |
| 9 | receipt_url | text | YES | |
| 10 | fail_reason | text | YES | |
| 11 | created_at | timestamptz | NO | now() |
| 12 | approved_at | timestamptz | YES | |

제약: `payments_pkey PRIMARY KEY (id)`, `payments_order_id_key UNIQUE (order_id)`, `payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE`, `payments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE`, `payments_status_check CHECK (status IN ('ready','paid','failed','canceled'))`

인덱스: `payments_order_id_idx btree(order_id)`, `payments_user_id_idx btree(user_id)` (+ PK·UNIQUE 자동 인덱스)

트리거: 없음. 테이블 코멘트: `토스페이먼츠 결제 기록 (카드결제 자동 승인 플로우)`

RLS: enabled. 정책 1개 — `payments_select_own` FOR SELECT TO public USING (auth.uid() = user_id). INSERT/UPDATE/DELETE 정책 없음(서버 service role만 쓰기).

## 2. enum (레포 001은 `active,paused,ended`만 → `pending` 추가분이 039b 대상)

| type | values (order) |
|---|---|
| enrollment_status | pending, active, paused, ended |
| user_role | student, admin |

## 3. `migrated_*` RLS (레포 022에는 ENABLE 없음 → 039b 대상)

| table | rls_enabled | policies |
|---|---|---|
| migrated_profiles | true | 0 |
| migrated_enrollments | true | 0 |
| migrated_lesson_progress | true | 0 |

정책이 0개인 것은 의도된 상태(anon/authenticated 접근 전면 차단, service role RPC `link_migrated_data`만 사용).

## 4. `lessons_public` 뷰 — 레포 038과 동일 (039b 대상 아님)

`security_invoker=false`. 정의:
```sql
SELECT l.id, l.course_id, l.subject_id, l.title, l.description, l.sort_order, l.is_free, l.available_at, l.created_at
FROM lessons l
JOIN courses c ON c.id = l.course_id
LEFT JOIN subjects s ON s.id = l.subject_id
WHERE l.is_published = true AND c.is_published = true
  AND (l.subject_id IS NULL OR s.is_published = true AND s.visibility::text = 'public'::text);
```

## 5. public 함수 목록 (레포 대조용)

backfill_lesson_video_duration(p_lesson_id uuid, p_duration integer), can_access_lesson(p_lesson_id uuid), check_main_video(), handle_new_user(), has_enrollment(p_cohort_id uuid), is_admin(), link_migrated_data(p_user_id uuid, p_email varchar, p_kakao_id bigint), set_interview_workbook_answers_updated_at(), update_question_answered_status(), update_updated_at_column()

## 6. public 테이블·뷰 목록 (18 + 1)

announcements, cohorts, courses, enrollments, interview_workbook_answers, lesson_answers, lesson_progress, lesson_questions, lesson_videos, lessons, migrated_enrollments, migrated_lesson_progress, migrated_profiles, payments, profiles, subject_visibility, subject_visibility_cohorts, subjects · 뷰: lessons_public
