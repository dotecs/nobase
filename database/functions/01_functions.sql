-- =====================================================
-- Helper Functions
-- =====================================================

-- -----------------------------------------------------
-- updated_at 자동 업데이트 함수
-- 모든 테이블의 updated_at 컬럼 자동 갱신
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- 관리자 여부 확인
-- 현재 인증된 사용자가 admin인지 확인
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- 수강 등록 여부 확인
-- 현재 사용자가 특정 기수에 활성 등록되어 있는지 확인
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION has_enrollment(p_cohort_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM enrollments 
        WHERE user_id = auth.uid() 
        AND cohort_id = p_cohort_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- 레슨 접근 권한 확인
-- 현재 사용자가 특정 레슨에 접근 가능한지 확인
-- (해당 레슨이 속한 기수에 등록되어 있어야 함)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION can_access_lesson(p_lesson_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lessons l
        JOIN enrollments e ON e.cohort_id = l.cohort_id
        WHERE l.id = p_lesson_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------
-- 신규 사용자 프로필 자동 생성
-- auth.users에 새 사용자 생성 시 profiles 자동 생성
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id, name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        'student'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
