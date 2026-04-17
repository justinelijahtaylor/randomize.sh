/**
 * Browser shim for Node's `crypto` module.
 *
 * ts-src only uses `crypto.randomBytes(n)` for seeding the RNG. We back it
 * with the Web Crypto `getRandomValues` API.
 */

import { Buffer } from "buffer";

export function randomBytes(size: number): Buffer {
  const out = new Uint8Array(size);
  // globalThis.crypto exists in both the main thread and Web Workers
  globalThis.crypto.getRandomValues(out);
  return Buffer.from(out);
}

const defaultExport = { randomBytes };
export default defaultExport;
