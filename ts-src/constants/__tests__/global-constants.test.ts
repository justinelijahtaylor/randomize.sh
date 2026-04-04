import { describe, it, expect } from "vitest";
import * as GlobalConstants from "../global-constants";
import * as Moves from "../moves";
import * as Items from "../items";
import * as Abilities from "../abilities";
import * as Species from "../species";

describe("GlobalConstants", () => {
  describe("key constants", () => {
    it("has HIGHEST_POKEMON_GEN = 9", () => {
      expect(GlobalConstants.HIGHEST_POKEMON_GEN).toBe(9);
    });

    it("has MIN_DAMAGING_MOVE_POWER = 50", () => {
      expect(GlobalConstants.MIN_DAMAGING_MOVE_POWER).toBe(50);
    });

    it("has LARGEST_NUMBER_OF_SPLIT_EVOS = 8 (Eevee)", () => {
      expect(GlobalConstants.LARGEST_NUMBER_OF_SPLIT_EVOS).toBe(8);
    });
  });

  describe("bannedRandomMoves", () => {
    it("has 827 entries", () => {
      expect(GlobalConstants.bannedRandomMoves.length).toBe(827);
    });

    it("bans Struggle", () => {
      expect(GlobalConstants.bannedRandomMoves[Moves.struggle]).toBe(true);
    });

    it("does not ban Tackle", () => {
      expect(GlobalConstants.bannedRandomMoves[Moves.tackle]).toBe(false);
    });
  });

  describe("bannedForDamagingMove", () => {
    it("has 827 entries", () => {
      expect(GlobalConstants.bannedForDamagingMove.length).toBe(827);
    });

    it("bans Self-Destruct", () => {
      expect(GlobalConstants.bannedForDamagingMove[Moves.selfDestruct]).toBe(true);
    });

    it("bans Explosion", () => {
      expect(GlobalConstants.bannedForDamagingMove[Moves.explosion]).toBe(true);
    });

    it("bans Dream Eater", () => {
      expect(GlobalConstants.bannedForDamagingMove[Moves.dreamEater]).toBe(true);
    });

    it("bans OHKO moves", () => {
      expect(GlobalConstants.bannedForDamagingMove[Moves.hornDrill]).toBe(true);
      expect(GlobalConstants.bannedForDamagingMove[Moves.guillotine]).toBe(true);
      expect(GlobalConstants.bannedForDamagingMove[Moves.fissure]).toBe(true);
      expect(GlobalConstants.bannedForDamagingMove[Moves.sheerCold]).toBe(true);
    });

    it("bans fixed damage moves", () => {
      expect(GlobalConstants.bannedForDamagingMove[Moves.sonicBoom]).toBe(true);
      expect(GlobalConstants.bannedForDamagingMove[Moves.dragonRage]).toBe(true);
    });

    it("does not ban Thunderbolt", () => {
      expect(GlobalConstants.bannedForDamagingMove[Moves.thunderbolt]).toBe(false);
    });
  });

  describe("normalMultihitMoves", () => {
    it("is a non-empty array", () => {
      expect(GlobalConstants.normalMultihitMoves.length).toBeGreaterThan(0);
    });

    it("includes Bullet Seed", () => {
      expect(GlobalConstants.normalMultihitMoves).toContain(Moves.bulletSeed);
    });

    it("includes Fury Attack", () => {
      expect(GlobalConstants.normalMultihitMoves).toContain(Moves.furyAttack);
    });

    it("includes Rock Blast", () => {
      expect(GlobalConstants.normalMultihitMoves).toContain(Moves.rockBlast);
    });
  });

  describe("doubleHitMoves", () => {
    it("is a non-empty array", () => {
      expect(GlobalConstants.doubleHitMoves.length).toBeGreaterThan(0);
    });

    it("includes Double Kick", () => {
      expect(GlobalConstants.doubleHitMoves).toContain(Moves.doubleKick);
    });

    it("includes Bonemerang", () => {
      expect(GlobalConstants.doubleHitMoves).toContain(Moves.bonemerang);
    });
  });

  describe("Z-Move arrays", () => {
    it("has varyingPowerZMoves as a non-empty array", () => {
      expect(GlobalConstants.varyingPowerZMoves.length).toBeGreaterThan(0);
    });

    it("has fixedPowerZMoves as a non-empty array", () => {
      expect(GlobalConstants.fixedPowerZMoves.length).toBeGreaterThan(0);
    });

    it("has zMoves combining both Z-move arrays", () => {
      expect(GlobalConstants.zMoves.length).toBe(
        GlobalConstants.fixedPowerZMoves.length + GlobalConstants.varyingPowerZMoves.length
      );
    });

    it("includes Catastropika in fixed power Z-moves", () => {
      expect(GlobalConstants.fixedPowerZMoves).toContain(Moves.catastropika);
    });

    it("includes Breakneck Blitz Physical in varying power Z-moves", () => {
      expect(GlobalConstants.varyingPowerZMoves).toContain(Moves.breakneckBlitzPhysical);
    });
  });

  describe("Stat constants", () => {
    it("has HP = 1", () => {
      expect(GlobalConstants.Stat.HP).toBe(1);
    });

    it("has ATK as a power of 2", () => {
      expect(GlobalConstants.Stat.ATK).toBe(2);
    });

    it("has DEF as a power of 2", () => {
      expect(GlobalConstants.Stat.DEF).toBe(4);
    });

    it("has SPATK as a power of 2", () => {
      expect(GlobalConstants.Stat.SPATK).toBe(8);
    });

    it("has SPDEF as a power of 2", () => {
      expect(GlobalConstants.Stat.SPDEF).toBe(16);
    });

    it("has SPEED as a power of 2", () => {
      expect(GlobalConstants.Stat.SPEED).toBe(32);
    });

    it("uses bit flags that do not overlap", () => {
      const allStats = [
        GlobalConstants.Stat.HP,
        GlobalConstants.Stat.ATK,
        GlobalConstants.Stat.DEF,
        GlobalConstants.Stat.SPATK,
        GlobalConstants.Stat.SPDEF,
        GlobalConstants.Stat.SPEED,
        GlobalConstants.Stat.SPECIAL,
        GlobalConstants.Stat.POWER,
        GlobalConstants.Stat.ACCURACY,
        GlobalConstants.Stat.PP,
        GlobalConstants.Stat.TYPE,
        GlobalConstants.Stat.CATEGORY,
      ];
      // Each pair should have no overlapping bits
      for (let i = 0; i < allStats.length; i++) {
        for (let j = i + 1; j < allStats.length; j++) {
          expect(allStats[i] & allStats[j]).toBe(0);
        }
      }
    });
  });

  describe("getStatChanges", () => {
    it("returns an empty map for gen 1", () => {
      expect(GlobalConstants.getStatChanges(1).size).toBe(0);
    });

    it("returns stat changes for gen 6", () => {
      const changes = GlobalConstants.getStatChanges(6);
      expect(changes.size).toBeGreaterThan(0);
      expect(changes.has(Species.butterfree)).toBe(true);
      expect(changes.has(Species.beedrill)).toBe(true);
      expect(changes.has(Species.pikachu)).toBe(true);
    });

    it("returns stat changes for gen 7", () => {
      const changes = GlobalConstants.getStatChanges(7);
      expect(changes.size).toBeGreaterThan(0);
      expect(changes.has(Species.arbok)).toBe(true);
      expect(changes.has(Species.dugtrio)).toBe(true);
    });

    it("returns stat changes for gen 8 (Aegislash nerf)", () => {
      const changes = GlobalConstants.getStatChanges(8);
      expect(changes.size).toBe(1);
      expect(changes.has(Species.aegislash)).toBe(true);
    });

    it("returns stat changes for gen 9", () => {
      const changes = GlobalConstants.getStatChanges(9);
      expect(changes.has(Species.zacian)).toBe(true);
      expect(changes.has(Species.zamazenta)).toBe(true);
    });
  });

  describe("xItems", () => {
    it("is an array of 8 items", () => {
      expect(GlobalConstants.xItems.length).toBe(8);
    });

    it("includes Guard Spec", () => {
      expect(GlobalConstants.xItems).toContain(Items.guardSpec);
    });

    it("includes X Attack", () => {
      expect(GlobalConstants.xItems).toContain(Items.xAttack);
    });
  });

  describe("ability lists", () => {
    it("has battleTrappingAbilities with Shadow Tag, Magnet Pull, Arena Trap", () => {
      expect(GlobalConstants.battleTrappingAbilities).toContain(Abilities.shadowTag);
      expect(GlobalConstants.battleTrappingAbilities).toContain(Abilities.magnetPull);
      expect(GlobalConstants.battleTrappingAbilities).toContain(Abilities.arenaTrap);
      expect(GlobalConstants.battleTrappingAbilities.length).toBe(3);
    });

    it("has negativeAbilities including Truant, Slow Start, Defeatist", () => {
      expect(GlobalConstants.negativeAbilities).toContain(Abilities.truant);
      expect(GlobalConstants.negativeAbilities).toContain(Abilities.slowStart);
      expect(GlobalConstants.negativeAbilities).toContain(Abilities.defeatist);
    });

    it("has badAbilities as a non-empty array", () => {
      expect(GlobalConstants.badAbilities.length).toBeGreaterThan(0);
    });

    it("has doubleBattleAbilities as a non-empty array", () => {
      expect(GlobalConstants.doubleBattleAbilities.length).toBeGreaterThan(0);
    });

    it("has duplicateAbilities as a non-empty array", () => {
      expect(GlobalConstants.duplicateAbilities.length).toBeGreaterThan(0);
    });
  });

  describe("move classification lists", () => {
    it("has uselessMoves including Splash and Celebrate", () => {
      expect(GlobalConstants.uselessMoves).toContain(Moves.splash);
      expect(GlobalConstants.uselessMoves).toContain(Moves.celebrate);
    });

    it("has noPowerNonStatusMoves as a non-empty array", () => {
      expect(GlobalConstants.noPowerNonStatusMoves.length).toBeGreaterThan(0);
    });

    it("has cannotBeObsoletedMoves as a non-empty array", () => {
      expect(GlobalConstants.cannotBeObsoletedMoves.length).toBeGreaterThan(0);
    });

    it("has cannotObsoleteMoves including Focus Punch and Explosion", () => {
      expect(GlobalConstants.cannotObsoleteMoves).toContain(Moves.focusPunch);
      expect(GlobalConstants.cannotObsoleteMoves).toContain(Moves.explosion);
    });

    it("has doubleBattleMoves as a non-empty array", () => {
      expect(GlobalConstants.doubleBattleMoves.length).toBeGreaterThan(0);
    });

    it("has requiresOtherMove including Dream Eater", () => {
      expect(GlobalConstants.requiresOtherMove).toContain(Moves.dreamEater);
      expect(GlobalConstants.requiresOtherMove).toContain(Moves.spitUp);
    });
  });
});
