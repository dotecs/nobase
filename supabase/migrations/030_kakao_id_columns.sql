-- =====================================================
-- 마이그레이션: 카카오 ID 기반 매칭을 위한 컬럼 추가
-- 목적: 기존 플랫폼에서 카카오 ID(고유 정수)를 가져와 신규 가입자의
--       Kakao OAuth identity와 매칭. 이메일이 바뀐 사용자도 자동 링크 가능.
--
-- 사용 흐름:
--   1) 레거시 DB에서 사용자별 카카오 ID를 가져와 migrated_profiles.kakao_id에 채운다
--   2) 사용자가 신규 플랫폼에서 카카오 OAuth 로그인
--   3) auth callback이 auth.identities의 provider_id를 link_migrated_data RPC에 전달
--   4) link_migrated_data가 kakao_id로 매칭(우선) → 못 찾으면 email로 fallback
-- =====================================================

-- migrated_profiles에 카카오 ID 추가
ALTER TABLE migrated_profiles
    ADD COLUMN IF NOT EXISTS kakao_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_migrated_profiles_kakao_id
    ON migrated_profiles(kakao_id)
    WHERE kakao_id IS NOT NULL;

COMMENT ON COLUMN migrated_profiles.kakao_id IS
    '레거시 DB에서 가져온 카카오 사용자 ID (auth.identities.provider_id와 매칭)';

-- profiles에 카카오 ID 영구 저장 (관리자 화면에서 참조 용이)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS kakao_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_kakao_id
    ON profiles(kakao_id)
    WHERE kakao_id IS NOT NULL;

COMMENT ON COLUMN profiles.kakao_id IS
    '연결된 카카오 사용자 ID. 마이그레이션 매칭 결과 또는 신규 카카오 가입 시 저장.';
