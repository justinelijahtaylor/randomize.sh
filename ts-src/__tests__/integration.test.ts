import { describe, it, expect, vi, beforeEach } from "vitest";
import { Randomizer, StringLogStream } from "../randomizer";
import {
  Settings,
  BaseStatisticsMod,
  AbilitiesMod,
  StartersMod,
  TypesMod,
  EvolutionsMod,
  MovesetsMod,
  TrainersMod,
  WildPokemonMod,
  TMsMod,
  TMsHMsCompatibilityMod,
  InGameTradesMod,
  FieldItemsMod,
} from "../config/settings";
import type { RomHandler, LogStream } from "../romhandlers/rom-handler";
import { RomHandlerFactory, TrainerNameMode } from "../romhandlers/rom-handler";
import { RandomSource, JavaRandom } from "../utils/random-source";
import { Pokemon } from "../pokemon/pokemon";
import { Move } from "../pokemon/move";
import { Trainer } from "../pokemon/trainer";
import { TrainerPokemon } from "../pokemon/trainer-pokemon";
import { EncounterSet } from "../pokemon/encounter-set";
import { Encounter } from "../pokemon/encounter";
import { StaticEncounter } from "../pokemon/static-encounter";
import { IngameTrade } from "../pokemon/ingame-trade";
import { Type } from "../pokemon/type";
import { MoveCategory } from "../pokemon/move-category";
import type { RandomInstance } from "../utils/random-source";

// ---------------------------------------------------------------------------
// Test data builders
// ---------------------------------------------------------------------------

function makePokemon(
  number: number,
  name: string,
  opts: {
    type1?: Type;
    type2?: Type | null;
    hp?: number;
    attack?: number;
    defense?: number;
    spatk?: number;
    spdef?: number;
    speed?: number;
    ability1?: number;
    ability2?: number;
    ability3?: number;
  } = {},
): Pokemon {
  const p = new Pokemon();
  p.number = number;
  p.name = name;
  p.primaryType = opts.type1 ?? Type.NORMAL;
  p.secondaryType = opts.type2 ?? null;
  p.hp = opts.hp ?? 45 + number * 3;
  p.attack = opts.attack ?? 49 + number * 2;
  p.defense = opts.defense ?? 49 + number;
  p.spatk = opts.spatk ?? 65 + number;
  p.spdef = opts.spdef ?? 65 + number;
  p.speed = opts.speed ?? 45 + number * 2;
  p.special = p.spatk;
  p.ability1 = opts.ability1 ?? number;
  p.ability2 = opts.ability2 ?? number + 50;
  p.ability3 = opts.ability3 ?? 0;
  return p;
}

function makeMove(
  number: number,
  name: string,
  opts: {
    power?: number;
    pp?: number;
    hitratio?: number;
    type?: Type;
    category?: MoveCategory;
  } = {},
): Move {
  const m = new Move();
  m.number = number;
  m.name = name;
  m.internalId = number;
  m.power = opts.power ?? 40 + number * 2;
  m.pp = opts.pp ?? 25;
  m.hitratio = opts.hitratio ?? 100;
  m.type = opts.type ?? Type.NORMAL;
  m.category = opts.category ?? MoveCategory.PHYSICAL;
  return m;
}

// Realistic Pokemon data (10 Pokemon)
const pokemonData: Pokemon[] = [
  makePokemon(1, "Bulbasaur", { type1: Type.GRASS, type2: Type.POISON, hp: 45, attack: 49, defense: 49, spatk: 65, spdef: 65, speed: 45 }),
  makePokemon(2, "Ivysaur", { type1: Type.GRASS, type2: Type.POISON, hp: 60, attack: 62, defense: 63, spatk: 80, spdef: 80, speed: 60 }),
  makePokemon(3, "Venusaur", { type1: Type.GRASS, type2: Type.POISON, hp: 80, attack: 82, defense: 83, spatk: 100, spdef: 100, speed: 80 }),
  makePokemon(4, "Charmander", { type1: Type.FIRE, hp: 39, attack: 52, defense: 43, spatk: 60, spdef: 50, speed: 65 }),
  makePokemon(5, "Charmeleon", { type1: Type.FIRE, hp: 58, attack: 64, defense: 58, spatk: 80, spdef: 65, speed: 80 }),
  makePokemon(6, "Charizard", { type1: Type.FIRE, type2: Type.FLYING, hp: 78, attack: 84, defense: 78, spatk: 109, spdef: 85, speed: 100 }),
  makePokemon(7, "Squirtle", { type1: Type.WATER, hp: 44, attack: 48, defense: 65, spatk: 50, spdef: 64, speed: 43 }),
  makePokemon(8, "Wartortle", { type1: Type.WATER, hp: 59, attack: 63, defense: 80, spatk: 65, spdef: 80, speed: 58 }),
  makePokemon(9, "Blastoise", { type1: Type.WATER, hp: 79, attack: 83, defense: 100, spatk: 85, spdef: 105, speed: 78 }),
  makePokemon(10, "Caterpie", { type1: Type.BUG, hp: 45, attack: 30, defense: 35, spatk: 20, spdef: 20, speed: 45 }),
];

// Realistic Move data (20 moves)
const moveData: (Move | null)[] = [
  null, // index 0 is unused
  makeMove(1, "Pound", { power: 40, type: Type.NORMAL, category: MoveCategory.PHYSICAL }),
  makeMove(2, "Karate Chop", { power: 50, type: Type.FIGHTING, category: MoveCategory.PHYSICAL }),
  makeMove(3, "Double Slap", { power: 15, pp: 10, hitratio: 85, type: Type.NORMAL, category: MoveCategory.PHYSICAL }),
  makeMove(4, "Comet Punch", { power: 18, pp: 15, hitratio: 85, type: Type.NORMAL, category: MoveCategory.PHYSICAL }),
  makeMove(5, "Mega Punch", { power: 80, pp: 20, hitratio: 85, type: Type.NORMAL, category: MoveCategory.PHYSICAL }),
  makeMove(6, "Pay Day", { power: 40, pp: 20, type: Type.NORMAL, category: MoveCategory.PHYSICAL }),
  makeMove(7, "Fire Punch", { power: 75, pp: 15, type: Type.FIRE, category: MoveCategory.PHYSICAL }),
  makeMove(8, "Ice Punch", { power: 75, pp: 15, type: Type.ICE, category: MoveCategory.PHYSICAL }),
  makeMove(9, "Thunder Punch", { power: 75, pp: 15, type: Type.ELECTRIC, category: MoveCategory.PHYSICAL }),
  makeMove(10, "Scratch", { power: 40, pp: 35, type: Type.NORMAL, category: MoveCategory.PHYSICAL }),
  makeMove(11, "Vine Whip", { power: 45, pp: 25, type: Type.GRASS, category: MoveCategory.PHYSICAL }),
  makeMove(12, "Razor Leaf", { power: 55, pp: 25, hitratio: 95, type: Type.GRASS, category: MoveCategory.PHYSICAL }),
  makeMove(13, "Solar Beam", { power: 120, pp: 10, type: Type.GRASS, category: MoveCategory.SPECIAL }),
  makeMove(14, "Ember", { power: 40, pp: 25, type: Type.FIRE, category: MoveCategory.SPECIAL }),
  makeMove(15, "Flamethrower", { power: 90, pp: 15, type: Type.FIRE, category: MoveCategory.SPECIAL }),
  makeMove(16, "Water Gun", { power: 40, pp: 25, type: Type.WATER, category: MoveCategory.SPECIAL }),
  makeMove(17, "Hydro Pump", { power: 110, pp: 5, hitratio: 80, type: Type.WATER, category: MoveCategory.SPECIAL }),
  makeMove(18, "Surf", { power: 90, pp: 15, type: Type.WATER, category: MoveCategory.SPECIAL }),
  makeMove(19, "Tackle", { power: 40, pp: 35, type: Type.NORMAL, category: MoveCategory.PHYSICAL }),
  makeMove(20, "Body Slam", { power: 85, pp: 15, type: Type.NORMAL, category: MoveCategory.PHYSICAL }),
];

// ---------------------------------------------------------------------------
// MockRomHandler with realistic data
// ---------------------------------------------------------------------------

function createMockRomHandler(): RomHandler & Record<string, ReturnType<typeof vi.fn>> {
  const pokemonList: (Pokemon | null)[] = [null, ...pokemonData];

  const trainers: Trainer[] = [];
  for (let i = 0; i < 5; i++) {
    const t = new Trainer();
    t.index = i + 1;
    t.name = ["Brock", "Misty", "Lt. Surge", "Erika", "Koga"][i];
    t.trainerclass = i + 1;
    const pokemonCount = 2 + i; // 2-6 pokemon each
    t.pokemon = [];
    for (let j = 0; j < pokemonCount && j < pokemonData.length; j++) {
      const tp = new TrainerPokemon();
      tp.pokemon = pokemonData[(i + j) % pokemonData.length];
      tp.level = 10 + i * 5 + j * 2;
      t.pokemon.push(tp);
    }
    trainers.push(t);
  }

  const encounterSets: EncounterSet[] = [];
  for (let i = 0; i < 3; i++) {
    const es = new EncounterSet();
    es.rate = 10 + i * 5;
    es.displayName = `Route ${i + 1}`;
    es.encounters = [];
    for (let j = 0; j < 4; j++) {
      const enc = new Encounter();
      enc.pokemon = pokemonData[(i * 4 + j) % pokemonData.length];
      enc.level = 3 + i * 3 + j;
      es.encounters.push(enc);
    }
    encounterSets.push(es);
  }

  const staticEncounters: StaticEncounter[] = [
    (() => { const se = new StaticEncounter(pokemonData[2]); se.level = 50; return se; })(),
    (() => { const se = new StaticEncounter(pokemonData[5]); se.level = 50; return se; })(),
    (() => { const se = new StaticEncounter(pokemonData[8]); se.level = 50; return se; })(),
  ];

  const trades: IngameTrade[] = [
    (() => {
      const t = new IngameTrade();
      t.id = 1;
      t.requestedPokemon = pokemonData[0];
      t.givenPokemon = pokemonData[3];
      t.nickname = "CHARLIE";
      t.otName = "OAK";
      return t;
    })(),
  ];

  return {
    // Basic load/save
    loadRom: vi.fn(() => true),
    saveRomFile: vi.fn(() => true),
    saveRomDirectory: vi.fn(() => true),
    loadedFilename: vi.fn(() => "test.gba"),

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
    getPokemon: vi.fn(() => [...pokemonList]),
    getPokemonInclFormes: vi.fn(() => [...pokemonList]),
    getAltFormes: vi.fn(() => []),
    getMegaEvolutions: vi.fn(() => []),
    getAltFormeOfPokemon: vi.fn(() => pokemonData[0]),
    getIrregularFormes: vi.fn(() => []),

    // Gen Restrictions
    setPokemonPool: vi.fn(),
    removeEvosForPokemonPool: vi.fn(),

    // Starter Pokemon
    getStarters: vi.fn(() => [pokemonData[0], pokemonData[3], pokemonData[6]]),
    setStarters: vi.fn(() => true),
    hasStarterAltFormes: vi.fn(() => false),
    starterCount: vi.fn(() => 3),
    customStarters: vi.fn(),
    randomizeStarters: vi.fn(),
    randomizeBasicTwoEvosStarters: vi.fn(),
    getPickedStarters: vi.fn(() => [pokemonData[0], pokemonData[3], pokemonData[6]]),
    supportsStarterHeldItems: vi.fn(() => true),
    getStarterHeldItems: vi.fn(() => [0, 0, 0]),
    setStarterHeldItems: vi.fn(),
    randomizeStarterHeldItems: vi.fn(),

    // Pokemon Base Statistics
    shufflePokemonStats: vi.fn(),
    randomizePokemonStats: vi.fn(),
    updatePokemonStats: vi.fn(),
    getUpdatedPokemonStats: vi.fn(() => new Map()),
    standardizeEXPCurves: vi.fn(),

    // Random Pokemon selection
    randomPokemon: vi.fn(() => pokemonData[0]),
    randomPokemonInclFormes: vi.fn(() => pokemonData[0]),
    randomNonLegendaryPokemon: vi.fn(() => pokemonData[0]),
    randomLegendaryPokemon: vi.fn(() => pokemonData[0]),
    random2EvosPokemon: vi.fn(() => pokemonData[0]),

    // Pokemon Types
    randomType: vi.fn(() => Type.NORMAL),
    typeInGame: vi.fn(() => true),
    randomizePokemonTypes: vi.fn(),

    // Pokemon Abilities
    abilitiesPerPokemon: vi.fn(() => 3),
    highestAbilityIndex: vi.fn(() => 191),
    abilityName: vi.fn((n: number) => `Ability${n}`),
    randomizeAbilities: vi.fn(),
    getAbilityVariations: vi.fn(() => new Map()),
    getUselessAbilities: vi.fn(() => []),
    getAbilityForTrainerPokemon: vi.fn(() => 1),
    hasMegaEvolutions: vi.fn(() => false),

    // Wild Pokemon
    getEncounters: vi.fn(() => encounterSets),
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
    getTrainers: vi.fn(() => trainers),
    getMainPlaythroughTrainers: vi.fn(() => [1, 2, 3]),
    getEliteFourTrainers: vi.fn(() => [4, 5]),
    setTrainers: vi.fn(),
    randomizeTrainerPokes: vi.fn(),
    randomizeTrainerHeldItems: vi.fn(),
    getSensibleHeldItemsFor: vi.fn(() => [1, 2, 3]),
    getAllConsumableHeldItems: vi.fn(() => [1, 2, 3]),
    getAllHeldItems: vi.fn(() => [1, 2, 3, 4, 5]),
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
    getMoves: vi.fn(() => [...moveData]),

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
    getStaticPokemon: vi.fn(() => [...staticEncounters]),
    setStaticPokemon: vi.fn(() => true),
    randomizeStaticPokemon: vi.fn(),
    canChangeStaticPokemon: vi.fn(() => true),
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
    getTMMoves: vi.fn(() => [1, 2, 3, 4, 5]),
    getHMMoves: vi.fn(() => [18]),
    setTMMoves: vi.fn(),
    randomizeTMMoves: vi.fn(),
    getTMCount: vi.fn(() => 5),
    getHMCount: vi.fn(() => 1),
    getTMHMCompatibility: vi.fn(() => new Map()),
    setTMHMCompatibility: vi.fn(),
    randomizeTMHMCompatibility: vi.fn(),
    fullTMHMCompatibility: vi.fn(),
    ensureTMCompatSanity: vi.fn(),
    ensureTMEvolutionSanity: vi.fn(),
    fullHMCompatibility: vi.fn(),

    // Move Tutors
    copyTMCompatibilityToCosmeticFormes: vi.fn(),
    hasMoveTutors: vi.fn(() => true),
    getMoveTutorMoves: vi.fn(() => [7, 8, 9]),
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
    canChangeTrainerText: vi.fn(() => true),
    getTrainerNames: vi.fn(() => ["Brock", "Misty", "Lt. Surge", "Erika", "Koga"]),
    setTrainerNames: vi.fn(),
    trainerNameMode: vi.fn(() => TrainerNameMode.SAME_LENGTH),
    maxTrainerNameLength: vi.fn(() => 10),
    maxSumOfTrainerNameLengths: vi.fn(() => 200),
    getTCNameLengthsByTrainer: vi.fn(() => [5, 5, 9, 5, 4]),
    randomizeTrainerNames: vi.fn(),

    // Trainer Classes
    getTrainerClassNames: vi.fn(() => ["Leader", "Trainer", "Rival"]),
    setTrainerClassNames: vi.fn(),
    fixedTrainerClassNamesLength: vi.fn(() => false),
    maxTrainerClassNameLength: vi.fn(() => 12),
    randomizeTrainerClassNames: vi.fn(),
    getDoublesTrainerClasses: vi.fn(() => []),

    // Items
    getAllowedItems: vi.fn(() => ({ isTM: () => false, isAllowed: () => true })),
    getNonBadItems: vi.fn(() => ({ isTM: () => false, isAllowed: () => true })),
    getEvolutionItems: vi.fn(() => []),
    getXItems: vi.fn(() => []),
    getUniqueNoSellItems: vi.fn(() => []),
    getRegularShopItems: vi.fn(() => [1, 2, 3]),
    getOPShopItems: vi.fn(() => []),
    getItemNames: vi.fn(() => ["", "Potion", "Super Potion", "Poke Ball"]),

    // Field Items
    getRequiredFieldTMs: vi.fn(() => []),
    getCurrentFieldTMs: vi.fn(() => []),
    setFieldTMs: vi.fn(),
    getRegularFieldItems: vi.fn(() => [1, 2]),
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
    getIngameTrades: vi.fn(() => trades),
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
    getFieldMoves: vi.fn(() => [18]),
    getEarlyRequiredHMMoves: vi.fn(() => []),

    // Misc
    isYellow: vi.fn(() => false),
    getROMName: vi.fn(() => "Pokemon FireRed"),
    getROMCode: vi.fn(() => "BPRE"),
    getSupportLevel: vi.fn(() => "Full"),
    getDefaultExtension: vi.fn(() => ".gba"),
    internalStringLength: vi.fn((s: string) => s.length),
    randomizeIntroPokemon: vi.fn(),
    getMascotImage: vi.fn(() => null),
    generationOfPokemon: vi.fn(() => 3),
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
  } as unknown as RomHandler & Record<string, ReturnType<typeof vi.fn>>;
}

// ===========================================================================
// Test suites
// ===========================================================================

describe("Integration: Full pipeline with MockRomHandler", () => {
  let mock: RomHandler & Record<string, ReturnType<typeof vi.fn>>;
  const seed = 42n;

  beforeEach(() => {
    mock = createMockRomHandler();
    RandomSource.reset();
  });

  it("runs the full pipeline with many randomization flags enabled", () => {
    const settings = new Settings();
    settings.baseStatisticsMod = BaseStatisticsMod.RANDOM;
    settings.abilitiesMod = AbilitiesMod.RANDOMIZE;
    settings.typesMod = TypesMod.COMPLETELY_RANDOM;
    settings.startersMod = StartersMod.COMPLETELY_RANDOM;
    settings.evolutionsMod = EvolutionsMod.RANDOM;
    settings.randomizeMovePowers = true;
    settings.randomizeMoveAccuracies = true;
    settings.randomizeMovePPs = true;
    settings.randomizeMoveTypes = true;
    settings.randomizeMoveCategory = true;
    settings.movesetsMod = MovesetsMod.COMPLETELY_RANDOM;
    settings.trainersMod = TrainersMod.RANDOM;
    settings.wildPokemonMod = WildPokemonMod.RANDOM;
    settings.tmsMod = TMsMod.RANDOM;
    settings.tmsHmsCompatibilityMod = TMsHMsCompatibilityMod.COMPLETELY_RANDOM;
    settings.inGameTradesMod = InGameTradesMod.RANDOMIZE_GIVEN_AND_REQUESTED;
    settings.fieldItemsMod = FieldItemsMod.RANDOM;
    settings.randomizeTrainerNames = true;
    settings.randomizeTrainerClassNames = true;
    settings.changeImpossibleEvolutions = true;
    settings.makeEvolutionsEasier = true;

    const randomizer = new Randomizer(settings, mock);
    const log = new StringLogStream();
    const checkValue = randomizer.randomize("output.gba", log, seed);

    expect(typeof checkValue).toBe("number");

    // Verify core infrastructure was called
    expect(mock.setPokemonPool).toHaveBeenCalledWith(settings);
    expect(mock.writeCheckValueToROM).toHaveBeenCalledWith(checkValue);
    expect(mock.saveRomFile).toHaveBeenCalledWith("output.gba", Number(seed));
    expect(mock.randomizeIntroPokemon).toHaveBeenCalled();

    // Verify randomization methods were called
    expect(mock.randomizeMovePowers).toHaveBeenCalled();
    expect(mock.randomizeMoveAccuracies).toHaveBeenCalled();
    expect(mock.randomizeMovePPs).toHaveBeenCalled();
    expect(mock.randomizeMoveTypes).toHaveBeenCalled();
    expect(mock.randomizeMoveCategory).toHaveBeenCalled();
    expect(mock.randomizePokemonTypes).toHaveBeenCalledWith(settings);
    expect(mock.randomizePokemonStats).toHaveBeenCalledWith(settings);
    expect(mock.randomizeAbilities).toHaveBeenCalledWith(settings);
    expect(mock.randomizeEvolutions).toHaveBeenCalledWith(settings);
    expect(mock.removeImpossibleEvolutions).toHaveBeenCalledWith(settings);
    expect(mock.condenseLevelEvolutions).toHaveBeenCalledWith(40, 30);
    expect(mock.makeEvolutionsEasier).toHaveBeenCalledWith(settings);
    expect(mock.randomizeStarters).toHaveBeenCalledWith(settings);
    expect(mock.randomizeMovesLearnt).toHaveBeenCalledWith(settings);
    expect(mock.randomizeEggMoves).toHaveBeenCalledWith(settings);
    expect(mock.randomizeTMMoves).toHaveBeenCalledWith(settings);
    expect(mock.randomizeTMHMCompatibility).toHaveBeenCalledWith(settings);
    expect(mock.randomizeTrainerPokes).toHaveBeenCalledWith(settings);
    expect(mock.randomizeTrainerNames).toHaveBeenCalledWith(settings);
    expect(mock.randomizeTrainerClassNames).toHaveBeenCalledWith(settings);
    expect(mock.randomEncounters).toHaveBeenCalledWith(settings);
    expect(mock.randomizeIngameTrades).toHaveBeenCalledWith(settings);
    expect(mock.randomizeFieldItems).toHaveBeenCalledWith(settings);

    // Verify log output has expected content
    const output = log.getOutput();
    expect(output).toContain("Randomizer Version:");
    expect(output).toContain("Random Seed: 42");
    expect(output).toContain("Randomization of Pokemon FireRed completed.");
  });

  it("calls methods in the correct pipeline order", () => {
    const settings = new Settings();
    settings.randomizeMovePowers = true;
    settings.typesMod = TypesMod.COMPLETELY_RANDOM;
    settings.evolutionsMod = EvolutionsMod.RANDOM;
    settings.baseStatisticsMod = BaseStatisticsMod.RANDOM;
    settings.abilitiesMod = AbilitiesMod.RANDOMIZE;
    settings.startersMod = StartersMod.COMPLETELY_RANDOM;
    settings.movesetsMod = MovesetsMod.COMPLETELY_RANDOM;
    settings.tmsMod = TMsMod.RANDOM;
    settings.trainersMod = TrainersMod.RANDOM;
    settings.wildPokemonMod = WildPokemonMod.RANDOM;

    const callOrder: string[] = [];
    const trackCall = (name: string) => vi.fn(() => { callOrder.push(name); });

    mock.setPokemonPool = trackCall("setPokemonPool");
    mock.randomizeMovePowers = trackCall("randomizeMovePowers");
    mock.randomizePokemonTypes = trackCall("randomizePokemonTypes");
    mock.randomizeEvolutions = trackCall("randomizeEvolutions");
    mock.randomizePokemonStats = trackCall("randomizePokemonStats");
    mock.randomizeAbilities = trackCall("randomizeAbilities");
    mock.randomizeStarters = trackCall("randomizeStarters");
    mock.randomizeMovesLearnt = trackCall("randomizeMovesLearnt");
    mock.randomizeTMMoves = trackCall("randomizeTMMoves");
    mock.randomizeTrainerPokes = trackCall("randomizeTrainerPokes");
    mock.randomEncounters = trackCall("randomEncounters");
    mock.saveRomFile = vi.fn(() => { callOrder.push("saveRomFile"); return true; });

    const randomizer = new Randomizer(settings, mock);
    const log = new StringLogStream();
    randomizer.randomize("output.gba", log, seed);

    // Verify the established pipeline ordering from randomizer.ts
    const indexOf = (name: string) => callOrder.indexOf(name);
    expect(indexOf("setPokemonPool")).toBeLessThan(indexOf("randomizeMovePowers"));
    expect(indexOf("randomizeMovePowers")).toBeLessThan(indexOf("randomizePokemonTypes"));
    expect(indexOf("randomizePokemonTypes")).toBeLessThan(indexOf("randomizeEvolutions"));
    expect(indexOf("randomizeEvolutions")).toBeLessThan(indexOf("randomizePokemonStats"));
    expect(indexOf("randomizePokemonStats")).toBeLessThan(indexOf("randomizeAbilities"));
    expect(indexOf("randomizeAbilities")).toBeLessThan(indexOf("randomizeStarters"));
    expect(indexOf("randomizeStarters")).toBeLessThan(indexOf("randomizeMovesLearnt"));
    expect(indexOf("randomizeMovesLearnt")).toBeLessThan(indexOf("randomizeTMMoves"));
    expect(indexOf("randomizeTMMoves")).toBeLessThan(indexOf("randomizeTrainerPokes"));
    expect(indexOf("randomizeTrainerPokes")).toBeLessThan(indexOf("randomEncounters"));
    expect(indexOf("randomEncounters")).toBeLessThan(indexOf("saveRomFile"));
  });

  it("does not call randomization methods when settings are all default", () => {
    const settings = new Settings();
    const randomizer = new Randomizer(settings, mock);
    const log = new StringLogStream();
    randomizer.randomize("output.gba", log, seed);

    expect(mock.randomizePokemonStats).not.toHaveBeenCalled();
    expect(mock.shufflePokemonStats).not.toHaveBeenCalled();
    expect(mock.randomizeAbilities).not.toHaveBeenCalled();
    expect(mock.randomizePokemonTypes).not.toHaveBeenCalled();
    expect(mock.randomizeMovePowers).not.toHaveBeenCalled();
    expect(mock.randomizeStarters).not.toHaveBeenCalled();
    expect(mock.randomizeTrainerPokes).not.toHaveBeenCalled();
    expect(mock.randomEncounters).not.toHaveBeenCalled();
    expect(mock.randomizeEvolutions).not.toHaveBeenCalled();
    expect(mock.randomizeTMMoves).not.toHaveBeenCalled();
    expect(mock.randomizeIngameTrades).not.toHaveBeenCalled();
    expect(mock.randomizeMovesLearnt).not.toHaveBeenCalled();
  });
});

describe("Integration: Seed determinism", () => {
  const seed = 77777n;

  beforeEach(() => {
    RandomSource.reset();
  });

  it("produces identical results from two runs with the same seed and settings", () => {
    const settings = new Settings();
    settings.baseStatisticsMod = BaseStatisticsMod.RANDOM;
    settings.randomizeMovePowers = true;
    settings.trainersMod = TrainersMod.RANDOM;
    settings.wildPokemonMod = WildPokemonMod.RANDOM;
    settings.startersMod = StartersMod.COMPLETELY_RANDOM;

    // First run
    const mock1 = createMockRomHandler();
    const randomizer1 = new Randomizer(settings, mock1);
    const log1 = new StringLogStream();
    const checkValue1 = randomizer1.randomize("output.gba", log1, seed);

    // Second run with same seed
    const mock2 = createMockRomHandler();
    const randomizer2 = new Randomizer(settings, mock2);
    const log2 = new StringLogStream();
    const checkValue2 = randomizer2.randomize("output.gba", log2, seed);

    // Check values must be identical
    expect(checkValue1).toBe(checkValue2);

    // Log output must be identical (excluding timing which can vary)
    const stripTiming = (s: string) => s.replace(/Time elapsed: \d+ms/g, "Time elapsed: Xms");
    expect(stripTiming(log1.getOutput())).toBe(stripTiming(log2.getOutput()));

    // Same methods must have been called the same number of times
    expect(mock1.randomizeMovePowers).toHaveBeenCalledTimes(1);
    expect(mock2.randomizeMovePowers).toHaveBeenCalledTimes(1);
    expect(mock1.randomizePokemonStats).toHaveBeenCalledTimes(1);
    expect(mock2.randomizePokemonStats).toHaveBeenCalledTimes(1);
    expect(mock1.randomizeTrainerPokes).toHaveBeenCalledTimes(1);
    expect(mock2.randomizeTrainerPokes).toHaveBeenCalledTimes(1);
    expect(mock1.randomEncounters).toHaveBeenCalledTimes(1);
    expect(mock2.randomEncounters).toHaveBeenCalledTimes(1);
    expect(mock1.randomizeStarters).toHaveBeenCalledTimes(1);
    expect(mock2.randomizeStarters).toHaveBeenCalledTimes(1);
  });

  it("produces different log output with different seeds", () => {
    const settings = new Settings();

    const mock1 = createMockRomHandler();
    const randomizer1 = new Randomizer(settings, mock1);
    const log1 = new StringLogStream();
    randomizer1.randomize("output.gba", log1, 111n);

    const mock2 = createMockRomHandler();
    const randomizer2 = new Randomizer(settings, mock2);
    const log2 = new StringLogStream();
    randomizer2.randomize("output.gba", log2, 222n);

    expect(log1.getOutput()).toContain("Random Seed: 111");
    expect(log2.getOutput()).toContain("Random Seed: 222");
    expect(log1.getOutput()).not.toBe(log2.getOutput());
  });
});

describe("Integration: Settings round-trip serialization", () => {
  beforeEach(() => {
    RandomSource.reset();
  });

  it("serializes and deserializes Settings, producing same randomization results", () => {
    const original = new Settings();
    original.baseStatisticsMod = BaseStatisticsMod.RANDOM;
    original.abilitiesMod = AbilitiesMod.RANDOMIZE;
    original.typesMod = TypesMod.COMPLETELY_RANDOM;
    original.startersMod = StartersMod.COMPLETELY_RANDOM;
    original.evolutionsMod = EvolutionsMod.RANDOM;
    original.randomizeMovePowers = true;
    original.randomizeMoveAccuracies = true;
    original.trainersMod = TrainersMod.RANDOM;
    original.wildPokemonMod = WildPokemonMod.RANDOM;
    original.changeImpossibleEvolutions = true;
    original.makeEvolutionsEasier = true;

    // Serialize to Base64 string
    const settingsString = original.toString();
    expect(settingsString.length).toBeGreaterThan(0);

    // Deserialize from Base64 string
    const restored = Settings.fromString(settingsString);

    // Verify key settings survived the round-trip
    expect(restored.baseStatisticsMod).toBe(BaseStatisticsMod.RANDOM);
    expect(restored.abilitiesMod).toBe(AbilitiesMod.RANDOMIZE);
    expect(restored.typesMod).toBe(TypesMod.COMPLETELY_RANDOM);
    expect(restored.startersMod).toBe(StartersMod.COMPLETELY_RANDOM);
    expect(restored.evolutionsMod).toBe(EvolutionsMod.RANDOM);
    expect(restored.randomizeMovePowers).toBe(true);
    expect(restored.randomizeMoveAccuracies).toBe(true);
    expect(restored.trainersMod).toBe(TrainersMod.RANDOM);
    expect(restored.wildPokemonMod).toBe(WildPokemonMod.RANDOM);
    expect(restored.changeImpossibleEvolutions).toBe(true);
    expect(restored.makeEvolutionsEasier).toBe(true);

    // Run randomizer with both settings and compare results
    const seed = 54321n;

    const mock1 = createMockRomHandler();
    const randomizer1 = new Randomizer(original, mock1);
    const log1 = new StringLogStream();
    const checkValue1 = randomizer1.randomize("output.gba", log1, seed);

    const mock2 = createMockRomHandler();
    const randomizer2 = new Randomizer(restored, mock2);
    const log2 = new StringLogStream();
    const checkValue2 = randomizer2.randomize("output.gba", log2, seed);

    expect(checkValue1).toBe(checkValue2);
    const stripTiming = (s: string) => s.replace(/Time elapsed: \d+ms/g, "Time elapsed: Xms");
    expect(stripTiming(log1.getOutput())).toBe(stripTiming(log2.getOutput()));
  });

  it("round-trips settings with all defaults correctly", () => {
    const original = new Settings();
    const settingsString = original.toString();
    const restored = Settings.fromString(settingsString);

    expect(restored.baseStatisticsMod).toBe(BaseStatisticsMod.UNCHANGED);
    expect(restored.abilitiesMod).toBe(AbilitiesMod.UNCHANGED);
    expect(restored.typesMod).toBe(TypesMod.UNCHANGED);
    expect(restored.startersMod).toBe(StartersMod.UNCHANGED);
    expect(restored.randomizeMovePowers).toBe(false);
    expect(restored.trainersMod).toBe(TrainersMod.UNCHANGED);
    expect(restored.wildPokemonMod).toBe(WildPokemonMod.UNCHANGED);
  });
});

describe("Integration: Factory ROM detection", () => {
  it("selects the correct factory based on ROM signature via isLoadable", () => {
    // Create mock factories that identify specific ROM types
    class GBAFactory extends RomHandlerFactory {
      createWithLog(random: RandomInstance, log: LogStream | null): RomHandler {
        return createMockRomHandler();
      }
      isLoadable(filename: string): boolean {
        return filename.endsWith(".gba");
      }
    }

    class NDSFactory extends RomHandlerFactory {
      createWithLog(random: RandomInstance, log: LogStream | null): RomHandler {
        return createMockRomHandler();
      }
      isLoadable(filename: string): boolean {
        return filename.endsWith(".nds");
      }
    }

    class ThreeDSFactory extends RomHandlerFactory {
      createWithLog(random: RandomInstance, log: LogStream | null): RomHandler {
        return createMockRomHandler();
      }
      isLoadable(filename: string): boolean {
        return filename.endsWith(".3ds") || filename.endsWith(".cia");
      }
    }

    const factories = [new GBAFactory(), new NDSFactory(), new ThreeDSFactory()];

    function detectFactory(filename: string): RomHandlerFactory | null {
      return factories.find((f) => f.isLoadable(filename)) ?? null;
    }

    // GBA ROM detection
    const gbaFactory = detectFactory("pokemon_firered.gba");
    expect(gbaFactory).toBeInstanceOf(GBAFactory);

    // NDS ROM detection
    const ndsFactory = detectFactory("pokemon_heartgold.nds");
    expect(ndsFactory).toBeInstanceOf(NDSFactory);

    // 3DS ROM detection
    const threeDSFactory = detectFactory("pokemon_xy.3ds");
    expect(threeDSFactory).toBeInstanceOf(ThreeDSFactory);
    const ciaFactory = detectFactory("pokemon_sun.cia");
    expect(ciaFactory).toBeInstanceOf(ThreeDSFactory);

    // Unknown ROM type
    const unknownFactory = detectFactory("something.zip");
    expect(unknownFactory).toBeNull();
  });

  it("factory.create delegates to createWithLog with null log", () => {
    let receivedLog: LogStream | null = undefined as unknown as LogStream | null;

    class TestFactory extends RomHandlerFactory {
      createWithLog(random: RandomInstance, log: LogStream | null): RomHandler {
        receivedLog = log;
        return createMockRomHandler();
      }
      isLoadable(_filename: string): boolean {
        return true;
      }
    }

    const factory = new TestFactory();
    const random = new JavaRandom(123n);
    factory.create(random);

    expect(receivedLog).toBeNull();
  });
});

describe("Integration: RandomSource determinism", () => {
  it("JavaRandom with a fixed seed produces deterministic sequence", () => {
    const rng1 = new JavaRandom(12345n);
    const rng2 = new JavaRandom(12345n);

    const sequence1: number[] = [];
    const sequence2: number[] = [];

    for (let i = 0; i < 50; i++) {
      sequence1.push(rng1.nextInt(256));
      sequence2.push(rng2.nextInt(256));
    }

    expect(sequence1).toEqual(sequence2);
  });

  it("RandomSource.seed produces deterministic nextInt calls", () => {
    RandomSource.seed(99999n);
    const values1: number[] = [];
    for (let i = 0; i < 20; i++) {
      values1.push(RandomSource.nextInt(100));
    }

    RandomSource.seed(99999n);
    const values2: number[] = [];
    for (let i = 0; i < 20; i++) {
      values2.push(RandomSource.nextInt(100));
    }

    expect(values1).toEqual(values2);
    expect(values1.length).toBe(20);
    // Verify values are within range
    for (const v of values1) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(100);
    }
  });

  it("RandomSource.seed resets call counter", () => {
    RandomSource.seed(42n);
    RandomSource.nextInt(10);
    RandomSource.nextInt(10);
    RandomSource.nextInt(10);
    expect(RandomSource.callsSinceSeed()).toBe(3);

    RandomSource.seed(42n);
    expect(RandomSource.callsSinceSeed()).toBe(0);
  });

  it("deterministic stat-like randomization via JavaRandom", () => {
    // Simulate stat randomization: for each of 10 Pokemon, generate 6 stats
    const seed = 55555n;

    function randomizeStats(pokemonCount: number): number[][] {
      const rng = new JavaRandom(seed);
      const results: number[][] = [];
      for (let i = 0; i < pokemonCount; i++) {
        const stats: number[] = [];
        for (let s = 0; s < 6; s++) {
          // Simulate base stat randomization: random value between 20-255
          stats.push(20 + rng.nextInt(236));
        }
        results.push(stats);
      }
      return results;
    }

    const run1 = randomizeStats(10);
    const run2 = randomizeStats(10);

    expect(run1).toEqual(run2);
    expect(run1.length).toBe(10);
    for (const stats of run1) {
      expect(stats.length).toBe(6);
      for (const stat of stats) {
        expect(stat).toBeGreaterThanOrEqual(20);
        expect(stat).toBeLessThan(256);
      }
    }
  });

  it("different seeds produce different random sequences", () => {
    const rng1 = new JavaRandom(111n);
    const rng2 = new JavaRandom(222n);

    const seq1: number[] = [];
    const seq2: number[] = [];
    for (let i = 0; i < 20; i++) {
      seq1.push(rng1.nextInt(1000));
      seq2.push(rng2.nextInt(1000));
    }

    // Sequences should differ (statistically impossible for them to be equal)
    expect(seq1).not.toEqual(seq2);
  });

  it("JavaRandom nextDouble, nextBoolean, and nextFloat are deterministic", () => {
    const rng1 = new JavaRandom(42n);
    const rng2 = new JavaRandom(42n);

    for (let i = 0; i < 10; i++) {
      expect(rng1.nextDouble()).toBe(rng2.nextDouble());
      expect(rng1.nextBoolean()).toBe(rng2.nextBoolean());
      expect(rng1.nextFloat()).toBe(rng2.nextFloat());
    }
  });
});
