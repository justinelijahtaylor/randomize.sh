import { describe, it, expect } from "vitest";
import { crc32 } from "../crc32";

describe("crc32", () => {
  it("returns 0 for empty input", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it("computes correct CRC32 for '123456789' ASCII bytes", () => {
    // Standard CRC32 test vector: CRC32("123456789") = 0xCBF43926
    const input = new TextEncoder().encode("123456789");
    expect(crc32(input)).toBe(0xcbf43926);
  });

  it("computes correct CRC32 for a single byte", () => {
    // CRC32 of byte 0x00
    const input = new Uint8Array([0x00]);
    expect(crc32(input)).toBe(0xd202ef8d);
  });

  it("computes correct CRC32 for 'test' ASCII bytes", () => {
    const input = new TextEncoder().encode("test");
    // Known CRC32 of "test" = 0xD87F7E0C
    expect(crc32(input)).toBe(0xd87f7e0c);
  });

  it("incremental update matches single-pass computation", () => {
    const fullData = new TextEncoder().encode("Hello, World!");
    const singlePass = crc32(fullData);

    // Compute incrementally: first part, then second part using initial
    const part1 = fullData.slice(0, 7);
    const part2 = fullData.slice(7);
    const intermediateCrc = crc32(part1);
    const incrementalResult = crc32(part2, intermediateCrc);

    expect(incrementalResult).toBe(singlePass);
  });

  it("handles all-zeros input", () => {
    const zeros = new Uint8Array(16);
    const result = crc32(zeros);
    expect(result).toBe(result >>> 0); // Must be unsigned 32-bit
    expect(result).toBeGreaterThan(0);
  });

  it("handles all-0xFF input", () => {
    const ones = new Uint8Array(4).fill(0xff);
    const result = crc32(ones);
    expect(result).toBe(result >>> 0);
  });

  it("is deterministic", () => {
    const data = new TextEncoder().encode("deterministic test");
    expect(crc32(data)).toBe(crc32(data));
  });
});
