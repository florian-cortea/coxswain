import type { CanvasSearch } from "./router";

export type FileTab = { path: string; commit?: string };
export const sameFileTab = (a: FileTab | undefined, b: FileTab | undefined) =>
  a?.path === b?.path && a?.commit === b?.commit;

export function fileTabsOf(search: CanvasSearch): FileTab[] {
  const tabs = search.fileTabs ?? [];
  const active = search.file ? { path: search.file, commit: search.fileAt } : search.editorFile;
  return active && !tabs.some((tab) => sameFileTab(tab, active)) ? [...tabs, active] : tabs;
}

export function openEditorFile(search: CanvasSearch, tab: FileTab, line?: number): CanvasSearch {
  const tabs = fileTabsOf(search);
  return {
    view: "files",
    file: tab.path,
    fileAt: tab.commit,
    line,
    at: undefined,
    editorFile: tab,
    fileTabs: tabs.some((item) => sameFileTab(item, tab)) ? tabs : [...tabs, tab],
  };
}

export function closeEditorFile(search: CanvasSearch, tab: FileTab): CanvasSearch {
  const tabs = fileTabsOf(search);
  const index = tabs.findIndex((item) => sameFileTab(item, tab));
  const remaining = tabs.filter((item) => !sameFileTab(item, tab));
  const current = search.file ? { path: search.file, commit: search.fileAt } : search.editorFile;
  const active = sameFileTab(current, tab)
    ? remaining[Math.min(index, remaining.length - 1)]
    : current;
  return {
    fileTabs: remaining,
    editorFile: active,
    file: active?.path,
    fileAt: active?.commit,
    line: undefined,
  };
}
