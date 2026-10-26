import assert from "node:assert/strict";
import { test } from "node:test";
import { menuResult } from "./menu-result.ts";

test("a native checkbox selection wins when Electron closes the popup before its click", async () => {
  const result = new Promise<string>((resolve) => {
    const menu = menuResult<string>(resolve, "dismissed");
    menu.close();
    menu.pick("hide reviewed");
  });
  assert.equal(await result, "hide reviewed");
});

test("dismissing a popup still completes without selecting an option", async () => {
  const result = new Promise<string>((resolve) => {
    const menu = menuResult<string>(resolve, "dismissed");
    menu.close();
  });
  assert.equal(await result, "dismissed");
});
