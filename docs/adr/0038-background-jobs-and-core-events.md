# 38. Background jobs and core events

Date: 2026-10-02

## Status

Accepted

## Context

coxswain generates reading guides and summarizes agent threads as review comments. Both need one reliable runner with bounded concurrency, retries, cancellation and Activity history.

## Decision

1. Background work runs through `JobSpec` in `src/core/jobs.ts`, with six shared slots, retries, cancellation and persisted job history. Guides supply their dedicated Settings agent/model; comment summaries retain their configured one-shot runner.
2. Core writes emit typed events. The main process forwards them to renderer queries; `background.ts` starts Guide jobs on opened/worktree/GitHub events and forces regeneration on an explicit guide event. The UI owns no runner or polling timers.
3. Guide checks coalesce; changed ranges supersede older runs. Complete pinned views publish atomically, retaining the old guide on failure. Sidebar progress and Activity report results.
4. Guide agent/model/effort defaults persist per agent in SQLite. A manual guide event may carry a one-update model/effort override; queued forced requests retain it while automatic events coalesce. The one-shot runner sets model before effort and retains the chosen effort across job retries. Guide defaults are independent of retired summary preferences and start with Claude Code/Opus (currently 5.5). Changing them affects subsequent runs; Update Guide explicitly regenerates the current range.
5. File-summary jobs, caches, tools and work-ahead controls are retired. Historical job rows and immutable schema migrations remain readable; no destructive schema migration is needed.

## Alternatives considered

- **A timer in the UI** that asks the core for work a moment after something changes. A few lines, but the UI then
  decides when model runs happen (against ADR 0002), it stops when its component isn't there, and its runs have no
  retries and don't show in Activity.
- **A second job runner for thread summaries**, beside the file summaries'. Each would grow its own retries, limits and history;
  the two are the same shape.
- **A stored queue** (jobs written before they run, picked up by workers, resumed after a restart). Needed once work
  is long or must not be lost; what there is now can be worked out again from the workspace, so a job that died is
  simply started again by the next event.
- **Node's `EventEmitter` with a topic per event.** No less code than a typed listener set, and untyped topics.
- **Events from the database** (triggers, or polling tables). Catches every write, but not the worktree, and the
  core already knows when it writes.

## Consequences

- A thread summary costs a model run only when the user asks for one.
- `summary_jobs` became `jobs` (a migration); a job has a `kind`, and its count is `items`, not `files`.
- A job is tied to one workspace and runs on the summary agent; work that fits neither needs the spec widened.

Guide jobs start on opened/worktree/GitHub events; an explicit guide event retries them. Duplicate checks coalesce, changed ranges supersede older runs, and stale output is discarded before publication. Jobs use the same runner, limits, retries, history and Activity as comment summaries.
