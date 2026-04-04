import { describe, it, expect } from 'vitest';
import {
  Gen1Factory,
  RomEntry,
  createDefaultRomEntry,
  checkRomEntry,
  detectRomInner,
  loadBasicPokeStats,
  saveBasicPokeStats,
  loadMoveData,
  saveMoveData,
  readStringFromRom,
  translateString,
  readWord,
  writeWord,
  romSig,
  makeGBPointer,
  bankOf,
  calculateOffset,
  TextTables,
  createTextTables,
  readTextTable,
  lengthOfStringAt,
} from '../gen1-rom-handler';
import * as GBConstants from '../../constants/gb-constants';
import * as Gen1Constants from '../../constants/gen1-constants';
import { Pokemon } from '../../pokemon/pokemon';
import { MoveCategory } from '../../pokemon/move-category';
import { StatChangeType } from '../../pokemon/stat-change-type';
import { StatChangeMoveType } from '../../pokemon/stat-change-move-type';
import { StatusMoveType } from '../../pokemon/status-move-type';
import { StatusType } from '../../pokemon/status-type';
import { CriticalChance } from '../../pokemon/critical-chance';
import { ExpCurve, expCurveToByte } from '../../pokemon/exp-curve';

// Helper to create a minimal ROM entry for testing
function makeRomEntry(overrides: Partial<RomEntry> = {}): RomEntry {
  return {
    ...createDefaultRomEntry(),
    romName: 'POKEMON RED',
    version: 0,
    nonJapanese: 1,
    crcInHeader: -1,
    ...overrides,
  };
}

// Helper to build synthetic ROM data with a ROM signature at the right offset
function buildSyntheticRom(size: number, sig: string, version: number = 0, nonJapanese: number = 1): Uint8Array {
  const rom = new Uint8Array(size);
  // Write signature at romSigOffset (0x134)
  for (let i = 0; i < sig.length; i++) {
    rom[GBConstants.romSigOffset + i] = sig.charCodeAt(i);
  }
  // Write version
  rom[GBConstants.versionOffset] = version;
  // Write non-Japanese flag
  rom[GBConstants.jpFlagOffset] = nonJapanese;
  // CRC in header at 0x14E (big-endian)
  rom[GBConstants.crcOffset] = 0x00;
  rom[GBConstants.crcOffset + 1] = 0x00;
  return rom;
}

describe('Gen1RomHandler', () => {
  describe('Factory.isLoadable', () => {
    it('rejects empty data', () => {
      expect(Gen1Factory.isLoadable(new Uint8Array(0), [])).toBe(false);
    });

    it('rejects data larger than 8MB', () => {
      const huge = new Uint8Array(8 * 1024 * 1024 + 1);
      expect(Gen1Factory.isLoadable(huge, [])).toBe(false);
    });

    it('rejects data smaller than minRomSize', () => {
      const small = new Uint8Array(0x100);
      expect(Gen1Factory.isLoadable(small, [makeRomEntry()])).toBe(false);
    });

    it('rejects data with no matching ROM entry', () => {
      const rom = buildSyntheticRom(GBConstants.minRomSize, 'NOT A MATCH');
      expect(Gen1Factory.isLoadable(rom, [makeRomEntry()])).toBe(false);
    });

    it('accepts data matching a known ROM entry', () => {
      const rom = buildSyntheticRom(GBConstants.minRomSize, 'POKEMON RED');
      expect(Gen1Factory.isLoadable(rom, [makeRomEntry()])).toBe(true);
    });
  });

  describe('ROM signature detection', () => {
    it('romSig matches when signature is present at correct offset', () => {
      const rom = buildSyntheticRom(0x200, 'POKEMON RED');
      expect(romSig(rom, 'POKEMON RED')).toBe(true);
    });

    it('romSig rejects when signature differs', () => {
      const rom = buildSyntheticRom(0x200, 'POKEMON BLU');
      expect(romSig(rom, 'POKEMON RED')).toBe(false);
    });
  });

  describe('checkRomEntry', () => {
    it('returns null when no entries match', () => {
      const rom = buildSyntheticRom(0x200, 'UNKNOWN');
      expect(checkRomEntry(rom, [makeRomEntry()])).toBeNull();
    });

    it('matches by signature, version, and nonJapanese', () => {
      const rom = buildSyntheticRom(0x200, 'POKEMON RED', 0, 1);
      const entry = makeRomEntry({ romName: 'POKEMON RED', version: 0, nonJapanese: 1 });
      expect(checkRomEntry(rom, [entry])).toBe(entry);
    });

    it('prefers specific CRC match over wildcard', () => {
      const rom = buildSyntheticRom(0x200, 'POKEMON RED', 0, 1);
      // Set CRC in header to 0xABCD
      rom[GBConstants.crcOffset] = 0xAB;
      rom[GBConstants.crcOffset + 1] = 0xCD;

      const wildcardEntry = makeRomEntry({ romName: 'POKEMON RED', crcInHeader: -1 });
      const specificEntry = makeRomEntry({ name: 'specific', romName: 'POKEMON RED', crcInHeader: 0xABCD });
      expect(checkRomEntry(rom, [wildcardEntry, specificEntry])).toBe(specificEntry);
    });
  });

  describe('detectRomInner', () => {
    it('rejects ROM that is too small', () => {
      const rom = new Uint8Array(0x100);
      expect(detectRomInner(rom, rom.length, [makeRomEntry()])).toBe(false);
    });

    it('rejects ROM that is too large', () => {
      const rom = new Uint8Array(0x200001);
      expect(detectRomInner(rom, rom.length, [makeRomEntry()])).toBe(false);
    });
  });

  describe('Pokemon data parsing', () => {
    it('loads basic Pokemon stats from synthetic byte data', () => {
      const rom = new Uint8Array(0x100);
      const offset = 0x10;
      const entry = makeRomEntry();

      // HP at bsHPOffset=1
      rom[offset + Gen1Constants.bsHPOffset] = 45;
      // Attack at 2
      rom[offset + Gen1Constants.bsAttackOffset] = 49;
      // Defense at 3
      rom[offset + Gen1Constants.bsDefenseOffset] = 49;
      // Speed at 4
      rom[offset + Gen1Constants.bsSpeedOffset] = 45;
      // Special at 5
      rom[offset + Gen1Constants.bsSpecialOffset] = 65;
      // Primary type = GRASS (0x16)
      rom[offset + Gen1Constants.bsPrimaryTypeOffset] = 0x16;
      // Secondary type = POISON (0x03)
      rom[offset + Gen1Constants.bsSecondaryTypeOffset] = 0x03;
      // Catch rate
      rom[offset + Gen1Constants.bsCatchRateOffset] = 45;
      // Exp yield
      rom[offset + Gen1Constants.bsExpYieldOffset] = 64;
      // Growth curve: MEDIUM_SLOW = 3
      rom[offset + Gen1Constants.bsGrowthCurveOffset] = 3;
      // Front sprite pointer (little-endian word)
      rom[offset + Gen1Constants.bsFrontSpriteOffset] = 0x34;
      rom[offset + Gen1Constants.bsFrontSpriteOffset + 1] = 0x12;

      const pkmn = new Pokemon();
      loadBasicPokeStats(pkmn, rom, offset, entry);

      expect(pkmn.hp).toBe(45);
      expect(pkmn.attack).toBe(49);
      expect(pkmn.defense).toBe(49);
      expect(pkmn.speed).toBe(45);
      expect(pkmn.special).toBe(65);
      expect(pkmn.primaryType).toBe('GRASS');
      expect(pkmn.secondaryType).toBe('POISON');
      expect(pkmn.catchRate).toBe(45);
      expect(pkmn.expYield).toBe(64);
      expect(pkmn.growthCurve).toBe(ExpCurve.MEDIUM_SLOW);
      expect(pkmn.frontSpritePointer).toBe(0x1234);
      expect(pkmn.guaranteedHeldItem).toBe(-1);
      expect(pkmn.commonHeldItem).toBe(-1);
      expect(pkmn.rareHeldItem).toBe(-1);
    });

    it('sets secondaryType to null when both types are the same', () => {
      const rom = new Uint8Array(0x100);
      const offset = 0x10;
      rom[offset + Gen1Constants.bsPrimaryTypeOffset] = 0x00; // NORMAL
      rom[offset + Gen1Constants.bsSecondaryTypeOffset] = 0x00; // NORMAL

      const pkmn = new Pokemon();
      loadBasicPokeStats(pkmn, rom, offset, makeRomEntry());
      expect(pkmn.primaryType).toBe('NORMAL');
      expect(pkmn.secondaryType).toBeNull();
    });

    it('round-trips Pokemon stats via save then load', () => {
      const rom = new Uint8Array(0x100);
      const offset = 0x10;
      const entry = makeRomEntry();

      const original = new Pokemon();
      original.hp = 100;
      original.attack = 120;
      original.defense = 80;
      original.speed = 90;
      original.special = 110;
      original.primaryType = 'FIRE' as any;
      original.secondaryType = 'FLYING' as any;
      original.catchRate = 45;
      original.expYield = 200;
      original.growthCurve = ExpCurve.SLOW;

      saveBasicPokeStats(original, rom, offset, entry);

      const loaded = new Pokemon();
      loadBasicPokeStats(loaded, rom, offset, entry);

      expect(loaded.hp).toBe(100);
      expect(loaded.attack).toBe(120);
      expect(loaded.defense).toBe(80);
      expect(loaded.speed).toBe(90);
      expect(loaded.special).toBe(110);
      expect(loaded.primaryType).toBe('FIRE');
      expect(loaded.secondaryType).toBe('FLYING');
      expect(loaded.catchRate).toBe(45);
      expect(loaded.expYield).toBe(200);
      expect(loaded.growthCurve).toBe(ExpCurve.SLOW);
    });
  });

  describe('Move data parsing', () => {
    it('loads basic move data from synthetic bytes', () => {
      const rom = new Uint8Array(0x100);
      const movesOffset = 0x00;
      const moveIndex = 1;
      const entry = makeRomEntry();

      // Move data is 6 bytes per move: anim, effect, power, type, accuracy, pp
      // For move index 1, offset is (1-1)*6 = 0
      rom[0] = 0x01; // animation (non-zero means valid)
      rom[1] = 0x00; // effect index
      rom[2] = 40;   // power
      rom[3] = 0x00; // type = NORMAL
      rom[4] = 255;  // accuracy (255/255 * 100 = 100%)
      rom[5] = 35;   // pp

      const move = loadMoveData(rom, movesOffset, moveIndex, 'Pound', entry);
      expect(move.name).toBe('Pound');
      expect(move.internalId).toBe(1);
      expect(move.power).toBe(40);
      expect(move.pp).toBe(35);
      expect(move.type).toBe('NORMAL');
      expect(move.hitratio).toBeCloseTo(100, 0);
      expect(move.category).toBe(MoveCategory.PHYSICAL); // Normal is physical in Gen 1
    });

    it('classifies zero-power moves as STATUS', () => {
      const rom = new Uint8Array(0x100);
      const movesOffset = 0x00;
      // Use a move index that is NOT in noPowerNonStatusMoves
      const moveIndex = 200; // arbitrary, just needs to not be in the list
      const base = (moveIndex - 1) * 6;
      rom[base] = 0x01; // animation
      rom[base + 1] = 0x00; // effect
      rom[base + 2] = 0;    // power = 0
      rom[base + 3] = 0x00; // type
      rom[base + 4] = 255;
      rom[base + 5] = 20;

      const move = loadMoveData(rom, movesOffset, moveIndex, 'TestMove', makeRomEntry());
      expect(move.category).toBe(MoveCategory.STATUS);
    });

    it('loads stat change effects correctly', () => {
      const rom = new Uint8Array(0x1000);
      const movesOffset = 0x00;
      const moveIndex = 1;
      const base = (moveIndex - 1) * 6;
      rom[base] = 0x01;
      rom[base + 1] = Gen1Constants.noDamageAtkPlusOneEffect; // effect
      rom[base + 2] = 0;
      rom[base + 3] = 0x00;
      rom[base + 4] = 255;
      rom[base + 5] = 30;

      const move = loadMoveData(rom, movesOffset, moveIndex, 'SharpenTest', makeRomEntry());
      expect(move.statChanges[0].type).toBe(StatChangeType.ATTACK);
      expect(move.statChanges[0].stages).toBe(1);
      expect(move.statChangeMoveType).toBe(StatChangeMoveType.NO_DAMAGE_USER);
    });

    it('loads status effects for sleep moves', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen1Constants.noDamageSleepEffect;
      rom[base + 2] = 0;
      rom[base + 3] = 0x00;
      rom[base + 4] = 200;
      rom[base + 5] = 15;

      const move = loadMoveData(rom, 0, 1, 'SleepTest', makeRomEntry());
      expect(move.statusMoveType).toBe(StatusMoveType.NO_DAMAGE);
      expect(move.statusType).toBe(StatusType.SLEEP);
    });

    it('loads flinch percent for flinch effects', () => {
      const rom = new Uint8Array(0x100);
      const base = 0;
      rom[base] = 0x01;
      rom[base + 1] = Gen1Constants.flinch30PercentEffect;
      rom[base + 2] = 50;
      rom[base + 3] = 0x00;
      rom[base + 4] = 255;
      rom[base + 5] = 20;

      const move = loadMoveData(rom, 0, 1, 'FlinchTest', makeRomEntry());
      expect(move.flinchPercentChance).toBe(30.0);
    });

    it('round-trips move data via save then load', () => {
      const rom = new Uint8Array(0x100);
      const entry = makeRomEntry();
      const moveIndex = 1;

      // Create a move and save it
      const rom2 = new Uint8Array(0x100);
      rom2[0] = 0x01; // animation byte
      rom2[1] = 0x00; // effect
      rom2[2] = 80;   // power
      rom2[3] = 0x14; // type = FIRE
      rom2[4] = 255;  // accuracy
      rom2[5] = 15;   // pp

      const move = loadMoveData(rom2, 0, moveIndex, 'Flamethrower', entry);
      saveMoveData(rom, 0, move, entry);

      // Reload
      const reloaded = loadMoveData(rom, 0, moveIndex, 'Flamethrower', entry);
      expect(reloaded.power).toBe(80);
      expect(reloaded.pp).toBe(15);
      expect(reloaded.type).toBe('FIRE');
    });
  });

  describe('Text encoding/decoding', () => {
    it('builds a text table from lines', () => {
      const tables = createTextTables();
      readTextTable(tables, [
        '80=A',
        '81=B',
        '82=C',
      ]);
      expect(tables.tb[0x80]).toBe('A');
      expect(tables.tb[0x81]).toBe('B');
      expect(tables.tb[0x82]).toBe('C');
      expect(tables.d.get('A')).toBe(0x80);
    });

    it('reads a string from ROM data using the text table', () => {
      const tables = createTextTables();
      readTextTable(tables, [
        '80=H',
        '81=i',
      ]);
      // ROM data: [0x80, 0x81, 0x50 (terminator)]
      const rom = new Uint8Array([0x80, 0x81, GBConstants.stringTerminator]);
      const result = readStringFromRom(rom, 0, 10, false, tables);
      expect(result).toBe('Hi');
    });

    it('encodes hex escapes for unknown characters', () => {
      const tables = createTextTables();
      readTextTable(tables, ['80=A']);
      const rom = new Uint8Array([0x80, 0xFF, GBConstants.stringTerminator]);
      const result = readStringFromRom(rom, 0, 10, false, tables);
      expect(result).toBe('A\\xFF');
    });

    it('translates a string back to bytes', () => {
      const tables = createTextTables();
      readTextTable(tables, [
        '80=H',
        '81=e',
        '82=l',
        '83=o',
      ]);
      const bytes = translateString('Hello', tables);
      expect(bytes[0]).toBe(0x80);
      expect(bytes[1]).toBe(0x81);
      expect(bytes[2]).toBe(0x82);
      expect(bytes[3]).toBe(0x82);
      expect(bytes[4]).toBe(0x83);
    });

    it('translates hex escapes in strings', () => {
      const tables = createTextTables();
      const bytes = translateString('\\x50', tables);
      expect(bytes[0]).toBe(0x50);
    });
  });

  describe('Low-level ROM helpers', () => {
    it('readWord reads little-endian 16-bit value', () => {
      const data = new Uint8Array([0x34, 0x12]);
      expect(readWord(data, 0)).toBe(0x1234);
    });

    it('writeWord writes little-endian 16-bit value', () => {
      const data = new Uint8Array(2);
      writeWord(data, 0, 0xABCD);
      expect(data[0]).toBe(0xCD);
      expect(data[1]).toBe(0xAB);
    });

    it('makeGBPointer handles bank 0 offsets', () => {
      expect(makeGBPointer(0x100)).toBe(0x100);
    });

    it('makeGBPointer maps banked offsets correctly', () => {
      // Offset 0x8000 = bank 2, local offset 0x0000, so GB pointer = 0x4000
      expect(makeGBPointer(0x8000)).toBe(GBConstants.bankSize);
    });

    it('bankOf returns correct bank number', () => {
      expect(bankOf(0)).toBe(0);
      expect(bankOf(0x4000)).toBe(1);
      expect(bankOf(0x8000)).toBe(2);
    });

    it('calculateOffset reconstructs absolute offset from bank and pointer', () => {
      expect(calculateOffset(2, 0x4100)).toBe(0x8100);
    });

    it('lengthOfStringAt measures string length correctly', () => {
      const rom = new Uint8Array([0x80, 0x81, 0x82, GBConstants.stringTerminator, 0x00]);
      expect(lengthOfStringAt(rom, 0, false)).toBe(3);
    });
  });
});
