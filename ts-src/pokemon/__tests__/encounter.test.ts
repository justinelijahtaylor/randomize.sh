import { describe, it, expect } from "vitest";
import { Encounter } from "../encounter";
import { EncounterSet } from "../encounter-set";
import { Pokemon } from "../pokemon";
import { Type } from "../type";

function makePokemon(number: number, name: string): Pokemon {
  const p = new Pokemon();
  p.number = number;
  p.name = name;
  p.primaryType = Type.NORMAL;
  return p;
}

describe("Encounter construction", () => {
  it("has default field values", () => {
    const e = new Encounter();
    expect(e.level).toBe(0);
    expect(e.maxLevel).toBe(0);
    expect(e.pokemon).toBeNull();
    expect(e.formeNumber).toBe(0);
    expect(e.isSOS).toBe(false);
    expect(e.sosType).toBeNull();
  });

  it("allows setting fields", () => {
    const e = new Encounter();
    const pikachu = makePokemon(25, "Pikachu");
    e.pokemon = pikachu;
    e.level = 10;
    e.maxLevel = 15;

    expect(e.pokemon.name).toBe("Pikachu");
    expect(e.level).toBe(10);
    expect(e.maxLevel).toBe(15);
  });
});

describe("Encounter toString", () => {
  it("returns ERROR when pokemon is null", () => {
    const e = new Encounter();
    expect(e.toString()).toBe("ERROR");
  });

  it("shows single level when maxLevel is 0", () => {
    const e = new Encounter();
    e.pokemon = makePokemon(25, "Pikachu");
    e.level = 10;
    expect(e.toString()).toBe("Pikachu Lv10");
  });

  it("shows level range when maxLevel is set", () => {
    const e = new Encounter();
    e.pokemon = makePokemon(25, "Pikachu");
    e.level = 10;
    e.maxLevel = 15;
    expect(e.toString()).toBe("Pikachu Lvs 10-15");
  });
});

describe("EncounterSet construction", () => {
  it("has default field values", () => {
    const es = new EncounterSet();
    expect(es.rate).toBe(0);
    expect(es.encounters).toEqual([]);
    expect(es.bannedPokemon).toBeInstanceOf(Set);
    expect(es.bannedPokemon.size).toBe(0);
    expect(es.displayName).toBeNull();
    expect(es.offset).toBe(0);
  });

  it("manages a list of encounters", () => {
    const es = new EncounterSet();
    const e1 = new Encounter();
    e1.pokemon = makePokemon(25, "Pikachu");
    e1.level = 10;

    const e2 = new Encounter();
    e2.pokemon = makePokemon(133, "Eevee");
    e2.level = 12;

    es.encounters.push(e1, e2);
    expect(es.encounters).toHaveLength(2);
    expect(es.encounters[0].pokemon!.name).toBe("Pikachu");
    expect(es.encounters[1].pokemon!.name).toBe("Eevee");
  });

  it("supports banned pokemon set", () => {
    const es = new EncounterSet();
    const pikachu = makePokemon(25, "Pikachu");
    es.bannedPokemon.add(pikachu);
    expect(es.bannedPokemon.has(pikachu)).toBe(true);
    expect(es.bannedPokemon.size).toBe(1);
  });
});
