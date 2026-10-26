# 24. Packaging and releases

Date: 2026-09-27

## Status

Accepted

## Context

coxswain only ran from a checkout (`pnpm dev`, `pnpm start`). People who want to try it need a download, and a bug
report needs to say which build it's from. Every change should also pass the checks in [AGENTS.md](../../AGENTS.md)
before it lands, not only on the author's machine.

SQLite uses `node:sqlite`; native Liquid Glass adds an native macOS addon (ADR 0042), and the agents it runs are the user's own `claude` and
`codex` ([ADR 0018](0018-agents-over-acp.md)), so a package needs only our JavaScript and Electron.

## Decision

1. **electron-builder packages the app**, configured in `package.json` (`build`): a `.dmg` and `.zip` for macOS
   (arm64 and x64), an NSIS installer for Windows x64, an AppImage for Linux x64. The agent SDKs' bundled
   `claude` and `codex` binaries are left out; the user's own are used. Files are named
   `coxswain-<version>-<os>-<arch>.<ext>` (the AppImage says `x86_64` for x64).
   The `electron-glasskit` package is unpacked from ASAR, including arm64/x64 native binaries and Swift
   libraries. It stays external to the main bundle and supplies no-op support on other platforms.
   The macOS bundle uses `resources/icon.icns`. On macOS, `pnpm icon` renders the saved
   `resources/coxswain.icon` with Icon Composer 27's `ictool` (macOS, Default, design generation 27).
   AppKit adds 100 px transparent Dock padding and resamples for `icon.png` and an ICNS with 16–1024 px
   representations, packaged with `iconutil`. No effects are redrawn and the source document is not modified.
   Icon Composer is found in `/Applications` or Xcode, or via `ICON_COMPOSER_APP`. These exports are checked
   in, so release runners do not need Swift or Icon Composer. The dev Dock uses the same PNG. Raster icon
   explorations are excluded from bundles.
   `pnpm dev` and `pnpm start` launch through `scripts/run-electron.mjs`. On macOS it creates a cached
   `coxswain.app` under ignored `node_modules/.cache`, with coxswain bundle/display names and a distinct
   development bundle identifier, then ad-hoc signs the outer bundle. Electron’s original runtime stays
   untouched. The cache is keyed by Electron version and recipe version; `ELECTRON_EXEC_PATH` remains
   an explicit override. Other platforms launch the ordinary runtime.
   The `.icon` project is editable source; it is not compiled into Electron's bundle as a native layered icon.
2. **Releases start from a button.** Actions → _Release_ → _Run workflow_ with a version (`.github/workflows/release.yml`)
   sets it in `package.json`, commits _Release vX_ to `main` when the version changes, tags `vX`, builds the tag on one runner per OS and
   creates the GitHub release with the files and GitHub's generated notes (the PRs merged since the last release).
   A version with a pre-release part (`0.1.0-rc.1`) makes a GitHub pre-release. Pushing a tag by hand does nothing.
3. **The build knows its version and commit**: `__VERSION__` (from `package.json`) and `__COMMIT__`
   (`git rev-parse`) are defined in the renderer and shown in Settings.
4. **CI runs tests, typecheck, lint, format check and build** on every push to `main` and every pull request
   (`.github/workflows/ci.yml`). CI and release builds use Node 26 and pnpm 12.3.4, matching the validated patched-dependency lockfile. Node is installed before pnpm; dependency installation is frozen.
5. **Unsigned for now.** macOS builds aren't signed or notarized, so Gatekeeper blocks the first launch
   (right-click → Open, or `xattr -cr coxswain.app`). Windows builds aren't signed either.
6. **`install.sh` installs on macOS and Linux**, piped from `curl` (README): it resolves the latest release by
   following the `/releases/latest` redirect (no API, no `jq`), or takes a version, downloads the `.zip` or AppImage
   for the machine's architecture and puts it in `/Applications` or `~/.local/bin`. A file curl downloads isn't
   quarantined, so Gatekeeper doesn't block the unsigned app.
7. **A packaged app takes the login shell's `PATH`** at startup (macOS and Linux), because one started from the
   Dock or a launcher gets a bare `PATH` without `gh`, `claude` or `codex`.

## Alternatives considered

- **Electron Forge**: the official tool, but its makers and publishers are more setup for the same three targets;
  electron-builder is one config block and builds macOS x64 on an arm64 runner.
- **Releasing on a pushed tag**: works, but leaves `package.json` behind the released version. The workflow's
  own tag push can't start a second workflow, so bumping, tagging and building are one workflow.
- **electron-builder's own publishing**: it drafts one release per runner and races; one job creating the release
  from every runner's files is simpler to follow.

## Consequences

- A release is one click with a version; nothing to run locally, and `main` always has the released version.
- First launches on macOS need the Gatekeeper workaround until we sign with a Developer ID and notarize (secrets in
  the release workflow, `mac.identity` in the config).
- No auto-update: users download new releases by hand.
