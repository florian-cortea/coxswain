import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveTheme } from "@pierre/diffs";
import { codeThemeOptions } from "./code-themes.ts";
import { resolvedAppearance } from "./appearance.ts";

test("every code theme family supplies light/dark variants for every app appearance", async () => {
  for (const family of codeThemeOptions) {
    const [light, dark] = await Promise.all([
      resolveTheme(family.light),
      resolveTheme(family.dark),
    ]);
    for (const mode of ["system", "light", "dark"] as const) {
      for (const softDark of [false, true]) {
        for (const systemDark of [false, true]) {
          const appearance = resolvedAppearance(mode, softDark, systemDark);
          const expected = appearance === "light" ? "light" : "dark";
          assert.equal(
            (expected === "light" ? light : dark).type,
            expected,
            `${family.label}: ${mode}`,
          );
        }
      }
    }
  }
});
