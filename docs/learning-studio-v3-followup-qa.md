# LS3-8 검증 보고 (2026-11-01)

기준: `main e002df9`, 작업 브랜치: `feat/learning-studio-v3-followup`.

## 변경

- `loadCurriculum(packId, userId)`에서 인증된 현재 사용자의 `complete` 이벤트를 한 번 조회한다. `lesson_id`만 읽고 중복을 제거한다. 기존 레슨 공개 여부 조회와 병렬 실행한다.
- 과정 사이드바의 완료 레슨(문제풀이 레슨 포함)은 채운 점, 미완료 레슨은 빈 점으로 표시한다. 현재 레슨의 바깥 링은 유지하고 완료 상태를 스크린리더에도 제공한다.
- 장면 이동/직접 해시 진입 후 새 RSC 장면 객체가 전달되는 회귀 테스트 2개, 요청된 `formulaValues` 부호 조합 5개, 완료 조회·표시 테스트를 추가했다.
- `useSceneNavigation`, 이벤트 저장, 인증, 음성 재생 코드는 변경하지 않았다. 색 토큰도 변경하지 않았다.

## 서버 액션 / 페이지 RSC 재렌더 조사

운영 DB에 쓰지 않기 위해 별도 임시 Next.js 15.5.9 앱에서 실제 레슨 페이지·`recordLessonEvents`·StudioViewer를 실행했다. 인증과 Supabase는 모의 구현으로 대체하고 외부 네트워크를 차단했다. 콘텐츠는 저장소의 기존 v4 JSON을 그대로 읽었다. 음성은 문장당 5초의 로컬 무음 응답이며 실제 음성 생성·변경은 하지 않았다.

실제 App Router 브라우저 결과:

| 조건 | 페이지 렌더 카운터 | 서명 발급 카운터 | `x-action-revalidated` | 장면/URL |
|---|---|---|---|---|
| 최초 진입·일반 이벤트 저장 | 6 | 6 | `[[],0,0]` | s1 유지 |
| 다음 장면 → 일반 이벤트 저장 응답 | 6 → 6 | 6 → 6 | `[[],0,0]` | s2 / `#s2` 유지 |
| 다음 장면 → 인증 쿠키 갱신을 모의한 저장 응답 | 6 → 8 | 6 → 8 | `[[],0,1]` | s3 / `#s3` 유지 |
| 직접 `#s4` 진입 후 쿠키 변경을 동반한 응답 | 새 페이지 렌더 확인 | 재발급 확인 | 쿠키 변경 | s4 / `#s4` 유지 |

카운터는 격리된 개발 서버의 누적 측정치다. 개발 환경의 중복 실행 횟수를 운영 재렌더 횟수로 해석하지 않는다. 서버 액션 응답의 `text/x-component`만으로 페이지 재렌더를 판정하지 않고, 실제 페이지 실행 카운터와 전달된 렌더 번호를 확인했다.

### 원인

1. `app/(main)/learn/lesson/actions.ts`의 `recordLessonEvents`에는 `revalidatePath`/`revalidateTag` 호출이 없다. 일반 저장만으로는 페이지 Flight를 다시 만들지 않았다.
2. `requireLearner`는 `lib/learn/runtime.ts`에서 `auth.getUser()`를 호출한다. 인증 토큰 갱신 등으로 SSR 인증 쿠키가 변경되면 `lib/supabase-server.ts`의 쿠키 setter가 실행될 수 있다.
3. 설치된 Next.js 15.5.9의 `server/web/spec-extension/adapters/request-cookies.js`는 쿠키 변경 시 `workStore.pathWasRevalidated = true`로 설정한다. `server/app-render/action-handler.js`는 `skipFlight: !workStore.pathWasRevalidated || actionWasForwarded`로 페이지 Flight 생성 여부를 결정한다.
4. 따라서 **항상 재렌더되는 것은 아니지만, 인증 쿠키가 갱신되는 액션에서는 재렌더될 수 있다.** 운영 인증 세션에서 발생 빈도는 측정하지 않았다.

### 재생 중 서명 URL 변경 가능성

- `lib/learn/lessons/data.ts`의 `audioPlayback`은 페이지 호출마다 `createSignedUrls(paths, 600)`을 실행한다. 같은 경로·해시라도 나중에 다시 서명하면 URL이 달라질 수 있다. 같은 시각에 재서명한 URL이 반드시 달라진다는 뜻은 아니다.
- `components/studio/StudioPlayer.tsx`는 새 `audioUrls` props를 `sources`에 반영한다. 같은 문장의 URL이 바뀌면 기존 media를 pause하고 src 교체·load 후 현재 위치로 seek하고, 재생 상태였으면 다시 play한다.
- 로컬 모의 서명은 매 호출마다 토큰을 바꾸었다. s3 재생 중 `token=6`에서 `token=8`로 URL이 변경됐고, 이후 `paused=false`였다. **재생 중 URL 교체와 미디어 재로드 가능성이 있으며, 짧은 끊김이 생길 수 있다.** 실제 Supabase 음성의 끊김 길이는 측정하지 않았다.
- 요청대로 이 경로는 조사·기록만 했으며 수정하지 않았다.

## 라이트 화면 검증

모두 1672×941, 로컬 임시 인증/DB 환경에서 실제 스튜디오 컴포넌트를 촬영했다. 공개 로고·Pretendard·Poor Story를 사용했다. 완료 이벤트는 모의 `rm-11-w1` 1개다.

- `/learn/studio-demo`: 1초 시점, 하늘색 손글씨·화살표 및 자막 확인.
- `/learn/lesson/rm-11#s4`: 8초 시점의 빨간 x축 밑줄, 14.99초 시점의 하늘색 메모·자막 확인. 기존 콘텐츠/모의 문장 길이에 따라 표시 시점을 선택했다.
- 실제 계산된 라이트 토큰: mark `#e11d48`, hand `#0284c7`, text `#0f172a`, caption `rgba(255,255,255,.92)`.
- 빨간 표시와 하늘색 메모가 밝은 무대에서 구별되고 읽힌다. 읽은 자막은 진한 색, 아직 읽지 않은 단어는 기존의 낮은 불투명도로 구별된다. 시각 점검에서 토큰 조정이 필요한 문제는 발견하지 못했다. 정식 접근성 인증 결과를 의미하지 않는다.

스크린샷·측정 JSON 위치:

`C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-v3-followup/`

- `demo-light-1672.png`
- `rm11-s4-mark-light-1672.png`
- `rm11-s4-hand-light-1672.png`
- `rsc-evidence.json`, `light-evidence.json`

## 검증 / 범위

- `npx tsc --noEmit`: 통과.
- `npm test`: 93개 파일, 865개 테스트 통과.
- `npm run build`: 통과. 기존 저장소의 img/hook 관련 경고는 남아 있으나 이번 변경의 오류는 없다.
- 새 이벤트·테이블·컬럼·마이그레이션 없음. 콘텐츠 JSON·실제 음성·운영 DB 변경 없음. push·배포 없음.
- 기존 사용자 변경 `.env.local.example`은 보존하고 커밋에서 제외한다. 임시 검증 앱·모의 서비스·스크린샷도 저장소에 커밋하지 않는다.
