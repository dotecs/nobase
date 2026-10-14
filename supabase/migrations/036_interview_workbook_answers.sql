-- =====================================================
-- 마이그레이션: 면접 워크북 답변 저장
-- 목적: 수강생이 /workbook/interview 에 입력한 답변을 사용자별로 1행(JSONB)에 저장
-- 구조: answers = { "<question_id>": "<text>" | true/false(체크리스트) }
-- 접근: 본인 행만 읽기/쓰기, 관리자는 전체 (추후 코칭용)
-- 적용: 2026-10-12 Supabase MCP(apply_migration)로 원격 DB에 적용 완료
-- =====================================================

CREATE TABLE IF NOT EXISTS interview_workbook_answers (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE interview_workbook_answers IS '면접 대비 워크북 답변 (사용자별 1행, JSONB)';
COMMENT ON COLUMN interview_workbook_answers.answers IS '질문 id → 답변 텍스트 또는 체크 여부(boolean)';
COMMENT ON COLUMN interview_workbook_answers.version IS '워크북 콘텐츠 버전 (질문 id 체계가 바뀔 때 증가)';

ALTER TABLE interview_workbook_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "iwa_select_own" ON interview_workbook_answers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "iwa_insert_own" ON interview_workbook_answers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "iwa_update_own" ON interview_workbook_answers
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "iwa_admin_all" ON interview_workbook_answers
    FOR ALL USING (is_admin());

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION set_interview_workbook_answers_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_iwa_updated_at
    BEFORE UPDATE ON interview_workbook_answers
    FOR EACH ROW EXECUTE FUNCTION set_interview_workbook_answers_updated_at();
