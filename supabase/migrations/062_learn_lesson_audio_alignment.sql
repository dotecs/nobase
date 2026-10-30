-- 목적: 문장 음성의 글자 정렬 저장과 버전 간 같은 해시 음성 재사용 인덱스
-- 적용 여부: 미적용 / 적용일: / 적용자:
ALTER TABLE public.learn_lesson_audio ADD COLUMN IF NOT EXISTS alignment jsonb;
CREATE INDEX IF NOT EXISTS learn_lesson_audio_reuse_idx ON public.learn_lesson_audio (lesson_id, text_hash);
-- ROLLBACK: 적용 전 백업으로 복원 여부를 대표가 판단한다.
