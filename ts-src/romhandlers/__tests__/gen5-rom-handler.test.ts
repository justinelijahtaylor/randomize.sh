import { describe, it, expect } from 'vitest';
import {
  Gen5RomHandler,
  detectGen5Rom,
  romTypeFromCode,
} from '../gen5-rom-handler';
import * as Gen5Constants from '../../constants/gen5-constants';
import { NARCArchive } from '../../nds/narc-archive';
import { Pokemon } from '../../pokemon/pokemon';
import { Type } from '../../pokemon/type';
import { MoveCategory } from '../../pokemon/move-category';
import { StatChangeMoveType } from '../../pokemon/stat-change-move-type';
import { StatChangeType } from '../../pokemon/stat-change-type';
import { StatusType } from '../../pokemon/status-type';
import { StatusMoveType } from '../../pokemon/status-move-type';
import { CriticalChance } from '../../pokemon/critical-chance';
import { ExpCurve } from '../../pokemon/exp-curve';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Pokemon stat byte array (Gen5 format, 60+ bytes).
 * Gen5 uses a different layout with 3 abilities, dark-grass held items, etc.
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
  ability3?: number;
  commonHeldItem?: number;
  rareHeldItem?: number;
  darkGrassHeldItem?: number;
  formeCount?: number;
  formeOffset?: number;
  formeSpriteOffset?: number;
} = {}): Uint8Array {
  const data = new Uint8Array(108); // Gen5 base stats entry is ~108 bytes
  data[Gen5Constants.bsHPOffset] = opts.hp ?? 45;
  data[Gen5Constants.bsAttackOffset] = opts.attack ?? 49;
  data[Gen5Constants.bsDefenseOffset] = opts.defense ?? 49;
  data[Gen5Constants.bsSpeedOffset] = opts.speed ?? 45;
  data[Gen5Constants.bsSpAtkOffset] = opts.spatk ?? 65;
  data[Gen5Constants.bsSpDefOffset] = opts.spdef ?? 65;
  data[Gen5Constants.bsPrimaryTypeOffset] = opts.primaryType ?? 0x0B; // GRASS (Gen5 table)
  data[Gen5Constants.bsSecondaryTypeOffset] = opts.secondaryType ?? 0x03; // POISON
  data[Gen5Constants.bsCatchRateOffset] = opts.catchRate ?? 45;
  data[Gen5Constants.bsGrowthCurveOffset] = opts.growthCurve ?? 3; // MEDIUM_SLOW
  data[Gen5Constants.bsAbility1Offset] = opts.ability1 ?? 65;
  data[Gen5Constants.bsAbility2Offset] = opts.ability2 ?? 0;
  data[Gen5Constants.bsAbility3Offset] = opts.ability3 ?? 34;
  // Held items (little-endian 16-bit)
  const common = opts.commonHeldItem ?? 0;
  const rare = opts.rareHeldItem ?? 0;
  const darkGrass = opts.darkGrassHeldItem ?? 0;
  data[Gen5Constants.bsCommonHeldItemOffset] = common & 0xff;
  data[Gen5Constants.bsCommonHeldItemOffset + 1] = (common >> 8) & 0xff;
  data[Gen5Constants.bsRareHeldItemOffset] = rare & 0xff;
  data[Gen5Constants.bsRareHeldItemOffset + 1] = (rare >> 8) & 0xff;
  data[Gen5Constants.bsDarkGrassHeldItemOffset] = darkGrass & 0xff;
  data[Gen5Constants.bsDarkGrassHeldItemOffset + 1] = (darkGrass >> 8) & 0xff;
  // Forme data
  data[Gen5Constants.bsFormeCountOffset] = opts.formeCount ?? 1;
  const fo = opts.formeOffset ?? 0;
  data[Gen5Constants.bsFormeOffset] = fo & 0xff;
  data[Gen5Constants.bsFormeOffset + 1] = (fo >> 8) & 0xff;
  const fso = opts.formeSpriteOffset ?? 0;
  data[Gen5Constants.bsFormeSpriteOffset] = fso & 0xff;
  data[Gen5Constants.bsFormeSpriteOffset + 1] = (fso >> 8) & 0xff;
  return data;
}

/**
 * Build a Gen5 Move data byte array (36+ bytes).
 * Gen5 move format:
 *  [0] type, [1] qualities, [2] category, [3] power, [4] hitratio, [5] pp,
 *  [6] priority, [7] hitMin/Max, [8-9] internalStatusType,
 *  [10] statusPercentChance, ..., [14] critStages, [15] flinchPercentChance,
 *  [16-17] effectIndex, [18] recoilOrAbsorbPercent, [19] ?,
 *  [20] target, [21-23] statChangeTypes, [24-26] statChangeStages,
 *  [27-29] statChangePercents, ..., [32-35] flags
 */
function buildMoveData(opts: {
  type?: number;
  qualities?: number;
  category?: number;
  power?: number;
  hitratio?: number;
  pp?: number;
  priority?: number;
  internalStatusType?: number;
  statusPercentChance?: number;
  critStages?: number;
  flinchPercent?: number;
  effectIndex?: number;
  recoilOrAbsorb?: number;
  target?: number;
  statChangeTypes?: number[];
  statChangeStages?: number[];
  statChangePercents?: number[];
  flags?: number;
} = {}): Uint8Array {
  const data = new Uint8Array(36);
  data[0] = opts.type ?? 0x00; // NORMAL
  data[1] = opts.qualities ?? 0;
  data[2] = opts.category ?? 1; // Physical (Gen5: 0=Status, 1=Physical, 2=Special)
  data[3] = opts.power ?? 40;
  data[4] = opts.hitratio ?? 100;
  data[5] = opts.pp ?? 35;
  data[6] = (opts.priority ?? 0) & 0xff;
  // [8-9] internal status type
  const ist = opts.internalStatusType ?? 0;
  data[8] = ist & 0xff;
  data[9] = (ist >> 8) & 0xff;
  data[10] = opts.statusPercentChance ?? 0;
  data[14] = opts.critStages ?? 0;
  data[15] = opts.flinchPercent ?? 0;
  // [16-17] effectIndex
  const ei = opts.effectIndex ?? 0;
  data[16] = ei & 0xff;
  data[17] = (ei >> 8) & 0xff;
  data[18] = (opts.recoilOrAbsorb ?? 0) & 0xff;
  data[20] = opts.target ?? 0;
  // stat changes
  const sct = opts.statChangeTypes ?? [0, 0, 0];
  const scs = opts.statChangeStages ?? [0, 0, 0];
  const scp = opts.statChangePercents ?? [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    data[21 + i] = sct[i] & 0xff;
    data[24 + i] = scs[i] & 0xff;
    data[27 + i] = scp[i] & 0xff;
  }
  // [32-35] flags
  const fl = opts.flags ?? 0;
  data[32] = fl & 0xff;
  data[33] = (fl >> 8) & 0xff;
  data[34] = (fl >> 16) & 0xff;
  data[35] = (fl >> 24) & 0xff;
  return data;
}

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

describe('Gen5RomHandler - ROM detection', () => {
  it('should detect Black ROM code', () => {
    expect(detectGen5Rom('IRBO')).toBe(true);
  });

  it('should detect White ROM code', () => {
    expect(detectGen5Rom('IRAO')).toBe(true);
  });

  it('should detect Black 2 ROM code', () => {
    expect(detectGen5Rom('IREO')).toBe(true);
  });

  it('should detect White 2 ROM code', () => {
    expect(detectGen5Rom('IRDO')).toBe(true);
  });

  it('should reject unknown ROM code', () => {
    expect(detectGen5Rom('ZZZZ')).toBe(false);
  });

  it('should reject null ROM code', () => {
    expect(detectGen5Rom(null)).toBe(false);
  });

  it('should determine BW type from code', () => {
    expect(romTypeFromCode('IRBO')).toBe(Gen5Constants.Type_BW);
    expect(romTypeFromCode('IRAO')).toBe(Gen5Constants.Type_BW);
  });

  it('should determine BW2 type from code', () => {
    expect(romTypeFromCode('IREO')).toBe(Gen5Constants.Type_BW2);
    expect(romTypeFromCode('IRDO')).toBe(Gen5Constants.Type_BW2);
  });
});

// ---------------------------------------------------------------------------
// Tests: Pokemon stat parsing
// ---------------------------------------------------------------------------

describe('Gen5RomHandler - Pokemon stat parsing', () => {
  it('should parse basic pokemon stats from synthetic NARC data', () => {
    const dummyFile = new Uint8Array(108);
    const snivyStats = buildPokemonStats({
      hp: 45,
      attack: 45,
      defense: 55,
      speed: 63,
      spatk: 45,
      spdef: 55,
      primaryType: 0x0B, // GRASS (Gen5 type table)
      secondaryType: 0x0B, // GRASS (same = single type)
      catchRate: 45,
      growthCurve: 3,
      ability1: 65,
      ability2: 0,
      ability3: 34,
    });

    const files: Uint8Array[] = [dummyFile];
    files.push(snivyStats);
    for (let i = 2; i <= Gen5Constants.pokemonCount; i++) {
      files.push(new Uint8Array(108));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Snivy'];
    for (let i = 2; i <= Gen5Constants.pokemonCount; i++) {
      names.push(`Mon${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadPokemonStats(narc, names);

    const poke = handler.pokes[1];
    expect(poke).not.toBeNull();
    expect(poke!.name).toBe('Snivy');
    expect(poke!.hp).toBe(45);
    expect(poke!.attack).toBe(45);
    expect(poke!.defense).toBe(55);
    expect(poke!.speed).toBe(63);
    expect(poke!.spatk).toBe(45);
    expect(poke!.spdef).toBe(55);
    expect(poke!.primaryType).toBe(Type.GRASS);
    expect(poke!.secondaryType).toBeNull();
    expect(poke!.catchRate).toBe(45);
    expect(poke!.ability1).toBe(65);
    expect(poke!.ability2).toBe(0);
    expect(poke!.ability3).toBe(34);
  });

  it('should parse dual-type pokemon correctly', () => {
    const stats = buildPokemonStats({
      primaryType: 0x0A, // WATER (Gen5 type table)
      secondaryType: 0x02, // FLYING
    });

    const handler = new Gen5RomHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    expect(pkmn.primaryType).toBe(Type.WATER);
    expect(pkmn.secondaryType).toBe(Type.FLYING);
  });

  it('should parse dark-grass held item for Gen5', () => {
    const stats = buildPokemonStats({
      commonHeldItem: 100,
      rareHeldItem: 200,
      darkGrassHeldItem: 300,
    });

    const handler = new Gen5RomHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    expect(pkmn.guaranteedHeldItem).toBe(0);
    expect(pkmn.commonHeldItem).toBe(100);
    expect(pkmn.rareHeldItem).toBe(200);
    expect(pkmn.darkGrassHeldItem).toBe(300);
  });

  it('should parse guaranteed held item when both items match', () => {
    const stats = buildPokemonStats({
      commonHeldItem: 150,
      rareHeldItem: 150,
      darkGrassHeldItem: 0,
    });

    const handler = new Gen5RomHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    expect(pkmn.guaranteedHeldItem).toBe(150);
    expect(pkmn.commonHeldItem).toBe(0);
    expect(pkmn.rareHeldItem).toBe(0);
    expect(pkmn.darkGrassHeldItem).toBe(0);
  });

  it('should round-trip save and reload pokemon stats', () => {
    const stats = buildPokemonStats({
      hp: 100,
      attack: 130,
      defense: 60,
      speed: 110,
      spatk: 80,
      spdef: 50,
      primaryType: 0x09, // FIRE (Gen5 type table)
      secondaryType: 0x01, // FIGHTING
      catchRate: 90,
      ability1: 5,
      ability2: 10,
      ability3: 15,
    });

    const handler = new Gen5RomHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    const newStats = new Uint8Array(108);
    handler.saveBasicPokeStats(pkmn, newStats);

    const pkmn2 = new Pokemon();
    handler.loadBasicPokeStats(pkmn2, newStats);

    expect(pkmn2.hp).toBe(100);
    expect(pkmn2.attack).toBe(130);
    expect(pkmn2.defense).toBe(60);
    expect(pkmn2.speed).toBe(110);
    expect(pkmn2.spatk).toBe(80);
    expect(pkmn2.spdef).toBe(50);
    expect(pkmn2.primaryType).toBe(Type.FIRE);
    expect(pkmn2.secondaryType).toBe(Type.FIGHTING);
    expect(pkmn2.catchRate).toBe(90);
    expect(pkmn2.ability1).toBe(5);
    expect(pkmn2.ability2).toBe(10);
    expect(pkmn2.ability3).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Tests: Move data parsing
// ---------------------------------------------------------------------------

describe('Gen5RomHandler - Move data parsing', () => {
  it('should parse basic move data from synthetic NARC', () => {
    const dummyFile = new Uint8Array(36);
    // Tackle-like move
    const tackleData = buildMoveData({
      type: 0x00, // NORMAL
      category: 1, // Physical
      power: 50,
      hitratio: 100,
      pp: 35,
      flags: 1, // makes contact
    });

    const files: Uint8Array[] = [dummyFile, tackleData];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      files.push(new Uint8Array(36));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Tackle'];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadMoves(narc, names);

    const move = handler.moves[1];
    expect(move).not.toBeNull();
    expect(move!.name).toBe('Tackle');
    expect(move!.number).toBe(1);
    expect(move!.power).toBe(50);
    expect(move!.pp).toBe(35);
    expect(move!.hitratio).toBe(100);
    expect(move!.type).toBe(Type.NORMAL);
    expect(move!.category).toBe(MoveCategory.PHYSICAL);
    expect(move!.makesContact).toBe(true);
  });

  it('should parse move with DAMAGE_TARGET stat change quality', () => {
    const dummyFile = new Uint8Array(36);
    const moveData = buildMoveData({
      type: 0x11, // DARK
      qualities: Gen5Constants.damageTargetDebuffQuality,
      category: 1, // Physical
      power: 80,
      hitratio: 100,
      pp: 15,
      statChangeTypes: [StatChangeType.DEFENSE, 0, 0],
      statChangeStages: [0xFF, 0, 0], // -1 as signed byte
      statChangePercents: [20, 0, 0],
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      files.push(new Uint8Array(36));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Crunch'];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadMoves(narc, names);

    const move = handler.moves[1];
    expect(move).not.toBeNull();
    expect(move!.statChangeMoveType).toBe(StatChangeMoveType.DAMAGE_TARGET);
    expect(move!.statChanges[0].type).toBe(StatChangeType.DEFENSE);
    expect(move!.statChanges[0].stages).toBe(-1);
    expect(move!.statChanges[0].percentChance).toBe(20);
  });

  it('should parse move with critical hit guarantee', () => {
    const dummyFile = new Uint8Array(36);
    const moveData = buildMoveData({
      critStages: 6,
      power: 40,
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      files.push(new Uint8Array(36));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'StormThrow'];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadMoves(narc, names);

    expect(handler.moves[1]!.criticalChance).toBe(CriticalChance.GUARANTEED);
  });

  it('should parse move with increased crit chance', () => {
    const dummyFile = new Uint8Array(36);
    const moveData = buildMoveData({
      critStages: 1,
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      files.push(new Uint8Array(36));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'SlashLike'];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadMoves(narc, names);

    expect(handler.moves[1]!.criticalChance).toBe(CriticalChance.INCREASED);
  });

  it('should parse move flags (contact, charge, recharge, punch, sound)', () => {
    const dummyFile = new Uint8Array(36);
    // flags: contact(1) | punch(0x80) = 0x81
    const moveData = buildMoveData({
      flags: 0x81,
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      files.push(new Uint8Array(36));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'DrainPunch'];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadMoves(narc, names);

    const move = handler.moves[1];
    expect(move!.makesContact).toBe(true);
    expect(move!.isPunchMove).toBe(true);
    expect(move!.isChargeMove).toBe(false);
    expect(move!.isRechargeMove).toBe(false);
    expect(move!.isSoundMove).toBe(false);
  });

  it('should parse status move (no damage, status quality)', () => {
    const dummyFile = new Uint8Array(36);
    const moveData = buildMoveData({
      category: 0, // Status
      power: 0,
      qualities: Gen5Constants.noDamageStatusQuality,
      internalStatusType: StatusType.PARALYZE,
      statusPercentChance: 100,
      target: 0,
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      files.push(new Uint8Array(36));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'ThunderWave'];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadMoves(narc, names);

    const move = handler.moves[1];
    expect(move!.category).toBe(MoveCategory.STATUS);
    expect(move!.statusType).toBe(StatusType.PARALYZE);
    expect(move!.statusMoveType).toBe(StatusMoveType.NO_DAMAGE);
    expect(move!.statusPercentChance).toBe(100);
  });

  it('should parse absorb move (damageAbsorbQuality)', () => {
    const dummyFile = new Uint8Array(36);
    const moveData = buildMoveData({
      qualities: Gen5Constants.damageAbsorbQuality,
      recoilOrAbsorb: 50,
      power: 75,
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      files.push(new Uint8Array(36));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'GigaDrain'];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadMoves(narc, names);

    expect(handler.moves[1]!.absorbPercent).toBe(50);
    expect(handler.moves[1]!.recoilPercent).toBe(0);
  });

  it('should save and verify move data', () => {
    const dummyFile = new Uint8Array(36);
    const moveData = buildMoveData({
      power: 60,
      pp: 20,
      hitratio: 95,
    });

    const files: Uint8Array[] = [dummyFile, moveData];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      files.push(new Uint8Array(36));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'TestMove'];
    for (let i = 2; i <= Gen5Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = new Gen5RomHandler();
    handler.loadMoves(narc, names);

    // Modify move
    handler.moves[1]!.power = 90;
    handler.moves[1]!.pp = 10;

    // Save
    handler.saveMoves();

    // Re-read from the narc
    const handler2 = new Gen5RomHandler();
    handler2.loadMoves(narc, names);

    expect(handler2.moves[1]!.power).toBe(90);
    expect(handler2.moves[1]!.pp).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// Tests: Accessors
// ---------------------------------------------------------------------------

describe('Gen5RomHandler - Accessors', () => {
  it('should return ROM name from entry', () => {
    const handler = new Gen5RomHandler({
      name: 'Black (U)',
      romCode: 'IRBO',
      version: 0,
      romType: Gen5Constants.Type_BW,
      arm9ExpectedCRC32: 0,
      staticPokemonSupport: false,
      copyStaticPokemon: false,
      copyRoamingPokemon: false,
      copyTradeScripts: false,
      isBlack: true,
      strings: new Map(),
      numbers: new Map(),
      tweakFiles: new Map(),
      arrayEntries: new Map(),
      offsetArrayEntries: new Map(),
      files: new Map(),
      overlayExpectedCRC32s: new Map(),
    });

    expect(handler.getROMName()).toBe('Pokemon Black (U)');
    expect(handler.getROMCode()).toBe('IRBO');
    expect(handler.getROMType()).toBe(Gen5Constants.Type_BW);
  });
});
