import { expect, test } from 'vitest';
import { LEARN_MODULE_VERSION } from '@/lib/learn/version';

test('학습 모듈의 초기 버전은 0.1.0이다', () => {
  expect(LEARN_MODULE_VERSION).toBe('0.1.0');
});
