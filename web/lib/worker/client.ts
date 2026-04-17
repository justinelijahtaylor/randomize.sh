// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

/**
 * Main-thread client that talks to the randomizer Web Worker.
 *
 * Wraps postMessage with a Promise-based detect / randomize API and
 * exposes progress/log streams via callbacks.
 */

"use client";

export interface DetectResult {
  generation: number;
  extension: string;
  romName: string | null;
  romCode: string | null;
}

export interface RandomizeResult {
  outputBytes: ArrayBuffer;
  log: string;
  filename: string;
}

export interface RandomizerCallbacks {
  onLog?: (line: string, level: "info" | "error") => void;
  onProgress?: (stage: string, percent: number) => void;
}

export class RandomizerClient {
  private worker: Worker | null = null;
  private ready: Promise<void> | null = null;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    this.worker = new Worker(
      new URL("./randomizer.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.ready = new Promise((resolve, reject) => {
      const handler = (ev: MessageEvent) => {
        if (ev.data?.type === "ready") {
          this.worker!.removeEventListener("message", handler);
          resolve();
        } else if (ev.data?.type === "error") {
          this.worker!.removeEventListener("message", handler);
          reject(new Error(ev.data.message));
        }
      };
      this.worker!.addEventListener("message", handler);
      this.worker!.postMessage({ type: "init" });
    });
    return this.worker;
  }

  async init(): Promise<void> {
    this.ensureWorker();
    await this.ready;
  }

  async detect(romBytes: ArrayBuffer, filename: string): Promise<DetectResult> {
    const worker = this.ensureWorker();
    await this.ready;
    return new Promise((resolve, reject) => {
      const handler = (ev: MessageEvent) => {
        if (ev.data?.type === "detected") {
          worker.removeEventListener("message", handler);
          if (ev.data.error) reject(new Error(ev.data.error));
          else
            resolve({
              generation: ev.data.generation,
              extension: ev.data.extension,
              romName: ev.data.romName,
              romCode: ev.data.romCode,
            });
        } else if (ev.data?.type === "error") {
          worker.removeEventListener("message", handler);
          reject(new Error(ev.data.message));
        }
      };
      worker.addEventListener("message", handler);
      // Clone bytes so we retain them for subsequent randomize
      const clone = romBytes.slice(0);
      worker.postMessage({ type: "detect", romBytes: clone, filename }, [clone]);
    });
  }

  async randomize(
    romBytes: ArrayBuffer,
    filename: string,
    settingsString: string,
    callbacks: RandomizerCallbacks = {},
  ): Promise<RandomizeResult> {
    const worker = this.ensureWorker();
    await this.ready;
    return new Promise((resolve, reject) => {
      const handler = (ev: MessageEvent) => {
        const data = ev.data;
        if (data?.type === "log") {
          callbacks.onLog?.(data.line, data.level);
        } else if (data?.type === "progress") {
          callbacks.onProgress?.(data.stage, data.percent);
        } else if (data?.type === "done") {
          worker.removeEventListener("message", handler);
          resolve({
            outputBytes: data.outputBytes,
            log: data.log,
            filename: data.filename,
          });
        } else if (data?.type === "error") {
          worker.removeEventListener("message", handler);
          reject(new Error(data.message));
        }
      };
      worker.addEventListener("message", handler);
      const clone = romBytes.slice(0);
      worker.postMessage(
        { type: "randomize", romBytes: clone, filename, settingsString },
        [clone],
      );
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = null;
  }
}
