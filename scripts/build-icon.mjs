import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The saved Composer document owns geometry, materials and appearances. Exporting never edits it.
if (process.platform !== "darwin") {
  throw new Error("Icon regeneration requires macOS and Apple's Icon Composer 27.");
}
const root = fileURLToPath(new URL("../", import.meta.url));
const composerApps = [
  process.env.ICON_COMPOSER_APP,
  "/Applications/Icon Composer.app",
  "/Applications/Xcode.app/Contents/Applications/Icon Composer.app",
].filter(Boolean);
const composer = composerApps
  .map((app) => join(app, "Contents/Executables/ictool"))
  .find(existsSync);
if (!composer) {
  throw new Error(
    "Install Icon Composer 27 from https://developer.apple.com/icon-composer/ or set ICON_COMPOSER_APP.",
  );
}

const scratch = mkdtempSync(join(tmpdir(), "coxswain-icon-"));
try {
  const rendered = join(scratch, "composer.png");
  execFileSync(
    composer,
    [
      join(root, "resources/coxswain.icon"),
      "--export-image",
      "--output-file",
      rendered,
      "--platform",
      "macOS",
      "--rendition",
      "Default",
      "--width",
      "1024",
      "--height",
      "1024",
      "--scale",
      "1",
      "--design-generation",
      "27",
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );

  // Composer supplies the final mask and glass. AppKit adds only the static Dock canvas's
  // 100px inset, matching Mail and Finder, and resamples the rendered artwork for ICNS.
  const png = join(scratch, "icon.png");
  const icns = join(scratch, "icon.icns");
  const iconset = join(scratch, "coxswain.iconset");
  execFileSync(
    "swift",
    [
      "-module-cache-path",
      join(tmpdir(), "coxswain-icon-swift-cache"),
      join(root, "scripts/render-icon.swift"),
      rendered,
      png,
      iconset,
      "100",
    ],
    { stdio: "inherit" },
  );
  execFileSync("iconutil", ["-c", "icns", iconset, "-o", icns], { stdio: "inherit" });
  copyFileSync(png, join(root, "resources/icon.png"));
  copyFileSync(icns, join(root, "resources/icon.icns"));
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
