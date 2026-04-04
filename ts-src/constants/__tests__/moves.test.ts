import { describe, it, expect } from "vitest";
import * as Moves from "../moves";

describe("Moves constants", () => {
  describe("Gen 1 moves", () => {
    it("has Pound = 1", () => {
      expect(Moves.pound).toBe(1);
    });

    it("has Tackle = 33", () => {
      expect(Moves.tackle).toBe(33);
    });

    it("has Surf = 57", () => {
      expect(Moves.surf).toBe(57);
    });

    it("has Flamethrower = 53", () => {
      expect(Moves.flamethrower).toBe(53);
    });

    it("has Thunderbolt = 85", () => {
      expect(Moves.thunderbolt).toBe(85);
    });

    it("has Hyper Beam = 63", () => {
      expect(Moves.hyperBeam).toBe(63);
    });

    it("has Ice Beam = 58", () => {
      expect(Moves.iceBeam).toBe(58);
    });

    it("has Earthquake = 89", () => {
      expect(Moves.earthquake).toBe(89);
    });

    it("has Psychic = 94", () => {
      expect(Moves.psychic).toBe(94);
    });

    it("has Struggle = 165", () => {
      expect(Moves.struggle).toBe(165);
    });
  });

  describe("HM moves", () => {
    it("has Cut = 15", () => {
      expect(Moves.cut).toBe(15);
    });

    it("has Fly = 19", () => {
      expect(Moves.fly).toBe(19);
    });

    it("has Strength = 70", () => {
      expect(Moves.strength).toBe(70);
    });

    it("has Flash = 148", () => {
      expect(Moves.flash).toBe(148);
    });

    it("has Waterfall = 127", () => {
      expect(Moves.waterfall).toBe(127);
    });
  });

  describe("Gen 2 moves", () => {
    it("has Sacred Fire = 221", () => {
      expect(Moves.sacredFire).toBe(221);
    });

    it("has Aeroblast = 177", () => {
      expect(Moves.aeroblast).toBe(177);
    });
  });

  describe("Gen 3 moves", () => {
    it("has Overheat = 315", () => {
      expect(Moves.overheat).toBe(315);
    });

    it("has Leaf Blade = 348", () => {
      expect(Moves.leafBlade).toBe(348);
    });
  });

  describe("Gen 4 moves", () => {
    it("has Close Combat = 370", () => {
      expect(Moves.closeCombat).toBe(370);
    });

    it("has Draco Meteor = 434", () => {
      expect(Moves.dracoMeteor).toBe(434);
    });

    it("has Shadow Force = 467", () => {
      expect(Moves.shadowForce).toBe(467);
    });
  });

  describe("Gen 5 moves", () => {
    it("has V-Create = 557", () => {
      expect(Moves.vCreate).toBe(557);
    });

    it("has Scald = 503", () => {
      expect(Moves.scald).toBe(503);
    });
  });

  describe("Gen 6 moves", () => {
    it("has Play Rough = 583", () => {
      expect(Moves.playRough).toBe(583);
    });

    it("has Moonblast = 585", () => {
      expect(Moves.moonblast).toBe(585);
    });

    it("has Dazzling Gleam = 605", () => {
      expect(Moves.dazzlingGleam).toBe(605);
    });
  });

  describe("Gen 7 moves", () => {
    it("has Darkest Lariat = 663", () => {
      expect(Moves.darkestLariat).toBe(663);
    });

    it("has Liquidation = 710", () => {
      expect(Moves.liquidation).toBe(710);
    });
  });

  describe("Z-Moves", () => {
    it("has Breakneck Blitz Physical = 622", () => {
      expect(Moves.breakneckBlitzPhysical).toBe(622);
    });

    it("has Catastropika = 658", () => {
      expect(Moves.catastropika).toBe(658);
    });
  });

  describe("Gen 8 moves", () => {
    it("has Eerie Spell = 826 as the last move", () => {
      expect(Moves.eerieSpell).toBe(826);
    });

    it("has Dynamax Cannon = 744", () => {
      expect(Moves.dynamaxCannon).toBe(744);
    });

    it("has Body Press = 776", () => {
      expect(Moves.bodyPress).toBe(776);
    });
  });

  describe("total move count", () => {
    it("exports 826 move constants", () => {
      const moveKeys = Object.keys(Moves).filter(
        (key) => typeof (Moves as Record<string, unknown>)[key] === "number"
      );
      expect(moveKeys.length).toBe(826);
    });
  });

  describe("move ordering", () => {
    it("has Gen 1 moves before Gen 2 moves", () => {
      expect(Moves.struggle).toBeLessThan(Moves.sacredFire);
    });

    it("has Gen 4 moves before Gen 5 moves", () => {
      expect(Moves.shadowForce).toBeLessThan(Moves.psyshock);
    });

    it("has consecutive numbering for sequential moves", () => {
      expect(Moves.pound).toBe(1);
      expect(Moves.karateChop).toBe(2);
      expect(Moves.doubleSlap).toBe(3);
    });
  });
});
