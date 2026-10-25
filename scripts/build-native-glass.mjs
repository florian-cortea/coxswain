// Compile the pinned glass bridge's native hover-action patch. No native build is needed off macOS.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

if (process.platform === "darwin") {
  const require = createRequire(import.meta.url);
  const root = resolve(dirname(require.resolve("electron-glasskit")), "..");
  execFileSync(
    process.execPath,
    [resolve(root, "scripts/build-native.mjs"), ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: process.env,
    },
  );
}
