-- =====================================================
-- 마이그레이션: lesson_progress에 영상 시청 위치 컬럼 추가
-- 목적: Vimeo Player SDK에서 받은 timeupdate로 진도를 자동 반영
--   last_position_seconds  — 마지막 재생 위치 (이어보기용)
--   max_position_seconds   — 도달한 가장 먼 위치 (자동 완료 임계치 비교용)
--   auto_completed         — 자동 완료 여부 (수동 완료와 구분)
-- =====================================================

ALTER TABLE lesson_progress
    ADD COLUMN IF NOT EXISTS last_position_seconds INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_position_seconds INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS auto_completed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN lesson_progress.last_position_seconds IS
    '학생이 마지막으로 본 영상 위치 (초). 이어보기 시 이 지점부터 재생.';
COMMENT ON COLUMN lesson_progress.max_position_seconds IS
    '도달한 가장 먼 위치 (초). 영상 길이 대비 비율이 임계치(예: 90%)를 넘으면 자동 완료.';
COMMENT ON COLUMN lesson_progress.auto_completed IS
    'TRUE면 영상 재생 임계치 도달로 자동 완료. FALSE면 수동 완료 또는 미완료.';
