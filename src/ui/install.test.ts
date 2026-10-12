import { test } from 'node:test';
import assert from 'node:assert/strict';
import { needsHomeScreenHint } from './install.ts';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

test('the hint shows in an iPhone or iPad browser tab, not once installed', () => {
  assert.equal(needsHomeScreenHint({ userAgent: IPHONE, platform: 'iPhone', maxTouchPoints: 5, standalone: false }, false), true);
  assert.equal(needsHomeScreenHint({ userAgent: IPHONE, platform: 'iPhone', maxTouchPoints: 5, standalone: true }, false), false);
  assert.equal(needsHomeScreenHint({ userAgent: IPHONE, platform: 'iPhone', maxTouchPoints: 5 }, true), false);
  // iPads report themselves as a Mac with a touch screen.
  assert.equal(needsHomeScreenHint({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 5, standalone: false }, false), true);
});

test('the hint never shows on Android or a computer', () => {
  assert.equal(needsHomeScreenHint({ userAgent: ANDROID, platform: 'Linux armv8l', maxTouchPoints: 5 }, false), false);
  assert.equal(needsHomeScreenHint({ userAgent: MAC, platform: 'MacIntel', maxTouchPoints: 0 }, false), false);
});
