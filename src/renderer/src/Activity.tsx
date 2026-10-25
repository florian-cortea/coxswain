import { useQuery } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { useEffect, useRef, useState } from "react";
import type { Job } from "../../core/jobs";
import { Button } from "./components/button";
import { ActivityIcon, SpinnerIcon, StopIcon, SlidersIcon, XIcon } from "./components/icons";
import { ProgressBar } from "./components/layout";
import { cn, muted, noDrag } from "./components/styles";
import { ErrorText } from "./components/text";
import { ago, count } from "./format";
import { core } from "./queries";

// The dedicated toolbar icon opens this list; job updates arrive from the core.
export function Activity({ onSettings, onClose }: { onSettings: () => void; onClose: () => void }) {
  const jobs = useQuery(core("listJobs")).data ?? [];
  const running = jobs.filter((job) => job.state === "running").length;
  const box = useRef<HTMLDivElement>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);
  useEffect(() => {
    const close = (event: Event) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !box.current?.contains(event.target as Node)
      )
        onClose();
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [onClose]);
  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Activity"
      className={cn(
        "activity-popover flex max-h-[min(640px,calc(100vh-80px))] w-[min(420px,calc(100vw-24px))] flex-col overflow-hidden text-xs shadow-xl",
        noDrag,
      )}
    >
      <div className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-3">
        <span className="font-semibold">Activity</span>
        {running > 0 && <span className={cn("text-[11px]", muted)}>{running} running</span>}
        <span className="flex-1" />
        <Button
          variant="ghost"
          className={cn("rounded-md p-1", muted)}
          title="Settings"
          aria-label="Activity settings"
          onClick={() => {
            onClose();
            onSettings();
          }}
        >
          <SlidersIcon />
        </Button>
        <Button
          variant="ghost"
          className={cn("rounded-md p-1", muted)}
          title="Close Activity"
          aria-label="Close Activity"
          onClick={onClose}
        >
          <XIcon />
        </Button>
      </div>
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable]">
        {jobs.length ? (
          jobs.map((job) => <JobRow key={job.id} job={job} />)
        ) : (
          <div className={cn("px-4 py-8 text-center", muted)}>No activity yet</div>
        )}
      </div>
    </div>
  );
}

function JobRow({ job: j }: { job: Job }) {
  const settled = j.reused + j.done + j.failed;
  const seconds = Math.round(
    ((j.finishedAt ? Date.parse(j.finishedAt) : Date.now()) - Date.parse(j.startedAt)) / 1000,
  );
  // What its items are, and what's done to them.
  const [item, doing, did] = (
    {
      files: ["file", "Summarising", "summarised"],
      conclusions: ["thread", "Summarizing", "summarized"],
      guide: ["guide", "Generating", "generated"],
    } as const
  )[j.kind];
  const state = match(j.state)
    .with("running", () => doing)
    .with("done", () => did.replace(/^./, (c) => c.toUpperCase()))
    .with("failed", () => "Failed")
    .with("stopped", () => "Stopped")
    .exhaustive();
  return (
    <div className="activity-job flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex", j.state === "failed" ? "text-red-500" : muted)}>
          {j.state === "running" ? <SpinnerIcon /> : <ActivityIcon />}
        </span>
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">
            {match(j.kind)
              .with("guide", () => "Guide")
              .with("conclusions", () => "Comment summary")
              .with("files", () => "File summary (legacy)")
              .exhaustive()}
          </span>
          <span className={cn("ml-2 text-[11px]", muted)}>{state}</span>
        </span>
        <span
          className={cn("shrink-0 text-[11px]", muted)}
          title={new Date(j.startedAt).toLocaleString()}
        >
          {j.finishedAt ? `${seconds} s, ${ago(j.finishedAt)}` : `${seconds} s`}
        </span>
        {j.state === "running" && (
          <Button
            variant="ghost"
            title="Stop this job"
            aria-label="Stop this job"
            className="p-1 text-neutral-500"
            onClick={() => window.coxswain.stopJob(j.id)}
          >
            <StopIcon />
          </Button>
        )}
      </div>
      <div className={cn("truncate", muted)} title={j.workspace}>
        {j.workspace}
      </div>
      {(j.state === "running" || j.state === "failed") && (
        <ProgressBar value={settled} max={j.items} failed={j.state === "failed"} />
      )}
      {j.items > 1 && (
        <div className={muted}>
          {settled}/{count(j.items, item)} · {j.reused} had one · {j.done} {did}
          {j.failed > 0 && (
            <span className="text-red-600 dark:text-red-400"> · {j.failed} failed</span>
          )}
        </div>
      )}
      <div className={cn("truncate text-[11px]", muted)} title={j.head && `${j.base} → ${j.head}`}>
        {j.agent === "claude" ? "Claude Code" : "Codex"} · {j.ranOn ?? (j.model || "default model")}{" "}
        · {count(j.calls, "run")}
        {j.head && ` · ${j.base.slice(0, 7)} → ${j.head.slice(0, 7)}`}
      </div>
      {j.now.length > 0 && j.now[0] !== "Guide" && (
        <div className={cn("truncate font-mono text-[11px]", muted)} title={j.now.join("\n")}>
          {j.now[0]}
          {j.now.length > 1 && ` and ${j.now.length - 1} more`}
        </div>
      )}
      {j.error && (
        <ErrorText>
          {j.state === "done" ? `A run failed and was tried again: ${j.error}` : j.error}
        </ErrorText>
      )}
    </div>
  );
}
