import assert from "node:assert/strict";
import { test } from "node:test";
import { closeEditorFile, fileTabsOf, openEditorFile } from "./file-tabs.ts";
import type { CanvasSearch } from "./router.ts";

test("editor opens files once, distinguishes revisions and restores its selection after Guide", () => {
  let search: CanvasSearch = { ws: 3 };
  const open = (path: string, commit?: string) => {
    search = { ...search, ...openEditorFile(search, { path, commit }) };
  };
  open("src/a.ts");
  open("src/b.ts");
  open("src/a.ts");
  assert.deepEqual(
    fileTabsOf(search).map((tab) => tab.path),
    ["src/a.ts", "src/b.ts"],
  );
  open("src/a.ts", "old");
  assert.equal(fileTabsOf(search).length, 3);
  search = { ...search, view: "sections", file: undefined, fileAt: undefined };
  assert.deepEqual(search.editorFile, { path: "src/a.ts", commit: "old" });
  const restored = openEditorFile(search, search.editorFile!);
  assert.equal(restored.fileAt, "old");
  assert.equal(fileTabsOf({ ...search, ...restored }).length, 3);
});

test("closing inactive tabs preserves selection; closing active tabs picks a neighbor then empties", () => {
  let search: CanvasSearch = { ...openEditorFile({}, { path: "a.ts" }) };
  search = { ...search, ...openEditorFile(search, { path: "b.ts" }) };
  search = { ...search, ...openEditorFile(search, { path: "c.ts" }, 42) };
  search = { ...search, ...closeEditorFile(search, { path: "a.ts" }) };
  assert.equal(search.file, "c.ts");
  search = { ...search, ...closeEditorFile(search, { path: "c.ts" }) };
  assert.equal(search.file, "b.ts");
  assert.equal(search.line, undefined);
  search = { ...search, ...closeEditorFile(search, { path: "b.ts" }) };
  assert.equal(search.file, undefined);
  assert.equal(search.editorFile, undefined);
  assert.deepEqual(fileTabsOf(search), []);
});
