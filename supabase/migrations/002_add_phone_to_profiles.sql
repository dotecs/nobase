-- =====================================================
-- Migration: Add phone column to profiles + Update handle_new_user
-- Date: 2025-12-24
-- =====================================================

-- 1. profiles 테이블에 phone 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(15);

-- 인덱스 추가 (전화번호 검색용)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- 코멘트 추가
COMMENT ON COLUMN profiles.phone IS '전화번호 (예: 010-1234-5678)';

-- 2. handle_new_user 함수 업데이트 (OAuth 메타데이터에서 정보 추출)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_phone TEXT;
BEGIN
    -- OAuth provider별 name 추출
    -- Google: name 또는 full_name
    -- Kakao: kakao_account.profile.nickname 또는 name
    v_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->'kakao_account'->'profile'->>'nickname',
        NEW.email
    );
    
    -- OAuth provider별 phone 추출
    -- Kakao: kakao_account.phone_number (예: +82 10-1234-5678)
    v_phone := NEW.raw_user_meta_data->'kakao_account'->>'phone_number';
    
    -- 카카오 전화번호 형식 정리 (+82 10-1234-5678 -> 010-1234-5678)
    IF v_phone IS NOT NULL AND v_phone LIKE '+82%' THEN
        v_phone := '0' || REGEXP_REPLACE(
            SUBSTRING(v_phone FROM 5), -- '+82 ' 제거
            '[^0-9]', '', 'g' -- 숫자만 남김
        );
        -- 형식 맞추기 (01012345678 -> 010-1234-5678)
        IF LENGTH(v_phone) = 11 THEN
            v_phone := SUBSTRING(v_phone, 1, 3) || '-' || 
                       SUBSTRING(v_phone, 4, 4) || '-' || 
                       SUBSTRING(v_phone, 8, 4);
        END IF;
    END IF;

    INSERT INTO profiles (user_id, name, phone, role)
    VALUES (
        NEW.id,
        v_name,
        v_phone,
        'student'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
