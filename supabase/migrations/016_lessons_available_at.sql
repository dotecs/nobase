-- lessons 테이블에 공개 예정일 컬럼 추가
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS available_at TIMESTAMPTZ DEFAULT NULL;

-- 컬럼 코멘트 추가
COMMENT ON COLUMN lessons.available_at IS '레슨 공개 예정일. NULL이면 즉시 공개.';

-- 인덱스 추가 (날짜 기반 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_lessons_available_at ON lessons(available_at) WHERE available_at IS NOT NULL;
