import { createSeededRandom, hashStringSeed, randomInt, shuffle } from './SeededRandom';

describe('SeededRandom', () => {
  describe('hashStringSeed', () => {
    it('returns the same 32-bit unsigned integer for the same string', () => {
      const hash1 = hashStringSeed('game-seed-123');
      const hash2 = hashStringSeed('game-seed-123');
      expect(hash1).toBe(hash2);
      expect(hash1).toBeGreaterThanOrEqual(0);
      expect(hash1).toBeLessThanOrEqual(0xffffffff);
    });

    it('returns different hashes for different strings', () => {
      const hash1 = hashStringSeed('seed-alpha');
      const hash2 = hashStringSeed('seed-beta');
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string without throwing', () => {
      const hash = hashStringSeed('');
      expect(typeof hash).toBe('number');
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createSeededRandom', () => {
    it('returns pseudo-random floats in the interval [0, 1)', () => {
      const rng = createSeededRandom(42);
      for (let i = 0; i < 50; i += 1) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('produces the exact same sequence for identical numeric seeds', () => {
      const rng1 = createSeededRandom(12345);
      const rng2 = createSeededRandom(12345);

      const seq1 = Array.from({ length: 20 }, () => rng1());
      const seq2 = Array.from({ length: 20 }, () => rng2());

      expect(seq1).toEqual(seq2);
    });

    it('produces the exact same sequence for identical string seeds', () => {
      const rng1 = createSeededRandom('among-us-match-42');
      const rng2 = createSeededRandom('among-us-match-42');

      const seq1 = Array.from({ length: 20 }, () => rng1());
      const seq2 = Array.from({ length: 20 }, () => rng2());

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequences for different seeds', () => {
      const rng1 = createSeededRandom(100);
      const rng2 = createSeededRandom(200);

      const seq1 = Array.from({ length: 10 }, () => rng1());
      const seq2 = Array.from({ length: 10 }, () => rng2());

      expect(seq1).not.toEqual(seq2);
    });

    it('handles seed value 0 gracefully', () => {
      const rng = createSeededRandom(0);
      const val = rng();
      expect(typeof val).toBe('number');
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    });
  });

  describe('randomInt', () => {
    it('returns integers within [min, max] inclusive', () => {
      const rng = createSeededRandom('test-int');
      for (let i = 0; i < 100; i += 1) {
        const val = randomInt(5, 12, rng);
        expect(Number.isInteger(val)).toBe(true);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(12);
      }
    });

    it('throws if min > max', () => {
      expect(() => randomInt(10, 5)).toThrow('min (10) cannot be greater than max (5)');
    });

    it('returns min when min === max', () => {
      expect(randomInt(7, 7)).toBe(7);
    });

    it('produces deterministic output with seeded rng', () => {
      const rng1 = createSeededRandom(999);
      const rng2 = createSeededRandom(999);

      const res1 = Array.from({ length: 10 }, () => randomInt(1, 100, rng1));
      const res2 = Array.from({ length: 10 }, () => randomInt(1, 100, rng2));

      expect(res1).toEqual(res2);
    });
  });

  describe('shuffle', () => {
    it('does not mutate the original input array', () => {
      const original = ['p1', 'p2', 'p3', 'p4', 'p5'];
      const copy = [...original];
      shuffle(original, createSeededRandom(1));
      expect(original).toEqual(copy);
    });

    it('contains the exact same elements in the shuffled output', () => {
      const original = [1, 2, 3, 4, 5, 6, 7];
      const shuffled = shuffle(original, createSeededRandom(77));
      expect(shuffled).toHaveLength(original.length);
      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('produces the exact same permutation with identical seeds', () => {
      const items = ['a', 'b', 'c', 'd', 'e', 'f'];
      const shuf1 = shuffle(items, createSeededRandom('consistent-seed'));
      const shuf2 = shuffle(items, createSeededRandom('consistent-seed'));
      expect(shuf1).toEqual(shuf2);
    });

    it('produces different permutations with different seeds', () => {
      const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
      const shuf1 = shuffle(items, createSeededRandom(111));
      const shuf2 = shuffle(items, createSeededRandom(222));
      expect(shuf1).not.toEqual(shuf2);
    });

    it('handles empty and single-element arrays', () => {
      expect(shuffle([])).toEqual([]);
      expect(shuffle(['single'])).toEqual(['single']);
    });
  });
});
