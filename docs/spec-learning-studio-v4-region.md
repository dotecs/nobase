# 러닝 스튜디오 LS4-11 — 수직선 위 부등식 영역(region) 표기

- 기준: main `d093748` 이후(점 표시가 원 → 짧은 세로 선으로 바뀐 상태). 브랜치 `feat/learning-studio-region`.
- 배경(대표 지시 2026-11-04, 참고 이미지 `docs/ref/region-reference.png`): 부등식의 해 영역을 수직선 위에 **계단 모양 선**으로 그린다. 경계 포함 여부는 채운 원·빈 원으로 구분하고, **조건이 다르면 높이가 다르고, 같은 조건 안의 여러 범위는 같은 높이**를 유지해 여러 조건의 겹치는 부분을 한눈에 비교할 수 있어야 한다. 원형 마커는 이 용도로만 쓴다(점은 세로 선).
- DB·콘텐츠 JSON·음성·push·배포 금지.

## 1. `region` 액션

```json
{"type":"region","level":1,"ranges":[{"from":-1,"to":0,"open":"to"},{"from":1,"to":"inf"}],
 "label":"-1 \\le x < 0,\\; x \\ge 1","color":"accent","at":"@해는","ttl_ms":0}
```

- 수직선(`number_line:true`) graph·slider 무대 전용. 2차원 그래프에서는 검사 오류.
- `ranges` (1개 이상): 각 범위는 `from`·`to`(좌표 식, `"-inf"`/`"inf"` 허용), `open`: `"from"` | `"to"` | `"both"` | 생략(둘 다 포함). 무한 쪽 끝은 원 없이 **화살촉**으로 끝난다. 길이 0 범위(한 점)는 `from===to`로 두면 채운 원 하나만 그린다.
- `level` (정수 ≥1, 기본 1): 높이 단계. 축 위 `level × 28px`(1단계 28px, 2단계 56px…). **같은 조건은 같은 level**(한 `region` 액션의 ranges 전체가 같은 높이), **다른 조건은 다른 level**로 저자가 지정한다. 검사: 한 장면에서 동시에 보이는 두 region이 같은 level이면 경고.
- 모양(참고 이미지): 범위마다 축 위 `level` 높이에 **수평선**을 긋고, 양 끝에서 축으로 내려오는 **수직선**으로 연결(ㄷ자를 뒤집은 계단). 수직선 끝 축 위에 **원형 마커**(지름 10px): 포함이면 채움(`fill` = 선 색), 제외면 빈 원(`fill` = 배경색, 테두리 선 색). 무한 쪽은 수직선 없이 수평선이 그래프 끝까지 이어지다가 화살촉(길이 9px)으로 끝난다.
- 선: 1.5px, 색 토큰 `accent`(기본)·`mint`·`mark`·`hand`·`chalk`. 조건이 다를 때 색도 다르게 둘 수 있도록 한다(level과 독립).
- 그리기 애니메이션: 왼쪽 범위부터 순서대로 마커 → 수직선 → 수평선 400ms. `ttl_ms` 기본 0(장면 끝까지). `clear what:"region"` 추가, `clear all`에 포함.
- `label`: KaTeX. 수평선 위 8px, 범위들의 전체 가운데. 다른 region 라벨·눈금 숫자와 겹치면 LS4-9의 회피(위로 밀기).
- 대상화: `"id":"r1"`을 주면 `region:r1`이 pointer·circle·underline·highlight·tint 대상이 된다(bbox = 계단 선 + 마커 전체). 범위 하나는 `region:r1/0`(인덱스).
- 겹침 표시(선택): `"intersect_with":"r1"`을 주면 두 region의 공통 구간을 축 위에 얇은 띠(`--studio-glow`, 불투명도 .24, 기존 band 스타일)로 칠한다. 교점 계산은 ranges의 닫힌/열린 끝을 그대로 반영.

## 2. 축 여백

- region이 있는 장면은 축 위 공간이 `max(level) × 28 + 40px` 이상 필요하다. 수직선 무대의 `y` 범위(카메라)가 부족하면 레이아웃이 자동으로 축을 아래로 내린다(현재 수직선은 축이 세로 중앙). 라벨은 축 아래 눈금 숫자와 겹치지 않는다.
- 기존 `bracket`은 그대로 둔다(구간 길이·이름 표시용). 부등식 해는 region으로 통일하고, 매뉴얼에서 bracket은 "길이·이름", region은 "해 영역"으로 역할을 나눈다.

## 3. 검사·테스트·보고

- lesson-check: region 스키마, number_line 무대 확인, `from<to`(무한 제외), 같은 장면 동시 표시 level 중복 경고, id 중복·참조 검사.
- 테스트: 마커 채움/빈 원 분기, inf 화살촉, level별 y 좌표, 범위 2개 같은 높이, 두 region 다른 높이, intersect 띠 구간(열린 끝 처리), clear·되감기.
- 데모: `/learn/studio-demo`에 참고 이미지와 같은 장면 1개 — 조건 A `-1 \le x < 2`(level 1, accent), 조건 B `x \le 0,\; x \ge 1`(level 2, mint), 겹침 띠 켬. 1672×941·390×844 캡처.

## 4. 이후 Claude 작업(참고)

- rm-06(부등식의 성질) 해 표시를 bracket → region으로 전환, rm-11 이후 연립부등식 장면에 level 2개 사용. 매뉴얼 2·3장 갱신.
