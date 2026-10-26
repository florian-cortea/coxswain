import assert from "node:assert/strict";
import { test } from "node:test";
import { FileTree, preparePresortedFileTreeInput } from "@pierre/trees";
import { orderTreePaths } from "./tree-order.ts";

test("worker-prepared paths preserve Pierre ordering, folder flattening and visible rows", () => {
  const paths = [
    "z.ts",
    "lib/nested/file10.ts",
    "lib/nested/file2.ts",
    "apps/a.ts",
    ".config",
    "a b/file.ts",
  ];
  const options = { initialExpansion: "open" as const, flattenEmptyDirectories: true };
  const regular = new FileTree({ ...options, paths });
  const sorted = structuredClone(orderTreePaths(paths));
  const prepared = new FileTree({
    ...options,
    preparedInput: preparePresortedFileTreeInput(sorted),
  });
  assert.deepEqual(prepared.getVisibleRows(0, 100), regular.getVisibleRows(0, 100));
  regular.cleanUp();
  prepared.cleanUp();
});
