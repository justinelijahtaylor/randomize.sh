import { describe, it, expect } from "vitest";
import { Mini } from "../mini.js";

describe("Mini", () => {
  describe("unpackMini", () => {
    it("should return null for null/short data", () => {
      expect(Mini.unpackMini(new Uint8Array(0), "PC")).toBeNull();
      expect(Mini.unpackMini(new Uint8Array(2), "AB")).toBeNull();
    });

    it("should return null for wrong identifier", () => {
      const data = new Uint8Array(20);
      data[0] = "A".charCodeAt(0);
      data[1] = "B".charCodeAt(0);
      expect(Mini.unpackMini(data, "XY")).toBeNull();
    });

    it("should unpack a single-file mini archive", () => {
      // Build a minimal mini archive by hand:
      // Header: identifier "PC", count = 1 (LE)
      // Offsets: [dataStart, dataEnd]
      // Data: [0xAA, 0xBB, 0xCC, 0xDD]
      const fileContent = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
      // header(4) + offsets(4 + 4*1) = 4 + 8 = 12
      const dataOffset = 12;
      const buf = new Uint8Array(dataOffset + 4);
      buf[0] = "P".charCodeAt(0);
      buf[1] = "C".charCodeAt(0);
      buf[2] = 1; // count LE low byte
      buf[3] = 0; // count LE high byte
      // offset[0] = dataOffset (12)
      const view = new DataView(buf.buffer);
      view.setInt32(4, dataOffset, true);
      // offset[1] = dataOffset + 4 (16)
      view.setInt32(8, dataOffset + 4, true);
      // file data
      buf.set(fileContent, dataOffset);

      const result = Mini.unpackMini(buf, "PC");
      expect(result).not.toBeNull();
      expect(result!.length).toBe(1);
      expect(result![0]).toEqual(fileContent);
    });

    it("should unpack multiple files", () => {
      const file0 = new Uint8Array([1, 2]);
      const file1 = new Uint8Array([3, 4, 5]);
      // Pack then unpack
      const packed = Mini.packMini([file0, file1], "AB");
      const unpacked = Mini.unpackMini(packed, "AB");
      expect(unpacked).not.toBeNull();
      expect(unpacked!.length).toBe(2);
      // unpackMini computes length = nextOffset - currentOffset, which includes padding
      // file0 (2 bytes) padded to 4 bytes = 4 bytes between offsets
      expect(unpacked![0].subarray(0, 2)).toEqual(file0);
      // file1 is the last file; its length = capOffset - startOffset, includes padding
      expect(unpacked![1].subarray(0, 3)).toEqual(file1);
    });
  });

  describe("packMini", () => {
    it("should produce valid output for empty array", () => {
      const packed = Mini.packMini([], "XY");
      expect(packed[0]).toBe("X".charCodeAt(0));
      expect(packed[1]).toBe("Y".charCodeAt(0));
      expect(packed[2]).toBe(0); // count = 0
      expect(packed[3]).toBe(0);
    });

    it("should roundtrip pack/unpack single file", () => {
      const original = new Uint8Array([10, 20, 30, 40]);
      const packed = Mini.packMini([original], "ZZ");
      const unpacked = Mini.unpackMini(packed, "ZZ");
      expect(unpacked).not.toBeNull();
      expect(unpacked!.length).toBe(1);
      expect(unpacked![0]).toEqual(original);
    });

    it("should roundtrip pack/unpack multiple files", () => {
      const files = [
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6, 7, 8]),
        new Uint8Array([9]),
      ];
      const packed = Mini.packMini(files, "TT");
      const unpacked = Mini.unpackMini(packed, "TT");
      expect(unpacked).not.toBeNull();
      expect(unpacked!.length).toBe(3);
      // First two files will have padding included in their unpacked length
      // since unpack computes length = nextOffset - currentOffset
      expect(unpacked![0].subarray(0, 3)).toEqual(files[0]);
      expect(unpacked![1].subarray(0, 5)).toEqual(files[1]);
      expect(unpacked![2].subarray(0, 1)).toEqual(files[2]);
    });
  });
});
