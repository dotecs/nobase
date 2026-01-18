-- cohorts 테이블에 수강료 정보 칼럼 추가
-- 실행: Supabase SQL Editor에서 실행

-- 수강료 칼럼 추가
ALTER TABLE cohorts
ADD COLUMN price INTEGER DEFAULT 0;

-- 할인 전 원래 가격 (선택적, 할인 표시용)
ALTER TABLE cohorts
ADD COLUMN original_price INTEGER DEFAULT NULL;

-- 코멘트 추가
COMMENT ON COLUMN cohorts.price IS '수강료 (원 단위). 0이면 무료.';
COMMENT ON COLUMN cohorts.original_price IS '할인 전 원래 가격 (원 단위). NULL이면 할인 없음.';
