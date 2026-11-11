-- 러닝 스튜디오 기본 테마를 라이트로 (저장값이 없으면 앱도 라이트로 시작)
ALTER TABLE public.learn_user_settings ALTER COLUMN studio_theme SET DEFAULT 'light';
