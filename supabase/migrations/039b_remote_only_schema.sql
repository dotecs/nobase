-- 원격(nobase911)에 MCP/대시보드로 기적용된 스키마의 역추적본. 새 환경 재현용. 운영에 다시 적용하지 말 것. 근거: docs/db/remote-schema-2026-10-26.md

-- 20260707063000_add_pending_to_enrollment_status
ALTER TYPE enrollment_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'active';

-- 20260707062847_enable_rls_migrated_tables
-- 정책 없음이 의도된 상태다.
ALTER TABLE migrated_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrated_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrated_lesson_progress ENABLE ROW LEVEL SECURITY;

-- 20260810070703_create_payments_table
CREATE TABLE IF NOT EXISTS payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id text NOT NULL,
    user_id uuid NOT NULL,
    cohort_id uuid NOT NULL,
    amount integer NOT NULL,
    status text NOT NULL DEFAULT 'ready',
    payment_key text,
    method text,
    receipt_url text,
    fail_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz,
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_order_id_key UNIQUE (order_id),
    CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT payments_cohort_id_fkey FOREIGN KEY (cohort_id) REFERENCES cohorts(id) ON DELETE CASCADE,
    CONSTRAINT payments_status_check CHECK (status IN ('ready','paid','failed','canceled'))
);

CREATE INDEX payments_order_id_idx ON payments USING btree (order_id);
CREATE INDEX payments_user_id_idx ON payments USING btree (user_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_select_own ON payments FOR SELECT TO public
    USING (auth.uid() = user_id);
COMMENT ON TABLE payments IS '토스페이먼츠 결제 기록 (카드결제 자동 승인 플로우)';
