import { match, P } from "ts-pattern";
import type { Db } from "./db";
import { onEvent } from "./events.ts";
import { ensureGuide } from "./guides.ts";

// ADR 0038: what coxswain does in the background, and what sets it off: the one place a core event starts a job.
// Each job decides whether the current range needs an update.
export function startBackground(db: Db) {
  const opened = new Set<number>();
  return onEvent((e) =>
    match(e)
      // Guides follow changes: the worktree was opened, its HEAD moved, an agent's turn ended.
      .with({ what: P.union("opened", "worktree"), workspaceId: P.select() }, (id) => {
        opened.add(id);
        void ensureGuide(db, id);
      })
      .with({ what: "guide" }, (e) => void ensureGuide(db, e.workspaceId, true, e.override))
      .with({ what: "github", workspaceId: P.select() }, (id) => void ensureGuide(db, id))
      .with({ what: "settings" }, () => {
        for (const id of opened) void ensureGuide(db, id);
      })
      .with(
        {
          what: P.union(
            "entries",
            "transcript",
            "sessions",
            "view",
            "reviewed",
            "projects",
            "workspaces",
            "commands",
          ),
        },
        () => {},
      )
      .exhaustive(),
  );
}
