import { SidebarReviewedCheckbox } from "./components/SidebarReviewedCheckbox";
import { SidebarFileThreads } from "./components/SidebarFileThreads";
import { visibleSidebarThreads } from "./sidebar-threads";
import { useFileTreeTheme } from "./components/file-tree-theme";
import { type GuideAuthor } from "../../shared/guide-authors";
import { useEffect, useRef } from "react";
import { openedPath, type Opened, type Turn } from "./Viewer";
import type { ReviewEntry } from "../../core/review";
import type { GuideOptions } from "../../preload";
import type { ChangedFile } from "../../core/git";
import { count } from "./format";
import { Button } from "./components/button";
import { cn, muted } from "./components/styles";
import { Prose } from "./components/text";

// A guide's section order matches its canvas anchors, including ungrouped files.
export function Sections(props: {
  sections: { title: string | null; files: Opened[] }[] | null;
  current?: number;
  currentFile?: string;
  follow: boolean;
  viewId?: number;
  entries: ReviewEntry[];
  turns: Record<number, Turn>;
  options: GuideOptions;
  authors: GuideAuthor[];
  changed: ChangedFile[];
  isReviewed: (file: Opened) => boolean;
  onOpenFile: (path: string) => void;
  onFileReviewedChange: (file: Opened, on: boolean) => void;
  onViewThread: (id: number) => void;
  notice?: string | null;
  onPick: (index: number) => void;
  onReviewedChange: (index: number, on: boolean) => void;
}) {
  const nav = useRef<HTMLElement>(null);
  const themeStyles = useFileTreeTheme();
  useEffect(() => {
    const list = nav.current;
    if (!props.follow) {
      // Freeze a reveal animation already in flight when the review canvas is covered.
      list?.scrollTo({ top: list.scrollTop, behavior: "instant" });
      return;
    }
    const row =
      list?.querySelector<HTMLElement>('[data-reading-file="true"]') ??
      list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (!list || !row) return;
    const viewport = list.getBoundingClientRect();
    const item = row.getBoundingClientRect();
    let top = list.scrollTop;
    if (item.top < viewport.top + 8) top += item.top - viewport.top - 8;
    else if (item.bottom > viewport.bottom - 8) top += item.bottom - viewport.bottom + 8;
    if (top !== list.scrollTop)
      list.scrollTo({
        top,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
  }, [props.current, props.currentFile, props.options, props.follow]);
  const sections = props.sections ?? [];
  const roots = props.entries.filter(
    (entry) => (entry.path || entry.section != null) && !entry.parentId,
  );
  const shown = visibleSidebarThreads(roots, props.options, props.authors);
  const replies = Map.groupBy(props.entries, (entry) => entry.parentId ?? 0);
  const groups = Map.groupBy(shown, (entry) => {
    if (entry.section != null && entry.viewId === props.viewId && sections[entry.section])
      return entry.section;
    return sections.findIndex((section) =>
      section.files.some((file) => openedPath(file) === entry.path),
    );
  });
  const pathsByName = new Map<string, Set<string>>();
  for (const section of sections)
    for (const file of section.files) {
      const path = openedPath(file);
      const name = path.slice(path.lastIndexOf("/") + 1);
      const paths = pathsByName.get(name) ?? new Set<string>();
      paths.add(path);
      pathsByName.set(name, paths);
    }
  const threads = (index: number) => {
    const byFile = Map.groupBy(groups.get(index) ?? [], (entry) => entry.path ?? "");
    const files = new Map(props.changed.map((file) => [file.path, file]));
    for (const file of sections[index]?.files ?? [])
      if (file.kind === "diff") files.set(file.file.path, file.file);
    const sectionFiles = sections[index]?.files ?? [];
    const reviewedPaths = new Set(sectionFiles.filter(props.isReviewed).map(openedPath));
    const paths = new Set([
      ...(!props.options.onlyFilesWithThreads
        ? sectionFiles.filter((file) => file.kind === "diff").map(openedPath)
        : []),
      ...byFile.keys(),
    ]);
    return [...paths]
      .filter((path) => props.options.showReviewedFiles || !reviewedPaths.has(path))
      .map((path, fileIndex, visiblePaths) => {
        const file = files.get(path);
        const opened =
          sectionFiles.find((item) => openedPath(item) === path) ??
          (file ? { kind: "diff" as const, file } : undefined);
        const slash = path.lastIndexOf("/");
        const ambiguous = (pathsByName.get(path.slice(slash + 1))?.size ?? 0) > 1;
        return (
          <div
            key={path}
            className="sidebar-tree-branch"
            data-sidebar-last={fileIndex === visiblePaths.length - 1 ? "true" : undefined}
          >
            <SidebarFileThreads
              path={path}
              file={file}
              showFolder={ambiguous}
              current={props.current === index && props.currentFile === path}
              reviewed={opened ? props.isReviewed(opened) : false}
              onReviewed={opened ? (on) => props.onFileReviewedChange(opened, on) : undefined}
              onOpen={() => props.onOpenFile(path)}
              threads={byFile.get(path) ?? []}
              replies={replies}
              turns={props.turns}
              onThread={props.onViewThread}
            />
          </div>
        );
      });
  };
  return (
    <nav
      ref={nav}
      style={themeStyles}
      aria-label="Guide sections"
      className="guide-navigation min-h-0 flex-1 overflow-y-auto py-2 pr-4 pl-2 text-xs [scrollbar-gutter:stable]"
    >
      {props.notice && (
        <div role="status" className={cn("p-2", muted)}>
          {props.notice}
        </div>
      )}
      {!sections.length && <div className={cn("p-4 text-center", muted)}>No guide sections</div>}
      {sections.map((section, index) => {
        const reviewed = section.files.filter(props.isReviewed).length;
        const partial = reviewed > 0 && reviewed < section.files.length;
        return (
          <div key={index} className="guide-section-node mb-2">
            <div
              className="guide-nav-item guide-section-title relative flex items-start"
              data-sidebar-row="true"
              data-sidebar-current={props.current === index ? "true" : undefined}
            >
              <Button
                key={index}
                variant="ghost"
                style={{ justifyContent: "flex-start", alignItems: "baseline" }}
                className="guide-section-link flex min-w-0 flex-1 items-baseline gap-2 px-2 py-2 text-left"
                aria-current={props.current === index ? "location" : undefined}
                onClick={() => props.onPick(index)}
              >
                <span className={cn("w-4 shrink-0 text-[13px] leading-5 font-normal", muted)}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0 leading-relaxed">
                  <span className="text-[13px] leading-5 font-semibold">
                    <Prose inline>{section.title ?? "Not in the guide"}</Prose>
                  </span>
                  {section.files.length > 0 ? (
                    <span className={cn("flex items-center gap-2 text-[11px] opacity-80", muted)}>
                      <span>{count(section.files.length, "file")}</span>
                      <span className="text-green-600 dark:text-green-400">
                        +
                        {section.files.reduce(
                          (n, f) => n + (f.kind === "diff" ? f.file.additions : 0),
                          0,
                        )}
                      </span>
                      <span className="text-red-600 dark:text-red-400">
                        −
                        {section.files.reduce(
                          (n, f) => n + (f.kind === "diff" ? f.file.deletions : 0),
                          0,
                        )}
                      </span>
                    </span>
                  ) : (
                    <span className={cn("text-[11px] opacity-80", muted)}>No files</span>
                  )}
                </span>
              </Button>
              {section.files.length > 0 && (
                <SidebarReviewedCheckbox
                  tall
                  label={section.title ?? "Not in the guide"}
                  checked={reviewed === section.files.length}
                  partial={partial}
                  onChange={(on) => props.onReviewedChange(index, on)}
                />
              )}
            </div>
            <div className="guide-section-children ml-4 pl-4">{threads(index)}</div>
          </div>
        );
      })}
      {!!groups.get(-1)?.length && (
        <div className="mt-3">
          <div className={cn("px-2 py-1", muted)}>Other threads</div>
          <div className="guide-section-children ml-4 pl-4">{threads(-1)}</div>
        </div>
      )}
    </nav>
  );
}
