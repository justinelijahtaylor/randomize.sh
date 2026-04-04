import { describe, it, expect } from 'vitest';
import {
  Gen4RomHandler,
  detectGen4Rom,
  romTypeFromCode,
} from '../gen4-rom-handler';
import * as Gen4Constants from '../../constants/gen4-constants';
import { NARCArchive } from '../../nds/narc-archive';
import { Pokemon } from '../../pokemon/pokemon';
import { Type } from '../../pokemon/type';
import { MoveCategory } from '../../pokemon/move-category';
import { StatChangeMoveType } from '../../pokemon/stat-change-move-type';
import { StatChangeType } from '../../pokemon/stat-change-type';
import { ExpCurve, expCurveToByte } from '../../pokemon/exp-curve';

// ---------------------------------------------------------------------------
// Helpers: build synthetic NARC data for Pokemon / Moves
// ---------------------------------------------------------------------------

/**
 * Build a minimal Pokemon stat byte array (Gen4 format, 44 bytes).
 */
function buildPokemonStats(opts: {
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
  commonHeldItem?: number;
  rareHeldItem?: number;
  genderRatio?: number;
} = {}): Uint8Array {
  const data = new Uint8Array(44);
  data[Gen4Constants.bsHPOffset] = opts.hp ?? 45;
  data[Gen4Constants.bsAttackOffset] = opts.attack ?? 49;
  data[Gen4Constants.bsDefenseOffset] = opts.defense ?? 49;
  data[Gen4Constants.bsSpeedOffset] = opts.speed ?? 45;
  data[Gen4Constants.bsSpAtkOffset] = opts.spatk ?? 65;
  data[Gen4Constants.bsSpDefOffset] = opts.spdef ?? 65;
  data[Gen4Constants.bsPrimaryTypeOffset] = opts.primaryType ?? 0x0C; // GRASS
  data[Gen4Constants.bsSecondaryTypeOffset] = opts.secondaryType ?? 0x03; // POISON
  data[Gen4Constants.bsCatchRateOffset] = opts.catchRate ?? 45;
  data[Gen4Constants.bsGrowthCurveOffset] = opts.growthCurve ?? 3; // MEDIUM_SLOW
  data[Gen4Constants.bsAbility1Offset] = opts.ability1 ?? 65;
  data[Gen4Constants.bsAbility2Offset] = opts.ability2 ?? 0;
  // Held items (little-endian 16-bit)
  const common = opts.commonHeldItem ?? 0;
  const rare = opts.rareHeldItem ?? 0;
  data[Gen4Constants.bsCommonHeldItemOffset] = common & 0xff;
  data[Gen4Constants.bsCommonHeldItemOffset + 1] = (common >> 8) & 0xff;
  data[Gen4Constants.bsRareHeldItemOffset] = rare & 0xff;
  data[Gen4Constants.bsRareHeldItemOffset + 1] = (rare >> 8) & 0xff;
  data[Gen4Constants.bsGenderRatioOffset] = opts.genderRatio ?? 127;
  return data;
}

/**
 * Build a minimal Move data byte array (Gen4 format, 12+ bytes).
 */
function buildMoveData(opts: {
  effectIndex?: number;
  category?: number;
  power?: number;
  type?: number;
  hitratio?: number;
  pp?: number;
  secondaryEffectChance?: number;
  target?: number;
  priority?: number;
  flags?: number;
} = {}): Uint8Array {
  const data = new Uint8Array(16);
  const effectIndex = opts.effectIndex ?? 0;
  data[0] = effectIndex & 0xff;
  data[1] = (effectIndex >> 8) & 0xff;
  data[2] = opts.category ?? 0; // Physical
  data[3] = opts.power ?? 40;
  data[4] = opts.type ?? 0x00; // NORMAL
  data[5] = opts.hitratio ?? 100;
  data[6] = opts.pp ?? 35;
  data[7] = opts.secondaryEffectChance ?? 0;
  const target = opts.target ?? 0;
  data[8] = target & 0xff;
  data[9] = (target >> 8) & 0xff;
  data[10] = (opts.priority ?? 0) & 0xff;
  data[11] = opts.flags ?? 0;
  return data;
}

/**
 * Wrap an array of Uint8Arrays into a NARCArchive.
 */
function wrapFilesInNarc(files: Uint8Array[]): NARCArchive {
  const narc = new NARCArchive();
  for (const f of files) {
    narc.files.push(f);
  }
  return narc;
}

// ---------------------------------------------------------------------------
// Tests: ROM type detection
// ---------------------------------------------------------------------------

describe('Gen4RomHandler - ROM detection', () => {
  it('should detect Diamond ROM code', () => {
    expect(detectGen4Rom('ADAE')).toBe(true);
  });

  it('should detect Pearl ROM code', () => {
    expect(detectGen4Rom('APAJ')).toBe(true);
  });

  it('should detect Platinum ROM code', () => {
    expect(detectGen4Rom('CPUE')).toBe(true);
  });

  it('should detect HeartGold ROM code', () => {
    expect(detectGen4Rom('IPKE')).toBe(true);
  });

  it('should detect SoulSilver ROM code', () => {
    expect(detectGen4Rom('IPGE')).toBe(true);
  });

  it('should reject unknown ROM code', () => {
    expect(detectGen4Rom('XXXX')).toBe(false);
  });

  it('should reject null ROM code', () => {
    expect(detectGen4Rom(null)).toBe(false);
  });

  it('should determine DP type from code', () => {
    expect(romTypeFromCode('ADAE')).toBe(Gen4Constants.Type_DP);
    expect(romTypeFromCode('APAE')).toBe(Gen4Constants.Type_DP);
  });

  it('should determine Platinum type from code', () => {
    expect(romTypeFromCode('CPUE')).toBe(Gen4Constants.Type_Plat);
  });

  it('should determine HGSS type from code', () => {
    expect(romTypeFromCode('IPKE')).toBe(Gen4Constants.Type_HGSS);
    expect(romTypeFromCode('IPGE')).toBe(Gen4Constants.Type_HGSS);
  });
});

// ---------------------------------------------------------------------------
// Tests: Pokemon stat parsing
// ---------------------------------------------------------------------------

describe('Gen4RomHandler - Pokemon stat parsing', () => {
  it('should parse basic pokemon stats from synthetic NARC data', () => {
    // Build a NARC with index 0 as dummy and index 1 as our test mon
    const dummyFile = new Uint8Array(44);
    const bulbasaurStats = buildPokemonStats({
      hp: 45,
      attack: 49,
      defense: 49,
      speed: 45,
      spatk: 65,
      spdef: 65,
      primaryType: 0x0C, // GRASS
      secondaryType: 0x03, // POISON
      catchRate: 45,
      growthCurve: 3, // MEDIUM_SLOW
      ability1: 65,
      ability2: 0,
    });

    // Need at least pokemonCount+1 files, but for testing just pad with dummies
    const files: Uint8Array[] = [dummyFile]; // index 0
    files.push(bulbasaurStats); // index 1
    // Fill remaining with dummies
    for (let i = 2; i <= Gen4Constants.pokemonCount; i++) {
      files.push(new Uint8Array(44));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Bulbasaur'];
    for (let i = 2; i <= Gen4Constants.pokemonCount; i++) {
      names.push(`Mon${i}`);
    }

    const handler = new Gen4RomHandler();
    handler.loadPokemonStats(narc, names);

    const poke = handler.pokes[1];
    expect(poke).not.toBeNull();
    expect(poke!.name).toBe('Bulbasaur');
    expect(poke!.hp).toBe(45);
    expect(poke!.attack).toBe(49);
    expect(poke!.defense).toBe(49);
    expect(poke!.speed).toBe(45);
    expect(poke!.spatk).toBe(65);
    expect(poke!.spdef).toBe(65);
    expect(poke!.primaryType).toBe(Type.GRASS);
    expect(poke!.secondaryType).toBe(Type.POISON);
    expect(poke!.catchRate).toBe(45);
    expect(poke!.growthCurve).toBe(ExpCurve.MEDIUM_SLOW);
    expect(poke!.ability1).toBe(65);
    expect(poke!.ability2).toBe(0);
  });

  it('should set secondaryType to null when both types are the same', () => {
    const stats = buildPokemonStats({
      primaryType: 0x00, // NORMAL
      secondaryType: 0x00, // NORMAL (same)
    });

    const handler = new Gen4RomHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    expect(pkmn.primaryType).toBe(Type.NORMAL);
    expect(pkmn.secondaryType).toBeNull();
  });

  it('should parse held items correctly when they differ (common/rare)', () => {
    const stats = buildPokemonStats({
      commonHeldItem: 100,
      rareHeldItem: 200,
    });

    const handler = new Gen4RomHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    expect(pkmn.guaranteedHeldItem).toBe(0);
    expect(pkmn.commonHeldItem).toBe(100);
    expect(pkmn.rareHeldItem).toBe(200);
  });

  it('should parse held items as guaranteed when both are the same', () => {
    const stats = buildPokemonStats({
      commonHeldItem: 150,
      rareHeldItem: 150,
    });

    const handler = new Gen4RomHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    expect(pkmn.guaranteedHeldItem).toBe(150);
    expect(pkmn.commonHeldItem).toBe(0);
    expect(pkmn.rareHeldItem).toBe(0);
  });

  it('should round-trip save and reload pokemon stats', () => {
    const stats = buildPokemonStats({
      hp: 80,
      attack: 120,
      defense: 70,
      speed: 100,
      spatk: 90,
      spdef: 60,
      primaryType: 0x0A, // FIRE
      secondaryType: 0x02, // FLYING
      catchRate: 200,
      ability1: 31,
      ability2: 18,
    });

    const handler = new Gen4RomHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    // Now save it back
    const newStats = new Uint8Array(44);
    handler.saveBasicPokeStats(pkmn, newStats);

    // Re-load and verify
    const pkmn2 = new Pokemon();
    handler.loadBasicPokeStats(pkmn2, newStats);

    expect(pkmn2.hp).toBe(80);
    expect(pkmn2.attack).toBe(120);
    expect(pkmn2.defense).toBe(70);
    expect(pkmn2.speed).toBe(100);
    expect(pkmn2.spatk).toBe(90);
    expect(pkmn2.spdef).toBe(60);
    expect(pkmn2.primaryType).toBe(Type.FIRE);
    expect(pkmn2.secondaryType).toBe(Type.FLYING);
    expect(pkmn2.catchRate).toBe(200);
    expect(pkmn2.ability1).toBe(31);
    expect(pkmn2.ability2).toBe(18);
  });
});

// ---------------------------------------------------------------------------
// Tests: Move data parsing
// ---------------------------------------------------------------------------

describe('Gen4RomHandler - Move data parsing', () => {
  it('should parse basic move data from synthetic NARC', () => {
    const dummyFile = new Uint8Array(16);
    // Move at index 1: Pound-like move
    const poundData = buildMoveData({
      effectIndex: 0,
      category: 0, // Physical
      power: 40,
      type: 0x00, // NORMAL
      hitratio: 100,
      pp: 35,
      flags: 1, // makes contact
    });

    const files: Uint8Array[] = [dummyFile, poundData];
    // Fill rest with dummy moves
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      files.push(new Uint8Array(16));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Pound'];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen4RomHandler();
    handler.loadMoves(narc, names);

    const move = handler.moves[1];
    expect(move).not.toBeNull();
    expect(move!.name).toBe('Pound');
    expect(move!.number).toBe(1);
    expect(move!.power).toBe(40);
    expect(move!.pp).toBe(35);
    expect(move!.hitratio).toBe(100);
    expect(move!.type).toBe(Type.NORMAL);
    expect(move!.category).toBe(MoveCategory.PHYSICAL);
    expect(move!.makesContact).toBe(true);
  });

  it('should parse move with stat-changing effect (no damage, atk+1)', () => {
    const dummyFile = new Uint8Array(16);
    const swordsData = buildMoveData({
      effectIndex: Gen4Constants.noDamageAtkPlusTwoEffect,
      category: 2, // Status
      power: 0,
      type: 0x00, // NORMAL
      hitratio: 0,
      pp: 30,
      target: 16, // Self
    });

    const files: Uint8Array[] = [dummyFile, swordsData];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      files.push(new Uint8Array(16));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Swords Dance'];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen4RomHandler();
    handler.loadMoves(narc, names);

    const move = handler.moves[1];
    expect(move).not.toBeNull();
    expect(move!.statChangeMoveType).toBe(StatChangeMoveType.NO_DAMAGE_USER);
    expect(move!.statChanges[0].type).toBe(StatChangeType.ATTACK);
    expect(move!.statChanges[0].stages).toBe(2);
  });

  it('should parse move with damage + target stat debuff', () => {
    const dummyFile = new Uint8Array(16);
    const moveData = buildMoveData({
      effectIndex: Gen4Constants.damageDefMinusOneEffect,
      category: 0, // Physical
      power: 65,
      type: 0x00,
      hitratio: 100,
      pp: 20,
      secondaryEffectChance: 50,
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      files.push(new Uint8Array(16));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'CrunchLike'];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen4RomHandler();
    handler.loadMoves(narc, names);

    const move = handler.moves[1];
    expect(move).not.toBeNull();
    expect(move!.statChangeMoveType).toBe(StatChangeMoveType.DAMAGE_TARGET);
    expect(move!.statChanges[0].type).toBe(StatChangeType.DEFENSE);
    expect(move!.statChanges[0].stages).toBe(-1);
    expect(move!.statChanges[0].percentChance).toBe(50);
  });

  it('should identify Special category moves correctly', () => {
    const dummyFile = new Uint8Array(16);
    const moveData = buildMoveData({
      category: 1, // Special in Gen4 (0=Phys, 1=Spec, 2=Status)
      power: 90,
      type: 0x0A, // FIRE
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      files.push(new Uint8Array(16));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Flamethrower'];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen4RomHandler();
    handler.loadMoves(narc, names);

    const move = handler.moves[1];
    expect(move!.category).toBe(MoveCategory.SPECIAL);
    expect(move!.type).toBe(Type.FIRE);
    expect(move!.power).toBe(90);
  });

  it('should save and verify move data', () => {
    const dummyFile = new Uint8Array(16);
    const moveData = buildMoveData({
      power: 60,
      pp: 20,
      hitratio: 95,
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      files.push(new Uint8Array(16));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'TestMove'];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen4RomHandler();
    handler.loadMoves(narc, names);

    // Modify move
    handler.moves[1]!.power = 80;
    handler.moves[1]!.pp = 15;

    // Save
    handler.saveMoves();

    // Re-read from the narc
    const handler2 = new Gen4RomHandler();
    handler2.loadMoves(narc, names);

    expect(handler2.moves[1]!.power).toBe(80);
    expect(handler2.moves[1]!.pp).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Tests: Constructor and basic accessors
// ---------------------------------------------------------------------------

describe('Gen4RomHandler - Accessors', () => {
  it('should return ROM name from entry', () => {
    const handler = new Gen4RomHandler({
      name: 'Diamond (U)',
      romCode: 'ADAE',
      version: 0,
      romType: Gen4Constants.Type_DP,
      arm9ExpectedCRC32: 0,
      staticPokemonSupport: false,
      copyStaticPokemon: false,
      copyRoamingPokemon: false,
      ignoreGameCornerStatics: false,
      copyText: false,
      strings: new Map(),
      tweakFiles: new Map(),
      numbers: new Map(),
      arrayEntries: new Map(),
      files: new Map(),
      overlayExpectedCRC32s: new Map(),
    });

    expect(handler.getROMName()).toBe('Pokemon Diamond (U)');
    expect(handler.getROMCode()).toBe('ADAE');
    expect(handler.getROMType()).toBe(Gen4Constants.Type_DP);
  });
});
