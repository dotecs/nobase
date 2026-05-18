-- =====================================================
-- 마이그레이션: subjects.resources 컬럼 추가
-- 목적: 과목 단위로 모든 강의에 공통으로 노출할 자료를 보관
-- 구조는 lessons.resources와 동일 (Resource[] JSON)
-- =====================================================

ALTER TABLE subjects
    ADD COLUMN IF NOT EXISTS resources JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN subjects.resources IS
    '과목 공통 학습 자료 — 해당 과목에 속한 모든 강의 페이지에 머지되어 노출됨. 구조: Array<{ type, title, url, storage_path?, caption? }>';
