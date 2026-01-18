-- =====================================================
-- lesson_videos: 레슨 영상
-- =====================================================
-- 하나의 레슨에 여러 영상을 연결 (메인 1개 + 서브 여러개)

CREATE TABLE lesson_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 소속 레슨
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    
    -- 영상 제목
    title VARCHAR(200) NOT NULL,
    
    -- Vimeo 영상 URL (예: https://player.vimeo.com/video/1155653363)
    video_url TEXT NOT NULL,
    
    -- 메인 영상 여부 (레슨당 하나만 메인)
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- 정렬 순서 (메인 영상은 항상 맨 위)
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- 영상 설명
    description TEXT,
    
    -- 타임스탬프
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_lesson_videos_lesson_id ON lesson_videos(lesson_id);
CREATE INDEX idx_lesson_videos_sort_order ON lesson_videos(lesson_id, sort_order);
CREATE INDEX idx_lesson_videos_is_main ON lesson_videos(lesson_id, is_main);

-- 코멘트
COMMENT ON TABLE lesson_videos IS '레슨 영상 (메인 + 서브)';
COMMENT ON COLUMN lesson_videos.video_url IS 'Vimeo 영상 URL (임베드용)';
COMMENT ON COLUMN lesson_videos.is_main IS '메인 영상 여부 (레슨당 하나)';
COMMENT ON COLUMN lesson_videos.sort_order IS '표시 순서 (낮을수록 먼저)';

-- 레슨당 메인 영상은 하나만 허용하는 트리거
CREATE OR REPLACE FUNCTION check_main_video()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_main = TRUE THEN
        -- 기존 메인 영상을 서브로 변경
        UPDATE lesson_videos 
        SET is_main = FALSE 
        WHERE lesson_id = NEW.lesson_id 
          AND id != NEW.id 
          AND is_main = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_main_video
    BEFORE INSERT OR UPDATE ON lesson_videos
    FOR EACH ROW
    EXECUTE FUNCTION check_main_video();

-- updated_at 자동 갱신 트리거
CREATE TRIGGER update_lesson_videos_updated_at
    BEFORE UPDATE ON lesson_videos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS 정책
ALTER TABLE lesson_videos ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 조회 가능 (수강 여부는 애플리케이션에서 확인)
CREATE POLICY "lesson_videos_select_policy" ON lesson_videos
    FOR SELECT TO authenticated
    USING (true);

-- 관리자만 생성/수정/삭제 가능
CREATE POLICY "lesson_videos_insert_policy" ON lesson_videos
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "lesson_videos_update_policy" ON lesson_videos
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

CREATE POLICY "lesson_videos_delete_policy" ON lesson_videos
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- 기존 lessons 테이블의 vimeo_url 데이터를 lesson_videos로 마이그레이션
-- (기존 영상이 있는 경우 메인 영상으로 이동)
INSERT INTO lesson_videos (lesson_id, title, video_url, is_main, sort_order)
SELECT 
    id,
    title || ' - 메인 영상',
    vimeo_url,
    TRUE,
    0
FROM lessons
WHERE vimeo_url IS NOT NULL AND vimeo_url != '';

-- 기존 vimeo_url 컬럼은 유지 (호환성), 향후 제거 예정
COMMENT ON COLUMN lessons.vimeo_url IS '[DEPRECATED] lesson_videos 테이블 사용 권장';
