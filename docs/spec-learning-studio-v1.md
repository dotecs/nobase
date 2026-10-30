# 러닝 스튜디오 v1 — 한 장면 = 한 화면, 설명에 따라 움직이는 무대 (LS-0 ~ LS-9)

- 작성일: 2026-10-30
- 대상: Codex(`nobase` 레포, main `6ebbce3` 이후)
- 브랜치: **`feat/learning-studio`**. 항목당 커밋 1개(LS-0 → LS-9), 각 커밋 tsc·vitest·build 통과.
- **레퍼런스 이미지: `docs/learning-studio-reference.png`** — 대표가 원하는 완성 모습. 구현 전에 반드시 열어 볼 것. 레이아웃·톤·밀도·요소 배치를 이 이미지에 맞춘다(색은 토큰으로, 글꼴은 Pretendard).
- DB 변경: 없음(레슨 JSON 스키마만 확장, 기존 레슨은 그대로 유효). 환경변수 없음.
- 참조: `docs/spec-learn-lessons-v1.md`(V-0~V-7, 데이터·음성·추적은 그대로 재사용), `docs/spec-learn-ui-v1.md`.

> 결정 기록(2026-10-30, 대표): 레슨 환경의 이름은 **러닝 스튜디오(Learning Studio)**. 지금의 "세로로 쌓인 장면 카드" 뷰어가 아니라 **한 장면이 화면 전체를 쓰는 플레이어**다. 그리고 **설명(음성·자막)에 맞춰 무대가 움직여야 한다** — "a가 양수이면 그래프는 위로 열려요"라고 말하는 동안 그래프가 실제로 변한다.

---

## 0. 한 장 요약

| 항목 | 결정 |
|---|---|
| 화면 | 전체 뷰포트 1장면. 세 구역: **왼쪽 패널**(소제목·큰 제목(강조어 파랑)·설명 한 줄·조작 카드), **무대**(가운데·오른쪽, 큰 표준 그래프 등), **하단 플레이어 바**(재생/일시정지·현재 자막·파형·시간·속도). 맨 아래 **이전/다음 + 점 진행(02 / 06)**, 우상단 **집중 모드**. |
| 테마 | 스튜디오는 **다크 기본**(레퍼런스). 라이트도 토큰으로 지원하되 기본값은 다크. 기존 learn 토큰 위에 `--studio-*` 토큰 층을 얹는다. |
| 동기화 | 장면의 음성은 **문장 파일을 이어 붙인 하나의 타임라인**(03:10처럼 장면 총 길이 표시). 문장마다 `cue.actions[]`가 있고, 플레이어가 문장 시작 시각(또는 `at_ms` 오프셋)에 액션을 실행 → 무대가 움직인다. |
| 애니메이션 모델 | 액션 = `{type, target, from?, to?, at_ms?, duration_ms?, easing?}`. 종류: `param`(슬라이더 값 보간), `draw`(곡선 그리기), `point`(점 등장·라벨), `highlight`(요소 강조/나머지 흐림), `reveal`(단계·노드·행 등장), `camera`(축 범위 이동), `label`(수식·텍스트 등장), `pulse`(깜빡임 1회), `clear`. 모두 **순수 상태 보간**(시간 t → 무대 상태)이라 되감기·속도 변경·스크럽에 그대로 따라온다. |
| 자막 | 현재 문장만 플레이어 바에 1줄. 문장 안 `**강조어**`는 파랑(레퍼런스의 "a가 양수이면"). worked 레슨은 역할 배지(머릿속/종이에) 왼쪽에 작게. |
| 조작 카드 | 슬라이더 무대: 수식 `y=ax^2` + 현재 값 `a = 1` + 슬라이더(범위 라벨). 재생 중엔 액션이 값을 움직이고, 학생이 잡으면 **재생 일시정지** 후 자유 탐구. |
| 영상화 준비 | 스튜디오는 고정 **16:9 프레임**(최대 1600×900, 비율 유지 스케일)으로도 렌더 가능(`?frame=16x9`). 이후 헤드리스 녹화는 다음 묶음. |
| 범위 밖 | 영상 파일 내보내기, 손글씨, 레슨 저작 UI, 모바일 세로 전용 레이아웃의 완성도(동작은 해야 함). |

---

## LS-0 레슨 JSON 확장 (`lib/learn/lessons/schema.ts`) — 기존 레슨 호환

```ts
Scene += {
  headline?: { eyebrow?: string; title: string; accent?: string; subtitle?: string };  // 왼쪽 패널. accent는 title 안의 강조어(부분 문자열)
  layout?: 'stage-right' | 'stage-full' | 'split';   // 기본 stage-right(레퍼런스). steps·chain은 split 기본
}
Sentence.cue += { actions?: Action[] }           // 기존 cue.step/node/row/highlight는 Action으로 자동 변환(호환)
Action =
 | { type:'param'; name:string; to:number; from?:number; at_ms?:number; duration_ms?:number; easing?:'linear'|'ease'|'ease-in-out' }
 | { type:'draw'; target:`fn:${number}`; at_ms?:number; duration_ms?:number }          // 곡선을 왼쪽→오른쪽으로 그림
 | { type:'point'; x:number; y?:number; on?:`fn:${number}`; label?:string; c?:'c1'|'c2'|'c3'; at_ms?:number }  // y 생략+on → 함수값
 | { type:'highlight'; target:string|string[]; dim_others?:boolean; at_ms?:number }    // 'fn:0' | 'point:1' | 'step:3' | 'node:2' | 'row:0' | 'axis:x' | 'band'
 | { type:'reveal'; target:'step'|'node'|'row'; index:number; at_ms?:number }
 | { type:'camera'; x:[number,number]; y:[number,number]; at_ms?:number; duration_ms?:number }
 | { type:'label'; text:string; tex?:string; at:{x:number;y:number}; anchor?:'start'|'middle'|'end'; at_ms?:number }
 | { type:'band'; y:[number,number]|null; at_ms?:number }                              // 음영 켜기/끄기
 | { type:'pulse'; target:string; at_ms?:number }
 | { type:'clear'; what?:'labels'|'points'|'highlight'|'all'; at_ms?:number }
```
- `at_ms`는 **문장 시작 기준**, 기본 0. `duration_ms` 기본 800. 액션은 문장 안에서 순서대로 적용되며, 장면 상태는 **문장 0부터 현재 시각까지 모든 액션을 재생한 결과**(순수 함수 `stageStateAt(scene, t_ms)`)로 계산한다 → 스크럽·되감기·속도 변경이 공짜.
- `graph`/`slider` 무대에 `initial?: { hidden_fns?: number[]; hidden_points?: boolean }` 추가 — 처음엔 숨겼다가 `draw`/`point`로 등장시키기 위해.
- 검증: 액션의 target 인덱스가 무대 범위 안인지, `param.name`이 슬라이더 파라미터와 같은지, `at_ms`가 음수 아닌지. `lesson:check`에 포함.
- 기존 `cue.step/node/row/highlight`는 로더에서 `reveal`/`highlight` 액션으로 변환해 그대로 동작.

## LS-1 스튜디오 토큰·셸 (`components/studio/StudioShell.tsx`, `studio.module.css`, `styles/globals.css`)
- `--studio-bg`(#0b1220 계열 네이비), `--studio-panel`(반투명 카드), `--studio-grid`(격자), `--studio-accent`(brand 400), `--studio-glow`(accent 40%), `--studio-text`/`-muted`. 다크가 기본이고 `[data-theme=light]`에서는 밝은 네이비 톤. 기존 `--color-*` 토큰을 참조해 정의(하드코드 금지).
- 레이아웃(≥1024px): `grid-template-columns: minmax(300px, 1fr) minmax(0, 2fr)`; 상단 바(로고 좌, 집중 모드 우), 본문(왼쪽 패널 / 무대), 하단 플레이어 바(무대 하단에 떠 있음, 레퍼런스처럼), 최하단 내비(이전 · 점+번호 · 다음). 높이는 `100dvh` 안에 **스크롤 없이** 들어가야 한다.
- 768~1023px: 왼쪽 패널이 무대 위로(세로 스택), 조작 카드는 접이식. <768px: 무대 → 자막 바 → 조작 카드 순 세로, 내비는 하단 고정. 동작 보장, 완성도는 다음.
- 배경에 희미한 격자(레퍼런스) — CSS `background-image` 그라디언트, 이미지 없음.
- 집중 모드: 상단 바·내비 숨김 + `requestFullscreen`(실패 허용). ESC로 복귀.

## LS-2 표준 그래프 스튜디오 변형 (`components/learn/StandardGraph.tsx` 확장)
- `variant="studio"`: 어두운 배경, 격자 점선, 축 흰색·화살표·`x`/`y` 이탤릭 라벨, 눈금 숫자 음수 포함(레퍼런스), **곡선 글로우**(stroke 뒤에 blur 필터 한 겹, `prefers-reduced-motion`에서도 유지 — 정적 효과), 점은 흰 테두리 + 라벨 `(2, 4)` 텍스트, 반응형 viewBox(가로 폭에 맞춰 1200×750까지).
- props에 **상태 입력**: `state: { params:Record<string,number>; drawProgress:Record<string,number /*0..1*/>; visibleFns:number[]; points:StagePoint[]; highlight:string[]|null; camera:{x,y}; labels:Label[]; band:[number,number]|null }` — LS-0의 `stageStateAt` 출력 그대로 받는다. 그래프는 상태 → 그림만(애니메이션 로직 없음).
- `drawProgress`: path를 `stroke-dasharray/dashoffset`으로 진행률만큼 노출. `camera` 변화는 상태 보간으로 들어오므로 그래프는 매 프레임 다시 그릴 뿐.
- 성능: 400점 샘플링 유지, `requestAnimationFrame` 1개, 상태 변화 없으면 프레임 건너뜀.

## LS-3 타임라인 플레이어 (`components/studio/StudioPlayer.tsx`, `lib/learn/lessons/timeline.ts`)
- 장면 타임라인 = 문장 음성 길이 누적(`learn_lesson_audio.duration_ms` 사용; 없으면 로드 시 `audio.duration`으로 채우고 서버에 기록하는 액션 1개 추가). 음성 없는 문장은 글자 수 비례 추정.
- 플레이어 바: 큰 재생/일시정지(원형, 레퍼런스), 현재 자막 1줄(`**강조**` 파랑, 수식은 인라인 KaTeX — **줄바꿈 금지**, 기존 버그 LS-8에서 수정), **파형**(문장별 음성 파형을 서버가 저장하지 않으므로 클라이언트에서 디코드해 64막대로 축약, 캐시; 디코드 실패 시 균일 막대), 시간 `01:24 / 03:10`, 속도 메뉴(0.8/1.0/1.25/1.5 — `playbackRate`).
- 파형 클릭 = 스크럽. 스크럽·속도 변경 시 `stageStateAt(scene, t)`로 무대 즉시 재계산.
- 장면 끝나면 자동으로 다음 장면? **아니오** — 끝에서 멈추고 "다음 내용" 버튼이 강조(펄스 1회). 학생이 넘긴다(기조: 그냥 틀어 놓기 방지).
- 키보드: Space 재생/정지, ←/→ 장면 이동, ↑/↓ 속도.
- 이벤트: 기존 `sentence`/`scene`/`complete` 기록 유지 + `scrub`은 기록하지 않음.

## LS-4 장면 내비 (`components/studio/SceneNav.tsx`)
- 하단: `이전 내용` · `02 / 06` + 점(현재 채움) · `다음 내용`(primary). 점 클릭으로 이동. `location.hash = sceneId` 동기화(공유 링크·개념 카드의 장면 링크가 여기로 들어옴).
- 장면 전환: 무대 페이드 200ms(reduced-motion이면 즉시). 전환 시 이전 장면 오디오 정지.
- 마지막 장면 다음 = 완료 화면(요약: 본 장면 수·걸린 시간·막힌 개념이 있으면 표시 → "연습 문제로" / "학습 홈").

## LS-5 무대별 레이아웃 (`components/studio/stages/*`)
- **graph / slider**(레퍼런스): 왼쪽 패널 하단에 **조작 카드** — 수식(KaTeX 크게), `a = 1` + 숫자 입력, 슬라이더(min·0·max 라벨). slider 무대만 조작 가능, graph 무대는 카드 대신 범례. 재생 중 `param` 액션이 값을 움직이면 슬라이더 손잡이도 같이 움직인다. 학생이 슬라이더를 잡으면 일시정지, 놓고 재생하면 **현재 문장 처음부터**.
- **steps**(유도·풀이): `split` — 왼쪽 패널에 제목만, 무대에 줄 목록. `reveal`로 한 줄씩 등장(아래에서 위로 슬라이드 + 페이드 300ms), 현재 줄 강조·이전 줄 보통·미래 줄 **숨김**(지금처럼 다 보이면 안 됨). 근거 칩·개념 카드·모르겠어요는 기존 동작 유지, 현재 줄에만 표시.
- **chain**(번역 사슬): 노드가 `reveal`로 하나씩, 화살표는 노드 등장 뒤 그려짐(stroke-dash). 가로 공간이 되면 가로 흐름, 아니면 세로.
- **table**: 행 `reveal`, 현재 행 강조.
- **quiz**: 무대 중앙에 문제·보기(2열), 선택 후 정오 애니메이션(정답 보기 확장·해설 등장). "모르겠어요" → 추적 패널은 무대 오른쪽에서 슬라이드 인(페이지 점프 없음 — LS-8).
- **figure**: 중앙 정렬, 캡션 하단.
- worked 레슨: 자막 바 왼쪽에 역할 배지(머릿속 보라 / 종이에 파랑 / 설명 청록). concept는 배지 없음.

## LS-6 액션 엔진 (`lib/learn/lessons/stage-state.ts`, 순수 함수 + 테스트)
- `stageStateAt(scene, tMs, sentenceStarts:number[]): StageState` — 모든 문장의 액션을 `(문장 시작 + at_ms)` 기준 절대 시각으로 펼친 뒤, `t` 이전 액션은 완료 상태, 진행 중 액션은 `easing`으로 보간. 같은 target에 여러 액션이면 마지막 것이 이긴다.
- 기본값: 무대 정의의 `initial`과 `param.init`에서 시작.
- 테스트: `param` 보간(0.5 진행 시 중간값), `draw` 진행률, `reveal` 누적, `camera` 보간, `clear`, 스크럽(뒤로 가면 상태가 되돌아감), 호환 변환(`cue.step:3` → `reveal step 0..3`).

## LS-7 레슨 콘텐츠 업데이트 (Claude 담당, 이 묶음과 병행)
- `rm-11.json`·`rm-11-w1.json`에 `headline`과 `cue.actions`를 넣은 **v2**를 seed한다(append-only). 예: s1 — "파란 그래프는 두 번 만나고" 문장에 `highlight fn:0` + `point` 2개 등장, "청록 그래프는 한 번 스치고"에 `highlight fn:1` …; s4 슬라이더 — "c가 크면 떠오르고" 문장에 `param c: -3 → 3 (2000ms)`, "작으면 뚫고 내려갑니다"에 `param c: 3 → -3`.
- 레퍼런스 장면(이차함수 `y=ax^2`, a 슬라이더)은 22강 레슨의 한 장면으로 그대로 만든다 — 스튜디오 데모 겸.

## LS-8 기존 버그 수정(운영 검증에서 발견)
1. 자막 안 인라인 수식이 블록으로 렌더되어 줄바꿈됨 → `LessonText`에서 `$…$`는 inline(KaTeX inline, `display:inline`), `$$…$$`만 블록.
2. steps 전부 노출·강조 없음 → LS-5로 해소(미래 줄 숨김).
3. 추적 답변 후 페이지 맨 위로 점프 → `router.refresh()` 제거, 결과는 클라이언트 상태로 표시, 이벤트 기록만 서버 액션.
4. 관리자 음성 생성: "남은 문장 자동 이어서" 체크박스(한 번 클릭으로 배치 반복, 각 배치 결과 누적 표시).

## LS-9 16:9 프레임·문서
- `?frame=16x9`: 스튜디오를 1600×900 고정 비율 박스에 렌더(뷰포트 가운데, 레터박스). 녹화용. 내비·집중모드 버튼 숨김 옵션 `&chrome=0`.
- `docs/spec-learn-ui-v1.md`에 스튜디오 섹션(토큰·레이아웃·액션 요약), `lib/learn/README.md` 갱신.
- 기존 `/learn/lesson/[id]`가 스튜디오로 바뀐다(세로 카드 뷰어는 제거). 코치 화면의 레슨 링크는 그대로.

---

## 검수 체크리스트(Claude)
1. tsc·테스트·build. 기존 레슨 v1(액션 없음)이 스튜디오에서 깨지지 않음(호환 변환).
2. `rm-11` v2 운영: 레퍼런스와 같은 구조(왼쪽 패널·무대·플레이어 바·내비). s1 재생 중 문장에 맞춰 곡선 강조·점 등장, s4 재생 중 슬라이더가 스스로 움직이고 그래프가 따라감, 학생이 잡으면 일시정지.
3. 스크럽·속도 1.5×에서 무대 동기 유지. steps 줄 순차 등장. 추적 패널 슬라이드 인, 페이지 점프 없음. 인라인 수식 줄바꿈 없음.
4. 집중 모드·16:9 프레임. 1024/768/390 폭.

## v2에서 바뀐 것 (2026-10-30)

- 시간 기준은 문장 음성의 글자 정렬이다. with-timestamps 결과를 062의 alignment에 저장하고 duration_ms도 생성 시 확정한다. 같은 레슨·해시의 다른 버전 음성은 경로를 공유한다.
- at:"@단어#2+300"처럼 발화에 액션을 붙인다. 정렬 null은 선형 추정, 숫자 at_ms는 계속 지원한다. 좌표는 position:{x,y}이며 기존 좌표형 at도 호환한다.
- 56px Transport와 단어 단위 자막을 분리한다. 자막은 최대 2줄의 현재 구간만 표시하며, 집중 모드에서는 2초 무입력 시 Transport가 숨겨진다.
- 그래프는 기본 등축, y 배열은 중심만 사용한다. aspect:free와 기존 카메라 x/y도 호환하며 새 카메라는 cx/cy/width다.
- 칠판 8종의 수명·그리기·페이드는 stageStateAt으로 계산한다. 기본 2500ms, ttl_ms:0은 지속이다. 모션 감소 환경에서는 흔들림과 쓰기 애니메이션 없이 표시한다.
- ⟨p1⟩ 마커는 요청 전 제거한다. lesson:check --timeline은 DB 없이 작성 시각을 확인한다. 콘텐츠 v3·062 적용·운영 음성 검수는 Claude 담당이다.
