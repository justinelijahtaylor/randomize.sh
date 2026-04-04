import { describe, it, expect } from "vitest";
import * as Items from "../items";

describe("Items constants", () => {
  describe("Poke Balls", () => {
    it("has Master Ball = 1", () => {
      expect(Items.masterBall).toBe(1);
    });

    it("has Ultra Ball = 2", () => {
      expect(Items.ultraBall).toBe(2);
    });

    it("has Great Ball = 3", () => {
      expect(Items.greatBall).toBe(3);
    });

    it("has Poke Ball = 4", () => {
      expect(Items.pokeBall).toBe(4);
    });

    it("has Safari Ball = 5", () => {
      expect(Items.safariBall).toBe(5);
    });

    it("has Quick Ball = 15", () => {
      expect(Items.quickBall).toBe(15);
    });
  });

  describe("healing items", () => {
    it("has Potion = 17", () => {
      expect(Items.potion).toBe(17);
    });

    it("has Antidote = 18", () => {
      expect(Items.antidote).toBe(18);
    });

    it("has Full Restore = 23", () => {
      expect(Items.fullRestore).toBe(23);
    });

    it("has Max Potion = 24", () => {
      expect(Items.maxPotion).toBe(24);
    });

    it("has Revive = 28", () => {
      expect(Items.revive).toBe(28);
    });
  });

  describe("stat boost items", () => {
    it("has Rare Candy = 50", () => {
      expect(Items.rareCandy).toBe(50);
    });

    it("has HP Up = 45", () => {
      expect(Items.hpUp).toBe(45);
    });

    it("has Protein = 46", () => {
      expect(Items.protein).toBe(46);
    });

    it("has Iron = 47", () => {
      expect(Items.iron).toBe(47);
    });

    it("has Carbos = 48", () => {
      expect(Items.carbos).toBe(48);
    });

    it("has Calcium = 49", () => {
      expect(Items.calcium).toBe(49);
    });
  });

  describe("battle items", () => {
    it("has Guard Spec = 55", () => {
      expect(Items.guardSpec).toBe(55);
    });

    it("has Dire Hit = 56", () => {
      expect(Items.direHit).toBe(56);
    });

    it("has X Attack = 57", () => {
      expect(Items.xAttack).toBe(57);
    });

    it("has X Defense = 58", () => {
      expect(Items.xDefense).toBe(58);
    });

    it("has X Speed = 59", () => {
      expect(Items.xSpeed).toBe(59);
    });

    it("has X Accuracy = 60", () => {
      expect(Items.xAccuracy).toBe(60);
    });

    it("has X Sp. Atk = 61", () => {
      expect(Items.xSpAtk).toBe(61);
    });

    it("has X Sp. Def = 62", () => {
      expect(Items.xSpDef).toBe(62);
    });
  });

  describe("key items", () => {
    it("has Town Map = 442", () => {
      expect(Items.townMap).toBe(442);
    });

    it("has VS Seeker = 443", () => {
      expect(Items.vsSeeker).toBe(443);
    });

    it("has Old Rod = 445", () => {
      expect(Items.oldRod).toBe(445);
    });

    it("has Good Rod = 446", () => {
      expect(Items.goodRod).toBe(446);
    });

    it("has Super Rod = 447", () => {
      expect(Items.superRod).toBe(447);
    });

    it("has Exp. Share = 216", () => {
      expect(Items.expShare).toBe(216);
    });
  });

  describe("item ordering", () => {
    it("has None = 0 as the first item", () => {
      expect(Items.none).toBe(0);
    });

    it("has balls grouped at the start", () => {
      expect(Items.masterBall).toBeLessThan(Items.potion);
    });

    it("has healing items grouped together", () => {
      expect(Items.potion).toBeLessThan(Items.rareCandy);
      expect(Items.antidote).toBeLessThan(Items.fullRestore);
    });
  });
});
