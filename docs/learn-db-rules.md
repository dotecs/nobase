# 학습 모듈(learn_*) DB 작업 규칙

적용 대상: supabase/migrations/040_* 이후의 모든 파일, lib/learn/**, app/(main)/learn/**, app/(admin)/admin/learn/**

1. 추가만 한다. CREATE TABLE / CREATE INDEX / CREATE POLICY / CREATE FUNCTION / ALTER TABLE ... ADD COLUMN 만 허용.
2. learn_ 접두사가 없는 기존 테이블·정책·함수·트리거·뷰는 수정·삭제하지 않는다. (예외: 없음. 필요하면 명세에 적고 대표 승인)
3. 삭제 문장 금지: DROP, TRUNCATE, DELETE FROM, ALTER COLUMN TYPE. 외래키 정의의 ON DELETE CASCADE / ON DELETE SET NULL 절은 삭제 문장이 아니므로 허용한다(원격 스키마 재현·FK 무결성에 필요). 롤백 SQL은 같은 파일 하단에 주석(-- ROLLBACK:)으로 동봉한다.
4. 적용은 대표가 Supabase MCP apply_migration 또는 SQL Editor로 한다. 적용 직전 대시보드 백업(또는 supabase db dump) 1회.
5. 모든 learn_ 테이블은 RLS ENABLE. 정책은 "본인 행 읽기 + 본인 insert" 또는 "admin 전체"만. 학습자에게 UPDATE/DELETE 정책을 주지 않는다.
6. 테스트 계정은 /dev-login으로 만들고 profiles.name을 "[TEST] "로 시작한다. 코칭 과정 cohort는 is_active=false로 두어 공개 목록에 노출하지 않는다.
7. /learn 경로는 해당 course('root-math')에 active enrollment가 있는 계정만 진입한다.
8. 파일명 번호는 040부터 순차. 한 파일 = 한 목적. 파일 상단 주석에 목적·적용 여부·적용일을 적는다.
9. API 키·시크릿은 서버 환경변수만. NEXT_PUBLIC_ 접두사 금지. 코드·로그·보고서에 값 출력 금지.
