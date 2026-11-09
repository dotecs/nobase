# 러닝 스튜디오 LS4-15 — `move` 액션: 칠판의 수가 그대로 옮겨 가 새 식이 되는 애니메이션

- 기준: main `d93810d` 이후. 브랜치 `feat/learning-studio-move`.
- 배경(대표 지시 2026-11-09, rm-09#s4): 크로스 곱으로 검증하며 고른 수 `1, 4`(이차항 쪽)와 `2, 3`(상수항 쪽)이 **그 자리에서 그대로 날아가** `1x+2`, `4x+3`이 되는 모습을 보여 줘야 직관적으로 이해된다. 지금은 결과 식이 `reveal`로 갑자기 나타날 뿐이라, "고른 수가 어디로 가는지"가 끊긴다.
- 범위: 플레이어·스키마·검사·테스트만. 레슨 JSON·DB·음성·push·배포는 하지 않는다(콘텐츠 적용은 머지 후 Claude가 한다).

## 1. 스키마

`lib/learn/lessons/chalk-schema.ts`(또는 action-schema)에 추가:

```ts
{ type: 'move',
  from?: target, to?: target,                 // 한 쌍
  pairs?: [target, target][],                 // 여러 쌍 (from·to와 둘 중 하나)
  stagger_ms?: number,                        // pairs 사이 시차, 기본 180
  duration_ms?: number,                       // 한 쌍 비행 시간, 기본 700 (200~2000)
  color?: 'mint' | 'accent' | 'mark' | 'hand',// 비행 중·도착 후 글자색(생략 시 출발 글자의 현재 색)
  keep_color?: 'sentence' | 'scene',          // 도착 글자 색 유지 기간, 기본 'sentence'
  at, at_ms }
```

- target은 기존 부분 대상 문법 그대로(`item:fa/a1`, `cell:r:c/name`, `step:i/name`…). `to`는 반드시 `\p{}` **부분 대상**이어야 한다(도착 글자를 숨겼다가 보여 줘야 하므로).
- 검사(`lesson-check`/zod refine): from·to 둘 다 존재하는 대상인지, `to`가 부분 대상인지, 같은 `to`에 move가 두 번 이상 걸리지 않는지.

## 2. 동작

1. **도착 자리 숨김**: 장면 안에서 어떤 `move`의 `to`로 쓰인 부분은, 그 move가 **도착하기 전까지** opacity 0. 도착 식의 나머지(`x`, `+`, 괄호)는 기존 `reveal`로 먼저 보이게 한다 → 학습자는 `(  x +  )(  x +  )` 틀이 먼저 뜨고, 숫자가 날아와 빈칸을 채우는 것을 본다.
2. **비행**: 시각 `t0 = at (+ i·stagger_ms)`부터 `duration_ms` 동안, 출발 부분의 **복제본**(같은 KaTeX 글자, 출발 위치·크기)이 도착 부분의 위치·크기로 이동한다. 경로는 직선이 아니라 위로 살짝 휘는 곡선(기존 `arcPoints`와 같은 느낌, 높이 = 거리의 15%), easing ease-in-out, 크기는 선형 보간.
3. **출발 글자는 그대로 남는다**(복사해 가는 것). 출발 글자는 비행 동안 color로 살짝 강조.
4. **도착**: 복제본이 사라지는 순간 도착 부분이 opacity 1 + `color`로 표시, `keep_color` 기간 뒤 원래 색.
5. 출발과 도착이 같은 장면 안의 서로 다른 item이어도, 같은 item이어도 동작한다. 위치는 지금 지시(pointing)가 쓰는 **실측 DOM 사각형**(`targetBox`)에서 얻는다 → 세로(390px) 재배치(LS4-13)에서도 그대로 맞는다.

## 3. 되감기·탐색 정확성

- `stageStateAt(time)`에 `moves` 상태 추가: 각 move에 대해 `progress = clamp((time − t0)/duration, 0, 1)`.
  - `progress < 1`인 move의 `to` 부분은 숨김, `0 < progress < 1`이면 비행 중 복제본을 `progress` 위치에 그린다.
  - 강 단위 seek(LS4-14)로 어느 시각에 들어와도 같은 화면이 나와야 한다(애니메이션 상태를 누적 저장하지 말고 시간에서 계산).
- 일시정지 중에는 복제본이 그 자리에 멈춘다. 배속은 progress 계산에 자연히 반영.
- `clear what:'all'`은 비행 중 복제본을 지우되, 이미 도착한 글자는 남긴다(도착 = 칠판에 쓰인 것).

## 4. 렌더

- 새 레이어 `MoveLayer`(ChalkLayer와 같은 좌표계, 포인터 이벤트 없음). 복제본은 출발 부분 DOM의 `innerHTML`을 그대로 복사한 절대 위치 요소(KaTeX 글꼴 유지). transform만 바꿔 60fps.
- 도착 숨김은 tint와 같은 경로(부분별 스타일 맵)로 `opacity:0` 적용 — 레이아웃 폭은 유지(숨김 때문에 식이 밀리지 않게).
- `prefers-reduced-motion`이면 비행 없이 `duration_ms` 뒤 도착 글자만 페이드인.

## 5. 테스트

- 스키마: from/to·pairs 둘 중 하나, to 부분 대상 아님 → 오류, 같은 to 중복 → 오류.
- `stageStateAt`: t0 직전(도착 숨김·복제본 없음), 중간(progress 0.5), 끝(도착 표시·복제본 없음), stagger 두 번째 쌍, seek 역방향.
- 렌더: 복제본 innerHTML이 출발 부분과 같음, 도착 부분 opacity, reduced-motion.
- 기존 레슨 11개 렌더 회귀 없음. 1672×941·390×844 캡처: 아래 예시 장면의 비행 중간과 도착 후.

## 6. 적용 예시 (머지 후 Claude가 넣을 콘텐츠 — 테스트 픽스처로 써도 됨)

rm-09 s4 무대 (이미 운영 중):

```
fa  = 4의 약수 배열   윗줄 \p{a1}{1} \p{a2}{2} / 아랫줄 \p{c1}{4} \p{c2}{2}
fb  = 6의 약수 배열   윗줄 \p{b1}{1} \p{b2}{2} / 아랫줄 \p{d1}{6} \p{d2}{3}
fbr = 뒤집은 쌍       윗줄 \p{b3}{3} \p{b4}{6} / 아랫줄 \p{d3}{2} \p{d4}{1}
```

새 item `fac` (y≈0.66): `(\p{a}{1}x+\p{b}{2})(\p{c}{4}x+\p{d}{3})` — 처음엔 숨김.

새 문장(검증 직후): "고른 수를 그대로 가져오면, 윗줄은 일엑스 더하기 이, 아랫줄은 사엑스 더하기 삼." 
```json
{"type":"reveal","target":"item","id":"fac","at":"@고른 수를"},
{"type":"move","pairs":[["item:fa/a1","item:fac/a"],["item:fb/b2","item:fac/b"]],"color":"mint","at":"@윗줄은"},
{"type":"move","pairs":[["item:fa/c1","item:fac/c"],["item:fb/d2","item:fac/d"]],"color":"mint","at":"@아랫줄은"}
```
→ 틀 `( x + )( x + )`이 먼저 뜨고, 윗줄 1·2가 날아와 `1x+2`, 아랫줄 4·3이 날아와 `4x+3`.

## 7. 보고

커밋 해시, 통과한 검사(tsc·eslint·vitest 수), 캡처 4장(데스크톱·세로 × 비행 중·도착 후), 남은 제약.
