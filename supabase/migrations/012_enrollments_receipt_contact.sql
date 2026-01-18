-- enrollments 테이블에 현금영수증 처리용 연락처 칼럼 추가
-- 실행: Supabase SQL Editor에서 실행

-- 현금영수증용 연락처 칼럼 추가 (휴대폰 번호 또는 사업자등록번호)
ALTER TABLE enrollments
ADD COLUMN receipt_contact VARCHAR(20) DEFAULT NULL;

-- 코멘트 추가
COMMENT ON COLUMN enrollments.receipt_contact IS '현금영수증 발급용 연락처 (휴대폰번호 또는 사업자등록번호)';
