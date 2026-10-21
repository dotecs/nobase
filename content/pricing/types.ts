export interface PricingPlan {
  match: string;
  eyebrow: string;
  name: string;
  tagline: string;
  icon: string;
  features: { text: string; emphasis?: boolean }[];
  highlight?: boolean;
}

export interface PricingContent {
  hero: { title: [string, string]; subtitle: string; brandImage: string; background: string };
  plans: PricingPlan[];
  commonBenefits: { title: string; subtitle: string; items: { icon: string; title: string; description: string }[] };
  footnote?: string;
}
