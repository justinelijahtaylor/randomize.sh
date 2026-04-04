import { describe, it, expect } from "vitest";
import { GARCArchive } from "../garc-archive.js";

/**
 * Build a synthetic GARC binary in memory.
 * Each file entry has a single sub-entry (bit 0 set).
 */
function buildGarcBytes(
  version: 4 | 6,
  files: Uint8Array[]
): Uint8Array {
  const VER_4 = 0x0400;
  const VER_6 = 0x0600;

  const fileCount = files.length;
  const garcHeaderSize = version === 4 ? 0x1c : 0x24;
  const fatoHeaderSize = 12 + fileCount * 4;
  // Each FATB entry: 4 (vector) + 12 (one sub-entry) = 16 bytes
  const fatbHeaderSize = 12 + fileCount * 16;
  const fimbHeaderSize = 12;
  const padTo = version === 4 ? 4 : 4;

  // Compute data payload
  let dataPayloadSize = 0;
  const filePaddedSizes: number[] = [];
  for (let i = 0; i < fileCount; i++) {
    let paddedSize = files[i].length;
    const rem = paddedSize % padTo;
    if (rem !== 0) {
      paddedSize += padTo - rem;
    }
    filePaddedSizes.push(paddedSize);
    dataPayloadSize += paddedSize;
  }

  const dataOffset =
    garcHeaderSize + fatoHeaderSize + fatbHeaderSize + fimbHeaderSize;
  const totalSize = dataOffset + dataPayloadSize;

  const buf = Buffer.alloc(totalSize);

  // GARC header
  buf.write("CRAG", 0, 4, "ascii");
  buf.writeInt32LE(garcHeaderSize, 4);
  buf.writeUInt16LE(0xfeff, 8); // endianness
  buf.writeUInt16LE(version === 4 ? VER_4 : VER_6, 10);
  buf.writeInt32LE(4, 12); // frameCount
  buf.writeInt32LE(dataOffset, 16);
  buf.writeInt32LE(totalSize, 20);
  if (version === 4) {
    let largestUnpadded = 0;
    for (const f of files) {
      if (f.length > largestUnpadded) largestUnpadded = f.length;
    }
    buf.writeInt32LE(largestUnpadded, 24);
  } else {
    let largestPadded = 0;
    let largestUnpadded = 0;
    for (let i = 0; i < fileCount; i++) {
      if (filePaddedSizes[i] > largestPadded)
        largestPadded = filePaddedSizes[i];
      if (files[i].length > largestUnpadded)
        largestUnpadded = files[i].length;
    }
    buf.writeInt32LE(largestPadded, 24);
    buf.writeInt32LE(largestUnpadded, 28);
    buf.writeInt32LE(padTo, 32);
  }

  // FATO
  let pos = garcHeaderSize;
  buf.write("OTAF", pos, 4, "ascii");
  buf.writeInt32LE(fatoHeaderSize, pos + 4);
  buf.writeUInt16LE(fileCount, pos + 8);
  buf.writeUInt16LE(0xff, pos + 10); // padding byte
  // FATO entries: offset into FATB body for each file
  for (let i = 0; i < fileCount; i++) {
    buf.writeInt32LE(i * 16, pos + 12 + i * 4);
  }
  pos += fatoHeaderSize;

  // FATB
  buf.write("BTAF", pos, 4, "ascii");
  buf.writeInt32LE(fatbHeaderSize, pos + 4);
  buf.writeInt32LE(fileCount, pos + 8);
  let fatbPos = pos + 12;
  let dataPos = 0;
  for (let i = 0; i < fileCount; i++) {
    buf.writeInt32LE(1, fatbPos); // vector = bit 0 set
    fatbPos += 4;
    buf.writeInt32LE(dataPos, fatbPos); // start
    fatbPos += 4;
    buf.writeInt32LE(dataPos + files[i].length, fatbPos); // end
    fatbPos += 4;
    buf.writeInt32LE(files[i].length, fatbPos); // length
    fatbPos += 4;
    dataPos += filePaddedSizes[i];
  }
  pos += fatbHeaderSize;

  // FIMB
  buf.write("BMIF", pos, 4, "ascii");
  buf.writeInt32LE(fimbHeaderSize, pos + 4);
  buf.writeInt32LE(dataPayloadSize, pos + 8);
  pos += fimbHeaderSize;

  // File data
  let filePos = pos;
  for (let i = 0; i < fileCount; i++) {
    buf.set(files[i], filePos);
    filePos += filePaddedSizes[i];
  }

  return new Uint8Array(buf);
}

describe("GARCArchive", () => {
  describe("version 4", () => {
    it("should parse a v4 GARC with one file", () => {
      const fileData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
      const garcBytes = buildGarcBytes(4, [fileData]);
      const garc = new GARCArchive(garcBytes, true);
      expect(garc.fileCount).toBe(1);
      expect(garc.garcVersion).toBe(4);
      expect(garc.getFile(0)).toEqual(fileData);
    });

    it("should parse a v4 GARC with multiple files", () => {
      const file0 = new Uint8Array([0xaa, 0xbb]);
      const file1 = new Uint8Array([0xcc, 0xdd, 0xee]);
      const file2 = new Uint8Array([0xff]);
      const garcBytes = buildGarcBytes(4, [file0, file1, file2]);
      const garc = new GARCArchive(garcBytes, true);
      expect(garc.fileCount).toBe(3);
      expect(garc.getFile(0)).toEqual(file0);
      expect(garc.getFile(1)).toEqual(file1);
      expect(garc.getFile(2)).toEqual(file2);
    });

    it("should roundtrip getBytes for v4", () => {
      const file0 = new Uint8Array([0x10, 0x20, 0x30, 0x40]);
      const file1 = new Uint8Array([0x50, 0x60, 0x70, 0x80]);
      const garcBytes = buildGarcBytes(4, [file0, file1]);
      const garc = new GARCArchive(garcBytes, true);

      const rewritten = garc.getBytes();
      const garc2 = new GARCArchive(rewritten, true);
      expect(garc2.fileCount).toBe(2);
      expect(garc2.getFile(0)).toEqual(file0);
      expect(garc2.getFile(1)).toEqual(file1);
    });
  });

  describe("version 6", () => {
    it("should parse a v6 GARC with one file", () => {
      const fileData = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const garcBytes = buildGarcBytes(6, [fileData]);
      const garc = new GARCArchive(garcBytes, true);
      expect(garc.fileCount).toBe(1);
      expect(garc.garcVersion).toBe(6);
      expect(garc.getFile(0)).toEqual(fileData);
    });

    it("should parse a v6 GARC with multiple files", () => {
      const files = [
        new Uint8Array([1, 2, 3, 4]),
        new Uint8Array([5, 6]),
        new Uint8Array([7, 8, 9]),
      ];
      const garcBytes = buildGarcBytes(6, files);
      const garc = new GARCArchive(garcBytes, true);
      expect(garc.fileCount).toBe(3);
      for (let i = 0; i < files.length; i++) {
        expect(garc.getFile(i)).toEqual(files[i]);
      }
    });

    it("should roundtrip getBytes for v6", () => {
      const files = [
        new Uint8Array([0xca, 0xfe]),
        new Uint8Array([0xba, 0xbe, 0x01, 0x02]),
      ];
      const garcBytes = buildGarcBytes(6, files);
      const garc = new GARCArchive(garcBytes, true);

      const rewritten = garc.getBytes();
      const garc2 = new GARCArchive(rewritten, true);
      expect(garc2.fileCount).toBe(2);
      expect(garc2.getFile(0)).toEqual(files[0]);
      expect(garc2.getFile(1)).toEqual(files[1]);
    });
  });

  describe("setFile / getDirectory", () => {
    it("should update file data via setFile", () => {
      const file = new Uint8Array([1, 2, 3, 4]);
      const garcBytes = buildGarcBytes(4, [file]);
      const garc = new GARCArchive(garcBytes, true);

      const newData = new Uint8Array([5, 6, 7, 8]);
      garc.setFile(0, newData);
      expect(garc.getFile(0)).toEqual(newData);
    });

    it("should return directory map via getDirectory", () => {
      const file = new Uint8Array([0xab]);
      const garcBytes = buildGarcBytes(4, [file]);
      const garc = new GARCArchive(garcBytes, true);

      const dir = garc.getDirectory(0);
      expect(dir).toBeInstanceOf(Map);
      expect(dir.get(0)).toEqual(file);
    });
  });

  describe("error handling", () => {
    it("should throw on empty data", () => {
      expect(() => new GARCArchive(new Uint8Array(0), true)).toThrow(
        "Invalid GARC file"
      );
    });

    it("should throw on bad magic", () => {
      const bad = new Uint8Array(100);
      bad[0] = 0xff;
      expect(() => new GARCArchive(bad, true)).toThrow("Invalid GARC file");
    });
  });
});
