/**
 * Gen2RomHandler.ts - randomizer handler for G/S/C.
 *
 * Part of "Universal Pokemon Randomizer ZX" by the UPR-ZX team
 * Originally part of "Universal Pokemon Randomizer" by Dabomstew
 * Pokemon and any associated names and the like are
 * trademark and (C) Nintendo 1996-2020.
 *
 * Licensed under the terms of the GPL v3+.
 */

import * as Gen2Constants from '../constants/gen2-constants';
import * as GBConstants from '../constants/gb-constants';
import * as GlobalConstants from '../constants/global-constants';
import * as Moves from '../constants/moves';
import { Pokemon } from '../pokemon/pokemon';
import { Move } from '../pokemon/move';
import { MoveCategory } from '../pokemon/move-category';
import { ExpCurve, expCurveFromByte, expCurveToByte } from '../pokemon/exp-curve';
import { StatChangeType } from '../pokemon/stat-change-type';
import { StatChangeMoveType } from '../pokemon/stat-change-move-type';
import { StatusMoveType } from '../pokemon/status-move-type';
import { StatusType } from '../pokemon/status-type';
import { CriticalChance } from '../pokemon/critical-chance';
import {
  readWord,
  writeWord,
  romCode,
  readStringFromRom,
  lengthOfStringAt,
  translateString,
  TextTables,
  createTextTables,
  readTextTable as readTextTableInto,
} from './gen1-rom-handler';

// ---------------------------------------------------------------------------
// ROM Entry (parsed from gen2_offsets.ini in the Java version)
// ---------------------------------------------------------------------------

export interface RomEntry {
  name: string;
  romCode: string;
  version: number;
  nonJapanese: number;
  extraTableFile: string | null;
  isCrystal: boolean;
  expectedCRC32: number;
  crcInHeader: number;
  codeTweaks: Map<string, string>;
  entries: Map<string, number>;
  arrayEntries: Map<string, number[]>;
  strings: Map<string, string>;
}

export function createDefaultRomEntry(): RomEntry {
  return {
    name: '',
    romCode: '',
    version: 0,
    nonJapanese: 0,
    extraTableFile: null,
    isCrystal: false,
    expectedCRC32: -1,
    crcInHeader: -1,
    codeTweaks: new Map(),
    entries: new Map(),
    arrayEntries: new Map(),
    strings: new Map(),
  };
}

function romEntryGetValue(entry: RomEntry, key: string): number {
  if (!entry.entries.has(key)) {
    entry.entries.set(key, 0);
  }
  return entry.entries.get(key)!;
}

// ---------------------------------------------------------------------------
// ROM detection
// ---------------------------------------------------------------------------

export function checkRomEntry(rom: Uint8Array, romEntries: RomEntry[]): RomEntry | null {
  const version = rom[GBConstants.versionOffset] & 0xFF;
  const nonjap = rom[GBConstants.jpFlagOffset] & 0xFF;
  const crcInHeader = ((rom[GBConstants.crcOffset] & 0xFF) << 8) | (rom[GBConstants.crcOffset + 1] & 0xFF);

  // Check for specific CRC first
  for (const re of romEntries) {
    if (romCode(rom, re.romCode) && re.version === version && re.nonJapanese === nonjap && re.crcInHeader === crcInHeader) {
      return re;
    }
  }
  // Now check for non-specific-CRC entries
  for (const re of romEntries) {
    if (romCode(rom, re.romCode) && re.version === version && re.nonJapanese === nonjap && re.crcInHeader === -1) {
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
): void {
  pkmn.hp = rom[offset + Gen2Constants.bsHPOffset] & 0xFF;
  pkmn.attack = rom[offset + Gen2Constants.bsAttackOffset] & 0xFF;
  pkmn.defense = rom[offset + Gen2Constants.bsDefenseOffset] & 0xFF;
  pkmn.speed = rom[offset + Gen2Constants.bsSpeedOffset] & 0xFF;
  pkmn.spatk = rom[offset + Gen2Constants.bsSpAtkOffset] & 0xFF;
  pkmn.spdef = rom[offset + Gen2Constants.bsSpDefOffset] & 0xFF;
  // Type
  pkmn.primaryType = Gen2Constants.typeTable[rom[offset + Gen2Constants.bsPrimaryTypeOffset] & 0xFF] as any;
  pkmn.secondaryType = Gen2Constants.typeTable[rom[offset + Gen2Constants.bsSecondaryTypeOffset] & 0xFF] as any;
  // Only one type?
  if (pkmn.secondaryType === pkmn.primaryType) {
    pkmn.secondaryType = null;
  }
  pkmn.catchRate = rom[offset + Gen2Constants.bsCatchRateOffset] & 0xFF;
  pkmn.guaranteedHeldItem = -1;
  pkmn.commonHeldItem = rom[offset + Gen2Constants.bsCommonHeldItemOffset] & 0xFF;
  pkmn.rareHeldItem = rom[offset + Gen2Constants.bsRareHeldItemOffset] & 0xFF;
  pkmn.darkGrassHeldItem = -1;
  const growthCurve = expCurveFromByte(rom[offset + Gen2Constants.bsGrowthCurveOffset]);
  if (growthCurve != null) {
    pkmn.growthCurve = growthCurve;
  }
  pkmn.picDimensions = rom[offset + Gen2Constants.bsPicDimensionsOffset] & 0xFF;
}

export function saveBasicPokeStats(
  pkmn: Pokemon,
  rom: Uint8Array,
  offset: number,
): void {
  rom[offset + Gen2Constants.bsHPOffset] = pkmn.hp;
  rom[offset + Gen2Constants.bsAttackOffset] = pkmn.attack;
  rom[offset + Gen2Constants.bsDefenseOffset] = pkmn.defense;
  rom[offset + Gen2Constants.bsSpeedOffset] = pkmn.speed;
  rom[offset + Gen2Constants.bsSpAtkOffset] = pkmn.spatk;
  rom[offset + Gen2Constants.bsSpDefOffset] = pkmn.spdef;
  rom[offset + Gen2Constants.bsPrimaryTypeOffset] = Gen2Constants.typeToByte(pkmn.primaryType as any);
  if (pkmn.secondaryType == null) {
    rom[offset + Gen2Constants.bsSecondaryTypeOffset] = rom[offset + Gen2Constants.bsPrimaryTypeOffset];
  } else {
    rom[offset + Gen2Constants.bsSecondaryTypeOffset] = Gen2Constants.typeToByte(pkmn.secondaryType as any);
  }
  rom[offset + Gen2Constants.bsCatchRateOffset] = pkmn.catchRate;
  rom[offset + Gen2Constants.bsCommonHeldItemOffset] = pkmn.commonHeldItem;
  rom[offset + Gen2Constants.bsRareHeldItemOffset] = pkmn.rareHeldItem;
  rom[offset + Gen2Constants.bsGrowthCurveOffset] = expCurveToByte(pkmn.growthCurve);
}

// ---------------------------------------------------------------------------
// Move loading / saving
// ---------------------------------------------------------------------------

export function loadMoveData(
  rom: Uint8Array,
  movesOffset: number,
  moveIndex: number,
  moveName: string,
): Move {
  const i = moveIndex;
  const base = movesOffset + (i - 1) * 7;
  const move = new Move();
  move.name = moveName;
  move.number = i;
  move.internalId = i;
  move.effectIndex = rom[base + 1] & 0xFF;
  move.hitratio = ((rom[base + 4] & 0xFF)) / 255.0 * 100;
  move.power = rom[base + 2] & 0xFF;
  move.pp = rom[base + 5] & 0xFF;
  move.type = Gen2Constants.typeTable[rom[base + 3]] as any;
  move.category = GBConstants.physicalTypes.has(move.type as any) ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;
  if (move.power === 0 && !GlobalConstants.noPowerNonStatusMoves.includes(i)) {
    move.category = MoveCategory.STATUS;
  }

  if (i === Moves.swift) {
    // perfectAccuracy would be set here on the handler
  }

  if (GlobalConstants.normalMultihitMoves.includes(i)) {
    move.hitCount = 3;
  } else if (GlobalConstants.doubleHitMoves.includes(i)) {
    move.hitCount = 2;
  } else if (i === Moves.tripleKick) {
    move.hitCount = 2.71; // assumes the first hit lands
  }

  // Priority values from effect_priorities.asm from the Gen 2 disassemblies.
  if (move.effectIndex === Gen2Constants.priorityHitEffectIndex) {
    move.priority = 2;
  } else if (
    move.effectIndex === Gen2Constants.protectEffectIndex ||
    move.effectIndex === Gen2Constants.endureEffectIndex
  ) {
    move.priority = 3;
  } else if (
    move.effectIndex === Gen2Constants.forceSwitchEffectIndex ||
    move.effectIndex === Gen2Constants.counterEffectIndex ||
    move.effectIndex === Gen2Constants.mirrorCoatEffectIndex
  ) {
    move.priority = 0;
  } else {
    move.priority = 1;
  }

  const secondaryEffectChance = ((rom[base + 6] & 0xFF)) / 255.0 * 100;
  loadStatChangesFromEffect(move, secondaryEffectChance);
  loadStatusFromEffect(move, secondaryEffectChance);
  loadMiscMoveInfoFromEffect(move, secondaryEffectChance);

  return move;
}

export function saveMoveData(
  rom: Uint8Array,
  movesOffset: number,
  move: Move,
): void {
  const i = move.internalId;
  const base = movesOffset + (i - 1) * 7;
  rom[base + 1] = move.effectIndex;
  rom[base + 2] = move.power;
  rom[base + 3] = Gen2Constants.typeToByte(move.type as any);
  let hitratio = Math.round(move.hitratio * 2.55);
  if (hitratio < 0) hitratio = 0;
  if (hitratio > 255) hitratio = 255;
  rom[base + 4] = hitratio;
  rom[base + 5] = move.pp;
}

// ---------------------------------------------------------------------------
// Move effect helpers
// ---------------------------------------------------------------------------

function loadStatChangesFromEffect(move: Move, secondaryEffectChance: number): void {
  switch (move.effectIndex) {
    case Gen2Constants.noDamageAtkPlusOneEffect:
    case Gen2Constants.damageUserAtkPlusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = 1;
      break;
    case Gen2Constants.noDamageDefPlusOneEffect:
    case Gen2Constants.damageUserDefPlusOneEffect:
    case Gen2Constants.defenseCurlEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = 1;
      break;
    case Gen2Constants.noDamageSpAtkPlusOneEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
      move.statChanges[0].stages = 1;
      break;
    case Gen2Constants.noDamageEvasionPlusOneEffect:
      move.statChanges[0].type = StatChangeType.EVASION;
      move.statChanges[0].stages = 1;
      break;
    case Gen2Constants.noDamageAtkMinusOneEffect:
    case Gen2Constants.damageAtkMinusOneEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = -1;
      break;
    case Gen2Constants.noDamageDefMinusOneEffect:
    case Gen2Constants.damageDefMinusOneEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = -1;
      break;
    case Gen2Constants.noDamageSpeMinusOneEffect:
    case Gen2Constants.damageSpeMinusOneEffect:
      move.statChanges[0].type = StatChangeType.SPEED;
      move.statChanges[0].stages = -1;
      break;
    case Gen2Constants.noDamageAccuracyMinusOneEffect:
    case Gen2Constants.damageAccuracyMinusOneEffect:
      move.statChanges[0].type = StatChangeType.ACCURACY;
      move.statChanges[0].stages = -1;
      break;
    case Gen2Constants.noDamageEvasionMinusOneEffect:
      move.statChanges[0].type = StatChangeType.EVASION;
      move.statChanges[0].stages = -1;
      break;
    case Gen2Constants.noDamageAtkPlusTwoEffect:
    case Gen2Constants.swaggerEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = 2;
      break;
    case Gen2Constants.noDamageDefPlusTwoEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = 2;
      break;
    case Gen2Constants.noDamageSpePlusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPEED;
      move.statChanges[0].stages = 2;
      break;
    case Gen2Constants.noDamageSpDefPlusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[0].stages = 2;
      break;
    case Gen2Constants.noDamageAtkMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.ATTACK;
      move.statChanges[0].stages = -2;
      break;
    case Gen2Constants.noDamageDefMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.DEFENSE;
      move.statChanges[0].stages = -2;
      break;
    case Gen2Constants.noDamageSpeMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPEED;
      move.statChanges[0].stages = -2;
      break;
    case Gen2Constants.noDamageSpDefMinusTwoEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[0].stages = -2;
      break;
    case Gen2Constants.damageSpDefMinusOneEffect:
      move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
      move.statChanges[0].stages = -1;
      break;
    case Gen2Constants.damageUserAllPlusOneEffect:
      move.statChanges[0].type = StatChangeType.ALL;
      move.statChanges[0].stages = 1;
      break;
    default:
      // Move does not have a stat-changing effect
      return;
  }

  switch (move.effectIndex) {
    case Gen2Constants.noDamageAtkPlusOneEffect:
    case Gen2Constants.noDamageDefPlusOneEffect:
    case Gen2Constants.noDamageSpAtkPlusOneEffect:
    case Gen2Constants.noDamageEvasionPlusOneEffect:
    case Gen2Constants.noDamageAtkMinusOneEffect:
    case Gen2Constants.noDamageDefMinusOneEffect:
    case Gen2Constants.noDamageSpeMinusOneEffect:
    case Gen2Constants.noDamageAccuracyMinusOneEffect:
    case Gen2Constants.noDamageEvasionMinusOneEffect:
    case Gen2Constants.noDamageAtkPlusTwoEffect:
    case Gen2Constants.noDamageDefPlusTwoEffect:
    case Gen2Constants.noDamageSpePlusTwoEffect:
    case Gen2Constants.noDamageSpDefPlusTwoEffect:
    case Gen2Constants.noDamageAtkMinusTwoEffect:
    case Gen2Constants.noDamageDefMinusTwoEffect:
    case Gen2Constants.noDamageSpeMinusTwoEffect:
    case Gen2Constants.noDamageSpDefMinusTwoEffect:
    case Gen2Constants.swaggerEffect:
    case Gen2Constants.defenseCurlEffect:
      if (move.statChanges[0].stages < 0 || move.effectIndex === Gen2Constants.swaggerEffect) {
        move.statChangeMoveType = StatChangeMoveType.NO_DAMAGE_TARGET;
      } else {
        move.statChangeMoveType = StatChangeMoveType.NO_DAMAGE_USER;
      }
      break;

    case Gen2Constants.damageAtkMinusOneEffect:
    case Gen2Constants.damageDefMinusOneEffect:
    case Gen2Constants.damageSpeMinusOneEffect:
    case Gen2Constants.damageSpDefMinusOneEffect:
    case Gen2Constants.damageAccuracyMinusOneEffect:
      move.statChangeMoveType = StatChangeMoveType.DAMAGE_TARGET;
      break;

    case Gen2Constants.damageUserDefPlusOneEffect:
    case Gen2Constants.damageUserAtkPlusOneEffect:
    case Gen2Constants.damageUserAllPlusOneEffect:
      move.statChangeMoveType = StatChangeMoveType.DAMAGE_USER;
      break;
  }

  if (
    move.statChangeMoveType === StatChangeMoveType.DAMAGE_TARGET ||
    move.statChangeMoveType === StatChangeMoveType.DAMAGE_USER
  ) {
    for (let j = 0; j < move.statChanges.length; j++) {
      if (move.statChanges[j].type !== StatChangeType.NONE) {
        move.statChanges[j].percentChance = secondaryEffectChance;
        if (move.statChanges[j].percentChance === 0.0) {
          move.statChanges[j].percentChance = 100.0;
        }
      }
    }
  }
}

function loadStatusFromEffect(move: Move, secondaryEffectChance: number): void {
  switch (move.effectIndex) {
    case Gen2Constants.noDamageSleepEffect:
    case Gen2Constants.toxicEffect:
    case Gen2Constants.noDamageConfusionEffect:
    case Gen2Constants.noDamagePoisonEffect:
    case Gen2Constants.noDamageParalyzeEffect:
    case Gen2Constants.swaggerEffect:
      move.statusMoveType = StatusMoveType.NO_DAMAGE;
      break;

    case Gen2Constants.damagePoisonEffect:
    case Gen2Constants.damageBurnEffect:
    case Gen2Constants.damageFreezeEffect:
    case Gen2Constants.damageParalyzeEffect:
    case Gen2Constants.damageConfusionEffect:
    case Gen2Constants.twineedleEffect:
    case Gen2Constants.damageBurnAndThawUserEffect:
    case Gen2Constants.thunderEffect:
      move.statusMoveType = StatusMoveType.DAMAGE;
      break;

    default:
      // Move does not have a status effect
      return;
  }

  switch (move.effectIndex) {
    case Gen2Constants.noDamageSleepEffect:
      move.statusType = StatusType.SLEEP;
      break;
    case Gen2Constants.damagePoisonEffect:
    case Gen2Constants.noDamagePoisonEffect:
    case Gen2Constants.twineedleEffect:
      move.statusType = StatusType.POISON;
      break;
    case Gen2Constants.damageBurnEffect:
    case Gen2Constants.damageBurnAndThawUserEffect:
      move.statusType = StatusType.BURN;
      break;
    case Gen2Constants.damageFreezeEffect:
      move.statusType = StatusType.FREEZE;
      break;
    case Gen2Constants.damageParalyzeEffect:
    case Gen2Constants.noDamageParalyzeEffect:
    case Gen2Constants.thunderEffect:
      move.statusType = StatusType.PARALYZE;
      break;
    case Gen2Constants.toxicEffect:
      move.statusType = StatusType.TOXIC_POISON;
      break;
    case Gen2Constants.noDamageConfusionEffect:
    case Gen2Constants.damageConfusionEffect:
    case Gen2Constants.swaggerEffect:
      move.statusType = StatusType.CONFUSION;
      break;
  }

  if (move.statusMoveType === StatusMoveType.DAMAGE) {
    move.statusPercentChance = secondaryEffectChance;
    if (move.statusPercentChance === 0.0) {
      move.statusPercentChance = 100.0;
    }
  }
}

function loadMiscMoveInfoFromEffect(move: Move, secondaryEffectChance: number): void {
  switch (move.effectIndex) {
    case Gen2Constants.flinchEffect:
    case Gen2Constants.snoreEffect:
    case Gen2Constants.twisterEffect:
    case Gen2Constants.stompEffect:
      move.flinchPercentChance = secondaryEffectChance;
      break;

    case Gen2Constants.damageAbsorbEffect:
    case Gen2Constants.dreamEaterEffect:
      move.absorbPercent = 50;
      break;

    case Gen2Constants.damageRecoilEffect:
      move.recoilPercent = 25;
      break;

    case Gen2Constants.flailAndReversalEffect:
    case Gen2Constants.futureSightEffect:
      move.criticalChance = CriticalChance.NONE;
      break;

    case Gen2Constants.bindingEffect:
    case Gen2Constants.trappingEffect:
      move.isTrapMove = true;
      break;

    case Gen2Constants.razorWindEffect:
    case Gen2Constants.skyAttackEffect:
    case Gen2Constants.skullBashEffect:
    case Gen2Constants.solarbeamEffect:
    case Gen2Constants.semiInvulnerableEffect:
      move.isChargeMove = true;
      break;

    case Gen2Constants.hyperBeamEffect:
      move.isRechargeMove = true;
      break;
  }

  if (Gen2Constants.increasedCritMoves.includes(move.number)) {
    move.criticalChance = CriticalChance.INCREASED;
  }
}

// ---------------------------------------------------------------------------
// Factory (ROM detection without loading)
// ---------------------------------------------------------------------------

export class Gen2Factory {
  /**
   * Determines whether the given ROM data could be a Gen 2 ROM.
   */
  static isLoadable(data: Uint8Array, romEntries: RomEntry[]): boolean {
    if (data.length > 8 * 1024 * 1024) {
      return false;
    }
    if (data.length === 0) {
      return false;
    }
    const partial = data.length > 0x1000 ? data.subarray(0, 0x1000) : data;
    return detectRomInner(partial, data.length, romEntries);
  }
}
