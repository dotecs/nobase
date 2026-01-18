-- 기수별 인원 제한 칼럼 추가
-- 실행: Supabase SQL Editor에서 실행

-- cohorts 테이블에 max_students 칼럼 추가
-- NULL이면 인원 제한 없음, 숫자가 있으면 해당 인원까지만 등록 가능
ALTER TABLE cohorts
ADD COLUMN max_students INTEGER DEFAULT NULL;

-- 인덱스 추가 (인원 제한이 있는 기수 조회 최적화)
CREATE INDEX idx_cohorts_max_students ON cohorts(max_students) WHERE max_students IS NOT NULL;

-- 코멘트 추가
COMMENT ON COLUMN cohorts.max_students IS '기수별 최대 수강 인원. NULL이면 제한 없음.';
