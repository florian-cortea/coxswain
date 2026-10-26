import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { openDatabase } from "./db.ts";
import { onEvent } from "./events.ts";
import { getDefaultPrompts, setDefaultPrompt } from "./prompt-settings.ts";
import { summaryPrompt } from "./thread-context.ts";

test("default prompts persist independently, restore built-ins and notify readers", async () => {
  const dir = mkdtempSync(join(tmpdir(), "coxswain-prompts-"));
  let db = openDatabase(join(dir, "test.db"));
  let changes = 0;
  const stop = onEvent((event) => {
    if (event.what === "settings") changes++;
  });
  try {
    const initial = await getDefaultPrompts(db);
    assert.equal(initial.guide.value, initial.guide.defaultValue);
    assert.equal(initial.review.value, initial.review.defaultValue);
    await setDefaultPrompt(db, "guide", "  Detailed architecture walkthrough.  ");
    await setDefaultPrompt(db, "review", "Write one direct question.");
    await db.destroy();
    db = openDatabase(join(dir, "test.db"));
    const saved = await getDefaultPrompts(db);
    assert.equal(saved.guide.value, "Detailed architecture walkthrough.");
    assert.equal(saved.review.value, "Write one direct question.");
    const prompt = summaryPrompt(
      { path: "a.ts", side: "new", startLine: 1, endLine: 1, code: "x" },
      [{ kind: "question", author: null, body: "Why cache this?" }],
      saved.review.value,
    );
    assert.match(prompt, /^Write one direct question\./);
    assert.match(prompt, /Me: Why cache this\?/);
    assert.doesNotMatch(prompt, /One paragraph per point/);
    await assert.rejects(setDefaultPrompt(db, "guide", " \n"), /must not be empty/);
    await setDefaultPrompt(db, "guide", null);
    assert.deepEqual((await getDefaultPrompts(db)).guide, initial.guide);
    assert.equal((await getDefaultPrompts(db)).review.value, saved.review.value);
    assert.equal(
      await db
        .selectFrom("settings")
        .selectAll()
        .where("key", "=", "prompts.guide")
        .executeTakeFirst(),
      undefined,
    );
    assert.equal(changes, 3);
  } finally {
    stop();
    await db.destroy();
    rmSync(dir, { recursive: true, force: true });
  }
});
