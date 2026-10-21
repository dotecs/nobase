-- =====================================================
-- 039: 수강생이 자기 기수를 읽을 수 있는 정책 복원
-- 배경: 010에서 cohorts_select_enrolled를 삭제하고 "활성 기수만" 정책으로 교체함.
--       2026-10-20 6기 기수를 비활성화하자 6기 수강생(활성 등록 17명)이 자기 기수를
--       조회하지 못해 대시보드에서 강좌가 사라지고 커리큘럼 페이지가 열리지 않음.
-- 정책은 OR 결합이므로 기존 활성 기수 공개(authenticated/anon)는 그대로 유지된다.
-- =====================================================
BEGIN;

CREATE POLICY "cohorts_select_enrolled" ON cohorts
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.cohort_id = cohorts.id AND e.user_id = auth.uid()
    ));

COMMIT;
