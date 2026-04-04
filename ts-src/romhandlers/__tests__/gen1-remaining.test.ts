import { describe, it, expect } from 'vitest';
import {
  RomEntry,
  createDefaultRomEntry,
  TextTables,
  createTextTables,
  readTextTable,
  getGen1StaticPokemon,
  setGen1StaticPokemon,
  StaticPokemonEntry,
  getGen1IngameTrades,
  setGen1IngameTrades,
  getGen1RequiredFieldTMs,
  getGen1CurrentFieldTMs,
  setGen1FieldTMs,
  getGen1RegularFieldItems,
  setGen1RegularFieldItems,
  getGen1ShopItems,
  setGen1ShopItems,
  getGen1TrainerNames,
  setGen1TrainerNames,
  getGen1TrainerClassNames,
  setGen1TrainerClassNames,
  readGen1TypeEffectiveness,
  writeGen1TypeEffectiveness,
  TypeRelationship,
  getGen1ItemNames,
  randomizeGen1IntroPokemon,
  readFixedLengthString,
  writeFixedLengthString,
  readVariableLengthString,
  lengthOfStringAt,
} from '../gen1-rom-handler';
import * as GBConstants from '../../constants/gb-constants';
import * as Gen1Constants from '../../constants/gen1-constants';
import { Pokemon } from '../../pokemon/pokemon';
import { Effectiveness } from '../../pokemon/effectiveness';
import { StaticEncounter } from '../../pokemon/static-encounter';
import { IngameTrade } from '../../pokemon/ingame-trade';

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

// Helper to build text tables with basic ASCII-ish mapping
function makeTextTables(): TextTables {
  const tables = createTextTables();
  // Map 0x80-0xA0 to uppercase A-Z (enough for testing)
  for (let i = 0; i < 26; i++) {
    const hexStr = (0x80 + i).toString(16).toUpperCase();
    readTextTable(tables, [`${hexStr}=${String.fromCharCode(65 + i)}`]);
  }
  // Map 0xA0-0xBA to lowercase a-z
  for (let i = 0; i < 26; i++) {
    const hexStr = (0xA0 + i).toString(16).toUpperCase();
    readTextTable(tables, [`${hexStr}=${String.fromCharCode(97 + i)}`]);
  }
  return tables;
}

// Helper to create a mock Pokemon list
function makePokemonList(count: number): (Pokemon | null)[] {
  const list: (Pokemon | null)[] = [null]; // index 0 is null
  for (let i = 1; i <= count; i++) {
    const pkmn = new Pokemon();
    pkmn.number = i;
    pkmn.name = `PKMN${i}`;
    list.push(pkmn);
  }
  return list;
}

// Helper to write a string into ROM using text table
function writeStringToRom(
  rom: Uint8Array,
  offset: number,
  str: string,
  tables: TextTables,
): number {
  for (let i = 0; i < str.length; i++) {
    const code = tables.d.get(str[i]);
    if (code !== undefined) {
      rom[offset + i] = code;
    }
  }
  rom[offset + str.length] = GBConstants.stringTerminator;
  return offset + str.length + 1;
}

describe('Gen1 Remaining Features', () => {
  describe('Static Pokemon', () => {
    it('reads static Pokemon from ROM with synthetic data', () => {
      const rom = new Uint8Array(0x200);
      const pokemonList = makePokemonList(151);

      // pokeRBYToNumTable: internal ID 0x15 -> national #25 (Pikachu)
      const pokeRBYToNumTable = new Array(256).fill(0);
      pokeRBYToNumTable[0x15] = 25;

      // Static entry: species at offset 0x100, level at offset 0x101
      rom[0x100] = 0x15; // internal ID for Pikachu
      rom[0x101] = 30;   // level 30

      const staticEntries: StaticPokemonEntry[] = [
        { speciesOffsets: [0x100], levelOffsets: [0x101] },
      ];

      const romEntry = makeRomEntry();
      romEntry.entries.set('StaticPokemonSupport', 1);

      const result = getGen1StaticPokemon(rom, romEntry, staticEntries, pokemonList, pokeRBYToNumTable);
      expect(result).toHaveLength(1);
      expect(result[0].pkmn.number).toBe(25);
      expect(result[0].level).toBe(30);
    });

    it('returns empty array when StaticPokemonSupport is 0', () => {
      const rom = new Uint8Array(0x200);
      const pokemonList = makePokemonList(151);
      const pokeRBYToNumTable = new Array(256).fill(0);

      const romEntry = makeRomEntry();
      romEntry.entries.set('StaticPokemonSupport', 0);

      const result = getGen1StaticPokemon(rom, romEntry, [], pokemonList, pokeRBYToNumTable);
      expect(result).toHaveLength(0);
    });

    it('round-trips static Pokemon via set then get', () => {
      const rom = new Uint8Array(0x200);
      const pokemonList = makePokemonList(151);

      const pokeRBYToNumTable = new Array(256).fill(0);
      pokeRBYToNumTable[0x15] = 25;
      pokeRBYToNumTable[0x1A] = 150;

      const pokeNumToRBYTable = new Array(256).fill(0);
      pokeNumToRBYTable[25] = 0x15;
      pokeNumToRBYTable[150] = 0x1A;

      rom[0x100] = 0x15;
      rom[0x101] = 30;

      const staticEntries: StaticPokemonEntry[] = [
        { speciesOffsets: [0x100], levelOffsets: [0x101] },
      ];

      const romEntry = makeRomEntry();
      romEntry.entries.set('StaticPokemonSupport', 1);

      // Set to Mewtwo level 70
      const newStatics: StaticEncounter[] = [new StaticEncounter(pokemonList[150]!)];
      newStatics[0].level = 70;

      setGen1StaticPokemon(rom, romEntry, staticEntries, newStatics, pokeNumToRBYTable);

      const result = getGen1StaticPokemon(rom, romEntry, staticEntries, pokemonList, pokeRBYToNumTable);
      expect(result[0].pkmn.number).toBe(150);
      expect(result[0].level).toBe(70);
    });
  });

  describe('In-game Trades', () => {
    it('reads trades from ROM with synthetic data', () => {
      const tables = makeTextTables();
      const pokemonList = makePokemonList(151);

      const pokeRBYToNumTable = new Array(256).fill(0);
      pokeRBYToNumTable[0x15] = 25; // request Pikachu
      pokeRBYToNumTable[0x1A] = 100; // give Voltorb

      const nicknameLength = 5;
      const entryLength = nicknameLength + 3;
      const tableOffset = 0x100;

      const rom = new Uint8Array(0x200);
      rom[tableOffset] = 0x15; // requested
      rom[tableOffset + 1] = 0x1A; // given
      rom[tableOffset + 2] = 0x00; // padding byte
      // Write nickname "AB" at offset +3
      rom[tableOffset + 3] = 0x80; // A
      rom[tableOffset + 4] = 0x81; // B
      rom[tableOffset + 5] = GBConstants.stringTerminator;

      const romEntry = makeRomEntry();
      romEntry.entries.set('TradeTableOffset', tableOffset);
      romEntry.entries.set('TradeTableSize', 1);
      romEntry.entries.set('TradeNameLength', nicknameLength);
      romEntry.arrayEntries.set('TradesUnused', []);

      const result = getGen1IngameTrades(rom, romEntry, pokemonList, pokeRBYToNumTable, tables);
      expect(result).toHaveLength(1);
      expect(result[0].requestedPokemon.number).toBe(25);
      expect(result[0].givenPokemon.number).toBe(100);
      expect(result[0].nickname).toBe('AB');
    });

    it('skips unused trade entries', () => {
      const tables = makeTextTables();
      const pokemonList = makePokemonList(151);
      const pokeRBYToNumTable = new Array(256).fill(0);
      pokeRBYToNumTable[0x15] = 25;
      pokeRBYToNumTable[0x1A] = 100;

      const nicknameLength = 5;
      const entryLength = nicknameLength + 3;
      const tableOffset = 0x100;

      const rom = new Uint8Array(0x300);
      // Entry 0: unused
      // Entry 1: valid
      const entry1Offset = tableOffset + 1 * entryLength;
      rom[entry1Offset] = 0x15;
      rom[entry1Offset + 1] = 0x1A;
      rom[entry1Offset + 3] = 0x80; // A
      rom[entry1Offset + 4] = GBConstants.stringTerminator;

      const romEntry = makeRomEntry();
      romEntry.entries.set('TradeTableOffset', tableOffset);
      romEntry.entries.set('TradeTableSize', 2);
      romEntry.entries.set('TradeNameLength', nicknameLength);
      romEntry.arrayEntries.set('TradesUnused', [0]); // entry 0 is unused

      const result = getGen1IngameTrades(rom, romEntry, pokemonList, pokeRBYToNumTable, tables);
      expect(result).toHaveLength(1);
      expect(result[0].requestedPokemon.number).toBe(25);
    });
  });

  describe('Field TMs', () => {
    it('reads current field TMs from item offsets', () => {
      const rom = new Uint8Array(0x200);
      // Place TM01 at offset 0x100, TM50 at offset 0x110, non-TM at 0x120
      rom[0x100] = Gen1Constants.tmsStartIndex; // TM01
      rom[0x110] = Gen1Constants.tmsStartIndex + 49; // TM50
      rom[0x120] = 0x01; // Master Ball (not a TM)

      const itemOffsets = [0x100, 0x110, 0x120];
      const result = getGen1CurrentFieldTMs(rom, itemOffsets);
      expect(result).toEqual([1, 50]);
    });

    it('writes field TMs back to correct offsets', () => {
      const rom = new Uint8Array(0x200);
      rom[0x100] = Gen1Constants.tmsStartIndex; // TM01
      rom[0x110] = Gen1Constants.tmsStartIndex + 49; // TM50
      rom[0x120] = 0x01; // non-TM item

      const itemOffsets = [0x100, 0x110, 0x120];
      setGen1FieldTMs(rom, itemOffsets, [25, 10]);

      // TM25 and TM10 should be written
      expect(rom[0x100]).toBe(Gen1Constants.tmsStartIndex + 24);
      expect(rom[0x110]).toBe(Gen1Constants.tmsStartIndex + 9);
      // Non-TM should be unchanged
      expect(rom[0x120]).toBe(0x01);
    });

    it('returns hardcoded required field TMs', () => {
      const result = getGen1RequiredFieldTMs();
      expect(result).toEqual(Gen1Constants.requiredFieldTMs);
      // Ensure it's a copy, not the same reference
      result.push(999);
      expect(Gen1Constants.requiredFieldTMs).not.toContain(999);
    });
  });

  describe('Regular Field Items', () => {
    it('reads regular field items excluding TMs', () => {
      const rom = new Uint8Array(0x200);
      rom[0x100] = 0x04; // Poke Ball (allowed, not TM)
      rom[0x110] = Gen1Constants.tmsStartIndex; // TM01 (is TM)
      rom[0x120] = 0x04; // another Poke Ball

      const itemOffsets = [0x100, 0x110, 0x120];
      const isAllowed = (id: number) => id > 0 && id < Gen1Constants.tmsStartIndex + Gen1Constants.tmCount;
      const isTM = (id: number) => id >= Gen1Constants.tmsStartIndex && id < Gen1Constants.tmsStartIndex + Gen1Constants.tmCount;

      const result = getGen1RegularFieldItems(rom, itemOffsets, isAllowed, isTM);
      expect(result).toEqual([0x04, 0x04]);
    });

    it('writes regular field items back to ROM', () => {
      const rom = new Uint8Array(0x200);
      rom[0x100] = 0x04;
      rom[0x110] = Gen1Constants.tmsStartIndex;
      rom[0x120] = 0x04;

      const itemOffsets = [0x100, 0x110, 0x120];
      const isAllowed = (id: number) => id > 0 && id < Gen1Constants.tmsStartIndex + Gen1Constants.tmCount;
      const isTM = (id: number) => id >= Gen1Constants.tmsStartIndex && id < Gen1Constants.tmsStartIndex + Gen1Constants.tmCount;

      setGen1RegularFieldItems(rom, itemOffsets, [0x05, 0x06], isAllowed, isTM);
      expect(rom[0x100]).toBe(0x05);
      expect(rom[0x110]).toBe(Gen1Constants.tmsStartIndex); // TM unchanged
      expect(rom[0x120]).toBe(0x06);
    });
  });

  describe('Shops', () => {
    it('returns null for getGen1ShopItems (not implemented for Gen 1)', () => {
      expect(getGen1ShopItems()).toBeNull();
    });

    it('setGen1ShopItems is a no-op', () => {
      // Should not throw
      setGen1ShopItems(new Map());
    });
  });

  describe('Trainer Names', () => {
    it('reads singular trainer names from ROM', () => {
      const tables = makeTextTables();
      const rom = new Uint8Array(0x2000);

      // Build trainer class names at offset 0x1000
      // We need 47 names (tclassesCounts[1] = 47), with singularTrainers being read
      const namesOffset = 0x1000;
      let offset = namesOffset;
      const expectedNames: string[] = [];

      for (let j = 0; j < Gen1Constants.tclassesCounts[1]; j++) {
        const nameStr = String.fromCharCode(65 + (j % 26)); // A, B, C, ...
        const code = tables.d.get(nameStr);
        if (code !== undefined) {
          rom[offset] = code;
        }
        offset++;
        rom[offset] = GBConstants.stringTerminator;
        offset++;

        if (Gen1Constants.singularTrainers.includes(j)) {
          expectedNames.push(nameStr);
        }
      }

      const romEntry = makeRomEntry();
      romEntry.arrayEntries.set('TrainerClassNamesOffsets', [namesOffset]);

      const result = getGen1TrainerNames(rom, romEntry, tables);
      expect(result).toEqual(expectedNames);
      expect(result.length).toBe(Gen1Constants.singularTrainers.length);
    });
  });

  describe('Trainer Class Names', () => {
    it('reads trainer class names with single offset array', () => {
      const tables = makeTextTables();
      const rom = new Uint8Array(0x2000);

      const namesOffset = 0x1000;
      let offset = namesOffset;
      const expectedClassNames: string[] = [];

      for (let j = 0; j < Gen1Constants.tclassesCounts[1]; j++) {
        const nameStr = String.fromCharCode(65 + (j % 26));
        const code = tables.d.get(nameStr);
        if (code !== undefined) {
          rom[offset] = code;
        }
        offset++;
        rom[offset] = GBConstants.stringTerminator;
        offset++;

        // In single-offset mode, non-singular trainers are class names
        if (!Gen1Constants.singularTrainers.includes(j)) {
          expectedClassNames.push(nameStr);
        }
      }

      const romEntry = makeRomEntry();
      romEntry.arrayEntries.set('TrainerClassNamesOffsets', [namesOffset]);

      const result = getGen1TrainerClassNames(rom, romEntry, tables);
      expect(result).toEqual(expectedClassNames);
    });
  });

  describe('Type Effectiveness', () => {
    it('reads type effectiveness table from ROM', () => {
      const rom = new Uint8Array(0x200);
      const typeEffOffset = 0x100;

      // Entry: FIRE (0x14) attacks GRASS (0x16), effectiveness DOUBLE (20)
      rom[typeEffOffset] = 0x14; // FIRE
      rom[typeEffOffset + 1] = 0x16; // GRASS
      rom[typeEffOffset + 2] = 20; // DOUBLE

      // Entry: WATER (0x15) attacks FIRE (0x14), effectiveness DOUBLE (20)
      rom[typeEffOffset + 3] = 0x15; // WATER
      rom[typeEffOffset + 4] = 0x14; // FIRE
      rom[typeEffOffset + 5] = 20; // DOUBLE

      // Entry: NORMAL (0x00) attacks GHOST (0x08), effectiveness ZERO (0)
      rom[typeEffOffset + 6] = 0x00; // NORMAL
      rom[typeEffOffset + 7] = 0x08; // GHOST
      rom[typeEffOffset + 8] = 0; // ZERO

      // Terminator
      rom[typeEffOffset + 9] = 0xFF;

      const romEntry = makeRomEntry();
      romEntry.entries.set('TypeEffectivenessOffset', typeEffOffset);

      const result = readGen1TypeEffectiveness(rom, romEntry);
      expect(result).toHaveLength(3);

      expect(result[0].attacker).toBe('FIRE');
      expect(result[0].defender).toBe('GRASS');
      expect(result[0].effectiveness).toBe(Effectiveness.DOUBLE);

      expect(result[1].attacker).toBe('WATER');
      expect(result[1].defender).toBe('FIRE');
      expect(result[1].effectiveness).toBe(Effectiveness.DOUBLE);

      expect(result[2].attacker).toBe('NORMAL');
      expect(result[2].defender).toBe('GHOST');
      expect(result[2].effectiveness).toBe(Effectiveness.ZERO);
    });

    it('round-trips type effectiveness via write then read', () => {
      const rom = new Uint8Array(0x200);
      const typeEffOffset = 0x100;

      const romEntry = makeRomEntry();
      romEntry.entries.set('TypeEffectivenessOffset', typeEffOffset);

      const original: TypeRelationship[] = [
        { attacker: 'FIRE', defender: 'GRASS', effectiveness: Effectiveness.DOUBLE },
        { attacker: 'GRASS', defender: 'WATER', effectiveness: Effectiveness.DOUBLE },
        { attacker: 'WATER', defender: 'FIRE', effectiveness: Effectiveness.DOUBLE },
        { attacker: 'NORMAL', defender: 'GHOST', effectiveness: Effectiveness.ZERO },
      ];

      writeGen1TypeEffectiveness(rom, romEntry, original);

      // Write terminator after the entries
      const terminatorOffset = typeEffOffset + original.length * 3;
      rom[terminatorOffset] = 0xFF;

      const result = readGen1TypeEffectiveness(rom, romEntry);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual(original[0]);
      expect(result[1]).toEqual(original[1]);
      expect(result[2]).toEqual(original[2]);
      expect(result[3]).toEqual(original[3]);
    });

    it('handles HALF and NEUTRAL effectiveness values', () => {
      const rom = new Uint8Array(0x200);
      const typeEffOffset = 0x100;

      // HALF effectiveness (5)
      rom[typeEffOffset] = 0x14; // FIRE
      rom[typeEffOffset + 1] = 0x15; // WATER
      rom[typeEffOffset + 2] = 5; // HALF

      // NEUTRAL effectiveness (10)
      rom[typeEffOffset + 3] = 0x00; // NORMAL
      rom[typeEffOffset + 4] = 0x00; // NORMAL
      rom[typeEffOffset + 5] = 10; // NEUTRAL

      rom[typeEffOffset + 6] = 0xFF; // terminator

      const romEntry = makeRomEntry();
      romEntry.entries.set('TypeEffectivenessOffset', typeEffOffset);

      const result = readGen1TypeEffectiveness(rom, romEntry);
      expect(result).toHaveLength(2);
      expect(result[0].effectiveness).toBe(Effectiveness.HALF);
      expect(result[1].effectiveness).toBe(Effectiveness.NEUTRAL);
    });
  });

  describe('Item Names', () => {
    it('loads item names from ROM with HM/TM overrides', () => {
      const tables = makeTextTables();
      const rom = new Uint8Array(0x10000);
      const itemNamesOffset = 0x1000;

      // Write a few item names
      let offset = itemNamesOffset;
      // Item 1: "AB"
      rom[offset] = 0x80; // A
      rom[offset + 1] = 0x81; // B
      rom[offset + 2] = GBConstants.stringTerminator;
      offset += 3;
      // Item 2: "CD"
      rom[offset] = 0x82; // C
      rom[offset + 1] = 0x83; // D
      rom[offset + 2] = GBConstants.stringTerminator;
      offset += 3;

      const romEntry = makeRomEntry();
      romEntry.entries.set('ItemNamesOffset', itemNamesOffset);

      const result = getGen1ItemNames(rom, romEntry, tables);
      expect(result[0]).toBe('glitch');
      expect(result[1]).toBe('AB');
      expect(result[2]).toBe('CD');

      // Check HM overrides
      expect(result[Gen1Constants.hmsStartIndex]).toBe('HM01');

      // Check TM overrides
      expect(result[Gen1Constants.tmsStartIndex]).toBe('TM01');
      expect(result[Gen1Constants.tmsStartIndex + 49]).toBe('TM50');
    });
  });

  describe('Randomize Intro Pokemon', () => {
    it('writes random internal ID to intro offsets', () => {
      const rom = new Uint8Array(0x200);
      const romEntry = makeRomEntry();
      romEntry.entries.set('IntroPokemonOffset', 0x100);
      romEntry.entries.set('IntroCryOffset', 0x110);

      randomizeGen1IntroPokemon(rom, romEntry, 0x42);

      expect(rom[0x100]).toBe(0x42);
      expect(rom[0x110]).toBe(0x42);
    });
  });

  describe('String helpers', () => {
    it('readFixedLengthString reads up to given length', () => {
      const tables = makeTextTables();
      const rom = new Uint8Array(10);
      rom[0] = 0x80; // A
      rom[1] = 0x81; // B
      rom[2] = GBConstants.stringTerminator;
      rom[3] = 0x82; // C (should not be read)

      const result = readFixedLengthString(rom, 0, 10, tables);
      expect(result).toBe('AB');
    });

    it('writeFixedLengthString pads with terminators', () => {
      const tables = makeTextTables();
      const rom = new Uint8Array(10);

      writeFixedLengthString(rom, 'AB', 0, 5, tables);

      expect(rom[0]).toBe(0x80); // A
      expect(rom[1]).toBe(0x81); // B
      expect(rom[2]).toBe(GBConstants.stringTerminator);
      expect(rom[3]).toBe(GBConstants.stringTerminator);
      expect(rom[4]).toBe(GBConstants.stringTerminator);
    });

    it('readVariableLengthString reads until terminator', () => {
      const tables = makeTextTables();
      const rom = new Uint8Array(10);
      rom[0] = 0x80; // A
      rom[1] = 0x81; // B
      rom[2] = 0x82; // C
      rom[3] = GBConstants.stringTerminator;

      const result = readVariableLengthString(rom, 0, false, tables);
      expect(result).toBe('ABC');
    });
  });
});
