# 글래스 스타일 적용 — 개발 명세서 (G0–G3)

- 작성일: 2026-10-23
- 대상: Codex(`nobase` 레포, main 기준 — PR #1 머지 이후)
- 브랜치: `feat/glass-style` → PR → 대표 승인 후 머지
- 참조 구현(그대로 따를 것): Josh Comeau, *Next-level frosted glass with backdrop-filter* — https://www.joshwcomeau.com/css/backdrop-filter/ (확장 백드롭, 플리커 방지 그라데이션, `@supports` 폴백, 둥근 모서리 마스크)
- 새 의존성 **없음**. 리퀴드 글래스류 라이브러리(SVG 변위맵·캔버스) 사용 금지 — Safari/Firefox 부분 지원, 성능 비용 때문.

> `[확인]` = 게시 전 대표 확인. 디자인 토큰·블러 예산은 이 문서가 기준이며, 수치를 바꾸려면 문서를 먼저 고친다.

---

## 0. 한 장 요약

| 항목 | 결정 |
|---|---|
| 적용 범위 | **공개 페이지만**: 공통 헤더, `/`, `/courses`, `/courses/[courseId]`(랜딩), `/courses/[courseId]/pricing`, `/booking`. 대시보드·레슨·워크북·관리자·로그인은 **제외**(토큰만 공유, 평면 유지) |
| 구현 방식 | CSS Modules 유틸 `styles/glass.module.css`(`.glass`, `.glassStrong`, `.glassBar`) + 토큰. 컴포넌트는 className 추가만 |
| 다크 모드 | **남색 반투명 버전 포함**. `[data-theme="dark"]`와 `prefers-color-scheme: dark`(light 강제 아닐 때) 둘 다 |
| 블러 예산 | 페이지당 `backdrop-filter` 요소 **최대 6개**(헤더 1 + 카드 5). 그 외 카드는 블러 없는 반투명(`.glassFlat`) |
| 모바일 | ≤767px은 **카드 블러 제거**(불투명도 올린 반투명 폴백), **헤더 블러는 유지**(면적 작고 가독성에 필요) |
| 접근성 | 유리 위 본문 색은 `--color-ink`/`--color-muted` 고정, 대비 AA. `prefers-reduced-transparency: reduce`면 불투명 카드로 |
| 성능 기준 | Lighthouse 모바일 Performance가 현재(PR #1 머지본) 대비 **-3점 이내**. 초과하면 블러 요소를 줄인다 |

---

## 1. 토큰 (styles/globals.css에 추가)

```css
:root {
  --glass-bg: rgba(255, 255, 255, 0.62);
  --glass-bg-strong: rgba(255, 255, 255, 0.78);
  --glass-bg-flat: rgba(255, 255, 255, 0.86);     /* 블러 없는 카드 */
  --glass-border: rgba(255, 255, 255, 0.75);
  --glass-border-outer: rgba(0, 114, 198, 0.14);
  --glass-highlight: rgba(255, 255, 255, 0.9);     /* 상단 1px 하이라이트 */
  --glass-shadow: 0 12px 32px rgba(0, 114, 198, 0.10), 0 1px 2px rgba(16, 27, 51, 0.04);
  --glass-blur: 16px;
  --glass-blur-bar: 12px;
  --glass-saturate: 1.4;
}
/* 남색 반투명 — 다크 */
[data-theme="dark"], :root:not([data-theme="light"]) @media (prefers-color-scheme: dark) 에 동일 적용:
  --glass-bg: rgba(14, 26, 43, 0.58);          /* #0E1A2B */
  --glass-bg-strong: rgba(14, 26, 43, 0.74);
  --glass-bg-flat: rgba(14, 26, 43, 0.88);
  --glass-border: rgba(140, 180, 220, 0.22);
  --glass-border-outer: rgba(0, 114, 198, 0.28);
  --glass-highlight: rgba(170, 205, 240, 0.35);
  --glass-shadow: 0 16px 40px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.3);
```
(다크 선택자는 레포의 기존 패턴 — `[data-theme="dark"]` 블록과 `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }` 블록 — 둘 다 작성)

다크의 하늘색 배경(`Scene.module.css .backdrop`)도 유리가 보이도록 교체: `radial-gradient(900px 500px at 78% 30%, rgba(0,114,198,.28), transparent 70%), radial-gradient(700px 400px at 12% 85%, rgba(0,114,198,.16), transparent 70%), linear-gradient(180deg, #0B1526 0%, #0E1A2B 70%, var(--color-bg) 100%)`. 유리는 뒤에 무언가 있어야 보이므로 다크에서도 그라데이션·장면 이미지는 유지한다(라운드 카드 처리 그대로).

---

## 2. 유틸 — `styles/glass.module.css`

```css
/* 기본 유리 카드: 블러 있음 */
.glass {
  position: relative;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border-outer);
  border-radius: var(--radius-card);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
}
.glassStrong { composes: glass; background: var(--glass-bg-strong); }
/* 블러 없는 반투명 — 예산 밖 카드용 */
.glassFlat {
  background: var(--glass-bg-flat);
  border: 1px solid var(--glass-border-outer);
  border-radius: var(--radius-card);
  box-shadow: var(--glass-shadow), inset 0 1px 0 var(--glass-highlight);
}
/* 헤더 바: Comeau 확장 백드롭 */
.glassBar { position: sticky; top: 0; background: transparent; border-bottom: 1px solid var(--glass-border-outer); }
.glassBar::before {           /* 실제 요소가 필요하면 Header.tsx에 <div className={glass.barBackdrop}> 추가 */
  content: ''; position: absolute; inset: 0; height: 200%;
  background: linear-gradient(to bottom, var(--glass-bg-strong), var(--glass-bg-strong) 50%, transparent 50%);
  -webkit-backdrop-filter: blur(var(--glass-blur-bar)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur-bar)) saturate(var(--glass-saturate));
  -webkit-mask-image: linear-gradient(to bottom, #000 0 50%, transparent 50%);
  mask-image: linear-gradient(to bottom, #000 0 50%, transparent 50%);
  pointer-events: none; z-index: -1;
}
/* 폴백·모바일·접근성 */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass, .glassStrong { background: var(--glass-bg-flat); }
  .glassBar::before { background: var(--glass-bg-flat); mask-image: none; height: 100%; }
}
@media (max-width: 767px) {
  .glass, .glassStrong { -webkit-backdrop-filter: none; backdrop-filter: none; background: var(--glass-bg-flat); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass, .glassStrong, .glassFlat { background: var(--color-bg-elevated); -webkit-backdrop-filter: none; backdrop-filter: none; }
  .glassBar::before { background: var(--color-bg); -webkit-backdrop-filter: none; backdrop-filter: none; mask-image: none; -webkit-mask-image: none; height: 100%; }
}
/* 모바일: 카드만 블러 제거, 헤더(.glassBar)는 유지 — 10-23 Codex 질문으로 명시 */
```
- 둥근 모서리와 `::before` 마스크가 충돌하면 Comeau 글의 SVG `<mask>` 방식 사용(헤더는 모서리가 없으므로 해당 없음).
- 블러 요소에는 `will-change` 쓰지 않음(메모리). 스크롤 플리커가 보이면 글의 "상단 불투명 그라데이션" 처리.
- 유리 카드 내부 텍스트: `color: var(--color-ink)`, 보조 텍스트 `--color-muted`. 대비는 가장 밝은 배경(흰 90%) 기준으로 AA 확인.

---

## 3. 적용 지도 (블러 예산 포함)

| 페이지 | 요소 | 클래스 | 블러 |
|---|---|---|---|
| 공통 | Header `.header` | `glassBar` (기존 `backdrop-filter: blur(8px)`·`background-color` 제거) | 1 |
| `/` Hero | 목표 카드 컨테이너 `.goals` | `glass` | 1 |
| `/` Hero | 목표 카드 3개 `.goal` | `glassFlat` | 0 |
| `/` 프로그램 | `ProgramCard .card` ×3 | **변경 없음**(흰 평면 배경) | 0 |
| `/` 학습 방식 | 스텝 4개 `.steps li` | `glassFlat` | 0 |
| `/` 학습 방식 | 큰 카드 `.textCard`, 안내 카드 `.guide` ×2 | `glass` | 3 |
| `/` 브랜드 철학 | `.value` ×3 | **변경 없음**(흰 평면 배경) | 0 |
| `/` CTA 밴드 | 버튼 그룹 뒤 패널 없음 — 변경 없음 | — | 0 |
| `/courses` | 상단 헤더 영역은 Scene 배경 유지. 카드·칩은 흰 배경이므로 **변경 없음** | — | 0 |
| 랜딩 `/courses/[courseId]` | `.card`(S4 자료·S5 지원 카드), `.faq` 항목, `.instructor` 카드 | 섹션당 1개만 `glass`(첫 카드), 나머지 `glassFlat` | ≤4 |
| 가격 `/pricing` | `PricingPlans .card` ×3 | 하이라이트 플랜(`.highlight`)만 `glassStrong`, 나머지 `glassFlat` | 1 |
| `/booking` | `.panel` | `glass` | 1 |

- 유리는 **Scene 배경(하늘색 그라데이션 또는 장면 이미지) 위**에서만 쓴다. 흰 평면 배경 위 카드는 `glassFlat`도 쓰지 않고 기존 스타일 유지(표의 '변경 없음' 행). — 10-23 Codex 질문으로 표 정정
- 기존 `background`·`border`·`box-shadow` 선언은 유리 클래스와 중복되지 않게 해당 규칙에서 제거(스타일 우선순위 충돌 방지). `composes` 대신 className 병합(`${styles.card} ${glass.glass}`)도 허용.

---

## 4. 작업 분할

### G0 기반 (1커밋)
1. §1 토큰(라이트·다크) 추가, 다크 Scene 배경 교체
2. `styles/glass.module.css` 작성(§2)
3. 임시 라우트 없이 Storybook도 없으므로, `app/(main)/courses/page.tsx` 상단 헤더에 먼저 `glassBar`를 적용해 라이트·다크·모바일·`@supports` 폴백 4장 스크린샷
- 완료 조건: 기존 페이지 시각 변화는 헤더뿐

### G1 메인·courses (1~2커밋)
- §3 표의 `/`, `/courses` 행 적용. `HomeMotion` 페이드와 충돌 없는지(블러 요소 opacity 애니메이션은 비용 큼 → 유리 카드는 페이드 대상에서 제외하거나 섹션 단위 유지)
- 완료 조건: 1440·390 스크린샷(라이트·다크), 블러 요소 수 ≤6 (`document.querySelectorAll('*')`로 `backdrop-filter !== 'none'` 개수 세는 스니펫 결과 첨부)

### G2 랜딩·가격·예약 (1~2커밋)
- §3 표의 나머지 행. 랜딩의 Vimeo 플레이어·면접 영상 영역은 유리 처리하지 않음(iframe 위 블러 = 성능 낭비)
- 완료 조건: `/courses/n-training`, `/courses/n-training/pricing`, `/booking` 스크린샷(라이트·다크·390)

### G3 QA 체크리스트 (PR 본문)
- [ ] 페이지별 `backdrop-filter` 요소 수 ≤6
- [ ] Lighthouse 모바일 Performance: PR #1 머지본 대비 -3 이내(같은 환경에서 둘 다 측정해 두 숫자 기재)
- [ ] iOS Safari(또는 Safari 응답성 디자인 모드)에서 헤더 블러·둥근 카드 깨짐 없음
- [ ] 다크 모드에서 남색 유리가 배경과 구분됨(카드 테두리·하이라이트 보임)
- [ ] 유리 카드 안 텍스트 대비 AA(본문 4.5:1, 큰 글자 3:1) — 가장 밝은 영역 기준
- [ ] `prefers-reduced-transparency` 에뮬레이션 시 불투명 카드로 전환
- [ ] 대시보드·레슨·관리자 페이지 시각 변화 없음(스크린샷 2장)
- [ ] 390px 가로 스크롤 없음, 헤더 스크롤 시 플리커 없음

---

## 5. 범위 밖 · 후속
- 앱 페이지(대시보드·레슨·워크북·관리자) 유리 적용 — 하지 않음. 필요해지면 별도 결정.
- 리퀴드 글래스(굴절) 효과 — 채택 안 함.
- 디자인 시스템 문서 페이지(토큰·컴포넌트 카탈로그) — 별도 범위.
