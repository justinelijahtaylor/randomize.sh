import { describe, it, expect } from "vitest";
import { BFLIM } from "../bflim.js";
import { FileFunctions } from "../../utils/file-functions.js";

/**
 * Build a synthetic BFLIM with an 8x8 RGBA5551 image.
 * The image data comes first, followed by the imag+FLIM headers at the end.
 */
function buildBflimData(
  width: number,
  height: number,
  format: number = 7
): Uint8Array {
  // For RGBA5551 (format 7), each pixel = 2 bytes
  // Image is rendered on its side, so actual data dimensions use swapped w/h
  // The image data dimensions for decoding are: swappedWidth=height, swappedHeight=width
  // The total pixels = width * height
  const imageSize = width * height * 2;

  // Total BFLIM = imageData + imag header (0x14) + FLIM header (0x14)
  const totalSize = imageSize + 0x28;
  const data = new Uint8Array(totalSize);

  // Fill image data with a simple pattern (RGBA5551: all white opaque = 0xFFFF)
  for (let i = 0; i < imageSize; i += 2) {
    data[i] = 0xff;
    data[i + 1] = 0xff;
  }

  // FLIM header at totalSize - 0x28
  const flimOffset = totalSize - 0x28;
  // "FLIM" signature (big-endian)
  data[flimOffset] = 0x46; // F
  data[flimOffset + 1] = 0x4c; // L
  data[flimOffset + 2] = 0x49; // I
  data[flimOffset + 3] = 0x4d; // M
  // BOM: 0xFEFF (little-endian) -> bytes: 0xFF, 0xFE
  data[flimOffset + 4] = 0xff;
  data[flimOffset + 5] = 0xfe;
  // Header size = 0x14
  FileFunctions.write2ByteInt(data, flimOffset + 6, 0x14);
  // Version
  FileFunctions.writeFullInt(data, flimOffset + 8, 0x07020100);
  // File size
  FileFunctions.writeFullInt(data, flimOffset + 12, totalSize);
  // Number of blocks
  FileFunctions.writeFullInt(data, flimOffset + 16, 1);

  // imag header at totalSize - 0x14
  const imagOffset = totalSize - 0x14;
  // "imag" signature (big-endian)
  data[imagOffset] = 0x69; // i
  data[imagOffset + 1] = 0x6d; // m
  data[imagOffset + 2] = 0x61; // a
  data[imagOffset + 3] = 0x67; // g
  // Section size
  FileFunctions.writeFullInt(data, imagOffset + 4, 0x10);
  // Width (LE)
  FileFunctions.write2ByteInt(data, imagOffset + 8, width);
  // Height (LE)
  FileFunctions.write2ByteInt(data, imagOffset + 10, height);
  // Alignment
  FileFunctions.write2ByteInt(data, imagOffset + 12, 0x80);
  // Format
  data[imagOffset + 14] = format;
  // Flags
  data[imagOffset + 15] = 0;
  // Image size
  FileFunctions.writeFullInt(data, imagOffset + 16, imageSize);

  return data;
}

describe("BFLIM", () => {
  it("should throw on data too short for header", () => {
    expect(() => new BFLIM(new Uint8Array(0x20))).toThrow(
      "not long enough"
    );
  });

  it("should throw on missing FLIM header", () => {
    const data = new Uint8Array(0x28);
    expect(() => new BFLIM(data)).toThrow("cannot find FLIM header");
  });

  it("should parse a valid 8x8 RGBA5551 BFLIM", () => {
    const data = buildBflimData(8, 8, 7);
    const bflim = new BFLIM(data);
    expect(bflim.width).toBe(8);
    expect(bflim.height).toBe(8);
  });

  it("should decode image data from 8x8 RGBA5551 BFLIM", () => {
    const data = buildBflimData(8, 8, 7);
    const bflim = new BFLIM(data);
    const imageData = bflim.getImageData();
    // 8x8 = 64 pixels
    expect(imageData.length).toBe(64);
    // All pixels should be white with full alpha (0xFFFF in RGBA5551 decodes to max R, G, B, A)
  });

  it("should throw on unsupported format", () => {
    // Build with format = 1 (not supported)
    const data = buildBflimData(8, 8, 1);
    const bflim = new BFLIM(data);
    expect(() => bflim.getImageData()).toThrow("unsupported image format");
  });

  it("should throw on big-endian BFLIM", () => {
    const data = buildBflimData(8, 8, 7);
    // Modify BOM to big-endian: 0xFFFE at flimOffset+4
    const flimOffset = data.length - 0x28;
    data[flimOffset + 4] = 0xfe;
    data[flimOffset + 5] = 0xff;
    // The read2ByteInt reads LE, so 0xFE, 0xFF -> 0xFFFE
    expect(() => new BFLIM(data)).toThrow("big endian");
  });

  it("should parse a valid 8x8 RGBA4 BFLIM", () => {
    const data = buildBflimData(8, 8, 8);
    const bflim = new BFLIM(data);
    expect(bflim.width).toBe(8);
    expect(bflim.height).toBe(8);
    const imageData = bflim.getImageData();
    expect(imageData.length).toBe(64);
  });
});
