# 4. Styling and native feel

Date: 2026-09-23

## Status

Accepted

## Context

coxswain should feel native ([ADR 0002](0002-standalone-electron-app.md)). In Electron, the
contents of the window are a Chromium web page: the operating system's own controls, such as
buttons and inputs, are not available there. What Electron does offer is native menus, dialogs and
window features around the page, and system settings the page can read.

Well-regarded desktop apps built on web technology (Linear, VS Code, Slack, Notion) don't imitate
the operating system's controls. They have a consistent design of their own and follow desktop
conventions. Libraries that imitate macOS or Windows controls end up looking almost right, and
slightly wrong.

## Decision

- **Native where Electron offers it:** the app menu bar, right-click menus, file pickers, message
  boxes and notifications use Electron's native APIs, not HTML imitations.
- **Window frame:** a hidden title bar with the macOS window buttons kept in place
  (`titleBarStyle: 'hiddenInset'`), so the UI extends into the title bar. Native window buttons start at
  (16, 15) points, centering their 14-point height in the 44-point workspace bar; the position is restored
  after leaving full screen. Workspace selection uses a row of native SwiftUI workspace buttons on supported Macs
  through the existing island bridge, with the shared HTML tabs as the fallback.
- **Window material:** native Liquid Glass on supported macOS, with solid code surfaces and a solid fallback
  (ADR 0042).
- **App icon:** a pale glass rowing shell with three cyan/blue pairs of oars on a midnight background, without
  an orange marker. The hull is softly tapered; asymmetric hatchet blades join their shafts at one side and
  follow 45-degree axes. The complete paddle arrangement is centered vertically on the hull. Shaft paths extend slightly inside the curved hull sides with smooth rounded caps for a short glass overlap, leaving the boat’s center clear. The oar spread and shaft weight are optically strengthened for 16–32 px use; the hull is slightly fuller. Four unmasked 1024 px SVG layers live in `resources/coxswain.icon/Assets/`.
  Geometry, positions, colours and materials are saved in that Icon Composer document. Composer supplies the mask,
  specular highlights, refraction, translucency and layer shadows using design generation 27. The PNG and ICNS are rendered by Apple's
  `ictool`, with only 100 px transparent padding added to the 1024 px Dock canvas. There is no parallel SVG
  implementation of the effects. Regeneration reads the saved document without editing it.
- **Follow the system:** the system font (`system-ui`), the user's accent colour from
  `systemPreferences.getAccentColor()` as a CSS variable, and reduced-motion and high-contrast settings.
  Light and dark mode default to the system, with a saved _System_ / _Light_ / _Dark_ / _Soft Dark_ choice in Settings.
  The core stores the choice in SQLite; the main process applies it through `nativeTheme.themeSource`
  before opening a window and on changes. Soft Dark maps to native dark controls while a shared CSS
  neutral ramp applies its lighter charcoal palette throughout the UI. `prefers-color-scheme` keeps CSS, Pierre code colours and
  diagrams in step, along with native controls.
- **Components: shadcn/ui with Tailwind.** shadcn/ui copies its components (built on Radix) into
  our repository, so we own and restyle them. Until it's set up, `src/renderer/src/components/`
  holds our own few controls, named and shaped like shadcn's so each can be swapped for its copy.
- **Desktop conventions**, applied throughout:
  - the default arrow cursor on buttons, not the pointing hand;
  - no text selection on buttons and toolbars, only on code and content;
  - no scrolling or bounce on the whole window, only in individual panels;
  - a denser layout than a website;
  - keyboard shortcuts for every command, shown in the menus;
  - no loading spinners for local work; show something immediately.
- **Code colours:** the Pierre libraries ([ADR 0003](0003-diff-view-and-file-tree.md)) use Shiki
  themes. A separate core setting selects Pierre (default), One Dark, GitHub or Catppuccin light/dark
  pairs. One Dark supplies the reference-like purple/amber/cyan syntax; Appearance owns the surfaces.
- **Spacing:** shared `uiMetrics` exposes a 4/8/12/16/24/32 px scale to CSS and native review controls.
  Cards use 16 px insets, related controls use 8/12 px gaps, sections use 24 px gaps, and screens use
  24 px insets (32 px in wide windows). Dialog headers and footers align on 20 px insets. Desktop
  buttons have a 28 px minimum target and fields/list rows a 32 px minimum; content can grow rather
  than being clipped to a fixed height. These are app defaults, not numbers prescribed by Apple.
  They apply [Apple's layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout)
  on grouping, negative space and alignment, and the content-driven control sizing described in
  [Build a SwiftUI app with the new design](https://developer.apple.com/videos/play/wwdc2025/310/).
  Code lines and file-tree rows retain their reading density. Review gutters and clearance around
  the floating bars use the same metrics, preserving sticky-header alignment.

## Alternatives considered

- **React Aria Components** (Adobe). The strongest keyboard and accessibility behaviour, including
  desktop-style arrow-key navigation, type-ahead and selecting several items. Rejected as the
  default because shadcn/ui is more widely used and quicker to start with. We may use React Aria
  for individual components where shadcn/ui's keyboard behaviour falls short.
- **Libraries that imitate native controls** (macOS- or Windows-style React components). Rejected:
  they end up looking almost right, and slightly wrong, and would need to follow each operating
  system's design changes.
- **A fully custom design system from scratch.** Rejected: too much work before the product
  exists. shadcn/ui gives us components we own and can reshape.

## Consequences

- coxswain looks like its own app on every platform, not like a macOS or Windows app. Its native
  feel comes from menus, window chrome, system settings and desktop conventions.
- Native menus and dialogs live in Electron's main process, so the UI asks for them through the
  interface to the main process, like other native features. A web version needs HTML
  replacements for them.
- The desktop conventions above are easy to lose one component at a time. They belong in shared
  styles and in the components we copy from shadcn/ui, not in each screen.
