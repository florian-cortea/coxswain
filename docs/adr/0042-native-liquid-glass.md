# 42. In-window native Liquid Glass review controls

## Status

Accepted

## Context

Review controls should float above the diff and guides (G2, G3, G5). As changes scroll, the glass samples the
page beneath the controls. The desktop must not show through the app. Native glass is drawn above Chromium,
so HTML labels in the same page cannot be layered above it; the controls on the material must be native too.

## Decision

- Use pinned `electron-glasskit` 0.1.0. On supported macOS, connect its trusted-page bridge to the app's
  webContents and render native SwiftUI control islands above Chromium. Never call `setBackground`, enable
  transparent BrowserWindows or expose the desktop. Both the window and the page remain opaque.
- The workspace bar is positioned over a full-height scrolling canvas. Initial and
  final padding keep the first and last lines reachable. The native islands sample the live page underneath.
  Navigation, chat, code and file cards retain solid surfaces. Workspace selection also uses a native
  SwiftUI workspace-button strip in the full-width glass workspace bar; project switching, New workspace, chat
  and Settings are native controls too. macOS owns drawing, focus, selection and pressed feedback.
  Hovering a tab reveals a native close button. Closed workspaces reopen through the command palette; explicit removal
  remains a separate action. Unsupported/accessibility modes use the HTML tab strip.
  Page zoom applies to review content while the native workspace bar stays at 44 window points. The preload
  publishes Electron's current zoom factor on document load and resize; inverse CSS zoom keeps the bar's
  DOM anchors and native intrinsic sizes in the same units. Sidebar and canvas clearance compensate for
  the fixed bar height at the current zoom. Physical display scale is independent of page zoom.
- `NativeToolbar` is the shared control wrapper. It receives plain control descriptions and keeps callbacks
  in the renderer, so the same actions reach the existing core APIs and router. View removal and deployment
  choices use native menus. The core has no native presentation code.
- Dialogs and the command palette keep native islands visible but disable their
  controls. Overlay bounds clear the top bar. Unsupported
  platforms, unavailable native modules, Reduce Transparency and high contrast use web controls; accessibility
  settings use solid surfaces. Theme changes follow the saved System/Light/Dark setting.
- The toolkit remains external to the main bundle and is unpacked from ASAR, including its arm64/x64 native
  binaries and Swift libraries. Its renderer entry point is bundled with the UI. Window closure disconnects
  the trusted page and disposes native views. Renderer bindings track geometry through resize and reload.

Expanded diagrams use the toolkit's HTML-on-glass child panels. Their transparent Chromium page sits
above a native glass background that samples the parent app's content. The main window remains opaque.
Panels follow their parent, close with it or on Escape/focus loss, and expose only a small Close control.
They use sandboxed, isolated web contents without Node or the app preload, deny navigation and new windows,
and a restrictive CSP allows only the generated SVG, inline styles and the gesture script with a nonce.
Reduced Transparency, high contrast and unsupported systems use the shared solid web dialog instead.
Trackpad pinch scales the SVG around the pointer; ordinary wheel events pan freely without scrollbar limits; pointer dragging also pans. The native and web previews share this gesture handler and have no zoom toolbar.

The workspace bar uses a passthrough glass backdrop and separate native islands for the project, workspace
strip and right-side action group, so blank toolbar space remains draggable. It overlays a canvas scrollport that starts at the top of the window, so its glass samples
scrolling changes too. There is no inner canvas toolbar. Sticky file headers and section text clear the main bar by the same 24/40-point gutter used on the sides,
with initial content at the same inset and matching final padding. There is no bottom bar; review threads are nested under files/sections in the left Guide and Changes sidebar, and the right sidebar holds Chat. Submit Review floats at the main canvas panel’s bottom-right, clear of Chat. Side panes retain their 44-point top inset. The PR overview has its own toolbar button, range selection belongs to Changes’ Commits/Turns pane, and app/display settings share one native dropdown.

## Alternatives considered

- Whole-window glass behind Chromium: samples the desktop, which is the wrong composition for review controls.
- CSS backdrop-filter alone: samples the correct in-window content, but does not supply native Liquid Glass.
- A separate HTML child window for each bar: preserves HTML controls, but adds focus, lifecycle and state
  coordination across webContents. Native control islands keep callbacks in the current renderer.
- A custom native addon: unnecessary while the toolkit supplies in-window glass and SwiftUI controls.

## Consequences

- macOS workspace controls use native controls. Other platforms keep the shared web controls and an in-page frosted
  surface. Native actions and their web equivalents must remain aligned as the bars evolve.
- Native views are above all HTML. Modal HTML overlays use `useGlassOcclusion` to disable the bars (shared Dialog does this already). Nonmodal Activity clears the bar’s bounds and keeps toolbar controls active.
- The module is young and pinned. Native lifecycle, interaction, accessibility and packaged builds need explicit
  checks when upgrading it. No unstable material presets or private-property setters are used.

The pinned toolkit has a source patch adding a generic hover action to native buttons and drawing indeterminate progress as the same 14-point, 80% rounded arc and one-second rotation used by the renderer’s SpinnerIcon. Hover state is
kept per button in its island and removed with the button. `postinstall` rebuilds the native module on macOS,
which requires Apple Command Line Tools; `pnpm native:glass --arch arm64,x64` builds both distribution architectures.

Guide explanations use Chromium scroll-state queries on a sticky wrapper to enable the inner scrollport
only while stuck at the top. Its height stays bounded in both states to avoid relayout during scrolling.

Required dependency patches are declared in `pnpm-workspace.yaml`, alongside explicit dependency build permissions. This keeps them active with pnpm 12, which no longer reads the package.json pnpm field. The hover-action patch uses cumulative new-file hunk offsets so strict patch parsers can apply it.
