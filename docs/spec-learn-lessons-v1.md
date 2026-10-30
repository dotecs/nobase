# 시각 레슨 v1 — 레슨 JSON · 표준 그래프 · 음성(v4) · 근거 칩 · "모르겠어요" 추적 (V-0 ~ V-7)

- 작성일: 2026-10-30
- 대상: Codex(`nobase` 레포, main `7e118aa` 이후)
- 브랜치: **`feat/learn-lessons`**. 항목당 커밋 1개(V-0 → V-7), 각 커밋 tsc·vitest·build 통과.
- DB: 마이그레이션 **파일 2개**(060 레슨 테이블, 061 개념 노드) — Codex는 파일만 작성, 적용·README 기록은 Claude. `docs/learn-db-rules.md` 준수(DROP/DELETE 금지, 버전 append-only).
- 환경변수: `ELEVENLABS_API_KEY`(sensitive), `ELEVENLABS_VOICE_ID`(기본 `apLXiNZEMBZ7cxxBoRlE`, 대표 강의 음성 Instant Clone). Vercel 등록은 대표.
- 참조: `docs/spec-learn-ui-v1.md`(토큰·접근성·문구), `docs/spec-learn-math-input-v2.md`(수식 표시), 시제품 `docs/lesson-prototype-11.html`(이 명세와 함께 커밋되는 참고용 단일 HTML — 장면 구조·표준 그래프·근거 칩·추적 UI의 레퍼런스).

> 결정 기록(2026-10-30, 대표): (1) 설명 자료는 **브라우저 렌더**(영상 아님), 필요 시 영상화. (2) 음성은 대표 목소리 복제(Instant → 추후 Professional), 모델 **`eleven_v4`**, 대본에 `[ ]` 연출 지시문 사용. (3) 레슨은 **개념(concept)** 과 **문제풀이(worked)** 두 유형. "머릿속/종이에" 자막 구분은 **worked에서만**. (4) 수학 = 언어: 문제 상황 → 수식 "번역" 사슬을 장면 유형으로 둔다. (5) 풀이의 줄과 줄 사이 **근거 개념**을 명시하고, 학생이 "모르겠어요"를 누르면 선행 개념을 한 단계씩 되짚어 막힌 지점을 기록한다.

---

## 0. 한 장 요약

| 항목 | 결정 |
|---|---|
| 데이터 | `learn_lessons`(레슨 JSON, 버전 append-only) · `learn_lesson_audio`(문장별 음성 파일 경로·해시) · `learn_concepts`(개념 노드, 소주제보다 잘게) · `learn_concept_edges`(prerequisite) · `learn_lesson_events`(시청·근거 칩·모르겠어요 추적 기록) |
| 렌더 | `/learn/lesson/<lessonId>`: 장면(scene) 세로 배열, 장면마다 **무대(stage)** + **자막 레일(rail)**. 무대 유형: `graph`·`steps`·`chain`·`slider`·`table`·`quiz`·`figure`. 자막은 문장 단위, 음성과 동기. |
| 표준 그래프 | `StandardGraph` 컴포넌트(SVG): 축·눈금·원점 O·화살표·격자 고정 양식, 함수식/점/음영/구간 입력. 색은 토큰(`c1` 파랑, `c2` 청록, `c3` 주황). 학생·코치·레슨 모두 같은 컴포넌트. |
| 음성 | 서버 액션으로 ElevenLabs TTS(`eleven_v4`, 대표 음성) 호출 → Storage `learn-lessons/<lessonId>/<ver>/<sentenceId>.mp3` 저장, 해시로 재생성 회피. 학생은 저장 파일만 재생(실시간 호출 없음). |
| 유형 | `concept`: 자막 역할 `say` 하나. `worked`: 자막 역할 `think`(머릿속) · `write`(종이에) · `say`. |
| 근거 칩 | `steps` 무대의 각 줄에 `concept_id`(근거 개념). 칩 클릭 → 근거 설명 + 개념 카드 링크. 클릭은 이벤트로 기록. |
| 모르겠어요 | 퀴즈/줄마다 "모르겠어요" → `concept_id`의 prerequisite 사슬을 따라 **노드당 확인 질문 1개**(선택형) → 처음 "모른다"가 나온 노드를 `gap`으로 기록, 그 노드의 레슨 링크 제시. 질문 최대 5개. |
| 코치 | 학습자 페이지에 "레슨 활동" 블록: 본 레슨·소요·근거 칩 클릭·gap 목록. |
| 범위 밖 | 영상 내보내기(헤드리스 녹화) — 다음 묶음. 손글씨·펜 입력. 레슨 저작 UI(이번엔 JSON 파일을 레포에 두고 seed 스크립트로 올림). 자동 채점 연동(퀴즈 결과는 증거로 세지 않음). |

---

## V-0 데이터 (마이그레이션 파일 060·061, 적용은 Claude)

### 060 `learn_lessons`, `learn_lesson_audio`, `learn_lesson_events`
```sql
create table public.learn_lessons (
  id text not null,                 -- 'rm-11' (뿌리수학 11강) / 'rm-11-w1' (문제풀이)
  version int not null default 1,
  pack_id text not null references public.learn_packs(id),
  kind text not null check (kind in ('concept','worked')),
  title text not null,
  ability_ids text[] not null default '{}',   -- 이 레슨이 다루는 소주제
  body jsonb not null,              -- 레슨 JSON (아래 스키마)
  status text not null default 'draft' check (status in ('draft','reviewed','live','retired')),
  created_at timestamptz not null default now(),
  primary key (id, version)
);
create table public.learn_lesson_audio (
  lesson_id text not null, lesson_version int not null, sentence_id text not null,
  text_hash text not null,          -- sha256(대본 문장 + 지시문 + voice_id + model)
  path text not null,               -- storage: learn-lessons/<lesson>/<ver>/<sentence>.mp3
  duration_ms int,
  created_at timestamptz not null default now(),
  primary key (lesson_id, lesson_version, sentence_id)
);
create table public.learn_lesson_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  lesson_id text not null, lesson_version int not null,
  type text not null check (type in ('open','scene','sentence','why_click','quiz','dontknow','gap','complete')),
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.learn_lesson_events (user_id, created_at desc);
```
- RLS: `learn_lessons` select는 authenticated(status reviewed/live만 — 뷰 `learn_lessons_live` 또는 policy), 쓰기는 service_role. `learn_lesson_audio` select authenticated. `learn_lesson_events` insert/select 본인만, 코치는 service_role 경유.
- Storage 버킷 `learn-lessons`(public read 아님 — 서명 URL 10분, 또는 authenticated read 정책). 기존 `learn-evidence` 정책은 건드리지 않음.

### 061 `learn_concepts`, `learn_concept_edges`
```sql
create table public.learn_concepts (
  id text primary key,              -- 'c.quadratic-formula', 'c.discriminant-meaning'
  pack_id text not null references public.learn_packs(id),
  ability_id text references public.learn_abilities(id),  -- 소속 소주제(없을 수 있음)
  name text not null,               -- '근의 공식'
  one_line text not null,           -- 한 줄 정의
  check_question jsonb,             -- {stem_md, options:[{id,text_md}], correct:'b'} 확인 질문 1개
  lesson_id text,                   -- 이 개념을 설명하는 레슨(+ 장면 id는 body에서 찾음)
  created_at timestamptz not null default now()
);
create table public.learn_concept_edges (
  source_id text not null references public.learn_concepts(id),
  target_id text not null references public.learn_concepts(id),
  type text not null default 'prerequisite',
  primary key (source_id, target_id, type)
);
```
- 초기 노드(뿌리수학 11강 범위, seed에 포함): `c.equation`(방정식이란) → `c.quadratic-expr`(이차식) → `c.quadratic-eq`(이차방정식) → `c.equality-props`(등식의 성질) · `c.perfect-square`(완전제곱식) · `c.fraction-props`(분수의 성질) · `c.sqrt-props`(제곱근의 성질) → `c.quadratic-formula`(근의 공식) → `c.discriminant`(판별식의 정의) → `c.discriminant-meaning`(D 부호와 근의 개수) → `c.graph-xaxis`(그래프와 x축 교점 = 실근) → `c.ineq-props`(부등식의 성질). 간선은 이 순서의 prerequisite + 9·10강 노드로 확장 여지.

## V-1 레슨 JSON 스키마 (`lib/learn/lessons/schema.ts`, zod)

```ts
Lesson = {
  id: string; kind: 'concept'|'worked'; title: string; pack_id: string; ability_ids: string[];
  intro?: string;                              // 한 줄
  scenes: Scene[];
}
Scene = {
  id: string; title: string;
  tag: 'translate'|'derive'|'check'|'explore'|'define'|'example';   // 배지 문구: 번역·유도·확인·탐구·정의·예시
  stage: Stage;
  narration: Sentence[];                       // 순서대로 재생
}
Sentence = {
  id: string;                                  // 's2-3' — 음성 파일 키
  role: 'say'|'think'|'write';                 // concept 레슨은 'say'만 허용(스키마에서 refine)
  text: string;                                // 화면 자막(수식은 $…$ 허용, MathPreview로 렌더)
  tts?: string;                                // 음성용 대본. 없으면 text에서 생성(아래 규칙). [ ] 지시문 포함 가능
  cue?: { step?: number; node?: number; row?: number; highlight?: string };  // 이 문장에서 무대의 어느 요소를 켤지
}
Stage =
 | { type:'graph'; x:[number,number]; y:[number,number]; fns:{expr:string; c:'c1'|'c2'|'c3'; label?:string}[]; points?:{x:number;y:number;c:string;label?:string}[]; band?:[number,number]; aria:string }
 | { type:'steps'; steps:{ tex:string; concept_id?:string; why?:string; think?:string }[] }   // worked: think는 '머릿속' 문장
 | { type:'chain'; nodes:{ tex?:string; text:string }[] }
 | { type:'slider'; expr:string; param:{ name:string; min:number; max:number; step:number; init:number }; x:[number,number]; y:[number,number]; verdict:'discriminant'|'none' }
 | { type:'table'; columns:string[]; rows:{ cells:string[]; tone?:'pos'|'zero'|'neg' }[] }
 | { type:'quiz'; stem_md:string; options:{id:string;text_md:string}[]; correct:string; explain:string; trace_concept_id:string }
 | { type:'figure'; svg?:string; image_path?:string; caption:string }
```
- `graph.fns[].expr`는 **M-0 파서 문법**(`x^2+2x-3`, `sqrt(x)`)으로 쓰고 `numeric()`으로 평가 → 외부 수식 엔진 없음. 파싱 실패는 스키마 검증 단계에서 거부.
- **음성 대본 규칙**(`tts` 없을 때 자동 생성, `lib/learn/lessons/tts-script.ts`): `$…$` 수식을 **읽기 문자열**로 치환 — `b^2-4ac` → "비 제곱 마이너스 사 에이 씨", `\frac{a}{b}` → "비 분의 에이", `\sqrt{}` → "루트", `\le` → "작거나 같다", `x=-7` → "엑스는 마이너스 칠", 숫자는 한국어 수사. 치환표는 파일에 두고 테스트. 역할별 기본 지시문: `say` 없음, `think` `[slower, thinking aloud]`, `write` `[clear, deliberate]`. 작성자가 `tts`를 직접 쓰면 그대로 사용.
- 검증 CLI: `npm run lesson:check <file>` — 스키마 + 수식 파싱 + concept_id 존재 + 문장 id 유일성.

## V-2 표준 그래프 (`components/learn/StandardGraph.tsx`)
- 시제품 `stdGraph()`를 React로. viewBox 640×400, 여백 고정, 격자·축·화살표·원점 O·정수 눈금, 곡선은 400점 샘플링(치역 밖은 끊음), 점·음영(`band`)·범례. 색·글꼴은 토큰(`--color-primary`, `--color-secondary-500`, `--color-warning`), 다크 대응.
- props 그대로가 `Stage.graph`. 추가: `highlight?: string`(문장 cue로 특정 fn/point 강조 — 나머지 흐리게).
- 코치·학생 어디서든 재사용 가능하게 순수 컴포넌트(상태 없음). 테스트: 스케일 함수(x→px) 단위 테스트, 치역 밖 끊김.

## V-3 레슨 뷰어 (`app/(main)/learn/lesson/[id]/page.tsx`, `components/learn/lesson/*`)
- 접근: `requireLearner`. 상단 FocusShell(톤 `lesson`: 보라 계열 배지 "개념" / "문제풀이"), 재생 컨트롤(처음부터 / 멈춤 / 음성 켜기·끄기 / 속도 1.0·1.25).
- 장면 카드 = 무대 + 자막 레일(시제품 레이아웃). 자막 역할 라벨: concept는 라벨 없음, worked는 `머릿속`(보라)·`종이에`(파랑)·`설명`(청록).
- 재생: 문장 순서대로 `<audio>` 재생, 현재 문장 하이라이트·스크롤, `cue`로 무대 요소 켬(steps 줄 등장, chain 노드, graph highlight). 음성 파일 없으면 글자 수 비례 타이머로 진행(자막만). 음성은 **사용자 클릭 후**에만 시작.
- `steps` 무대: 줄은 cue 또는 스크롤 진입 시 순차 등장. 근거 칩(`why`) 클릭 → 근거 설명 + 개념 카드 링크(`/learn/concept/<id>`, V-5) + `why_click` 이벤트.
- `quiz`: 선택 → 정오 표시 + 해설. "모르겠어요 — 어디서 막혔는지 찾기" → V-4.
- 이벤트 기록(`learn_lesson_events`): open, scene(진입), sentence(10문장마다 배치), why_click, quiz, dontknow, gap, complete. 서버 액션, 디바운스.
- 홈(`/learn`)에 "오늘의 레슨" 카드: 추천 소주제의 `lesson_id`가 있으면 학습 세션 카드 **위에** 표시("먼저 10분 레슨 → 연습"). 레슨 complete 이벤트가 있으면 "다시 보기"로 격하.

## V-4 "모르겠어요" 추적 (`lib/learn/lessons/trace.ts` 순수 함수 + UI)
- 입력: `trace_concept_id`(또는 steps 줄의 concept_id). 질문 순서 = 그 노드부터 prerequisite를 **깊이 우선, 가까운 것부터** 최대 5개. 각 노드의 `check_question`을 선택형으로 제시(없으면 "~을 설명할 수 있나요?" 네/모르겠어요).
- 정답/네 → 다음(더 앞선) 노드. 오답/모르겠어요 → **gap = 그 노드**, 중단. 끝까지 통과 → gap 없음, "아는 것을 연결하는 연습" 안내.
- 기록: `dontknow`(시작), `gap`({concept_id, path:[...]}) 이벤트. gap 노드의 `lesson_id`가 있으면 "이 개념 레슨 보기" 버튼.
- 테스트: 사슬 A→B→C→D에서 C만 모르면 질문 순서 D,C에서 gap=C; 모두 알면 gap 없음; 최대 5개 제한.

## V-5 개념 카드 (`app/(main)/learn/concept/[id]/page.tsx`)
- `learn_concepts` 한 노드: 이름, 한 줄 정의, 이 개념을 설명하는 레슨의 **해당 장면으로 바로 가는 링크**(`/learn/lesson/<id>#<sceneId>`), 선행 개념 칩(위로), 이 개념을 쓰는 개념 칩(아래로). 확인 질문 1개(있으면).
- 작고 빠르게 — 레슨 안에서 모달로도 열림(`<dialog>`), 같은 컴포넌트.

## V-6 음성 생성 파이프라인 (`lib/learn/lessons/audio.ts`, 관리자 액션)
- 관리자 페이지 `/admin/learn/lessons`: 레슨 목록(id·버전·kind·status·문장 수·음성 생성됨/미생성 수). 버튼 **"음성 생성"**: 레슨의 모든 문장에 대해 `text_hash`가 같은 행이 있으면 건너뛰고, 없으면 ElevenLabs `POST /v1/text-to-speech/{voice_id}` (`model_id: eleven_v4`, `output_format: mp3_44100_128`, `voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0, use_speaker_boost: true }`) 호출 → Storage 저장 → 행 upsert. 문장당 순차, 실패는 건너뛰고 보고. 한 번에 최대 60문장(타임아웃 방지), 반복 클릭으로 이어서.
- 비용 표시: 생성 전 "N문장 · 약 M자 · 예상 크레딧" 확인 단계. 대본 변경 시 해시가 달라져 그 문장만 재생성.
- 서버에서만 호출(`ELEVENLABS_API_KEY`), 키는 로그·응답에 절대 노출 금지.
- `status` 전환: draft → reviewed(대표 검수) → live. 학생 쿼리는 reviewed/live만.

## V-7 Seed · 문서
- `content/lessons/rm-11.json`(개념), `content/lessons/rm-11-w1.json`(문제풀이 1편: `x^2+3x+k=0` 실근 없음 조건) — Claude가 작성해 레포에 둠. `content/concepts/root-math.json`(V-0 노드·간선).
- `npm run lesson:seed <file>` — 검증 후 `learn_lessons`에 **새 버전**으로 insert(service_role, 로컬에서 대표/Claude만 실행). 기존 행 수정 없음.
- `lib/learn/README.md`에 레슨 섹션, `database/README.md`에 060·061 줄(적용자 비움), `docs/spec-learn-ui-v1.md`에 레슨 톤·배지 추가.

---

## 검수 체크리스트(Claude)
1. tsc·전체 테스트·build. 060·061 적용 → seed 실행 → `/learn/lesson/rm-11` 렌더.
2. 음성 생성(관리자) → 문장 파일 생성 수·건너뜀 수 확인 → 학생 화면 재생·자막 동기·cue 동작.
3. 근거 칩 클릭 → 개념 카드 모달 → 이벤트 기록. 퀴즈 "모르겠어요" → 추적 질문 → gap 기록 → 코치 화면 "레슨 활동"에 표시.
4. 390px 폭: 무대 세로 배치, 그래프 가로 스크롤 없음, 키 44px.
5. 홈 카드 "오늘의 레슨" 노출 조건.
