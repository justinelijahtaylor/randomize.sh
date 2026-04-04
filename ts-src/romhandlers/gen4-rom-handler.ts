/*----------------------------------------------------------------------------*/
/*--  gen4-rom-handler.ts - randomizer handler for D/P/Pt/HG/SS.            --*/
/*--                                                                        --*/
/*--  Part of "Universal Pokemon Randomizer ZX" by the UPR-ZX team          --*/
/*--  Originally part of "Universal Pokemon Randomizer" by Dabomstew        --*/
/*--  Pokemon and any associated names and the like are                     --*/
/*--  trademark and (C) Nintendo 1996-2020.                                 --*/
/*--                                                                        --*/
/*--  Ported to TypeScript from Java.                                       --*/
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

import { NARCArchive } from '../nds/narc-archive';
import * as Gen4Constants from '../constants/gen4-constants';
import * as GlobalConstants from '../constants/global-constants';
import * as Moves from '../constants/moves';
import { Pokemon } from '../pokemon/pokemon';
import { Move, MoveStatChange } from '../pokemon/move';
import { MoveCategory } from '../pokemon/move-category';
import { Type } from '../pokemon/type';
import { ExpCurve, expCurveFromByte, expCurveToByte } from '../pokemon/exp-curve';
import { StatChangeMoveType } from '../pokemon/stat-change-move-type';
import { StatChangeType } from '../pokemon/stat-change-type';
import { StatusType } from '../pokemon/status-type';
import { StatusMoveType } from '../pokemon/status-move-type';
import { CriticalChance } from '../pokemon/critical-chance';
import { FileFunctions } from '../utils/file-functions';

// ---------------------------------------------------------------------------
// Helper: read / write little-endian 16-bit values from a Uint8Array
// ---------------------------------------------------------------------------

function readWord(data: Uint8Array, offset: number): number {
  return (data[offset] & 0xff) | ((data[offset + 1] & 0xff) << 8);
}

function writeWord(data: Uint8Array, offset: number, value: number): void {
  data[offset] = value & 0xff;
  data[offset + 1] = (value >> 8) & 0xff;
}

// ---------------------------------------------------------------------------
// Type mapping helpers
// ---------------------------------------------------------------------------

function typeFromTable(index: number): Type | null {
  const name = Gen4Constants.typeTable[index];
  if (name == null) return null;
  return Type[name as keyof typeof Type] ?? null;
}

function typeToInternalByte(type: Type): number {
  return Gen4Constants.typeToByte(Type[type]);
}

// ---------------------------------------------------------------------------
// Move category mapping (Gen4 order: 0=Physical, 1=Special, 2=Status)
// ---------------------------------------------------------------------------

const moveCategoryIndices: MoveCategory[] = [
  MoveCategory.PHYSICAL,
  MoveCategory.SPECIAL,
  MoveCategory.STATUS,
];

// ---------------------------------------------------------------------------
// RomEntry & related helper types (parsed from gen4_offsets.ini)
// ---------------------------------------------------------------------------

interface RomFileEntry {
  path: string;
  expectedCRC32: number;
}

export interface Gen4RomEntry {
  name: string;
  romCode: string;
  version: number;
  romType: number;
  arm9ExpectedCRC32: number;
  staticPokemonSupport: boolean;
  copyStaticPokemon: boolean;
  copyRoamingPokemon: boolean;
  ignoreGameCornerStatics: boolean;
  copyText: boolean;
  strings: Map<string, string>;
  tweakFiles: Map<string, string>;
  numbers: Map<string, number>;
  arrayEntries: Map<string, number[]>;
  files: Map<string, RomFileEntry>;
  overlayExpectedCRC32s: Map<number, number>;
}

function createDefaultRomEntry(): Gen4RomEntry {
  return {
    name: '',
    romCode: '',
    version: 0,
    romType: Gen4Constants.Type_DP,
    arm9ExpectedCRC32: 0,
    staticPokemonSupport: false,
    copyStaticPokemon: false,
    copyRoamingPokemon: false,
    ignoreGameCornerStatics: false,
    copyText: false,
    strings: new Map(),
    tweakFiles: new Map(),
    numbers: new Map(),
    arrayEntries: new Map(),
    files: new Map(),
    overlayExpectedCRC32s: new Map(),
  };
}

function romEntryGetInt(entry: Gen4RomEntry, key: string): number {
  return entry.numbers.get(key) ?? 0;
}

function romEntryGetString(entry: Gen4RomEntry, key: string): string {
  return entry.strings.get(key) ?? '';
}

function romEntryGetFile(entry: Gen4RomEntry, key: string): string {
  const fe = entry.files.get(key);
  return fe?.path ?? '';
}

// ---------------------------------------------------------------------------
// ROM detection (Factory-equivalent)
// ---------------------------------------------------------------------------

/** Known ROM codes for Gen 4 games. */
const KNOWN_ROM_CODES: ReadonlySet<string> = new Set([
  'ADAE', 'ADAJ', 'ADAF', 'ADAD', 'ADAI', 'ADAS', 'ADAK', // Diamond
  'APAE', 'APAJ', 'APAF', 'APAD', 'APAI', 'APAS', 'APAK', // Pearl
  'CPUE', 'CPUJ', 'CPUF', 'CPUD', 'CPUI', 'CPUS', 'CPUK', // Platinum
  'IPKE', 'IPKJ', 'IPKF', 'IPKD', 'IPKI', 'IPKS', 'IPKK', // HeartGold
  'IPGE', 'IPGJ', 'IPGF', 'IPGD', 'IPGI', 'IPGS', 'IPGK', // SoulSilver
]);

/**
 * Detect whether a ROM code + version pair corresponds to a supported Gen 4 ROM.
 * If a rom-entry list has been loaded, this checks against it; otherwise it falls
 * back to known ROM code prefixes.
 */
export function detectGen4Rom(romCode: string | null, _version?: number): boolean {
  if (romCode == null) return false;
  return KNOWN_ROM_CODES.has(romCode);
}

/**
 * Determine the rom type (DP / Plat / HGSS) from the ROM code.
 */
export function romTypeFromCode(romCode: string): number {
  if (romCode.startsWith('ADA') || romCode.startsWith('APA')) {
    return Gen4Constants.Type_DP;
  }
  if (romCode.startsWith('CPU')) {
    return Gen4Constants.Type_Plat;
  }
  if (romCode.startsWith('IPK') || romCode.startsWith('IPG')) {
    return Gen4Constants.Type_HGSS;
  }
  return Gen4Constants.Type_DP;
}

// ---------------------------------------------------------------------------
// Main handler class
// ---------------------------------------------------------------------------

export class Gen4RomHandler {
  // --- state ---
  romEntry: Gen4RomEntry;
  arm9: Uint8Array = new Uint8Array(0);
  pokes: (Pokemon | null)[] = [];
  moves: (Move | null)[] = [];
  pokeNarc: NARCArchive | null = null;
  moveNarc: NARCArchive | null = null;
  msgNarc: NARCArchive | null = null;
  scriptNarc: NARCArchive | null = null;
  eventNarc: NARCArchive | null = null;
  perfectAccuracy = 0;

  constructor(romEntry?: Gen4RomEntry) {
    this.romEntry = romEntry ?? createDefaultRomEntry();
  }

  // -----------------------------------------------------------------------
  // Pokemon loading / saving
  // -----------------------------------------------------------------------

  loadPokemonStats(pokeNarc: NARCArchive, pokeNames: string[]): void {
    this.pokeNarc = pokeNarc;
    const formeCount = Gen4Constants.getFormeCount(this.romEntry.romType);
    this.pokes = new Array<Pokemon | null>(
      Gen4Constants.pokemonCount + formeCount + 1,
    ).fill(null);

    for (let i = 1; i <= Gen4Constants.pokemonCount; i++) {
      const pk = new Pokemon();
      pk.number = i;
      this.loadBasicPokeStats(pk, pokeNarc.files[i]);
      pk.name = pokeNames[i] ?? `Pokemon${i}`;
      this.pokes[i] = pk;
    }
  }

  loadBasicPokeStats(pkmn: Pokemon, stats: Uint8Array): void {
    pkmn.hp = stats[Gen4Constants.bsHPOffset] & 0xff;
    pkmn.attack = stats[Gen4Constants.bsAttackOffset] & 0xff;
    pkmn.defense = stats[Gen4Constants.bsDefenseOffset] & 0xff;
    pkmn.speed = stats[Gen4Constants.bsSpeedOffset] & 0xff;
    pkmn.spatk = stats[Gen4Constants.bsSpAtkOffset] & 0xff;
    pkmn.spdef = stats[Gen4Constants.bsSpDefOffset] & 0xff;

    // Types
    const pt = typeFromTable(stats[Gen4Constants.bsPrimaryTypeOffset] & 0xff);
    const st = typeFromTable(stats[Gen4Constants.bsSecondaryTypeOffset] & 0xff);
    if (pt != null) pkmn.primaryType = pt;
    pkmn.secondaryType = (st === pkmn.primaryType) ? null : st;

    pkmn.catchRate = stats[Gen4Constants.bsCatchRateOffset] & 0xff;
    const gc = expCurveFromByte(stats[Gen4Constants.bsGrowthCurveOffset]);
    if (gc != null) pkmn.growthCurve = gc;

    // Abilities
    pkmn.ability1 = stats[Gen4Constants.bsAbility1Offset] & 0xff;
    pkmn.ability2 = stats[Gen4Constants.bsAbility2Offset] & 0xff;

    // Held items
    const item1 = readWord(stats, Gen4Constants.bsCommonHeldItemOffset);
    const item2 = readWord(stats, Gen4Constants.bsRareHeldItemOffset);
    if (item1 === item2) {
      pkmn.guaranteedHeldItem = item1;
      pkmn.commonHeldItem = 0;
      pkmn.rareHeldItem = 0;
    } else {
      pkmn.guaranteedHeldItem = 0;
      pkmn.commonHeldItem = item1;
      pkmn.rareHeldItem = item2;
    }
    pkmn.darkGrassHeldItem = -1;

    pkmn.genderRatio = stats[Gen4Constants.bsGenderRatioOffset] & 0xff;
  }

  saveBasicPokeStats(pkmn: Pokemon, stats: Uint8Array): void {
    stats[Gen4Constants.bsHPOffset] = pkmn.hp & 0xff;
    stats[Gen4Constants.bsAttackOffset] = pkmn.attack & 0xff;
    stats[Gen4Constants.bsDefenseOffset] = pkmn.defense & 0xff;
    stats[Gen4Constants.bsSpeedOffset] = pkmn.speed & 0xff;
    stats[Gen4Constants.bsSpAtkOffset] = pkmn.spatk & 0xff;
    stats[Gen4Constants.bsSpDefOffset] = pkmn.spdef & 0xff;

    stats[Gen4Constants.bsPrimaryTypeOffset] = typeToInternalByte(pkmn.primaryType);
    if (pkmn.secondaryType == null) {
      stats[Gen4Constants.bsSecondaryTypeOffset] = stats[Gen4Constants.bsPrimaryTypeOffset];
    } else {
      stats[Gen4Constants.bsSecondaryTypeOffset] = typeToInternalByte(pkmn.secondaryType);
    }

    stats[Gen4Constants.bsCatchRateOffset] = pkmn.catchRate & 0xff;
    stats[Gen4Constants.bsGrowthCurveOffset] = expCurveToByte(pkmn.growthCurve);

    stats[Gen4Constants.bsAbility1Offset] = pkmn.ability1 & 0xff;
    stats[Gen4Constants.bsAbility2Offset] = pkmn.ability2 & 0xff;

    // Held items
    if (pkmn.guaranteedHeldItem > 0) {
      writeWord(stats, Gen4Constants.bsCommonHeldItemOffset, pkmn.guaranteedHeldItem);
      writeWord(stats, Gen4Constants.bsRareHeldItemOffset, pkmn.guaranteedHeldItem);
    } else {
      writeWord(stats, Gen4Constants.bsCommonHeldItemOffset, pkmn.commonHeldItem);
      writeWord(stats, Gen4Constants.bsRareHeldItemOffset, pkmn.rareHeldItem);
    }
    stats[Gen4Constants.bsGenderRatioOffset] = pkmn.genderRatio & 0xff;
  }

  // -----------------------------------------------------------------------
  // Moves loading / saving
  // -----------------------------------------------------------------------

  loadMoves(moveNarc: NARCArchive, moveNames: string[]): void {
    this.moveNarc = moveNarc;
    this.moves = new Array<Move | null>(Gen4Constants.moveCount + 1).fill(null);

    for (let i = 1; i <= Gen4Constants.moveCount; i++) {
      const moveData = moveNarc.files[i];
      const m = new Move();
      m.name = moveNames[i] ?? `Move${i}`;
      m.number = i;
      m.internalId = i;
      m.effectIndex = readWord(moveData, 0);
      m.hitratio = moveData[5] & 0xff;
      m.power = moveData[3] & 0xff;
      m.pp = moveData[6] & 0xff;

      const typeIndex = moveData[4] & 0xff;
      const mt = typeFromTable(typeIndex);
      if (mt != null) m.type = mt;

      m.target = readWord(moveData, 8);

      const catIndex = moveData[2] & 0xff;
      m.category = catIndex < moveCategoryIndices.length
        ? moveCategoryIndices[catIndex]
        : MoveCategory.STATUS;

      m.priority = moveData[10] << 24 >> 24; // sign-extend
      const flags = moveData[11] & 0xff;
      m.makesContact = (flags & 1) !== 0;
      m.isPunchMove = Gen4Constants.punchMoves.includes(i);
      m.isSoundMove = Gen4Constants.soundMoves.includes(i);

      if (i === Moves.swift) {
        this.perfectAccuracy = m.hitratio;
      }

      if (GlobalConstants.normalMultihitMoves.includes(i)) {
        m.hitCount = 3;
      } else if (GlobalConstants.doubleHitMoves.includes(i)) {
        m.hitCount = 2;
      } else if (i === Moves.tripleKick) {
        m.hitCount = 2.71;
      }

      const secondaryEffectChance = moveData[7] & 0xff;
      this.loadStatChangesFromEffect(m, secondaryEffectChance);
      this.loadStatusFromEffect(m, secondaryEffectChance);
      this.loadMiscMoveInfoFromEffect(m, secondaryEffectChance);

      this.moves[i] = m;
    }
  }

  saveMoves(): void {
    if (!this.moveNarc) return;
    for (let i = 1; i <= Gen4Constants.moveCount; i++) {
      const m = this.moves[i];
      if (!m) continue;
      const data = this.moveNarc.files[i];
      writeWord(data, 0, m.effectIndex);
      data[2] = Gen4Constants.moveCategoryToByte(m.category);
      data[3] = m.power & 0xff;
      data[4] = typeToInternalByte(m.type);
      let hitratio = Math.round(m.hitratio);
      if (hitratio < 0) hitratio = 0;
      if (hitratio > 100) hitratio = 100;
      data[5] = hitratio & 0xff;
      data[6] = m.pp & 0xff;
    }
  }

  // -----------------------------------------------------------------------
  // Stat-change / status / misc effect parsing helpers
  // -----------------------------------------------------------------------

  private loadStatChangesFromEffect(move: Move, secondaryEffectChance: number): void {
    switch (move.effectIndex) {
      // No-damage stat changers (user or target depending on move.target)
      case Gen4Constants.noDamageAtkPlusOneEffect:
      case Gen4Constants.noDamageDefPlusOneEffect:
      case Gen4Constants.noDamageSpAtkPlusOneEffect:
      case Gen4Constants.noDamageEvasionPlusOneEffect:
      case Gen4Constants.noDamageAtkMinusOneEffect:
      case Gen4Constants.noDamageDefMinusOneEffect:
      case Gen4Constants.noDamageSpeMinusOneEffect:
      case Gen4Constants.noDamageAccuracyMinusOneEffect:
      case Gen4Constants.noDamageEvasionMinusOneEffect:
      case Gen4Constants.noDamageAtkPlusTwoEffect:
      case Gen4Constants.noDamageDefPlusTwoEffect:
      case Gen4Constants.noDamageSpePlusTwoEffect:
      case Gen4Constants.noDamageSpAtkPlusTwoEffect:
      case Gen4Constants.noDamageSpDefPlusTwoEffect:
      case Gen4Constants.noDamageAtkMinusTwoEffect:
      case Gen4Constants.noDamageDefMinusTwoEffect:
      case Gen4Constants.noDamageSpeMinusTwoEffect:
      case Gen4Constants.noDamageSpDefMinusTwoEffect:
      case Gen4Constants.minimizeEffect:
      case Gen4Constants.swaggerEffect:
      case Gen4Constants.defenseCurlEffect:
      case Gen4Constants.flatterEffect:
      case Gen4Constants.chargeEffect:
      case Gen4Constants.noDamageAtkAndDefMinusOneEffect:
      case Gen4Constants.noDamageDefAndSpDefPlusOneEffect:
      case Gen4Constants.noDamageAtkAndDefPlusOneEffect:
      case Gen4Constants.noDamageSpAtkAndSpDefPlusOneEffect:
      case Gen4Constants.noDamageAtkAndSpePlusOneEffect:
      case Gen4Constants.noDamageSpAtkMinusTwoEffect:
        if (move.target === 16) {
          move.statChangeMoveType = StatChangeMoveType.NO_DAMAGE_USER;
        } else {
          move.statChangeMoveType = StatChangeMoveType.NO_DAMAGE_TARGET;
        }
        break;

      // Damage + target debuff
      case Gen4Constants.damageAtkMinusOneEffect:
      case Gen4Constants.damageDefMinusOneEffect:
      case Gen4Constants.damageSpeMinusOneEffect:
      case Gen4Constants.damageSpAtkMinusOneEffect:
      case Gen4Constants.damageSpDefMinusOneEffect:
      case Gen4Constants.damageAccuracyMinusOneEffect:
      case Gen4Constants.damageSpDefMinusTwoEffect:
        move.statChangeMoveType = StatChangeMoveType.DAMAGE_TARGET;
        break;

      // Damage + user buff/debuff
      case Gen4Constants.damageUserDefPlusOneEffect:
      case Gen4Constants.damageUserAtkPlusOneEffect:
      case Gen4Constants.damageUserAllPlusOneEffect:
      case Gen4Constants.damageUserAtkAndDefMinusOneEffect:
      case Gen4Constants.damageUserSpAtkMinusTwoEffect:
      case Gen4Constants.damageUserSpeMinusOneEffect:
      case Gen4Constants.damageUserDefAndSpDefMinusOneEffect:
      case Gen4Constants.damageUserSpAtkPlusOneEffect:
        move.statChangeMoveType = StatChangeMoveType.DAMAGE_USER;
        break;

      default:
        return; // no stat-changing effect
    }

    // Now set specific stat types / stages
    switch (move.effectIndex) {
      case Gen4Constants.noDamageAtkPlusOneEffect:
      case Gen4Constants.damageUserAtkPlusOneEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = 1;
        break;
      case Gen4Constants.noDamageDefPlusOneEffect:
      case Gen4Constants.damageUserDefPlusOneEffect:
      case Gen4Constants.defenseCurlEffect:
        move.statChanges[0].type = StatChangeType.DEFENSE;
        move.statChanges[0].stages = 1;
        break;
      case Gen4Constants.noDamageSpAtkPlusOneEffect:
      case Gen4Constants.flatterEffect:
      case Gen4Constants.damageUserSpAtkPlusOneEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
        move.statChanges[0].stages = 1;
        break;
      case Gen4Constants.noDamageEvasionPlusOneEffect:
      case Gen4Constants.minimizeEffect:
        move.statChanges[0].type = StatChangeType.EVASION;
        move.statChanges[0].stages = 1;
        break;
      case Gen4Constants.noDamageAtkMinusOneEffect:
      case Gen4Constants.damageAtkMinusOneEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = -1;
        break;
      case Gen4Constants.noDamageDefMinusOneEffect:
      case Gen4Constants.damageDefMinusOneEffect:
        move.statChanges[0].type = StatChangeType.DEFENSE;
        move.statChanges[0].stages = -1;
        break;
      case Gen4Constants.noDamageSpeMinusOneEffect:
      case Gen4Constants.damageSpeMinusOneEffect:
      case Gen4Constants.damageUserSpeMinusOneEffect:
        move.statChanges[0].type = StatChangeType.SPEED;
        move.statChanges[0].stages = -1;
        break;
      case Gen4Constants.noDamageAccuracyMinusOneEffect:
      case Gen4Constants.damageAccuracyMinusOneEffect:
        move.statChanges[0].type = StatChangeType.ACCURACY;
        move.statChanges[0].stages = -1;
        break;
      case Gen4Constants.noDamageEvasionMinusOneEffect:
        move.statChanges[0].type = StatChangeType.EVASION;
        move.statChanges[0].stages = -1;
        break;
      case Gen4Constants.noDamageAtkPlusTwoEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = 2;
        break;
      case Gen4Constants.noDamageDefPlusTwoEffect:
        move.statChanges[0].type = StatChangeType.DEFENSE;
        move.statChanges[0].stages = 2;
        break;
      case Gen4Constants.noDamageSpePlusTwoEffect:
        move.statChanges[0].type = StatChangeType.SPEED;
        move.statChanges[0].stages = 2;
        break;
      case Gen4Constants.noDamageSpAtkPlusTwoEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
        move.statChanges[0].stages = 2;
        break;
      case Gen4Constants.noDamageSpDefPlusTwoEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
        move.statChanges[0].stages = 2;
        break;
      case Gen4Constants.noDamageAtkMinusTwoEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = -2;
        break;
      case Gen4Constants.noDamageDefMinusTwoEffect:
        move.statChanges[0].type = StatChangeType.DEFENSE;
        move.statChanges[0].stages = -2;
        break;
      case Gen4Constants.noDamageSpeMinusTwoEffect:
        move.statChanges[0].type = StatChangeType.SPEED;
        move.statChanges[0].stages = -2;
        break;
      case Gen4Constants.noDamageSpDefMinusTwoEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
        move.statChanges[0].stages = -2;
        break;
      case Gen4Constants.noDamageSpAtkMinusTwoEffect:
      case Gen4Constants.damageUserSpAtkMinusTwoEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
        move.statChanges[0].stages = -2;
        break;
      case Gen4Constants.damageSpDefMinusTwoEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
        move.statChanges[0].stages = -2;
        break;
      case Gen4Constants.damageSpAtkMinusOneEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
        move.statChanges[0].stages = -1;
        break;
      case Gen4Constants.damageSpDefMinusOneEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
        move.statChanges[0].stages = -1;
        break;
      case Gen4Constants.swaggerEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = 2;
        break;
      case Gen4Constants.chargeEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_DEFENSE;
        move.statChanges[0].stages = 1;
        break;
      case Gen4Constants.damageUserAllPlusOneEffect:
        move.statChanges[0].type = StatChangeType.ALL;
        move.statChanges[0].stages = 1;
        break;
      case Gen4Constants.damageUserAtkAndDefMinusOneEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = -1;
        move.statChanges[1].type = StatChangeType.DEFENSE;
        move.statChanges[1].stages = -1;
        break;
      case Gen4Constants.damageUserDefAndSpDefMinusOneEffect:
        move.statChanges[0].type = StatChangeType.DEFENSE;
        move.statChanges[0].stages = -1;
        move.statChanges[1].type = StatChangeType.SPECIAL_DEFENSE;
        move.statChanges[1].stages = -1;
        break;
      case Gen4Constants.noDamageAtkAndDefMinusOneEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = -1;
        move.statChanges[1].type = StatChangeType.DEFENSE;
        move.statChanges[1].stages = -1;
        break;
      case Gen4Constants.noDamageDefAndSpDefPlusOneEffect:
        move.statChanges[0].type = StatChangeType.DEFENSE;
        move.statChanges[0].stages = 1;
        move.statChanges[1].type = StatChangeType.SPECIAL_DEFENSE;
        move.statChanges[1].stages = 1;
        break;
      case Gen4Constants.noDamageAtkAndDefPlusOneEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = 1;
        move.statChanges[1].type = StatChangeType.DEFENSE;
        move.statChanges[1].stages = 1;
        break;
      case Gen4Constants.noDamageSpAtkAndSpDefPlusOneEffect:
        move.statChanges[0].type = StatChangeType.SPECIAL_ATTACK;
        move.statChanges[0].stages = 1;
        move.statChanges[1].type = StatChangeType.SPECIAL_DEFENSE;
        move.statChanges[1].stages = 1;
        break;
      case Gen4Constants.noDamageAtkAndSpePlusOneEffect:
        move.statChanges[0].type = StatChangeType.ATTACK;
        move.statChanges[0].stages = 1;
        move.statChanges[1].type = StatChangeType.SPEED;
        move.statChanges[1].stages = 1;
        break;
    }

    // Percent chance for damage-stat-change effects
    if (
      move.statChangeMoveType === StatChangeMoveType.DAMAGE_TARGET ||
      move.statChangeMoveType === StatChangeMoveType.DAMAGE_USER
    ) {
      for (const sc of move.statChanges) {
        if (sc.type !== StatChangeType.NONE) {
          sc.percentChance = secondaryEffectChance === 0 ? 100.0 : secondaryEffectChance;
        }
      }
    }
  }

  private loadStatusFromEffect(move: Move, secondaryEffectChance: number): void {
    switch (move.effectIndex) {
      case Gen4Constants.noDamageSleepEffect:
        move.statusType = StatusType.SLEEP;
        move.statusMoveType = StatusMoveType.NO_DAMAGE;
        move.statusPercentChance = 100.0;
        break;
      case Gen4Constants.noDamagePoisonEffect:
        move.statusType = StatusType.POISON;
        move.statusMoveType = StatusMoveType.NO_DAMAGE;
        move.statusPercentChance = 100.0;
        break;
      case Gen4Constants.noDamageParalyzeEffect:
        move.statusType = StatusType.PARALYZE;
        move.statusMoveType = StatusMoveType.NO_DAMAGE;
        move.statusPercentChance = 100.0;
        break;
      case Gen4Constants.noDamageBurnEffect:
        move.statusType = StatusType.BURN;
        move.statusMoveType = StatusMoveType.NO_DAMAGE;
        move.statusPercentChance = 100.0;
        break;
      case Gen4Constants.noDamageConfusionEffect:
      case Gen4Constants.swaggerEffect:
      case Gen4Constants.flatterEffect:
      case Gen4Constants.teeterDanceEffect:
        move.statusType = StatusType.CONFUSION;
        move.statusMoveType = StatusMoveType.NO_DAMAGE;
        move.statusPercentChance = 100.0;
        break;
      case Gen4Constants.toxicEffect:
        move.statusType = StatusType.TOXIC_POISON;
        move.statusMoveType = StatusMoveType.NO_DAMAGE;
        move.statusPercentChance = 100.0;
        break;
      case Gen4Constants.damagePoisonEffect:
      case Gen4Constants.twineedleEffect:
      case Gen4Constants.damagePoisonWithIncreasedCritEffect:
        move.statusType = StatusType.POISON;
        move.statusMoveType = StatusMoveType.DAMAGE;
        move.statusPercentChance = secondaryEffectChance;
        break;
      case Gen4Constants.damageBurnEffect:
      case Gen4Constants.damageBurnAndThawUserEffect:
      case Gen4Constants.blazeKickEffect:
        move.statusType = StatusType.BURN;
        move.statusMoveType = StatusMoveType.DAMAGE;
        move.statusPercentChance = secondaryEffectChance;
        break;
      case Gen4Constants.damageFreezeEffect:
      case Gen4Constants.blizzardEffect:
        move.statusType = StatusType.FREEZE;
        move.statusMoveType = StatusMoveType.DAMAGE;
        move.statusPercentChance = secondaryEffectChance;
        break;
      case Gen4Constants.damageParalyzeEffect:
      case Gen4Constants.thunderEffect:
      case Gen4Constants.bounceEffect:
        move.statusType = StatusType.PARALYZE;
        move.statusMoveType = StatusMoveType.DAMAGE;
        move.statusPercentChance = secondaryEffectChance;
        break;
      case Gen4Constants.damageConfusionEffect:
      case Gen4Constants.twisterEffect:
      case Gen4Constants.chatterEffect:
        move.statusType = StatusType.CONFUSION;
        move.statusMoveType = StatusMoveType.DAMAGE;
        move.statusPercentChance = secondaryEffectChance;
        break;
      case Gen4Constants.poisonFangEffect:
        move.statusType = StatusType.TOXIC_POISON;
        move.statusMoveType = StatusMoveType.DAMAGE;
        move.statusPercentChance = secondaryEffectChance;
        break;
      case Gen4Constants.dreamEaterEffect:
        move.statusType = StatusType.SLEEP;
        move.statusMoveType = StatusMoveType.DAMAGE;
        break;
      case Gen4Constants.fireFangEffect:
        // Fire Fang has both burn and flinch; treat burn as main status
        move.statusType = StatusType.BURN;
        move.statusMoveType = StatusMoveType.DAMAGE;
        move.statusPercentChance = secondaryEffectChance;
        break;
    }
  }

  private loadMiscMoveInfoFromEffect(move: Move, secondaryEffectChance: number): void {
    switch (move.effectIndex) {
      case Gen4Constants.flinchEffect:
      case Gen4Constants.snoreEffect:
      case Gen4Constants.twisterEffect:
      case Gen4Constants.stompEffect:
      case Gen4Constants.fakeOutEffect:
      case Gen4Constants.fireFangEffect:
        move.flinchPercentChance = secondaryEffectChance;
        break;
      case Gen4Constants.increasedCritEffect:
      case Gen4Constants.blazeKickEffect:
      case Gen4Constants.damagePoisonWithIncreasedCritEffect:
        move.criticalChance = CriticalChance.INCREASED;
        break;
      case Gen4Constants.trappingEffect:
      case Gen4Constants.bindingEffect:
        move.isTrapMove = true;
        break;
      case Gen4Constants.damageAbsorbEffect:
      case Gen4Constants.dreamEaterEffect:
        move.absorbPercent = 50;
        break;
      case Gen4Constants.damageRecoil25PercentEffect:
        move.recoilPercent = -25;
        break;
      case Gen4Constants.damageRecoil33PercentEffect:
        move.recoilPercent = -33;
        break;
      case Gen4Constants.damageRecoil50PercentEffect:
        move.recoilPercent = -50;
        break;
      case Gen4Constants.flareBlitzEffect:
      case Gen4Constants.voltTackleEffect:
        move.recoilPercent = -33;
        break;
      case Gen4Constants.rechargeEffect:
        move.isRechargeMove = true;
        break;
      case Gen4Constants.razorWindEffect:
      case Gen4Constants.skullBashEffect:
      case Gen4Constants.skyAttackEffect:
      case Gen4Constants.solarbeamEffect:
      case Gen4Constants.flyEffect:
      case Gen4Constants.diveEffect:
      case Gen4Constants.digEffect:
      case Gen4Constants.bounceEffect:
      case Gen4Constants.shadowForceEffect:
        move.isChargeMove = true;
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Accessors
  // -----------------------------------------------------------------------

  getPokemon(): (Pokemon | null)[] {
    return this.pokes;
  }

  getMoves(): (Move | null)[] {
    return this.moves;
  }

  getROMName(): string {
    return 'Pokemon ' + this.romEntry.name;
  }

  getROMCode(): string {
    return this.romEntry.romCode;
  }

  getROMType(): number {
    return this.romEntry.romType;
  }
}
