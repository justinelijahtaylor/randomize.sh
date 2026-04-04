import { describe, it, expect } from "vitest";
import { NARCArchive } from "../narc-archive";

/**
 * Build a minimal valid NARC byte structure in-memory.
 *
 * NARC layout:
 *   [NARC header: 16 bytes]
 *   [FATB frame: 8 + 4 + fileCount*8 bytes]
 *   [FNTB frame: 8 + 8 bytes (no filenames)]
 *   [FIMG frame: 8 + file data (4-byte aligned)]
 */
function buildMinimalNARC(files: Uint8Array[]): Uint8Array {
  // FATB frame content: 4 bytes file count + 8 bytes per file (start, end)
  const fatbContentSize = 4 + files.length * 8;
  const fatbFrameSize = 8 + fatbContentSize; // 8 for nitro header

  // FNTB frame: no filenames, just 8 bytes of content
  // unk1=4 means no filenames, then 0x10000
  const fntbContentSize = 8;
  const fntbFrameSize = 8 + fntbContentSize;

  // FIMG frame: 8 for header + padded file data
  let fimgDataSize = 0;
  for (const file of files) {
    fimgDataSize += Math.ceil(file.length / 4) * 4;
  }
  const fimgFrameSize = 8 + fimgDataSize;

  const totalSize = 16 + fatbFrameSize + fntbFrameSize + fimgFrameSize;
  const buf = new Uint8Array(totalSize);
  const dv = new DataView(buf.buffer);

  // -- NARC header --
  buf[0] = 0x4e; // N
  buf[1] = 0x41; // A
  buf[2] = 0x52; // R
  buf[3] = 0x43; // C
  dv.setUint16(4, 0xfffe, true); // BOM
  dv.setUint16(6, 0x0100, true); // version
  dv.setUint32(8, totalSize, true); // file size
  dv.setUint16(12, 0x10, true); // header size
  dv.setUint16(14, 3, true); // frame count

  let offset = 16;

  // -- FATB frame --
  // Magic is stored reversed: 'BTAF' in bytes = "FATB" when read reversed
  buf[offset] = 0x42; // B
  buf[offset + 1] = 0x54; // T
  buf[offset + 2] = 0x41; // A
  buf[offset + 3] = 0x46; // F
  dv.setUint32(offset + 4, fatbFrameSize, true);
  dv.setUint32(offset + 8, files.length, true); // file count

  let fimgOffset = 0;
  for (let i = 0; i < files.length; i++) {
    const paddedLen = Math.ceil(files[i].length / 4) * 4;
    dv.setUint32(offset + 12 + i * 8, fimgOffset, true); // start
    dv.setUint32(offset + 16 + i * 8, fimgOffset + files[i].length, true); // end
    fimgOffset += paddedLen;
  }
  offset += fatbFrameSize;

  // -- FNTB frame --
  buf[offset] = 0x42; // B
  buf[offset + 1] = 0x54; // T
  buf[offset + 2] = 0x4e; // N
  buf[offset + 3] = 0x46; // F
  dv.setUint32(offset + 4, fntbFrameSize, true);
  dv.setUint32(offset + 8, 4, true); // unk1=4 means no filenames
  dv.setUint32(offset + 12, 0x10000, true);
  offset += fntbFrameSize;

  // -- FIMG frame --
  buf[offset] = 0x47; // G
  buf[offset + 1] = 0x4d; // M
  buf[offset + 2] = 0x49; // I
  buf[offset + 3] = 0x46; // F
  dv.setUint32(offset + 4, fimgFrameSize, true);

  let dataOffset = offset + 8;
  for (const file of files) {
    buf.set(file, dataOffset);
    const paddedLen = Math.ceil(file.length / 4) * 4;
    // Fill padding with 0xFF
    for (let j = file.length; j < paddedLen; j++) {
      buf[dataOffset + j] = 0xff;
    }
    dataOffset += paddedLen;
  }

  return buf;
}

/**
 * Build a NARC with filenames.
 */
function buildNARCWithFilenames(
  files: Uint8Array[],
  filenames: string[],
): Uint8Array {
  const fatbContentSize = 4 + files.length * 8;
  const fatbFrameSize = 8 + fatbContentSize;

  // FNTB with filenames: unk1=8, then 0x10000, then length-prefixed names
  let fntbContentSize = 8; // unk1 + parent
  for (const name of filenames) {
    fntbContentSize += 1 + new TextEncoder().encode(name).length;
  }
  const fntbFrameSize = 8 + fntbContentSize;

  let fimgDataSize = 0;
  for (const file of files) {
    fimgDataSize += Math.ceil(file.length / 4) * 4;
  }
  const fimgFrameSize = 8 + fimgDataSize;

  const totalSize = 16 + fatbFrameSize + fntbFrameSize + fimgFrameSize;
  const buf = new Uint8Array(totalSize);
  const dv = new DataView(buf.buffer);

  // NARC header
  buf[0] = 0x4e;
  buf[1] = 0x41;
  buf[2] = 0x52;
  buf[3] = 0x43;
  dv.setUint16(4, 0xfffe, true);
  dv.setUint16(6, 0x0100, true);
  dv.setUint32(8, totalSize, true);
  dv.setUint16(12, 0x10, true);
  dv.setUint16(14, 3, true);

  let offset = 16;

  // FATB
  buf[offset] = 0x42;
  buf[offset + 1] = 0x54;
  buf[offset + 2] = 0x41;
  buf[offset + 3] = 0x46;
  dv.setUint32(offset + 4, fatbFrameSize, true);
  dv.setUint32(offset + 8, files.length, true);

  let fimgOffset = 0;
  for (let i = 0; i < files.length; i++) {
    const paddedLen = Math.ceil(files[i].length / 4) * 4;
    dv.setUint32(offset + 12 + i * 8, fimgOffset, true);
    dv.setUint32(offset + 16 + i * 8, fimgOffset + files[i].length, true);
    fimgOffset += paddedLen;
  }
  offset += fatbFrameSize;

  // FNTB with filenames
  buf[offset] = 0x42;
  buf[offset + 1] = 0x54;
  buf[offset + 2] = 0x4e;
  buf[offset + 3] = 0x46;
  dv.setUint32(offset + 4, fntbFrameSize, true);
  dv.setUint32(offset + 8, 8, true); // unk1=8 means filenames exist
  dv.setUint32(offset + 12, 0x10000, true);
  let fntbPos = offset + 16;
  for (const name of filenames) {
    const encoded = new TextEncoder().encode(name);
    buf[fntbPos] = encoded.length;
    buf.set(encoded, fntbPos + 1);
    fntbPos += 1 + encoded.length;
  }
  offset += fntbFrameSize;

  // FIMG
  buf[offset] = 0x47;
  buf[offset + 1] = 0x4d;
  buf[offset + 2] = 0x49;
  buf[offset + 3] = 0x46;
  dv.setUint32(offset + 4, fimgFrameSize, true);

  let dataOffset = offset + 8;
  for (const file of files) {
    buf.set(file, dataOffset);
    const paddedLen = Math.ceil(file.length / 4) * 4;
    for (let j = file.length; j < paddedLen; j++) {
      buf[dataOffset + j] = 0xff;
    }
    dataOffset += paddedLen;
  }

  return buf;
}

describe("NARCArchive", () => {
  it("should create an empty archive", () => {
    const narc = new NARCArchive();
    expect(narc.files).toEqual([]);
  });

  it("should parse a minimal NARC with no files", () => {
    const data = buildMinimalNARC([]);
    const narc = new NARCArchive(data);
    expect(narc.files.length).toBe(0);
  });

  it("should parse a NARC with one file", () => {
    const fileData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const data = buildMinimalNARC([fileData]);
    const narc = new NARCArchive(data);
    expect(narc.files.length).toBe(1);
    expect(narc.files[0]).toEqual(fileData);
  });

  it("should parse a NARC with multiple files", () => {
    const file1 = new Uint8Array([0xaa, 0xbb]);
    const file2 = new Uint8Array([0xcc, 0xdd, 0xee]);
    const file3 = new Uint8Array([0x11, 0x22, 0x33, 0x44, 0x55]);
    const data = buildMinimalNARC([file1, file2, file3]);
    const narc = new NARCArchive(data);
    expect(narc.files.length).toBe(3);
    expect(narc.files[0]).toEqual(file1);
    expect(narc.files[1]).toEqual(file2);
    expect(narc.files[2]).toEqual(file3);
  });

  it("should handle files that are not 4-byte aligned", () => {
    // 3-byte file should be padded to 4 bytes in FIMG
    const file1 = new Uint8Array([0x01, 0x02, 0x03]);
    const data = buildMinimalNARC([file1]);
    const narc = new NARCArchive(data);
    expect(narc.files.length).toBe(1);
    expect(narc.files[0]).toEqual(file1);
    expect(narc.files[0].length).toBe(3);
  });

  it("should round-trip: parse then getBytes matches original", () => {
    const file1 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const file2 = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11]);
    const originalData = buildMinimalNARC([file1, file2]);
    const narc = new NARCArchive(originalData);
    const outputData = narc.getBytes();

    // Parse the output again
    const narc2 = new NARCArchive(outputData);
    expect(narc2.files.length).toBe(2);
    expect(narc2.files[0]).toEqual(file1);
    expect(narc2.files[1]).toEqual(file2);
  });

  it("should produce identical bytes on round-trip for 4-byte aligned files", () => {
    const file1 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const file2 = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
    const originalData = buildMinimalNARC([file1, file2]);
    const narc = new NARCArchive(originalData);
    const outputData = narc.getBytes();
    expect(outputData).toEqual(originalData);
  });

  it("should throw on invalid NARC data", () => {
    const badData = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(() => new NARCArchive(badData)).toThrow("Not a valid narc file");
  });

  it("should produce a valid NARC from scratch via getBytes", () => {
    const narc = new NARCArchive();
    narc.files.push(new Uint8Array([0x10, 0x20, 0x30, 0x40]));
    narc.files.push(new Uint8Array([0xde, 0xad]));

    const bytes = narc.getBytes();
    // Parse it back
    const narc2 = new NARCArchive(bytes);
    expect(narc2.files.length).toBe(2);
    expect(narc2.files[0]).toEqual(new Uint8Array([0x10, 0x20, 0x30, 0x40]));
    expect(narc2.files[1]).toEqual(new Uint8Array([0xde, 0xad]));
  });

  it("should handle NARC header fields correctly", () => {
    const file1 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const narc = new NARCArchive();
    narc.files.push(file1);
    const bytes = narc.getBytes();
    const dv = new DataView(bytes.buffer);

    // Check NARC magic
    expect(bytes[0]).toBe(0x4e); // N
    expect(bytes[1]).toBe(0x41); // A
    expect(bytes[2]).toBe(0x52); // R
    expect(bytes[3]).toBe(0x43); // C

    // BOM
    expect(dv.getUint16(4, true)).toBe(0xfffe);
    // Version
    expect(dv.getUint16(6, true)).toBe(0x0100);
    // Total size
    expect(dv.getUint32(8, true)).toBe(bytes.length);
    // Header size
    expect(dv.getUint16(12, true)).toBe(0x10);
    // Frame count
    expect(dv.getUint16(14, true)).toBe(3);
  });

  it("should parse NARC with filenames", () => {
    const file1 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const file2 = new Uint8Array([0xaa, 0xbb]);
    const data = buildNARCWithFilenames(
      [file1, file2],
      ["test.bin", "data.dat"],
    );
    const narc = new NARCArchive(data);
    expect(narc.files.length).toBe(2);
    expect(narc.files[0]).toEqual(file1);
    expect(narc.files[1]).toEqual(file2);
  });
});
