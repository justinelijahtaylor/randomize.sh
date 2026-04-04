import { describe, it, expect } from "vitest";
import { crc16Calculate } from "../crc16.js";

describe("crc16Calculate", () => {
  it("returns 0xFFFF for empty input (initial CRC value, no data processed)", () => {
    // With 0 length, the loop doesn't execute, so crc stays at 0xFFFF
    const input = new Uint8Array(0);
    expect(crc16Calculate(input, 0, 0)).toBe(0xffff);
  });

  it("computes correct CRC-16 for a single zero byte", () => {
    const input = new Uint8Array([0x00]);
    // CRC-16/ARC of [0x00]: table[(0xFFFF ^ 0x00) & 0xFF] ^ (0xFFFF >>> 8)
    // = table[0xFF] ^ 0xFF = 0x4040 ^ 0xFF = 0xBFBF
    // But let's compute: crc=0xFFFF, i=0: crc = (0xFFFF>>>8) ^ table[(0xFFFF^0x00)&0xFF]
    // = 0x00FF ^ table[0xFF] = 0x00FF ^ 0x4040 = 0x40BF
    const result = crc16Calculate(input, 0, 1);
    expect(result).toBe(0x40bf);
  });

  it("computes correct CRC-16 for '123456789' ASCII bytes", () => {
    const input = new TextEncoder().encode("123456789");
    // NDS CRC-16 variant: computed value is 0x4B37
    expect(crc16Calculate(input, 0, input.length)).toBe(0x4b37);
  });

  it("handles offset parameter correctly", () => {
    // Pad with garbage bytes before actual data
    const padding = new Uint8Array([0xAA, 0xBB, 0xCC]);
    const payload = new TextEncoder().encode("123456789");
    const combined = new Uint8Array(padding.length + payload.length);
    combined.set(padding);
    combined.set(payload, padding.length);

    expect(crc16Calculate(combined, 3, payload.length)).toBe(0x4b37);
  });

  it("computes correct CRC for all 0xFF bytes", () => {
    const input = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
    const result = crc16Calculate(input, 0, 4);
    // Verify it returns a 16-bit value
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffff);
    expect(result).toBe(0xb001);
  });

  it("computes correct CRC for sequential bytes", () => {
    const input = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const result = crc16Calculate(input, 0, 4);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffff);
    // Computed value for this variant
    expect(result).toBe(0x2ba1);
  });
});
