-- =====================================================
-- 마이그레이션 데이터 연결 함수
-- 목적: 신규 로그인 시 이메일로 기존 데이터 자동 연결
-- =====================================================

-- 마이그레이션된 데이터를 새 user_id에 연결하는 함수
CREATE OR REPLACE FUNCTION link_migrated_data(p_user_id UUID, p_email VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile migrated_profiles%ROWTYPE;
    v_result JSONB := '{"linked": false}'::JSONB;
    v_enrollments_count INT := 0;
    v_progress_count INT := 0;
BEGIN
    -- 1. 마이그레이션된 프로필 확인
    SELECT * INTO v_profile
    FROM migrated_profiles
    WHERE email = p_email AND linked_user_id IS NULL
    LIMIT 1;

    IF v_profile.id IS NOT NULL THEN
        -- 2. profiles 테이블에 삽입 또는 업데이트
        INSERT INTO profiles (user_id, role, name, phone, email, legacy_user_id, created_at, updated_at)
        VALUES (
            p_user_id,
            v_profile.role,
            v_profile.name,
            v_profile.phone,
            p_email,
            v_profile.legacy_user_id,
            COALESCE(v_profile.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            role = EXCLUDED.role,
            name = COALESCE(profiles.name, EXCLUDED.name),
            phone = COALESCE(profiles.phone, EXCLUDED.phone),
            email = EXCLUDED.email,
            legacy_user_id = EXCLUDED.legacy_user_id,
            updated_at = NOW();

        -- 3. migrated_profiles 연결 표시
        UPDATE migrated_profiles
        SET linked_user_id = p_user_id, linked_at = NOW()
        WHERE id = v_profile.id;

        -- 4. 수강등록 데이터 이전
        INSERT INTO enrollments (id, user_id, cohort_id, status, receipt_contact, depositor_name, legacy_user_id, created_at, updated_at)
        SELECT 
            me.id,
            p_user_id,
            me.cohort_id,
            me.status,
            me.receipt_contact,
            me.depositor_name,
            me.legacy_user_id,
            COALESCE(me.created_at, NOW()),
            NOW()
        FROM migrated_enrollments me
        WHERE me.email = p_email AND me.linked_user_id IS NULL
        ON CONFLICT (user_id, cohort_id) DO NOTHING;

        GET DIAGNOSTICS v_enrollments_count = ROW_COUNT;

        -- 수강등록 연결 표시
        UPDATE migrated_enrollments
        SET linked_user_id = p_user_id, linked_at = NOW()
        WHERE email = p_email AND linked_user_id IS NULL;

        -- 5. 학습진도 데이터 이전
        INSERT INTO lesson_progress (id, user_id, lesson_id, completed, completed_at, legacy_user_id, created_at, updated_at)
        SELECT 
            mlp.id,
            p_user_id,
            mlp.lesson_id,
            mlp.completed,
            mlp.completed_at,
            mlp.legacy_user_id,
            COALESCE(mlp.created_at, NOW()),
            NOW()
        FROM migrated_lesson_progress mlp
        WHERE mlp.email = p_email AND mlp.linked_user_id IS NULL
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        GET DIAGNOSTICS v_progress_count = ROW_COUNT;

        -- 학습진도 연결 표시
        UPDATE migrated_lesson_progress
        SET linked_user_id = p_user_id, linked_at = NOW()
        WHERE email = p_email AND linked_user_id IS NULL;

        v_result := jsonb_build_object(
            'linked', true,
            'profile', true,
            'enrollments', v_enrollments_count,
            'lesson_progress', v_progress_count
        );
    ELSE
        -- 마이그레이션 데이터가 없으면 기본 프로필만 생성
        INSERT INTO profiles (user_id, email, role, created_at, updated_at)
        VALUES (p_user_id, p_email, 'student', NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
    END IF;

    RETURN v_result;
END;
$$;

-- 코멘트
COMMENT ON FUNCTION link_migrated_data IS '로그인 시 마이그레이션된 데이터를 새 user_id에 연결';
