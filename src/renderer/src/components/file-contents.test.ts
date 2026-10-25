import assert from "node:assert/strict";
import { test } from "node:test";
import type { FileText } from "../../../core/git";
import { fileContents } from "./file-contents.ts";

test("remounting a cached file reuses highlighting while edits and renames get distinct keys", () => {
  const read: FileText = { status: "ok", text: "export const a = 1;", binary: false };
  const first = fileContents(read, "a.ts");
  assert.equal(fileContents(read, "a.ts"), first);
  assert.notEqual(
    fileContents({ ...read, text: "export const a = 2;" }, "a.ts").cacheKey,
    first.cacheKey,
  );
  assert.notEqual(
    fileContents(read, "renamed.py").cacheKey,
    first.cacheKey,
    "language inference cannot share a stale cache entry",
  );
});
