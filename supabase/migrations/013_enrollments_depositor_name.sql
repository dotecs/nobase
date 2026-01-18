-- 입금자명 컬럼 추가
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS depositor_name TEXT;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN enrollments.depositor_name IS '입금자명';
