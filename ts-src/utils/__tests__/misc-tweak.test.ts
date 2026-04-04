import { describe, it, expect } from "vitest";
import { MiscTweak } from "../misc-tweak";

describe("MiscTweak", () => {
  it("all tweaks have unique bitmask values", () => {
    const values = MiscTweak.allTweaks.map((t) => t.value);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("all tweak values are powers of 2", () => {
    for (const tweak of MiscTweak.allTweaks) {
      // A power of 2 has exactly one bit set: (n & (n-1)) === 0 for n > 0
      expect(tweak.value).toBeGreaterThan(0);
      expect(tweak.value & (tweak.value - 1)).toBe(0);
    }
  });

  it("NO_MISC_TWEAKS is 0", () => {
    expect(MiscTweak.NO_MISC_TWEAKS).toBe(0);
  });

  it("allTweaks contains all defined static tweak instances", () => {
    // There should be exactly 23 tweaks defined
    expect(MiscTweak.allTweaks.length).toBe(23);
  });

  it("BW_EXP_PATCH has value 1 (bit 0)", () => {
    expect(MiscTweak.BW_EXP_PATCH.value).toBe(1);
  });

  it("NERF_X_ACCURACY has value 2 (bit 1)", () => {
    expect(MiscTweak.NERF_X_ACCURACY.value).toBe(2);
  });

  it("DISABLE_LOW_HP_MUSIC has value 1 << 22", () => {
    expect(MiscTweak.DISABLE_LOW_HP_MUSIC.value).toBe(1 << 22);
  });

  it("tweak values cover bits 0 through 22 without gaps", () => {
    const values = MiscTweak.allTweaks.map((t) => t.value).sort((a, b) => a - b);
    for (let i = 0; i < 23; i++) {
      expect(values[i]).toBe(1 << i);
    }
  });

  it("getValue() returns the same as .value", () => {
    for (const tweak of MiscTweak.allTweaks) {
      expect(tweak.getValue()).toBe(tweak.value);
    }
  });

  it("getTweakName() returns a non-empty string", () => {
    for (const tweak of MiscTweak.allTweaks) {
      expect(tweak.getTweakName().length).toBeGreaterThan(0);
    }
  });

  it("getTooltipText() returns a non-empty string", () => {
    for (const tweak of MiscTweak.allTweaks) {
      expect(tweak.getTooltipText().length).toBeGreaterThan(0);
    }
  });

  it("compareTo sorts by priority descending", () => {
    // BAN_LUCKY_EGG has priority 1, BW_EXP_PATCH has priority 0
    // compareTo returns o.priority - this.priority
    // So BAN_LUCKY_EGG.compareTo(BW_EXP_PATCH) = 0 - 1 = -1
    const result = MiscTweak.BAN_LUCKY_EGG.compareTo(MiscTweak.BW_EXP_PATCH);
    expect(result).toBeLessThan(0);

    const reverse = MiscTweak.BW_EXP_PATCH.compareTo(MiscTweak.BAN_LUCKY_EGG);
    expect(reverse).toBeGreaterThan(0);
  });

  it("compareTo returns 0 for same-priority tweaks", () => {
    // Both have priority 0
    const result = MiscTweak.BW_EXP_PATCH.compareTo(MiscTweak.FIX_CRIT_RATE);
    expect(result).toBe(0);
  });

  it("bitmask OR of all tweaks produces expected combined value", () => {
    let combined = 0;
    for (const tweak of MiscTweak.allTweaks) {
      combined |= tweak.value;
    }
    // bits 0 through 22 all set = (1 << 23) - 1
    expect(combined).toBe((1 << 23) - 1);
  });
});
