import type { Db } from "./db";
import { openedWorktree } from "./git.ts";
import { getWorkspaceRepo } from "./workspaces.ts";

// ADR 0038: background jobs, the one way coxswain does work nobody waits for. A job is some items of one workspace
// for the summary agent (a small model, in Settings): it runs them in batches, retries, stores each answer as it
// comes, and is a row of `jobs`, which Activity shows. What a job is about is its kind's own business (JobSpec):
// guides (guides.ts) and agent threads summarized as comments (review-draft.ts). What starts one is in background.ts.

export type SummaryAgent = "claude" | "codex";
// model: "" is the agent's own default. Legacy summary preferences still supply comment-summary jobs.
export type SummarySettings = { agent: SummaryAgent; model: string; effort?: string };
const defaultModel: Record<SummaryAgent, string> = { claude: "opus", codex: "" };

// kind: guide generation or agent-thread conclusions; "files" remains readable for historical job rows. why:
// "ahead", something changed; "view", a view was started; "comment", Summarize as Comment; "submit", Submit Review
// opened, from before comments went as written. base, head: the range of a files job, "" otherwise. model: as asked
// for; ranOn: what the agent says it ran. items: all it was about; reused: had an answer already, or another job is
// making it. done: answered by this job; failed: gave up on. calls: model runs, retries included. now: the items in
// the runs going on. error: the last one, even if a retry then worked.
export type Job = {
  id: number;
  kind: "files" | "conclusions" | "guide";
  workspaceId: number;
  workspace: string;
  why: "ahead" | "view" | "submit" | "comment";
  base: string;
  head: string;
  agent: SummaryAgent;
  model: string;
  ranOn: string | null;
  items: number;
  reused: number;
  done: number;
  failed: number;
  calls: number;
  now: string[];
  state: "running" | "done" | "failed" | "stopped";
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

// One run of the summary agent: the prompt, and a system prompt in place of the agent's own. Resolves with the reply's
// text and the model it ran on. Rejects with fatal set when trying again can't help (not installed, no such model).
export type SummaryRun = {
  agent: SummaryAgent;
  model: string;
  effort?: string;
  cwd: string;
  prompt: string;
  instructions: string;
  signal: AbortSignal;
};
export type SummaryRunner = (r: SummaryRun) => Promise<{ text: string; model: string | null }>;
// Set by the main process to a one-shot agent run (agents.ts); tests set their own.
let runner: SummaryRunner = async () => {
  throw Object.assign(new Error("No summary agent is set up"), { fatal: true });
};
export const setSummaryRunner = (r: SummaryRunner) => void (runner = r);

// At most parallel runs go at once across all jobs. A run that fails is tried again after retryMs, then 4× that, up to
// attempts in all; items a run left out are then asked for one at a time.
export const limits = { parallel: 6, attempts: 3, retryMs: 2000 };
// How many jobs Activity shows, and how many are kept.
const listed = 50;
const kept = 500;

// Runs n at a time across all jobs; a finished run hands its slot to the next one waiting.
let active = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active < limits.parallel) active++;
  else await new Promise<void>((resolve) => waiting.push(resolve));
  try {
    return await fn();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
  });

// The running jobs, with a way to stop each; every job is also a row of jobs, so Activity shows them after a restart
// too.
const live = new Map<number, Job>();
export const runningJobs = () => [...live.values()];
// The agent and model of the last run that worked: until one has, a job sends one run first, so a wrong model fails
// once and not once per slot.
let workedWith: string | null = null;
const settingsKey = (s: SummarySettings) => `${s.agent}\0${s.model}\0${s.effort ?? ""}`;
const stops = new Map<number, AbortController>();

const listeners = new Set<(jobs: Job[]) => void>();
export function onJobs(listener: (jobs: Job[]) => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

// The latest jobs, newest first: the running ones as they are now, the rest as stored.
export async function listJobs(db: Db): Promise<Job[]> {
  const rows = await db
    .selectFrom("jobs")
    .selectAll()
    .orderBy("id", "desc")
    .limit(listed)
    .execute();
  return rows.map((r) => {
    const running = live.get(r.id);
    if (running) return { ...running, now: [...running.now] };
    return {
      id: r.id,
      kind: r.kind,
      workspaceId: r.workspace_id,
      workspace: r.workspace,
      why: r.why,
      base: r.base,
      head: r.head,
      agent: r.agent,
      model: r.model,
      ranOn: r.ran_on,
      items: r.items,
      reused: r.reused,
      done: r.done,
      failed: r.failed,
      calls: r.calls,
      now: [],
      state: r.state,
      error: r.error,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
    };
  });
}

// A job as its row: what it did so far, or all of it once finished.
const saveJob = (db: Db, j: Job) =>
  db
    .updateTable("jobs")
    .set({
      ran_on: j.ranOn,
      items: j.items,
      reused: j.reused,
      done: j.done,
      failed: j.failed,
      calls: j.calls,
      state: j.state,
      error: j.error,
      finished_at: j.finishedAt,
      updated_at: new Date().toISOString(),
    })
    .where("id", "=", j.id)
    .execute();

// Stores the running jobs' progress and tells the listeners, at most every 100 ms.
let telling: ReturnType<typeof setTimeout> | undefined;
const tell = (db: Db) => {
  telling ??= setTimeout(async () => {
    telling = undefined;
    try {
      await Promise.all([...live.values()].map((j) => saveJob(db, j)));
      const list = await listJobs(db);
      listeners.forEach((l) => l(list));
    } catch (e) {
      console.error("jobs:", (e as Error).message);
    }
  }, 100);
};

// Jobs that were running when coxswain last quit ended then; called once at startup.
export async function stopInterruptedJobs(db: Db) {
  await db
    .updateTable("jobs")
    .set((eb) => ({
      state: "stopped",
      error: "coxswain quit while it ran",
      finished_at: eb.ref("updated_at"),
    }))
    .where("state", "=", "running")
    .execute();
}

export function stopJob(id: number) {
  stops.get(id)?.abort();
}

// What a job is about, for its kind to say. items: those with no answer yet, of total, reused of which had one.
// byHand: an answer that needs no model. batches: the rest, a run each. ask: one run for a batch: it builds the prompt,
// calls run with it and the items it's about, and reads the reply; items missing from its answers are asked for again.
// save: stores an answer, by the model that wrote it. settled: an item is answered or given up on (maybe twice).
export type JobSpec<T> = Pick<Job, "kind" | "workspaceId" | "why" | "base" | "head"> & {
  total: number;
  reused: number;
  items: T[];
  name: (item: T) => string;
  byHand?: (item: T) => string | null;
  batches: (items: T[]) => T[][];
  ask: (
    items: T[],
    run: (prompt: string, instructions: string, asked: T[]) => Promise<string>,
  ) => Promise<Map<T, string>>;
  save: (item: T, answer: string, by: string) => Promise<unknown>;
  settled?: (item: T) => void;
};

const newJob = async (
  db: Db,
  spec: Pick<Job, "kind" | "workspaceId" | "why" | "base" | "head">,
  settings: SummarySettings,
): Promise<Job> => ({
  id: 0, // its row's, once added
  kind: spec.kind,
  workspaceId: spec.workspaceId,
  workspace: await workspaceLabel(db, spec.workspaceId),
  why: spec.why,
  base: spec.base,
  head: spec.head,
  agent: settings.agent,
  model: settings.model,
  ranOn: null,
  items: 0,
  reused: 0,
  done: 0,
  failed: 0,
  calls: 0,
  now: [],
  state: "running",
  error: null,
  startedAt: new Date().toISOString(),
  finishedAt: null,
});

// A job that couldn't start, so it shows as failed.
export async function failJob(
  db: Db,
  spec: Pick<Job, "kind" | "workspaceId" | "why" | "base" | "head">,
  error: string,
  selected?: SummarySettings,
): Promise<Job> {
  const job = await newJob(db, spec, selected ?? (await getSummarySettings(db)));
  return finish(db, await add(db, job), "failed", error);
}

// Starts a job and returns it at once; it goes on in the background. Never throws once started: what goes wrong is
// the job's error.
export async function startJob<T>(
  db: Db,
  spec: JobSpec<T>,
  selected?: SummarySettings,
): Promise<Job> {
  const settings = selected ?? (await getSummarySettings(db));
  const job = await newJob(db, spec, settings);
  job.items = spec.total;
  job.reused = spec.reused;
  await add(db, job);
  const stop = new AbortController();
  stops.set(job.id, stop);
  void work(db, job, spec, stop, settings)
    .catch((e: Error) => console.error(`job ${job.id}:`, e.message))
    .finally(() => {
      stops.delete(job.id);
      spec.items.forEach((m) => spec.settled?.(m));
    });
  return job;
}

async function work<T>(
  db: Db,
  job: Job,
  spec: JobSpec<T>,
  stop: AbortController,
  settings: SummarySettings,
) {
  let fatal: string | null = null;
  const save = async (m: T, answer: string, by: string) => {
    await spec.save(m, answer, by);
    job.done++;
    spec.settled?.(m);
  };
  const giveUp = (items: T[]) => {
    job.failed += items.length;
    items.forEach((m) => spec.settled?.(m));
    tell(db);
  };
  try {
    const cwd = await openedWorktree(db, job.workspaceId);
    const byModel: T[] = [];
    for (const m of spec.items) {
      const s = spec.byHand?.(m);
      if (s) await save(m, s, "coxswain");
      else byModel.push(m);
    }
    tell(db);
    const batches = spec.batches(byModel);
    const run = async (prompt: string, instructions: string, asked: T[]) => {
      const names = asked.map(spec.name);
      job.calls++;
      job.now.push(...names);
      tell(db);
      try {
        const out = await runner({
          agent: settings.agent,
          model: settings.model,
          effort: settings.effort,
          cwd,
          prompt,
          instructions,
          signal: stop.signal,
        });
        job.ranOn = out.model ?? job.ranOn;
        workedWith = settingsKey(settings);
        return out.text;
      } finally {
        const running = new Set(names);
        job.now = job.now.filter((n) => !running.has(n));
      }
    };
    const attempt = async (items: T[], n: number): Promise<void> => {
      if (stop.signal.aborted) return;
      let answers: Map<T, string>;
      try {
        answers = await slot(async () =>
          stop.signal.aborted ? new Map<T, string>() : spec.ask(items, run),
        );
      } catch (e) {
        if (stop.signal.aborted) return;
        job.error = (e as Error).message;
        if ((e as { fatal?: boolean }).fatal) {
          fatal = job.error;
          stop.abort();
          return;
        }
        if (n >= limits.attempts) return giveUp(items);
        tell(db);
        await sleep(limits.retryMs * 4 ** (n - 1), stop.signal);
        return attempt(items, n + 1);
      }
      for (const m of items) {
        const s = answers.get(m);
        if (s !== undefined) await save(m, s, job.ranOn ?? job.model); // "" can be an answer
      }
      tell(db);
      const left = items.filter((m) => !answers.has(m));
      if (!left.length) return;
      if (n >= limits.attempts) {
        job.error = `Nothing came back for ${left.map(spec.name).join(", ")}`;
        giveUp(left);
        return tell(db);
      }
      await Promise.all(left.map((m) => attempt([m], n + 1)));
    };
    if (workedWith !== settingsKey(settings) && batches.length > 1)
      await attempt(batches.shift()!, 1);
    await Promise.all(batches.map((b) => attempt(b, 1)));
  } catch (e) {
    fatal = (e as Error).message;
  }
  const left = spec.items.length - job.done - job.failed;
  if (fatal) {
    await finish(db, job, "failed", fatal);
  } else if (stop.signal.aborted || left > 0) await finish(db, job, "stopped", job.error);
  else await finish(db, job, job.failed && !job.done ? "failed" : "done", job.error);
}

// Stores a new job, and drops the oldest beyond those kept.
async function add(db: Db, job: Job): Promise<Job> {
  const now = new Date().toISOString();
  const { id } = await db
    .insertInto("jobs")
    .values({
      kind: job.kind,
      workspace_id: job.workspaceId,
      workspace: job.workspace,
      why: job.why,
      base: job.base,
      head: job.head,
      agent: job.agent,
      model: job.model,
      ran_on: null,
      items: job.items,
      reused: job.reused,
      done: 0,
      failed: 0,
      calls: 0,
      state: "running",
      error: null,
      started_at: job.startedAt,
      finished_at: null,
      updated_at: now,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  job.id = id;
  live.set(id, job);
  await db
    .deleteFrom("jobs")
    .where("id", "<=", id - kept)
    .execute();
  tell(db);
  return job;
}

async function finish(db: Db, job: Job, state: Job["state"], error: string | null): Promise<Job> {
  job.state = state;
  job.error = error;
  job.now = [];
  job.finishedAt = new Date().toISOString();
  const s = (Date.parse(job.finishedAt) - Date.parse(job.startedAt)) / 1000;
  console.log(
    `job ${job.id} (${job.kind}, ${job.workspace}, ${job.why}): ${state}, ${job.items} items, ${job.reused} reused, ${job.done} done, ${job.failed} failed, ${job.calls} runs on ${job.agent} ${job.ranOn ?? (job.model || "default")} in ${s.toFixed(1)} s${error ? `; ${error}` : ""}`,
  );
  await saveJob(db, job);
  live.delete(job.id);
  tell(db);
  return job;
}

async function workspaceLabel(db: Db, workspaceId: number): Promise<string> {
  const w = await getWorkspaceRepo(db, workspaceId).catch(() => null);
  if (!w) return `Workspace ${workspaceId}`;
  return w.prNumber !== null ? `${w.name} #${w.prNumber}` : `${w.name} ${w.branch}`;
}

export async function getSummarySettings(db: Db): Promise<SummarySettings> {
  const rows = await db
    .selectFrom("settings")
    .select(["key", "value"])
    .where("key", "like", "summaries.%")
    .execute();
  const get = (key: string) => rows.find((r) => r.key === key)?.value;
  const agent: SummaryAgent = get("summaries.agent") === "codex" ? "codex" : "claude";
  return {
    agent,
    model: get(`summaries.model.${agent}`) ?? defaultModel[agent],
  };
}
