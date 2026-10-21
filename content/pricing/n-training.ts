import { PricingContent } from './types';

const commonFeatures = [
  { text: '기본 개념 강의 + 개념 요약 PDF 교재' },
  { text: '등록일부터 시험 당일까지 이용' },
];

const training: PricingContent = {
  hero: {
    title: ['나에게 맞는', '트레이닝을 선택하세요'],
    subtitle: '기초부터 실전까지, 나에게 필요한 학습을 시작하세요.',
    brandImage: '/pricing/n-training/hero-brand.webp',
    background: '/pricing/n-training/hero-bg.webp',
  },
  plans: [
    {
      match: 'PREMIUM', checkoutUrl: 'https://smartstore.naver.com/mytouch/products/8483769139',
      eyebrow: 'PREMIUM TRAINING', name: '프리미엄 트레이닝',
      tagline: '더 많은 1:1 강의와 질문 지원이 필요하다면', icon: '/pricing/n-training/plan-premium.webp',
      features: [...commonFeatures, { text: '실시간 1:1 강의 무제한', emphasis: true }, { text: '실전모의고사 5회', emphasis: true }, { text: '개인별 맞춤 설명 영상 제공', emphasis: true }],
      highlight: true,
    },
    {
      match: 'STANDARD', checkoutUrl: 'https://smartstore.naver.com/mytouch/products/9883538891',
      eyebrow: 'STANDARD TRAINING', name: '스탠다드 트레이닝',
      tagline: '1:1 강의와 실전 연습을 함께 원한다면', icon: '/pricing/n-training/plan-standard.webp',
      features: [...commonFeatures, { text: '실시간 1:1 강의 20시간', emphasis: true }, { text: '실전모의고사 3회', emphasis: true }],
    },
    {
      match: 'BASIC', checkoutUrl: 'https://smartstore.naver.com/mytouch/products/9883546080',
      eyebrow: 'BASIC TRAINING', name: '기본 트레이닝',
      tagline: '기초부터 차근차근 시작하고 싶다면', icon: '/pricing/n-training/plan-basic.webp',
      features: [...commonFeatures, { text: '실전모의고사 1회', emphasis: true }],
    },
  ],
  commonBenefits: {
    title: '모든 플랜 공통', subtitle: '어떤 플랜을 선택하셔도, 아래의 혜택은 모두 포함됩니다.',
    items: [
      { icon: '/pricing/n-training/benefit-pdf.webp', title: '기본 개념 강의 + 개념 요약 PDF 교재', description: '탄탄한 개념 이해를 위한 핵심 강의와 요약 교재를 제공합니다.' },
      { icon: '/pricing/n-training/benefit-calendar.webp', title: '등록일부터 시험 당일까지 이용', description: '등록한 날부터 시험 당일까지 모든 콘텐츠를 이용할 수 있습니다.' },
      { icon: '/pricing/n-training/benefit-feedback.webp', title: '모의고사 응시권 + 1:1 피드백 + 해설강의', description: '실전 감각을 키우는 모의고사와 1:1 피드백, 상세한 해설강의를 제공합니다.' },
    ],
  },
  footnote: '※ 실시간 강의는 Zoom으로 진행 · 오전반 / 오후반 운영',
};

export default training;
