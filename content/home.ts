export const home = {
  hero: {
    title: ['기초가 없어도,', '목표는 시작할 수 있으니까.'],
    description: ['입학 준비부터 대학 공부, 새로운 도전까지.', '나의 출발점에 맞는 배움을 찾아보세요.'],
    image: '/home/hero-scene.webp' as string | null, goalsTitle: '어떤 목표로 시작하시나요?',
    goals: [
      { label: 'SSIT 입학 준비', category: 'ssit-admission', image: '/home/goal-ssit.webp' as string | null },
      { label: '대학 학습', category: 'university', image: '/home/goal-university.webp' as string | null },
      { label: '편입 준비 · 준비 중', category: 'transfer', image: '/home/goal-transfer.webp' as string | null },
    ],
  },
  actions: { explore: '프로그램 둘러보기', consult: '학습 상담하기' },
  programs: {
    title: '지금의 목표에 맞는 프로그램', subtitle: '과정의 대상과 학습 내용을 살펴보고 선택하세요.',
    filterLabel: '프로그램 분류', more: '과정 자세히 보기', comingSoon: '개설 예정', enrolled: '수강중', curriculum: '내 커리큘럼',
    note: '새로운 학습 프로그램이 순차적으로 추가됩니다.', empty: '해당 분류의 프로그램이 아직 없습니다', reset: '필터 초기화',
    catalogTitle: '학습 프로그램',
  },
  how: {
    eyebrow: 'HOW WE LEARN', title: ['출발점은 달라도,', '기초부터 차근차근.'], description: '개념을 이해하고, 반복하며, 나의 것으로 만드는 학습.',
    steps: ['개념 이해', '반복 학습', '문제 적용', '질문과 점검'],
    card: { title: '이해하고 넘어가는 공부', description: '막막한 개념을 작은 단위로 나누어 학습합니다.' },
    guides: [
      { title: '목표에 맞는 커리큘럼', description: '각 과정의 학습 순서와 내용을 확인하세요.' },
      { title: '필요한 학습 지원', description: '질문·피드백 등 지원 범위는 과정별로 안내합니다.' },
    ],
    note: '실시간 강의와 개별 피드백 제공 여부는 프로그램 및 플랜에 따라 다릅니다.',
  },
  about: {
    title: ['배움의 시작에는,', '믿음이 필요합니다.'],
    values: [
      { label: 'Trust Myself', lines: ['나의 가능성을', '믿습니다.'] },
      { label: 'Trust Yourself', lines: ['당신의 성장을', '믿습니다.'] },
      { label: 'Trust Ourselves', lines: ['함께하는 힘을', '믿습니다.'] },
    ],
    cta: ['어디서 시작할지 막막하다면', '함께 방향을 찾아보세요.'],
  },
};
