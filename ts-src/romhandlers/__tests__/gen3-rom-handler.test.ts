import { describe, it, expect } from "vitest";
import {
  Gen3RomHandlerFactory,
  RomEntry,
  romName,
  romCode,
  find,
  findMultiple,
  hexStringToBytes,
  readWord,
  writeWord,
  readLong,
  writeLong,
  readPointer,
  writePointer,
  matches,
  detectRomInner,
  loadBasicPokeStats,
  saveBasicPokeStats,
  loadMoveData,
  saveMoveData,
  readString,
  translateString,
  readFixedLengthString,
  writeFixedLengthString,
  lengthOfStringAt,
  findPointerPrefixAndSuffix,
  parseRomEntries,
  emptyPokemonSig,
  Gen3RomHandler,
} from "../gen3-rom-handler";
import { Pokemon } from "../../pokemon/pokemon";
import { Move } from "../../pokemon/move";
import { MoveCategory } from "../../pokemon/move-category";
import { StatChangeMoveType } from "../../pokemon/stat-change-move-type";
import { StatChangeType } from "../../pokemon/stat-change-type";
import { StatusMoveType } from "../../pokemon/status-move-type";
import { StatusType } from "../../pokemon/status-type";
import { CriticalChance } from "../../pokemon/critical-chance";
import * as Gen3Constants from "../../constants/gen3-constants";

// ---- Helper: create a minimal valid-looking ROM ----

function createMinimalRom(size: number = Gen3Constants.size16M): Uint8Array {
  return new Uint8Array(size);
}

function writeStringToRom(rom: Uint8Array, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    rom[offset + i] = str.charCodeAt(i);
  }
}

// ---- Factory.isLoadable tests ----

describe("Gen3RomHandlerFactory.isLoadable", () => {
  it("rejects empty data", () => {
    expect(
      Gen3RomHandlerFactory.isLoadable(new Uint8Array(0), 0, [])
    ).toBe(false);
  });

  it("rejects files larger than 32MB", () => {
    const data = new Uint8Array(100);
    expect(
      Gen3RomHandlerFactory.isLoadable(data, 33 * 1024 * 1024, [])
    ).toBe(false);
  });

  it("rejects files with invalid sizes", () => {
    const data = new Uint8Array(1000);
    expect(
      Gen3RomHandlerFactory.isLoadable(data, 1000, [])
    ).toBe(false);
  });

  it("rejects ROMs that lack required hex signatures", () => {
    // Valid size but no wild pokemon prefix, map banks prefix, etc.
    const rom = createMinimalRom(Gen3Constants.size16M);
    expect(
      Gen3RomHandlerFactory.isLoadable(rom, Gen3Constants.size16M, [])
    ).toBe(false);
  });
});

// ---- ROM signature / game code detection ----

describe("romName", () => {
  it("detects correct ROM name at offset 0xA0", () => {
    const rom = createMinimalRom(0x200);
    writeStringToRom(rom, Gen3Constants.romNameOffset, "POKEMON RUBY");
    expect(romName(rom, "POKEMON RUBY")).toBe(true);
  });

  it("rejects incorrect ROM name", () => {
    const rom = createMinimalRom(0x200);
    writeStringToRom(rom, Gen3Constants.romNameOffset, "POKEMON RUBY");
    expect(romName(rom, "POKEMON SAPP")).toBe(false);
  });

  it("detects unofficial Emerald ROM name", () => {
    const rom = createMinimalRom(0x200);
    writeStringToRom(rom, Gen3Constants.romNameOffset, Gen3Constants.unofficialEmeraldROMName);
    expect(romName(rom, Gen3Constants.unofficialEmeraldROMName)).toBe(true);
  });
});

describe("romCode", () => {
  it("detects correct game code at offset 0xAC", () => {
    const rom = createMinimalRom(0x200);
    writeStringToRom(rom, Gen3Constants.romCodeOffset, "AXVE");
    expect(romCode(rom, "AXVE")).toBe(true);
  });

  it("rejects incorrect game code", () => {
    const rom = createMinimalRom(0x200);
    writeStringToRom(rom, Gen3Constants.romCodeOffset, "AXVE");
    expect(romCode(rom, "BPRE")).toBe(false);
  });
});

// ---- detectRomInner ----

describe("detectRomInner", () => {
  it("rejects ROMs with invalid size", () => {
    const rom = new Uint8Array(1234);
    expect(detectRomInner(rom, 1234, [])).toBe(false);
  });

  it("rejects ROMs that lack wildPokemonPointerPrefix", () => {
    const rom = createMinimalRom(Gen3Constants.size16M);
    expect(detectRomInner(rom, Gen3Constants.size16M, [])).toBe(false);
  });
});

// ---- Byte read/write helpers ----

describe("readWord / writeWord", () => {
  it("reads a 16-bit little-endian word", () => {
    const rom = new Uint8Array([0x34, 0x12]);
    expect(readWord(rom, 0)).toBe(0x1234);
  });

  it("writes a 16-bit little-endian word", () => {
    const rom = new Uint8Array(2);
    writeWord(rom, 0, 0x1234);
    expect(rom[0]).toBe(0x34);
    expect(rom[1]).toBe(0x12);
  });

  it("handles zero", () => {
    const rom = new Uint8Array(2);
    writeWord(rom, 0, 0);
    expect(readWord(rom, 0)).toBe(0);
  });

  it("handles 0xFFFF", () => {
    const rom = new Uint8Array(2);
    writeWord(rom, 0, 0xffff);
    expect(readWord(rom, 0)).toBe(0xffff);
  });
});

describe("readLong / writeLong", () => {
  it("reads a 32-bit little-endian unsigned value", () => {
    const rom = new Uint8Array([0x78, 0x56, 0x34, 0x12]);
    expect(readLong(rom, 0)).toBe(0x12345678);
  });

  it("writes a 32-bit little-endian value", () => {
    const rom = new Uint8Array(4);
    writeLong(rom, 0, 0x12345678);
    expect(rom[0]).toBe(0x78);
    expect(rom[1]).toBe(0x56);
    expect(rom[2]).toBe(0x34);
    expect(rom[3]).toBe(0x12);
  });
});

describe("readPointer / writePointer", () => {
  it("reads a GBA pointer (subtracts 0x08000000)", () => {
    const rom = new Uint8Array(4);
    // Write 0x08001234 as little-endian
    rom[0] = 0x34;
    rom[1] = 0x12;
    rom[2] = 0x00;
    rom[3] = 0x08;
    expect(readPointer(rom, 0)).toBe(0x1234);
  });

  it("writes a GBA pointer (adds 0x08000000)", () => {
    const rom = new Uint8Array(4);
    writePointer(rom, 0, 0x1234);
    expect(rom[0]).toBe(0x34);
    expect(rom[1]).toBe(0x12);
    expect(rom[2]).toBe(0x00);
    expect(rom[3]).toBe(0x08);
  });

  it("roundtrips through write then read", () => {
    const rom = new Uint8Array(4);
    writePointer(rom, 0, 0xabcdef);
    expect(readPointer(rom, 0)).toBe(0xabcdef);
  });
});

// ---- matches ----

describe("matches", () => {
  it("returns true for matching bytes", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const needle = new Uint8Array([2, 3, 4]);
    expect(matches(data, 1, needle)).toBe(true);
  });

  it("returns false for non-matching bytes", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const needle = new Uint8Array([2, 4, 4]);
    expect(matches(data, 1, needle)).toBe(false);
  });

  it("returns false if needle extends beyond data", () => {
    const data = new Uint8Array([1, 2, 3]);
    const needle = new Uint8Array([2, 3, 4, 5]);
    expect(matches(data, 1, needle)).toBe(false);
  });
});

// ---- hexStringToBytes ----

describe("hexStringToBytes", () => {
  it("converts hex string to byte array", () => {
    const bytes = hexStringToBytes("FF00AB");
    expect(bytes).toEqual(new Uint8Array([0xff, 0x00, 0xab]));
  });

  it("handles empty string", () => {
    expect(hexStringToBytes("")).toEqual(new Uint8Array(0));
  });
});

// ---- find / findMultiple ----

describe("find", () => {
  it("finds a unique hex pattern", () => {
    const rom = new Uint8Array([0x00, 0xab, 0xcd, 0xef, 0x00]);
    expect(find(rom, "ABCDEF")).toBe(1);
  });

  it("returns -1 for not found", () => {
    const rom = new Uint8Array([0x00, 0x01, 0x02]);
    expect(find(rom, "AABB")).toBe(-1);
  });

  it("returns -2 for non-unique match", () => {
    const rom = new Uint8Array([0xab, 0xcd, 0x00, 0xab, 0xcd]);
    expect(find(rom, "ABCD")).toBe(-2);
  });

  it("returns -3 for odd-length hex string", () => {
    const rom = new Uint8Array([0x00]);
    expect(find(rom, "ABC")).toBe(-3);
  });
});

describe("findMultiple", () => {
  it("finds all occurrences", () => {
    const rom = new Uint8Array([0xab, 0x00, 0xab, 0x00, 0xab]);
    expect(findMultiple(rom, "AB")).toEqual([0, 2, 4]);
  });

  it("returns empty for no match", () => {
    const rom = new Uint8Array([0x00, 0x01]);
    expect(findMultiple(rom, "FF")).toEqual([]);
  });
});

// ---- Pokemon data structure parsing ----

describe("loadBasicPokeStats", () => {
  it("parses Pokemon base stats from synthetic ROM data", () => {
    const pk = new Pokemon();
    // Create a 28-byte entry (Gen3Constants.baseStatsEntrySize = 0x1C)
    const data = new Uint8Array(0x1c);
    data[Gen3Constants.bsHPOffset] = 45; // HP
    data[Gen3Constants.bsAttackOffset] = 49; // Attack
    data[Gen3Constants.bsDefenseOffset] = 49; // Defense
    data[Gen3Constants.bsSpeedOffset] = 45; // Speed
    data[Gen3Constants.bsSpAtkOffset] = 65; // SpAtk
    data[Gen3Constants.bsSpDefOffset] = 65; // SpDef
    data[Gen3Constants.bsPrimaryTypeOffset] = 0x0c; // GRASS
    data[Gen3Constants.bsSecondaryTypeOffset] = 0x03; // POISON
    data[Gen3Constants.bsCatchRateOffset] = 45;
    data[Gen3Constants.bsGrowthCurveOffset] = 3; // MEDIUM_SLOW
    data[Gen3Constants.bsAbility1Offset] = 65; // Overgrow
    data[Gen3Constants.bsAbility2Offset] = 0;
    // Held items: common=0, rare=0
    data[Gen3Constants.bsCommonHeldItemOffset] = 0;
    data[Gen3Constants.bsCommonHeldItemOffset + 1] = 0;
    data[Gen3Constants.bsRareHeldItemOffset] = 0;
    data[Gen3Constants.bsRareHeldItemOffset + 1] = 0;
    data[Gen3Constants.bsGenderRatioOffset] = 31;

    // Build a ROM with enough space
    const rom = new Uint8Array(0x100);
    rom.set(data, 0);

    loadBasicPokeStats(pk, rom, 0);

    expect(pk.hp).toBe(45);
    expect(pk.attack).toBe(49);
    expect(pk.defense).toBe(49);
    expect(pk.speed).toBe(45);
    expect(pk.spatk).toBe(65);
    expect(pk.spdef).toBe(65);
    expect(pk.primaryType).toBe("GRASS");
    expect(pk.secondaryType).toBe("POISON");
    expect(pk.catchRate).toBe(45);
    expect(pk.ability1).toBe(65);
    expect(pk.ability2).toBe(0);
    expect(pk.genderRatio).toBe(31);
  });

  it("sets secondaryType to null when same as primary", () => {
    const pk = new Pokemon();
    const data = new Uint8Array(0x1c);
    data[Gen3Constants.bsPrimaryTypeOffset] = 0x00; // NORMAL
    data[Gen3Constants.bsSecondaryTypeOffset] = 0x00; // NORMAL (same)
    const rom = new Uint8Array(0x100);
    rom.set(data, 0);

    loadBasicPokeStats(pk, rom, 0);
    expect(pk.primaryType).toBe("NORMAL");
    expect(pk.secondaryType).toBeNull();
  });

  it("handles guaranteed held item (item1 == item2)", () => {
    const pk = new Pokemon();
    const data = new Uint8Array(0x1c);
    // Write item 42 to both common and rare slots
    data[Gen3Constants.bsCommonHeldItemOffset] = 42;
    data[Gen3Constants.bsCommonHeldItemOffset + 1] = 0;
    data[Gen3Constants.bsRareHeldItemOffset] = 42;
    data[Gen3Constants.bsRareHeldItemOffset + 1] = 0;
    const rom = new Uint8Array(0x100);
    rom.set(data, 0);

    loadBasicPokeStats(pk, rom, 0);
    expect(pk.guaranteedHeldItem).toBe(42);
    expect(pk.commonHeldItem).toBe(0);
    expect(pk.rareHeldItem).toBe(0);
  });

  it("handles different common/rare held items", () => {
    const pk = new Pokemon();
    const data = new Uint8Array(0x1c);
    data[Gen3Constants.bsCommonHeldItemOffset] = 10;
    data[Gen3Constants.bsCommonHeldItemOffset + 1] = 0;
    data[Gen3Constants.bsRareHeldItemOffset] = 20;
    data[Gen3Constants.bsRareHeldItemOffset + 1] = 0;
    const rom = new Uint8Array(0x100);
    rom.set(data, 0);

    loadBasicPokeStats(pk, rom, 0);
    expect(pk.guaranteedHeldItem).toBe(0);
    expect(pk.commonHeldItem).toBe(10);
    expect(pk.rareHeldItem).toBe(20);
  });
});

describe("saveBasicPokeStats", () => {
  it("roundtrips stats through save then load", () => {
    const pk = new Pokemon();
    pk.hp = 100;
    pk.attack = 120;
    pk.defense = 80;
    pk.speed = 90;
    pk.spatk = 110;
    pk.spdef = 85;
    pk.primaryType = "FIRE" as any;
    pk.secondaryType = "FLYING" as any;
    pk.catchRate = 45;
    pk.ability1 = 66;
    pk.ability2 = 18;
    pk.guaranteedHeldItem = 0;
    pk.commonHeldItem = 10;
    pk.rareHeldItem = 20;
    pk.genderRatio = 31;

    const rom = new Uint8Array(0x100);
    saveBasicPokeStats(pk, rom, 0);

    const pk2 = new Pokemon();
    loadBasicPokeStats(pk2, rom, 0);

    expect(pk2.hp).toBe(100);
    expect(pk2.attack).toBe(120);
    expect(pk2.defense).toBe(80);
    expect(pk2.speed).toBe(90);
    expect(pk2.spatk).toBe(110);
    expect(pk2.spdef).toBe(85);
    expect(pk2.primaryType).toBe("FIRE");
    expect(pk2.secondaryType).toBe("FLYING");
    expect(pk2.catchRate).toBe(45);
    expect(pk2.ability1).toBe(66);
    expect(pk2.ability2).toBe(18);
    expect(pk2.genderRatio).toBe(31);
  });
});

// ---- Move data parsing ----

describe("loadMoveData", () => {
  it("parses move data from synthetic bytes", () => {
    // Build a ROM with move data at offset 0. Move #1 starts at 0x0C.
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = 0; // effectIndex
    rom[offs + 1] = 60; // power
    rom[offs + 2] = 0x00; // type = NORMAL
    rom[offs + 3] = 100; // accuracy
    rom[offs + 4] = 35; // PP
    rom[offs + 5] = 0; // secondary effect chance
    rom[offs + 6] = 0; // target
    rom[offs + 7] = 0; // priority
    rom[offs + 8] = 0x01; // flags (makes contact)

    const move = loadMoveData(rom, 0, 1);
    expect(move.number).toBe(1);
    expect(move.power).toBe(60);
    expect(move.hitratio).toBe(100);
    expect(move.pp).toBe(35);
    expect(move.type).toBe("NORMAL");
    expect(move.category).toBe(MoveCategory.PHYSICAL); // NORMAL is physical in Gen 3
    expect(move.makesContact).toBe(true);
    expect(move.priority).toBe(0);
  });

  it("handles signed priority (negative)", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 1] = 40; // power
    rom[offs + 2] = 0x0b; // WATER
    rom[offs + 3] = 100;
    rom[offs + 4] = 30;
    rom[offs + 7] = 0xff; // priority = -1

    const move = loadMoveData(rom, 0, 1);
    expect(move.priority).toBe(-1);
  });

  it("classifies status moves (power=0)", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = 0; // effectIndex
    rom[offs + 1] = 0; // power = 0
    rom[offs + 2] = 0x0e; // PSYCHIC
    rom[offs + 3] = 0; // accuracy
    rom[offs + 4] = 20;
    rom[offs + 7] = 0;

    const move = loadMoveData(rom, 0, 1);
    expect(move.category).toBe(MoveCategory.STATUS);
  });

  it("loads stat change effects (Swords Dance = noDamageAtkPlusTwoEffect)", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.noDamageAtkPlusTwoEffect;
    rom[offs + 1] = 0; // power
    rom[offs + 2] = 0x00; // NORMAL
    rom[offs + 3] = 0;
    rom[offs + 4] = 30;
    rom[offs + 6] = 16; // target = self

    const move = loadMoveData(rom, 0, 1);
    expect(move.statChangeMoveType).toBe(StatChangeMoveType.NO_DAMAGE_USER);
    expect(move.statChanges[0].type).toBe(StatChangeType.ATTACK);
    expect(move.statChanges[0].stages).toBe(2);
  });

  it("loads status effects (sleep effect)", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.noDamageSleepEffect;
    rom[offs + 1] = 0;
    rom[offs + 2] = 0x00; // NORMAL
    rom[offs + 3] = 75;
    rom[offs + 4] = 15;

    const move = loadMoveData(rom, 0, 1);
    expect(move.statusMoveType).toBe(StatusMoveType.NO_DAMAGE);
    expect(move.statusType).toBe(StatusType.SLEEP);
  });

  it("loads damage+burn effect", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.damageBurnEffect;
    rom[offs + 1] = 60; // power
    rom[offs + 2] = 0x0a; // FIRE
    rom[offs + 3] = 100;
    rom[offs + 4] = 15;
    rom[offs + 5] = 10; // 10% burn chance

    const move = loadMoveData(rom, 0, 1);
    expect(move.statusMoveType).toBe(StatusMoveType.DAMAGE);
    expect(move.statusType).toBe(StatusType.BURN);
    expect(move.statusPercentChance).toBe(10);
  });

  it("loads increased crit effect", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.increasedCritEffect;
    rom[offs + 1] = 70;
    rom[offs + 2] = 0x00;
    rom[offs + 3] = 100;
    rom[offs + 4] = 20;

    const move = loadMoveData(rom, 0, 1);
    expect(move.criticalChance).toBe(CriticalChance.INCREASED);
  });

  it("loads flinch effect with secondary chance", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.flinchEffect;
    rom[offs + 1] = 30;
    rom[offs + 2] = 0x00;
    rom[offs + 3] = 100;
    rom[offs + 4] = 10;
    rom[offs + 5] = 30; // 30% flinch

    const move = loadMoveData(rom, 0, 1);
    expect(move.flinchPercentChance).toBe(30);
  });

  it("loads recoil effect", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.damageRecoil25PercentEffect;
    rom[offs + 1] = 120;
    rom[offs + 2] = 0x00;
    rom[offs + 3] = 100;
    rom[offs + 4] = 15;

    const move = loadMoveData(rom, 0, 1);
    expect(move.recoilPercent).toBe(25);
  });

  it("loads charge move effect", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.solarbeamEffect;
    rom[offs + 1] = 120;
    rom[offs + 2] = 0x0c; // GRASS
    rom[offs + 3] = 100;
    rom[offs + 4] = 10;

    const move = loadMoveData(rom, 0, 1);
    expect(move.isChargeMove).toBe(true);
  });

  it("loads recharge move effect", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.rechargeEffect;
    rom[offs + 1] = 150;
    rom[offs + 2] = 0x00;
    rom[offs + 3] = 90;
    rom[offs + 4] = 5;

    const move = loadMoveData(rom, 0, 1);
    expect(move.isRechargeMove).toBe(true);
  });
});

describe("saveMoveData", () => {
  it("roundtrips move data through save then load", () => {
    const rom = new Uint8Array(0x100);
    const move = new Move();
    move.number = 1;
    move.effectIndex = 0;
    move.power = 80;
    move.type = "FIRE" as any;
    move.hitratio = 95;
    move.pp = 15;

    saveMoveData(rom, 0, move);

    const offs = 1 * 0x0c;
    expect(rom[offs + 0]).toBe(0); // effectIndex
    expect(rom[offs + 1]).toBe(80); // power
    expect(rom[offs + 2]).toBe(Gen3Constants.typeToByte("FIRE")); // type
    expect(rom[offs + 3]).toBe(95); // accuracy
    expect(rom[offs + 4]).toBe(15); // PP
  });
});

// ---- Type table construction ----

describe("Gen3 type table", () => {
  it("maps byte 0x00 to NORMAL", () => {
    expect(Gen3Constants.typeTable[0x00]).toBe("NORMAL");
  });

  it("maps byte 0x01 to FIGHTING", () => {
    expect(Gen3Constants.typeTable[0x01]).toBe("FIGHTING");
  });

  it("maps byte 0x0A to FIRE", () => {
    expect(Gen3Constants.typeTable[0x0a]).toBe("FIRE");
  });

  it("maps byte 0x0B to WATER", () => {
    expect(Gen3Constants.typeTable[0x0b]).toBe("WATER");
  });

  it("maps byte 0x0C to GRASS", () => {
    expect(Gen3Constants.typeTable[0x0c]).toBe("GRASS");
  });

  it("maps byte 0x10 to DRAGON", () => {
    expect(Gen3Constants.typeTable[0x10]).toBe("DRAGON");
  });

  it("maps byte 0x11 to DARK", () => {
    expect(Gen3Constants.typeTable[0x11]).toBe("DARK");
  });

  it("maps byte 0x08 to STEEL", () => {
    expect(Gen3Constants.typeTable[0x08]).toBe("STEEL");
  });

  it("has null for unmapped byte 0x09 (???-type)", () => {
    expect(Gen3Constants.typeTable[0x09]).toBeNull();
  });

  it("has null for unmapped byte 0x12", () => {
    expect(Gen3Constants.typeTable[0x12]).toBeNull();
  });

  it("has 256 entries", () => {
    expect(Gen3Constants.typeTable.length).toBe(256);
  });
});

describe("Gen3Constants.typeToByte", () => {
  it("converts NORMAL to 0x00", () => {
    expect(Gen3Constants.typeToByte("NORMAL")).toBe(0x00);
  });

  it("converts FIRE to 0x0A", () => {
    expect(Gen3Constants.typeToByte("FIRE")).toBe(0x0a);
  });

  it("converts DARK to 0x11", () => {
    expect(Gen3Constants.typeToByte("DARK")).toBe(0x11);
  });

  it("converts STEEL to 0x08", () => {
    expect(Gen3Constants.typeToByte("STEEL")).toBe(0x08);
  });

  it("returns 0x09 for null (???-type)", () => {
    expect(Gen3Constants.typeToByte(null as any)).toBe(0x09);
  });
});

// ---- RomEntry ----

describe("RomEntry", () => {
  it("initializes with defaults", () => {
    const re = new RomEntry();
    expect(re.name).toBe("");
    expect(re.romCode).toBe("");
    expect(re.version).toBe(0);
    expect(re.romType).toBe(0);
    expect(re.entries.size).toBe(0);
  });

  it("copies from another RomEntry", () => {
    const original = new RomEntry();
    original.name = "TestRom";
    original.romCode = "AXVE";
    original.version = 1;
    original.entries.set("TestKey", 42);
    original.arrayEntries.set("TestArray", [1, 2, 3]);

    const copy = new RomEntry(original);
    expect(copy.name).toBe("TestRom");
    expect(copy.romCode).toBe("AXVE");
    expect(copy.version).toBe(1);
    expect(copy.entries.get("TestKey")).toBe(42);
    expect(copy.arrayEntries.get("TestArray")).toEqual([1, 2, 3]);

    // Ensure deep copy
    original.entries.set("TestKey", 99);
    expect(copy.entries.get("TestKey")).toBe(42);
  });

  it("getValue returns 0 for missing key and creates it", () => {
    const re = new RomEntry();
    expect(re.getValue("MissingKey")).toBe(0);
    expect(re.entries.has("MissingKey")).toBe(true);
  });

  it("getString returns empty string for missing key", () => {
    const re = new RomEntry();
    expect(re.getString("MissingKey")).toBe("");
    expect(re.strings.has("MissingKey")).toBe(true);
  });
});

// ---- parseRomEntries ----

describe("parseRomEntries", () => {
  it("parses a basic INI with one entry", () => {
    const ini = `
[Ruby (U)]
Game=AXVE
Version=0
Type=Ruby
PokemonCount=0x19B
PokemonNameLength=11
MoveCount=0x162
    `.trim();

    const entries = parseRomEntries(ini);
    expect(entries.length).toBe(1);
    expect(entries[0].name).toBe("Ruby (U)");
    expect(entries[0].romCode).toBe("AXVE");
    expect(entries[0].version).toBe(0);
    expect(entries[0].romType).toBe(Gen3Constants.RomType_Ruby);
    expect(entries[0].getValue("PokemonCount")).toBe(0x19b);
    expect(entries[0].getValue("MoveCount")).toBe(0x162);
  });

  it("parses array entries", () => {
    const ini = `
[Test]
Game=TEST
TestArray=[0x10,0x20,0x30]
EmptyArray=[]
    `.trim();

    const entries = parseRomEntries(ini);
    expect(entries[0].arrayEntries.get("TestArray")).toEqual([0x10, 0x20, 0x30]);
    expect(entries[0].arrayEntries.get("EmptyArray")).toEqual([]);
  });

  it("strips comments", () => {
    const ini = `
[Test]
Game=AXVE // This is a comment
Version=0
    `.trim();

    const entries = parseRomEntries(ini);
    expect(entries[0].romCode).toBe("AXVE");
  });

  it("handles CopyFrom", () => {
    const ini = `
[Base]
Game=AXVE
Version=0
Type=Ruby
SomeValue=42
SomeArray=[1,2,3]

[Copy]
Game=AXVP
CopyStaticPokemon=0
CopyFrom=Base
Version=0
Type=Ruby
    `.trim();

    const entries = parseRomEntries(ini);
    expect(entries.length).toBe(2);
    const copy = entries[1];
    expect(copy.entries.get("SomeValue")).toBe(42);
    expect(copy.arrayEntries.get("SomeArray")).toEqual([1, 2, 3]);
  });

  it("handles all rom types", () => {
    const ini = `
[R]
Game=R
Type=Ruby
[S]
Game=S
Type=Sapp
[E]
Game=E
Type=Em
[FL]
Game=FL
Type=FRLG
    `.trim();

    const entries = parseRomEntries(ini);
    expect(entries[0].romType).toBe(Gen3Constants.RomType_Ruby);
    expect(entries[1].romType).toBe(Gen3Constants.RomType_Sapp);
    expect(entries[2].romType).toBe(Gen3Constants.RomType_Em);
    expect(entries[3].romType).toBe(Gen3Constants.RomType_FRLG);
  });
});

// ---- Text handling ----

describe("lengthOfStringAt", () => {
  it("returns length up to 0xFF terminator", () => {
    const rom = new Uint8Array([0x01, 0x02, 0x03, 0xff, 0x00]);
    expect(lengthOfStringAt(rom, 0)).toBe(3);
  });

  it("returns 0 for immediate terminator", () => {
    const rom = new Uint8Array([0xff, 0x00]);
    expect(lengthOfStringAt(rom, 0)).toBe(0);
  });
});

// ---- emptyPokemonSig ----

describe("emptyPokemonSig", () => {
  it("has the correct length (28 bytes = baseStatsEntrySize)", () => {
    expect(emptyPokemonSig.length).toBe(Gen3Constants.baseStatsEntrySize);
  });

  it("starts with 0x32, 0x96", () => {
    expect(emptyPokemonSig[0]).toBe(0x32);
    expect(emptyPokemonSig[1]).toBe(0x96);
  });
});

// ---- Stat change edge cases ----

describe("move stat change damage target effects", () => {
  it("loads damage + atk minus one with secondary chance", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.damageAtkMinusOneEffect;
    rom[offs + 1] = 40;
    rom[offs + 2] = 0x00;
    rom[offs + 3] = 100;
    rom[offs + 4] = 35;
    rom[offs + 5] = 30; // 30% chance

    const move = loadMoveData(rom, 0, 1);
    expect(move.statChangeMoveType).toBe(StatChangeMoveType.DAMAGE_TARGET);
    expect(move.statChanges[0].type).toBe(StatChangeType.ATTACK);
    expect(move.statChanges[0].stages).toBe(-1);
    expect(move.statChanges[0].percentChance).toBe(30);
  });

  it("sets 100% chance when secondary effect chance is 0 for damage moves", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.damageUserAllPlusOneEffect;
    rom[offs + 1] = 60;
    rom[offs + 2] = 0x00;
    rom[offs + 3] = 100;
    rom[offs + 4] = 20;
    rom[offs + 5] = 0; // 0% => should become 100%

    const move = loadMoveData(rom, 0, 1);
    expect(move.statChangeMoveType).toBe(StatChangeMoveType.DAMAGE_USER);
    expect(move.statChanges[0].percentChance).toBe(100);
  });
});

// ---- Multi-stat change effects ----

describe("multi-stat change effects", () => {
  it("loads defense+spdef plus one effect", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.noDamageDefAndSpDefPlusOneEffect;
    rom[offs + 1] = 0;
    rom[offs + 2] = 0x00;
    rom[offs + 6] = 16; // target = self

    const move = loadMoveData(rom, 0, 1);
    expect(move.statChanges[0].type).toBe(StatChangeType.DEFENSE);
    expect(move.statChanges[0].stages).toBe(1);
    expect(move.statChanges[1].type).toBe(StatChangeType.SPECIAL_DEFENSE);
    expect(move.statChanges[1].stages).toBe(1);
  });

  it("loads atk+def minus one effect", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.damageUserAtkAndDefMinusOneEffect;
    rom[offs + 1] = 120;
    rom[offs + 2] = 0x01; // FIGHTING
    rom[offs + 3] = 100;
    rom[offs + 4] = 5;
    rom[offs + 5] = 0;

    const move = loadMoveData(rom, 0, 1);
    expect(move.statChangeMoveType).toBe(StatChangeMoveType.DAMAGE_USER);
    expect(move.statChanges[0].type).toBe(StatChangeType.ATTACK);
    expect(move.statChanges[0].stages).toBe(-1);
    expect(move.statChanges[1].type).toBe(StatChangeType.DEFENSE);
    expect(move.statChanges[1].stages).toBe(-1);
  });
});

// ---- Sky Attack combined effect ----

describe("sky attack combined effect", () => {
  it("loads increased crit, flinch, and charge", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.skyAttackEffect;
    rom[offs + 1] = 140;
    rom[offs + 2] = 0x02; // FLYING
    rom[offs + 3] = 90;
    rom[offs + 4] = 5;
    rom[offs + 5] = 30;

    const move = loadMoveData(rom, 0, 1);
    expect(move.criticalChance).toBe(CriticalChance.INCREASED);
    expect(move.flinchPercentChance).toBe(30);
    expect(move.isChargeMove).toBe(true);
  });
});

// ---- Toxic effect ----

describe("toxic effect", () => {
  it("loads toxic poison status", () => {
    const rom = new Uint8Array(0x100);
    const offs = 1 * 0x0c;
    rom[offs + 0] = Gen3Constants.toxicEffect;
    rom[offs + 1] = 0;
    rom[offs + 2] = 0x03; // POISON

    const move = loadMoveData(rom, 0, 1);
    expect(move.statusMoveType).toBe(StatusMoveType.NO_DAMAGE);
    expect(move.statusType).toBe(StatusType.TOXIC_POISON);
  });
});

// ---- findPointerPrefixAndSuffix ----

describe("findPointerPrefixAndSuffix", () => {
  it("returns -1 when prefix has odd length", () => {
    const rom = new Uint8Array(10);
    expect(findPointerPrefixAndSuffix(rom, "ABC", "DE")).toBe(-1);
  });

  it("returns -1 when suffix has odd length", () => {
    const rom = new Uint8Array(10);
    expect(findPointerPrefixAndSuffix(rom, "AB", "DEF")).toBe(-1);
  });

  it("returns -1 when pattern is not found", () => {
    const rom = new Uint8Array(100);
    expect(findPointerPrefixAndSuffix(rom, "AABB", "CCDD")).toBe(-1);
  });
});
