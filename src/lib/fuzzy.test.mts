import { describe, it, expect } from "vitest";
import { queryVariants, rankByMatch, similarity } from "./fuzzy";

describe("forgiving search", () => {
  it("turns 'spidermen' into a Spider-Man query", () => {
    expect(queryVariants("spidermen")).toContain("spider man");
  });
  it("ranks Spider-Man first for a misspelling", () => {
    const ranked = rankByMatch("spidermen", [{ title: "Men in Black" }, { title: "Spider-Man: No Way Home" }, { title: "Superman" }]);
    expect(ranked[0].title).toBe("Spider-Man: No Way Home");
  });
  it("scores an exact title as a perfect match", () => {
    expect(similarity("Dune", "Dune")).toBe(1);
  });
});
