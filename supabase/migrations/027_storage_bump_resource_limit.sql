-- =====================================================
-- 마이그레이션: lesson-resources 버킷 파일 크기 제한 상향
-- 50MB → 300MB
-- =====================================================

UPDATE storage.buckets
SET file_size_limit = 314572800  -- 300MB = 300 * 1024 * 1024
WHERE id = 'lesson-resources';
