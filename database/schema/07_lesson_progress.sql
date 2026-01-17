-- =====================================================
-- lesson_progress: 학습 진도
-- =====================================================
-- 사용자별 레슨 수강 완료 현황

CREATE TABLE lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 수강생
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 레슨
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    
    -- 완료 여부
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 완료 시각
    completed_at TIMESTAMPTZ,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 한 사용자-레슨 쌍당 하나의 진도 레코드
    UNIQUE(user_id, lesson_id)
);

-- 인덱스
CREATE INDEX idx_lesson_progress_user_id ON lesson_progress(user_id);
CREATE INDEX idx_lesson_progress_lesson_id ON lesson_progress(lesson_id);
CREATE INDEX idx_lesson_progress_completed ON lesson_progress(user_id, completed);

-- 코멘트
COMMENT ON TABLE lesson_progress IS '레슨 학습 진도';
COMMENT ON COLUMN lesson_progress.completed IS '수강 완료 여부';
COMMENT ON COLUMN lesson_progress.completed_at IS '완료 처리된 시각';
