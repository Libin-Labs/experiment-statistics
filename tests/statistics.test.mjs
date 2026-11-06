import test from 'node:test';
import assert from 'node:assert/strict';
import {
  StatisticsError,
  adjustPValues,
  compareProportions,
  wilsonInterval,
} from '../dist/esm/index.js';

test('Wilson interval for the sample proportion matches its known 95% oracle', () => {
  const result = wilsonInterval(50, 100);
  assert.equal(result.estimate, 0.5);
  assert.ok(Math.abs(result.lower - 0.4038315) < 1e-6);
  assert.ok(Math.abs(result.upper - 0.5961685) < 1e-6);
});

test('two-proportion pooled z test returns expected effect, statistic and p-value', () => {
  const result = compareProportions(50, 100, 60, 100);
  assert.ok(Math.abs(result.difference - 0.1) < 1e-12);
  assert.ok(Math.abs(result.zStatistic - 1.421338109) < 1e-7);
  assert.ok(Math.abs(result.pValue - 0.1555) < 0.001);
  assert.ok(result.confidenceInterval.lower < 0.1);
  assert.ok(result.confidenceInterval.upper > 0.1);
});

test('all-success and all-failure intervals remain bounded and non-degenerate', () => {
  const successes = wilsonInterval(5, 5);
  const failures = wilsonInterval(0, 5);
  assert.equal(successes.upper, 1);
  assert.ok(successes.lower < 1);
  assert.equal(failures.lower, 0);
  assert.ok(failures.upper > 0);
});

test('equal zero-variance samples produce no observed difference', () => {
  const result = compareProportions(0, 10, 0, 10);
  assert.equal(result.zStatistic, 0);
  assert.equal(result.pValue, 1);
});

test('Bonferroni and Holm adjustments preserve input order and cap at one', () => {
  assert.deepEqual(adjustPValues([0.01, 0.04, 0.03], 'bonferroni'), [0.03, 0.12, 0.09]);
  assert.deepEqual(adjustPValues([0.01, 0.04, 0.03]), [0.03, 0.06, 0.06]);
  assert.deepEqual(adjustPValues([0.9, 0.8], 'bonferroni'), [1, 1]);
  assert.deepEqual(adjustPValues([], 'holm'), []);
});

test('count, confidence, p-value, and method validation reject invalid inputs', () => {
  assert.throws(() => wilsonInterval(2, 1), StatisticsError);
  assert.throws(() => wilsonInterval(1, 1, 1), StatisticsError);
  assert.throws(() => compareProportions(1, 2, 2, 1), StatisticsError);
  assert.throws(() => adjustPValues([1.1]), StatisticsError);
  assert.throws(() => adjustPValues([0.1], 'unknown'), StatisticsError);
  const sparse = [0.1, 0.2];
  delete sparse[0];
  assert.throws(() => adjustPValues(sparse), StatisticsError);
});
