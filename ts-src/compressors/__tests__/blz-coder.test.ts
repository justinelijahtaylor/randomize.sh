import { describe, it, expect } from "vitest";
import { BLZCoder } from "../blz-coder.js";

describe("BLZCoder", () => {
  describe("LZSS encode/decode roundtrip", () => {
    it("roundtrips a simple byte sequence", () => {
      const coder = new BLZCoder();
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const encoded = coder.encodePub(original, false, "GARC");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "GARC");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });

    it("roundtrips repeated bytes", () => {
      const coder = new BLZCoder();
      const original = new Uint8Array(64).fill(0xaa);
      const encoded = coder.encodePub(original, false, "GARC");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "GARC");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });

    it("roundtrips a pattern with repetitions", () => {
      const coder = new BLZCoder();
      // Create data with repeated patterns that should compress well
      const original = new Uint8Array(128);
      for (let i = 0; i < 128; i++) {
        original[i] = i % 16;
      }
      const encoded = coder.encodePub(original, false, "GARC");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "GARC");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });

    it("roundtrips a single byte", () => {
      const coder = new BLZCoder();
      const original = new Uint8Array([0x42]);
      const encoded = coder.encodePub(original, false, "GARC");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "GARC");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });

    it("handles empty input", () => {
      const coder = new BLZCoder();
      const original = new Uint8Array(0);
      const encoded = coder.encodePub(original, false, "GARC");
      expect(encoded).not.toBeNull();
      // Empty input produces a small header
      expect(encoded!.length).toBeGreaterThan(0);
    });

    it("roundtrips sequential bytes", () => {
      const coder = new BLZCoder();
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }
      const encoded = coder.encodePub(original, false, "GARC");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "GARC");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });
  });

  describe("LZSS decode", () => {
    it("rejects data without 0x11 marker", () => {
      const coder = new BLZCoder();
      const bad = new Uint8Array([0x10, 0x04, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04]);
      const result = coder.decodePub(bad, "GARC");
      expect(result).toBeNull();
    });

    it("decodes a manually constructed LZSS stream", () => {
      const coder = new BLZCoder();
      // Build: marker=0x11, size=3 (LE 3 bytes), flags=0x00 (all literal), 3 bytes
      // But flags byte encodes 8 blocks: 0x00 means all literal
      const data = new Uint8Array([
        0x11, // marker
        0x03, 0x00, 0x00, // decompressed size = 3
        0x00, // flags: all 8 blocks are literal
        0xAA, 0xBB, 0xCC, // 3 literal bytes
      ]);
      const result = coder.decodePub(data, "GARC");
      expect(result).not.toBeNull();
      expect(Array.from(result!)).toEqual([0xAA, 0xBB, 0xCC]);
    });
  });

  describe("BLZ encode/decode roundtrip", () => {
    it("roundtrips data through BLZ normal mode", () => {
      const coder = new BLZCoder();
      // BLZ needs enough data to be meaningful
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i % 32;
      }
      const encoded = coder.encodePub(original, false, "BLZ");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "BLZ");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });

    it("roundtrips data through BLZ best mode", () => {
      const coder = new BLZCoder();
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i % 32;
      }
      const encoded = coder.encodePub(original, true, "BLZ");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "BLZ");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });

    it("roundtrips all-zero data", () => {
      const coder = new BLZCoder();
      const original = new Uint8Array(128).fill(0);
      const encoded = coder.encodePub(original, false, "BLZ");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "BLZ");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });

    it("roundtrips all-0xFF data", () => {
      const coder = new BLZCoder();
      const original = new Uint8Array(128).fill(0xff);
      const encoded = coder.encodePub(original, false, "BLZ");
      expect(encoded).not.toBeNull();

      const decoded = coder.decodePub(encoded!, "BLZ");
      expect(decoded).not.toBeNull();
      expect(Array.from(decoded!)).toEqual(Array.from(original));
    });
  });
});
