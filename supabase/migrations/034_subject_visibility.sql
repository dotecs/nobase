-- =====================================================
-- 마이그레이션: 과목(Subject) 사용자별 공개 제어
-- 목적: 특정 유저 또는 특정 cohort에게만 노출되는 subject 지원 (화이트리스트 방식)
-- 정책: visibility='restricted'이면 아래 중 하나 이상 만족해야 조회 가능
--         (a) subject_visibility에 유저가 등록됨
--         (b) subject_visibility_cohorts에 등록된 cohort에 active 등록되어 있음
--       visibility='public'(기본)이면 지금과 동일하게 모두 공개
-- =====================================================

-- 1) subjects.visibility 컬럼 추가
ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) NOT NULL DEFAULT 'public'
        CHECK (visibility IN ('public', 'restricted'));

COMMENT ON COLUMN subjects.visibility IS
    '공개 범위. public: 모두 공개(기본). restricted: subject_visibility에 등록된 유저만 조회 가능';

CREATE INDEX IF NOT EXISTS idx_subjects_visibility ON subjects(visibility);

-- 2) subject_visibility 허용 유저 테이블
CREATE TABLE IF NOT EXISTS subject_visibility (
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (subject_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_visibility_user_id ON subject_visibility(user_id);

COMMENT ON TABLE subject_visibility IS
    'restricted subject에 접근 가능한 유저 화이트리스트';

-- 3) subject_visibility_cohorts (cohort 단위 허용목록)
CREATE TABLE IF NOT EXISTS subject_visibility_cohorts (
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (subject_id, cohort_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_visibility_cohorts_cohort_id
    ON subject_visibility_cohorts(cohort_id);

COMMENT ON TABLE subject_visibility_cohorts IS
    'restricted subject에 접근 가능한 cohort 화이트리스트 (해당 cohort에 active 등록된 모든 유저)';

-- 4) subjects RLS 정책 재설정
DROP POLICY IF EXISTS "Anyone can view published subjects" ON subjects;
DROP POLICY IF EXISTS "Subjects visible per visibility rule" ON subjects;

CREATE POLICY "Subjects visible per visibility rule"
ON subjects FOR SELECT
USING (
    is_published = true
    AND (
        visibility = 'public'
        OR EXISTS (
            SELECT 1 FROM subject_visibility sv
            WHERE sv.subject_id = subjects.id
            AND sv.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM subject_visibility_cohorts svc
            JOIN enrollments e ON e.cohort_id = svc.cohort_id
            WHERE svc.subject_id = subjects.id
            AND e.user_id = auth.uid()
            AND e.status = 'active'
        )
        OR EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
);

-- 5) subject_visibility RLS 정책
ALTER TABLE subject_visibility ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage subject_visibility" ON subject_visibility;
CREATE POLICY "Admins manage subject_visibility"
ON subject_visibility FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
);

DROP POLICY IF EXISTS "Users read own subject_visibility" ON subject_visibility;
CREATE POLICY "Users read own subject_visibility"
ON subject_visibility FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 6) subject_visibility_cohorts RLS 정책
ALTER TABLE subject_visibility_cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage subject_visibility_cohorts" ON subject_visibility_cohorts;
CREATE POLICY "Admins manage subject_visibility_cohorts"
ON subject_visibility_cohorts FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 유저는 자신이 active 등록된 cohort의 허용 여부를 조회 가능 (subjects RLS 서브쿼리에서 사용)
DROP POLICY IF EXISTS "Users read own cohort subject_visibility_cohorts" ON subject_visibility_cohorts;
CREATE POLICY "Users read own cohort subject_visibility_cohorts"
ON subject_visibility_cohorts FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.cohort_id = subject_visibility_cohorts.cohort_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
);
