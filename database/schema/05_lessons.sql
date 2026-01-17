-- =====================================================
-- lessons: 레슨
-- =====================================================
-- 기수 내의 개별 레슨 (영상 콘텐츠)

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 소속 강좌
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- 레슨 제목
    title VARCHAR(200) NOT NULL,
    
    -- 정렬 순서
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Vimeo 영상 URL
    vimeo_url TEXT,
    
    -- 첨부 자료 (JSON 배열)
    -- 예: [{"name": "슬라이드.pdf", "url": "https://..."}, ...]
    resources JSONB DEFAULT '[]'::jsonb,
    
    -- 레슨 설명
    description TEXT,
    
    -- 공개 여부
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_sort_order ON lessons(course_id, sort_order);

-- 코멘트
COMMENT ON TABLE lessons IS '레슨 (영상 콘텐츠)';
COMMENT ON COLUMN lessons.sort_order IS '표시 순서 (낮을수록 먼저)';
COMMENT ON COLUMN lessons.vimeo_url IS 'Vimeo 영상 URL';
COMMENT ON COLUMN lessons.resources IS '첨부 자료 JSON 배열';
