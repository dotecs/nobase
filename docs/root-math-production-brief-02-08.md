# 뿌리깊은수학 2~8강 제작 브리프

이 문서는 rm-02 ~ rm-08 레슨 JSON을 **병렬로** 쓰기 위한 공통 기준이다. `docs/learning-studio-content-principles.md`(원칙 1~7)과 함께 읽는다. 예시 레슨: `content/lessons/rm-01.json`(개념 레슨, 수직선·tree·quiz), `content/lessons/rm-11.json`(graph·steps·chain·slider·table·quiz).

## 0. 공통 규격

- 파일: `content/lessons/rm-0N.json`. `kind:"concept"`, `pack_id:"root-math"`, `ability_ids`는 아래 표. `intro`(한 줄), `goal`(120자 이내).
- 장면 5~7개, 문장 18~28개. 마지막 장면은 `tag:"check"` + `quiz` 무대(`trace_concept_id` 필수). 첫 문장은 "이번 시간에는 …"(인사말 금지). 마지막 문장에서 다음 강 예고: "다음 시간에는 n강 ○○입니다."
- `headline`: `eyebrow:"n강 · 제목"`, `title`(짧게), `accent`(title의 부분 문자열), `subtitle`. **`formula`는 쓰지 않는다** — 수식은 무대 `items`로 칠판에 쓴다.
- `tts`: 식은 한 덩어리로 붙여 읽는다("엑스제곱플러스이엑스", "이분의일"). 앵커 `@…`는 tts의 부분 문자열. 문장 첫 액션은 `@start`. `[short pause]`,  강조 태그(slight emphasis 등)는 쓰지 않는다 — 매뉴얼 §4.
- `text`: 수식은 `$…$`. 자막 42자 기준으로 의미 단위가 끊기게 쓴다(문장 끝 → 쉼표 순).
- 수는 정확한 꼴(분수·√). 좌표에 식 문자열 허용(`"1/2"`, `"sqrt(5)"`, `"-(3/2)"`).
- 지시(chalk)는 **문장마다 1~3개**, 손글씨 메모는 장면당 최대 4개, pointer·circle은 문장당 2개 이하. 지시 대상은 가능하면 `item:<id>`·`step:i`·`node:i`·`row:i`·`tree:<id>`처럼 **요소 기준**으로.
- 정의 장면 뒤에는 항상 **예시 장면**(교재 예시 그대로) → 필요하면 **반대 방향·주의 장면** → 확인 퀴즈.

### 무대 선택 가이드
| 내용 | 무대 |
|---|---|
| 식 한 줄을 놓고 부분을 가리키며 용어 설명 | `board` + `items`(항마다 item 하나, `underline`/`circle`/`handwrite arrow_to item`) |
| 유도·변형 과정(줄마다 근거) | `steps`(각 step에 `why`, `concept_id`) |
| 정의·분류 카드 나열 | `chain` 또는 `tree` |
| 경우 비교(양수/0/음수 등) | `table`(`tone: pos/zero/neg`) |
| 수직선 위 위치·구간 | `graph` + `number_line:true` + `bracket`(label_pos) |
| 값을 바꾸며 관찰 | `slider` |

`board`·`steps`·`chain`·`table`·`tree` 무대의 `items`·chalk `position`은 **비율 좌표(0~1, 좌상단 원점)**. `graph`·`slider`는 데이터 좌표.

```json
{"type":"board","items":[
 {"id":"t1","tex":"4x^3","position":{"x":0.2,"y":0.3},"size":"lg"},
 {"id":"t2","tex":"-2x^2y","position":{"x":0.4,"y":0.3},"size":"lg"}
],"initial":{"hidden_items":["t2"]}}
```
액션: `{"type":"reveal","target":"item","id":"t2","at":"@…"}`, `{"type":"underline","target":"item:t1","at":"@…","ttl_ms":4000}`, `{"type":"circle","target":"item:t1",…}`, `{"type":"handwrite","text":"계수","position":{"x":0.2,"y":0.55},"arrow_to":{"target":"item:t1"},"at":"@…"}`.

### 검사
```
cd <clone> && node scripts/lesson-check.mjs content/lessons/rm-0N.json          # PASS 필수
node scripts/lesson-check.mjs content/lessons/rm-0N.json --captions          # 자막 분할 확인
```
경고 0, 오류 0.

## 1. 전후 참조표 (말로 "n강" 붙이기)

| 강 | 뒤로 참조(실제 앞 강 내용만) | 앞으로 참조(이름+한 줄 역할만, 손글씨 `→ n강 ○○`) |
|---|---|---|
| 2 문자와 식 | 1강 양수·음수·부호 | 7강 지수법칙(지수 계산은 거기서), 9강 이차식의 인수분해(차수·이차식) |
| 3 분배 법칙 | 2강 곱셈 기호 생략, 항·계수 | 9강 인수분해(공통인수로 묶기가 핵심 도구) |
| 4 분수의 성질 | 1강 유리수(분수로 쓸 수 있는 수), 3강 역수(나눗셈 = 역수 곱) | 5강 등식의 성질(0으로 나눌 수 없는 이유 같음), 11강 근의 공식 유도(통분이 쓰임) |
| 5 등식의 성질 | 4강 분모≠0, 3강 역수·분배법칙, 2강 동류항·상수항 | 10강 이차방정식의 해법, 16강 방정식과 부등식의 의미(교점으로 다시 읽기) |
| 6 부등식의 성질 | 5강 등식의 성질·방정식 푸는 순서, 3강 분배법칙 | 16강 방정식과 부등식의 의미 |
| 7 지수법칙 | 2강 지수·차수 용어 | (이 과정 밖) "나중에 지수함수 단원에서 일반화" — 번호 없이 |
| 8 제곱근의 성질 | 1강 무리수·(실수)²≥0, 7강 지수(제곱) | 10강 이차방정식의 해법(제곱근으로 풀기), 11강 판별식(실근 없음) |

## 2. 강별 개요

### rm-02 문자와 식 — ability 02-1, 02-2, 02-3, 02-4
예시 식(교재): $4x^3-2x^2y+y-7$.
1. (define, board) 곱셈 기호의 생략: 수와 문자, 문자와 문자 사이는 생략. 숫자끼리는 안 됨(3×4≠34). 1강 참조: 부호(+,−). 맨 앞 + 생략.
2. (define, board) 항·상수항: 부호로 끊어 항 4개. 문자 없는 −7이 상수항. 계수: 문자 앞 수, **부호 포함**(−2x²y의 계수는 −2).
3. (define, board) 지수와 차수: 지수 = 거듭제곱 횟수(1은 생략). 차수 = 문자가 곱해진 횟수(4x³ 3차, −2x²y 3차, y 1차, −7 0차). 식의 차수 = 가장 높은 항 → 일차식·이차식(→ 9강). 7강 예고.
4. (example, table 또는 chain) 동류항: 문자와 차수가 각각 같은 항. 예: 3x와 −5x ○, 2ab와 −ab ○(슬라이드 확인), 상수항끼리 ○; x와 −x² ✕(차수), −8xy와 5x² ✕(문자 종류; 슬라이드 확인).
5. (example, steps) 동류항끼리만 더하고 뺀다: 3x−5x=−2x 처럼 한 줄 예(슬라이드에 있으면 그대로).
6. (check, quiz) "−2x²y의 계수는?" 또는 동류항 고르기. trace `c.like-terms` 또는 `c.coefficient`.
개념: `c.term`, `c.coefficient`, `c.exponent-degree`, `c.like-terms`, (기존) `c.quadratic-expr`.

### rm-03 분배 법칙 — ability 03-1, 03-2
1. (define, board) $a(b+c)=ab+ac$. 2강 참조: 괄호와 a 사이 곱하기 생략.
2. (example, steps) $-3(4x-7)=-12x+21$: −7을 "더했다"로 보기.
3. (example, steps) $(6x+12)\div(-3)$: 나눗셈은 **역수 곱**. 역수 = 곱해서 1. $-3=\frac{-3}{1}$ → $-\frac13$. 곱셈은 순서 무관 → $-2x-4$.
4. (define, steps) 거꾸로 — 공통인수로 묶기: $4x^2-6x = 2x\cdot2x + 2x\cdot(-3) = 2x(2x-3)$. 9강 예고.
5. (check, quiz) 묶기 또는 풀기 한 문제. trace `c.common-factor`/`c.distributive`.
개념: `c.distributive`, `c.reciprocal`, `c.common-factor`.

### rm-04 분수의 성질 — ability 04-1, 04-2, 04-3, 04-4, 04-5
1. (define, board) 분모·분자, **분모≠0**. 1강 참조(유리수). 고등수학은 거의 분수로.
2. (define, graph number_line 또는 board) 분수의 성질: 분모·분자에 0 아닌 같은 수를 곱하거나 나눠도 같다. $\frac25=\frac4{10}=\frac6{15}=\frac8{20}$ (수직선에 같은 점으로 찍으면 좋다).
3. (example, steps) 약분·기약분수: $\frac6{24}\to\frac3{12}\to\frac14$. 답은 기약분수로(감점 주의).
4. (example, steps) 덧셈은 통분: $\frac12+\frac13=\frac36+\frac26=\frac56$.
5. (example, steps) 곱셈: 분자끼리·분모끼리. $\frac35\times\frac79=\frac{21}{45}=\frac7{15}$. 3강 참조(나눗셈 = 역수 곱).
6. (derive, steps) 번분수: $\dfrac{\;\frac ba\;}{\;\frac dc\;}=\dfrac{bc}{ad}$ — 분모·분자에 $ac$를 곱하는 것(분수의 성질). 11강 예고(근의 공식 유도의 통분).
7. (check, quiz). trace `c.fraction-props` 등.
개념: `c.fraction`, (기존)`c.fraction-props`, `c.reduce`, `c.fraction-add`, `c.fraction-mul`, `c.complex-fraction`.

### rm-05 등식의 성질 — ability 05-1, 05-2, 05-3
1. (define, board) 등호·등식·좌변·우변·양변.
2. (define, chain 또는 table) 성질: 양변에 같은 수 +,−,×,÷(0 아닌 수). 4강 참조(분모≠0과 같은 이유). 추가: 역수(3강), 거듭제곱(n제곱) — "기초에선 덜 쓰지만 뒤에서 필요".
3. (translate, board) 방정식 = 미지수 값에 따라 참·거짓이 갈리는 등식. **의문문**: "$x$가 무엇이면 이 등식이 참이 되느냐"고 묻는 문장(원칙 1의 이 단계 버전; 그래프 교점 번역은 16강 예고로만). 해·푼다.
4. (derive, steps) $2x+10=4$: 목표 "좌변에 x만". 상수항 먼저: 양변 −10 → $2x=-6$. 곱해진 2는 역수 $\frac12$ 곱 → $x=-3$. 각 step `why`에 `concept_id:"c.equality-props"`. "이항"은 이 성질의 줄임말.
5. (example, steps) 검산: $2(-3)+10=4$ ✓ (짧게). 10강·16강 예고.
6. (check, quiz). trace `c.equality-props`.
개념: `c.equality`, (기존)`c.equality-props`, (기존)`c.equation` → lesson_id를 rm-05로 옮김, `c.linear-eq-solve`.

### rm-06 부등식의 성질 — ability 06-1, 06-2, 06-3
1. (define, board) 부등호(<, >, ≤, ≥)·부등식·좌변·우변·양변. 5강과 같은 말.
2. (define, table tone) 성질: +,− 는 방향 그대로(5강과 동일). ×,÷ **양수**면 그대로, **음수**면 방향 바뀜. 수직선 예(−1을 곱하면 좌우가 뒤집힘)를 graph number_line으로 한 장면 넣어도 좋다.
3. (derive, steps) 교재 예(슬라이드 06-x 확인; 전사 추정 $3x-3\le4(x+1)$): 분배법칙(3강) → 양변 +3 → 양변 −4x → $-x\le7$ → 양변 ×(−1) **방향 반전** → $x\ge-7$. 각 step `why`(`c.ineq-props`, `c.distributive`). 슬라이드의 부등호 방향을 그대로 따른다.
4. (example, graph number_line) 해를 수직선에 bracket으로 표시(끝점 포함 여부).
5. (check, quiz) 음수 곱 방향 문제. trace `c.ineq-props`. 16강 예고.
개념: `c.inequality`, (기존)`c.ineq-props`, `c.linear-ineq-solve`.

### rm-07 지수법칙 — ability 07-1, 07-2, 07-3
1. (define, board) 밑·지수: $a^n$ = a를 n번 곱함. 2강 참조.
2. (derive, steps) $a^m a^n=a^{m+n}$ 예 $a^3a^5=a^8$ (풀어 쓰기). $(a^m)^n=a^{mn}$ 예 $(a^3)^2=a^6$, 3·2=2·3이라 $(a^2)^3$과도 같음.
3. (example, table) $a^m\div a^n$: m>n → $a^{m-n}$ ($a^5/a^2=a^3$), m=n → 1, m<n → $\dfrac1{a^{n-m}}$ ($a^2/a^5=\frac1{a^3}$). 약분으로 보여 준다. "지수함수 단원에서 일반화".
4. (define, steps) $(ab)^n=a^nb^n$, $\left(\frac ab\right)^n=\frac{a^n}{b^n}$ ($b\ne0$). 예 $(a^2b^3)^2=a^4b^6$.
5. (example, steps) **거꾸로·주의**: $14^3 = (2\cdot7)^3 = 2^3\cdot7^3 = 8\cdot7^3$. $2\cdot7^3$ 아님 — 지수가 같을 때만 밑을 합칠 수 있다.
6. (check, quiz). trace `c.exp-dist`.
개념: `c.power`, `c.exp-add`, `c.exp-sub`, `c.exp-dist`.

### rm-08 제곱근의 성질 — ability 08-1, 08-2, 08-3
1. (define, board 또는 figure) 정사각형 넓이 4 → 한 변 2 = $\sqrt4$; 넓이 9 → $\sqrt9=3$; 넓이 5 → $\sqrt5$: 정수·분수로 못 씀 = 1강 **무리수**. 길이는 분명 존재(자로 잴 수 있다). "제곱해서 5가 되는 수".
2. (define, graph number_line) 근호 읽기(루트). $\sqrt4=2,\ \sqrt9=3,\ \sqrt5$를 수직선에 찍기(√5 ≈ 2.236 위치, 라벨은 $\sqrt5$). 7강 참조(제곱).
3. (define, steps) 근호의 계산: 더하기·빼기는 제한적, 곱셈은 $\sqrt a\sqrt b=\sqrt{ab}$, $\dfrac{\sqrt a}{\sqrt b}=\sqrt{\dfrac ab}$ (교재 예시 그대로, 슬라이드 확인).
4. (define, table tone pos/zero/neg) **a의 제곱근**(제곱해서 a가 되는 수): a>0 → 두 개 $\pm\sqrt a$ ($x^2=9$ → $\pm3$); a=0 → 0 하나; a<0 → 없음 — 1강 (실수)²≥0 참조. "실근이 없다".
5. (example, table) 7 → $\pm\sqrt7$, 0 → 0, −3 → 없음. 10강·11강 예고.
6. (check, quiz) "−3의 제곱근은?" trace `c.sqrt-props`.
개념: `c.sqrt`, `c.sqrt-mul`, (기존)`c.sqrt-props`.

## 3. 개념 노드 id 목록(이미 `content/concepts/root-math.json`에 추가됨)

| id | 이름 | 강 |
|---|---|---|
| c.term | 항과 상수항 | 2 |
| c.coefficient | 계수 | 2 |
| c.exponent-degree | 지수와 차수 | 2 |
| c.like-terms | 동류항 | 2 |
| c.quadratic-expr | 이차식 | 2 |
| c.distributive | 분배법칙 | 3 |
| c.reciprocal | 역수 | 3 |
| c.common-factor | 공통인수로 묶기 | 3 |
| c.fraction | 분수의 뜻 | 4 |
| c.fraction-props | 분수의 성질(통분) | 4 |
| c.reduce | 약분과 기약분수 | 4 |
| c.fraction-add | 분수의 덧셈 | 4 |
| c.fraction-mul | 분수의 곱셈 | 4 |
| c.complex-fraction | 번분수 | 4 |
| c.equality | 등식과 양변 | 5 |
| c.equality-props | 등식의 성질 | 5 |
| c.equation | 방정식과 해 | 5 |
| c.linear-eq-solve | 일차방정식 풀기 | 5 |
| c.inequality | 부등식 | 6 |
| c.ineq-props | 부등식의 성질 | 6 |
| c.linear-ineq-solve | 일차부등식 풀기 | 6 |
| c.power | 밑과 지수 | 7 |
| c.exp-add | 지수의 합과 곱 | 7 |
| c.exp-sub | 지수의 차 | 7 |
| c.exp-dist | 지수의 분배 | 7 |
| c.sqrt | 루트의 뜻 | 8 |
| c.sqrt-mul | 근호의 곱셈·나눗셈 | 8 |
| c.sqrt-props | 제곱근의 성질 | 8 |
