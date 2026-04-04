import { describe, it, expect } from "vitest";
import { Move, MoveStatChange } from "../move";
import { MoveCategory } from "../move-category";
import { StatChangeMoveType } from "../stat-change-move-type";
import { StatChangeType } from "../stat-change-type";
import { Type } from "../type";

describe("MoveCategory enum", () => {
  it("has PHYSICAL, SPECIAL, and STATUS", () => {
    expect(MoveCategory.PHYSICAL).toBeDefined();
    expect(MoveCategory.SPECIAL).toBeDefined();
    expect(MoveCategory.STATUS).toBeDefined();
  });

  it("has distinct values", () => {
    const values = new Set([MoveCategory.PHYSICAL, MoveCategory.SPECIAL, MoveCategory.STATUS]);
    expect(values.size).toBe(3);
  });
});

describe("Move construction", () => {
  it("has default field values after construction", () => {
    const m = new Move();
    expect(m.name).toBe("");
    expect(m.number).toBe(0);
    expect(m.power).toBe(0);
    expect(m.pp).toBe(0);
    expect(m.hitratio).toBe(0);
    expect(m.priority).toBe(0);
    expect(m.hitCount).toBe(1);
    expect(m.makesContact).toBe(false);
  });

  it("initializes statChanges array with 3 NONE entries", () => {
    const m = new Move();
    expect(m.statChanges).toHaveLength(3);
    for (const sc of m.statChanges) {
      expect(sc).toBeInstanceOf(MoveStatChange);
      expect(sc.type).toBe(StatChangeType.NONE);
      expect(sc.stages).toBe(0);
      expect(sc.percentChance).toBe(0);
    }
  });

  it("allows setting and reading fields", () => {
    const m = new Move();
    m.name = "Thunderbolt";
    m.number = 85;
    m.power = 90;
    m.pp = 15;
    m.hitratio = 100;
    m.type = Type.ELECTRIC;
    m.category = MoveCategory.SPECIAL;

    expect(m.name).toBe("Thunderbolt");
    expect(m.number).toBe(85);
    expect(m.power).toBe(90);
    expect(m.type).toBe(Type.ELECTRIC);
    expect(m.category).toBe(MoveCategory.SPECIAL);
  });
});

describe("hasBeneficialStatChange()", () => {
  it("returns true when DAMAGE_TARGET with negative stages (lowers target stats)", () => {
    const m = new Move();
    m.statChangeMoveType = StatChangeMoveType.DAMAGE_TARGET;
    m.statChanges[0].type = StatChangeType.DEFENSE;
    m.statChanges[0].stages = -1;
    expect(m.hasBeneficialStatChange()).toBe(true);
  });

  it("returns true when DAMAGE_USER with positive stages (boosts own stats)", () => {
    const m = new Move();
    m.statChangeMoveType = StatChangeMoveType.DAMAGE_USER;
    m.statChanges[0].type = StatChangeType.ATTACK;
    m.statChanges[0].stages = 1;
    expect(m.hasBeneficialStatChange()).toBe(true);
  });

  it("returns false when DAMAGE_TARGET with positive stages (boosts target)", () => {
    const m = new Move();
    m.statChangeMoveType = StatChangeMoveType.DAMAGE_TARGET;
    m.statChanges[0].type = StatChangeType.ATTACK;
    m.statChanges[0].stages = 1;
    expect(m.hasBeneficialStatChange()).toBe(false);
  });

  it("returns false when DAMAGE_USER with negative stages (lowers own stats)", () => {
    const m = new Move();
    m.statChangeMoveType = StatChangeMoveType.DAMAGE_USER;
    m.statChanges[0].type = StatChangeType.SPEED;
    m.statChanges[0].stages = -1;
    expect(m.hasBeneficialStatChange()).toBe(false);
  });

  it("returns false when statChangeMoveType is NONE_OR_UNKNOWN", () => {
    const m = new Move();
    m.statChangeMoveType = StatChangeMoveType.NONE_OR_UNKNOWN;
    expect(m.hasBeneficialStatChange()).toBe(false);
  });
});

describe("hasSpecificStatChange()", () => {
  it("returns true when a matching positive stat change exists", () => {
    const m = new Move();
    m.statChanges[0].type = StatChangeType.ATTACK;
    m.statChanges[0].stages = 2;
    expect(m.hasSpecificStatChange(StatChangeType.ATTACK, true)).toBe(true);
  });

  it("returns true when a matching negative stat change exists", () => {
    const m = new Move();
    m.statChanges[1].type = StatChangeType.DEFENSE;
    m.statChanges[1].stages = -1;
    expect(m.hasSpecificStatChange(StatChangeType.DEFENSE, false)).toBe(true);
  });

  it("returns false when no matching stat change exists", () => {
    const m = new Move();
    expect(m.hasSpecificStatChange(StatChangeType.SPEED, true)).toBe(false);
  });

  it("returns false when stat type matches but direction does not", () => {
    const m = new Move();
    m.statChanges[0].type = StatChangeType.ATTACK;
    m.statChanges[0].stages = -1;
    expect(m.hasSpecificStatChange(StatChangeType.ATTACK, true)).toBe(false);
  });
});

describe("isGoodDamaging()", () => {
  it("returns true for high-power moves", () => {
    const m = new Move();
    m.power = 100;
    m.hitratio = 100;
    expect(m.isGoodDamaging(101)).toBe(true);
  });

  it("returns true for medium power with good accuracy", () => {
    const m = new Move();
    m.power = 60;
    m.hitratio = 95;
    expect(m.isGoodDamaging(101)).toBe(true);
  });

  it("returns false for low power with low accuracy", () => {
    const m = new Move();
    m.power = 40;
    m.hitratio = 80;
    expect(m.isGoodDamaging(101)).toBe(false);
  });

  it("considers hitCount for multi-hit moves", () => {
    const m = new Move();
    m.power = 25;
    m.hitCount = 4;
    m.hitratio = 100;
    // 25 * 4 = 100 >= 2 * 50
    expect(m.isGoodDamaging(101)).toBe(true);
  });

  it("treats perfectAccuracy hitratio as good accuracy", () => {
    const m = new Move();
    m.power = 50;
    m.hitratio = 0; // perfect accuracy marker
    expect(m.isGoodDamaging(0)).toBe(true);
  });
});

describe("MoveStatChange", () => {
  it("equals checks all fields", () => {
    const a = new MoveStatChange();
    a.type = StatChangeType.ATTACK;
    a.stages = 2;
    a.percentChance = 100;

    const b = new MoveStatChange();
    b.type = StatChangeType.ATTACK;
    b.stages = 2;
    b.percentChance = 100;

    expect(a.equals(b)).toBe(true);

    b.stages = 1;
    expect(a.equals(b)).toBe(false);
  });
});
