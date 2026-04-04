import { describe, it, expect, vi, beforeEach } from "vitest";
import { Randomizer, StringLogStream } from "../randomizer";
import { Settings, BaseStatisticsMod, EvolutionsMod, StartersMod } from "../config/settings";
import type { RomHandler, LogStream } from "../romhandlers/rom-handler";
import { TrainerNameMode } from "../romhandlers/rom-handler";
import { RandomSource } from "../utils/random-source";
import { Pokemon } from "../pokemon/pokemon";
import { Trainer } from "../pokemon/trainer";
import { TrainerPokemon } from "../pokemon/trainer-pokemon";
import { EncounterSet } from "../pokemon/encounter-set";
import { Encounter } from "../pokemon/encounter";
import { Type } from "../pokemon/type";

/**
 * Creates a minimal Pokemon object for testing.
 */
function makePokemon(number: number, name: string): Pokemon {
  const p = new Pokemon();
  p.number = number;
  p.name = name;
  p.primaryType = Type.NORMAL;
  p.hp = 50;
  p.attack = 50;
  p.defense = 50;
  p.spatk = 50;
  p.spdef = 50;
  p.speed = 50;
  p.special = 50;
  p.ability1 = 1;
  p.ability2 = 2;
  p.ability3 = 3;
  return p;
}

/**
 * Creates a MockRomHandler that implements the RomHandler interface with no-op methods.
 * Every method is a vi.fn() so we can spy on which methods were called and in what order.
 */
function createMockRomHandler(): RomHandler & { [key: string]: ReturnType<typeof vi.fn> } {
  const bulbasaur = makePokemon(1, "Bulbasaur");
  const charmander = makePokemon(4, "Charmander");
  const squirtle = makePokemon(7, "Squirtle");

  const trainer = new Trainer();
  trainer.index = 1;
  trainer.name = "Brock";
  const tp = new TrainerPokemon();
  tp.pokemon = bulbasaur;
  tp.level = 10;
  trainer.pokemon = [tp];

  const encounter = new Encounter();
  encounter.pokemon = bulbasaur;
  encounter.level = 5;
  const encounterSet = new EncounterSet();
  encounterSet.encounters = [encounter];
  encounterSet.rate = 10;

  return {
    // Basic load/save
    loadRom: vi.fn(() => true),
    saveRomFile: vi.fn(() => true),
    saveRomDirectory: vi.fn(() => true),
    loadedFilename: vi.fn(() => "test.rom"),

    // Game updates
    hasGameUpdateLoaded: vi.fn(() => false),
    loadGameUpdate: vi.fn(() => false),
    removeGameUpdate: vi.fn(),
    getGameUpdateVersion: vi.fn(() => null),

    // Log methods
    setLog: vi.fn(),
    printRomDiagnostics: vi.fn(),
    isRomValid: vi.fn(() => true),

    // Pokemon lists
    getPokemon: vi.fn(() => [null, bulbasaur, charmander, squirtle]),
    getPokemonInclFormes: vi.fn(() => [null, bulbasaur, charmander, squirtle]),
    getAltFormes: vi.fn(() => []),
    getMegaEvolutions: vi.fn(() => []),
    getAltFormeOfPokemon: vi.fn(() => bulbasaur),
    getIrregularFormes: vi.fn(() => []),

    // Gen Restrictions
    setPokemonPool: vi.fn(),
    removeEvosForPokemonPool: vi.fn(),

    // Starter Pokemon
    getStarters: vi.fn(() => [bulbasaur, charmander, squirtle]),
    setStarters: vi.fn(() => true),
    hasStarterAltFormes: vi.fn(() => false),
    starterCount: vi.fn(() => 3),
    customStarters: vi.fn(),
    randomizeStarters: vi.fn(),
    randomizeBasicTwoEvosStarters: vi.fn(),
    getPickedStarters: vi.fn(() => [bulbasaur, charmander, squirtle]),
    supportsStarterHeldItems: vi.fn(() => false),
    getStarterHeldItems: vi.fn(() => []),
    setStarterHeldItems: vi.fn(),
    randomizeStarterHeldItems: vi.fn(),

    // Pokemon Base Statistics
    shufflePokemonStats: vi.fn(),
    randomizePokemonStats: vi.fn(),
    updatePokemonStats: vi.fn(),
    getUpdatedPokemonStats: vi.fn(() => new Map()),
    standardizeEXPCurves: vi.fn(),

    // Random Pokemon selection
    randomPokemon: vi.fn(() => bulbasaur),
    randomPokemonInclFormes: vi.fn(() => bulbasaur),
    randomNonLegendaryPokemon: vi.fn(() => bulbasaur),
    randomLegendaryPokemon: vi.fn(() => bulbasaur),
    random2EvosPokemon: vi.fn(() => bulbasaur),

    // Pokemon Types
    randomType: vi.fn(() => Type.NORMAL),
    typeInGame: vi.fn(() => true),
    randomizePokemonTypes: vi.fn(),

    // Pokemon Abilities
    abilitiesPerPokemon: vi.fn(() => 2),
    highestAbilityIndex: vi.fn(() => 100),
    abilityName: vi.fn((n: number) => `Ability${n}`),
    randomizeAbilities: vi.fn(),
    getAbilityVariations: vi.fn(() => new Map()),
    getUselessAbilities: vi.fn(() => []),
    getAbilityForTrainerPokemon: vi.fn(() => 1),
    hasMegaEvolutions: vi.fn(() => false),

    // Wild Pokemon
    getEncounters: vi.fn(() => [encounterSet]),
    setEncounters: vi.fn(),
    randomEncounters: vi.fn(),
    area1to1Encounters: vi.fn(),
    game1to1Encounters: vi.fn(),
    onlyChangeWildLevels: vi.fn(),
    hasTimeBasedEncounters: vi.fn(() => false),
    hasWildAltFormes: vi.fn(() => false),
    bannedForWildEncounters: vi.fn(() => []),
    randomizeWildHeldItems: vi.fn(),
    changeCatchRates: vi.fn(),
    minimumCatchRate: vi.fn(),
    enableGuaranteedPokemonCatching: vi.fn(),

    // Trainer Pokemon
    getTrainers: vi.fn(() => [trainer]),
    getMainPlaythroughTrainers: vi.fn(() => []),
    getEliteFourTrainers: vi.fn(() => []),
    setTrainers: vi.fn(),
    randomizeTrainerPokes: vi.fn(),
    randomizeTrainerHeldItems: vi.fn(),
    getSensibleHeldItemsFor: vi.fn(() => []),
    getAllConsumableHeldItems: vi.fn(() => []),
    getAllHeldItems: vi.fn(() => []),
    rivalCarriesStarter: vi.fn(),
    hasRivalFinalBattle: vi.fn(() => false),
    forceFullyEvolvedTrainerPokes: vi.fn(),
    onlyChangeTrainerLevels: vi.fn(),
    addTrainerPokemon: vi.fn(),
    doubleBattleMode: vi.fn(),
    getMoveSelectionPoolAtLevel: vi.fn(() => []),
    pickTrainerMovesets: vi.fn(),

    // Move Data
    randomizeMovePowers: vi.fn(),
    randomizeMovePPs: vi.fn(),
    randomizeMoveAccuracies: vi.fn(),
    randomizeMoveTypes: vi.fn(),
    hasPhysicalSpecialSplit: vi.fn(() => true),
    randomizeMoveCategory: vi.fn(),
    updateMoves: vi.fn(),
    initMoveUpdates: vi.fn(),
    getMoveUpdates: vi.fn(() => new Map()),
    getMoves: vi.fn(() => []),

    // Pokemon Movesets
    getMovesLearnt: vi.fn(() => new Map()),
    setMovesLearnt: vi.fn(),
    getMovesBannedFromLevelup: vi.fn(() => []),
    getEggMoves: vi.fn(() => new Map()),
    setEggMoves: vi.fn(),
    randomizeMovesLearnt: vi.fn(),
    randomizeEggMoves: vi.fn(),
    orderDamagingMovesByDamage: vi.fn(),
    metronomeOnlyMode: vi.fn(),
    supportsFourStartingMoves: vi.fn(() => false),

    // Static Pokemon
    getStaticPokemon: vi.fn(() => []),
    setStaticPokemon: vi.fn(() => true),
    randomizeStaticPokemon: vi.fn(),
    canChangeStaticPokemon: vi.fn(() => false),
    hasStaticAltFormes: vi.fn(() => false),
    bannedForStaticPokemon: vi.fn(() => []),
    forceSwapStaticMegaEvos: vi.fn(() => false),
    onlyChangeStaticLevels: vi.fn(),
    hasMainGameLegendaries: vi.fn(() => false),
    getMainGameLegendaries: vi.fn(() => []),
    getSpecialMusicStatics: vi.fn(() => []),
    applyCorrectStaticMusic: vi.fn(),
    hasStaticMusicFix: vi.fn(() => false),

    // Totem Pokemon
    getTotemPokemon: vi.fn(() => []),
    setTotemPokemon: vi.fn(),
    randomizeTotemPokemon: vi.fn(),

    // TMs & HMs
    getTMMoves: vi.fn(() => []),
    getHMMoves: vi.fn(() => []),
    setTMMoves: vi.fn(),
    randomizeTMMoves: vi.fn(),
    getTMCount: vi.fn(() => 0),
    getHMCount: vi.fn(() => 0),
    getTMHMCompatibility: vi.fn(() => new Map()),
    setTMHMCompatibility: vi.fn(),
    randomizeTMHMCompatibility: vi.fn(),
    fullTMHMCompatibility: vi.fn(),
    ensureTMCompatSanity: vi.fn(),
    ensureTMEvolutionSanity: vi.fn(),
    fullHMCompatibility: vi.fn(),

    // Move Tutors
    copyTMCompatibilityToCosmeticFormes: vi.fn(),
    hasMoveTutors: vi.fn(() => false),
    getMoveTutorMoves: vi.fn(() => []),
    setMoveTutorMoves: vi.fn(),
    randomizeMoveTutorMoves: vi.fn(),
    getMoveTutorCompatibility: vi.fn(() => new Map()),
    setMoveTutorCompatibility: vi.fn(),
    randomizeMoveTutorCompatibility: vi.fn(),
    fullMoveTutorCompatibility: vi.fn(),
    ensureMoveTutorCompatSanity: vi.fn(),
    ensureMoveTutorEvolutionSanity: vi.fn(),

    // Trainer Names
    copyMoveTutorCompatibilityToCosmeticFormes: vi.fn(),
    canChangeTrainerText: vi.fn(() => false),
    getTrainerNames: vi.fn(() => [""]),
    setTrainerNames: vi.fn(),
    trainerNameMode: vi.fn(() => TrainerNameMode.SAME_LENGTH),
    maxTrainerNameLength: vi.fn(() => 10),
    maxSumOfTrainerNameLengths: vi.fn(() => 100),
    getTCNameLengthsByTrainer: vi.fn(() => []),
    randomizeTrainerNames: vi.fn(),

    // Trainer Classes
    getTrainerClassNames: vi.fn(() => []),
    setTrainerClassNames: vi.fn(),
    fixedTrainerClassNamesLength: vi.fn(() => false),
    maxTrainerClassNameLength: vi.fn(() => 10),
    randomizeTrainerClassNames: vi.fn(),
    getDoublesTrainerClasses: vi.fn(() => []),

    // Items
    getAllowedItems: vi.fn(() => ({ isTM: () => false, isAllowed: () => true })),
    getNonBadItems: vi.fn(() => ({ isTM: () => false, isAllowed: () => true })),
    getEvolutionItems: vi.fn(() => []),
    getXItems: vi.fn(() => []),
    getUniqueNoSellItems: vi.fn(() => []),
    getRegularShopItems: vi.fn(() => []),
    getOPShopItems: vi.fn(() => []),
    getItemNames: vi.fn(() => ["", "Potion", "Super Potion"]),

    // Field Items
    getRequiredFieldTMs: vi.fn(() => []),
    getCurrentFieldTMs: vi.fn(() => []),
    setFieldTMs: vi.fn(),
    getRegularFieldItems: vi.fn(() => []),
    setRegularFieldItems: vi.fn(),
    shuffleFieldItems: vi.fn(),
    randomizeFieldItems: vi.fn(),

    // Special Shops
    hasShopRandomization: vi.fn(() => false),
    shuffleShopItems: vi.fn(),
    randomizeShopItems: vi.fn(),
    getShopItems: vi.fn(() => new Map()),
    setShopItems: vi.fn(),
    setShopPrices: vi.fn(),

    // Pickup Items
    getPickupItems: vi.fn(() => []),
    setPickupItems: vi.fn(),
    randomizePickupItems: vi.fn(),

    // In-Game Trades
    getIngameTrades: vi.fn(() => []),
    setIngameTrades: vi.fn(),
    randomizeIngameTrades: vi.fn(),
    hasDVs: vi.fn(() => false),
    maxTradeNicknameLength: vi.fn(() => 10),
    maxTradeOTNameLength: vi.fn(() => 7),

    // Pokemon Evolutions
    removeImpossibleEvolutions: vi.fn(),
    condenseLevelEvolutions: vi.fn(),
    makeEvolutionsEasier: vi.fn(),
    removeTimeBasedEvolutions: vi.fn(),
    getImpossibleEvoUpdates: vi.fn(() => new Set()),
    getEasierEvoUpdates: vi.fn(() => new Set()),
    getTimeBasedEvoUpdates: vi.fn(() => new Set()),
    randomizeEvolutions: vi.fn(),
    randomizeEvolutionsEveryLevel: vi.fn(),
    altFormesCanHaveDifferentEvolutions: vi.fn(() => false),

    // Unchanging move lists
    getGameBreakingMoves: vi.fn(() => []),
    getIllegalMoves: vi.fn(() => []),
    getFieldMoves: vi.fn(() => []),
    getEarlyRequiredHMMoves: vi.fn(() => []),

    // Misc
    isYellow: vi.fn(() => false),
    getROMName: vi.fn(() => "Test ROM"),
    getROMCode: vi.fn(() => "TEST"),
    getSupportLevel: vi.fn(() => "Full"),
    getDefaultExtension: vi.fn(() => ".nds"),
    internalStringLength: vi.fn((s: string) => s.length),
    randomizeIntroPokemon: vi.fn(),
    getMascotImage: vi.fn(() => null),
    generationOfPokemon: vi.fn(() => 4),
    writeCheckValueToROM: vi.fn(),

    // Code tweaks
    miscTweaksAvailable: vi.fn(() => 0),
    applyMiscTweaks: vi.fn(),
    applyMiscTweak: vi.fn(),
    isEffectivenessUpdated: vi.fn(() => false),
    renderPlacementHistory: vi.fn(),

    // Forme-related methods
    hasFunctionalFormes: vi.fn(() => false),
    getAbilityDependentFormes: vi.fn(() => []),
    getBannedFormesForPlayerPokemon: vi.fn(() => []),
    getBannedFormesForTrainerPokemon: vi.fn(() => []),
  } as unknown as RomHandler & { [key: string]: ReturnType<typeof vi.fn> };
}

describe("Randomizer", () => {
  let mockRomHandler: RomHandler & { [key: string]: ReturnType<typeof vi.fn> };
  let settings: Settings;
  const testSeed = 12345n;

  beforeEach(() => {
    mockRomHandler = createMockRomHandler();
    settings = new Settings();
    RandomSource.reset();
  });

  describe("Default Settings (everything off)", () => {
    it("should complete with return code (checkValue) and no randomization methods called", () => {
      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      const result = randomizer.randomize("output.nds", log, testSeed);

      // Should return a checkValue (number, could be 0 or non-zero based on pokemon stats)
      expect(typeof result).toBe("number");

      // Core infrastructure should always be called
      expect(mockRomHandler.setPokemonPool).toHaveBeenCalled();
      expect(mockRomHandler.randomizeIntroPokemon).toHaveBeenCalled();
      expect(mockRomHandler.writeCheckValueToROM).toHaveBeenCalled();
      expect(mockRomHandler.saveRomFile).toHaveBeenCalled();

      // Randomization methods should NOT be called with default settings
      expect(mockRomHandler.randomizePokemonStats).not.toHaveBeenCalled();
      expect(mockRomHandler.shufflePokemonStats).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeAbilities).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizePokemonTypes).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeMovePowers).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeMoveAccuracies).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeMovePPs).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeMoveTypes).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeMoveCategory).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeStarters).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeTrainerPokes).not.toHaveBeenCalled();
      expect(mockRomHandler.randomEncounters).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeEvolutions).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeTMMoves).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizeIngameTrades).not.toHaveBeenCalled();
    });
  });

  describe("Settings with Pokemon stats randomization on", () => {
    it("should call randomizePokemonStats when baseStatisticsMod is RANDOM", () => {
      settings.baseStatisticsMod = BaseStatisticsMod.RANDOM;
      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      randomizer.randomize("output.nds", log, testSeed);

      expect(mockRomHandler.randomizePokemonStats).toHaveBeenCalledWith(settings);
    });

    it("should call shufflePokemonStats when baseStatisticsMod is SHUFFLE", () => {
      settings.baseStatisticsMod = BaseStatisticsMod.SHUFFLE;
      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      randomizer.randomize("output.nds", log, testSeed);

      expect(mockRomHandler.shufflePokemonStats).toHaveBeenCalledWith(settings);
      expect(mockRomHandler.randomizePokemonStats).not.toHaveBeenCalled();
    });

    it("should not call stat methods when baseStatisticsMod is UNCHANGED", () => {
      settings.baseStatisticsMod = BaseStatisticsMod.UNCHANGED;
      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      randomizer.randomize("output.nds", log, testSeed);

      expect(mockRomHandler.shufflePokemonStats).not.toHaveBeenCalled();
      expect(mockRomHandler.randomizePokemonStats).not.toHaveBeenCalled();
    });
  });

  describe("Settings with multiple options", () => {
    it("should call methods in the correct order", () => {
      settings.randomizeMovePowers = true;
      settings.randomizeMoveAccuracies = true;
      settings.baseStatisticsMod = BaseStatisticsMod.RANDOM;

      const callOrder: string[] = [];
      mockRomHandler.randomizeMovePowers = vi.fn(() => { callOrder.push("randomizeMovePowers"); });
      mockRomHandler.randomizeMoveAccuracies = vi.fn(() => { callOrder.push("randomizeMoveAccuracies"); });
      mockRomHandler.randomizePokemonStats = vi.fn(() => { callOrder.push("randomizePokemonStats"); });

      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      randomizer.randomize("output.nds", log, testSeed);

      // Move changes come before base stat randomization in the sequence
      expect(callOrder).toEqual([
        "randomizeMovePowers",
        "randomizeMoveAccuracies",
        "randomizePokemonStats",
      ]);
    });

    it("should call methods in correct order for evolutions then starters", () => {
      settings.evolutionsMod = EvolutionsMod.RANDOM;
      settings.startersMod = StartersMod.COMPLETELY_RANDOM;

      const callOrder: string[] = [];
      mockRomHandler.randomizeEvolutions = vi.fn(() => { callOrder.push("randomizeEvolutions"); });
      mockRomHandler.randomizeStarters = vi.fn(() => { callOrder.push("randomizeStarters"); });

      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      randomizer.randomize("output.nds", log, testSeed);

      // Evolutions come before starters in the randomization sequence
      expect(callOrder.indexOf("randomizeEvolutions")).toBeLessThan(
        callOrder.indexOf("randomizeStarters"),
      );
    });
  });

  describe("Seed determinism", () => {
    it("should produce the same call sequence with the same seed and settings", () => {
      settings.randomizeMovePowers = true;
      settings.baseStatisticsMod = BaseStatisticsMod.RANDOM;

      // First run
      const mock1 = createMockRomHandler();
      const randomizer1 = new Randomizer(settings, mock1);
      const log1 = new StringLogStream();
      const result1 = randomizer1.randomize("output.nds", log1, testSeed);

      // Second run with same seed
      const mock2 = createMockRomHandler();
      const randomizer2 = new Randomizer(settings, mock2);
      const log2 = new StringLogStream();
      const result2 = randomizer2.randomize("output.nds", log2, testSeed);

      // Same seed + same settings = same check value
      expect(result1).toBe(result2);

      // Both runs should call the same methods
      expect(mock1.randomizeMovePowers).toHaveBeenCalledTimes(1);
      expect(mock2.randomizeMovePowers).toHaveBeenCalledTimes(1);
      expect(mock1.randomizePokemonStats).toHaveBeenCalledTimes(1);
      expect(mock2.randomizePokemonStats).toHaveBeenCalledTimes(1);
    });

    it("should produce different results with different seeds", () => {
      // With no-op mocks the check values are the same since mocks don't mutate state,
      // but the log output will differ in the seed line
      const randomizer = new Randomizer(settings, mockRomHandler);

      const log1 = new StringLogStream();
      randomizer.randomize("output.nds", log1, 111n);

      const log2 = new StringLogStream();
      randomizer.randomize("output.nds", log2, 222n);

      expect(log1.getOutput()).toContain("Random Seed: 111");
      expect(log2.getOutput()).toContain("Random Seed: 222");
      expect(log1.getOutput()).not.toBe(log2.getOutput());
    });
  });

  describe("Log output", () => {
    it("should contain expected section headers for default settings", () => {
      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      randomizer.randomize("output.nds", log, testSeed);

      const output = log.getOutput();

      // Version and seed info
      expect(output).toContain("Randomizer Version:");
      expect(output).toContain("Random Seed:");
      expect(output).toContain("Settings String:");

      // Unchanged sections
      expect(output).toContain("Pokemon base stats & type: unchanged");
      expect(output).toContain("Move Data: Unchanged.");
      expect(output).toContain("Pokemon Movesets: Unchanged.");
      expect(output).toContain("TM Moves: Unchanged.");
      expect(output).toContain("Trainers: Unchanged.");
      expect(output).toContain("Wild Pokemon: Unchanged.");

      // Tail
      expect(output).toContain("Randomization of Test ROM completed.");
      expect(output).toContain("RNG Calls:");
      expect(output).toContain("--ROM Diagnostics--");
    });

    it("should contain stat change header when stats are randomized", () => {
      settings.baseStatisticsMod = BaseStatisticsMod.RANDOM;
      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      randomizer.randomize("output.nds", log, testSeed);

      const output = log.getOutput();
      expect(output).toContain("--Pokemon Base Stats & Types--");
      expect(output).not.toContain("Pokemon base stats & type: unchanged");
    });

    it("should contain the seed in the log output", () => {
      const randomizer = new Randomizer(settings, mockRomHandler);
      const log = new StringLogStream();
      randomizer.randomize("output.nds", log, 99999n);

      expect(log.getOutput()).toContain("Random Seed: 99999");
    });
  });
});
