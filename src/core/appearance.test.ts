import { codeThemeOptions } from "../shared/code-themes.ts";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  getAppearance,
  setAppearance,
  getCodeTheme,
  setCodeTheme,
  getSoftDark,
  setSoftDark,
} from "./appearance.ts";
import { openDatabase } from "./db.ts";
import { onEvent } from "./events.ts";

test("appearance and code theme persist independently and notify settings readers", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "coxswain-appearance-"));
  const path = join(directory, "test.db");
  let db = openDatabase(path);
  t.after(async () => {
    await db.destroy();
    await rm(directory, { recursive: true, force: true });
  });
  let events = 0;
  const unsubscribe = onEvent((event) => {
    if (event.what === "settings") events++;
  });
  t.after(unsubscribe);
  assert.equal(await getAppearance(db), "system");
  assert.equal(await getCodeTheme(db), "default");
  assert.equal(await getSoftDark(db), false);
  await db.insertInto("settings").values({ key: "appearance", value: "soft-dark" }).execute();
  assert.equal(await getAppearance(db), "dark", "legacy Soft Dark retains forced dark mode");
  assert.equal(await getSoftDark(db), true, "legacy Soft Dark retains the softer palette");
  await setAppearance(db, "system");
  await setCodeTheme(db, "one-dark");
  assert.equal(events, 2);
  await db.destroy();
  db = openDatabase(path);
  assert.equal(await getAppearance(db), "system");
  assert.equal(
    await getSoftDark(db),
    true,
    "switching to System preserves the independent preference",
  );
  await setSoftDark(db, false);
  assert.equal(
    await getAppearance(db),
    "system",
    "the palette toggle does not change appearance mode",
  );
  assert.equal(await getSoftDark(db), false);
  assert.equal(await getCodeTheme(db), "one-dark");
  await setSoftDark(db, true);
  await setAppearance(db, "light");
  assert.equal(
    await getSoftDark(db),
    true,
    "light mode does not discard the dark palette preference",
  );
  assert.equal(await getCodeTheme(db), "one-dark");
  await setCodeTheme(db, "catppuccin");
  assert.equal(await getAppearance(db), "light");
  assert.equal(await getCodeTheme(db), "catppuccin");
  for (const theme of codeThemeOptions) {
    await setCodeTheme(db, theme.id);
    assert.equal(await getCodeTheme(db), theme.id);
  }
  await db.updateTable("settings").set({ value: "unknown" }).execute();
  assert.equal(await getAppearance(db), "system");
  assert.equal(await getCodeTheme(db), "default");
});
