import assert from "node:assert/strict";
import { test } from "node:test";
import { resolvedAppearance } from "./appearance.ts";

test("Soft Dark follows the effective dark mode and remains independent of appearance mode", () => {
  assert.equal(resolvedAppearance("system", true, false), "light");
  assert.equal(resolvedAppearance("system", true, true), "soft-dark");
  assert.equal(resolvedAppearance("system", false, true), "dark");
  assert.equal(resolvedAppearance("system", false, false), "light");
  for (const systemDark of [false, true]) {
    assert.equal(resolvedAppearance("light", true, systemDark), "light");
    assert.equal(resolvedAppearance("light", false, systemDark), "light");
    assert.equal(resolvedAppearance("dark", true, systemDark), "soft-dark");
    assert.equal(resolvedAppearance("dark", false, systemDark), "dark");
  }
});
