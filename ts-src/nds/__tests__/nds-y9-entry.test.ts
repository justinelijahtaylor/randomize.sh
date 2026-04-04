import { describe, it, expect } from "vitest";
import { NDSY9Entry } from "../nds-y9-entry";
import type { NDSRom } from "../nds-rom";

function makeMockParent(overrides: Partial<NDSRom> = {}): NDSRom {
  return {
    reopenROM: () => {},
    getBaseRomFd: () => -1,
    isWritingEnabled: () => false,
    getTmpFolder: () => "/tmp/test",
    ...overrides,
  } as unknown as NDSRom;
}

describe("NDSY9Entry", () => {
  it("should initialize with default values", () => {
    const parent = makeMockParent();
    const entry = new NDSY9Entry(parent);
    expect(entry.offset).toBe(0);
    expect(entry.size).toBe(0);
    expect(entry.original_size).toBe(0);
    expect(entry.fileID).toBe(0);
    expect(entry.overlay_id).toBe(0);
    expect(entry.ram_address).toBe(0);
    expect(entry.ram_size).toBe(0);
    expect(entry.bss_size).toBe(0);
    expect(entry.static_start).toBe(0);
    expect(entry.static_end).toBe(0);
    expect(entry.compressed_size).toBe(0);
    expect(entry.compress_flag).toBe(0);
    expect(entry.data).toBeNull();
    expect(entry.originalCRC).toBe(0);
  });

  it("should allow setting overlay properties", () => {
    const parent = makeMockParent();
    const entry = new NDSY9Entry(parent);
    entry.overlay_id = 5;
    entry.ram_address = 0x02000000;
    entry.ram_size = 0x1000;
    entry.bss_size = 0x100;
    entry.static_start = 0x02000000;
    entry.static_end = 0x02001000;
    entry.compressed_size = 0x800;
    entry.compress_flag = 1;
    entry.fileID = 10;

    expect(entry.overlay_id).toBe(5);
    expect(entry.ram_address).toBe(0x02000000);
    expect(entry.ram_size).toBe(0x1000);
    expect(entry.bss_size).toBe(0x100);
    expect(entry.static_start).toBe(0x02000000);
    expect(entry.static_end).toBe(0x02001000);
    expect(entry.compressed_size).toBe(0x800);
    expect(entry.compress_flag).toBe(1);
    expect(entry.fileID).toBe(10);
  });

  it("should return null from getOverrideContents when not extracted", () => {
    const parent = makeMockParent();
    const entry = new NDSY9Entry(parent);
    expect(entry.getOverrideContents()).toBeNull();
  });

  it("should read contents from file descriptor", () => {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const tmpFile = path.join(os.tmpdir(), "y9-entry-test.bin");
    const testData = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x02]);
    fs.writeFileSync(tmpFile, testData);
    const fd = fs.openSync(tmpFile, "r");

    try {
      const parent = makeMockParent({
        getBaseRomFd: () => fd,
        isWritingEnabled: () => false,
      });
      const entry = new NDSY9Entry(parent);
      entry.offset = 0;
      entry.original_size = 6;
      entry.size = 6;
      entry.overlay_id = 0;

      const contents = entry.getContents();
      expect(contents).toEqual(testData);
      expect(entry.originalCRC).not.toBe(0);
    } finally {
      fs.closeSync(fd);
      fs.unlinkSync(tmpFile);
    }
  });

  it("should update size on writeOverride", () => {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const tmpFile = path.join(os.tmpdir(), "y9-entry-test2.bin");
    const testData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    fs.writeFileSync(tmpFile, testData);
    const fd = fs.openSync(tmpFile, "r");

    try {
      const parent = makeMockParent({
        getBaseRomFd: () => fd,
        isWritingEnabled: () => false,
      });
      const entry = new NDSY9Entry(parent);
      entry.offset = 0;
      entry.original_size = 4;
      entry.size = 4;
      entry.overlay_id = 1;

      const newData = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
      entry.writeOverride(newData);
      expect(entry.size).toBe(6);

      const override = entry.getOverrideContents();
      expect(override).not.toBeNull();
      expect(override).toEqual(newData);
    } finally {
      fs.closeSync(fd);
      fs.unlinkSync(tmpFile);
    }
  });

  it("should parse Y9 table entry fields correctly", () => {
    // Simulate how NDSRom parses a y9 table entry
    const y9table = new Uint8Array(32);
    const dv = new DataView(y9table.buffer);

    // overlay_id at offset 0 (read by NDSRom, not stored in y9table directly for entry)
    // ram_address at offset 4
    dv.setUint32(4, 0x02100000, true);
    // ram_size at offset 8
    dv.setUint32(8, 0x2000, true);
    // bss_size at offset 12
    dv.setUint32(12, 0x400, true);
    // static_start at offset 16
    dv.setUint32(16, 0x02100000, true);
    // static_end at offset 20
    dv.setUint32(20, 0x02102000, true);
    // file_id at offset 24
    dv.setUint32(24, 7, true);
    // compressed_size at offset 28 (3 bytes)
    y9table[28] = 0x00;
    y9table[29] = 0x18;
    y9table[30] = 0x00;
    // compress_flag at offset 31
    y9table[31] = 0x01;

    // Read values like NDSRom does
    function readFromByteArr(data: Uint8Array, offset: number, size: number): number {
      let result = 0;
      for (let i = 0; i < size; i++) {
        result |= (data[i + offset] & 0xFF) << (i * 8);
      }
      return result >>> 0;
    }

    const parent = makeMockParent();
    const entry = new NDSY9Entry(parent);
    entry.ram_address = readFromByteArr(y9table, 4, 4);
    entry.ram_size = readFromByteArr(y9table, 8, 4);
    entry.bss_size = readFromByteArr(y9table, 12, 4);
    entry.static_start = readFromByteArr(y9table, 16, 4);
    entry.static_end = readFromByteArr(y9table, 20, 4);
    entry.fileID = readFromByteArr(y9table, 24, 4);
    entry.compressed_size = readFromByteArr(y9table, 28, 3);
    entry.compress_flag = y9table[31] & 0xFF;

    expect(entry.ram_address).toBe(0x02100000);
    expect(entry.ram_size).toBe(0x2000);
    expect(entry.bss_size).toBe(0x400);
    expect(entry.static_start).toBe(0x02100000);
    expect(entry.static_end).toBe(0x02102000);
    expect(entry.fileID).toBe(7);
    expect(entry.compressed_size).toBe(0x1800);
    expect(entry.compress_flag).toBe(1);
  });
});
