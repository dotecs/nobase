# 러닝 스튜디오 LS4-12 — 정밀 지시: 부분 대상 확장·빗금(strike)·문장 단위 수명

- 기준: main `3935f6d` 이후. 브랜치 `feat/learning-studio-precision`.
- 배경(대표 지시 2026-11-05, 참고 `docs/ref/precision-reference.png` — rm-07 s3-3): 지시가 **너무 상위 요소**(행 전체·줄 전체)를 가리킨다. 실제 수업처럼 "위아래 개수가 같으니 모두 약분되어"에서는 약분되는 인수 하나하나에 **차례로 빗금**이 그어지고, "1이 됩니다"에서는 **그 1에 동그라미**가 쳐져야 한다. 또 한 문장의 지시가 **다음 문장이 시작돼도 남아 있는** 문제가 있다 — 지시는 그 문장이 끝나면 사라지는 것이 기본이어야 한다.
- DB·콘텐츠 JSON·음성·push·배포 금지.

## 1. `\p{name}{…}` 부분 대상을 모든 수식 자리로 확장

지금은 board items의 `tex`에서만 `\p{coef}{4}` → `item:t1/coef`가 된다. 같은 방식으로:

| 자리 | 대상 문자열 |
|---|---|
| `table` 셀(`$…$` 안) | `cell:<r>:<c>/<name>` |
| `steps` 각 줄 `tex` | `step:<i>/<name>` |
| `chain` 노드 `tex` | `node:<i>/<name>` |
| `callout` 주석 `tex` | `item:<callout id>/<name>` |
| `tree` 노드 `tex` | `tree:<id>/<name>` |

- 렌더: 해당 자리의 KaTeX 호출에 `itemKatexOptions`와 같은 매크로·trust를 적용해 `data-stage-target` span을 만든다(`StudioMath` 재사용). 작성 수식 검사(`authored-math.ts`)도 같은 옵션으로.
- 한 수식 안에서 같은 이름이 여러 번 나오면 `name`, `name-2`… 대신 **오류**(지금 items와 같은 규칙). 분수 약분처럼 같은 글자가 여러 개면 저자가 `\p{a1}{a}\times\p{a2}{a}`처럼 번호를 붙인다.
- `action-validation.ts`의 `valid(target)`가 위 형식을 모두 인정하도록 `itemTargetIds`를 일반화(`stageTargetIds(stage)`).
- 표 셀의 `$…$`가 여러 개면 셀 안에서 이름이 겹치지 않으면 된다.

## 2. `strike` 액션 — 빗금

```json
{"type":"strike","targets":["cell:1:2/n1","cell:1:2/n2","cell:1:2/n3","cell:1:2/d1","cell:1:2/d2","cell:1:2/d3"],
 "stagger_ms":220,"at":"@모두 약분되어"}
```
- 대상 bbox의 좌하 → 우상 대각선(`/`), 길이는 bbox 대각선 + 양쪽 4px, 선 2.5px, 분필 질감(`Stroke`)과 `color` 토큰(기본 `mark`). `direction:"\\"`로 반대 방향.
- `targets` 배열(1개 이상) + `stagger_ms`(기본 200): 왼쪽부터 순서대로 그려진다. 단일 `target`도 허용.
- 약분 쌍 표현(선택): `pairs:[["cell:1:2/n1","cell:1:2/d1"],…]`를 주면 쌍마다 분자·분모가 **동시에** 그어지고 쌍 사이에 stagger.
- 수명: 아래 3장 규칙(기본 문장 끝까지).

## 3. 지시 수명 — 문장 단위 기본

모든 chalk·annotation 액션에 `until: "sentence" | "scene"`을 추가하고 기본값을 종류별로 둔다.

| 종류 | 기본 | 뜻 |
|---|---|---|
| pointer · circle · underline · strike · arrow · flash · tint · highlight(단일) | `sentence` | **그 문장의 음성이 끝나는 순간 사라진다**(200ms 페이드) |
| handwrite · callout · region · bracket · shade | `scene` | 칠판에 적힌 내용이므로 장면 끝까지 |

- `ttl_ms`가 있으면 그 시간과 `until` 중 **먼저 오는 쪽**에서 사라진다. 기존 콘텐츠의 `ttl_ms:0`은 `until:"scene"`과 같게 해석(호환). `ttl_ms` 없음 + 지시 종류 → 문장 끝.
- 문장 경계: 플레이어의 문장 시작 시각(다음 문장 audio 시작) 기준. 마지막 문장은 장면 끝. 되감기·탐색 시 `stageStateAt`이 같은 규칙으로 계산.
- `highlight`(steps/table 현재 줄 강조)는 지금처럼 다음 highlight/clear까지 유지되는 것이 자연스러우므로 예외: 기본 `scene`.
- 지금의 chalk 기본 2500ms는 폐지하고 문장 끝으로 통일. 단 `pointer`는 짧게 보이는 것이 맞으므로 기본 `ttl_ms:2500` 유지(문장 끝과 먼저 오는 쪽).
- lesson-check: 지시 종류에 `ttl_ms:0`이 있으면 "장면 끝까지 남는 지시"로 **경고**(의도적이면 `until:"scene"`을 명시해 경고를 끈다).

## 4. 검사·테스트·보고

- 테스트: 각 자리의 `\p` 렌더와 대상 측정, 중복 이름 오류, strike 순서·방향·쌍, until 기본값/ttl 우선, 되감기, rm-07 s3-3 형태의 데모 장면(약분 빗금 6개 → 1에 circle).
- 데모 `/learn/studio-demo`: 위 장면 1개. 1672×941·390×844 캡처.
- 기존 레슨 JSON 10개 검사 통과(경고는 보고에 수 기록).

## 5. 이후 Claude 작업(참고)

- 기존 레슨 전체 정밀 지시 패스: 행·줄 단위 underline → 부분 circle/strike, 약분·소거 장면에 strike. 매뉴얼 3장 갱신(이미 반영된 초안: "가장 작은 요소를 가리킨다").
