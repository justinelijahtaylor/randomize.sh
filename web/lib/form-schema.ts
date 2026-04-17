// SPDX-License-Identifier: GPL-3.0-or-later
// Part of "randomize.sh" (https://github.com/justinelijahtaylor/randomizer)
// A web fork of Universal Pokemon Randomizer ZX. Licensed under GPLv3-or-later.
// See LICENSE.txt for the full license text.

/**
 * Declarative form schema for the Pokemon ROM randomizer web UI.
 *
 * Field names match `Settings` property names in
 * `ts-src/config/settings.ts` (which mirror `Settings.java`).
 * Enum string values match the TypeScript enum member names.
 */

// ---- Types ----

export type FieldKind =
  | { type: "radio"; options: Array<{ value: string; label: string }> }
  | { type: "checkbox" }
  | { type: "slider"; min: number; max: number; step: number }
  | { type: "select"; options: Array<{ value: string; label: string }> }
  | { type: "number"; min: number; max: number }
  | { type: "multi-select-pokemon"; count: number };

export interface Field {
  /** Settings property name (matches Settings.ts / Settings.java) */
  name: string;
  label: string;
  kind: FieldKind;
  /** Optional: show this field only when condition is true */
  showIf?: (values: Record<string, unknown>) => boolean;
  /** Optional: required minimum generation (1-8) */
  minGen?: number;
  /** Optional: max generation inclusive */
  maxGen?: number;
  /** Optional: help text */
  help?: string;
}

export interface FieldGroup {
  title: string;
  fields: Field[];
  /** Minimum generation where this group is relevant (inclusive). */
  minGen?: number;
  /** Maximum generation where this group is relevant (inclusive). */
  maxGen?: number;
}

export interface Tab {
  id: string;
  label: string;
  groups: FieldGroup[];
  /** Minimum generation where this tab is relevant (inclusive). */
  minGen?: number;
  /** Maximum generation where this tab is relevant (inclusive). */
  maxGen?: number;
}

// ---- Shared option sets ----

const UNCHANGED_RANDOM = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM", label: "Random" },
];

const baseStatsOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "SHUFFLE", label: "Shuffle" },
  { value: "RANDOM", label: "Random (within BST)" },
];

const expCurveModOptions = [
  { value: "LEGENDARIES", label: "Legendaries Only" },
  { value: "STRONG_LEGENDARIES", label: "Strong Legendaries Only" },
  { value: "ALL", label: "All Pokemon" },
];

const abilitiesOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOMIZE", label: "Randomize" },
];

const startersOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "CUSTOM", label: "Custom" },
  { value: "COMPLETELY_RANDOM", label: "Completely Random" },
  { value: "RANDOM_WITH_TWO_EVOLUTIONS", label: "Random with 2 Evolutions" },
];

const typesOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM_FOLLOW_EVOLUTIONS", label: "Random (follow evolutions)" },
  { value: "COMPLETELY_RANDOM", label: "Completely Random" },
];

const evolutionsOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM", label: "Random" },
  { value: "RANDOM_EVERY_LEVEL", label: "Random Every Level" },
];

const movesetsOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM_PREFER_SAME_TYPE", label: "Random (prefer same type)" },
  { value: "COMPLETELY_RANDOM", label: "Completely Random" },
  { value: "METRONOME_ONLY", label: "Metronome Only" },
];

const trainersOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM", label: "Random" },
  { value: "DISTRIBUTED", label: "Random (distributed)" },
  { value: "MAINPLAYTHROUGH", label: "Random (main playthrough)" },
  { value: "TYPE_THEMED", label: "Type Themed" },
  { value: "TYPE_THEMED_ELITE4_GYMS", label: "Type Themed (Elite 4 & Gyms)" },
];

const wildPokemonOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM", label: "Random" },
  { value: "AREA_MAPPING", label: "Area 1-to-1 Mapping" },
  { value: "GLOBAL_MAPPING", label: "Global 1-to-1 Mapping" },
];

const wildRestrictionOptions = [
  { value: "NONE", label: "None" },
  { value: "SIMILAR_STRENGTH", label: "Similar Strength" },
  { value: "CATCH_EM_ALL", label: "Catch 'em All Mode" },
  { value: "TYPE_THEME_AREAS", label: "Type Themed Areas" },
];

const staticOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM_MATCHING", label: "Random (matching legendary status)" },
  { value: "COMPLETELY_RANDOM", label: "Completely Random" },
  { value: "SIMILAR_STRENGTH", label: "Random (similar strength)" },
];

const totemOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM", label: "Random" },
  { value: "SIMILAR_STRENGTH", label: "Random (similar strength)" },
];

const allyOptions = totemOptions;
const auraOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM", label: "Random" },
  { value: "SAME_STRENGTH", label: "Same Strength" },
];

const tmHmCompatOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOM_PREFER_TYPE", label: "Random (prefer type)" },
  { value: "COMPLETELY_RANDOM", label: "Completely Random" },
  { value: "FULL", label: "Full Compatibility" },
];

const tutorCompatOptions = tmHmCompatOptions;

const inGameTradesOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "RANDOMIZE_GIVEN", label: "Randomize Given Pokemon" },
  {
    value: "RANDOMIZE_GIVEN_AND_REQUESTED",
    label: "Randomize Given & Requested Pokemon",
  },
];

const fieldItemsOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "SHUFFLE", label: "Shuffle" },
  { value: "RANDOM", label: "Random" },
  { value: "RANDOM_EVEN", label: "Random (even distribution)" },
];

const shopItemsOptions = [
  { value: "UNCHANGED", label: "Unchanged" },
  { value: "SHUFFLE", label: "Shuffle" },
  { value: "RANDOM", label: "Random" },
];

const expCurveSelectOptions = [
  { value: "SLOW", label: "Slow" },
  { value: "MEDIUM_SLOW", label: "Medium Slow" },
  { value: "MEDIUM_FAST", label: "Medium Fast" },
  { value: "FAST", label: "Fast" },
  { value: "ERRATIC", label: "Erratic" },
  { value: "FLUCTUATING", label: "Fluctuating" },
];

const updateGenerationOptions = [
  { value: "0", label: "Latest" },
  { value: "6", label: "Gen 6" },
  { value: "7", label: "Gen 7" },
  { value: "8", label: "Gen 8" },
];

// ---- Helpers ----

const v = (name: string) => (vals: Record<string, unknown>) => Boolean(vals[name]);
const eq =
  (name: string, val: string) =>
  (vals: Record<string, unknown>): boolean =>
    vals[name] === val;
const neq =
  (name: string, val: string) =>
  (vals: Record<string, unknown>): boolean =>
    vals[name] !== val;
const and =
  (...fns: Array<(vals: Record<string, unknown>) => boolean>) =>
  (vals: Record<string, unknown>) =>
    fns.every((f) => f(vals));

// ---- Tabs ----

export const FORM_TABS: Tab[] = [
  // =====================================================================
  // 1. Pokemon Traits
  // =====================================================================
  {
    id: "pokemon-traits",
    label: "Pokemon Traits",
    groups: [
      {
        title: "Pokemon Base Statistics",
        fields: [
          {
            name: "baseStatisticsMod",
            label: "Randomization",
            kind: { type: "radio", options: baseStatsOptions },
          },
          {
            name: "baseStatsFollowEvolutions",
            label: "Follow Evolutions",
            kind: { type: "checkbox" },
            showIf: neq("baseStatisticsMod", "UNCHANGED"),
          },
          {
            name: "baseStatsFollowMegaEvolutions",
            label: "Follow Mega Evolutions",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: neq("baseStatisticsMod", "UNCHANGED"),
          },
          {
            name: "assignEvoStatsRandomly",
            label: "Assign Evolution Stats Randomly",
            kind: { type: "checkbox" },
            showIf: and(
              neq("baseStatisticsMod", "UNCHANGED"),
              v("baseStatsFollowEvolutions")
            ),
          },
          {
            name: "updateBaseStats",
            label: "Update Base Stats",
            kind: { type: "checkbox" },
          },
          {
            name: "updateBaseStatsToGeneration",
            label: "Update To Generation",
            kind: { type: "select", options: updateGenerationOptions },
            showIf: v("updateBaseStats"),
          },
          {
            name: "standardizeEXPCurves",
            label: "Standardize EXP Curves",
            kind: { type: "checkbox" },
          },
          {
            name: "selectedEXPCurve",
            label: "EXP Curve",
            kind: { type: "select", options: expCurveSelectOptions },
            showIf: v("standardizeEXPCurves"),
          },
          {
            name: "expCurveMod",
            label: "Apply To",
            kind: { type: "radio", options: expCurveModOptions },
            showIf: v("standardizeEXPCurves"),
          },
        ],
      },
      {
        title: "Pokemon Types",
        fields: [
          {
            name: "typesMod",
            label: "Randomization",
            kind: { type: "radio", options: typesOptions },
          },
          {
            name: "typesFollowMegaEvolutions",
            label: "Follow Mega Evolutions",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: neq("typesMod", "UNCHANGED"),
          },
          {
            name: "dualTypeOnly",
            label: "Dual Type Only",
            kind: { type: "checkbox" },
            showIf: neq("typesMod", "UNCHANGED"),
          },
        ],
      },
      {
        title: "Pokemon Abilities",
        minGen: 3,
        fields: [
          {
            name: "abilitiesMod",
            label: "Randomization",
            kind: { type: "radio", options: abilitiesOptions },
            minGen: 3,
          },
          {
            name: "allowWonderGuard",
            label: "Allow Wonder Guard",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("abilitiesMod", "RANDOMIZE"),
          },
          {
            name: "abilitiesFollowEvolutions",
            label: "Follow Evolutions",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("abilitiesMod", "RANDOMIZE"),
          },
          {
            name: "abilitiesFollowMegaEvolutions",
            label: "Follow Mega Evolutions",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: eq("abilitiesMod", "RANDOMIZE"),
          },
          {
            name: "banTrappingAbilities",
            label: "Ban Trapping Abilities",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("abilitiesMod", "RANDOMIZE"),
          },
          {
            name: "banNegativeAbilities",
            label: "Ban Negative Abilities",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("abilitiesMod", "RANDOMIZE"),
          },
          {
            name: "banBadAbilities",
            label: "Ban Bad Abilities",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("abilitiesMod", "RANDOMIZE"),
          },
          {
            name: "weighDuplicateAbilitiesTogether",
            label: "Weigh Duplicate Abilities Together",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("abilitiesMod", "RANDOMIZE"),
          },
          {
            name: "ensureTwoAbilities",
            label: "Ensure Two Abilities",
            kind: { type: "checkbox" },
            minGen: 5,
            showIf: eq("abilitiesMod", "RANDOMIZE"),
          },
        ],
      },
      {
        title: "Pokemon Evolutions",
        fields: [
          {
            name: "evolutionsMod",
            label: "Randomization",
            kind: { type: "radio", options: evolutionsOptions },
          },
          {
            name: "evosSimilarStrength",
            label: "Similar Strength",
            kind: { type: "checkbox" },
            showIf: eq("evolutionsMod", "RANDOM"),
          },
          {
            name: "evosSameTyping",
            label: "Same Typing",
            kind: { type: "checkbox" },
            showIf: eq("evolutionsMod", "RANDOM"),
          },
          {
            name: "evosMaxThreeStages",
            label: "Max 3 Stages",
            kind: { type: "checkbox" },
            showIf: eq("evolutionsMod", "RANDOM"),
          },
          {
            name: "evosForceChange",
            label: "Force Change",
            kind: { type: "checkbox" },
            showIf: eq("evolutionsMod", "RANDOM"),
          },
          {
            name: "evosAllowAltFormes",
            label: "Allow Alternate Formes",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: eq("evolutionsMod", "RANDOM"),
          },
          {
            name: "changeImpossibleEvolutions",
            label: "Change Impossible Evolutions",
            kind: { type: "checkbox" },
          },
          {
            name: "makeEvolutionsEasier",
            label: "Make Evolutions Easier",
            kind: { type: "checkbox" },
          },
          {
            name: "removeTimeBasedEvolutions",
            label: "Remove Time-Based Evolutions",
            kind: { type: "checkbox" },
          },
        ],
      },
    ],
  },

  // =====================================================================
  // 2. Starters, Statics & Trades
  // =====================================================================
  {
    id: "starters-statics-trades",
    label: "Starters, Statics & Trades",
    groups: [
      {
        title: "Starter Pokemon",
        fields: [
          {
            name: "startersMod",
            label: "Randomization",
            kind: { type: "radio", options: startersOptions },
          },
          {
            name: "customStarters",
            label: "Custom Starters",
            kind: { type: "multi-select-pokemon", count: 3 },
            showIf: eq("startersMod", "CUSTOM"),
          },
          {
            name: "randomizeStartersHeldItems",
            label: "Randomize Held Items",
            kind: { type: "checkbox" },
            minGen: 2,
          },
          {
            name: "banBadRandomStarterHeldItems",
            label: "Ban Bad Items",
            kind: { type: "checkbox" },
            minGen: 2,
            showIf: v("randomizeStartersHeldItems"),
          },
          {
            name: "allowStarterAltFormes",
            label: "Allow Alternate Formes",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: neq("startersMod", "UNCHANGED"),
          },
        ],
      },
      {
        title: "Static Pokemon",
        fields: [
          {
            name: "staticPokemonMod",
            label: "Randomization",
            kind: { type: "radio", options: staticOptions },
          },
          {
            name: "allowStaticAltFormes",
            label: "Allow Alternate Formes",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: neq("staticPokemonMod", "UNCHANGED"),
          },
          {
            name: "swapStaticMegaEvos",
            label: "Swap Mega Evolvables",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: neq("staticPokemonMod", "UNCHANGED"),
          },
          {
            name: "limitMainGameLegendaries",
            label: "Limit Main Game Legendaries",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: neq("staticPokemonMod", "UNCHANGED"),
          },
          {
            name: "limit600",
            label: "Limit 600 BST",
            kind: { type: "checkbox" },
            showIf: neq("staticPokemonMod", "UNCHANGED"),
          },
          {
            name: "staticLevelModified",
            label: "Modify Static Levels",
            kind: { type: "checkbox" },
          },
          {
            name: "staticLevelModifier",
            label: "Level Modifier %",
            kind: { type: "slider", min: -50, max: 50, step: 1 },
            showIf: v("staticLevelModified"),
          },
          {
            name: "correctStaticMusic",
            label: "Correct Static Music",
            kind: { type: "checkbox" },
          },
        ],
      },
      {
        title: "In-Game Trades",
        minGen: 2,
        fields: [
          {
            name: "inGameTradesMod",
            label: "Randomization",
            kind: { type: "radio", options: inGameTradesOptions },
            minGen: 2,
          },
          {
            name: "randomizeInGameTradesNicknames",
            label: "Randomize Nicknames",
            kind: { type: "checkbox" },
            minGen: 2,
            showIf: neq("inGameTradesMod", "UNCHANGED"),
          },
          {
            name: "randomizeInGameTradesOTs",
            label: "Randomize OTs",
            kind: { type: "checkbox" },
            minGen: 2,
            showIf: neq("inGameTradesMod", "UNCHANGED"),
          },
          {
            name: "randomizeInGameTradesIVs",
            label: "Randomize IVs",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: neq("inGameTradesMod", "UNCHANGED"),
          },
          {
            name: "randomizeInGameTradesItems",
            label: "Randomize Held Items",
            kind: { type: "checkbox" },
            minGen: 2,
            showIf: neq("inGameTradesMod", "UNCHANGED"),
          },
        ],
      },
    ],
  },

  // =====================================================================
  // 3. Moves & Movesets
  // =====================================================================
  {
    id: "moves-movesets",
    label: "Moves & Movesets",
    groups: [
      {
        title: "Move Data",
        fields: [
          {
            name: "randomizeMovePowers",
            label: "Randomize Move Powers",
            kind: { type: "checkbox" },
          },
          {
            name: "randomizeMoveAccuracies",
            label: "Randomize Move Accuracies",
            kind: { type: "checkbox" },
          },
          {
            name: "randomizeMovePPs",
            label: "Randomize Move PPs",
            kind: { type: "checkbox" },
          },
          {
            name: "randomizeMoveTypes",
            label: "Randomize Move Types",
            kind: { type: "checkbox" },
          },
          {
            name: "randomizeMoveCategory",
            label: "Randomize Move Category",
            kind: { type: "checkbox" },
            minGen: 4,
          },
          {
            name: "updateMoves",
            label: "Update Moves",
            kind: { type: "checkbox" },
          },
          {
            name: "updateMovesToGeneration",
            label: "Update To Generation",
            kind: { type: "select", options: updateGenerationOptions },
            showIf: v("updateMoves"),
          },
          {
            name: "updateMovesLegacy",
            label: "Legacy Updates",
            kind: { type: "checkbox" },
            showIf: v("updateMoves"),
          },
        ],
      },
      {
        title: "Pokemon Movesets",
        fields: [
          {
            name: "movesetsMod",
            label: "Randomization",
            kind: { type: "radio", options: movesetsOptions },
          },
          {
            name: "startWithGuaranteedMoves",
            label: "Start with Guaranteed Moves",
            kind: { type: "checkbox" },
            showIf: (vals) =>
              vals.movesetsMod === "RANDOM_PREFER_SAME_TYPE" ||
              vals.movesetsMod === "COMPLETELY_RANDOM",
          },
          {
            name: "guaranteedMoveCount",
            label: "Guaranteed Move Count",
            kind: { type: "slider", min: 2, max: 4, step: 1 },
            showIf: v("startWithGuaranteedMoves"),
          },
          {
            name: "reorderDamagingMoves",
            label: "Reorder Damaging Moves",
            kind: { type: "checkbox" },
            showIf: (vals) =>
              vals.movesetsMod === "RANDOM_PREFER_SAME_TYPE" ||
              vals.movesetsMod === "COMPLETELY_RANDOM",
          },
          {
            name: "movesetsForceGoodDamaging",
            label: "Force Good Damaging Moves",
            kind: { type: "checkbox" },
            showIf: (vals) =>
              vals.movesetsMod === "RANDOM_PREFER_SAME_TYPE" ||
              vals.movesetsMod === "COMPLETELY_RANDOM",
          },
          {
            name: "movesetsGoodDamagingPercent",
            label: "Good Damaging %",
            kind: { type: "slider", min: 0, max: 100, step: 1 },
            showIf: v("movesetsForceGoodDamaging"),
          },
          {
            name: "blockBrokenMovesetMoves",
            label: "Block Broken Moves",
            kind: { type: "checkbox" },
            showIf: (vals) =>
              vals.movesetsMod === "RANDOM_PREFER_SAME_TYPE" ||
              vals.movesetsMod === "COMPLETELY_RANDOM",
          },
          {
            name: "evolutionMovesForAll",
            label: "Evolution Moves for All",
            kind: { type: "checkbox" },
            minGen: 7,
          },
        ],
      },
    ],
  },

  // =====================================================================
  // 4. Foe Pokemon (Trainers & Totems)
  // =====================================================================
  {
    id: "trainers",
    label: "Foe Pokemon",
    groups: [
      {
        title: "Trainer Pokemon",
        fields: [
          {
            name: "trainersMod",
            label: "Randomization",
            kind: { type: "radio", options: trainersOptions },
          },
          {
            name: "rivalCarriesStarterThroughout",
            label: "Rival/Friend Carries Starter",
            kind: { type: "checkbox" },
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "trainersUsePokemonOfSimilarStrength",
            label: "Similar Strength",
            kind: { type: "checkbox" },
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "trainersMatchTypingDistribution",
            label: "Match Typing Distribution",
            kind: { type: "checkbox" },
            showIf: eq("trainersMod", "RANDOM"),
          },
          {
            name: "trainersBlockLegendaries",
            label: "Block Legendaries",
            kind: { type: "checkbox" },
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "trainersBlockEarlyWonderGuard",
            label: "Block Early Wonder Guard",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "trainersEnforceDistribution",
            label: "Enforce Distribution",
            kind: { type: "checkbox" },
            showIf: eq("trainersMod", "DISTRIBUTED"),
          },
          {
            name: "trainersEnforceMainPlaythrough",
            label: "Enforce Main Playthrough",
            kind: { type: "checkbox" },
            showIf: eq("trainersMod", "MAINPLAYTHROUGH"),
          },
          {
            name: "randomizeTrainerNames",
            label: "Randomize Trainer Names",
            kind: { type: "checkbox" },
          },
          {
            name: "randomizeTrainerClassNames",
            label: "Randomize Trainer Class Names",
            kind: { type: "checkbox" },
          },
          {
            name: "trainersForceFullyEvolved",
            label: "Force Fully Evolved at Level",
            kind: { type: "checkbox" },
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "trainersForceFullyEvolvedLevel",
            label: "Fully Evolved Level",
            kind: { type: "slider", min: 30, max: 65, step: 1 },
            showIf: v("trainersForceFullyEvolved"),
          },
          {
            name: "trainersLevelModified",
            label: "Modify Trainer Levels",
            kind: { type: "checkbox" },
          },
          {
            name: "trainersLevelModifier",
            label: "Level Modifier %",
            kind: { type: "slider", min: -50, max: 50, step: 1 },
            showIf: v("trainersLevelModified"),
          },
          {
            name: "eliteFourUniquePokemonNumber",
            label: "Unique Elite Four Pokemon",
            kind: { type: "slider", min: 0, max: 2, step: 1 },
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "allowTrainerAlternateFormes",
            label: "Allow Alternate Formes",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "swapTrainerMegaEvos",
            label: "Swap Trainer Mega Evolvables",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "additionalBossTrainerPokemon",
            label: "Additional Boss Trainer Pokemon",
            kind: { type: "slider", min: 0, max: 5, step: 1 },
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "additionalImportantTrainerPokemon",
            label: "Additional Important Trainer Pokemon",
            kind: { type: "slider", min: 0, max: 5, step: 1 },
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "additionalRegularTrainerPokemon",
            label: "Additional Regular Trainer Pokemon",
            kind: { type: "slider", min: 0, max: 5, step: 1 },
            showIf: neq("trainersMod", "UNCHANGED"),
          },
          {
            name: "doubleBattleMode",
            label: "Double Battle Mode",
            kind: { type: "checkbox" },
            minGen: 3,
          },
          {
            name: "shinyChance",
            label: "Shiny Chance",
            kind: { type: "checkbox" },
            minGen: 5,
          },
          {
            name: "betterTrainerMovesets",
            label: "Better Trainer Movesets",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: neq("trainersMod", "UNCHANGED"),
          },
        ],
      },
      {
        title: "Trainer Pokemon Held Items",
        minGen: 2,
        fields: [
          {
            name: "randomizeHeldItemsForBossTrainerPokemon",
            label: "Randomize for Boss Trainers",
            kind: { type: "checkbox" },
            minGen: 2,
          },
          {
            name: "randomizeHeldItemsForImportantTrainerPokemon",
            label: "Randomize for Important Trainers",
            kind: { type: "checkbox" },
            minGen: 2,
          },
          {
            name: "randomizeHeldItemsForRegularTrainerPokemon",
            label: "Randomize for Regular Trainers",
            kind: { type: "checkbox" },
            minGen: 2,
          },
          {
            name: "consumableItemsOnlyForTrainerPokemon",
            label: "Consumable Items Only",
            kind: { type: "checkbox" },
            minGen: 2,
          },
          {
            name: "sensibleItemsOnlyForTrainerPokemon",
            label: "Sensible Items Only",
            kind: { type: "checkbox" },
            minGen: 2,
          },
          {
            name: "highestLevelOnlyGetsItemsForTrainerPokemon",
            label: "Highest Level Only Gets Items",
            kind: { type: "checkbox" },
            minGen: 2,
          },
        ],
      },
      {
        title: "Totem Pokemon",
        minGen: 7,
        fields: [
          {
            name: "totemPokemonMod",
            label: "Totem Randomization",
            kind: { type: "radio", options: totemOptions },
            minGen: 7,
          },
          {
            name: "allyPokemonMod",
            label: "Ally Randomization",
            kind: { type: "radio", options: allyOptions },
            minGen: 7,
          },
          {
            name: "auraMod",
            label: "Aura Randomization",
            kind: { type: "radio", options: auraOptions },
            minGen: 7,
          },
          {
            name: "randomizeTotemHeldItems",
            label: "Randomize Held Items",
            kind: { type: "checkbox" },
            minGen: 7,
          },
          {
            name: "allowTotemAltFormes",
            label: "Allow Alternate Formes",
            kind: { type: "checkbox" },
            minGen: 7,
          },
          {
            name: "totemLevelsModified",
            label: "Modify Totem Levels",
            kind: { type: "checkbox" },
            minGen: 7,
          },
          {
            name: "totemLevelModifier",
            label: "Level Modifier %",
            kind: { type: "slider", min: -50, max: 50, step: 1 },
            minGen: 7,
            showIf: v("totemLevelsModified"),
          },
        ],
      },
    ],
  },

  // =====================================================================
  // 5. Wild Pokemon
  // =====================================================================
  {
    id: "wild",
    label: "Wild Pokemon",
    groups: [
      {
        title: "Wild Pokemon",
        fields: [
          {
            name: "wildPokemonMod",
            label: "Randomization",
            kind: { type: "radio", options: wildPokemonOptions },
          },
          {
            name: "wildPokemonRestrictionMod",
            label: "Restriction",
            kind: { type: "radio", options: wildRestrictionOptions },
            showIf: neq("wildPokemonMod", "UNCHANGED"),
          },
          {
            name: "useTimeBasedEncounters",
            label: "Use Time-Based Encounters",
            kind: { type: "checkbox" },
            minGen: 2,
          },
          {
            name: "blockWildLegendaries",
            label: "Block Wild Legendaries",
            kind: { type: "checkbox" },
            showIf: neq("wildPokemonMod", "UNCHANGED"),
          },
          {
            name: "useMinimumCatchRate",
            label: "Use Minimum Catch Rate",
            kind: { type: "checkbox" },
          },
          {
            name: "minimumCatchRateLevel",
            label: "Catch Rate Level",
            kind: { type: "slider", min: 1, max: 5, step: 1 },
            showIf: v("useMinimumCatchRate"),
          },
          {
            name: "randomizeWildPokemonHeldItems",
            label: "Randomize Held Items",
            kind: { type: "checkbox" },
            minGen: 2,
          },
          {
            name: "banBadRandomWildPokemonHeldItems",
            label: "Ban Bad Items",
            kind: { type: "checkbox" },
            minGen: 2,
            showIf: v("randomizeWildPokemonHeldItems"),
          },
          {
            name: "balanceShakingGrass",
            label: "Balance Shaking Grass",
            kind: { type: "checkbox" },
            minGen: 5,
            maxGen: 5,
          },
          {
            name: "wildLevelsModified",
            label: "Modify Wild Levels",
            kind: { type: "checkbox" },
          },
          {
            name: "wildLevelModifier",
            label: "Level Modifier %",
            kind: { type: "slider", min: -50, max: 50, step: 1 },
            showIf: v("wildLevelsModified"),
          },
          {
            name: "allowWildAltFormes",
            label: "Allow Alternate Formes",
            kind: { type: "checkbox" },
            minGen: 6,
            showIf: neq("wildPokemonMod", "UNCHANGED"),
          },
        ],
      },
    ],
  },

  // =====================================================================
  // 6. TMs/HMs & Tutors
  // =====================================================================
  {
    id: "tms-tutors",
    label: "TMs/HMs & Tutors",
    groups: [
      {
        title: "TMs & HMs",
        fields: [
          {
            name: "tmsMod",
            label: "TM Moves",
            kind: { type: "radio", options: UNCHANGED_RANDOM },
          },
          {
            name: "tmLevelUpMoveSanity",
            label: "Level Up Move Sanity",
            kind: { type: "checkbox" },
            showIf: eq("tmsMod", "RANDOM"),
          },
          {
            name: "keepFieldMoveTMs",
            label: "Keep Field Move TMs",
            kind: { type: "checkbox" },
            showIf: eq("tmsMod", "RANDOM"),
          },
          {
            name: "fullHMCompat",
            label: "Full HM Compatibility",
            kind: { type: "checkbox" },
          },
          {
            name: "tmsForceGoodDamaging",
            label: "Force Good Damaging Moves",
            kind: { type: "checkbox" },
            showIf: eq("tmsMod", "RANDOM"),
          },
          {
            name: "tmsGoodDamagingPercent",
            label: "Good Damaging %",
            kind: { type: "slider", min: 0, max: 100, step: 1 },
            showIf: v("tmsForceGoodDamaging"),
          },
          {
            name: "blockBrokenTMMoves",
            label: "Block Broken Moves",
            kind: { type: "checkbox" },
            showIf: eq("tmsMod", "RANDOM"),
          },
          {
            name: "tmsFollowEvolutions",
            label: "Follow Evolutions (Compat)",
            kind: { type: "checkbox" },
          },
          {
            name: "tmsHmsCompatibilityMod",
            label: "TM/HM Compatibility",
            kind: { type: "radio", options: tmHmCompatOptions },
          },
        ],
      },
      {
        title: "Move Tutors",
        minGen: 3,
        fields: [
          {
            name: "moveTutorMovesMod",
            label: "Tutor Moves",
            kind: { type: "radio", options: UNCHANGED_RANDOM },
            minGen: 3,
          },
          {
            name: "tutorLevelUpMoveSanity",
            label: "Level Up Move Sanity",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("moveTutorMovesMod", "RANDOM"),
          },
          {
            name: "keepFieldMoveTutors",
            label: "Keep Field Move Tutors",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("moveTutorMovesMod", "RANDOM"),
          },
          {
            name: "tutorsForceGoodDamaging",
            label: "Force Good Damaging Moves",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("moveTutorMovesMod", "RANDOM"),
          },
          {
            name: "tutorsGoodDamagingPercent",
            label: "Good Damaging %",
            kind: { type: "slider", min: 0, max: 100, step: 1 },
            minGen: 3,
            showIf: v("tutorsForceGoodDamaging"),
          },
          {
            name: "blockBrokenTutorMoves",
            label: "Block Broken Moves",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("moveTutorMovesMod", "RANDOM"),
          },
          {
            name: "tutorFollowEvolutions",
            label: "Follow Evolutions (Compat)",
            kind: { type: "checkbox" },
            minGen: 3,
          },
          {
            name: "moveTutorsCompatibilityMod",
            label: "Tutor Compatibility",
            kind: { type: "radio", options: tutorCompatOptions },
            minGen: 3,
          },
        ],
      },
    ],
  },

  // =====================================================================
  // 7. Items
  // =====================================================================
  {
    id: "items",
    label: "Items",
    groups: [
      {
        title: "Field Items",
        fields: [
          {
            name: "fieldItemsMod",
            label: "Randomization",
            kind: { type: "radio", options: fieldItemsOptions },
          },
          {
            name: "banBadRandomFieldItems",
            label: "Ban Bad Items",
            kind: { type: "checkbox" },
            showIf: (vals) =>
              vals.fieldItemsMod === "RANDOM" ||
              vals.fieldItemsMod === "RANDOM_EVEN",
          },
        ],
      },
      {
        title: "Shop Items",
        minGen: 3,
        fields: [
          {
            name: "shopItemsMod",
            label: "Randomization",
            kind: { type: "radio", options: shopItemsOptions },
            minGen: 3,
          },
          {
            name: "banBadRandomShopItems",
            label: "Ban Bad Items",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("shopItemsMod", "RANDOM"),
          },
          {
            name: "banRegularShopItems",
            label: "Ban Regular Shop Items",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("shopItemsMod", "RANDOM"),
          },
          {
            name: "banOPShopItems",
            label: "Ban OP Shop Items",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("shopItemsMod", "RANDOM"),
          },
          {
            name: "balanceShopPrices",
            label: "Balance Shop Prices",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: neq("shopItemsMod", "UNCHANGED"),
          },
          {
            name: "guaranteeEvolutionItems",
            label: "Guarantee Evolution Items",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: neq("shopItemsMod", "UNCHANGED"),
          },
          {
            name: "guaranteeXItems",
            label: "Guarantee X Items",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: neq("shopItemsMod", "UNCHANGED"),
          },
        ],
      },
      {
        title: "Pickup Items",
        minGen: 3,
        fields: [
          {
            name: "pickupItemsMod",
            label: "Randomization",
            kind: { type: "radio", options: UNCHANGED_RANDOM },
            minGen: 3,
          },
          {
            name: "banBadRandomPickupItems",
            label: "Ban Bad Items",
            kind: { type: "checkbox" },
            minGen: 3,
            showIf: eq("pickupItemsMod", "RANDOM"),
          },
        ],
      },
    ],
  },

  // =====================================================================
  // 8. Miscellaneous
  // =====================================================================
  {
    id: "misc",
    label: "Miscellaneous",
    groups: [
      {
        title: "General Options",
        fields: [
          {
            name: "raceMode",
            label: "Race Mode",
            kind: { type: "checkbox" },
          },
          {
            name: "blockBrokenMoves",
            label: "Block Broken Moves (Global)",
            kind: { type: "checkbox" },
          },
          {
            name: "limitPokemon",
            label: "Limit Pokemon (by generation)",
            kind: { type: "checkbox" },
          },
          {
            name: "banIrregularAltFormes",
            label: "Ban Irregular Alternate Formes",
            kind: { type: "checkbox" },
            minGen: 6,
          },
        ],
      },
      {
        title: "Misc Tweaks",
        fields: [
          {
            name: "currentMiscTweaks",
            label: "Misc Tweaks Bitfield",
            kind: { type: "number", min: 0, max: 2147483647 },
            help: "Bitfield of enabled MiscTweak flags. UI should render checkboxes per tweak based on the loaded ROM's supported tweaks.",
          },
        ],
      },
    ],
  },
];

// ---- Defaults ----

export const DEFAULT_VALUES: Record<string, unknown> = {
  // General
  romName: "",
  updatedFromOldVersion: false,
  currentRestrictions: null,
  currentMiscTweaks: 0,

  changeImpossibleEvolutions: false,
  makeEvolutionsEasier: false,
  removeTimeBasedEvolutions: false,
  raceMode: false,
  blockBrokenMoves: false,
  limitPokemon: false,
  banIrregularAltFormes: false,
  dualTypeOnly: false,

  // Base stats
  baseStatisticsMod: "UNCHANGED",
  baseStatsFollowEvolutions: false,
  baseStatsFollowMegaEvolutions: false,
  assignEvoStatsRandomly: false,
  updateBaseStats: false,
  updateBaseStatsToGeneration: 0,
  standardizeEXPCurves: false,
  selectedEXPCurve: "MEDIUM_FAST",
  expCurveMod: "LEGENDARIES",

  // Abilities
  abilitiesMod: "UNCHANGED",
  allowWonderGuard: true,
  abilitiesFollowEvolutions: false,
  abilitiesFollowMegaEvolutions: false,
  banTrappingAbilities: false,
  banNegativeAbilities: false,
  banBadAbilities: false,
  weighDuplicateAbilitiesTogether: false,
  ensureTwoAbilities: false,

  // Starters
  startersMod: "UNCHANGED",
  allowStarterAltFormes: false,
  customStarters: [0, 0, 0],
  randomizeStartersHeldItems: false,
  limitMainGameLegendaries: false,
  limit600: false,
  banBadRandomStarterHeldItems: false,

  // Types
  typesMod: "UNCHANGED",
  typesFollowMegaEvolutions: false,

  // Evolutions
  evolutionsMod: "UNCHANGED",
  evosSimilarStrength: false,
  evosSameTyping: false,
  evosMaxThreeStages: false,
  evosForceChange: false,
  evosAllowAltFormes: false,

  // Move data
  randomizeMovePowers: false,
  randomizeMoveAccuracies: false,
  randomizeMovePPs: false,
  randomizeMoveTypes: false,
  randomizeMoveCategory: false,
  updateMoves: false,
  updateMovesToGeneration: 0,
  updateMovesLegacy: false,

  // Movesets
  movesetsMod: "UNCHANGED",
  startWithGuaranteedMoves: false,
  guaranteedMoveCount: 2,
  reorderDamagingMoves: false,
  movesetsForceGoodDamaging: false,
  movesetsGoodDamagingPercent: 0,
  blockBrokenMovesetMoves: false,
  evolutionMovesForAll: false,

  // Trainers
  trainersMod: "UNCHANGED",
  rivalCarriesStarterThroughout: false,
  trainersUsePokemonOfSimilarStrength: false,
  trainersMatchTypingDistribution: false,
  trainersBlockLegendaries: true,
  trainersBlockEarlyWonderGuard: true,
  trainersEnforceDistribution: false,
  trainersEnforceMainPlaythrough: false,
  randomizeTrainerNames: false,
  randomizeTrainerClassNames: false,
  trainersForceFullyEvolved: false,
  trainersForceFullyEvolvedLevel: 30,
  trainersLevelModified: false,
  trainersLevelModifier: 0,
  eliteFourUniquePokemonNumber: 0,
  allowTrainerAlternateFormes: false,
  swapTrainerMegaEvos: false,
  additionalBossTrainerPokemon: 0,
  additionalImportantTrainerPokemon: 0,
  additionalRegularTrainerPokemon: 0,
  randomizeHeldItemsForBossTrainerPokemon: false,
  randomizeHeldItemsForImportantTrainerPokemon: false,
  randomizeHeldItemsForRegularTrainerPokemon: false,
  consumableItemsOnlyForTrainerPokemon: false,
  sensibleItemsOnlyForTrainerPokemon: false,
  highestLevelOnlyGetsItemsForTrainerPokemon: false,
  doubleBattleMode: false,
  shinyChance: false,
  betterTrainerMovesets: false,

  // Wild Pokemon
  wildPokemonMod: "UNCHANGED",
  wildPokemonRestrictionMod: "NONE",
  useTimeBasedEncounters: false,
  blockWildLegendaries: true,
  useMinimumCatchRate: false,
  minimumCatchRateLevel: 1,
  randomizeWildPokemonHeldItems: false,
  banBadRandomWildPokemonHeldItems: false,
  balanceShakingGrass: false,
  wildLevelsModified: false,
  wildLevelModifier: 0,
  allowWildAltFormes: false,

  // Static Pokemon
  staticPokemonMod: "UNCHANGED",
  allowStaticAltFormes: false,
  swapStaticMegaEvos: false,
  staticLevelModified: false,
  staticLevelModifier: 0,
  correctStaticMusic: false,

  // Totem Pokemon
  totemPokemonMod: "UNCHANGED",
  allyPokemonMod: "UNCHANGED",
  auraMod: "UNCHANGED",
  randomizeTotemHeldItems: false,
  totemLevelsModified: false,
  totemLevelModifier: 0,
  allowTotemAltFormes: false,

  // TMs
  tmsMod: "UNCHANGED",
  tmLevelUpMoveSanity: false,
  keepFieldMoveTMs: false,
  fullHMCompat: false,
  tmsForceGoodDamaging: false,
  tmsGoodDamagingPercent: 0,
  blockBrokenTMMoves: false,
  tmsFollowEvolutions: false,
  tmsHmsCompatibilityMod: "UNCHANGED",

  // Move Tutors
  moveTutorMovesMod: "UNCHANGED",
  tutorLevelUpMoveSanity: false,
  keepFieldMoveTutors: false,
  tutorsForceGoodDamaging: false,
  tutorsGoodDamagingPercent: 0,
  blockBrokenTutorMoves: false,
  tutorFollowEvolutions: false,
  moveTutorsCompatibilityMod: "UNCHANGED",

  // In-game trades
  inGameTradesMod: "UNCHANGED",
  randomizeInGameTradesNicknames: false,
  randomizeInGameTradesOTs: false,
  randomizeInGameTradesIVs: false,
  randomizeInGameTradesItems: false,

  // Field items
  fieldItemsMod: "UNCHANGED",
  banBadRandomFieldItems: false,

  // Shop items
  shopItemsMod: "UNCHANGED",
  banBadRandomShopItems: false,
  banRegularShopItems: false,
  banOPShopItems: false,
  balanceShopPrices: false,
  guaranteeEvolutionItems: false,
  guaranteeXItems: false,

  // Pickup items
  pickupItemsMod: "UNCHANGED",
  banBadRandomPickupItems: false,
};
