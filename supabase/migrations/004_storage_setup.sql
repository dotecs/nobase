-- =====================================================
-- 노베이스구조대 SaaS MVP - 스토리지 설정
-- 코스 썸네일 이미지 저장용 버킷
-- =====================================================

-- =====================================================
-- STORAGE BUCKET 생성
-- =====================================================

-- course-thumbnails 버킷 생성 (공개 접근 가능)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-thumbnails',
    'course-thumbnails',
    TRUE,  -- 썸네일은 공개 접근 가능하도록 설정
    5242880,  -- 5MB 제한
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================

-- 모든 사용자가 썸네일 조회 가능 (공개 버킷이므로)
CREATE POLICY "course_thumbnails_select_public" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'course-thumbnails');

-- Admin만 업로드 가능
CREATE POLICY "course_thumbnails_insert_admin" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'course-thumbnails'
        AND is_admin()
    );

-- Admin만 수정 가능
CREATE POLICY "course_thumbnails_update_admin" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'course-thumbnails'
        AND is_admin()
    )
    WITH CHECK (
        bucket_id = 'course-thumbnails'
        AND is_admin()
    );

-- Admin만 삭제 가능
CREATE POLICY "course_thumbnails_delete_admin" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'course-thumbnails'
        AND is_admin()
    );

-- =====================================================
-- 추가 버킷: 레슨 리소스 (비공개)
-- =====================================================

-- lesson-resources 버킷 생성 (비공개)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'lesson-resources',
    'lesson-resources',
    FALSE,  -- 등록된 사용자만 접근 가능
    52428800,  -- 50MB 제한
    ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'application/zip',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
) ON CONFLICT (id) DO NOTHING;

-- 등록된 사용자만 레슨 리소스 조회 가능
CREATE POLICY "lesson_resources_select_enrolled" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'lesson-resources'
        AND (
            is_admin()
            OR EXISTS (
                SELECT 1 FROM enrollments e
                JOIN cohorts c ON c.id = e.cohort_id
                WHERE e.user_id = auth.uid()
                AND e.status = 'active'
            )
        )
    );

-- Admin만 레슨 리소스 업로드 가능
CREATE POLICY "lesson_resources_insert_admin" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'lesson-resources'
        AND is_admin()
    );

-- Admin만 레슨 리소스 수정 가능
CREATE POLICY "lesson_resources_update_admin" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'lesson-resources'
        AND is_admin()
    )
    WITH CHECK (
        bucket_id = 'lesson-resources'
        AND is_admin()
    );

-- Admin만 레슨 리소스 삭제 가능
CREATE POLICY "lesson_resources_delete_admin" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'lesson-resources'
        AND is_admin()
    );
