import assert from "node:assert/strict";
import { test } from "node:test";
import { remainingFiles, fileCountLabel, reviewCountLabel } from "./remaining-files.ts";

test("remaining count never treats loading review state as a full unreviewed count", () => {
  const files = [{ path: "a.ts" }, { path: "b.ts" }];
  assert.equal(remainingFiles(files, undefined), undefined);
  assert.equal(remainingFiles(files, ["a.ts", "b.ts"]), 0);
  assert.equal(remainingFiles(files, ["a.ts"]), 1);
  assert.equal(remainingFiles(files, []), 2);
});

test("counts show reviewed/changed when reviewed files are visible, otherwise only remaining", () => {
  assert.equal(reviewCountLabel(24, 12, true), "12/24");
  assert.equal(reviewCountLabel(24, 12, false), "12");
  assert.equal(reviewCountLabel(24, 24, true), "24/24");
  assert.equal(reviewCountLabel(24, 24, false), "0");
  const files = [{ path: "a.ts" }, { path: "b.ts" }, { path: "c.ts" }];
  assert.equal(fileCountLabel(files, ["a.ts"], true), "1/3");
  assert.equal(fileCountLabel(files, ["a.ts"], false), "2");
  assert.equal(fileCountLabel(files, undefined, true), undefined);
});
