import { test } from "node:test";
import assert from "node:assert/strict";
import { changeGroup } from "./change-groups.ts";

test("Changes grouping recognizes test conventions across languages", () => {
  for (const path of [
    "tests/unit/a.py",
    "src/__tests__/a.tsx",
    "src/a.test.ts",
    "src/a_spec.py",
    "test_a.py",
    "src/a_test.go",
    "src/WidgetTests.cs",
    "e2e/login.ts",
    "tests/fixtures/data.json",
  ]) {
    assert.equal(changeGroup(path), "tests", path);
  }
});
test("generated paths and artifacts take precedence over test locations", () => {
  for (const path of [
    "src/__generated__/api.ts",
    "gen/client.py",
    "dist/main.js",
    "src/routeTree.gen.ts",
    "api/service.pb.go",
    "tests/__snapshots__/a.test.ts.snap",
    "tests/generated/test_api.py",
    "pnpm-lock.yaml",
    "sub/uv.lock",
  ]) {
    assert.equal(changeGroup(path), "generated", path);
  }
});
test("ordinary source, documentation and configuration stay in Implementation", () => {
  for (const path of [
    "src/main.ts",
    "docs/testing.md",
    "package.json",
    ".github/workflows/test.yml",
    "scripts/generate.ts",
    "src/contest.ts",
    "src/Contest.java",
    "db/migrations/001.sql",
  ]) {
    assert.equal(changeGroup(path), "implementation", path);
  }
});
