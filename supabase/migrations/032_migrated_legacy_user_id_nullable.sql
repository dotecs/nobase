-- =====================================================
-- 마이그레이션: migrated_* 테이블의 legacy_user_id를 NULLABLE로 변경
-- 배경: 이번 이전 대상 학생들은 레거시 user_id가 없고 카카오 ID/이메일/이름/전화만 보유.
--       기존 NOT NULL 제약을 풀어 카카오 ID 기반 신규 행 삽입을 허용.
-- 안전성: profiles/enrollments/lesson_progress의 legacy_user_id는 이미 nullable.
--         link_migrated_data 함수도 NULL을 그대로 전달해 정상 동작.
-- =====================================================

ALTER TABLE migrated_profiles
    ALTER COLUMN legacy_user_id DROP NOT NULL;

ALTER TABLE migrated_enrollments
    ALTER COLUMN legacy_user_id DROP NOT NULL;

ALTER TABLE migrated_lesson_progress
    ALTER COLUMN legacy_user_id DROP NOT NULL;
