import { describe, it, expect } from 'vitest';
import {
  RomEntry,
  createDefaultRomEntry,
  readWord,
  writeWord,
  makeGBPointer,
  bankOf,
  calculateOffset,
  readByteIntoFlags,
  getByteFromFlags,
  getGen1Starters,
  setGen1Starters,
  getGen1MovesLearnt,
  writeGen1EvosAndMovesLearnt,
  getGen1TMMoves,
  setGen1TMMoves,
  getGen1HMMoves,
  getGen1TMHMCompatibility,
  setGen1TMHMCompatibility,
} from '../gen1-rom-handler';
import * as GBConstants from '../../constants/gb-constants';
import * as Gen1Constants from '../../constants/gen1-constants';
import { Pokemon } from '../../pokemon/pokemon';
import { MoveLearnt } from '../../pokemon/move-learnt';

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

// Helper to create a Pokemon with a given number and name
function makePokemon(number: number, name: string = `Poke${number}`): Pokemon {
  const pk = new Pokemon();
  pk.number = number;
  pk.name = name;
  return pk;
}

describe('Gen1 Starters', () => {
  it('reads 3 starters for Red/Blue', () => {
    const rom = new Uint8Array(0x200);
    const entry = makeRomEntry({
      isYellow: false,
      arrayEntries: new Map([
        ['StarterOffsets1', [0x100]],
        ['StarterOffsets2', [0x101]],
        ['StarterOffsets3', [0x102]],
      ]),
    });

    // Internal IDs for Bulbasaur(1), Charmander(2), Squirtle(3)
    rom[0x100] = 0x01;
    rom[0x101] = 0x02;
    rom[0x102] = 0x03;

    // pokeRBYToNumTable: internal ID -> national dex number
    const pokeRBYToNumTable = new Array(256).fill(0);
    pokeRBYToNumTable[1] = 1; // internal 1 -> dex 1 (Bulbasaur)
    pokeRBYToNumTable[2] = 4; // internal 2 -> dex 4 (Charmander)
    pokeRBYToNumTable[3] = 7; // internal 3 -> dex 7 (Squirtle)

    const pokemonList: Pokemon[] = new Array(152).fill(null);
    pokemonList[1] = makePokemon(1, 'Bulbasaur');
    pokemonList[4] = makePokemon(4, 'Charmander');
    pokemonList[7] = makePokemon(7, 'Squirtle');

    const starters = getGen1Starters(rom, entry, pokemonList as Pokemon[], pokeRBYToNumTable);
    expect(starters).toHaveLength(3);
    expect(starters[0].name).toBe('Bulbasaur');
    expect(starters[1].name).toBe('Charmander');
    expect(starters[2].name).toBe('Squirtle');
  });

  it('reads 2 starters for Yellow', () => {
    const rom = new Uint8Array(0x200);
    const entry = makeRomEntry({
      isYellow: true,
      arrayEntries: new Map([
        ['StarterOffsets1', [0x100]],
        ['StarterOffsets2', [0x101]],
      ]),
    });

    rom[0x100] = 0x01;
    rom[0x101] = 0x02;

    const pokeRBYToNumTable = new Array(256).fill(0);
    pokeRBYToNumTable[1] = 25; // Pikachu
    pokeRBYToNumTable[2] = 133; // Eevee

    const pokemonList: Pokemon[] = new Array(152).fill(null);
    pokemonList[25] = makePokemon(25, 'Pikachu');
    pokemonList[133] = makePokemon(133, 'Eevee');

    const starters = getGen1Starters(rom, entry, pokemonList as Pokemon[], pokeRBYToNumTable);
    expect(starters).toHaveLength(2);
    expect(starters[0].name).toBe('Pikachu');
    expect(starters[1].name).toBe('Eevee');
  });

  it('writes 3 starters for Red/Blue', () => {
    const rom = new Uint8Array(0x200);
    const entry = makeRomEntry({
      isYellow: false,
      arrayEntries: new Map([
        ['StarterOffsets1', [0x100, 0x110]], // multiple offsets
        ['StarterOffsets2', [0x101]],
        ['StarterOffsets3', [0x102]],
      ]),
    });

    const pokeNumToRBYTable = new Array(256).fill(0);
    pokeNumToRBYTable[1] = 0x99;
    pokeNumToRBYTable[4] = 0xB0;
    pokeNumToRBYTable[7] = 0xB1;

    const starters = [
      makePokemon(1, 'Bulbasaur'),
      makePokemon(4, 'Charmander'),
      makePokemon(7, 'Squirtle'),
    ];

    const result = setGen1Starters(rom, entry, [], pokeNumToRBYTable, starters);
    expect(result).toBe(true);
    expect(rom[0x100]).toBe(0x99);
    expect(rom[0x110]).toBe(0x99); // second offset also patched
    expect(rom[0x101]).toBe(0xB0);
    expect(rom[0x102]).toBe(0xB1);
  });

  it('rejects wrong number of starters', () => {
    const rom = new Uint8Array(0x200);
    const entry = makeRomEntry({
      isYellow: false,
      arrayEntries: new Map([
        ['StarterOffsets1', [0x100]],
        ['StarterOffsets2', [0x101]],
        ['StarterOffsets3', [0x102]],
      ]),
    });

    const result = setGen1Starters(rom, entry, [], [], [makePokemon(1), makePokemon(4)]);
    expect(result).toBe(false);
  });
});

describe('Gen1 Moveset parsing', () => {
  it('parses level-1 moves and level-up moves', () => {
    // Set up a minimal ROM with 1 pokemon
    // Bank 14 starts at 0x38000. Put pointer table at 0x38000, data follows.
    const rom = new Uint8Array(0x40000);
    const pointerTableOffset = 0x38000; // bank 14
    const pkmnCount = 2;
    const pokeStatsOffset = 0x1000;

    // pokeRBYToNumTable: internal index 1 -> dex 1, index 2 -> dex 0 (null)
    const pokeRBYToNumTable = new Array(256).fill(0);
    pokeRBYToNumTable[1] = 1;
    // moveRomToNumTable: identity mapping
    const moveRomToNumTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) moveRomToNumTable[i] = i;

    const pokemonList: Pokemon[] = new Array(152).fill(null);
    pokemonList[1] = makePokemon(1, 'Bulbasaur');

    // Write level-1 moves into base stats area
    const statsOffset = (1 - 1) * Gen1Constants.baseStatsEntrySize + pokeStatsOffset;
    rom[statsOffset + Gen1Constants.bsLevel1MovesOffset] = 33; // Tackle
    rom[statsOffset + Gen1Constants.bsLevel1MovesOffset + 1] = 45; // Growl
    rom[statsOffset + Gen1Constants.bsLevel1MovesOffset + 2] = 0;
    rom[statsOffset + Gen1Constants.bsLevel1MovesOffset + 3] = 0;

    // The data for pokemon 1: no evolutions, then level-up moves
    const dataOffset = pointerTableOffset + pkmnCount * 2;
    const gbPtr = makeGBPointer(dataOffset);
    writeWord(rom, pointerTableOffset + 0, gbPtr); // pointer for internal #1

    // Null entry pointer for internal #2 (doesn't matter, will be skipped)
    writeWord(rom, pointerTableOffset + 2, gbPtr);

    // Evolution data: none (terminated by 0x00)
    rom[dataOffset] = 0x00;
    // Level-up moves: level 7 move 22, level 13 move 75, terminated by 0x00
    rom[dataOffset + 1] = 7;
    rom[dataOffset + 2] = 22;
    rom[dataOffset + 3] = 13;
    rom[dataOffset + 4] = 75;
    rom[dataOffset + 5] = 0x00;

    const entry = makeRomEntry({
      isYellow: true,
      entries: new Map([
        ['PokemonMovesetsTableOffset', pointerTableOffset],
        ['PokemonStatsOffset', pokeStatsOffset],
        ['InternalPokemonCount', pkmnCount],
      ]),
    });

    const movesets = getGen1MovesLearnt(rom, entry, pokemonList as Pokemon[], pokeRBYToNumTable, moveRomToNumTable);
    expect(movesets.has(1)).toBe(true);
    const moves = movesets.get(1)!;
    // 2 level-1 moves + 2 level-up moves = 4
    expect(moves).toHaveLength(4);
    expect(moves[0].level).toBe(1);
    expect(moves[0].move).toBe(33);
    expect(moves[1].level).toBe(1);
    expect(moves[1].move).toBe(45);
    expect(moves[2].level).toBe(7);
    expect(moves[2].move).toBe(22);
    expect(moves[3].level).toBe(13);
    expect(moves[3].move).toBe(75);
  });

  it('skips evolution data before reading moves', () => {
    const rom = new Uint8Array(0x40000);
    const pointerTableOffset = 0x38000;
    const pkmnCount = 1;
    const pokeStatsOffset = 0x1000;

    const pokeRBYToNumTable = new Array(256).fill(0);
    pokeRBYToNumTable[1] = 1;
    const moveRomToNumTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) moveRomToNumTable[i] = i;

    const pokemonList: Pokemon[] = new Array(152).fill(null);
    pokemonList[1] = makePokemon(1);

    // No level-1 moves
    const statsOffset = pokeStatsOffset;
    rom[statsOffset + Gen1Constants.bsLevel1MovesOffset] = 0;

    const dataOffset = pointerTableOffset + pkmnCount * 2;
    writeWord(rom, pointerTableOffset, makeGBPointer(dataOffset));

    // Evolution: method 1 (level), 3 bytes; method 2 (stone), 4 bytes
    let off = dataOffset;
    rom[off++] = 1; // level evo
    rom[off++] = 16; // level
    rom[off++] = 0x05; // species
    rom[off++] = 2; // stone evo
    rom[off++] = 0x0A; // stone item
    rom[off++] = 1; // min level
    rom[off++] = 0x06; // species
    rom[off++] = 0x00; // evo terminator
    // Level-up moves
    rom[off++] = 10;
    rom[off++] = 55;
    rom[off++] = 0x00; // moves terminator

    const entry = makeRomEntry({
      isYellow: true,
      entries: new Map([
        ['PokemonMovesetsTableOffset', pointerTableOffset],
        ['PokemonStatsOffset', pokeStatsOffset],
        ['InternalPokemonCount', pkmnCount],
      ]),
    });

    const movesets = getGen1MovesLearnt(rom, entry, pokemonList as Pokemon[], pokeRBYToNumTable, moveRomToNumTable);
    const moves = movesets.get(1)!;
    expect(moves).toHaveLength(1);
    expect(moves[0].level).toBe(10);
    expect(moves[0].move).toBe(55);
  });
});

describe('Gen1 TM moves', () => {
  it('reads TM moves', () => {
    const rom = new Uint8Array(0x200);
    const tmOffset = 0x100;

    // Identity mapping for moveRomToNumTable
    const moveRomToNumTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) moveRomToNumTable[i] = i;

    // Write 50 TM moves
    for (let i = 0; i < Gen1Constants.tmCount; i++) {
      rom[tmOffset + i] = i + 1;
    }

    const entry = makeRomEntry({
      entries: new Map([['TMMovesOffset', tmOffset]]),
    });

    const tms = getGen1TMMoves(rom, entry, moveRomToNumTable);
    expect(tms).toHaveLength(50);
    expect(tms[0]).toBe(1);
    expect(tms[49]).toBe(50);
  });

  it('reads HM moves', () => {
    const rom = new Uint8Array(0x200);
    const tmOffset = 0x100;

    const moveRomToNumTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) moveRomToNumTable[i] = i;

    // HM moves come after TM moves
    for (let i = 0; i < Gen1Constants.hmCount; i++) {
      rom[tmOffset + Gen1Constants.tmCount + i] = 100 + i;
    }

    const entry = makeRomEntry({
      entries: new Map([['TMMovesOffset', tmOffset]]),
    });

    const hms = getGen1HMMoves(rom, entry, moveRomToNumTable);
    expect(hms).toHaveLength(5);
    expect(hms[0]).toBe(100);
    expect(hms[4]).toBe(104);
  });

  it('roundtrips TM moves via set then get', () => {
    const rom = new Uint8Array(0x200);
    const tmOffset = 0x100;

    // Identity mapping for both tables
    const moveNumToRomTable = new Array(256).fill(0);
    const moveRomToNumTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) {
      moveNumToRomTable[i] = i;
      moveRomToNumTable[i] = i;
    }

    const entry = makeRomEntry({
      isYellow: true, // skip gym leader TM patching
      entries: new Map([['TMMovesOffset', tmOffset]]),
    });

    const moves = Array.from({ length: 50 }, (_, i) => 200 - i);
    setGen1TMMoves(rom, entry, moveNumToRomTable, moves);

    const result = getGen1TMMoves(rom, entry, moveRomToNumTable);
    expect(result).toEqual(moves);
  });

  it('patches gym leader moves for Red/Blue', () => {
    const rom = new Uint8Array(0x400);
    const tmOffset = 0x100;
    const glMovesOffset = 0x200;

    const moveNumToRomTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) moveNumToRomTable[i] = i;

    const entry = makeRomEntry({
      isYellow: false,
      entries: new Map([
        ['TMMovesOffset', tmOffset],
        ['GymLeaderMovesTableOffset', glMovesOffset],
      ]),
    });

    const moves = Array.from({ length: 50 }, (_, i) => i + 100);
    setGen1TMMoves(rom, entry, moveNumToRomTable, moves);

    // Gym leader TMs are [34, 11, 24, 21, 6, 46, 38, 27] (1-indexed)
    // TM34 -> moves[33] = 133
    expect(rom[glMovesOffset + 0 * 2]).toBe(133);
    // TM11 -> moves[10] = 110
    expect(rom[glMovesOffset + 1 * 2]).toBe(110);
  });
});

describe('Gen1 TM/HM Compatibility', () => {
  it('reads and writes compatibility bitfields', () => {
    const rom = new Uint8Array(0x2000);
    const pokeStatsOffset = 0x100;
    const pokedexCount = 2;

    const pokemonList: Pokemon[] = new Array(3).fill(null);
    pokemonList[1] = makePokemon(1);
    pokemonList[2] = makePokemon(2);

    const entry = makeRomEntry({
      isYellow: true,
      entries: new Map([['PokemonStatsOffset', pokeStatsOffset]]),
    });

    // Set some compatibility bits for pokemon 1
    const baseOffset1 = pokeStatsOffset + Gen1Constants.bsTMHMCompatOffset;
    rom[baseOffset1] = 0b10110101; // TMs 1,3,5,6,8
    rom[baseOffset1 + 1] = 0x00;
    rom[baseOffset1 + 2] = 0x00;
    rom[baseOffset1 + 3] = 0x00;
    rom[baseOffset1 + 4] = 0x00;
    rom[baseOffset1 + 5] = 0x00;
    rom[baseOffset1 + 6] = 0x00;

    const compat = getGen1TMHMCompatibility(rom, entry, pokemonList as Pokemon[], pokedexCount);
    expect(compat.size).toBe(2);

    const flags1 = compat.get(pokemonList[1])!;
    // flags is 1-indexed: flags[1] = TM1, flags[2] = TM2, etc.
    expect(flags1[1]).toBe(true);   // bit 0
    expect(flags1[2]).toBe(false);  // bit 1
    expect(flags1[3]).toBe(true);   // bit 2
    expect(flags1[4]).toBe(false);  // bit 3
    expect(flags1[5]).toBe(true);   // bit 4
    expect(flags1[6]).toBe(true);   // bit 5
    expect(flags1[7]).toBe(false);  // bit 6
    expect(flags1[8]).toBe(true);   // bit 7
  });

  it('roundtrips compatibility via set then get', () => {
    const rom = new Uint8Array(0x2000);
    const pokeStatsOffset = 0x100;
    const pokedexCount = 1;

    const pokemonList: Pokemon[] = new Array(2).fill(null);
    pokemonList[1] = makePokemon(1);

    const entry = makeRomEntry({
      isYellow: true,
      entries: new Map([['PokemonStatsOffset', pokeStatsOffset]]),
    });

    // Create flags: 56 entries (1-indexed, 0 unused), TMs 1-50 + HMs 1-5
    const flags = new Array<boolean>(Gen1Constants.tmCount + Gen1Constants.hmCount + 1).fill(false);
    flags[1] = true;
    flags[10] = true;
    flags[25] = true;
    flags[50] = true;
    flags[55] = true; // HM5

    const compatData = new Map<Pokemon, boolean[]>();
    compatData.set(pokemonList[1], flags);

    setGen1TMHMCompatibility(rom, entry, pokemonList as Pokemon[], compatData);
    const result = getGen1TMHMCompatibility(rom, entry, pokemonList as Pokemon[], pokedexCount);

    const readFlags = result.get(pokemonList[1])!;
    expect(readFlags[1]).toBe(true);
    expect(readFlags[2]).toBe(false);
    expect(readFlags[10]).toBe(true);
    expect(readFlags[25]).toBe(true);
    expect(readFlags[50]).toBe(true);
    expect(readFlags[55]).toBe(true);
  });
});

describe('Bitfield helpers', () => {
  it('readByteIntoFlags sets correct bits', () => {
    const rom = new Uint8Array([0b11001010]);
    const flags = new Array(9).fill(false);
    readByteIntoFlags(rom, flags, 1, 0);
    expect(flags[1]).toBe(false); // bit 0
    expect(flags[2]).toBe(true);  // bit 1
    expect(flags[3]).toBe(false); // bit 2
    expect(flags[4]).toBe(true);  // bit 3
    expect(flags[5]).toBe(false); // bit 4
    expect(flags[6]).toBe(false); // bit 5
    expect(flags[7]).toBe(true);  // bit 6
    expect(flags[8]).toBe(true);  // bit 7
  });

  it('getByteFromFlags produces correct byte', () => {
    const flags = [false, false, true, false, true, false, false, true, true];
    // offset 1: bits = [F, T, F, T, F, F, T, T] = 0b11001010 = 0xCA
    const byte = getByteFromFlags(flags, 1);
    expect(byte).toBe(0b11001010);
  });

  it('roundtrips flags through read and write', () => {
    const rom = new Uint8Array([0xAB]);
    const flags = new Array(9).fill(false);
    readByteIntoFlags(rom, flags, 1, 0);
    const result = getByteFromFlags(flags, 1);
    expect(result).toBe(0xAB);
  });
});

describe('writeGen1EvosAndMovesLearnt', () => {
  it('writes movesets for a simple case with 2 Pokemon', () => {
    // Set up ROM in bank 14 (0x38000 - 0x3BFFF)
    const rom = new Uint8Array(0x40000);
    const pointerTableOffset = 0x38000;
    const pkmnCount = 3; // 2 real + 1 null
    const pointerTableSize = pkmnCount * 2;
    const mainDataBlockOffset = pointerTableOffset + pointerTableSize;
    const mainDataBlockSize = 200; // plenty of space
    const pokeStatsOffset = 0x1000;

    // pokeRBYToNumTable: internal 1 -> dex 1, internal 2 -> dex 4, internal 3 -> dex 0 (null)
    const pokeRBYToNumTable = new Array(256).fill(0);
    pokeRBYToNumTable[1] = 1;
    pokeRBYToNumTable[2] = 4;
    pokeRBYToNumTable[3] = 0;

    const pokeNumToRBYTable = new Array(256).fill(0);
    pokeNumToRBYTable[1] = 1;
    pokeNumToRBYTable[4] = 2;

    // moveNumToRomTable: identity
    const moveNumToRomTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) moveNumToRomTable[i] = i;

    const pokemonList: Pokemon[] = new Array(152).fill(null);
    pokemonList[1] = makePokemon(1, 'Bulbasaur');
    pokemonList[4] = makePokemon(4, 'Charmander');

    // Set up existing evo+moves data in ROM so the function can copy evos
    // Internal #1 (dex 1): no evos, just a terminator. Then moves terminator.
    const existingDataOffset = mainDataBlockOffset;
    writeWord(rom, pointerTableOffset + 0, makeGBPointer(existingDataOffset));
    rom[existingDataOffset] = 0x00; // no evos
    rom[existingDataOffset + 1] = 0x00; // no moves

    // Internal #2 (dex 4): no evos, no moves
    writeWord(rom, pointerTableOffset + 2, makeGBPointer(existingDataOffset + 2));
    rom[existingDataOffset + 2] = 0x00;
    rom[existingDataOffset + 3] = 0x00;

    // Internal #3 (dex 0): null entry
    writeWord(rom, pointerTableOffset + 4, makeGBPointer(existingDataOffset + 4));
    rom[existingDataOffset + 4] = 0x00;
    rom[existingDataOffset + 5] = 0x00;

    const entry = makeRomEntry({
      isYellow: true,
      entries: new Map([
        ['PokemonMovesetsTableOffset', pointerTableOffset],
        ['PokemonStatsOffset', pokeStatsOffset],
        ['InternalPokemonCount', pkmnCount],
        ['PokemonMovesetsDataSize', mainDataBlockSize],
        ['PokemonMovesetsExtraSpaceOffset', 0], // disabled
      ]),
    });

    // Create movesets
    const movesets = new Map<number, MoveLearnt[]>();

    const moves1: MoveLearnt[] = [];
    const m1 = new MoveLearnt(); m1.level = 1; m1.move = 33; moves1.push(m1);
    const m2 = new MoveLearnt(); m2.level = 1; m2.move = 45; moves1.push(m2);
    const m3 = new MoveLearnt(); m3.level = 7; m3.move = 22; moves1.push(m3);
    const m4 = new MoveLearnt(); m4.level = 13; m4.move = 75; moves1.push(m4);
    movesets.set(1, moves1);

    const moves4: MoveLearnt[] = [];
    const m5 = new MoveLearnt(); m5.level = 1; m5.move = 10; moves4.push(m5);
    const m6 = new MoveLearnt(); m6.level = 9; m6.move = 52; moves4.push(m6);
    movesets.set(4, moves4);

    writeGen1EvosAndMovesLearnt(
      rom, entry, pokemonList as Pokemon[],
      pokeRBYToNumTable, pokeNumToRBYTable, moveNumToRomTable,
      movesets, false,
    );

    // Verify level-1 moves were written to stats area
    const statsOffset1 = (1 - 1) * Gen1Constants.baseStatsEntrySize + pokeStatsOffset;
    expect(rom[statsOffset1 + Gen1Constants.bsLevel1MovesOffset]).toBe(33);
    expect(rom[statsOffset1 + Gen1Constants.bsLevel1MovesOffset + 1]).toBe(45);
    expect(rom[statsOffset1 + Gen1Constants.bsLevel1MovesOffset + 2]).toBe(0);
    expect(rom[statsOffset1 + Gen1Constants.bsLevel1MovesOffset + 3]).toBe(0);

    const statsOffset4 = (4 - 1) * Gen1Constants.baseStatsEntrySize + pokeStatsOffset;
    expect(rom[statsOffset4 + Gen1Constants.bsLevel1MovesOffset]).toBe(10);
    expect(rom[statsOffset4 + Gen1Constants.bsLevel1MovesOffset + 1]).toBe(0);

    // Verify pointer table was written and data is readable
    // Read back the data for internal #1
    const ptr1 = readWord(rom, pointerTableOffset + 0);
    const absPtr1 = calculateOffset(bankOf(pointerTableOffset), ptr1);
    // Should be evo terminator (0), then level-up moves, then move terminator
    expect(rom[absPtr1]).toBe(0x00); // evo terminator (copied from old)
    expect(rom[absPtr1 + 1]).toBe(7);  // level 7
    expect(rom[absPtr1 + 2]).toBe(22); // move 22
    expect(rom[absPtr1 + 3]).toBe(13); // level 13
    expect(rom[absPtr1 + 4]).toBe(75); // move 75
    expect(rom[absPtr1 + 5]).toBe(0x00); // moves terminator

    // Null entries (internal #3) should share the same pointer
    const ptr3 = readWord(rom, pointerTableOffset + 4);
    const absPtr3 = calculateOffset(bankOf(pointerTableOffset), ptr3);
    expect(rom[absPtr3]).toBe(0x00);
    expect(rom[absPtr3 + 1]).toBe(0x00);
  });

  it('uses zero-compression when data starts with 0', () => {
    // When a Pokemon has no evolutions, its data starts with 0x00.
    // The writer should compress by overlapping with the previous entry's trailing 0x00.
    const rom = new Uint8Array(0x40000);
    const pointerTableOffset = 0x38000;
    const pkmnCount = 2;
    const pointerTableSize = pkmnCount * 2;
    const mainDataBlockOffset = pointerTableOffset + pointerTableSize;
    const mainDataBlockSize = 100;
    const pokeStatsOffset = 0x1000;

    const pokeRBYToNumTable = new Array(256).fill(0);
    pokeRBYToNumTable[1] = 1;
    pokeRBYToNumTable[2] = 2;

    const pokeNumToRBYTable = new Array(256).fill(0);
    pokeNumToRBYTable[1] = 1;
    pokeNumToRBYTable[2] = 2;

    const moveNumToRomTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) moveNumToRomTable[i] = i;

    const pokemonList: Pokemon[] = new Array(152).fill(null);
    pokemonList[1] = makePokemon(1);
    pokemonList[2] = makePokemon(2);

    // Set up existing data with no evos
    writeWord(rom, pointerTableOffset + 0, makeGBPointer(mainDataBlockOffset));
    rom[mainDataBlockOffset] = 0x00; rom[mainDataBlockOffset + 1] = 0x00;
    writeWord(rom, pointerTableOffset + 2, makeGBPointer(mainDataBlockOffset + 2));
    rom[mainDataBlockOffset + 2] = 0x00; rom[mainDataBlockOffset + 3] = 0x00;

    const entry = makeRomEntry({
      isYellow: true,
      entries: new Map([
        ['PokemonMovesetsTableOffset', pointerTableOffset],
        ['PokemonStatsOffset', pokeStatsOffset],
        ['InternalPokemonCount', pkmnCount],
        ['PokemonMovesetsDataSize', mainDataBlockSize],
        ['PokemonMovesetsExtraSpaceOffset', 0],
      ]),
    });

    // Both Pokemon have no level-1 moves, just level-up moves
    const movesets = new Map<number, MoveLearnt[]>();
    const m1 = new MoveLearnt(); m1.level = 5; m1.move = 10;
    movesets.set(1, [m1]);
    const m2 = new MoveLearnt(); m2.level = 8; m2.move = 20;
    movesets.set(2, [m2]);

    writeGen1EvosAndMovesLearnt(
      rom, entry, pokemonList as Pokemon[],
      pokeRBYToNumTable, pokeNumToRBYTable, moveNumToRomTable,
      movesets, false,
    );

    // Pokemon 1's data: [0 (evo term), 5, 10, 0 (moves term)]
    // Pokemon 2's data starts with 0 (no evos), so it should be compressed
    // into the trailing 0 of Pokemon 1's data.
    const ptr1 = readWord(rom, pointerTableOffset + 0);
    const ptr2 = readWord(rom, pointerTableOffset + 2);

    // ptr2 should point 1 byte before where its data starts
    // (reusing the trailing 0 from Pokemon 1 as its evo terminator)
    const abs1 = calculateOffset(bankOf(pointerTableOffset), ptr1);
    const abs2 = calculateOffset(bankOf(pointerTableOffset), ptr2);

    // Pokemon 2's pointer should be within the range of Pokemon 1's data
    // Specifically at the moves terminator position of Pokemon 1
    expect(abs2).toBe(abs1 + 3); // points to the 0x00 that terminates Pokemon 1's moves
  });

  it('throws when out of space', () => {
    const rom = new Uint8Array(0x40000);
    const pointerTableOffset = 0x38000;
    const pkmnCount = 1;
    const pokeStatsOffset = 0x1000;

    const pokeRBYToNumTable = new Array(256).fill(0);
    pokeRBYToNumTable[1] = 1;
    const pokeNumToRBYTable = new Array(256).fill(0);
    pokeNumToRBYTable[1] = 1;
    const moveNumToRomTable = new Array(256).fill(0);
    for (let i = 0; i < 256; i++) moveNumToRomTable[i] = i;

    const pokemonList: Pokemon[] = new Array(152).fill(null);
    pokemonList[1] = makePokemon(1);

    writeWord(rom, pointerTableOffset, makeGBPointer(pointerTableOffset + 2));
    rom[pointerTableOffset + 2] = 0x00;
    rom[pointerTableOffset + 3] = 0x00;

    const entry = makeRomEntry({
      isYellow: true,
      entries: new Map([
        ['PokemonMovesetsTableOffset', pointerTableOffset],
        ['PokemonStatsOffset', pokeStatsOffset],
        ['InternalPokemonCount', pkmnCount],
        ['PokemonMovesetsDataSize', 2], // only 2 bytes of space
        ['PokemonMovesetsExtraSpaceOffset', 0],
      ]),
    });

    // Create a moveset that needs more than 2 bytes
    const movesets = new Map<number, MoveLearnt[]>();
    const moves: MoveLearnt[] = [];
    for (let i = 0; i < 10; i++) {
      const m = new MoveLearnt(); m.level = 5 + i; m.move = 10 + i;
      moves.push(m);
    }
    movesets.set(1, moves);

    expect(() => {
      writeGen1EvosAndMovesLearnt(
        rom, entry, pokemonList as Pokemon[],
        pokeRBYToNumTable, pokeNumToRBYTable, moveNumToRomTable,
        movesets, false,
      );
    }).toThrow('Unable to save moves/evolutions, out of space');
  });
});
