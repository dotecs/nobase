-- =====================================================
-- ENUM Types
-- =====================================================
-- 사용자 역할 및 상태 정의

-- 사용자 역할
-- student: 일반 수강생
-- admin: 관리자
CREATE TYPE user_role AS ENUM ('student', 'admin');

-- 수강 상태
-- active: 수강 중
-- paused: 일시 중지
-- ended: 수강 종료
CREATE TYPE enrollment_status AS ENUM ('active', 'paused', 'ended');
