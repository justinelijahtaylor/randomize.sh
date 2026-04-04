import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { NCCH } from "../ncch.js";

describe("NCCH", () => {
  describe("alignInt", () => {
    it("should align values to given alignment", () => {
      expect(NCCH.alignInt(0, 4)).toBe(0);
      expect(NCCH.alignInt(1, 4)).toBe(4);
      expect(NCCH.alignInt(4, 4)).toBe(4);
      expect(NCCH.alignInt(5, 4)).toBe(8);
      expect(NCCH.alignInt(7, 8)).toBe(8);
      expect(NCCH.alignInt(8, 8)).toBe(8);
      expect(NCCH.alignInt(9, 8)).toBe(16);
    });
  });

  describe("alignLong", () => {
    it("should align larger values", () => {
      expect(NCCH.alignLong(0, 64)).toBe(0);
      expect(NCCH.alignLong(1, 64)).toBe(64);
      expect(NCCH.alignLong(64, 64)).toBe(64);
      expect(NCCH.alignLong(65, 64)).toBe(128);
      expect(NCCH.alignLong(0x1000, 0x200)).toBe(0x1000);
      expect(NCCH.alignLong(0x1001, 0x200)).toBe(0x1200);
    });
  });

  describe("getCXIOffsetInFile", () => {
    it("should return -1 for non-3DS files", () => {
      const tmpFile = path.join(
        os.tmpdir(),
        `ncch-test-${Date.now()}.bin`
      );
      const data = Buffer.alloc(0x200, 0);
      fs.writeFileSync(tmpFile, data);
      try {
        const offset = NCCH.getCXIOffsetInFile(tmpFile);
        expect(offset).toBe(-1);
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it("should return 0 for a file with NCCH magic at offset 0x100", () => {
      const tmpFile = path.join(
        os.tmpdir(),
        `ncch-test-ncch-${Date.now()}.bin`
      );
      const data = Buffer.alloc(0x200, 0);
      // Write NCCH magic (big-endian) at offset 0x100
      data.writeUInt32BE(0x4e434348, 0x100);
      fs.writeFileSync(tmpFile, data);
      try {
        const offset = NCCH.getCXIOffsetInFile(tmpFile);
        expect(offset).toBe(0);
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });

    it("should return 0x4000 for a file with NCSD magic at offset 0x100", () => {
      const tmpFile = path.join(
        os.tmpdir(),
        `ncch-test-ncsd-${Date.now()}.bin`
      );
      const data = Buffer.alloc(0x200, 0);
      // Write NCSD magic (big-endian) at offset 0x100
      data.writeUInt32BE(0x4e435344, 0x100);
      fs.writeFileSync(tmpFile, data);
      try {
        const offset = NCCH.getCXIOffsetInFile(tmpFile);
        expect(offset).toBe(0x4000);
      } finally {
        fs.unlinkSync(tmpFile);
      }
    });
  });
});
