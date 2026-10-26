import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import type { BrowserWindow } from "electron";
import { alignWindowButtons } from "./window-chrome.ts";

test("window buttons recenter after native layout and reload, while fullscreen keeps system placement", async () => {
  const positions: { x: number; y: number }[] = [];
  let full = false;
  let destroyed = false;
  const win = Object.assign(new EventEmitter(), {
    webContents: new EventEmitter(),
    isDestroyed: () => destroyed,
    isFullScreen: () => full,
    setWindowButtonPosition: (position: { x: number; y: number }) => positions.push(position),
  });
  const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
  alignWindowButtons(win as unknown as BrowserWindow);
  await tick();
  assert.deepEqual(positions, [{ x: 16, y: 15 }]);
  for (const event of ["resize", "resized", "restore", "focus"]) win.emit(event);
  assert.equal(positions.length, 1, "native layout finishes before the correction");
  await tick();
  assert.equal(positions.length, 2, "one correction covers a burst of layout events");
  full = true;
  win.emit("resize");
  await tick();
  assert.equal(positions.length, 2);
  win.emit("enter-full-screen");
  await tick();
  assert.equal(positions.length, 2);
  full = false;
  win.emit("leave-full-screen");
  await tick();
  assert.equal(positions.length, 3);
  win.webContents.emit("did-finish-load");
  await tick();
  assert.equal(positions.length, 4);
  win.emit("resize");
  destroyed = true;
  win.emit("closed");
  await tick();
  assert.equal(positions.length, 4);
  assert.equal(win.listenerCount("resize"), 0);
  assert.equal(win.webContents.listenerCount("did-finish-load"), 0);
});

test("closing releases reload listeners without reading destroyed window properties", async () => {
  const contents = new EventEmitter();
  let destroyed = false;
  const win = Object.assign(new EventEmitter(), {
    webContents: contents,
    isDestroyed: () => destroyed,
    isFullScreen: () => false,
    setWindowButtonPosition: () => {},
  });
  Object.defineProperty(win, "webContents", {
    get() {
      if (destroyed) throw new TypeError("Object has been destroyed");
      return contents;
    },
  });
  alignWindowButtons(win as unknown as BrowserWindow);
  win.emit("resize");
  destroyed = true;
  assert.doesNotThrow(() => win.emit("closed"));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(contents.listenerCount("did-finish-load"), 0);
  assert.equal(win.listenerCount("resize"), 0);
});
