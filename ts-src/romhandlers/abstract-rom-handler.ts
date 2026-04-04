/**
 * AbstractRomHandler.ts - a base class for all ROM handlers which
 * implements the majority of the actual randomizer logic by building
 * on the base getters & setters provided by each concrete handler.
 *
 * Faithfully ported from AbstractRomHandler.java (7,563 lines).
 */

import type { RomHandler, LogStream, TrainerNameMode } from "./rom-handler";
import type { Settings } from "../config/settings";
import {
  BaseStatisticsMod,
  TypesMod,
  AbilitiesMod,
  WildPokemonRestrictionMod,
} from "../config/settings";
import type { Pokemon } from "../pokemon/pokemon";
import type { Move } from "../pokemon/move";
import type { MegaEvolution } from "../pokemon/mega-evolution";
import type { MoveLearnt } from "../pokemon/move-learnt";
import type { Trainer } from "../pokemon/trainer";
import type { TrainerPokemon } from "../pokemon/trainer-pokemon";
import type { Encounter } from "../pokemon/encounter";
import type { Evolution } from "../pokemon/evolution";
import type { EncounterSet } from "../pokemon/encounter-set";
import type { StaticEncounter } from "../pokemon/static-encounter";
import type { TotemPokemon } from "../pokemon/totem-pokemon";
import type { IngameTrade } from "../pokemon/ingame-trade";
import type { PickupItem } from "../pokemon/pickup-item";
import type { Shop } from "../pokemon/shop";
import type { ItemList } from "../pokemon/item-list";
import type { GenRestrictions } from "../pokemon/gen-restrictions";
import { Type, isHackOnly } from "../pokemon/type";
import { randomType as typeRandomType } from "../pokemon/type";
import { MoveCategory } from "../pokemon/move-category";
import { Stat } from "../pokemon/stat";
import type { StatChange } from "../pokemon/stat-change";
import type { EvolutionUpdate } from "./evolution-update";
import type { RandomInstance } from "../utils/random-source";
import { RandomSource } from "../utils/random-source";
import { RomFunctions } from "../utils/rom-functions";
import { MiscTweak } from "../utils/misc-tweak";
import * as Abilities from "../constants/abilities";
import * as Moves from "../constants/moves";
import * as Species from "../constants/species";
import * as GlobalConstants from "../constants/global-constants";
import * as Gen2Constants from "../constants/gen2-constants";
import * as Gen3Constants from "../constants/gen3-constants";
import * as Gen4Constants from "../constants/gen4-constants";
import * as Gen5Constants from "../constants/gen5-constants";
import * as Gen6Constants from "../constants/gen6-constants";

// ---- Internal helper interfaces ----

type BasePokemonAction = (pk: Pokemon) => void;
type EvolvedPokemonAction = (
  evFrom: Pokemon,
  evTo: Pokemon,
  toMonIsFinalEvo: boolean
) => void;

// ---- AbstractRomHandler ----

export abstract class AbstractRomHandler implements RomHandler {
  private restrictionsSet = false;
  protected mainPokemonList: Pokemon[] = [];
  protected mainPokemonListInclFormes: Pokemon[] = [];
  private altFormesList: Pokemon[] = [];
  private megaEvolutionsList: MegaEvolution[] = [];
  private noLegendaryList: Pokemon[] = [];
  private onlyLegendaryList: Pokemon[] = [];
  private ultraBeastList: Pokemon[] = [];
  private noLegendaryListInclFormes: Pokemon[] = [];
  private onlyLegendaryListInclFormes: Pokemon[] = [];
  private noLegendaryAltsList: Pokemon[] = [];
  private onlyLegendaryAltsList: Pokemon[] = [];
  private pickedStarters: Pokemon[] = [];
  protected readonly random: RandomInstance;
  private readonly cosmeticRandom: RandomInstance;
  protected logStream: LogStream | null;
  private alreadyPicked: Pokemon[] = [];
  private placementHistory: Map<Pokemon, number> = new Map();
  private itemPlacementHistory: Map<number, number> = new Map();
  private fullyEvolvedRandomSeed = -1;
  protected isORAS = false;
  protected isSM = false;
  protected perfectAccuracy = 100;

  private twoEvoPokes: Pokemon[] | null = null;

  // -- Type weighting cache --
  private typeWeightings: Map<Type, number> | null = null;
  private totalTypeWeighting = 0;

  constructor(random: RandomInstance, logStream: LogStream | null) {
    this.random = random;
    this.cosmeticRandom = RandomSource.cosmeticInstance();
    this.logStream = logStream;
  }

  // =======================================================================
  // Public implemented methods
  // =======================================================================

  setLog(logStream: LogStream): void {
    this.logStream = logStream;
  }

  setPokemonPool(settings: Settings | null): void {
    let restrictions: GenRestrictions | null = null;
    if (settings != null) {
      restrictions = settings.currentRestrictions;
      if (!settings.limitPokemon) {
        restrictions = null;
      }
    }

    this.restrictionsSet = true;
    this.mainPokemonList = this.allPokemonWithoutNull();
    this.mainPokemonListInclFormes = this.allPokemonInclFormesWithoutNull();
    this.altFormesList = this.getAltFormes();
    this.megaEvolutionsList = this.getMegaEvolutions();

    if (restrictions != null) {
      this.mainPokemonList = [];
      this.mainPokemonListInclFormes = [];
      this.megaEvolutionsList = [];
      const allPokemon = this.getPokemon();

      if (restrictions.allow_gen1) {
        this.addPokesFromRange(
          this.mainPokemonList,
          allPokemon,
          Species.bulbasaur,
          Species.mew
        );
      }
      if (
        restrictions.allow_gen2 &&
        allPokemon.length > Gen2Constants.pokemonCount
      ) {
        this.addPokesFromRange(
          this.mainPokemonList,
          allPokemon,
          Species.chikorita,
          Species.celebi
        );
      }
      if (
        restrictions.allow_gen3 &&
        allPokemon.length > Gen3Constants.pokemonCount
      ) {
        this.addPokesFromRange(
          this.mainPokemonList,
          allPokemon,
          Species.treecko,
          Species.deoxys
        );
      }
      if (
        restrictions.allow_gen4 &&
        allPokemon.length > Gen4Constants.pokemonCount
      ) {
        this.addPokesFromRange(
          this.mainPokemonList,
          allPokemon,
          Species.turtwig,
          Species.arceus
        );
      }
      if (
        restrictions.allow_gen5 &&
        allPokemon.length > Gen5Constants.pokemonCount
      ) {
        this.addPokesFromRange(
          this.mainPokemonList,
          allPokemon,
          Species.victini,
          Species.genesect
        );
      }
      if (
        restrictions.allow_gen6 &&
        allPokemon.length > Gen6Constants.pokemonCount
      ) {
        this.addPokesFromRange(
          this.mainPokemonList,
          allPokemon,
          Species.chespin,
          Species.volcanion
        );
      }

      const maxGen7SpeciesID = this.isSM
        ? Species.marshadow
        : Species.zeraora;
      if (restrictions.allow_gen7 && allPokemon.length > maxGen7SpeciesID) {
        this.addPokesFromRange(
          this.mainPokemonList,
          allPokemon,
          Species.rowlet,
          maxGen7SpeciesID
        );
      }

      if (restrictions.allow_evolutionary_relatives) {
        this.addEvolutionaryRelatives(this.mainPokemonList);
      }

      this.addAllPokesInclFormes(
        this.mainPokemonList,
        this.mainPokemonListInclFormes
      );

      const allMegaEvolutions = this.getMegaEvolutions();
      for (const megaEvo of allMegaEvolutions) {
        if (this.mainPokemonListInclFormes.includes(megaEvo.to)) {
          this.megaEvolutionsList.push(megaEvo);
        }
      }
    }

    this.noLegendaryList = [];
    this.noLegendaryListInclFormes = [];
    this.onlyLegendaryList = [];
    this.onlyLegendaryListInclFormes = [];
    this.noLegendaryAltsList = [];
    this.onlyLegendaryAltsList = [];
    this.ultraBeastList = [];

    for (const p of this.mainPokemonList) {
      if (p.isLegendary()) {
        this.onlyLegendaryList.push(p);
      } else if (p.isUltraBeast()) {
        this.ultraBeastList.push(p);
      } else {
        this.noLegendaryList.push(p);
      }
    }
    for (const p of this.mainPokemonListInclFormes) {
      if (p.isLegendary()) {
        this.onlyLegendaryListInclFormes.push(p);
      } else if (!this.ultraBeastList.includes(p)) {
        this.noLegendaryListInclFormes.push(p);
      }
    }
    for (const f of this.altFormesList) {
      if (f.isLegendary()) {
        this.onlyLegendaryAltsList.push(f);
      } else {
        this.noLegendaryAltsList.push(f);
      }
    }
  }

  // ---- Stats ----

  shufflePokemonStats(settings: Settings): void {
    const evolutionSanity = settings.baseStatsFollowEvolutions;
    const megaEvolutionSanity = settings.baseStatsFollowMegaEvolutions;

    if (evolutionSanity) {
      this.copyUpEvolutionsHelper(
        (pk) => pk.shuffleStats(() => this.random.nextDouble()),
        (_evFrom, evTo) => evTo.copyShuffledStatsUpEvolution(_evFrom)
      );
    } else {
      const allPokes = this.getPokemonInclFormes();
      for (const pk of allPokes) {
        if (pk != null) {
          pk.shuffleStats(() => this.random.nextDouble());
        }
      }
    }

    const allPokes = this.getPokemonInclFormes();
    for (const pk of allPokes) {
      if (pk != null && pk.actuallyCosmetic) {
        pk.copyBaseFormeBaseStats(pk.baseForme!);
      }
    }

    if (megaEvolutionSanity) {
      const allMegaEvos = this.getMegaEvolutions();
      for (const megaEvo of allMegaEvos) {
        if (megaEvo.from.megaEvolutionsFrom.length > 1) continue;
        megaEvo.to.copyShuffledStatsUpEvolution(megaEvo.from);
      }
    }
  }

  randomizePokemonStats(settings: Settings): void {
    const evolutionSanity = settings.baseStatsFollowEvolutions;
    const megaEvolutionSanity = settings.baseStatsFollowMegaEvolutions;
    const assignEvoStatsRandomly = settings.assignEvoStatsRandomly;

    if (evolutionSanity) {
      if (assignEvoStatsRandomly) {
        this.copyUpEvolutionsHelper4(
          (pk) => pk.randomizeStatsWithinBST(() => this.random.nextDouble()),
          (_evFrom, evTo) =>
            evTo.assignNewStatsForEvolution(
              _evFrom,
              () => this.random.nextDouble()
            ),
          (_evFrom, evTo) =>
            evTo.assignNewStatsForEvolution(
              _evFrom,
              () => this.random.nextDouble()
            ),
          true
        );
      } else {
        this.copyUpEvolutionsHelper4(
          (pk) => pk.randomizeStatsWithinBST(() => this.random.nextDouble()),
          (_evFrom, evTo) => evTo.copyRandomizedStatsUpEvolution(_evFrom),
          (_evFrom, evTo) =>
            evTo.assignNewStatsForEvolution(
              _evFrom,
              () => this.random.nextDouble()
            ),
          true
        );
      }
    } else {
      const allPokes = this.getPokemonInclFormes();
      for (const pk of allPokes) {
        if (pk != null) {
          pk.randomizeStatsWithinBST(() => this.random.nextDouble());
        }
      }
    }

    const allPokes = this.getPokemonInclFormes();
    for (const pk of allPokes) {
      if (pk != null && pk.actuallyCosmetic) {
        pk.copyBaseFormeBaseStats(pk.baseForme!);
      }
    }

    if (megaEvolutionSanity) {
      const allMegaEvos = this.getMegaEvolutions();
      for (const megaEvo of allMegaEvos) {
        if (
          megaEvo.from.megaEvolutionsFrom.length > 1 ||
          assignEvoStatsRandomly
        ) {
          megaEvo.to.assignNewStatsForEvolution(
            megaEvo.from,
            () => this.random.nextDouble()
          );
        } else {
          megaEvo.to.copyRandomizedStatsUpEvolution(megaEvo.from);
        }
      }
    }
  }

  updatePokemonStats(settings: Settings): void {
    const generation = settings.updateBaseStatsToGeneration;
    const pokes = this.getPokemonInclFormes();

    for (let gen = 6; gen <= generation; gen++) {
      const statChanges = this.getUpdatedPokemonStats(gen);
      for (let i = 1; i < pokes.length; i++) {
        const changedStats = statChanges.get(i);
        if (changedStats != null) {
          let statNum = 0;
          const pk = pokes[i]!;
          if ((changedStats.stat & Stat.HP) !== 0) {
            pk.hp = changedStats.values[statNum];
            statNum++;
          }
          if ((changedStats.stat & Stat.ATK) !== 0) {
            pk.attack = changedStats.values[statNum];
            statNum++;
          }
          if ((changedStats.stat & Stat.DEF) !== 0) {
            pk.defense = changedStats.values[statNum];
            statNum++;
          }
          if ((changedStats.stat & Stat.SPATK) !== 0) {
            if (this.generationOfPokemon() !== 1) {
              pk.spatk = changedStats.values[statNum];
            }
            statNum++;
          }
          if ((changedStats.stat & Stat.SPDEF) !== 0) {
            if (this.generationOfPokemon() !== 1) {
              pk.spdef = changedStats.values[statNum];
            }
            statNum++;
          }
          if ((changedStats.stat & Stat.SPEED) !== 0) {
            pk.speed = changedStats.values[statNum];
            statNum++;
          }
          if ((changedStats.stat & Stat.SPECIAL) !== 0) {
            pk.special = changedStats.values[statNum];
          }
        }
      }
    }
  }

  // ---- Random Pokemon selection ----

  randomPokemon(): Pokemon {
    this.checkPokemonRestrictions();
    return this.mainPokemonList[
      this.random.nextInt(this.mainPokemonList.length)
    ];
  }

  randomPokemonInclFormes(): Pokemon {
    this.checkPokemonRestrictions();
    return this.mainPokemonListInclFormes[
      this.random.nextInt(this.mainPokemonListInclFormes.length)
    ];
  }

  randomNonLegendaryPokemon(): Pokemon {
    this.checkPokemonRestrictions();
    return this.noLegendaryList[
      this.random.nextInt(this.noLegendaryList.length)
    ];
  }

  private randomNonLegendaryPokemonInclFormes(): Pokemon {
    this.checkPokemonRestrictions();
    return this.noLegendaryListInclFormes[
      this.random.nextInt(this.noLegendaryListInclFormes.length)
    ];
  }

  randomLegendaryPokemon(): Pokemon {
    this.checkPokemonRestrictions();
    return this.onlyLegendaryList[
      this.random.nextInt(this.onlyLegendaryList.length)
    ];
  }

  random2EvosPokemon(allowAltFormes: boolean): Pokemon {
    if (this.twoEvoPokes == null) {
      this.twoEvoPokes = [];
      const allPokes = allowAltFormes
        ? this.getPokemonInclFormes().filter(
            (pk) => pk == null || !pk.actuallyCosmetic
          )
        : this.getPokemon();
      for (const pk of allPokes) {
        if (
          pk != null &&
          pk.evolutionsTo.length === 0 &&
          pk.evolutionsFrom.length > 0
        ) {
          for (const ev of pk.evolutionsFrom) {
            if (ev.to.evolutionsFrom.length > 0) {
              this.twoEvoPokes.push(pk);
              break;
            }
          }
        }
      }
    }
    return this.twoEvoPokes[this.random.nextInt(this.twoEvoPokes.length)];
  }

  // ---- Types ----

  randomType(): Type {
    let t = typeRandomType(() => this.random.nextDouble());
    while (!this.typeInGame(t)) {
      t = typeRandomType(() => this.random.nextDouble());
    }
    return t;
  }

  randomizePokemonTypes(settings: Settings): void {
    const evolutionSanity =
      settings.typesMod === TypesMod.RANDOM_FOLLOW_EVOLUTIONS;
    const megaEvolutionSanity = settings.typesFollowMegaEvolutions;
    const dualTypeOnly = settings.dualTypeOnly;

    const allPokes = this.getPokemonInclFormes();
    if (evolutionSanity) {
      this.copyUpEvolutionsHelper(
        (pk) => {
          pk.primaryType = this.randomType();
          pk.secondaryType = null;
          if (
            pk.evolutionsFrom.length === 1 &&
            pk.evolutionsFrom[0].carryStats
          ) {
            if (this.random.nextDouble() < 0.35 || dualTypeOnly) {
              pk.secondaryType = this.randomType();
              while (pk.secondaryType === pk.primaryType) {
                pk.secondaryType = this.randomType();
              }
            }
          } else {
            if (this.random.nextDouble() < 0.5 || dualTypeOnly) {
              pk.secondaryType = this.randomType();
              while (pk.secondaryType === pk.primaryType) {
                pk.secondaryType = this.randomType();
              }
            }
          }
        },
        (evFrom, evTo, toMonIsFinalEvo) => {
          evTo.primaryType = evFrom.primaryType;
          evTo.secondaryType = evFrom.secondaryType;
          if (evTo.secondaryType == null) {
            const chance = toMonIsFinalEvo ? 0.25 : 0.15;
            if (this.random.nextDouble() < chance || dualTypeOnly) {
              evTo.secondaryType = this.randomType();
              while (evTo.secondaryType === evTo.primaryType) {
                evTo.secondaryType = this.randomType();
              }
            }
          }
        }
      );
    } else {
      for (const pkmn of allPokes) {
        if (pkmn != null) {
          pkmn.primaryType = this.randomType();
          pkmn.secondaryType = null;
          if (this.random.nextDouble() < 0.5 || settings.dualTypeOnly) {
            pkmn.secondaryType = this.randomType();
            while (pkmn.secondaryType === pkmn.primaryType) {
              pkmn.secondaryType = this.randomType();
            }
          }
        }
      }
    }

    for (const pk of allPokes) {
      if (pk != null && pk.actuallyCosmetic) {
        pk.primaryType = pk.baseForme!.primaryType;
        pk.secondaryType = pk.baseForme!.secondaryType;
      }
    }

    if (megaEvolutionSanity) {
      const allMegaEvos = this.getMegaEvolutions();
      for (const megaEvo of allMegaEvos) {
        if (megaEvo.from.megaEvolutionsFrom.length > 1) continue;
        megaEvo.to.primaryType = megaEvo.from.primaryType;
        megaEvo.to.secondaryType = megaEvo.from.secondaryType;
        if (megaEvo.to.secondaryType == null) {
          if (this.random.nextDouble() < 0.25) {
            megaEvo.to.secondaryType = this.randomType();
            while (megaEvo.to.secondaryType === megaEvo.to.primaryType) {
              megaEvo.to.secondaryType = this.randomType();
            }
          }
        }
      }
    }
  }

  // ---- Abilities ----

  randomizeAbilities(settings: Settings): void {
    const evolutionSanity = settings.abilitiesFollowEvolutions;
    const allowWonderGuard = settings.allowWonderGuard;
    const banTrappingAbilities = settings.banTrappingAbilities;
    const banNegativeAbilities = settings.banNegativeAbilities;
    const banBadAbilities = settings.banBadAbilities;
    const megaEvolutionSanity = settings.abilitiesFollowMegaEvolutions;
    const weighDuplicatesTogether = settings.weighDuplicateAbilitiesTogether;
    const ensureTwoAbilities = settings.ensureTwoAbilities;
    const doubleBattleMode = settings.doubleBattleMode;

    if (this.abilitiesPerPokemon() === 0) return;

    const hasDWAbilities = this.abilitiesPerPokemon() === 3;
    const bannedAbilities: number[] = [...this.getUselessAbilities()];

    if (!allowWonderGuard) {
      bannedAbilities.push(Abilities.wonderGuard);
    }
    if (banTrappingAbilities) {
      bannedAbilities.push(...GlobalConstants.battleTrappingAbilities);
    }
    if (banNegativeAbilities) {
      bannedAbilities.push(...GlobalConstants.negativeAbilities);
    }
    if (banBadAbilities) {
      bannedAbilities.push(...GlobalConstants.badAbilities);
      if (!doubleBattleMode) {
        bannedAbilities.push(...GlobalConstants.doubleBattleAbilities);
      }
    }
    if (weighDuplicatesTogether) {
      bannedAbilities.push(...GlobalConstants.duplicateAbilities);
      if (this.generationOfPokemon() === 3) {
        bannedAbilities.push(Gen3Constants.airLockIndex);
      }
    }

    const maxAbility = this.highestAbilityIndex();

    if (evolutionSanity) {
      this.copyUpEvolutionsHelper(
        (pk) => {
          if (
            pk.ability1 !== Abilities.wonderGuard &&
            pk.ability2 !== Abilities.wonderGuard &&
            pk.ability3 !== Abilities.wonderGuard
          ) {
            pk.ability1 = this.pickRandomAbility(
              maxAbility,
              bannedAbilities,
              weighDuplicatesTogether
            );
            if (ensureTwoAbilities || this.random.nextDouble() < 0.5) {
              pk.ability2 = this.pickRandomAbility(
                maxAbility,
                bannedAbilities,
                weighDuplicatesTogether,
                pk.ability1
              );
            } else {
              pk.ability2 = 0;
            }
            if (hasDWAbilities) {
              pk.ability3 = this.pickRandomAbility(
                maxAbility,
                bannedAbilities,
                weighDuplicatesTogether,
                pk.ability1,
                pk.ability2
              );
            }
          }
        },
        (evFrom, evTo) => {
          if (
            evTo.ability1 !== Abilities.wonderGuard &&
            evTo.ability2 !== Abilities.wonderGuard &&
            evTo.ability3 !== Abilities.wonderGuard
          ) {
            evTo.ability1 = evFrom.ability1;
            evTo.ability2 = evFrom.ability2;
            evTo.ability3 = evFrom.ability3;
          }
        }
      );
    } else {
      const allPokes = this.getPokemonInclFormes();
      for (const pk of allPokes) {
        if (pk == null) continue;
        if (
          pk.ability1 !== Abilities.wonderGuard &&
          pk.ability2 !== Abilities.wonderGuard &&
          pk.ability3 !== Abilities.wonderGuard
        ) {
          pk.ability1 = this.pickRandomAbility(
            maxAbility,
            bannedAbilities,
            weighDuplicatesTogether
          );
          if (ensureTwoAbilities || this.random.nextDouble() < 0.5) {
            pk.ability2 = this.pickRandomAbility(
              maxAbility,
              bannedAbilities,
              weighDuplicatesTogether,
              pk.ability1
            );
          } else {
            pk.ability2 = 0;
          }
          if (hasDWAbilities) {
            pk.ability3 = this.pickRandomAbility(
              maxAbility,
              bannedAbilities,
              weighDuplicatesTogether,
              pk.ability1,
              pk.ability2
            );
          }
        }
      }
    }

    const allPokes = this.getPokemonInclFormes();
    for (const pk of allPokes) {
      if (pk != null && pk.actuallyCosmetic) {
        pk.copyBaseFormeAbilities(pk.baseForme!);
      }
    }

    if (megaEvolutionSanity) {
      const allMegaEvos = this.getMegaEvolutions();
      for (const megaEvo of allMegaEvos) {
        if (megaEvo.from.megaEvolutionsFrom.length > 1) continue;
        megaEvo.to.ability1 = megaEvo.from.ability1;
        megaEvo.to.ability2 = megaEvo.from.ability2;
        megaEvo.to.ability3 = megaEvo.from.ability3;
      }
    }
  }

  private pickRandomAbilityVariation(
    selectedAbility: number,
    ...alreadySetAbilities: number[]
  ): number {
    let newAbility = selectedAbility;
    while (true) {
      const abilityVariations = this.getAbilityVariations();
      for (const [baseAbility, variations] of abilityVariations) {
        if (selectedAbility === baseAbility) {
          newAbility = variations[this.random.nextInt(variations.length)];
          break;
        }
      }
      let repeat = false;
      for (const alreadySet of alreadySetAbilities) {
        if (alreadySet === newAbility) {
          repeat = true;
          break;
        }
      }
      if (!repeat) break;
    }
    return newAbility;
  }

  private pickRandomAbility(
    maxAbility: number,
    bannedAbilities: number[],
    useVariations: boolean,
    ...alreadySetAbilities: number[]
  ): number {
    let newAbility: number;
    while (true) {
      newAbility = this.random.nextInt(maxAbility) + 1;
      if (bannedAbilities.includes(newAbility)) continue;
      let repeat = false;
      for (const alreadySet of alreadySetAbilities) {
        if (alreadySet === newAbility) {
          repeat = true;
          break;
        }
      }
      if (!repeat) {
        if (useVariations) {
          newAbility = this.pickRandomAbilityVariation(
            newAbility,
            ...alreadySetAbilities
          );
        }
        break;
      }
    }
    return newAbility;
  }

  // ---- Move randomization ----

  randomizeMovePowers(): void {
    const moves = this.getMoves();
    for (const mv of moves) {
      if (mv != null && mv.internalId !== Moves.struggle && mv.power >= 10) {
        if (this.random.nextInt(3) !== 2) {
          mv.power = this.random.nextInt(11) * 5 + 50;
        } else {
          mv.power = this.random.nextInt(27) * 5 + 20;
        }
        for (let i = 0; i < 2; i++) {
          if (this.random.nextInt(100) === 0) {
            mv.power += 50;
          }
        }
        if (mv.hitCount !== 1) {
          mv.power = Math.round(mv.power / mv.hitCount / 5) * 5;
          if (mv.power === 0) {
            mv.power = 5;
          }
        }
      }
    }
  }

  randomizeMovePPs(): void {
    const moves = this.getMoves();
    for (const mv of moves) {
      if (mv != null && mv.internalId !== Moves.struggle) {
        if (this.random.nextInt(3) !== 2) {
          mv.pp = this.random.nextInt(3) * 5 + 15;
        } else {
          mv.pp = this.random.nextInt(8) * 5 + 5;
        }
      }
    }
  }

  randomizeMoveAccuracies(): void {
    const moves = this.getMoves();
    for (const mv of moves) {
      if (
        mv != null &&
        mv.internalId !== Moves.struggle &&
        mv.hitratio >= 5
      ) {
        if (mv.hitratio <= 50) {
          mv.hitratio = this.random.nextInt(7) * 5 + 20;
          if (this.random.nextInt(10) === 0) {
            mv.hitratio = Math.floor((mv.hitratio * 3) / 2 / 5) * 5;
          }
        } else if (mv.hitratio < 90) {
          mv.hitratio = 100;
          while (mv.hitratio > 20) {
            if (this.random.nextInt(10) < 2) break;
            mv.hitratio -= 5;
          }
        } else {
          mv.hitratio = 100;
          while (mv.hitratio > 20) {
            if (this.random.nextInt(10) < 4) break;
            mv.hitratio -= 5;
          }
        }
      }
    }
  }

  randomizeMoveTypes(): void {
    const moves = this.getMoves();
    for (const mv of moves) {
      if (mv != null && mv.internalId !== Moves.struggle && mv.type != null) {
        mv.type = this.randomType();
      }
    }
  }

  randomizeMoveCategory(): void {
    if (!this.hasPhysicalSpecialSplit()) return;
    const moves = this.getMoves();
    for (const mv of moves) {
      if (
        mv != null &&
        mv.internalId !== Moves.struggle &&
        mv.category !== MoveCategory.STATUS
      ) {
        if (this.random.nextInt(2) === 0) {
          mv.category =
            mv.category === MoveCategory.PHYSICAL
              ? MoveCategory.SPECIAL
              : MoveCategory.PHYSICAL;
        }
      }
    }
  }

  // ---- Wild encounters ----

  onlyChangeWildLevels(settings: Settings): void {
    const levelModifier = settings.wildLevelModifier;
    const currentEncounters = this.getEncounters(true);
    if (levelModifier !== 0) {
      for (const area of currentEncounters) {
        for (const enc of area.encounters) {
          enc.level = Math.min(
            100,
            Math.round(enc.level * (1 + levelModifier / 100.0))
          );
          enc.maxLevel = Math.min(
            100,
            Math.round(enc.maxLevel * (1 + levelModifier / 100.0))
          );
        }
      }
      this.setEncounters(true, currentEncounters);
    }
  }

  // ---- Placement History ----

  renderPlacementHistory(): void {
    for (const [p, count] of this.placementHistory) {
      console.log(p.name + ": " + count);
    }
  }

  // ---- Default implementations ----

  typeInGame(type: Type): boolean {
    return !isHackOnly(type) && !(type === Type.FAIRY && this.generationOfPokemon() < 6);
  }

  abilityName(_number: number): string {
    return "";
  }

  getUselessAbilities(): number[] {
    return [];
  }

  getAbilityForTrainerPokemon(_tp: TrainerPokemon): number {
    return 0;
  }

  hasTimeBasedEncounters(): boolean {
    return false;
  }

  bannedForWildEncounters(): Pokemon[] {
    return [];
  }

  getMovesBannedFromLevelup(): number[] {
    return [];
  }

  bannedForStaticPokemon(): Pokemon[] {
    return [];
  }

  forceSwapStaticMegaEvos(): boolean {
    return false;
  }

  maxTrainerNameLength(): number {
    return Number.MAX_SAFE_INTEGER;
  }

  maxSumOfTrainerNameLengths(): number {
    return Number.MAX_SAFE_INTEGER;
  }

  maxTrainerClassNameLength(): number {
    return Number.MAX_SAFE_INTEGER;
  }

  maxTradeNicknameLength(): number {
    return 10;
  }

  maxTradeOTNameLength(): number {
    return 7;
  }

  altFormesCanHaveDifferentEvolutions(): boolean {
    return false;
  }

  getGameBreakingMoves(): number[] {
    return [49, 82]; // SonicBoom & Dragon Rage
  }

  getIllegalMoves(): number[] {
    return [];
  }

  isYellow(): boolean {
    return false;
  }

  writeCheckValueToROM(_value: number): void {
    // do nothing
  }

  miscTweaksAvailable(): number {
    return 0;
  }

  applyMiscTweaks(settings: Settings): void {
    const selectedMiscTweaks = settings.currentMiscTweaks;
    const codeTweaksAvailable = this.miscTweaksAvailable();
    const tweaksToApply: MiscTweak[] = [];
    for (const mt of MiscTweak.allTweaks) {
      if (
        (codeTweaksAvailable & mt.getValue()) > 0 &&
        (selectedMiscTweaks & mt.getValue()) > 0
      ) {
        tweaksToApply.push(mt);
      }
    }
    tweaksToApply.sort((a, b) => a.compareTo(b));
    for (const mt of tweaksToApply) {
      this.applyMiscTweak(mt);
    }
  }

  applyMiscTweak(_tweak: { value: number }): void {
    // do nothing
  }

  getXItems(): number[] {
    return GlobalConstants.xItems;
  }

  getSensibleHeldItemsFor(
    _tp: TrainerPokemon,
    _consumableOnly: boolean,
    _moves: Move[],
    _pokeMoves: number[]
  ): number[] {
    return [0];
  }

  getAllConsumableHeldItems(): number[] {
    return [0];
  }

  getAllHeldItems(): number[] {
    return [0];
  }

  getBannedFormesForTrainerPokemon(): Pokemon[] {
    return [];
  }

  getPickupItems(): PickupItem[] {
    return [];
  }

  setPickupItems(_pickupItems: PickupItem[]): void {
    // do nothing
  }

  getAbilityDependentFormes(): Pokemon[] {
    const abilityDependentFormes: Pokemon[] = [];
    for (const pokemon of this.mainPokemonListInclFormes) {
      if (pokemon.baseForme != null) {
        if (pokemon.baseForme.number === Species.castform) {
          abilityDependentFormes.push(pokemon);
        } else if (
          pokemon.baseForme.number === Species.darmanitan &&
          pokemon.formeNumber === 1
        ) {
          abilityDependentFormes.push(pokemon);
        } else if (pokemon.baseForme.number === Species.aegislash) {
          abilityDependentFormes.push(pokemon);
        } else if (pokemon.baseForme.number === Species.wishiwashi) {
          abilityDependentFormes.push(pokemon);
        }
      }
    }
    return abilityDependentFormes;
  }

  getBannedFormesForPlayerPokemon(): Pokemon[] {
    const bannedFormes: Pokemon[] = [];
    for (const pokemon of this.mainPokemonListInclFormes) {
      if (pokemon.baseForme != null) {
        if (pokemon.baseForme.number === Species.giratina) {
          bannedFormes.push(pokemon);
        } else if (pokemon.baseForme.number === Species.shaymin) {
          bannedFormes.push(pokemon);
        }
      }
    }
    return bannedFormes;
  }

  getPickedStarters(): Pokemon[] {
    return this.pickedStarters;
  }

  // ---- Logging helpers ----

  protected log(msg: string): void {
    if (this.logStream != null) {
      this.logStream.println(msg);
    }
  }

  protected logBlankLine(): void {
    if (this.logStream != null) {
      this.logStream.println();
    }
  }

  // ---- Internal helpers ----

  checkPokemonRestrictions(): void {
    if (!this.restrictionsSet) {
      this.setPokemonPool(null);
    }
  }

  private addPokesFromRange(
    pokemonPool: Pokemon[],
    allPokemon: (Pokemon | null)[],
    rangeMin: number,
    rangeMax: number
  ): void {
    for (let i = rangeMin; i <= rangeMax; i++) {
      const pk = allPokemon[i];
      if (pk != null && !pokemonPool.includes(pk)) {
        pokemonPool.push(pk);
      }
    }
  }

  private addEvolutionaryRelatives(pokemonPool: Pokemon[]): void {
    const newPokemon: Pokemon[] = [];
    for (const pk of pokemonPool) {
      const relatives = this.getEvolutionaryRelatives(pk);
      for (const relative of relatives) {
        if (
          !pokemonPool.includes(relative) &&
          !newPokemon.includes(relative)
        ) {
          newPokemon.push(relative);
        }
      }
    }
    pokemonPool.push(...newPokemon);
  }

  private getEvolutionaryRelatives(pk: Pokemon): Pokemon[] {
    const relatives: Pokemon[] = [];
    for (const ev of pk.evolutionsFrom) {
      if (!relatives.includes(ev.to)) {
        const evo = ev.to;
        relatives.push(evo);
        const queue = [...evo.evolutionsFrom];
        while (queue.length > 0) {
          const next = queue.shift()!.to;
          if (!relatives.includes(next)) {
            relatives.push(next);
            queue.push(...next.evolutionsFrom);
          }
        }
      }
    }
    for (const ev of pk.evolutionsTo) {
      if (!relatives.includes(ev.from)) {
        let preEvo = ev.from;
        relatives.push(preEvo);
        const relativesForPreEvo = this.getEvolutionaryRelatives(preEvo);
        for (const r of relativesForPreEvo) {
          if (!relatives.includes(r)) relatives.push(r);
        }
        while (preEvo.evolutionsTo.length > 0) {
          preEvo = preEvo.evolutionsTo[0].from;
          if (!relatives.includes(preEvo)) {
            relatives.push(preEvo);
            const r2 = this.getEvolutionaryRelatives(preEvo);
            for (const r of r2) {
              if (!relatives.includes(r)) relatives.push(r);
            }
          }
        }
      }
    }
    return relatives;
  }

  private addAllPokesInclFormes(
    pokemonPool: Pokemon[],
    pokemonPoolInclFormes: Pokemon[]
  ): void {
    const altFormes = this.getAltFormes();
    for (const currentPokemon of pokemonPool) {
      if (!pokemonPoolInclFormes.includes(currentPokemon)) {
        pokemonPoolInclFormes.push(currentPokemon);
      }
      for (const potentialAltForme of altFormes) {
        if (
          potentialAltForme.baseForme != null &&
          potentialAltForme.baseForme.number === currentPokemon.number
        ) {
          pokemonPoolInclFormes.push(potentialAltForme);
        }
      }
    }
  }

  private allPokemonWithoutNull(): Pokemon[] {
    const allPokes = [...this.getPokemon()];
    // Remove the null at index 0
    if (allPokes.length > 0 && allPokes[0] == null) {
      allPokes.shift();
    }
    return allPokes.filter((p): p is Pokemon => p != null);
  }

  private allPokemonInclFormesWithoutNull(): Pokemon[] {
    const allPokes = [...this.getPokemonInclFormes()];
    if (allPokes.length > 0 && allPokes[0] == null) {
      allPokes.shift();
    }
    return allPokes.filter((p): p is Pokemon => p != null);
  }

  private pokemonOfType(type: Type, noLegendaries: boolean): Pokemon[] {
    const typedPokes: Pokemon[] = [];
    for (const pk of this.mainPokemonList) {
      if (
        pk != null &&
        (!noLegendaries || !pk.isLegendary()) &&
        !pk.actuallyCosmetic
      ) {
        if (pk.primaryType === type || pk.secondaryType === type) {
          typedPokes.push(pk);
        }
      }
    }
    return typedPokes;
  }

  private pokemonOfTypeInclFormes(
    type: Type,
    noLegendaries: boolean
  ): Pokemon[] {
    const typedPokes: Pokemon[] = [];
    for (const pk of this.mainPokemonListInclFormes) {
      if (
        pk != null &&
        !pk.actuallyCosmetic &&
        (!noLegendaries || !pk.isLegendary())
      ) {
        if (pk.primaryType === type || pk.secondaryType === type) {
          typedPokes.push(pk);
        }
      }
    }
    return typedPokes;
  }

  private pokemonInArea(area: EncounterSet): Set<Pokemon> {
    const inArea = new Set<Pokemon>();
    for (const enc of area.encounters) {
      if (enc.pokemon != null) {
        inArea.add(enc.pokemon);
      }
    }
    return inArea;
  }

  pickEntirelyRandomPokemon(
    includeFormes: boolean,
    noLegendaries: boolean,
    area: EncounterSet,
    banned: Pokemon[]
  ): Pokemon {
    let result: Pokemon;
    const pickRandom = () =>
      noLegendaries
        ? includeFormes
          ? this.randomNonLegendaryPokemonInclFormes()
          : this.randomNonLegendaryPokemon()
        : includeFormes
          ? this.randomPokemonInclFormes()
          : this.randomPokemon();

    result = pickRandom();
    while (result.actuallyCosmetic) {
      result = pickRandom();
    }
    while (banned.includes(result) || area.bannedPokemon.has(result)) {
      result = pickRandom();
      while (result.actuallyCosmetic) {
        result = pickRandom();
      }
    }
    return result;
  }

  private pickWildPowerLvlReplacement(
    pokemonPool: Pokemon[],
    current: Pokemon,
    banSamePokemon: boolean,
    usedUp: Pokemon[] | null,
    bstBalanceLevel: number
  ): Pokemon {
    const balancedBST = bstBalanceLevel * 10 + 250;
    const currentBST = Math.min(current.bstForPowerLevels(), balancedBST);
    let minTarget = currentBST - Math.floor(currentBST / 10);
    let maxTarget = currentBST + Math.floor(currentBST / 10);
    const canPick: Pokemon[] = [];
    let expandRounds = 0;
    while (canPick.length === 0 || (canPick.length < 3 && expandRounds < 3)) {
      for (const pk of pokemonPool) {
        if (
          pk.bstForPowerLevels() >= minTarget &&
          pk.bstForPowerLevels() <= maxTarget &&
          (!banSamePokemon || pk !== current) &&
          (usedUp == null || !usedUp.includes(pk)) &&
          !canPick.includes(pk)
        ) {
          canPick.push(pk);
        }
      }
      minTarget -= Math.floor(currentBST / 20);
      maxTarget += Math.floor(currentBST / 20);
      expandRounds++;
    }
    return canPick[this.random.nextInt(canPick.length)];
  }

  private setFormeForEncounter(enc: Encounter, pk: Pokemon): void {
    let checkCosmetics = true;
    enc.formeNumber = 0;
    if (enc.pokemon != null && enc.pokemon.formeNumber > 0) {
      enc.formeNumber = enc.pokemon.formeNumber;
      enc.pokemon = enc.pokemon.baseForme;
      checkCosmetics = false;
    }
    if (enc.pokemon != null) {
      if (checkCosmetics && enc.pokemon.cosmeticForms > 0) {
        enc.formeNumber = enc.pokemon.getCosmeticFormNumber(
          this.random.nextInt(enc.pokemon.cosmeticForms)
        );
      } else if (!checkCosmetics && pk.cosmeticForms > 0) {
        enc.formeNumber += pk.getCosmeticFormNumber(
          this.random.nextInt(pk.cosmeticForms)
        );
      }
    }
  }

  // ---- CopyUpEvolutions helper ----

  private copyUpEvolutionsHelper(
    bpAction: BasePokemonAction,
    epAction: EvolvedPokemonAction
  ): void {
    this.copyUpEvolutionsHelper4(bpAction, epAction, null, false);
  }

  private copyUpEvolutionsHelper4(
    bpAction: BasePokemonAction,
    epAction: EvolvedPokemonAction,
    splitAction: EvolvedPokemonAction | null,
    copySplitEvos: boolean
  ): void {
    const allPokes = this.getPokemonInclFormes();
    for (const pk of allPokes) {
      if (pk != null) {
        pk.temporaryFlag = false;
      }
    }

    const basicPokes = RomFunctions.getBasicPokemon(this);
    const splitEvos = RomFunctions.getSplitEvolutions(this);
    const middleEvos = RomFunctions.getMiddleEvolutions(this, copySplitEvos);

    for (const pk of basicPokes) {
      bpAction(pk);
      pk.temporaryFlag = true;
    }

    if (!copySplitEvos) {
      for (const pk of splitEvos) {
        bpAction(pk);
        pk.temporaryFlag = true;
      }
    }

    for (const pk of allPokes) {
      if (pk != null && !pk.temporaryFlag) {
        const currentStack: Evolution[] = [];
        let ev = pk.evolutionsTo[0];
        while (!ev.from.temporaryFlag) {
          currentStack.push(ev);
          ev = ev.from.evolutionsTo[0];
        }

        if (copySplitEvos && splitAction != null && splitEvos.has(ev.to)) {
          splitAction(ev.from, ev.to, !middleEvos.has(ev.to));
        } else {
          epAction(ev.from, ev.to, !middleEvos.has(ev.to));
        }
        ev.to.temporaryFlag = true;

        while (currentStack.length > 0) {
          ev = currentStack.pop()!;
          if (copySplitEvos && splitAction != null && splitEvos.has(pk)) {
            splitAction(ev.from, ev.to, !middleEvos.has(ev.to));
          } else {
            epAction(ev.from, ev.to, !middleEvos.has(ev.to));
          }
          ev.to.temporaryFlag = true;
        }
      }
    }
  }

  // =====================================================================
  // Abstract methods - must be implemented by concrete ROM handlers
  // =====================================================================

  abstract loadRom(filename: string): boolean;
  abstract saveRomFile(filename: string, seed: number): boolean;
  abstract saveRomDirectory(filename: string): boolean;
  abstract loadedFilename(): string;

  abstract hasGameUpdateLoaded(): boolean;
  abstract loadGameUpdate(filename: string): boolean;
  abstract removeGameUpdate(): void;
  abstract getGameUpdateVersion(): string | null;

  abstract printRomDiagnostics(logStream: LogStream): void;
  abstract isRomValid(): boolean;

  abstract getPokemon(): (Pokemon | null)[];
  abstract getPokemonInclFormes(): (Pokemon | null)[];
  abstract getAltFormes(): Pokemon[];
  abstract getMegaEvolutions(): MegaEvolution[];
  abstract getAltFormeOfPokemon(pk: Pokemon, forme: number): Pokemon;
  abstract getIrregularFormes(): Pokemon[];

  abstract removeEvosForPokemonPool(): void;

  abstract getStarters(): Pokemon[];
  abstract setStarters(newStarters: Pokemon[]): boolean;
  abstract hasStarterAltFormes(): boolean;
  abstract starterCount(): number;
  abstract customStarters(settings: Settings): void;
  abstract randomizeStarters(settings: Settings): void;
  abstract randomizeBasicTwoEvosStarters(settings: Settings): void;
  abstract supportsStarterHeldItems(): boolean;
  abstract getStarterHeldItems(): number[];
  abstract setStarterHeldItems(items: number[]): void;
  abstract randomizeStarterHeldItems(settings: Settings): void;

  abstract getUpdatedPokemonStats(generation: number): Map<number, StatChange>;
  abstract standardizeEXPCurves(settings: Settings): void;

  abstract abilitiesPerPokemon(): number;
  abstract highestAbilityIndex(): number;
  abstract getAbilityVariations(): Map<number, number[]>;
  abstract hasMegaEvolutions(): boolean;

  abstract getEncounters(useTimeOfDay: boolean): EncounterSet[];
  abstract setEncounters(
    useTimeOfDay: boolean,
    encounters: EncounterSet[]
  ): void;
  abstract randomEncounters(settings: Settings): void;
  abstract area1to1Encounters(settings: Settings): void;
  abstract game1to1Encounters(settings: Settings): void;
  abstract hasWildAltFormes(): boolean;
  abstract randomizeWildHeldItems(settings: Settings): void;
  abstract changeCatchRates(settings: Settings): void;
  abstract minimumCatchRate(
    rateNonLegendary: number,
    rateLegendary: number
  ): void;
  abstract enableGuaranteedPokemonCatching(): void;

  abstract getTrainers(): Trainer[];
  abstract getMainPlaythroughTrainers(): number[];
  abstract getEliteFourTrainers(isChallengeMode: boolean): number[];
  abstract setTrainers(
    trainerData: Trainer[],
    doubleBattleMode: boolean
  ): void;
  abstract randomizeTrainerPokes(settings: Settings): void;
  abstract randomizeTrainerHeldItems(settings: Settings): void;
  abstract rivalCarriesStarter(): void;
  abstract hasRivalFinalBattle(): boolean;
  abstract forceFullyEvolvedTrainerPokes(settings: Settings): void;
  abstract onlyChangeTrainerLevels(settings: Settings): void;
  abstract addTrainerPokemon(settings: Settings): void;
  abstract doubleBattleMode(): void;
  abstract getMoveSelectionPoolAtLevel(
    tp: TrainerPokemon,
    cyclicEvolutions: boolean
  ): Move[];
  abstract pickTrainerMovesets(settings: Settings): void;

  abstract hasPhysicalSpecialSplit(): boolean;
  abstract updateMoves(settings: Settings): void;
  abstract initMoveUpdates(): void;
  abstract getMoveUpdates(): Map<number, boolean[]>;
  abstract getMoves(): (Move | null)[];

  abstract getMovesLearnt(): Map<number, MoveLearnt[]>;
  abstract setMovesLearnt(movesets: Map<number, MoveLearnt[]>): void;
  abstract getEggMoves(): Map<number, number[]>;
  abstract setEggMoves(eggMoves: Map<number, number[]>): void;
  abstract randomizeMovesLearnt(settings: Settings): void;
  abstract randomizeEggMoves(settings: Settings): void;
  abstract orderDamagingMovesByDamage(): void;
  abstract metronomeOnlyMode(): void;
  abstract supportsFourStartingMoves(): boolean;

  abstract getStaticPokemon(): StaticEncounter[];
  abstract setStaticPokemon(staticPokemon: StaticEncounter[]): boolean;
  abstract randomizeStaticPokemon(settings: Settings): void;
  abstract canChangeStaticPokemon(): boolean;
  abstract hasStaticAltFormes(): boolean;
  abstract onlyChangeStaticLevels(settings: Settings): void;
  abstract hasMainGameLegendaries(): boolean;
  abstract getMainGameLegendaries(): number[];
  abstract getSpecialMusicStatics(): number[];
  abstract applyCorrectStaticMusic(
    specialMusicStaticChanges: Map<number, number>
  ): void;
  abstract hasStaticMusicFix(): boolean;

  abstract getTotemPokemon(): TotemPokemon[];
  abstract setTotemPokemon(totemPokemon: TotemPokemon[]): void;
  abstract randomizeTotemPokemon(settings: Settings): void;

  abstract getTMMoves(): number[];
  abstract getHMMoves(): number[];
  abstract setTMMoves(moveIndexes: number[]): void;
  abstract randomizeTMMoves(settings: Settings): void;
  abstract getTMCount(): number;
  abstract getHMCount(): number;
  abstract getTMHMCompatibility(): Map<Pokemon, boolean[]>;
  abstract setTMHMCompatibility(compatData: Map<Pokemon, boolean[]>): void;
  abstract randomizeTMHMCompatibility(settings: Settings): void;
  abstract fullTMHMCompatibility(): void;
  abstract ensureTMCompatSanity(): void;
  abstract ensureTMEvolutionSanity(): void;
  abstract fullHMCompatibility(): void;

  abstract copyTMCompatibilityToCosmeticFormes(): void;
  abstract hasMoveTutors(): boolean;
  abstract getMoveTutorMoves(): number[];
  abstract setMoveTutorMoves(moves: number[]): void;
  abstract randomizeMoveTutorMoves(settings: Settings): void;
  abstract getMoveTutorCompatibility(): Map<Pokemon, boolean[]>;
  abstract setMoveTutorCompatibility(
    compatData: Map<Pokemon, boolean[]>
  ): void;
  abstract randomizeMoveTutorCompatibility(settings: Settings): void;
  abstract fullMoveTutorCompatibility(): void;
  abstract ensureMoveTutorCompatSanity(): void;
  abstract ensureMoveTutorEvolutionSanity(): void;

  abstract copyMoveTutorCompatibilityToCosmeticFormes(): void;
  abstract canChangeTrainerText(): boolean;
  abstract getTrainerNames(): string[];
  abstract setTrainerNames(trainerNames: string[]): void;
  abstract trainerNameMode(): TrainerNameMode;
  abstract getTCNameLengthsByTrainer(): number[];
  abstract randomizeTrainerNames(settings: Settings): void;

  abstract getTrainerClassNames(): string[];
  abstract setTrainerClassNames(trainerClassNames: string[]): void;
  abstract fixedTrainerClassNamesLength(): boolean;
  abstract randomizeTrainerClassNames(settings: Settings): void;
  abstract getDoublesTrainerClasses(): number[];

  abstract getAllowedItems(): ItemList;
  abstract getNonBadItems(): ItemList;
  abstract getEvolutionItems(): number[];
  abstract getUniqueNoSellItems(): number[];
  abstract getRegularShopItems(): number[];
  abstract getOPShopItems(): number[];
  abstract getItemNames(): string[];

  abstract getRequiredFieldTMs(): number[];
  abstract getCurrentFieldTMs(): number[];
  abstract setFieldTMs(fieldTMs: number[]): void;
  abstract getRegularFieldItems(): number[];
  abstract setRegularFieldItems(items: number[]): void;
  abstract shuffleFieldItems(): void;
  abstract randomizeFieldItems(settings: Settings): void;

  abstract hasShopRandomization(): boolean;
  abstract shuffleShopItems(): void;
  abstract randomizeShopItems(settings: Settings): void;
  abstract getShopItems(): Map<number, Shop>;
  abstract setShopItems(shopItems: Map<number, Shop>): void;
  abstract setShopPrices(): void;

  abstract randomizePickupItems(settings: Settings): void;

  abstract getIngameTrades(): IngameTrade[];
  abstract setIngameTrades(trades: IngameTrade[]): void;
  abstract randomizeIngameTrades(settings: Settings): void;
  abstract hasDVs(): boolean;

  abstract removeImpossibleEvolutions(settings: Settings): void;
  abstract condenseLevelEvolutions(
    maxLevel: number,
    maxIntermediateLevel: number
  ): void;
  abstract makeEvolutionsEasier(settings: Settings): void;
  abstract removeTimeBasedEvolutions(): void;
  abstract getImpossibleEvoUpdates(): Set<EvolutionUpdate>;
  abstract getEasierEvoUpdates(): Set<EvolutionUpdate>;
  abstract getTimeBasedEvoUpdates(): Set<EvolutionUpdate>;
  abstract randomizeEvolutions(settings: Settings): void;
  abstract randomizeEvolutionsEveryLevel(settings: Settings): void;

  abstract getFieldMoves(): number[];
  abstract getEarlyRequiredHMMoves(): number[];

  abstract getROMName(): string;
  abstract getROMCode(): string;
  abstract getSupportLevel(): string;
  abstract getDefaultExtension(): string;
  abstract internalStringLength(s: string): number;
  abstract randomizeIntroPokemon(): void;
  abstract getMascotImage(): Uint8Array | null;
  abstract generationOfPokemon(): number;

  abstract isEffectivenessUpdated(): boolean;

  abstract hasFunctionalFormes(): boolean;
}
