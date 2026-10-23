export type ProgramCategory = 'ssit-admission' | 'university' | 'transfer';
export type ProgramStatus = 'open' | 'closed' | 'comingSoon';
export interface ProgramEntry {
  slug: string;
  title: string;
  category: ProgramCategory;
  audience: string;
  summary: string;
  thumbnail: string | null;
  sortOrder: number;
  comingSoon?: true;
}
export const programs: ProgramEntry[] = [
  { slug: 'n-training', title: '뇌지컬 트레이닝', category: 'ssit-admission', audience: 'SSIT 입학 준비', summary: '수학·물리·화학의 기초부터 차근차근', thumbnail: '/programs/n-training.webp', sortOrder: 1 },
  { slug: 'n-campus-math', title: '뇌지컬 캠퍼스 수학', category: 'university', audience: 'SSIT 재학생을 위한 대학 수학', summary: '대학 공부의 기초를 탄탄하게', thumbnail: '/programs/n-campus-math.webp', sortOrder: 2 },
  { slug: 'transfer-math', title: '편입수학', category: 'transfer', audience: '새로운 목표를 위한 수학 학습', summary: '커리큘럼과 개설 일정은 추후 안내합니다.', thumbnail: '/programs/transfer-math.webp', sortOrder: 3, comingSoon: true },
];
export const programCategories: { id: ProgramCategory | 'all'; label: string }[] = [
  { id: 'all', label: '전체' }, { id: 'ssit-admission', label: 'SSIT 입학 준비' }, { id: 'university', label: '대학 학습' }, { id: 'transfer', label: '편입 준비' },
];
export function normalizeCategory(value?: string | null): ProgramCategory | 'all' {
  return programCategories.find(category => category.id === value)?.id ?? 'all';
}
