import { describe, it, expect } from "vitest";
import { AMX } from "../amx.js";
import { FileFunctions } from "../../utils/file-functions.js";

/**
 * Build a minimal synthetic AMX binary.
 * The script instructions are a sequence of 32-bit LE integers
 * that get compressed using the AMX variable-length encoding.
 */
function buildAmxData(instructions: number[]): Uint8Array {
  // We need to compress the instructions the same way AMX.getBytes does.
  // Instead, let's build the compressed form manually using the compression algorithm.
  const decompressed = new Uint8Array(instructions.length * 4);
  const decompView = new DataView(
    decompressed.buffer,
    decompressed.byteOffset,
    decompressed.byteLength
  );
  for (let i = 0; i < instructions.length; i++) {
    decompView.setInt32(i * 4, instructions[i], true);
  }

  // Compress using the same algorithm
  const compressed = compressInstructions(decompressed);

  const extraDataSize = 0; // no extra data between 0x1C and scriptInstrStart
  const scriptInstrStart = 0x1c + extraDataSize;
  const finalOffset = scriptInstrStart + decompressed.length;
  const totalLength = scriptInstrStart + compressed.length;

  const result = new Uint8Array(totalLength);
  const view = new DataView(
    result.buffer,
    result.byteOffset,
    result.byteLength
  );

  view.setInt32(0, totalLength, true); // length
  view.setInt32(4, 0x0a0af1e0, true); // magic
  view.setInt16(8, 0, true); // ptrOffset
  view.setInt16(10, 0, true); // ptrCount
  view.setInt32(0x0c, scriptInstrStart, true);
  view.setInt32(0x10, scriptInstrStart, true); // scriptMovementStart
  view.setInt32(0x14, finalOffset, true);
  view.setInt32(0x18, 0, true); // allocatedMemory

  result.set(compressed, scriptInstrStart);

  return result;
}

function compressInstructions(data: Uint8Array): Uint8Array {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const chunks: number[][] = [];
  let pos = 0;
  while (pos < data.length) {
    const instructionTemp = view.getInt32(pos, true);
    const instruction = BigInt(instructionTemp) & 0xffffffffn;
    const sign = (instruction & 0x80000000n) > 0n;
    const shadowTemp = sign ? ~instructionTemp : instructionTemp;
    let shadow = BigInt(shadowTemp) & 0xffffffffn;
    let instr = instruction;
    const bytes: number[] = [];
    do {
      const least7 = Number(instr & 0x7fn);
      let byteVal = least7;
      if (bytes.length > 0) byteVal |= 0x80;
      bytes.push(byteVal & 0xff);
      instr >>= 7n;
      shadow >>= 7n;
    } while (shadow !== 0n);

    if (bytes.length < 5) {
      const signBit = sign ? 0x40 : 0x00;
      if ((bytes[bytes.length - 1] & 0x40) !== signBit)
        bytes.push(sign ? 0xff : 0x80);
    }
    bytes.reverse();
    chunks.push(bytes);
    pos += 4;
  }
  let totalLen = 0;
  for (const c of chunks) totalLen += c.length;
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    for (const b of c) result[offset++] = b;
  }
  return result;
}

describe("AMX", () => {
  it("should decompress simple instructions", () => {
    const instructions = [0x00000001, 0x00000002, 0x00000003];
    const data = buildAmxData(instructions);
    const amx = new AMX(data);
    expect(amx.decData.length).toBe(instructions.length * 4);

    const view = new DataView(
      amx.decData.buffer,
      amx.decData.byteOffset,
      amx.decData.byteLength
    );
    for (let i = 0; i < instructions.length; i++) {
      expect(view.getInt32(i * 4, true)).toBe(instructions[i]);
    }
  });

  it("should handle zero instructions", () => {
    const instructions = [0x00000000, 0x00000000];
    const data = buildAmxData(instructions);
    const amx = new AMX(data);

    const view = new DataView(
      amx.decData.buffer,
      amx.decData.byteOffset,
      amx.decData.byteLength
    );
    expect(view.getInt32(0, true)).toBe(0);
    expect(view.getInt32(4, true)).toBe(0);
  });

  it("should handle negative (signed) instructions", () => {
    const instructions = [-1, -256, 0x7fffffff];
    const data = buildAmxData(instructions);
    const amx = new AMX(data);

    const view = new DataView(
      amx.decData.buffer,
      amx.decData.byteOffset,
      amx.decData.byteLength
    );
    expect(view.getInt32(0, true)).toBe(-1);
    expect(view.getInt32(4, true)).toBe(-256);
    expect(view.getInt32(8, true)).toBe(0x7fffffff);
  });

  it("should roundtrip compress/decompress via getBytes", () => {
    const instructions = [42, 100, -50, 0, 0xdeadbeef | 0];
    const data = buildAmxData(instructions);
    const amx = new AMX(data);
    const reencoded = amx.getBytes();
    const amx2 = new AMX(reencoded);

    expect(amx2.decData.length).toBe(amx.decData.length);
    const view1 = new DataView(
      amx.decData.buffer,
      amx.decData.byteOffset,
      amx.decData.byteLength
    );
    const view2 = new DataView(
      amx2.decData.buffer,
      amx2.decData.byteOffset,
      amx2.decData.byteLength
    );
    for (let i = 0; i < amx.decData.length / 4; i++) {
      expect(view2.getInt32(i * 4, true)).toBe(view1.getInt32(i * 4, true));
    }
  });

  it("should find script by index in multi-script data", () => {
    const instr1 = [1, 2];
    const data1 = buildAmxData(instr1);
    const instr2 = [10, 20, 30];
    const data2 = buildAmxData(instr2);

    // Concatenate two AMX scripts
    const combined = new Uint8Array(data1.length + data2.length);
    combined.set(data1, 0);
    combined.set(data2, data1.length);

    // Find the second script (index 1)
    const amx = new AMX(combined, 1);
    expect(amx.scriptOffset).toBe(data1.length);
    const view = new DataView(
      amx.decData.buffer,
      amx.decData.byteOffset,
      amx.decData.byteLength
    );
    expect(view.getInt32(0, true)).toBe(10);
    expect(view.getInt32(4, true)).toBe(20);
    expect(view.getInt32(8, true)).toBe(30);
  });

  it("should throw on invalid magic", () => {
    const data = new Uint8Array(32);
    // Set length but wrong magic
    const view = new DataView(data.buffer);
    view.setInt32(0, 32, true);
    view.setInt32(4, 0xdeadbeef, true);
    expect(() => new AMX(data)).toThrow();
  });
});
