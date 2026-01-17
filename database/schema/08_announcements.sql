-- =====================================================
-- announcements: 공지사항
-- =====================================================
-- 기수별 공지사항

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 대상 기수
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    
    -- 공지 제목
    title VARCHAR(300) NOT NULL,
    
    -- 공지 내용
    body TEXT NOT NULL,
    
    -- 상단 고정 여부
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_announcements_cohort_id ON announcements(cohort_id);
CREATE INDEX idx_announcements_is_pinned ON announcements(is_pinned);
CREATE INDEX idx_announcements_created_at ON announcements(created_at DESC);

-- 코멘트
COMMENT ON TABLE announcements IS '기수별 공지사항';
COMMENT ON COLUMN announcements.is_pinned IS '상단 고정 여부';
