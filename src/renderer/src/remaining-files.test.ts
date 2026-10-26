import assert from "node:assert/strict";
import { test } from "node:test";
import { remainingFiles } from "./remaining-files.ts";

test("remaining count never treats loading review state as a full unreviewed count", () => {
  const files = [{ path: "a.ts" }, { path: "b.ts" }];
  assert.equal(remainingFiles(files, undefined), undefined);
  assert.equal(remainingFiles(files, ["a.ts", "b.ts"]), 0);
  assert.equal(remainingFiles(files, ["a.ts"]), 1);
  assert.equal(remainingFiles(files, []), 2);
});
