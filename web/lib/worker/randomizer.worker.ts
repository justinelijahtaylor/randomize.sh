/**
 * Web Worker that runs the randomizer on-device.
 *
 * Message protocol (main -> worker):
 *   { type: "init" }                           - bootstrap configs
 *   { type: "detect", romBytes }               - detect ROM generation
 *   { type: "randomize", romBytes, settings, romName }
 *
 * Message protocol (worker -> main):
 *   { type: "ready" }
 *   { type: "detected", generation, romName } | { type: "detected", error }
 *   { type: "log", line }
 *   { type: "progress", stage, percent }
 *   { type: "done", outputBytes, log, extension }
 *   { type: "error", message }
 */

import { Buffer } from "buffer";
// ts-src expects `Buffer` to be a Node-style global. Install it BEFORE any
// dynamic imports below so that module-scope code using `Buffer.alloc/from`
// finds it.
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;

import { bootstrapConfigs } from "../bootstrap";
import { vfs } from "@/shims/virtual-fs";

// Lazy imports; we only want to parse ts-src after bootstrap is done so that
// module-scope code that opens configs doesn't explode at worker startup.
// (All heavy modules live inside handlers below.)

type WorkerMessage =
  | { type: "init" }
  | { type: "detect"; romBytes: ArrayBuffer; filename: string }
  | {
      type: "randomize";
      romBytes: ArrayBuffer;
      filename: string;
      settingsString: string;
    };

// Map known log line prefixes to stage % so the UI can show progress.
const STAGE_MARKERS: Array<{ needle: string; percent: number; stage: string }> = [
  { needle: "--Pokemon Base Stats", percent: 10, stage: "Base stats" },
  { needle: "--Pokemon Types", percent: 15, stage: "Types" },
  { needle: "--Pokemon Abilities", percent: 20, stage: "Abilities" },
  { needle: "--Randomized Evolutions", percent: 25, stage: "Evolutions" },
  { needle: "--Random Starters", percent: 30, stage: "Starters" },
  { needle: "--Move Data", percent: 35, stage: "Moves" },
  { needle: "--Pokemon Movesets", percent: 45, stage: "Movesets" },
  { needle: "--Trainers Pokemon", percent: 60, stage: "Trainers" },
  { needle: "--Wild Pokemon", percent: 75, stage: "Wild Pokemon" },
  { needle: "--Static Pokemon", percent: 80, stage: "Static Pokemon" },
  { needle: "--TM Moves", percent: 85, stage: "TMs" },
  { needle: "--TM Compatibility", percent: 88, stage: "TM compatibility" },
  { needle: "--Move Tutor Moves", percent: 90, stage: "Move Tutors" },
  { needle: "--In-Game Trades", percent: 93, stage: "Trades" },
  { needle: "--Field Items", percent: 96, stage: "Field items" },
];

function post(msg: unknown, transfer?: Transferable[]): void {
  if (transfer && transfer.length > 0) {
    (self as unknown as Worker).postMessage(msg, transfer);
  } else {
    (self as unknown as Worker).postMessage(msg);
  }
}

function romKey(filename: string): string {
  // VFS key under which we register the user's ROM
  return `/roms/${filename || "input.rom"}`;
}

function outputKey(filename: string): string {
  return `/roms/out-${filename || "output.rom"}`;
}

self.onmessage = async (ev: MessageEvent<WorkerMessage>) => {
  try {
    const msg = ev.data;
    if (msg.type === "init") {
      await bootstrapConfigs();
      post({ type: "ready" });
      return;
    }

    if (msg.type === "detect") {
      await bootstrapConfigs();
      // Register the ROM in VFS under its filename
      const key = romKey(msg.filename);
      vfs.register(key, new Uint8Array(msg.romBytes));

      const { getDefaultFactories } = await import("@randomizer/cli/cli-randomizer");
      const factories = getDefaultFactories();
      const tried: string[] = [];
      for (const f of factories) {
        const factoryName = (f.constructor?.name ?? "UnknownFactory").replace(/Factory$/, "");
        try {
          const loadable = f.isLoadable(key);
          tried.push(`${factoryName}: ${loadable ? "accepted" : "rejected"}`);
          if (!loadable) continue;
          const { RandomSource } = await import("@randomizer/utils/random-source");
          const handler = f.create(RandomSource.instance());
          handler.loadRom(key);
          const gen = handler.generationOfPokemon();
          const extension = handler.getDefaultExtension();
          post({
            type: "detected",
            generation: gen,
            extension,
            romName: handler.getROMName?.() ?? null,
            romCode: handler.getROMCode?.() ?? null,
          });
          return;
        } catch (e) {
          const err = e instanceof Error ? e.message : String(e);
          tried.push(`${factoryName}: threw (${err})`);
        }
      }
      post({
        type: "detected",
        error: `Unsupported ROM format. Tried: ${tried.join(" | ")}`,
      });
      return;
    }

    if (msg.type === "randomize") {
      await bootstrapConfigs();
      const key = romKey(msg.filename);
      vfs.register(key, new Uint8Array(msg.romBytes));

      // Hook the log stream before importing the randomizer.
      const { Settings } = await import("@randomizer/config/settings");
      const { performDirectRandomization, getDefaultFactories } = await import(
        "@randomizer/cli/cli-randomizer"
      );

      // Decode settings string (strip 3-digit version prefix if present)
      let settingsStr = msg.settingsString;
      if (settingsStr.length > 3 && /^\d{3}/.test(settingsStr)) {
        settingsStr = settingsStr.substring(3);
      }
      const settings = Settings.fromString(settingsStr);

      // Stream logs to the main thread
      // The randomizer uses StringLogStream; we monkey-patch console.log-style
      // writes by providing a custom stderr/stdout below AND also observe the
      // final log dumped into VFS as `<output>.log`.
      const outputFilename = outputKey(msg.filename);
      let seenStages = new Set<string>();

      const stderr = (line: string) => post({ type: "log", line, level: "error" });
      const stdout = (line: string) => post({ type: "log", line, level: "info" });

      // Run it
      const ok = performDirectRandomization(
        settings,
        key,
        outputFilename,
        /* saveAsDirectory */ false,
        /* updateFilePath */ null,
        /* saveLog */ true,
        getDefaultFactories(),
        stderr,
        stdout,
      );

      if (!ok) {
        post({ type: "error", message: "Randomization failed. See log above." });
        return;
      }

      // Extract output bytes from VFS
      const outputBytes = vfs.read(outputFilename);
      let logText = "";
      try {
        const logBytes = vfs.read(outputFilename + ".log");
        // Strip UTF-8 BOM if present
        let start = 0;
        if (logBytes[0] === 0xef && logBytes[1] === 0xbb && logBytes[2] === 0xbf) {
          start = 3;
        }
        logText = new TextDecoder("utf-8").decode(logBytes.subarray(start));
      } catch {
        /* no log file */
      }

      // Stream each log line so the UI can visualize
      for (const line of logText.split(/\r?\n/)) {
        for (const marker of STAGE_MARKERS) {
          if (line.startsWith(marker.needle) && !seenStages.has(marker.stage)) {
            seenStages.add(marker.stage);
            post({ type: "progress", stage: marker.stage, percent: marker.percent });
          }
        }
      }
      post({ type: "progress", stage: "Finalizing", percent: 100 });

      // Copy into a transferable ArrayBuffer so we can transfer ownership
      const outBuf = new ArrayBuffer(outputBytes.byteLength);
      new Uint8Array(outBuf).set(outputBytes);

      post(
        {
          type: "done",
          outputBytes: outBuf,
          log: logText,
          filename: msg.filename,
        },
        [outBuf],
      );

      // Clean up VFS entries so memory is reclaimed
      // (Let GC handle it; keep bytes for now)
      return;
    }
  } catch (e) {
    const err = e as Error;
    post({ type: "error", message: err.message || String(err), stack: err.stack });
  }
};

export {};
