import { describe, it, expect } from "vitest";
import { DSDecmp } from "../ds-decmp.js";

describe("DSDecmp", () => {
  describe("decompress10LZ (type 0x10)", () => {
    it("decompresses uncompressed literal bytes", () => {
      // Build a valid LZ10 stream: header 0x10, length=4 (LE 3 bytes),
      // then flags=0x00 (8 literal), 4 literal bytes
      const data = new Uint8Array([
        0x10, // type
        0x04, 0x00, 0x00, // length = 4
        0x00, // flags: all literal
        0x41, 0x42, 0x43, 0x44, // 'A', 'B', 'C', 'D'
      ]);
      const result = DSDecmp.decompress(data);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(4);
      expect(Array.from(result!)).toEqual([0x41, 0x42, 0x43, 0x44]);
    });

    it("decompresses with back-references", () => {
      // LZ10: produce "ABCABC" (6 bytes)
      // First 3 bytes are literal: A B C
      // Then a back-reference: go back 3, copy 3
      // flags byte: bits for 8 entries (MSB first)
      // entries: literal, literal, literal, backref, ...
      // flags = 0b0001_0000 = 0x10 (bit 4 = backref at position 3)
      // backref: n = (len-3), disp-1. len=3 -> n=0, disp=3-1=2
      // byte1 = (n<<4) | (disp>>8) = 0x00
      // byte2 = disp & 0xFF = 0x02
      const data = new Uint8Array([
        0x10, // type
        0x06, 0x00, 0x00, // length = 6
        0x10, // flags: 0001_0000 - 4th entry is backref
        0x41, 0x42, 0x43, // literals: A, B, C
        0x00, 0x02, // backref: len=3, disp=3
      ]);
      const result = DSDecmp.decompress(data);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(6);
      expect(Array.from(result!)).toEqual([0x41, 0x42, 0x43, 0x41, 0x42, 0x43]);
    });

    it("returns null for unknown type", () => {
      const data = new Uint8Array([0x99, 0x00, 0x00, 0x00]);
      expect(DSDecmp.decompress(data)).toBeNull();
    });

    it("decompresses a single literal byte", () => {
      const data = new Uint8Array([
        0x10,
        0x01, 0x00, 0x00, // length = 1
        0x00, // flags: all literal
        0xFF, // one byte
      ]);
      const result = DSDecmp.decompress(data);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(1);
      expect(result![0]).toBe(0xFF);
    });

    it("throws on invalid back-reference", () => {
      // Try to reference data before start
      const data = new Uint8Array([
        0x10,
        0x04, 0x00, 0x00, // length = 4
        0x80, // flags: first entry is backref
        0x00, 0x05, // backref: disp=5, but nothing written yet
      ]);
      expect(() => DSDecmp.decompress(data)).toThrow(
        "Cannot go back more than already written",
      );
    });
  });

  describe("decompress11LZ (type 0x11)", () => {
    it("decompresses uncompressed literal bytes", () => {
      const data = new Uint8Array([
        0x11, // type
        0x03, 0x00, 0x00, // length = 3
        0x00, // flags: all literal
        0x01, 0x02, 0x03, // literals
      ]);
      const result = DSDecmp.decompress(data);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(3);
      expect(Array.from(result!)).toEqual([1, 2, 3]);
    });

    it("decompresses with default-case back-references", () => {
      // Type 0x11: default case (b1>>4 >= 2)
      // len = (b1>>4) + 1, disp = ((b1 & 0x0F) << 8) | b2
      // For len=3: b1>>4=2 -> b1 = 0x20 | (disp>>8)
      // disp=2 -> b1=0x20, b2=0x02
      const data = new Uint8Array([
        0x11,
        0x06, 0x00, 0x00, // length = 6
        0x10, // flags: 0001_0000
        0x41, 0x42, 0x43, // literals: A, B, C
        0x20, 0x02, // backref: len=3, disp=3 (disp is 0x002, +1 in formula? No, disp is direct)
      ]);
      const result = DSDecmp.decompress(data);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(6);
      expect(Array.from(result!)).toEqual([0x41, 0x42, 0x43, 0x41, 0x42, 0x43]);
    });

    it("throws on invalid back-reference in type 0x11", () => {
      const data = new Uint8Array([
        0x11,
        0x04, 0x00, 0x00,
        0x80, // flags: first is backref
        0x20, 0x05, // backref with large disp
      ]);
      expect(() => DSDecmp.decompress(data)).toThrow(
        "Cannot go back more than already written",
      );
    });
  });

  describe("offset parameter", () => {
    it("starts decompression at given offset", () => {
      const padding = new Uint8Array([0xFF, 0xFF]);
      const payload = new Uint8Array([
        0x10,
        0x02, 0x00, 0x00,
        0x00,
        0xAA, 0xBB,
      ]);
      const combined = new Uint8Array(padding.length + payload.length);
      combined.set(padding);
      combined.set(payload, padding.length);

      const result = DSDecmp.decompress(combined, 2);
      expect(result).not.toBeNull();
      expect(result!.length).toBe(2);
      expect(Array.from(result!)).toEqual([0xAA, 0xBB]);
    });
  });
});
