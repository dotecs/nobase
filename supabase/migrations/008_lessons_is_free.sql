-- =====================================================
-- lessons: 무료 공개 여부 컬럼 추가 및 vimeo_url 컬럼 삭제
-- =====================================================

-- 무료 공개 여부 컬럼 추가
ALTER TABLE lessons
ADD COLUMN is_free BOOLEAN NOT NULL DEFAULT FALSE;

-- 코멘트
COMMENT ON COLUMN lessons.is_free IS '무료 공개 여부 (true: 비회원/미수강자도 열람 가능)';

-- 인덱스 (무료 레슨 조회용)
CREATE INDEX idx_lessons_is_free ON lessons(course_id, is_free) WHERE is_free = TRUE;

-- vimeo_url 컬럼 삭제 (lesson_videos 테이블로 이전됨)
ALTER TABLE lessons
DROP COLUMN IF EXISTS vimeo_url;
