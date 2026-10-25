import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import { join } from "node:path";
import { after, mock, test } from "node:test";
import { openDatabase } from "./db.ts";
import type { Db } from "./db";

const temp = mkdtempSync(join(os.tmpdir(), "coxswain-guides-"));
const home = mock.method(os, "homedir", () => temp);
syncBuiltinESMExports();
const { openWorktree, openedWorktree, snapshot } = await import("./git.ts");
const jobs = await import("./jobs.ts");
const { ensureGuide, parseGuide, guideMarkdown, requestGuide, getGuideSettings, setGuideSettings } =
  await import("./guides.ts");
const { listViews } = await import("./views.ts");
const { emit } = await import("./events.ts");
const { startBackground } = await import("./background.ts");
home.mock.restore();
syncBuiltinESMExports();
after(() => rmSync(temp, { recursive: true, force: true }));
jobs.limits.retryMs = 1;

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
    },
  }).trim();

async function idle(db: Db) {
  for (let i = 0; i < 300; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
    if ((await jobs.listJobs(db)).length && !jobs.runningJobs().length) return;
  }
  assert.fail("background jobs did not finish");
}

test("guide output covers every file once and keeps code out of prose", () => {
  const good = {
    sections: [
      { title: "Behavior", body: "Requests preserve their order.", files: ["a b.ts", "b.ts"] },
    ],
  };
  const sections = parseGuide(JSON.stringify(good), ["a b.ts", "b.ts"]);
  assert.match(guideMarkdown(sections)[0], /```diff path="a b.ts"\n```/);
  assert.throws(
    () => parseGuide(JSON.stringify(good), ["a b.ts", "b.ts", "c.ts"]),
    /every changed file/,
  );
  assert.throws(() => parseGuide(JSON.stringify(good), ["b.ts"]), /Unknown or repeated/);
  assert.throws(
    () =>
      parseGuide(JSON.stringify({ sections: [{ ...good.sections[0], files: ["b.ts", "b.ts"] }] }), [
        "b.ts",
      ]),
    /repeated/,
  );
  assert.throws(
    () =>
      parseGuide(
        JSON.stringify({ sections: [{ ...good.sections[0], body: "```ts\nconst a = 1\n```" }] }),
        ["a b.ts", "b.ts"],
      ),
    /Keep code/,
  );
});

test("opened workspaces generate guides, changes refresh atomically, failures retain the guide and Retry works", async (t) => {
  const repo = join(temp, "repo");
  mkdirSync(repo);
  git(repo, "init", "-q", "-b", "main");
  writeFileSync(join(repo, "a.ts"), "export const value = 1;\n");
  git(repo, "add", ".");
  git(repo, "commit", "-qm", "initial");
  const db = openDatabase(join(temp, "test.db"));
  t.after(async () => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    await db.destroy();
  });
  await db
    .insertInto("projects")
    .values({ id: 1, github: null, name: "repo", path: repo, last_opened_at: "" })
    .execute();
  await db
    .insertInto("workspaces")
    .values({
      id: 1,
      project_id: 1,
      pr_number: null,
      branch: "feature",
      base_branch: "main",
      last_opened_at: "",
    })
    .execute();
  assert.equal((await openWorktree(db, 1)).status, "ok");
  const worktree = await openedWorktree(db, 1);
  writeFileSync(join(worktree, "a.ts"), "export const value = 2;\n");
  let calls = 0;
  let lastPrompt = "";
  let lastAgent = "";
  let lastSettings: { model: string; effort?: string } | undefined;
  let fail = false;
  jobs.setSummaryRunner(async ({ prompt, model, effort, agent }) => {
    if (!prompt.includes('"sections"')) return { text: '{"files":[]}', model: "test" };
    calls++;
    lastSettings = { model, effort };
    lastAgent = agent;
    lastPrompt = prompt;
    if (fail) throw Object.assign(new Error("Sign in to the agent"), { fatal: true });
    return {
      text: JSON.stringify({
        sections: [{ title: "Behavior", body: "Changes the default value.", files: ["a.ts"] }],
      }),
      model: "test",
    };
  });
  await setGuideSettings(db, { agent: "codex", model: "test-guide-model", effort: "medium" });
  const stop = startBackground(db);
  t.after(stop);
  emit({ workspaceId: 1, what: "opened" });
  await ensureGuide(db, 1);
  await idle(db);
  let views = await listViews(db, 1);
  assert.equal((await jobs.listJobs(db))[0].agent, "codex");
  assert.equal((await jobs.listJobs(db))[0].model, "test-guide-model");
  assert.equal(views.length, 1);
  assert.equal(views[0].guide, true);
  assert.equal(views[0].writing, false);
  const first = views[0];
  await ensureGuide(db, 1);
  await idle(db);
  assert.equal(calls, 1, "opening/checking an unchanged range reuses its guide");
  writeFileSync(join(worktree, "a.ts"), "export const value = 3;\n");
  emit({ workspaceId: 1, what: "github" });
  await ensureGuide(db, 1);
  await idle(db);
  views = await listViews(db, 1);
  assert.equal(views.length, 1);
  assert.notEqual(views[0].head, first.head);
  assert.equal(views[0].id, first.id, "the Guide is updated in place");
  const latest = views[0];
  await requestGuide(db, 1, "Focus on architecture and data flow.");
  await ensureGuide(db, 1);
  await idle(db);
  assert.match(lastPrompt, /Focus on architecture and data flow/);
  assert.match(lastPrompt, /separate Tests section/);
  assert.match(lastPrompt, /separate Generated section/);
  assert.match(lastPrompt, /"group":"implementation"/);
  assert.equal((await listViews(db, 1))[0].id, first.id);
  assert.equal(
    (await db.selectFrom("views").selectAll().execute()).length,
    1,
    "manual and automatic updates reuse one stored Guide",
  );

  await requestGuide(db, 1, undefined, { model: "manual-model", effort: "high" });
  await ensureGuide(db, 1);
  await idle(db);
  assert.deepEqual(lastSettings, { model: "manual-model", effort: "high" });
  assert.deepEqual(
    await getGuideSettings(db),
    { agent: "codex", model: "test-guide-model", effort: "medium" },
    "manual overrides do not change automatic defaults",
  );
  await requestGuide(db, 1, undefined, { agent: "claude", model: "opus", effort: "high" });
  await ensureGuide(db, 1);
  await idle(db);
  assert.equal(lastAgent, "claude", "the manual job uses the overridden agent");
  assert.deepEqual(lastSettings, { model: "opus", effort: "high" });
  assert.equal(
    (await getGuideSettings(db)).agent,
    "codex",
    "manual agent selection does not change defaults",
  );
  await requestGuide(db, 1, undefined, { model: undefined, effort: undefined });
  await ensureGuide(db, 1);
  await idle(db);
  assert.deepEqual(
    lastSettings,
    { model: "test-guide-model", effort: "medium" },
    "app-default selections preserve configured defaults",
  );
  assert.equal(lastAgent, "codex", "later jobs return to the configured agent");
  await requestGuide(db, 1, undefined, { model: "", effort: "" });
  await ensureGuide(db, 1);
  await idle(db);
  assert.deepEqual(
    lastSettings,
    { model: "", effort: "" },
    "agent defaults are explicit overrides",
  );

  await Promise.all([
    requestGuide(db, 1, undefined, { model: "first-manual", effort: "low" }),
    requestGuide(db, 1, undefined, { model: "latest-manual", effort: "high" }),
  ]);
  await ensureGuide(db, 1);
  await idle(db);
  assert.deepEqual(
    lastSettings,
    { model: "latest-manual", effort: "high" },
    "the newest forced override survives coalesced automatic checks",
  );

  fail = true;
  writeFileSync(join(worktree, "a.ts"), "export const value = 4;\n");
  await ensureGuide(db, 1);
  await idle(db);
  assert.equal((await listViews(db, 1))[0].id, latest.id);
  const failed = (await jobs.listJobs(db)).find((job) => job.kind === "guide");
  assert.equal(failed?.state, "failed");
  assert.match(failed?.error ?? "", /Sign in/);
  fail = false;
  await requestGuide(db, 1);
  await ensureGuide(db, 1);
  await idle(db);
  assert.equal((await listViews(db, 1)).length, 1);
  let release!: () => void;
  let started!: () => void;
  const began = new Promise<void>((resolve) => {
    started = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let hold = true;
  jobs.setSummaryRunner(async () => {
    if (hold) {
      hold = false;
      started();
      await gate;
    }
    return {
      text: JSON.stringify({
        sections: [{ title: "Latest", body: "Describes the latest change.", files: ["a.ts"] }],
      }),
      model: "test",
    };
  });
  writeFileSync(join(worktree, "a.ts"), "export const value = 5;\n");
  await ensureGuide(db, 1);
  await began;
  writeFileSync(join(worktree, "a.ts"), "export const value = 6;\n");
  await ensureGuide(db, 1);
  release();
  await idle(db);
  views = await listViews(db, 1);
  assert.equal(views.length, 1, "a superseded generation never creates another Guide");
  assert.equal(views[0].id, first.id);
  assert.match(
    lastPrompt,
    /Focus on architecture and data flow/,
    "automatic updates retain the custom instructions",
  );
  const current = await snapshot(db, 1);
  assert.equal(current.status, "ok");
  if (current.status === "ok") assert.equal(views[0].head, current.sha);
});

test("Guide settings default to Claude Opus, remember each agent and persist separately", async () => {
  const path = join(temp, "guide-settings.db");
  let db = openDatabase(path);
  await db
    .insertInto("settings")
    .values({ key: "summaries.model.claude", value: "sonnet" })
    .execute();
  assert.deepEqual(await getGuideSettings(db), { agent: "claude", model: "opus", effort: "" });
  await setGuideSettings(db, { model: "opus", effort: "high" });
  await setGuideSettings(db, { agent: "codex", model: "gpt-test", effort: "low" });
  await setGuideSettings(db, { agent: "claude" });
  assert.deepEqual(await getGuideSettings(db, "codex"), {
    agent: "codex",
    model: "gpt-test",
    effort: "low",
  });
  assert.equal(
    (await getGuideSettings(db)).agent,
    "claude",
    "reading another agent’s defaults does not select it",
  );
  assert.deepEqual(await getGuideSettings(db), { agent: "claude", model: "opus", effort: "high" });
  await db
    .updateTable("settings")
    .set({ value: "haiku" })
    .where("key", "=", "summaries.model.claude")
    .execute();
  assert.equal((await getGuideSettings(db)).model, "opus");
  await db.destroy();
  db = openDatabase(path);
  await setGuideSettings(db, { agent: "codex" });
  assert.deepEqual(await getGuideSettings(db), {
    agent: "codex",
    model: "gpt-test",
    effort: "low",
  });
  await db.destroy();
});
