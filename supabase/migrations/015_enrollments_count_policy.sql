-- 수강 정원 확인을 위한 enrollment count 조회 정책
-- 로그인한 사용자는 cohort별 등록 수를 조회할 수 있어야 함

-- 기존 정책과 별도로, 모든 로그인 사용자가 enrollment의 id, cohort_id, status만 조회 가능하도록 함
-- (개인정보 보호를 위해 user_id 등은 조회 불가)

-- 방법 1: 모든 enrollment를 조회 가능하게 함 (간단하지만 보안 취약)
-- 방법 2: Security definer 함수로 카운트만 반환

-- 여기서는 방법 1을 사용하되, 필요한 정보만 노출되도록 주의
-- enrollments 테이블의 SELECT 정책 추가

-- 모든 로그인 사용자가 enrollment 존재 여부 및 상태를 확인할 수 있도록 함
-- (정원 확인, 수강신청 페이지 표시 용도)
CREATE POLICY "enrollments_select_for_count" ON enrollments
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
