import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Helper: write a little-endian uint32 into a buffer.
 */
function writeLE32(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
  buf[offset + 3] = (value >> 24) & 0xff;
}

function writeLE16(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
}

function readLE32(buf: Uint8Array, offset: number): number {
  return (
    ((buf[offset] & 0xff) |
      ((buf[offset + 1] & 0xff) << 8) |
      ((buf[offset + 2] & 0xff) << 16) |
      ((buf[offset + 3] & 0xff) << 24)) >>>
    0
  );
}

function readLE16(buf: Uint8Array, offset: number): number {
  return (buf[offset] & 0xff) | ((buf[offset + 1] & 0xff) << 8);
}

describe("NDS ROM header parsing logic", () => {
  it("should correctly read rom code from offset 0x0C", () => {
    // Simulate a header buffer with rom code "ABCD" at offset 0x0C
    const header = new Uint8Array(0x200);
    header[0x0c] = 0x41; // A
    header[0x0d] = 0x42; // B
    header[0x0e] = 0x43; // C
    header[0x0f] = 0x44; // D

    const romCode = new TextDecoder("ascii").decode(
      header.subarray(0x0c, 0x10),
    );
    expect(romCode).toBe("ABCD");
  });

  it("should correctly read version byte from offset 0x1E", () => {
    const header = new Uint8Array(0x200);
    header[0x1e] = 0x05;
    expect(header[0x1e]).toBe(5);
  });

  it("should correctly read FNT/FAT offsets from header", () => {
    const header = new Uint8Array(0x200);
    // FNT offset at 0x40
    writeLE32(header, 0x40, 0x1000);
    // FNT size at 0x44
    writeLE32(header, 0x44, 0x200);
    // FAT offset at 0x48
    writeLE32(header, 0x48, 0x1200);
    // FAT size at 0x4C
    writeLE32(header, 0x4c, 0x100);

    expect(readLE32(header, 0x40)).toBe(0x1000);
    expect(readLE32(header, 0x44)).toBe(0x200);
    expect(readLE32(header, 0x48)).toBe(0x1200);
    expect(readLE32(header, 0x4c)).toBe(0x100);
  });

  it("should correctly read ARM9 overlay table offsets", () => {
    const header = new Uint8Array(0x200);
    writeLE32(header, 0x50, 0x3000); // arm9 ovl table offset
    writeLE32(header, 0x54, 0x40); // arm9 ovl table size (2 overlays * 32 = 64)

    const arm9_ovl_offset = readLE32(header, 0x50);
    const arm9_ovl_size = readLE32(header, 0x54);
    const arm9_ovl_count = (arm9_ovl_size / 32) | 0;

    expect(arm9_ovl_offset).toBe(0x3000);
    expect(arm9_ovl_size).toBe(0x40);
    expect(arm9_ovl_count).toBe(2);
  });
});

describe("NDS ROM FNT table parsing", () => {
  it("should parse a simple FNT main table", () => {
    // FNT main table entry: 8 bytes per directory
    // [subtable_offset(4), first_file_id(2), parent_dir_id(2)]
    const dircount = 2;
    const fntMain = new Uint8Array(dircount * 8);

    // Root directory (dir 0)
    // subtable offset = 16 (relative to FNT start, so 16 means right after main table)
    writeLE32(fntMain, 0, 16);
    writeLE16(fntMain, 4, 0); // first file ID = 0
    writeLE16(fntMain, 6, 2); // dir count (stored as parent for root)

    // Sub directory (dir 1)
    writeLE32(fntMain, 8, 30); // subtable offset
    writeLE16(fntMain, 12, 2); // first file ID = 2
    writeLE16(fntMain, 14, 0xf000); // parent = root

    // Parse main table
    const subTableOffsets: number[] = [];
    const firstFileIDs: number[] = [];
    const parentDirIDs: number[] = [];
    const fntOffset = 0x1000; // hypothetical FNT start

    for (let i = 0; i < dircount; i++) {
      let result = 0;
      for (let b = 0; b < 4; b++) {
        result |= (fntMain[i * 8 + b] & 0xff) << (b * 8);
      }
      subTableOffsets.push((result >>> 0) + fntOffset);

      let fid = 0;
      for (let b = 0; b < 2; b++) {
        fid |= (fntMain[i * 8 + 4 + b] & 0xff) << (b * 8);
      }
      firstFileIDs.push(fid);

      let pid = 0;
      for (let b = 0; b < 2; b++) {
        pid |= (fntMain[i * 8 + 6 + b] & 0xff) << (b * 8);
      }
      parentDirIDs.push(pid);
    }

    expect(subTableOffsets[0]).toBe(fntOffset + 16);
    expect(subTableOffsets[1]).toBe(fntOffset + 30);
    expect(firstFileIDs[0]).toBe(0);
    expect(firstFileIDs[1]).toBe(2);
    expect(parentDirIDs[0]).toBe(2); // root's "parent" is actually dir count
    expect(parentDirIDs[1]).toBe(0xf000); // parent is root
  });

  it("should parse FNT subtable entries", () => {
    // Subtable: sequence of entries
    // [control(1)][name(control & 0x7F bytes)][dirID(2) if control & 0x80]
    // terminated by 0x00
    const subtable = new Uint8Array(64);
    let pos = 0;

    // File entry: "test.bin" (8 chars)
    const name1 = new TextEncoder().encode("test.bin");
    subtable[pos] = name1.length; // control = length, no 0x80 bit = file
    pos++;
    subtable.set(name1, pos);
    pos += name1.length;

    // Directory entry: "subdir" (6 chars) with dir ID 0xF001
    const name2 = new TextEncoder().encode("subdir");
    subtable[pos] = name2.length | 0x80; // control with 0x80 = directory
    pos++;
    subtable.set(name2, pos);
    pos += name2.length;
    writeLE16(subtable, pos, 0xf001);
    pos += 2;

    // Another file: "data.dat" (8 chars)
    const name3 = new TextEncoder().encode("data.dat");
    subtable[pos] = name3.length;
    pos++;
    subtable.set(name3, pos);
    pos += name3.length;

    // Terminator
    subtable[pos] = 0x00;

    // Parse it
    let parsePos = 0;
    let firstFileID = 0;
    const filenames = new Map<number, string>();
    const directoryNames: (string | null)[] = [null, null];

    while (true) {
      const control = subtable[parsePos];
      if (control === 0x00) break;
      parsePos++;
      const namelen = control & 0x7f;
      const rawname = subtable.subarray(parsePos, parsePos + namelen);
      const name = new TextDecoder("ascii").decode(rawname);
      parsePos += namelen;

      if ((control & 0x80) > 0) {
        const subDirID = readLE16(subtable, parsePos);
        parsePos += 2;
        directoryNames[subDirID - 0xf000] = name;
      } else {
        filenames.set(firstFileID++, name);
      }
    }

    expect(filenames.size).toBe(2);
    expect(filenames.get(0)).toBe("test.bin");
    expect(filenames.get(1)).toBe("data.dat");
    expect(directoryNames[1]).toBe("subdir");
  });
});

describe("NDS ROM FAT table parsing", () => {
  it("should parse FAT entries to get file offsets and sizes", () => {
    // FAT: 8 bytes per file [start(4), end(4)]
    const fileCount = 3;
    const fat = new Uint8Array(fileCount * 8);

    // File 0: offset 0x4000, size 0x100
    writeLE32(fat, 0, 0x4000);
    writeLE32(fat, 4, 0x4100);

    // File 1: offset 0x4200, size 0x50
    writeLE32(fat, 8, 0x4200);
    writeLE32(fat, 12, 0x4250);

    // File 2: offset 0x4300, size 0x200
    writeLE32(fat, 16, 0x4300);
    writeLE32(fat, 20, 0x4500);

    for (let fid = 0; fid < fileCount; fid++) {
      const start = readLE32(fat, fid * 8);
      const end = readLE32(fat, fid * 8 + 4);
      const size = end - start;

      switch (fid) {
        case 0:
          expect(start).toBe(0x4000);
          expect(size).toBe(0x100);
          break;
        case 1:
          expect(start).toBe(0x4200);
          expect(size).toBe(0x50);
          break;
        case 2:
          expect(start).toBe(0x4300);
          expect(size).toBe(0x200);
          break;
      }
    }
  });

  it("should handle alignment calculations correctly", () => {
    const ALIGN = 0x1ff;

    // Test alignment: (offset + align) & ~align rounds up to next 0x200 boundary
    // but note: if already aligned, adds another 0x200 because align is added first
    expect((0x100 + ALIGN) & ~ALIGN).toBe(0x200);
    expect((0x200 + ALIGN) & ~ALIGN).toBe(0x200); // 0x200 + 0x1FF = 0x3FF, & ~0x1FF = 0x200
    expect((0x1ff + ALIGN) & ~ALIGN).toBe(0x200);
    expect((0x201 + ALIGN) & ~ALIGN).toBe(0x400);
    expect((0x400 + ALIGN) & ~ALIGN).toBe(0x400); // same logic
  });

  it("should calculate device capacity correctly", () => {
    // Replicate the device capacity calculation from NDSRom.saveTo
    function calcDeviceCap(filesize: number): number {
      let newfilesize = filesize;
      newfilesize |= newfilesize >> 16;
      newfilesize |= newfilesize >> 8;
      newfilesize |= newfilesize >> 4;
      newfilesize |= newfilesize >> 2;
      newfilesize |= newfilesize >> 1;
      newfilesize++;
      if (newfilesize <= 128 * 1024) {
        newfilesize = 128 * 1024;
      }
      let devcap = -18;
      let x = newfilesize;
      while (x !== 0) {
        x >>>= 1;
        devcap++;
      }
      return devcap < 0 ? 0 : devcap;
    }

    // The algorithm rounds up to next power of 2, then counts bits.
    // 128KB = 0x20000 -> rounds to 0x40000 (256KB) -> devcap = 1
    expect(calcDeviceCap(128 * 1024)).toBe(1);

    // 256KB = 0x40000 -> rounds to 0x80000 (512KB) -> devcap = 2
    expect(calcDeviceCap(256 * 1024)).toBe(2);

    // 1MB = 0x100000 -> rounds to 0x200000 (2MB) -> devcap = 4
    expect(calcDeviceCap(1024 * 1024)).toBe(4);

    // 4MB = 0x400000 -> rounds to 0x800000 (8MB) -> devcap = 6
    expect(calcDeviceCap(4 * 1024 * 1024)).toBe(6);

    // 32MB = 0x2000000 -> rounds to 0x4000000 (64MB) -> devcap = 9
    expect(calcDeviceCap(32 * 1024 * 1024)).toBe(9);

    // 128MB = 0x8000000 -> rounds to 0x10000000 (256MB) -> devcap = 11
    expect(calcDeviceCap(128 * 1024 * 1024)).toBe(11);
  });
});

describe("NDS ROM Y9 overlay table parsing", () => {
  it("should parse a synthetic Y9 overlay table", () => {
    // Each Y9 entry is 32 bytes
    const overlayCount = 2;
    const y9table = new Uint8Array(overlayCount * 32);

    // Overlay 0
    writeLE32(y9table, 0, 0); // overlay_id
    writeLE32(y9table, 4, 0x02000000); // ram_address
    writeLE32(y9table, 8, 0x1000); // ram_size
    writeLE32(y9table, 12, 0x100); // bss_size
    writeLE32(y9table, 16, 0x02000000); // static_start
    writeLE32(y9table, 20, 0x02001000); // static_end
    writeLE32(y9table, 24, 100); // file_id
    // compressed_size (3 bytes) + compress_flag (1 byte) at offset 28
    y9table[28] = 0x00;
    y9table[29] = 0x10;
    y9table[30] = 0x00;
    y9table[31] = 0x00; // no compression

    // Overlay 1
    writeLE32(y9table, 32 + 0, 1); // overlay_id
    writeLE32(y9table, 32 + 4, 0x02100000); // ram_address
    writeLE32(y9table, 32 + 8, 0x2000); // ram_size
    writeLE32(y9table, 32 + 12, 0x200); // bss_size
    writeLE32(y9table, 32 + 16, 0x02100000); // static_start
    writeLE32(y9table, 32 + 20, 0x02102000); // static_end
    writeLE32(y9table, 32 + 24, 101); // file_id
    y9table[32 + 28] = 0x00;
    y9table[32 + 29] = 0x18;
    y9table[32 + 30] = 0x00;
    y9table[32 + 31] = 0x01; // compressed

    // Read like NDSRom does
    function readFromByteArr(
      data: Uint8Array,
      offset: number,
      size: number,
    ): number {
      let result = 0;
      for (let i = 0; i < size; i++) {
        result |= (data[i + offset] & 0xff) << (i * 8);
      }
      return result >>> 0;
    }

    // Overlay 0
    expect(readFromByteArr(y9table, 24, 4)).toBe(100);
    expect(readFromByteArr(y9table, 4, 4)).toBe(0x02000000);
    expect(readFromByteArr(y9table, 8, 4)).toBe(0x1000);
    expect(readFromByteArr(y9table, 12, 4)).toBe(0x100);
    expect(readFromByteArr(y9table, 16, 4)).toBe(0x02000000);
    expect(readFromByteArr(y9table, 20, 4)).toBe(0x02001000);
    expect(readFromByteArr(y9table, 28, 3)).toBe(0x1000);
    expect(y9table[31] & 0xff).toBe(0);

    // Overlay 1
    expect(readFromByteArr(y9table, 32 + 24, 4)).toBe(101);
    expect(readFromByteArr(y9table, 32 + 4, 4)).toBe(0x02100000);
    expect(readFromByteArr(y9table, 32 + 8, 4)).toBe(0x2000);
    expect(readFromByteArr(y9table, 32 + 12, 4)).toBe(0x200);
    expect(readFromByteArr(y9table, 32 + 28, 3)).toBe(0x1800);
    expect(y9table[32 + 31] & 0xff).toBe(1);
  });
});

describe("NDS ROM byte array helpers", () => {
  it("should correctly read little-endian values of various sizes", () => {
    function readFromByteArr(
      data: Uint8Array,
      offset: number,
      size: number,
    ): number {
      let result = 0;
      for (let i = 0; i < size; i++) {
        result |= (data[i + offset] & 0xff) << (i * 8);
      }
      return result >>> 0;
    }

    const data = new Uint8Array([0x78, 0x56, 0x34, 0x12]);

    // 1 byte
    expect(readFromByteArr(data, 0, 1)).toBe(0x78);
    // 2 bytes (little-endian)
    expect(readFromByteArr(data, 0, 2)).toBe(0x5678);
    // 3 bytes
    expect(readFromByteArr(data, 0, 3)).toBe(0x345678);
    // 4 bytes
    expect(readFromByteArr(data, 0, 4)).toBe(0x12345678);
  });

  it("should correctly write little-endian values of various sizes", () => {
    function writeToByteArr(
      data: Uint8Array,
      offset: number,
      size: number,
      value: number,
    ): void {
      for (let i = 0; i < size; i++) {
        data[offset + i] = (value >> (i * 8)) & 0xff;
      }
    }

    const data = new Uint8Array(4);
    writeToByteArr(data, 0, 4, 0x12345678);
    expect(data[0]).toBe(0x78);
    expect(data[1]).toBe(0x56);
    expect(data[2]).toBe(0x34);
    expect(data[3]).toBe(0x12);

    const data2 = new Uint8Array(3);
    writeToByteArr(data2, 0, 3, 0x345678);
    expect(data2[0]).toBe(0x78);
    expect(data2[1]).toBe(0x56);
    expect(data2[2]).toBe(0x34);
  });
});
