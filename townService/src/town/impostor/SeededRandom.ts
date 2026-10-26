/**
 * Hashes an arbitrary string into a positive integer suitable for seeding a PRNG.
 *
 * Uses a polynomial rolling hash that avoids bitwise operators to satisfy linter rules.
 *
 * @param str Input string seed
 * @returns Positive integer seed in the range [1, 2147483646]
 */
export function hashStringSeed(str: string): number {
  const m = 2147483647;
  let hash = 1779033703;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % m;
  }
  const result = Math.abs(hash);
  return result === 0 ? 1 : result;
}

/**
 * Creates a deterministic pseudo-random number generator using the Lehmer / Park-Miller algorithm.
 *
 * Uses standard arithmetic without bitwise operators to satisfy project linter rules,
 * with full 64-bit float precision well within JavaScript's Number.MAX_SAFE_INTEGER.
 *
 * @param seed A number or string used to initialize the generator
 * @returns A function that returns pseudo-random floats in the half-open interval [0, 1)
 * @throws Error if numeric seed is NaN or Infinity
 */
export function createSeededRandom(seed: number | string): () => number {
  if (typeof seed === 'number' && !Number.isFinite(seed)) {
    throw new Error(`Invalid seed: ${seed}. Seed must be a finite number or a string.`);
  }

  const m = 2147483647;
  const a = 16807;

  let state = typeof seed === 'number' ? Math.floor(Math.abs(seed)) % m : hashStringSeed(seed);

  if (state === 0) {
    state = 12345;
  }

  // Discard initial iterations to eliminate low-value output correlation for small sequential seeds
  for (let i = 0; i < 5; i += 1) {
    state = (state * a) % m;
  }

  return function nextRandom(): number {
    state = (state * a) % m;
    return (state - 1) / (m - 1);
  };
}

/**
 * Returns a random integer in the closed interval [min, max] inclusive using the given RNG.
 *
 * @param min Minimum integer (inclusive)
 * @param max Maximum integer (inclusive)
 * @param rng Random number generator returning [0, 1). Defaults to Math.random
 * @returns Random integer between min and max inclusive
 */
export function randomInt(min: number, max: number, rng: () => number = Math.random): number {
  const floorMin = Math.ceil(min);
  const floorMax = Math.floor(max);
  if (floorMin > floorMax) {
    throw new Error(`min (${min}) rounded up exceeds max (${max}) rounded down`);
  }
  return Math.floor(rng() * (floorMax - floorMin + 1)) + floorMin;
}

/**
 * Returns a new array with elements shuffled using the Fisher-Yates algorithm.
 *
 * @param array The array to shuffle (input array is not mutated)
 * @param rng Random number generator returning [0, 1). Defaults to Math.random
 * @returns A newly allocated array with elements in shuffled order
 */
export function shuffle<T>(array: ReadonlyArray<T>, rng: () => number = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}
