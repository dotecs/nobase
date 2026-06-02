-- =====================================================
-- 마이그레이션: link_migrated_data 함수에 search_path + row_security 잠금
-- 배경: SQL Editor(postgres role)에서는 linked:true, Supabase RPC(authenticated)에서는
--       linked:false 반환하는 현상. SECURITY DEFINER가 caller role의 search_path/RLS
--       영향을 받는 케이스. 명시적으로 잠가서 어떤 caller에서도 동일 동작 보장.
-- =====================================================

ALTER FUNCTION link_migrated_data(UUID, VARCHAR, BIGINT)
    SET search_path = public, pg_catalog,
    SET row_security = off;

-- 누군가 EXECUTE 권한이 없을 가능성을 봉인
GRANT EXECUTE ON FUNCTION link_migrated_data(UUID, VARCHAR, BIGINT) TO authenticated, anon, service_role;
