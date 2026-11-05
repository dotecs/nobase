# LS4-13 검증 기록

- 기준: main `2ec440d`, 브랜치 `feat/learning-studio-portrait`.
- DB·콘텐츠 JSON·음성 변경, push·배포 없음. 임시 로컬 페이지는 커밋하지 않음.
- 실제 StudioViewer와 기존 레슨 JSON을 로컬 Chromium에서 렌더. 인증/음성 URL 없이 문장당 5초의 테스트 재생 시간을 사용해 지정 위치로 이동했다. 실제 iPhone Safari 검증은 포함하지 않는다.

## 구현

1. DOM 대상과 figure 이미지 박스 모두 SVG viewBox의 xMidYMid meet 변환으로 측정. CSS scale과 레터박스 여백을 함께 반영.
2. 무대 폭 640px 미만에서 전체 축소를 해제. 그룹 항 줄바꿈, standalone/order 스택, 메모 영역, 3열 이상 표의 행 카드, steps/chain/tree의 세로 배치.
3. callout/손글씨를 측정한 대상·부분 대상에 붙이고 충돌 시 스택. 순수 메모는 아래에 등장 순서대로 표시. 긴 풀이의 현재 행은 무대 내부에서 스크롤해 노출.
4. 세로 글자 크기 사다리, 선 2px·원 여백 4px·빗금 연장 3px·region/bracket 간격 20px. 수직선 기본 높이 160px(여러 region 라벨의 필요 높이는 추가 확보).
5. items와 지시의 `position.near/side/gap` 파싱·참조 검증·데스크톱 배치 지원. figure의 이미지 기준 좌표 유지.

## 자동 검증

- `npx tsc --noEmit`: 통과.
- Vitest: 113개 파일, 1,109개 테스트 통과. 신규 portrait 테스트 15개.
- `npm run build`: 통과.
- 기존 레슨 JSON 10개와 데모: lesson-check 통과. 기존 권고 경고 2건(메모 수, 문장 내 pointer/circle 수) 유지.
- 실제 DOM/SVG 화살표 끝점 오차: 배율 0.3에서 0.001434px, 0.5에서 0.001994px, 1.0에서 0.003988px. 모두 1px 미만.
- 임시 파일 생성 권한 때문에 첫 테스트/재빌드가 EPERM으로 중단됐으며, 허용된 실행 환경에서 재실행해 통과했다.

## 화면 검증

390×844의 아래 7개 캡처 시점에서 표시 글자 12px 미만 0건, 가로 넘침 0건(문서/무대 폭·scrollWidth 모두 390px), 시각 검수상 글자·메모 겹침 0건. KaTeX의 보이지 않는 1px 정렬용 zero-width-space는 글자 검사에서 제외했다. 표와 긴 풀이의 위쪽 내용은 무대 내부 스크롤로 확인한다. 모든 재생 시점·모든 콘텐츠에 대한 무겹침 보장을 의미하지 않는다.

데스크톱 1672×941은 변경 전과 같은 위치에서 비교: rm-02 s1 차이 0픽셀, rm-06 s1 차이 1픽셀(배치 변화 없음).

캡처·측정 로그 폴더:
`C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-portrait/`

| 해상도 | 장면 | 파일 |
|---|---|---|
| 390×844 | rm-02 s1 | rm-02-s1-390.png |
| 390×844 | rm-02 s4 | rm-02-s4-390.png |
| 390×844 | rm-06 s1 | rm-06-s1-390.png |
| 390×844 | rm-06 s5 | rm-06-s5-390.png |
| 390×844 | rm-07 s3 | rm-07-s3-390.png |
| 390×844 | rm-11 s2 | rm-11-s2-390.png |
| 390×844 | rm-01 s2 | rm-01-s2-390.png |
| 1672×941 | rm-02 s1 | after-desktop-rm-02.png |
| 1672×941 | rm-06 s1 | after-desktop-rm-06.png |

측정 근거: `scales.json`, `first-check.json`, `desktop-diff.json`, `checks.json`, `tests.log`, `build.log`.

매뉴얼 개정은 명세 §6의 후속 Claude 작업으로 남겨 두었다.
