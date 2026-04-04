import { describe, it, expect, beforeEach } from "vitest";
import { makeFile } from "../text-to-poke";
import { initFromMap } from "../unicode-parser";
import { PokeTextData } from "../poke-text-data";

function readWord(buf: Buffer, offset: number): number {
  return (buf[offset] & 0xff) | ((buf[offset + 1] & 0xff) << 8);
}

function readLong(buf: Buffer, offset: number): number {
  return (
    (buf[offset] & 0xff) |
    ((buf[offset + 1] & 0xff) << 8) |
    ((buf[offset + 2] & 0xff) << 16) |
    ((buf[offset + 3] & 0xff) << 24)
  );
}

describe("TextToPoke", () => {
  beforeEach(() => {
    // Set up a simple character table for testing
    const entries = new Map<number, string>();
    // Map single ASCII chars to poke codes
    for (let i = 0; i < 26; i++) {
      entries.set(0x0001 + i, String.fromCharCode(65 + i)); // A-Z
    }
    for (let i = 0; i < 26; i++) {
      entries.set(0x001b + i, String.fromCharCode(97 + i)); // a-z
    }
    for (let i = 0; i < 10; i++) {
      entries.set(0x0035 + i, String.fromCharCode(48 + i)); // 0-9
    }
    entries.set(0x003f, " ");
    initFromMap(entries);
  });

  it("creates a valid binary file header", () => {
    const result = makeFile(["A"], false);
    // Header: 2 words = 4 bytes
    // numStrings
    expect(readWord(result, 0)).toBe(1);
    // key (0)
    expect(readWord(result, 2)).toBe(0);
  });

  it("creates correct pointer table", () => {
    const texts = ["AB", "C"];
    const result = makeFile(texts, false);
    // Header: 4 bytes
    // Pointer table: 2 entries * 8 bytes = 16 bytes
    // Data starts at 4 + 16 = 20

    const ptr0 = readLong(result, 4);
    expect(ptr0).toBe(20); // first entry starts right after pointers

    const chars0 = readLong(result, 8);
    // "AB" -> 2 poke chars + 0xFFFF terminator = 3
    expect(chars0).toBe(3);
  });

  it("round-trips through PokeTextData encrypt then decrypt", () => {
    const texts = ["AB"];
    const result = makeFile(texts, false);

    // makeFile produces unencrypted data.
    // We need to encrypt it first (encrypt() XORs the plaintext),
    // then decrypt() reverses it.
    const ptd = new PokeTextData(result);
    ptd.encrypt(); // encrypts the plaintext data
    ptd.decrypt(); // decrypts it back

    expect(ptd.strlist.length).toBe(1);
    expect(ptd.strlist[0]).toBe("AB");
  });

  it("handles escape sequences \\n", () => {
    const texts = ["A\\nB"];
    const result = makeFile(texts, false);

    const ptd = new PokeTextData(result);
    ptd.encrypt();
    ptd.decrypt();
    expect(ptd.strlist.length).toBe(1);
    // \n encodes as 0xE000 which is not in our table, so it becomes \xE000
    // The result contains A, then the escape, then B
    expect(ptd.strlist[0]).toContain("A");
    expect(ptd.strlist[0]).toContain("B");
  });

  it("handles \\v variable escape sequences", () => {
    // \v0001\x0000 should produce 0xFFFE, 0x0001, then count=0 -> \x0000
    const texts = ["\\v0001\\x0000"];
    const result = makeFile(texts, false);

    const ptd = new PokeTextData(result);
    ptd.encrypt();
    ptd.decrypt();
    expect(ptd.strlist.length).toBe(1);
    expect(ptd.strlist[0]).toBe("\\v0001\\x0000");
  });

  it("handles \\z variable args", () => {
    const texts = ["\\v0002\\z0003\\z0004"];
    const result = makeFile(texts, false);

    const ptd = new PokeTextData(result);
    ptd.encrypt();
    ptd.decrypt();
    expect(ptd.strlist.length).toBe(1);
    expect(ptd.strlist[0]).toBe("\\v0002\\z0003\\z0004");
  });

  it("creates file for multiple strings", () => {
    const texts = ["AB", "C"];
    const result = makeFile(texts, false);

    expect(readWord(result, 0)).toBe(2); // 2 strings

    const ptd = new PokeTextData(result);
    ptd.encrypt();
    ptd.decrypt();
    expect(ptd.strlist.length).toBe(2);
    expect(ptd.strlist[0]).toBe("AB");
    expect(ptd.strlist[1]).toBe("C");
  });

  it("produces compressed output with 0xF100 marker", () => {
    const texts = ["ABCABC"];
    const result = makeFile(texts, true);

    // After header and pointer table, the data should start with 0xF100
    const ptr0 = readLong(result, 4);
    const firstWord = readWord(result, ptr0);
    expect(firstWord).toBe(0xf100);
  });

  it("empty string produces just a terminator", () => {
    const texts = [""];
    const result = makeFile(texts, false);

    const ptr0 = readLong(result, 4);
    const chars0 = readLong(result, 8);
    // Empty string: just 0xFFFF terminator
    expect(chars0).toBe(1);
    expect(readWord(result, ptr0)).toBe(0xffff);
  });
});
