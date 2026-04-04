import { describe, it, expect } from "vitest";
import { Trainer, MultiBattleStatus } from "../trainer";
import { TrainerPokemon } from "../trainer-pokemon";
import { Pokemon } from "../pokemon";
import { Type } from "../type";

function makePokemon(number: number, name: string): Pokemon {
  const p = new Pokemon();
  p.number = number;
  p.name = name;
  p.primaryType = Type.NORMAL;
  return p;
}

function makeTrainerPokemon(poke: Pokemon, level: number, heldItem: number = 0): TrainerPokemon {
  const tp = new TrainerPokemon();
  tp.pokemon = poke;
  tp.level = level;
  tp.heldItem = heldItem;
  return tp;
}

describe("MultiBattleStatus enum", () => {
  it("has NEVER, POTENTIAL, and ALWAYS", () => {
    expect(MultiBattleStatus.NEVER).toBeDefined();
    expect(MultiBattleStatus.POTENTIAL).toBeDefined();
    expect(MultiBattleStatus.ALWAYS).toBeDefined();
  });
});

describe("Trainer construction", () => {
  it("has default field values", () => {
    const t = new Trainer();
    expect(t.offset).toBe(0);
    expect(t.index).toBe(0);
    expect(t.pokemon).toEqual([]);
    expect(t.tag).toBeNull();
    expect(t.importantTrainer).toBe(false);
    expect(t.poketype).toBe(0);
    expect(t.name).toBeNull();
    expect(t.multiBattleStatus).toBe(MultiBattleStatus.NEVER);
    expect(t.forceStarterPosition).toBe(-1);
    expect(t.requiresUniqueHeldItems).toBe(false);
  });

  it("manages a pokemon list", () => {
    const t = new Trainer();
    const pikachu = makePokemon(25, "Pikachu");
    const tp = makeTrainerPokemon(pikachu, 15);
    t.pokemon.push(tp);

    expect(t.pokemon).toHaveLength(1);
    expect(t.pokemon[0].pokemon.name).toBe("Pikachu");
    expect(t.pokemon[0].level).toBe(15);
  });
});

describe("isBoss()", () => {
  it("returns true for ELITE tags", () => {
    const t = new Trainer();
    t.tag = "ELITE4-1";
    expect(t.isBoss()).toBe(true);
  });

  it("returns true for CHAMPION tags", () => {
    const t = new Trainer();
    t.tag = "CHAMPION-1";
    expect(t.isBoss()).toBe(true);
  });

  it("returns true for UBER tags", () => {
    const t = new Trainer();
    t.tag = "UBER-1";
    expect(t.isBoss()).toBe(true);
  });

  it("returns true for tags ending with LEADER", () => {
    const t = new Trainer();
    t.tag = "GYM1LEADER";
    expect(t.isBoss()).toBe(true);
  });

  it("returns false for null tag", () => {
    const t = new Trainer();
    expect(t.isBoss()).toBe(false);
  });

  it("returns false for non-boss tags", () => {
    const t = new Trainer();
    t.tag = "RIVAL1-2";
    expect(t.isBoss()).toBe(false);
  });
});

describe("isImportant()", () => {
  it("returns true for RIVAL tags", () => {
    const t = new Trainer();
    t.tag = "RIVAL2-3";
    expect(t.isImportant()).toBe(true);
  });

  it("returns true for FRIEND tags", () => {
    const t = new Trainer();
    t.tag = "FRIEND2-1";
    expect(t.isImportant()).toBe(true);
  });

  it("returns true for tags ending with STRONG", () => {
    const t = new Trainer();
    t.tag = "TEAMSTRONG";
    expect(t.isImportant()).toBe(true);
  });

  it("returns false for null tag", () => {
    const t = new Trainer();
    expect(t.isImportant()).toBe(false);
  });
});

describe("skipImportant()", () => {
  it("returns true for RIVAL1- tags", () => {
    const t = new Trainer();
    t.tag = "RIVAL1-2";
    expect(t.skipImportant()).toBe(true);
  });

  it("returns true for FRIEND1- tags", () => {
    const t = new Trainer();
    t.tag = "FRIEND1-3";
    expect(t.skipImportant()).toBe(true);
  });

  it("returns true for tags ending with NOTSTRONG", () => {
    const t = new Trainer();
    t.tag = "TEAMNOTSTRONG";
    expect(t.skipImportant()).toBe(true);
  });

  it("returns false for null tag", () => {
    const t = new Trainer();
    expect(t.skipImportant()).toBe(false);
  });
});

describe("poketype flags", () => {
  it("setPokemonHaveItems sets and clears the items flag", () => {
    const t = new Trainer();
    t.setPokemonHaveItems(true);
    expect(t.pokemonHaveItems()).toBe(true);
    t.setPokemonHaveItems(false);
    expect(t.pokemonHaveItems()).toBe(false);
  });

  it("setPokemonHaveCustomMoves sets and clears the moves flag", () => {
    const t = new Trainer();
    t.setPokemonHaveCustomMoves(true);
    expect(t.pokemonHaveCustomMoves()).toBe(true);
    t.setPokemonHaveCustomMoves(false);
    expect(t.pokemonHaveCustomMoves()).toBe(false);
  });

  it("items and custom moves flags are independent", () => {
    const t = new Trainer();
    t.setPokemonHaveItems(true);
    t.setPokemonHaveCustomMoves(true);
    expect(t.pokemonHaveItems()).toBe(true);
    expect(t.pokemonHaveCustomMoves()).toBe(true);

    t.setPokemonHaveItems(false);
    expect(t.pokemonHaveItems()).toBe(false);
    expect(t.pokemonHaveCustomMoves()).toBe(true);
  });
});

describe("pokemonHaveUniqueHeldItems()", () => {
  it("returns true when all held items are unique", () => {
    const t = new Trainer();
    const p1 = makeTrainerPokemon(makePokemon(1, "A"), 10, 100);
    const p2 = makeTrainerPokemon(makePokemon(2, "B"), 10, 200);
    t.pokemon.push(p1, p2);
    expect(t.pokemonHaveUniqueHeldItems()).toBe(true);
  });

  it("returns false when held items are duplicated", () => {
    const t = new Trainer();
    const p1 = makeTrainerPokemon(makePokemon(1, "A"), 10, 100);
    const p2 = makeTrainerPokemon(makePokemon(2, "B"), 10, 100);
    t.pokemon.push(p1, p2);
    expect(t.pokemonHaveUniqueHeldItems()).toBe(false);
  });

  it("returns true when no pokemon have held items", () => {
    const t = new Trainer();
    const p1 = makeTrainerPokemon(makePokemon(1, "A"), 10, 0);
    const p2 = makeTrainerPokemon(makePokemon(2, "B"), 10, 0);
    t.pokemon.push(p1, p2);
    expect(t.pokemonHaveUniqueHeldItems()).toBe(true);
  });

  it("returns true for empty pokemon list", () => {
    const t = new Trainer();
    expect(t.pokemonHaveUniqueHeldItems()).toBe(true);
  });
});

describe("equals and compareTo", () => {
  it("equals compares by index", () => {
    const a = new Trainer();
    a.index = 5;
    const b = new Trainer();
    b.index = 5;
    expect(a.equals(b)).toBe(true);

    b.index = 6;
    expect(a.equals(b)).toBe(false);
  });

  it("equals returns false for null", () => {
    const t = new Trainer();
    expect(t.equals(null)).toBe(false);
  });

  it("compareTo orders by index", () => {
    const a = new Trainer();
    a.index = 3;
    const b = new Trainer();
    b.index = 7;
    expect(a.compareTo(b)).toBeLessThan(0);
    expect(b.compareTo(a)).toBeGreaterThan(0);
  });
});
