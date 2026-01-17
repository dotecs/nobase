-- =====================================================
-- courses: 강좌
-- =====================================================
-- 상위 레벨의 강좌 정보

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 강좌 제목
    title VARCHAR(200) NOT NULL,
    
    -- URL용 슬러그 (유니크)
    slug VARCHAR(100) NOT NULL UNIQUE,
    
    -- 강좌 설명
    description TEXT,
    
    -- 썸네일 이미지 URL
    thumbnail_url TEXT,
    
    -- 공개 여부
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_is_published ON courses(is_published);

-- 코멘트
COMMENT ON TABLE courses IS '강좌 정보';
COMMENT ON COLUMN courses.slug IS 'URL 친화적인 고유 식별자';
COMMENT ON COLUMN courses.is_published IS '공개 여부 (false면 비공개)';
