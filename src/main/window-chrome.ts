import type { BrowserWindow } from "electron";
import type { EventEmitter } from "node:events";

export const windowButtonPosition = { x: 16, y: (44 - 14) / 2 };

// AppKit can relayout standard buttons after a window transition. Apply our point-based inset
// after that event turn, without fighting the system's fullscreen title bar.
export function alignWindowButtons(win: BrowserWindow) {
  let pending: ReturnType<typeof setImmediate> | undefined;
  const events: EventEmitter = win;
  // BrowserWindow properties are unavailable by the time closed fires.
  const contents = win.webContents;
  const schedule = () => {
    if (pending !== undefined) return;
    pending = setImmediate(() => {
      pending = undefined;
      if (win.isDestroyed() || win.isFullScreen()) return;
      win.setWindowButtonPosition({ ...windowButtonPosition });
    });
  };
  const layoutEvents = [
    "ready-to-show",
    "show",
    "focus",
    "resize",
    "resized",
    "maximize",
    "unmaximize",
    "restore",
    "enter-full-screen",
    "leave-full-screen",
  ] as const;
  for (const event of layoutEvents) events.on(event, schedule);
  contents.on("did-finish-load", schedule);
  win.once("closed", () => {
    if (pending !== undefined) clearImmediate(pending);
    for (const event of layoutEvents) events.off(event, schedule);
    contents.off("did-finish-load", schedule);
  });
  schedule();
}
