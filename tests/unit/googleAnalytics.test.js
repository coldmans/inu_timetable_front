import assert from 'node:assert/strict';
import test from 'node:test';

import {
  initializeGoogleAnalytics,
  normalizeMeasurementId,
  trackGoogleAnalyticsEvent,
} from '../../src/services/googleAnalytics.js';

function createFakeDocument() {
  const nodes = new Map();
  const appendedNodes = [];

  return {
    appendedNodes,
    createElement(tagName) {
      const node = { tagName };
      Object.defineProperty(node, 'dataset', {
        value: {},
        writable: false,
      });
      return node;
    },
    getElementById(id) {
      return nodes.get(id) || null;
    },
    head: {
      appendChild(node) {
        appendedNodes.push(node);
        nodes.set(node.id, node);
      },
    },
  };
}

test('normalizeMeasurementId accepts GA4 measurement IDs only', () => {
  assert.equal(normalizeMeasurementId(' g-test123456 '), 'G-TEST123456');
  assert.equal(normalizeMeasurementId('UA-123456-1'), null);
  assert.equal(normalizeMeasurementId(''), null);
  assert.equal(normalizeMeasurementId(undefined), null);
});

test('initializeGoogleAnalytics loads and configures the Google tag once', () => {
  const documentObject = createFakeDocument();
  const windowObject = {};

  assert.equal(initializeGoogleAnalytics({
    measurementId: 'G-TEST123456',
    windowObject,
    documentObject,
    now: () => new Date('2026-07-31T00:00:00.000Z'),
  }), true);
  assert.equal(initializeGoogleAnalytics({
    measurementId: 'G-TEST123456',
    windowObject,
    documentObject,
  }), true);

  assert.equal(documentObject.appendedNodes.length, 1);
  assert.equal(documentObject.appendedNodes[0].async, true);
  assert.equal(
    documentObject.appendedNodes[0].src,
    'https://www.googletagmanager.com/gtag/js?id=G-TEST123456',
  );
  assert.deepEqual(Array.from(windowObject.dataLayer[0]), [
    'js',
    new Date('2026-07-31T00:00:00.000Z'),
  ]);
  assert.deepEqual(Array.from(windowObject.dataLayer[1]), [
    'config',
    'G-TEST123456',
    {
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
    },
  ]);
});

test('initializeGoogleAnalytics stays disabled without a valid measurement ID', () => {
  const documentObject = createFakeDocument();
  const windowObject = {};

  assert.equal(initializeGoogleAnalytics({
    measurementId: 'not-an-id',
    windowObject,
    documentObject,
  }), false);
  assert.equal(windowObject.dataLayer, undefined);
});

test('trackGoogleAnalyticsEvent maps product events without sending labels', () => {
  const calls = [];
  const windowObject = {
    gtag(...args) {
      calls.push(args);
    },
  };

  assert.equal(trackGoogleAnalyticsEvent('SEARCH', windowObject), true);
  assert.equal(trackGoogleAnalyticsEvent('UNKNOWN', windowObject), false);
  assert.deepEqual(calls, [['event', 'course_search']]);
});
