-- =====================================================
-- lesson_videos: 레슨 영상
-- =====================================================
-- 하나의 레슨에 여러 영상을 연결 (메인 1개 + 서브 여러개)

CREATE TABLE lesson_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 소속 레슨
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    
    -- 영상 제목
    title VARCHAR(200) NOT NULL,
    
    -- Vimeo 영상 URL (예: https://player.vimeo.com/video/1155653363)
    video_url TEXT NOT NULL,
    
    -- 메인 영상 여부 (레슨당 하나만 메인)
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 정렬 순서 (메인 영상은 항상 맨 위)
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- 영상 설명
    description TEXT,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_lesson_videos_lesson_id ON lesson_videos(lesson_id);
CREATE INDEX idx_lesson_videos_sort_order ON lesson_videos(lesson_id, sort_order);
CREATE INDEX idx_lesson_videos_is_main ON lesson_videos(lesson_id, is_main);

-- 코멘트
COMMENT ON TABLE lesson_videos IS '레슨 영상 (메인 + 서브)';
COMMENT ON COLUMN lesson_videos.video_url IS 'Vimeo 영상 URL (임베드용)';
COMMENT ON COLUMN lesson_videos.is_main IS '메인 영상 여부 (레슨당 하나)';
COMMENT ON COLUMN lesson_videos.sort_order IS '표시 순서 (낮을수록 먼저)';
