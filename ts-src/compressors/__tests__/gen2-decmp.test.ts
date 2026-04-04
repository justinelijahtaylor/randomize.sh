import { describe, it, expect } from "vitest";
import { Gen2Decmp } from "../gen2-decmp.js";

describe("Gen2Decmp", () => {
  it("decompresses a literal-only stream", () => {
    // cmd=0 (literal), len=4, then 4 bytes, then LZ_END
    // Normal command: (cmd<<5) | (len-1) = (0<<5) | 3 = 0x03
    // tilesWide=1, tilesHigh=1 => 16 bytes output (but we only produce 4,
    // so cutAndTranspose will still work with tiles=1*1=1)
    //
    // Actually, cutAndTranspose expects output of at least tiles*16 bytes.
    // Let's make exactly 16 bytes of literal data.
    // cmd=0, len=16: (0<<5) | 15 = 0x0F
    const bytes = new Uint8Array(18);
    bytes[0] = 0x0f; // cmd=0 (literal), len-1=15 => len=16
    for (let i = 0; i < 16; i++) {
      bytes[1 + i] = i; // literal data 0x00..0x0F
    }
    bytes[17] = 0xff; // LZ_END

    const decmp = new Gen2Decmp(bytes, 0, 1, 1);
    const result = decmp.getData();
    expect(result).not.toBeNull();
    expect(result.length).toBe(16);
    // With 1x1 tiles, transpose is identity
    for (let i = 0; i < 16; i++) {
      expect(result[i]).toBe(i);
    }
  });

  it("decompresses an iterate (repeat byte) command", () => {
    // cmd=1 (iterate), len=16, byte=0xAA
    // (1<<5) | 15 = 0x2F
    const bytes = new Uint8Array([
      0x2f, // cmd=1, len=16
      0xaa, // repeated byte
      0xff, // LZ_END
    ]);

    const decmp = new Gen2Decmp(bytes, 0, 1, 1);
    const result = decmp.getData();
    expect(result.length).toBe(16);
    for (let i = 0; i < 16; i++) {
      expect(result[i]).toBe(0xaa);
    }
  });

  it("decompresses an alternate command", () => {
    // cmd=2 (alternate), len=16, byte1=0xAA, byte2=0xBB
    // (2<<5) | 15 = 0x4F
    const bytes = new Uint8Array([
      0x4f, // cmd=2, len=16
      0xaa, // first alternating byte
      0xbb, // second alternating byte
      0xff, // LZ_END
    ]);

    const decmp = new Gen2Decmp(bytes, 0, 1, 1);
    const result = decmp.getData();
    expect(result.length).toBe(16);
    for (let i = 0; i < 16; i++) {
      expect(result[i]).toBe(i % 2 === 0 ? 0xaa : 0xbb);
    }
  });

  it("decompresses a zero-fill command", () => {
    // cmd=3 (zero-fill), len=16
    // (3<<5) | 15 = 0x6F
    const bytes = new Uint8Array([
      0x6f, // cmd=3, len=16
      0xff, // LZ_END
    ]);

    const decmp = new Gen2Decmp(bytes, 0, 1, 1);
    const result = decmp.getData();
    expect(result.length).toBe(16);
    for (let i = 0; i < 16; i++) {
      expect(result[i]).toBe(0);
    }
  });

  it("decompresses a repeat (copy) command", () => {
    // First write 4 literal bytes, then repeat them 4 times to get 16 total
    // Literal: cmd=0, len=4: (0<<5)|3 = 0x03
    // Repeat (cmd=4): len=12, offset negative pointing back 4
    // (4<<5)|11 = 0x8B
    // get_offset: if peek >= 0x80 -> negative offset
    // offset = peek & 0x7F, offset = out_idx - offset - 1
    // At this point out_idx=4, we want to go back to 0
    // offset_encoded = out_idx - target - 1 = 4 - 0 - 1 = 3
    // So byte = 0x80 | 3 = 0x83
    const bytes = new Uint8Array([
      0x03, // cmd=0 (literal), len=4
      0x41, 0x42, 0x43, 0x44, // ABCD
      0x8b, // cmd=4 (repeat), len=12
      0x83, // negative offset: back 3+1=4 from out_idx=4 -> pos 0
      0xff, // LZ_END
    ]);

    const decmp = new Gen2Decmp(bytes, 0, 1, 1);
    const result = decmp.getData();
    expect(result.length).toBe(16);
    // "ABCD" repeated: ABCDABCDABCDABCD
    for (let i = 0; i < 16; i++) {
      expect(result[i]).toBe(0x41 + (i % 4));
    }
  });

  it("handles LONG command format", () => {
    // LONG command: cmd bits = 111, then real cmd in next 3 bits
    // Format: 111c cc ll  llll llll
    // cmd=0 (literal), len=16
    // First byte: 1110_00xx where xx = (16-1) >> 8 = 0
    // So first byte: 0xE0, second byte: 15 (0x0F)
    // Wait: len = (first & 0x03) * 0x100 + second + 1
    // For len=16: (first & 0x03)*256 + second + 1 = 16
    // => 0*256 + 15 + 1 = 16. first = 0xE0, second = 0x0F
    const bytes = new Uint8Array(19);
    bytes[0] = 0xe0; // LONG, cmd=0
    bytes[1] = 0x0f; // len-1=15 => len=16
    for (let i = 0; i < 16; i++) {
      bytes[2 + i] = i + 1;
    }
    bytes[18] = 0xff; // LZ_END

    const decmp = new Gen2Decmp(bytes, 0, 1, 1);
    const result = decmp.getData();
    expect(result.length).toBe(16);
    for (let i = 0; i < 16; i++) {
      expect(result[i]).toBe(i + 1);
    }
  });

  it("handles baseOffset parameter", () => {
    const padding = new Uint8Array([0x00, 0x00]);
    const payload = new Uint8Array([
      0x6f, // cmd=3 (zero-fill), len=16
      0xff, // LZ_END
    ]);
    const combined = new Uint8Array(padding.length + payload.length);
    combined.set(padding);
    combined.set(payload, padding.length);

    const decmp = new Gen2Decmp(combined, 2, 1, 1);
    const result = decmp.getData();
    expect(result.length).toBe(16);
  });

  it("getFlattenedData expands planar to pixel data", () => {
    // 16 bytes of zero -> flattened = 64 bytes of zero
    const bytes = new Uint8Array([0x6f, 0xff]);
    const decmp = new Gen2Decmp(bytes, 0, 1, 1);
    const flat = decmp.getFlattenedData();
    expect(flat.length).toBe(64); // 16 * 4
    expect(Array.from(flat)).toEqual(new Array(64).fill(0));
  });

  it("cutAndTranspose reorders tiles", () => {
    // 2 tiles wide, 1 tile high = 2 tiles total = 32 bytes
    // Literal 32 bytes
    const bytes = new Uint8Array(34);
    bytes[0] = 0x1f; // cmd=0, len=32 -> (0<<5)|31 = 0x1F
    for (let i = 0; i < 32; i++) {
      bytes[1 + i] = i;
    }
    bytes[33] = 0xff;

    const decmp = new Gen2Decmp(bytes, 0, 2, 1);
    const result = decmp.getData();
    expect(result.length).toBe(32);
    // With 2 wide, 1 high:
    // tile 0 (x=0, y=0) -> newTile = 0*1+0 = 0
    // tile 1 (x=1, y=0) -> newTile = 1*1+0 = 1
    // So order doesn't change for 2x1
    for (let i = 0; i < 32; i++) {
      expect(result[i]).toBe(i);
    }
  });
});
