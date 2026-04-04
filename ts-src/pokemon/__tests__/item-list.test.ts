import { describe, it, expect } from "vitest";
import { ItemList } from "../item-list";

describe("ItemList construction", () => {
  it("allows items 1 through highestIndex by default", () => {
    const list = new ItemList(10);
    expect(list.isAllowed(0)).toBe(false); // index 0 is always disallowed
    expect(list.isAllowed(1)).toBe(true);
    expect(list.isAllowed(10)).toBe(true);
  });

  it("disallows index 0", () => {
    const list = new ItemList(5);
    expect(list.isAllowed(0)).toBe(false);
  });

  it("disallows out-of-range indexes", () => {
    const list = new ItemList(5);
    expect(list.isAllowed(6)).toBe(false);
    expect(list.isAllowed(-1)).toBe(false);
  });

  it("no items are TMs by default", () => {
    const list = new ItemList(10);
    for (let i = 0; i <= 10; i++) {
      expect(list.isTM(i)).toBe(false);
    }
  });
});

describe("banSingles()", () => {
  it("bans individual item indexes", () => {
    const list = new ItemList(10);
    list.banSingles(3, 5, 7);
    expect(list.isAllowed(3)).toBe(false);
    expect(list.isAllowed(5)).toBe(false);
    expect(list.isAllowed(7)).toBe(false);
    expect(list.isAllowed(4)).toBe(true);
    expect(list.isAllowed(6)).toBe(true);
  });
});

describe("banRange()", () => {
  it("bans a range of item indexes", () => {
    const list = new ItemList(10);
    list.banRange(3, 4); // bans 3, 4, 5, 6
    expect(list.isAllowed(2)).toBe(true);
    expect(list.isAllowed(3)).toBe(false);
    expect(list.isAllowed(4)).toBe(false);
    expect(list.isAllowed(5)).toBe(false);
    expect(list.isAllowed(6)).toBe(false);
    expect(list.isAllowed(7)).toBe(true);
  });
});

describe("isTM() and tmRange()", () => {
  it("marks a range as TMs", () => {
    const list = new ItemList(20);
    list.tmRange(10, 5); // marks 10, 11, 12, 13, 14 as TMs
    expect(list.isTM(9)).toBe(false);
    expect(list.isTM(10)).toBe(true);
    expect(list.isTM(14)).toBe(true);
    expect(list.isTM(15)).toBe(false);
  });

  it("isTM returns false for out-of-range", () => {
    const list = new ItemList(5);
    expect(list.isTM(6)).toBe(false);
    expect(list.isTM(-1)).toBe(false);
  });
});

describe("randomItem()", () => {
  it("returns an allowed item", () => {
    const list = new ItemList(5);
    // With a random that always returns a value mapping to index 3
    const item = list.randomItem(() => 3 / 6); // floor(3/6 * 6) = 3
    expect(list.isAllowed(item)).toBe(true);
  });

  it("skips banned items", () => {
    const list = new ItemList(5);
    list.banSingles(1, 2, 3, 4);
    // Only item 5 is allowed. Random will eventually hit it.
    let callCount = 0;
    const item = list.randomItem(() => {
      callCount++;
      // Return values that cycle through all possible indices until we hit 5
      return (callCount % 6) / 6;
    });
    expect(item).toBe(5);
  });
});

describe("randomNonTM()", () => {
  it("returns an allowed non-TM item", () => {
    const list = new ItemList(10);
    list.tmRange(1, 5); // 1-5 are TMs
    // Only items 6-10 are non-TM
    let callCount = 0;
    const item = list.randomNonTM(() => {
      callCount++;
      return ((callCount * 3 + 5) % 11) / 11;
    });
    expect(list.isAllowed(item)).toBe(true);
    expect(list.isTM(item)).toBe(false);
  });
});

describe("randomTM()", () => {
  it("returns a TM item", () => {
    const list = new ItemList(10);
    list.tmRange(5, 3); // 5, 6, 7 are TMs
    let callCount = 0;
    const item = list.randomTM(() => {
      callCount++;
      return ((callCount * 2 + 4) % 11) / 11;
    });
    expect(list.isTM(item)).toBe(true);
  });
});

describe("copy()", () => {
  it("copies item and TM state", () => {
    const list = new ItemList(10);
    list.banSingles(3);
    list.tmRange(5, 2);

    const copy = list.copy();
    expect(copy.isAllowed(3)).toBe(false);
    expect(copy.isAllowed(4)).toBe(true);
    expect(copy.isTM(5)).toBe(true);
    expect(copy.isTM(6)).toBe(true);
    expect(copy.isTM(7)).toBe(false);
  });

  it("can copy with a different max", () => {
    const list = new ItemList(10);
    list.banSingles(3);

    const copy = list.copy(5);
    expect(copy.isAllowed(3)).toBe(false);
    expect(copy.isAllowed(4)).toBe(true);
    // Items beyond new max are not accessible
    expect(copy.isAllowed(6)).toBe(false);
  });
});
