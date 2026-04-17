// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

/**
 * Utilities to convert between:
 *   - Form values (flat Record of strings/booleans/numbers/arrays)
 *   - Settings instances (with numeric enum values, GenRestrictions, etc.)
 *   - Base64 settings strings (Java GUI interop)
 *
 * The Settings class stores enum properties as *numeric* values
 * (e.g. `BaseStatisticsMod.UNCHANGED === 0`), while the form schema uses
 * the enum member *names* as strings (e.g. `"UNCHANGED"`). This module
 * bridges the two.
 */

// Install Buffer global before importing anything from ts-src.
import "./browser-globals";

import {
  Settings,
  BaseStatisticsMod,
  ExpCurveMod,
  AbilitiesMod,
  StartersMod,
  TypesMod,
  EvolutionsMod,
  MovesetsMod,
  TrainersMod,
  WildPokemonMod,
  WildPokemonRestrictionMod,
  StaticPokemonMod,
  TotemPokemonMod,
  AllyPokemonMod,
  AuraMod,
  TMsMod,
  TMsHMsCompatibilityMod,
  MoveTutorMovesMod,
  MoveTutorsCompatibilityMod,
  InGameTradesMod,
  FieldItemsMod,
  ShopItemsMod,
  PickupItemsMod,
} from "@randomizer/config/settings";
import { ExpCurve } from "@randomizer/pokemon/exp-curve";
import { DEFAULT_VALUES } from "./form-schema";

type EnumObject = Record<string, string | number>;

// Map of settings property -> enum object
const ENUM_PROPS: Record<string, EnumObject> = {
  baseStatisticsMod: BaseStatisticsMod as unknown as EnumObject,
  expCurveMod: ExpCurveMod as unknown as EnumObject,
  abilitiesMod: AbilitiesMod as unknown as EnumObject,
  startersMod: StartersMod as unknown as EnumObject,
  typesMod: TypesMod as unknown as EnumObject,
  evolutionsMod: EvolutionsMod as unknown as EnumObject,
  movesetsMod: MovesetsMod as unknown as EnumObject,
  trainersMod: TrainersMod as unknown as EnumObject,
  wildPokemonMod: WildPokemonMod as unknown as EnumObject,
  wildPokemonRestrictionMod: WildPokemonRestrictionMod as unknown as EnumObject,
  staticPokemonMod: StaticPokemonMod as unknown as EnumObject,
  totemPokemonMod: TotemPokemonMod as unknown as EnumObject,
  allyPokemonMod: AllyPokemonMod as unknown as EnumObject,
  auraMod: AuraMod as unknown as EnumObject,
  tmsMod: TMsMod as unknown as EnumObject,
  tmsHmsCompatibilityMod: TMsHMsCompatibilityMod as unknown as EnumObject,
  moveTutorMovesMod: MoveTutorMovesMod as unknown as EnumObject,
  moveTutorsCompatibilityMod: MoveTutorsCompatibilityMod as unknown as EnumObject,
  inGameTradesMod: InGameTradesMod as unknown as EnumObject,
  fieldItemsMod: FieldItemsMod as unknown as EnumObject,
  shopItemsMod: ShopItemsMod as unknown as EnumObject,
  pickupItemsMod: PickupItemsMod as unknown as EnumObject,
  selectedEXPCurve: ExpCurve as unknown as EnumObject,
};

function enumNameForValue(obj: EnumObject, value: string | number): string | null {
  // For numeric TS enums, looking up by value gives the name
  const name = obj[value as keyof typeof obj];
  return typeof name === "string" ? name : null;
}

function enumValueForName(obj: EnumObject, name: string): string | number | null {
  const v = obj[name];
  return typeof v === "number" || typeof v === "string" ? v : null;
}

/** Convert flat form values into a Settings instance. */
export function formValuesToSettings(values: Record<string, unknown>): Settings {
  const s = new Settings();
  const anyS = s as unknown as Record<string, unknown>;
  for (const [key, raw] of Object.entries(values)) {
    if (key in ENUM_PROPS) {
      const resolved = enumValueForName(ENUM_PROPS[key], String(raw));
      if (resolved !== null) anyS[key] = resolved;
    } else if (Object.prototype.hasOwnProperty.call(anyS, key)) {
      anyS[key] = raw;
    }
  }
  return s;
}

/** Convert a Settings instance into flat form values. */
export function settingsToFormValues(settings: Settings): Record<string, unknown> {
  const out: Record<string, unknown> = { ...DEFAULT_VALUES };
  const anyS = settings as unknown as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_VALUES)) {
    if (!(key in anyS)) continue;
    const v = anyS[key];
    if (key in ENUM_PROPS) {
      const name = enumNameForValue(ENUM_PROPS[key], v as string | number);
      if (name) out[key] = name;
    } else {
      out[key] = v;
    }
  }
  return out;
}

/** Serialize form values to a Java-compatible settings string (with 3-digit version prefix). */
export function formValuesToSettingsString(values: Record<string, unknown>): string {
  const s = formValuesToSettings(values);
  const body = s.toString();
  const version = String(Settings.VERSION).padStart(3, "0");
  return version + body;
}

/** Parse a settings string (with or without 3-digit version prefix) into form values. */
export function settingsStringToFormValues(str: string): Record<string, unknown> {
  let body = str.trim();
  if (body.length > 3 && /^\d{3}/.test(body)) {
    body = body.substring(3);
  }
  const s = Settings.fromString(body);
  return settingsToFormValues(s);
}
