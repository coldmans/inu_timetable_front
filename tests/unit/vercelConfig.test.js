import assert from 'node:assert/strict';
import test from 'node:test';

import { config } from '../../vercel.mjs';

test('Vercel CSP permits the GA4 tag and collection endpoints', () => {
  const csp = config.headers
    .flatMap(rule => rule.headers)
    .find(header => header.key === 'Content-Security-Policy')
    ?.value;

  assert.ok(csp);
  assert.match(csp, /script-src[^;]*https:\/\/www\.googletagmanager\.com/);
  assert.match(csp, /img-src[^;]*https:\/\/\*\.google-analytics\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/\*\.google-analytics\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/\*\.analytics\.google\.com/);
});
