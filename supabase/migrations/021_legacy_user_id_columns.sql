-- =====================================================
-- 마이그레이션: enrollments, lesson_progress에 legacy 컬럼 추가
-- 목적: 마이그레이션 데이터 추적
-- =====================================================

-- enrollments에 legacy_user_id 추가
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS legacy_user_id UUID;
CREATE INDEX IF NOT EXISTS idx_enrollments_legacy_user_id ON enrollments(legacy_user_id);
COMMENT ON COLUMN enrollments.legacy_user_id IS '기존 DB의 user_id (마이그레이션 추적용)';

-- lesson_progress에 legacy_user_id 추가
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS legacy_user_id UUID;
CREATE INDEX IF NOT EXISTS idx_lesson_progress_legacy_user_id ON lesson_progress(legacy_user_id);
COMMENT ON COLUMN lesson_progress.legacy_user_id IS '기존 DB의 user_id (마이그레이션 추적용)';
