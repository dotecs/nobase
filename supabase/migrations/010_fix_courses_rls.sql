-- 수강 신청 페이지에서 courses, lessons 조회 가능하도록 RLS 정책 수정
-- 실행: Supabase SQL Editor에서 실행

-- =====================================================
-- COURSES 정책 수정
-- =====================================================

-- 기존 courses SELECT 정책 삭제
DROP POLICY IF EXISTS "courses_select_enrolled" ON courses;

-- 발행된 강좌는 로그인한 모든 사용자가 조회 가능 (수강 신청을 위해)
CREATE POLICY "courses_select_published" ON courses
    FOR SELECT
    USING (
        is_published = TRUE
        AND auth.uid() IS NOT NULL
    );

-- =====================================================
-- LESSONS 정책 수정
-- =====================================================

-- 기존 lessons SELECT 정책 삭제
DROP POLICY IF EXISTS "lessons_select_enrolled" ON lessons;
DROP POLICY IF EXISTS "lessons_select_published" ON lessons;

-- 모든 레슨은 로그인한 모든 사용자가 조회 가능 (수강 신청 페이지 커리큘럼 표시용)
-- is_published 여부와 상관없이 커리큘럼 목록을 볼 수 있어야 함
CREATE POLICY "lessons_select_all" ON lessons
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- =====================================================
-- COHORTS 정책 수정
-- =====================================================

-- 기존 cohorts SELECT 정책 삭제
DROP POLICY IF EXISTS "cohorts_select_enrolled" ON cohorts;
DROP POLICY IF EXISTS "cohorts_select_active_for_enrollment" ON cohorts;

-- 활성화된 기수는 로그인한 모든 사용자가 조회 가능 (수강 신청을 위해)
CREATE POLICY "cohorts_select_active" ON cohorts
    FOR SELECT
    USING (
        is_active = TRUE
        AND auth.uid() IS NOT NULL
    );

-- 선택적: 발행된 강좌/레슨은 비로그인 사용자도 조회 가능하게 하려면 아래 정책 사용
-- CREATE POLICY "courses_select_published" ON courses
--     FOR SELECT
--     USING (is_published = TRUE);
-- CREATE POLICY "lessons_select_published" ON lessons
--     FOR SELECT
--     USING (is_published = TRUE);

-- Admin 전체 CRUD 정책은 그대로 유지 (이미 존재함)
