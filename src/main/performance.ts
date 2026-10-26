import { app, contentTracing } from "electron";
import { writeFile } from "node:fs/promises";

// Opt-in local diagnostics. SIGUSR2 saves a Chromium trace after interacting with the app.
export async function recordInteractions() {
  const path = !app.isPackaged && process.env.COXSWAIN_TRACE_PATH;
  if (!path) return;
  await contentTracing.startRecording({
    included_categories: [
      "devtools.timeline",
      "blink.user_timing",
      "v8",
      "cc",
      "disabled-by-default-devtools.timeline",
      "disabled-by-default-devtools.timeline.frame",
    ],
  });
  await writeFile(`${path}.pid`, String(process.pid));
  let stopping = false;
  process.on("SIGUSR2", () => {
    if (stopping) return;
    stopping = true;
    void contentTracing
      .stopRecording(path)
      .then(() => console.info(`Interaction trace saved: ${path}`));
  });
}
