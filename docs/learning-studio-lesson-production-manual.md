# 러닝 스튜디오 레슨 제작 매뉴얼 (v1, 2026-11-03)

1~8강 제작과 검수에서 확정된 절차와 규칙. 9강부터는 이 문서대로 만든다. 원칙의 근거는 `docs/learning-studio-content-principles.md`(대표 지시 누적), 스키마·액션 상세는 `docs/learning-studio-notation-guide.md`와 `lib/learn/lessons/*.ts`.

## 0. 파이프라인 (레슨 1개 기준 소요: 대본 30분 · 음성 5분 · 검수 10분)

| 단계 | 산출물 | 도구 | 비고 |
|---|---|---|---|
| 1 소스 확보 | 전사 txt, 슬라이드 png | `_추출텍스트/transcript`, `/pages` | 전사는 오탈자 많음. **예시 식·부등호 방향·숫자는 슬라이드 우선** |
| 2 브리프 | 장면 개요·전후 참조표·개념 id | `docs/root-math-production-brief-*.md` | 여러 강을 병렬로 쓸 때 필수. 용어·참조 일관성은 여기서 잡는다 |
| 3 개념 노드 | `content/concepts/root-math.json` + DB upsert | 노드(id·ability_id·name·one_line·check_question·lesson_id)와 간선 | lesson-check가 concept id를 검사하므로 **대본보다 먼저** 등록 |
| 4 대본 JSON | `content/lessons/rm-NN.json` | 병렬 작성 가능(강당 1 에이전트) | 아래 1~4장 규칙 |
| 5 검사 | PASS·경고 0 | `node scripts/lesson-check.mjs <json>` / `--captions` | 클론(node_modules 있는 곳)에서 실행 |
| 6 커밋 | main push | git | 검사 통과본만 |
| 7 시드 | `learn_lessons` 새 버전(draft) | 신규: `gen-seed-sql.mjs` → execute_sql. 개정: `gen-diff-sql.mjs`(HEAD 대비 jsonb_set 패치) | 컨테이너·로컬 셸 모두 Supabase 직접 접속 불가 → MCP SQL |
| 8 음성 | `learn_lesson_audio` | `/admin/learn/lessons` → 음성 생성 → ☑ 남은 문장 자동 이어서 → 생성 시작 | 한 번에 ~15문장에서 멈춤. **미생성이 0이 될 때까지 생성 시작 반복**, "실패 N개 다시 시도" 누르기 |
| 9 reviewed | status='reviewed' | SQL 또는 관리자 버튼 | 음성 수 = 문장 수 확인 후 |
| 10 검수 | 장면별 스크린샷 | Chrome 1600×860, 장면 시작 10~20초·끝 무렵 2장 | 아래 5장 체크리스트 |
| 11 개정 | 새 버전 + 음성 재사용 | 내레이션(tts) 안 바뀐 문장은 `insert … select … from learn_lesson_audio where lesson_version=<prev>` 로 복사 | `text`·cue·stage만 바꾸면 음성 비용 0 |

## 1. 대본 구조

- `kind:"concept"`, 장면 5~7개, 문장 18~28개. 첫 문장 "이번 시간에는 …"(인사 금지), 마지막 문장 "다음 시간에는 n강 ○○입니다."
- 장면 순서: 정의 → 교재 예시 → (거꾸로·주의) → 확인 퀴즈(`tag:"check"`, `quiz`, `trace_concept_id`).
- `headline`: eyebrow `"n강 · 제목"`, title 짧게, accent는 title의 부분 문자열. **`formula` 금지**(수식은 items).
- 전후 참조: 뒤로 "n강에서 배운 ~"(실제 앞 강 내용만), 앞으로 "n강에서 배울 내용이라 이름만"(손글씨 `→ n강 ○○`). 번호는 말로도 붙인다. 이 과정 밖(지수함수 단원 등)은 번호 없이.
- 방정식·부등식은 **의문문**으로 먼저 번역(5강: "x가 무엇이면 참이 되느냐", 11강 이후: 두 그래프의 교점).

## 2. 무대 선택

| 내용 | 무대 | 메모 |
|---|---|---|
| 식 한 줄 놓고 부분 가리키기 | `board` + items | 항마다 item. 가로 간격은 **글자 폭 + 30px** 기준(lg 34px: 한 글자 ≈ 20px). 지나치게 벌리면 식이 아니라 낱말처럼 보인다 |
| 유도·변형 | `steps` (`why` + `concept_id`) | 현재 줄만 밝고 나머지는 흐려짐(highlight dim_others). 한 문장에서 줄 2개를 다루면 둘 다 highlight |
| 경우 비교·성질 나열 | `table` (`tone`) | **chain 카드 6개는 좁아서 깨진다** → 4개 초과면 table. 표 **머리글은 수식 미지원**(유니코드 `aᵐ ÷ aⁿ`), 셀은 `$…$` 가능 |
| 분류 | `tree` | |
| 수직선 | `graph` + `number_line:true` | 점은 `label:"auto"`, 구간은 `bracket` |
| 값 바꾸며 관찰 | `slider` | step은 분수 문자열, 꼭짓점이 y 범위 밖으로 안 나가게 param 범위 조정 |
| 도형(정사각형 등) | (미지원) | `figure`는 지시가 안 그려짐. Codex 과제 — 그 전까지는 board `\boxed{}`로 대체 |

좌표: graph/slider는 데이터 좌표, 나머지는 비율(0~1, 좌상단 원점). **steps·table 무대에서 손글씨를 쓰려면 item이 1개 이상 있어야 비율 좌표로 해석된다**(없으면 검사 오류).

## 3. 지시(chalk) 규칙

- 문장당 1~3개. pointer·circle은 문장당 2개 이하, 손글씨는 장면당 4개 이하.
- **ttl 기본값은 2.5초**(손글씨만 영구). 장면 끝까지 남겨야 하는 것(해 구간 bracket, 정의 밑줄 등)은 반드시 `"ttl_ms":0`. 잠깐 가리키는 것은 4000~9000.
- 대상은 요소 기준(`item:<id>`, `step:i`, `row:i`, `tree:<id>`, `axis:x`). bbox로 그려지므로 레이아웃이 바뀌어도 따라간다.
- 손글씨 `arrow_to`: 메모 상자 폭이 260px 고정이라 **대상이 메모 오른쪽에 있으면 화살표가 글자에서 멀리 떨어져 시작**한다(Codex 수정 예정). 그때까지는 **라벨을 대상의 오른쪽 또는 바로 아래·위**에 두어 대상이 라벨 왼쪽/위에 오게 한다. 화살표 끝은 대상 요소 중심이므로, 식 끝을 가리키려면 좌표를 직접 준다.
- 손글씨 줄바꿈은 `\n`으로 직접. 한 줄 12자 넘기지 않기.
- 수직선 bracket 라벨은 `label_pos`로 위/아래 선택, 눈금 숫자와 겹치지 않게.

## 4. TTS·자막

- 식은 붙여 읽기("에이엑스제곱플러스비엑스"), 분수 "이분의일", 거듭제곱 "에이의세제곱". **읽으면 구별이 안 되는 표현은 고친다**(예: 1/(−3)과 −1/3 → "분모가 마이너스삼인 분수"로 풀어 말함).
- 앵커 `@…`는 tts 부분 문자열, 지시어(`[short pause]`)는 앵커에 넣지 않는다.
- 자막 42자, 의미 단위. 억지로 끊길 곳은 `text`에 `⏎`. `--captions`로 확인.

## 5. 검수 체크리스트 (장면당 2장)

1. 잘림: 그래프 곡선·수식·표가 카드 밖으로 나가지 않는가 (y 범위, param 범위).
2. 겹침: 손글씨 ↔ item ↔ 라벨. 특히 상단(0.1~0.2)과 하단(0.9) 메모.
3. 지시 타이밍: 밑줄·동그라미가 말과 같은 요소를 가리키는가. ttl 때문에 너무 빨리 사라지지 않는가.
4. 간격: board 항 간격, chain 카드 수, 표 글자 크기.
5. 참조: "n강" 번호와 실제 레슨 내용 일치.
6. 모바일 390×844 한 번(Codex 보고 스크린샷으로 갈음 가능).

## 6. 알려진 플랫폼 과제 (Codex 백로그)

- 손글씨 화살표 시작점: 실제 글자 폭 측정으로.
- `figure` 무대에 chalk·items 오버레이(정사각형 넓이 설명용). 또는 items에 `rect` 종류 추가.
- 표 머리글 수식 지원.
- 음성 생성 배치가 ~15문장에서 멈추는 문제(함수 시간 제한 추정) — 서버에서 이어서 처리하거나 UI가 자동 재호출.
