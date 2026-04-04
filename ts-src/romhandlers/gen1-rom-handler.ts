/**
 * Gen1RomHandler.ts - randomizer handler for R/B/Y.
 *
 * Part of "Universal Pokemon Randomizer ZX" by the UPR-ZX team
 * Originally part of "Universal Pokemon Randomizer" by Dabomstew
 * Pokemon and any associated names and the like are
 * trademark and (C) Nintendo 1996-2020.
 *
 * Licensed under the terms of the GPL v3+.
 */

import * as Gen1Constants from '../constants/gen1-constants';
import * as GBConstants from '../constants/gb-constants';
import * as GlobalConstants from '../constants/global-constants';
import * as Moves from '../constants/moves';
import { Pokemon } from '../pokemon/pokemon';
import { Move, MoveStatChange } from '../pokemon/move';
import { MoveCategory } from '../pokemon/move-category';
import { ExpCurve, expCurveFromByte, expCurveToByte } from '../pokemon/exp-curve';
import { StatChangeType } from '../pokemon/stat-change-type';
import { StatChangeMoveType } from '../pokemon/stat-change-move-type';
import { StatusMoveType } from '../pokemon/status-move-type';
import { StatusType } from '../pokemon/status-type';
import { CriticalChance } from '../pokemon/critical-chance';

// ---------------------------------------------------------------------------
// ROM Entry (parsed from gen1_offsets.ini in the Java version)
// ---------------------------------------------------------------------------

export interface RomEntry {
  name: string;
  romName: string;
  version: number;
  nonJapanese: number;
  extraTableFile: string | null;
  isYellow: boolean;
  expectedCRC32: number;
  crcInHeader: number;
  tweakFiles: Map<string, string>;
  entries: Map<string, number>;
  arrayEntries: Map<string, number[]>;
  extraTypeLookup: Map<number, string>;
  extraTypeReverse: Map<string, number>;
}

export function createDefaultRomEntry(): RomEntry {
  return {
    name: '',
    romName: '',
    version: 0,
    nonJapanese: 0,
    extraTableFile: null,
    isYellow: false,
    expectedCRC32: -1,
    crcInHeader: -1,
    tweakFiles: new Map(),
    entries: new Map(),
    arrayEntries: new Map(),
    extraTypeLookup: new Map(),
    extraTypeReverse: new Map(),
  };
}

function romEntryGetValue(entry: RomEntry, key: string): number {
  if (!entry.entries.has(key)) {
    entry.entries.set(key, 0);
  }
  return entry.entries.get(key)!;
}

// ---------------------------------------------------------------------------
// Text table helpers (ported from AbstractGBCRomHandler)
// ---------------------------------------------------------------------------

export interface TextTables {
  tb: (string | null)[];
  d: Map<string, number>;
  longestTableToken: number;
}

export function createTextTables(): TextTables {
  return {
    tb: new Array<string | null>(256).fill(null),
    d: new Map(),
    longestTableToken: 0,
  };
}

export function readTextTable(tables: TextTables, lines: string[]): void {
  for (const line of lines) {
    const q = line.trim();
    if (q === '') continue;
    const r = q.split('=', 2);
    if (r.length < 2) continue;
    let value = r[1];
    if (value.endsWith('\r\n')) {
      value = value.substring(0, value.length - 2);
    }
    const hexcode = parseInt(r[0], 16);
    if (tables.tb[hexcode] != null) {
      const oldMatch = tables.tb[hexcode]!;
      tables.tb[hexcode] = null;
      if (tables.d.get(oldMatch) === hexcode) {
        tables.d.delete(oldMatch);
      }
    }
    tables.tb[hexcode] = value;
    tables.longestTableToken = Math.max(tables.longestTableToken, value.length);
    tables.d.set(value, hexcode);
  }
}

export function readStringFromRom(
  rom: Uint8Array,
  offset: number,
  maxLength: number,
  textEngineMode: boolean,
  tables: TextTables,
): string {
  let result = '';
  for (let c = 0; c < maxLength; c++) {
    const currChar = rom[offset + c] & 0xFF;
    if (tables.tb[currChar] != null) {
      result += tables.tb[currChar];
      if (textEngineMode && (tables.tb[currChar] === '\\r' || tables.tb[currChar] === '\\e')) {
        break;
      }
    } else {
      if (currChar === GBConstants.stringTerminator) {
        break;
      } else {
        result += '\\x' + currChar.toString(16).padStart(2, '0').toUpperCase();
      }
    }
  }
  return result;
}

export function lengthOfStringAt(
  rom: Uint8Array,
  offset: number,
  textEngineMode: boolean,
): number {
  let len = 0;
  while (
    rom[offset + len] !== GBConstants.stringTerminator &&
    (!textEngineMode ||
      (rom[offset + len] !== GBConstants.stringPrintedTextEnd &&
        rom[offset + len] !== GBConstants.stringPrintedTextPromptEnd))
  ) {
    len++;
  }
  if (
    textEngineMode &&
    (rom[offset + len] === GBConstants.stringPrintedTextEnd ||
      rom[offset + len] === GBConstants.stringPrintedTextPromptEnd)
  ) {
    len++;
  }
  return len;
}

export function translateString(text: string, tables: TextTables): Uint8Array {
  const bytes: number[] = [];
  let remaining = text;
  while (remaining.length !== 0) {
    let i = Math.max(0, tables.longestTableToken - remaining.length);
    if (remaining.charAt(0) === '\\' && remaining.length > 1 && remaining.charAt(1) === 'x') {
      bytes.push(parseInt(remaining.substring(2, 4), 16));
      remaining = remaining.substring(4);
    } else {
      while (
        !(tables.d.has(remaining.substring(0, tables.longestTableToken - i)) || i === tables.longestTableToken)
      ) {
        i++;
      }
      if (i === tables.longestTableToken) {
        remaining = remaining.substring(1);
      } else {
        bytes.push(tables.d.get(remaining.substring(0, tables.longestTableToken - i))! & 0xFF);
        remaining = remaining.substring(tables.longestTableToken - i);
      }
    }
  }
  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// Low-level ROM reading helpers (ported from AbstractGBRomHandler)
// ---------------------------------------------------------------------------

export function readWord(data: Uint8Array, offset: number): number {
  return (data[offset] & 0xFF) + ((data[offset + 1] & 0xFF) << 8);
}

export function writeWord(data: Uint8Array, offset: number, value: number): void {
  data[offset] = value & 0xFF;
  data[offset + 1] = (value >> 8) & 0xFF;
}

export function romSig(rom: Uint8Array, sig: string): boolean {
  const sigOffset = GBConstants.romSigOffset;
  for (let i = 0; i < sig.length; i++) {
    if (rom[sigOffset + i] !== sig.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

export function romCode(rom: Uint8Array, code: string): boolean {
  const sigOffset = GBConstants.romCodeOffset;
  for (let i = 0; i < code.length; i++) {
    if (rom[sigOffset + i] !== code.charCodeAt(i)) {
      return false;
    }
  }
  return true;
}

export function makeGBPointer(offset: number): number {
  if (offset < GBConstants.bankSize) {
    return offset;
  } else {
    return (offset % GBConstants.bankSize) + GBConstants.bankSize;
  }
}

export function bankOf(offset: number): number {
  return Math.floor(offset / GBConstants.bankSize);
}

export function calculateOffset(bank: number, pointer: number): number {
  if (pointer < GBConstants.bankSize) {
    return pointer;
  } else {
    return (pointer % GBConstants.bankSize) + bank * GBConstants.bankSize;
  }
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

function idToType(value: number, romEntry: RomEntry): string | null {
  if (value < Gen1Constants.typeTable.length && Gen1Constants.typeTable[value] != null) {
    return Gen1Constants.typeTable[value];
  }
  if (romEntry.extraTypeLookup.has(value)) {
    return romEntry.extraTypeLookup.get(value)!;
  }
  return null;
}

function typeToByte(type: string | null, romEntry: RomEntry): number {
  if (type == null) {
    return 0x00; // revert to normal
  }
  if (romEntry.extraTypeReverse.has(type)) {
    return romEntry.extraTypeReverse.get(type)!;
  }
  return Gen1Constants.typeToByte(type);
}

// ---------------------------------------------------------------------------
// ROM detection
// ---------------------------------------------------------------------------

/**
 * Check whether the given ROM data matches a known Gen 1 ROM entry.
 * Returns the matching RomEntry or null.
 */
export function checkRomEntry(rom: Uint8Array, romEntries: RomEntry[]): RomEntry | null {
  const version = rom[GBConstants.versionOffset] & 0xFF;
  const nonjap = rom[GBConstants.jpFlagOffset] & 0xFF;
  const crcInHeader = ((rom[GBConstants.crcOffset] & 0xFF) << 8) | (rom[GBConstants.crcOffset + 1] & 0xFF);

  // Check for specific CRC first
  for (const re of romEntries) {
    if (romSig(rom, re.romName) && re.version === version && re.nonJapanese === nonjap && re.crcInHeader === crcInHeader) {
      return re;
    }
  }
  // Now check for non-specific-CRC entries
  for (const re of romEntries) {
    if (romSig(rom, re.romName) && re.version === version && re.nonJapanese === nonjap && re.crcInHeader === -1) {
      return re;
    }
  }
  return null;
}

export function detectRomInner(rom: Uint8Array, romSize: number, romEntries: RomEntry[]): boolean {
  return romSize >= GBConstants.minRomSize && romSize <= GBConstants.maxRomSize && checkRomEntry(rom, romEntries) !== null;
}

// ---------------------------------------------------------------------------
// Pokemon stats loading / saving
// ---------------------------------------------------------------------------

export function loadBasicPokeStats(
  pkmn: Pokemon,
  rom: Uint8Array,
  offset: number,
  romEntry: RomEntry,
): void {
  pkmn.hp = rom[offset + Gen1Constants.bsHPOffset] & 0xFF;
  pkmn.attack = rom[offset + Gen1Constants.bsAttackOffset] & 0xFF;
  pkmn.defense = rom[offset + Gen1Constants.bsDefenseOffset] & 0xFF;
  pkmn.speed = rom[offset + Gen1Constants.bsSpeedOffset] & 0xFF;
  pkmn.special = rom[offset + Gen1Constants.bsSpecialOffset] & 0xFF;
  // Type
  pkmn.primaryType = idToType(rom[offset + Gen1Constants.bsPrimaryTypeOffset] & 0xFF, romEntry) as any;
  pkmn.secondaryType = idToType(rom[offset + Gen1Constants.bsSecondaryTypeOffset] & 0xFF, romEntry) as any;
  // Only one type?
  if (pkmn.secondaryType === pkmn.primaryType) {
    pkmn.secondaryType = null;
  }
  pkmn.catchRate = rom[offset + Gen1Constants.bsCatchRateOffset] & 0xFF;
  pkmn.expYield = rom[offset + Gen1Constants.bsExpYieldOffset] & 0xFF;
  const growthCurve = expCurveFromByte(rom[offset + Gen1Constants.bsGrowthCurveOffset]);
  if (growthCurve != null) {
    pkmn.growthCurve = growthCurve;
  }
  pkmn.frontSpritePointer = readWord(rom, offset + Gen1Constants.bsFrontSpriteOffset);

  pkmn.guaranteedHeldItem = -1;
  pkmn.commonHeldItem = -1;
  pkmn.rareHeldItem = -1;
  pkmn.darkGrassHeldItem = -1;
}

export function saveBasicPokeStats(
  pkmn: Pokemon,
  rom: Uint8Array,
  offset: number,
  romEntry: RomEntry,
): void {
  rom[offset + Gen1Constants.bsHPOffset] = pkmn.hp;
  rom[offset + Gen1Constants.bsAttackOffset] = pkmn.attack;
  rom[offset + Gen1Constants.bsDefenseOffset] = pkmn.defense;
  rom[offset + Gen1Constants.bsSpeedOffset] = pkmn.speed;
  rom[offset + Gen1Constants.bsSpecialOffset] = pkmn.special;
  rom[offset + Gen1Constants.bsPrimaryTypeOffset] = typeToByte(pkmn.primaryType as any, romEntry);
  if (pkmn.secondaryType == null) {
    rom[offset + Gen1Constants.bsSecondaryTypeOffset] = rom[offset + Gen1Constants.bsPrimaryTypeOffset];
  } else {
    rom[offset + Gen1Constants.bsSecondaryTypeOffset] = typeToByte(pkmn.secondaryType as any, romEntry);
  }
  rom[offset + Gen1Constants.bsCatchRateOffset] = pkmn.catchRate;
  rom[offset + Gen1Constants.bsGrowthCurveOffset] = expCurveToByte(pkmn.growthCurve);
  rom[offset + Gen1Constants.bsExpYieldOffset] = pkmn.expYield;
}

// ---------------------------------------------------------------------------
// Move loading / saving
// ---------------------------------------------------------------------------

export function loadMoveData(
  rom: Uint8Array,
  movesOffset: number,
  moveIndex: number,
  moveName: string,
  romEntry: RomEntry,
): Move {
  const i = moveIndex;
  const base = movesOffset + (i - 1) * 6;
  const move = new Move();
  move.name = moveName;
  move.internalId = i;
  move.effectIndex = rom[base + 1] & 0xFF;
  move.hitratio = ((rom[base + 4] & 0xFF)) / 255.0 * 100;
  move.power = rom[base + 2] & 0xFF;
  move.pp = rom[base + 5] & 0xFF;
  move.type = idToType(rom[base + 3] & 0xFF, romEntry) as any;
  move.category = GBConstants.physicalTypes.has(move.type as any) ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;
  if (move.power === 0 && !GlobalConstants.noPowerNonStatusMoves.includes(i)) {
    move.category = MoveCategory.STATUS;
  }

  if (GlobalConstants.normalMultihitMoves.includes(i)) {
    move.hitCount = 3;
  } else if (GlobalConstants.doubleHitMoves.includes(i)) {
    move.hitCount = 2;
  }

  loadStatChangesFromEffect(move);
  loadStatusFromEffect(move);
  loadMiscMoveInfoFromEffect(move);

  return move;
}

export function saveMoveData(
  rom: Uint8Array,
  movesOffset: number,
  move: Move,
  romEntry: RomEntry,
): void {
  const i = move.internalId;
  const base = movesOffset + (i - 1) * 6;
  rom[base + 1] = move.effectIndex;
  rom[base + 2] = move.power;
  rom[base + 3] = typeToByte(move.type as any, romEntry);
  let hitratio = Math.round(move.hitratio * 2.55);
  if (hitratio < 0) hitratio = 0;
  if (hitratio > 255) hitratio = 255;
  rom[base + 4] = hitratio;
  rom[base + 5] = move.pp;
}

// ---------------------------------------------------------------------------
// Move effect helpers
// ---------------------------------------------------------------------------

function loadStatChangesFromEffect(move: Move): void {
  switch (move.effectIndex) {
    case Gen1Constants.noDamageAtkPlusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = 1;
      break;
    case Gen1Constants.noDamageDefPlusOneEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = 1;
      break;
    case Gen1Constants.noDamageSpecialPlusOneEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL;
      move.statChanges[0].stages = 1;
      break;
    case Gen1Constants.noDamageEvasionPlusOneEffect:
      move.statChanges[0].type = StatChangeType.EVASION;
      move.statChanges[0].stages = 1;
      break;
    case Gen1Constants.noDamageAtkMinusOneEffect:
    case Gen1Constants.damageAtkMinusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = -1;
      break;
    case Gen1Constants.noDamageDefMinusOneEffect:
    case Gen1Constants.damageDefMinusOneEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = -1;
      break;
    case Gen1Constants.noDamageSpeMinusOneEffect:
    case Gen1Constants.damageSpeMinusOneEffect:
      move.statChanges[0].type = StatChangeType.SPEED;
      move.statChanges[0].stages = -1;
      break;
    case Gen1Constants.noDamageAccuracyMinusOneEffect:
      move.statChanges[0].type = StatChangeType.ACCURACY;
      move.statChanges[0].stages = -1;
      break;
    case Gen1Constants.noDamageAtkPlusTwoEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = 2;
      break;
    case Gen1Constants.noDamageDefPlusTwoEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = 2;
      break;
    case Gen1Constants.noDamageSpePlusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPEED;
      move.statChanges[0].stages = 2;
      break;
    case Gen1Constants.noDamageSpecialPlusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL;
      move.statChanges[0].stages = 2;
      break;
    case Gen1Constants.noDamageDefMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = -2;
      break;
    case Gen1Constants.damageSpecialMinusOneEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL;
      move.statChanges[0].stages = -1;
      break;
    default:
      // Move does not have a stat-changing effect
      return;
  }

  switch (move.effectIndex) {
    case Gen1Constants.noDamageAtkPlusOneEffect:
    case Gen1Constants.noDamageDefPlusOneEffect:
    case Gen1Constants.noDamageSpecialPlusOneEffect:
    case Gen1Constants.noDamageEvasionPlusOneEffect:
    case Gen1Constants.noDamageAtkMinusOneEffect:
    case Gen1Constants.noDamageDefMinusOneEffect:
    case Gen1Constants.noDamageSpeMinusOneEffect:
    case Gen1Constants.noDamageAccuracyMinusOneEffect:
    case Gen1Constants.noDamageAtkPlusTwoEffect:
    case Gen1Constants.noDamageDefPlusTwoEffect:
    case Gen1Constants.noDamageSpePlusTwoEffect:
    case Gen1Constants.noDamageSpecialPlusTwoEffect:
    case Gen1Constants.noDamageDefMinusTwoEffect:
      if (move.statChanges[0].stages < 0) {
        move.statChangeMoveType = StatChangeMoveType.NO_DAMAGE_TARGET;
      } else {
        move.statChangeMoveType = StatChangeMoveType.NO_DAMAGE_USER;
      }
      break;

    case Gen1Constants.damageAtkMinusOneEffect:
    case Gen1Constants.damageDefMinusOneEffect:
    case Gen1Constants.damageSpeMinusOneEffect:
    case Gen1Constants.damageSpecialMinusOneEffect:
      move.statChangeMoveType = StatChangeMoveType.DAMAGE_TARGET;
      break;
  }

  if (move.statChangeMoveType === StatChangeMoveType.DAMAGE_TARGET) {
    for (let i = 0; i < move.statChanges.length; i++) {
      if (move.statChanges[i].type !== StatChangeType.NONE) {
        move.statChanges[i].percentChance = 85 / 256.0;
      }
    }
  }
}

function loadStatusFromEffect(move: Move): void {
  switch (move.effectIndex) {
    case Gen1Constants.noDamageSleepEffect:
    case Gen1Constants.noDamageConfusionEffect:
    case Gen1Constants.noDamagePoisonEffect:
    case Gen1Constants.noDamageParalyzeEffect:
      move.statusMoveType = StatusMoveType.NO_DAMAGE;
      break;

    case Gen1Constants.damagePoison20PercentEffect:
    case Gen1Constants.damageBurn10PercentEffect:
    case Gen1Constants.damageFreeze10PercentEffect:
    case Gen1Constants.damageParalyze10PercentEffect:
    case Gen1Constants.damagePoison40PercentEffect:
    case Gen1Constants.damageBurn30PercentEffect:
    case Gen1Constants.damageFreeze30PercentEffect:
    case Gen1Constants.damageParalyze30PercentEffect:
    case Gen1Constants.damageConfusionEffect:
    case Gen1Constants.twineedleEffect:
      move.statusMoveType = StatusMoveType.DAMAGE;
      break;

    default:
      // Move does not have a status effect
      return;
  }

  switch (move.effectIndex) {
    case Gen1Constants.noDamageSleepEffect:
      move.statusType = StatusType.SLEEP;
      break;
    case Gen1Constants.damagePoison20PercentEffect:
    case Gen1Constants.damagePoison40PercentEffect:
    case Gen1Constants.noDamagePoisonEffect:
    case Gen1Constants.twineedleEffect:
      move.statusType = StatusType.POISON;
      if (move.number === Moves.toxic) {
        move.statusType = StatusType.TOXIC_POISON;
      }
      break;
    case Gen1Constants.damageBurn10PercentEffect:
    case Gen1Constants.damageBurn30PercentEffect:
      move.statusType = StatusType.BURN;
      break;
    case Gen1Constants.damageFreeze10PercentEffect:
    case Gen1Constants.damageFreeze30PercentEffect:
      move.statusType = StatusType.FREEZE;
      break;
    case Gen1Constants.damageParalyze10PercentEffect:
    case Gen1Constants.damageParalyze30PercentEffect:
    case Gen1Constants.noDamageParalyzeEffect:
      move.statusType = StatusType.PARALYZE;
      break;
    case Gen1Constants.noDamageConfusionEffect:
    case Gen1Constants.damageConfusionEffect:
      move.statusType = StatusType.CONFUSION;
      break;
  }

  if (move.statusMoveType === StatusMoveType.DAMAGE) {
    switch (move.effectIndex) {
      case Gen1Constants.damageBurn10PercentEffect:
      case Gen1Constants.damageFreeze10PercentEffect:
      case Gen1Constants.damageParalyze10PercentEffect:
      case Gen1Constants.damageConfusionEffect:
        move.statusPercentChance = 10.0;
        break;
      case Gen1Constants.damagePoison20PercentEffect:
      case Gen1Constants.twineedleEffect:
        move.statusPercentChance = 20.0;
        break;
      case Gen1Constants.damageBurn30PercentEffect:
      case Gen1Constants.damageFreeze30PercentEffect:
      case Gen1Constants.damageParalyze30PercentEffect:
        move.statusPercentChance = 30.0;
        break;
      case Gen1Constants.damagePoison40PercentEffect:
        move.statusPercentChance = 40.0;
        break;
    }
  }
}

function loadMiscMoveInfoFromEffect(move: Move): void {
  switch (move.effectIndex) {
    case Gen1Constants.flinch10PercentEffect:
      move.flinchPercentChance = 10.0;
      break;

    case Gen1Constants.flinch30PercentEffect:
      move.flinchPercentChance = 30.0;
      break;

    case Gen1Constants.damageAbsorbEffect:
    case Gen1Constants.dreamEaterEffect:
      move.absorbPercent = 50;
      break;

    case Gen1Constants.damageRecoilEffect:
      move.recoilPercent = 25;
      break;

    case Gen1Constants.chargeEffect:
    case Gen1Constants.flyEffect:
      move.isChargeMove = true;
      break;

    case Gen1Constants.hyperBeamEffect:
      move.isRechargeMove = true;
      break;
  }

  if (Gen1Constants.increasedCritMoves.includes(move.number)) {
    move.criticalChance = CriticalChance.INCREASED;
  }
}

// ---------------------------------------------------------------------------
// Factory (ROM detection without loading)
// ---------------------------------------------------------------------------

export class Gen1Factory {
  /**
   * Determines whether the given ROM data could be a Gen 1 ROM.
   */
  static isLoadable(data: Uint8Array, romEntries: RomEntry[]): boolean {
    if (data.length > 8 * 1024 * 1024) {
      return false;
    }
    if (data.length === 0) {
      return false;
    }
    // We only need 0x1000 bytes for detection, but use whatever we have
    const partial = data.length > 0x1000 ? data.subarray(0, 0x1000) : data;
    return detectRomInner(partial, data.length, romEntries);
  }
}
