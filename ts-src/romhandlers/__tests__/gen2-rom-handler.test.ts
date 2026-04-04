import { describe, it, expect } from 'vitest';
import {
  Gen2Factory,
  RomEntry,
  createDefaultRomEntry,
  checkRomEntry,
  detectRomInner,
  loadBasicPokeStats,
  saveBasicPokeStats,
  loadMoveData,
  saveMoveData,
} from '../gen2-rom-handler';
import { romCode } from '../gen1-rom-handler';
import * as GBConstants from '../../constants/gb-constants';
import * as Gen2Constants from '../../constants/gen2-constants';
import { Pokemon } from '../../pokemon/pokemon';
import { MoveCategory } from '../../pokemon/move-category';
import { StatChangeType } from '../../pokemon/stat-change-type';
import { StatChangeMoveType } from '../../pokemon/stat-change-move-type';
import { StatusMoveType } from '../../pokemon/status-move-type';
import { StatusType } from '../../pokemon/status-type';
import { CriticalChance } from '../../pokemon/critical-chance';
import { ExpCurve } from '../../pokemon/exp-curve';

// Helper to create a minimal Gen 2 ROM entry
function makeRomEntry(overrides: Partial<RomEntry> = {}): RomEntry {
  return {
    ...createDefaultRomEntry(),
    romCode: 'POKEMON_GLDAAUE',
    version: 0,
    nonJapanese: 1,
    crcInHeader: -1,
    ...overrides,
  };
}

// Helper: build synthetic ROM with a rom code at the right offset (0x13F)
function buildSyntheticRom(size: number, code: string, version: number = 0, nonJapanese: number = 1): Uint8Array {
  const rom = new Uint8Array(size);
  // Write code at romCodeOffset (0x13F)
  for (let i = 0; i < code.length; i++) {
    rom[GBConstants.romCodeOffset + i] = code.charCodeAt(i);
  }
  rom[GBConstants.versionOffset] = version;
  rom[GBConstants.jpFlagOffset] = nonJapanese;
  rom[GBConstants.crcOffset] = 0x00;
  rom[GBConstants.crcOffset + 1] = 0x00;
  return rom;
}

describe('Gen2RomHandler', () => {
  describe('Factory.isLoadable', () => {
    it('rejects empty data', () => {
      expect(Gen2Factory.isLoadable(new Uint8Array(0), [])).toBe(false);
    });

    it('rejects data larger than 8MB', () => {
      const huge = new Uint8Array(8 * 1024 * 1024 + 1);
      expect(Gen2Factory.isLoadable(huge, [])).toBe(false);
    });

    it('rejects data smaller than minRomSize', () => {
      const small = new Uint8Array(0x100);
      expect(Gen2Factory.isLoadable(small, [makeRomEntry()])).toBe(false);
    });

    it('rejects data with no matching ROM entry', () => {
      const rom = buildSyntheticRom(GBConstants.minRomSize, 'XXXXXX');
      expect(Gen2Factory.isLoadable(rom, [makeRomEntry()])).toBe(false);
    });

    it('accepts data matching a known ROM entry', () => {
      const entry = makeRomEntry({ romCode: 'ABCD' });
      const rom = buildSyntheticRom(GBConstants.minRomSize, 'ABCD');
      expect(Gen2Factory.isLoadable(rom, [entry])).toBe(true);
    });
  });

  describe('ROM signature detection', () => {
    it('romCode matches when code is present at correct offset', () => {
      const rom = buildSyntheticRom(0x200, 'GOLD');
      expect(romCode(rom, 'GOLD')).toBe(true);
    });

    it('romCode rejects when code differs', () => {
      const rom = buildSyntheticRom(0x200, 'GOLD');
      expect(romCode(rom, 'SILV')).toBe(false);
    });
  });

  describe('checkRomEntry', () => {
    it('returns null when no entries match', () => {
      const rom = buildSyntheticRom(0x200, 'UNKNOWN');
      expect(checkRomEntry(rom, [makeRomEntry({ romCode: 'MATCH' })])).toBeNull();
    });

    it('matches by romCode, version, and nonJapanese', () => {
      const rom = buildSyntheticRom(0x200, 'GLD', 0, 1);
      const entry = makeRomEntry({ romCode: 'GLD', version: 0, nonJapanese: 1 });
      expect(checkRomEntry(rom, [entry])).toBe(entry);
    });

    it('prefers specific CRC match over wildcard', () => {
      const rom = buildSyntheticRom(0x200, 'GLD', 0, 1);
      rom[GBConstants.crcOffset] = 0xDE;
      rom[GBConstants.crcOffset + 1] = 0xAD;

      const wildcardEntry = makeRomEntry({ romCode: 'GLD', crcInHeader: -1 });
      const specificEntry = makeRomEntry({ name: 'specific', romCode: 'GLD', crcInHeader: 0xDEAD });
      expect(checkRomEntry(rom, [wildcardEntry, specificEntry])).toBe(specificEntry);
    });
  });

  describe('detectRomInner', () => {
    it('rejects ROM smaller than minRomSize', () => {
      expect(detectRomInner(new Uint8Array(0x100), 0x100, [makeRomEntry()])).toBe(false);
    });

    it('rejects ROM larger than maxRomSize', () => {
      expect(detectRomInner(new Uint8Array(0x200001), 0x200001, [makeRomEntry()])).toBe(false);
    });
  });

  describe('Pokemon data parsing', () => {
    it('loads Gen 2 Pokemon stats from synthetic byte data', () => {
      const rom = new Uint8Array(0x100);
      const offset = 0x10;

      // HP at bsHPOffset=1
      rom[offset + Gen2Constants.bsHPOffset] = 39;
      rom[offset + Gen2Constants.bsAttackOffset] = 52;
      rom[offset + Gen2Constants.bsDefenseOffset] = 43;
      rom[offset + Gen2Constants.bsSpeedOffset] = 65;
      rom[offset + Gen2Constants.bsSpAtkOffset] = 60;
      rom[offset + Gen2Constants.bsSpDefOffset] = 50;
      // Primary type = FIRE (0x14)
      rom[offset + Gen2Constants.bsPrimaryTypeOffset] = 0x14;
      // Secondary type = FIRE (0x14) - same, so should be null
      rom[offset + Gen2Constants.bsSecondaryTypeOffset] = 0x14;
      rom[offset + Gen2Constants.bsCatchRateOffset] = 45;
      rom[offset + Gen2Constants.bsCommonHeldItemOffset] = 0;
      rom[offset + Gen2Constants.bsRareHeldItemOffset] = 103;
      rom[offset + Gen2Constants.bsGrowthCurveOffset] = 3; // MEDIUM_SLOW
      rom[offset + Gen2Constants.bsPicDimensionsOffset] = 0x55;

      const pkmn = new Pokemon();
      loadBasicPokeStats(pkmn, rom, offset);

      expect(pkmn.hp).toBe(39);
      expect(pkmn.attack).toBe(52);
      expect(pkmn.defense).toBe(43);
      expect(pkmn.speed).toBe(65);
      expect(pkmn.spatk).toBe(60);
      expect(pkmn.spdef).toBe(50);
      expect(pkmn.primaryType).toBe('FIRE');
      expect(pkmn.secondaryType).toBeNull(); // same as primary
      expect(pkmn.catchRate).toBe(45);
      expect(pkmn.commonHeldItem).toBe(0);
      expect(pkmn.rareHeldItem).toBe(103);
      expect(pkmn.growthCurve).toBe(ExpCurve.MEDIUM_SLOW);
      expect(pkmn.picDimensions).toBe(0x55);
      expect(pkmn.guaranteedHeldItem).toBe(-1);
      expect(pkmn.darkGrassHeldItem).toBe(-1);
    });

    it('correctly loads dual-typed Pokemon', () => {
      const rom = new Uint8Array(0x100);
      const offset = 0x10;
      rom[offset + Gen2Constants.bsPrimaryTypeOffset] = 0x15; // WATER
      rom[offset + Gen2Constants.bsSecondaryTypeOffset] = 0x19; // ICE
      rom[offset + Gen2Constants.bsGrowthCurveOffset] = 0; // MEDIUM_FAST

      const pkmn = new Pokemon();
      loadBasicPokeStats(pkmn, rom, offset);
      expect(pkmn.primaryType).toBe('WATER');
      expect(pkmn.secondaryType).toBe('ICE');
    });

    it('round-trips Pokemon stats via save then load', () => {
      const rom = new Uint8Array(0x100);
      const offset = 0x10;

      const original = new Pokemon();
      original.hp = 80;
      original.attack = 105;
      original.defense = 65;
      original.speed = 100;
      original.spatk = 60;
      original.spdef = 75;
      original.primaryType = 'WATER' as any;
      original.secondaryType = 'FIGHTING' as any;
      original.catchRate = 45;
      original.commonHeldItem = 10;
      original.rareHeldItem = 20;
      original.growthCurve = ExpCurve.SLOW;

      saveBasicPokeStats(original, rom, offset);

      const loaded = new Pokemon();
      loadBasicPokeStats(loaded, rom, offset);

      expect(loaded.hp).toBe(80);
      expect(loaded.attack).toBe(105);
      expect(loaded.defense).toBe(65);
      expect(loaded.speed).toBe(100);
      expect(loaded.spatk).toBe(60);
      expect(loaded.spdef).toBe(75);
      expect(loaded.primaryType).toBe('WATER');
      expect(loaded.secondaryType).toBe('FIGHTING');
      expect(loaded.catchRate).toBe(45);
      expect(loaded.commonHeldItem).toBe(10);
      expect(loaded.rareHeldItem).toBe(20);
      expect(loaded.growthCurve).toBe(ExpCurve.SLOW);
    });
  });

  describe('Move data parsing', () => {
    it('loads Gen 2 move data from synthetic bytes', () => {
      const rom = new Uint8Array(0x100);
      const movesOffset = 0x00;
      const moveIndex = 1;

      // Move data is 7 bytes per move: anim, effect, power, type, accuracy, pp, secondaryEffectChance
      const base = (moveIndex - 1) * 7;
      rom[base + 0] = 0x01; // animation
      rom[base + 1] = 0x00; // effect index (no effect)
      rom[base + 2] = 40;   // power
      rom[base + 3] = 0x00; // type = NORMAL
      rom[base + 4] = 255;  // accuracy
      rom[base + 5] = 35;   // pp
      rom[base + 6] = 0;    // secondary effect chance

      const move = loadMoveData(rom, movesOffset, moveIndex, 'Pound');
      expect(move.name).toBe('Pound');
      expect(move.number).toBe(1);
      expect(move.internalId).toBe(1);
      expect(move.power).toBe(40);
      expect(move.pp).toBe(35);
      expect(move.type).toBe('NORMAL');
      expect(move.hitratio).toBeCloseTo(100, 0);
      expect(move.category).toBe(MoveCategory.PHYSICAL);
    });

    it('classifies zero-power moves as STATUS', () => {
      const rom = new Uint8Array(0x1000);
      const moveIndex = 200;
      const base = (moveIndex - 1) * 7;
      rom[base] = 0x01;
      rom[base + 1] = 0x00;
      rom[base + 2] = 0;    // power = 0
      rom[base + 3] = 0x00;
      rom[base + 4] = 255;
      rom[base + 5] = 20;
      rom[base + 6] = 0;

      const move = loadMoveData(rom, 0, moveIndex, 'TestStatus');
      expect(move.category).toBe(MoveCategory.STATUS);
    });

    it('loads stat change effects (noDamageAtkPlusOneEffect)', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen2Constants.noDamageAtkPlusOneEffect;
      rom[base + 2] = 0;
      rom[base + 3] = 0x00;
      rom[base + 4] = 255;
      rom[base + 5] = 30;
      rom[base + 6] = 0;

      const move = loadMoveData(rom, 0, 1, 'SharpenTest');
      expect(move.statChanges[0].type).toBe(StatChangeType.ATTACK);
      expect(move.statChanges[0].stages).toBe(1);
      expect(move.statChangeMoveType).toBe(StatChangeMoveType.NO_DAMAGE_USER);
    });

    it('loads damage-target stat changes with secondary effect chance', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen2Constants.damageDefMinusOneEffect;
      rom[base + 2] = 60;
      rom[base + 3] = 0x00;
      rom[base + 4] = 255;
      rom[base + 5] = 20;
      rom[base + 6] = 77; // ~30% secondary effect chance

      const move = loadMoveData(rom, 0, 1, 'CrunchTest');
      expect(move.statChanges[0].type).toBe(StatChangeType.DEFENSE);
      expect(move.statChanges[0].stages).toBe(-1);
      expect(move.statChangeMoveType).toBe(StatChangeMoveType.DAMAGE_TARGET);
      expect(move.statChanges[0].percentChance).toBeGreaterThan(0);
    });

    it('loads sleep status effect', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen2Constants.noDamageSleepEffect;
      rom[base + 2] = 0;
      rom[base + 3] = 0x00;
      rom[base + 4] = 200;
      rom[base + 5] = 15;
      rom[base + 6] = 0;

      const move = loadMoveData(rom, 0, 1, 'SleepPowder');
      expect(move.statusMoveType).toBe(StatusMoveType.NO_DAMAGE);
      expect(move.statusType).toBe(StatusType.SLEEP);
    });

    it('loads toxic effect correctly', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen2Constants.toxicEffect;
      rom[base + 2] = 0;
      rom[base + 3] = 0x03; // POISON type
      rom[base + 4] = 200;
      rom[base + 5] = 10;
      rom[base + 6] = 0;

      const move = loadMoveData(rom, 0, 1, 'Toxic');
      expect(move.statusMoveType).toBe(StatusMoveType.NO_DAMAGE);
      expect(move.statusType).toBe(StatusType.TOXIC_POISON);
    });

    it('loads priority correctly for Quick Attack effect', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen2Constants.priorityHitEffectIndex;
      rom[base + 2] = 40;
      rom[base + 3] = 0x00;
      rom[base + 4] = 255;
      rom[base + 5] = 30;
      rom[base + 6] = 0;

      const move = loadMoveData(rom, 0, 1, 'QuickAttack');
      expect(move.priority).toBe(2);
    });

    it('loads charge moves correctly', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen2Constants.solarbeamEffect;
      rom[base + 2] = 120;
      rom[base + 3] = 0x16; // GRASS
      rom[base + 4] = 255;
      rom[base + 5] = 10;
      rom[base + 6] = 0;

      const move = loadMoveData(rom, 0, 1, 'SolarBeam');
      expect(move.isChargeMove).toBe(true);
    });

    it('loads recoil correctly', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen2Constants.damageRecoilEffect;
      rom[base + 2] = 120;
      rom[base + 3] = 0x00;
      rom[base + 4] = 255;
      rom[base + 5] = 15;
      rom[base + 6] = 0;

      const move = loadMoveData(rom, 0, 1, 'DoubleEdge');
      expect(move.recoilPercent).toBe(25);
    });

    it('round-trips Gen 2 move data via save then load', () => {
      const rom = new Uint8Array(0x100);
      const moveIndex = 1;
      const base = (moveIndex - 1) * 7;

      // Set up initial move data
      rom[base] = 0x01;
      rom[base + 1] = 0x00;
      rom[base + 2] = 95;   // power
      rom[base + 3] = 0x14; // FIRE
      rom[base + 4] = 255;  // accuracy
      rom[base + 5] = 15;   // pp
      rom[base + 6] = 0;

      const move = loadMoveData(rom, 0, moveIndex, 'Flamethrower');
      const rom2 = new Uint8Array(0x100);
      saveMoveData(rom2, 0, move);

      const reloaded = loadMoveData(rom2, 0, moveIndex, 'Flamethrower');
      expect(reloaded.power).toBe(95);
      expect(reloaded.pp).toBe(15);
      expect(reloaded.type).toBe('FIRE');
    });
  });
});
