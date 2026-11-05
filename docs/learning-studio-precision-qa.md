# LS4-12 검수 기록

2026-11-05 · `feat/learning-studio-precision` · 기준 main `de47afa`

## 구현

- `\p{name}{…}` 대상을 표 셀·steps·chain·callout·tree에 확장했다. 셀 안의 여러 수식은 하나의 이름 공간을 공유한다. 중복 이름과 없는 부분 대상은 lesson-check 오류다.
- `stageTargetIds`와 공통 KaTeX 옵션으로 작성 수식 검사·렌더·측정의 대상 이름을 일치시켰다. 부분 tint·highlight도 측정 후 재렌더에서 유지된다.
- `strike`는 target/targets/pairs 중 하나를 받는다. 기본 간격 200ms, 쌍은 동시에 그리며 `/`와 `\` 방향을 지원한다. 대상 대각선의 양끝을 각각 4px 연장하고 Stroke를 2.5px로 표시한다.
- 지시류 기본 수명은 문장 끝이다. 다음 문장 시작 시각과 마지막 문장 재생 길이를 사용하며, 마지막 200ms 동안 페이드한다. pointer는 기본 2500ms 상한을 유지한다.
- `ttl_ms`와 `until` 중 먼저 끝나는 쪽을 적용한다. 기존 `ttl_ms:0`은 scene 호환이며, 명시적인 `until`이 우선한다. 칠판 내용과 기존 구조 강조(step/row/node 및 배열 highlight)는 기본 scene 수명이다.
- reveal 이동 애니메이션 중에도 대상 위치를 추적하고 종료 시 다시 측정한다. 이 보완 전 steps에서 약 11px 위치 오차가 재현됐다.
- 코드 데모 `precision-cancellation` 추가: rm-07 s3-3 형태의 약분 쌍 3개 → 결과 1에 circle → 다음 문장에서 지시 소멸.

## 검증

- TypeScript 통과.
- Vitest 112개 파일, **1,094개 테스트 통과**. 정밀 지시 신규 25개 포함.
- 기존 chalk 테스트 1개는 폐지된 전체 2500ms 수명 대신 문장 끝 지시 소멸·bracket/shade/handwrite 유지로 기대값을 변경했다.
- 프로덕션 빌드 통과. 기존 Hook·img 권장 경고는 유지된다.
- 기존 콘텐츠 JSON 10개 검사 통과. 오류 0건, 경고 2건:
  - rm-01 s3: 손글씨 메모 4개 이하 권장.
  - rm-02 s4-2: pointer·circle 한 문장 2개 이하 권장.
- 새 `ttl_ms:0` 지시 수명 경고 0건.
- 데모 검사 통과: 7개 장면, 16개 문장.

## 실제 화면 측정

운영 통신을 차단한 임시 로컬 앱에서 실제 스튜디오 컴포넌트를 렌더했다. 인증은 모의 상태이며, 임시 페이지와 측정 스크립트는 커밋하지 않는다. 음성 생성 없이 자막 폴백 시간표로 탐색했다.

| 부분 대상 자리 | 글자와 circle 중심 오차 |
| --- | ---: |
| 표 셀 | 0.0037px |
| steps | 0.0026px |
| chain | 0.0041px |
| tree | 0.0032px |
| callout | 0.0018px |

다섯 자리 모두 부분 tint를 확인했다. 데모의 1672×941·390×844에서 빗금 2→4→6개 순서, 1의 circle, 2890ms 문장 경계 소멸, 되감기 복원을 확인했다. 빗금 중심 오차 0.005px 미만, 가로 넘침과 브라우저 오류 0건이다.

![1672×941](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-precision/precision-1672.png)

![390×844](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-precision/precision-390.png)

![다음 문장 — 지시 소멸](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-precision/precision-next-1672.png)

DB·콘텐츠 JSON·음성·의존성 변경 및 push·배포 없음. 기존 미커밋 환경 예시 파일과 bundle은 작업에서 제외했다.
