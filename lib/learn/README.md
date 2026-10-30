# 학습 모듈

이 폴더는 순수 함수만 둔다. Supabase 클라이언트 import는 금지한다.
모든 규칙 값은 인자로 받는다.

## 시각 레슨 v1

- 경로: /learn/lesson/[id], /learn/concept/[id], /admin/learn/lessons. 학생 경로는 requireLearner, 관리 작업은 requireCoach를 거칩니다. 레슨 퀴즈와 추적은 활동 기록이며 학습 증거·상태 전이에 연결하지 않습니다.
- Claude가 content/lessons/*.json과 content/concepts/root-math.json을 작성합니다. 저작 JSON이 없을 때 테스트는 docs/lesson-prototype-11.html의 LESSON 객체를 변환해 사용합니다. 픽스처는 운영 seed가 아닙니다.
- 개념 JSON 계약: {pack_id,nodes:[{id,name,one_line,ability_id?,check_question?,lesson_id?}],edges:[{source_id,target_id,type?:'prerequisite'}]}. 노드 pack_id는 생략 가능하며 최상위 pack_id와 같아야 합니다. check_question은 {stem_md,options:[{id,text_md}],correct}입니다. 자기순환·중복·없는 ID·순환 간선을 검증합니다.
- npm run lesson:check -- <file>: 스키마·그래프 AST·저작 TeX 구문·문장 ID·같은 팩의 로컬 개념 참조를 검증합니다. Node 24 환경에서 실행합니다.
- Claude가 060 → 061 적용 및 개념 데이터 등록을 마친 뒤 npm run lesson:seed -- <file>을 실행합니다. DB 개념·소주제 ID를 재검증하고 기존 버전을 수정하지 않은 채 다음 draft 버전만 insert합니다. 동시 버전 충돌은 새 번호로 재시도합니다. 이 구현 작업에서는 실제 seed를 실행하지 않았습니다.
- 음성: ELEVENLABS_API_KEY는 서버 전용. 미설정 시 '키 없음'을 표시하고 호출하지 않습니다. ELEVENLABS_VOICE_ID 기본값은 명세의 복제 음성 ID, 모델은 eleven_v4입니다. 대본·역할 연출·음성·모델 해시가 같은 문장은 건너뜁니다. 60문장/45초 작업 예산 안에서 순차 처리하고 남은 문장은 반복 실행합니다. 실패한 문장만 다시 대상이 됩니다. 대표 결정에 따라 문자 수만 계산하며 예상 크레딧은 “계정·모델 요율 미확인”으로 표시합니다.
- [공식 음성 API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert): output_format=mp3_44100_128은 쿼리 인자입니다(2026-10-30 확인). 저장소 learn-lessons는 비공개이며 10분 서명 URL로 재생합니다. 공개된 현재 버전과 해시가 맞는 음성만 제공하며 URL 만료 시 갱신합니다.
- 명시한 tts는 그대로 사용합니다. 없으면 say는 기본 대본, think는 [slower, thinking aloud], write는 [clear, deliberate]를 붙입니다. 저작자는 복잡한 공식의 tts를 직접 검수해야 합니다.
- cue의 step/node/row는 0부터 시작합니다. graph highlight는 fn:0·point:0 형태의 인덱스 또는 범례 label·c1/c2/c3입니다.
- 재생 전 음성은 시작하지 않습니다. 음성이 없거나 재생 실패 시 글자 수 기반 타이머로 자막을 진행합니다. 자막에서 해석 가능한 수식은 같은 AST→LaTeX 경로를 사용하며 인라인 KaTeX로 표시합니다. 입력 파서가 해석하지 못하는 저작 수식(±·프라임 등)에만 기존 KaTeX 표시를 허용합니다. 무대의 저작 TeX도 기존 KaTeX를 사용하며, 그래프와 학생 답안의 AST 경로는 변경하지 않습니다.
- 활동은 서버 액션으로 묶어 기록합니다. 스튜디오는 이벤트를 짧게 묶어 최대 50개씩 기록하며 완료·화면 종료 때 남은 기록을 전송합니다. 코치 화면은 최근 500건의 레슨별 방문 경과(미완료 포함)·근거 클릭·gap을 요약합니다.

## 러닝 스튜디오

- components/studio/StudioViewer가 기존 레슨 주소를 담당합니다. StudioShell은 독립 다크 테마와 내부 라이트 토글, StudioPlayer는 유일한 RAF 루프, stages는 상태를 표시합니다.
- lessons/stage-state.ts에서 stageStateAt을 공개합니다. 구현은 stage-state-at.ts이며 scene·미디어 시각·문장 시작 배열만 입력받습니다. 타임라인은 timeline.ts, v1 호환 변환은 legacy-actions.ts입니다.
- 음성 메타데이터는 audioPlayback으로 읽고, 누락 길이는 인증된 recordLessonAudioDuration 액션으로 현재 버전·해시·빈 값에만 저장합니다. 서명 URL 실패는 문장당 한 번 갱신하고 이후에는 자막으로 진행합니다.
- LessonText의 단일 달러 수식은 인라인, 이중 달러만 블록입니다. 학생 입력용 MathPreview·파서·채점은 그대로입니다. 추적은 클라이언트 상태로 갱신하고 preventScroll 포커스를 사용합니다.
- 관리자 음성 생성의 '남은 문장 자동 이어서'는 기본 해제입니다. 체크하면 순차 배치를 반복하고 결과를 누적합니다. 실패·키 없음·진행 없음·명시적 중단이면 멈춥니다. 실제 API는 이 구현 검증에서 호출하지 않았습니다.
- /learn/studio-demo는 인증된 코드 픽스처이며 DB 레슨/이벤트를 생성하지 않습니다. frame=16x9, chrome=0 옵션도 지원합니다. LS-7 콘텐츠 게시 인계는 docs/learning-studio-content-handoff.md를 참고하세요.
