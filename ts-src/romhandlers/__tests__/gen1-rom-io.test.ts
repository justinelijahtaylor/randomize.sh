import { describe, it, expect } from 'vitest';
import {
  RomEntry,
  createDefaultRomEntry,
  checkRomEntry,
  createTextTables,
  readTextTable,
  TextTables,
  loadBasicPokeStats,
  saveBasicPokeStats,
  loadMoveData,
  saveMoveData,
  loadPokedexOrder,
  readPokemonNames,
  readMoveNames,
  loadAllPokemonStats,
  saveAllPokemonStats,
  loadAllMoves,
  saveAllMoves,
  populateEvolutions,
  readFixedLengthString,
  writeFixedLengthString,
  readVariableLengthString,
  parseGen1OffsetsIni,
  loadGen1Rom,
  saveGen1Rom,
  getROMName,
  getROMCode,
  getSupportLevel,
  isRomValid,
  printRomDiagnostics,
  readWord,
  writeWord,
  PokedexMapping,
} from '../gen1-rom-handler';
import * as GBConstants from '../../constants/gb-constants';
import * as Gen1Constants from '../../constants/gen1-constants';
import { Pokemon } from '../../pokemon/pokemon';
import { ExpCurve, expCurveToByte } from '../../pokemon/exp-curve';
import { EvolutionType } from '../../pokemon/evolution-type';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function buildSyntheticRom(
  size: number,
  sig: string,
  version: number = 0,
  nonJapanese: number = 1,
): Uint8Array {
  const rom = new Uint8Array(size);
  for (let i = 0; i < sig.length; i++) {
    rom[GBConstants.romSigOffset + i] = sig.charCodeAt(i);
  }
  rom[GBConstants.versionOffset] = version;
  rom[GBConstants.jpFlagOffset] = nonJapanese;
  rom[GBConstants.crcOffset] = 0x00;
  rom[GBConstants.crcOffset + 1] = 0x00;
  return rom;
}

function makeTextTables(): TextTables {
  const tables = createTextTables();
  // Minimal ASCII-like table for testing
  const lines: string[] = [];
  for (let i = 0; i < 26; i++) {
    lines.push(
      (0x80 + i).toString(16).toUpperCase() +
        '=' +
        String.fromCharCode(65 + i),
    );
  }
  // Lowercase
  for (let i = 0; i < 26; i++) {
    lines.push(
      (0xa0 + i).toString(16).toUpperCase() +
        '=' +
        String.fromCharCode(97 + i),
    );
  }
  // Space
  lines.push('7F= ');
  readTextTable(tables, lines);
  return tables;
}

/**
 * Build a ROM with the minimum structures needed for bulk loading.
 * Sets up pokedex order, Pokemon stats, Pokemon names, move data, move names,
 * and evolution/moveset pointers.
 */
function buildTestRom(): {
  rom: Uint8Array;
  entry: RomEntry;
  tables: TextTables;
} {
  const PKMN_COUNT = 5; // 5 internal entries, 3 national dex
  const POKEDEX_COUNT = 3;
  const MOVE_COUNT = 3;
  const ROM_SIZE = 0x10000; // 64KB

  const rom = new Uint8Array(ROM_SIZE);

  // Set up header
  const sig = 'POKEMON RED';
  for (let i = 0; i < sig.length; i++) {
    rom[GBConstants.romSigOffset + i] = sig.charCodeAt(i);
  }
  rom[GBConstants.versionOffset] = 0;
  rom[GBConstants.jpFlagOffset] = 1;

  const tables = makeTextTables();

  // Layout:
  // 0x1000: pokedex order (5 bytes)
  // 0x2000: pokemon names (5 * 10 bytes)
  // 0x3000: pokemon stats (3 * 0x1C bytes)
  // 0x4000: move data (3 * 6 bytes)
  // 0x5000: move names (variable length, terminated)
  // 0x6000: mew stats (0x1C bytes)
  // 0x7000: evolution/moveset pointers (5 * 2 bytes)
  // 0x7100: evolution/moveset data

  const POKEDEX_ORDER_OFFSET = 0x1000;
  const POKEMON_NAMES_OFFSET = 0x2000;
  const POKEMON_NAMES_LENGTH = 10;
  const POKEMON_STATS_OFFSET = 0x3000;
  const MOVE_DATA_OFFSET = 0x4000;
  const MOVE_NAMES_OFFSET = 0x5000;
  const MEW_STATS_OFFSET = 0x6000;
  const MOVESETS_TABLE_OFFSET = 0x7000;
  const MOVESETS_DATA_OFFSET = 0x7100;

  // Pokedex order: internal ID -> national dex number
  // Internal 1 -> national 1 (Bulbasaur)
  // Internal 2 -> national 2 (Ivysaur)
  // Internal 3 -> national 3 (Venusaur)
  // Internal 4 -> national 0 (invalid/padding)
  // Internal 5 -> national 0 (invalid/padding)
  rom[POKEDEX_ORDER_OFFSET + 0] = 1; // internal 1 -> dex 1
  rom[POKEDEX_ORDER_OFFSET + 1] = 2; // internal 2 -> dex 2
  rom[POKEDEX_ORDER_OFFSET + 2] = 3; // internal 3 -> dex 3
  rom[POKEDEX_ORDER_OFFSET + 3] = 0; // padding
  rom[POKEDEX_ORDER_OFFSET + 4] = 0; // padding

  // Write Pokemon names for each internal ID
  // Internal 1: "AAA"
  writeName(rom, POKEMON_NAMES_OFFSET + 0 * POKEMON_NAMES_LENGTH, 'AAA', tables);
  // Internal 2: "BBB"
  writeName(rom, POKEMON_NAMES_OFFSET + 1 * POKEMON_NAMES_LENGTH, 'BBB', tables);
  // Internal 3: "CCC"
  writeName(rom, POKEMON_NAMES_OFFSET + 2 * POKEMON_NAMES_LENGTH, 'CCC', tables);
  // Internal 4: empty
  writeName(rom, POKEMON_NAMES_OFFSET + 3 * POKEMON_NAMES_LENGTH, '', tables);
  // Internal 5: empty
  writeName(rom, POKEMON_NAMES_OFFSET + 4 * POKEMON_NAMES_LENGTH, '', tables);

  // Write Pokemon stats for dex 1, 2, 3
  for (let dexNum = 1; dexNum <= POKEDEX_COUNT; dexNum++) {
    const offset =
      POKEMON_STATS_OFFSET + (dexNum - 1) * Gen1Constants.baseStatsEntrySize;
    rom[offset + Gen1Constants.bsHPOffset] = 40 + dexNum * 5;
    rom[offset + Gen1Constants.bsAttackOffset] = 50 + dexNum * 3;
    rom[offset + Gen1Constants.bsDefenseOffset] = 45 + dexNum * 2;
    rom[offset + Gen1Constants.bsSpeedOffset] = 60 + dexNum;
    rom[offset + Gen1Constants.bsSpecialOffset] = 55 + dexNum * 4;
    rom[offset + Gen1Constants.bsPrimaryTypeOffset] = 0x16; // GRASS
    rom[offset + Gen1Constants.bsSecondaryTypeOffset] = 0x03; // POISON
    rom[offset + Gen1Constants.bsCatchRateOffset] = 45;
    rom[offset + Gen1Constants.bsExpYieldOffset] = 64;
    rom[offset + Gen1Constants.bsGrowthCurveOffset] = 3; // MEDIUM_SLOW
  }

  // Write move data (3 moves)
  for (let m = 1; m <= MOVE_COUNT; m++) {
    const base = MOVE_DATA_OFFSET + (m - 1) * 6;
    rom[base + 0] = m; // animation (non-zero = valid)
    rom[base + 1] = 0; // effect
    rom[base + 2] = 40 + m * 10; // power
    rom[base + 3] = 0x00; // type = NORMAL
    rom[base + 4] = 255; // accuracy
    rom[base + 5] = 30 + m * 5; // pp
  }

  // Write move names (variable-length, terminated by 0x50)
  let nameOff = MOVE_NAMES_OFFSET;
  const moveNameStrings = ['', 'Hit', 'Slash', 'Burn'];
  for (let m = 1; m <= MOVE_COUNT; m++) {
    const nameBytes = encodeString(moveNameStrings[m], tables);
    rom.set(nameBytes, nameOff);
    nameOff += nameBytes.length;
    rom[nameOff] = GBConstants.stringTerminator;
    nameOff++;
  }

  // Write moveset pointers: each internal Pokemon points to moveset data
  // We'll write evolution data for internal 1 (dex 1) -> evolves to internal 2 (dex 2) at level 16
  const evoDataOffset = MOVESETS_DATA_OFFSET;
  for (let i = 0; i < PKMN_COUNT; i++) {
    // Pointer is relative to bank
    const dataOffset = evoDataOffset + i * 8;
    const gbPointer =
      dataOffset < GBConstants.bankSize
        ? dataOffset
        : (dataOffset % GBConstants.bankSize) + GBConstants.bankSize;
    writeWord(rom, MOVESETS_TABLE_OFFSET + i * 2, gbPointer);
    // All end with 0 (no evolutions) initially
    rom[dataOffset] = 0;
  }

  // Write evolution data for internal 1 (dex 1 evolves to dex 2 at level 16)
  const evo1Offset = evoDataOffset + 0 * 8;
  rom[evo1Offset] = 1; // method = LEVEL (Gen1 index 1)
  rom[evo1Offset + 1] = 16; // level 16
  rom[evo1Offset + 2] = 2; // target internal ID = 2
  rom[evo1Offset + 3] = 0; // end of evolutions

  const entry = makeRomEntry({
    entries: new Map<string, number>([
      ['InternalPokemonCount', PKMN_COUNT],
      ['PokedexOrder', POKEDEX_ORDER_OFFSET],
      ['PokemonNamesOffset', POKEMON_NAMES_OFFSET],
      ['PokemonNamesLength', POKEMON_NAMES_LENGTH],
      ['PokemonStatsOffset', POKEMON_STATS_OFFSET],
      ['MewStatsOffset', MEW_STATS_OFFSET],
      ['MoveCount', MOVE_COUNT],
      ['MoveDataOffset', MOVE_DATA_OFFSET],
      ['MoveNamesOffset', MOVE_NAMES_OFFSET],
      ['PokemonMovesetsTableOffset', MOVESETS_TABLE_OFFSET],
    ]),
    isYellow: true, // So Mew uses normal stats offset
  });

  return { rom, entry, tables };
}

function writeName(
  rom: Uint8Array,
  offset: number,
  name: string,
  tables: TextTables,
): void {
  const bytes = encodeString(name, tables);
  rom.set(bytes, offset);
  // Pad with terminator
  for (let i = bytes.length; i < 10; i++) {
    rom[offset + i] = GBConstants.stringTerminator;
  }
}

function encodeString(str: string, tables: TextTables): Uint8Array {
  const bytes: number[] = [];
  for (const ch of str) {
    const code = tables.d.get(ch);
    if (code !== undefined) {
      bytes.push(code & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// Tests: ROM entry detection
// ---------------------------------------------------------------------------

describe('ROM entry detection with synthetic headers', () => {
  it('matches a ROM entry by signature, version, and nonJapanese', () => {
    const rom = buildSyntheticRom(GBConstants.minRomSize, 'POKEMON RED', 0, 1);
    const entry = makeRomEntry();
    expect(checkRomEntry(rom, [entry])).toBe(entry);
  });

  it('returns null for unrecognized signature', () => {
    const rom = buildSyntheticRom(GBConstants.minRomSize, 'UNKNOWN GAME', 0, 1);
    expect(checkRomEntry(rom, [makeRomEntry()])).toBeNull();
  });

  it('prefers CRC-specific entry over wildcard', () => {
    const rom = buildSyntheticRom(GBConstants.minRomSize, 'POKEMON RED', 0, 1);
    rom[GBConstants.crcOffset] = 0xab;
    rom[GBConstants.crcOffset + 1] = 0xcd;
    const wildcard = makeRomEntry({ name: 'wildcard', crcInHeader: -1 });
    const specific = makeRomEntry({ name: 'specific', crcInHeader: 0xabcd });
    expect(checkRomEntry(rom, [wildcard, specific])).toBe(specific);
  });

  it('isRomValid returns true for matching ROM', () => {
    const rom = buildSyntheticRom(GBConstants.minRomSize, 'POKEMON RED', 0, 1);
    expect(isRomValid(rom, [makeRomEntry()])).toBe(true);
  });

  it('isRomValid returns false for too-small ROM', () => {
    const rom = new Uint8Array(0x100);
    expect(isRomValid(rom, [makeRomEntry()])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Tests: INI parsing
// ---------------------------------------------------------------------------

describe('parseGen1OffsetsIni', () => {
  it('parses a simple ROM entry', () => {
    const ini = `
[Red (U)]
Game=POKEMON RED
Version=0
NonJapanese=1
Type=RB
ExtraTableFile=rby_english
InternalPokemonCount=190
PokedexOrder=0x41024
PokemonStatsOffset=0x383DE
MoveCount=165
`;
    const entries = parseGen1OffsetsIni(ini);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('Red (U)');
    expect(entries[0].romName).toBe('POKEMON RED');
    expect(entries[0].version).toBe(0);
    expect(entries[0].nonJapanese).toBe(1);
    expect(entries[0].isYellow).toBe(false);
    expect(entries[0].extraTableFile).toBe('rby_english');
    expect(entries[0].entries.get('InternalPokemonCount')).toBe(190);
    expect(entries[0].entries.get('PokedexOrder')).toBe(0x41024);
    expect(entries[0].entries.get('MoveCount')).toBe(165);
  });

  it('parses Yellow type correctly', () => {
    const ini = `
[Yellow (U)]
Game=POKEMON YELLOW
Type=Yellow
`;
    const entries = parseGen1OffsetsIni(ini);
    expect(entries[0].isYellow).toBe(true);
  });

  it('strips comments', () => {
    const ini = `
[Test]
Game=TEST ROM // this is a comment
MoveCount=10 // another comment
`;
    const entries = parseGen1OffsetsIni(ini);
    expect(entries[0].romName).toBe('TEST ROM');
    expect(entries[0].entries.get('MoveCount')).toBe(10);
  });

  it('parses array entries', () => {
    const ini = `
[Test]
Game=TEST ROM
StarterOffsets1[]=[0x1D126, 0x1CC84, 0x1D10E]
`;
    const entries = parseGen1OffsetsIni(ini);
    expect(entries[0].arrayEntries.get('StarterOffsets1')).toEqual([
      0x1d126, 0x1cc84, 0x1d10e,
    ]);
  });

  it('parses CRCInHeader', () => {
    const ini = `
[Test]
Game=TEST ROM
CRCInHeader=0xABCD
`;
    const entries = parseGen1OffsetsIni(ini);
    expect(entries[0].crcInHeader).toBe(0xabcd);
  });

  it('parses multiple ROM entries', () => {
    const ini = `
[Red (U)]
Game=POKEMON RED
[Blue (U)]
Game=POKEMON BLUE
`;
    const entries = parseGen1OffsetsIni(ini);
    expect(entries).toHaveLength(2);
    expect(entries[0].romName).toBe('POKEMON RED');
    expect(entries[1].romName).toBe('POKEMON BLUE');
  });
});

// ---------------------------------------------------------------------------
// Tests: Pokedex order loading
// ---------------------------------------------------------------------------

describe('loadPokedexOrder', () => {
  it('builds correct mapping from internal to national dex', () => {
    const { rom, entry } = buildTestRom();
    const dex = loadPokedexOrder(rom, entry);

    expect(dex.pokedexCount).toBe(3);
    // Internal 1 -> national 1
    expect(dex.pokeRBYToNum[1]).toBe(1);
    // National 1 -> internal 1
    expect(dex.pokeNumToRBY[1]).toBe(1);
    // Internal 4 is invalid
    expect(dex.pokeRBYToNum[4]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Bulk Pokemon stats loading/saving
// ---------------------------------------------------------------------------

describe('loadAllPokemonStats / saveAllPokemonStats', () => {
  it('loads all Pokemon stats from synthetic ROM', () => {
    const { rom, entry, tables } = buildTestRom();
    const dex = loadPokedexOrder(rom, entry);
    const pokes = loadAllPokemonStats(rom, entry, dex, tables);

    expect(pokes.length).toBe(4); // index 0 + 3 pokemon
    expect(pokes[1].number).toBe(1);
    expect(pokes[1].name).toBe('AAA');
    expect(pokes[1].hp).toBe(45); // 40 + 1*5
    expect(pokes[1].primaryType).toBe('GRASS');
    expect(pokes[1].secondaryType).toBe('POISON');

    expect(pokes[2].number).toBe(2);
    expect(pokes[2].name).toBe('BBB');
    expect(pokes[2].hp).toBe(50); // 40 + 2*5

    expect(pokes[3].number).toBe(3);
    expect(pokes[3].name).toBe('CCC');
    expect(pokes[3].hp).toBe(55); // 40 + 3*5
  });

  it('round-trips Pokemon stats through save and reload', () => {
    const { rom, entry, tables } = buildTestRom();
    const dex = loadPokedexOrder(rom, entry);
    const pokes = loadAllPokemonStats(rom, entry, dex, tables);

    // Modify stats
    pokes[1].hp = 100;
    pokes[1].attack = 200;
    pokes[1].name = 'ZZZ';
    pokes[2].speed = 150;

    // Save back
    saveAllPokemonStats(rom, entry, pokes, dex, tables);

    // Reload
    const reloaded = loadAllPokemonStats(rom, entry, dex, tables);
    expect(reloaded[1].hp).toBe(100);
    expect(reloaded[1].attack).toBe(200);
    expect(reloaded[1].name).toBe('ZZZ');
    expect(reloaded[2].speed).toBe(150);

    // Unchanged pokemon remain the same
    expect(reloaded[3].hp).toBe(55);
  });
});

// ---------------------------------------------------------------------------
// Tests: Bulk move loading/saving
// ---------------------------------------------------------------------------

describe('loadAllMoves / saveAllMoves', () => {
  it('loads all moves from synthetic ROM', () => {
    const { rom, entry, tables } = buildTestRom();
    const result = loadAllMoves(rom, entry, tables);

    // 3 valid moves + null at index 0
    expect(result.moves.length).toBe(4);
    expect(result.moves[0]).toBeNull();
    expect(result.moves[1]!.name).toBe('Hit');
    expect(result.moves[1]!.power).toBe(50); // 40 + 1*10
    expect(result.moves[1]!.pp).toBe(35); // 30 + 1*5
    expect(result.moves[2]!.name).toBe('Slash');
    expect(result.moves[2]!.power).toBe(60);
    expect(result.moves[3]!.name).toBe('Burn');
    expect(result.moves[3]!.power).toBe(70);
  });

  it('builds correct move index mapping tables', () => {
    const { rom, entry, tables } = buildTestRom();
    const result = loadAllMoves(rom, entry, tables);

    // Move number 1 maps to ROM index 1
    expect(result.moveNumToRomTable[1]).toBe(1);
    expect(result.moveRomToNumTable[1]).toBe(1);
    expect(result.moveNumToRomTable[3]).toBe(3);
  });

  it('round-trips move data through save and reload', () => {
    const { rom, entry, tables } = buildTestRom();
    const result = loadAllMoves(rom, entry, tables);

    // Modify a move
    result.moves[1]!.power = 99;
    result.moves[1]!.pp = 10;
    result.moves[2]!.power = 120;

    // Save
    saveAllMoves(rom, entry, result.moves);

    // Reload
    const reloaded = loadAllMoves(rom, entry, tables);
    expect(reloaded.moves[1]!.power).toBe(99);
    expect(reloaded.moves[1]!.pp).toBe(10);
    expect(reloaded.moves[2]!.power).toBe(120);

    // Unchanged move stays the same
    expect(reloaded.moves[3]!.power).toBe(70);
  });

  it('skips moves with zero animation byte', () => {
    const { rom, entry, tables } = buildTestRom();
    // Zero out animation byte for move 2
    const movesOffset = entry.entries.get('MoveDataOffset')!;
    rom[movesOffset + (2 - 1) * 6] = 0;

    const result = loadAllMoves(rom, entry, tables);
    // Only 2 valid moves now
    expect(result.moves.length).toBe(3); // null + 2 moves
    expect(result.moves[1]!.name).toBe('Hit');
    expect(result.moves[2]!.name).toBe('Burn');
  });
});

// ---------------------------------------------------------------------------
// Tests: Evolution parsing
// ---------------------------------------------------------------------------

describe('populateEvolutions', () => {
  it('parses level-based evolution from synthetic data', () => {
    const { rom, entry, tables } = buildTestRom();
    const dex = loadPokedexOrder(rom, entry);
    const pokes = loadAllPokemonStats(rom, entry, dex, tables);

    populateEvolutions(rom, entry, pokes, dex);

    // Dex 1 should evolve into dex 2 at level 16
    expect(pokes[1].evolutionsFrom.length).toBe(1);
    const evo = pokes[1].evolutionsFrom[0];
    expect(evo.from).toBe(pokes[1]);
    expect(evo.to).toBe(pokes[2]);
    expect(evo.type).toBe(EvolutionType.LEVEL);
    expect(evo.extraInfo).toBe(16);
    expect(evo.carryStats).toBe(true);

    // Dex 2 should have an evolution-to entry
    expect(pokes[2].evolutionsTo.length).toBe(1);
    expect(pokes[2].evolutionsTo[0].from).toBe(pokes[1]);
  });

  it('marks split evolutions as carryStats=false', () => {
    const { rom, entry, tables } = buildTestRom();
    const dex = loadPokedexOrder(rom, entry);
    const pokes = loadAllPokemonStats(rom, entry, dex, tables);

    // Add a second evolution for internal 1 -> internal 3
    const movesetsTableOffset = entry.entries.get(
      'PokemonMovesetsTableOffset',
    )!;
    const pointer = readWord(rom, movesetsTableOffset);
    const bank = Math.floor(movesetsTableOffset / GBConstants.bankSize);
    const evoOffset =
      pointer < GBConstants.bankSize
        ? pointer
        : (pointer % GBConstants.bankSize) + bank * GBConstants.bankSize;

    // method=LEVEL, level=36, target=internal 3
    rom[evoOffset + 3] = 1; // LEVEL
    rom[evoOffset + 4] = 36; // level
    rom[evoOffset + 5] = 3; // target internal ID 3
    rom[evoOffset + 6] = 0; // end

    populateEvolutions(rom, entry, pokes, dex);

    expect(pokes[1].evolutionsFrom.length).toBe(2);
    for (const e of pokes[1].evolutionsFrom) {
      expect(e.carryStats).toBe(false);
    }
  });

  it('handles Pokemon with no evolutions', () => {
    const { rom, entry, tables } = buildTestRom();
    const dex = loadPokedexOrder(rom, entry);
    const pokes = loadAllPokemonStats(rom, entry, dex, tables);

    populateEvolutions(rom, entry, pokes, dex);

    // Dex 3 has no evolutions from it
    expect(pokes[3].evolutionsFrom.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: Fixed/variable length string I/O
// ---------------------------------------------------------------------------

describe('readFixedLengthString / writeFixedLengthString', () => {
  it('reads a terminated string from ROM', () => {
    const tables = makeTextTables();
    const rom = new Uint8Array(20);
    // Write "ABC" + terminator
    rom[0] = 0x80; // A
    rom[1] = 0x81; // B
    rom[2] = 0x82; // C
    rom[3] = GBConstants.stringTerminator;

    expect(readFixedLengthString(rom, 0, 10, tables)).toBe('ABC');
  });

  it('round-trips string through write then read', () => {
    const tables = makeTextTables();
    const rom = new Uint8Array(20);
    writeFixedLengthString(rom, 'Hello', 0, 10, tables);
    const result = readFixedLengthString(rom, 0, 10, tables);
    // Note: our test table maps uppercase only, so 'H' maps but 'e','l','o' use lowercase table
    expect(result).toBe('Hello');
  });

  it('pads with terminators when name is shorter than length', () => {
    const tables = makeTextTables();
    const rom = new Uint8Array(20);
    rom.fill(0xff); // Fill with non-zero to verify padding
    writeFixedLengthString(rom, 'AB', 0, 10, tables);
    // Bytes 0-1 should be encoded, 2-9 should be terminators
    expect(rom[2]).toBe(GBConstants.stringTerminator);
    expect(rom[9]).toBe(GBConstants.stringTerminator);
  });
});

describe('readVariableLengthString', () => {
  it('reads a string until terminator', () => {
    const tables = makeTextTables();
    const rom = new Uint8Array(20);
    rom[0] = 0x80; // A
    rom[1] = 0x81; // B
    rom[2] = GBConstants.stringTerminator;

    expect(readVariableLengthString(rom, 0, false, tables)).toBe('AB');
  });
});

// ---------------------------------------------------------------------------
// Tests: ROM metadata helpers
// ---------------------------------------------------------------------------

describe('ROM metadata', () => {
  it('getROMName reads the header name', () => {
    const rom = buildSyntheticRom(GBConstants.minRomSize, 'POKEMON RED', 0, 1);
    expect(getROMName(rom)).toBe('POKEMON RED');
  });

  it('getSupportLevel returns full for non-Japanese', () => {
    const entry = makeRomEntry({ name: 'Red (U)' });
    expect(getSupportLevel(entry)).toBe('full');
  });

  it('getSupportLevel returns partial for Japanese', () => {
    const entry = makeRomEntry({ name: 'Red (J)' });
    expect(getSupportLevel(entry)).toBe('partial');
  });

  it('printRomDiagnostics includes expected fields', () => {
    const rom = buildSyntheticRom(GBConstants.minRomSize, 'POKEMON RED', 0, 1);
    const entry = makeRomEntry({ name: 'Red (U)', isYellow: false });
    const lines = printRomDiagnostics(rom, entry, 'test.gb');
    expect(lines.some((l) => l.includes('test.gb'))).toBe(true);
    expect(lines.some((l) => l.includes('POKEMON RED'))).toBe(true);
    expect(lines.some((l) => l.includes('Red/Blue'))).toBe(true);
  });

  it('printRomDiagnostics shows Yellow for yellow ROMs', () => {
    const rom = buildSyntheticRom(
      GBConstants.minRomSize,
      'POKEMON YELLOW',
      0,
      1,
    );
    const entry = makeRomEntry({ name: 'Yellow (U)', isYellow: true });
    const lines = printRomDiagnostics(rom, entry, 'yellow.gb');
    expect(lines.some((l) => l.includes('Yellow'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests: loadGen1Rom / saveGen1Rom integration
// ---------------------------------------------------------------------------

describe('loadGen1Rom / saveGen1Rom', () => {
  it('loads and saves a synthetic ROM end-to-end', () => {
    const { rom, entry, tables } = buildTestRom();

    // Build text table lines from our test tables
    const textTableLines: string[] = [];
    for (let i = 0; i < 256; i++) {
      if (tables.tb[i] != null) {
        textTableLines.push(i.toString(16).toUpperCase().padStart(2, '0') + '=' + tables.tb[i]);
      }
    }

    const data = loadGen1Rom(rom, [entry], textTableLines, null, 'test.gb');

    expect(data.loadedFilename).toBe('test.gb');
    expect(data.romEntry).toBe(entry);
    expect(data.pokes[1].name).toBe('AAA');
    expect(data.pokes[1].hp).toBe(45);
    expect(data.moves[1]!.name).toBe('Hit');
    expect(data.dexMapping.pokedexCount).toBe(3);

    // Modify and save
    data.pokes[1].hp = 200;
    data.moves[1]!.power = 99;

    const savedRom = saveGen1Rom(data);

    // Reload from saved bytes
    const data2 = loadGen1Rom(savedRom, [entry], textTableLines, null, 'test2.gb');
    expect(data2.pokes[1].hp).toBe(200);
    expect(data2.moves[1]!.power).toBe(99);
  });

  it('throws on unrecognized ROM', () => {
    const rom = buildSyntheticRom(GBConstants.minRomSize, 'UNKNOWN', 0, 1);
    const entry = makeRomEntry({ romName: 'POKEMON RED' });
    expect(() => loadGen1Rom(rom, [entry], [], null, 'bad.gb')).toThrow(
      'Could not detect ROM entry',
    );
  });
});
