-- =====================================================
-- 마이그레이션: subjects (과목) 테이블 추가
-- 목적: course와 lesson 사이의 중간 범주
-- 구조: course → subject → lesson
-- =====================================================

-- 1. subjects 테이블 생성
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 소속 코스
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    
    -- 과목 제목
    title VARCHAR(200) NOT NULL,
    
    -- 과목 설명
    description TEXT,
    
    -- 정렬 순서
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- 공개 여부
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subjects_course_id ON subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_subjects_sort_order ON subjects(course_id, sort_order);

-- 코멘트
COMMENT ON TABLE subjects IS '과목 (코스와 레슨 사이의 중간 범주)';
COMMENT ON COLUMN subjects.sort_order IS '표시 순서 (낮을수록 먼저)';

-- 2. lessons 테이블에 subject_id 컬럼 추가
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_lessons_subject_id ON lessons(subject_id);

-- 코멘트
COMMENT ON COLUMN lessons.subject_id IS '소속 과목 (선택사항)';

-- 3. RLS 정책 추가
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 공개된 과목 조회 가능
CREATE POLICY "Anyone can view published subjects"
ON subjects FOR SELECT
USING (is_published = true);

-- 관리자는 모든 과목 관리 가능
CREATE POLICY "Admins can manage all subjects"
ON subjects FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
);
