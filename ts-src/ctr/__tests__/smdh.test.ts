import { describe, it, expect } from "vitest";
import { SMDH } from "../smdh.js";

/**
 * Build a synthetic SMDH with the magic at offset 0 and
 * some test descriptions/publishers at the title slots.
 */
function buildSmdhData(options?: {
  shortDesc?: string;
  longDesc?: string;
  publisher?: string;
}): Uint8Array {
  // SMDH total size: 0x08 (magic+version) + 12 * 0x200 (titles) + rest
  // Minimum: magic(4) + version(4) + 12 titles * 0x200 = 0x1808
  // We'll add some extra for icon data
  const totalSize = 0x36C0; // Standard SMDH size
  const data = new Uint8Array(totalSize);
  const view = new DataView(data.buffer);

  // Write SMDH magic at offset 0 (little-endian: 0x48444D53 = "SMDH")
  view.setInt32(0, 0x48444d53, true);
  // version at offset 4
  view.setInt32(4, 0, true);

  // Write descriptions and publishers for all 12 title slots
  const shortDesc = options?.shortDesc ?? "TestGame";
  const longDesc = options?.longDesc ?? "A Test Game Description";
  const publisher = options?.publisher ?? "TestPublisher";

  for (let i = 0; i < 12; i++) {
    // Short description at 0x08 + 0x200*i
    const shortOffset = 0x08 + 0x200 * i;
    writeUtf16LE(data, shortOffset, shortDesc);

    // Long description at 0x88 + 0x200*i
    const longOffset = 0x88 + 0x200 * i;
    writeUtf16LE(data, longOffset, longDesc);

    // Publisher at 0x188 + 0x200*i
    const pubOffset = 0x188 + 0x200 * i;
    writeUtf16LE(data, pubOffset, publisher);
  }

  return data;
}

function writeUtf16LE(
  data: Uint8Array,
  offset: number,
  str: string
): void {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    data[offset + i * 2] = code & 0xff;
    data[offset + i * 2 + 1] = (code >> 8) & 0xff;
  }
}

describe("SMDH", () => {
  it("should detect valid SMDH magic", () => {
    const data = buildSmdhData();
    const smdh = new SMDH(data);
    expect(smdh.isValid()).toBe(true);
  });

  it("should detect invalid SMDH magic", () => {
    const data = new Uint8Array(0x36c0);
    // Magic is all zeros -- invalid
    const smdh = new SMDH(data);
    expect(smdh.isValid()).toBe(false);
  });

  it("should read short descriptions from all 12 slots", () => {
    const smdh = new SMDH(buildSmdhData({ shortDesc: "Hello" }));
    for (let i = 0; i < 12; i++) {
      expect(smdh.getShortDescription(i)).toBe("Hello");
    }
  });

  it("should read long descriptions from all 12 slots", () => {
    const smdh = new SMDH(
      buildSmdhData({ longDesc: "A longer description" })
    );
    for (let i = 0; i < 12; i++) {
      expect(smdh.getLongDescription(i)).toBe("A longer description");
    }
  });

  it("should read publishers from all 12 slots", () => {
    const smdh = new SMDH(
      buildSmdhData({ publisher: "Nintendo" })
    );
    for (let i = 0; i < 12; i++) {
      expect(smdh.getPublisher(i)).toBe("Nintendo");
    }
  });

  it("should set all descriptions", () => {
    const data = buildSmdhData();
    const smdh = new SMDH(data);
    smdh.setAllDescriptions("NewDesc");
    for (let i = 0; i < 12; i++) {
      expect(smdh.getShortDescription(i)).toBe("NewDesc");
      expect(smdh.getLongDescription(i)).toBe("NewDesc");
    }
  });

  it("should set all publishers", () => {
    const data = buildSmdhData();
    const smdh = new SMDH(data);
    smdh.setAllPublishers("NewPub");
    for (let i = 0; i < 12; i++) {
      expect(smdh.getPublisher(i)).toBe("NewPub");
    }
  });

  it("should persist changes via getBytes", () => {
    const data = buildSmdhData();
    const smdh = new SMDH(data);
    smdh.setAllDescriptions("Updated");
    smdh.setAllPublishers("PubUpdate");
    const bytes = smdh.getBytes();

    // Parse again from the raw bytes
    const smdh2 = new SMDH(bytes);
    expect(smdh2.getShortDescription(0)).toBe("Updated");
    expect(smdh2.getLongDescription(0)).toBe("Updated");
    expect(smdh2.getPublisher(0)).toBe("PubUpdate");
  });
});
