# 러닝 스튜디오 v2 — 음성 싱크의 구조적 해결, 영상형 자막, 등축 그래프, 칠판 지시 요소 (LS2-0 ~ LS2-7)

- 작성일: 2026-10-30
- 대상: Codex(`nobase` 레포, main `65ab8d4` 이후)
- 브랜치: **`feat/learning-studio-v2`**. 항목당 커밋 1개, 각 커밋 tsc·vitest·build 통과.
- DB: 마이그레이션 **파일 1개**(062: `learn_lesson_audio.alignment jsonb` 추가, 음성 파일 재사용 인덱스) — 파일만, 적용은 Claude.
- 참조: `docs/spec-learning-studio-v1.md`(구조·액션 엔진은 그대로), `docs/learning-studio-reference.png`.

> 결정 기록(2026-10-30, 대표): (1) 재생 조작 UI와 자막 UI를 **분리**한다. (2) 자막은 **음성에 맞춰 영상 자막처럼** 나온다. (3) 그래프는 **x·y 같은 축척**(1칸 = 같은 픽셀). (4) 시각 임팩트와 음성 싱크가 안 맞는 문제는 **구조적으로** 해결한다. (5) 실제 칠판 필기를 기반으로 시각 요소를 늘린다 — 우선 **특정 점·영역을 가리키는 지시 요소**, 잠깐 나타났다 사라지는 방식.

---

## 0. 문제의 뿌리와 해결 구조

**왜 안 맞았나.** 액션 시각(`at_ms`)을 작성자가 글자 수로 **추정**해 적었고, 음성은 v4가 지시문·호흡에 따라 길이가 매번 달라진다. 추정과 실제가 어긋나면 그림이 말보다 앞서거나 늦는다. 사람이 귀로 맞춰도 대본을 고치면 다시 틀어진다.

**해결: 시각을 "시간"이 아니라 "말"에 묶는다.**
1. 음성 생성 시 ElevenLabs **`/with-timestamps`** 엔드포인트로 **글자 단위 정렬(alignment)** 을 함께 받아 저장한다(문장마다 각 글자의 시작·끝 ms).
2. 액션은 `at_ms` 대신 **대본 속 앵커**에 붙인다: `at: "@파란"` (그 단어가 발화되는 순간), `at: "@파란+300"`(300ms 뒤), `at: "@end-500"`, `at: "@start"`. 작성자는 "파란 그래프는"이라고 말할 때 파란 곡선을 켠다 — 숫자를 셀 필요가 없다.
3. 재생 시 앵커 → alignment → 절대 ms로 **해석**(순수 함수). 대본을 고쳐 재생성해도 앵커는 그대로 유효하다. 기존 `at_ms`는 계속 허용(폴백).
4. 자막도 같은 alignment로 **단어 단위 하이라이트**(영상 자막·노래방 방식) → 자막·음성·그림이 한 소스에서 나온다.

부수 효과: 음성 길이(`duration_ms`)가 생성 시 확정되어 타임라인 길이 추정이 사라진다.

---

## LS2-0 음성 정렬 저장 (`lib/learn/lessons/audio.ts`, 마이그레이션 062 파일)

- `requestSpeech` → `POST /v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128` (응답 JSON: `audio_base64`, `alignment.characters[]`, `alignment.character_start_times_seconds[]`, `character_end_times_seconds[]`). 디코드해 mp3 저장, alignment는 압축해 저장: `{chars:string, start:number[] /*ms*/, end:number[]}`(지시문 `[ … ]` 글자는 ElevenLabs가 발화하지 않으므로 응답에 포함되지 않음 — 그대로 저장).
- 062: `alter table learn_lesson_audio add column alignment jsonb;` + `create index on learn_lesson_audio (lesson_id, text_hash);`(아래 재사용용). `duration_ms`는 alignment 마지막 end로 채운다.
- **음성 재사용**: 생성 전 같은 `lesson_id`의 **다른 버전**에 같은 `text_hash` 행이 있으면 호출하지 않고 그 행의 `path`·`alignment`·`duration_ms`를 **복사**해 새 버전 행으로 저장(스토리지 복사 없이 경로 공유). 재생 경로 검증(`path.startsWith(id/version/)`)을 "`id/` 로 시작"으로 완화. 지난 v2 재생성 같은 낭비를 막는다.
- 배치: 실패 문장은 **건너뛰고 계속**(실패 목록 누적 표시), 타임아웃 15→25초, 총 예산 45초 유지. 끝나면 "실패 N개 다시 시도" 버튼.
- 기존 v1·v2 행(alignment null)은 그대로 재생되고 앵커 액션은 글자 수 비례 **선형 추정**으로 폴백(관리자 화면에 "정렬 없음" 배지, "정렬 다시 받기" 버튼 = 재생성).

## LS2-1 앵커 해석 (`lib/learn/lessons/anchors.ts`, 순수 함수 + 테스트)

```ts
type At = number | `@${string}`;      // 숫자면 기존 at_ms
// 문법: "@start" | "@end" | "@<텍스트>" | "@<텍스트>#2"(두 번째 등장) | 위 각각에 "+300" / "-500"
resolveAt(at: At, sentence: Sentence, alignment: Alignment|null, fallbackDurationMs: number): number
```
- `@<텍스트>`는 **tts 대본**(지시문 제거본)에서 찾는다. 공백 무시 비교. 못 찾으면 자막 `text`에서 찾아 비율로 환산. 그래도 없으면 경고 + 0.
- alignment 없을 때: 텍스트 위치 비율 × duration(선형 추정).
- `stageStateAt`는 액션 정렬 전에 `resolveAt`으로 모든 `at`를 ms로 바꾼다. 이미 있는 테스트는 숫자 `at_ms`로 통과해야 한다.
- `lesson:check`: 앵커 텍스트가 대본에 존재하는지 검증(없으면 실패).

## LS2-2 자막 UI 분리 + 영상형 자막 (`components/studio/Caption.tsx`, `Transport.tsx`)

- **플레이어 바(Transport)**: 무대 **아래 가장자리**에 얇은 바 하나 — 재생/일시정지, 스크럽 가능한 진행 막대(파형은 선택 옵션으로 축소), `00:23 / 00:35`, 속도, 자막 켜기/끄기. 높이 56px, 자막 텍스트는 여기 없음.
- **자막(Caption)**: 무대 **위에 오버레이**, 하단 중앙, 영상 자막 규격 — 최대 2줄, 글자 20~24px, 반투명 어두운 배경, 양옆 여백. 문장 전체를 미리 보여주지 않고 **현재 문장만**; 단어 단위로 **발화 진행에 따라 밝아짐**(alignment 기반; 없으면 선형). `**강조**`는 accent 색 유지. 수식은 인라인 KaTeX(LS-8 규칙).
- worked 레슨 역할 배지(머릿속/종이에)는 자막 왼쪽 위 작은 라벨로.
- 자막 끄면 Transport 바의 진행 막대에만 의존. 집중 모드에서는 Transport를 2초 무입력 시 숨기고 마우스 이동·탭에 다시 표시(영상 플레이어 관례).
- 모바일(<768): 자막은 무대 바로 아래 고정 2줄, Transport는 화면 하단.

## LS2-3 등축 그래프 (`StandardGraph` studio variant)

- **축척 고정**: 1단위 = x·y 같은 픽셀. 무대 박스 크기와 `camera.x` 범위로 px/단위를 정하고 **y 범위는 자동 파생**(중심 `camera.cy` 기준). 스키마: `graph.x`는 유지, `graph.y`는 **중심값 또는 생략**으로 해석(`y:[a,b]`가 오면 중심 (a+b)/2만 사용, 경고 없이 호환). 새 필드 `aspect: 'equal'|'free'` 기본 `equal`.
- 눈금 간격 자동: 1, 2, 5, 10… 중 눈금 사이 ≥ 36px 되는 가장 작은 값. 격자는 눈금과 일치.
- 포물선이 위로 잘려 나가는 것은 **정상**(칠판에서도 그렇다). 카메라 액션 `camera`는 `{cx, cy, width}`로 단순화(기존 `x,y` 형태도 받아 변환).
- 글로우 강화(레퍼런스 대비 약했음): 곡선 뒤 blur 6px 40% + 2px 본선. 점은 흰 테두리 2px + 라벨 배경 칩.

## LS2-4 칠판 레이어 — 지시 요소 (`lib/learn/lessons/chalk.ts`, `components/studio/ChalkLayer.tsx`)

새 액션 묶음. 모두 **그래프 좌표**(또는 무대 요소 target) 기준, **기본 수명 `ttl_ms: 2500`** 후 페이드아웃(지속하려면 `ttl_ms: 0`). 손으로 그린 느낌(약간의 흔들림·둥근 끝, 1~2px 흔들린 경로; `prefers-reduced-motion`이면 흔들림 없이 즉시).

| 액션 | 뜻 | 필드 |
|---|---|---|
| `pointer` | 한 점을 가리킴 (작은 화살촉 + 링 1회 펄스) | `at:{x,y}` 또는 `target:'point:1'/'step:3'/'node:2'`, `ttl_ms` |
| `circle` | 영역을 둥글게 두름 (분필 타원, 그려지는 애니메이션 400ms) | `at:{x,y}`, `rx`, `ry`, `ttl_ms` |
| `underline` | 무대 요소 밑줄 (수식 줄·표 셀·사슬 노드) | `target`, `ttl_ms` |
| `arrow` | 두 점/요소 사이 화살표 (그려지는 애니메이션) | `from:{x,y}|target`, `to:{x,y}|target`, `label?`, `ttl_ms` |
| `bracket` | 구간 표시(x축 또는 y축 위 중괄호 + 라벨) | `axis:'x'|'y'`, `from`, `to`, `label?`, `ttl_ms` |
| `shade` | 영역 빗금/반투명 채움: 곡선 위/아래, 두 x 사이 | `region:'above:fn:0'|'below:fn:0'|'between:fn:0,fn:1'`, `x?:[a,b]`, `ttl_ms` |
| `handwrite` | 손글씨처럼 써지는 짧은 메모(수식 허용) | `at:{x,y}`, `tex|text`, `ttl_ms` |
| `flash` | 요소를 한 번 번쩍 (기존 pulse의 칠판판, 색 지정) | `target`, `ttl_ms` |

- 모두 `stageStateAt`의 상태로 계산(시각 t에서 살아 있는 지시 요소 목록 + 각자의 진행률) → 스크럽에도 정확. 색은 `--studio-chalk`(따뜻한 흰색)와 `--studio-accent`.
- `pointer`·`circle`은 **한 문장에 2개까지**가 권장(검증 경고, 차단은 아님).
- 기존 `band`는 `shade region:'above:axis'`로 매핑(호환 유지).

## LS2-5 작성 도움: 대본에 인라인 마커 (선택)

- `tts`에 `⟨p1⟩` 같은 마커를 쓰면 ElevenLabs로 보내기 전에 제거하고, 제거 위치의 글자 인덱스를 alignment로 ms로 바꿔 `@p1` 앵커로 쓸 수 있게 한다(같은 단어가 여러 번 나올 때 유용). 마커 문법 `⟨이름⟩`, 이름은 `[a-z0-9]+`.
- `lesson:check`에 `--timeline` 옵션: 문장별 예상 길이·앵커 해석 결과를 표로 출력(정렬 있으면 실제, 없으면 추정 표시).

## LS2-6 콘텐츠 반영 (Claude 담당, 병행)
- `rm-11` v3·`rm-11-w1` v3: 모든 `at_ms`를 앵커로 교체(예: s1-4 `"@파란"`, `"@청록"`, `"@주황"`), 칠판 지시 요소 추가(교점에 `pointer`, "x축 위에 떠서"에 `shade above`, 유도 핵심 줄에 `underline`·`circle`, 판별식 루트 안에 `circle` + `handwrite "D"`), 그래프 `aspect:'equal'`에 맞춰 x 범위 조정. 음성은 **재사용**되어야 한다(LS2-0) — 재생성 0건이 검수 기준.

## LS2-7 문서
- `docs/spec-learning-studio-v1.md`에 "v2에서 바뀐 것" 절, `lib/learn/README.md` 앵커·칠판 액션 표, `database/README.md` 062 줄(적용자 비움).

---

## 검수 체크리스트(Claude)
1. tsc·테스트·build. 062 적용. v3 seed 시 음성 재생성 0건(재사용) 확인.
2. 재생: 자막이 단어 단위로 밝아지며 음성과 맞음(눈으로 3장면). "파란 그래프는"에서 파란 곡선 강조가 **정확히 그 단어에** 걸림. 1.5×·스크럽에서도 동일.
3. 그래프 1칸 가로·세로 픽셀 동일(스크린샷 자로 확인), 포물선 상단 잘림 정상, 카메라 액션 동작.
4. pointer·circle·shade·underline·arrow·handwrite 각 1회 이상 등장 후 2.5초 뒤 사라짐; reduced-motion에서 즉시 표시.
5. Transport 바와 자막 오버레이 분리, 집중 모드에서 바 자동 숨김, 390px 레이아웃.
