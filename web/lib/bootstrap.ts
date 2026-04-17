// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

/**
 * Bootstrap: fetch bundled config files and register them in the virtual FS
 * before any ts-src code runs. Called from the Web Worker.
 */

import { vfs } from "@/shims/virtual-fs";

const CONFIG_FILES = [
  "Generation4.tbl",
  "Generation5.tbl",
  "customnames.rncn",
  "gameboy_jpn.tbl",
  "gba_english.tbl",
  "gba_jpn.tbl",
  "gen1_offsets.ini",
  "gen2_offsets.ini",
  "gen3_offsets.ini",
  "gen4_offsets.ini",
  "gen5_offsets.ini",
  "gen6_offsets.ini",
  "gen7_offsets.ini",
  "green_translation.tbl",
  "gsc_english.tbl",
  "gsc_espita.tbl",
  "gsc_freger.tbl",
  "rby_english.tbl",
  "rby_espita.tbl",
  "rby_freger.tbl",
  "realistic_gen1_english.tbl",
  "vietcrystal.tbl",
];

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

export async function bootstrapConfigs(configBaseUrl = "/config"): Promise<void> {
  if (bootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    await Promise.all(
      CONFIG_FILES.map(async (name) => {
        const res = await fetch(`${configBaseUrl}/${name}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch config/${name}: ${res.status}`);
        }
        const buf = new Uint8Array(await res.arrayBuffer());
        // Register under the shape ts-src expects (path.resolve(__dirname, "..", "config", name))
        // Our VFS matches by tail, so we just need "config/<name>".
        vfs.register(`/ts-src/config/${name}`, buf);
      }),
    );
    bootstrapped = true;
  })();

  return bootstrapPromise;
}
