-- =====================================================
-- 레슨 질문/답변 기능 - 데이터베이스 스키마
-- =====================================================

-- =====================================================
-- TABLES
-- =====================================================

-- lesson_questions: 수강생 질문
CREATE TABLE lesson_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    video_timestamp VARCHAR(20), -- "0분 00초" 형식의 강의 지점
    image_url TEXT, -- 첨부 이미지 URL
    image_storage_path TEXT, -- Supabase Storage 경로
    is_answered BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- lesson_answers: 관리자 답변
CREATE TABLE lesson_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES lesson_questions(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- 텍스트 답변 (마크다운/수식 포함)
    video_url TEXT, -- 동영상 URL (Vimeo, YouTube 등)
    image_url TEXT, -- 첨부 이미지 URL
    image_storage_path TEXT, -- Supabase Storage 경로
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- 레슨별 질문 조회 최적화
CREATE INDEX idx_lesson_questions_lesson_id ON lesson_questions(lesson_id);

-- 사용자별 질문 조회 최적화
CREATE INDEX idx_lesson_questions_user_id ON lesson_questions(user_id);

-- 질문별 답변 조회 최적화
CREATE INDEX idx_lesson_answers_question_id ON lesson_answers(question_id);

-- 답변 안된 질문 조회 최적화
CREATE INDEX idx_lesson_questions_is_answered ON lesson_questions(is_answered);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- 질문 updated_at 자동 업데이트
CREATE TRIGGER update_lesson_questions_updated_at
    BEFORE UPDATE ON lesson_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 답변 updated_at 자동 업데이트
CREATE TRIGGER update_lesson_answers_updated_at
    BEFORE UPDATE ON lesson_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 답변 생성 시 질문의 is_answered 자동 업데이트
CREATE OR REPLACE FUNCTION update_question_answered_status()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE lesson_questions
    SET is_answered = TRUE, updated_at = NOW()
    WHERE id = NEW.question_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_question_answered
    AFTER INSERT ON lesson_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_question_answered_status();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE lesson_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_answers ENABLE ROW LEVEL SECURITY;

-- lesson_questions policies

-- 수강 등록된 레슨의 질문 조회 가능 (본인의 질문만)
CREATE POLICY "lesson_questions_select_own" ON lesson_questions
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_admin()
    );

-- 수강 등록된 사용자만 질문 생성 가능
CREATE POLICY "lesson_questions_insert_enrolled" ON lesson_questions
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND can_access_lesson(lesson_id)
    );

-- 본인 질문만 수정 가능
CREATE POLICY "lesson_questions_update_own" ON lesson_questions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 본인 질문만 삭제 가능
CREATE POLICY "lesson_questions_delete_own" ON lesson_questions
    FOR DELETE
    USING (user_id = auth.uid());

-- lesson_answers policies

-- 질문 작성자와 관리자가 답변 조회 가능
CREATE POLICY "lesson_answers_select" ON lesson_answers
    FOR SELECT
    USING (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM lesson_questions
            WHERE lesson_questions.id = lesson_answers.question_id
            AND lesson_questions.user_id = auth.uid()
        )
    );

-- 관리자만 답변 생성 가능
CREATE POLICY "lesson_answers_insert_admin" ON lesson_answers
    FOR INSERT
    WITH CHECK (is_admin() AND admin_id = auth.uid());

-- 관리자만 답변 수정 가능
CREATE POLICY "lesson_answers_update_admin" ON lesson_answers
    FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

-- 관리자만 답변 삭제 가능
CREATE POLICY "lesson_answers_delete_admin" ON lesson_answers
    FOR DELETE
    USING (is_admin());

-- =====================================================
-- STORAGE BUCKET for Q&A attachments
-- =====================================================

-- qa-attachments 버킷 생성
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'qa-attachments',
    'qa-attachments',
    FALSE,  -- 비공개 버킷
    10485760,  -- 10MB 제한
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm'
    ]
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for qa-attachments

-- 인증된 사용자가 자신의 파일 조회 가능
CREATE POLICY "qa_attachments_select" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'qa-attachments'
        AND (
            is_admin()
            OR (storage.foldername(name))[1] = auth.uid()::text
        )
    );

-- 인증된 사용자가 자신의 경로에 업로드 가능
CREATE POLICY "qa_attachments_insert" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'qa-attachments'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 관리자는 모든 경로에 업로드 가능
CREATE POLICY "qa_attachments_insert_admin" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'qa-attachments'
        AND is_admin()
    );

-- 인증된 사용자가 자신의 파일 삭제 가능
CREATE POLICY "qa_attachments_delete" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'qa-attachments'
        AND (
            is_admin()
            OR (storage.foldername(name))[1] = auth.uid()::text
        )
    );
