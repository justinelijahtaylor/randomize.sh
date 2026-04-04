import { describe, it, expect } from "vitest";
import * as Abilities from "../abilities";

describe("Abilities constants", () => {
  describe("first abilities", () => {
    it("has Stench = 1", () => {
      expect(Abilities.stench).toBe(1);
    });

    it("has Drizzle = 2", () => {
      expect(Abilities.drizzle).toBe(2);
    });

    it("has Speed Boost = 3", () => {
      expect(Abilities.speedBoost).toBe(3);
    });

    it("has Battle Armor = 4", () => {
      expect(Abilities.battleArmor).toBe(4);
    });

    it("has Sturdy = 5", () => {
      expect(Abilities.sturdy).toBe(5);
    });
  });

  describe("notable Gen 3 abilities", () => {
    it("has Intimidate = 22", () => {
      expect(Abilities.intimidate).toBe(22);
    });

    it("has Wonder Guard = 25", () => {
      expect(Abilities.wonderGuard).toBe(25);
    });

    it("has Levitate = 26", () => {
      expect(Abilities.levitate).toBe(26);
    });

    it("has Huge Power = 37", () => {
      expect(Abilities.hugePower).toBe(37);
    });

    it("has Shadow Tag = 23", () => {
      expect(Abilities.shadowTag).toBe(23);
    });

    it("has Drought = 70", () => {
      expect(Abilities.drought).toBe(70);
    });
  });

  describe("starter abilities", () => {
    it("has Overgrow = 65", () => {
      expect(Abilities.overgrow).toBe(65);
    });

    it("has Blaze = 66", () => {
      expect(Abilities.blaze).toBe(66);
    });

    it("has Torrent = 67", () => {
      expect(Abilities.torrent).toBe(67);
    });
  });

  describe("Gen 4 abilities", () => {
    it("has Technician = 101", () => {
      expect(Abilities.technician).toBe(101);
    });

    it("has Mold Breaker = 104", () => {
      expect(Abilities.moldBreaker).toBe(104);
    });

    it("has Multitype = 121", () => {
      expect(Abilities.multitype).toBe(121);
    });
  });

  describe("Gen 5 abilities", () => {
    it("has Prankster = 158", () => {
      expect(Abilities.prankster).toBe(158);
    });

    it("has Moxie = 153", () => {
      expect(Abilities.moxie).toBe(153);
    });

    it("has Regenerator = 144", () => {
      expect(Abilities.regenerator).toBe(144);
    });
  });

  describe("Gen 6 abilities", () => {
    it("has Protean = 168", () => {
      expect(Abilities.protean).toBe(168);
    });

    it("has Pixilate = 182", () => {
      expect(Abilities.pixilate).toBe(182);
    });

    it("has Aura Break = 188", () => {
      expect(Abilities.auraBreak).toBe(188);
    });

    it("has Delta Stream = 191", () => {
      expect(Abilities.deltaStream).toBe(191);
    });
  });

  describe("Gen 7 abilities", () => {
    it("has Disguise = 209", () => {
      expect(Abilities.disguise).toBe(209);
    });

    it("has Beast Boost = 224", () => {
      expect(Abilities.beastBoost).toBe(224);
    });

    it("has Prism Armor = 232", () => {
      expect(Abilities.prismArmor).toBe(232);
    });

    it("has Neuroforce = 233", () => {
      expect(Abilities.neuroforce).toBe(233);
    });
  });

  describe("Gen 8 abilities", () => {
    it("has Libero = 236", () => {
      expect(Abilities.libero).toBe(236);
    });

    it("has As One (Chilling Neigh) as the last standard ability", () => {
      expect(Abilities.asOneGrimNeigh).toBe(267);
    });
  });

  describe("special name handling", () => {
    it("has Static with a workaround name to avoid keyword conflict", () => {
      expect(Abilities.staticTheAbilityNotTheKeyword).toBe(9);
    });
  });

  describe("total ability count", () => {
    it("exports 267 ability constants", () => {
      const abilityKeys = Object.keys(Abilities).filter(
        (key) => typeof (Abilities as Record<string, unknown>)[key] === "number"
      );
      expect(abilityKeys.length).toBe(267);
    });
  });
});
