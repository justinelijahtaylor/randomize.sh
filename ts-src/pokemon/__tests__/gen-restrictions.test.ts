import { describe, it, expect } from "vitest";
import { GenRestrictions } from "../gen-restrictions";

describe("GenRestrictions construction", () => {
  it("all flags are false by default (no state argument)", () => {
    const gr = new GenRestrictions();
    expect(gr.allow_gen1).toBe(false);
    expect(gr.allow_gen2).toBe(false);
    expect(gr.allow_gen3).toBe(false);
    expect(gr.allow_gen4).toBe(false);
    expect(gr.allow_gen5).toBe(false);
    expect(gr.allow_gen6).toBe(false);
    expect(gr.allow_gen7).toBe(false);
    expect(gr.allow_evolutionary_relatives).toBe(false);
  });

  it("decodes state bitmask correctly", () => {
    // state = 0b10000001 = 129 => gen1 + evolutionary_relatives
    const gr = new GenRestrictions(129);
    expect(gr.allow_gen1).toBe(true);
    expect(gr.allow_gen2).toBe(false);
    expect(gr.allow_gen3).toBe(false);
    expect(gr.allow_gen4).toBe(false);
    expect(gr.allow_gen5).toBe(false);
    expect(gr.allow_gen6).toBe(false);
    expect(gr.allow_gen7).toBe(false);
    expect(gr.allow_evolutionary_relatives).toBe(true);
  });

  it("decodes all bits set", () => {
    const gr = new GenRestrictions(0xFF);
    expect(gr.allow_gen1).toBe(true);
    expect(gr.allow_gen2).toBe(true);
    expect(gr.allow_gen3).toBe(true);
    expect(gr.allow_gen4).toBe(true);
    expect(gr.allow_gen5).toBe(true);
    expect(gr.allow_gen6).toBe(true);
    expect(gr.allow_gen7).toBe(true);
    expect(gr.allow_evolutionary_relatives).toBe(true);
  });

  it("decodes individual gen flags from bitmask", () => {
    expect(new GenRestrictions(1).allow_gen1).toBe(true);
    expect(new GenRestrictions(2).allow_gen2).toBe(true);
    expect(new GenRestrictions(4).allow_gen3).toBe(true);
    expect(new GenRestrictions(8).allow_gen4).toBe(true);
    expect(new GenRestrictions(16).allow_gen5).toBe(true);
    expect(new GenRestrictions(32).allow_gen6).toBe(true);
    expect(new GenRestrictions(64).allow_gen7).toBe(true);
    expect(new GenRestrictions(128).allow_evolutionary_relatives).toBe(true);
  });
});

describe("nothingSelected()", () => {
  it("returns true when all gen flags are false", () => {
    const gr = new GenRestrictions();
    expect(gr.nothingSelected()).toBe(true);
  });

  it("returns true when only evolutionary_relatives is set", () => {
    const gr = new GenRestrictions(128);
    expect(gr.nothingSelected()).toBe(true);
  });

  it("returns false when any gen flag is true", () => {
    const gr = new GenRestrictions(1);
    expect(gr.nothingSelected()).toBe(false);

    const gr2 = new GenRestrictions(64);
    expect(gr2.nothingSelected()).toBe(false);
  });
});

describe("toInt()", () => {
  it("round-trips with constructor", () => {
    for (const state of [0, 1, 127, 128, 255, 42]) {
      const gr = new GenRestrictions(state);
      expect(gr.toInt()).toBe(state);
    }
  });

  it("encodes manually set flags", () => {
    const gr = new GenRestrictions();
    gr.allow_gen1 = true;
    gr.allow_gen3 = true;
    // gen1 = 1, gen3 = 4 => 5
    expect(gr.toInt()).toBe(5);
  });
});

describe("limitToGen()", () => {
  it("limits to gen 1 by clearing all later gen flags", () => {
    const gr = new GenRestrictions(0xFF);
    gr.limitToGen(1);
    expect(gr.allow_gen1).toBe(true);
    expect(gr.allow_gen2).toBe(false);
    expect(gr.allow_gen3).toBe(false);
    expect(gr.allow_gen4).toBe(false);
    expect(gr.allow_gen5).toBe(false);
    expect(gr.allow_gen6).toBe(false);
    expect(gr.allow_gen7).toBe(false);
  });

  it("limits to gen 3 keeping gens 1-3", () => {
    const gr = new GenRestrictions(0xFF);
    gr.limitToGen(3);
    expect(gr.allow_gen1).toBe(true);
    expect(gr.allow_gen2).toBe(true);
    expect(gr.allow_gen3).toBe(true);
    expect(gr.allow_gen4).toBe(false);
    expect(gr.allow_gen5).toBe(false);
    expect(gr.allow_gen6).toBe(false);
    expect(gr.allow_gen7).toBe(false);
  });

  it("limitToGen(7) keeps all gens", () => {
    const gr = new GenRestrictions(0x7F);
    gr.limitToGen(7);
    expect(gr.allow_gen7).toBe(true);
  });
});

describe("megaEvolutionsAreInPool()", () => {
  it("returns true when gen1 is allowed (XY)", () => {
    const gr = new GenRestrictions(1);
    expect(gr.megaEvolutionsAreInPool(true)).toBe(true);
  });

  it("returns false when no gens are allowed (XY)", () => {
    const gr = new GenRestrictions();
    expect(gr.megaEvolutionsAreInPool(true)).toBe(false);
  });

  it("returns true when gen5 is allowed (non-XY)", () => {
    const gr = new GenRestrictions(16);
    expect(gr.megaEvolutionsAreInPool(false)).toBe(true);
  });

  it("XY only checks gens 1-4", () => {
    const gr = new GenRestrictions(16); // only gen5
    expect(gr.megaEvolutionsAreInPool(true)).toBe(false);
  });
});
