-- lessons 테이블의 FK를 cohort_id -> course_id 로 변경

-- 0. 기존 RLS 정책 삭제 (cohort_id 참조하는 정책)
DROP POLICY IF EXISTS "lessons_select_enrolled" ON lessons;

-- 1. course_id 컬럼 추가 (임시로 nullable)
ALTER TABLE lessons ADD COLUMN course_id UUID REFERENCES courses(id) ON DELETE CASCADE;

-- 2. 기존 데이터 마이그레이션 (cohort_id를 통해 course_id 찾기)
UPDATE lessons 
SET course_id = c.course_id
FROM cohorts c
WHERE lessons.cohort_id = c.id;

-- 3. course_id를 NOT NULL로 변경
ALTER TABLE lessons ALTER COLUMN course_id SET NOT NULL;

-- 4. 기존 인덱스 삭제
DROP INDEX IF EXISTS idx_lessons_cohort_id;
DROP INDEX IF EXISTS idx_lessons_sort_order;

-- 5. cohort_id 컬럼 삭제
ALTER TABLE lessons DROP COLUMN cohort_id;

-- 6. 새로운 인덱스 생성
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_sort_order ON lessons(course_id, sort_order);

-- 7. 새로운 RLS 정책 생성 (course_id 기반)
CREATE POLICY "lessons_select_enrolled" ON lessons
    FOR SELECT
    USING (
        is_published = TRUE
        AND EXISTS (
            SELECT 1 FROM enrollments e
            JOIN cohorts c ON c.id = e.cohort_id
            WHERE c.course_id = lessons.course_id
            AND e.user_id = auth.uid()
            AND e.status = 'active'
        )
    );
