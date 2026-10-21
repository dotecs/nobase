export interface PricingPlan {
  match: string;
  eyebrow: string;
  name: string;
  tagline: string;
  icon: string;
  features: { text: string; emphasis?: boolean }[];
  highlight?: boolean;
  checkoutUrl?: string;   // 외부 결제 페이지(스마트스토어). 있으면 등록하기 버튼이 새 탭으로 이 링크를 연다
}

export interface PricingContent {
  hero: { title: [string, string]; subtitle: string; brandImage: string; background: string };
  plans: PricingPlan[];
  commonBenefits: { title: string; subtitle: string; items: { icon: string; title: string; description: string }[] };
  footnote?: string;
}
