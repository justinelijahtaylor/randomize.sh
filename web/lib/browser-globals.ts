/**
 * Install Node-style globals (`Buffer`) on the browser's globalThis before
 * any ts-src code runs. Must be imported for its side effects _before_ any
 * module that references `Buffer` (including transitively through dynamic
 * imports of `@randomizer/*`).
 */

import { Buffer } from "buffer";

if (typeof globalThis !== "undefined") {
  const anyGlobal = globalThis as unknown as { Buffer?: typeof Buffer };
  if (!anyGlobal.Buffer) anyGlobal.Buffer = Buffer;
}

export {};
