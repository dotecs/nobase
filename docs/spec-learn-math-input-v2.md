# 수식 입력 v2 — 보이는 식 · 한 칸 부등식 입력 · √ π log 삼각함수 채점 (M-0 ~ M-6)

- 작성일: 2026-10-29
- 대상: Codex(`nobase` 레포, main `321d4b6` 이후)
- 브랜치: **`feat/learn-math-input-v2`**. 항목당 커밋 1개(M-0 → M-6 순서), 각 커밋 tsc·vitest·build 통과. 기존 테스트 521개는 **수정 없이** 통과해야 한다(동작이 바뀌는 테스트는 그 이유를 커밋 메시지에 적을 것).
- 검수·머지·배포: Claude. **DB 변경 없음**(마이그레이션 파일도 없음). 환경변수 없음.
- 참조: `docs/spec-learn-ui-v1.md`(토큰·접근성·문구 규칙), `docs/spec-learn-steps-pad.md`(단계 입력·패드 구조), `lib/learn/mathcheck/*`.

> 결정 기록(2026-10-29, 대표): (1) "보이는 식"은 실제 수학 표기(세로 분수·지수·√·π)로 그린다. (2) 부등식·방정식 답은 **`x<=-7` 그 자체를 한 칸에** 입력한다(부등호 선택 버튼 + 숫자 칸 분리 폐지). (3) `√ π log 삼각함수`는 표시뿐 아니라 **채점까지** 포함. `∫ lim Σ`는 범위 밖(미적분 팩 때).

---

## 0. 한 장 요약

| 항목 | 결정 |
|---|---|
| 원칙 | **보이는 식 = 채점기가 해석한 식.** 미리보기는 입력 문자열을 KaTeX에 그대로 넘기지 않고, `parseMath`의 AST를 LaTeX로 다시 그린다. 학생이 `1/2x`를 치면 ½x로 보이고 채점기도 그렇게 본다. |
| 입력 문법 | 지금 ASCII 문법 유지 + 함수·상수 추가: `sqrt( ) root(n, ) abs( ) log( ) log(b, ) ln( ) exp( ) sin cos tan`, 상수 `pi`. 유니코드 `√ π ² ³ × ÷ − ≤ ≥ °`와 지문용 LaTeX(`\sqrt{} \pi \log_{b} \sin …`)는 정규화로 흡수. |
| 채점 | **정확 경로(현행 유리수 다항식) 우선**, 실패(`UnsupportedError`)하면 **수치 경로**(표본점 대입, 상대오차 1e-9)로 폴백. 기존 문항 결과는 바뀌지 않는다. |
| 부등식·방정식 | 한 칸 입력. `relation_required` 문항은 키패드에 `x < > ≤ ≥ =` 키 노출. `x=7`과 `7` 모두 허용(현행 채점 규칙 그대로). |
| 적용 화면 | 답 입력 미리보기, 풀이 단계 각 줄, 폰 패드, 피드백 "입력:", 코치 타임라인·단계 표시 — `MathPreview` 하나로 통일. |
| 미지원 기호 | 입력 즉시 미리보기에 "아직 지원하지 않는 기호예요: ∫" 표시(제출 전에 알게). |
| 범위 밖 | `∫ lim Σ`, 행렬, 간단히-한-형태 강제(`√12` 대신 `2√3`만 정답), 지수함수 상수 `e`(변수 `e`와 충돌 — `exp()`로 대체), 각도 단위 자동 추론(`°`만 지원), 변형 생성기의 함수 지원(함수 포함 지문은 변형 잠금). |

---

## M-0 파서·정규화 확장 (`lib/learn/mathcheck/parse.ts`)

### AST
```ts
export type Expr =
  | { kind: 'number'; value: Rational }
  | { kind: 'variable'; name: string }
  | { kind: 'constant'; name: 'pi' }
  | { kind: 'neg'; value: Expr }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: Expr; right: Expr }
  | { kind: 'call'; fn: 'sqrt' | 'root' | 'abs' | 'log' | 'ln' | 'exp' | 'sin' | 'cos' | 'tan'; args: Expr[] };
```
- `log(x)` = 상용로그(밑 10), `log(b, x)` = 밑 b. `root(n, x)` = n제곱근. `sin/cos/tan`은 **라디안**. `30°` → `(30)*pi/180` 로 정규화(토큰 `°` 는 바로 앞 원자에 붙는 후위 연산자).
- `abs(x)` 와 `|x|` 둘 다 허용. `|…|`는 **중첩 없이 1겹만**(`|x|+|y|`는 됨, `||x|-1|`은 `UnsupportedError`).

### 토크나이저
- 키워드를 **먼저** 매칭(`sqrt|root|abs|log|ln|exp|sin|cos|tan|pi`), 그 다음 한 글자 변수. 따라서 `xy`는 지금처럼 `x*y`, `sinx`는 `sin(x)`, `pix`는 `pi*x`.
- 함수 적용: 괄호가 기본. 괄호 없이 **바로 뒤의 원자 하나**(숫자·변수·상수·괄호식)에만 적용: `sqrt2`→`sqrt(2)`, `sin x`→`sin(x)`, `sqrt2x`→`sqrt(2)*x`, `sin 2x`→`sin(2)*x`. 애매함은 미리보기에 그대로 드러나므로 그 이상 추론하지 않는다.
- `^` 우선순위·결합은 현행 유지(`-x^2` = `-(x^2)`, `2^3^2` = `2^(3^2)`). `sqrt(x)^2`는 `(sqrt(x))^2`.

### `normalizeMath` 추가 규칙
- 유니코드: `√(` → `sqrt(`, `√` + 원자 → `sqrt(원자)`, `π` → `pi`, `²`→`^2`, `³`→`^3`, `°` 유지(토큰).
- LaTeX(지문·`answer_spec.value`에서 올 수 있음): `\sqrt{a}`→`sqrt(a)`, `\sqrt[n]{a}`→`root(n,a)`, `\pi`→`pi`, `\log_{b} a` / `\log_b a` → `log(b,a)`, `\log a`→`log(a)`, `\ln`→`ln`, `\sin\cos\tan`→소문자 함수, `\left|a\right|`→`abs(a)`, `\circ`/`^\circ`→`°`. `\frac`는 현행 규칙.
- 모르는 `\명령`이나 `∫ ∑ lim →` 는 `UnsupportedError('Unsupported notation: <기호>')` — **기호를 메시지에 담는다**(M-3 안내에 사용).

### 테스트 (`parse.test.ts` 신규)
- 위 예시 전부 + 기존 입력(`-12x+21`, `1/2x`, `(-3)+7-(-5)`, `x<=-7`)의 AST가 **변하지 않음**(스냅샷).
- `|x|` 1겹 허용·2겹 거부, `30°`, `\sqrt[3]{8}`, `log_2 8`(LaTeX `\log_2 8`) → `log(2,8)`.

---

## M-1 채점: 수치 폴백 (`lib/learn/mathcheck/evaluate.ts`, `solvers/mathcheck.ts`, `steps.ts`)

### 수치 평가 `numeric(expr, env): number`
- JS double. `pi`=Math.PI, `sqrt`는 음수 → NaN, `log`/`ln`은 0 이하 → NaN, `tan`은 그대로, `root(n,x)`는 n 홀수면 음수 허용(`Math.cbrt` 식 부호 처리), `0^0`=NaN. NaN·±Infinity는 "정의 안 됨".

### 동치 `equivalent(a, b)` 확장
1. 현행 정확 경로 먼저. 성공하면 그 결과(기존 동작 100% 유지).
2. `UnsupportedError`(함수·상수·차수>2·변수 분모·비정수 지수 등)면 수치 경로:
   - 변수 집합 = 양쪽 변수 합집합(최대 2개, 넘으면 `UnsupportedError`).
   - **고정 표본점**(테스트 재현성): 변수 1개 → `[-2.2, -1.3, -0.63, -0.37, 0.11, 0.5, 1.9, 2.71, 3.9, 7.1, 0.25, 4]`; 변수 2개 → 위 목록의 앞 6개로 만든 6×6 격자 중 대각선 포함 12점(구현에서 고정 배열로 둘 것). 변수 0개 → 1점.
   - 양쪽 모두 정의되는 점이 **6개 미만**(변수 0개면 1개 미만)이면 `UnsupportedError('Numeric domain')`.
   - 모든 공통 점에서 `|a-b| <= 1e-9 * max(1, |a|, |b|)` 이면 동치.
3. 상수 기준 `TOLERANCE = 1e-9`, `MIN_POINTS = 6` 은 `evaluate.ts` 상단 상수(규칙 설정 테이블로 빼지 않음 — DB 무변경).

### `solvers/mathcheck.ts`
- `expression`: 변경 없음(내부 `equivalent`가 폴백을 얻음). `factored_required` 검사도 그대로.
- `number`/`fraction`:
  - `spec.value`와 입력을 **먼저 `Rational.parse`**(현행). 둘 중 하나라도 실패하면 둘 다 `parseMath` → 변수 없는 식이어야 함 → `numeric` 비교(같은 허용오차). 예: 입력 `sqrt(12)`, 정답 `2sqrt(3)` → correct. 정답 `pi/4`, 입력 `0.785` → incorrect(허용오차 밖; `spec.tolerance`가 있으면 그 값으로).
  - `not_reduced` 검사는 입력이 순수 `a/b` 꼴일 때만(현행).
  - **관계식 입력**(`x<=-7`, `x=7`): 현행 `solveItem` 경로 유지. 추가로 좌변이 변수 단독이고 우변이 상수식(`x<=sqrt(2)`)이면 `solveItem` 없이 `{variable, relation, value: numeric}`으로 처리.
  - 수치 경로에서 `UnsupportedError('Numeric domain')` → `{ result: 'pending_review', detail: { reason: 'numeric_domain' } }`(코치 확인). 그 외 `UnsupportedError` → 현행대로 `input_issue: invalid_math`.
- `steps.ts` `checkSteps`: `equivalent` 확장으로 자동 혜택. 수치 경로로 판정된 줄은 `lines[i].method = 'numeric'`(선택 필드)만 추가 — UI 변화 없음.

### `solveItem`(변형 생성·자동 정답)
- 변경 없음. 함수·상수가 포함된 지문은 지금처럼 `unsupported` → 코치 정답 입력. `template-lock.ts`: 지문에 `sqrt|root|abs|log|ln|exp|sin|cos|tan|pi|√|π`가 있으면 **변형 잠금**(`LOCKED_VARIANT_MESSAGE` 재사용, 사유 문구 "함수·상수가 포함된 문항은 변형을 만들지 않아요").

### 테스트
- 정확 경로 불변: 기존 `solve.test.ts`·`steps.test.ts` 무수정 통과.
- 수치: `sqrt(12)`≡`2sqrt(3)`, `sin(x)^2+cos(x)^2`≡`1`, `log(2,8)`≡`3`, `ln(exp(2))`≡`2`, `abs(-3)`≡`3`, `root(3,27)`≡`3`, `x^3-1`≡`(x-1)(x^2+x+1)`, `x/(x+1)`≢`1`, `sqrt(x)`≢`-sqrt(x)`, `sin(30°)`≡`1/2`, `log(x)` vs `log(-x)` → `numeric_domain`(pending_review).
- 채점: `number` 정답 `2sqrt(3)`에 입력 `sqrt(12)`/`3.4641`/`2√3` 각각 correct/incorrect/correct. `relation_required` 문항에 `x<=-7` correct, `-7` → `relation_required`, `x>=-7` incorrect, `x<=sqrt(49)` correct.

---

## M-2 AST → LaTeX (`lib/learn/mathcheck/latex.ts`, 순수 함수)

`toLatex(parsed: Parsed): string` — **다시 파싱하면 같은 AST가 나오도록** 괄호를 넣는다(왕복 테스트로 보장).

- 숫자: 정수·소수 그대로(`Rational`이 아니라 **원래 토큰 문자열**을 보존해야 함 — `0.50`을 쳤으면 `0.50`. 파서가 `number` 노드에 `raw: string`을 유지하도록 M-0에서 추가).
- 변수 → 이탤릭 기본, `pi` → `\pi`.
- `neg` → `-` + 피연산자(피연산자가 `+`/`-` 이항이면 괄호).
- `/` → `\frac{분자}{분모}`. 분자·분모 안에서는 바깥 괄호 생략. 단, 사용자가 **괄호를 직접 친 경우**는 보존하지 않는다(AST에 괄호 정보 없음 — 의미가 같으면 같은 그림).
- `*`: 숫자×숫자 → `\times`; 그 외 암시 곱(`2x`, `2(x+1)`, `(x+1)(x-1)`, `x\sqrt{2}`). 숫자 뒤에 숫자로 시작하는 항이 오면(`2\cdot 3x`) `\times` 로. 피연산자가 `+`/`-` 이항이면 괄호.
- `^` → `{밑}^{지수}`; 밑이 원자(숫자·변수·상수·함수호출·`|x|`)가 아니면 괄호. 지수는 항상 중괄호.
- `-`(이항) 우변이 `+`/`-` 이항이면 괄호. 좌·우변이 `neg`로 시작하면 괄호(`a-(-b)`, `a+(-b)`).
- 함수: `\sqrt{}` `\sqrt[n]{}` `\left|…\right|` `\log x` `\log_{b} x` `\ln` `e^{…}`(exp) `\sin \cos \tan`. 인자가 원자가 아니면 괄호(`\sin(2x)`), 원자면 공백(`\sin x`). `log(2,8)` → `\log_{2} 8`. 각도: `30°` → `30^{\circ}`.
- 관계: `=` `<` `\le` `>` `\ge`.
- 테스트: 왕복 `parseMath(toAscii(parseMath(s)))` 동일 AST — 이를 위해 `toAscii(parsed)`(ASCII 문법으로 되돌리기)도 같이 구현하고 노출. 예시 20개 이상(위 입력들 + `1/2x`→`\frac{1}{2}x`, `(1/2)x`도 같은 결과, `x^2/3`, `2^(1/2)`, `-(x-1)`, `3*4`, `x<=-7`→`x \le -7`).

---

## M-3 `MathPreview` 컴포넌트 (`components/learn/MathPreview.tsx`) + 서버용 `formatMath`

`<MathPreview value={string} empty="입력한 답이 여기에 표시됩니다." />`

- 상태 3가지:
  1. **해석 성공** → `renderMathMarkdown('$'+toLatex+'$')`. 앞에 "보이는 식:" 캡션 유지.
  2. **미지원 기호**(`UnsupportedError('Unsupported notation: ∫')`) → 캡션을 "아직 지원하지 않는 기호예요: ∫" 로 바꾸고 `role="status"`. 마지막 성공 렌더는 흐리게(opacity 토큰) 유지.
  3. **미완성**(그 외 파싱 오류: `5/`, `sqrt(`, `x<=`) → 마지막 성공 렌더를 흐리게 유지 + 원문을 `<code>`로 작게. 아무것도 성공한 적 없으면 원문만.
- 동기 계산(`useMemo`), 디바운스 없음. `aria-live="polite"`는 성공 렌더에는 붙이지 않는다(글자마다 읽어 주면 시끄러움) — 상태 2에만.
- 접이식 "입력 도움말" (`<details>`): 예시 한 줄씩 — `5/6`, `x^2`, `sqrt(2)` 또는 `√2`, `2pi`, `log(2,8)`, `sin(30°)`, `|x-1|`, `x<=-7`. 문구는 `docs/spec-learn-ui-v1.md` 규칙(존댓말·keep-all).
- `lib/learn/mathcheck/format.ts` `formatMath(text): { latex: string } | { raw: string }` — 서버 컴포넌트(코치 화면)용 동일 로직.

---

## M-4 답 입력 한 칸 + 키패드 (`AnswerInput.tsx`, `Keypad.tsx`, `StepInput.tsx`)

- `AnswerInput`
  - 부등호 `fieldset` 제거, `composeRelationAnswer` 제거(테스트·패드에서 쓰는 곳 모두 정리). 입력값 = 학생이 친 문자열 그대로.
  - `relation_required`일 때 placeholder `예: x<=3`, 라벨은 "답 입력"(변수 표시는 placeholder로 충분).
  - 미리보기 → `MathPreview`. `≤ ≥ − × ÷ √ π`는 입력 문자열에 **유니코드로 그대로** 들어가도 된다(정규화가 흡수). 키패드의 `≤` 키는 `≤`를 넣는다(`<=`로 치환하지 않음 — 입력창에도 그대로 보이게).
  - 키패드는 **모든 입력형(number·fraction·expression)에 표시**(지금은 expression에서 숨김). 노트북 사용자가 거슬리면 접을 수 있게 "키패드 접기" 토글(localStorage `learn.keypad.collapsed`).
- `Keypad` 페이지 3개: **숫자**(`7 8 9 ⌫ / 4 5 6 − / 1 2 3 / / 0 . ( )`), **기호**(`x ( ) ^ / √ π ≤ ≥ / < > = × / | | ⌫ `), **함수**(`log( ln( sqrt( root( / sin( cos( tan( |x| / ° ⌫`). `x` 키는 문항 `variable`이 있으면 그 글자. 페이지 탭 라벨 "숫자 · 기호 · 함수". `relation_required`가 아니고 `answer_type`이 `number|fraction`이면 기호 페이지에서 `< > ≤ ≥ =`는 숨김(답에 관계식이 올 일이 없으므로).
  - 함수 키는 `sqrt(` 처럼 **여는 괄호까지** 넣고 커서를 괄호 안에 둔다. `|x|`는 `||`를 넣고 커서를 가운데.
- `StepInput`: 각 줄 아래에 작은 `MathPreview`(캡션 없이, 성공 렌더만; 실패 시 아무것도 안 그림). 줄 입력도 같은 키패드를 공유(포커스된 입력이 줄이면 그 줄에 들어가게 — 현행 `insert` 로직을 "현재 포커스 입력"으로 일반화).
- 제출 가능 조건: 비어 있지 않으면 제출 가능(현행). 미지원 기호 상태여도 제출은 막지 않는다(서버가 `invalid_math`로 돌려주고 피드백에 같은 문구).

## M-5 적용 화면 통일

- `FeedbackPanel` "입력: …" → `MathPreview` 성공 렌더(실패 시 원문). 단계 피드백 "풀이 n번째 줄…"의 줄 내용도 동일.
- 폰 패드 `PadClient`: `AnswerInput` 교체로 자동 반영 + 키패드 3페이지. 패드는 키패드 접기 토글 없음(항상 펼침).
- 코치: 시도 타임라인 "입력:", `AttemptSteps` 각 줄 → 서버에서 `formatMath` 로 LaTeX 생성 후 `renderMathMarkdown`. 원문은 `title` 속성으로 유지.
- 문구: 피드백 `relation_required` → "부등호를 포함해 x ≤ … 형태로 적어 주세요"(현행 유지), `invalid_math` → "아직 지원하지 않는 기호가 있어요. 입력 도움말을 확인해 주세요", 새 `numeric_domain`(pending_review) → "코치가 확인한 뒤 알려드릴게요"(기존 `coach_required` 문구 재사용).

## M-6 문서·타입

- `docs/spec-learn-ui-v1.md`에 "입력 문법·미리보기" 절 추가(지원 기호 표, 미지원 목록, 보이는 식 원칙).
- `lib/learn/types.ts`·`StudentItem` DTO는 변경 없음(`relation_required`, `variable`은 키패드·placeholder 결정에 계속 사용). `answer_spec`은 2026-10-29 대표 승인 예외로 `number.value`·`fraction.value`의 기존 유리수 검증을 유지하고 변수 없는 유한 상수식 검증만 추가한다. 값의 저장 형식은 문자열 그대로다.
- 성능: `toLatex`는 입력 글자마다 호출 — 600토큰 상한 그대로, 재귀 깊이 40 그대로.

---

## 검수 체크리스트(Claude)

1. 기존 521 테스트 무수정 통과, 새 테스트 추가분 통과, tsc·build.
2. 운영에서: `5/6` → 세로 분수, `1/2x` → ½x, `x<=-7` 한 칸 입력 후 정답, `-7`만 입력 시 부등호 안내, `∫x` 입력 시 즉시 안내, 키패드 3페이지, 폰 패드 동일, 코치 타임라인 렌더.
3. 03-1 `-12x+21`, 04-x 분수 문항, 05-x 방정식(`x=8`과 `8`), 06-x 부등식 — 진단 1회 전체 통과.
