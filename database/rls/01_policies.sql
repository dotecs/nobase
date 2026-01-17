-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
-- Supabase에서 데이터 접근 제어

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------
-- profiles 정책
-- -----------------------------------------------------

-- 본인 프로필 조회
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = user_id);

-- 본인 프로필 수정
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- 관리자는 모든 프로필 조회
CREATE POLICY "Admins can view all profiles"
    ON profiles FOR SELECT
    USING (is_admin());

-- -----------------------------------------------------
-- courses 정책
-- -----------------------------------------------------

-- 공개된 강좌는 누구나 조회
CREATE POLICY "Anyone can view published courses"
    ON courses FOR SELECT
    USING (is_published = true);

-- 관리자는 모든 강좌 조회/수정
CREATE POLICY "Admins can do anything with courses"
    ON courses FOR ALL
    USING (is_admin());

-- -----------------------------------------------------
-- cohorts 정책
-- -----------------------------------------------------

-- 활성 기수는 누구나 조회
CREATE POLICY "Anyone can view active cohorts"
    ON cohorts FOR SELECT
    USING (is_active = true);

-- 관리자는 모든 기수 관리
CREATE POLICY "Admins can do anything with cohorts"
    ON cohorts FOR ALL
    USING (is_admin());

-- -----------------------------------------------------
-- lessons 정책
-- -----------------------------------------------------

-- 등록된 사용자만 레슨 조회
CREATE POLICY "Enrolled users can view lessons"
    ON lessons FOR SELECT
    USING (
        is_published = true 
        AND has_enrollment(cohort_id)
    );

-- 관리자는 모든 레슨 관리
CREATE POLICY "Admins can do anything with lessons"
    ON lessons FOR ALL
    USING (is_admin());

-- -----------------------------------------------------
-- enrollments 정책
-- -----------------------------------------------------

-- 본인 수강 정보 조회
CREATE POLICY "Users can view own enrollments"
    ON enrollments FOR SELECT
    USING (auth.uid() = user_id);

-- 관리자는 모든 수강 정보 관리
CREATE POLICY "Admins can do anything with enrollments"
    ON enrollments FOR ALL
    USING (is_admin());

-- -----------------------------------------------------
-- lesson_progress 정책
-- -----------------------------------------------------

-- 본인 진도 조회
CREATE POLICY "Users can view own progress"
    ON lesson_progress FOR SELECT
    USING (auth.uid() = user_id);

-- 본인 진도 생성/수정
CREATE POLICY "Users can manage own progress"
    ON lesson_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON lesson_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- 관리자는 모든 진도 조회
CREATE POLICY "Admins can view all progress"
    ON lesson_progress FOR SELECT
    USING (is_admin());

-- -----------------------------------------------------
-- announcements 정책
-- -----------------------------------------------------

-- 등록된 사용자는 해당 기수의 공지 조회
CREATE POLICY "Enrolled users can view announcements"
    ON announcements FOR SELECT
    USING (has_enrollment(cohort_id));

-- 관리자는 모든 공지 관리
CREATE POLICY "Admins can do anything with announcements"
    ON announcements FOR ALL
    USING (is_admin());
