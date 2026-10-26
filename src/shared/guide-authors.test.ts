import assert from "node:assert/strict";
import { test } from "node:test";
import { botLogin, guideAuthorVisible } from "./guide-authors.ts";

test("human authors are visible, bots opt in, and explicit exclusions win", () => {
  const human = { name: "alice", isBot: false };
  const bot = { name: "greptile-apps", isBot: true };
  assert.equal(guideAuthorVisible(human, { hiddenAuthors: [] }), true);
  assert.equal(guideAuthorVisible(bot, { hiddenAuthors: [] }), false);
  assert.equal(guideAuthorVisible(bot, { hiddenAuthors: [], shownAuthors: [bot.name] }), true);
  assert.equal(
    guideAuthorVisible(bot, { hiddenAuthors: [bot.name], shownAuthors: [bot.name] }),
    false,
  );
  assert.equal(guideAuthorVisible(human, { hiddenAuthors: [human.name] }), false);
  assert.equal(botLogin("dependabot[bot]"), true);
  assert.equal(botLogin("alice"), false);
});
