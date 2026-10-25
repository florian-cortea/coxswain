import { useEffect, useRef } from "react";
import { match } from "ts-pattern";
import { Button } from "./components/button";
import { FileTypeIcon } from "./components/FileTypeIcon";
import { XIcon } from "./components/icons";
import { cn, muted } from "./components/styles";
import { sameFileTab, type FileTab } from "./file-tabs";

export function FileTabs({
  tabs,
  active,
  onSelect,
  onClose,
}: {
  tabs: FileTab[];
  active: FileTab | undefined;
  onSelect: (tab: FileTab) => void;
  onClose: (tab: FileTab) => void;
}) {
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active?.path, active?.commit]);
  return (
    <div
      ref={strip}
      role="tablist"
      aria-label="Open files"
      className="file-editor-tabs flex shrink-0 overflow-x-auto"
      onKeyDown={(event) => {
        const index = tabs.findIndex((tab) => sameFileTab(tab, active));
        const next = match(event.key)
          .with("ArrowRight", () => (index + 1) % tabs.length)
          .with("ArrowLeft", () => (index - 1 + tabs.length) % tabs.length)
          .with("Home", () => 0)
          .with("End", () => tabs.length - 1)
          .otherwise(() => null);
        if (next === null) return;
        event.preventDefault();
        if (tabs[next]) onSelect(tabs[next]);
        strip.current
          ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
          [next]?.focus({ preventScroll: true });
      }}
    >
      {tabs.map((tab) => {
        const selected = sameFileTab(tab, active);
        const name = tab.path.split("/").at(-1) ?? tab.path;
        return (
          <div
            key={`${tab.commit ?? "live"}:${tab.path}`}
            className="file-editor-tab group flex min-w-0 shrink-0 items-center"
            data-active={selected}
            onAuxClick={(event) => {
              if (event.button === 1) {
                event.preventDefault();
                onClose(tab);
              }
            }}
          >
            <Button
              variant="ghost"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              title={`${tab.path}${tab.commit ? ` @ ${tab.commit.slice(0, 8)}` : ""}`}
              className={cn("min-w-0 gap-2 px-3 py-2 text-xs", !selected && muted)}
              onClick={() => onSelect(tab)}
            >
              <FileTypeIcon path={tab.path} />
              <span className="max-w-60 truncate">{name}</span>
              {tab.commit && (
                <span className={cn("text-[10px]", muted)}>{tab.commit.slice(0, 7)}</span>
              )}
            </Button>
            <Button
              variant="ghost"
              title={`Close ${name}`}
              aria-label={`Close ${name}`}
              className={cn("file-editor-tab-close mr-1 shrink-0 p-1", muted)}
              onClick={() => onClose(tab)}
            >
              <XIcon />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
