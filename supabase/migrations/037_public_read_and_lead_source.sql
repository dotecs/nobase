-- Public course discovery. Apply manually in the Supabase SQL editor.
-- Keep lessons protected; expose only the selected public metadata through a view.
BEGIN;

CREATE POLICY "courses_select_anon_public" ON courses
    FOR SELECT TO anon
    USING (is_published = TRUE);

CREATE POLICY "cohorts_select_anon_public" ON cohorts
    FOR SELECT TO anon
    USING (
        is_active = TRUE
        AND EXISTS (
            SELECT 1 FROM courses c
            WHERE c.id = cohorts.course_id AND c.is_published = TRUE
        )
    );

DROP POLICY IF EXISTS "Subjects visible per visibility rule" ON subjects;
CREATE POLICY "Subjects visible per visibility rule"
ON subjects FOR SELECT
USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
    OR (
        is_published = true
        AND EXISTS (SELECT 1 FROM courses c WHERE c.id = subjects.course_id AND c.is_published = true)
        AND (
            visibility = 'public'
            OR EXISTS (SELECT 1 FROM subject_visibility sv
                       WHERE sv.subject_id = subjects.id AND sv.user_id = auth.uid())
            OR EXISTS (SELECT 1 FROM subject_visibility_cohorts svc
                       JOIN enrollments e ON e.cohort_id = svc.cohort_id
                       WHERE svc.subject_id = subjects.id AND e.user_id = auth.uid() AND e.status = 'active')
        )
    )
);

-- Intentionally use the owner's permissions: anon cannot read the lessons table.
-- Run as postgres, the intended owner of this view.
CREATE OR REPLACE VIEW lessons_public WITH (security_invoker = false) AS
SELECT l.id, l.course_id, l.subject_id, l.title, l.description,
       l.sort_order, l.is_free, l.available_at, l.created_at
FROM lessons l
JOIN courses c ON c.id = l.course_id
WHERE l.is_published = TRUE AND c.is_published = TRUE;

COMMENT ON VIEW lessons_public IS '공개 목차용. resources(첨부자료) 제외. 발행 강좌의 발행 레슨만.';
GRANT SELECT ON lessons_public TO anon, authenticated;

-- The base lessons table is hidden from anon, so check the public view here.
CREATE POLICY "lesson_videos_select_anon_public" ON lesson_videos
    FOR SELECT TO anon
    USING (EXISTS (
        SELECT 1 FROM lessons_public lp
        WHERE lp.id = lesson_videos.lesson_id AND lp.is_free = TRUE
    ));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lead_source VARCHAR(50);
COMMENT ON COLUMN profiles.lead_source IS '가입 경로. free_lesson: 무료강의 게이트에서 가입. NULL: 기타';

COMMIT;
