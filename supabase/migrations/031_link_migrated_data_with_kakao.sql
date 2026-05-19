-- =====================================================
-- 마이그레이션: link_migrated_data 함수를 카카오 ID 우선 매칭으로 업그레이드
-- 매칭 우선순위:
--   1) kakao_id가 주어지고 migrated_profiles.kakao_id와 일치 → 이걸로 매칭 (이메일 변경 무관)
--   2) 1번 실패 시, p_email로 migrated_profiles.email 매칭 (기존 동작)
--   3) 둘 다 실패 시, 빈 profiles 생성
--
-- 매칭된 migrated_profiles의 email로 enrollments/lesson_progress까지 끌어옴.
-- 함수 시그니처에 p_kakao_id 옵셔널 추가. 기존 호출부 호환을 위해 디폴트 NULL.
-- 기존 2-arg 함수와의 오버로딩 충돌 방지를 위해 먼저 DROP.
-- =====================================================

DROP FUNCTION IF EXISTS link_migrated_data(UUID, VARCHAR);
DROP FUNCTION IF EXISTS link_migrated_data(UUID, VARCHAR, BIGINT);

CREATE OR REPLACE FUNCTION link_migrated_data(
    p_user_id UUID,
    p_email VARCHAR,
    p_kakao_id BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile migrated_profiles%ROWTYPE;
    v_match_source TEXT;
    v_legacy_email VARCHAR;
    v_result JSONB := '{"linked": false}'::JSONB;
    v_enrollments_count INT := 0;
    v_progress_count INT := 0;
    v_cohort_titles TEXT[];
BEGIN
    -- 1) 카카오 ID로 우선 매칭
    IF p_kakao_id IS NOT NULL THEN
        SELECT * INTO v_profile
        FROM migrated_profiles
        WHERE kakao_id = p_kakao_id
          AND linked_user_id IS NULL
        LIMIT 1;
        IF v_profile.id IS NOT NULL THEN
            v_match_source := 'kakao_id';
        END IF;
    END IF;

    -- 2) 카카오 ID 매칭 실패 시 이메일로 fallback
    IF v_profile.id IS NULL AND p_email IS NOT NULL THEN
        SELECT * INTO v_profile
        FROM migrated_profiles
        WHERE email = p_email
          AND linked_user_id IS NULL
        LIMIT 1;
        IF v_profile.id IS NOT NULL THEN
            v_match_source := 'email';
        END IF;
    END IF;

    IF v_profile.id IS NOT NULL THEN
        v_legacy_email := v_profile.email;

        -- profiles 테이블에 삽입 또는 업데이트
        INSERT INTO profiles (user_id, role, name, phone, email, kakao_id, legacy_user_id, created_at, updated_at)
        VALUES (
            p_user_id,
            v_profile.role,
            v_profile.name,
            v_profile.phone,
            COALESCE(p_email, v_legacy_email),
            COALESCE(p_kakao_id, v_profile.kakao_id),
            v_profile.legacy_user_id,
            COALESCE(v_profile.created_at, NOW()),
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            role = EXCLUDED.role,
            name = COALESCE(profiles.name, EXCLUDED.name),
            phone = COALESCE(profiles.phone, EXCLUDED.phone),
            email = COALESCE(profiles.email, EXCLUDED.email),
            kakao_id = COALESCE(profiles.kakao_id, EXCLUDED.kakao_id),
            legacy_user_id = COALESCE(profiles.legacy_user_id, EXCLUDED.legacy_user_id),
            updated_at = NOW();

        -- migrated_profiles 링크 표시
        UPDATE migrated_profiles
        SET linked_user_id = p_user_id, linked_at = NOW()
        WHERE id = v_profile.id;

        -- 수강등록 이전 (legacy email 기준). 어떤 cohort들을 등록했는지 RETURNING으로 캡처.
        WITH inserted AS (
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
            WHERE me.email = v_legacy_email
              AND me.linked_user_id IS NULL
            ON CONFLICT (user_id, cohort_id) DO NOTHING
            RETURNING cohort_id
        ),
        titles AS (
            SELECT c.title
            FROM inserted i
            JOIN cohorts c ON c.id = i.cohort_id
            ORDER BY c.created_at
        )
        SELECT COALESCE(array_agg(title), ARRAY[]::TEXT[]), COUNT(*)::INT
        INTO v_cohort_titles, v_enrollments_count
        FROM titles;

        UPDATE migrated_enrollments
        SET linked_user_id = p_user_id, linked_at = NOW()
        WHERE email = v_legacy_email AND linked_user_id IS NULL;

        -- 학습진도 이전 (legacy email 기준)
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
        WHERE mlp.email = v_legacy_email
          AND mlp.linked_user_id IS NULL
        ON CONFLICT (user_id, lesson_id) DO NOTHING;

        GET DIAGNOSTICS v_progress_count = ROW_COUNT;

        UPDATE migrated_lesson_progress
        SET linked_user_id = p_user_id, linked_at = NOW()
        WHERE email = v_legacy_email AND linked_user_id IS NULL;

        v_result := jsonb_build_object(
            'linked', true,
            'match_source', v_match_source,
            'legacy_email', v_legacy_email,
            'name', v_profile.name,
            'profile', true,
            'enrollments', v_enrollments_count,
            'lesson_progress', v_progress_count,
            'cohort_titles', to_jsonb(v_cohort_titles)
        );
    ELSE
        -- 매칭 데이터 없음 → 기본 profiles 행 보장 (kakao_id가 있으면 같이 저장)
        INSERT INTO profiles (user_id, email, kakao_id, role, created_at, updated_at)
        VALUES (p_user_id, p_email, p_kakao_id, 'student', NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            email = COALESCE(profiles.email, EXCLUDED.email),
            kakao_id = COALESCE(profiles.kakao_id, EXCLUDED.kakao_id),
            updated_at = NOW();
    END IF;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION link_migrated_data(UUID, VARCHAR, BIGINT) IS
    '로그인 시 마이그레이션 데이터를 새 user_id에 자동 연결. 카카오 ID 우선 매칭, 실패 시 이메일 fallback.';
