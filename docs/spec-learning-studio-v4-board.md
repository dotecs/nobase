# 러닝 스튜디오 LS4-7 — 칠판 위 수식·텍스트 요소, 머리 영역 정리

- 기준: main `0f6b7eb` 이후. 브랜치 `feat/learning-studio-board`.
- 배경(대표 지시 2026-11-02): "무대 머리에 수식 칸이 고정으로 있는 구조는 좋지 않다. 설명에 수식이 필요하면 **칠판에** 그 수식을 쓰고, 지시 요소도 그 수식을 가리킬 수 있어야 한다. 장면 제목(eyebrow·h1)도 칠판 안이 아니라 **상단 빈 공간**으로."
- DB·콘텐츠 JSON·음성·push·배포 금지. 기존 레슨 JSON은 그대로 검사 통과(단, `headline.formula`는 **경고**로 남긴다 — 아래 3).

## 1. 칠판 요소 `items` (graph·slider·tree·steps·chain·table 공통, 그리고 새 `board` 무대)

무대에 선택 필드 `items`를 추가한다. 칠판 좌표에 자유 배치되는 수식/텍스트 카드다.

```json
"items":[
  {"id":"eq","tex":"y = x^2 + 2x + {{c}}","position":{"x":-4.5,"y":5.2},"size":"lg"},
  {"id":"note","text":"실근이 없다 ⇔ D < 0","position":{"x":1,"y":5.2},"size":"md","align":"start"}
]
```

- `id`: `^[a-z][a-z0-9-]*$`, 무대 안 고유. `tex` 또는 `text`(마크다운 `$…$` 허용) 중 하나.
- `position`: 그래프·슬라이더 무대에서는 **데이터 좌표**(점·메모와 같은 체계, 식 문자열 허용). 그래프가 아닌 무대(tree·steps·chain·table·board)에서는 **무대 비율 좌표** `{"x":0~1,"y":0~1}` (좌상단 원점). 어느 쪽인지는 무대 유형이 정한다.
- `size`: `sm`(20px) | `md`(26px, 기본) | `lg`(34px) | `xl`(44px, 식의 구조를 설명할 때). `align`: `start`|`middle`(기본)|`end`.
- `{{param}}` 자리표시자는 슬라이더 값으로 실시간 치환(`formulaValues`, step 격자 맞춤, `\dfrac` 규칙 그대로).
- 표시 스타일: 글자색 `--studio-text`, 배경 없음(칠판에 쓴 글씨). `color:"hand"`면 손글씨 노랑 Poor Story 대신 **KaTeX 그대로 노란색**(수식은 항상 KaTeX).
- 기본은 **모두 보임**. `initial.hidden_items:["eq"]` 또는 `initial.hidden:"all"`(items에 대해)로 숨기고 `reveal {target:"item", id}`로 나타낸다(페이드인 250ms).
- 액션 대상 `item:<id>`: `highlight`(dim_others 포함), `flash`, `underline`(요소 아래 전체 폭), `circle`(요소 bbox를 감싸는 타원, rx·ry 생략 가능), `pointer`(target), `arrow`의 from/to, `handwrite.arrow_to.target`. 모두 요소의 **렌더된 bbox**를 기준으로 그린다(ChalkSpace.target 확장).
- `camera` 이동 시 그래프 좌표 items는 함께 움직인다.

### 새 무대 `board`
```json
{"type":"board","items":[...], "aspect":"16:9"}
```
그래프 없이 수식·텍스트만 배치하는 칠판. 좌표는 비율. chalk의 `position`·`arrow_to` 좌표도 비율로 받는다(0~1). 유도·정의 장면에서 `steps`·`chain`이 답답할 때 쓴다.

## 2. 머리 영역 정리

- 무대 카드 안의 **머리 줄을 없앤다**(제목·수식 칸). 파라미터 패널만 카드 **우상단에 떠 있는 작은 카드**로 남긴다(지금 위치·크기 유지). 관리자 참조 칩은 그 옆.
- 장면 제목은 **상단 바 가운데**로 옮긴다: 로고와 오른쪽 버튼 사이에 `eyebrow`(12px, muted) 위, `h1`(18px, 600) 아래 두 줄. 가운데 정렬, 최대 폭 50%, 넘치면 1줄 말줄임.
- 집중 모드(상단 바 숨김)에서는 제목을 무대 카드 **좌상단에 작게 겹쳐**(12/16px, 반투명) 보여 준다. 녹화 프레임(`chrome=0`)도 같다.
- 모바일(≤1023px): 상단 바 2줄(1줄 로고·버튼, 2줄 제목). 가로 모드(≤500px 높이)는 제목을 카드 좌상단 겹침으로.
- 그림 영역은 머리가 사라진 만큼 위로 늘어난다(`.stage` 패딩 재계산).

## 3. `headline.formula` 폐기

- 스키마에서는 받되 렌더하지 않는다. `lesson-check`가 **경고**: "headline.formula는 더 이상 표시되지 않습니다. items로 옮기세요."
- 데모(`/learn/studio-demo`): 수식 `y = ax^2 \quad (a = {{a}})`를 `items`로 옮겨 칠판 좌상단에 두고, "a가 양수이면" 문장에서 `underline item:eq`가 그어지게 한다.

## 4. 검사·테스트

- `lesson-check`: 없는 item id 참조 오류, id 중복 오류, 그래프 무대의 비율 좌표/비그래프 무대의 데이터 좌표 오류, `{{param}}`이 슬라이더 파라미터가 아닐 때 오류.
- 테스트: items 좌표 변환(두 좌표계), reveal/hidden, `item:<id>` bbox 대상 chalk, `{{c}}` 치환, 제목 위치(상단 바/집중 모드/모바일), 기존 15개 JSON 통과.
- 보고: 1672×941에서 rm-11 s4와 데모를 **머리 없이** 찍은 화면, 390×844·844×390.

## 5. 이후 Claude 작업(참고)

- rm-01·rm-11·rm-11-w1의 `headline.formula`를 `items`로 옮기고, 수식을 가리키는 지시(밑줄·동그라미)를 대본에 추가. 내레이션은 유지.
