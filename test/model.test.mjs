import test from 'node:test';
import assert from 'node:assert/strict';
import { settings, yearAt, playback } from '../public/model.mjs';
const defaults = { principal: 100, rate: 10, years: 2 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

test('the core story: $100 → $110 → $121, including the $1 reward on interest', () => {
  near(yearAt(defaults, 0).balance, 100);
  near(yearAt(defaults, 1).balance, 110);
  const second = yearAt(defaults, 2);
  near(second.balance, 121); near(second.onSavings, 10); near(second.onInterest, 1); near(second.totalInterest, 21);
});
test('zero rate never creates interest or growth, including at 30 years', () => {
  for (let year = 0; year <= 30; year++) {
    const row = yearAt({ principal: 10000, rate: 0, years: 30 }, year);
    assert.equal(row.balance, 10000); assert.equal(row.onInterest, 0); assert.equal(row.onSavings, 0); assert.equal(row.totalInterest, 0);
  }
});
test('all supported years preserve the interest split and balance identity', () => {
  for (const principal of [10, 100, 123.45, 10000]) {
    for (const rate of [0, 0.1, 4.5, 10, 30]) {
      for (let year = 1; year <= 30; year++) {
        const row = yearAt({ principal, rate, years: 30 }, year);
        near(row.onSavings + row.onInterest, row.openingBalance * rate / 100);
        near(row.balance, row.openingBalance + row.earned);
        assert.ok(Number.isFinite(row.balance)); assert.ok(row.balance >= row.openingBalance);
      }
    }
  }
});
test('decimal rates retain precision through annual compounding', () => {
  const row = yearAt({ principal: 123.45, rate: 4.5, years: 12 }, 12);
  near(row.balance, 123.45 * 1.045 ** 12);
});
test('bad financial inputs and out-of-range years are rejected', () => {
  for (const patch of [{ principal: 0 }, { principal: Infinity }, { rate: -1 }, { rate: NaN }, { rate: 31 }, { years: 0 }, { years: 31 }, { years: 1.5 }]) assert.throws(() => settings({ ...defaults, ...patch }), RangeError);
  for (const year of [-1, 3, 0.5, NaN]) assert.throws(() => yearAt(defaults, year), RangeError);
});
test('playback stops at the final year, and replay starts from zero', () => {
  let state = playback({ year: 0, playing: false }, 'play', 2);
  state = playback(state, 'tick', 2); assert.deepEqual(state, { year: 1, playing: true });
  state = playback(state, 'tick', 2); assert.deepEqual(state, { year: 2, playing: false });
  assert.deepEqual(playback(state, 'tick', 2), state);
  assert.deepEqual(playback(state, 'replay', 2), { year: 0, playing: true });
  assert.deepEqual(playback(state, 'play', 2), { year: 0, playing: true });
});
test('pause, stepping, and settings reset cannot leave autoplay active', () => {
  const active = { year: 1, playing: true };
  assert.deepEqual(playback(active, 'pause', 2), { year: 1, playing: false });
  assert.deepEqual(playback(active, 'next', 2), { year: 2, playing: false });
  assert.deepEqual(playback(active, 'previous', 2), { year: 0, playing: false });
  assert.deepEqual(playback(active, 'reset', 2), { year: 0, playing: false });
  assert.deepEqual(playback({ year: 0, playing: false }, 'previous', 2), { year: 0, playing: false });
});
