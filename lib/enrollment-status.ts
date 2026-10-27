import type { EnrollmentStatus } from './database.types';

export const ENROLLMENT_STATUS_LABEL: Record<string, string> = {
  pending: '결제 중', paused: '입금 대기', active: '수강 중', on_hold: '일시정지', ended: '종료',
} satisfies Record<EnrollmentStatus, string>;

const transitions: Readonly<Record<string, readonly string[]>> = {
  active: ['on_hold', 'ended'], on_hold: ['active', 'ended'], ended: ['active'], paused: ['ended', 'active'],
};

export function canTransition(from: string, to: string): boolean {
  return Object.hasOwn(transitions, from) && transitions[from].includes(to);
}
