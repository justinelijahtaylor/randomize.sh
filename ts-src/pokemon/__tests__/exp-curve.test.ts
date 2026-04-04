import { describe, it, expect } from "vitest";
import {
  ExpCurve,
  expCurveFromByte,
  expCurveToByte,
  expCurveToString,
} from "../exp-curve";

describe("ExpCurve enum", () => {
  it("has all 6 curves", () => {
    expect(ExpCurve.SLOW).toBeDefined();
    expect(ExpCurve.MEDIUM_SLOW).toBeDefined();
    expect(ExpCurve.MEDIUM_FAST).toBeDefined();
    expect(ExpCurve.FAST).toBeDefined();
    expect(ExpCurve.ERRATIC).toBeDefined();
    expect(ExpCurve.FLUCTUATING).toBeDefined();
  });

  it("has distinct numeric values for all curves", () => {
    const values = new Set([
      ExpCurve.SLOW,
      ExpCurve.MEDIUM_SLOW,
      ExpCurve.MEDIUM_FAST,
      ExpCurve.FAST,
      ExpCurve.ERRATIC,
      ExpCurve.FLUCTUATING,
    ]);
    expect(values.size).toBe(6);
  });
});

describe("fromByte / toByte round-trip", () => {
  const allCurves: ExpCurve[] = [
    ExpCurve.SLOW,
    ExpCurve.MEDIUM_SLOW,
    ExpCurve.MEDIUM_FAST,
    ExpCurve.FAST,
    ExpCurve.ERRATIC,
    ExpCurve.FLUCTUATING,
  ];

  it("toByte followed by fromByte returns original curve for all curves", () => {
    for (const curve of allCurves) {
      const byte = expCurveToByte(curve);
      const roundTripped = expCurveFromByte(byte);
      expect(roundTripped).toBe(curve);
    }
  });

  it("fromByte followed by toByte returns original byte for all valid bytes", () => {
    for (let b = 0; b <= 5; b++) {
      const curve = expCurveFromByte(b);
      expect(curve).not.toBeNull();
      const roundTripped = expCurveToByte(curve!);
      expect(roundTripped).toBe(b);
    }
  });

  it("fromByte returns null for invalid byte values", () => {
    expect(expCurveFromByte(6)).toBeNull();
    expect(expCurveFromByte(-1)).toBeNull();
    expect(expCurveFromByte(100)).toBeNull();
  });
});

describe("expCurveFromByte specific mappings", () => {
  it("byte 0 maps to MEDIUM_FAST", () => {
    expect(expCurveFromByte(0)).toBe(ExpCurve.MEDIUM_FAST);
  });

  it("byte 1 maps to ERRATIC", () => {
    expect(expCurveFromByte(1)).toBe(ExpCurve.ERRATIC);
  });

  it("byte 2 maps to FLUCTUATING", () => {
    expect(expCurveFromByte(2)).toBe(ExpCurve.FLUCTUATING);
  });

  it("byte 3 maps to MEDIUM_SLOW", () => {
    expect(expCurveFromByte(3)).toBe(ExpCurve.MEDIUM_SLOW);
  });

  it("byte 4 maps to FAST", () => {
    expect(expCurveFromByte(4)).toBe(ExpCurve.FAST);
  });

  it("byte 5 maps to SLOW", () => {
    expect(expCurveFromByte(5)).toBe(ExpCurve.SLOW);
  });
});

describe("expCurveToString", () => {
  it("returns human-readable names", () => {
    expect(expCurveToString(ExpCurve.SLOW)).toBe("Slow");
    expect(expCurveToString(ExpCurve.MEDIUM_SLOW)).toBe("Medium Slow");
    expect(expCurveToString(ExpCurve.MEDIUM_FAST)).toBe("Medium Fast");
    expect(expCurveToString(ExpCurve.FAST)).toBe("Fast");
    expect(expCurveToString(ExpCurve.ERRATIC)).toBe("Erratic");
    expect(expCurveToString(ExpCurve.FLUCTUATING)).toBe("Fluctuating");
  });
});
