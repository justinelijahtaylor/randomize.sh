/*----------------------------------------------------------------------------*/
/*--  gen3-rom-handler.ts - randomizer handler for R/S/E/FR/LG.             --*/
/*--                                                                        --*/
/*--  Part of "Universal Pokemon Randomizer ZX" by the UPR-ZX team          --*/
/*--  Originally part of "Universal Pokemon Randomizer" by Dabomstew        --*/
/*--  Pokemon and any associated names and the like are                     --*/
/*--  trademark and (C) Nintendo 1996-2020.                                 --*/
/*--                                                                        --*/
/*--  The custom code written here is licensed under the terms of the GPL:  --*/
/*--                                                                        --*/
/*--  This program is free software: you can redistribute it and/or modify  --*/
/*--  it under the terms of the GNU General Public License as published by  --*/
/*--  the Free Software Foundation, either version 3 of the License, or     --*/
/*--  (at your option) any later version.                                   --*/
/*--                                                                        --*/
/*--  This program is distributed in the hope that it will be useful,       --*/
/*--  but WITHOUT ANY WARRANTY; without even the implied warranty of        --*/
/*--  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the          --*/
/*--  GNU General Public License for more details.                          --*/
/*--                                                                        --*/
/*--  You should have received a copy of the GNU General Public License     --*/
/*--  along with this program. If not, see <http://www.gnu.org/licenses/>.  --*/
/*----------------------------------------------------------------------------*/

// NOTE: Gen3RomHandler will extend AbstractRomHandler once all abstract methods
// are implemented. For now it is standalone to allow incremental porting.
// import { AbstractRomHandler } from "./abstract-rom-handler";
import * as Gen3Constants from "../constants/gen3-constants";
import * as GBConstants from "../constants/gb-constants";
import * as GlobalConstants from "../constants/global-constants";
import * as Moves from "../constants/moves";
import { Pokemon } from "../pokemon/pokemon";
import { Move, MoveStatChange } from "../pokemon/move";
import { MoveCategory } from "../pokemon/move-category";
import { StatChangeMoveType } from "../pokemon/stat-change-move-type";
import { StatChangeType } from "../pokemon/stat-change-type";
import { StatusMoveType } from "../pokemon/status-move-type";
import { StatusType } from "../pokemon/status-type";
import { CriticalChance } from "../pokemon/critical-chance";
import { expCurveFromByte, expCurveToByte } from "../pokemon/exp-curve";
import { RomFunctions } from "../utils/rom-functions";

// ---- Inner types ----

interface TMOrMTTextEntry {
  number: number;
  mapBank: number;
  mapNumber: number;
  personNum: number;
  offsetInScript: number;
  actualOffset: number;
  template: string;
  isMoveTutor: boolean;
}

export interface StaticPokemon {
  speciesOffsets: number[];
  levelOffsets: number[];
}

export class RomEntry {
  name: string = "";
  romCode: string = "";
  tableFile: string = "";
  version: number = 0;
  romType: number = 0;
  copyStaticPokemon: boolean = false;
  entries: Map<string, number> = new Map();
  arrayEntries: Map<string, number[]> = new Map();
  strings: Map<string, string> = new Map();
  staticPokemon: StaticPokemon[] = [];
  roamingPokemon: StaticPokemon[] = [];
  tmmtTexts: TMOrMTTextEntry[] = [];
  codeTweaks: Map<string, string> = new Map();
  expectedCRC32: number = -1;

  constructor(toCopy?: RomEntry) {
    if (toCopy) {
      this.name = toCopy.name;
      this.romCode = toCopy.romCode;
      this.tableFile = toCopy.tableFile;
      this.version = toCopy.version;
      this.romType = toCopy.romType;
      this.copyStaticPokemon = toCopy.copyStaticPokemon;
      this.entries = new Map(toCopy.entries);
      this.arrayEntries = new Map(toCopy.arrayEntries);
      this.strings = new Map(toCopy.strings);
      this.staticPokemon = [...toCopy.staticPokemon];
      this.roamingPokemon = [...toCopy.roamingPokemon];
      this.tmmtTexts = [...toCopy.tmmtTexts];
      this.codeTweaks = new Map(toCopy.codeTweaks);
      this.expectedCRC32 = toCopy.expectedCRC32;
    }
  }

  getValue(key: string): number {
    if (!this.entries.has(key)) {
      this.entries.set(key, 0);
    }
    return this.entries.get(key)!;
  }

  getString(key: string): string {
    if (!this.strings.has(key)) {
      this.strings.set(key, "");
    }
    return this.strings.get(key)!;
  }
}

/**
 * The empty Pokemon signature used to detect unused slots.
 */
export const emptyPokemonSig = new Uint8Array([
  0x32, 0x96, 0x32, 0x96, 0x96, 0x32, 0x00, 0x00, 0x03, 0x01, 0xaa, 0x0a,
  0x00, 0x00, 0x00, 0x00, 0xff, 0x78, 0x00, 0x00, 0x0f, 0x0f, 0x00, 0x00,
  0x00, 0x04, 0x00, 0x00,
]);

// ---- Helper functions ----

function parseRIInt(off: string): number {
  let radix = 10;
  off = off.trim().toLowerCase();
  if (off.startsWith("0x") || off.startsWith("&h")) {
    radix = 16;
    off = off.substring(2);
  }
  const result = parseInt(off, radix);
  if (isNaN(result)) {
    return 0;
  }
  return result;
}

function parseRILong(off: string): number {
  // In TS we use number (64-bit float), sufficient for these values
  return parseRIInt(off);
}

function parseStaticPokemon(staticPokemonString: string): StaticPokemon {
  const sp: StaticPokemon = { speciesOffsets: [], levelOffsets: [] };
  const pattern = /[A-Za-z]+=\[(0x[0-9a-fA-F]+,?\s?)+\]/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(staticPokemonString)) !== null) {
    const segments = match[0].split("=");
    const romOffsets = segments[1].substring(1, segments[1].length - 1).split(",");
    const offsets: number[] = romOffsets.map((o) => parseRIInt(o));
    switch (segments[0]) {
      case "Species":
        sp.speciesOffsets = offsets;
        break;
      case "Level":
        sp.levelOffsets = offsets;
        break;
    }
  }
  return sp;
}

// ---- ROM name / code checks ----

export function romName(rom: Uint8Array, name: string): boolean {
  const sigOffset = Gen3Constants.romNameOffset;
  for (let i = 0; i < name.length; i++) {
    if (rom[sigOffset + i] !== name.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

export function romCode(rom: Uint8Array, codeToCheck: string): boolean {
  const sigOffset = Gen3Constants.romCodeOffset;
  for (let i = 0; i < codeToCheck.length; i++) {
    if (rom[sigOffset + i] !== codeToCheck.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

// ---- Byte search helpers ----

export function hexStringToBytes(hexString: string): Uint8Array {
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function find(haystack: Uint8Array, hexString: string): number {
  if (hexString.length % 2 !== 0) {
    return -3; // error
  }
  const searchFor = hexStringToBytes(hexString);
  const found = RomFunctions.search(haystack, searchFor);
  if (found.length === 0) {
    return -1; // not found
  } else if (found.length > 1) {
    return -2; // not unique
  } else {
    return found[0];
  }
}

export function findMultiple(haystack: Uint8Array, hexString: string): number[] {
  if (hexString.length % 2 !== 0) {
    return []; // error
  }
  const searchFor = hexStringToBytes(hexString);
  return RomFunctions.search(haystack, searchFor);
}

// ---- ROM byte read/write helpers ----

export function readWord(rom: Uint8Array, offset: number): number {
  return (rom[offset] & 0xff) + ((rom[offset + 1] & 0xff) << 8);
}

export function writeWord(rom: Uint8Array, offset: number, value: number): void {
  rom[offset] = value & 0xff;
  rom[offset + 1] = (value >>> 8) & 0xff;
}

export function readLong(rom: Uint8Array, offset: number): number {
  return (
    (rom[offset] & 0xff) +
    ((rom[offset + 1] & 0xff) << 8) +
    ((rom[offset + 2] & 0xff) << 16) +
    ((rom[offset + 3] & 0xff) << 24)
  ) >>> 0; // unsigned 32-bit
}

export function writeLong(rom: Uint8Array, offset: number, value: number): void {
  rom[offset] = value & 0xff;
  rom[offset + 1] = (value >>> 8) & 0xff;
  rom[offset + 2] = (value >>> 16) & 0xff;
  rom[offset + 3] = (value >>> 24) & 0xff;
}

export function readPointer(rom: Uint8Array, offset: number): number {
  // GBA pointers are stored as offset + 0x08000000
  const raw = readLong(rom, offset);
  return (raw - 0x08000000) | 0; // signed 32-bit subtraction
}

export function writePointer(rom: Uint8Array, offset: number, pointer: number): void {
  writeLong(rom, offset, (pointer + 0x08000000) >>> 0);
}

export function matches(data: Uint8Array, offset: number, needle: Uint8Array): boolean {
  for (let i = 0; i < needle.length; i++) {
    if (offset + i >= data.length) {
      return false;
    }
    if (data[offset + i] !== needle[i]) {
      return false;
    }
  }
  return true;
}

// ---- ROM detection ----

/**
 * Inner detection logic: checks size, magic prefixes, known game codes.
 */
export function detectRomInner(
  rom: Uint8Array,
  romSize: number,
  roms: RomEntry[]
): boolean {
  if (
    romSize !== Gen3Constants.size8M &&
    romSize !== Gen3Constants.size16M &&
    romSize !== Gen3Constants.size32M
  ) {
    return false;
  }

  // Special case for Emerald unofficial translation
  if (romName(rom, Gen3Constants.unofficialEmeraldROMName)) {
    rom[Gen3Constants.romCodeOffset] = 0x42; // 'B'
    rom[Gen3Constants.romCodeOffset + 1] = 0x50; // 'P'
    rom[Gen3Constants.romCodeOffset + 2] = 0x45; // 'E'
    rom[Gen3Constants.romCodeOffset + 3] = 0x54; // 'T'
    rom[Gen3Constants.headerChecksumOffset] = 0x66;
  }

  // Wild Pokemon header
  if (find(rom, Gen3Constants.wildPokemonPointerPrefix) === -1) {
    return false;
  }

  // Map Banks header
  if (find(rom, Gen3Constants.mapBanksPointerPrefix) === -1) {
    return false;
  }

  // Pokedex Order header (must have exactly 3 matches)
  if (findMultiple(rom, Gen3Constants.pokedexOrderPointerPrefix).length !== 3) {
    return false;
  }

  // Check for matching game code and version
  for (const re of roms) {
    if (
      romCode(rom, re.romCode) &&
      (rom[Gen3Constants.romVersionOffset] & 0xff) === re.version
    ) {
      return true;
    }
  }

  return false; // GBA rom we don't support yet
}

// ---- Pokemon data loading ----

/**
 * Loads basic Pokemon stats from ROM bytes at the given offset.
 */
export function loadBasicPokeStats(
  pk: Pokemon,
  rom: Uint8Array,
  offset: number
): void {
  pk.hp = rom[offset + Gen3Constants.bsHPOffset] & 0xff;
  pk.attack = rom[offset + Gen3Constants.bsAttackOffset] & 0xff;
  pk.defense = rom[offset + Gen3Constants.bsDefenseOffset] & 0xff;
  pk.speed = rom[offset + Gen3Constants.bsSpeedOffset] & 0xff;
  pk.spatk = rom[offset + Gen3Constants.bsSpAtkOffset] & 0xff;
  pk.spdef = rom[offset + Gen3Constants.bsSpDefOffset] & 0xff;

  // Type
  const primaryTypeStr =
    Gen3Constants.typeTable[rom[offset + Gen3Constants.bsPrimaryTypeOffset] & 0xff];
  const secondaryTypeStr =
    Gen3Constants.typeTable[rom[offset + Gen3Constants.bsSecondaryTypeOffset] & 0xff];

  pk.primaryType = primaryTypeStr as any;
  pk.secondaryType =
    secondaryTypeStr === primaryTypeStr ? null : (secondaryTypeStr as any);

  pk.catchRate = rom[offset + Gen3Constants.bsCatchRateOffset] & 0xff;

  const growthByte = rom[offset + Gen3Constants.bsGrowthCurveOffset];
  const curve = expCurveFromByte(growthByte);
  if (curve !== null) {
    pk.growthCurve = curve;
  }

  // Abilities
  pk.ability1 = rom[offset + Gen3Constants.bsAbility1Offset] & 0xff;
  pk.ability2 = rom[offset + Gen3Constants.bsAbility2Offset] & 0xff;

  // Held Items
  const item1 = readWord(rom, offset + Gen3Constants.bsCommonHeldItemOffset);
  const item2 = readWord(rom, offset + Gen3Constants.bsRareHeldItemOffset);

  if (item1 === item2) {
    pk.guaranteedHeldItem = item1;
    pk.commonHeldItem = 0;
    pk.rareHeldItem = 0;
  } else {
    pk.guaranteedHeldItem = 0;
    pk.commonHeldItem = item1;
    pk.rareHeldItem = item2;
  }
  pk.darkGrassHeldItem = -1;

  pk.genderRatio = rom[offset + Gen3Constants.bsGenderRatioOffset] & 0xff;
}

/**
 * Saves basic Pokemon stats to ROM bytes at the given offset.
 */
export function saveBasicPokeStats(
  pk: Pokemon,
  rom: Uint8Array,
  offset: number
): void {
  rom[offset + Gen3Constants.bsHPOffset] = pk.hp;
  rom[offset + Gen3Constants.bsAttackOffset] = pk.attack;
  rom[offset + Gen3Constants.bsDefenseOffset] = pk.defense;
  rom[offset + Gen3Constants.bsSpeedOffset] = pk.speed;
  rom[offset + Gen3Constants.bsSpAtkOffset] = pk.spatk;
  rom[offset + Gen3Constants.bsSpDefOffset] = pk.spdef;

  rom[offset + Gen3Constants.bsPrimaryTypeOffset] = Gen3Constants.typeToByte(
    pk.primaryType as any
  );
  if (pk.secondaryType == null) {
    rom[offset + Gen3Constants.bsSecondaryTypeOffset] =
      rom[offset + Gen3Constants.bsPrimaryTypeOffset];
  } else {
    rom[offset + Gen3Constants.bsSecondaryTypeOffset] = Gen3Constants.typeToByte(
      pk.secondaryType as any
    );
  }

  rom[offset + Gen3Constants.bsCatchRateOffset] = pk.catchRate;
  if (pk.growthCurve !== undefined) {
    rom[offset + Gen3Constants.bsGrowthCurveOffset] = expCurveToByte(pk.growthCurve);
  }

  rom[offset + Gen3Constants.bsAbility1Offset] = pk.ability1;
  if (pk.ability2 === 0) {
    rom[offset + Gen3Constants.bsAbility2Offset] = pk.ability1;
  } else {
    rom[offset + Gen3Constants.bsAbility2Offset] = pk.ability2;
  }

  // Held items
  if (pk.guaranteedHeldItem > 0) {
    writeWord(rom, offset + Gen3Constants.bsCommonHeldItemOffset, pk.guaranteedHeldItem);
    writeWord(rom, offset + Gen3Constants.bsRareHeldItemOffset, pk.guaranteedHeldItem);
  } else {
    writeWord(rom, offset + Gen3Constants.bsCommonHeldItemOffset, pk.commonHeldItem);
    writeWord(rom, offset + Gen3Constants.bsRareHeldItemOffset, pk.rareHeldItem);
  }

  rom[offset + Gen3Constants.bsGenderRatioOffset] = pk.genderRatio;
}

// ---- Move data loading ----

/**
 * Loads move data from ROM bytes.
 * @param rom The ROM data
 * @param moveDataOffset The offset to the move data table
 * @param moveIndex The index of the move (1-based)
 * @returns A partially populated Move (name not set here)
 */
export function loadMoveData(
  rom: Uint8Array,
  moveDataOffset: number,
  moveIndex: number
): Move {
  const move = new Move();
  move.number = moveIndex;
  move.internalId = moveIndex;

  const offs = moveDataOffset + moveIndex * 0x0c;

  move.effectIndex = rom[offs] & 0xff;
  move.power = rom[offs + 1] & 0xff;
  move.hitratio = rom[offs + 3] & 0xff;
  move.pp = rom[offs + 4] & 0xff;
  move.target = rom[offs + 6] & 0xff;

  const typeIndex = rom[offs + 2] & 0xff;
  const typeStr = Gen3Constants.typeTable[typeIndex];
  move.type = typeStr as any;

  move.category = GBConstants.physicalTypes.has(typeStr!)
    ? MoveCategory.PHYSICAL
    : MoveCategory.SPECIAL;
  if (move.power === 0 && !GlobalConstants.noPowerNonStatusMoves.includes(moveIndex)) {
    move.category = MoveCategory.STATUS;
  }

  // Priority is signed
  const rawPriority = rom[offs + 7];
  move.priority = rawPriority > 127 ? rawPriority - 256 : rawPriority;

  const flags = rom[offs + 8] & 0xff;
  move.makesContact = (flags & 1) !== 0;
  move.isSoundMove = Gen3Constants.soundMoves.includes(move.number);

  if (GlobalConstants.normalMultihitMoves.includes(moveIndex)) {
    move.hitCount = 3;
  } else if (GlobalConstants.doubleHitMoves.includes(moveIndex)) {
    move.hitCount = 2;
  } else if (moveIndex === Moves.tripleKick) {
    move.hitCount = 2.71; // assumes the first hit lands
  }

  const secondaryEffectChance = rom[offs + 5] & 0xff;
  loadStatChangesFromEffect(move, secondaryEffectChance);
  loadStatusFromEffect(move, secondaryEffectChance);
  loadMiscMoveInfoFromEffect(move, secondaryEffectChance);

  return move;
}

/**
 * Saves move data back to ROM bytes.
 */
export function saveMoveData(
  rom: Uint8Array,
  moveDataOffset: number,
  move: Move
): void {
  const offs = moveDataOffset + move.number * 0x0c;
  rom[offs] = move.effectIndex;
  rom[offs + 1] = move.power;
  rom[offs + 2] = Gen3Constants.typeToByte(move.type as any);

  let hitratio = Math.round(move.hitratio);
  if (hitratio < 0) hitratio = 0;
  if (hitratio > 100) hitratio = 100;
  rom[offs + 3] = hitratio;
  rom[offs + 4] = move.pp;
}

// ---- Stat change loading ----

function loadStatChangesFromEffect(move: Move, secondaryEffectChance: number): void {
  switch (move.effectIndex) {
    case Gen3Constants.noDamageAtkPlusOneEffect:
    case Gen3Constants.noDamageDefPlusOneEffect:
    case Gen3Constants.noDamageSpAtkPlusOneEffect:
    case Gen3Constants.noDamageEvasionPlusOneEffect:
    case Gen3Constants.noDamageAtkMinusOneEffect:
    case Gen3Constants.noDamageDefMinusOneEffect:
    case Gen3Constants.noDamageSpeMinusOneEffect:
    case Gen3Constants.noDamageAccuracyMinusOneEffect:
    case Gen3Constants.noDamageEvasionMinusOneEffect:
    case Gen3Constants.noDamageAtkPlusTwoEffect:
    case Gen3Constants.noDamageDefPlusTwoEffect:
    case Gen3Constants.noDamageSpePlusTwoEffect:
    case Gen3Constants.noDamageSpAtkPlusTwoEffect:
    case Gen3Constants.noDamageSpDefPlusTwoEffect:
    case Gen3Constants.noDamageAtkMinusTwoEffect:
    case Gen3Constants.noDamageDefMinusTwoEffect:
    case Gen3Constants.noDamageSpeMinusTwoEffect:
    case Gen3Constants.noDamageSpDefMinusTwoEffect:
    case Gen3Constants.minimizeEffect:
    case Gen3Constants.swaggerEffect:
    case Gen3Constants.defenseCurlEffect:
    case Gen3Constants.flatterEffect:
    case Gen3Constants.chargeEffect:
    case Gen3Constants.noDamageAtkAndDefMinusOneEffect:
    case Gen3Constants.noDamageDefAndSpDefPlusOneEffect:
    case Gen3Constants.noDamageAtkAndDefPlusOneEffect:
    case Gen3Constants.noDamageSpAtkAndSpDefPlusOneEffect:
    case Gen3Constants.noDamageAtkAndSpePlusOneEffect:
      if (move.target === 16) {
        move.statChangeMoveType = StatChangeMoveType.NO_DAMAGE_USER;
      } else {
        move.statChangeMoveType = StatChangeMoveType.NO_DAMAGE_TARGET;
      }
      break;

    case Gen3Constants.damageAtkMinusOneEffect:
    case Gen3Constants.damageDefMinusOneEffect:
    case Gen3Constants.damageSpeMinusOneEffect:
    case Gen3Constants.damageSpAtkMinusOneEffect:
    case Gen3Constants.damageSpDefMinusOneEffect:
    case Gen3Constants.damageAccuracyMinusOneEffect:
      move.statChangeMoveType = StatChangeMoveType.DAMAGE_TARGET;
      break;

    case Gen3Constants.damageUserDefPlusOneEffect:
    case Gen3Constants.damageUserAtkPlusOneEffect:
    case Gen3Constants.damageUserAllPlusOneEffect:
    case Gen3Constants.damageUserAtkAndDefMinusOneEffect:
    case Gen3Constants.damageUserSpAtkMinusTwoEffect:
      move.statChangeMoveType = StatChangeMoveType.DAMAGE_USER;
      break;

    default:
      return;
  }

  switch (move.effectIndex) {
    case Gen3Constants.noDamageAtkPlusOneEffect:
    case Gen3Constants.damageUserAtkPlusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = 1;
      break;
    case Gen3Constants.noDamageDefPlusOneEffect:
    case Gen3Constants.damageUserDefPlusOneEffect:
    case Gen3Constants.defenseCurlEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = 1;
      break;
    case Gen3Constants.noDamageSpAtkPlusOneEffect:
    case Gen3Constants.flatterEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
      move.statChanges[0].stages = 1;
      break;
    case Gen3Constants.noDamageEvasionPlusOneEffect:
    case Gen3Constants.minimizeEffect:
      move.statChanges[0].type = StatChangeType.EVASION;
      move.statChanges[0].stages = 1;
      break;
    case Gen3Constants.noDamageAtkMinusOneEffect:
    case Gen3Constants.damageAtkMinusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = -1;
      break;
    case Gen3Constants.noDamageDefMinusOneEffect:
    case Gen3Constants.damageDefMinusOneEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = -1;
      break;
    case Gen3Constants.noDamageSpeMinusOneEffect:
    case Gen3Constants.damageSpeMinusOneEffect:
      move.statChanges[0].type = StatChangeType.SPEED;
      move.statChanges[0].stages = -1;
      break;
    case Gen3Constants.noDamageAccuracyMinusOneEffect:
    case Gen3Constants.damageAccuracyMinusOneEffect:
      move.statChanges[0].type = StatChangeType.ACCURACY;
      move.statChanges[0].stages = -1;
      break;
    case Gen3Constants.noDamageEvasionMinusOneEffect:
      move.statChanges[0].type = StatChangeType.EVASION;
      move.statChanges[0].stages = -1;
      break;
    case Gen3Constants.noDamageAtkPlusTwoEffect:
    case Gen3Constants.swaggerEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = 2;
      break;
    case Gen3Constants.noDamageDefPlusTwoEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = 2;
      break;
    case Gen3Constants.noDamageSpePlusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPEED;
      move.statChanges[0].stages = 2;
      break;
    case Gen3Constants.noDamageSpAtkPlusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
      move.statChanges[0].stages = 2;
      break;
    case Gen3Constants.noDamageSpDefPlusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[0].stages = 2;
      break;
    case Gen3Constants.noDamageAtkMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = -2;
      break;
    case Gen3Constants.noDamageDefMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = -2;
      break;
    case Gen3Constants.noDamageSpeMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPEED;
      move.statChanges[0].stages = -2;
      break;
    case Gen3Constants.noDamageSpDefMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[0].stages = -2;
      break;
    case Gen3Constants.damageSpAtkMinusOneEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
      move.statChanges[0].stages = -1;
      break;
    case Gen3Constants.damageSpDefMinusOneEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[0].stages = -1;
      break;
    case Gen3Constants.damageUserAllPlusOneEffect:
      move.statChanges[0].type = StatChangeType.ALL;
      move.statChanges[0].stages = 1;
      break;
    case Gen3Constants.chargeEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[0].stages = 1;
      break;
    case Gen3Constants.damageUserAtkAndDefMinusOneEffect:
    case Gen3Constants.noDamageAtkAndDefMinusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = -1;
      move.statChanges[1].type = StatChangeType.DEFENSE;
      move.statChanges[1].stages = -1;
      break;
    case Gen3Constants.damageUserSpAtkMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
      move.statChanges[0].stages = -2;
      break;
    case Gen3Constants.noDamageDefAndSpDefPlusOneEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = 1;
      move.statChanges[1].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[1].stages = 1;
      break;
    case Gen3Constants.noDamageAtkAndDefPlusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = 1;
      move.statChanges[1].type = StatChangeType.DEFENSE;
      move.statChanges[1].stages = 1;
      break;
    case Gen3Constants.noDamageSpAtkAndSpDefPlusOneEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
      move.statChanges[0].stages = 1;
      move.statChanges[1].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[1].stages = 1;
      break;
    case Gen3Constants.noDamageAtkAndSpePlusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = 1;
      move.statChanges[1].type = StatChangeType.SPEED;
      move.statChanges[1].stages = 1;
      break;
  }

  if (
    move.statChangeMoveType === StatChangeMoveType.DAMAGE_TARGET ||
    move.statChangeMoveType === StatChangeMoveType.DAMAGE_USER
  ) {
    for (let i = 0; i < move.statChanges.length; i++) {
      if (move.statChanges[i].type !== StatChangeType.NONE) {
        move.statChanges[i].percentChance = secondaryEffectChance;
        if (move.statChanges[i].percentChance === 0) {
          move.statChanges[i].percentChance = 100;
        }
      }
    }
  }
}

function loadStatusFromEffect(move: Move, secondaryEffectChance: number): void {
  if (move.number === Moves.bounce) {
    // GF hardcoded this
    move.statusMoveType = StatusMoveType.DAMAGE;
    move.statusType = StatusType.PARALYZE;
    move.statusPercentChance = secondaryEffectChance;
    return;
  }

  switch (move.effectIndex) {
    case Gen3Constants.noDamageSleepEffect:
    case Gen3Constants.toxicEffect:
    case Gen3Constants.noDamageConfusionEffect:
    case Gen3Constants.noDamagePoisonEffect:
    case Gen3Constants.noDamageParalyzeEffect:
    case Gen3Constants.noDamageBurnEffect:
    case Gen3Constants.swaggerEffect:
    case Gen3Constants.flatterEffect:
    case Gen3Constants.teeterDanceEffect:
      move.statusMoveType = StatusMoveType.NO_DAMAGE;
      break;

    case Gen3Constants.damagePoisonEffect:
    case Gen3Constants.damageBurnEffect:
    case Gen3Constants.damageFreezeEffect:
    case Gen3Constants.damageParalyzeEffect:
    case Gen3Constants.damageConfusionEffect:
    case Gen3Constants.twineedleEffect:
    case Gen3Constants.damageBurnAndThawUserEffect:
    case Gen3Constants.thunderEffect:
    case Gen3Constants.blazeKickEffect:
    case Gen3Constants.poisonFangEffect:
    case Gen3Constants.poisonTailEffect:
      move.statusMoveType = StatusMoveType.DAMAGE;
      break;

    default:
      return;
  }

  switch (move.effectIndex) {
    case Gen3Constants.noDamageSleepEffect:
      move.statusType = StatusType.SLEEP;
      break;
    case Gen3Constants.damagePoisonEffect:
    case Gen3Constants.noDamagePoisonEffect:
    case Gen3Constants.twineedleEffect:
    case Gen3Constants.poisonTailEffect:
      move.statusType = StatusType.POISON;
      break;
    case Gen3Constants.damageBurnEffect:
    case Gen3Constants.damageBurnAndThawUserEffect:
    case Gen3Constants.noDamageBurnEffect:
    case Gen3Constants.blazeKickEffect:
      move.statusType = StatusType.BURN;
      break;
    case Gen3Constants.damageFreezeEffect:
      move.statusType = StatusType.FREEZE;
      break;
    case Gen3Constants.damageParalyzeEffect:
    case Gen3Constants.noDamageParalyzeEffect:
    case Gen3Constants.thunderEffect:
      move.statusType = StatusType.PARALYZE;
      break;
    case Gen3Constants.toxicEffect:
    case Gen3Constants.poisonFangEffect:
      move.statusType = StatusType.TOXIC_POISON;
      break;
    case Gen3Constants.noDamageConfusionEffect:
    case Gen3Constants.damageConfusionEffect:
    case Gen3Constants.swaggerEffect:
    case Gen3Constants.flatterEffect:
    case Gen3Constants.teeterDanceEffect:
      move.statusType = StatusType.CONFUSION;
      break;
  }

  if (move.statusMoveType === StatusMoveType.DAMAGE) {
    move.statusPercentChance = secondaryEffectChance;
    if (move.statusPercentChance === 0) {
      move.statusPercentChance = 100;
    }
  }
}

function loadMiscMoveInfoFromEffect(move: Move, secondaryEffectChance: number): void {
  switch (move.effectIndex) {
    case Gen3Constants.increasedCritEffect:
    case Gen3Constants.blazeKickEffect:
    case Gen3Constants.poisonTailEffect:
      move.criticalChance = CriticalChance.INCREASED;
      break;

    case Gen3Constants.futureSightAndDoomDesireEffect:
    case Gen3Constants.spitUpEffect:
      move.criticalChance = CriticalChance.NONE;
      // Note: fall-through in original Java (missing break).
      // The Java switch falls through to flinch cases below.
      // Replicating that behavior:
      move.flinchPercentChance = secondaryEffectChance;
      break;

    case Gen3Constants.flinchEffect:
    case Gen3Constants.snoreEffect:
    case Gen3Constants.twisterEffect:
    case Gen3Constants.flinchWithMinimizeBonusEffect:
    case Gen3Constants.fakeOutEffect:
      move.flinchPercentChance = secondaryEffectChance;
      break;

    case Gen3Constants.damageAbsorbEffect:
    case Gen3Constants.dreamEaterEffect:
      move.absorbPercent = 50;
      break;

    case Gen3Constants.damageRecoil25PercentEffect:
      move.recoilPercent = 25;
      break;

    case Gen3Constants.damageRecoil33PercentEffect:
      move.recoilPercent = 33;
      break;

    case Gen3Constants.bindingEffect:
    case Gen3Constants.trappingEffect:
      move.isTrapMove = true;
      break;

    case Gen3Constants.razorWindEffect:
    case Gen3Constants.skullBashEffect:
    case Gen3Constants.solarbeamEffect:
    case Gen3Constants.semiInvulnerableEffect:
      move.isChargeMove = true;
      break;

    case Gen3Constants.rechargeEffect:
      move.isRechargeMove = true;
      break;

    case Gen3Constants.skyAttackEffect:
      move.criticalChance = CriticalChance.INCREASED;
      move.flinchPercentChance = secondaryEffectChance;
      move.isChargeMove = true;
      break;
  }
}

// ---- Text handling ----

/**
 * Read a GBA string using a text table, up to maxLength bytes or until the terminator 0xFF.
 */
export function readString(
  rom: Uint8Array,
  offset: number,
  maxLength: number,
  tb: (string | null)[]
): string {
  let result = "";
  for (let c = 0; c < maxLength; c++) {
    const currChar = rom[offset + c] & 0xff;
    if (tb[currChar] != null) {
      result += tb[currChar];
    } else {
      if (currChar === Gen3Constants.textTerminator) {
        break;
      } else if (currChar === Gen3Constants.textVariable) {
        const nextChar = rom[offset + c + 1] & 0xff;
        result += "\\v" + nextChar.toString(16).padStart(2, "0").toUpperCase();
        c++;
      } else {
        result += "\\x" + currChar.toString(16).padStart(2, "0").toUpperCase();
      }
    }
  }
  return result;
}

/**
 * Translate a string into GBA encoded bytes using a reverse text table.
 */
export function translateString(
  text: string,
  d: Map<string, number>
): Uint8Array {
  const data: number[] = [];
  let pos = 0;
  while (pos < text.length) {
    if (
      pos + 1 < text.length &&
      text[pos] === "\\" &&
      text[pos + 1] === "x"
    ) {
      data.push(parseInt(text.substring(pos + 2, pos + 4), 16));
      pos += 4;
    } else if (
      pos + 1 < text.length &&
      text[pos] === "\\" &&
      text[pos + 1] === "v"
    ) {
      data.push(Gen3Constants.textVariable);
      data.push(parseInt(text.substring(pos + 2, pos + 4), 16));
      pos += 4;
    } else {
      let i = Math.max(0, 4 - (text.length - pos));
      while (i < 4 && !d.has(text.substring(pos, pos + 4 - i))) {
        i++;
      }
      if (i === 4) {
        pos += 1;
      } else {
        data.push(d.get(text.substring(pos, pos + 4 - i))!);
        pos += 4 - i;
      }
    }
  }
  return new Uint8Array(data);
}

/**
 * Read a fixed-length string.
 */
export function readFixedLengthString(
  rom: Uint8Array,
  offset: number,
  length: number,
  tb: (string | null)[]
): string {
  return readString(rom, offset, length, tb);
}

/**
 * Read a variable-length string (up to end of ROM or 0xFF terminator).
 */
export function readVariableLengthString(
  rom: Uint8Array,
  offset: number,
  tb: (string | null)[]
): string {
  return readString(rom, offset, rom.length - offset, tb);
}

/**
 * Write a fixed-length string into ROM.
 */
export function writeFixedLengthString(
  rom: Uint8Array,
  str: string,
  offset: number,
  length: number,
  d: Map<string, number>
): void {
  const translated = translateString(str, d);
  const len = Math.min(translated.length, length);
  rom.set(translated.subarray(0, len), offset);
  let pos = len;
  if (pos < length) {
    rom[offset + pos] = Gen3Constants.textTerminator;
    pos++;
  }
  while (pos < length) {
    rom[offset + pos] = 0;
    pos++;
  }
}

/**
 * Compute the length of a GBA string at the given offset (excluding the 0xFF terminator).
 */
export function lengthOfStringAt(rom: Uint8Array, offset: number): number {
  let len = 0;
  while ((rom[offset + len] & 0xff) !== 0xff) {
    len++;
  }
  return len;
}

/**
 * Write a hex string into the ROM at the given offset.
 */
export function writeHexString(
  rom: Uint8Array,
  hexString: string,
  offset: number
): void {
  if (hexString.length % 2 !== 0) return;
  for (let i = 0; i < hexString.length / 2; i++) {
    rom[offset + i] = parseInt(hexString.substring(i * 2, i * 2 + 2), 16);
  }
}

// ---- Pointer prefix/suffix search ----

/**
 * Find a pointer that is sandwiched between a known prefix and suffix.
 * Returns the offset of the pointer, or -1 if not found.
 */
export function findPointerPrefixAndSuffix(
  rom: Uint8Array,
  prefix: string,
  suffix: string
): number {
  if (prefix.length % 2 !== 0 || suffix.length % 2 !== 0) {
    return -1;
  }
  const searchPref = hexStringToBytes(prefix);
  const searchSuff = hexStringToBytes(suffix);

  if (searchPref.length >= searchSuff.length) {
    // Prefix first
    const offsets = RomFunctions.search(rom, searchPref);
    if (offsets.length === 0) return -1;
    for (const prefOffset of offsets) {
      if (prefOffset + 4 + searchSuff.length > rom.length) continue;
      const ptrOffset = prefOffset + searchPref.length;
      const pointerValue = readPointer(rom, ptrOffset);
      if (pointerValue < 0 || pointerValue >= rom.length) continue;
      let suffixMatch = true;
      for (let i = 0; i < searchSuff.length; i++) {
        if (rom[ptrOffset + 4 + i] !== searchSuff[i]) {
          suffixMatch = false;
          break;
        }
      }
      if (suffixMatch) return ptrOffset;
    }
    return -1;
  } else {
    // Suffix first
    const offsets = RomFunctions.search(rom, searchSuff);
    if (offsets.length === 0) return -1;
    for (const suffOffset of offsets) {
      if (suffOffset - 4 - searchPref.length < 0) continue;
      const ptrOffset = suffOffset - 4;
      const pointerValue = readPointer(rom, ptrOffset);
      if (pointerValue < 0 || pointerValue >= rom.length) continue;
      let prefixMatch = true;
      for (let i = 0; i < searchPref.length; i++) {
        if (rom[ptrOffset - searchPref.length + i] !== searchPref[i]) {
          prefixMatch = false;
          break;
        }
      }
      if (prefixMatch) return ptrOffset;
    }
    return -1;
  }
}

// ---- RomEntry INI parsing ----

/**
 * Parse a gen3_offsets.ini string into a list of RomEntry objects.
 */
export function parseRomEntries(iniContent: string): RomEntry[] {
  const roms: RomEntry[] = [];
  let current: RomEntry | null = null;

  const lines = iniContent.split(/\r?\n/);
  for (let line of lines) {
    let q = line.trim();
    // Strip comments
    const commentIdx = q.indexOf("//");
    if (commentIdx !== -1) {
      q = q.substring(0, commentIdx).trim();
    }
    if (q.length === 0) continue;

    if (q.startsWith("[") && q.endsWith("]")) {
      current = new RomEntry();
      current.name = q.substring(1, q.length - 1);
      roms.push(current);
    } else if (current) {
      const eqIdx = q.indexOf("=");
      if (eqIdx === -1) continue;
      const key = q.substring(0, eqIdx);
      let val = q.substring(eqIdx + 1).trim();

      if (key === "StaticPokemon{}") {
        current.staticPokemon.push(parseStaticPokemon(val));
      } else if (key === "RoamingPokemon{}") {
        current.roamingPokemon.push(parseStaticPokemon(val));
      } else if (key === "TMText[]") {
        if (val.startsWith("[") && val.endsWith("]")) {
          const parts = val.substring(1, val.length - 1).split(",", 6);
          const tte: TMOrMTTextEntry = {
            number: parseRIInt(parts[0]),
            mapBank: parseRIInt(parts[1]),
            mapNumber: parseRIInt(parts[2]),
            personNum: parseRIInt(parts[3]),
            offsetInScript: parseRIInt(parts[4]),
            template: parts[5],
            actualOffset: 0,
            isMoveTutor: false,
          };
          current.tmmtTexts.push(tte);
        }
      } else if (key === "MoveTutorText[]") {
        if (val.startsWith("[") && val.endsWith("]")) {
          const parts = val.substring(1, val.length - 1).split(",", 6);
          const tte: TMOrMTTextEntry = {
            number: parseRIInt(parts[0]),
            mapBank: parseRIInt(parts[1]),
            mapNumber: parseRIInt(parts[2]),
            personNum: parseRIInt(parts[3]),
            offsetInScript: parseRIInt(parts[4]),
            template: parts[5],
            actualOffset: 0,
            isMoveTutor: true,
          };
          current.tmmtTexts.push(tte);
        }
      } else if (key === "Game") {
        current.romCode = val;
      } else if (key === "Version") {
        current.version = parseRIInt(val);
      } else if (key === "Type") {
        if (val.toLowerCase() === "ruby") {
          current.romType = Gen3Constants.RomType_Ruby;
        } else if (val.toLowerCase() === "sapp") {
          current.romType = Gen3Constants.RomType_Sapp;
        } else if (val.toLowerCase() === "em") {
          current.romType = Gen3Constants.RomType_Em;
        } else if (val.toLowerCase() === "frlg") {
          current.romType = Gen3Constants.RomType_FRLG;
        }
      } else if (key === "TableFile") {
        current.tableFile = val;
      } else if (key === "CopyStaticPokemon") {
        current.copyStaticPokemon = parseRIInt(val) > 0;
      } else if (key === "CRC32") {
        current.expectedCRC32 = parseRILong("0x" + val);
      } else if (key.endsWith("Tweak")) {
        current.codeTweaks.set(key, val);
      } else if (key === "CopyFrom") {
        for (const otherEntry of roms) {
          if (val.toLowerCase() === otherEntry.name.toLowerCase()) {
            current.arrayEntries = new Map([
              ...current.arrayEntries,
              ...otherEntry.arrayEntries,
            ]);
            current.entries = new Map([...current.entries, ...otherEntry.entries]);
            current.strings = new Map([...current.strings, ...otherEntry.strings]);
            const cTT = current.getValue("CopyTMText") === 1;
            if (current.copyStaticPokemon) {
              current.staticPokemon.push(...otherEntry.staticPokemon);
              current.roamingPokemon.push(...otherEntry.roamingPokemon);
              current.entries.set("StaticPokemonSupport", 1);
            } else {
              current.entries.set("StaticPokemonSupport", 0);
            }
            if (cTT) {
              current.tmmtTexts.push(...otherEntry.tmmtTexts);
            }
            current.tableFile = otherEntry.tableFile;
          }
        }
      } else if (key.endsWith("Locator") || key.endsWith("Prefix")) {
        current.strings.set(key, val);
      } else {
        if (val.startsWith("[") && val.endsWith("]")) {
          const inner = val.substring(1, val.length - 1);
          const parts = inner.split(",");
          if (parts.length === 1 && parts[0].trim().length === 0) {
            current.arrayEntries.set(key, []);
          } else {
            current.arrayEntries.set(key, parts.map((s) => parseRIInt(s)));
          }
        } else {
          current.entries.set(key, parseRIInt(val));
        }
      }
    }
  }
  return roms;
}

// ---- Factory ----

export class Gen3RomHandlerFactory {
  /**
   * Check if a ROM file (provided as bytes) is loadable as a Gen 3 game.
   * This is the TypeScript equivalent of the Java Factory.isLoadable().
   */
  static isLoadable(
    data: Uint8Array,
    fileLength: number,
    romEntries: RomEntry[]
  ): boolean {
    if (fileLength > 32 * 1024 * 1024) {
      return false;
    }
    if (data.length === 0) {
      return false;
    }
    return detectRomInner(data, fileLength, romEntries);
  }
}

// ---- Main handler class ----

export class Gen3RomHandler {
  rom: Uint8Array = new Uint8Array(0);
  originalRom: Uint8Array = new Uint8Array(0);

  pokes: (Pokemon | null)[] = [];
  pokesInternal: (Pokemon | null)[] = [];
  pokemonList: (Pokemon | null)[] = [];
  numRealPokemon: number = 0;
  moves: (Move | null)[] = [];
  perfectAccuracy: number = 0;
  romEntry: RomEntry = new RomEntry();
  havePatchedObedience: boolean = false;
  tb: (string | null)[] = new Array(256).fill(null);
  d: Map<string, number> = new Map();
  abilityNames: string[] = [];
  itemNames: string[] = [];
  mapLoadingDone: boolean = false;
  mapNames: string[][] = [];
  isRomHack: boolean = false;
  internalToPokedex: number[] = [];
  pokedexToInternal: number[] = [];
  pokedexCount: number = 0;
  pokeNames: string[] = [];
  jamboMovesetHack: boolean = false;

  random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  // ---- Detection ----

  detectRom(rom: Uint8Array, romEntries: RomEntry[]): boolean {
    return detectRomInner(rom, rom.length, romEntries);
  }

  // ---- ROM loading ----

  loadRom(data: Uint8Array, romEntries: RomEntry[]): boolean {
    if (!this.detectRom(data, romEntries)) {
      return false;
    }
    this.rom = data;
    this.originalRom = new Uint8Array(data);
    this.loadedRom(romEntries);
    return true;
  }

  loadedRom(romEntries: RomEntry[]): void {
    for (const re of romEntries) {
      if (
        romCode(this.rom, re.romCode) &&
        (this.rom[0xbc] & 0xff) === re.version
      ) {
        this.romEntry = new RomEntry(re);
        break;
      }
    }

    this.tb = new Array(256).fill(null);
    this.d = new Map();
    this.isRomHack = false;
    this.jamboMovesetHack = false;

    // Pokemon count stuff
    const pokedexOrderPrefixes = findMultiple(
      this.rom,
      Gen3Constants.pokedexOrderPointerPrefix
    );
    if (pokedexOrderPrefixes.length > 1) {
      this.romEntry.entries.set(
        "PokedexOrder",
        readPointer(this.rom, pokedexOrderPrefixes[1] + 16)
      );
    }

    // Pokemon names offset
    if (
      this.romEntry.romType === Gen3Constants.RomType_Ruby ||
      this.romEntry.romType === Gen3Constants.RomType_Sapp
    ) {
      const baseNomOffset = find(
        this.rom,
        Gen3Constants.rsPokemonNamesPointerSuffix
      );
      if (baseNomOffset >= 0) {
        this.romEntry.entries.set(
          "PokemonNames",
          readPointer(this.rom, baseNomOffset - 4)
        );
      }
      const frontSpritesPtr = findPointerPrefixAndSuffix(
        this.rom,
        Gen3Constants.rsFrontSpritesPointerPrefix,
        Gen3Constants.rsFrontSpritesPointerSuffix
      );
      if (frontSpritesPtr >= 0) {
        this.romEntry.entries.set(
          "FrontSprites",
          readPointer(this.rom, frontSpritesPtr)
        );
      }
      const palettesPtr = findPointerPrefixAndSuffix(
        this.rom,
        Gen3Constants.rsPokemonPalettesPointerPrefix,
        Gen3Constants.rsPokemonPalettesPointerSuffix
      );
      if (palettesPtr >= 0) {
        this.romEntry.entries.set(
          "PokemonPalettes",
          readPointer(this.rom, palettesPtr)
        );
      }
    } else {
      this.romEntry.entries.set(
        "PokemonNames",
        readPointer(this.rom, Gen3Constants.efrlgPokemonNamesPointer)
      );
      this.romEntry.entries.set(
        "MoveNames",
        readPointer(this.rom, Gen3Constants.efrlgMoveNamesPointer)
      );
      this.romEntry.entries.set(
        "AbilityNames",
        readPointer(this.rom, Gen3Constants.efrlgAbilityNamesPointer)
      );
      this.romEntry.entries.set(
        "ItemData",
        readPointer(this.rom, Gen3Constants.efrlgItemDataPointer)
      );
      this.romEntry.entries.set(
        "MoveData",
        readPointer(this.rom, Gen3Constants.efrlgMoveDataPointer)
      );
      this.romEntry.entries.set(
        "PokemonStats",
        readPointer(this.rom, Gen3Constants.efrlgPokemonStatsPointer)
      );
      this.romEntry.entries.set(
        "FrontSprites",
        readPointer(this.rom, Gen3Constants.efrlgFrontSpritesPointer)
      );
      this.romEntry.entries.set(
        "PokemonPalettes",
        readPointer(this.rom, Gen3Constants.efrlgPokemonPalettesPointer)
      );
      this.romEntry.entries.set(
        "MoveTutorCompatibility",
        this.romEntry.getValue("MoveTutorData") +
          this.romEntry.getValue("MoveTutorMoves") * 2
      );
    }

    this.loadPokemonNames();
    this.loadPokedex();
    this.loadPokemonStats();
    this.constructPokemonList();
    this.loadMoves();

    // Wild Pokemon offset
    const baseWPOffsets = findMultiple(
      this.rom,
      Gen3Constants.wildPokemonPointerPrefix
    );
    if (baseWPOffsets.length > 0) {
      this.romEntry.entries.set(
        "WildPokemon",
        readPointer(this.rom, baseWPOffsets[0] + 12)
      );
    }

    // Map banks
    const baseMapsOffsets = findMultiple(
      this.rom,
      Gen3Constants.mapBanksPointerPrefix
    );
    if (baseMapsOffsets.length > 0) {
      this.romEntry.entries.set(
        "MapHeaders",
        readPointer(this.rom, baseMapsOffsets[0] + 12)
      );
    }

    // Map labels
    if (this.romEntry.romType === Gen3Constants.RomType_FRLG) {
      const baseMLOffset = find(
        this.rom,
        Gen3Constants.frlgMapLabelsPointerPrefix
      );
      if (baseMLOffset >= 0) {
        this.romEntry.entries.set(
          "MapLabels",
          readPointer(this.rom, baseMLOffset + 12)
        );
      }
    } else {
      const baseMLOffset = find(
        this.rom,
        Gen3Constants.rseMapLabelsPointerPrefix
      );
      if (baseMLOffset >= 0) {
        this.romEntry.entries.set(
          "MapLabels",
          readPointer(this.rom, baseMLOffset + 12)
        );
      }
    }

    this.mapLoadingDone = false;
  }

  // ---- Pokemon names ----

  private loadPokemonNames(): void {
    const offs = this.romEntry.getValue("PokemonNames");
    const nameLen = this.romEntry.getValue("PokemonNameLength");
    const numInternalPokes = this.romEntry.getValue("PokemonCount");
    this.pokeNames = new Array(numInternalPokes + 1).fill("");
    for (let i = 1; i <= numInternalPokes; i++) {
      this.pokeNames[i] = readFixedLengthString(
        this.rom,
        offs + i * nameLen,
        nameLen,
        this.tb
      );
    }
  }

  // ---- Pokedex ----

  private loadPokedex(): void {
    const pdOffset = this.romEntry.getValue("PokedexOrder");
    const numInternalPokes = this.romEntry.getValue("PokemonCount");
    let maxPokedex = 0;
    this.internalToPokedex = new Array(numInternalPokes + 1).fill(0);
    this.pokedexToInternal = new Array(numInternalPokes + 1).fill(0);
    for (let i = 1; i <= numInternalPokes; i++) {
      const dexEntry = readWord(this.rom, pdOffset + (i - 1) * 2);
      if (dexEntry !== 0) {
        this.internalToPokedex[i] = dexEntry;
        if (this.pokedexToInternal[dexEntry] === 0) {
          this.pokedexToInternal[dexEntry] = i;
        }
        maxPokedex = Math.max(maxPokedex, dexEntry);
      }
    }
    if (maxPokedex === Gen3Constants.unhackedMaxPokedex) {
      const offs = this.romEntry.getValue("PokemonStats");
      let usedSlots = 0;
      for (
        let i = 0;
        i < Gen3Constants.unhackedMaxPokedex - Gen3Constants.unhackedRealPokedex;
        i++
      ) {
        const pokeSlot = Gen3Constants.hoennPokesStart + i;
        const pokeOffs = offs + pokeSlot * Gen3Constants.baseStatsEntrySize;
        const lowerName = this.pokeNames[pokeSlot]?.toLowerCase() ?? "";
        if (
          !matches(this.rom, pokeOffs, emptyPokemonSig) &&
          !lowerName.includes("unused") &&
          lowerName !== "?" &&
          lowerName !== "-"
        ) {
          usedSlots++;
          this.pokedexToInternal[Gen3Constants.unhackedRealPokedex + usedSlots] =
            pokeSlot;
          this.internalToPokedex[pokeSlot] =
            Gen3Constants.unhackedRealPokedex + usedSlots;
        } else {
          this.internalToPokedex[pokeSlot] = 0;
        }
      }
      for (
        let i = usedSlots + 1;
        i <=
        Gen3Constants.unhackedMaxPokedex - Gen3Constants.unhackedRealPokedex;
        i++
      ) {
        this.pokedexToInternal[Gen3Constants.unhackedRealPokedex + i] = 0;
      }
      if (usedSlots > 0) {
        this.isRomHack = true;
      }
      this.pokedexCount = Gen3Constants.unhackedRealPokedex + usedSlots;
    } else {
      this.isRomHack = true;
      this.pokedexCount = maxPokedex;
    }
  }

  // ---- Pokemon stats ----

  private loadPokemonStats(): void {
    this.pokes = new Array(this.pokedexCount + 1).fill(null);
    const numInternalPokes = this.romEntry.getValue("PokemonCount");
    this.pokesInternal = new Array(numInternalPokes + 1).fill(null);
    const offs = this.romEntry.getValue("PokemonStats");
    for (let i = 1; i <= numInternalPokes; i++) {
      const pk = new Pokemon();
      pk.name = this.pokeNames[i];
      pk.number = this.internalToPokedex[i];
      if (pk.number !== 0) {
        this.pokes[pk.number] = pk;
      }
      this.pokesInternal[i] = pk;
      const pkoffs = offs + i * Gen3Constants.baseStatsEntrySize;
      loadBasicPokeStats(pk, this.rom, pkoffs);
    }
  }

  // ---- Pokemon list ----

  private constructPokemonList(): void {
    if (!this.isRomHack) {
      this.pokemonList = [...this.pokes];
    } else {
      this.pokemonList = [null];
      for (let i = 1; i < this.pokes.length; i++) {
        const pk = this.pokes[i];
        if (pk != null) {
          const lowerName = pk.name.toLowerCase();
          if (!lowerName.includes("unused") && lowerName !== "?") {
            this.pokemonList.push(pk);
          }
        }
      }
    }
    this.numRealPokemon = this.pokemonList.length - 1;
  }

  // ---- Moves ----

  private loadMoves(): void {
    const moveCount = this.romEntry.getValue("MoveCount");
    this.moves = new Array(moveCount + 1).fill(null);
    const offs = this.romEntry.getValue("MoveData");
    const nameoffs = this.romEntry.getValue("MoveNames");
    const namelen = this.romEntry.getValue("MoveNameLength");
    for (let i = 1; i <= moveCount; i++) {
      const move = loadMoveData(this.rom, offs, i);
      move.name = readFixedLengthString(
        this.rom,
        nameoffs + i * namelen,
        namelen,
        this.tb
      );
      this.moves[i] = move;

      if (i === Moves.swift) {
        this.perfectAccuracy = move.hitratio;
      }
    }
  }

  saveMoves(): void {
    const moveCount = this.romEntry.getValue("MoveCount");
    const offs = this.romEntry.getValue("MoveData");
    for (let i = 1; i <= moveCount; i++) {
      if (this.moves[i]) {
        saveMoveData(this.rom, offs, this.moves[i]!);
      }
    }
  }

  savePokemonStats(): void {
    const offs = this.romEntry.getValue("PokemonNames");
    const nameLen = this.romEntry.getValue("PokemonNameLength");
    const offs2 = this.romEntry.getValue("PokemonStats");
    const numInternalPokes = this.romEntry.getValue("PokemonCount");
    for (let i = 1; i <= numInternalPokes; i++) {
      const pk = this.pokesInternal[i];
      if (pk) {
        const stringOffset = offs + i * nameLen;
        writeFixedLengthString(
          this.rom,
          pk.name,
          stringOffset,
          nameLen,
          this.d
        );
        saveBasicPokeStats(pk, this.rom, offs2 + i * Gen3Constants.baseStatsEntrySize);
      }
    }
  }

  // ---- Convenience accessors ----

  getMoves(): (Move | null)[] {
    return this.moves;
  }

  getPokemon(): (Pokemon | null)[] {
    return this.pokes;
  }

  getPokemonInclFormes(): (Pokemon | null)[] {
    return this.pokes;
  }

  getROMCode(): string {
    return this.romEntry.romCode;
  }

  getSupportLevel(): string {
    return this.romEntry.getValue("StaticPokemonSupport") > 0
      ? "Complete"
      : "No Static Pokemon";
  }

  // ---- Read/write helpers on this.rom ----

  readWordFromRom(offset: number): number {
    return readWord(this.rom, offset);
  }

  readPointerFromRom(offset: number): number {
    return readPointer(this.rom, offset);
  }

  readLongFromRom(offset: number): number {
    return readLong(this.rom, offset);
  }
}
