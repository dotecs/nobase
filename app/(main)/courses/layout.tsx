import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Course detail, pricing and free lesson pages already generate branded titles.
// Keep those implementations intact without appending the root suffix again.
export const metadata: Metadata = {
  title: { absolute: '노베이스구조대 — 기초부터, 가능성까지.', template: '%s' },
};

export default function CoursesLayout({ children }: { children: ReactNode }) {
  return children;
}
