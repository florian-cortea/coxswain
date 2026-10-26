import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { getAppearance, setAppearance, getCodeTheme, setCodeTheme } from "./appearance.ts";
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
  await setAppearance(db, "soft-dark");
  await setCodeTheme(db, "one-dark");
  assert.equal(events, 2);
  await db.destroy();
  db = openDatabase(path);
  assert.equal(await getAppearance(db), "soft-dark");
  assert.equal(await getCodeTheme(db), "one-dark");
  await setAppearance(db, "light");
  assert.equal(await getCodeTheme(db), "one-dark");
  await setCodeTheme(db, "catppuccin");
  assert.equal(await getAppearance(db), "light");
  assert.equal(await getCodeTheme(db), "catppuccin");
  await db.updateTable("settings").set({ value: "unknown" }).execute();
  assert.equal(await getAppearance(db), "system");
  assert.equal(await getCodeTheme(db), "default");
});
