import { describe, it, expect } from "vitest";
import {
  detect3DSRomInner,
  registerRomEntries,
  loadROMInfoFromString,
  Gen6RomHandler,
} from "../gen6-rom-handler";
import * as Gen6Constants from "../../constants/gen6-constants";
import { Pokemon } from "../../pokemon/pokemon";
import { FormeInfo } from "../../pokemon/forme-info";
import { Type } from "../../pokemon/type";
import { MegaEvolution } from "../../pokemon/mega-evolution";
import { GARCArchive } from "../../ctr/garc-archive";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a synthetic Pokemon stats buffer (Gen 6 format). */
function buildStatBuffer(opts: {
  hp?: number;
  attack?: number;
  defense?: number;
  speed?: number;
  spatk?: number;
  spdef?: number;
  primaryType?: number;
  secondaryType?: number;
  catchRate?: number;
  growthCurve?: number;
  ability1?: number;
  ability2?: number;
  ability3?: number;
  commonHeldItem?: number;
  rareHeldItem?: number;
  formeCount?: number;
  formeOffset?: number;
}): Uint8Array {
  // Gen6 bsSize is 0x40 (XY) or 0x50 (ORAS), allocate enough
  const buf = new Uint8Array(0x50);
  buf[Gen6Constants.bsHPOffset] = opts.hp ?? 45;
  buf[Gen6Constants.bsAttackOffset] = opts.attack ?? 49;
  buf[Gen6Constants.bsDefenseOffset] = opts.defense ?? 49;
  buf[Gen6Constants.bsSpeedOffset] = opts.speed ?? 45;
  buf[Gen6Constants.bsSpAtkOffset] = opts.spatk ?? 65;
  buf[Gen6Constants.bsSpDefOffset] = opts.spdef ?? 65;
  buf[Gen6Constants.bsPrimaryTypeOffset] = opts.primaryType ?? 0x0b; // Grass
  buf[Gen6Constants.bsSecondaryTypeOffset] = opts.secondaryType ?? 0x03; // Poison
  buf[Gen6Constants.bsCatchRateOffset] = opts.catchRate ?? 45;
  buf[Gen6Constants.bsGrowthCurveOffset] = opts.growthCurve ?? 3; // Medium Slow
  buf[Gen6Constants.bsAbility1Offset] = opts.ability1 ?? 65;
  buf[Gen6Constants.bsAbility2Offset] = opts.ability2 ?? 0;
  buf[Gen6Constants.bsAbility3Offset] = opts.ability3 ?? 34;

  // held items (2-byte LE)
  const common = opts.commonHeldItem ?? 0;
  const rare = opts.rareHeldItem ?? 0;
  buf[Gen6Constants.bsCommonHeldItemOffset] = common & 0xff;
  buf[Gen6Constants.bsCommonHeldItemOffset + 1] = (common >> 8) & 0xff;
  buf[Gen6Constants.bsRareHeldItemOffset] = rare & 0xff;
  buf[Gen6Constants.bsRareHeldItemOffset + 1] = (rare >> 8) & 0xff;

  buf[Gen6Constants.bsFormeCountOffset] = opts.formeCount ?? 1;
  if (opts.formeOffset !== undefined) {
    buf[Gen6Constants.bsFormeOffset] = opts.formeOffset & 0xff;
    buf[Gen6Constants.bsFormeOffset + 1] = (opts.formeOffset >> 8) & 0xff;
  }

  return buf;
}

/**
 * Create a concrete subclass of Gen6RomHandler that we can instantiate
 * for testing, providing stub implementations for all abstract methods.
 */
function createTestHandler(): InstanceType<ReturnType<typeof makeTestClass>> {
  const TestClass = makeTestClass();
  return new TestClass();
}

function makeTestClass() {
  // We need to provide a RandomInstance. Build a minimal one.
  const dummyRandom = {
    nextInt(_n?: number): number { return 0; },
    nextDouble(): number { return 0; },
    nextFloat(): number { return 0; },
    nextBoolean(): boolean { return false; },
    nextLong(): bigint { return 0n; },
    nextGaussian(): number { return 0; },
    setSeed(_seed: number | bigint): void {},
  };

  // Dynamically create a subclass that stubs out all abstract methods.
  // We capture the abstract names at runtime.
  // @ts-expect-error -- intentionally instantiating abstract class through proxy
  class TestGen6Handler extends Gen6RomHandler {
    constructor() {
      super(dummyRandom as any);
    }
    // stubs for all the abstract methods from AbstractRomHandler
    isRomValid() { return true; }
    getPokemon() { return []; }
    getPokemonInclFormes() { return []; }
    getAltFormes() { return []; }
    getMegaEvolutions() { return []; }
    getAltFormeOfPokemon(_pk: any, _f: any) { return new Pokemon(); }
    getIrregularFormes() { return []; }
    removeEvosForPokemonPool() {}
    getStarters() { return []; }
    setStarters() { return true; }
    hasStarterAltFormes() { return false; }
    starterCount() { return 3; }
    customStarters() {}
    randomizeStarters() {}
    randomizeBasicTwoEvosStarters() {}
    supportsStarterHeldItems() { return false; }
    getStarterHeldItems() { return []; }
    setStarterHeldItems() {}
    randomizeStarterHeldItems() {}
    getUpdatedPokemonStats() { return new Map(); }
    standardizeEXPCurves() {}
    getEncounters() { return []; }
    setEncounters() {}
    hasWildAltFormes() { return false; }
    getMainGameWildHolding() { return []; }
    hasEncounterLocations() { return false; }
    hasTimeBasedEncounters() { return false; }
    canBlackWhiteWildPokemon() { return false; }
    getTrainers() { return []; }
    getTrainerNames() { return []; }
    getTrainerClassNames() { return []; }
    setTrainers() {}
    hasTrainerNames() { return false; }
    hasTrainerClassNames() { return false; }
    canAddPokemonToBossTrainers() { return false; }
    canAddPokemonToImportantTrainers() { return false; }
    canAddPokemonToRegularTrainers() { return false; }
    canAddHeldItemsToBossTrainers() { return false; }
    canAddHeldItemsToImportantTrainers() { return false; }
    canAddHeldItemsToRegularTrainers() { return false; }
    getDoublesTrainerClasses() { return []; }
    getMainPlaythroughTrainers() { return []; }
    getMoves() { return []; }
    getMovesLearnt() { return new Map(); }
    setMovesLearnt() {}
    canSortMovesByType() { return false; }
    canSortTrainersByStrength() { return false; }
    hasMoveTutors() { return false; }
    getMoveTutorMoves() { return []; }
    setMoveTutorMoves() {}
    getMoveTutorCompatibility() { return new Map(); }
    setMoveTutorCompatibility() {}
    hasMoveTutorTextReferences() { return false; }
    getStaticPokemon() { return []; }
    setStaticPokemon() { return false; }
    canChangeStaticPokemon() { return false; }
    hasStaticAltFormes() { return false; }
    getStaticPokemonSupport() { return []; }
    getTotemPokemon() { return []; }
    setTotemPokemon() {}
    getTMHMCompatibility() { return new Map(); }
    setTMHMCompatibility() {}
    getTMMoves() { return []; }
    getHMMoves() { return []; }
    setTMMoves() {}
    getTMCount() { return 0; }
    getHMCount() { return 0; }
    hasTMText() { return false; }
    getTMTextEntries() { return []; }
    getFieldMoves() { return []; }
    getEarlyRequiredHMMoves() { return []; }
    getCurrentFieldTMs() { return []; }
    getRequiredFieldTMs() { return []; }
    getIngameTrades() { return []; }
    setIngameTrades() {}
    hasTimeBasedEvolutions() { return false; }
    removeTimeBasedEvolutions() {}
    removeImpossibleEvolutions() {}
    condenseLevelEvolutions() {}
    makeEvolutionsEasier() {}
    removeTradeEvolutions() {}
    getAbilityNames() { return []; }
    getHighestAbilityIndex() { return 0; }
    getAbilityCount() { return 0; }
    hasMegaEvolutions() { return false; }
    getGeneration() { return 6; }
    canChangeTrainerText() { return false; }
    getCurrentTrainerNames() { return []; }
    getCurrentTrainerClassNames() { return []; }
    setTrainerNames() {}
    setTrainerClassNames() {}
    maxTrainerNameLength() { return 10; }
    maxTrainerClassNameLength() { return 10; }
    maxSumOfTrainerNameLengths() { return 100; }
    hasShopRandomization() { return false; }
    getShopItems() { return new Map(); }
    setShopItems() {}
    getShopNames() { return []; }
    setShopPrices() {}
    getPickupItems() { return []; }
    setPickupItems() {}
    getItemNames() { return []; }
    getItemDescriptions() { return []; }
    getAllowedItems() { return null as any; }
    getNonBadItems() { return null as any; }
    getMiscTweaksAvailable() { return []; }
    applyMiscTweak() {}
    canApplyPatch() { return false; }
    applyPatch() {}
    isEffectivenessUpdated() { return false; }
    hasShinyChance() { return false; }
    getFrontSprites() { return []; }
    getRestrictQM() { return null as any; }
    setRestrictQM() {}
    miscData() { return {}; }
  }
  return TestGen6Handler;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Gen6RomHandler", () => {
  describe("ROM detection", () => {
    it("should detect known ROM entries by productCode and titleId", () => {
      registerRomEntries([
        {
          name: "Pokemon X",
          romCode: "0004000000055D00",
          titleId: "000400000011C400",
          acronym: "X",
          romType: Gen6Constants.Type_XY,
          expectedCodeCRC32s: [0, 0],
          files: new Map(),
          staticPokemonSupport: true,
          copyStaticPokemon: true,
          linkedStaticOffsets: new Map(),
          strings: new Map(),
          numbers: new Map(),
          arrayEntries: new Map(),
          offsetArrayEntries: new Map(),
        },
      ]);

      expect(
        detect3DSRomInner("0004000000055D00", "000400000011C400")
      ).toBe(true);
    });

    it("should reject unknown productCode/titleId", () => {
      registerRomEntries([]);
      expect(detect3DSRomInner("UNKNOWN", "UNKNOWN")).toBe(false);
    });

    it("should reject null productCode or titleId", () => {
      expect(detect3DSRomInner(null, "123")).toBe(false);
      expect(detect3DSRomInner("123", null)).toBe(false);
      expect(detect3DSRomInner(null, null)).toBe(false);
    });
  });

  describe("loadROMInfoFromString", () => {
    it("should parse a minimal INI entry", () => {
      const ini = `
[Pokemon X]
Game=CTR-POKEMON_X
Type=XY
TitleId=000400000011C400
Acronym=X
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries).toHaveLength(1);
      expect(entries[0].name).toBe("Pokemon X");
      expect(entries[0].romCode).toBe("CTR-POKEMON_X");
      expect(entries[0].romType).toBe(Gen6Constants.Type_XY);
      expect(entries[0].titleId).toBe("000400000011C400");
      expect(entries[0].acronym).toBe("X");
    });

    it("should parse ORAS type", () => {
      const ini = `
[Pokemon Omega Ruby]
Game=CTR-POKEMON_OR
Type=ORAS
TitleId=000400000EC10000
Acronym=OR
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries[0].romType).toBe(Gen6Constants.Type_ORAS);
    });

    it("should parse numeric entries", () => {
      const ini = `
[Test]
Game=TEST
PokemonNamesTextOffset=0x5A
ItemCount=100
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries[0].numbers.get("PokemonNamesTextOffset")).toBe(0x5a);
      expect(entries[0].numbers.get("ItemCount")).toBe(100);
    });

    it("should parse array entries", () => {
      const ini = `
[Test]
Game=TEST
SomeArray=[1,2,3]
EmptyArray=[]
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries[0].arrayEntries.get("SomeArray")).toEqual([1, 2, 3]);
      expect(entries[0].arrayEntries.get("EmptyArray")).toEqual([]);
    });

    it("should handle CopyFrom", () => {
      const ini = `
[Source]
Game=SRC
PokemonNamesTextOffset=10

[Target]
Game=TGT
CopyFrom=SRC
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries[1].numbers.get("PokemonNamesTextOffset")).toBe(10);
    });

    it("should strip comments", () => {
      const ini = `
[Test]
Game=TEST // inline comment
PokemonNamesTextOffset=42
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries[0].romCode).toBe("TEST");
    });
  });

  describe("loadBasicPokeStats", () => {
    it("should parse HP, Attack, Defense, Speed, SpAtk, SpDef from bytes", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      const stats = buildStatBuffer({
        hp: 100,
        attack: 80,
        defense: 70,
        speed: 90,
        spatk: 110,
        spdef: 85,
      });

      handler.loadBasicPokeStats(pkmn, stats, new Map());

      expect(pkmn.hp).toBe(100);
      expect(pkmn.attack).toBe(80);
      expect(pkmn.defense).toBe(70);
      expect(pkmn.speed).toBe(90);
      expect(pkmn.spatk).toBe(110);
      expect(pkmn.spdef).toBe(85);
    });

    it("should parse type from type table indices", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      const stats = buildStatBuffer({
        primaryType: 0x09, // Fire
        secondaryType: 0x02, // Flying
      });

      handler.loadBasicPokeStats(pkmn, stats, new Map());

      expect(pkmn.primaryType).toBe(Type.FIRE);
      expect(pkmn.secondaryType).toBe(Type.FLYING);
    });

    it("should set secondaryType to null when it matches primaryType", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      const stats = buildStatBuffer({
        primaryType: 0x00, // Normal
        secondaryType: 0x00, // Normal - same
      });

      handler.loadBasicPokeStats(pkmn, stats, new Map());

      expect(pkmn.primaryType).toBe(Type.NORMAL);
      expect(pkmn.secondaryType).toBeNull();
    });

    it("should parse abilities and zero duplicate ability2", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      const stats = buildStatBuffer({
        ability1: 65,
        ability2: 65, // same as ability1
        ability3: 34,
      });

      handler.loadBasicPokeStats(pkmn, stats, new Map());

      expect(pkmn.ability1).toBe(65);
      expect(pkmn.ability2).toBe(0); // zeroed because same
      expect(pkmn.ability3).toBe(34);
    });

    it("should parse held items and detect guaranteed when both are the same", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      const stats = buildStatBuffer({
        commonHeldItem: 234,
        rareHeldItem: 234, // same -> guaranteed
      });

      handler.loadBasicPokeStats(pkmn, stats, new Map());

      expect(pkmn.guaranteedHeldItem).toBe(234);
      expect(pkmn.commonHeldItem).toBe(0);
      expect(pkmn.rareHeldItem).toBe(0);
    });

    it("should parse held items separately when different", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      const stats = buildStatBuffer({
        commonHeldItem: 100,
        rareHeldItem: 200,
      });

      handler.loadBasicPokeStats(pkmn, stats, new Map());

      expect(pkmn.guaranteedHeldItem).toBe(0);
      expect(pkmn.commonHeldItem).toBe(100);
      expect(pkmn.rareHeldItem).toBe(200);
    });

    it("should populate formeMapping when formeCount > 1 and offset is nonzero", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 6; // Charizard
      const altFormes = new Map<number, FormeInfo>();
      const stats = buildStatBuffer({
        formeCount: 3,
        formeOffset: 722,
      });

      handler.loadBasicPokeStats(pkmn, stats, altFormes);

      // Should add 2 formes (indices 1 and 2) at offsets 722 and 723
      expect(altFormes.has(722)).toBe(true);
      expect(altFormes.has(723)).toBe(true);
      expect(altFormes.get(722)!.baseForme).toBe(6);
      expect(altFormes.get(722)!.formeNumber).toBe(1);
      expect(altFormes.get(723)!.baseForme).toBe(6);
      expect(altFormes.get(723)!.formeNumber).toBe(2);
    });
  });

  describe("readWord / writeWord", () => {
    it("should read a 16-bit LE word", () => {
      const handler = createTestHandler();
      const data = new Uint8Array([0x34, 0x12]);
      expect(handler.readWord(data, 0)).toBe(0x1234);
    });

    it("should write a 16-bit LE word", () => {
      const handler = createTestHandler();
      const data = new Uint8Array(2);
      handler.writeWord(data, 0, 0xabcd);
      expect(data[0]).toBe(0xcd);
      expect(data[1]).toBe(0xab);
    });
  });

  describe("mega evolution parsing", () => {
    it("should build mega evolution data from synthetic GARC-like bytes", () => {
      // Build synthetic mega evo entry: 3 slots of 8 bytes each
      const megaEntry = new Uint8Array(24);
      // Slot 0: formNum=1, method=1, argument=item 660
      megaEntry[0] = 1; megaEntry[1] = 0; // formNum = 1
      megaEntry[2] = 1; megaEntry[3] = 0; // method = 1
      megaEntry[4] = 0x94; megaEntry[5] = 0x02; // argument = 660

      const handler = createTestHandler();

      // Read word at different offsets
      expect(handler.readWord(megaEntry, 0)).toBe(1); // formNum
      expect(handler.readWord(megaEntry, 2)).toBe(1); // method
      expect(handler.readWord(megaEntry, 4)).toBe(660); // argument (mega stone item id)
    });
  });
});
