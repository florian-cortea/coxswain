import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { ChangedFileList } from "../../core/git";
import type { SessionState } from "../../core/session-state";

let onState: (id: string, state: SessionState) => void;
let read = Promise.withResolvers<SessionState>();
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    addEventListener: () => {},
    removeEventListener: () => {},
    coxswain: {
      onChanged: () => () => {},
      onJobs: () => () => {},
      onAgentState: (callback: typeof onState) => {
        onState = callback;
      },
      readAgentState: () => read.promise,
    },
  },
});
const { changed, core, queryClient } = await import("./queries.ts");
after(() => {
  queryClient.clear();
  Reflect.deleteProperty(globalThis, "window");
});

test("a delayed IPC read cannot erase streamed text, permission or turn completion", async () => {
  const old: SessionState = {
    revision: 0,
    entries: [],
    running: false,
    permission: null,
    error: null,
    signIn: false,
    tasks: [],
    queued: [],
    done: false,
    commands: [],
  };
  const query = core("readAgentState", "session");
  const pending = queryClient.fetchQuery(query);
  const live: SessionState = {
    ...old,
    revision: 3,
    running: true,
    entries: [
      { kind: "user", text: "Question" },
      { id: 1, kind: "text", text: "Answer" },
    ],
    permission: { id: "p", title: "Command", options: [] },
  };
  onState("session", live);
  read.resolve(old);
  await pending;
  assert.deepEqual(queryClient.getQueryData(query.queryKey), live);
  const done = { ...live, revision: 4, running: false, permission: null };
  onState("session", done);
  onState("session", live);
  assert.deepEqual(queryClient.getQueryData(query.queryKey), done);
});

test("a change makes stale what it affects: in its workspace, but for the unscoped; everywhere, outside one", async () => {
  const seed = (key: unknown[]) => queryClient.setQueryData(key, {});
  const stale = (key: unknown[]) => queryClient.getQueryState(key)?.isInvalidated ?? false;
  const keys = {
    here: ["openWorktree", 1],
    there: ["openWorktree", 2],
    titles: ["listPullRequestTitles", "owner", "name", [7]],
    entries: ["listEntries", 1],
    guideSettings: ["getGuideSettings"],
    picks: ["listAgentPicks", 2, "claude"],
  };
  Object.values(keys).forEach(seed);
  await changed({ workspaceId: 1, what: "github" });
  assert.equal(stale(keys.here), true);
  assert.equal(stale(keys.there), false);
  assert.equal(stale(keys.titles), true);
  assert.equal(stale(keys.entries), true);
  await changed({ what: "settings" });
  assert.equal(stale(keys.guideSettings), true);
  assert.equal(stale(keys.picks), true);
});

test("event-owned settings and workspace reads reuse cache until their core event", async () => {
  let calls = 0;
  window.coxswain.getCodeTheme = async () => {
    calls++;
    return "default";
  };
  const query = core("getCodeTheme");
  queryClient.removeQueries({ queryKey: query.queryKey });
  await queryClient.fetchQuery(query);
  await queryClient.fetchQuery(query);
  assert.equal(calls, 1, "a new observer reuses the saved setting");
  await changed({ what: "settings" });
  await queryClient.fetchQuery(query);
  assert.equal(calls, 2, "a settings event causes a fresh read");
});

test("Guide switching prepares pinned content without waiting for GitHub and reuses it on return", async () => {
  const { prepareGuide } = await import("./prepare-guide.ts");
  const id = 991;
  queryClient.setQueryData(core("listViews", id).queryKey, [
    {
      id: 42,
      workspaceId: id,
      title: "Guide",
      worktree: true,
      createdAt: "",
      writing: false,
      base: "base",
      head: "head",
      guide: true,
      sections: [{ title: "One", parts: [{ kind: "diff", path: "new.ts", muted: false }] }],
    },
  ]);
  const changed: ChangedFileList = {
    status: "ok",
    files: [{ path: "new.ts", previousPath: null, status: "added", additions: 1, deletions: 0 }],
  };
  queryClient.setQueryData<ChangedFileList>(
    core("listChangedFiles", id, "base", "head").queryKey,
    (): ChangedFileList => changed,
  );
  queryClient.setQueryData(core("listEntries", id, "base", "base", "head").queryKey, []);
  queryClient.setQueryData(core("listReviewed", id, "base", "head").queryKey, []);
  queryClient.setQueryData(core("listReviewed", id, "base", "head", "file").queryKey, []);
  let reads = 0;
  window.coxswain.readFileAt = async () => {
    reads++;
    return { status: "ok", text: "new", binary: false };
  };
  await prepareGuide(id, { ws: id });
  await prepareGuide(id, { ws: id });
  assert.equal(reads, 1, "returning reuses the exact pinned file contents");
  assert.equal(
    queryClient.getQueryState(core("openWorktree", id).queryKey),
    undefined,
    "no live-worktree/network wait",
  );
});
