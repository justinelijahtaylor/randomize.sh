import { describe, it, expect, beforeEach } from "vitest";
import {
  readTexts,
  saveEntry,
  initFromMap,
  _readWord,
  _writeWord,
} from "../pptxt-handler";

/**
 * Build a synthetic gen5 text binary with the given plaintext char arrays.
 * Each entry is an array of 16-bit character codes (unencrypted), terminated by 0xFFFF.
 * The binary format:
 *   - word[0]: numSections (1)
 *   - word[1]: numEntries
 *   - long[2]: sizeSections[0]
 *   - long[3..]: sectionOffset[0]
 *   Section 0:
 *     - long: section size
 *     - per entry: long offset, word charCount, word unknown(0)
 *     - encrypted character data
 */
function buildBinary(entries: number[][]): Buffer {
  const numSections = 1;
  const numEntries = entries.length;

  // Section data: sectionSize(4) + entries*(offset(4)+charCount(2)+unknown(2)) + char data
  const headerSize = 12 + numSections * 4; // file header + section offsets
  const sectionHeaderSize = 4 + numEntries * 8;

  // Calculate char data sizes
  let charDataSize = 0;
  for (const entry of entries) {
    charDataSize += entry.length * 2;
  }

  const sectionSize = sectionHeaderSize + charDataSize;
  const totalSize = headerSize + sectionSize;
  const buf = Buffer.alloc(totalSize);

  // File header
  writeWord(buf, 0, numSections);
  writeWord(buf, 2, numEntries);
  writeLong(buf, 4, sectionSize);
  writeLong(buf, 8, 0); // unk1

  // Section offset
  const sectionOffset = headerSize;
  writeLong(buf, 12, sectionOffset);

  // Section header
  writeLong(buf, sectionOffset, sectionSize);

  // Entry table
  let dataOffset = sectionHeaderSize;
  let pos = sectionOffset + 4;
  for (const entry of entries) {
    writeLong(buf, pos, dataOffset);
    pos += 4;
    writeWord(buf, pos, entry.length);
    pos += 2;
    writeWord(buf, pos, 0); // unknown
    pos += 2;
    dataOffset += entry.length * 2;
  }

  // Write encrypted character data
  for (let e = 0; e < entries.length; e++) {
    const entry = entries[e];
    const entryChars = [...entry];

    // Encrypt: XOR with key derived from last char ^ 0xFFFF
    // The encryption works backwards from the last character
    let key = entryChars[entryChars.length - 1] ^ 0xffff;
    for (let k = entryChars.length - 1; k >= 0; k--) {
      entryChars[k] = (entryChars[k] ^ key) & 0xffff;
      key = ((key >>> 3) | (key << 13)) & 0xffff;
    }

    // Write encrypted chars
    const charOffset =
      sectionOffset +
      sectionHeaderSize +
      entries.slice(0, e).reduce((sum, en) => sum + en.length * 2, 0);
    for (let k = 0; k < entryChars.length; k++) {
      writeWord(buf, charOffset + k * 2, entryChars[k]);
    }
  }

  return buf;
}

function writeWord(buf: Buffer, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function writeLong(buf: Buffer, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
  buf[offset + 3] = (value >> 24) & 0xff;
}

function readWord(buf: Buffer, offset: number): number {
  return (buf[offset] & 0xff) | ((buf[offset + 1] & 0xff) << 8);
}

describe("PPTxtHandler", () => {
  beforeEach(() => {
    // Initialize with no table entries so we get raw char output
    initFromMap(new Map());
  });

  describe("readTexts", () => {
    it("reads a single simple string", () => {
      // Create an entry with characters: 'H'(0x48), 'i'(0x69), terminator(0xFFFF)
      const data = buildBinary([[0x48, 0x69, 0xffff]]);
      const result = readTexts(data);
      expect(result.length).toBe(1);
      expect(result[0]).toBe("Hi");
    });

    it("reads multiple entries", () => {
      const data = buildBinary([
        [0x41, 0xffff], // 'A'
        [0x42, 0x43, 0xffff], // 'BC'
      ]);
      const result = readTexts(data);
      expect(result.length).toBe(2);
      expect(result[0]).toBe("A");
      expect(result[1]).toBe("BC");
    });

    it("encodes low codepoints as \\xNNNN", () => {
      // Characters <= 20 (0x14) should be escaped
      const data = buildBinary([[0x0005, 0xffff]]);
      const result = readTexts(data);
      expect(result.length).toBe(1);
      expect(result[0]).toBe("\\x0005");
    });

    it("handles empty string (just terminator)", () => {
      const data = buildBinary([[0xffff]]);
      const result = readTexts(data);
      expect(result.length).toBe(1);
      expect(result[0]).toBe("");
    });

    it("applies table substitution when table is set", () => {
      // Set up a table that maps codepoint 0x0100 -> "PKMN"
      const tableEntries = new Map<number, string>();
      tableEntries.set(0x0100, "PKMN");
      initFromMap(tableEntries);

      const data = buildBinary([[0x0100, 0xffff]]);
      const result = readTexts(data);
      expect(result.length).toBe(1);
      // The character 0x0100 is a valid unicode char, so it gets rendered then substituted
      expect(result[0]).toBe("PKMN");
    });
  });

  describe("saveEntry (round-trip)", () => {
    it("round-trips simple strings", () => {
      const originalData = buildBinary([
        [0x48, 0x69, 0xffff], // "Hi"
        [0x41, 0xffff], // "A"
      ]);

      // Read to populate internal state
      const original = readTexts(originalData);
      expect(original).toEqual(["Hi", "A"]);

      // Save with same strings
      const saved = saveEntry(originalData, ["Hi", "A"]);

      // Read back
      const readBack = readTexts(saved);
      expect(readBack).toEqual(["Hi", "A"]);
    });

    it("round-trips modified strings", () => {
      const originalData = buildBinary([
        [0x41, 0xffff], // "A"
        [0x42, 0xffff], // "B"
      ]);

      // Read original
      readTexts(originalData);

      // Save with different content
      const saved = saveEntry(originalData, ["X", "YZ"]);

      // Read back
      const readBack = readTexts(saved);
      expect(readBack).toEqual(["X", "YZ"]);
    });

    it("preserves escape sequences through round-trip", () => {
      const originalData = buildBinary([
        [0x0005, 0xffff], // low codepoint -> \\x0005
      ]);

      const original = readTexts(originalData);
      expect(original[0]).toBe("\\x0005");

      const saved = saveEntry(originalData, original);
      const readBack = readTexts(saved);
      expect(readBack[0]).toBe("\\x0005");
    });
  });

  describe("low-level helpers", () => {
    it("_writeWord and _readWord handle 16-bit values", () => {
      const buf = Buffer.alloc(4);
      _writeWord(buf, 0, 0x1234);
      _writeWord(buf, 2, 0xabcd);
      expect(readWord(buf, 0)).toBe(0x1234);
      expect(readWord(buf, 2)).toBe(0xabcd);
    });

    it("handles zero and max values", () => {
      const buf = Buffer.alloc(4);
      _writeWord(buf, 0, 0x0000);
      _writeWord(buf, 2, 0xffff);
      expect(readWord(buf, 0)).toBe(0x0000);
      expect(readWord(buf, 2)).toBe(0xffff);
    });
  });
});
