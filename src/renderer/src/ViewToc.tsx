import { openedPath, type Opened } from "./Viewer";
import type { ReviewEntry } from "../../core/review";
import { ProgressBar } from "./components/layout";
import { cn, divider, muted, selectable } from "./components/styles";
import { Prose } from "./components/text";
import { MessageSquareIcon } from "./components/icons";
import { isShownThread, type ItemCount, itemsTitle } from "./format";
import { notInGuide } from "./ViewSection";

// A view section as the canvas shows it: its title and embedded files and diffs; title null is a guide's files in no section.
type Section = { title: string | null; files: Opened[]; muted: boolean };

type Props = {
  sections: Section[];
  reviewed: string[];
  reviewedFiles: string[];
  entries: ReviewEntry[];
  current: number; // the section at the top of the canvas's scroll
  writing: boolean; // the view is being written
  onPick: (i: number) => void;
  onReviewedChange: (i: number, on: boolean) => void; // marks all of a section's files, or unmarks them
  onViewThread: (threadId: number) => void; // scrolls the canvas to a thread
};

// A view's table of contents, left of the canvas while a view shows: how many file diffs are reviewed in all, then
// every section with how many of its file diffs are reviewed (✓ when all are) and the threads on them. The
// section being read is marked; a click scrolls to it, a right-click offers to mark it reviewed, as its header does.
// A click on its threads' bubble scrolls to its thread, or with several, to the one picked from a native menu.
// ponytail: fixed width, no Splitter; make it resizable like the Navigator if titles get cut.
export function ViewToc(props: Props) {
  const { sections, reviewed, reviewedFiles, entries, current, onPick } = props;
  const isReviewed = (d: Opened) =>
    (d.kind === "file" ? reviewedFiles : reviewed).includes(openedPath(d));
  const all = sections.flatMap((s) => s.files);
  const reviewedCount = all.filter(isReviewed).length;
  return (
    <nav
      className={cn(
        "flex w-60 shrink-0 flex-col gap-2 overflow-y-auto border-r p-3 text-xs",
        divider,
      )}
    >
      {all.length > 0 && (
        <div className="flex flex-col gap-1">
          <ProgressBar value={reviewedCount} max={all.length} />
          <span className={muted}>
            {reviewedCount} of {all.length} reviewed
          </span>
        </div>
      )}
      {sections.map((s, i) => {
        const n = s.files.filter(isReviewed).length;
        const done = n === s.files.length;
        // Its open threads: those on its prose (ADR 0036), in the text's order, then those on its files, in theirs.
        // Resolved ones are done, so they aren't counted.
        const paths = s.files.map(openedPath);
        const prose = entries
          .filter((e) => e.section === i && !e.parentId && e.kind !== "answer" && !e.resolvedAt)
          .sort((a, b) => (a.quoteAt ?? 0) - (b.quoteAt ?? 0));
        const code = entries
          .filter(isShownThread)
          .filter((e) => paths.includes(e.path))
          .sort(
            (a, b) =>
              paths.indexOf(a.path) - paths.indexOf(b.path) ||
              (a.startLine ?? 0) - (b.startLine ?? 0),
          );
        const threads = [...prose, ...code];
        const c: ItemCount = { note: 0, question: 0, explanation: 0, finding: 0, comment: 0 };
        for (const e of threads) c[e.kind as keyof ItemCount]++;
        const itemCount = threads.length;
        const pickThread = async () => {
          if (threads.length === 1) return props.onViewThread(threads[0].id);
          const picked = await window.coxswain.showPickMenu(threads.map(threadLabel), -1);
          props.onViewThread(threads[picked].id);
        };
        return (
          <button
            key={i}
            onClick={() => onPick(i)}
            onContextMenu={async () => {
              if (s.files.length)
                props.onReviewedChange(i, await window.coxswain.showTocSectionMenu(done));
            }}
            className={cn(
              "flex items-baseline gap-2 rounded px-1.5 py-1 text-left",
              selectable(i === current),
              ((done && s.files.length > 0) || s.muted) && muted,
            )}
          >
            <span className="min-w-0 flex-1">
              {s.title !== null ? <Prose inline>{s.title}</Prose> : notInGuide(props.writing)}
            </span>
            {itemCount > 0 && (
              <span
                role="button"
                title={`${itemsTitle(c)}: click to go to ${threads.length === 1 ? "it" : "one"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  void pickThread();
                }}
                className={cn(
                  "shrink-0 rounded px-0.5 tabular-nums hover:bg-neutral-200 dark:hover:bg-neutral-700 [&>svg]:mr-1 [&>svg]:inline [&>svg]:align-[-2px]",
                  muted,
                )}
              >
                <MessageSquareIcon />
                {itemCount}
              </span>
            )}
            {s.files.length > 0 && (
              <span className={cn("shrink-0 tabular-nums", muted)}>
                {done ? "✓" : `${n}/${s.files.length}`}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

// A thread in the bubble's menu: its file and line, or the passage quoted, then the start of its first comment.
const threadLabel = (e: ReviewEntry) => {
  const where = e.path
    ? `${e.path.slice(e.path.lastIndexOf("/") + 1)}${e.startLine ? `:${e.startLine}` : ""}`
    : `“${short(e.code ?? "", 30)}”`;
  return `${where} · ${short(e.body, 60)}`;
};
const short = (text: string, max: number) => {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};
