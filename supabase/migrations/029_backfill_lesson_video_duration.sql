-- =====================================================
-- 마이그레이션: lesson_videos.duration_seconds 백필 함수
-- 목적: 학생이 영상을 재생할 때 Vimeo SDK가 알려주는 duration을
--       메인 영상에 자동 채워넣음. 관리자가 수동 입력 안 했어도
--       자연스럽게 수강시간/강의시간 통계가 채워짐.
--
-- 안전장치:
--   - duration이 비어있을 때(NULL 또는 0)만 채움 — 기존 값 절대 덮어쓰지 않음
--   - 메인 영상만 대상 (lesson의 대표 영상)
--   - 양수 duration만 허용
--   - SECURITY DEFINER로 RLS 우회하지만 조건이 엄격해 악용 어려움
-- =====================================================

CREATE OR REPLACE FUNCTION backfill_lesson_video_duration(
    p_lesson_id UUID,
    p_duration INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_duration IS NULL OR p_duration <= 0 THEN
        RETURN;
    END IF;

    UPDATE lesson_videos
    SET duration_seconds = p_duration,
        updated_at = NOW()
    WHERE lesson_id = p_lesson_id
      AND is_main = TRUE
      AND (duration_seconds IS NULL OR duration_seconds = 0);
END;
$$;

GRANT EXECUTE ON FUNCTION backfill_lesson_video_duration(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION backfill_lesson_video_duration IS
    '학생이 영상 시청 시 Vimeo SDK가 보고한 duration을 메인 영상의 duration_seconds가 비어있는 경우에 한해 채워넣는 헬퍼.';
