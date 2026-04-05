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
  TrainersMod,
  WildPokemonRestrictionMod,
  MovesetsMod,
  StaticPokemonMod,
  TMsHMsCompatibilityMod,
  MoveTutorsCompatibilityMod,
  InGameTradesMod,
} from "../config/settings";
import type { Pokemon } from "../pokemon/pokemon";
import { Move } from "../pokemon/move";
import type { MegaEvolution } from "../pokemon/mega-evolution";
import { MoveLearnt } from "../pokemon/move-learnt";
import { type Trainer, MultiBattleStatus } from "../pokemon/trainer";
import type { TrainerPokemon } from "../pokemon/trainer-pokemon";
import type { Encounter } from "../pokemon/encounter";
import type { Evolution } from "../pokemon/evolution";
import type { EncounterSet } from "../pokemon/encounter-set";
import { StaticEncounter } from "../pokemon/static-encounter";
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
import { RandomizationException } from "../exceptions/randomization-exception";

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

  // -- Trainer Pokemon replacement caches --
  private cachedReplacementLists: Map<Type, Pokemon[]> | null = null;
  private cachedAllList: Pokemon[] = [];
  private bannedList: Pokemon[] = [];
  private usedAsUniqueList: Pokemon[] = [];

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

  // -- Array shuffle using Fisher-Yates with the seeded random --
  private shuffleArray<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.random.nextInt(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  // -- ORAS-specific stubs (only relevant for Gen6+ handlers) --
  protected collapseAreasORAS(encounters: EncounterSet[]): EncounterSet[] {
    return encounters;
  }

  protected enhanceRandomEncountersORAS(_collapsedEncounters: EncounterSet[], _settings: Settings): void {
    // no-op; overridden in Gen6 handler
  }

  // -- Helper: find a Pokemon in a pool by species number --
  private findPokemonInPoolWithSpeciesID(pokemonPool: Pokemon[], speciesID: number): Pokemon | null {
    for (const p of pokemonPool) {
      if (p.number === speciesID) return p;
    }
    return null;
  }

  // -- Helper: check if there's an unused move in the list --
  private checkForUnusedMove(potentialList: Move[], alreadyUsed: number[]): boolean {
    for (const mv of potentialList) {
      if (!alreadyUsed.includes(mv.number)) return true;
    }
    return false;
  }

  // -- Helper: build sets of valid moves for randomization --
  private createSetsOfMoves(
    noBroken: boolean,
    validMoves: Move[],
    validDamagingMoves: Move[],
    validTypeMoves: Map<Type, Move[]>,
    validTypeDamagingMoves: Map<Type, Move[]>
  ): void {
    const allMoves = this.getMoves();
    const hms = this.getHMMoves();
    const allBanned = new Set<number>(noBroken ? this.getGameBreakingMoves() : []);
    for (const h of hms) allBanned.add(h);
    for (const b of this.getMovesBannedFromLevelup()) allBanned.add(b);
    for (const z of GlobalConstants.zMoves) allBanned.add(z);
    for (const il of this.getIllegalMoves()) allBanned.add(il);

    for (const mv of allMoves) {
      if (mv != null && !GlobalConstants.bannedRandomMoves[mv.number] && !allBanned.has(mv.number)) {
        validMoves.push(mv);
        if (mv.type != null) {
          if (!validTypeMoves.has(mv.type)) {
            validTypeMoves.set(mv.type, []);
          }
          validTypeMoves.get(mv.type)!.push(mv);
        }
        if (!GlobalConstants.bannedForDamagingMove[mv.number]) {
          if (mv.isGoodDamaging(this.perfectAccuracy)) {
            validDamagingMoves.push(mv);
            if (mv.type != null) {
              if (!validTypeDamagingMoves.has(mv.type)) {
                validTypeDamagingMoves.set(mv.type, []);
              }
              validTypeDamagingMoves.get(mv.type)!.push(mv);
            }
          }
        }
      }
    }

    // Balance average power per type
    const avgTypePowers = new Map<Type, number>();
    let totalAvgPower = 0;

    for (const [type, typeMoves] of validTypeMoves) {
      let attackingSum = 0;
      for (const typeMove of typeMoves) {
        if (typeMove.power > 0) {
          attackingSum += typeMove.power * typeMove.hitCount;
        }
      }
      const avgTypePower = attackingSum / typeMoves.length;
      avgTypePowers.set(type, avgTypePower);
      totalAvgPower += avgTypePower;
    }

    totalAvgPower /= validTypeMoves.size;
    const minAvg = totalAvgPower * 0.75;
    const maxAvg = totalAvgPower * 1.25;

    for (const [type, avgPowerForType] of avgTypePowers) {
      let avg = avgPowerForType;
      const typeMoves = validTypeMoves.get(type)!;
      let alreadyPicked: Move[] = [];
      let iterLoops = 0;
      while (avg < minAvg && iterLoops < 10000) {
        const finalAvg = avg;
        let strongerMoves = typeMoves.filter(mv => mv.power * mv.hitCount > finalAvg);
        if (strongerMoves.length === 0) break;
        if (alreadyPicked.length >= strongerMoves.length) {
          alreadyPicked = [];
        } else {
          strongerMoves = strongerMoves.filter(m => !alreadyPicked.includes(m));
          if (strongerMoves.length === 0) break;
        }
        const extraMove = strongerMoves[this.random.nextInt(strongerMoves.length)];
        avg = (avg * typeMoves.length + extraMove.power * extraMove.hitCount) / (typeMoves.length + 1);
        typeMoves.push(extraMove);
        alreadyPicked.push(extraMove);
        iterLoops++;
      }
      iterLoops = 0;
      while (avg > maxAvg && iterLoops < 10000) {
        const finalAvg = avg;
        let weakerMoves = typeMoves.filter(mv => mv.power * mv.hitCount < finalAvg);
        if (weakerMoves.length === 0) break;
        if (alreadyPicked.length >= weakerMoves.length) {
          alreadyPicked = [];
        } else {
          weakerMoves = weakerMoves.filter(m => !alreadyPicked.includes(m));
          if (weakerMoves.length === 0) break;
        }
        const extraMove = weakerMoves[this.random.nextInt(weakerMoves.length)];
        avg = (avg * typeMoves.length + extraMove.power * extraMove.hitCount) / (typeMoves.length + 1);
        typeMoves.push(extraMove);
        alreadyPicked.push(extraMove);
        iterLoops++;
      }
    }
  }

  // -- Static encounter helpers (Gen6/7 specific, stubs for Gen1-5) --
  private cloneStaticEncounter(old: StaticEncounter): StaticEncounter {
    const ns = new StaticEncounter();
    ns.pkmn = old.pkmn;
    ns.forme = old.forme;
    ns.level = old.level;
    ns.maxLevel = old.maxLevel;
    ns.heldItem = old.heldItem;
    ns.isEgg = old.isEgg;
    ns.resetMoves = old.resetMoves;
    ns.restrictedPool = old.restrictedPool;
    ns.restrictedList = [...old.restrictedList];
    ns.linkedEncounters = old.linkedEncounters.map(le => {
      const nle = new StaticEncounter();
      nle.pkmn = le.pkmn; nle.forme = le.forme; nle.level = le.level;
      nle.maxLevel = le.maxLevel; nle.heldItem = le.heldItem; nle.isEgg = le.isEgg;
      return nle;
    });
    return ns;
  }

  private getMegaEvoPokemon(pool: Pokemon[], remaining: Pokemon[], _se: StaticEncounter): Pokemon {
    // Simplified: pick from remaining or pool
    if (remaining.length > 0) return remaining.splice(this.random.nextInt(remaining.length), 1)[0];
    return pool[this.random.nextInt(pool.length)];
  }

  private getRestrictedStaticPokemon(pool: Pokemon[], remaining: Pokemon[], old: StaticEncounter): Pokemon {
    let restricted = remaining.filter(pk => old.restrictedList.includes(pk));
    if (restricted.length === 0) restricted = pool.filter(pk => old.restrictedList.includes(pk));
    if (restricted.length === 0) restricted = remaining.length > 0 ? remaining : pool;
    const picked = restricted[this.random.nextInt(restricted.length)];
    const idx = remaining.indexOf(picked);
    if (idx >= 0) remaining.splice(idx, 1);
    return picked;
  }

  private setPokemonAndFormeForStaticEncounter(se: StaticEncounter, pk: Pokemon): void {
    se.pkmn = pk;
    se.forme = 0;
    for (const le of se.linkedEncounters) {
      if (le.pkmn === se.pkmn) {
        le.pkmn = pk;
        le.forme = 0;
      }
    }
  }

  private pickStaticPowerLvlReplacement(pokemonPool: Pokemon[], current: Pokemon, pokemonLeft: boolean, limitBST: boolean): Pokemon {
    const currentBST = current.bstForPowerLevels();
    const minTarget = limitBST ? currentBST - currentBST / 5 : currentBST * 0.8;
    const maxTarget = limitBST ? currentBST + currentBST / 5 : currentBST * 1.2;
    const canPick = pokemonPool.filter(pk => {
      const bst = pk.bstForPowerLevels();
      return bst >= minTarget && bst <= maxTarget;
    });
    if (canPick.length > 0) return canPick[this.random.nextInt(canPick.length)];
    return pokemonPool[this.random.nextInt(pokemonPool.length)];
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
  customStarters(settings: Settings): void {
    const abilitiesUnchanged = settings.abilitiesMod === AbilitiesMod.UNCHANGED;
    const customStarterIds = settings.customStarters;
    const allowAltFormes = settings.allowStarterAltFormes;
    const banIrregularAltFormes = settings.banIrregularAltFormes;

    const romPokemon = this.getPokemonInclFormes().filter(
      (pk) => pk == null || !pk.actuallyCosmetic
    );

    const banned: Pokemon[] = [...this.getBannedFormesForPlayerPokemon()];
    if (abilitiesUnchanged) {
      banned.push(...this.getAbilityDependentFormes());
    }
    if (banIrregularAltFormes) {
      banned.push(...this.getIrregularFormes());
    }
    this.pickedStarters = [];

    for (let i = 0; i < customStarterIds.length; i++) {
      if (customStarterIds[i] - 1 !== 0) {
        banned.push(romPokemon[customStarterIds[i] - 1]!);
      }
    }

    if (customStarterIds[0] - 1 === 0) {
      let pkmn = allowAltFormes ? this.randomPokemonInclFormes() : this.randomPokemon();
      while (this.pickedStarters.includes(pkmn) || banned.includes(pkmn) || pkmn.actuallyCosmetic) {
        pkmn = allowAltFormes ? this.randomPokemonInclFormes() : this.randomPokemon();
      }
      this.pickedStarters.push(pkmn);
    } else {
      this.pickedStarters.push(romPokemon[customStarterIds[0] - 1]!);
    }

    if (customStarterIds[1] - 1 === 0) {
      let pkmn = allowAltFormes ? this.randomPokemonInclFormes() : this.randomPokemon();
      while (this.pickedStarters.includes(pkmn) || banned.includes(pkmn) || pkmn.actuallyCosmetic) {
        pkmn = allowAltFormes ? this.randomPokemonInclFormes() : this.randomPokemon();
      }
      this.pickedStarters.push(pkmn);
    } else {
      this.pickedStarters.push(romPokemon[customStarterIds[1] - 1]!);
    }

    if (this.isYellow()) {
      this.setStarters(this.pickedStarters);
    } else {
      if (customStarterIds[2] - 1 === 0) {
        let pkmn = allowAltFormes ? this.randomPokemonInclFormes() : this.randomPokemon();
        while (this.pickedStarters.includes(pkmn) || banned.includes(pkmn) || pkmn.actuallyCosmetic) {
          pkmn = allowAltFormes ? this.randomPokemonInclFormes() : this.randomPokemon();
        }
        this.pickedStarters.push(pkmn);
      } else {
        this.pickedStarters.push(romPokemon[customStarterIds[2] - 1]!);
      }
      if (this.starterCount() > 3) {
        for (let i = 3; i < this.starterCount(); i++) {
          let pkmn = this.random2EvosPokemon(allowAltFormes);
          while (this.pickedStarters.includes(pkmn)) {
            pkmn = this.random2EvosPokemon(allowAltFormes);
          }
          this.pickedStarters.push(pkmn);
        }
      }
      this.setStarters(this.pickedStarters);
    }
  }

  randomizeStarters(settings: Settings): void {
    const abilitiesUnchanged = settings.abilitiesMod === AbilitiesMod.UNCHANGED;
    const allowAltFormes = settings.allowStarterAltFormes;
    const banIrregularAltFormes = settings.banIrregularAltFormes;

    const count = this.starterCount();
    this.pickedStarters = [];
    const banned: Pokemon[] = [...this.getBannedFormesForPlayerPokemon()];
    if (abilitiesUnchanged) {
      banned.push(...this.getAbilityDependentFormes());
    }
    if (banIrregularAltFormes) {
      banned.push(...this.getIrregularFormes());
    }
    for (let i = 0; i < count; i++) {
      let pkmn = allowAltFormes ? this.randomPokemonInclFormes() : this.randomPokemon();
      while (this.pickedStarters.includes(pkmn) || banned.includes(pkmn) || pkmn.actuallyCosmetic) {
        pkmn = allowAltFormes ? this.randomPokemonInclFormes() : this.randomPokemon();
      }
      this.pickedStarters.push(pkmn);
    }
    this.setStarters(this.pickedStarters);
  }

  randomizeBasicTwoEvosStarters(settings: Settings): void {
    const abilitiesUnchanged = settings.abilitiesMod === AbilitiesMod.UNCHANGED;
    const allowAltFormes = settings.allowStarterAltFormes;
    const banIrregularAltFormes = settings.banIrregularAltFormes;

    const count = this.starterCount();
    this.pickedStarters = [];
    const banned: Pokemon[] = [...this.getBannedFormesForPlayerPokemon()];
    if (abilitiesUnchanged) {
      banned.push(...this.getAbilityDependentFormes());
    }
    if (banIrregularAltFormes) {
      banned.push(...this.getIrregularFormes());
    }
    for (let i = 0; i < count; i++) {
      let pkmn = this.random2EvosPokemon(allowAltFormes);
      while (this.pickedStarters.includes(pkmn) || banned.includes(pkmn)) {
        pkmn = this.random2EvosPokemon(allowAltFormes);
      }
      this.pickedStarters.push(pkmn);
    }
    this.setStarters(this.pickedStarters);
  }
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
  randomEncounters(settings: Settings): void {
    const useTimeOfDay = settings.useTimeBasedEncounters;
    const catchEmAll = settings.wildPokemonRestrictionMod === WildPokemonRestrictionMod.CATCH_EM_ALL;
    const typeThemed = settings.wildPokemonRestrictionMod === WildPokemonRestrictionMod.TYPE_THEME_AREAS;
    const usePowerLevels = settings.wildPokemonRestrictionMod === WildPokemonRestrictionMod.SIMILAR_STRENGTH;
    const noLegendaries = settings.blockWildLegendaries;
    const balanceShakingGrass = settings.balanceShakingGrass;
    const levelModifier = settings.wildLevelsModified ? settings.wildLevelModifier : 0;
    const allowAltFormes = settings.allowWildAltFormes;
    const banIrregularAltFormes = settings.banIrregularAltFormes;
    const abilitiesAreRandomized = settings.abilitiesMod === AbilitiesMod.RANDOMIZE;

    const currentEncounters = this.getEncounters(useTimeOfDay);

    if (this.isORAS) {
      const collapsedEncounters = this.collapseAreasORAS(currentEncounters);
      this.area1to1EncountersImpl(collapsedEncounters, settings);
      this.enhanceRandomEncountersORAS(collapsedEncounters, settings);
      this.setEncounters(useTimeOfDay, currentEncounters);
      return;
    }

    this.checkPokemonRestrictions();

    // Randomize the order encounter sets are randomized in.
    const scrambledEncounters = [...currentEncounters];
    this.shuffleArray(scrambledEncounters);

    const banned = this.bannedForWildEncounters();
    banned.push(...this.getBannedFormesForPlayerPokemon());
    if (!abilitiesAreRandomized) {
      banned.push(...this.getAbilityDependentFormes());
    }
    if (banIrregularAltFormes) {
      banned.push(...this.getIrregularFormes());
    }

    if (catchEmAll) {
      let allPokes: Pokemon[];
      if (allowAltFormes) {
        allPokes = noLegendaries ? [...this.noLegendaryListInclFormes] : [...this.mainPokemonListInclFormes];
        allPokes = allPokes.filter(p => !p.actuallyCosmetic);
      } else {
        allPokes = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
      }
      allPokes = allPokes.filter(p => !banned.includes(p));

      for (const area of scrambledEncounters) {
        let pickablePokemon = allPokes;
        if (area.bannedPokemon.size > 0) {
          pickablePokemon = allPokes.filter(p => !area.bannedPokemon.has(p));
        }
        for (const enc of area.encounters) {
          if (enc.pokemon != null && banned.includes(enc.pokemon)) {
            continue;
          }

          if (pickablePokemon.length === 0) {
            let tempPickable: Pokemon[];
            if (allowAltFormes) {
              tempPickable = noLegendaries ? [...this.noLegendaryListInclFormes] : [...this.mainPokemonListInclFormes];
              tempPickable = tempPickable.filter(p => !p.actuallyCosmetic);
            } else {
              tempPickable = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
            }
            tempPickable = tempPickable.filter(p => !banned.includes(p) && !area.bannedPokemon.has(p));
            if (tempPickable.length === 0) {
              throw new RandomizationException("ERROR: Couldn't replace a wild Pokemon!");
            }
            const picked = this.random.nextInt(tempPickable.length);
            enc.pokemon = tempPickable[picked];
            this.setFormeForEncounter(enc, enc.pokemon!);
          } else {
            const picked = this.random.nextInt(pickablePokemon.length);
            enc.pokemon = pickablePokemon[picked];
            pickablePokemon.splice(picked, 1);
            if (allPokes !== pickablePokemon) {
              const idx = allPokes.indexOf(enc.pokemon);
              if (idx >= 0) allPokes.splice(idx, 1);
            }
            this.setFormeForEncounter(enc, enc.pokemon!);
            if (allPokes.length === 0) {
              if (allowAltFormes) {
                allPokes.push(...(noLegendaries ? this.noLegendaryListInclFormes : this.mainPokemonListInclFormes));
                const len = allPokes.length;
                for (let i = len - 1; i >= 0; i--) {
                  if (allPokes[i].actuallyCosmetic) allPokes.splice(i, 1);
                }
              } else {
                allPokes.push(...(noLegendaries ? this.noLegendaryList : this.mainPokemonList));
              }
              for (let i = allPokes.length - 1; i >= 0; i--) {
                if (banned.includes(allPokes[i])) allPokes.splice(i, 1);
              }
              if (pickablePokemon !== allPokes) {
                pickablePokemon.push(...allPokes);
                const pLen = pickablePokemon.length;
                for (let i = pLen - 1; i >= 0; i--) {
                  if (area.bannedPokemon.has(pickablePokemon[i])) pickablePokemon.splice(i, 1);
                }
              }
            }
          }
        }
      }
    } else if (typeThemed) {
      const cachedPokeLists = new Map<Type, Pokemon[]>();
      for (const area of scrambledEncounters) {
        let possiblePokemon: Pokemon[] | null = null;
        let iterLoops = 0;
        while (possiblePokemon === null && iterLoops < 10000) {
          const areaTheme = this.randomType();
          if (!cachedPokeLists.has(areaTheme)) {
            const pType = allowAltFormes
              ? this.pokemonOfTypeInclFormes(areaTheme, noLegendaries)
              : this.pokemonOfType(areaTheme, noLegendaries);
            cachedPokeLists.set(areaTheme, pType.filter(p => !banned.includes(p)));
          }
          possiblePokemon = cachedPokeLists.get(areaTheme)!;
          if (area.bannedPokemon.size > 0) {
            possiblePokemon = possiblePokemon.filter(p => !area.bannedPokemon.has(p));
          }
          if (possiblePokemon.length === 0) {
            possiblePokemon = null;
          }
          iterLoops++;
        }
        if (possiblePokemon === null) {
          throw new RandomizationException("Could not randomize an area in a reasonable amount of attempts.");
        }
        for (const enc of area.encounters) {
          enc.pokemon = possiblePokemon[this.random.nextInt(possiblePokemon.length)];
          while (enc.pokemon!.actuallyCosmetic) {
            enc.pokemon = possiblePokemon[this.random.nextInt(possiblePokemon.length)];
          }
          this.setFormeForEncounter(enc, enc.pokemon!);
        }
      }
    } else if (usePowerLevels) {
      let allowedPokes: Pokemon[];
      if (allowAltFormes) {
        allowedPokes = noLegendaries ? [...this.noLegendaryListInclFormes] : [...this.mainPokemonListInclFormes];
      } else {
        allowedPokes = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
      }
      allowedPokes = allowedPokes.filter(p => !banned.includes(p));
      for (const area of scrambledEncounters) {
        let localAllowed = allowedPokes;
        if (area.bannedPokemon.size > 0) {
          localAllowed = allowedPokes.filter(p => !area.bannedPokemon.has(p));
        }
        for (const enc of area.encounters) {
          if (balanceShakingGrass && area.displayName != null && area.displayName.includes("Shaking")) {
            enc.pokemon = this.pickWildPowerLvlReplacement(localAllowed, enc.pokemon!, false, null, Math.floor((enc.level + enc.maxLevel) / 2));
            while (enc.pokemon!.actuallyCosmetic) {
              enc.pokemon = this.pickWildPowerLvlReplacement(localAllowed, enc.pokemon!, false, null, Math.floor((enc.level + enc.maxLevel) / 2));
            }
          } else {
            enc.pokemon = this.pickWildPowerLvlReplacement(localAllowed, enc.pokemon!, false, null, 100);
            while (enc.pokemon!.actuallyCosmetic) {
              enc.pokemon = this.pickWildPowerLvlReplacement(localAllowed, enc.pokemon!, false, null, 100);
            }
          }
          this.setFormeForEncounter(enc, enc.pokemon!);
        }
      }
    } else {
      // Entirely random
      for (const area of scrambledEncounters) {
        for (const enc of area.encounters) {
          enc.pokemon = this.pickEntirelyRandomPokemon(allowAltFormes, noLegendaries, area, banned);
          this.setFormeForEncounter(enc, enc.pokemon!);
        }
      }
    }

    if (levelModifier !== 0) {
      for (const area of currentEncounters) {
        for (const enc of area.encounters) {
          enc.level = Math.min(100, Math.round(enc.level * (1 + levelModifier / 100.0)));
          enc.maxLevel = Math.min(100, Math.round(enc.maxLevel * (1 + levelModifier / 100.0)));
        }
      }
    }

    this.setEncounters(useTimeOfDay, currentEncounters);
  }

  area1to1Encounters(settings: Settings): void {
    const useTimeOfDay = settings.useTimeBasedEncounters;

    const currentEncounters = this.getEncounters(useTimeOfDay);
    if (this.isORAS) {
      const collapsedEncounters = this.collapseAreasORAS(currentEncounters);
      this.area1to1EncountersImpl(collapsedEncounters, settings);
      this.setEncounters(useTimeOfDay, currentEncounters);
      return;
    } else {
      this.area1to1EncountersImpl(currentEncounters, settings);
      this.setEncounters(useTimeOfDay, currentEncounters);
    }
  }

  private area1to1EncountersImpl(currentEncounters: EncounterSet[], settings: Settings): void {
    const catchEmAll = settings.wildPokemonRestrictionMod === WildPokemonRestrictionMod.CATCH_EM_ALL;
    const typeThemed = settings.wildPokemonRestrictionMod === WildPokemonRestrictionMod.TYPE_THEME_AREAS;
    const usePowerLevels = settings.wildPokemonRestrictionMod === WildPokemonRestrictionMod.SIMILAR_STRENGTH;
    const noLegendaries = settings.blockWildLegendaries;
    const levelModifier = settings.wildLevelsModified ? settings.wildLevelModifier : 0;
    const allowAltFormes = settings.allowWildAltFormes;
    const banIrregularAltFormes = settings.banIrregularAltFormes;
    const abilitiesAreRandomized = settings.abilitiesMod === AbilitiesMod.RANDOMIZE;

    this.checkPokemonRestrictions();
    const banned = this.bannedForWildEncounters();
    banned.push(...this.getBannedFormesForPlayerPokemon());
    if (!abilitiesAreRandomized) {
      banned.push(...this.getAbilityDependentFormes());
    }
    if (banIrregularAltFormes) {
      banned.push(...this.getIrregularFormes());
    }

    const scrambledEncounters = [...currentEncounters];
    this.shuffleArray(scrambledEncounters);

    if (catchEmAll) {
      let allPokes: Pokemon[];
      if (allowAltFormes) {
        allPokes = noLegendaries ? [...this.noLegendaryListInclFormes] : [...this.mainPokemonListInclFormes];
        allPokes = allPokes.filter(p => !p.actuallyCosmetic);
      } else {
        allPokes = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
      }
      allPokes = allPokes.filter(p => !banned.includes(p));

      for (const area of scrambledEncounters) {
        const inArea = this.pokemonInArea(area);
        const areaMap = new Map<Pokemon, Pokemon>();
        let pickablePokemon = allPokes;
        if (area.bannedPokemon.size > 0) {
          pickablePokemon = allPokes.filter(p => !area.bannedPokemon.has(p));
        }
        for (const areaPk of inArea) {
          if (pickablePokemon.length === 0) {
            let tempPickable: Pokemon[];
            if (allowAltFormes) {
              tempPickable = noLegendaries ? [...this.noLegendaryListInclFormes] : [...this.mainPokemonListInclFormes];
              tempPickable = tempPickable.filter(p => !p.actuallyCosmetic);
            } else {
              tempPickable = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
            }
            tempPickable = tempPickable.filter(p => !banned.includes(p) && !area.bannedPokemon.has(p));
            if (tempPickable.length === 0) {
              throw new RandomizationException("ERROR: Couldn't replace a wild Pokemon!");
            }
            const picked = this.random.nextInt(tempPickable.length);
            areaMap.set(areaPk, tempPickable[picked]);
          } else {
            const picked = this.random.nextInt(allPokes.length);
            const pickedMN = allPokes[picked];
            areaMap.set(areaPk, pickedMN);
            const pickIdx = pickablePokemon.indexOf(pickedMN);
            if (pickIdx >= 0) pickablePokemon.splice(pickIdx, 1);
            if (allPokes !== pickablePokemon) {
              allPokes.splice(picked, 1);
            }
            if (allPokes.length === 0) {
              if (allowAltFormes) {
                allPokes.push(...(noLegendaries ? this.noLegendaryListInclFormes : this.mainPokemonListInclFormes));
                for (let i = allPokes.length - 1; i >= 0; i--) {
                  if (allPokes[i].actuallyCosmetic) allPokes.splice(i, 1);
                }
              } else {
                allPokes.push(...(noLegendaries ? this.noLegendaryList : this.mainPokemonList));
              }
              for (let i = allPokes.length - 1; i >= 0; i--) {
                if (banned.includes(allPokes[i])) allPokes.splice(i, 1);
              }
              if (pickablePokemon !== allPokes) {
                pickablePokemon.push(...allPokes);
                for (let i = pickablePokemon.length - 1; i >= 0; i--) {
                  if (area.bannedPokemon.has(pickablePokemon[i])) pickablePokemon.splice(i, 1);
                }
              }
            }
          }
        }
        for (const enc of area.encounters) {
          if (enc.pokemon != null && banned.includes(enc.pokemon)) {
            continue;
          }
          enc.pokemon = areaMap.get(enc.pokemon!)!;
          this.setFormeForEncounter(enc, enc.pokemon!);
        }
      }
    } else if (typeThemed) {
      const cachedPokeLists = new Map<Type, Pokemon[]>();
      for (const area of scrambledEncounters) {
        const inArea = this.pokemonInArea(area);
        let possiblePokemon: Pokemon[] | null = null;
        let iterLoops = 0;
        while (possiblePokemon === null && iterLoops < 10000) {
          const areaTheme = this.randomType();
          if (!cachedPokeLists.has(areaTheme)) {
            const pType = allowAltFormes
              ? this.pokemonOfTypeInclFormes(areaTheme, noLegendaries)
              : this.pokemonOfType(areaTheme, noLegendaries);
            cachedPokeLists.set(areaTheme, pType.filter(p => !banned.includes(p)));
          }
          possiblePokemon = [...cachedPokeLists.get(areaTheme)!];
          if (area.bannedPokemon.size > 0) {
            possiblePokemon = possiblePokemon.filter(p => !area.bannedPokemon.has(p));
          }
          if (possiblePokemon.length < inArea.size) {
            possiblePokemon = null;
          }
          iterLoops++;
        }
        if (possiblePokemon === null) {
          throw new RandomizationException("Could not randomize an area in a reasonable amount of attempts.");
        }

        const areaMap = new Map<Pokemon, Pokemon>();
        for (const areaPk of inArea) {
          let picked = this.random.nextInt(possiblePokemon.length);
          let pickedMN = possiblePokemon[picked];
          while (pickedMN.actuallyCosmetic) {
            picked = this.random.nextInt(possiblePokemon.length);
            pickedMN = possiblePokemon[picked];
          }
          areaMap.set(areaPk, pickedMN);
          possiblePokemon.splice(picked, 1);
        }
        for (const enc of area.encounters) {
          enc.pokemon = areaMap.get(enc.pokemon!)!;
          this.setFormeForEncounter(enc, enc.pokemon!);
        }
      }
    } else if (usePowerLevels) {
      let allowedPokes: Pokemon[];
      if (allowAltFormes) {
        allowedPokes = noLegendaries ? [...this.noLegendaryListInclFormes] : [...this.mainPokemonListInclFormes];
      } else {
        allowedPokes = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
      }
      allowedPokes = allowedPokes.filter(p => !banned.includes(p));
      for (const area of scrambledEncounters) {
        const inArea = this.pokemonInArea(area);
        const areaMap = new Map<Pokemon, Pokemon>();
        const usedPks: Pokemon[] = [];
        let localAllowed = allowedPokes;
        if (area.bannedPokemon.size > 0) {
          localAllowed = allowedPokes.filter(p => !area.bannedPokemon.has(p));
        }
        for (const areaPk of inArea) {
          let picked = this.pickWildPowerLvlReplacement(localAllowed, areaPk, false, usedPks, 100);
          while (picked.actuallyCosmetic) {
            picked = this.pickWildPowerLvlReplacement(localAllowed, areaPk, false, usedPks, 100);
          }
          areaMap.set(areaPk, picked);
          usedPks.push(picked);
        }
        for (const enc of area.encounters) {
          enc.pokemon = areaMap.get(enc.pokemon!)!;
          this.setFormeForEncounter(enc, enc.pokemon!);
        }
      }
    } else {
      // Entirely random
      for (const area of scrambledEncounters) {
        const inArea = this.pokemonInArea(area);
        const areaMap = new Map<Pokemon, Pokemon>();
        const usedValues = new Set<Pokemon>();
        for (const areaPk of inArea) {
          let picked = this.pickEntirelyRandomPokemon(allowAltFormes, noLegendaries, area, banned);
          while (usedValues.has(picked)) {
            picked = this.pickEntirelyRandomPokemon(allowAltFormes, noLegendaries, area, banned);
          }
          areaMap.set(areaPk, picked);
          usedValues.add(picked);
        }
        for (const enc of area.encounters) {
          enc.pokemon = areaMap.get(enc.pokemon!)!;
          this.setFormeForEncounter(enc, enc.pokemon!);
        }
      }
    }

    if (levelModifier !== 0) {
      for (const area of currentEncounters) {
        for (const enc of area.encounters) {
          enc.level = Math.min(100, Math.round(enc.level * (1 + levelModifier / 100.0)));
          enc.maxLevel = Math.min(100, Math.round(enc.maxLevel * (1 + levelModifier / 100.0)));
        }
      }
    }
  }

  game1to1Encounters(settings: Settings): void {
    const useTimeOfDay = settings.useTimeBasedEncounters;
    const usePowerLevels = settings.wildPokemonRestrictionMod === WildPokemonRestrictionMod.SIMILAR_STRENGTH;
    const noLegendaries = settings.blockWildLegendaries;
    const levelModifier = settings.wildLevelsModified ? settings.wildLevelModifier : 0;
    const allowAltFormes = settings.allowWildAltFormes;
    const banIrregularAltFormes = settings.banIrregularAltFormes;
    const abilitiesAreRandomized = settings.abilitiesMod === AbilitiesMod.RANDOMIZE;

    this.checkPokemonRestrictions();
    const translateMap = new Map<Pokemon, Pokemon>();
    const remainingLeft = this.allPokemonInclFormesWithoutNull().filter(p => !p.actuallyCosmetic);
    let remainingRight: Pokemon[];
    if (allowAltFormes) {
      remainingRight = noLegendaries ? [...this.noLegendaryListInclFormes] : [...this.mainPokemonListInclFormes];
      remainingRight = remainingRight.filter(p => !p.actuallyCosmetic);
    } else {
      remainingRight = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
    }
    const banned = this.bannedForWildEncounters();
    banned.push(...this.getBannedFormesForPlayerPokemon());
    if (!abilitiesAreRandomized) {
      banned.push(...this.getAbilityDependentFormes());
    }
    if (banIrregularAltFormes) {
      banned.push(...this.getIrregularFormes());
    }
    // Banned pokemon should be mapped to themselves
    for (const bannedPK of banned) {
      translateMap.set(bannedPK, bannedPK);
      const leftIdx = remainingLeft.indexOf(bannedPK);
      if (leftIdx >= 0) remainingLeft.splice(leftIdx, 1);
      const rightIdx = remainingRight.indexOf(bannedPK);
      if (rightIdx >= 0) remainingRight.splice(rightIdx, 1);
    }
    while (remainingLeft.length > 0) {
      if (usePowerLevels) {
        const pickedLeft = this.random.nextInt(remainingLeft.length);
        const pickedLeftP = remainingLeft.splice(pickedLeft, 1)[0];
        let pickedRightP: Pokemon;
        if (remainingRight.length === 1) {
          pickedRightP = remainingRight[0];
        } else {
          pickedRightP = this.pickWildPowerLvlReplacement(remainingRight, pickedLeftP, true, null, 100);
        }
        const rIdx = remainingRight.indexOf(pickedRightP);
        if (rIdx >= 0) remainingRight.splice(rIdx, 1);
        translateMap.set(pickedLeftP, pickedRightP);
      } else {
        const pickedLeft = this.random.nextInt(remainingLeft.length);
        let pickedRight = this.random.nextInt(remainingRight.length);
        const pickedLeftP = remainingLeft.splice(pickedLeft, 1)[0];
        let pickedRightP = remainingRight[pickedRight];
        while (pickedLeftP.number === pickedRightP.number && remainingRight.length !== 1) {
          pickedRight = this.random.nextInt(remainingRight.length);
          pickedRightP = remainingRight[pickedRight];
        }
        remainingRight.splice(pickedRight, 1);
        translateMap.set(pickedLeftP, pickedRightP);
      }
      if (remainingRight.length === 0) {
        if (allowAltFormes) {
          remainingRight.push(...(noLegendaries ? this.noLegendaryListInclFormes : this.mainPokemonListInclFormes));
          for (let i = remainingRight.length - 1; i >= 0; i--) {
            if (remainingRight[i].actuallyCosmetic) remainingRight.splice(i, 1);
          }
        } else {
          remainingRight.push(...(noLegendaries ? this.noLegendaryList : this.mainPokemonList));
        }
        for (let i = remainingRight.length - 1; i >= 0; i--) {
          if (banned.includes(remainingRight[i])) remainingRight.splice(i, 1);
        }
      }
    }

    // Map remaining to themselves just in case
    const allPokes = this.allPokemonInclFormesWithoutNull();
    for (const poke of allPokes) {
      if (!translateMap.has(poke)) {
        translateMap.set(poke, poke);
      }
    }

    const currentEncounters = this.getEncounters(useTimeOfDay);

    for (const area of currentEncounters) {
      for (const enc of area.encounters) {
        enc.pokemon = translateMap.get(enc.pokemon!) ?? enc.pokemon;
        if (area.bannedPokemon.has(enc.pokemon!)) {
          let tempPickable: Pokemon[];
          if (allowAltFormes) {
            tempPickable = noLegendaries ? [...this.noLegendaryListInclFormes] : [...this.mainPokemonListInclFormes];
            tempPickable = tempPickable.filter(p => !p.actuallyCosmetic);
          } else {
            tempPickable = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
          }
          tempPickable = tempPickable.filter(p => !banned.includes(p) && !area.bannedPokemon.has(p));
          if (tempPickable.length === 0) {
            throw new RandomizationException("ERROR: Couldn't replace a wild Pokemon!");
          }
          if (usePowerLevels) {
            enc.pokemon = this.pickWildPowerLvlReplacement(tempPickable, enc.pokemon!, false, null, 100);
          } else {
            enc.pokemon = tempPickable[this.random.nextInt(tempPickable.length)];
          }
        }
        this.setFormeForEncounter(enc, enc.pokemon!);
      }
    }
    if (levelModifier !== 0) {
      for (const area of currentEncounters) {
        for (const enc of area.encounters) {
          enc.level = Math.min(100, Math.round(enc.level * (1 + levelModifier / 100.0)));
          enc.maxLevel = Math.min(100, Math.round(enc.maxLevel * (1 + levelModifier / 100.0)));
        }
      }
    }

    this.setEncounters(useTimeOfDay, currentEncounters);
  }
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
  randomizeTrainerPokes(settings: Settings): void {
    const usePowerLevels = settings.trainersUsePokemonOfSimilarStrength;
    const noLegendaries = settings.trainersBlockLegendaries;
    const noEarlyWonderGuard = settings.trainersBlockEarlyWonderGuard;
    const levelModifier = settings.trainersLevelModified ? settings.trainersLevelModifier : 0;

    this.checkPokemonRestrictions();

    // Build Pokemon pool
    let pokemonPool: Pokemon[] = noLegendaries ? [...this.noLegendaryList] : [...this.mainPokemonList];
    pokemonPool = pokemonPool.filter(pk => !pk.actuallyCosmetic);
    const banned = this.getBannedFormesForTrainerPokemon();
    pokemonPool = pokemonPool.filter(pk => !banned.includes(pk));

    const currentTrainers = this.getTrainers();

    for (const t of currentTrainers) {
      // Apply level modifier
      if (levelModifier !== 0) {
        for (const tp of t.pokemon) {
          tp.level = Math.min(100, Math.round(tp.level * (1 + levelModifier / 100.0)));
        }
      }

      // Skip IRIVAL (Yellow first rival - determines non-player starter)
      if (t.tag != null && t.tag === "IRIVAL") continue;

      for (const tp of t.pokemon) {
        const wgAllowed = !noEarlyWonderGuard || tp.level >= 20;
        const oldPK = tp.pokemon;

        let newPK: Pokemon;
        if (usePowerLevels) {
          newPK = this.pickTrainerPowerLvlReplacement(pokemonPool, oldPK, wgAllowed);
        } else {
          newPK = this.pickRandomTrainerPokemon(pokemonPool, wgAllowed);
        }

        tp.pokemon = newPK;
        tp.resetMoves = true;
      }
    }

    this.setTrainers(currentTrainers, false);
  }

  private pickTrainerPowerLvlReplacement(pokemonPool: Pokemon[], current: Pokemon, wgAllowed: boolean): Pokemon {
    const currentBST = current.bstForPowerLevels();
    const minTarget = currentBST - currentBST / 6;
    const maxTarget = currentBST + currentBST / 6;
    let canPick = pokemonPool.filter(pk => {
      if (!wgAllowed && this.hasWonderGuard(pk)) return false;
      const bst = pk.bstForPowerLevels();
      return bst >= minTarget && bst <= maxTarget;
    });
    if (canPick.length === 0) {
      canPick = pokemonPool.filter(pk => wgAllowed || !this.hasWonderGuard(pk));
    }
    if (canPick.length === 0) canPick = pokemonPool;
    return canPick[this.random.nextInt(canPick.length)];
  }

  private pickRandomTrainerPokemon(pokemonPool: Pokemon[], wgAllowed: boolean): Pokemon {
    let canPick = wgAllowed ? pokemonPool : pokemonPool.filter(pk => !this.hasWonderGuard(pk));
    if (canPick.length === 0) canPick = pokemonPool;
    return canPick[this.random.nextInt(canPick.length)];
  }

  private hasWonderGuard(pk: Pokemon): boolean {
    return pk.ability1 === Abilities.wonderGuard
      || pk.ability2 === Abilities.wonderGuard
      || pk.ability3 === Abilities.wonderGuard;
  }

  randomizeTrainerHeldItems(_settings: Settings): void {
    // Simplified: no-op for Gen 1 (no held items in Gen 1)
  }

  rivalCarriesStarter(): void {
    // Implemented per-gen: this is a no-op in the base class
    // Gen1 handler overrides if needed
  }

  hasRivalFinalBattle(): boolean {
    return false;
  }

  forceFullyEvolvedTrainerPokes(settings: Settings): void {
    const level = settings.trainersForceFullyEvolvedLevel;
    const trainers = this.getTrainers();
    for (const t of trainers) {
      for (const tp of t.pokemon) {
        if (tp.level >= level) {
          const evolved = this.fullyEvolve(tp.pokemon);
          if (evolved !== tp.pokemon) {
            tp.pokemon = evolved;
            tp.resetMoves = true;
          }
        }
      }
    }
    this.setTrainers(trainers, false);
  }

  private fullyEvolve(pk: Pokemon): Pokemon {
    let current = pk;
    let safety = 0;
    while (current.evolutionsFrom.length > 0 && safety < 10) {
      current = current.evolutionsFrom[0].to;
      safety++;
    }
    return current;
  }

  onlyChangeTrainerLevels(settings: Settings): void {
    const levelModifier = settings.trainersLevelModifier;
    const trainers = this.getTrainers();
    for (const t of trainers) {
      for (const tp of t.pokemon) {
        tp.level = Math.min(100, Math.round(tp.level * (1 + levelModifier / 100.0)));
      }
    }
    this.setTrainers(trainers, false);
  }

  addTrainerPokemon(_settings: Settings): void {
    // No-op by default; can be overridden
  }

  doubleBattleMode(): void {
    // No-op by default; can be overridden
  }
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
  randomizeMovesLearnt(settings: Settings): void {
    const typeThemed = settings.movesetsMod === MovesetsMod.RANDOM_PREFER_SAME_TYPE;
    const noBroken = settings.blockBrokenMovesetMoves;
    const forceStartingMoves = this.supportsFourStartingMoves() && settings.startWithGuaranteedMoves;
    const forceStartingMoveCount = settings.guaranteedMoveCount;
    const goodDamagingPercentage =
      settings.movesetsForceGoodDamaging ? settings.movesetsGoodDamagingPercent / 100.0 : 0;
    const evolutionMovesForAll = settings.evolutionMovesForAll;

    const movesets = this.getMovesLearnt();
    const validMoves: Move[] = [];
    const validDamagingMoves: Move[] = [];
    const validTypeMoves = new Map<Type, Move[]>();
    const validTypeDamagingMoves = new Map<Type, Move[]>();
    this.createSetsOfMoves(noBroken, validMoves, validDamagingMoves, validTypeMoves, validTypeDamagingMoves);

    for (const [pkmnNum, moves] of movesets) {
      const learnt: number[] = [];
      let lv1AttackingMove = 0;
      const pkmn = this.findPokemonInPoolWithSpeciesID(this.mainPokemonListInclFormes, pkmnNum);
      if (pkmn == null) continue;

      const atkSpAtkRatio = pkmn.getAttackSpecialAttackRatio();

      if (forceStartingMoves) {
        let lv1count = 0;
        for (const ml of moves) {
          if (ml.level === 1) lv1count++;
        }
        if (lv1count < forceStartingMoveCount) {
          for (let i = 0; i < forceStartingMoveCount - lv1count; i++) {
            const fakeLv1 = new MoveLearnt();
            fakeLv1.level = 1;
            fakeLv1.move = 0;
            moves.unshift(fakeLv1);
          }
        }
      }

      if (evolutionMovesForAll) {
        if (moves[0].level !== 0) {
          const fakeEvoMove = new MoveLearnt();
          fakeEvoMove.level = 0;
          fakeEvoMove.move = 0;
          moves.unshift(fakeEvoMove);
        }
      }

      if (pkmn.actuallyCosmetic) {
        const baseMoveset = movesets.get(pkmn.baseForme!.number);
        if (baseMoveset) {
          for (let i = 0; i < moves.length; i++) {
            moves[i].move = baseMoveset[i].move;
          }
        }
        continue;
      }

      // Find last lv1 move
      let lv1index = moves[0].level === 1 ? 0 : 1; // Evolution move handling (level 0 = evo move)
      while (lv1index < moves.length && moves[lv1index].level === 1) {
        lv1index++;
      }
      if (lv1index !== 0) {
        lv1index--;
      }

      let goodDamagingLeft = Math.round(goodDamagingPercentage * moves.length);

      for (let i = 0; i < moves.length; i++) {
        const attemptDamaging = i === lv1index || goodDamagingLeft > 0;

        let typeOfMove: Type | null = null;
        if (typeThemed) {
          const picked = this.random.nextDouble();
          if (
            (pkmn.primaryType === Type.NORMAL && pkmn.secondaryType != null) ||
            (pkmn.secondaryType === Type.NORMAL)
          ) {
            const otherType = pkmn.primaryType === Type.NORMAL ? pkmn.secondaryType! : pkmn.primaryType;
            if (picked < 0.1) {
              typeOfMove = Type.NORMAL;
            } else if (picked < 0.4) {
              typeOfMove = otherType;
            }
          } else if (pkmn.secondaryType != null) {
            if (picked < 0.2) {
              typeOfMove = pkmn.primaryType;
            } else if (picked < 0.4) {
              typeOfMove = pkmn.secondaryType;
            }
          } else {
            if (picked < 0.4) {
              typeOfMove = pkmn.primaryType;
            }
          }
        }

        let pickList = validMoves;
        if (attemptDamaging) {
          if (typeOfMove != null) {
            if (
              validTypeDamagingMoves.has(typeOfMove) &&
              this.checkForUnusedMove(validTypeDamagingMoves.get(typeOfMove)!, learnt)
            ) {
              pickList = validTypeDamagingMoves.get(typeOfMove)!;
            } else if (this.checkForUnusedMove(validDamagingMoves, learnt)) {
              pickList = validDamagingMoves;
            }
          } else if (this.checkForUnusedMove(validDamagingMoves, learnt)) {
            pickList = validDamagingMoves;
          }
          const forcedCategory =
            this.random.nextDouble() < atkSpAtkRatio ? MoveCategory.PHYSICAL : MoveCategory.SPECIAL;
          const filteredList = pickList.filter((mv) => mv.category === forcedCategory);
          if (filteredList.length > 0 && this.checkForUnusedMove(filteredList, learnt)) {
            pickList = filteredList;
          }
        } else if (typeOfMove != null) {
          if (
            validTypeMoves.has(typeOfMove) &&
            this.checkForUnusedMove(validTypeMoves.get(typeOfMove)!, learnt)
          ) {
            pickList = validTypeMoves.get(typeOfMove)!;
          }
        }

        let mv = pickList[this.random.nextInt(pickList.length)];
        while (learnt.includes(mv.number)) {
          mv = pickList[this.random.nextInt(pickList.length)];
        }

        if (i === lv1index) {
          lv1AttackingMove = mv.number;
        } else {
          goodDamagingLeft--;
        }
        learnt.push(mv.number);
      }

      // Shuffle learnt moves
      for (let i = learnt.length - 1; i > 0; i--) {
        const j = this.random.nextInt(i + 1);
        [learnt[i], learnt[j]] = [learnt[j], learnt[i]];
      }

      // Ensure lv1 attacking move is at lv1index
      if (learnt[lv1index] !== lv1AttackingMove) {
        for (let i = 0; i < learnt.length; i++) {
          if (learnt[i] === lv1AttackingMove) {
            learnt[i] = learnt[lv1index];
            learnt[lv1index] = lv1AttackingMove;
            break;
          }
        }
      }

      for (let i = 0; i < learnt.length; i++) {
        moves[i].move = learnt[i];
        if (i === lv1index) {
          moves[i].level = 1;
        }
      }
    }
    this.setMovesLearnt(movesets);
  }
  abstract randomizeEggMoves(settings: Settings): void;
  abstract orderDamagingMovesByDamage(): void;
  abstract metronomeOnlyMode(): void;
  abstract supportsFourStartingMoves(): boolean;

  abstract getStaticPokemon(): StaticEncounter[];
  abstract setStaticPokemon(staticPokemon: StaticEncounter[]): boolean;
  randomizeStaticPokemon(settings: Settings): void {
    const swapLegendaries = settings.staticPokemonMod === StaticPokemonMod.RANDOM_MATCHING;
    const similarStrength = settings.staticPokemonMod === StaticPokemonMod.SIMILAR_STRENGTH;
    const limitMGL = settings.limitMainGameLegendaries;
    const limit600 = settings.limit600;
    const allowAltFormes = settings.allowStaticAltFormes;
    const banIrregularAltFormes = settings.banIrregularAltFormes;
    const swapMegaEvos = settings.swapStaticMegaEvos;
    const abilitiesAreRandomized = settings.abilitiesMod === AbilitiesMod.RANDOMIZE;
    const levelModifier = settings.staticLevelModified ? settings.staticLevelModifier : 0;
    const correctStaticMusic = settings.correctStaticMusic;
    this.checkPokemonRestrictions();
    const currentStaticPokemon = this.getStaticPokemon();
    const replacements: StaticEncounter[] = [];
    const banned: Pokemon[] = [...this.bannedForStaticPokemon(), ...this.getBannedFormesForPlayerPokemon()];
    if (!abilitiesAreRandomized) banned.push(...this.getAbilityDependentFormes());
    if (banIrregularAltFormes) banned.push(...this.getIrregularFormes());
    const reallySwapMegaEvos = this.forceSwapStaticMegaEvos() || swapMegaEvos;
    const specialMusicStaticChanges = new Map<number, number>();
    let changeMusicStatics: number[] = [];
    if (correctStaticMusic) changeMusicStatics = this.getSpecialMusicStatics();
    const removeFromArray = (arr: Pokemon[], item: Pokemon) => { const i = arr.indexOf(item); if (i >= 0) arr.splice(i, 1); };
    const removeAllFromArray = (arr: Pokemon[], items: Pokemon[]) => { for (const item of items) removeFromArray(arr, item); };

    if (swapLegendaries) {
      let legendariesLeft = [...this.onlyLegendaryList];
      if (allowAltFormes) { legendariesLeft.push(...this.onlyLegendaryAltsList); legendariesLeft = legendariesLeft.filter(pk => !pk.actuallyCosmetic); }
      let nonlegsLeft = [...this.noLegendaryList];
      if (allowAltFormes) { nonlegsLeft.push(...this.noLegendaryAltsList); nonlegsLeft = nonlegsLeft.filter(pk => !pk.actuallyCosmetic); }
      const ultraBeastsLeft = [...this.ultraBeastList];
      removeAllFromArray(legendariesLeft, banned); removeAllFromArray(nonlegsLeft, banned); removeAllFromArray(ultraBeastsLeft, banned);
      const legendariesPool = [...legendariesLeft]; const nonlegsPool = [...nonlegsLeft]; const ultraBeastsPool = [...ultraBeastsLeft];

      for (const old of currentStaticPokemon) {
        const ns = this.cloneStaticEncounter(old);
        let newPK: Pokemon;
        if (old.pkmn.isLegendary()) {
          if (reallySwapMegaEvos && old.canMegaEvolve()) { newPK = this.getMegaEvoPokemon(this.onlyLegendaryList, legendariesLeft, ns); }
          else if (old.restrictedPool) { newPK = this.getRestrictedStaticPokemon(legendariesPool, legendariesLeft, old); }
          else { newPK = legendariesLeft.splice(this.random.nextInt(legendariesLeft.length), 1)[0]; }
          this.setPokemonAndFormeForStaticEncounter(ns, newPK);
          if (legendariesLeft.length === 0) legendariesLeft.push(...legendariesPool);
        } else if (this.ultraBeastList.includes(old.pkmn)) {
          if (old.restrictedPool) { newPK = this.getRestrictedStaticPokemon(ultraBeastsPool, ultraBeastsLeft, old); }
          else { newPK = ultraBeastsLeft.splice(this.random.nextInt(ultraBeastsLeft.length), 1)[0]; }
          this.setPokemonAndFormeForStaticEncounter(ns, newPK);
          if (ultraBeastsLeft.length === 0) ultraBeastsLeft.push(...ultraBeastsPool);
        } else {
          if (reallySwapMegaEvos && old.canMegaEvolve()) { newPK = this.getMegaEvoPokemon(this.noLegendaryList, nonlegsLeft, ns); }
          else if (old.restrictedPool) { newPK = this.getRestrictedStaticPokemon(nonlegsPool, nonlegsLeft, old); }
          else { newPK = nonlegsLeft.splice(this.random.nextInt(nonlegsLeft.length), 1)[0]; }
          this.setPokemonAndFormeForStaticEncounter(ns, newPK);
          if (nonlegsLeft.length === 0) nonlegsLeft.push(...nonlegsPool);
        }
        replacements.push(ns);
        if (changeMusicStatics.includes(old.pkmn.number)) specialMusicStaticChanges.set(old.pkmn.number, newPK.number);
      }
    } else if (similarStrength) {
      const exclCosmetics = this.mainPokemonListInclFormes.filter(pk => !pk.actuallyCosmetic);
      const pokemonLeft = [...(!allowAltFormes ? this.mainPokemonList : exclCosmetics)];
      removeAllFromArray(pokemonLeft, banned);
      const pokemonPool = [...pokemonLeft];
      const mainGameLegendaries = this.getMainGameLegendaries();
      for (const old of currentStaticPokemon) {
        const ns = this.cloneStaticEncounter(old);
        let newPK: Pokemon;
        let oldPK = old.pkmn;
        if (old.forme > 0) oldPK = this.getAltFormeOfPokemon(oldPK, old.forme);
        const oldBST = oldPK.bstForPowerLevels();
        if (oldBST >= 600 && limit600) {
          if (reallySwapMegaEvos && old.canMegaEvolve()) { newPK = this.getMegaEvoPokemon(this.mainPokemonList, pokemonLeft, ns); }
          else if (old.restrictedPool) { newPK = this.getRestrictedStaticPokemon(pokemonPool, pokemonLeft, old); }
          else { newPK = pokemonLeft.splice(this.random.nextInt(pokemonLeft.length), 1)[0]; }
          this.setPokemonAndFormeForStaticEncounter(ns, newPK);
        } else {
          const limitBST = oldPK.baseForme == null ? limitMGL && mainGameLegendaries.includes(oldPK.number) : limitMGL && mainGameLegendaries.includes(oldPK.baseForme.number);
          if (reallySwapMegaEvos && old.canMegaEvolve()) {
            let meLeft = this.megaEvolutionsList.filter(m => m.method === 1).map(m => m.from).filter((p, i, a) => a.indexOf(p) === i).filter(p => pokemonLeft.includes(p));
            if (meLeft.length === 0) meLeft = this.megaEvolutionsList.filter(m => m.method === 1).map(m => m.from).filter((p, i, a) => a.indexOf(p) === i).filter(p => this.mainPokemonList.includes(p));
            newPK = this.pickStaticPowerLvlReplacement(meLeft, oldPK, true, limitBST);
            ns.heldItem = newPK.megaEvolutionsFrom[this.random.nextInt(newPK.megaEvolutionsFrom.length)].argument;
          } else if (old.restrictedPool) {
            let rp = pokemonLeft.filter(pk => old.restrictedList.includes(pk));
            if (rp.length === 0) rp = pokemonPool.filter(pk => old.restrictedList.includes(pk));
            newPK = this.pickStaticPowerLvlReplacement(rp, oldPK, false, limitBST);
          } else {
            newPK = this.pickStaticPowerLvlReplacement(pokemonLeft, oldPK, true, limitBST);
          }
          removeFromArray(pokemonLeft, newPK);
          this.setPokemonAndFormeForStaticEncounter(ns, newPK);
        }
        if (pokemonLeft.length === 0) pokemonLeft.push(...pokemonPool);
        replacements.push(ns);
        if (changeMusicStatics.includes(old.pkmn.number)) specialMusicStaticChanges.set(old.pkmn.number, newPK.number);
      }
    } else {
      const exclCosmetics = this.mainPokemonListInclFormes.filter(pk => !pk.actuallyCosmetic);
      const pokemonLeft = [...(!allowAltFormes ? this.mainPokemonList : exclCosmetics)];
      removeAllFromArray(pokemonLeft, banned);
      const pokemonPool = [...pokemonLeft];
      for (const old of currentStaticPokemon) {
        const ns = this.cloneStaticEncounter(old);
        let newPK: Pokemon;
        if (reallySwapMegaEvos && old.canMegaEvolve()) { newPK = this.getMegaEvoPokemon(this.mainPokemonList, pokemonLeft, ns); }
        else if (old.restrictedPool) { newPK = this.getRestrictedStaticPokemon(pokemonPool, pokemonLeft, old); }
        else { newPK = pokemonLeft.splice(this.random.nextInt(pokemonLeft.length), 1)[0]; }
        removeFromArray(pokemonLeft, newPK);
        this.setPokemonAndFormeForStaticEncounter(ns, newPK);
        if (pokemonLeft.length === 0) pokemonLeft.push(...pokemonPool);
        replacements.push(ns);
        if (changeMusicStatics.includes(old.pkmn.number)) specialMusicStaticChanges.set(old.pkmn.number, newPK.number);
      }
    }

    if (levelModifier !== 0) {
      for (const se of replacements) {
        if (!se.isEgg) {
          se.level = Math.min(100, Math.round(se.level * (1 + levelModifier / 100.0)));
          se.maxLevel = Math.min(100, Math.round(se.maxLevel * (1 + levelModifier / 100.0)));
          for (const ls of se.linkedEncounters) {
            if (!ls.isEgg) {
              ls.level = Math.min(100, Math.round(ls.level * (1 + levelModifier / 100.0)));
              ls.maxLevel = Math.min(100, Math.round(ls.maxLevel * (1 + levelModifier / 100.0)));
            }
          }
        }
      }
    }
    if (specialMusicStaticChanges.size > 0) this.applyCorrectStaticMusic(specialMusicStaticChanges);
    this.setStaticPokemon(replacements);
  }

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
  randomizeTMMoves(settings: Settings): void {
    const noBroken = settings.blockBrokenTMMoves;
    const preserveField = settings.keepFieldMoveTMs;
    const goodDamagingPercentage = settings.tmsForceGoodDamaging
      ? settings.tmsGoodDamagingPercent / 100.0
      : 0;

    const tmCount = this.getTMCount();
    const allMoves = this.getMoves();
    const hms = this.getHMMoves();
    const oldTMs = this.getTMMoves();

    const banned = new Set<number>(noBroken ? this.getGameBreakingMoves() : []);
    for (const b of this.getMovesBannedFromLevelup()) banned.add(b);
    for (const il of this.getIllegalMoves()) banned.add(il);

    // field moves?
    const fieldMoves = this.getFieldMoves();
    let preservedFieldMoveCount = 0;

    if (preserveField) {
      const existingFieldTMs = oldTMs.filter((tm) => fieldMoves.includes(tm));
      preservedFieldMoveCount = existingFieldTMs.length;
      for (const fm of existingFieldTMs) banned.add(fm);
    }

    // Determine which moves are pickable
    const usableMoves: Move[] = [];
    const usableDamagingMoves: Move[] = [];

    for (let i = 1; i < allMoves.length; i++) {
      const mv = allMoves[i];
      if (mv == null) continue;
      if (
        GlobalConstants.bannedRandomMoves[mv.number] ||
        GlobalConstants.zMoves.includes(mv.number) ||
        hms.includes(mv.number) ||
        banned.has(mv.number)
      ) {
        continue;
      }
      usableMoves.push(mv);
      if (
        !GlobalConstants.bannedForDamagingMove[mv.number] &&
        mv.isGoodDamaging(this.perfectAccuracy)
      ) {
        usableDamagingMoves.push(mv);
      }
    }

    // pick (tmCount - preservedFieldMoveCount) moves
    const pickedMoves: number[] = [];
    let goodDamagingLeft = Math.round(
      goodDamagingPercentage * (tmCount - preservedFieldMoveCount)
    );

    for (let i = 0; i < tmCount - preservedFieldMoveCount; i++) {
      let chosenMove: Move;
      if (goodDamagingLeft > 0 && usableDamagingMoves.length > 0) {
        const idx = this.random.nextInt(usableDamagingMoves.length);
        chosenMove = usableDamagingMoves[idx];
      } else {
        const idx = this.random.nextInt(usableMoves.length);
        chosenMove = usableMoves[idx];
      }
      pickedMoves.push(chosenMove.number);
      // Remove from both lists
      const uIdx = usableMoves.indexOf(chosenMove);
      if (uIdx >= 0) usableMoves.splice(uIdx, 1);
      const dIdx = usableDamagingMoves.indexOf(chosenMove);
      if (dIdx >= 0) usableDamagingMoves.splice(dIdx, 1);
      goodDamagingLeft--;
    }

    // shuffle picked moves to avoid bias from goodDamagingPercentage
    this.shuffleArray(pickedMoves);

    // distribute as TMs
    let pickedMoveIndex = 0;
    const newTMs: number[] = [];

    for (let i = 0; i < tmCount; i++) {
      if (preserveField && fieldMoves.includes(oldTMs[i])) {
        newTMs.push(oldTMs[i]);
      } else {
        newTMs.push(pickedMoves[pickedMoveIndex++]);
      }
    }

    this.setTMMoves(newTMs);
  }
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
