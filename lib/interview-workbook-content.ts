/**
 * SSIT 면접 대비 워크북 — 콘텐츠 정의
 *
 * 원본: passmj-workbook (2025 Ver., Vercel) 의 7개 PART 를 구조화한 것.
 * 질문 id 는 저장 키이므로 바꾸면 기존 답변과 연결이 끊어진다 (바꿀 땐 CONTENT_VERSION 올리기).
 * 내용(문구·질문)만 고칠 때는 id 를 유지하면 답변이 그대로 보존된다.
 */

export const CONTENT_VERSION = 1;
export const WORKBOOK_YEAR_LABEL = '2025 Ver.';

export type FieldKind = 'textarea' | 'text' | 'checkbox';

export interface WorkbookField {
  id: string;
  kind: FieldKind;
  label: string;
  /** textarea/text 입력 힌트 */
  placeholder?: string;
  /** 글자수 제한 (500자 문항 등) */
  maxLength?: number;
  /** 체크리스트 항목에 붙는 짧은 메모 입력란 라벨 (있으면 text 입력 하나가 함께 렌더됨) */
  notePlaceholder?: string;
}

export interface WorkbookBlock {
  /** 섹션 내 소제목 (카드) */
  title?: string;
  /** 소제목 아래 설명 */
  description?: string;
  /** 읽기용 요점 (bullet) */
  bullets?: string[];
  /** 번호 매긴 요점 */
  steps?: string[];
  /** 강조 콜아웃 */
  callout?: { tone: 'info' | 'warning' | 'quote'; text: string };
  /** 입력 필드들 */
  fields?: WorkbookField[];
  /** 특수 위젯 */
  widget?: 'timer';
  /** 표 (헤더 + 행) */
  table?: { head: string[]; rows: string[][] };
}

export interface WorkbookPart {
  id: string;
  /** 목차용 짧은 제목 */
  short: string;
  /** 섹션 제목 */
  title: string;
  /** 섹션 도입 문장 */
  intro?: string;
  blocks: WorkbookBlock[];
}

export const INTERVIEW_WORKBOOK: WorkbookPart[] = [
  // ───────────────────────────────────────────────────────────
  {
    id: 'overview',
    short: '면접 개요',
    title: 'PART 1. 면접 개요',
    intro: '면접은 발표 시험이 아니라 대화 속의 설득입니다. 먼저 어떤 자리인지부터 그려 봅시다.',
    blocks: [
      {
        title: '면접 진행 방식',
        table: {
          head: ['항목', '내용'],
          rows: [
            ['형식', '다대일 (교수님 3 + 면접자 1)'],
            ['순서', 'PPT 발표(3분) → 질의응답(7분)'],
            ['시간', '총 10분 내외'],
            ['장소·분위기', '넓은 강의실, 칠판 앞 교수 3인 착석 · 공식적이되 대화 중심'],
          ],
        },
      },
      {
        title: '평가 포인트',
        table: {
          head: ['평가 항목', '세부 내용'],
          rows: [
            ['발표 내용', '논리성, 전달력, 발표 구조'],
            ['태도', '자신감, 성실성, 진정성'],
            ['질문 대응', '사고력, 응용력, 성찰적 태도'],
            ['성장 가능성', '학업 계획의 구체성, 목표의 명확성'],
          ],
        },
      },
      {
        callout: {
          tone: 'warning',
          text:
            '본 워크북은 작년 면접 후기를 바탕으로 제작되었으며, 실제 면접 현장의 질문 내용이나 진행 방식은 일부 달라질 수 있습니다. 준비 방향을 돕기 위한 참고용이며 실제 면접 상황을 100% 반영하지는 않습니다.',
        },
      },
    ],
  },

  // ───────────────────────────────────────────────────────────
  {
    id: 'mindset',
    short: '마인드셋',
    title: 'PART 2. 면접 마인드셋',
    blocks: [
      {
        bullets: [
          '완벽한 답보다 일관된 태도 — 모르면 솔직히, "배워서 개선하겠습니다"로 마무리',
          '정답보다 방향성 — 지식 자체보다 성장 가능성을 보여주세요',
          '대화하는 태도 — 교수님과의 상호작용 속에서 "나"를 보여주기',
        ],
      },
      {
        title: '기록하기',
        fields: [
          {
            id: 'mindset_note',
            kind: 'textarea',
            label: '면접을 준비하며 나 자신에게 해주고 싶은 말',
            placeholder: '예) 완벽할 필요 없어. 진정성 있게 대화하자.',
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────
  {
    id: 'ppt',
    short: 'PPT 발표',
    title: 'PART 3. PPT 발표 가이드',
    intro: '공식 기준을 반영한 제작·제출 규정과 슬라이드 구성입니다.',
    blocks: [
      {
        title: '제작 & 제출 규정',
        bullets: [
          '발표 시간 3분 / 전체 면접 약 10분',
          'PPT 3매 이내 (표지 제외) — PDF로 제출',
          '파일명 예시: SSIT학부 면접_김삼성.pdf',
          '제출 기한 예시: 10/27(월) 23:59',
          '제출처: SSIT 교학처 <ssit1.sec@samsung.com>',
        ],
        callout: {
          tone: 'info',
          text:
            '발표 3장(표지 제외)에는 반드시 ① 장단점 & 담당 업무 & SSIT에서 키우고 싶은 역량, ② 업무 중 문제/기존 방식 개선 경험 & 본인의 역할, ③ SSIT 학부 커리큘럼 중 관심 과목 1개(이유) & 입학 후 학업계획/커리어 패스를 담아야 합니다. 커리큘럼 교과목은 ssit.ac.kr → 학부 → 교과정보에서 확인할 수 있습니다.',
        },
      },
      {
        title: '슬라이드별 포인트',
        steps: [
          '장단점 · 담당업무 · 강화 역량 — 강점은 근거, 약점은 보완 계획까지. 담당 장비/공정/지표를 한 줄로. "SSIT에서 키울 역량 → 현장 적용 시나리오" 연결.',
          '개선 경험 · 본인 역할 — 문제 → 가설/시도 → 결과(수치) → 시사점 흐름. 팀 내 본인 역할/의사결정 포인트를 명확히.',
          '관심 과목 · 학업계획 · 커리어 패스 — 과목 선택 이유(업무 연계) → 주차별/학기별 계획 요약 → 졸업 후 경로(단·중·장기).',
        ],
        description: '각 슬라이드는 핵심 메시지 1개만 강하게. 문장보다 키워드, 3~5 bullet 권장.',
      },
      {
        title: '3분 발표 연습',
        description: '실제 발표 시간에 맞춰 리허설해 보세요. 핵심만 남겼는지 점검하는 용도입니다.',
        widget: 'timer',
      },
      {
        title: '슬라이드 초안 — 키워드',
        fields: [
          {
            id: 'ppt_kw1',
            kind: 'text',
            label: '[1장] 장단점 · 업무 · 강화 역량 (키워드)',
            placeholder: '예: 강점-데이터정합 / 약점-이론깊이 · 담당-Etcher · 강화-공정변수해석',
          },
          {
            id: 'ppt_kw2',
            kind: 'text',
            label: '[2장] 개선 경험 & 역할 (핵심 스토리)',
            placeholder: '예: 파티클 급증 → 가설·실험 → 불량률 32%↓ · 내 역할-원인분석/실험디자인',
          },
          {
            id: 'ppt_kw3',
            kind: 'text',
            label: '[3장] 관심 과목 & 계획/커리어',
            placeholder: '예: 반도체소자개론(업무연계) · 주2회 예/복습 · 공정전문가 → 라인리더',
          },
        ],
      },
      {
        title: '슬라이드 상세 작성',
        fields: [
          {
            id: 'ppt_s1',
            kind: 'textarea',
            label: '[1장 상세] 장단점 · 담당업무 · SSIT에서 키울 역량',
            placeholder: '강점(근거) / 약점(보완계획) / 담당 공정·설비·지표 / SSIT에서 강화할 역량과 적용 시나리오',
          },
          {
            id: 'ppt_s2',
            kind: 'textarea',
            label: '[2장 상세] 문제 해결/개선 경험 & 본인 역할',
            placeholder: '문제 정의 → 가설/시도 → 결과(수치·영향) → 본인 역할 → 배운 점/재현 계획',
          },
          {
            id: 'ppt_s3',
            kind: 'textarea',
            label: '[3장 상세] 관심 과목 · 학업계획 · 커리어 패스',
            placeholder: '선정 과목 & 이유(업무 연계) / 주차·학기 계획 / 단·중·장기 커리어 경로(지표 포함)',
          },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────
  {
    id: 'questions',
    short: '예상 질문',
    title: 'PART 4. 예상 질문 카테고리별 정리',
    intro:
      '기출 기반으로 정리했습니다. 모든 답변은 사건 → 느낀점 → 배운점 → 적용(SSIT/현장)의 4단 구조로 정리하세요. 수치·지표·결과(불량률 ↓, TAT ↓ 등)를 함께 적으면 설득력이 크게 올라갑니다.',
    blocks: [
      {
        title: '자기인식형',
        fields: [
          { id: 'q_self_1', kind: 'textarea', label: '① 최근에 "고맙다/미안하다"를 들은 경험은?', placeholder: '사건 → 느낀점 → 배운점 → SSIT에서의 적용' },
          { id: 'q_self_2', kind: 'textarea', label: '② 최근 정말 힘들었던 일은? 어떻게 버텼나?', placeholder: '원인 · 대처 · 결과 · 배운 점' },
          { id: 'q_self_3', kind: 'textarea', label: '③ 본인이 가장 잘했던 점 / 부족했던 점은?', placeholder: '강점은 근거와 사례로, 약점은 개선 계획까지' },
          { id: 'q_self_4', kind: 'textarea', label: '④ 진급이 빠른 이유가 뭐라고 생각하나?', placeholder: '성과 지표/행동/피드백 근거 중심' },
          { id: 'q_self_5', kind: 'textarea', label: '⑤ (필기) 어떤 과목을 잘 봤고, 왜 그렇게 생각하나?', placeholder: '근거: 난이도, 시간관리, 사전 준비, 오답률 등' },
          { id: 'q_self_6', kind: 'textarea', label: '⑥ 작년에 떨어진 이유가 뭐라고 보나? 올해는 무엇이 달라졌나?', placeholder: '원인 분석 → 구체적 보완 → 결과 변화' },
        ],
      },
      {
        title: '학업 관련',
        fields: [
          { id: 'q_study_1', kind: 'textarea', label: '① 합격하면 하루에 얼마나, 어떻게 공부할 건가?', placeholder: '예: 평일 3h/주말 6h, 과목별 루틴, 주간 피드백 방식' },
          { id: 'q_study_2', kind: 'textarea', label: '② 하루 8시간 이상 공부가 가능한가? 가능하게 만드는 방법은?', placeholder: '시간 블록킹, 휴식/집중 사이클, 방해 요인 차단' },
          { id: 'q_study_3', kind: 'textarea', label: '③ SSIT 수업이 어렵다면 어떤 방식으로 극복할 건가?', placeholder: '스터디, 튜터링, 복습 체계, 질의관리(질문 로그)' },
          { id: 'q_study_4', kind: 'textarea', label: '④ 상위 1%에 들기 위한 학업 전략은?', placeholder: '학습 KPI, 주간/월간 점검, 모의고사/피어리뷰' },
          { id: 'q_study_5', kind: 'textarea', label: '⑤ 수학/물리/화학 중 가장 쉬운 과목과 어려운 과목은? 이유는?', placeholder: '강점/약점 분석 + 보완 계획' },
          { id: 'q_study_6', kind: 'textarea', label: '⑥ (학부과정) 싫어하는 과목이 있으면 어떻게 공부할 건가?', placeholder: '학습전략 전환(문제 유형/개념 우선/튜터링 등)' },
          { id: 'q_study_7', kind: 'textarea', label: '⑦ 석사까지 계획이 있다고 했는데, 스스로 학업 수행이 가능하다고 보는 근거는?', placeholder: '성취 경험, 루틴, 주변 자원 활용 계획' },
        ],
      },
      {
        title: '직무/공정 관련',
        callout: {
          tone: 'info',
          text: '아래 질문은 본인의 직무/라인/설비에 따라 달라질 수 있습니다. 실제 담당 공정/장비 기준으로 정의 → 목적/원리 → 체크 포인트 → 현장 사례 순으로 정리하세요.',
        },
        fields: [
          { id: 'q_job_1', kind: 'textarea', label: '① PM/BM 이후 설비 사용 전 확인 사항(예: Particle Check 등)은?', placeholder: '체크 항목 목록 + 왜 중요한지 + 불량/리스크 연결' },
          { id: 'q_job_2', kind: 'textarea', label: '② 안정적인 전원공급이란 무엇인가? 현장에서 왜 중요한가?', placeholder: '정의/지표, 장애 시 영향, 모니터링/이중화/대응절차' },
          { id: 'q_job_3', kind: 'textarea', label: '③ R축이 무엇인가? 본인 업무와의 관련은?', placeholder: '기계축/로봇/정렬 맥락 + 안전/정확도 관점' },
          { id: 'q_job_4', kind: 'textarea', label: '④ 멀티홀 노즐 아이디어는 본인 아이디어인가? Nozzle 평가에 어떤 기여를 했나?', placeholder: '문제 정의 → 아이디어 → 실험/평가 → 성과/시사점' },
          { id: 'q_job_5', kind: 'textarea', label: '⑤ 디퓨전 외에 다른 공정에 대해 아는 것이 있는가?', placeholder: '대표 공정 1~2개 선택, 핵심 원리/변수/이슈' },
          { id: 'q_job_6', kind: 'textarea', label: '⑥ 스마트 팩토리를 위해 현재 무엇을 하고 있는가?', placeholder: '데이터 수집/모델링/자동화/표준화 사례' },
        ],
      },
      {
        title: '상황 대응형',
        fields: [
          { id: 'q_sit_1', kind: 'textarea', label: '① 상사가 불합리한 지시를 하면 어떻게 대응할 건가?', placeholder: '배경 파악 → 대안 제시 → 결정 존중 → 사후 개선 제안' },
          { id: 'q_sit_2', kind: 'textarea', label: '② 올해 떨어지면 어떻게 할 건가? 팀에서 다음 해 선발이 어렵다면?', placeholder: '재도전 로드맵, 팀/조직과의 조율, 대안 플랜' },
          { id: 'q_sit_3', kind: 'textarea', label: '③ 동료가 불성실하면 어떻게 할 건가?', placeholder: '사실/행동 피드백 → 역할 재조정 → 리스크 관리' },
          { id: 'q_sit_4', kind: 'textarea', label: '④ 학부 과정에서 유혹/방해 요소를 어떻게 이길 건가?', placeholder: '환경 설계, 루틴, 책임 파트너/스터디 운영' },
          { id: 'q_sit_5', kind: 'textarea', label: '⑤ 면접 마지막, 하고 싶은 말', placeholder: '핵심 메시지 한 문장 + 다짐' },
        ],
      },
      {
        title: '가치관/포부형',
        fields: [
          { id: 'q_val_1', kind: 'textarea', label: '① 기업의 사회적 가치는 무엇이라 생각하나?', placeholder: '고객/구성원/환경/지역사회 관점 + 본인 기여 연결' },
          { id: 'q_val_2', kind: 'textarea', label: '② SSIT에 반도체공학과가 필요한 이유는?', placeholder: '산업 수요/현장-학문 연결/인재 양성 관점' },
          { id: 'q_val_3', kind: 'textarea', label: '③ 졸업 후 커리어 패스(현업 복귀 포함)는?', placeholder: '단·중·장기 목표 + 역량/성과 지표' },
          { id: 'q_val_4', kind: 'textarea', label: '④ 교수님들께 질문하고 싶은 것이 있는가?', placeholder: '커리큘럼/연구/현장 연계/학습지원 등 1~2개 핵심 질문' },
          { id: 'q_val_5', kind: 'textarea', label: '⑤ 본인의 가치관은 무엇인가?', placeholder: '의사결정 원칙, 협업 태도, 윤리/안전 기준' },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────
  {
    id: 'application',
    short: '지원서 문항',
    title: 'PART 5. 입학지원서 핵심 문항 (500자 이내)',
    intro:
      '실제 제출 문항(5~7번)을 단계별로 나누어 생각을 정리할 수 있도록 구성했습니다. 각 단계는 최종 500자 본문을 완성하기 위한 사전 정리용 가이드입니다.',
    blocks: [
      {
        title: '5) 전공-업무 연관성과 활용 계획',
        fields: [
          { id: 'a5_1', kind: 'textarea', label: '① 현재 본인의 담당 업무 또는 주요 공정은?', placeholder: '예: Etch 공정의 Recipe 유지보수 및 Particle 모니터링 담당' },
          { id: 'a5_2', kind: 'textarea', label: '② 해당 업무와 관련된 SSIT 전공 분야는?', placeholder: '예: 반도체공정개론 / 공정제어 / 재료물리 등' },
          { id: 'a5_3', kind: 'textarea', label: '③ 학부 과정을 통해 배우고 싶은 지식/기술은?', placeholder: '예: 공정 조건별 변수 제어 이론, 데이터 기반 공정 안정화 기법' },
          { id: 'a5_4', kind: 'textarea', label: '④ 배운 내용을 어떻게 현장에 적용할 계획인가요?', placeholder: '예: 수율 향상을 위한 공정변수 분석 자동화, 공정 표준화 시스템 구축' },
          { id: 'a5_final', kind: 'textarea', label: '⑤ 위 내용을 요약하여 500자 본문으로 정리', placeholder: '전공-업무 연관성과 활용 계획을 500자 이내로 작성', maxLength: 500 },
        ],
      },
      {
        title: '6) 가장 임팩트 있었던 경력/성과',
        fields: [
          { id: 'a6_1', kind: 'textarea', label: '① 문제 상황 또는 개선 대상은 무엇이었나요?', placeholder: '예: 포토공정에서 PR 잔사로 인한 불량률 급증' },
          { id: 'a6_2', kind: 'textarea', label: '② 원인 분석 및 본인이 수행한 역할은?', placeholder: '예: 불량 Sample 분석 / 공정 Recipe 조정 / 데이터 트렌드 분석' },
          { id: 'a6_3', kind: 'textarea', label: '③ 개선 과정에서의 주요 시도 또는 아이디어는?', placeholder: '예: PR Bake 온도 구간별 테스트 및 Step별 Particle Count 비교' },
          { id: 'a6_4', kind: 'textarea', label: '④ 결과(성과 수치나 변화)는 무엇이었나요?', placeholder: '예: 불량률 27% → 8%로 감소, 재발 방지 매뉴얼화' },
          { id: 'a6_5', kind: 'textarea', label: '⑤ 이 경험을 통해 배운 점은?', placeholder: '예: 문제 해결에는 데이터 기반 협업과 소통이 중요함을 깨달음' },
          { id: 'a6_final', kind: 'textarea', label: '⑥ 위 내용을 요약하여 500자 본문으로 정리', placeholder: '임팩트 있었던 경력/성과를 500자 이내로 작성', maxLength: 500 },
        ],
      },
      {
        title: '7) 지원동기 (각오/목표)',
        fields: [
          { id: 'a7_1', kind: 'textarea', label: '① SSIT에 지원하게 된 계기 또는 계열 선택 이유는?', placeholder: '예: 현장 경험을 이론으로 확장하고 싶다는 열망' },
          { id: 'a7_2', kind: 'textarea', label: '② 입학 후 가장 이루고 싶은 목표는?', placeholder: '예: 반도체공정의 전반적 이해 / 학업 상위 10% 달성' },
          { id: 'a7_3', kind: 'textarea', label: '③ SSIT에서 배우고 싶은 분야나 과목은?', placeholder: '예: 반도체소자, 공정제어, 나노소자 실험 등' },
          { id: 'a7_4', kind: 'textarea', label: '④ 졸업 후 커리어 방향은?', placeholder: '예: 공정전문 엔지니어 → 라인리더 → 생산혁신팀 기술기획' },
          { id: 'a7_5', kind: 'textarea', label: '⑤ 학업과 일을 병행하며 어떤 자세로 임할 건가요?', placeholder: '예: 주말 학습 루틴과 자기 피드백 기록을 통한 지속적 성장' },
          { id: 'a7_final', kind: 'textarea', label: '⑥ 위 내용을 요약하여 500자 본문으로 정리', placeholder: '지원동기와 각오/목표를 500자 이내로 작성', maxLength: 500 },
        ],
      },
      {
        title: '핵심 키워드 정리',
        description: '작성한 세 문항을 요약하는 핵심 키워드를 3~5개 뽑아보세요. 쉼표(,)로 구분 — 나중에 면접 답변 키워드로도 활용됩니다.',
        fields: [
          { id: 'a_keywords', kind: 'text', label: '핵심 키워드', placeholder: '예: 현장문제해결, 데이터기반사고, 공정전문가, 상위1%' },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────
  {
    id: 'mock',
    short: '모의면접',
    title: 'PART 6. 모의면접 체크리스트',
    intro: '거울 앞이나 스터디 파트너와 함께 점검하세요. 각 항목에 코멘트를 남겨 두면 다음 연습 때 비교할 수 있습니다.',
    blocks: [
      {
        fields: [
          { id: 'mock_eye', kind: 'checkbox', label: '시선 처리', notePlaceholder: '예: 좌우 3점 시선 배분' },
          { id: 'mock_speech', kind: 'checkbox', label: '말속도/발음', notePlaceholder: '예: 1분에 130~150자' },
          { id: 'mock_gesture', kind: 'checkbox', label: '손 제스처', notePlaceholder: '예: 핵심에서만 사용' },
          { id: 'mock_posture', kind: 'checkbox', label: '표정/자세', notePlaceholder: '예: 어깨 펴고 미소' },
          { id: 'mock_logic', kind: 'checkbox', label: '답변의 논리', notePlaceholder: '사건 → 느낀점 → 배운점' },
          { id: 'mock_unknown', kind: 'checkbox', label: '모르는 질문 대처', notePlaceholder: '인정 → 보완계획 제시' },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────────
  {
    id: 'dday',
    short: '하루 전 점검',
    title: 'PART 7. 면접 하루 전 점검',
    blocks: [
      {
        fields: [
          { id: 'dday_rehearsal', kind: 'checkbox', label: 'PPT 3분 리허설' },
          { id: 'dday_improv', kind: 'checkbox', label: '예상 질문 5개 즉흥 답변' },
          { id: 'dday_items', kind: 'checkbox', label: '복장/명찰/준비물 체크' },
          { id: 'dday_route', kind: 'checkbox', label: '면접장 동선 파악' },
          { id: 'dday_affirm', kind: 'checkbox', label: '"나는 준비된 사람이다" 자기 암시' },
        ],
      },
      {
        title: '면접 당일 나에게 하고 싶은 한마디',
        fields: [
          {
            id: 'dday_note',
            kind: 'textarea',
            label: '한마디',
            placeholder: '예) 침착하게, 또박또박. 나는 준비됐다.',
          },
        ],
        callout: {
          tone: 'quote',
          text: '면접은 실력을 증명하는 자리가 아니라, 여러분이 얼마나 꾸준히 성장해온 사람인지를 보여주는 자리입니다. 여러분은 이미 여기까지 왔습니다. 이제 보여주기만 하면 됩니다.',
        },
      },
    ],
  },
];

/** 모든 입력 필드 (진행률·내보내기용) */
export function getAllFields(): Array<WorkbookField & { partId: string; partTitle: string; blockTitle?: string }> {
  const out: Array<WorkbookField & { partId: string; partTitle: string; blockTitle?: string }> = [];
  for (const part of INTERVIEW_WORKBOOK) {
    for (const block of part.blocks) {
      for (const f of block.fields || []) {
        out.push({ ...f, partId: part.id, partTitle: part.title, blockTitle: block.title });
      }
    }
  }
  return out;
}

/** 체크리스트의 메모 입력 키 */
export const noteKey = (fieldId: string) => `${fieldId}__note`;
