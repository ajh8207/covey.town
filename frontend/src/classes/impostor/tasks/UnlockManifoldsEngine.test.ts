import UnlockManifoldsEngine from './UnlockManifoldsEngine';

describe('UnlockManifoldsEngine', () => {
  let engine: UnlockManifoldsEngine;

  beforeEach(() => {
    engine = new UnlockManifoldsEngine();
  });
  /** tests that the engine starts with no progress */
  test('starts with no progress', () => {
    expect(engine.nextNumber).toBe(1);
    expect(engine.progress).toBe(0);
    expect(engine.isComplete()).toBe(false);
  });

  /** tests that the engine accepts numbers in ascending order */
  test('accepts numbers in ascending order', () => {
    for (let number = 1; number <= 5; number += 1) {
      expect(engine.selectNumber(number)).toBe(true);
    }

    expect(engine.nextNumber).toBe(6);
    expect(engine.progress).toBe(5);
    expect(engine.isComplete()).toBe(false);
  });

  /** tests that the engine completes after selecting numbers 1 through 10 */
  test('completes after numbers 1 through 10', () => {
    for (let number = 1; number <= 10; number += 1) {
      expect(engine.selectNumber(number)).toBe(true);
    }

    expect(engine.progress).toBe(10);
    expect(engine.isComplete()).toBe(true);
  });

  /** tests that the engine resets progress after an incorrect number */
  test('resets progress after an incorrect number', () => {
    engine.selectNumber(1);
    engine.selectNumber(2);

    expect(engine.selectNumber(5)).toBe(false);
    expect(engine.nextNumber).toBe(1);
    expect(engine.progress).toBe(0);
    expect(engine.isComplete()).toBe(false);
  });
  /** tests that the engine can be restarted after resetting */
  test('can restart after resetting', () => {
    engine.selectNumber(1);
    engine.reset();

    expect(engine.selectNumber(1)).toBe(true);
    expect(engine.progress).toBe(1);
  });

  /** tests that the engine does not accept more numbers after completion */
  test('does not accept more numbers after completion', () => {
    for (let number = 1; number <= 10; number += 1) {
      engine.selectNumber(number);
    }

    expect(engine.selectNumber(1)).toBe(false);
    expect(engine.isComplete()).toBe(true);
    expect(engine.progress).toBe(10);
  });
});
