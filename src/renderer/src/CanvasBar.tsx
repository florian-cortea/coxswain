import { Button, SegmentedControl } from "./components/button";
import { ChevronDownIcon } from "./components/icons";
import { cn, divider, titleBar } from "./components/styles";

export type PaneTab = "diffs" | "files" | "sections";

export type HistoryTab = "commits" | "turns";

// The bar over the pane left of the canvas, as wide as it: hide it, and switch the Navigator between Changes (its
// file diffs) and Files (the whole file tree). It drags the window, like the canvas's bar.
export function PaneBar(props: {
  tab: PaneTab;
  files: string | undefined; // review progress, formatted for the sidebar visibility setting
  onTab: (tab: PaneTab) => void;
  onHide: () => void;
  onOptions: () => void;
}) {
  return (
    <div
      className={cn(
        titleBar,
        "gap-1.5 border-b px-2 text-xs [&_button]:[-webkit-app-region:no-drag]",
        divider,
      )}
    >
      <SegmentedControl
        value={props.tab}
        onChange={props.onTab}
        options={[
          { value: "sections", label: "Guide", title: "The guide’s sections and threads" },
          {
            value: "diffs",
            label: `Changes ${props.files ?? ""}`.trim(),
            title: "The changed files",
          },
          { value: "files", label: "Files", title: "The whole file tree of the workspace" },
        ]}
      />
      <div className="flex-1" />
      <Button
        variant="ghost"
        className="size-7 p-1 text-neutral-500 dark:text-neutral-500"
        title={props.tab === "sections" ? "Guide options" : "Files and Changes options"}
        aria-label={props.tab === "sections" ? "Guide options" : "File options"}
        aria-haspopup="menu"
        onClick={props.onOptions}
      >
        <span aria-hidden="true" className="text-sm leading-none">
          ⋯
        </span>
      </Button>
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
        className="p-1 text-neutral-500 dark:text-neutral-400"
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
