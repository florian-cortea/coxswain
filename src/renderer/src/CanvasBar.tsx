import type { Commit } from "../../core/git";
import type { PullRequestDetails } from "../../core/github";
import { CheckDot } from "./PullRequest";
import type { View } from "../../core/views";
import { Activity } from "./Activity";
import { Button, SegmentedControl, ToggleButton } from "./components/button";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GlobeIcon,
  LayersPlusIcon,
  ListTreeIcon,
  MessageSquareIcon,
  SearchIcon,
  SlidersIcon,
  SpinnerIcon,
  XIcon,
} from "./components/icons";
import { cn, divider, muted, selectable, titleBar } from "./components/styles";

export type PaneTab = "diffs" | "files";

// Given to the bar at the window's left while the agent pane is hidden: a button that shows it again, and room for
// the window buttons if the sidebar is hidden too.
export type ShowAgents = { onShow: () => void; inset: boolean };
const ShowAgentsButton = ({ show }: { show: ShowAgents }) => (
  <>
    <Button
      variant="ghost"
      title="Show the agent pane"
      className="shrink-0 p-1 text-neutral-500"
      onClick={show.onShow}
    >
      <MessageSquareIcon />
    </Button>
    <div className={cn("mx-1 h-4 border-l", divider)} />
  </>
);
export type HistoryTab = "commits" | "turns";

// The bar over the pane left of the canvas, as wide as it: hide it, and switch the Navigator between Changes (its
// file diffs) and Files (the whole file tree). It drags the window, like the canvas's bar.
export function PaneBar(props: {
  tab: PaneTab;
  files: number | undefined; // how many file diffs are on the canvas
  onTab: (tab: PaneTab) => void;
  onHide: () => void;
  showAgents?: ShowAgents;
}) {
  return (
    <div
      className={cn(
        titleBar,
        "gap-1.5 border-b px-2 text-xs [&_button]:[-webkit-app-region:no-drag]",
        props.showAgents?.inset && "pl-20",
        divider,
      )}
    >
      {props.showAgents && <ShowAgentsButton show={props.showAgents} />}
      <ToggleButton
        on
        icon
        title="Hide the navigator (⌘B)"
        className="shrink-0"
        onClick={props.onHide}
      >
        <ListTreeIcon />
      </ToggleButton>
      <SegmentedControl
        value={props.tab}
        onChange={props.onTab}
        options={[
          {
            value: "diffs",
            label: `Changes ${props.files ?? ""}`.trim(),
            title: "The changed files",
          },
          { value: "files", label: "Files", title: "The whole file tree of the workspace" },
        ]}
      />
    </div>
  );
}

// The bar of the pane's bottom half: collapse it to this bar, and switch it between Commits and Turns. Picking
// either while collapsed expands it.
export function HistoryBar(props: {
  tab: HistoryTab;
  open: boolean;
  ready: boolean; // the PR's commits are loaded, so Commits and Turns can open
  onTab: (tab: HistoryTab) => void;
  onToggle: () => void;
}) {
  return (
    <div className={cn("flex h-9 shrink-0 items-center gap-1.5 border-t px-2 text-xs", divider)}>
      <Button
        variant="ghost"
        title={props.open ? "Collapse" : "Expand"}
        className="p-1 text-neutral-500"
        disabled={!props.ready}
        onClick={props.onToggle}
      >
        <span className={cn("block", !props.open && "rotate-180")}>
          <ChevronDownIcon />
        </span>
      </Button>
      <SegmentedControl
        value={props.tab}
        onChange={(t) => props.ready && props.onTab(t)}
        options={[
          { value: "commits", label: "Commits", title: "The commits" },
          { value: "turns", label: "Turns", title: "The agent turns that changed the worktree" },
        ]}
      />
    </div>
  );
}

type Props = {
  workspaceId: number;
  paneOpen: boolean; // the pane left of the canvas shows, with its own bar
  onShowPane: () => void;
  ready: boolean; // the PR's commits are loaded, so the diff's range and the views can open
  commit: Commit | null;
  view: View | null;
  views: View[]; // newest first
  snapshot: string | null; // the worktree now; a view of the worktree pinned to another is stale
  scope: "all" | "pushed" | "unpushed" | "uncommitted";
  hasPr: boolean; // what's pushed is the PR's
  onGitHub: boolean; // what's pushed is on GitHub, not another origin (ADR 0040)
  pr: PullRequestDetails | null; // the PR on GitHub, once read: its chip opens the PR panel (ADR 0037)
  onPr: boolean; // the PR panel shows
  onShowPr: () => void;
  onRangeMenu: () => void; // the Diff tab's range: a scope, or a commit or turn from the Commits pane
  onClearCommit: () => void;
  onShowView: (id: number | null) => void; // null: the diff, no view
  onRemoveView: (view: View, label: string) => void;
  onNewView: () => void;
  onOpenQuickly: () => void;
  onViewOptions: () => void;
  onSettings: () => void;
  canBack: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  showAgents?: ShowAgents; // while the pane is hidden too, this bar is at the window's left
};

// The canvas's bar: what the canvas shows on the left (the PR with its checks, Diff with its range, a chip per view,
// New View), then Back,
// Forward, Open Quickly, the display options and Activity. Showing or switching the left pane is the pane's own bar; while it's
// hidden, a button here shows it. It also drags the window, so it lines up with the agent pane's.
export function CanvasBar(props: Props) {
  const titles = viewTitles(props.views);
  const onDiff = !props.view && !props.onPr;
  // Always shown, a view showing or not, so the chips next to it never move.
  const range = props.commit
    ? props.commit.turn
      ? `Turn: ${props.commit.subject}`
      : props.commit.sha.slice(0, 7)
    : {
        all: "All",
        pushed: props.hasPr ? "PR" : props.onGitHub ? "On GitHub" : "Pushed",
        unpushed: "Not Pushed",
        uncommitted: "Uncommitted",
      }[props.scope];
  return (
    <div
      className={cn(
        titleBar,
        "gap-1 border-b px-2 text-xs [&_button]:[-webkit-app-region:no-drag]",
        props.showAgents?.inset && "pl-20",
        divider,
      )}
    >
      {props.showAgents && <ShowAgentsButton show={props.showAgents} />}
      {!props.paneOpen && (
        <>
          <Button
            variant="ghost"
            title="Show the navigator (⌘B)"
            className="p-1 text-neutral-500"
            onClick={props.onShowPane}
          >
            <ListTreeIcon />
          </Button>
          <div className={cn("mx-1 h-4 border-l", divider)} />
        </>
      )}
      {props.pr && (
        <ToggleButton
          on={props.onPr}
          title={`The PR on GitHub: its description, checks and conversation, and Post to GitHub${props.pr.checkState ? `\nChecks: ${props.pr.checkState}` : ""}`}
          className="flex shrink-0 items-center gap-1.5"
          onClick={props.onShowPr}
        >
          #{props.pr.number}
          {props.pr.checkState && <CheckDot state={props.pr.checkState} />}
        </ToggleButton>
      )}
      {props.pr && props.pr.deployments.length > 0 && <Deployments of={props.pr.deployments} />}
      <div
        className={cn(
          "flex items-center rounded",
          selectable(onDiff),
          !onDiff && muted,
          !props.ready && "opacity-50",
        )}
      >
        <button
          title="Show the diff without a view"
          disabled={!props.ready}
          aria-pressed={onDiff}
          className="py-0.5 pr-1.5 pl-2"
          onClick={() => props.onShowView(null)}
        >
          Diff
        </button>
        <button
          title={props.commit ? props.commit.subject : "What the diff shows"}
          disabled={!props.ready}
          className={cn(
            "flex max-w-60 items-center gap-0.5 border-l py-0.5 pr-1 pl-1.5",
            divider,
            props.commit && "pr-0.5",
          )}
          onClick={props.onRangeMenu}
        >
          <span className="truncate">{range}</span>
          {!props.commit && <ChevronDownIcon />}
        </button>
        {props.commit && (
          <button
            title="Back to all changes"
            aria-label="Back to all changes"
            className="py-1 pr-1.5 pl-0.5"
            onClick={props.onClearCommit}
          >
            <XIcon />
          </button>
        )}
      </div>
      {props.views.toReversed().map((v) => (
        <ToggleButton
          key={v.id}
          title={`Made ${new Date(v.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} at ${v.head.slice(0, 7)}${!v.worktree ? `, of ${v.base.slice(0, 7)} → ${v.head.slice(0, 7)}` : props.snapshot && v.head !== props.snapshot ? " (stale)" : ""}`}
          disabled={!props.ready}
          className="flex max-w-40 items-center gap-1"
          on={v.id === props.view?.id}
          onClick={() => props.onShowView(v.id)}
          onContextMenu={async () => {
            if ((await window.coxswain.showViewChipMenu()) === "remove")
              props.onRemoveView(v, titles.get(v.id)!);
          }}
        >
          <span className="truncate">{titles.get(v.id)}</span>
          {v.writing && <SpinnerIcon />}
        </ToggleButton>
      ))}
      <Button
        variant="ghost"
        title="New view"
        className="rounded border border-dashed border-neutral-400 px-1.5 dark:border-neutral-600 py-0.5 text-neutral-500"
        disabled={!props.ready}
        onClick={props.onNewView}
      >
        <LayersPlusIcon />
      </Button>
      <div className="flex-1" />
      <Button
        variant="ghost"
        title="Back (⌥⌘←)"
        className="p-1 text-neutral-500"
        disabled={!props.canBack}
        onClick={props.onBack}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        variant="ghost"
        title="Forward (⌥⌘→)"
        className="p-1 text-neutral-500"
        disabled={!props.canForward}
        onClick={props.onForward}
      >
        <ChevronRightIcon />
      </Button>
      <Button
        variant="ghost"
        title="Open Quickly (⌘⇧O)"
        className="p-1 text-neutral-500"
        onClick={props.onOpenQuickly}
      >
        <SearchIcon />
      </Button>
      <Button
        variant="ghost"
        title="Display options"
        className="p-1 text-neutral-500"
        onClick={props.onViewOptions}
      >
        <SlidersIcon />
      </Button>
      <Activity workspaceId={props.workspaceId} onSettings={props.onSettings} />
    </div>
  );
}

// The PR's live deployments (its head commit's, e.g. a preview): one opens in the browser, several are picked from a
// native menu first.
function Deployments({ of }: { of: PullRequestDetails["deployments"] }) {
  const one = of.length === 1 ? of[0] : null;
  return (
    <ToggleButton
      on={false}
      title={one ? `Open ${one.environment}: ${one.url}` : "Open a deployment"}
      className="flex shrink-0 items-center gap-0.5"
      onClick={async () => {
        const d =
          one ??
          of[
            await window.coxswain.showPickMenu(
              of.map((d) => d.environment || d.url),
              -1,
            )
          ];
        window.open(d.url);
      }}
    >
      <GlobeIcon />
      {!one && <ChevronDownIcon />}
    </ToggleButton>
  );
}

// Each view's title by id; a title used by an older view gets a number: Guide, Guide 2, …
export function viewTitles(views: View[]) {
  const oldestFirst = views.toReversed();
  return new Map(
    oldestFirst.map((v, i) => {
      const n = oldestFirst.slice(0, i).filter((o) => o.title === v.title).length;
      return [v.id, n > 0 ? `${v.title} ${n + 1}` : v.title];
    }),
  );
}
