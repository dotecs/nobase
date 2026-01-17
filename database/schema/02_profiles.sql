-- =====================================================
-- profiles: 사용자 프로필
-- =====================================================
-- auth.users와 1:1 관계, 추가 사용자 정보 저장

CREATE TABLE profiles (
    -- PK: Supabase Auth의 user id 참조
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 사용자 역할 (student/admin)
    role user_role NOT NULL DEFAULT 'student',
    
    -- 이름 (OAuth에서 가져오거나 직접 입력)
    name VARCHAR(100),
    
    -- 전화번호 (선택)
    phone VARCHAR(15),
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_phone ON profiles(phone);

-- 코멘트
COMMENT ON TABLE profiles IS '사용자 프로필 정보';
COMMENT ON COLUMN profiles.user_id IS 'Supabase Auth user ID (PK)';
COMMENT ON COLUMN profiles.role IS '사용자 역할 (student/admin)';
COMMENT ON COLUMN profiles.name IS '사용자 이름';
COMMENT ON COLUMN profiles.phone IS '전화번호 (예: 010-1234-5678)';
