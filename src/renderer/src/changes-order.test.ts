import assert from "node:assert/strict";
import { test } from "node:test";
import { FileTree } from "@pierre/trees";
import { changesRowPaths, orderChanges } from "./changes-order.ts";
import { changeGroup, changeGroups } from "./change-groups.ts";

test("Changes canvas follows Pierre's sidebar traversal in tree/list and grouped/ungrouped modes", () => {
  const files = [
    "z.ts",
    "src/file10.ts",
    "src/file2.ts",
    "src/nested/a.ts",
    "tests/z.test.ts",
    "src/a.test.ts",
    "pnpm-lock.yaml",
    "a/z.ts",
  ].map((path) => ({ path }));
  for (const layout of ["tree", "list"] as const) {
    for (const grouped of [false, true]) {
      const groups = grouped
        ? changeGroups.map(({ id }) => files.filter((file) => changeGroup(file.path) === id))
        : [files];
      const sidebar = groups.flatMap((group) => {
        const paths = changesRowPaths(
          group.map((file) => file.path),
          layout,
        );
        const model = new FileTree({
          paths: [...paths.keys()],
          initialExpansion: "open",
          flattenEmptyDirectories: true,
        });
        const rows = model
          .getVisibleRows(0, model.getVisibleCount())
          .filter((row) => row.kind === "file")
          .map((row) => paths.get(row.path));
        model.cleanUp();
        return rows;
      });
      const canvas = orderChanges(files, layout, grouped);
      assert.deepEqual(
        canvas.map((file) => file.path),
        sidebar,
      );
      assert.equal(canvas.length, files.length);
      assert.equal(new Set(canvas).size, files.length);
    }
  }
  assert.deepEqual(
    orderChanges(files, "tree", false)
      .slice(0, 3)
      .map((file) => file.path),
    ["a/z.ts", "src/nested/a.ts", "src/a.test.ts"],
  );
});
