-- Apply manually after 037. Keep the view's columns and dependencies unchanged.
BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
ON lessons_public FROM anon, authenticated;

CREATE OR REPLACE VIEW lessons_public WITH (security_invoker = false) AS
SELECT l.id, l.course_id, l.subject_id, l.title, l.description,
       l.sort_order, l.is_free, l.available_at, l.created_at
FROM lessons l
JOIN courses c ON c.id = l.course_id
LEFT JOIN subjects s ON s.id = l.subject_id
WHERE l.is_published = TRUE AND c.is_published = TRUE
  AND (l.subject_id IS NULL OR (s.is_published = TRUE AND s.visibility = 'public'));

COMMIT;
