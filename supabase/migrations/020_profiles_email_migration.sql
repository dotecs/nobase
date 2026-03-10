-- =====================================================
-- 마이그레이션: profiles에 email 컬럼 추가
-- 목적: DB 전환 시 이메일 기반으로 기존 사용자 데이터 매칭
-- =====================================================

-- email 컬럼 추가 (auth.users에서 가져온 이메일 저장)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- legacy_user_id 컬럼 추가 (기존 DB의 user_id 저장, 마이그레이션 추적용)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legacy_user_id UUID;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_legacy_user_id ON profiles(legacy_user_id);

-- 코멘트
COMMENT ON COLUMN profiles.email IS '사용자 이메일 (auth.users에서 동기화, 마이그레이션 매칭용)';
COMMENT ON COLUMN profiles.legacy_user_id IS '기존 DB의 user_id (마이그레이션 추적용)';

-- 기존 profiles에 email 채우기 (auth.users에서 가져오기)
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id AND p.email IS NULL;
