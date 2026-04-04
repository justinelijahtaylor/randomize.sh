import { describe, it, expect } from "vitest";
import { Gen1Decmp } from "../gen1-decmp.js";

/**
 * Gen1 compressed sprite format is complex and tightly coupled to Pokemon
 * Gen 1 ROMs. We test the decompressor by building minimal valid
 * compressed streams and verifying the output structure.
 *
 * The format:
 * - 4 bits: width in tiles
 * - 4 bits: height in tiles
 * - 1 bit: ram order
 * - For each RAM buffer: 1 bit (rle start), then alternating RLE/data chunks
 * - 1-2 bits: mode
 */

describe("Gen1Decmp", () => {
  it("creates an instance without throwing", () => {
    // Minimal data that won't crash during construction
    // (decompress() is called explicitly, not in constructor)
    const data = new Uint8Array(256).fill(0);
    const decmp = new Gen1Decmp(data, 0);
    expect(decmp).toBeDefined();
    expect(decmp.getData()).toBeNull();
  });

  it("decompresses a minimal 1x1 tile sprite", () => {
    // Build a minimal compressed stream for a 1x1 tile sprite
    // Width=1 tile (4 bits = 0001), Height=1 tile (4 bits = 0001)
    // ramorder = 0
    // First RAM (r1=0): rle bit + data
    // mode = 0 (1 bit)
    // Second RAM (r2=1): rle bit + data
    //
    // size = 1*8 * 1 = 8
    // Each ram needs size*4 = 32 bitgroups (pairs)
    //
    // Encoding: For simplicity, use all-zero data:
    // RLE mode first (bit=0 means start with RLE):
    // RLE: count encoding (unary 0s then value)
    //   To encode 32 zeros: need n=32. table1[i]=(2<<i)-1
    //   i=4: table1[4]=31, so we need i=4 (4 one-bits then 0), then readint(5)=1
    //   That gives n=31+1=32
    //
    // Bit stream for one ram of 32 zeros:
    //   rle_start=0 (start with RLE)
    //   unary: 1111 0 (i=4)
    //   readint(5): 00001 (value=1)
    //   n = table1[4] + 1 = 31 + 1 = 32
    //
    // mode bits: 0 (mode=0)
    //
    // Let me build the bitstream:
    // width=1: 0001
    // height=1: 0001
    // ramorder=0: 0
    // ram0 rle_start: 0 (start RLE)
    // rle: 11110 00001 (32 zeros)
    // mode: 0
    // ram1 rle_start: 0 (start RLE)
    // rle: 11110 00001 (32 zeros)
    //
    // Total bits: 4+4+1+1+10+1+1+10 = 32 bits = 4 bytes
    // 0001 0001 0 0 11110 00001 0 0 11110 00001
    // = 0001 0001 | 0011 1100 | 0010 0111 | 1000 001x
    // Let me be more careful:
    // Bits: 0 0 0 1  0 0 0 1  0 0 1 1  1 1 0 0  0 0 0 1 0 0 1 1  1 1 0 0  0 0 0 1 (pad)
    //       -------- -------- -------- --------
    // Byte0: 00010001 = 0x11
    // Byte1: 00111100 = 0x3C
    // Byte2: 00010011 = 0x13
    // Byte3: 11000001 = 0xC1
    // Actually let me recalculate more carefully:
    //
    // Pos: 0  1  2  3  4  5  6  7 | 8  9 10 11 12 13 14 15 | 16 17 18 19 20 21 22 23 | 24 25 26 27 28 29 30 31
    // Bit: 0  0  0  1  0  0  0  1 | 0  0  1  1  1  1  0  0 | 0  0  0  1  0  0  1  1 | 1  1  0  0  0  0  0  1
    //
    // Byte0=0x11, Byte1=0x3C, Byte2=0x13, Byte3=0xC1

    const data = new Uint8Array([0x11, 0x3c, 0x13, 0xc1]);
    const decmp = new Gen1Decmp(data, 0);
    decmp.decompress();

    const result = decmp.getData();
    expect(result).not.toBeNull();
    // 1x1 tile in planar mode = size * 2 = 8*1 * 2 = 16 bytes
    expect(result!.length).toBe(16);
    // All zeros since we compressed all zeros
    expect(Array.from(result!)).toEqual(new Array(16).fill(0));
  });

  it("reports correct width and height after decompression", () => {
    const data = new Uint8Array([0x11, 0x3c, 0x13, 0xc1]);
    const decmp = new Gen1Decmp(data, 0);
    decmp.decompress();

    expect(decmp.getWidth()).toBe(8); // 1 tile * 8
    expect(decmp.getHeight()).toBe(8); // 1 tile * 8
  });

  it("transpose does nothing when data is null", () => {
    const data = new Uint8Array(256);
    const decmp = new Gen1Decmp(data, 0);
    // Don't call decompress, so data is null
    decmp.transpose(); // should not throw
    expect(decmp.getData()).toBeNull();
  });

  it("transpose works on decompressed data", () => {
    const data = new Uint8Array([0x11, 0x3c, 0x13, 0xc1]);
    const decmp = new Gen1Decmp(data, 0);
    decmp.decompress();
    decmp.transpose(); // should not throw
    const result = decmp.getData();
    expect(result).not.toBeNull();
    expect(result!.length).toBe(16);
  });

  it("getFlattenedData returns expanded pixel data", () => {
    const data = new Uint8Array([0x11, 0x3c, 0x13, 0xc1]);
    const decmp = new Gen1Decmp(data, 0);
    decmp.decompress();
    const flat = decmp.getFlattenedData();
    expect(flat).not.toBeNull();
    // Flattened: planar.length * 4 = 16 * 4 = 64
    expect(flat!.length).toBe(64);
    // All zeros since source is all zeros
    expect(Array.from(flat!)).toEqual(new Array(64).fill(0));
  });

  it("getFlattenedData returns null when not decompressed", () => {
    const data = new Uint8Array(256);
    const decmp = new Gen1Decmp(data, 0);
    expect(decmp.getFlattenedData()).toBeNull();
  });

  it("handles baseOffset correctly", () => {
    // Same data as the 1x1 test but with 2-byte padding
    const padded = new Uint8Array([0xFF, 0xFF, 0x11, 0x3c, 0x13, 0xc1]);
    const decmp = new Gen1Decmp(padded, 2);
    decmp.decompress();
    const result = decmp.getData();
    expect(result).not.toBeNull();
    expect(result!.length).toBe(16);
  });
});
