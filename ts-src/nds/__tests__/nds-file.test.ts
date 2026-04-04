import { describe, it, expect } from "vitest";
import { NDSFile } from "../nds-file";
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

describe("NDSFile", () => {
  it("should initialize with default values", () => {
    const parent = makeMockParent();
    const file = new NDSFile(parent);
    expect(file.offset).toBe(0);
    expect(file.size).toBe(0);
    expect(file.fileID).toBe(0);
    expect(file.fullPath).toBe("");
    expect(file.data).toBeNull();
    expect(file.originalCRC).toBe(0);
  });

  it("should allow setting properties", () => {
    const parent = makeMockParent();
    const file = new NDSFile(parent);
    file.offset = 0x1000;
    file.size = 256;
    file.fileID = 42;
    file.fullPath = "data/test.bin";

    expect(file.offset).toBe(0x1000);
    expect(file.size).toBe(256);
    expect(file.fileID).toBe(42);
    expect(file.fullPath).toBe("data/test.bin");
  });

  it("should return null from getOverrideContents when not extracted", () => {
    const parent = makeMockParent();
    const file = new NDSFile(parent);
    expect(file.getOverrideContents()).toBeNull();
  });

  it("should store data in RAM when writing is disabled", () => {
    // Create a temporary file with known content
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const tmpFile = path.join(os.tmpdir(), "nds-file-test.bin");
    const testData = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]);
    fs.writeFileSync(tmpFile, testData);
    const fd = fs.openSync(tmpFile, "r");

    try {
      const parent = makeMockParent({
        getBaseRomFd: () => fd,
        isWritingEnabled: () => false,
      });
      const file = new NDSFile(parent);
      file.offset = 0;
      file.size = 5;
      file.fullPath = "test.bin";

      const contents = file.getContents();
      expect(contents).toEqual(testData);
      // Verify it returns a copy, not the same reference
      expect(contents).not.toBe(file.data);
      expect(file.data).toEqual(testData);
    } finally {
      fs.closeSync(fd);
      fs.unlinkSync(tmpFile);
    }
  });

  it("should allow writeOverride and return from getOverrideContents", () => {
    const fs = require("fs");
    const os = require("os");
    const path = require("path");
    const tmpFile = path.join(os.tmpdir(), "nds-file-test2.bin");
    const testData = new Uint8Array([0x10, 0x20, 0x30]);
    fs.writeFileSync(tmpFile, testData);
    const fd = fs.openSync(tmpFile, "r");

    try {
      const parent = makeMockParent({
        getBaseRomFd: () => fd,
        isWritingEnabled: () => false,
      });
      const file = new NDSFile(parent);
      file.offset = 0;
      file.size = 3;
      file.fullPath = "test2.bin";

      const newData = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]);
      file.writeOverride(newData);

      const override = file.getOverrideContents();
      expect(override).not.toBeNull();
      expect(override).toEqual(newData);
    } finally {
      fs.closeSync(fd);
      fs.unlinkSync(tmpFile);
    }
  });
});
