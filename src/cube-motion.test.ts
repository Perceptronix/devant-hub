import { describe, expect, it } from "vitest";
import { Morph, Reveal, Rise } from "cube-motion/react";

describe("cube-motion integration", () => {
  it("resolves the React animation components", () => {
    expect(Rise).toBeDefined();
    expect(Reveal).toBeDefined();
    expect(Morph).toBeDefined();
  });
});
