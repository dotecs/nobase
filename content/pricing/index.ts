import training from './n-training';
import { PricingContent } from './types';

const content: Record<string, PricingContent> = { 'n-training': training };

export function getPricingContent(slug: string): PricingContent | null {
  return Object.prototype.hasOwnProperty.call(content, slug) ? content[slug] : null;
}
