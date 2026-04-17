-- =====================================================
-- 마이그레이션: 뇌지컬 캠퍼스 수학 강의 데이터 등록
-- 과목(Subject)과 레슨(Lesson) 데이터 일괄 삽입
-- =====================================================

-- 강좌 ID (뇌지컬 캠퍼스 수학)
-- 실제 환경에서는 해당 course_id로 변경하세요
DO $$
DECLARE
    v_course_id UUID := '14ae154e-1786-48a2-959f-fc96387259fb';
    
    -- 과목 IDs
    v_subject_1 UUID; -- 일차함수와 이차함수
    v_subject_2 UUID; -- 분수함수와 무리함수
    v_subject_3 UUID; -- 삼각함수
    v_subject_4 UUID; -- 지수함수
    v_subject_5 UUID; -- 로그함수
    v_subject_6 UUID; -- 극한
    v_subject_7 UUID; -- 미분
    v_subject_8 UUID; -- 적분
    v_subject_9 UUID; -- 벡터, 행렬, 통계
    
    v_sort_order INTEGER := 1;
BEGIN
    -- =====================================================
    -- 1. 과목(Subjects) 생성
    -- =====================================================
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '일차함수와 이차함수', '일차함수와 이차함수의 기초 개념과 문제풀이', 1, true)
    RETURNING id INTO v_subject_1;
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '분수함수와 무리함수', '분수함수와 무리함수의 개념과 문제풀이', 2, true)
    RETURNING id INTO v_subject_2;
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '삼각함수', '삼각함수의 정의, 성질, 그래프와 문제풀이', 3, true)
    RETURNING id INTO v_subject_3;
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '지수함수', '지수법칙과 지수함수의 개념 및 문제풀이', 4, true)
    RETURNING id INTO v_subject_4;
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '로그함수', '로그의 정의, 성질, 로그함수와 문제풀이', 5, true)
    RETURNING id INTO v_subject_5;
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '극한', '함수의 극한과 연속, 중간값의 정리', 6, true)
    RETURNING id INTO v_subject_6;
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '미분', '미분계수, 도함수, 여러가지 미분법', 7, true)
    RETURNING id INTO v_subject_7;
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '적분', '부정적분, 정적분, 시그마', 8, true)
    RETURNING id INTO v_subject_8;
    
    INSERT INTO subjects (course_id, title, description, sort_order, is_published)
    VALUES (v_course_id, '벡터, 행렬, 통계', '벡터, 행렬, 경우의 수와 확률', 9, true)
    RETURNING id INTO v_subject_9;
    
    -- =====================================================
    -- 2. 레슨(Lessons) 생성 - 일차함수와 이차함수
    -- =====================================================
    v_sort_order := 2; -- M002부터 시작 (M001은 OT로 가정)
    
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_1, '[🔑필수개념01.절대값]', v_sort_order, true, '[]'),
        (v_course_id, v_subject_1, '[🔑필수개념02.식의 나눗셈]', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_1, '[🔑필수개념03.부분분수]', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_1, '[🔑필수개념04.이중근호]', v_sort_order + 3, true, '[]'),
        (v_course_id, v_subject_1, '[💡필수암기01. 인수분해공식]', v_sort_order + 4, true, '[]'),
        (v_course_id, v_subject_1, '[📘문제은행풀이](1-1)~(1-9)', v_sort_order + 5, true, '[]'),
        (v_course_id, v_subject_1, '[📘문제은행풀이](1-10)~(1-30)', v_sort_order + 6, true, '[]'),
        (v_course_id, v_subject_1, '[💡필수암기02. 곱셈공식 변형공식]', v_sort_order + 7, true, '[]'),
        (v_course_id, v_subject_1, '[🔑필수개념05.이차방정식 간편해법]', v_sort_order + 8, true, '[]'),
        (v_course_id, v_subject_1, '[📘문제은행풀이](2-1)~(2-14)', v_sort_order + 9, true, '[]'),
        (v_course_id, v_subject_1, '[📘문제은행풀이](2-15)~(2-24)&[🔑필수개념06.산술기하평균]', v_sort_order + 10, true, '[]');
    
    v_sort_order := v_sort_order + 11;
    
    -- =====================================================
    -- 3. 레슨(Lessons) 생성 - 분수함수와 무리함수
    -- =====================================================
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_2, '[🔑필수개념07.분수함수]', v_sort_order, true, '[]'),
        (v_course_id, v_subject_2, '[🔑필수개념08.무리함수]', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_2, '[📘문제은행풀이](3-1)~(3-16)', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_2, '[📘문제은행풀이](3-17)~(3-22)', v_sort_order + 3, true, '[]');
    
    v_sort_order := v_sort_order + 4;
    
    -- =====================================================
    -- 4. 레슨(Lessons) 생성 - 삼각함수
    -- =====================================================
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_3, '[🔑필수개념09.호도법]', v_sort_order, true, '[]'),
        (v_course_id, v_subject_3, '[🔑필수개념10.부채꼴의 호의 길이와 넓이]', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_3, '[🔑필수개념11.삼각함수의 정의]', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_3, '[🔑필수개념12.삼각함수 사이의 관계]', v_sort_order + 3, true, '[]'),
        (v_course_id, v_subject_3, '[🔑필수개념13.삼각함수의 그래프]', v_sort_order + 4, true, '[]'),
        (v_course_id, v_subject_3, '[🔑필수개념14.삼각함수의 성질]', v_sort_order + 5, true, '[]'),
        (v_course_id, v_subject_3, '[🔑필수개념15.삼각함수의 덧셈정리]', v_sort_order + 6, true, '[]'),
        (v_course_id, v_subject_3, '[💡필수암기03~08] 삼각함수 관련 공식', v_sort_order + 7, true, '[]'),
        (v_course_id, v_subject_3, '[📘문제은행풀이](4-1)~(4-19)', v_sort_order + 8, true, '[]'),
        (v_course_id, v_subject_3, '[📘문제은행풀이](4-20)~(4-34)', v_sort_order + 9, true, '[]'),
        (v_course_id, v_subject_3, '[📘문제은행풀이](4-35)~(4-47)', v_sort_order + 10, true, '[]'),
        (v_course_id, v_subject_3, '[📘문제은행풀이](4-48)~(4-67)', v_sort_order + 11, true, '[]');
    
    v_sort_order := v_sort_order + 12;
    
    -- =====================================================
    -- 5. 레슨(Lessons) 생성 - 지수함수
    -- =====================================================
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_4, '[🔑필수개념16.지수법칙]', v_sort_order, true, '[]'),
        (v_course_id, v_subject_4, '[🔑필수개념17.지수함수]', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_4, '[📘문제은행풀이](5-1)~(5-19)', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_4, '[📘문제은행풀이](5-20)~(5-45)', v_sort_order + 3, true, '[]');
    
    v_sort_order := v_sort_order + 4;
    
    -- =====================================================
    -- 6. 레슨(Lessons) 생성 - 로그함수
    -- =====================================================
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_5, '[🔑필수개념18.로그의 정의]', v_sort_order, true, '[]'),
        (v_course_id, v_subject_5, '[🔑필수개념19.로그의 성질]', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_5, '[🔑필수개념20.로그 함수]', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_5, '[🔑필수개념21.상용로그]', v_sort_order + 3, true, '[]'),
        (v_course_id, v_subject_5, '[📘문제은행풀이](6-1)~(6-18)', v_sort_order + 4, true, '[]'),
        (v_course_id, v_subject_5, '[📘문제은행풀이](6-19)~(6-35)', v_sort_order + 5, true, '[]');
    
    v_sort_order := v_sort_order + 6;
    
    -- =====================================================
    -- 7. 레슨(Lessons) 생성 - 극한
    -- =====================================================
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_6, '[🔑필수개념22.함수의 극한]', v_sort_order, true, '[]'),
        (v_course_id, v_subject_6, '[📘문제은행풀이](7-1)~(7-8)', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_6, '[🔑필수개념23.함수의 연속]', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_6, '[🔑필수개념24.중간값의 정리]', v_sort_order + 3, true, '[]'),
        (v_course_id, v_subject_6, '[📘문제은행풀이](7-9)~(7-27)', v_sort_order + 4, true, '[]'),
        (v_course_id, v_subject_6, '[📘문제은행풀이](7-28)~(7-30)', v_sort_order + 5, true, '[]');
    
    v_sort_order := v_sort_order + 6;
    
    -- =====================================================
    -- 8. 레슨(Lessons) 생성 - 미분
    -- =====================================================
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_7, '[🔑필수개념25.미분계수]', v_sort_order, true, '[]'),
        (v_course_id, v_subject_7, '[🔑필수개념26.도함수의 정의]', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_7, '[🔑필수개념27.여러가지 미분법]', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_7, '[📘문제은행풀이](8-1)~(8-9)', v_sort_order + 3, true, '[]'),
        (v_course_id, v_subject_7, '[📘문제은행풀이](8-10)~(8-29)', v_sort_order + 4, true, '[]'),
        (v_course_id, v_subject_7, '[📘문제은행풀이](8-30)~(8-44)', v_sort_order + 5, true, '[]');
    
    v_sort_order := v_sort_order + 6;
    
    -- =====================================================
    -- 9. 레슨(Lessons) 생성 - 적분
    -- =====================================================
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_8, '[🔑필수개념28.부정적분]', v_sort_order, true, '[]'),
        (v_course_id, v_subject_8, '[🔑필수개념29.합의기호(시그마)]', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_8, '[🔑필수개념30.정적분]', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_8, '[📘문제은행풀이](9-1)~(9-18)', v_sort_order + 3, true, '[]'),
        (v_course_id, v_subject_8, '[📘문제은행풀이](9-19)~(9-30)', v_sort_order + 4, true, '[]'),
        (v_course_id, v_subject_8, '[📘문제은행풀이](9-31)~(9-44)', v_sort_order + 5, true, '[]'),
        (v_course_id, v_subject_8, '[📘문제은행풀이](9-45)', v_sort_order + 6, true, '[]');
    
    v_sort_order := v_sort_order + 7;
    
    -- =====================================================
    -- 10. 레슨(Lessons) 생성 - 벡터, 행렬, 통계
    -- =====================================================
    INSERT INTO lessons (course_id, subject_id, title, sort_order, is_published, resources)
    VALUES 
        (v_course_id, v_subject_9, '[🔑필수개념31.벡터][📘문제은행풀이](10-1)~(10-4)', v_sort_order, true, '[]'),
        (v_course_id, v_subject_9, '[🔑필수개념32.행렬][📘문제은행풀이](11-1)~(11-3)', v_sort_order + 1, true, '[]'),
        (v_course_id, v_subject_9, '[🔑필수개념33.경우의 수와 확률]', v_sort_order + 2, true, '[]'),
        (v_course_id, v_subject_9, '[📘문제은행풀이](12-1)~(12-36)', v_sort_order + 3, true, '[]');
    
    RAISE NOTICE '과목 9개, 레슨 60개 등록 완료';
END $$;
