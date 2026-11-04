# 러닝 스튜디오 LS4-10 — 정돈된 주석(callout)·항 색 강조·제목 악센트

- 기준: LS4-9(`feat/learning-studio-pointing`) 위에서 이어서. 같은 브랜치 또는 `feat/learning-studio-callout`.
- 배경(대표 지시 2026-11-04, 참고 이미지 `docs/ref/callout-reference.png`): 식의 구조를 설명할 때 손글씨(노란 Poor Story)보다 **정돈된 주석**이 어울린다. 식 안의 한 항을 민트색으로 물들이고, 그 항 아래에 점 → 직각 꺾임 연결선 → 화살촉 → KaTeX 주석(`4\times x^3 \;\to\; 4x^3`)이 이어지는 모양.
- DB·콘텐츠 JSON·음성·push·배포 금지.

## 1. `tint` 액션 — 요소 글자색 바꾸기

```json
{"type":"tint","target":"item:t1","color":"mint","at":"@사와 엑스세제곱","ttl_ms":0}
```
- 대상: `item:<id>`, `step:i`, `node:i`, `row:i`, `cell:i:j`, `tree:<id>`. 글자색만 바뀐다(배경·테두리 없음). `ttl_ms` 기본 0(장면 끝까지). `clear what:"tint"` 추가, `clear all`에 포함.
- 색 토큰: `mint`(#5eead4), `accent`(기존 파랑), `mark`(빨강), `hand`(노랑). CSS 변수 `--studio-tint-mint` 등으로 두고 라이트 테마 값도 정의.
- 여러 항을 다른 색으로 동시에 물들일 수 있어야 한다(계수·문자·지수 구분 설명용).

## 2. `callout` 액션 — 점·꺾임선·화살촉·주석

```json
{"type":"callout","target":"item:t1","anchor":"bottom","tex":"4\\times x^3 \\;\\to\\; 4x^3",
 "position":{"x":0.42,"y":0.72},"color":"mint","size":"md","at":"@곱하기가 생략","ttl_ms":0}
```
- 시작: 대상 bbox의 `anchor`(`bottom` 기본 | `top` | `left` | `right`) 중점에서 6px 바깥에 지름 8px **점**(채움, 색 토큰).
- 경로: **직각 꺾임**(elbow). anchor가 bottom이면 점에서 아래로 `drop`(기본 24px) 내려간 뒤 수평으로 주석의 x까지, 다시 수직으로 주석 상단 6px 위까지. `route:"elbow"`(기본) | `"straight"`. 선 1.5px, 끝에 작은 화살촉(길이 9px). 그리기 애니메이션은 점 → 선 → 주석 순 400ms.
- 주석: KaTeX(`tex`) 또는 `text`. **손글씨 폰트가 아니라 본문 수식 폰트**, 색은 `color` 토큰(기본 `chalk` = 본문색), 크기 `sm|md|lg`(items와 같은 사다리). `position`은 주석의 **상단 중앙**(그래프: 데이터 좌표, 그 외: 비율). `align` 생략 시 중앙.
- 주석 자체도 대상이 된다: id를 주면(`"id":"c1"`) `item:c1`처럼 `underline`·`tint`·다른 callout의 대상으로 쓸 수 있다.
- 대상 없이 `from:{x,y}`로 시작점을 직접 줄 수도 있다(그래프 위 임의 지점 설명).
- 겹침: 주석이 다른 item·주석과 겹치면 LS4-9 1장의 회피 규칙(아래로 밀기)을 같이 쓴다.

## 3. 식 항 사이 간격·정렬 도우미

- board items에 `group:"expr"`을 주면 같은 group의 items를 **한 줄로 자동 배치**한다: 첫 item의 position을 기준으로, 각 item의 렌더 폭 + `gap`(기본 0.6em)만큼 오른쪽으로 이어 붙이고, group 전체를 `position.x`(그룹 중심) 기준 가운데 정렬. 지금처럼 저자가 글자 폭을 어림해 x를 네 번 적는 일을 없앤다. 저자는 `{"group":"expr","gap":"0.6em","position":{"x":0.5,"y":0.3}}`를 첫 item에만 쓴다.
- 그룹 안에서 연산자(`+`,`-`)는 별도 item으로 두지 않고 다음 항의 tex 앞에 붙인다(`-2x^2y`) — 지금 방식 유지.

## 4. 장면 제목 악센트(선택)

- 상단 바 제목의 h1 앞에 4px 세로 악센트 바(`--studio-accent`)를 둘 수 있게 `headline.accent_bar:true`(기본 false). 집중 모드의 좌상단 겹침 제목에도 같은 규칙.

## 5. 검사·테스트·보고

- lesson-check: tint/callout 스키마, 대상 존재, callout id 중복·참조 검사, group 좌표 규칙.
- 테스트: elbow 경로 좌표(anchor 4종), 점·화살촉 위치, tint 색 토큰 적용·clear, group 자동 배치가 렌더 폭 기준으로 결정적인지, 데모 장면.
- 데모: `/learn/studio-demo`에 참고 이미지와 같은 장면 1개(식 `4x^3-2x^2y+3y-7`, `4x^3` 민트 tint, 아래 callout `4\times x^3 \;\to\; 4x^3`). 1672×941·390×844 캡처.

## 6. 이후 Claude 작업(참고)

- rm-02 s1~s4를 tint+callout로 다시 쓰기(손글씨 메모 → callout), items를 `group:"expr"`으로. 매뉴얼 2·3장 갱신: "식 구조 설명은 callout, 구어체 메모는 손글씨".
