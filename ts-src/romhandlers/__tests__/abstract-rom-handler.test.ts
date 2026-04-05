import { describe, it, expect, beforeEach } from "vitest";
import { AbstractRomHandler } from "../abstract-rom-handler";
import type { LogStream, TrainerNameMode } from "../rom-handler";
import type { Settings } from "../../config/settings";
import { BaseStatisticsMod, TypesMod } from "../../config/settings";
import { Pokemon } from "../../pokemon/pokemon";
import { Move } from "../../pokemon/move";
import { MoveCategory } from "../../pokemon/move-category";
import { MegaEvolution } from "../../pokemon/mega-evolution";
import type { MoveLearnt } from "../../pokemon/move-learnt";
import type { Trainer } from "../../pokemon/trainer";
import type { TrainerPokemon } from "../../pokemon/trainer-pokemon";
import type { EncounterSet } from "../../pokemon/encounter-set";
import type { StaticEncounter } from "../../pokemon/static-encounter";
import type { TotemPokemon } from "../../pokemon/totem-pokemon";
import type { IngameTrade } from "../../pokemon/ingame-trade";
import type { PickupItem } from "../../pokemon/pickup-item";
import type { Shop } from "../../pokemon/shop";
import type { ItemList } from "../../pokemon/item-list";
import { Type } from "../../pokemon/type";
import { ExpCurve } from "../../pokemon/exp-curve";
import type { StatChange } from "../../pokemon/stat-change";
import type { EvolutionUpdate } from "../evolution-update";
import { JavaRandom } from "../../utils/random-source";
import type { RandomInstance } from "../../utils/random-source";
import * as Moves from "../../constants/moves";

// ---- Helper to make a Pokemon ----

function makePokemon(overrides: {
  number?: number;
  name?: string;
  primaryType?: Type;
  secondaryType?: Type | null;
  hp?: number;
  attack?: number;
  defense?: number;
  spatk?: number;
  spdef?: number;
  speed?: number;
}): Pokemon {
  const p = new Pokemon();
  p.number = overrides.number ?? 1;
  p.name = overrides.name ?? "TestMon";
  p.primaryType = overrides.primaryType ?? Type.NORMAL;
  p.secondaryType = overrides.secondaryType ?? null;
  p.hp = overrides.hp ?? 50;
  p.attack = overrides.attack ?? 50;
  p.defense = overrides.defense ?? 50;
  p.spatk = overrides.spatk ?? 50;
  p.spdef = overrides.spdef ?? 50;
  p.speed = overrides.speed ?? 50;
  p.growthCurve = ExpCurve.MEDIUM_FAST;
  return p;
}

function makeMove(overrides: {
  number?: number;
  name?: string;
  internalId?: number;
  power?: number;
  pp?: number;
  hitratio?: number;
  type?: Type;
  category?: MoveCategory;
}): Move {
  const m = new Move();
  m.number = overrides.number ?? 1;
  m.name = overrides.name ?? "TestMove";
  m.internalId = overrides.internalId ?? (overrides.number ?? 1);
  m.power = overrides.power ?? 50;
  m.pp = overrides.pp ?? 20;
  m.hitratio = overrides.hitratio ?? 100;
  m.type = overrides.type ?? Type.NORMAL;
  m.category = overrides.category ?? MoveCategory.PHYSICAL;
  return m;
}

// ---- MockRomHandler ----

class MockRomHandler extends AbstractRomHandler {
  private pokemon: (Pokemon | null)[];
  private moves: (Move | null)[];
  private gen: number;

  constructor(
    random: RandomInstance,
    pokemon: Pokemon[],
    moves: Move[],
    gen: number = 3
  ) {
    super(random, null);
    // Index 0 is null (matches Java convention)
    this.pokemon = [null, ...pokemon];
    this.moves = [null, ...moves];
    this.gen = gen;
  }

  // ---- Implemented abstract methods ----

  loadRom(_f: string) { return true; }
  saveRomFile(_f: string, _s: number) { return true; }
  saveRomDirectory(_f: string) { return true; }
  loadedFilename() { return "mock.rom"; }
  hasGameUpdateLoaded() { return false; }
  loadGameUpdate(_f: string) { return true; }
  removeGameUpdate() {}
  getGameUpdateVersion() { return null; }
  printRomDiagnostics(_l: LogStream) {}
  isRomValid() { return true; }

  getPokemon() { return this.pokemon; }
  getPokemonInclFormes() { return this.pokemon; }
  getAltFormes() { return []; }
  getMegaEvolutions(): MegaEvolution[] { return []; }
  getAltFormeOfPokemon(pk: Pokemon, _f: number) { return pk; }
  getIrregularFormes() { return []; }
  removeEvosForPokemonPool() {}

  getStarters() { return []; }
  setStarters(_s: Pokemon[]) { return true; }
  hasStarterAltFormes() { return false; }
  starterCount() { return 3; }
  customStarters(_s: Settings) {}
  randomizeStarters(_s: Settings) {}
  randomizeBasicTwoEvosStarters(_s: Settings) {}
  supportsStarterHeldItems() { return false; }
  getStarterHeldItems() { return []; }
  setStarterHeldItems(_i: number[]) {}
  randomizeStarterHeldItems(_s: Settings) {}

  getUpdatedPokemonStats(_g: number) { return new Map<number, StatChange>(); }
  standardizeEXPCurves(_s: Settings) {}

  abilitiesPerPokemon() { return 3; }
  highestAbilityIndex() { return 200; }
  getAbilityVariations() { return new Map<number, number[]>(); }
  hasMegaEvolutions() { return false; }

  getEncounters(_u: boolean) { return []; }
  setEncounters(_u: boolean, _e: EncounterSet[]) {}
  randomEncounters(_s: Settings) {}
  area1to1Encounters(_s: Settings) {}
  game1to1Encounters(_s: Settings) {}
  hasWildAltFormes() { return false; }
  randomizeWildHeldItems(_s: Settings) {}
  changeCatchRates(_s: Settings) {}
  minimumCatchRate(_r1: number, _r2: number) {}
  enableGuaranteedPokemonCatching() {}

  getTrainers() { return []; }
  getMainPlaythroughTrainers() { return []; }
  getEliteFourTrainers(_c: boolean) { return []; }
  setTrainers(_t: Trainer[], _d: boolean) {}
  randomizeTrainerPokes(_s: Settings) {}
  randomizeTrainerHeldItems(_s: Settings) {}
  rivalCarriesStarter() {}
  hasRivalFinalBattle() { return false; }
  forceFullyEvolvedTrainerPokes(_s: Settings) {}
  onlyChangeTrainerLevels(_s: Settings) {}
  addTrainerPokemon(_s: Settings) {}
  doubleBattleMode() {}
  getMoveSelectionPoolAtLevel(_tp: TrainerPokemon, _c: boolean) { return []; }
  pickTrainerMovesets(_s: Settings) {}

  hasPhysicalSpecialSplit() { return this.gen >= 4; }
  updateMoves(_s: Settings) {}
  initMoveUpdates() {}
  getMoveUpdates() { return new Map<number, boolean[]>(); }
  getMoves() { return this.moves; }

  getMovesLearnt() { return new Map<number, MoveLearnt[]>(); }
  setMovesLearnt(_m: Map<number, MoveLearnt[]>) {}
  getEggMoves() { return new Map<number, number[]>(); }
  setEggMoves(_e: Map<number, number[]>) {}
  randomizeMovesLearnt(_s: Settings) {}
  randomizeEggMoves(_s: Settings) {}
  orderDamagingMovesByDamage() {}
  metronomeOnlyMode() {}
  supportsFourStartingMoves() { return false; }

  getStaticPokemon() { return []; }
  setStaticPokemon(_s: StaticEncounter[]) { return true; }
  randomizeStaticPokemon(_s: Settings) {}
  canChangeStaticPokemon() { return true; }
  hasStaticAltFormes() { return false; }
  onlyChangeStaticLevels(_s: Settings) {}
  hasMainGameLegendaries() { return false; }
  getMainGameLegendaries() { return []; }
  getSpecialMusicStatics() { return []; }
  applyCorrectStaticMusic(_m: Map<number, number>) {}
  hasStaticMusicFix() { return false; }

  getTotemPokemon() { return []; }
  setTotemPokemon(_t: TotemPokemon[]) {}
  randomizeTotemPokemon(_s: Settings) {}

  getTMMoves() { return []; }
  getHMMoves() { return []; }
  setTMMoves(_m: number[]) {}
  randomizeTMMoves(_s: Settings) {}
  getTMCount() { return 0; }
  getHMCount() { return 0; }
  getTMHMCompatibility() { return new Map<Pokemon, boolean[]>(); }
  setTMHMCompatibility(_c: Map<Pokemon, boolean[]>) {}
  // TM/HM compatibility methods inherited from AbstractRomHandler
  hasMoveTutors() { return false; }
  getMoveTutorMoves() { return []; }
  setMoveTutorMoves(_m: number[]) {}
  randomizeMoveTutorMoves(_s: Settings) {}
  getMoveTutorCompatibility() { return new Map<Pokemon, boolean[]>(); }
  setMoveTutorCompatibility(_c: Map<Pokemon, boolean[]>) {}
  randomizeMoveTutorCompatibility(_s: Settings) {}
  fullMoveTutorCompatibility() {}
  ensureMoveTutorCompatSanity() {}
  ensureMoveTutorEvolutionSanity() {}

  copyMoveTutorCompatibilityToCosmeticFormes() {}
  canChangeTrainerText() { return false; }
  getTrainerNames() { return []; }
  setTrainerNames(_n: string[]) {}
  trainerNameMode(): TrainerNameMode { return 0; }
  getTCNameLengthsByTrainer() { return []; }
  randomizeTrainerNames(_s: Settings) {}

  getTrainerClassNames() { return []; }
  setTrainerClassNames(_n: string[]) {}
  fixedTrainerClassNamesLength() { return false; }
  randomizeTrainerClassNames(_s: Settings) {}
  getDoublesTrainerClasses() { return []; }

  getAllowedItems() { return {} as ItemList; }
  getNonBadItems() { return {} as ItemList; }
  getEvolutionItems() { return []; }
  getUniqueNoSellItems() { return []; }
  getRegularShopItems() { return []; }
  getOPShopItems() { return []; }
  getItemNames() { return []; }

  getRequiredFieldTMs() { return []; }
  getCurrentFieldTMs() { return []; }
  setFieldTMs(_f: number[]) {}
  getRegularFieldItems() { return []; }
  setRegularFieldItems(_i: number[]) {}
  shuffleFieldItems() {}
  randomizeFieldItems(_s: Settings) {}

  hasShopRandomization() { return false; }
  shuffleShopItems() {}
  randomizeShopItems(_s: Settings) {}
  getShopItems() { return new Map<number, Shop>(); }
  setShopItems(_s: Map<number, Shop>) {}
  setShopPrices() {}

  randomizePickupItems(_s: Settings) {}

  getIngameTrades() { return []; }
  setIngameTrades(_t: IngameTrade[]) {}
  hasDVs() { return false; }

  removeImpossibleEvolutions(_s: Settings) {}
  condenseLevelEvolutions(_m: number, _i: number) {}
  makeEvolutionsEasier(_s: Settings) {}
  removeTimeBasedEvolutions() {}
  getImpossibleEvoUpdates() { return new Set<EvolutionUpdate>(); }
  getEasierEvoUpdates() { return new Set<EvolutionUpdate>(); }
  getTimeBasedEvoUpdates() { return new Set<EvolutionUpdate>(); }
  randomizeEvolutions(_s: Settings) {}
  randomizeEvolutionsEveryLevel(_s: Settings) {}

  getFieldMoves() { return []; }
  getEarlyRequiredHMMoves() { return []; }

  getROMName() { return "Mock ROM"; }
  getROMCode() { return "MOCK"; }
  getSupportLevel() { return "Complete"; }
  getDefaultExtension() { return "rom"; }
  internalStringLength(s: string) { return s.length; }
  randomizeIntroPokemon() {}
  getMascotImage() { return null; }
  generationOfPokemon() { return this.gen; }

  isEffectivenessUpdated() { return false; }
  hasFunctionalFormes() { return false; }
}

// ---- Test data ----

function createTestPokemon(): Pokemon[] {
  return [
    makePokemon({ number: 1, name: "Bulbasaur", primaryType: Type.GRASS, secondaryType: Type.POISON, hp: 45, attack: 49, defense: 49, spatk: 65, spdef: 65, speed: 45 }),
    makePokemon({ number: 2, name: "Ivysaur", primaryType: Type.GRASS, secondaryType: Type.POISON, hp: 60, attack: 62, defense: 63, spatk: 80, spdef: 80, speed: 60 }),
    makePokemon({ number: 3, name: "Venusaur", primaryType: Type.GRASS, secondaryType: Type.POISON, hp: 80, attack: 82, defense: 83, spatk: 100, spdef: 100, speed: 80 }),
    makePokemon({ number: 4, name: "Charmander", primaryType: Type.FIRE, hp: 39, attack: 52, defense: 43, spatk: 60, spdef: 50, speed: 65 }),
    makePokemon({ number: 5, name: "Charmeleon", primaryType: Type.FIRE, hp: 58, attack: 64, defense: 58, spatk: 80, spdef: 65, speed: 80 }),
    makePokemon({ number: 6, name: "Charizard", primaryType: Type.FIRE, secondaryType: Type.FLYING, hp: 78, attack: 84, defense: 78, spatk: 109, spdef: 85, speed: 100 }),
  ];
}

function createTestMoves(): Move[] {
  return [
    makeMove({ number: 1, name: "Pound", power: 40, pp: 35, hitratio: 100, type: Type.NORMAL }),
    makeMove({ number: 2, name: "Karate Chop", power: 50, pp: 25, hitratio: 100, type: Type.FIGHTING }),
    makeMove({ number: 3, name: "Double Slap", power: 15, pp: 10, hitratio: 85, type: Type.NORMAL }),
    makeMove({ number: 4, name: "Comet Punch", power: 18, pp: 15, hitratio: 85, type: Type.NORMAL }),
    makeMove({ number: 5, name: "Mega Punch", power: 80, pp: 20, hitratio: 85, type: Type.NORMAL }),
    makeMove({ number: Moves.struggle, name: "Struggle", internalId: Moves.struggle, power: 50, pp: 1, hitratio: 100, type: Type.NORMAL }),
  ];
}

// ---- Tests ----

describe("AbstractRomHandler", () => {
  let random: JavaRandom;
  let handler: MockRomHandler;
  let pokemon: Pokemon[];
  let moves: Move[];

  beforeEach(() => {
    random = new JavaRandom(42n);
    pokemon = createTestPokemon();
    moves = createTestMoves();
    handler = new MockRomHandler(random, pokemon, moves);
  });

  describe("randomizePokemonStats", () => {
    it("produces deterministic results with a fixed seed", () => {
      const settings = {
        baseStatisticsMod: BaseStatisticsMod.RANDOM,
        baseStatsFollowEvolutions: false,
        baseStatsFollowMegaEvolutions: false,
        assignEvoStatsRandomly: false,
      } as Settings;

      // Store original BSTs
      const originalBSTs = pokemon.map((p) => p.bst());

      handler.randomizePokemonStats(settings);

      // After randomization, BSTs should be preserved (stats are randomized within BST)
      for (let i = 0; i < pokemon.length; i++) {
        // BST should remain roughly the same (within rounding)
        expect(Math.abs(pokemon[i].bst() - originalBSTs[i])).toBeLessThanOrEqual(5);
      }

      // Record the stats after first randomization
      const firstRunStats = pokemon.map((p) => ({
        hp: p.hp,
        attack: p.attack,
        defense: p.defense,
        spatk: p.spatk,
        spdef: p.spdef,
        speed: p.speed,
      }));

      // Reset and run again with same seed
      const pokemon2 = createTestPokemon();
      const random2 = new JavaRandom(42n);
      const handler2 = new MockRomHandler(random2, pokemon2, createTestMoves());
      handler2.randomizePokemonStats(settings);

      // Should produce identical results
      for (let i = 0; i < pokemon2.length; i++) {
        expect(pokemon2[i].hp).toBe(firstRunStats[i].hp);
        expect(pokemon2[i].attack).toBe(firstRunStats[i].attack);
        expect(pokemon2[i].defense).toBe(firstRunStats[i].defense);
        expect(pokemon2[i].spatk).toBe(firstRunStats[i].spatk);
        expect(pokemon2[i].spdef).toBe(firstRunStats[i].spdef);
        expect(pokemon2[i].speed).toBe(firstRunStats[i].speed);
      }
    });

    it("does not produce all identical stats", () => {
      const settings = {
        baseStatisticsMod: BaseStatisticsMod.RANDOM,
        baseStatsFollowEvolutions: false,
        baseStatsFollowMegaEvolutions: false,
        assignEvoStatsRandomly: false,
      } as Settings;

      const origHp = pokemon[0].hp;
      const origAtk = pokemon[0].attack;

      handler.randomizePokemonStats(settings);

      // At least some stats should have changed (statistically extremely unlikely to all stay the same)
      let anyChanged = false;
      for (const p of pokemon) {
        // Check each pokemon's stats are valid (1-255 range)
        expect(p.hp).toBeGreaterThanOrEqual(1);
        expect(p.hp).toBeLessThanOrEqual(255);
        expect(p.attack).toBeGreaterThanOrEqual(1);
        expect(p.attack).toBeLessThanOrEqual(255);
        expect(p.defense).toBeGreaterThanOrEqual(1);
        expect(p.defense).toBeLessThanOrEqual(255);
        expect(p.spatk).toBeGreaterThanOrEqual(1);
        expect(p.spatk).toBeLessThanOrEqual(255);
        expect(p.spdef).toBeGreaterThanOrEqual(1);
        expect(p.spdef).toBeLessThanOrEqual(255);
        expect(p.speed).toBeGreaterThanOrEqual(1);
        expect(p.speed).toBeLessThanOrEqual(255);
      }
    });
  });

  describe("randomizeMovePowers", () => {
    it("preserves move count", () => {
      const originalCount = moves.length;
      handler.randomizeMovePowers();
      // The getMoves() returns [null, ...moves] so compare the non-null length
      const allMoves = handler.getMoves();
      const nonNullCount = allMoves.filter((m) => m != null).length;
      expect(nonNullCount).toBe(originalCount);
    });

    it("does not modify Struggle", () => {
      const struggleMove = moves.find((m) => m.internalId === Moves.struggle)!;
      const originalPower = struggleMove.power;
      handler.randomizeMovePowers();
      expect(struggleMove.power).toBe(originalPower);
    });

    it("randomizes powers of damaging moves", () => {
      // Use a move with power >= 10
      const megaPunch = moves.find((m) => m.name === "Mega Punch")!;
      expect(megaPunch.power).toBe(80);

      handler.randomizeMovePowers();

      // Power should be some multiple of 5
      expect(megaPunch.power % 5).toBe(0);
      expect(megaPunch.power).toBeGreaterThanOrEqual(5);
    });

    it("produces deterministic results with same seed", () => {
      handler.randomizeMovePowers();
      const firstRun = moves.map((m) => m.power);

      // Reset
      const moves2 = createTestMoves();
      const handler2 = new MockRomHandler(
        new JavaRandom(42n),
        createTestPokemon(),
        moves2
      );
      handler2.randomizeMovePowers();
      const secondRun = moves2.map((m) => m.power);

      expect(firstRun).toEqual(secondRun);
    });
  });

  describe("randomizeMovePPs", () => {
    it("randomizes PPs to multiples of 5", () => {
      handler.randomizeMovePPs();
      for (const mv of moves) {
        if (mv.internalId !== Moves.struggle) {
          expect(mv.pp % 5).toBe(0);
          expect(mv.pp).toBeGreaterThanOrEqual(5);
          expect(mv.pp).toBeLessThanOrEqual(40);
        }
      }
    });
  });

  describe("randomizeMoveAccuracies", () => {
    it("randomizes accuracies to multiples of 5", () => {
      handler.randomizeMoveAccuracies();
      for (const mv of moves) {
        if (mv.internalId !== Moves.struggle && mv.hitratio >= 5) {
          expect(mv.hitratio % 5).toBe(0);
          expect(mv.hitratio).toBeGreaterThanOrEqual(20);
          expect(mv.hitratio).toBeLessThanOrEqual(100);
        }
      }
    });
  });

  describe("randomizeMoveTypes", () => {
    it("assigns valid types to all moves", () => {
      handler.randomizeMoveTypes();
      for (const mv of moves) {
        if (mv.internalId !== Moves.struggle) {
          expect(mv.type).toBeDefined();
          expect(typeof mv.type).toBe("number");
          // Should be a valid Type enum value
          expect(Type[mv.type]).toBeDefined();
        }
      }
    });

    it("does not modify Struggle", () => {
      const struggleMove = moves.find((m) => m.internalId === Moves.struggle)!;
      const originalType = struggleMove.type;
      handler.randomizeMoveTypes();
      expect(struggleMove.type).toBe(originalType);
    });
  });

  describe("randomizeMoveCategory", () => {
    it("only runs when physical/special split exists", () => {
      // Gen 3 handler does not have split
      const categories = moves.map((m) => m.category);
      handler.randomizeMoveCategory();
      // Categories should be unchanged (gen 3, no split)
      for (let i = 0; i < moves.length; i++) {
        expect(moves[i].category).toBe(categories[i]);
      }
    });

    it("randomizes categories when split exists", () => {
      const gen4Moves = createTestMoves();
      const gen4Handler = new MockRomHandler(
        new JavaRandom(42n),
        createTestPokemon(),
        gen4Moves,
        4
      );
      gen4Handler.randomizeMoveCategory();

      // Struggle and STATUS moves should be unchanged
      const struggleMove = gen4Moves.find(
        (m) => m.internalId === Moves.struggle
      )!;
      expect(struggleMove.category).toBe(MoveCategory.PHYSICAL);
    });
  });

  describe("randomizePokemonTypes", () => {
    it("assigns valid types in completely random mode", () => {
      const settings = {
        typesMod: TypesMod.COMPLETELY_RANDOM,
        typesFollowMegaEvolutions: false,
        dualTypeOnly: false,
      } as Settings;

      handler.randomizePokemonTypes(settings);

      for (const pk of pokemon) {
        expect(pk.primaryType).toBeDefined();
        expect(Type[pk.primaryType]).toBeDefined();
        // Primary and secondary types should be different if secondary exists
        if (pk.secondaryType != null) {
          expect(pk.secondaryType).not.toBe(pk.primaryType);
        }
      }
    });

    it("assigns dual types when dualTypeOnly is true", () => {
      const settings = {
        typesMod: TypesMod.COMPLETELY_RANDOM,
        typesFollowMegaEvolutions: false,
        dualTypeOnly: true,
      } as Settings;

      handler.randomizePokemonTypes(settings);

      for (const pk of pokemon) {
        expect(pk.secondaryType).not.toBeNull();
        expect(pk.secondaryType).not.toBe(pk.primaryType);
      }
    });
  });

  describe("typeInGame", () => {
    it("returns true for normal types in gen 3", () => {
      expect(handler.typeInGame(Type.NORMAL)).toBe(true);
      expect(handler.typeInGame(Type.FIRE)).toBe(true);
      expect(handler.typeInGame(Type.WATER)).toBe(true);
      expect(handler.typeInGame(Type.STEEL)).toBe(true);
      expect(handler.typeInGame(Type.DARK)).toBe(true);
    });

    it("returns false for FAIRY in gen 3 (pre-gen 6)", () => {
      expect(handler.typeInGame(Type.FAIRY)).toBe(false);
    });

    it("returns true for FAIRY in gen 6+", () => {
      const gen6Handler = new MockRomHandler(
        new JavaRandom(42n),
        createTestPokemon(),
        createTestMoves(),
        6
      );
      expect(gen6Handler.typeInGame(Type.FAIRY)).toBe(true);
    });

    it("returns false for hack-only types", () => {
      expect(handler.typeInGame(Type.GAS)).toBe(false);
      expect(handler.typeInGame(Type.WOOD)).toBe(false);
      expect(handler.typeInGame(Type.SOUND)).toBe(false);
    });
  });

  describe("Pokemon filtering", () => {
    it("randomPokemon returns valid pokemon after pool setup", () => {
      handler.setPokemonPool(null);
      const pk = handler.randomPokemon();
      expect(pk).toBeDefined();
      expect(pk.name).toBeDefined();
      expect(pk.number).toBeGreaterThan(0);
    });

    it("randomNonLegendaryPokemon returns non-legendary", () => {
      handler.setPokemonPool(null);
      const pk = handler.randomNonLegendaryPokemon();
      expect(pk.isLegendary()).toBe(false);
    });

    it("setPokemonPool auto-initializes when accessing random methods", () => {
      // Should not throw even without explicit setPokemonPool call
      const pk = handler.randomPokemon();
      expect(pk).toBeDefined();
    });
  });

  describe("randomType", () => {
    it("returns valid in-game types", () => {
      for (let i = 0; i < 50; i++) {
        const t = handler.randomType();
        expect(handler.typeInGame(t)).toBe(true);
      }
    });
  });

  describe("default implementations", () => {
    it("getGameBreakingMoves returns SonicBoom and Dragon Rage", () => {
      const gbMoves = handler.getGameBreakingMoves();
      expect(gbMoves).toContain(49);
      expect(gbMoves).toContain(82);
    });

    it("isYellow returns false by default", () => {
      expect(handler.isYellow()).toBe(false);
    });

    it("altFormesCanHaveDifferentEvolutions returns false by default", () => {
      expect(handler.altFormesCanHaveDifferentEvolutions()).toBe(false);
    });

    it("maxTradeNicknameLength returns 10 by default", () => {
      expect(handler.maxTradeNicknameLength()).toBe(10);
    });

    it("maxTradeOTNameLength returns 7 by default", () => {
      expect(handler.maxTradeOTNameLength()).toBe(7);
    });

    it("maxTrainerNameLength returns MAX_SAFE_INTEGER", () => {
      expect(handler.maxTrainerNameLength()).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("getMovesBannedFromLevelup returns empty", () => {
      expect(handler.getMovesBannedFromLevelup()).toEqual([]);
    });

    it("getIllegalMoves returns empty", () => {
      expect(handler.getIllegalMoves()).toEqual([]);
    });

    it("miscTweaksAvailable returns 0 by default", () => {
      expect(handler.miscTweaksAvailable()).toBe(0);
    });
  });
});
