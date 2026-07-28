import assert from 'node:assert/strict';
import test from 'node:test';
import { formatUtcDateTimeInKorea } from '../../src/utils/dateTime.js';

test('시간대 없는 서버 UTC 시각을 한국시간으로 변환한다', () => {
  assert.equal(
    formatUtcDateTimeInKorea('2026-07-28T18:09:24.305678'),
    '2026.07.29 03:09',
  );
});

test('시간대가 명시된 시각도 한국시간으로 표시한다', () => {
  assert.equal(
    formatUtcDateTimeInKorea('2026-07-28T18:09:24Z'),
    '2026.07.29 03:09',
  );
  assert.equal(
    formatUtcDateTimeInKorea('2026-07-28T18:09:24+09:00'),
    '2026.07.28 18:09',
  );
});

test('잘못된 시각은 빈 문자열로 처리한다', () => {
  assert.equal(formatUtcDateTimeInKorea('잘못된 시각'), '');
});
