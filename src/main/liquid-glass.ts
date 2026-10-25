import { nativeTheme, session, type BrowserWindow } from "electron";
import { release } from "node:os";

type GlassHost = {
  connect(contents: BrowserWindow["webContents"]): () => void;
  dispose(): void;
  createPanel?: import("electron-glasskit").GlassHost["createPanel"];
};
const hosts = new WeakMap<BrowserWindow, GlassHost>();
export const liquidGlassHost = (win: BrowserWindow) => hosts.get(win);
type GlassDriver = {
  getCapabilities(): { glass: boolean; islands: boolean };
  installPreload(session: Electron.Session): string;
  attachGlass(win: BrowserWindow): GlassHost;
};
let installed = false;

// ADR 0042: native islands above Chromium, never a background behind the window.
export function loadLiquidGlass(): GlassDriver | null {
  if (process.platform !== "darwin" || Number(release().split(".")[0]) < 25) return null;
  try {
    const driver = require("electron-glasskit") as GlassDriver;
    const capabilities = driver.getCapabilities();
    if (!capabilities.glass || !capabilities.islands) return null;
    if (!installed) {
      driver.installPreload(session.defaultSession);
      installed = true;
    }
    return driver;
  } catch (error) {
    console.warn("Native glass controls unavailable; using web controls", error);
    return null;
  }
}

export function attachLiquidGlass(win: BrowserWindow, driver: GlassDriver | null) {
  let host: GlassHost | null = null;
  let disconnect: (() => void) | undefined;
  try {
    host = driver?.attachGlass(win) ?? null;
    disconnect = host?.connect(win.webContents);
  } catch (error) {
    console.warn("Could not connect native glass controls; using web controls", error);
    host?.dispose();
    host = null;
  }
  if (host) hosts.set(win, host);
  const update = () => {
    if (win.isDestroyed()) return;
    const enabled =
      !!host && !nativeTheme.prefersReducedTransparency && !nativeTheme.shouldUseHighContrastColors;
    // The window and page remain opaque, including when native overlays are available.
    win.setBackgroundColor(nativeTheme.shouldUseDarkColors ? "#171717" : "#ffffff");
    win.webContents.send("window:material", enabled ? "glass" : "opaque");
  };
  win.webContents.on("did-finish-load", update);
  nativeTheme.on("updated", update);
  win.once("closed", () => {
    nativeTheme.off("updated", update);
    disconnect?.();
    hosts.delete(win);
    host?.dispose();
  });
}
