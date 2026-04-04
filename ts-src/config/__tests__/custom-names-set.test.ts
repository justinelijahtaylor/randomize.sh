import { describe, it, expect } from "vitest";
import { CustomNamesSet } from "../custom-names-set";

describe("CustomNamesSet", () => {
  describe("default construction", () => {
    it("creates empty lists by default", () => {
      const cns = new CustomNamesSet();
      expect(cns.getTrainerNames()).toEqual([]);
      expect(cns.getTrainerClasses()).toEqual([]);
      expect(cns.getDoublesTrainerNames()).toEqual([]);
      expect(cns.getDoublesTrainerClasses()).toEqual([]);
      expect(cns.getPokemonNicknames()).toEqual([]);
    });
  });

  describe("setters and getters", () => {
    it("can set and get trainer names", () => {
      const cns = new CustomNamesSet();
      cns.setTrainerNames(["Ash", "Misty", "Brock"]);
      expect(cns.getTrainerNames()).toEqual(["Ash", "Misty", "Brock"]);
    });

    it("can set and get trainer classes", () => {
      const cns = new CustomNamesSet();
      cns.setTrainerClasses(["Leader", "Elite"]);
      expect(cns.getTrainerClasses()).toEqual(["Leader", "Elite"]);
    });

    it("can set and get doubles trainer names", () => {
      const cns = new CustomNamesSet();
      cns.setDoublesTrainerNames(["Red & Blue"]);
      expect(cns.getDoublesTrainerNames()).toEqual(["Red & Blue"]);
    });

    it("can set and get doubles trainer classes", () => {
      const cns = new CustomNamesSet();
      cns.setDoublesTrainerClasses(["Couple"]);
      expect(cns.getDoublesTrainerClasses()).toEqual(["Couple"]);
    });

    it("can set and get pokemon nicknames", () => {
      const cns = new CustomNamesSet();
      cns.setPokemonNicknames(["Sparky", "Zippy"]);
      expect(cns.getPokemonNicknames()).toEqual(["Sparky", "Zippy"]);
    });

    it("returns copies, not references", () => {
      const cns = new CustomNamesSet();
      cns.setTrainerNames(["Ash"]);
      const names = cns.getTrainerNames();
      // Modifying the returned array should not affect the internal state
      (names as string[]).push("Misty");
      expect(cns.getTrainerNames()).toEqual(["Ash"]);
    });
  });

  describe("binary serialization round-trip", () => {
    it("round-trips empty custom names", () => {
      const original = new CustomNamesSet();
      const bytes = original.getBytes();
      const restored = new CustomNamesSet(bytes);

      expect(restored.getTrainerNames()).toEqual([]);
      expect(restored.getTrainerClasses()).toEqual([]);
      expect(restored.getDoublesTrainerNames()).toEqual([]);
      expect(restored.getDoublesTrainerClasses()).toEqual([]);
      expect(restored.getPokemonNicknames()).toEqual([]);
    });

    it("round-trips populated custom names", () => {
      const original = new CustomNamesSet();
      original.setTrainerNames(["Ash", "Gary", "Red"]);
      original.setTrainerClasses(["Leader", "Champion"]);
      original.setDoublesTrainerNames(["Jessie & James"]);
      original.setDoublesTrainerClasses(["Team Rocket"]);
      original.setPokemonNicknames(["Pikachu", "Charizard"]);

      const bytes = original.getBytes();
      const restored = new CustomNamesSet(bytes);

      expect(restored.getTrainerNames()).toEqual(["Ash", "Gary", "Red"]);
      expect(restored.getTrainerClasses()).toEqual(["Leader", "Champion"]);
      expect(restored.getDoublesTrainerNames()).toEqual(["Jessie & James"]);
      expect(restored.getDoublesTrainerClasses()).toEqual(["Team Rocket"]);
      expect(restored.getPokemonNicknames()).toEqual(["Pikachu", "Charizard"]);
    });

    it("first byte is version 1", () => {
      const cns = new CustomNamesSet();
      const bytes = cns.getBytes();
      expect(bytes[0]).toBe(1);
    });

    it("rejects invalid version", () => {
      const cns = new CustomNamesSet();
      const bytes = cns.getBytes();
      // Change version to 2
      bytes[0] = 2;
      expect(() => new CustomNamesSet(bytes)).toThrow(
        "Invalid custom names file provided."
      );
    });

    it("handles unicode names", () => {
      const original = new CustomNamesSet();
      original.setTrainerNames(["Pikachu", "Raichu"]);
      original.setPokemonNicknames(["Pika"]);

      const bytes = original.getBytes();
      const restored = new CustomNamesSet(bytes);

      expect(restored.getTrainerNames()).toEqual(["Pikachu", "Raichu"]);
      expect(restored.getPokemonNicknames()).toEqual(["Pika"]);
    });
  });
});
