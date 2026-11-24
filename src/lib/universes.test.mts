import { describe, it, expect } from "vitest";
import { UNIVERSES } from "./universes";

describe("cinematic universes", () => {
  it("has the 11 requested universes", () => {
    expect(UNIVERSES.map((u) => u.slug).sort()).toEqual(
      ["dc", "fast-and-furious", "harry-potter", "jurassic", "lotr", "marvel", "mission-impossible", "narnia", "star-wars", "conjuring", "terminator"].sort(),
    );
  });
  it("lists each group in release order", () => {
    for (const u of UNIVERSES) for (const g of u.groups) {
      const dates = g.items.map((i) => i.releaseDate ?? "9999");
      expect(dates).toEqual([...dates].sort());
    }
  });
});
