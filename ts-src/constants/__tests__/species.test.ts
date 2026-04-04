import { describe, it, expect } from "vitest";
import * as Species from "../species";

describe("Species constants", () => {
  describe("Gen 1 starters", () => {
    it("has Bulbasaur = 1", () => {
      expect(Species.bulbasaur).toBe(1);
    });

    it("has Charmander = 4", () => {
      expect(Species.charmander).toBe(4);
    });

    it("has Squirtle = 7", () => {
      expect(Species.squirtle).toBe(7);
    });
  });

  describe("iconic Gen 1 Pokemon", () => {
    it("has Pikachu = 25", () => {
      expect(Species.pikachu).toBe(25);
    });

    it("has Mewtwo = 150", () => {
      expect(Species.mewtwo).toBe(150);
    });

    it("has Mew = 151", () => {
      expect(Species.mew).toBe(151);
    });

    it("has Eevee = 133", () => {
      expect(Species.eevee).toBe(133);
    });
  });

  describe("Gen 1 order consistency", () => {
    it("has starters in expected order", () => {
      expect(Species.bulbasaur).toBeLessThan(Species.charmander);
      expect(Species.charmander).toBeLessThan(Species.squirtle);
    });

    it("has evolution chains in sequence", () => {
      expect(Species.bulbasaur + 1).toBe(Species.ivysaur);
      expect(Species.ivysaur + 1).toBe(Species.venusaur);
      expect(Species.charmander + 1).toBe(Species.charmeleon);
      expect(Species.charmeleon + 1).toBe(Species.charizard);
      expect(Species.squirtle + 1).toBe(Species.wartortle);
      expect(Species.wartortle + 1).toBe(Species.blastoise);
    });
  });

  describe("Gen 2 starters", () => {
    it("has Chikorita = 152", () => {
      expect(Species.chikorita).toBe(152);
    });

    it("has Cyndaquil = 155", () => {
      expect(Species.cyndaquil).toBe(155);
    });

    it("has Totodile = 158", () => {
      expect(Species.totodile).toBe(158);
    });
  });

  describe("Gen 2 legendaries", () => {
    it("has Lugia = 249", () => {
      expect(Species.lugia).toBe(249);
    });

    it("has HoOh = 250", () => {
      expect(Species.hoOh).toBe(250);
    });

    it("has Celebi = 251", () => {
      expect(Species.celebi).toBe(251);
    });
  });

  describe("Gen 3 starters", () => {
    it("has Treecko = 252", () => {
      expect(Species.treecko).toBe(252);
    });

    it("has Torchic = 255", () => {
      expect(Species.torchic).toBe(255);
    });

    it("has Mudkip = 258", () => {
      expect(Species.mudkip).toBe(258);
    });
  });

  describe("Gen 4 Pokemon", () => {
    it("has Arceus = 493", () => {
      expect(Species.arceus).toBe(493);
    });

    it("has Dialga = 483", () => {
      expect(Species.dialga).toBe(483);
    });

    it("has Palkia = 484", () => {
      expect(Species.palkia).toBe(484);
    });

    it("has Giratina = 487", () => {
      expect(Species.giratina).toBe(487);
    });
  });

  describe("Gen 5 Pokemon", () => {
    it("has Victini = 494", () => {
      expect(Species.victini).toBe(494);
    });

    it("has Genesect = 649", () => {
      expect(Species.genesect).toBe(649);
    });
  });

  describe("Gen 6 Pokemon", () => {
    it("has Chespin = 650", () => {
      expect(Species.chespin).toBe(650);
    });

    it("has Volcanion = 721", () => {
      expect(Species.volcanion).toBe(721);
    });
  });

  describe("Gen 7 Pokemon", () => {
    it("has Rowlet = 722", () => {
      expect(Species.rowlet).toBe(722);
    });
  });

  describe("Gen 8 Pokemon", () => {
    it("has Calyrex = 898 as the last species constant", () => {
      expect(Species.calyrex).toBe(898);
    });

    it("has Eternatus = 890", () => {
      expect(Species.eternatus).toBe(890);
    });
  });

  describe("total species count", () => {
    it("exports 898 base species constants (Bulbasaur through Calyrex)", () => {
      // Count only numeric exports that are direct species (not namespace members)
      const speciesKeys = Object.keys(Species).filter(
        (key) =>
          typeof (Species as Record<string, unknown>)[key] === "number" &&
          key !== "Gen4Formes" &&
          key !== "Gen5Formes" &&
          key !== "Gen6Formes" &&
          key !== "Gen7Formes"
      );
      expect(speciesKeys.length).toBe(898);
    });
  });

  describe("Gen4Formes namespace", () => {
    it("has Deoxys-Attack form", () => {
      expect(Species.Gen4Formes.deoxysA).toBe(494);
    });

    it("has forme values above the base species count of 493", () => {
      expect(Species.Gen4Formes.deoxysA).toBeGreaterThan(Species.arceus);
    });
  });

  describe("Gen6Formes namespace", () => {
    it("has Mega Gengar", () => {
      expect(Species.Gen6Formes.gengarMega).toBe(747);
    });

    it("has Mega Charizard X and Y", () => {
      expect(Species.Gen6Formes.charizardMegaX).toBe(761);
      expect(Species.Gen6Formes.charizardMegaY).toBe(762);
    });

    it("has Mega Mewtwo X and Y", () => {
      expect(Species.Gen6Formes.mewtwoMegaX).toBe(763);
      expect(Species.Gen6Formes.mewtwoMegaY).toBe(764);
    });
  });
});
