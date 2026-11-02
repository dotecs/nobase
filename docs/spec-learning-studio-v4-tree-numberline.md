# 러닝 스튜디오 LS4-6 — 수형도 무대, 수직선 옵션, bracket 라벨

- 기준: main `0134ad0` 이후. 브랜치 `feat/learning-studio-tree-numberline`.
- 배경: 1강 수 체계(rm-01) 제작 중 대표님 지시 — "분류는 표보다 교재처럼 **수형도**로", 수직선 장면에 y축이 보이는 것과 bracket 라벨이 눈금과 겹치는 것 보정.
- DB·콘텐츠 JSON·음성·push·배포 금지. 기존 v1~v9 JSON 전부 검사 통과 유지.

## 1. `tree` 무대 (수형도)

```json
{"type":"tree","direction":"right","root":{"id":"real","label":"실수","children":[
  {"id":"rational","label":"유리수","children":[
    {"id":"int","label":"정수","children":[{"id":"pos","label":"양의 정수 (= 자연수)"},{"id":"zero","label":"0"},{"id":"neg","label":"음의 정수"}]},
    {"id":"nonint","label":"정수가 아닌 유리수"}]},
  {"id":"irrational","label":"무리수"}]}}
```

- `label`은 문자열(마크다운 `$…$` 수식 허용), 선택 `tex`. `id`는 무대 안에서 고유(`^[a-z][a-z0-9-]*$`), 깊이 최대 4, 노드 최대 24.
- `direction`: `right`(기본, 뿌리가 왼쪽 — 교재 그림과 같음) | `down`.
- 렌더: 노드는 chain 무대의 카드와 같은 스타일(둥근 사각형, 테두리 `--studio-card-border`). 연결선은 직각 꺾임(교재처럼 세로 간선 하나에서 가지가 나감), 색 `--studio-accent` 60%. 글자 18~20px, 카드 사이 간격 자동 배치(형제는 세로로 균등, 부모는 자식들의 세로 중앙). 폭이 넘치면 `StageFit`으로 축소.
- 액션 대상: `tree:<id>`.
  - `reveal {target:"tree", id:"int"}` — 그 노드와 **부모→노드 연결선**이 나타난다(연결선 먼저 300ms 그려지고 카드 페이드인). 기본은 모두 숨김이 아니라 **모두 보임**이고, `initial.hidden_nodes:["int","pos",…]` 또는 `initial.hidden:"all"`로 숨길 수 있다. `reveal id` 는 부모가 숨겨져 있으면 부모도 함께 나타낸다.
  - `highlight`, `flash`, `underline`, `pointer`(target) 는 `tree:<id>`를 받는다. `highlight`의 dim_others 적용.
- `stageStateAt`: `revealed` 집합을 노드 id로 유지. 기존 steps/chain 과 같은 방식.
- `lesson-check`: 없는 id 참조 오류, id 중복 오류, 깊이·개수 초과 오류.
- 테스트: 레이아웃이 결정적(같은 입력 → 같은 좌표), reveal 순서, 1672×941과 390×844에서 잘림 없음(스크린샷 첨부).

## 2. 수직선 옵션 `number_line`

graph/slider 무대에 `number_line: true`를 추가한다.
- y축·y 눈금·격자 세로선을 그리지 않는다. x축은 굵기 2px, 양 끝 화살표 유지, 원점 `0` 눈금 표시.
- 선언 `y` 범위는 그대로 두되 등축 맞춤에서 **세로는 채우기 대상에서 제외**한다(가로 선언 범위가 꽉 차게, 세로 여백은 chalk 메모가 들어갈 만큼: 위아래 각 최소 120px).
- `fns`가 비어 있어도 된다(현재 `min(1)` → number_line일 때 `min(0)`). rm-01은 `0*x` 더미 함수를 쓰고 있으니 이후 콘텐츠에서 제거할 수 있게.
- 점은 지금처럼 x축 위에 링으로. 점 라벨은 기본 위치를 **축 아래(`sw`/`se` 쪽 자동)** 로 해서 bracket과 겹치지 않게.

## 3. bracket 라벨 위치

- 현재 bracket 라벨이 bracket 선과 눈금 숫자에 겹친다. 라벨은 bracket 아래쪽으로 눈금 숫자 높이만큼(약 22px) 더 띄우고, 라벨 뒤에 무대 배경색 테두리(paint-order)를 둔다.
- `label_pos: "above"|"below"`(기본 below) 를 bracket에 추가. x축 위쪽 bracket이 필요할 때 above.

## 4. 데모·보고

- `/learn/studio-demo`에 tree 무대 장면 1개 추가(위 JSON 그대로, 노드를 `reveal`로 순서대로 나타내는 3문장).
- 보고서: tree 1672×941 / 390×844, number_line 전후, bracket 전후 비교. tsc·vitest·build.

## 5. 이후 Claude 작업(참고)

- rm-01 v2: s6 표 → tree, s1~s4 그래프에 `number_line:true`, 더미 함수 제거. 내레이션 불변(음성 재사용).
