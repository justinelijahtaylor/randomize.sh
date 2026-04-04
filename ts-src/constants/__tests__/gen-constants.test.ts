import { describe, it, expect } from "vitest";
import * as Gen1Constants from "../gen1-constants";
import * as Gen2Constants from "../gen2-constants";
import * as Gen3Constants from "../gen3-constants";
import * as Gen4Constants from "../gen4-constants";
import * as Gen5Constants from "../gen5-constants";
import * as Gen6Constants from "../gen6-constants";
import * as Gen7Constants from "../gen7-constants";
import * as GBConstants from "../gb-constants";
import * as N3DSConstants from "../n3ds-constants";
import * as Moves from "../moves";

describe("Gen 1 Constants", () => {
  it("has 151 Pokemon (implicitly via the Pokedex ending at Mew)", () => {
    // Gen 1 does not export pokemonCount directly; verified via species.ts
    expect(Gen1Constants.tmCount).toBe(50);
    expect(Gen1Constants.hmCount).toBe(5);
  });

  it("has a type table with expected types", () => {
    expect(Gen1Constants.typeTable).toBeDefined();
    expect(Gen1Constants.typeTable.length).toBe(0x20);
    expect(Gen1Constants.typeTable[0x00]).toBe("NORMAL");
    expect(Gen1Constants.typeTable[0x01]).toBe("FIGHTING");
    expect(Gen1Constants.typeTable[0x14]).toBe("FIRE");
    expect(Gen1Constants.typeTable[0x15]).toBe("WATER");
    expect(Gen1Constants.typeTable[0x16]).toBe("GRASS");
    expect(Gen1Constants.typeTable[0x17]).toBe("ELECTRIC");
    expect(Gen1Constants.typeTable[0x18]).toBe("PSYCHIC");
    expect(Gen1Constants.typeTable[0x19]).toBe("ICE");
    expect(Gen1Constants.typeTable[0x1A]).toBe("DRAGON");
  });

  it("does not include Steel or Dark types (Gen 1)", () => {
    expect(Gen1Constants.typeTable).not.toContain("STEEL");
    expect(Gen1Constants.typeTable).not.toContain("DARK");
  });

  it("has typeToByte that converts type strings to byte values", () => {
    expect(Gen1Constants.typeToByte("NORMAL")).toBe(0x00);
    expect(Gen1Constants.typeToByte("FIRE")).toBe(0x14);
    expect(Gen1Constants.typeToByte("WATER")).toBe(0x15);
    expect(Gen1Constants.typeToByte("DRAGON")).toBe(0x1A);
  });

  it("has gym leader TMs array with 8 entries", () => {
    expect(Gen1Constants.gymLeaderTMs.length).toBe(8);
  });

  it("has field moves array", () => {
    expect(Gen1Constants.fieldMoves).toContain(Moves.cut);
    expect(Gen1Constants.fieldMoves).toContain(Moves.fly);
    expect(Gen1Constants.fieldMoves).toContain(Moves.surf);
    expect(Gen1Constants.fieldMoves).toContain(Moves.strength);
  });

  it("has base stats entry size", () => {
    expect(Gen1Constants.baseStatsEntrySize).toBe(0x1C);
  });

  it("has singular trainers list", () => {
    expect(Gen1Constants.singularTrainers.length).toBeGreaterThan(0);
  });

  it("has increased crit moves for Gen 1", () => {
    expect(Gen1Constants.increasedCritMoves).toContain(Moves.karateChop);
    expect(Gen1Constants.increasedCritMoves).toContain(Moves.slash);
  });
});

describe("Gen 2 Constants", () => {
  it("has 251 Pokemon", () => {
    expect(Gen2Constants.pokemonCount).toBe(251);
  });

  it("has 251 moves", () => {
    expect(Gen2Constants.moveCount).toBe(251);
  });

  it("has 50 TMs and 7 HMs", () => {
    expect(Gen2Constants.tmCount).toBe(50);
    expect(Gen2Constants.hmCount).toBe(7);
  });

  it("has a type table with Steel and Dark types", () => {
    expect(Gen2Constants.typeTable).toBeDefined();
    expect(Gen2Constants.typeTable[0x09]).toBe("STEEL");
    expect(Gen2Constants.typeTable[0x1B]).toBe("DARK");
  });

  it("has typeToByte function", () => {
    expect(Gen2Constants.typeToByte("NORMAL")).toBe(0x00);
    expect(Gen2Constants.typeToByte("STEEL")).toBe(0x09);
    expect(Gen2Constants.typeToByte("DARK")).toBe(0x1B);
  });

  it("has starter names", () => {
    expect(Gen2Constants.starterNames).toContain("CYNDAQUIL");
    expect(Gen2Constants.starterNames).toContain("TOTODILE");
    expect(Gen2Constants.starterNames).toContain("CHIKORITA");
  });

  it("has encounter slot counts", () => {
    expect(Gen2Constants.landEncounterSlots).toBe(7);
    expect(Gen2Constants.seaEncounterSlots).toBe(3);
  });
});

describe("Gen 3 Constants", () => {
  it("has 386 Pokemon", () => {
    expect(Gen3Constants.pokemonCount).toBe(386);
  });

  it("has ROM type constants", () => {
    expect(Gen3Constants.RomType_Ruby).toBe(0);
    expect(Gen3Constants.RomType_Sapp).toBe(1);
    expect(Gen3Constants.RomType_Em).toBe(2);
    expect(Gen3Constants.RomType_FRLG).toBe(3);
  });

  it("has 50 TMs and 8 HMs", () => {
    expect(Gen3Constants.tmCount).toBe(50);
    expect(Gen3Constants.hmCount).toBe(8);
  });

  it("has ROM size constants", () => {
    expect(Gen3Constants.size8M).toBe(0x800000);
    expect(Gen3Constants.size16M).toBe(0x1000000);
    expect(Gen3Constants.size32M).toBe(0x2000000);
  });

  it("has ROM header offsets", () => {
    expect(Gen3Constants.romNameOffset).toBe(0xA0);
    expect(Gen3Constants.romCodeOffset).toBe(0xAC);
    expect(Gen3Constants.romVersionOffset).toBe(0xBC);
  });

  it("has non-empty pointer prefix strings", () => {
    expect(Gen3Constants.wildPokemonPointerPrefix.length).toBeGreaterThan(0);
    expect(Gen3Constants.mapBanksPointerPrefix.length).toBeGreaterThan(0);
  });

  it("has base stats entry size of 0x1C", () => {
    expect(Gen3Constants.baseStatsEntrySize).toBe(0x1C);
  });
});

describe("Gen 4 Constants", () => {
  it("has 493 Pokemon", () => {
    expect(Gen4Constants.pokemonCount).toBe(493);
  });

  it("has 467 moves", () => {
    expect(Gen4Constants.moveCount).toBe(467);
  });

  it("has ROM type constants", () => {
    expect(Gen4Constants.Type_DP).toBe(0);
    expect(Gen4Constants.Type_Plat).toBe(1);
    expect(Gen4Constants.Type_HGSS).toBe(2);
  });

  it("has 92 TMs and 8 HMs", () => {
    expect(Gen4Constants.tmCount).toBe(92);
    expect(Gen4Constants.hmCount).toBe(8);
  });

  it("has forme counts", () => {
    expect(Gen4Constants.dpFormeCount).toBe(5);
    expect(Gen4Constants.platHgSsFormeCount).toBe(12);
  });

  it("has rival script file arrays", () => {
    expect(Gen4Constants.hgssFilesWithRivalScript.length).toBeGreaterThan(0);
    expect(Gen4Constants.ptFilesWithRivalScript.length).toBeGreaterThan(0);
    expect(Gen4Constants.dpFilesWithRivalScript.length).toBeGreaterThan(0);
  });
});

describe("Gen 5 Constants", () => {
  it("has 649 Pokemon", () => {
    expect(Gen5Constants.pokemonCount).toBe(649);
  });

  it("has 559 moves", () => {
    expect(Gen5Constants.moveCount).toBe(559);
  });

  it("has ROM type constants", () => {
    expect(Gen5Constants.Type_BW).toBe(0);
    expect(Gen5Constants.Type_BW2).toBe(1);
  });

  it("has 95 TMs and 6 HMs", () => {
    expect(Gen5Constants.tmCount).toBe(95);
    expect(Gen5Constants.hmCount).toBe(6);
  });

  it("has forme counts for BW and BW2", () => {
    expect(Gen5Constants.bw1FormeCount).toBe(18);
    expect(Gen5Constants.bw2FormeCount).toBe(24);
  });

  it("has non-empty starter script magic strings", () => {
    expect(Gen5Constants.bw1StarterScriptMagic.length).toBeGreaterThan(0);
    expect(Gen5Constants.bw2StarterScriptMagic.length).toBeGreaterThan(0);
  });
});

describe("Gen 6 Constants", () => {
  it("has 721 Pokemon", () => {
    expect(Gen6Constants.pokemonCount).toBe(721);
  });

  it("has move counts for XY and ORAS", () => {
    expect(Gen6Constants.moveCountXY).toBe(617);
    expect(Gen6Constants.moveCountORAS).toBe(621);
  });

  it("has ROM type constants from N3DS", () => {
    expect(Gen6Constants.Type_XY).toBe(N3DSConstants.Type_XY);
    expect(Gen6Constants.Type_ORAS).toBe(N3DSConstants.Type_ORAS);
  });

  it("has 100 TMs", () => {
    expect(Gen6Constants.tmCount).toBe(100);
  });

  it("has forme counts", () => {
    expect(Gen6Constants.xyFormeCount).toBe(77);
    expect(Gen6Constants.orasFormeCount).toBe(104);
  });

  it("has actually cosmetic forms array", () => {
    expect(Gen6Constants.actuallyCosmeticForms.length).toBeGreaterThan(0);
  });

  it("has irregular formes arrays", () => {
    expect(Gen6Constants.xyIrregularFormes.length).toBeGreaterThan(0);
    expect(Gen6Constants.orasIrregularFormes.length).toBeGreaterThan(0);
    expect(Gen6Constants.orasIrregularFormes.length).toBeGreaterThan(
      Gen6Constants.xyIrregularFormes.length
    );
  });

  it("has useless abilities list", () => {
    expect(Gen6Constants.uselessAbilities.length).toBeGreaterThan(0);
  });
});

describe("Gen 7 Constants", () => {
  it("has Pokemon counts for SM and USUM", () => {
    expect(Gen7Constants.pokemonCountSM).toBe(802);
    expect(Gen7Constants.pokemonCountUSUM).toBe(807);
  });

  it("has move counts for SM and USUM", () => {
    expect(Gen7Constants.moveCountSM).toBe(719);
    expect(Gen7Constants.moveCountUSUM).toBe(728);
  });

  it("has ROM type constants from N3DS", () => {
    expect(Gen7Constants.Type_SM).toBe(N3DSConstants.Type_SM);
    expect(Gen7Constants.Type_USUM).toBe(N3DSConstants.Type_USUM);
  });

  it("has 100 TMs", () => {
    expect(Gen7Constants.tmCount).toBe(100);
  });

  it("has forme counts", () => {
    expect(Gen7Constants.formeCountSM).toBe(158);
    expect(Gen7Constants.formeCountUSUM).toBe(168);
  });

  it("has highest ability indices", () => {
    expect(Gen7Constants.highestAbilityIndexSM).toBe(232);
    expect(Gen7Constants.highestAbilityIndexUSUM).toBe(233);
  });

  it("has evolution method count", () => {
    expect(Gen7Constants.evolutionMethodCount).toBe(42);
  });

  it("has USUM counts greater than SM counts", () => {
    expect(Gen7Constants.pokemonCountUSUM).toBeGreaterThan(Gen7Constants.pokemonCountSM);
    expect(Gen7Constants.moveCountUSUM).toBeGreaterThan(Gen7Constants.moveCountSM);
    expect(Gen7Constants.formeCountUSUM).toBeGreaterThan(Gen7Constants.formeCountSM);
  });
});

describe("Cross-generation Pokemon count progression", () => {
  it("each generation has strictly more Pokemon than the previous", () => {
    const counts = [
      151, // Gen 1 (implicit)
      Gen2Constants.pokemonCount,
      Gen3Constants.pokemonCount,
      Gen4Constants.pokemonCount,
      Gen5Constants.pokemonCount,
      Gen6Constants.pokemonCount,
      Gen7Constants.pokemonCountSM,
    ];
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1]);
    }
  });

  it("has consistent Pokemon counts matching known values", () => {
    expect(Gen2Constants.pokemonCount).toBe(251);
    expect(Gen3Constants.pokemonCount).toBe(386);
    expect(Gen4Constants.pokemonCount).toBe(493);
    expect(Gen5Constants.pokemonCount).toBe(649);
    expect(Gen6Constants.pokemonCount).toBe(721);
    expect(Gen7Constants.pokemonCountSM).toBe(802);
    expect(Gen7Constants.pokemonCountUSUM).toBe(807);
  });
});

describe("GB Constants", () => {
  it("has ROM size constraints", () => {
    expect(GBConstants.minRomSize).toBe(0x80000);
    expect(GBConstants.maxRomSize).toBe(0x200000);
  });

  it("has header offsets", () => {
    expect(GBConstants.jpFlagOffset).toBe(0x14A);
    expect(GBConstants.versionOffset).toBe(0x14C);
    expect(GBConstants.crcOffset).toBe(0x14E);
    expect(GBConstants.romSigOffset).toBe(0x134);
  });

  it("has string terminator constants", () => {
    expect(GBConstants.stringTerminator).toBe(0x50);
  });

  it("has bank size", () => {
    expect(GBConstants.bankSize).toBe(0x4000);
  });

  it("has Z80 instruction constants", () => {
    expect(GBConstants.gbZ80Jump).toBe(0xC3);
    expect(GBConstants.gbZ80Nop).toBe(0x00);
    expect(GBConstants.gbZ80Ret).toBe(0xC9);
  });

  it("has physical types set", () => {
    expect(GBConstants.physicalTypes).toContain("NORMAL");
    expect(GBConstants.physicalTypes).toContain("FIGHTING");
    expect(GBConstants.physicalTypes).toContain("ROCK");
    expect(GBConstants.physicalTypes).not.toContain("FIRE");
    expect(GBConstants.physicalTypes).not.toContain("WATER");
  });
});

describe("N3DS Constants", () => {
  it("has ROM type constants in order", () => {
    expect(N3DSConstants.Type_XY).toBe(0);
    expect(N3DSConstants.Type_ORAS).toBe(1);
    expect(N3DSConstants.Type_SM).toBe(2);
    expect(N3DSConstants.Type_USUM).toBe(3);
  });

  it("has text variable codes for each ROM type", () => {
    const xyVars = N3DSConstants.getTextVariableCodes(N3DSConstants.Type_XY);
    const orasVars = N3DSConstants.getTextVariableCodes(N3DSConstants.Type_ORAS);
    const smVars = N3DSConstants.getTextVariableCodes(N3DSConstants.Type_SM);

    expect(xyVars.size).toBeGreaterThan(0);
    expect(orasVars.size).toBeGreaterThan(0);
    expect(smVars.size).toBeGreaterThan(0);
  });

  it("returns an empty map for an unknown ROM type", () => {
    const unknownVars = N3DSConstants.getTextVariableCodes(99);
    expect(unknownVars.size).toBe(0);
  });
});
