-- =====================================================
-- 마이그레이션: 수강생 본인 INSERT 시 필기 합격 필드 차단
-- 목적: enrollments_insert_own(온보딩용) 정책의 WITH CHECK 에
--       written_passed_at IS NULL 조건을 추가하여, 학생이 직접
--       '필기 합격' 상태의 수강 등록 행을 만들 수 없게 함
-- 필기 합격 처리는 관리자(enrollments_admin_all / is_admin())만 가능
-- 적용: 2026-10-12 Supabase MCP(apply_migration)로 원격 DB에 적용 완료
-- =====================================================

ALTER POLICY "enrollments_insert_own" ON enrollments
    WITH CHECK (auth.uid() = user_id AND written_passed_at IS NULL);
