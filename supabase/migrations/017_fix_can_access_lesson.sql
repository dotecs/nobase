-- can_access_lesson 함수 수정
-- lessons 테이블이 cohort_id 대신 course_id를 사용하도록 변경됨 (005_lessons_course_fk.sql)

CREATE OR REPLACE FUNCTION can_access_lesson(p_lesson_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lessons l
        JOIN cohorts c ON c.course_id = l.course_id
        JOIN enrollments e ON e.cohort_id = c.id
        WHERE l.id = p_lesson_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
