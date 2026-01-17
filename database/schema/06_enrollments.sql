-- =====================================================
-- enrollments: 수강 등록
-- =====================================================
-- 사용자-기수 간의 수강 관계

CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 수강생
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 수강 기수
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    
    -- 수강 상태
    status enrollment_status NOT NULL DEFAULT 'active',
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 한 사용자는 한 기수에 한 번만 등록 가능
    UNIQUE(user_id, cohort_id)
);

-- 인덱스
CREATE INDEX idx_enrollments_user_id ON enrollments(user_id);
CREATE INDEX idx_enrollments_cohort_id ON enrollments(cohort_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- 코멘트
COMMENT ON TABLE enrollments IS '수강 등록 정보';
COMMENT ON COLUMN enrollments.status IS '수강 상태 (active/paused/ended)';
