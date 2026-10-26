import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { registerHooks } from "node:module";
import { test } from "node:test";
import type { BrowserWindow } from "electron";

// Exercise the window lifecycle without requiring an Electron GUI or the optional macOS addon in CI.
const fakeElectron = `data:text/javascript,${encodeURIComponent(`
  import { EventEmitter } from "node:events";
  export const session = { defaultSession: {} };
  export const nativeTheme = Object.assign(new EventEmitter(), {
    prefersReducedTransparency: false, shouldUseHighContrastColors: false, shouldUseDarkColors: true,
  });
`)}`;
const hooks = registerHooks({
  resolve(specifier, context, next) {
    return specifier === "electron"
      ? { url: fakeElectron, shortCircuit: true }
      : next(specifier, context);
  },
});
const { nativeTheme } = await import("electron");
const { attachLiquidGlass } = await import("./liquid-glass.ts");
hooks.deregister();
const theme = nativeTheme as unknown as EventEmitter & {
  prefersReducedTransparency: boolean;
  shouldUseHighContrastColors: boolean;
  shouldUseDarkColors: boolean;
};

function window() {
  const sent: unknown[][] = [];
  const colors: string[] = [];
  const webContents = Object.assign(new EventEmitter(), {
    send: (...args: unknown[]) => sent.push(args),
  });
  const win = Object.assign(new EventEmitter(), {
    webContents,
    isDestroyed: () => false,
    getNativeWindowHandle: () => Buffer.alloc(8),
    setBackgroundColor: (color: string) => colors.push(color),
  });
  return { win, sent, colors, asWindow: win as unknown as BrowserWindow };
}

test("native material survives reloads, follows accessibility and appearance, and releases listeners", () => {
  const w = window();
  let attached = 0;
  let disposed = 0;
  let disconnected = 0;
  const listeners = theme.listenerCount("updated");
  attachLiquidGlass(w.asWindow, {
    getCapabilities: () => ({ glass: true, islands: true }),
    installPreload: () => "preload",
    attachGlass: () => {
      attached++;
      return {
        connect: () => () => {
          disconnected++;
        },
        dispose: () => {
          disposed++;
        },
      };
    },
  });
  w.win.webContents.emit("did-finish-load");
  assert.equal(attached, 1); // ID zero is a successful native attachment.
  assert.deepEqual(w.sent.at(-1), ["window:material", "glass"]);
  assert.equal(w.colors.at(-1), "#171717");
  w.win.webContents.emit("did-finish-load");
  assert.equal(attached, 1);

  theme.prefersReducedTransparency = true;
  theme.emit("updated");
  assert.deepEqual(w.sent.at(-1), ["window:material", "opaque"]);
  assert.equal(w.colors.at(-1), "#171717");
  theme.shouldUseDarkColors = false;
  theme.emit("updated");
  assert.equal(w.colors.at(-1), "#ffffff");
  theme.prefersReducedTransparency = false;
  theme.shouldUseHighContrastColors = true;
  theme.emit("updated");
  assert.deepEqual(w.sent.at(-1), ["window:material", "opaque"]);
  theme.shouldUseHighContrastColors = false;
  theme.emit("updated");
  assert.deepEqual(w.sent.at(-1), ["window:material", "glass"]);
  w.win.emit("closed");
  assert.equal(theme.listenerCount("updated"), listeners);
  assert.equal(disconnected, 1);
  assert.equal(disposed, 1);
});

test("missing or declined native material keeps the window solid", () => {
  for (const driver of [
    null,
    {
      getCapabilities: () => ({ glass: true, islands: true }),
      installPreload: () => "preload",
      attachGlass: () => {
        throw new Error("Unavailable native view");
      },
    },
  ]) {
    const w = window();
    attachLiquidGlass(w.asWindow, driver);
    w.win.webContents.emit("did-finish-load");
    assert.deepEqual(w.sent.at(-1), ["window:material", "opaque"]);
    assert.equal(w.colors.at(-1), "#ffffff");
    w.win.emit("closed");
  }
});
