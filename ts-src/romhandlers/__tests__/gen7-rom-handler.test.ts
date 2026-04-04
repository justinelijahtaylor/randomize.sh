import { describe, it, expect } from "vitest";
import {
  detect3DSRomInner,
  registerRomEntries,
  loadROMInfoFromString,
  Gen7RomHandler,
} from "../gen7-rom-handler";
import * as Gen7Constants from "../../constants/gen7-constants";
import { Pokemon } from "../../pokemon/pokemon";
import { FormeInfo } from "../../pokemon/forme-info";
import { Type } from "../../pokemon/type";
import { Aura, AuraStat } from "../../pokemon/aura";
import { TotemPokemon } from "../../pokemon/totem-pokemon";
import { StaticEncounter } from "../../pokemon/static-encounter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a synthetic Pokemon stats buffer (Gen 7 format, 0x54 bytes). */
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
  callRate?: number;
  commonHeldItem?: number;
  rareHeldItem?: number;
  formeCount?: number;
  formeOffset?: number;
}): Uint8Array {
  const buf = new Uint8Array(Gen7Constants.bsSize);
  buf[Gen7Constants.bsHPOffset] = opts.hp ?? 45;
  buf[Gen7Constants.bsAttackOffset] = opts.attack ?? 49;
  buf[Gen7Constants.bsDefenseOffset] = opts.defense ?? 49;
  buf[Gen7Constants.bsSpeedOffset] = opts.speed ?? 45;
  buf[Gen7Constants.bsSpAtkOffset] = opts.spatk ?? 65;
  buf[Gen7Constants.bsSpDefOffset] = opts.spdef ?? 65;
  buf[Gen7Constants.bsPrimaryTypeOffset] = opts.primaryType ?? 0x0b; // Grass
  buf[Gen7Constants.bsSecondaryTypeOffset] = opts.secondaryType ?? 0x03; // Poison
  buf[Gen7Constants.bsCatchRateOffset] = opts.catchRate ?? 45;
  buf[Gen7Constants.bsGrowthCurveOffset] = opts.growthCurve ?? 3; // Medium Slow
  buf[Gen7Constants.bsAbility1Offset] = opts.ability1 ?? 65;
  buf[Gen7Constants.bsAbility2Offset] = opts.ability2 ?? 0;
  buf[Gen7Constants.bsAbility3Offset] = opts.ability3 ?? 34;
  buf[Gen7Constants.bsCallRateOffset] = opts.callRate ?? 15;

  const common = opts.commonHeldItem ?? 0;
  const rare = opts.rareHeldItem ?? 0;
  buf[Gen7Constants.bsCommonHeldItemOffset] = common & 0xff;
  buf[Gen7Constants.bsCommonHeldItemOffset + 1] = (common >> 8) & 0xff;
  buf[Gen7Constants.bsRareHeldItemOffset] = rare & 0xff;
  buf[Gen7Constants.bsRareHeldItemOffset + 1] = (rare >> 8) & 0xff;

  buf[Gen7Constants.bsFormeCountOffset] = opts.formeCount ?? 1;
  if (opts.formeOffset !== undefined) {
    buf[Gen7Constants.bsFormeOffset] = opts.formeOffset & 0xff;
    buf[Gen7Constants.bsFormeOffset + 1] = (opts.formeOffset >> 8) & 0xff;
  }

  return buf;
}

/**
 * Create a concrete subclass of Gen7RomHandler for testing.
 */
function createTestHandler(): InstanceType<ReturnType<typeof makeTestClass>> {
  const TestClass = makeTestClass();
  return new TestClass();
}

function makeTestClass() {
  const dummyRandom = {
    nextInt(_n?: number): number { return 0; },
    nextDouble(): number { return 0; },
    nextFloat(): number { return 0; },
    nextBoolean(): boolean { return false; },
    nextLong(): bigint { return 0n; },
    nextGaussian(): number { return 0; },
    setSeed(_seed: number | bigint): void {},
  };

  // @ts-expect-error -- intentionally instantiating abstract class through proxy
  class TestGen7Handler extends Gen7RomHandler {
    constructor() {
      super(dummyRandom as any);
    }
    // Stub all abstract methods inherited from AbstractRomHandler
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
    getGeneration() { return 7; }
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
  return TestGen7Handler;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Gen7RomHandler", () => {
  describe("ROM detection", () => {
    it("should detect known SM ROM entry", () => {
      registerRomEntries([
        {
          name: "Pokemon Sun",
          romCode: "CTR-POKEMON_SUN",
          titleId: "0004000000164800",
          acronym: "S",
          romType: Gen7Constants.Type_SM,
          expectedCodeCRC32s: [0, 0],
          files: new Map(),
          linkedStaticOffsets: new Map(),
          strings: new Map(),
          numbers: new Map(),
          arrayEntries: new Map(),
          offsetArrayEntries: new Map(),
        },
      ]);

      expect(
        detect3DSRomInner("CTR-POKEMON_SUN", "0004000000164800")
      ).toBe(true);
    });

    it("should reject unknown ROM", () => {
      registerRomEntries([]);
      expect(detect3DSRomInner("FAKE", "FAKE")).toBe(false);
    });

    it("should reject null inputs", () => {
      expect(detect3DSRomInner(null, "x")).toBe(false);
      expect(detect3DSRomInner("x", null)).toBe(false);
    });
  });

  describe("loadROMInfoFromString", () => {
    it("should parse SM type entry", () => {
      const ini = `
[Pokemon Sun]
Game=CTR-POKEMON_SUN
Type=SM
TitleId=0004000000164800
Acronym=S
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries).toHaveLength(1);
      expect(entries[0].romType).toBe(Gen7Constants.Type_SM);
      expect(entries[0].acronym).toBe("S");
    });

    it("should parse USUM type entry", () => {
      const ini = `
[Pokemon Ultra Sun]
Game=CTR-POKEMON_USUN
Type=USUM
TitleId=00040000001B5000
Acronym=US
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries[0].romType).toBe(Gen7Constants.Type_USUM);
    });

    it("should handle CopyFrom for Gen 7", () => {
      const ini = `
[Source]
Game=SRC
AbilityNamesTextOffset=0x1A

[Target]
Game=TGT
CopyFrom=SRC
`;
      const entries = loadROMInfoFromString(ini);
      expect(entries[1].numbers.get("AbilityNamesTextOffset")).toBe(0x1a);
    });
  });

  describe("loadBasicPokeStats", () => {
    it("should parse stats from synthetic byte buffer", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      const stats = buildStatBuffer({
        hp: 80,
        attack: 120,
        defense: 75,
        speed: 109,
        spatk: 95,
        spdef: 70,
        primaryType: 0x09, // Fire
        secondaryType: 0x09, // Fire (same => null secondary)
        callRate: 25,
      });

      // Need to set up romEntry since loadBasicPokeStats reads romEntry.romType
      // We use a test-specific setup that injects romEntry.
      // For this, we cast to any to set private fields.
      (handler as any).romEntry = {
        romType: Gen7Constants.Type_SM,
        name: "test",
        romCode: "",
        titleId: "",
        acronym: "",
        expectedCodeCRC32s: [0, 0],
        files: new Map(),
        linkedStaticOffsets: new Map(),
        strings: new Map(),
        numbers: new Map(),
        arrayEntries: new Map(),
        offsetArrayEntries: new Map(),
      };

      handler.loadBasicPokeStats(pkmn, stats, new Map());

      expect(pkmn.hp).toBe(80);
      expect(pkmn.attack).toBe(120);
      expect(pkmn.defense).toBe(75);
      expect(pkmn.speed).toBe(109);
      expect(pkmn.spatk).toBe(95);
      expect(pkmn.spdef).toBe(70);
      expect(pkmn.primaryType).toBe(Type.FIRE);
      expect(pkmn.secondaryType).toBeNull();
      expect(pkmn.callRate).toBe(25);
    });

    it("should parse different primary and secondary types", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      (handler as any).romEntry = {
        romType: Gen7Constants.Type_SM,
        name: "test",
        romCode: "",
        titleId: "",
        acronym: "",
        expectedCodeCRC32s: [0, 0],
        files: new Map(),
        linkedStaticOffsets: new Map(),
        strings: new Map(),
        numbers: new Map(),
        arrayEntries: new Map(),
        offsetArrayEntries: new Map(),
      };

      const stats = buildStatBuffer({
        primaryType: 0x0a, // Water
        secondaryType: 0x0e, // Ice
      });

      handler.loadBasicPokeStats(pkmn, stats, new Map());

      expect(pkmn.primaryType).toBe(Type.WATER);
      expect(pkmn.secondaryType).toBe(Type.ICE);
    });

    it("should parse callRate (Gen 7 specific)", () => {
      const handler = createTestHandler();
      const pkmn = new Pokemon();
      pkmn.number = 1;
      (handler as any).romEntry = {
        romType: Gen7Constants.Type_SM,
        name: "test",
        romCode: "",
        titleId: "",
        acronym: "",
        expectedCodeCRC32s: [0, 0],
        files: new Map(),
        linkedStaticOffsets: new Map(),
        strings: new Map(),
        numbers: new Map(),
        arrayEntries: new Map(),
        offsetArrayEntries: new Map(),
      };

      const stats = buildStatBuffer({ callRate: 200 });
      handler.loadBasicPokeStats(pkmn, stats, new Map());
      expect(pkmn.callRate).toBe(200);
    });
  });

  describe("Totem Pokemon handling", () => {
    it("should parse totem data from synthetic bytes", () => {
      const handler = createTestHandler();

      // Set up minimal pokes array so getPokemonForEncounter works
      const pikachu = new Pokemon();
      pikachu.number = 25;
      pikachu.name = "Pikachu";
      pikachu.cosmeticForms = 0;
      (handler as any).pokes = new Array(30).fill(null);
      (handler as any).pokes[25] = pikachu;
      (handler as any).absolutePokeNumByBaseForme = new Map();
      (handler as any).dummyAbsolutePokeNums = new Map([[255, 0]]);

      // Build synthetic totem data
      // species(2) + forme(1) + level(1) + heldItem(2) + aura(1) + padding(7) + ally1Offset(2) + ally2Offset(2)
      const data = new Uint8Array(0x20);
      // species = 25 (Pikachu)
      data[0] = 25; data[1] = 0;
      // forme = 0
      data[2] = 0;
      // level = 20
      data[3] = 20;
      // heldItem = 234
      data[4] = 234; data[5] = 0;
      // aura byte = 4 (Speed +1)
      data[6] = 4;
      // ally1Offset at 0xE
      data[0xe] = 0x10; data[0xf] = 0;
      // ally2Offset at 0x10
      data[0x10] = 0x20; data[0x11] = 0;

      const totem = handler.parseTotemPokemon(data, 0);

      expect(totem.pkmn).toBe(pikachu);
      expect(totem.level).toBe(20);
      expect(totem.heldItem).toBe(234);
      expect(totem.forme).toBe(0);
      expect(totem.aura).toBeInstanceOf(Aura);
      expect(totem.ally1Offset).toBe(0x10);
      expect(totem.ally2Offset).toBe(0x20);
    });

    it("should parse totem ally from synthetic bytes", () => {
      const handler = createTestHandler();

      const bulbasaur = new Pokemon();
      bulbasaur.number = 1;
      bulbasaur.name = "Bulbasaur";
      bulbasaur.cosmeticForms = 0;
      (handler as any).pokes = new Array(5).fill(null);
      (handler as any).pokes[1] = bulbasaur;
      (handler as any).absolutePokeNumByBaseForme = new Map();
      (handler as any).dummyAbsolutePokeNums = new Map([[255, 0]]);

      const data = new Uint8Array(8);
      // species = 1
      data[0] = 1; data[1] = 0;
      // forme = 0
      data[2] = 0;
      // level = 15
      data[3] = 15;

      const ally = handler.parseTotemAlly(data, 0);

      expect(ally.pkmn).toBe(bulbasaur);
      expect(ally.level).toBe(15);
      expect(ally.forme).toBe(0);
    });
  });

  describe("getPokemonForEncounter", () => {
    it("should return base form for cosmetic formes", () => {
      const handler = createTestHandler();
      const pokemon = new Pokemon();
      pokemon.number = 25;
      pokemon.cosmeticForms = 5;
      (handler as any).pokes = new Array(30).fill(null);
      (handler as any).pokes[25] = pokemon;
      (handler as any).absolutePokeNumByBaseForme = new Map();
      (handler as any).dummyAbsolutePokeNums = new Map([[255, 0]]);

      // forme <= cosmeticForms => returns base pokemon
      const result = handler.getPokemonForEncounter(25, 3);
      expect(result).toBe(pokemon);
    });

    it("should return base form for forme 30 or 31", () => {
      const handler = createTestHandler();
      const pokemon = new Pokemon();
      pokemon.number = 25;
      pokemon.cosmeticForms = 0;
      (handler as any).pokes = new Array(30).fill(null);
      (handler as any).pokes[25] = pokemon;
      (handler as any).absolutePokeNumByBaseForme = new Map();
      (handler as any).dummyAbsolutePokeNums = new Map([[255, 0]]);

      expect(handler.getPokemonForEncounter(25, 30)).toBe(pokemon);
      expect(handler.getPokemonForEncounter(25, 31)).toBe(pokemon);
    });

    it("should look up actual alt forme via absolutePokeNumByBaseForme", () => {
      const handler = createTestHandler();
      const basePkmn = new Pokemon();
      basePkmn.number = 25;
      basePkmn.cosmeticForms = 0;
      const altPkmn = new Pokemon();
      altPkmn.number = 803;
      (handler as any).pokes = new Array(810).fill(null);
      (handler as any).pokes[25] = basePkmn;
      (handler as any).pokes[803] = altPkmn;
      (handler as any).absolutePokeNumByBaseForme = new Map([
        [25, new Map([[1, 803]])],
      ]);
      (handler as any).dummyAbsolutePokeNums = new Map([[255, 0]]);

      const result = handler.getPokemonForEncounter(25, 1);
      expect(result).toBe(altPkmn);
    });
  });

  describe("readWord / writeWord", () => {
    it("should round-trip 16-bit LE values", () => {
      const handler = createTestHandler();
      const data = new Uint8Array(4);

      handler.writeWord(data, 0, 0x1234);
      handler.writeWord(data, 2, 0xffff);

      expect(handler.readWord(data, 0)).toBe(0x1234);
      expect(handler.readWord(data, 2)).toBe(0xffff);
    });

    it("should handle zero", () => {
      const handler = createTestHandler();
      const data = new Uint8Array(2);
      handler.writeWord(data, 0, 0);
      expect(handler.readWord(data, 0)).toBe(0);
    });
  });
});
