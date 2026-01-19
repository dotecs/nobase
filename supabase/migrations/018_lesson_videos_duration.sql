-- lesson_videos 테이블에 영상 길이(duration) 컬럼 추가

ALTER TABLE lesson_videos 
ADD COLUMN duration_seconds INTEGER;

COMMENT ON COLUMN lesson_videos.duration_seconds IS '영상 길이 (초 단위)';
