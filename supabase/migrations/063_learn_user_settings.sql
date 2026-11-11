-- 목적: 러닝 스튜디오 화면 설정(다크/라이트 모드)을 계정별로 저장
-- 적용 여부: 적용 / 적용일: 2026-11-11 / 적용자: Claude(대표 지시)
CREATE TABLE IF NOT EXISTS public.learn_user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_theme text NOT NULL DEFAULT 'dark' CHECK (studio_theme IN ('dark','light')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.learn_user_settings ENABLE ROW LEVEL SECURITY;
-- 읽기·쓰기는 서버(서비스 키)에서만 한다. 본인 행 조회만 허용.
DROP POLICY IF EXISTS learn_user_settings_select_own ON public.learn_user_settings;
CREATE POLICY learn_user_settings_select_own ON public.learn_user_settings FOR SELECT USING (auth.uid() = user_id);
-- ROLLBACK: DROP TABLE public.learn_user_settings;
