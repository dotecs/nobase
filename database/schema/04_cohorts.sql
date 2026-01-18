-- =====================================================
-- cohorts: 기수
-- =====================================================
-- 강좌의 특정 기수 (예: 1기, 2기)

CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 소속 강좌
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- 기수 제목 (예: "1기", "2024년 상반기")
    title VARCHAR(200) NOT NULL,
    
    -- URL용 슬러그
    slug VARCHAR(100),
    
    -- 수강 기간
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    
    -- 활성화 여부
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 최대 수강 인원 (NULL이면 제한 없음)
    max_students INTEGER DEFAULT NULL,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 같은 강좌 내에서 슬러그 유니크
    UNIQUE(course_id, slug)
);

-- 인덱스
CREATE INDEX idx_cohorts_course_id ON cohorts(course_id);
CREATE INDEX idx_cohorts_slug ON cohorts(slug);
CREATE INDEX idx_cohorts_is_active ON cohorts(is_active);
CREATE INDEX idx_cohorts_max_students ON cohorts(max_students) WHERE max_students IS NOT NULL;

-- 트리거: updated_at 자동 갱신
CREATE TRIGGER update_cohorts_updated_at
    BEFORE UPDATE ON cohorts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 코멘트
COMMENT ON TABLE cohorts IS '강좌의 기수 정보';
COMMENT ON COLUMN cohorts.course_id IS '소속 강좌 ID';
COMMENT ON COLUMN cohorts.is_active IS '현재 운영 중인 기수 여부';
COMMENT ON COLUMN cohorts.max_students IS '기수별 최대 수강 인원. NULL이면 제한 없음.';
