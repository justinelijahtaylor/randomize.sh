// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

/**
 * Preset settings strings, grouped by generation. Applying a preset writes
 * its settings string into the Settings input on the main page, which
 * triggers the existing string-to-form sync.
 *
 * To add a preset: paste the settings string from the Java GUI (with or
 * without the 3-digit version prefix — both work) into the `settingsString`
 * field. Set `gen` to the generation the preset targets so it only shows
 * up for a matching ROM; set `romNames` to a list of ROM name substrings
 * if the preset is specific to certain games within that gen.
 */

export interface Preset {
  id: string;
  name: string;
  /** Generation this preset is designed for (1-4 today). */
  gen: 1 | 2 | 3 | 4;
  /**
   * Optional list of ROM name substrings. If provided, the preset only
   * appears for ROMs whose detected name contains one of these (case-
   * insensitive). If omitted, the preset applies to any ROM of the right
   * generation.
   */
  romNames?: string[];
  settingsString: string;
}

export const PRESETS: Preset[] = [
  // ---- Gen 1 (Red / Blue / Yellow) ----
  {
    id: "gen1-kaizo",
    name: "Kaizo",
    gen: 1,
    settingsString:
      "321WRIEAQIZAIUAAACRAAKeBgMECQEAFAABCQAOAgAAAAAAAAho5ATkAQAICTIGBQMyAAIYElBva2Vtb24gWWVsbG93IChVKVXr5SHjwziK",
  },
  // ---- Gen 2 presets will go here. ----
  // ---- Gen 3 presets will go here. ----
  // ---- Gen 4 presets will go here. ----
];

/** Presets applicable to a given ROM (by generation + optional name match). */
export function presetsForRom(gen: number, romName: string | null): Preset[] {
  const nameLower = (romName ?? "").toLowerCase();
  return PRESETS.filter((p) => {
    if (p.gen !== gen) return false;
    if (!p.romNames || p.romNames.length === 0) return true;
    return p.romNames.some((needle) => nameLower.includes(needle.toLowerCase()));
  });
}
