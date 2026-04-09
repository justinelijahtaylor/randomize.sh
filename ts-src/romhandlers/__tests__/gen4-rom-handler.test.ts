import { describe, it, expect } from 'vitest';
import {
  Gen4RomHandler,
  detectGen4Rom,
  romTypeFromCode,
  parseGen4RomEntries,
} from '../gen4-rom-handler';
import type { Gen4RomEntry } from '../gen4-rom-handler';
import * as Gen4Constants from '../../constants/gen4-constants';
import { NARCArchive } from '../../nds/narc-archive';
import { Pokemon } from '../../pokemon/pokemon';
import { Type } from '../../pokemon/type';
import { MoveCategory } from '../../pokemon/move-category';
import { StatChangeMoveType } from '../../pokemon/stat-change-move-type';
import { StatChangeType } from '../../pokemon/stat-change-type';
import { ExpCurve, expCurveToByte } from '../../pokemon/exp-curve';
import { RandomSource } from '../../utils/random-source';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestHandler(): Gen4RomHandler {
  const random = RandomSource.instance();
  return new Gen4RomHandler(random, null, []);
}

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
  data[Gen4Constants.bsPrimaryTypeOffset] = opts.primaryType ?? 0x0C;
  data[Gen4Constants.bsSecondaryTypeOffset] = opts.secondaryType ?? 0x03;
  data[Gen4Constants.bsCatchRateOffset] = opts.catchRate ?? 45;
  data[Gen4Constants.bsGrowthCurveOffset] = opts.growthCurve ?? 3;
  data[Gen4Constants.bsAbility1Offset] = opts.ability1 ?? 65;
  data[Gen4Constants.bsAbility2Offset] = opts.ability2 ?? 0;
  const ci = opts.commonHeldItem ?? 0;
  const ri = opts.rareHeldItem ?? 0;
  data[Gen4Constants.bsCommonHeldItemOffset] = ci & 0xff;
  data[Gen4Constants.bsCommonHeldItemOffset + 1] = (ci >> 8) & 0xff;
  data[Gen4Constants.bsRareHeldItemOffset] = ri & 0xff;
  data[Gen4Constants.bsRareHeldItemOffset + 1] = (ri >> 8) & 0xff;
  data[Gen4Constants.bsGenderRatioOffset] = opts.genderRatio ?? 31;
  return data;
}

function buildMoveData(opts: {
  effectIndex?: number;
  category?: number;
  power?: number;
  type?: number;
  hitratio?: number;
  pp?: number;
  target?: number;
  secondaryEffectChance?: number;
  flags?: number;
  priority?: number;
} = {}): Uint8Array {
  const data = new Uint8Array(16);
  const effect = opts.effectIndex ?? 0;
  data[0] = effect & 0xff;
  data[1] = (effect >> 8) & 0xff;
  data[2] = opts.category ?? 0;
  data[3] = opts.power ?? 0;
  data[4] = opts.type ?? 0;
  data[5] = opts.hitratio ?? 100;
  data[6] = opts.pp ?? 35;
  data[7] = opts.secondaryEffectChance ?? 0;
  const tgt = opts.target ?? 0;
  data[8] = tgt & 0xff;
  data[9] = (tgt >> 8) & 0xff;
  data[10] = opts.priority ?? 0;
  data[11] = opts.flags ?? 0;
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

describe('Gen4RomHandler - ROM detection', () => {
  it('should detect Diamond ROM code', () => {
    expect(detectGen4Rom('ADAE', 5)).toBe(true);
  });

  it('should detect Pearl ROM code', () => {
    expect(detectGen4Rom('APAE', 5)).toBe(true);
  });

  it('should detect Platinum ROM code', () => {
    expect(detectGen4Rom('CPUE', 0)).toBe(true);
  });

  it('should detect HeartGold ROM code', () => {
    expect(detectGen4Rom('IPKE', 0)).toBe(true);
  });

  it('should detect SoulSilver ROM code', () => {
    expect(detectGen4Rom('IPGE', 0)).toBe(true);
  });

  it('should reject unknown ROM code', () => {
    expect(detectGen4Rom('XXXX', 0)).toBe(false);
  });

  it('should reject null ROM code', () => {
    expect(detectGen4Rom(null, 0)).toBe(false);
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
    const dummyFile = new Uint8Array(44);
    const bulbasaurStats = buildPokemonStats({
      hp: 45,
      attack: 49,
      defense: 49,
      speed: 45,
      spatk: 65,
      spdef: 65,
      primaryType: 0x0C,
      secondaryType: 0x03,
      catchRate: 45,
      growthCurve: 3,
      ability1: 65,
      ability2: 0,
    });

    const files: Uint8Array[] = [dummyFile];
    files.push(bulbasaurStats);
    for (let i = 2; i <= Gen4Constants.pokemonCount; i++) {
      files.push(new Uint8Array(44));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Bulbasaur'];
    for (let i = 2; i <= Gen4Constants.pokemonCount; i++) {
      names.push(`Mon${i}`);
    }

    const handler = createTestHandler();
    handler.loadPokemonStatsForTest(narc, names);

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
      primaryType: 0x00,
      secondaryType: 0x00,
    });

    const handler = createTestHandler();
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

    const handler = createTestHandler();
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

    const handler = createTestHandler();
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
      primaryType: 0x0A,
      secondaryType: 0x02,
      catchRate: 200,
      ability1: 31,
      ability2: 18,
    });

    const handler = createTestHandler();
    const pkmn = new Pokemon();
    handler.loadBasicPokeStats(pkmn, stats);

    const newStats = new Uint8Array(44);
    handler.saveBasicPokeStats(pkmn, newStats);

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
    const poundData = buildMoveData({
      effectIndex: 0,
      category: 0,
      power: 40,
      type: 0x00,
      hitratio: 100,
      pp: 35,
      flags: 1,
    });

    const files: Uint8Array[] = [dummyFile, poundData];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      files.push(new Uint8Array(16));
    }

    const narc = wrapFilesInNarc(files);
    const names = ['', 'Pound'];
    for (let i = 2; i <= Gen4Constants.moveCount; i++) {
      names.push(`Move${i}`);
    }

    const handler = createTestHandler();
    handler.loadMovesForTest(narc, names);

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

  it('should parse move with stat-changing effect (no damage, atk+2)', () => {
    const dummyFile = new Uint8Array(16);
    const swordsData = buildMoveData({
      effectIndex: Gen4Constants.noDamageAtkPlusTwoEffect,
      category: 2,
      power: 0,
      type: 0x00,
      hitratio: 0,
      pp: 30,
      target: 16,
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

    const handler = createTestHandler();
    handler.loadMovesForTest(narc, names);

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
      category: 0,
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

    const handler = createTestHandler();
    handler.loadMovesForTest(narc, names);

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
      category: 1,
      power: 90,
      type: 0x0A,
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

    const handler = createTestHandler();
    handler.loadMovesForTest(narc, names);

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

    const handler = createTestHandler();
    handler.loadMovesForTest(narc, names);

    handler.moves[1]!.power = 80;
    handler.moves[1]!.pp = 15;

    handler.saveMovesForTest();

    const handler2 = createTestHandler();
    handler2.loadMovesForTest(narc, names);

    expect(handler2.moves[1]!.power).toBe(80);
    expect(handler2.moves[1]!.pp).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Tests: Constructor and basic accessors
// ---------------------------------------------------------------------------

describe('Gen4RomHandler - Accessors', () => {
  it('should return ROM name from entry', () => {
    const handler = createTestHandler();
    handler.romEntry.name = 'Diamond (U)';
    handler.romEntry.romCode = 'ADAE';
    handler.romEntry.romType = Gen4Constants.Type_DP;

    expect(handler.getROMName()).toBe('Pokemon Diamond (U)');
    expect(handler.getROMCode()).toBe('ADAE');
    expect(handler.getROMType()).toBe(Gen4Constants.Type_DP);
  });
});

// ---------------------------------------------------------------------------
// Tests: INI parser
// ---------------------------------------------------------------------------

describe('Gen4RomHandler - INI parser', () => {
  it('should parse a basic ROM entry', () => {
    const ini = `
[Diamond (U)]
Game=ADAE
Type=DP
Version=5
File<Text>=<msgdata/msg.narc, CC7250FE>
File<PokemonStats>=<poketool/personal/personal.narc, F963E181>
PokemonNamesTextOffset=362
Arm9CRC32=08E0337C
OverlayCRC32<6>=0AE6A693
StaticPokemonSupport=1
`;
    const entries = parseGen4RomEntries(ini);
    expect(entries.length).toBe(1);
    const e = entries[0];
    expect(e.name).toBe('Diamond (U)');
    expect(e.romCode).toBe('ADAE');
    expect(e.version).toBe(5);
    expect(e.romType).toBe(Gen4Constants.Type_DP);
    expect(e.files.get('Text')?.path).toBe('msgdata/msg.narc');
    expect(e.files.get('Text')?.expectedCRC32).toBe(0xCC7250FE);
    expect(e.numbers.get('PokemonNamesTextOffset')).toBe(362);
    expect(e.arm9ExpectedCRC32).toBe(0x08E0337C);
    expect(e.overlayExpectedCRC32s.get(6)).toBe(0x0AE6A693);
    expect(e.staticPokemonSupport).toBe(true);
  });

  it('should handle CopyFrom directive', () => {
    const ini = `
[Diamond (U)]
Game=ADAE
Type=DP
Version=5
PokemonNamesTextOffset=362
File<Text>=<msgdata/msg.narc, CC7250FE>

[Pearl (U)]
Game=APAE
Type=DP
Version=5
CopyText=1
CopyStaticPokemon=1
CopyFrom=Diamond (U)
`;
    const entries = parseGen4RomEntries(ini);
    expect(entries.length).toBe(2);
    const pearl = entries[1];
    expect(pearl.romCode).toBe('APAE');
    expect(pearl.numbers.get('PokemonNamesTextOffset')).toBe(362);
    expect(pearl.files.get('Text')?.path).toBe('msgdata/msg.narc');
  });

  it('should parse StaticPokemon entries', () => {
    const ini = `
[Test]
Game=TEST
Type=DP
Version=0
StaticPokemon{}={Species=[342:0x261, 342:0x2BE], Level=[342:0x2C0]}
`;
    const entries = parseGen4RomEntries(ini);
    expect(entries[0].staticPokemon.length).toBe(1);
    const sp = entries[0].staticPokemon[0];
    expect(sp.speciesEntries.length).toBe(2);
    expect(sp.speciesEntries[0].file).toBe(342);
    expect(sp.speciesEntries[0].offset).toBe(0x261);
    expect(sp.levelEntries.length).toBe(1);
    expect(sp.levelEntries[0].offset).toBe(0x2C0);
  });

  it('should parse array entries', () => {
    const ini = `
[Test]
Game=TEST
Type=DP
Version=0
DoublesTrainerClasses=[8, 23, 31, 47]
EliteFourIndices=[261, 262, 263, 264, 267]
`;
    const entries = parseGen4RomEntries(ini);
    expect(entries[0].arrayEntries.get('DoublesTrainerClasses')).toEqual([8, 23, 31, 47]);
    expect(entries[0].arrayEntries.get('EliteFourIndices')).toEqual([261, 262, 263, 264, 267]);
  });

  it('should parse TMText entries', () => {
    const ini = `
[Test]
Game=TEST
Type=DP
Version=0
TMText{}={42=[538:1], 48=[54:2]}
`;
    const entries = parseGen4RomEntries(ini);
    const tmTexts = entries[0].tmTexts;
    expect(tmTexts.get(42)?.length).toBe(1);
    expect(tmTexts.get(42)?.[0].textIndex).toBe(538);
    expect(tmTexts.get(42)?.[0].stringNumber).toBe(1);
    expect(tmTexts.get(48)?.length).toBe(1);
  });

  it('should parse the full gen4_offsets.ini without errors', () => {
    // This loads the real INI file
    const entries = parseGen4RomEntries(
      require('fs').readFileSync(
        require('path').resolve(__dirname, '../../../src/com/dabomstew/pkrandom/config/gen4_offsets.ini'),
        'utf-8'
      )
    );
    expect(entries.length).toBeGreaterThan(5);
    // Diamond (U) should be first
    expect(entries[0].name).toBe('Diamond (U)');
    expect(entries[0].romCode).toBe('ADAE');
    expect(entries[0].version).toBe(5);
    expect(entries[0].files.get('Text')).toBeDefined();
    expect(entries[0].staticPokemon.length).toBeGreaterThan(0);
  });
});
