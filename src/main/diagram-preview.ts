import { nativeTheme, type BrowserWindow } from "electron";
import { randomBytes } from "node:crypto";
import { liquidGlassHost } from "./liquid-glass";
import { installDiagramGestures } from "../shared/diagram-gestures";

// ADR 0042: HTML on glass requires a child panel; a native sheet in the parent would cover the SVG.
export async function showDiagram(parent: BrowserWindow, svg: string): Promise<boolean> {
  const host = liquidGlassHost(parent);
  if (
    !host?.createPanel ||
    nativeTheme.prefersReducedTransparency ||
    nativeTheme.shouldUseHighContrastColors
  )
    return false;
  if (typeof svg !== "string" || svg.length > 8_000_000) return false;
  let panel: ReturnType<NonNullable<typeof host.createPanel>> | undefined;
  try {
    panel = host.createPanel({
      show: false,
      cornerRadius: 12,
      frame: ({ width, height }) => {
        const gutter = width >= 1280 ? 40 : 24;
        // Workspace bar (44), then the same 12-point gap as sticky review headers.
        return { x: gutter, y: 44 + 12, width: width - gutter * 2, height: height - 44 - 12 - 16 };
      },
      window: {
        title: "Diagram",
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false },
      },
    });
    const win = panel.window;
    const nonce = randomBytes(18).toString("base64");
    const html = `<!doctype html><html><head><meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'nonce-${nonce}'">
      <style>
        :root {color-scheme:${nativeTheme.shouldUseDarkColors ? "dark" : "light"}}
        html,body {margin:0;height:100%;overflow:hidden;background:transparent;font-family:system-ui}
        #viewport {position:relative;height:100%;border-radius:12px;overflow:hidden;touch-action:none;user-select:none;box-sizing:border-box}
        #drawing {width:100%} svg {display:block;width:100%;height:auto;max-width:none!important}
        button {position:fixed;top:12px;right:12px;width:28px;height:28px;border:0;border-radius:6px;background:transparent;color:GrayText;font:20px system-ui;z-index:1}
        button:hover {background:light-dark(#0001,#fff1)}
      </style></head><body><button aria-label="Close diagram" title="Close (Esc)">×</button>
      <div id="viewport"><div id="drawing">${svg}</div></div>
      <script nonce="${nonce}">(${installDiagramGestures.toString()})(document.getElementById('viewport'),document.getElementById('drawing'));
      document.querySelector('button').onclick=()=>window.close();</script></body></html>`;
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (event) => event.preventDefault());
    win.webContents.on("before-input-event", (event, input) => {
      if (input.key === "Escape") {
        event.preventDefault();
        win.close();
      }
    });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const closed = new Promise<boolean>((resolve) => win.once("closed", () => resolve(true)));
    win.once("blur", () => {
      if (!win.isDestroyed()) win.close();
    });
    win.show();
    win.focus();
    return await closed;
  } catch (error) {
    panel?.close();
    console.warn("Native diagram panel unavailable; using the web dialog", error);
    return false;
  }
}
