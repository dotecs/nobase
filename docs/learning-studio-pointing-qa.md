# LS4-9 로컬 검증 보고

- 기준 main `baf4e11`, 브랜치 `feat/learning-studio-pointing`.
- 모의 인증·이벤트 저장·로컬 무음 파일을 사용하는 Chromium 화면에서 검증했다.
- rm-04의 분자·분모 메모만 임시 모의 데이터에서 `anchor: top/bottom`으로 바꿔 촬영했다. 나머지 요청 장면은 저장소 JSON을 읽었다.

## 반영 사항

1. 손글씨와 arrow 액션의 target 끝점을 bbox 경계 4px 바깥으로 배치한다. 점 대상은 중심에서 9px, 눈금은 실제 글자 bbox를 사용한다. 여섯 anchor를 지원한다.
2. 점 라벨을 기본 → 반대편 → 스택 → 가장 가까운 빈 자리의 인출선 순서로 배치한다. 점·눈금·라벨뿐 아니라 작성 수식과 메모도 회피한다. 명시한 label_pos는 유지하고 겹침 시 인출선을 붙인다.
3. figure 비율 좌표는 object-fit 여백을 뺀 실제 이미지 박스를 기준으로 한다. 이미지 로드·크기 변경 후 다시 측정한다.
4. 글자 크기는 CSS 변수 tick 20px, label 23px, hand 28px, item 26px에 모았다. 작성 수식은 displaystyle을 사용하며 분수 내부 크기를 1em으로 고정했다.
5. 페이지의 마지막 주 버튼은 완료 모달을 열고, 모달 주 버튼이 다음 강의로 이동한다. 문제풀이를 우선하며 다음 대상이 잠겼거나 없으면 학습 홈으로 연결한다. 다음 강의는 첫 장면을 자동 재생한다.
6. 자연 재생 종료 또는 주 버튼으로 완료를 한 번 기록한다. 모달을 닫거나 다시 열어도 추가 기록하지 않는다. 사이드바 체크 표시가 즉시 갱신된다. 진행 중 이벤트 저장과 완료 이벤트 전송을 마친 뒤 이동한다.

## 검증 결과

- `npx tsc --noEmit` 통과.
- Vitest 107개 파일, 1,019개 테스트 통과.
- `npm run build` 통과.
- 현재 레슨 JSON 10개와 이전 JSON 15개 검사 통과.
- rm-01 s2의 세 분수 라벨은 데스크톱에서 기본 위치, 390px에서 일부 스택 배치로 회피했다. 점 라벨과 다른 점 라벨·눈금·items·메모의 겹침 0건.
- rm-04 top/bottom 앵커의 경계 4px 기준 오차 0.01px 미만.
- rm-08 세 넓이 라벨의 이미지 비율 위치 오차 0.02px 미만.
- 글자 크기 변수 20/23/28/26px 확인. lg 분수의 분자 A와 분모 B가 모두 기준 수식과 같은 34px인 것을 computed style로 확인.
- 모의 저장 기준 완료 이벤트 1건. 재생 반복·모달 재열기 후 추가 기록 0건. 닫기·ESC·바깥 클릭·다음 강의 첫 장면 자동 재생 통과.
- 두 해상도에서 가로 스크롤 0건, 브라우저 예외 0건.

## 모바일 콘텐츠 검수 사항

대표 결정에 따라 figure 오버레이를 추가 축소하지 않고 명세의 글자 크기를 유지했다. rm-08 s1은 390px에서 가로 3개 도형의 수식과 손글씨가 겹친다. 이미지 기준 좌표는 정확하지만 기존 콘텐츠의 고정 배치가 조밀하다. rm-01의 큰 작성 수식 items도 모바일에서 수직선과 겹치는 부분이 있다. 점 라벨 자동 회피와 구분해 콘텐츠 검수 사항으로 기록한다.

## 스크린샷

| 장면 | 1672×941 | 390×844 |
|---|---|---|
| rm-01 s2 점 라벨 | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/rm01-labels-1672.png) | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/rm01-labels-390.png) |
| rm-01 s2-4 메모 | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/rm01-memo-1672.png) | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/rm01-memo-390.png) |
| rm-04 s1 top/bottom 앵커 데모 | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/rm04-anchors-1672.png) | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/rm04-anchors-390.png) |
| rm-08 s1 figure | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/rm08-figure-1672.png) | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/rm08-figure-390.png) |
| 마지막 장면과 완료 모달 | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/complete-1672.png) | [보기](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/complete-390.png) |

[배치·앵커·완료 흐름 측정값](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/results.json) · [글자 크기 측정값](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-pointing/typography.json)

## 기존 테스트 기대값 변경

- 마지막 주 버튼과 완료 요약 테스트를 새로운 홈/다음 강의 및 모달 인터페이스에 맞췄다.
- figure SSR 테스트는 이미지 박스 측정 전 오버레이를 대기하는 동작으로 바꿨다. 로드 이후 오버레이 위치는 브라우저에서 검증했다.
