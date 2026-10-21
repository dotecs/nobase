export const trainingLanding = {
  links: {
    pricing: '/courses/n-training/pricing', compare: '/courses/n-training/pricing#plans',
    freeLesson: (id: string) => `/courses/n-training/free/${id}`,
  },
  navigation: [
    { label: '과정 소개', href: '#overview' }, { label: '커리큘럼', href: '#curriculum' },
    { label: '학습 지원', href: '#support' }, { label: '플랜 안내', href: '#plans' },
  ],
  cta: { primary: '나에게 맞는 플랜 보기', free: '무료 기초 강의 보기', compare: '플랜별 지원 비교하기', header: '플랜 보기' },
  assets: { brand: '/pricing/n-training/hero-brand.webp', background: '/pricing/n-training/hero-bg.webp' },
  pendingLabel: (id: string) => `[ASSET-PENDING:${id}]`,
  hero: {
    eyebrow: '뇌지컬 트레이닝 100', title: ['SSIT 준비,', '기초부터 실전까지', '한 흐름으로.'],
    description: ['수학·물리·화학부터 면접까지.', '일과 공부를 병행하는 당신을 위한 온라인 학습 과정.'],
    evidence: [
      { title: '4개 영역', text: '수학 · 물리 · 화학 · 면접' },
      { title: '22주 커리큘럼', text: '기초 수학 2주 + 정규 과정 20주' },
      { title: '온라인 학습', text: '다양한 기기에서 수강' },
    ],
  },
  overview: {
    title: ['어디서 시작할지 막막했다면,', '학습 순서부터 정리하세요.'],
    questions: ['공부를 쉰 지 오래됐어요', '일과 병행할 수 있을까요?', '시험 범위가 너무 넓어요'],
    subtitle: 'SSIT 준비에 필요한 4개 영역',
    subjects: [
      { title: '수학', text: '기초 개념부터 차근차근', asset: 'M01-a' },
      { title: '물리', text: '원리를 이해하고 문제에 적용', asset: 'M01-b' },
      { title: '화학', text: '핵심 개념을 연결하는 학습', asset: 'M01-c' },
      { title: '면접', text: '면접 워크북으로 준비', asset: 'M01-d' },
    ],
    strip: '흩어진 준비를 하나의 학습 흐름으로.',
  },
  curriculum: {
    eyebrow: 'CURRICULUM', title: ['기초를 다지고,', '22주 학습의 흐름을 만드세요.'],
    description: '기초 수학 2주 + 정규 과정 20주 · 3회독 기준',
    timeline: [{ title: '기초 수학', duration: '2주' }, { title: '정규 과정', duration: '20주' }], total: '총 22주',
    steps: [
      { title: '개념 이해', text: '핵심 개념의 흐름을 잡고' },
      { title: '반복 학습', text: '다시 보며 빈틈을 채우고' },
      { title: '실전 점검', text: '문제로 이해도를 확인합니다' },
    ],
    note: '위 기간은 기존 안내의 3회독 기준이며, 개인의 학습 속도에 따라 달라질 수 있습니다.',
  },
  materials: {
    title: ['배운 내용을 정리하고,', '실전에서 확인하세요.'],
    description: '체계적인 학습 자료와 실전 모의고사로, 배움을 확실한 실력으로 만듭니다.',
    panels: [
      { label: '개념 요약 PDF', title: '복습할 때 필요한 핵심을 한곳에', text: '강의의 핵심 개념을 과목별로 정리한 요약 PDF 교재로, 학습 내용을 빠르고 효율적으로 복습할 수 있습니다.', asset: 'M05', caption: '학습 자료 구성 예시', items: ['수학', '물리', '화학'] },
      { label: '실전모의고사', title: '응시부터 해설과 피드백까지', text: '실전과 동일한 환경의 모의고사로 실력을 점검하고, 상세한 해설강의와 1:1 피드백으로 부족한 부분까지 짚어드립니다.', asset: 'M06', caption: '', items: ['모의고사 응시', '해설강의', '1:1 피드백'] },
    ], note: '모의고사 제공 횟수는 플랜에 따라 다릅니다.',
  },
  support: {
    title: ['혼자 막히는 순간,', '1:1로 이어지는 학습.'],
    description: ['등록 후 사이트에서 예약하고,', '실시간 강의로 궁금한 내용을 확인하세요.'],
    steps: [
      { title: '사이트에서 예약', text: '원하는 시간에 1:1 강의를 예약합니다.' },
      { title: 'Zoom 실시간 강의', text: '예약한 시간에 실시간으로 강의가 진행됩니다.' },
      { title: '질문하며 개념 확인', text: '궁금한 내용을 바로 질문하고 개념을 정확히 확인합니다.' },
    ], memo: '오전반 · 오후반 운영', caption: '이용 흐름 예시',
    plans: [
      { title: '스탠다드', icon: '/pricing/n-training/plan-standard.webp', text: '실시간 1:1 강의 20시간', features: ['등록 후 사이트에서 1:1 강의 예약', '실시간으로 궁금한 내용을 질문하고 개념 확인'] },
      { title: '프리미엄', icon: '/pricing/n-training/plan-premium.webp', text: '실시간 1:1 강의 무제한 + 개인별 맞춤 설명 영상 제공', features: ['등록 후 사이트에서 1:1 강의 예약', '실시간 강의 무제한 이용 + 개인별 맞춤 설명 영상'] },
    ], note: '※ 1:1 실시간 강의는 해당 혜택이 포함된 플랜에서 이용할 수 있습니다.',
  },
  instructor: {
    title: ['누가 안내하는지,', '어떤 경험이었는지 확인하세요.'], photoLabel: '강사 사진 영역',
    name: '한철민 강사', education: '성균관대학교 기계공학과 졸업', description: '수학·과학 학습을 안내합니다.',
    interviewsTitle: '합격생 인터뷰',
    interviews: ['72i-71vNbVc', 'xCwW3z3u2Q0', 'Id092xkPGgE'].map((id, index) => ({
      title: `합격생 인터뷰 ${String(index + 1).padStart(2, '0')}`,
      image: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, href: `https://www.youtube.com/watch?v=${id}`,
      alt: `합격생 인터뷰 ${String(index + 1).padStart(2, '0')} 영상 썸네일`,
    })),
    note: '개인정보 보호를 위해 일부 정보는 비공개됩니다. 기존 안내 기준, 유료 수강생에게 원본 영상을 공유합니다.',
  },
  plans: { title: ['필요한 지원만큼,', '나에게 맞는 플랜을 선택하세요.'], description: '기초부터 실전까지, 나에게 필요한 학습을 시작하세요.' },
  faq: {
    title: ['시작 전,', '궁금한 점을 확인하세요.'],
    items: [
      { q: '기초가 부족해도 시작할 수 있나요?', a: '기초 수학 2주 과정부터 학습을 시작할 수 있습니다.' },
      { q: '어떤 기기에서 수강할 수 있나요?', a: 'PC, 태블릿, 스마트폰 등 인터넷이 되는 기기에서 수강할 수 있습니다.' },
      { q: '실시간 1:1 강의는 어떻게 이용하나요?', a: '해당 혜택이 포함된 플랜(스탠다드·프리미엄)으로 등록한 뒤, 사이트에서 원하는 시간을 예약하고 Zoom으로 진행합니다. 오전반·오후반으로 운영됩니다.' },
      { q: '모의고사는 몇 회 제공되나요?', a: '베이직 1회, 스탠다드 3회, 프리미엄 5회입니다. 해설강의와 1:1 피드백이 함께 제공됩니다.' },
    ],
    closing: ['막막했던 SSIT 준비,', '첫 학습부터 시작해 보세요.'], description: '무료 기초 강의로 살펴보고, 필요한 플랜을 선택하세요.',
  },
};

const landing = {
  tagline: trainingLanding.hero.description.join(' '), audience: [], outcomes: [], body: [], testimonials: [], faq: [],
  redesign: trainingLanding,
};
export default landing;
