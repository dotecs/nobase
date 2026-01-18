-- 본인 enrollment 삭제 정책 추가 (수강신청 다시하기 기능용)
-- 단, paused 상태인 경우에만 삭제 가능 (입금 대기 중인 신청만 취소 가능)

CREATE POLICY "enrollments_delete_own_paused" ON enrollments
    FOR DELETE
    USING (
        auth.uid() = user_id 
        AND status = 'paused'
    );
