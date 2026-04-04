import { describe, it, expect, beforeEach } from "vitest";
import { JavaRandom, RandomSource } from "../random-source";

describe("JavaRandom", () => {
  describe("nextInt() with seed 12345", () => {
    it("produces a deterministic sequence matching the LCG algorithm", () => {
      const rng = new JavaRandom(12345n);
      const expected = [
        1553932502, -2090749135, -287790814, -355989640, -716867186,
        161804169, 1402202751, 535445604, 1011567003, 151766778,
      ];
      const actual: number[] = [];
      for (let i = 0; i < expected.length; i++) {
        actual.push(rng.nextInt());
      }
      expect(actual).toEqual(expected);
    });
  });

  describe("nextInt() with seed 0", () => {
    it("produces the exact same sequence as Java's java.util.Random", () => {
      const rng = new JavaRandom(0n);
      // These values match Java's java.util.Random with seed 0
      const expected = [
        -1155484576, -723955400, 1033096058, -1690734402, -1557280266,
        1327362106, -1930858313, 502539523, -1728529858, -938301587,
      ];
      const actual: number[] = [];
      for (let i = 0; i < expected.length; i++) {
        actual.push(rng.nextInt());
      }
      expect(actual).toEqual(expected);
    });
  });

  describe("nextInt(bound) with seed 42", () => {
    it("produces the correct bounded sequence", () => {
      const rng = new JavaRandom(42n);
      const expected = [30, 63, 48, 84, 70, 25, 5, 18, 19, 93];
      const actual: number[] = [];
      for (let i = 0; i < expected.length; i++) {
        actual.push(rng.nextInt(100));
      }
      expect(actual).toEqual(expected);
    });

    it("throws on non-positive bound", () => {
      const rng = new JavaRandom(1n);
      expect(() => rng.nextInt(0)).toThrow("bound must be positive");
      expect(() => rng.nextInt(-1)).toThrow("bound must be positive");
    });

    it("handles power-of-2 bounds correctly", () => {
      const rng = new JavaRandom(42n);
      const expected = [11, 0, 10, 0, 4, 15, 4, 11, 10, 1];
      const actual: number[] = [];
      for (let i = 0; i < expected.length; i++) {
        actual.push(rng.nextInt(16));
      }
      expect(actual).toEqual(expected);
    });

    it("bound of 1 always returns 0", () => {
      const rng = new JavaRandom(42n);
      for (let i = 0; i < 20; i++) {
        expect(rng.nextInt(1)).toBe(0);
      }
    });
  });

  describe("nextDouble() with seed 0", () => {
    it("produces the exact same sequence as Java", () => {
      const rng = new JavaRandom(0n);
      // Verified: these match Java's java.util.Random with seed 0
      const expected = [
        0.730967787376657,
        0.24053641567148587,
        0.6374174253501083,
        0.5504370051176339,
        0.5975452777972018,
      ];
      const actual: number[] = [];
      for (let i = 0; i < expected.length; i++) {
        actual.push(rng.nextDouble());
      }
      for (let i = 0; i < expected.length; i++) {
        expect(actual[i]).toBeCloseTo(expected[i], 14);
      }
    });

    it("always returns values in [0, 1)", () => {
      const rng = new JavaRandom(99n);
      for (let i = 0; i < 1000; i++) {
        const val = rng.nextDouble();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe("nextBoolean() with seed 12345", () => {
    it("produces a deterministic sequence", () => {
      const rng = new JavaRandom(12345n);
      const expected = [
        false, true, true, true, true,
        false, false, false, false, false,
      ];
      const actual: boolean[] = [];
      for (let i = 0; i < expected.length; i++) {
        actual.push(rng.nextBoolean());
      }
      expect(actual).toEqual(expected);
    });
  });

  describe("nextLong() with seed 12345", () => {
    it("produces the correct sequence", () => {
      const rng = new JavaRandom(12345n);
      const expected = [
        6674089278485672753n,
        -1236052130280241288n,
        -3078921119283744887n,
      ];
      const actual: bigint[] = [];
      for (let i = 0; i < expected.length; i++) {
        actual.push(rng.nextLong());
      }
      expect(actual).toEqual(expected);
    });
  });

  describe("nextFloat() with seed 12345", () => {
    it("produces the correct sequence", () => {
      const rng = new JavaRandom(12345n);
      const expected = [
        0.3618030548095703,
        0.5132095217704773,
        0.932993471622467,
        0.9171146750450134,
        0.8330913186073303,
      ];
      const actual: number[] = [];
      for (let i = 0; i < expected.length; i++) {
        actual.push(rng.nextFloat());
      }
      for (let i = 0; i < expected.length; i++) {
        expect(actual[i]).toBeCloseTo(expected[i], 7);
      }
    });

    it("always returns values in [0, 1)", () => {
      const rng = new JavaRandom(777n);
      for (let i = 0; i < 1000; i++) {
        const val = rng.nextFloat();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe("nextGaussian() with seed 12345", () => {
    it("produces deterministic gaussian values", () => {
      const rng = new JavaRandom(12345n);
      // nextGaussian generates two values at a time via Box-Muller
      const g1 = rng.nextGaussian();
      const g2 = rng.nextGaussian(); // cached nextNextGaussian
      expect(g1).toBeCloseTo(-0.187808989658912, 10);
      expect(g2).toBeCloseTo(0.5884363051154796, 10);
    });

    it("the second call returns the cached value, third call generates new pair", () => {
      const rng1 = new JavaRandom(42n);
      const rng2 = new JavaRandom(42n);

      // Both should produce identical sequences
      const g1a = rng1.nextGaussian();
      const g1b = rng1.nextGaussian();
      const g1c = rng1.nextGaussian();

      const g2a = rng2.nextGaussian();
      const g2b = rng2.nextGaussian();
      const g2c = rng2.nextGaussian();

      expect(g1a).toBe(g2a);
      expect(g1b).toBe(g2b);
      expect(g1c).toBe(g2c);
    });
  });

  describe("same seed produces identical sequences", () => {
    it("two instances with same seed produce identical nextInt() sequences", () => {
      const rng1 = new JavaRandom(9999n);
      const rng2 = new JavaRandom(9999n);
      for (let i = 0; i < 100; i++) {
        expect(rng1.nextInt()).toBe(rng2.nextInt());
      }
    });

    it("two instances with same seed produce identical nextDouble() sequences", () => {
      const rng1 = new JavaRandom(42n);
      const rng2 = new JavaRandom(42n);
      for (let i = 0; i < 50; i++) {
        expect(rng1.nextDouble()).toBe(rng2.nextDouble());
      }
    });

    it("two instances with same seed produce identical mixed-method sequences", () => {
      const rng1 = new JavaRandom(777n);
      const rng2 = new JavaRandom(777n);
      for (let i = 0; i < 20; i++) {
        expect(rng1.nextInt()).toBe(rng2.nextInt());
        expect(rng1.nextDouble()).toBe(rng2.nextDouble());
        expect(rng1.nextBoolean()).toBe(rng2.nextBoolean());
        expect(rng1.nextLong()).toBe(rng2.nextLong());
        expect(rng1.nextFloat()).toBe(rng2.nextFloat());
      }
    });
  });

  describe("setSeed resets the sequence", () => {
    it("calling setSeed produces the same sequence from scratch", () => {
      const rng = new JavaRandom(42n);
      const first: number[] = [];
      for (let i = 0; i < 10; i++) {
        first.push(rng.nextInt());
      }
      rng.setSeed(42n);
      const second: number[] = [];
      for (let i = 0; i < 10; i++) {
        second.push(rng.nextInt());
      }
      expect(first).toEqual(second);
    });

    it("setSeed clears the cached gaussian", () => {
      const rng = new JavaRandom(42n);
      rng.nextGaussian(); // generates pair, caches second
      rng.setSeed(42n); // should clear cached value
      const g1 = rng.nextGaussian();
      const rng2 = new JavaRandom(42n);
      const g2 = rng2.nextGaussian();
      expect(g1).toBe(g2);
    });
  });

  describe("nextBytes", () => {
    it("fills a byte array deterministically", () => {
      const rng1 = new JavaRandom(100n);
      const rng2 = new JavaRandom(100n);
      const bytes1 = new Uint8Array(20);
      const bytes2 = new Uint8Array(20);
      rng1.nextBytes(bytes1);
      rng2.nextBytes(bytes2);
      expect(bytes1).toEqual(bytes2);
    });

    it("produces correct values for seed 0", () => {
      const rng = new JavaRandom(0n);
      const bytes = new Uint8Array(4);
      rng.nextBytes(bytes);
      // nextInt() with seed 0 first call = -1155484576 = 0xBB20B460
      // bytes extracted LSB first: 0x60, 0xB4, 0x20, 0xBB
      expect(Array.from(bytes)).toEqual([96, 180, 32, 187]);
    });

    it("handles lengths not divisible by 4", () => {
      const rng1 = new JavaRandom(0n);
      const rng2 = new JavaRandom(0n);
      const bytes5 = new Uint8Array(5);
      const bytes8 = new Uint8Array(8);
      rng1.nextBytes(bytes5);
      rng2.nextBytes(bytes8);
      // First 4 bytes from first nextInt() should match
      expect(bytes5[0]).toBe(bytes8[0]);
      expect(bytes5[1]).toBe(bytes8[1]);
      expect(bytes5[2]).toBe(bytes8[2]);
      expect(bytes5[3]).toBe(bytes8[3]);
    });
  });

  describe("large bounds", () => {
    it("nextInt with large non-power-of-2 bound stays in range", () => {
      const rng = new JavaRandom(42n);
      const bound = 1000000007;
      for (let i = 0; i < 50; i++) {
        const val = rng.nextInt(bound);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(bound);
      }
    });
  });

  describe("no-arg constructor", () => {
    it("creates a working RNG without specifying a seed", () => {
      const rng = new JavaRandom();
      // Should produce valid integers without throwing
      const val = rng.nextInt();
      expect(typeof val).toBe("number");
      expect(Number.isInteger(val)).toBe(true);
    });
  });
});

describe("RandomSource", () => {
  beforeEach(() => {
    RandomSource.reset();
  });

  it("seed() and nextIntUnbounded() produce deterministic results", () => {
    RandomSource.seed(12345n);
    const val1 = RandomSource.nextIntUnbounded();
    RandomSource.seed(12345n);
    const val2 = RandomSource.nextIntUnbounded();
    expect(val1).toBe(val2);
  });

  it("instance() delegates to the shared source", () => {
    RandomSource.seed(42n);
    const inst = RandomSource.instance();
    const val1 = inst.nextInt(100);
    RandomSource.seed(42n);
    const val2 = RandomSource.nextInt(100);
    expect(val1).toBe(val2);
  });

  it("cosmeticInstance() delegates to cosmetic source", () => {
    RandomSource.seed(42n);
    const inst = RandomSource.cosmeticInstance();
    const val = inst.nextInt(100);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(100);
  });

  it("cosmeticInstance() uses the cosmetic source independently", () => {
    RandomSource.seed(42n);
    // Use main source
    RandomSource.nextIntUnbounded();
    RandomSource.nextIntUnbounded();
    // Cosmetic source should still be at its initial state
    const cosmetic1 = RandomSource.nextIntCosmetic(100);

    RandomSource.seed(42n);
    // Don't use main source this time
    const cosmetic2 = RandomSource.nextIntCosmetic(100);
    expect(cosmetic1).toBe(cosmetic2);
  });

  it("callsSinceSeed() tracks both main and cosmetic calls", () => {
    RandomSource.seed(1n);
    expect(RandomSource.callsSinceSeed()).toBe(0);
    RandomSource.nextIntUnbounded();
    RandomSource.nextIntUnbounded();
    RandomSource.nextIntCosmetic(10);
    expect(RandomSource.callsSinceSeed()).toBe(3);
  });

  it("reset() creates fresh sources and zeroes call count", () => {
    RandomSource.seed(999n);
    RandomSource.nextIntUnbounded();
    RandomSource.reset();
    expect(RandomSource.callsSinceSeed()).toBe(0);
  });

  it("random() returns a double in [0, 1)", () => {
    RandomSource.seed(42n);
    for (let i = 0; i < 100; i++) {
      const val = RandomSource.random();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("pickSeed() returns a bigint", () => {
    const seed = RandomSource.pickSeed();
    expect(typeof seed).toBe("bigint");
  });

  it("nextBoolean() delegates correctly", () => {
    RandomSource.seed(12345n);
    const val = RandomSource.nextBoolean();
    expect(typeof val).toBe("boolean");
  });

  it("nextFloat() delegates correctly", () => {
    RandomSource.seed(12345n);
    const val = RandomSource.nextFloat();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it("nextDouble() delegates correctly", () => {
    RandomSource.seed(12345n);
    const val = RandomSource.nextDouble();
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it("nextLong() delegates correctly", () => {
    RandomSource.seed(12345n);
    const val = RandomSource.nextLong();
    expect(typeof val).toBe("bigint");
  });

  it("nextGaussian() delegates correctly", () => {
    RandomSource.seed(12345n);
    const val = RandomSource.nextGaussian();
    expect(typeof val).toBe("number");
    expect(Number.isFinite(val)).toBe(true);
  });

  it("nextBytes() delegates correctly", () => {
    RandomSource.seed(12345n);
    const bytes = new Uint8Array(8);
    RandomSource.nextBytes(bytes);
    // Should have been filled with non-zero data (with very high probability)
    const allZero = bytes.every((b) => b === 0);
    expect(allZero).toBe(false);
  });

  it("instance().setSeed() reseeds the shared source", () => {
    const inst = RandomSource.instance();
    inst.setSeed(42n);
    const val1 = inst.nextInt(100);
    inst.setSeed(42n);
    const val2 = inst.nextInt(100);
    expect(val1).toBe(val2);
  });

  describe("CosmeticRandomSourceInstance stubs", () => {
    it("nextInt() without bound returns 0", () => {
      const cosmetic = RandomSource.cosmeticInstance();
      expect(cosmetic.nextInt()).toBe(0);
    });

    it("nextLong() returns 0n", () => {
      expect(RandomSource.cosmeticInstance().nextLong()).toBe(0n);
    });

    it("nextBoolean() returns false", () => {
      expect(RandomSource.cosmeticInstance().nextBoolean()).toBe(false);
    });

    it("nextFloat() returns 0", () => {
      expect(RandomSource.cosmeticInstance().nextFloat()).toBe(0);
    });

    it("nextDouble() returns 0", () => {
      expect(RandomSource.cosmeticInstance().nextDouble()).toBe(0);
    });

    it("nextGaussian() returns 0", () => {
      expect(RandomSource.cosmeticInstance().nextGaussian()).toBe(0);
    });

    it("nextBytes() is a no-op", () => {
      const bytes = new Uint8Array(4).fill(0xff);
      RandomSource.cosmeticInstance().nextBytes(bytes);
      // Should remain unchanged (no-op)
      expect(bytes.every((b) => b === 0xff)).toBe(true);
    });
  });
});
