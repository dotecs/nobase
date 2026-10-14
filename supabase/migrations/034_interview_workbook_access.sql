-- =====================================================
-- 마이그레이션: 면접 대비 워크북 접근 권한
-- 목적: 뇌지컬 트레이닝 수강생 중 '필기 합격'을 알린 학생에게만
--       /workbook/interview 접근을 허용
-- 구조:
--   courses.interview_workbook_enabled  — 이 코스에 면접 워크북이 붙는지 (코스 단위 스위치)
--   enrollments.written_passed_at       — 관리자가 '필기 합격' 처리한 시각 (NULL = 미부여)
-- 접근 규칙(앱 레이어, lib/interview-workbook.ts):
--   enrollment.written_passed_at IS NOT NULL
--   AND enrollment.status IN ('active','ended')
--   AND course.interview_workbook_enabled = TRUE
-- 적용: 2026-10-12 Supabase MCP(apply_migration)로 원격 DB에 적용 완료
-- =====================================================

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS interview_workbook_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN courses.interview_workbook_enabled IS
    '면접 대비 워크북(/workbook/interview)이 이 코스에 종속되는지 여부. TRUE면 관리자가 수강생별로 필기 합격 처리를 할 수 있음';

ALTER TABLE enrollments
    ADD COLUMN IF NOT EXISTS written_passed_at TIMESTAMPTZ;

COMMENT ON COLUMN enrollments.written_passed_at IS
    '필기 합격 처리 시각. NULL이면 면접 워크북 접근 불가. 관리자만 변경(RLS: enrollments_admin_all)';

CREATE INDEX IF NOT EXISTS idx_enrollments_written_passed
    ON enrollments(user_id)
    WHERE written_passed_at IS NOT NULL;

-- 뇌지컬 트레이닝(SSIT 입학 과정 준비) 코스에 워크북 연결
UPDATE courses SET interview_workbook_enabled = TRUE WHERE slug = 'n-training';
