import { describe, it, expect } from "vitest";
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
} from "../settings";
import { ExpCurve } from "../../pokemon/exp-curve";
import { Version } from "../../utils/version";

describe("Settings", () => {
  describe("VERSION", () => {
    it("matches the Version constant", () => {
      expect(Settings.VERSION).toBe(Version.VERSION);
      expect(Settings.VERSION).toBe(322);
    });

    it("LENGTH_OF_SETTINGS_DATA is 51", () => {
      expect(Settings.LENGTH_OF_SETTINGS_DATA).toBe(51);
    });
  });

  describe("default construction", () => {
    it("has expected default values for general options", () => {
      const s = new Settings();
      expect(s.romName).toBe("");
      expect(s.updatedFromOldVersion).toBe(false);
      expect(s.currentRestrictions).toBeNull();
      expect(s.currentMiscTweaks).toBe(0);
      expect(s.changeImpossibleEvolutions).toBe(false);
      expect(s.makeEvolutionsEasier).toBe(false);
      expect(s.removeTimeBasedEvolutions).toBe(false);
      expect(s.raceMode).toBe(false);
      expect(s.blockBrokenMoves).toBe(false);
      expect(s.limitPokemon).toBe(false);
      expect(s.banIrregularAltFormes).toBe(false);
      expect(s.dualTypeOnly).toBe(false);
    });

    it("has expected default enum values", () => {
      const s = new Settings();
      expect(s.baseStatisticsMod).toBe(BaseStatisticsMod.UNCHANGED);
      expect(s.expCurveMod).toBe(ExpCurveMod.LEGENDARIES);
      expect(s.abilitiesMod).toBe(AbilitiesMod.UNCHANGED);
      expect(s.startersMod).toBe(StartersMod.UNCHANGED);
      expect(s.typesMod).toBe(TypesMod.UNCHANGED);
      expect(s.evolutionsMod).toBe(EvolutionsMod.UNCHANGED);
      expect(s.movesetsMod).toBe(MovesetsMod.UNCHANGED);
      expect(s.trainersMod).toBe(TrainersMod.UNCHANGED);
      expect(s.wildPokemonMod).toBe(WildPokemonMod.UNCHANGED);
      expect(s.wildPokemonRestrictionMod).toBe(WildPokemonRestrictionMod.NONE);
      expect(s.staticPokemonMod).toBe(StaticPokemonMod.UNCHANGED);
      expect(s.totemPokemonMod).toBe(TotemPokemonMod.UNCHANGED);
      expect(s.allyPokemonMod).toBe(AllyPokemonMod.UNCHANGED);
      expect(s.auraMod).toBe(AuraMod.UNCHANGED);
      expect(s.tmsMod).toBe(TMsMod.UNCHANGED);
      expect(s.tmsHmsCompatibilityMod).toBe(TMsHMsCompatibilityMod.UNCHANGED);
      expect(s.moveTutorMovesMod).toBe(MoveTutorMovesMod.UNCHANGED);
      expect(s.moveTutorsCompatibilityMod).toBe(MoveTutorsCompatibilityMod.UNCHANGED);
      expect(s.inGameTradesMod).toBe(InGameTradesMod.UNCHANGED);
      expect(s.fieldItemsMod).toBe(FieldItemsMod.UNCHANGED);
      expect(s.shopItemsMod).toBe(ShopItemsMod.UNCHANGED);
      expect(s.pickupItemsMod).toBe(PickupItemsMod.UNCHANGED);
    });

    it("has expected default numeric values", () => {
      const s = new Settings();
      expect(s.guaranteedMoveCount).toBe(2);
      expect(s.movesetsGoodDamagingPercent).toBe(0);
      expect(s.trainersForceFullyEvolvedLevel).toBe(30);
      expect(s.trainersLevelModifier).toBe(0);
      expect(s.eliteFourUniquePokemonNumber).toBe(0);
      expect(s.additionalBossTrainerPokemon).toBe(0);
      expect(s.additionalImportantTrainerPokemon).toBe(0);
      expect(s.additionalRegularTrainerPokemon).toBe(0);
      expect(s.minimumCatchRateLevel).toBe(1);
      expect(s.wildLevelModifier).toBe(0);
      expect(s.staticLevelModifier).toBe(0);
      expect(s.totemLevelModifier).toBe(0);
      expect(s.tmsGoodDamagingPercent).toBe(0);
      expect(s.tutorsGoodDamagingPercent).toBe(0);
    });

    it("has expected default boolean values for trainer options", () => {
      const s = new Settings();
      expect(s.allowWonderGuard).toBe(true);
      expect(s.trainersBlockLegendaries).toBe(true);
      expect(s.trainersBlockEarlyWonderGuard).toBe(true);
      expect(s.blockWildLegendaries).toBe(true);
    });

    it("has default starters array of [0,0,0]", () => {
      const s = new Settings();
      expect(s.customStarters).toEqual([0, 0, 0]);
    });

    it("has default EXP curve", () => {
      const s = new Settings();
      expect(s.selectedEXPCurve).toBe(ExpCurve.MEDIUM_FAST);
    });
  });

  describe("nested enums have expected values", () => {
    it("BaseStatisticsMod", () => {
      expect(BaseStatisticsMod.UNCHANGED).toBe(0);
      expect(BaseStatisticsMod.SHUFFLE).toBe(1);
      expect(BaseStatisticsMod.RANDOM).toBe(2);
    });

    it("ExpCurveMod", () => {
      expect(ExpCurveMod.LEGENDARIES).toBe(0);
      expect(ExpCurveMod.STRONG_LEGENDARIES).toBe(1);
      expect(ExpCurveMod.ALL).toBe(2);
    });

    it("AbilitiesMod", () => {
      expect(AbilitiesMod.UNCHANGED).toBe(0);
      expect(AbilitiesMod.RANDOMIZE).toBe(1);
    });

    it("StartersMod", () => {
      expect(StartersMod.UNCHANGED).toBe(0);
      expect(StartersMod.CUSTOM).toBe(1);
      expect(StartersMod.COMPLETELY_RANDOM).toBe(2);
      expect(StartersMod.RANDOM_WITH_TWO_EVOLUTIONS).toBe(3);
    });

    it("TypesMod", () => {
      expect(TypesMod.UNCHANGED).toBe(0);
      expect(TypesMod.RANDOM_FOLLOW_EVOLUTIONS).toBe(1);
      expect(TypesMod.COMPLETELY_RANDOM).toBe(2);
    });

    it("EvolutionsMod", () => {
      expect(EvolutionsMod.UNCHANGED).toBe(0);
      expect(EvolutionsMod.RANDOM).toBe(1);
      expect(EvolutionsMod.RANDOM_EVERY_LEVEL).toBe(2);
    });

    it("MovesetsMod", () => {
      expect(MovesetsMod.UNCHANGED).toBe(0);
      expect(MovesetsMod.RANDOM_PREFER_SAME_TYPE).toBe(1);
      expect(MovesetsMod.COMPLETELY_RANDOM).toBe(2);
      expect(MovesetsMod.METRONOME_ONLY).toBe(3);
    });

    it("TrainersMod", () => {
      expect(TrainersMod.UNCHANGED).toBe(0);
      expect(TrainersMod.RANDOM).toBe(1);
      expect(TrainersMod.DISTRIBUTED).toBe(2);
      expect(TrainersMod.MAINPLAYTHROUGH).toBe(3);
      expect(TrainersMod.TYPE_THEMED).toBe(4);
      expect(TrainersMod.TYPE_THEMED_ELITE4_GYMS).toBe(5);
    });

    it("WildPokemonMod", () => {
      expect(WildPokemonMod.UNCHANGED).toBe(0);
      expect(WildPokemonMod.RANDOM).toBe(1);
      expect(WildPokemonMod.AREA_MAPPING).toBe(2);
      expect(WildPokemonMod.GLOBAL_MAPPING).toBe(3);
    });

    it("WildPokemonRestrictionMod", () => {
      expect(WildPokemonRestrictionMod.NONE).toBe(0);
      expect(WildPokemonRestrictionMod.SIMILAR_STRENGTH).toBe(1);
      expect(WildPokemonRestrictionMod.CATCH_EM_ALL).toBe(2);
      expect(WildPokemonRestrictionMod.TYPE_THEME_AREAS).toBe(3);
    });

    it("StaticPokemonMod", () => {
      expect(StaticPokemonMod.UNCHANGED).toBe(0);
      expect(StaticPokemonMod.RANDOM_MATCHING).toBe(1);
      expect(StaticPokemonMod.COMPLETELY_RANDOM).toBe(2);
      expect(StaticPokemonMod.SIMILAR_STRENGTH).toBe(3);
    });

    it("TotemPokemonMod", () => {
      expect(TotemPokemonMod.UNCHANGED).toBe(0);
      expect(TotemPokemonMod.RANDOM).toBe(1);
      expect(TotemPokemonMod.SIMILAR_STRENGTH).toBe(2);
    });

    it("AllyPokemonMod", () => {
      expect(AllyPokemonMod.UNCHANGED).toBe(0);
      expect(AllyPokemonMod.RANDOM).toBe(1);
      expect(AllyPokemonMod.SIMILAR_STRENGTH).toBe(2);
    });

    it("AuraMod", () => {
      expect(AuraMod.UNCHANGED).toBe(0);
      expect(AuraMod.RANDOM).toBe(1);
      expect(AuraMod.SAME_STRENGTH).toBe(2);
    });

    it("TMsMod", () => {
      expect(TMsMod.UNCHANGED).toBe(0);
      expect(TMsMod.RANDOM).toBe(1);
    });

    it("TMsHMsCompatibilityMod", () => {
      expect(TMsHMsCompatibilityMod.UNCHANGED).toBe(0);
      expect(TMsHMsCompatibilityMod.RANDOM_PREFER_TYPE).toBe(1);
      expect(TMsHMsCompatibilityMod.COMPLETELY_RANDOM).toBe(2);
      expect(TMsHMsCompatibilityMod.FULL).toBe(3);
    });

    it("MoveTutorMovesMod", () => {
      expect(MoveTutorMovesMod.UNCHANGED).toBe(0);
      expect(MoveTutorMovesMod.RANDOM).toBe(1);
    });

    it("MoveTutorsCompatibilityMod", () => {
      expect(MoveTutorsCompatibilityMod.UNCHANGED).toBe(0);
      expect(MoveTutorsCompatibilityMod.RANDOM_PREFER_TYPE).toBe(1);
      expect(MoveTutorsCompatibilityMod.COMPLETELY_RANDOM).toBe(2);
      expect(MoveTutorsCompatibilityMod.FULL).toBe(3);
    });

    it("InGameTradesMod", () => {
      expect(InGameTradesMod.UNCHANGED).toBe(0);
      expect(InGameTradesMod.RANDOMIZE_GIVEN).toBe(1);
      expect(InGameTradesMod.RANDOMIZE_GIVEN_AND_REQUESTED).toBe(2);
    });

    it("FieldItemsMod", () => {
      expect(FieldItemsMod.UNCHANGED).toBe(0);
      expect(FieldItemsMod.SHUFFLE).toBe(1);
      expect(FieldItemsMod.RANDOM).toBe(2);
      expect(FieldItemsMod.RANDOM_EVEN).toBe(3);
    });

    it("ShopItemsMod", () => {
      expect(ShopItemsMod.UNCHANGED).toBe(0);
      expect(ShopItemsMod.SHUFFLE).toBe(1);
      expect(ShopItemsMod.RANDOM).toBe(2);
    });

    it("PickupItemsMod", () => {
      expect(PickupItemsMod.UNCHANGED).toBe(0);
      expect(PickupItemsMod.RANDOM).toBe(1);
    });
  });

  describe("Base64 round-trip (toString / fromString)", () => {
    it("round-trips default settings", () => {
      const original = new Settings();
      original.romName = "TestROM";
      original.customStarters = [1, 1, 1];

      const encoded = original.toString();
      expect(typeof encoded).toBe("string");
      expect(encoded.length).toBeGreaterThan(0);

      const restored = Settings.fromString(encoded);
      expect(restored.romName).toBe("TestROM");
      expect(restored.changeImpossibleEvolutions).toBe(false);
      expect(restored.baseStatisticsMod).toBe(BaseStatisticsMod.UNCHANGED);
      expect(restored.trainersBlockLegendaries).toBe(true);
      expect(restored.trainersBlockEarlyWonderGuard).toBe(true);
      expect(restored.blockWildLegendaries).toBe(true);
      expect(restored.allowWonderGuard).toBe(true);
    });

    it("round-trips settings with many boolean flags set", () => {
      const original = new Settings();
      original.romName = "MyROM";
      original.customStarters = [5, 10, 15];

      // Set a variety of flags
      original.changeImpossibleEvolutions = true;
      original.updateMoves = true;
      original.makeEvolutionsEasier = true;
      original.raceMode = true;
      original.limitPokemon = true;
      original.dualTypeOnly = true;
      original.banIrregularAltFormes = true;

      original.baseStatisticsMod = BaseStatisticsMod.RANDOM;
      original.baseStatsFollowEvolutions = true;
      original.standardizeEXPCurves = true;
      original.updateBaseStats = true;

      original.abilitiesMod = AbilitiesMod.RANDOMIZE;
      original.allowWonderGuard = false;
      original.banTrappingAbilities = true;

      original.trainersMod = TrainersMod.TYPE_THEMED;
      original.trainersBlockLegendaries = false;
      original.trainersForceFullyEvolved = true;
      original.trainersForceFullyEvolvedLevel = 45;
      original.trainersLevelModified = true;
      original.trainersLevelModifier = 10;

      original.wildPokemonMod = WildPokemonMod.RANDOM;
      original.wildPokemonRestrictionMod = WildPokemonRestrictionMod.SIMILAR_STRENGTH;
      original.blockWildLegendaries = false;
      original.useMinimumCatchRate = true;
      original.minimumCatchRateLevel = 3;

      original.movesetsMod = MovesetsMod.COMPLETELY_RANDOM;
      original.movesetsForceGoodDamaging = true;
      original.movesetsGoodDamagingPercent = 50;
      original.guaranteedMoveCount = 4;

      original.evolutionsMod = EvolutionsMod.RANDOM;
      original.evosSimilarStrength = true;
      original.evosSameTyping = true;

      original.tmsMod = TMsMod.RANDOM;
      original.tmsHmsCompatibilityMod = TMsHMsCompatibilityMod.FULL;
      original.tmsForceGoodDamaging = true;
      original.tmsGoodDamagingPercent = 40;

      original.inGameTradesMod = InGameTradesMod.RANDOMIZE_GIVEN_AND_REQUESTED;
      original.randomizeInGameTradesItems = true;

      original.fieldItemsMod = FieldItemsMod.RANDOM;
      original.shopItemsMod = ShopItemsMod.RANDOM;
      original.pickupItemsMod = PickupItemsMod.RANDOM;

      original.doubleBattleMode = true;
      original.additionalBossTrainerPokemon = 3;
      original.additionalImportantTrainerPokemon = 2;
      original.additionalRegularTrainerPokemon = 1;

      original.staticPokemonMod = StaticPokemonMod.COMPLETELY_RANDOM;
      original.staticLevelModified = true;
      original.staticLevelModifier = -10;

      original.totemPokemonMod = TotemPokemonMod.RANDOM;
      original.allyPokemonMod = AllyPokemonMod.RANDOM;
      original.auraMod = AuraMod.RANDOM;
      original.totemLevelsModified = true;
      original.totemLevelModifier = 5;

      original.updateBaseStatsToGeneration = 7;
      original.updateMovesToGeneration = 7;
      original.selectedEXPCurve = ExpCurve.SLOW;
      original.expCurveMod = ExpCurveMod.ALL;

      original.shinyChance = true;
      original.betterTrainerMovesets = true;

      const encoded = original.toString();
      const restored = Settings.fromString(encoded);

      expect(restored.romName).toBe("MyROM");
      expect(restored.changeImpossibleEvolutions).toBe(true);
      expect(restored.updateMoves).toBe(true);
      expect(restored.makeEvolutionsEasier).toBe(true);
      expect(restored.raceMode).toBe(true);
      expect(restored.limitPokemon).toBe(true);
      expect(restored.dualTypeOnly).toBe(true);
      expect(restored.banIrregularAltFormes).toBe(true);

      expect(restored.baseStatisticsMod).toBe(BaseStatisticsMod.RANDOM);
      expect(restored.baseStatsFollowEvolutions).toBe(true);
      expect(restored.standardizeEXPCurves).toBe(true);
      expect(restored.updateBaseStats).toBe(true);

      expect(restored.abilitiesMod).toBe(AbilitiesMod.RANDOMIZE);
      expect(restored.allowWonderGuard).toBe(false);
      expect(restored.banTrappingAbilities).toBe(true);

      expect(restored.trainersMod).toBe(TrainersMod.TYPE_THEMED);
      expect(restored.trainersBlockLegendaries).toBe(false);
      expect(restored.trainersForceFullyEvolved).toBe(true);
      expect(restored.trainersForceFullyEvolvedLevel).toBe(45);
      expect(restored.trainersLevelModified).toBe(true);
      expect(restored.trainersLevelModifier).toBe(10);

      expect(restored.wildPokemonMod).toBe(WildPokemonMod.RANDOM);
      expect(restored.wildPokemonRestrictionMod).toBe(
        WildPokemonRestrictionMod.SIMILAR_STRENGTH
      );
      expect(restored.blockWildLegendaries).toBe(false);
      expect(restored.useMinimumCatchRate).toBe(true);
      expect(restored.minimumCatchRateLevel).toBe(3);

      expect(restored.movesetsMod).toBe(MovesetsMod.COMPLETELY_RANDOM);
      expect(restored.movesetsForceGoodDamaging).toBe(true);
      expect(restored.movesetsGoodDamagingPercent).toBe(50);
      expect(restored.guaranteedMoveCount).toBe(4);

      expect(restored.evolutionsMod).toBe(EvolutionsMod.RANDOM);
      expect(restored.evosSimilarStrength).toBe(true);
      expect(restored.evosSameTyping).toBe(true);

      expect(restored.tmsMod).toBe(TMsMod.RANDOM);
      expect(restored.tmsHmsCompatibilityMod).toBe(TMsHMsCompatibilityMod.FULL);
      expect(restored.tmsForceGoodDamaging).toBe(true);
      expect(restored.tmsGoodDamagingPercent).toBe(40);

      expect(restored.inGameTradesMod).toBe(InGameTradesMod.RANDOMIZE_GIVEN_AND_REQUESTED);
      expect(restored.randomizeInGameTradesItems).toBe(true);

      expect(restored.fieldItemsMod).toBe(FieldItemsMod.RANDOM);
      expect(restored.shopItemsMod).toBe(ShopItemsMod.RANDOM);
      expect(restored.pickupItemsMod).toBe(PickupItemsMod.RANDOM);

      expect(restored.doubleBattleMode).toBe(true);
      expect(restored.additionalBossTrainerPokemon).toBe(3);
      expect(restored.additionalImportantTrainerPokemon).toBe(2);
      expect(restored.additionalRegularTrainerPokemon).toBe(1);

      expect(restored.staticPokemonMod).toBe(StaticPokemonMod.COMPLETELY_RANDOM);
      expect(restored.staticLevelModified).toBe(true);
      expect(restored.staticLevelModifier).toBe(-10);

      expect(restored.totemPokemonMod).toBe(TotemPokemonMod.RANDOM);
      expect(restored.allyPokemonMod).toBe(AllyPokemonMod.RANDOM);
      expect(restored.auraMod).toBe(AuraMod.RANDOM);
      expect(restored.totemLevelsModified).toBe(true);
      expect(restored.totemLevelModifier).toBe(5);

      expect(restored.updateBaseStatsToGeneration).toBe(7);
      expect(restored.updateMovesToGeneration).toBe(7);
      expect(restored.selectedEXPCurve).toBe(ExpCurve.SLOW);
      expect(restored.expCurveMod).toBe(ExpCurveMod.ALL);

      expect(restored.shinyChance).toBe(true);
      expect(restored.betterTrainerMovesets).toBe(true);
    });

    it("round-trips custom starters correctly", () => {
      const original = new Settings();
      original.romName = "R";
      original.customStarters = [100, 200, 300];

      const encoded = original.toString();
      const restored = Settings.fromString(encoded);

      expect(restored.customStarters).toEqual([100, 200, 300]);
    });

    it("round-trips trainer held items and ability options", () => {
      const original = new Settings();
      original.romName = "T";
      original.customStarters = [1, 1, 1];
      original.randomizeHeldItemsForBossTrainerPokemon = true;
      original.randomizeHeldItemsForImportantTrainerPokemon = true;
      original.randomizeHeldItemsForRegularTrainerPokemon = true;
      original.consumableItemsOnlyForTrainerPokemon = true;
      original.sensibleItemsOnlyForTrainerPokemon = true;
      original.highestLevelOnlyGetsItemsForTrainerPokemon = true;
      original.ensureTwoAbilities = true;
      original.weighDuplicateAbilitiesTogether = true;

      const encoded = original.toString();
      const restored = Settings.fromString(encoded);

      expect(restored.randomizeHeldItemsForBossTrainerPokemon).toBe(true);
      expect(restored.randomizeHeldItemsForImportantTrainerPokemon).toBe(true);
      expect(restored.randomizeHeldItemsForRegularTrainerPokemon).toBe(true);
      expect(restored.consumableItemsOnlyForTrainerPokemon).toBe(true);
      expect(restored.sensibleItemsOnlyForTrainerPokemon).toBe(true);
      expect(restored.highestLevelOnlyGetsItemsForTrainerPokemon).toBe(true);
      expect(restored.ensureTwoAbilities).toBe(true);
      expect(restored.weighDuplicateAbilitiesTogether).toBe(true);
    });

    it("detects corrupted checksum", () => {
      const original = new Settings();
      original.romName = "X";
      original.customStarters = [1, 1, 1];
      const encoded = original.toString();

      // Decode, corrupt a byte, re-encode
      const rawBytes = Buffer.from(encoded, "base64");
      rawBytes[5] ^= 0xff;
      const corrupted = rawBytes.toString("base64");

      expect(() => Settings.fromString(corrupted)).toThrow("Malformed input string");
    });
  });

  describe("binary write/read round-trip", () => {
    it("round-trips through binary format", () => {
      const original = new Settings();
      original.romName = "BinaryTest";
      original.customStarters = [1, 2, 3];
      original.changeImpossibleEvolutions = true;
      original.trainersMod = TrainersMod.RANDOM;
      original.wildPokemonMod = WildPokemonMod.AREA_MAPPING;

      const binary = original.write();
      expect(binary.length).toBeGreaterThan(8);

      const restored = Settings.read(binary);
      expect(restored.romName).toBe("BinaryTest");
      expect(restored.changeImpossibleEvolutions).toBe(true);
      expect(restored.trainersMod).toBe(TrainersMod.RANDOM);
      expect(restored.wildPokemonMod).toBe(WildPokemonMod.AREA_MAPPING);
    });
  });

  describe("bitfield packing edge cases", () => {
    it("level modifiers handle negative values", () => {
      const original = new Settings();
      original.romName = "L";
      original.customStarters = [1, 1, 1];
      original.trainersLevelModified = true;
      original.trainersLevelModifier = -50;
      original.wildLevelsModified = true;
      original.wildLevelModifier = -30;
      original.staticLevelModified = true;
      original.staticLevelModifier = -20;
      original.totemLevelsModified = true;
      original.totemLevelModifier = -10;

      const encoded = original.toString();
      const restored = Settings.fromString(encoded);

      expect(restored.trainersLevelModifier).toBe(-50);
      expect(restored.wildLevelModifier).toBe(-30);
      expect(restored.staticLevelModifier).toBe(-20);
      expect(restored.totemLevelModifier).toBe(-10);
    });

    it("level modifiers handle max positive values", () => {
      const original = new Settings();
      original.romName = "M";
      original.customStarters = [1, 1, 1];
      original.trainersLevelModified = true;
      original.trainersLevelModifier = 50;

      const encoded = original.toString();
      const restored = Settings.fromString(encoded);

      expect(restored.trainersLevelModifier).toBe(50);
    });

    it("good damaging percent survives round-trip", () => {
      const original = new Settings();
      original.romName = "D";
      original.customStarters = [1, 1, 1];
      original.movesetsForceGoodDamaging = true;
      original.movesetsGoodDamagingPercent = 100;
      original.tmsForceGoodDamaging = true;
      original.tmsGoodDamagingPercent = 75;
      original.tutorsForceGoodDamaging = true;
      original.tutorsGoodDamagingPercent = 50;

      const encoded = original.toString();
      const restored = Settings.fromString(encoded);

      expect(restored.movesetsForceGoodDamaging).toBe(true);
      expect(restored.movesetsGoodDamagingPercent).toBe(100);
      expect(restored.tmsForceGoodDamaging).toBe(true);
      expect(restored.tmsGoodDamagingPercent).toBe(75);
      expect(restored.tutorsForceGoodDamaging).toBe(true);
      expect(restored.tutorsGoodDamagingPercent).toBe(50);
    });

    it("elite four and catch rate level pack into one byte", () => {
      const original = new Settings();
      original.romName = "E";
      original.customStarters = [1, 1, 1];
      original.eliteFourUniquePokemonNumber = 2;
      original.minimumCatchRateLevel = 5;

      const encoded = original.toString();
      const restored = Settings.fromString(encoded);

      expect(restored.eliteFourUniquePokemonNumber).toBe(2);
      expect(restored.minimumCatchRateLevel).toBe(5);
    });

    it("guaranteed move count encodes in top 2 bits of byte 11", () => {
      for (const count of [2, 3, 4, 5]) {
        const original = new Settings();
        original.romName = "G";
        original.customStarters = [1, 1, 1];
        original.guaranteedMoveCount = count;

        const encoded = original.toString();
        const restored = Settings.fromString(encoded);
        expect(restored.guaranteedMoveCount).toBe(count);
      }
    });
  });

  describe("each enum value survives round-trip", () => {
    function roundTrip(setup: (s: Settings) => void, check: (s: Settings) => void): void {
      const original = new Settings();
      original.romName = "E";
      original.customStarters = [1, 1, 1];
      setup(original);
      const restored = Settings.fromString(original.toString());
      check(restored);
    }

    it("all BaseStatisticsMod values", () => {
      for (const mod of [BaseStatisticsMod.UNCHANGED, BaseStatisticsMod.SHUFFLE, BaseStatisticsMod.RANDOM]) {
        roundTrip(
          (s) => { s.baseStatisticsMod = mod; },
          (s) => { expect(s.baseStatisticsMod).toBe(mod); }
        );
      }
    });

    it("all TrainersMod values", () => {
      for (const mod of [
        TrainersMod.UNCHANGED, TrainersMod.RANDOM, TrainersMod.DISTRIBUTED,
        TrainersMod.MAINPLAYTHROUGH, TrainersMod.TYPE_THEMED, TrainersMod.TYPE_THEMED_ELITE4_GYMS
      ]) {
        roundTrip(
          (s) => { s.trainersMod = mod; },
          (s) => { expect(s.trainersMod).toBe(mod); }
        );
      }
    });

    it("all WildPokemonMod values", () => {
      for (const mod of [
        WildPokemonMod.UNCHANGED, WildPokemonMod.RANDOM,
        WildPokemonMod.AREA_MAPPING, WildPokemonMod.GLOBAL_MAPPING
      ]) {
        roundTrip(
          (s) => { s.wildPokemonMod = mod; },
          (s) => { expect(s.wildPokemonMod).toBe(mod); }
        );
      }
    });

    it("all StaticPokemonMod values", () => {
      for (const mod of [
        StaticPokemonMod.UNCHANGED, StaticPokemonMod.RANDOM_MATCHING,
        StaticPokemonMod.COMPLETELY_RANDOM, StaticPokemonMod.SIMILAR_STRENGTH
      ]) {
        roundTrip(
          (s) => { s.staticPokemonMod = mod; },
          (s) => { expect(s.staticPokemonMod).toBe(mod); }
        );
      }
    });

    it("all FieldItemsMod values", () => {
      for (const mod of [
        FieldItemsMod.UNCHANGED, FieldItemsMod.SHUFFLE,
        FieldItemsMod.RANDOM, FieldItemsMod.RANDOM_EVEN
      ]) {
        roundTrip(
          (s) => { s.fieldItemsMod = mod; },
          (s) => { expect(s.fieldItemsMod).toBe(mod); }
        );
      }
    });

    it("all TMsHMsCompatibilityMod values", () => {
      for (const mod of [
        TMsHMsCompatibilityMod.UNCHANGED, TMsHMsCompatibilityMod.RANDOM_PREFER_TYPE,
        TMsHMsCompatibilityMod.COMPLETELY_RANDOM, TMsHMsCompatibilityMod.FULL
      ]) {
        roundTrip(
          (s) => { s.tmsHmsCompatibilityMod = mod; },
          (s) => { expect(s.tmsHmsCompatibilityMod).toBe(mod); }
        );
      }
    });

    it("all InGameTradesMod values", () => {
      for (const mod of [
        InGameTradesMod.UNCHANGED, InGameTradesMod.RANDOMIZE_GIVEN,
        InGameTradesMod.RANDOMIZE_GIVEN_AND_REQUESTED
      ]) {
        roundTrip(
          (s) => { s.inGameTradesMod = mod; },
          (s) => { expect(s.inGameTradesMod).toBe(mod); }
        );
      }
    });

    it("all ExpCurveMod values", () => {
      for (const mod of [ExpCurveMod.LEGENDARIES, ExpCurveMod.STRONG_LEGENDARIES, ExpCurveMod.ALL]) {
        roundTrip(
          (s) => { s.expCurveMod = mod; },
          (s) => { expect(s.expCurveMod).toBe(mod); }
        );
      }
    });
  });
});
