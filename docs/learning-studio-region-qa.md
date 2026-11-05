# LS4-11 검수 기록

2026-11-05 · feat/learning-studio-region · 기준 main 80f981b

## 구현

- graph·slider의 number_line 무대에 region 액션을 추가했다.
- 유한 경계는 채운 원·빈 원, 무한 경계는 화살촉으로 표시한다. 한 점 범위는 채운 원 하나로 표시한다.
- 같은 액션의 범위는 같은 level을 사용하며 높이는 level × 28px이다.
- 여러 범위는 왼쪽부터 마커·수직선·수평선 순서로 400ms 동안 그려진다. 카메라 밖 범위도 원래 애니메이션 순서를 유지한다.
- ttl_ms 기본값 0, 선택 만료, clear region·all, 되감기를 지원한다.
- region:id와 region:id/인덱스의 bbox를 pointer·circle·underline·highlight·tint에 연결했다.
- 교집합은 열린 끝·닫힌 끝을 보존하며 중복 구간을 합쳐 띠가 중첩해서 진해지는 것을 방지한다. 열린 접점은 제외하고 닫힌 접점은 한 점으로 남긴다.
- 축 위 여백과 측정된 라벨 크기를 반영한다. 라벨 충돌은 원래 위치를 기준으로 위로 피하므로 되감기·크기 변경 시 이전 배치에 의존하지 않는다.
- lesson-check에 수직선 조건, 범위, ID·참조, TeX 검사를 추가했다. 같은 level의 동시 표시를 경고한다. 음성 정렬 자료가 없는 검사에서는 자막 추정 시간과 앵커 폴백을 사용한다.

## 검증

- TypeScript 통과.
- Vitest 111개 파일, 1,068개 테스트 통과. region 신규 테스트 25개 포함.
- 프로덕션 빌드 통과. 기존 Hook·img 경고가 출력된다.
- 현재 레슨 JSON 10개 검사 통과.
- 실제 lesson-check 명령으로 임시 데모 검사 통과 — 6개 장면, 14개 문장.
- 데모 장면 추가에 맞춰 기존 마지막 장면 테스트의 고정 인덱스를 scenes.length 기준으로 변경했다.

## 로컬 화면

운영 연결을 차단한 임시 앱에서 실제 스튜디오 컴포넌트를 렌더했다. 인증 데이터는 모의 데이터다. 코드 데모의 inequality-regions 장면을 검사했다.

| 항목 | 1672×941 | 390×844 |
| --- | --- | --- |
| 조건 A 높이 | 28px | 28px |
| 조건 B의 두 범위 높이 | 56px·56px | 56px·56px |
| 경계 원 | 4개 | 4개 |
| 무한 화살촉 | 2개 | 2개 |
| 교집합 띠 | 2개 | 2개 |
| 가로 넘침·브라우저 오류 | 0건 | 0건 |

공통 해는 [-1,0]과 [1,2)로 확인했다. 되감기하면 조건 B가 사라지고 다시 탐색하면 복원된다. 라이트 모드에서도 빈 원·채운 원과 두 조건의 색을 확인했다.

![데스크톱](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-region/region-1672.png)

![모바일](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-region/region-390.png)

![라이트](C:/Users/hcm07/.codex/visualizations/2026/10/20/01a15864-2440-74a1-88ce-294985415aee/learning-studio-region/region-light-1672.png)
