import assert from "node:assert/strict";
import { test } from "node:test";
import { markdownImageSource } from "./markdown-images.ts";

test("markdown images resolve repository paths and encoded names without query suffixes", () => {
  assert.deepEqual(markdownImageSource("./docs/../images/screen%20shot.png?raw=true#demo"), {
    kind: "repository",
    path: "images/screen shot.png",
  });
  assert.deepEqual(markdownImageSource("/assets/a.svg"), {
    kind: "repository",
    path: "assets/a.svg",
  });
});
test("GitHub blob links become image URLs while attachments and badge hosts stay remote", () => {
  assert.deepEqual(markdownImageSource("https://github.com/org/repo/blob/main/docs/a.png"), {
    kind: "remote",
    src: "https://raw.githubusercontent.com/org/repo/main/docs/a.png",
  });
  for (const src of [
    "https://github.com/user-attachments/assets/123",
    "https://greptile-static-assets.s3.amazonaws.com/badges/p2.svg?v=9",
  ])
    assert.deepEqual(markdownImageSource(src), { kind: "remote", src });
  assert.deepEqual(markdownImageSource("//example.com/a.png"), {
    kind: "remote",
    src: "https://example.com/a.png",
  });
  assert.deepEqual(markdownImageSource("javascript:alert(1)"), { kind: "remote", src: "" });
});
