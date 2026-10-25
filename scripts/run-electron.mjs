// Give checkout launches their own macOS identity without modifying the installed Electron runtime.
import { execFileSync } from "node:child_process";
import {
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.platform === "darwin" && !process.env.ELECTRON_EXEC_PATH) {
  const electronRoot = dirname(require.resolve("electron/package.json"));
  const version = JSON.parse(readFileSync(join(electronRoot, "package.json"), "utf8")).version;
  const cache = join(root, "node_modules/.cache/coxswain", `electron-${version}-v1`);
  const bundle = join(cache, "coxswain.app");
  const ready = join(cache, "ready");
  if (!existsSync(ready)) {
    mkdirSync(cache, { recursive: true });
    rmSync(bundle, { recursive: true, force: true });
    cpSync(join(electronRoot, "dist/Electron.app"), bundle, {
      recursive: true,
      mode: constants.COPYFILE_FICLONE,
      verbatimSymlinks: true,
    });
    const plist = join(bundle, "Contents/Info.plist");
    for (const [key, value] of Object.entries({
      CFBundleName: "coxswain",
      CFBundleDisplayName: "coxswain",
      CFBundleIdentifier: "dev.coxswain.development",
    })) {
      execFileSync("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${value}`, plist]);
    }
    execFileSync("/usr/bin/codesign", ["--force", "--sign", "-", bundle], {
      stdio: "pipe",
    });
    writeFileSync(ready, version);
  }
  process.env.ELECTRON_EXEC_PATH = join(bundle, "Contents/MacOS/Electron");
}

const cli = join(dirname(require.resolve("electron-vite/package.json")), "bin/electron-vite.js");
await import(pathToFileURL(cli).href);
