// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

/**
 * Bootstrap: fetch bundled config + patch files and register them in the
 * virtual FS before any ts-src code runs. Called from the Web Worker.
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

// IPS patches used by `FileFunctions.applyPatch`. Paths are relative to the
// `patches/` directory and preserved verbatim because ts-src passes the
// sub-path (e.g. `"instant_text/em_instant_text.ips"`) to the loader.
//
// Generated from src/com/dabomstew/pkrandom/patches/**/*.ips.
const PATCH_FILES = [
  "bwexp/crystal_en_bwxp.ips",
  "bwexp/gs_en_bwxp.ips",
  "bwexp/rb_en_bwxp.ips",
  "bwexp/yellow_en_bwxp.ips",
  "hardcoded_statics/em_firstbattle.ips",
  "hardcoded_statics/fr_marowak_10.ips",
  "hardcoded_statics/fr_marowak_11.ips",
  "hardcoded_statics/lg_marowak_10.ips",
  "hardcoded_statics/lg_marowak_11.ips",
  "hardcoded_statics/roamers/fr_roamers_10.ips",
  "hardcoded_statics/roamers/fr_roamers_11.ips",
  "hardcoded_statics/roamers/hgss_roamers.ips",
  "hardcoded_statics/roamers/lg_roamers_10.ips",
  "hardcoded_statics/roamers/lg_roamers_11.ips",
  "hardcoded_statics/roamers/plat_roamers.ips",
  "hardcoded_statics/rs_firstbattle.ips",
  "hgss_catching_tutorialfix.ips",
  "instant_text/b1_instant_text.ips",
  "instant_text/b2_instant_text.ips",
  "instant_text/dp_instant_text.ips",
  "instant_text/em_instant_text.ips",
  "instant_text/fr_10_instant_text.ips",
  "instant_text/fr_11_instant_text.ips",
  "instant_text/hgss_instant_text.ips",
  "instant_text/lg_10_instant_text.ips",
  "instant_text/lg_11_instant_text.ips",
  "instant_text/plat_instant_text.ips",
  "instant_text/ruby_10_instant_text.ips",
  "instant_text/ruby_11_instant_text.ips",
  "instant_text/ruby_12_instant_text.ips",
  "instant_text/sapphire_10_instant_text.ips",
  "instant_text/sapphire_11_instant_text.ips",
  "instant_text/sapphire_12_instant_text.ips",
  "instant_text/w1_instant_text.ips",
  "instant_text/w2_instant_text.ips",
  "musicfix/black2_musicfix.ips",
  "musicfix/black2_ovl36_musicfix.ips",
  "musicfix/black_musicfix.ips",
  "musicfix/black_ovl21_musicfix.ips",
  "musicfix/diamond_musicfix.ips",
  "musicfix/em_musicfix.ips",
  "musicfix/fr_musicfix_10.ips",
  "musicfix/fr_musicfix_11.ips",
  "musicfix/lg_musicfix_10.ips",
  "musicfix/lg_musicfix_11.ips",
  "musicfix/plat_musicfix.ips",
  "musicfix/white2_musicfix.ips",
  "musicfix/white2_ovl36_musicfix.ips",
  "musicfix/white_musicfix.ips",
  "musicfix/white_ovl21_musicfix.ips",
  "national_dex/bw1_national_dex.ips",
  "national_dex/bw2_national_dex.ips",
  "national_dex/dp_national_dex.ips",
  "national_dex/hgss_national_dex.ips",
  "national_dex/plat_national_dex.ips",
  "pt_fast_distortion_world.ips",
  "rb_en_critrate.ips",
  "rb_en_xaccnerf.ips",
  "shedinja/black2_ovl284_shedinja.ips",
  "shedinja/black2_shedinja.ips",
  "shedinja/black_ovl195_shedinja.ips",
  "shedinja/black_shedinja.ips",
  "shedinja/white2_ovl284_shedinja.ips",
  "shedinja/white2_shedinja.ips",
  "shedinja/white_ovl195_shedinja.ips",
  "shedinja/white_shedinja.ips",
  "yellow_en_critrate.ips",
  "yellow_en_xaccnerf.ips",
];

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

async function fetchInto(baseUrl: string, relPath: string, vfsKey: string): Promise<void> {
  const res = await fetch(`${baseUrl}/${relPath}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${baseUrl}/${relPath}: ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  vfs.register(vfsKey, buf);
}

export async function bootstrapConfigs(
  configBaseUrl = "/config",
  patchBaseUrl = "/patches",
): Promise<void> {
  if (bootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    await Promise.all([
      // Configs: ts-src resolves to `path.resolve(__dirname, "..", "config", name)`
      ...CONFIG_FILES.map((name) =>
        fetchInto(configBaseUrl, name, `/ts-src/config/${name}`),
      ),
      // Patches: ts-src resolves to `path.resolve(__dirname, "..", "patches", rel)`
      // where `rel` may include subdirectories (e.g. "instant_text/em_instant_text.ips").
      // VFS tail-matching handles the weird bundler paths we'll see at lookup time.
      ...PATCH_FILES.map((rel) =>
        fetchInto(patchBaseUrl, rel, `/ts-src/patches/${rel}`),
      ),
    ]);
    bootstrapped = true;
  })();

  return bootstrapPromise;
}
