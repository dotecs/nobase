-- =====================================================
-- 마이그레이션 임시 테이블 생성
-- 목적: 레거시 DB에서 이전된 데이터를 저장 (user_id 연결 전)
-- =====================================================

-- 마이그레이션된 프로필 (이메일 기반)
CREATE TABLE IF NOT EXISTS migrated_profiles (
    id SERIAL PRIMARY KEY,
    legacy_user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'student',
    name VARCHAR(100),
    phone VARCHAR(15),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    -- 새 DB에 연결되었는지 여부
    linked_user_id UUID REFERENCES auth.users(id),
    linked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_migrated_profiles_email ON migrated_profiles(email);
CREATE INDEX IF NOT EXISTS idx_migrated_profiles_linked ON migrated_profiles(linked_user_id);

-- 마이그레이션된 수강등록
CREATE TABLE IF NOT EXISTS migrated_enrollments (
    id UUID PRIMARY KEY,
    legacy_user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    cohort_id UUID NOT NULL,
    status enrollment_status NOT NULL DEFAULT 'active',
    receipt_contact VARCHAR(20),
    depositor_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    -- 새 DB에 연결되었는지 여부
    linked_user_id UUID REFERENCES auth.users(id),
    linked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_migrated_enrollments_email ON migrated_enrollments(email);

-- 마이그레이션된 학습진도
CREATE TABLE IF NOT EXISTS migrated_lesson_progress (
    id UUID PRIMARY KEY,
    legacy_user_id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    lesson_id UUID NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    -- 새 DB에 연결되었는지 여부
    linked_user_id UUID REFERENCES auth.users(id),
    linked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_migrated_lesson_progress_email ON migrated_lesson_progress(email);

-- 코멘트
COMMENT ON TABLE migrated_profiles IS '레거시 DB에서 마이그레이션된 프로필 (로그인 시 자동 연결)';
COMMENT ON TABLE migrated_enrollments IS '레거시 DB에서 마이그레이션된 수강등록 (로그인 시 자동 연결)';
COMMENT ON TABLE migrated_lesson_progress IS '레거시 DB에서 마이그레이션된 학습진도 (로그인 시 자동 연결)';
